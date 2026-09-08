#!/usr/bin/env python3
"""Admit only contiguous complete numeric Insight rows from audited transcription."""
import json
from pathlib import Path
app=Path(__file__).resolve().parents[1]
e=json.loads((app.parent/'isekai-research/notes/insight-advancement-rows.json').read_text())
rows=e['rows']
assert len(rows)==45 and e['stop']['level']==46 and e['stop']['cumulativeAptitude'] is None
for n,r in enumerate(rows,1):
 assert r=={'level':n,'cumulativeAptitude':n,'cost':100}
mastery=json.loads((app.parent/'isekai-research/notes/default-advancement-mastery.json').read_text())
m=mastery['insightI']
assert m['maxLevel']==300 and m['listedCost']==100 and m['perLevelAptitude']==1 and m['explicitMasteryBooks']==30000
assert m['listedCost']*m['maxLevel']==m['explicitMasteryBooks']
p=app/'lib/insight-data.json';d=json.loads(p.read_text())
d['sources'][0]={'url':mastery['source'],'section':'Expertise Skills','accessed':mastery['accessed'],'facts':'Explicit mastery total30000books; listed100cost/+1Aptitude/cap300. Existing complete1–45rows corroborate early indexing. Zero→300costs30000; no inferred higher-tier effects.'}
for r in d['rules']:
 assert r['cost']==100 and r['aptitude']==1
 r['supportedLevels']=m['maxLevel']
p.write_text(json.dumps(d,indent=2)+'\n')
