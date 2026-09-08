from pathlib import Path
import re,html,json,hashlib
app=Path(__file__).resolve().parents[1];w=app.parents[1];p=w/'outputs/online-audit/public-reference/wiki/events/raphael-stage/index.html';s=p.read_text();s=s[s.index('RaphaelStage_01_Task'):];tables=re.findall(r'<table[^>]*>(.*?)</table>',s,re.S)[:8];items={r['id']:r['en'] for r in json.loads((w/'outputs/component-research/datasets/Item.json').read_text())};rows=[]
for table in tables:
 for row in re.findall(r'<tr>(.*?)</tr>',table,re.S):
  cells=re.findall(r'<td>(.*?)</td>',row,re.S)
  if not cells:continue
  threshold=int(cells[0].replace(',',''));id=html.unescape(re.search(r'title="([^"]+)"',cells[2]).group(1));quantity=int(re.search(r'event-reward-count">×([\d,]+)',cells[2]).group(1).replace(',',''));name=html.unescape(re.search(r'event-reward-chip-copy"><span>(.*?)</span>',cells[2]).group(1));assert items['Item:name:'+id]==name,(id,name,items.get('Item:name:'+id));rows.append(dict(threshold=threshold,itemId=id,name=name,quantity=quantity))
assert len(rows)==56 and len(set(r['threshold'] for r in rows))==56 and max(r['threshold'] for r in rows)<=100000
out={'source':{'url':'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/events/raphael-stage/index.html','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'track':'RaphaelStage_01_Task','kind':'pinned community event rows, not version matched','checked':'2026-09-08'},'milestones':rows}
(app/'lib/raphael-progress-data.json').write_text(json.dumps(out,indent=2)+'\n');print(len(rows),rows[-1])
