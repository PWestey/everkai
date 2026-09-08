"""Convert exact accessible CG crops; never decode bundles or change source artwork."""
from pathlib import Path
import json,hashlib
from PIL import Image
app=Path(__file__).resolve().parents[1]
source=app.parent/'isekai-research/independent/family-cg/cg-final-reference-map.json'
d=json.loads(source.read_text());out=app/'public/assets/family-gallery';out.mkdir(parents=True,exist_ok=True)
rows=[];evidence=[];total=0
for row in d['references']:
 r={k:row[k] for k in ('event','wifeId','familyName','inActiveFamilyCatalog','clothingVariant','requiredEnglishPackage','reference','gates','aliasUnresolved')};r['familyId']='wife_'+row['wifeId'];r['image']=None
 if row['asset']:
  a=row['asset'];p=Path(a['file']);assert hashlib.sha256(p.read_bytes()).hexdigest()==a['sha256'];assert a['package']==row['requiredEnglishPackage']
  image=Image.open(p).convert('RGB');original=image.size;image.thumbnail((960,960));target=out/(row['event']+'.webp');image.save(target,'WEBP',quality=78,method=6);size=target.stat().st_size;assert size<=512*1024;total+=size;r['image']='family-gallery/'+target.name
  evidence.append({'event':row['event'],'sourcePath':str(p),'sourceSha256':a['sha256'],'sourceDimensions':original,'dimensions':image.size,'path':'assets/'+r['image'],'sha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':size,'package':a['package']})
 rows.append(r)
assert len(evidence)==178 and total<=20*1024*1024
(app/'lib/family-gallery-data.json').write_text(json.dumps(rows,separators=(',',':'))+'\n')
(app/'lib/family-gallery-assets.json').write_text(json.dumps({'sourceMapSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'imageBytes':total,'images':evidence},indent=2)+'\n')
print(len(rows),'slots',len(evidence),'images',total,'bytes')
