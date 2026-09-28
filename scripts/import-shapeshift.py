"""Import ShapeshiftClothes -- the protagonist's own outfits, and the only ACCOUNT-WIDE power source.

WHY THIS ONE. Every power source Everkai ships is scoped to a Fellow or a group of them, so a player
whose roster is thin gets nothing from most of them, and the 163 Marvel and Star Wars additions are
reached by `all` and `country` scopes only (lib/hero-scope.mjs). This table is the original's answer:
the outfit belongs to the PLAYER, and its skill targets `{conditionType:'all'}` -- every Fellow,
original and crossover, with no ownership gate anywhere. docs/power-parity-audit.md 7 step 3 already
named it the account-wide percent stack and flagged it absent.

THE JOIN, three tables deep, because the outfit is not the entity the player owns:

  Avatar.json              64 rows. The player's avatar. 50 carry `AvatarClothesId`, and ALL 50 are
                           `gender 3, distinction 1` -- the exact filter AppearanceManager.lua:757
                           uses. The avatar id (`shap07`) is what the save keys on; the clothes row
                           is where the numbers live.
  ShapeshiftClothes.json   50 rows. `condition` is a chip item (count 1), `MaxLevel` 20,
                           `unlockIntimacy`/`unlockCharm` 20/20, `levelUp*` the per-level cost.
                           FIVE carry a `clothesSkill`.
  SkillBase.json           the skill: `{conditionType:'all'}`, `skillProp {id:'atk', propType:
                           'percent'}`, 4,000 bp + 2,000 a level.

WHICH BUCKET, because `atk` reads like a combat stat and is not one here. `BeautyManager.lua:1128`
resolves this exact pair -- `prop.id == "atk" and prop.propType == "percent"` -- and returns it as
the PERCENT half of a (percent, talent) pair, with `prop.id == "talent"` returning the other. So
atk/percent is Everkai's `percent` bucket. docs/power-parity-audit.md's table reached 172,000 bp
independently; this import reproduces that number from the rows, which is the corroboration.

THE CONSTANCY THAT IS THE POINT (rule 6). Four of the five skills run to `maxUpgradeLevel` 20 and one,
ShapeshiftClothes07, stops at 1 -- and 07 is also the only one of the five WITHOUT `isUpdate: 1`,
which is the flag AppearanceManager.lua:776 requires before it will level an outfit at all. Two
independent columns saying the same thing, so it is a rule, not a typo, and it is asserted below.

NOT IMPORTED, and why: `unlockCharm`/`levelUpCharm`. Charm is a player stat Everkai has no counterpart
for (the save has per-Family `intimacy` and no charm at all). The columns are carried through to the
data file so the gap stays visible, but nothing reads them. See docs/data-provenance.md.
"""
import hashlib,json,collections
from pathlib import Path
CFG=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
ROOT=Path(__file__).resolve().parent.parent
def table(n):
 d=json.loads((CFG/f'{n}.json').read_text())
 return d if isinstance(d,list) else d[next(iter(d))]

avatars=table('Avatar');clothes={r['_id']:r for r in table('ShapeshiftClothes')}
skills={r['_id']:r for r in table('SkillBase')}
assert len(avatars)==64 and len(clothes)==50,(len(avatars),len(clothes))

# The client's own filter, not ours. AppearanceManager.lua:757 GetConfigsByKeys gender 3 distinction 1.
linked=[a for a in avatars if a.get('AvatarClothesId')]
assert len(linked)==50,len(linked)
assert {(str(a.get('gender')),a.get('distinction')) for a in linked}=={('3',1)},'the gender/distinction filter moved'
assert {a['AvatarClothesId'] for a in linked}==set(clothes),'avatar <-> clothes is not 1:1'

def number(v):                        # rule 5: ints, plain strings and scientific-notation strings
 return int(float(v)) if isinstance(v,str) else int(v)

outfits=[];total_bp=0
for a in sorted(linked,key=lambda r:r.get('order') or 0):
 c=clothes[a['AvatarClothesId']]
 cond=c.get('condition') or {}
 row={'avatar':a['_id'],'clothes':c['_id'],'maxLevel':number(c['MaxLevel']),
      'chip':cond.get('id'),'chipCount':number(cond.get('count',1)),
      'unlockIntimacy':number(c.get('unlockIntimacy',0)),'levelUpIntimacy':number(c.get('levelUpIntimacy',0)),
      'unlockCharm':number(c.get('unlockCharm',0)),'levelUpCharm':number(c.get('levelUpCharm',0)),
      'collectionScore':number(c.get('collectionScore',0)),'canLevel':bool(c.get('isUpdate'))}
 sid=c.get('clothesSkill')
 if sid:
  assert sid in skills,f'{c["_id"]}: clothesSkill {sid} has no SkillBase row'
  s=skills[sid];tc=s.get('targetCondition') or {}
  assert tc.get('conditionType')=='all',f'{sid} is scoped {tc} -- this import exists because it is `all`'
  assert s['skillProp']=={'id':'atk','propType':'percent'},f'{sid} pays {s["skillProp"]}'
  assert number(s.get('skillProp_Growth_Type',1))==1,f'{sid} is not linear growth'
  mx=number(s['maxUpgradeLevel']);init=number(s['skillProp_Initial']);per=number(s.get('skillProp_Level',0))
  # The two-column rule described above, asserted rather than trusted.
  assert (mx>1)==row['canLevel'],f'{c["_id"]}: isUpdate {c.get("isUpdate")} disagrees with maxUpgradeLevel {mx}'
  row.update({'skill':sid,'skillMaxLevel':mx,'bpInitial':init,'bpPerLevel':per})
  total_bp+=init+per*(mx-1)
 outfits.append(row)

withskill=[o for o in outfits if o.get('skill')]
assert len(withskill)==5,len(withskill)
assert {o['clothes'] for o in withskill}=={'ShapeshiftClothes07','ShapeshiftClothes15',
        'ShapeshiftClothes22','ShapeshiftClothes26','ShapeshiftClothes35'},{o['clothes'] for o in withskill}
# docs/power-parity-audit.md reached 172,000 bp from the same table by a different route.
assert total_bp==172000,total_bp
assert {o['chipCount'] for o in outfits}=={1},'a chip costs 1 everywhere'
assert all(o['chip'] and o['chip'].startswith('Item_ClothesChip_') for o in outfits)

out={'sources':{n:hashlib.sha256((CFG/f'{n}.json').read_bytes()).hexdigest()
                for n in ('Avatar','ShapeshiftClothes','SkillBase')},
     'note':("The protagonist's 50 outfits. Five carry an account-wide percent skill "
             "(atk/percent, targetCondition all) worth 172,000 bp in total at the original's own caps. "
             "Charm columns are carried but unread -- Everkai has no charm stat."),
     'bucket':'percent','scope':'all','totalBp':total_bp,'outfits':outfits}
(ROOT/'lib/shapeshift-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(f'{len(outfits)} outfits, {len(withskill)} with an account-wide percent skill, {total_bp:,} bp at cap')
for o in withskill:
 print(f"   {o['avatar']:>7} {o['clothes']:22s} Lv1-{o['skillMaxLevel']:<2d} {o['bpInitial']:,} + {o['bpPerLevel']:,}/level "
       f"-> {o['bpInitial']+o['bpPerLevel']*(o['skillMaxLevel']-1):,} bp   chip {o['chip']}")
