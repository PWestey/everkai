#!/usr/bin/env python3
"""Reproduce the bounded Mine dataset from reviewed community/local evidence."""
import json
from pathlib import Path
app=Path(__file__).resolve().parents[1]
e=json.loads((app.parent/'isekai-research/notes/mine-clearance-readiness.json').read_text())
assert len(e['rows'])==8
for field,total in [('power','cumulativePower'),('mineCoin','cumulativeMineCoin'),('gold','cumulativeGold'),('fellowEXP','cumulativeFellowEXP')]:
 acc=0
 for n,row in enumerate(e['rows'],1):
  assert row['order']==n and row['golemoreGoldCoin']==0
  acc+=row[field];assert row[total]==acc
assert e['shop']['mineCoinCost']==300 and e['shop']['dailyLimit']==5
out={'policyVersion':1,'source':e['source'],'rows':e['rows'],'shop':e['shop'],'sandbox':e['proposedLocalPolicy']}
(app/'lib/mine-clearance-data.json').write_text(json.dumps(out,indent=2)+'\n')
