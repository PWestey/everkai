"""Import Fellow appoint (Operations) bonuses from the original's own Hero and SkillBase tables.

Replaces a four-fellow community reconstruction with the version-matched source. The previous
lib/operation-data.json said so itself: "Community descriptions inspected 2026-09-07; not
version-matched APK formulas."

How the original computes it (skills.py building_bonus, PanelBuildingInfo):
a hero's operationSkill list names skills; a skill counts when its skillProp.id is 'appoint', and it
applies when targetCondition.conditionType is 'all', or 'country' matching the building's country, or
'building' matching the building's id. Value is skillProp_Initial + (level-1)*skillProp_Level.

Everkai's fellowOperation matches on `type` and `building`, and BuildingBase.country maps 1:1 onto
this project's business `type` across all 17 rows, so country targeting translates directly.

THE LEVEL (added 2026-09-22, docs/character-systems-gap.md 2.2). Until now only skillProp_Initial was
imported and the `(level-1)*skillProp_Level` half of the formula above was dropped, which is the whole
of catalogue row C2. Measured over the 76 Hero_Appoint_* SkillBase rows: 44 carry skillProp_Level 500
over maxUpgradeLevel 300 (43 of skillType Hero_Appoint_Base_1 plus one SimGame variant), and 32 are the
fixed Extra rows (maxUpgradeLevel 1, skillProp_Level 0) that the panel lists as "Operation Effect".
So Faculty V maxed is 15,000 + 299*500 = 164,500 bp = +1,645%, against the +150% a median Fellow's
whole record pays today.

THE PRICE is SkillLevel[Hero_Appoint_Base_1], 300 rows, one item: Item_HeroManagerment_Building
("Study Notes", Item:source -> "Trading Post Shop"). Row at level L is the cost to reach L+1; row 300
carries no consume. Two cross-checks against the reference screenshot 07_fellow_operation reproduce
exactly: levels 101..123 sum to 1,094 ("Upgrade x23 - 1.101K/1.094K"), and 1 -> 300 is 25,589.

ONE LEVEL PER FELLOW, NOT PER SKILL. MainCityManager:CalBuildingHeroAdd reads a single
GetSkillData("Hero_Appoint_Base_1") off the assigned hero, and every Country tier shares that
skillType, so the level is the Fellow's, shared across all of its levelable appoint skills. This is
docs/character-systems-gap.md section 6 question 4 -- the panel shows one skill at a time, so the
screenshot cannot distinguish the two readings. Shared is what the client line says; the alternative
(a level per skill) would make a Fellow's record worth up to 3x more again.

TWO MODES, and `--patch` is the one that was used to ship the level.
A bare run REGENERATES lib/operation-data.json from Hero.json, and that is no longer what the shipped
file is: the shipped file keeps all 175 records, including the 48 characters later added to
content-overrides.removed, and tests/crossover-abilities.test.mjs pins its sha256 while
tests/fellow-power.test.mjs pins 175 records / 494 effects. A regeneration today would emit 132
records and silently make the roster trim an operations change as well, which is a separate decision
(tests/crossover-abilities.test.mjs:276 records that the 175-row shape is deliberately untouched by
that trim). So `--patch` reads the shipped file and adds ONLY the two new columns and the ladder,
matched by skillId, leaving every record and every existing number byte-identical.
"""
from pathlib import Path
import json,hashlib,sys

app=Path(__file__).resolve().parents[1]
# Absolute, like import-businesses.py. The app.parents[1] idiom resolves to /Users from this repo and
# leaves the script unrunnable; see docs/backlog.md.
data=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')

HERO_SHA='5219480b90d734bf4e5cc24eb0a049b306108c684956c8df4a090b9f0fa7a052'
SKILL_SHA='a04ba18bdf0c18d12f1ab2f2e1c6cbfad6afeb9a19c4e6b99296e979a0a5ad75'
LEVEL_SHA='b21ab20ab8b938827a95f29e87827445c006ce996aaa17c2e140bc3b0b21ccea'
# The shared skillType every Country Faculty tier carries, and the one CalBuildingHeroAdd reads.
BASE_SKILL='Hero_Appoint_Base_1'
NOTE_ITEM='Item_HeroManagerment_Building'

def read(name,sha,key):
 raw=(data/f'{name}.json').read_bytes()
 got=hashlib.sha256(raw).hexdigest()
 assert got==sha,f'{name}.json is not the pinned source: {got}'
 return {r['_id']:r for r in json.loads(raw)[key]}

def read_rows(name,sha,key):
 raw=(data/f'{name}.json').read_bytes()
 got=hashlib.sha256(raw).hexdigest()
 assert got==sha,f'{name}.json is not the pinned source: {got}'
 return json.loads(raw)[key]

HEROES=read('Hero',HERO_SHA,'Hero')
SKILLS=read('SkillBase',SKILL_SHA,'SkillBase')
LEVELS=read_rows('SkillLevel',LEVEL_SHA,'SkillLevel')

# BuildingBase.country -> this project's business type. Verified 1:1 against lib/business-data.json
# across all 17 rows; see its typeSource block.
COUNTRY={'1':'Inspiring','2':'Diligent','3':'Brave','4':'Informed','5':'Unfettered'}

removed={r['id'] for r in json.loads((app/'lib/content-overrides.json').read_text())['removed']}

def appoint(skill_id):
 """The skill row when it is an appoint bonus, else None."""
 row=SKILLS.get(skill_id)
 if not row or (row.get('skillProp') or {}).get('id')!='appoint':return None
 # Uneven growth would need SkillLevel; no appoint skill uses it, and this asserts that stays true.
 assert row.get('skillProp_Growth_Type')!=2,f'{skill_id} needs SkillLevel'
 return row

records=[];rarity_gated=0
for hero_id,hero in HEROES.items():
 fellow=f'hero_{hero_id}'
 if fellow in removed:continue
 effects=[];notes=[]
 for cfg in hero.get('operationSkill',[]):
  skill_id=cfg['skillId'];row=appoint(skill_id)
  if not row:continue
  # Everkai has no rarity field on an effect, so a rarity-gated skill cannot be modelled honestly.
  if cfg.get('unlockType')=='rarityLevel':
   notes.append(skill_id);rarity_gated+=1;continue
  initial=row.get('skillProp_Initial',0)
  assert initial%100==0,f'{skill_id} percent {initial} is not a whole number'
  target=row.get('targetCondition') or {}
  kind=target.get('conditionType')
  effect={'minLevel':cfg['count'] if cfg.get('unlockType')=='AppointSkill_HeroLevel' else 1,
          'percent':initial//100,'skillId':skill_id}
  # The level half of the original's own formula. A row that grows carries BOTH columns; the fixed
  # Extra rows carry neither, and stay exactly what they are today.
  per=row.get('skillProp_Level',0);cap=row.get('maxUpgradeLevel',1)
  if per:
   assert per%100==0,f'{skill_id} per-level {per} is not a whole number'
   assert cap>1,f'{skill_id} grows but caps at {cap}'
   effect['perLevel']=per//100;effect['max']=cap
  if kind=='country':effect['type']=COUNTRY[str(target['id'])]
  elif kind=='building':effect['building']=target['id']
  elif kind!='all':continue  # 'self' and anything new: no business-scoped meaning here
  effects.append(effect)
 if not effects:continue
 effects.sort(key=lambda e:(e['minLevel'],e['percent']))
 record={'fellow':fellow,'effects':effects}
 if notes:
  record['unresolved']=('Rarity-gated appoint skill excluded; Everkai effects carry a level gate only: '
                        +', '.join(sorted(notes)))
 records.append(record)

records.sort(key=lambda r:int(r['fellow'][len('hero_'):]))
assert records,'no records produced'
assert all(e['percent']>0 for r in records for e in r['effects'])

# ---- The Study Notes ladder: SkillLevel[Hero_Appoint_Base_1], the cost to reach the NEXT level ----
by_level={}
for r in LEVELS:
 if r.get('skillType')!=BASE_SKILL:continue
 items=r.get('consume') or []
 assert all(c['id']==NOTE_ITEM for c in items),f'{r["_id"]} spends something other than {NOTE_ITEM}'
 # Rule 5: counts arrive as ints or as strings.
 by_level[int(r['level'])]=sum(int(c['count']) for c in items)
assert len(by_level)==300,f'{len(by_level)} Hero_Appoint_Base_1 SkillLevel rows, expected 300'
assert by_level[300]==0,'the top row should carry no consume'
GROWS=[r for r in SKILLS.values() if r.get('skillType')==BASE_SKILL and r.get('skillProp_Level')]
CAP=max(int(r['maxUpgradeLevel']) for r in GROWS)
assert CAP==300,CAP
# One growth rate across every levelable appoint row, which is why crossover slot A can borrow it.
PER_LEVEL=sorted({int(r['skillProp_Level'])//100 for r in GROWS})
assert PER_LEVEL==[5],PER_LEVEL
PER_LEVEL=PER_LEVEL[0]
ladder=[by_level[L] for L in range(1,CAP)]   # index 0 = the cost to go from level 1 to level 2
assert sum(ladder)==25589,sum(ladder)        # reproduces the doc's measured 1 -> 300 total
assert sum(ladder[100:123])==1094,sum(ladder[100:123])  # screenshot 07: "Upgrade x23 - 1.094K"

LEVEL_COLUMNS={sid:(row['skillProp_Level']//100,row['maxUpgradeLevel'])
               for sid,row in SKILLS.items()
               if sid.startswith('Hero_Appoint_') and row.get('skillProp_Level')}

# THE SKILL'S OWN NAME AND TIER (2026-09-22), for docs/fellow-screen-specs/07-operation.md. The
# original's panel titles the row `Operation Faculty V: Lv. 101/300` -- the roman numeral is part of
# the skill's NAME, and the arabic level follows a colon. Both come from the original rather than
# from a template of ours: the name is `SkillBase:name:<id>` in en/translate.json, and `stars` on the
# SkillBase row is the tier the numeral spells. The translate file lives in the 1,499-table config
# set rather than the mirrored subset, so it is read from there and hashed separately.
LOGIC=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic')
TRANSLATE_SHA='9e3a48f47f1a48a7ba2d20f4e3f5a4e0'   # replaced below by the real digest
_traw=(LOGIC/'en/translate.json').read_bytes()
TRANSLATE_SHA=hashlib.sha256(_traw).hexdigest()
EN={r['id']:r['en'] for r in json.loads(_traw)['translate']}
SKILL_NAMES={sid:EN.get(f'SkillBase:name:{sid}') or EN.get(f'Skill:name:{sid}')
             for sid in SKILLS if sid.startswith('Hero_Appoint_')}
assert SKILL_NAMES.get('Hero_Appoint_Country5Base_5')=='Operation Faculty V',SKILL_NAMES.get('Hero_Appoint_Country5Base_5')
SKILL_TIERS={sid:row.get('stars') for sid,row in SKILLS.items() if sid.startswith('Hero_Appoint_')}
assert SKILL_TIERS.get('Hero_Appoint_Country5Base_5')==5
LADDER_NOTE=('The Study Notes ladder is SkillLevel[Hero_Appoint_Base_1]: entry i is the cost to reach '
             'level i+2 (entry 0 buys level 2), 25,589 in total, and the original charges nothing at '
             'the cap. `perLevel`/`max` sit on the effects the original grows (skillProp_Level 500 '
             'over maxUpgradeLevel 300); the fixed Extra rows carry neither and are unchanged. The '
             'level is ONE PER FELLOW, shared across its levelable appoint skills, because '
             'MainCityManager:CalBuildingHeroAdd reads a single Hero_Appoint_Base_1 skill level off '
             'the assigned hero. The SHOP that sells Study Notes is not in the config dump, so the '
             'FAUCET rate is local and declared in lib/operations.mjs.')

if '--patch' in sys.argv:
 target=app/'lib/operation-data.json'
 shipped=json.loads(target.read_text())
 touched=0
 for record in shipped['records']:
  for effect in record['effects']:
   sid=effect.get('skillId')
   name=SKILL_NAMES.get(sid)
   if name:effect['name']=name
   if SKILL_TIERS.get(sid):effect['tier']=SKILL_TIERS[sid]
   columns=LEVEL_COLUMNS.get(sid)
   if not columns:continue
   effect['perLevel'],effect['max']=columns;touched+=1
 keep={'SkillLevel.json','en/translate.json'}
 shipped['sources']=[s for s in shipped['sources'] if s['file'] not in keep]+[
  {'file':'SkillLevel.json','sha256':LEVEL_SHA,'field':f"skillType == '{BASE_SKILL}'"},
  {'file':'en/translate.json','sha256':TRANSLATE_SHA,'field':'SkillBase:name:Hero_Appoint_*'}]
 shipped['limits']=shipped['limits'].replace(
  'Skill levels above 1 are not modelled, so skillProp_Level growth is not applied. ','')
 shipped['levelling']=LADDER_NOTE
 shipped['skill']={'shared':BASE_SKILL,'cap':CAP,'perLevel':PER_LEVEL,'item':NOTE_ITEM,'total':sum(ladder)}
 shipped['ladder']=ladder
 target.write_text(json.dumps(shipped,indent=2,ensure_ascii=False)+'\n')
 named=sum(1 for r in shipped['records'] for e in r['effects'] if e.get('name'))
 print(f'patched {touched} effects across {len(shipped["records"])} records with perLevel/max, '
       f'{named} with the original\'s own name and tier; '
       f'ladder {len(ladder)} steps, {sum(ladder)} Study Notes 1->{CAP}')
 raise SystemExit(0)

out={'provenance':('Imported from the original Hero.operationSkill and SkillBase tables by '
                   'scripts/import-operations.py, replacing a four-fellow community reconstruction. '
                   'Percent is skillProp_Initial/100 at skill level 1; minLevel is the '
                   'AppointSkill_HeroLevel unlock, or 1 when the skill has no unlock condition. '
                   'country targeting is mapped to this project business type via BuildingBase.country '
                   '(1 Inspiring, 2 Diligent, 3 Brave, 4 Informed, 5 Unfettered), verified 1:1 in '
                   'lib/business-data.json typeSource. Effects with neither type nor building are the '
                   "original's conditionType 'all' and apply everywhere."),
     'sources':[{'file':'Hero.json','sha256':HERO_SHA,'field':'operationSkill'},
                {'file':'SkillBase.json','sha256':SKILL_SHA,'field':"skillProp.id == 'appoint'"},
                {'file':'SkillLevel.json','sha256':LEVEL_SHA,'field':f"skillType == '{BASE_SKILL}'"},
  {'file':'en/translate.json','sha256':TRANSLATE_SHA,'field':'SkillBase:name:Hero_Appoint_*'}],
     'limits':('Rarity-gated appoint skills are excluded and flagged per record, because an Everkai '
               'effect has a level gate only. Characters listed in content-overrides.removed '
               'are omitted. `perLevel`/`max` are present only on the rows the original grows '
               '(skillProp_Level 500 over maxUpgradeLevel 300); the fixed Extra rows carry neither. '
               'The ladder is the cost to reach the NEXT level, so entry i prices level i+1; the '
               'original charges nothing at the cap. The SHOP that sells Study Notes is not in the '
               'config dump (its Item:source names the Trading Post Shop, and no reachable shop table '
               'prices the item), so the FAUCET rate is local and lives in lib/operations.mjs.'),
     'skill':{'shared':BASE_SKILL,'cap':CAP,'perLevel':PER_LEVEL,'item':NOTE_ITEM,'total':sum(ladder)},
     'ladder':ladder,
     'records':records}

(app/'lib/operation-data.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print(f'ladder {len(ladder)} steps, {sum(ladder)} Study Notes 1->{CAP}; '
      f'{len(records)} fellows; {sum(len(r["effects"]) for r in records)} effects; '
      f'{sum(1 for r in records if "unresolved" in r)} with a rarity-gated exclusion '
      f'({rarity_gated} skills); '
      f'{sum(1 for h in HEROES if f"hero_{h}" in removed)} overridden characters skipped')
