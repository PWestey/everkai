from pathlib import Path
import json,hashlib
from PIL import Image
app=Path(__file__).resolve().parents[1];source=app.parent/'isekai-research/independent/humanized-art/bulk/manifest.json';m=json.loads(source.read_text());assert hashlib.sha256(source.read_bytes()).hexdigest()=='7d07f9e6d1ddbba9c57932aba993c9dd7ef2272ec802324fed1fdd16098d0129'
old=json.loads((app/'lib/humanized-static-data.json').read_text());pair={r['id']:r for r in old if r['id'] in ('wife_1','hero_1')};prior={r['id']:r for r in json.loads((app.parent/'isekai-research/data/pre-bulk-catalog-art.json').read_text())};out=app/'public/assets/humanized';cache={};records=[]
for r in m['records']:
 if not r.get('image'):continue
 assert r['verified'] and not r['sourceHashFailures'] and r['costumeId'] is None and r['activeId'] in prior
 for f in r['loadedFiles']:
  if f['file'] not in cache:cache[f['file']]=hashlib.sha256(Path(f['file']).read_bytes()).hexdigest()
  assert cache[f['file']]==f['sha256']
 src=Path(r['image']);assert hashlib.sha256(src.read_bytes()).hexdigest()==r['imageSha256']
 if r['activeId'] in pair:entry=dict(pair[r['activeId']])
 else:
  img=Image.open(src).convert('RGB');img.thumbnail((960,960));target=out/(r['id']+'.webp');img.save(target,'WEBP',quality=85,method=6);assert target.stat().st_size<=512*1024
  entry={'id':r['activeId'],'model':r['id'],'art':'humanized/'+target.name,'sourceSha256':r['imageSha256'],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'composition':'includes-background','sourceManifestSha256':hashlib.sha256(source.read_bytes()).hexdigest()}
 entry.update({'costumeId':None,'recipeSha256':r['recipeSha256'],'background':r['background'],'aliases':sorted(set([x for x in [prior[r['activeId']]['art'],prior[r['activeId']].get('portrait'),'roster/'+r['activeId']+'.webp'] if x and not x.startswith('humanized/')]))})
 if entry['id']=='hero_1':entry['aliases']=sorted(set(entry['aliases']+['fifi.webp']))
 if entry['id']=='wife_1':entry['aliases']=sorted(set(entry['aliases']+['roster/wife_1.webp']))
 records.append(entry)
assert len(records)==259 and len(set(r['id'] for r in records))==259
assert sum(r['bytes'] for r in records)<=32*1024*1024
(app/'lib/humanized-static-data.json').write_text(json.dumps(records,indent=2)+'\n')
print('Selected',len(records),'compositions;',sum(r['bytes'] for r in records),'bytes; firstpair retained')
