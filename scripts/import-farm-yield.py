"""Import the Magic Tree building-yield ladder from the original's SimGame3Yield table.

The original reads this as farm NPC5's level (farm.py: `YIELD.get(n['level']).buildingYieldPercent`)
and adds it to every building's bonus stack. It is one of the twelve strands in
docs/slice-buildings.md 5d, and the most portable of them: 201 levels, a flat +5% per level, and no
weights, rolls or keep-or-discard step anywhere.

Cost is the farm's own knowledge score, which Everkai already has as `farm.knowledge`.
"""
from pathlib import Path
import json,hashlib

app=Path(__file__).resolve().parents[1]
# Absolute, like import-businesses.py, import-operations.py and import-fathoms.py. The
# app.parents[1] idiom resolves to /Users from this repo; see docs/backlog.md.
data=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')
YIELD_SHA='f8fe6310a70224d5c849c7346b8816a0c9fc9177ac915e4bf978a8f961ab4421'

raw=(data/'SimGame3Yield.json').read_bytes()
got=hashlib.sha256(raw).hexdigest()
assert got==YIELD_SHA,f'SimGame3Yield.json is not the pinned source: {got}'
rows={int(r['_id']):r for r in json.loads(raw)['SimGame3Yield']}

levels=[]
for index in range(len(rows)):
 row=rows[index]
 percent=row['buildingYieldPercent']
 assert percent%100==0,f'level {index} yield {percent} is not a whole percent'
 entry={'level':index,'percent':percent//100}
 # Every level but the last names what the NEXT step costs. The terminal row carries none, exactly
 # as BuildingBusiness's last row does.
 if 'consume' in row:entry['consume']=int(row['consume'])
 levels.append(entry)

assert len(levels)==201
assert levels[0]['percent']==0 and levels[-1]['percent']==1000
assert 'consume' not in levels[-1],'the terminal level must not be purchasable past'
steps=[l['percent']-levels[i]['percent'] for i,l in enumerate(levels[1:])]
assert set(steps)=={5},f'expected a flat +5% per level, saw {sorted(set(steps))}'

out={'provenance':('Imported from the original SimGame3Yield table by scripts/import-farm-yield.py. '
                   'Levels, percentages and costs are the table\'s own values. The original reads this '
                   "as farm NPC5's level (the Magic Tree) and adds buildingYieldPercent to every "
                   'building. Percent is buildingYieldPercent/100, a whole number.'),
     'sources':[{'file':'SimGame3Yield.json','sha256':YIELD_SHA,'field':'buildingYieldPercent, consume'}],
     'limits':('Cost is denominated in the farm knowledge score, which Everkai already tracks as '
               'farm.knowledge; no currency is invented. The first step costs 20,000, then the ladder '
               'restarts at 10,000 and climbs 2,500 a level to 505,000 -- that anomalous first row is '
               'the original\'s, not a transcription error. Nothing here is random: the original has '
               'no weights or rolls on this ladder.'),
     'levels':levels}

(app/'lib/farm-yield-data.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
first=next(l['consume'] for l in levels if 'consume' in l)
total=sum(l.get('consume',0) for l in levels)
print(f'{len(levels)} levels, +{levels[-1]["percent"]}% at the top; first step {first:,}, '
      f'full ladder {total:,} knowledge')
