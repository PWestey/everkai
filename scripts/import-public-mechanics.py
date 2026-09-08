"""Build static reference facts from the pinned, previously audited public snapshots."""
import hashlib,html,json,pathlib,re
ROOT=pathlib.Path(__file__).resolve().parents[1]
SOURCE=ROOT.parent.parent/'outputs/online-audit/public-reference/wiki'
SHA='b49c78d0c06d535f6e1c62bdc9d5d666cd96e954'
manifest=json.loads((SOURCE/'wiki_manifest.json').read_text())
# Original gear records are generated JS; extract the JSON payload without running it.
original=(ROOT/'lib/original-content.mjs').read_text()
start=original.index('{');end=original.rindex('}')+1
local=json.loads(original[start:end])
gear={x['id']:x for x in local['gear']}
records={}
for e in manifest['entries']:
 if e['category']!='artifacts':continue
 id=e['internal_id'].replace('Weapon_','Item_Weapon_Equipment_',1)
 if id not in gear:continue
 p=SOURCE/e['url']/'index.html';b=p.read_bytes()
 text=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',b.decode())))
 def number(pattern):
  m=re.search(pattern,text);return int(m[1].replace(',','')) if m else None
 r={'initial':number(r'Initial Aptitude (\d[\d,]*)'),'perLevel':number(r'Aptitude per Level (\d[\d,]*)'),'ore':number(r'Level Cost Magic Ore x(\d[\d,]*)'),'recycle':number(r'Recycle Rewards Magic Ore x(\d[\d,]*)'),'source':'https://zik-ascend.github.io/isl-tools/wiki/'+e['url'],'pageSha256':hashlib.sha256(b).hexdigest()}
 if r['initial']!=gear[id]['aptitude'] or not r['perLevel'] or not r['ore']:raise ValueError('Conflicting or incomplete artifact '+id)
 records[id]=r
if len(records)!=len(gear):raise ValueError('Missing artifact coverage')
(ROOT/'lib/artifact-rules.json').write_text(json.dumps({'snapshot':SHA,'records':records},indent=2)+'\n')
d=json.loads((SOURCE/'assets/raphaels-stage-data.json').read_text())
for kind in ('fans','items'):
 for item in d[kind]:
  for field in ('description','iconId','iconUrl','handbookMinLevel'):item.pop(field,None)
  for field in (('selfEncourage','otherEncourage') if kind=='fans' else ('enhanceEffect',)):
   assert len(item[field])>=item['levelMax'] and all(isinstance(n,(int,float)) and n>=0 for n in item[field])
d.update(source='https://zik-ascend.github.io/isl-tools/wiki/calculators/raphaels-stage/',snapshot=SHA)
(ROOT/'lib/raphael-data.json').write_text(json.dumps(d,separators=(',',':'))+'\n')
print(f"Imported {len(records)} artifact definitions, {len(d['fans'])} fans and {len(d['items'])} support items")

import runpy
runpy.run_path(str(ROOT/"scripts/import-expanded-artifacts.py"))
