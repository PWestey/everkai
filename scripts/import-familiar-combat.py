"""Import PetSkill (192) and PetBuff (137) -- 42% of all absent familiar rows -- plus the six
attribute columns Everkai never carried and the skill ids each familiar actually owns.

WHY THIS TABLE PAIR IS THE HIGH-LEVERAGE ONE. Three separate gaps close on it:
  * the POWER formula. `PetInfo:GetPower` sums ALL NINE PetAttr rows by their CombatAdd and then
    multiplies by (1 + skillAddRatio/10000) drawn from `PetSkill.Combatcoef`. Everkai summed three
    attributes and applied no skill ratio at all.
  * the tower's eight missing combat kits (community data covers 63 of 71).
  * the locked preview's skill list, which spec 07 records as deferred for want of this table.

THE FORMULA, transcribed from the client rather than inferred (private-server/readable/PetInfo.lua):

  GetAttrValue(attr, stage, level, star)                                     :763 and :796
    base = Pet[PetAttr[attr].Field]                    -- ATK, HP, SPD, CRIT, CRIT_RES, Block, ACC, DI, DR
    ATK  = base x (1 + (PetClass[stage].ATKcoef + PetLevel[level].ATKcoef)/10000) x (1 + PetStar[star].ATKcoef/10000)
    HP   = the same with HPcoef
    SPD  = base x (1 + (PetClass[stage].SPDadd  + PetLevel[level].SPDadd )/10000)   -- NO star term
    the other six are flat
    then x (1 + skillAddRatio/10000) + skillAddValue, from SkillType 4 rows whose EffectAttr is this
    attribute: EffectNumType 1 adds to the ratio, 2 adds to the value
    floor

  GetPower(stage, level, star)
    allAttrPower = SUM over all nine attrs of GetAttrValue(attr) x PetAttr[attr].CombatAdd
    skillAddRatio = Combatcoef(ActiveSkill) + Combatcoef(each PassiveSkillN unlocked by stage)
    power = floor(allAttrPower x (1 + skillAddRatio/10000))

  Which skills a familiar owns: `Pet.ActiveSkill` always, and `Pet.PassiveSkill{1,2,3}` gated by
  `PetClass.PassiveSkillUnlock` -- measured below as stage 2, 4 and 6, the only three rows that carry it.

A NOTE ON READING THIS TABLE (CLAUDE.md rule 4, and I tripped over it on the way). `PetSkill` is
SPARSE: row 1's key set is 14 columns and the table has 26. Reading one real row is the rule; taking
its key set for the schema is a different mistake, and it made me tell the owner `Combatcoef` did not
exist when it is on 105 of the 192 rows. Every column count below is taken across ALL rows.
"""
import hashlib,json,collections
from pathlib import Path
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT=Path(__file__).resolve().parent.parent
def table(rel):
 d=json.loads((CFG/rel).read_text())
 if isinstance(d,list):return d
 assert len(d)==1,f'{rel}: unexpected wrapper {list(d)}'
 return d[next(iter(d))]

skills={r['_id']:r for r in table('PetSkill.json')}
buffs={r['_id']:r for r in table('PetBuff.json')}
attrs=table('PetAttr.json')
classes=table('PetClass.json')
pets=table('Pet.json')
assert len(skills)==192 and len(buffs)==137 and len(attrs)==9 and len(classes)==10 and len(pets)==70

# Sparse-aware column census, so a shape change is loud.
cols=collections.Counter(k for r in skills.values() for k in r)
assert cols['_id']==192 and cols['SkillType']==192
assert cols['Combatcoef']==105,f"Combatcoef on {cols['Combatcoef']} rows, expected 105"
kinds=collections.Counter(r['SkillType'] for r in skills.values())
assert kinds=={4:77,2:70,3:35,1:10},kinds
# Only the two Combatcoef-bearing kinds feed Power; SkillType 4 feeds GetAttrValue instead.
for r in skills.values():
 assert ('Combatcoef' in r)==(r['SkillType'] in (2,3)),f"{r['_id']} SkillType {r['SkillType']}"

ATTR={r['_id']:{'field':r['Field'],'type':r['type'],'combatAdd':r['CombatAdd']} for r in attrs}
assert [a['field'] for a in ATTR.values()]==['ATK','HP','SPD','CRIT','CRIT_RES','Block','ACC','DI','DR']
assert [a['combatAdd'] for a in ATTR.values()]==[15,1,30,5,5,5,5,30,30]

unlock={r['_id']:r['PassiveSkillUnlock'] for r in classes if r.get('PassiveSkillUnlock')}
assert unlock=={'2':'PassiveSkill1','4':'PassiveSkill2','6':'PassiveSkill3'},unlock

SKILL_KEYS=['ActiveSkill','PassiveSkill1','PassiveSkill2','PassiveSkill3','NormalAttack']
out_pets={}
referenced=set()
for p in pets:
 pid=f"Pet_{p['_id']}"
 row={'attrs':{a['field']:p[a['field']] for a in ATTR.values()},
      'skills':{k:str(p[k]) for k in SKILL_KEYS if p.get(k) is not None}}
 referenced|=set(row['skills'].values())
 out_pets[pid]=row
assert len(out_pets)==70
# Every skill the roster points at resolves, and the table has no orphans either way.
missing=sorted(referenced-set(skills))
assert not missing,f'referenced but absent from PetSkill: {missing[:5]}'
assert len(referenced)==192,f'{len(referenced)} of 192 PetSkill rows are reachable from a Pet row'
# Every BuffID a skill names resolves too. `BuffID` is a LIST, not a scalar -- rule 4 again, and the
# second shape surprise in this one table.
buff_refs=set()
for r in skills.values():
 b=r.get('BuffID')
 if b is None:continue
 assert isinstance(b,list),f"{r['_id']} BuffID is {type(b).__name__}, not a list"
 buff_refs|={str(x) for x in b}
orphan=sorted(b for b in buff_refs if b not in buffs)
assert not orphan,f'BuffID with no PetBuff row: {orphan[:5]}'

out={'sources':{n:hashlib.sha256((CFG/n).read_bytes()).hexdigest()
                for n in ['PetSkill.json','PetBuff.json','PetAttr.json','PetClass.json','Pet.json']},
 'attr':ATTR,'passiveUnlock':unlock,'skills':skills,'buffs':buffs,'pets':out_pets}
(ROOT/'lib/familiar-combat-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
size=(ROOT/'lib/familiar-combat-data.json').stat().st_size
print(f"{len(skills)} PetSkill + {len(buffs)} PetBuff rows, {len(ATTR)} attributes, {len(out_pets)} familiars, "
      f"{len(buff_refs)} buff references, {size/1024:.0f} KB")
