#!/usr/bin/env python3
"""Import the original player-rank ladder, ranks 1-28, and its 22 rank-up Fellow encounters.

Sources are the plainly readable config tables in the private-server workspace:
  Level.json            expNeed (Fame to promote out of a rank) and prosperityNeed (earnings per second)
  CityAssignEvent.json  PlayerLvUpNum encounters: the rank each unlocks and its reward id
  Rewards.json + Item.json  reward -> Item_Owner_Hero_N -> useEffect 'hero', useParam.id N
Rank 28 is where the last Fellow arrives (Cimitir); ranks 29-70 grant no characters, so they are not
imported. Rows 1-4 must equal the rows the opening journey already shipped -- asserted below.
"""
import json,hashlib
from pathlib import Path
D=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def table(name):
    x=json.loads((D/name).read_text());return x[next(iter(x))] if isinstance(x,dict) else x
levels={r['_id']:r for r in table('Level.json')}
rewards={r['_id']:r for r in table('Rewards.json')}
items={r['_id']:r for r in table('Item.json')}
MAX_RANK=28
ranks=[{'rank':n,'fameToNext':int(levels[str(n)]['expNeed']),'earningsToNext':int(levels[str(n)]['prosperityNeed'])} for n in range(1,MAX_RANK)]
encounters=[]
for e in table('CityAssignEvent.json'):
    c=e.get('condition') or {}
    if c.get('type')!='PlayerLvUpNum':continue
    heroes=[x['id'] for x in rewards[e['reward']]['content'] if items.get(x['id'],{}).get('useEffect')=='hero']
    assert len(heroes)==1,(e['_id'],heroes)
    encounters.append({'id':e['_id'],'rank':int(c['count']),'reward':e['reward'],'fellow':'hero_'+str(items[heroes[0]]['useParam']['id'])})
encounters.sort(key=lambda e:e['rank'])
assert len(encounters)==22 and max(e['rank'] for e in encounters)==MAX_RANK,len(encounters)
opening=json.loads(Path('lib/opening-data.json').read_text())
for row in opening['ranks'][:4]:
    n=int(row['_id']);assert (ranks[n-1]['fameToNext'],ranks[n-1]['earningsToNext'])==(row['expNeed'],row['prosperityNeed']),n
out={'maxRank':MAX_RANK,'ranks':ranks,'encounters':encounters,
     'provenance':{'Level.json':sha(D/'Level.json'),'CityAssignEvent.json':sha(D/'CityAssignEvent.json'),'Rewards.json':sha(D/'Rewards.json'),'Item.json':sha(D/'Item.json'),
                   'note':'Rank r promotes to r+1 for fameToNext Fame once village earnings reach earningsToNext per second (Level.json expNeed / prosperityNeed of row r).'}}
Path('lib/rank-ladder-data.json').write_text(json.dumps(out,indent=1)+'\n')
print('ranks',len(ranks),'encounters',len(encounters))
