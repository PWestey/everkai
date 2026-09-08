#!/usr/bin/env python3
"""Join named community recruitment rows to exact local roster identities and pinned profiles."""
import json,hashlib,re
from pathlib import Path
app=Path(__file__).resolve().parents[1];root=app.parent.parent
profiles=json.loads((app/'lib/character-skill-guide.json').read_text())['profiles']
local={kind:json.loads((root/'outputs/component-research/datasets'/file).read_text()) for kind,file in [('fellows','Hero.json'),('family','Wife.json')]}
rows=[]
for kind,entries in [('fellows',[('Jewlry',2),('Loya',2),('Augustine',2),('Anne',2),('Emosen',2),('Rani',1),('Angie',1),('Liz',1)]),('family',[('Kosuzu',2),('Baity',2),('Sera',2),('Lina',2),('Denier',2),('Lilith',2),('Melody',1),('Wenreesa',1)])]:
 for name,cost in entries:
  matches=[p for p in profiles if p['category']==kind and p['name']==name];assert len(matches)==1,(kind,name)
  ident=matches[0]['id'];key=('Hero' if kind=='fellows' else 'Wife')+':name:'+ident.split('_')[1];assert any(r['id']==key and r['en']==name for r in local[kind]),(key,name)
  path=root/'outputs/online-audit/public-reference/wiki'/kind/name.lower()/'index.html';raw=path.read_bytes();s=raw.decode();m=re.search(r'profile-value source-tile-value">([^<]+)',s);assert m
  category='Bonds Between Elites' if kind=='fellows' else 'Fated Acquaintance';assert 'Recruit ['+category+']' in m[1],(name,m[1])
  rows.append({'id':ident,'name':name,'kind':kind,'cost':cost,'category':category,'localNameKey':key,'profileSource':m[1],'profileSha256':hashlib.sha256(raw).hexdigest(),'profileUrl':'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/'+kind+'/'+name.lower()+'/index.html'})
assert len(rows)==len(set(r['id'] for r in rows))==16
out={'provenance':{'costSource':'https://isekai-slow-life-mgame.fandom.com/wiki/Recruit','access':'search-index named recruitment tables; direct page robots restricted','checked':'2026-09-08','versionMatched':False,'localRosterSha256':hashlib.sha256((app/'lib/character-skill-guide.json').read_bytes()).hexdigest(),'boundary':'Pinned community source categories plus current community costs; not recovered APK numeric tables'},'recruits':rows}
(app/'lib/acquaintance-recruits.json').write_text(json.dumps(out,indent=2)+'\n');print('Joined16:8Fellows,8Family; no cross-category name assumptions.')
