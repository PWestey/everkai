"""Read public familiar numeric metadata; never execute page scripts."""
import concurrent.futures,hashlib,html,json,pathlib,re,urllib.request
ROOT=pathlib.Path(__file__).resolve().parents[1];SOURCE=ROOT.parent.parent/'outputs/online-audit/public-reference/wiki'
SHA='b49c78d0c06d535f6e1c62bdc9d5d666cd96e954';BASE=f'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/{SHA}/wiki/'
entries=[e for e in json.loads((SOURCE/'wiki_manifest.json').read_text())['entries'] if e['category']=='familiars']
def extract(e):
 p=SOURCE/e['url']/'index.html'
 if not p.exists():
  for i in range(3):
   try:
    b=urllib.request.urlopen(BASE+e['url']+'index.html',timeout=20).read();p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(b);break
   except Exception:
    if i==2:raise
 b=p.read_bytes();match=re.search('data-pet-sim="([^"]+)"',b.decode())
 if not match:raise ValueError('Missing stats: '+e['url'])
 d=json.loads(html.unescape(match[1]));assert d['id']==e['id']
 return {'id':e['internal_id'],'name':e['title'],'rarity':e['rarity'],'type':e.get('country_label'),'classMax':d['classMax'],'ATK':d['ATK'],'HP':d['HP'],'SPD':d['SPD'],'source':'https://zik-ascend.github.io/isl-tools/wiki/'+e['url'],'pageSha256':hashlib.sha256(b).hexdigest()}
with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:pets=list(pool.map(extract,entries))
raw=json.loads((SOURCE/'assets/pet_simulator.json').read_text());tables={}
for key,fields in {'levels':['Cost','ATKcoef','HPcoef','SPDadd'],'classes':['Cost','LevelMax','ATKcoef','HPcoef','SPDadd'],'stars':['Cost','ATKcoef','HPcoef']}.items():
 tables[key]={i:{k:r[k] for k in fields if k in r} for i,r in raw[key].items()}
(ROOT/'lib/familiar-data.json').write_text(json.dumps({'snapshot':SHA,'pets':pets,**tables},separators=(',',':'))+'\n')
print('Imported',len(pets),'familiar profiles')
