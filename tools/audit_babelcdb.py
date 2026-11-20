#!/usr/bin/env python3
"""Read-only audit of ProjectIgnis BabelCDB files; never merges or imports records."""
import hashlib, json, os, sqlite3, urllib.request
from collections import defaultdict
from pathlib import Path
REPO="ProjectIgnis/BabelCDB"; BRANCH="master"; API="https://api.github.com/repos/"+REPO+"/contents"
OUT=Path("audit-output"); CACHE=Path("audit-cache"); TOKEN=os.environ.get("GITHUB_TOKEN")
def get(url):
    headers={"Accept":"application/vnd.github+json","User-Agent":"DuelLab-audit"}
    if TOKEN: headers["Authorization"]="Bearer "+TOKEN
    with urllib.request.urlopen(urllib.request.Request(url,headers=headers),timeout=60) as r: return r.read()
def inspect(path):
    db=sqlite3.connect(path.resolve().as_uri()+"?mode=ro&immutable=1",uri=True)
    try:
        tables={r[0] for r in db.execute("SELECT name FROM sqlite_master WHERE type='table'")}
        out={"tables":sorted(tables),"schema_ok":{"datas","texts"}.issubset(tables)}
        if not out["schema_ok"]: return out
        out["datas_columns"]=[r[1] for r in db.execute("PRAGMA table_info(datas)")]
        out["texts_columns"]=[r[1] for r in db.execute("PRAGMA table_info(texts)")]
        out["datas_rows"]=db.execute("SELECT COUNT(*) FROM datas").fetchone()[0]
        out["texts_rows"]=db.execute("SELECT COUNT(*) FROM texts").fetchone()[0]
        out["datas_without_text"]=db.execute("SELECT COUNT(*) FROM datas d LEFT JOIN texts t ON t.id=d.id WHERE t.id IS NULL").fetchone()[0]
        out["texts_without_data"]=db.execute("SELECT COUNT(*) FROM texts t LEFT JOIN datas d ON d.id=t.id WHERE d.id IS NULL").fetchone()[0]
        out["ot_distribution"]={str(k):v for k,v in db.execute("SELECT ot,COUNT(*) FROM datas GROUP BY ot ORDER BY ot")}
        return out
    finally: db.close()
def main():
    OUT.mkdir(exist_ok=True); CACHE.mkdir(exist_ok=True)
    listing=json.loads(get(API+"?ref="+BRANCH))
    files=sorted([x for x in listing if x["type"]=="file" and x["name"].endswith(".cdb")],key=lambda x:x["name"])
    report={}; owners=defaultdict(list)
    for item in files:
        name=item["name"]; raw=get(item["download_url"]); path=CACHE/name; path.write_bytes(raw)
        try: details=inspect(path)
        except sqlite3.DatabaseError as exc: details={"schema_ok":False,"error":str(exc)}
        report[name]={"size_bytes":len(raw),"sha256":hashlib.sha256(raw).hexdigest(),"upstream_url":item["html_url"],**details}
        if details.get("schema_ok"):
            db=sqlite3.connect(path.resolve().as_uri()+"?mode=ro&immutable=1",uri=True)
            try:
                for (cid,) in db.execute("SELECT id FROM datas"): owners[str(cid)].append(name)
            finally: db.close()
    duplicates={k:v for k,v in owners.items() if len(v)>1}
    result={"upstream":REPO+"@"+BRANCH,"scope_note":"Inventory only; no OCG eligibility decision and no merge.","files_seen":len(files),"files":report,"cross_file_duplicate_id_count":len(duplicates),"cross_file_duplicate_id_examples":dict(list(sorted(duplicates.items()))[:100])}
    (OUT/"babelcdb-audit.json").write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding="utf-8")
    lines=["# BabelCDB 自动审计报告","","- 上游："+REPO+"@"+BRANCH,"- CDB 文件数："+str(len(files)),"- 跨文件重复 ID："+str(len(duplicates)),"- 仅盘点结构与重叠，不代表 OCG 筛选已完成。","","| 文件 | 大小 | datas | texts | ot 分布 |","|---|---:|---:|---:|---|"]
    for name,info in report.items():
        lines.append("| "+name+" | "+str(info.get("size_bytes",""))+" | "+str(info.get("datas_rows","N/A"))+" | "+str(info.get("texts_rows","N/A"))+" | "+json.dumps(info.get("ot_distribution",{}),ensure_ascii=False)+" |")
    (OUT/"babelcdb-audit.md").write_text("\n".join(lines)+"\n",encoding="utf-8")
    print("Audited",len(files),"CDB files; duplicate IDs:",len(duplicates))
if __name__=="__main__": main()
