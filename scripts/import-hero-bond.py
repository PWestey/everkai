"""Import HeroBond -- the Fellow groups, their collection progress and their group auras.

This is catalogue F8 (Bond Compendium) and the missing half of F6 (group auras) in ONE import,
because they read the same three tables. That they are one slice was measured on 2026-09-25 while
building the locked-fellow preview: every one of Everkai's 128 star halos belongs to exactly one
Fellow, so the preview's aura membership row had nothing to draw, and the group data it needed is
this table.

THE THREE TABLES, and what each one actually holds:

  HeroBond           23 rows. Each is a GROUP: `bond` is its member hero-id list. Sizes run 0 to 30
                     (one placeholder row is empty). 131 distinct heroes are named across them.
                     Four rows carry an `itemId`, an exchange item Everkai has no counterpart for.
  HeroBondBonus     190 rows. Per-hero aura bonuses: `heroId`, `unlockReq` (a star threshold,
                     1..500) and `skillId` into SkillBase. 133 are `self`-scoped -- those are the
                     per-Fellow halos Everkai already ships as STAR_HALOS -- and **57 are scoped
                     `{conditionType:'bond', id:N}`, which is the group aura and the new thing.**
  HeroBondCondition  13 rows, and the shape is the finding: ALL THIRTEEN are `bondId 5`,
                     `bondType 1`, `value 5`, pointing at the SAME skill `Hero_Bond5_Halo1`. The
                     "activating a complete group grants attribute bonuses" mechanic exists in the
                     shipped config for exactly ONE group. Imported and recorded, not generalised.

MEASURED about the group auras (rule 6 -- the constancy is the point): all 57 grant `talent`, at
+2, +10 or +20, and they cover only FOUR of the 23 groups (3, 5, 10, 13). So the group aura is a
narrow mechanic on a broad collection: the Compendium tracks 23 groups, four of which pay.
"""
import hashlib,json,collections
from pathlib import Path
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT=Path(__file__).resolve().parent.parent
def table(n):
 d=json.loads((CFG/f'{n}.json').read_text())
 return d if isinstance(d,list) else d[next(iter(d))]

bonds=table('HeroBond');bonus=table('HeroBondBonus');cond=table('HeroBondCondition')
skills={r['_id']:r for r in table('SkillBase')}
assert len(bonds)==23 and len(bonus)==190 and len(cond)==13,(len(bonds),len(bonus),len(cond))

groups={}
for b in bonds:
 groups[b['_id']]={'members':[f"hero_{h}" for h in b.get('bond',[])],'itemId':b.get('itemId')}
named={m for g in groups.values() for m in g['members']}
assert len(named)==131,len(named)

# Every skill both tables name must resolve, or a bonus silently pays nothing.
for r in bonus:assert r['skillId'] in skills,r['skillId']
for r in cond:assert r['bondSikllId'] in skills,r['bondSikllId']

auras=[]
for r in bonus:
 s=skills[r['skillId']]
 tc=s.get('targetCondition') or {}
 if tc.get('conditionType')!='bond':continue          # `self` rows are Everkai's existing STAR_HALOS
 assert tc['id'] in groups,f"{r['skillId']} scopes bond {tc['id']}, which has no HeroBond row"
 auras.append({'hero':f"hero_{r['heroId']}",'bond':tc['id'],'unlockReq':r['unlockReq'],
               'skill':r['skillId'],'prop':s['skillProp']['id'],
               'propType':s['skillProp'].get('propType'),'value':s.get('skillProp_Initial',0)})
assert len(auras)==57,len(auras)
assert {a['prop'] for a in auras}=={'talent'},{a['prop'] for a in auras}
assert {a['bond'] for a in auras}=={'3','5','10','13'},{a['bond'] for a in auras}
assert {a['value'] for a in auras}=={2,10,20},{a['value'] for a in auras}

# The one activation condition in the shipped config, kept whole rather than generalised.
assert {c['bondId'] for c in cond}=={'5'} and {c['bondType'] for c in cond}=={1} and {c['value'] for c in cond}=={'5'}
halo=skills[cond[0]['bondSikllId']]
activation={'bond':'5','need':5,'skill':cond[0]['bondSikllId'],'heroes':[f"hero_{c['_id']}" for c in cond],
            'prop':halo['skillProp']['id'],'propType':halo['skillProp'].get('propType'),
            'value':halo.get('skillProp_Initial',0),'maxLevel':halo.get('maxUpgradeLevel')}

out={'sources':{n:hashlib.sha256((CFG/f'{n}.json').read_bytes()).hexdigest()
                for n in ['HeroBond','HeroBondBonus','HeroBondCondition','SkillBase']},
 'groups':groups,'auras':auras,'activation':activation}
(ROOT/'lib/hero-bond-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
sizes=collections.Counter(len(g['members']) for g in groups.values())
print(f"{len(groups)} groups over {len(named)} heroes (sizes {dict(sorted(sizes.items()))}); "
      f"{len(auras)} group auras across {len({a['bond'] for a in auras})} groups, all `talent`; "
      f"1 activation condition, on bond 5")
