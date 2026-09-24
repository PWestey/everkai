"""Import the Familiar Pass's four benefits -- the magnitudes only, not the subscription.

docs/familiar-screen-specs/12-monetisation.md §5.2, approved by the owner 2026-09-24. Everkai has no
real money and no Pass, but three of the four things the Pass sold are good PROGRESSION rewards, and
the original has already told us their shape: they arrive STAGED, at Pass levels 1, 15 and 30, not all
at once. `System.PetBPRightShow` is that ladder, read verbatim:

    Item_PetBP_EnergyMax        Lv 1    stamina cap and regeneration
    Item_PetBP_IncomeMax        Lv 15   tower income and storage
    Item_PetBP_PetPacifyDaliy   Lv 30   one Ordinary Mochi a day
    Item_Owner_Hero_161         Lv 50   a Fellow -- SKIPPED, a roster decision, not a familiar one

The four benefit items carry no `useParam`: they are markers, and the magnitudes live in the System
constants beside them. All four are imported here and asserted.

THE BASE-VS-BOOSTED DISTINCTION IS THE LOAD-BEARING FACT, and getting it backwards would make Everkai
permanently generous against the original. The base values stay the defaults everywhere; the boosted
ones apply only past a gate. `img/tower-earnings.png` reads `48:00:00` and `img/hub.png` reads `50/50`
because that save carried the Pass -- neither is a base rule.

THE GATES ARE EVERKAI'S OWN and are marked as such in `gates` below. What is measured is the ORDER
(the original's) and the MAGNITUDES (the original's). What is ours is which of Everkai's own ladders
each one hangs off, and at what rung. Measured so the pacing is legible rather than asserted:
contracting the whole 71-familiar roster at 0 stars is 9,970 Compendium EXP, i.e. Lv. 99, so a
Compendium level is worth roughly 1% of a complete collection; Lv. 10 is about 40 distinct contracts
and Lv. 30 is about a third of the roster with some starring. Familiar Tower floor 100 is not a new
number at all -- it is `PetArea.unlock` for the second exploring area.
"""
import hashlib,json
from pathlib import Path
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT=Path(__file__).resolve().parent.parent
def table(rel):
 d=json.loads((CFG/rel).read_text())
 if isinstance(d,list):return d                            # rule 3: reward splits are bare lists
 assert len(d)==1,f'{rel}: unexpected wrapper {list(d)}'
 return d[next(iter(d))]

system={r['_id']:r for r in table('System.json')}
num=lambda k:system[k]['numberValue']
ladder=system['PetBPRightShow']['jsonValue']
assert [r['id'] for r in ladder]==['Item_PetBP_EnergyMax','Item_PetBP_IncomeMax','Item_PetBP_PetPacifyDaliy','Item_Owner_Hero_161'],ladder
assert [r['Lv'] for r in ladder]==[1,15,30,50],ladder

base={'staminaMax':num('PetExploreEnergyMax'),'staminaSeconds':num('PetExploreEnergyTime'),
      'holdHours':num('PetTowerIncomeTime'),'incomeBP':0}
boosted={'staminaMax':num('PetExploreEnergyMaxBP'),'staminaSeconds':num('PetExploreEnergyTimeBP'),
         'holdHours':num('PetTowerIncomeBPTimeMax'),'incomeBP':num('PetTowerIncomeBPCoef')}
assert base=={'staminaMax':20,'staminaSeconds':5400,'holdHours':24,'incomeBP':0},base
assert boosted=={'staminaMax':50,'staminaSeconds':3600,'holdHours':48,'incomeBP':1000},boosted
assert boosted['staminaMax']>base['staminaMax'] and boosted['staminaSeconds']<base['staminaSeconds']
assert boosted['holdHours']>base['holdHours']

daily=table('split_reward/rewardpetpacifydaliy.json')
assert len(daily)==1 and daily[0]['_id']=='RewardPetPacifyDaliy',daily
assert daily[0]['randomType']=='Fix'
assert daily[0]['content']==[{'id':'Item_PetPacify1','count':1,'type':'Item'}],daily[0]['content']

out={
 'sources':{n:hashlib.sha256((CFG/n).read_bytes()).hexdigest()
            for n in ['System.json','split_reward/rewardpetpacifydaliy.json']},
 'ladder':[{'id':r['id'],'passLevel':r['Lv']} for r in ladder],
 'base':base,'boosted':boosted,
 'daily':{'item':daily[0]['content'][0]['id'],'count':daily[0]['content'][0]['count'],'limit':1},
 # EVERKAI'S OWN. Not measured, not from any table -- see the docstring. The ORDER matches the
 # original's Pass ladder; only the ladder each one hangs off is ours.
 'gates':{'stamina':{'kind':'compendium','level':10},
          'income':{'kind':'towerFloor','floor':100},
          'mochi':{'kind':'compendium','level':30}},
 'skipped':'Item_Owner_Hero_161 (Pass Lv. 50): a Fellow grant is a roster decision, not a familiar one',
}
(ROOT/'lib/familiar-benefit-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(f"stamina {base['staminaMax']}->{boosted['staminaMax']} at {base['staminaSeconds']}->{boosted['staminaSeconds']}s; "
      f"tower hold {base['holdHours']}->{boosted['holdHours']}h, income +{boosted['incomeBP']/100:g}%; "
      f"daily {daily[0]['content'][0]['count']} x {daily[0]['content'][0]['id']}; 1 benefit skipped")
