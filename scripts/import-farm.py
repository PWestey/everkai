from pathlib import Path
import re,html,json,hashlib
root=Path(__file__).resolve().parents[1];workspace=root.parent.parent;p=workspace/'outputs/online-audit/public-reference/wiki/magic-farm/index.html';raw=p.read_bytes();s=raw.decode();plants=[]
for m in re.finditer(r'<li[^>]+id="magic-farm-plant-(plant\d+)"(.*?)</article>',s,re.S|re.I):
 id,body=m.groups();name=html.unescape(re.search(r'<strong class="fish-antique-tooltip-title">(.*?)</strong>',body,re.S)[1]);level=re.search(r'<strong>Lv\. 1</strong>(.*?)(?:<strong>Lv\. 2</strong>|$)',body,re.S)[1];text=re.sub('<[^>]+>',' ',html.unescape(level));duration=re.search(r'Growth Time:\s*([\dhms ]+)',text);amount=re.search(r'Harvest Amount:\s*([\d,]+)',text)
 if not duration or not amount:continue
 seconds=sum(int(n)*{'h':3600,'m':60,'s':1}[unit] for n,unit in re.findall(r'(\d+)\s*([hms])',duration[1]));assert seconds>0
 plants.append({'id':id.title(),'name':name,'seconds':seconds,'amount':int(amount[1].replace(',',''))})
assert plants
rules=json.loads((workspace/'outputs/component-research/text/c884ee22dfd491ce.bin').read_text())['translate']
out={'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','source':'https://zik-ascend.github.io/isl-tools/wiki/magic-farm/','sha256':hashlib.sha256(raw).hexdigest(),'plants':plants,'rules':[r for r in rules if r['id'].startswith('Rule:text:SimGame3Main_')],'sandbox':{'seeds':'free','plots':6,'expandKnowledge':'100*current plots','water':'once per crop','growthKnowledge':'2*whole source minutes, awarded once on harvest','levels':'only source level1 growth/yield; no passive effects'}}
(root/'lib/farm-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n');print('Complete level1 plants',len(plants))
