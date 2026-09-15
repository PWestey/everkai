"""Import the original fishing draw: per-level rarity weights, level EXP and ground unlock levels.

Sources (read-only private-server tables):
  FishLevel.json  500 rows: `exp` to advance out of that level, fish1..fish5 rarity weights (of 10,000).
                  artifact1/artifact2/random weights are dropped: artifacts and random events are not
                  implemented, so a cast renormalises over the fish weights only.
  FishSpot.json   each spot's `level` gate and species list. Everkai's grounds are matched to spots by
                  identical species sets (asserted), so the unlock level is the original's.
  Fish.json       `rare` 1-5 (asserted to equal Everkai's N/R/SR/SSR/UR) and `exp` per catch (10 for
                  every spot species, asserted).
The two Event-only species belong to no spot and are not castable.
"""
import hashlib,json
from pathlib import Path
D=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')
ROOT=Path(__file__).resolve().parent.parent
rows=lambda name:list(json.loads((D/f'{name}.json').read_text()).values())[0]
sha=lambda name:hashlib.sha256((D/f'{name}.json').read_bytes()).hexdigest()
levels=rows('FishLevel');spots=rows('FishSpot');fish={f['_id']:f for f in rows('Fish')}
species=json.loads((ROOT/'lib/fishing-species.json').read_text())['records']
RARE={'N':1,'R':2,'SR':3,'SSR':4,'UR':5}
for r in species:assert fish[r['id']]['rare']==RARE[r['rarity']],r['id']
grounds={}
by_ground={}
for r in species:
 for g in r['locations']:by_ground.setdefault(g,set()).add(r['id'])
for g,ids in sorted(by_ground.items()):
 if g=='Event':continue
 match=[s for s in spots if set(s['fish'])==ids]
 assert len(match)==1,(g,[s['_id'] for s in match])
 for i in ids:assert fish[i].get('exp')==10,i
 grounds[g]={'spot':match[0]['_id'],'level':match[0]['level']}
assert grounds['Village River']['level']==1
out={'sources':{n:sha(n) for n in ['FishLevel','FishSpot','Fish']},
 'expPerCatch':10,
 'grounds':grounds,
 # [exp to leave this level, N, R, SR, SSR, UR]; index 0 is fishing level 1.
 'levels':[[l['exp']]+[l.get(f'fish{k}',0) for k in range(1,6)] for l in levels]}
assert out['levels'][0]==[80,5000,5000,0,0,0]
(ROOT/'lib/fishing-draw-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(len(out['levels']),'levels',{g:v['level'] for g,v in grounds.items()})
