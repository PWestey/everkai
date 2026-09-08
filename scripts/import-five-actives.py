#!/usr/bin/env python3
"""Verify admitted five-active coefficients against reviewed recovered evidence."""
from pathlib import Path
import json
app=Path(__file__).resolve().parents[1]
e=json.loads((app.parent/'isekai-research/independent/five-actives/five-actives-evidence.json').read_text())
rules={r['id']:r for r in json.loads((app/'lib/familiar-dot-data.json').read_text())['skills']}
assert set(rules)=={x['petId'] for x in e['selected']}
for x in e['selected']:
 r=rules[x['petId']];s=x['skill']
 assert r['sourceSkill']==s['_id'] and r['minVersion']==9
 assert r['percent']==s.get('EffectNum',0)/100 and r['targets']==s['TargetNum']
 assert (r['kind']=='damage')==('EffectNum' in s)
 assert len(r['effects'])==len(x['buffs'])
 for effect,b in zip(r['effects'],x['buffs']):
  assert effect['sourceBuff']==b['_id'] and effect['turns']==b['round']
  assert abs(effect['percent'])==b['EffectNum']/100
  assert effect['recipient']=='primary'
  assert (effect['basis']=='targetMaxHP')==(b.get('EffectTargetBase')==2 and b['EffectAttr']==3)
print('Verified five complete active joins and ten effects; local policies remain documented separately')
