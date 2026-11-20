#!/usr/bin/env python3
"""Build a browser-searchable catalog from the upstream Project Ignis CDB."""
import json, re, sqlite3, urllib.request
from pathlib import Path

URL = "https://raw.githubusercontent.com/ProjectIgnis/BabelCDB/master/cards.cdb"
DB = Path("/tmp/duellab-cards.cdb")
OUT = Path("public/cards.json")
req = urllib.request.Request(URL, headers={"User-Agent":"DuelLab-card-import"})
with urllib.request.urlopen(req, timeout=90) as response:
    DB.write_bytes(response.read())
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

def archetypes(name, desc):
    text = (name or "") + " " + (desc or "")
    tags = []
    # ZEXAL is the shared archseries covering ZW/ZS and Utopia/Utopic cards.
    if (re.search(r"\b(?:ZW|ZS|DZW|SZW)\s*-", text, re.I)
        or re.search(r"\bZexal\b|\bUtopia\b|\bUtopic\b", text, re.I)):
        tags.append("ZEXAL")
    return tags

cards = []
for r in rows:
    cid,ot,typ,atk,df,level,race,attribute,category,name,desc = r
    if not name:
        continue
    cards.append({
      "id":cid,"ot":ot,"type":typ,"atk":atk,"def":df,"level":level,
      "race":race,"attribute":attribute,"category":category,
      "name":name,"source_name":name,"desc":desc or "","source_desc":desc or "",
      "name_zh":None,"desc_zh":None,"archetypes":archetypes(name, desc),
      "data_status":"upstream_cdb_imported","script_status":"not_verified",
      "rule_status":"not_verified","image_status":"not_imported"
    })
OUT.write_text(json.dumps({"source":"ProjectIgnis/BabelCDB/cards.cdb","source_url":URL,
 "language_policy":"upstream CDB text retained as-is; language is not asserted; verified zh-CN and Japanese sources are pending",
 "archetype_tag_policy":"ZEXAL tag is a name/text keyword grouping for discovery, not an official exhaustive archetype ruling",
 "count":len(cards),"cards":cards},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("Imported",len(cards),"card records into",OUT)
