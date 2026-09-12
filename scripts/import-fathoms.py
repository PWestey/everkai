"""Import the Family Fathom slot ladder from the original's WifeQuenching tables.

The original's rule (family_skills.py): each owned family member carries quenchingSlot entries with a
`prop` (a country id, or '0' for every country) and a `rise`; a building sums the rises whose prop
matches its country or is '0'. Slots unlock purely on intimacy, in a fixed order, and each slot's
country is fixed by its index -- nothing about which country a slot serves is random.

Only the slot's *value* is rolled in the original, across WifeQuenchingWight's tiers. Everkai keeps
the tier ladder but advances it through habits and elapsed time instead of weighted rerolls, so the
weights and success rates are deliberately NOT imported -- only the tier values they can produce.
See docs/slice-buildings.md 5c.
"""
from pathlib import Path
import json,hashlib

app=Path(__file__).resolve().parents[1]
# Absolute, like import-businesses.py and import-operations.py. The app.parents[1] idiom resolves to
# /Users from this repo and leaves the script unrunnable; see docs/backlog.md.
data=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')

UNLOCK_SHA='361f81e24b1d1014c59bfe4a49a6bb9442c116245e318da713e725007ddd927c'
TIERS_SHA='014b5cfa45cb47f54b9afd4bf4c923a567c6b1d5623a1223503b06ae17da03ae'

def read(name,sha):
 raw=(data/f'{name}.json').read_bytes()
 got=hashlib.sha256(raw).hexdigest()
 assert got==sha,f'{name}.json is not the pinned source: {got}'
 return json.loads(raw)[name]

unlock=read('WifeQuenchingUnlock',UNLOCK_SHA)
tiers=read('WifeQuenchingWight',TIERS_SHA)

# BuildingBase.country -> this project's business type, verified 1:1 in lib/business-data.json's
# typeSource block. '0' means every country, which becomes a null type: fellowOperation and the
# business bonus both treat a missing type as matching everything.
COUNTRY={'1':'Inspiring','2':'Diligent','3':'Brave','4':'Informed','5':'Unfettered','0':None}

slots=[]
for index,row in enumerate(sorted(unlock,key=lambda r:int(r['_id'])),start=1):
 assert int(row['_id'])==index,'WifeQuenchingUnlock is not a dense 1..N ladder'
 country=str(row['buildingCountry'])
 assert country in COUNTRY,f'unmapped country {country}'
 slots.append({'slot':index,'intimacy':row['intimacy'],'type':COUNTRY[country],
               'sourceCountry':country,'premium':row['skillQuality']=='1'})

steps=[]
for row in sorted(tiers,key=lambda r:int(r['_id'])):
 rise=row['outputRise']
 assert rise%100==0,f'tier {row["_id"]} rise {rise} is not a whole percent'
 steps.append({'tier':int(row['_id']),'percent':rise//100})

assert len(slots)==36 and len(steps)==25
assert [s['percent'] for s in steps]==sorted(s['percent'] for s in steps),'tiers must ascend'
assert slots[0]['intimacy']==50 and slots[-1]['intimacy']==5000
# Six of each country including the all-country slots, cycling 2,4,3,1,5,0.
counts={}
for s in slots:counts[s['sourceCountry']]=counts.get(s['sourceCountry'],0)+1
assert set(counts.values())=={6},f'expected six slots per country, got {counts}'

out={'provenance':('Imported from the original WifeQuenchingUnlock and WifeQuenchingWight tables by '
                   'scripts/import-fathoms.py. Slot order, intimacy gates and per-slot country are the '
                   "original's own values. Country is mapped to this project's business type via "
                   'BuildingBase.country (1 Inspiring, 2 Diligent, 3 Brave, 4 Informed, 5 Unfettered), '
                   "verified 1:1 in lib/business-data.json typeSource; country '0' becomes a null type "
                   'meaning every business.'),
     'sources':[{'file':'WifeQuenchingUnlock.json','sha256':UNLOCK_SHA,'field':'intimacy, buildingCountry, skillQuality'},
                {'file':'WifeQuenchingWight.json','sha256':TIERS_SHA,'field':'outputRise'}],
     'limits':('Only the tier VALUES are imported. The original rolls a slot against WeightNormal or '
               'WeightHigh with per-tier success rates and a keep-or-discard replace step; Everkai '
               'advances slots through habits and elapsed time instead, so those weights and success '
               'rates are deliberately not carried over. Slot advancement is monotonic in both '
               'designs. See docs/slice-buildings.md 5c.'),
     'slots':slots,'steps':steps}

(app/'lib/fathom-data.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print(f'{len(slots)} slots, intimacy {slots[0]["intimacy"]}..{slots[-1]["intimacy"]}; '
      f'{len(steps)} tiers, {steps[0]["percent"]}%..{steps[-1]["percent"]}%; '
      f'{sum(1 for s in slots if s["type"] is None)} all-business slots')
