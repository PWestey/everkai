"""Export every complete level row and Inn gate attribute from pinned HTML."""
from pathlib import Path
import re,html,json,hashlib
root=Path(__file__).resolve().parents[1];base=root.parent.parent/'outputs/online-audit/public-reference/wiki'
plain=lambda s:re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',s))).strip()
p=base/'magic-farm/index.html';b=p.read_bytes();rows=[]
for m in re.finditer(r'<li[^>]+id="magic-farm-plant-(plant\d+)"(.*?)</article>',b.decode(),re.S|re.I):
 levels=[]
 for lv,body in re.findall(r'<strong>Lv\. (\d+)</strong>(.*?)(?=<strong>Lv\. \d+</strong>|$)',m[2],re.S):
  text=plain(body);duration=re.search(r'Growth Time:\s*([\dhms ]+)',text);amount=re.search(r'Harvest Amount:\s*([\d,]+)',text)
  levels.append({'level':int(lv),'seconds':sum(int(n)*{'h':3600,'m':60,'s':1}[unit] for n,unit in re.findall(r'(\d+)\s*([hms])',duration[1])) if duration else None,'amount':int(amount[1].replace(',','')) if amount else None,'effectText':text.split('Growth Time:')[0].strip()})
 rows.append({'id':m[1].title(),'levels':levels})
(root/'lib/farm-level-data.json').write_text(json.dumps({'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','source':'https://github.com/Zik-Ascend/isl-tools/blob/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/magic-farm/index.html','sha256':hashlib.sha256(b).hexdigest(),'plants':rows,'unknown':['level-up costs','level versus star/production gate joins','effect activation and stacking']},indent=2)+'\n')
p=base/'inn/index.html';b=p.read_bytes();gates=[]
for category,id,body in re.findall(r'<li id="inn-(stations|dishes)-(\d+)"(.*?)</li>',b.decode(),re.S):
 a=dict(re.findall(r'(data-[a-z-]+)="([^"]*)"',body));gates.append({'category':category,'id':id,**{k:a.get(k) for k in ['data-character-requirement','data-unlock-type','data-unlock-sort','data-station-id','data-level-sort']}})
(root/'lib/inn-gate-inventory.json').write_text(json.dumps({'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','source':'https://github.com/Zik-Ascend/isl-tools/blob/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/inn/index.html','sha256':hashlib.sha256(b).hexdigest(),'gates':gates},indent=2)+'\n')
print(len(rows),'Farm profiles;',sum(len(p['levels']) for p in rows),'level rows;',len(gates),'Inn gate rows;',sum(bool(g['data-character-requirement']) for g in gates),'nonempty character requirements')
