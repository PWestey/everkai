"""Import the Family Fathom slot ladder from the original's WifeQuenching tables.

The original's rule (family_skills.py): each owned family member carries quenchingSlot entries with a
`prop` (a country id, or '0' for every country) and a `rise`; a building sums the rises whose prop
matches its country or is '0'. Slots unlock purely on intimacy, in a fixed order, and each slot's
country is fixed by its index -- nothing about which country a slot serves is random.

Only the slot's *value* is rolled in the original, across WifeQuenchingWight's tiers.

THE ROLL, IMPORTED 2026-09-22 (docs/character-systems-gap.md 3.3 and 7.4). Everkai's own free,
deterministic, habit-paced drip is KEPT exactly as it is -- rule 12: a stored tier must never become
worth less, and re-pricing the ladder would change fathomBonus for every existing save. What is added
beside it is the original's own mechanic, as an optional PAID fast path:

  roll the weight table, keep the draw only if it is strictly better than the tier already held.

That reading is MEASURED, not inferred. The stored `successRate*` columns are not a probability of
anything the client rolls -- they are exactly P(draw > current tier) under this rule, and they fall
out of the weight columns only if the rule is keep-if-better. Two of them are reproduced below to
within the config's own rounding, and they are the screenshot's own numbers:
  tier 21, gold:     sum(WeightNormal above 21) / sum(WeightNormal) = 585 / 181,545 = 0.322%
                     against the table's stored 32 (hundredths) and the panel's "0.32%"
  tier 21, advanced: sum(WeightHigh above 21)   / sum(WeightHigh)   = 17,500 / 49,500 = 35.35%
                     against the table's stored 3500 and the panel's "35%"

WifeQuenchingConsume (1,180 rows) is the GOLD price, indexed by how many times that slot has been
rolled: 10 gold at the first, 1e21 at the 1,180th, and `consume2` is the 3x price of the
all-buildings premium slots (System.WifeQuenchingConsumeGoldRatio = 3). Advanced rolls cost Luck
Stones instead: System.WifeQuenchingConsumeHigh = 1, ConsumeHigh2 = 3 for a premium slot.
"""
from pathlib import Path
import json,hashlib

app=Path(__file__).resolve().parents[1]
# Absolute, like import-businesses.py and import-operations.py. The app.parents[1] idiom resolves to
# /Users from this repo and leaves the script unrunnable; see docs/backlog.md.
data=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')

UNLOCK_SHA='361f81e24b1d1014c59bfe4a49a6bb9442c116245e318da713e725007ddd927c'
TIERS_SHA='014b5cfa45cb47f54b9afd4bf4c923a567c6b1d5623a1223503b06ae17da03ae'
COST_SHA='c861074878b0a1124bbba2351b61a3da763aeb65f9928a1e9c669c367d607a99'
SYSTEM_SHA='d8ea3b50e218ba4b0e4eeeffbcec6b30824387ad2db6d77b0340c63750359312'
GOLD='3'                       # item id 3 is gold, as in BuildingBase.consume
STONE='Item_Quenching_Wife_1'  # "Luck Stone", the currency Latency competes for


def number(v):
 """Rule 5: ints, plain strings and scientific-notation strings all arrive here."""
 if isinstance(v,(int,float)):return int(v)
 return int(float(str(v)))

def read(name,sha):
 raw=(data/f'{name}.json').read_bytes()
 got=hashlib.sha256(raw).hexdigest()
 assert got==sha,f'{name}.json is not the pinned source: {got}'
 return json.loads(raw)[name]

unlock=read('WifeQuenchingUnlock',UNLOCK_SHA)
tiers=read('WifeQuenchingWight',TIERS_SHA)
costs=read('WifeQuenchingConsume',COST_SHA)
system={r['_id']:r for r in read('System',SYSTEM_SHA)}

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
 steps.append({'tier':int(row['_id']),'percent':rise//100,
               'normal':number(row['WeightNormal']),'high':number(row['WeightHigh']),
               'rateNormal':number(row['successRateNormal']),'rateHigh':number(row['successRateHigh'])})

# THE DERIVATION, reproduced. `successRate*` is P(draw > current tier) under keep-if-better, and
# nothing else in the table produces these numbers. The stored column is rounded -- tier 1 keeps 9200
# (92.00%) against an exact 91.74% -- so the per-tier check is against the config's own rounding, at
# most 0.47 percentage points across all 50 rows. The two tier-21 reproductions below are exact and
# are what the claim actually rests on; they are the reference screenshot's own "0.32%" and "35%".
def above(key,tier):
 return sum(s[key] for s in steps if s['tier']>tier)
for key,rate,scale in (('normal','rateNormal',10000),('high','rateHigh',10000)):
 total=sum(s[key] for s in steps)
 assert total>0,key
 for s in steps:
  want=s[rate]/scale
  got=above(key,s['tier'])/total
  assert abs(want-got)<0.005,(key,s['tier'],want,got)
assert (above('normal',21),sum(s['normal'] for s in steps))==(585,181545)
assert (above('high',21),sum(s['high'] for s in steps))==(17500,49500)

# The gold ladder, indexed by how many times a slot has been rolled. Rule 5: these arrive as strings
# up to 1e21, which int() would take but float() would round -- so they are kept as STRINGS in the
# output and parsed where they are used, beside Everkai's own MAX_GOLD clamp.
gold=[]
for row in sorted(costs,key=lambda r:int(r['_id'])):
 assert row['consume']['id']==GOLD and row['consume2']['id']==GOLD,row
 one,three=str(row['consume']['count']),str(row['consume2']['count'])
 assert int(three)==3*int(one),(one,three)   # WifeQuenchingConsumeGoldRatio = 3
 gold.append(one)
assert len(gold)==1180,len(gold)
assert (gold[0],gold[-1])==('10','1000000000000000000000'),(gold[0],gold[-1])
stone_one=system['WifeQuenchingConsumeHigh']['jsonValue']
stone_three=system['WifeQuenchingConsumeHigh2']['jsonValue']
assert stone_one[0]['id']==STONE and stone_three[0]['id']==STONE
assert (number(stone_one[0]['count']),number(stone_three[0]['count']))==(1,3)
assert number(system['WifeQuenchingConsumeGoldRatio']['numberValue'])==3

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
                {'file':'WifeQuenchingWight.json','sha256':TIERS_SHA,'field':'outputRise, WeightNormal, WeightHigh, successRate*'},
                {'file':'WifeQuenchingConsume.json','sha256':COST_SHA,'field':'consume (gold), consume2'},
                {'file':'System.json','sha256':SYSTEM_SHA,'field':'WifeQuenchingConsumeHigh, High2, GoldRatio'}],
     'limits':("THE TIER VALUES AND THE ROLL are both imported since 2026-09-22. `percent` is the "
               "value a tier pays; `normal`/`high` are the two weight columns the original draws "
               "from and `rateNormal`/`rateHigh` are its own stored P(draw > this tier) under "
               "keep-if-better, reproduced from the weights by this script to within its rounding. "
               "`gold` is WifeQuenchingConsume indexed by a slot's roll COUNT, kept as decimal "
               "STRINGS because it reaches 1e21 and Everkai's MAX_GOLD is 1e15 -- lib/fathoms.mjs "
               "decides where that stalls. Everkai's own free, habit-paced +1-tier advance is KEPT "
               "beside the roll rather than replaced: a stored tier must never become worth less "
               "(CLAUDE.md rule 12), and docs/character-systems-gap.md 7.4 recommends exactly this "
               "shape. Slot advancement is monotonic in both designs."),
     'roll':{'goldItem':GOLD,'stoneItem':STONE,'stone':1,'premiumStone':3,'premiumGoldRatio':3},
     'gold':gold,
     'slots':slots,'steps':steps}

(app/'lib/fathom-data.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
# Pacing, from the tables alone: expected rolls to reach the top tier. Because the draw is memoryless
# and kept only when better, that is totalWeight/weight(top) wherever you start.
normal_total=sum(s['normal'] for s in steps);high_total=sum(s['high'] for s in steps)
print(f'{len(slots)} slots, intimacy {slots[0]["intimacy"]}..{slots[-1]["intimacy"]}; '
      f'{len(steps)} tiers, {steps[0]["percent"]}%..{steps[-1]["percent"]}%; '
      f'{sum(1 for s in slots if s["type"] is None)} all-business slots')
print(f'to the top tier: {normal_total/steps[-1]["normal"]:,.0f} gold rolls or '
      f'{high_total/steps[-1]["high"]:,.0f} advanced rolls; '
      f'gold ladder {gold[0]}..{gold[-1]} over {len(gold)} attempts')
