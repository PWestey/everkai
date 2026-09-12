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
"""
from pathlib import Path
import json,hashlib

app=Path(__file__).resolve().parents[1]
# Absolute, like import-businesses.py. The app.parents[1] idiom resolves to /Users from this repo and
# leaves the script unrunnable; see docs/backlog.md.
data=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')

HERO_SHA='5219480b90d734bf4e5cc24eb0a049b306108c684956c8df4a090b9f0fa7a052'
SKILL_SHA='a04ba18bdf0c18d12f1ab2f2e1c6cbfad6afeb9a19c4e6b99296e979a0a5ad75'

def read(name,sha,key):
 raw=(data/f'{name}.json').read_bytes()
 got=hashlib.sha256(raw).hexdigest()
 assert got==sha,f'{name}.json is not the pinned source: {got}'
 return {r['_id']:r for r in json.loads(raw)[key]}

HEROES=read('Hero',HERO_SHA,'Hero')
SKILLS=read('SkillBase',SKILL_SHA,'SkillBase')

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

out={'provenance':('Imported from the original Hero.operationSkill and SkillBase tables by '
                   'scripts/import-operations.py, replacing a four-fellow community reconstruction. '
                   'Percent is skillProp_Initial/100 at skill level 1; minLevel is the '
                   'AppointSkill_HeroLevel unlock, or 1 when the skill has no unlock condition. '
                   'country targeting is mapped to this project business type via BuildingBase.country '
                   '(1 Inspiring, 2 Diligent, 3 Brave, 4 Informed, 5 Unfettered), verified 1:1 in '
                   'lib/business-data.json typeSource. Effects with neither type nor building are the '
                   "original's conditionType 'all' and apply everywhere."),
     'sources':[{'file':'Hero.json','sha256':HERO_SHA,'field':'operationSkill'},
                {'file':'SkillBase.json','sha256':SKILL_SHA,'field':"skillProp.id == 'appoint'"}],
     'limits':('Rarity-gated appoint skills are excluded and flagged per record, because an Everkai '
               'effect has a level gate only. Skill levels above 1 are not modelled, so '
               'skillProp_Level growth is not applied. Characters listed in content-overrides.removed '
               'are omitted.'),
     'records':records}

(app/'lib/operation-data.json').write_text(json.dumps(out,indent=2,ensure_ascii=False)+'\n')
print(f'{len(records)} fellows; {sum(len(r["effects"]) for r in records)} effects; '
      f'{sum(1 for r in records if "unresolved" in r)} with a rarity-gated exclusion '
      f'({rarity_gated} skills); '
      f'{sum(1 for h in HEROES if f"hero_{h}" in removed)} overridden characters skipped')
