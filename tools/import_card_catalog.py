#!/usr/bin/env python3
"""Build DuelLab's card catalog with Chinese display text and Project Ignis runtime data."""
import io, json, re, sqlite3, urllib.request, zipfile
from pathlib import Path
from card_translation import map_translation

CDB_URL = "https://raw.githubusercontent.com/ProjectIgnis/BabelCDB/master/cards.cdb"
ZH_URL = "https://ygocdb.com/api/v0/cards.zip"
DB = Path("/tmp/duellab-cards.cdb")
OUT = Path("public/cards.json")

def download(url):
    req = urllib.request.Request(url, headers={"User-Agent":"DuelLab-card-import"})
    with urllib.request.urlopen(req, timeout=120) as response:
        return response.read()

DB.write_bytes(download(CDB_URL))
conn = sqlite3.connect("file:" + str(DB) + "?mode=ro&immutable=1", uri=True)
try:
    rows = conn.execute("""
      SELECT d.id,d.ot,d.type,d.atk,d.def,d.level,d.race,d.attribute,d.category,
             t.name,t.desc
      FROM datas d JOIN texts t ON t.id=d.id
      ORDER BY t.name COLLATE NOCASE
    """).fetchall()
finally:
    conn.close()

# 百鸽 cards.zip keys records by official card password. The official simplified
# Chinese name is text.sc_name; the main effect is text.desc and Pendulum text
# is separately stored in text.pdesc.
zh_records = {}
zh_error = None
try:
    archive = zipfile.ZipFile(io.BytesIO(download(ZH_URL)))
    with archive.open("cards.json") as stream:
        raw_zh_records = json.load(stream)
        # cards.json is keyed by Konami CID, while BabelCDB datas.id is the
        # printed card password. Build the join index using each record's id.
        zh_records = {
            str(record.get("id")): record
            for record in raw_zh_records.values()
            if isinstance(record, dict) and record.get("id") is not None
        }
except Exception as exc:
    # Keep the build usable if the translation service is temporarily unavailable.
    zh_error = str(exc)

def archetypes(name, desc):
    text = (name or "") + " " + (desc or "")
    tags = []
    if (re.search(r"\b(?:ZW|ZS|DZW|SZW)\s*-", text, re.I)
        or re.search(r"\bZexal\b|\bUtopia\b|\bUtopic\b", text, re.I)):
        tags.append("ZEXAL")
    return tags

cards = []
zh_name_matched = 0
zh_desc_matched = 0
for r in rows:
    cid,ot,typ,atk,df,level,race,attribute,category,name,desc = r
    if not name:
        continue
    zh = zh_records.get(str(cid), {})
    official_zh_name, official_zh_desc, fallback_zh_name = map_translation(zh)
    if official_zh_name:
        zh_name_matched += 1
    if official_zh_desc:
        zh_desc_matched += 1
    cards.append({
      "id":cid,"ot":ot,"type":typ,"atk":atk,"def":df,"level":level,
      "race":race,"attribute":attribute,"category":category,
      "name":name,"source_name":name,"desc":desc or "","source_desc":desc or "",
      "name_zh":official_zh_name or None,"desc_zh":official_zh_desc or None,
      "name_zh_fallback":fallback_zh_name,
      "archetypes":archetypes(name, desc),
      "data_status":"upstream_cdb_imported",
      "translation_status":"official_sc_zh_available" if official_zh_name or official_zh_desc else "no_official_sc_zh",
      "script_status":"not_verified","rule_status":"not_verified","image_status":"not_imported"
    })
OUT.write_text(json.dumps({
 "source":"ProjectIgnis/BabelCDB/cards.cdb","source_url":CDB_URL,
 "translation_source":"ygocdb.com/api/v0/cards.zip","translation_url":ZH_URL,
 "language_policy":"Show official Simplified Chinese text.sc_name and text.desc (plus text.pdesc when present); otherwise retain upstream CDB text. cn_name is stored separately as a non-official fallback.",
 "official_zh_name_count":zh_name_matched,"official_zh_desc_count":zh_desc_matched,"translation_download_error":zh_error,
 "archetype_tag_policy":"ZEXAL tag is a name/text keyword grouping for discovery, not an official exhaustive archetype ruling",
 "count":len(cards),"cards":cards
},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("Imported",len(cards),"cards;",zh_name_matched,"official Chinese names;",zh_desc_matched,"official Chinese effect texts; output",OUT)
