"""Import the costume skills -- catalogue F9, slice A -- and nothing that needs an invented economy.

WHAT F9 IS. Everkai's wardrobe says so on collection: "This sandbox costume grants no stat bonuses."
In the original every costume carries skills, and they are the second-largest character system after
Stella. `docs/parity-catalog.csv` F9 has read "Not started - genuinely absent" since 2026-09-24.

WHY THIS SLICE STOPS WHERE IT DOES. A costume's skills scale with its LEVEL, and levels come from
duplicate chips out of an event economy Everkai has no counterpart for. But level 1 is not bought: the
`consume` column is one chip and that is the unlock, so **owning a costume IS level 1**, and everything
level 1 pays is sourced. That is this slice. Levelling, and the whole `ClothesExtraEffect` half (2,182
rows paying `atk` and `maxLevel` through `skill` and `bless` scopes lib/hero-scope.mjs does not have),
are deliberately out -- see docs/parity-catalog.csv F9.

THE THREE SKILLS THAT PAY AT LEVEL 1:

  HeroClothes.clothesTalentSkill   178/178. `self`, `talent`. Runs at `talentSkillBaseLevel` (20).
                                   This is the only one gated on WEARING the costume's owner.
  HeroClothes.clothesHaloSkill     134/178. `country`, `talent`, level off `haloSkillLevelLimit`
                                   (clothesLevel 1 -> skillLevel 30). Reaches every Fellow of that
                                   type whether or not they own anything.
  WifeClothes.WifeClothesHaloSkill1 83/111. `country`, `talent`, level off `WifeHaloSkillLevelLimit1`
                                   (clothesLevel 1 -> 40). A FAMILY member's costume, paying FELLOWS
                                   (`target: hero`) -- which is why the Family half is in this slice.

NOT AT LEVEL 1, and therefore not here: `WifeClothesHaloSkill2` is `atk`/`percent` and its own
`WifeClothesHaloSkill2Unlock` is costume level 2. Imported and marked so the gap is visible; nothing
reads it until levelling exists.
"""
import hashlib,json,collections
from pathlib import Path
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT=Path(__file__).resolve().parent.parent
def table(n):
 d=json.loads((CFG/f'{n}.json').read_text())
 return d if isinstance(d,list) else d[next(iter(d))]

hero={r['_id']:r for r in table('HeroClothes')}
wife={r['_id']:r for r in table('WifeClothes')}
skills={r['_id']:r for r in table('SkillBase')}
assert len(hero)==178 and len(wife)==111,(len(hero),len(wife))

shipped={c['id']:c for c in json.loads((ROOT/'lib/wardrobe-data.json').read_text())['costumes']}
ours=list(shipped)
assert len(ours)==85,len(ours)
# Rule 2's control for this import: every shipped costume must be found in one of the two tables.
missing=[i for i in ours if i not in hero and i not in wife]
assert not missing,f'shipped costumes with no source row: {missing}'

def number(v):return int(float(v)) if isinstance(v,str) else int(v)
def at(sid,level):
 s=skills[sid];lv=min(level,number(s['maxUpgradeLevel']))
 return number(s['skillProp_Initial'])+number(s.get('skillProp_Level',0))*(lv-1)
def ladder_level(steps,clothes_level):
 """The skill level a costume level buys. The steps are sparse (1,2,3,5,7,10,15,20), so this takes the
    highest step at or below the costume's level -- 0 when the first step is above it."""
 lv=0
 for st in steps or []:
  if clothes_level>=number(st['clothesLevel']):lv=number(st['skillLevel'])
 return lv

LEVEL=1                      # what owning a costume is worth, and the only level this slice models
rows={};deferred=[]
for cid in sorted(ours):
 src=hero.get(cid) or wife.get(cid); kind='hero' if cid in hero else 'family'
 row={'id':cid,'kind':kind,'owner':shipped[cid]['ownerId'],'maxLevel':number(src['MaxLevel'])}
 if kind=='hero':
  t=src['clothesTalentSkill'];assert t in skills,f'{cid}: {t}'
  s=skills[t];tc=s.get('targetCondition') or {}
  assert tc.get('conditionType')=='self' and s['skillProp']=={'id':'talent'},f'{cid} wearer skill is {tc} {s["skillProp"]}'
  row['self']={'skill':t,'level':number(src['talentSkillBaseLevel']),'talent':at(t,number(src['talentSkillBaseLevel']))}
  h=src.get('clothesHaloSkill')
  if h:
   assert h in skills,f'{cid}: {h}'
   s=skills[h];tc=s.get('targetCondition') or {}
   assert tc.get('conditionType')=='country' and s['skillProp']=={'id':'talent'},f'{cid} halo is {tc} {s["skillProp"]}'
   lv=ladder_level(src.get('haloSkillLevelLimit'),LEVEL)
   row['halo']={'skill':h,'country':tc['id'],'level':lv,'talent':at(h,lv)}
 else:
  h=src.get('WifeClothesHaloSkill1')
  if h:
   assert h in skills,f'{cid}: {h}'
   s=skills[h];tc=s.get('targetCondition') or {}
   assert tc.get('conditionType')=='country' and s['skillProp']=={'id':'talent'},f'{cid} halo1 is {tc} {s["skillProp"]}'
   lv=ladder_level(src.get('WifeHaloSkillLevelLimit1'),LEVEL)
   row['halo']={'skill':h,'country':tc['id'],'level':lv,'talent':at(h,lv)}
  h2=src.get('WifeClothesHaloSkill2')
  if h2:
   s=skills[h2]
   assert s['skillProp']=={'id':'atk','propType':'percent'},f'{cid} halo2 is {s["skillProp"]}'
   unlock=number(src.get('WifeClothesHaloSkill2Unlock',2))
   assert unlock>LEVEL,f'{cid}: halo2 unlocks at level {unlock}, which this slice DOES model'
   deferred.append({'id':cid,'skill':h2,'unlockLevel':unlock,'prop':'percent'})
 rows[cid]=row

self_total=sum(r['self']['talent'] for r in rows.values() if 'self' in r)
by_country=collections.Counter()
for r in rows.values():
 if 'halo' in r:by_country[r['halo']['country']]+=r['halo']['talent']
assert self_total>0 and by_country,'the import produced nothing -- check the shipped costume ids'
# Rule 6: the halo level is a LADDER read, not a constant. If every costume returned the same skill
# level the ladder would not be being read at all, so the two kinds must differ (hero 30, family 40).
levels={(r['kind'],r['halo']['level']) for r in rows.values() if 'halo' in r}
assert levels=={('hero',30),('family',40)},levels

out={'sources':{n:hashlib.sha256((CFG/f'{n}.json').read_bytes()).hexdigest()
                for n in ('HeroClothes','WifeClothes','SkillBase')},
     'note':("Costume skills at level 1, which is what owning a costume is (HeroClothes.consume is one "
             "chip and that is the unlock). `self` pays the costume's own owner; `halo` pays every FELLOW "
             "of a country, including from a FAMILY member's costume (target: hero). Levelling, and the "
             "ClothesExtraEffect half, are out of this slice."),
     'modelledLevel':LEVEL,'bucket':'talent','deferredPercentHalos':deferred,'costumes':rows}
(ROOT/'lib/costume-skill-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(f"{len(rows)} shipped costumes: {sum(1 for r in rows.values() if 'self' in r)} pay their wearer "
      f"({self_total:,} talent in total), {sum(1 for r in rows.values() if 'halo' in r)} carry a country halo")
for c in sorted(by_country):print(f'   country {c}: {by_country[c]:,} talent to every Fellow of that type')
print(f'   deferred (needs costume level 2+): {len(deferred)} percent halos on Family costumes')
