"""Join explicit named stall bonds; never infer faction membership from type."""
from pathlib import Path
import json,re,hashlib,subprocess
root=Path(__file__).resolve().parents[1];ws=root.parent.parent
source=ws/'outputs/component-research/datasets/SkillBase.json';skills={x['id']:x['en'] for x in json.loads(source.read_text())}
heroes=ws/'outputs/component-research/datasets/Hero.json';heroRows=json.loads(heroes.read_text())
node='/Users/westmanfamily/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node'
roster=json.loads(subprocess.check_output([node,'--input-type=module','-e',"import {FELLOWS} from './lib/catalog.mjs';console.log(JSON.stringify(FELLOWS.map(x=>({id:x.id,name:x.name}))))"],cwd=root,text=True))
records=[];deferred=[]
for x in json.loads((root/'lib/expo-data.json').read_text())['stalls']:
 t=x['evidence'];m=re.search(r'Special Buff (.*?) Sources',t)
 if not m:continue
 raw=m[1];m=re.fullmatch(r'When assigning ([A-Za-z]+), Sales Ability \+(\d+)%\.',raw)
 if not m:deferred.append({'stall':x['id'],'text':raw,'reason':'Group scope/membership not joined'});continue
 name,percent=m.groups();matches=[f for f in roster if f['name']==name];assert len(matches)==1,(name,matches)
 skill='Towerskill_'+x['id'];key='SkillBase:description:'+skill;assert skills[key]=='When assigning '+name+', Sales Ability +{num}.',(key,skills.get(key))
 local=[h for h in heroRows if h['en']==name and h['id'].endswith(':'+matches[0]['id'].split('_')[1]) and ':name:' in h['id']];assert len(local)==1,(name,local)
 records.append({'stall':x['id'],'fellow':matches[0]['id'],'name':name,'percent':int(percent),'skill':skill,'communityText':raw,'localSkill':{'id':key,'en':skills[key]},'localHero':local[0]})
assert len(records)==12
out={'source':json.loads((root/'lib/expo-data.json').read_text())['source'],'skillSourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'heroSourceSha256':hashlib.sha256(heroes.read_bytes()).hexdigest(),'records':records,'deferred':deferred,'limits':'Local skill scope, pinned community quantities. Multiplicative stacking local. Group membership unresolved.'}
(root/'lib/expo-bond-data.json').write_text(json.dumps(out,indent=2)+'\n');print(len(records),'named stall bonds;',len(deferred),'group bonds deferred')
