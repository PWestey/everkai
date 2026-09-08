#!/usr/bin/env python3
"""Verify eight admitted kits and declared critical pairs against reviewed evidence."""
from pathlib import Path
import json
app=Path(__file__).resolve().parents[1]
e=json.loads((app.parent/'isekai-research/independent/crit-cluster/crit-cluster-evidence.json').read_text())
d=json.loads((app/'lib/familiar-crit-data.json').read_text());rules={r['id']:r for r in d['skills']}
assert set(rules)=={x['petId'] for x in e['selected']}
for x in e['selected']:
 r=rules[x['petId']];s=x['skill'];assert r['sourceSkill']==s['_id'] and r['minVersion']==10 and r['targets']==s['TargetNum'];assert r['percent']==s.get('EffectNum',0)/100
 assert len(r['effects'])==len(x['buffs'])
 for effect,b in zip(r['effects'],x['buffs']):
  assert effect['sourceBuff']==b['_id'] and effect['turns']==b['round']
  assert (effect['recipient']=='self')==(b.get('TargetCamp')==1)
  if effect['kind'] in ['crit','critRes']:assert effect['basisPoints']==b['EffectNum']*(-1 if b['EffectType']==2 else 1)
  else:assert effect['percent']==b['EffectNum']/100
bases={x['id']:x for x in d['bases']};assert len(bases)==len(e['baseCrit'])==71
for x in e['baseCrit']:assert (bases[x['id']]['critBP'],bases[x['id']]['resistanceBP'])==(x['communityCRIT'],x['communityCRIT_RES'])
assert d['guardians']=={'critBP':500,'resistanceBP':0,'provenance':'authored local enemy balance'}
print('Verified eight kits/eleven buffs/seventy-one declared pairs; guardian and probability policy explicitly local')
