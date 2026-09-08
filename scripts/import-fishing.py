"""Import pinned fish effect evidence; no unverified descriptions become gameplay."""
import pathlib,json,re,html,hashlib,urllib.request,concurrent.futures
root=pathlib.Path(__file__).resolve().parents[1];base=root.parent.parent/'outputs/online-audit/public-reference/wiki';sha='b49c78d0c06d535f6e1c62bdc9d5d666cd96e954'
es=[x for x in json.loads((base/'wiki_manifest.json').read_text())['entries'] if x['category']=='fishing']
def read(e):
 p=base/e['url']/'index.html';url=f'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/{sha}/wiki/{e["url"]}index.html'
 if not p.exists():p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(urllib.request.urlopen(url,timeout=25).read())
 b=p.read_bytes();s=b.decode();skills={}
 for label in ['Normal Skill','Crown Skill']:
  section=s.split('>'+label+'</span>',1)
  skills[label]=[html.unescape(x) for x in re.findall(r'<div class="echo-skill-panel"><span>(.*?)</span>',section[1].split('<div class="profile-field',1)[0])] if len(section)>1 else []
 return {'id':e['id'],'name':e['title'],'locations':e.get('locations',[]),'rarity':e.get('rarity'),'skills':skills,'source':url,'sha256':hashlib.sha256(b).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:rows=list(pool.map(read,es))
(root/'lib/fishing-inventory.json').write_text(json.dumps({'snapshot':sha,'records':rows},indent=2)+'\n')
print(len(rows),'profiles');print(sorted(set(x for r in rows for x in r['skills']['Normal Skill'])))
# Interpret only complete normal effects with an explicit number and increment.
def number(x):return float(x[:-1])*{'K':1000,'M':1000000}[x[-1]] if x[-1:] in ['K','M'] else float(x)
playable=[];deferred=[]
for r in rows:
 lines=r['skills']['Normal Skill'];text=lines[0] if len(lines)==1 else '';m=re.fullmatch(r'(All|Inspiring|Diligent|Brave|Informed|Unfettered|N|R|SR|SSR/SSR\+) Fellow (Power|Aptitude) \+([\d.]+[KM%]?) \(\+([\d.]+[KM%]?)\)',text)
 if m:
  scope,stat,a,b=m.groups();kind='percent' if a.endswith('%') else 'flat' if stat=='Power' else 'aptitude';effect={'kind':kind,'type':scope if scope in ['Inspiring','Diligent','Brave','Informed','Unfettered'] else None,'rarities':scope.split('/') if scope in ['N','R','SR','SSR/SSR+'] else [],'initial':number(a.rstrip('%')),'increment':number(b.rstrip('%'))}
 else:
  m=re.fullmatch(r'(Power|Aptitude) of UR and above quality Fellows ?\+([\d.]+[KM]?) \(\+([\d.]+[KM]?)\)',text)
  if m:effect={'kind':'flat' if m[1]=='Power' else 'aptitude','type':None,'rarities':['UR'],'initial':number(m[2]),'increment':number(m[3]),'scopeLimit':'UR is current highest catalog rarity; future higher rarities need explicit extension.'}
  else:deferred.append({'id':r['id'],'reason':'Incomplete quantity, scope or effect','lines':lines});continue
 playable.append({**r,'effect':effect})
assert len({r['id'] for r in playable})==len(playable)
(root/'lib/fishing-species.json').write_text(json.dumps({'snapshot':sha,'records':playable,'deferred':deferred,'limits':'Normal effects only. All crown effects deferred. Original activation removal, probabilities/lengths/costs/gates unknown; local display-only policy.'},indent=2)+'\n');print(len(playable),'playable complete normal effects;',deferred)
