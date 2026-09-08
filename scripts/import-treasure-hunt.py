#!/usr/bin/env python3
"""Import pinned community normal appraisal pools; reject incomplete or ambiguous joins."""
import re,json,hashlib,html
from pathlib import Path
app=Path(__file__).resolve().parents[1]
src=app.parents[1]/'outputs/online-audit/public-reference/wiki/treasure-hunt/index.html'
raw=src.read_bytes(); text=raw.decode()
def clean(x):return html.unescape(re.sub('<[^>]+>','',x)).strip()
relics=[]
for match in re.finditer(r'<li id="treasure-relic-[^"]+"[^>]*data-id-num="([^"]+)"[^>]*>(.*?)</article>\s*</li>',text,re.S):
 id,body=match.groups();name=re.search(r'class="fish-antique-name">(.*?)</span>',body,re.S)
 if name: relics.append({'id':id,'name':clean(name[1])})
assert len(relics)==45,len(relics)
byname={r['name']:r['id'] for r in relics};assert len(byname)==len(relics)
areas=[]
for i,(id,name) in enumerate([('Relic001','Original Ruins'),('Relic002','Memory Cave'),('Relic003','Frozen Abyss'),('Relic004','Ice Shipwreck')],1):
 gem=f'GemBall{i}01';start=text.index(f'id="treasure-gem-{gem.lower()}"');body=text[start:text.index('</ul>',start)]
 rows=re.findall(r'<li><span>(.*?)</span><strong>([\d.]+)%</strong></li>',body,re.S)
 pool=[{'id':byname[clean(n)],'percent':float(p)} for n,p in rows];total=sum(r['percent'] for r in pool)
 assert pool and abs(total-100)<=.05,(name,total)
 areas.append({'id':id,'name':name,'gem':gem,'level':i,'totalPercent':round(total,4),'pool':pool})
data={'provenance':{'url':'https://github.com/Zik-Ascend/isl-tools/blob/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/treasure-hunt/index.html','sha256':hashlib.sha256(raw).hexdigest(),'kind':'community snapshot; not version matched','policy':'normal pools only; rounding normalized'},'areas':areas,'relics':relics}
(app/'lib/treasure-data.json').write_text(json.dumps(data,indent=2)+'\n');print(len(areas),'areas',len(relics),'relics')

rule=app.parents[1]/'outputs/component-research/datasets/Rule.json'
rules=[r for r in json.loads(rule.read_text()) if re.fullmatch(r'Rule:text:SimGame5_\d+',r['id'])]
assert len(rules)==14
(app/'lib/treasure-rule-evidence.json').write_text(json.dumps({'source':'local readable Rule.json','sha256':hashlib.sha256(rule.read_bytes()).hexdigest(),'records':rules},indent=2)+'\n')
