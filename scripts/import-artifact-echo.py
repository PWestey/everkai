from pathlib import Path
import json,re,html,hashlib
root=Path(__file__).resolve().parents[1];base=root.parent.parent;local=base/'outputs/component-research/datasets';hub=base/'outputs/online-audit/public-reference/wiki'
skills={r['id']:r['en'] for r in json.loads((local/'SkillBase.json').read_text())};heroes={r['id']:r['en'] for r in json.loads((local/'Hero.json').read_text())};rules=json.loads((root/'lib/artifact-rules.json').read_text())['records'];out=[];deferred=[]
for p in sorted((hub/'artifacts').glob('*/index.html')):
 s=p.read_text();m=re.search(r'<div class="profile-field profile-echo-field">(.*?)</div>',s,re.S)
 if not m or 'profile-echo-none' in m[1]:continue
 t=html.unescape(re.sub('<[^>]+>',' ',m[1]));t=re.sub(r'\s+',' ',t).strip();weapon=re.search(r'<p class="character-id">([^<]+)</p>',s)[1];item=weapon.replace('Weapon_','Item_Weapon_Equipment_',1)
 match=re.fullmatch(r'Echo (.*?) Aptitude of Echoing Fellow \+(\d+) Power of Echoing Fellow \+(\d+)%',t)
 if not match or item not in rules:deferred.append({'weapon':weapon,'reason':'Not literal echo scope or no existing artifact identity','description':t});continue
 ids=[k.removeprefix('Hero:name:') for k,v in heroes.items() if k.startswith('Hero:name:') and v==match[1]]
 if len(ids)!=1:deferred.append({'weapon':weapon,'reason':'Nonunique or missing exact local Hero name','name':match[1],'ids':ids});continue
 hero=ids[0];numeric=hero.removeprefix('Hero_').removeprefix('hero_');skill=weapon+'_HeroSkill_'+numeric
 if skills.get('SkillBase:description:'+skill)!='Aptitude of Echoing Fellow +{num}' or skills.get('SkillBase:description:'+skill+'_Link')!='Power of Echoing Fellow +{num}':deferred.append({'weapon':weapon,'reason':'Missing exact local weapon-to-Hero skill pair','candidate':skill});continue
 out.append({'item':item,'fellow':'hero_'+numeric,'name':match[1],'skill':skill,'aptitude':int(match[2]),'percent':int(match[3]),'orePerLevel':rules[item]['ore'],'aptitudePerLevel':rules[item]['perLevel'],'source':rules[item]['source'],'pageSha256':hashlib.sha256(p.read_bytes()).hexdigest()})
result={'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','localHashes':{n:hashlib.sha256((local/(n+'.json')).read_bytes()).hexdigest() for n in ['Hero','SkillBase']},'records':out,'deferred':deferred,'limits':'Literal named-Hero echoes only; Family support, auras, ambiguous names and missing local skill pairs excluded. Quantities/costs community, not APK version-matched.'}
(root/'lib/artifact-echo-data.json').write_text(json.dumps(result,indent=2)+'\n');print(len(out),'exact joins;',len(deferred),'deferred');print([(r['item'],r['fellow']) for r in out])
