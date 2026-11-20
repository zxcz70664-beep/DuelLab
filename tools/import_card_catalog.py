#!/usr/bin/env python3
"""Build DuelLab's card catalog with Chinese display text and Project Ignis runtime data."""
import io, json, re, sqlite3, urllib.request, zipfile
from pathlib import Path

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

# 百鸽 cards.zip uses the card passcode as its record key and provides sc_name
# (official Simplified Chinese name) plus text.desc (Simplified Chinese effect).
zh_records = {}
zh_error = None
try:
    archive = zipfile.ZipFile(io.BytesIO(download(ZH_URL)))
    with archive.open("cards.json") as stream:
        zh_records = json.load(stream)
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
zh_matched = 0
for r in rows:
    cid,ot,typ,atk,df,level,race,attribute,category,name,desc = r
    if not name:
        continue
    zh = zh_records.get(str(cid), {})
    text_zh = zh.get("text") or {}
    official_zh_name = zh.get("sc_name") or (text_zh.get("sc_name") or "")
    official_zh_desc = text_zh.get("desc") or ""
    if official_zh_name or official_zh_desc:
        zh_matched += 1
    cards.append({
      "id":cid,"ot":ot,"type":typ,"atk":atk,"def":df,"level":level,
      "race":race,"attribute":attribute,"category":category,
      "name":name,"source_name":name,"desc":desc or "","source_desc":desc or "",
      "name_zh":official_zh_name or None,"desc_zh":official_zh_desc or None,
      "name_zh_fallback":zh.get("cn_name") or None,
      "archetypes":archetypes(name, desc),
      "data_status":"upstream_cdb_imported",
      "translation_status":"official_sc_zh_available" if official_zh_name or official_zh_desc else "no_official_sc_zh",
      "script_status":"not_verified","rule_status":"not_verified","image_status":"not_imported"
    })
OUT.write_text(json.dumps({
 "source":"ProjectIgnis/BabelCDB/cards.cdb","source_url":CDB_URL,
 "translation_source":"ygocdb.com/api/v0/cards.zip","translation_url":ZH_URL,
 "language_policy":"Show official Simplified Chinese sc_name/text.desc when available; otherwise retain the upstream CDB text. cn_name is stored separately as a non-official fallback and is not silently presented as official.",
 "translation_records_matched":zh_matched,"translation_download_error":zh_error,
 "archetype_tag_policy":"ZEXAL tag is a name/text keyword grouping for discovery, not an official exhaustive archetype ruling",
 "count":len(cards),"cards":cards
},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("Imported",len(cards),"cards;",zh_matched,"have Chinese text; output",OUT)
