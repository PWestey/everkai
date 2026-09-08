"""Import verified composed costume captures without modifying source artwork."""
from pathlib import Path
import argparse,hashlib,json
from PIL import Image
parser=argparse.ArgumentParser();parser.add_argument('manifest',type=Path);parser.add_argument('--sha256',required=True);args=parser.parse_args()
app=Path(__file__).resolve().parents[1]
assert hashlib.sha256(args.manifest.read_bytes()).hexdigest()==args.sha256
manifest=json.loads(args.manifest.read_text());costumes={r['id']:r for r in json.loads((app/'lib/wardrobe-data.json').read_text())['costumes']}
out=app/'public/assets/wardrobe';out.mkdir(parents=True,exist_ok=True);cache={};records=[]
for r in manifest['records']:
 if not r.get('image'):continue
 c=costumes.get(r['costumeId']);assert c and c['ownerId']==r['activeId'] and c['modelId'].lower()==r['id'].lower()
 assert r['verified'] and not r['sourceHashFailures']
 for f in r['loadedFiles']:
  if f['file'] not in cache:cache[f['file']]=hashlib.sha256(Path(f['file']).read_bytes()).hexdigest()
  assert cache[f['file']]==f['sha256']
 source=Path(r['image']);assert hashlib.sha256(source.read_bytes()).hexdigest()==r['imageSha256']
 image=Image.open(source).convert('RGBA');image.thumbnail((960,960))
 if image.getextrema()[3]==(255,255):image=image.convert('RGB')
 target=out/(c['id']+'.webp');image.save(target,'WEBP',quality=85,method=6);assert target.stat().st_size<=512*1024
 records.append({'costumeId':c['id'],'ownerId':c['ownerId'],'model':r['id'],'art':'wardrobe/'+target.name,'sourceSha256':r['imageSha256'],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'dimensions':list(image.size),'composition':'includes-background','sourceManifestSha256':args.sha256,'recipeSha256':r['recipeSha256'],'background':r['background']})
assert len(records)==257 and len({r['costumeId'] for r in records})==257
assert sum(r['bytes'] for r in records)<=32*1024*1024
(app/'lib/wardrobe-assets.json').write_text(json.dumps(records,indent=2)+'\n')
print('Imported',len(records),'costumes;',sum(r['bytes'] for r in records),'bytes;',len(cache),'unique source files checked')
