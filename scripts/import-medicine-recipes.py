#!/usr/bin/env python3
"""Verify curated puzzle data against the reviewed read-only source audit."""
import json
from pathlib import Path
app=Path(__file__).resolve().parents[1]
evidence=app.parent/'isekai-research/independent/medicine/medicine-recipe-evidence.json'
# The root exporter pins the independent report before this verifier is run.
x=json.loads(evidence.read_text())
data={'policyVersion':1,'provenance':'Recovered APK Medicine/MedicineList and client puzzle/selector; see medicine-discovery-implementation contract for explicit local completion semantics.','colors':[{'id':v['_id'],'name':v['colour']} for v in x['ingredientDefinitions']],'recipes':[{'id':v['medicineId'],'name':v['nameCommunity'],'staff':v['sourceEmployeeGate'],'formula':v['ingredients']} for v in x['normalRecipes']]}
assert len(data['recipes'])==10 and len(data['colors'])==5
for p in data['recipes']:
 assert [x['id'] for x in p['formula']]==['1','2','3','4','5']
 assert sum(x['count'] for x in p['formula'])==5 and all(0<=x['count']<=3 for x in p['formula'])
assert json.loads((app/'lib/medicine-recipe-data.json').read_text())==data
print('Ten target-specific recipe vectors and staffing thresholds match the reviewed evidence.')
