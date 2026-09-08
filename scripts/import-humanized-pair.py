from pathlib import Path
import json,hashlib
from PIL import Image
app=Path(__file__).resolve().parents[1];root=Path('/Users/westmanfamily/Documents/Codex/2026-09-08/isekai-source-research/outputs/humanized-clean-pair');receipt=json.loads((root/'receipt.json').read_text());out=app/'public/assets/humanized';out.mkdir(parents=True,exist_ok=True);records=[]
for r in receipt:
 source=Path(r['image']);assert hashlib.sha256(source.read_bytes()).hexdigest()==r['imageSha256']
 for f in r['loadedFiles']:assert hashlib.sha256(Path(f['file']).read_bytes()).hexdigest()==f['sha256']
 assert all(x['exists'] and x['attachment'] is None for x in r['hidden']);assert r['config']['premultipliedAlpha']
 image=Image.open(source).convert('RGB');image.thumbnail((960,960));dest=out/(r['id']+'.webp');image.save(dest,'WEBP',quality=85,method=6)
 records.append({'id':{'wife_01':'wife_1','hero_01':'hero_1'}[r['id']],'model':r['id'],'art':'humanized/'+dest.name,'sourceSha256':r['imageSha256'],'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'composition':'includes-background','receiptSha256':hashlib.sha256((root/'receipt.json').read_bytes()).hexdigest()})
(app/'lib/humanized-static-data.json').write_text(json.dumps(records,indent=2)+'\n')
