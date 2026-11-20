#!/usr/bin/env python3
"""Build a browser-searchable catalog from the upstream Project Ignis official CDB."""
import json, sqlite3, urllib.request
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
cards = []
for r in rows:
    cid,ot,typ,atk,df,level,race,attribute,category,name,desc = r
    if not name:
        continue
    cards.append({
      "id":cid,"ot":ot,"type":typ,"atk":atk,"def":df,"level":level,
      "race":race,"attribute":attribute,"category":category,
      "name":name,"name_ja":name,"desc":desc or "","desc_ja":desc or "",
      "name_zh":None,"desc_zh":None,
      "data_status":"upstream_cdb_imported","script_status":"not_verified",
      "rule_status":"not_verified","image_status":"not_imported"
    })
OUT.write_text(json.dumps({"source":"ProjectIgnis/BabelCDB/cards.cdb","source_url":URL,
 "language_policy":"zh-CN when verified translation exists; otherwise Japanese original",
 "count":len(cards),"cards":cards},ensure_ascii=False,separators=(",",":")),encoding="utf-8")
print("Imported",len(cards),"card records into",OUT)
