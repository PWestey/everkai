"""Extract pinned Inn identity and unlock facts; no external scripts executed."""
from pathlib import Path
import re,html,json,hashlib
root=Path(__file__).resolve().parents[1];workspace=root.parent.parent
p=workspace/'outputs/online-audit/public-reference/wiki/inn/index.html';raw=p.read_bytes();s=raw.decode();stations=[];dishes=[]
for category,out in [('stations',stations),('dishes',dishes)]:
 for match in re.finditer(r'<li id="inn-'+category+r'-(\d+)"(.*?)</li>',s,re.S):
  id,body=match.groups();attrs=dict(re.findall(r'(data-[a-z-]+)="([^"]*)"',body));name=html.unescape(re.search(r'<span class="inn-item-name">(.*?)</span>',body,re.S)[1]);row={'id':id,'name':name,'guests':int(attrs.get('data-unlock-sort') or 0)}
  if category=='dishes':row.update(station=attrs.get('data-station-id') or None,level=int(attrs.get('data-level-sort') or 0))
  out.append(row)
assert len(stations)==10 and len(dishes)==80
rules=json.loads((workspace/'outputs/component-research/datasets/Rule.json').read_text());rules=[r for r in rules if r['id'].startswith('Rule:text:SimGame1_')]
out={'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','source':'https://zik-ascend.github.io/isl-tools/wiki/inn/','sha256':hashlib.sha256(raw).hexdigest(),'stations':stations,'dishes':dishes,'localRules':rules,'sandbox':{'buildGoldPerStationId':100,'upgradeBlueprints':'current station level','stationCap':30,'guestStamina':1,'serviceMs':10000,'guestGold':50,'guestBlueprints':1,'guestFinesse':1,'staminaRefill':20,'queueCap':10,'recipeTasks':'waived, retain source guest/station gates'}}
(root/'lib/inn-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print('Imported',len(stations),'stations',len(dishes),'recipes; max station level',max(d['level'] for d in dishes))
