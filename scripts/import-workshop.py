from pathlib import Path
import json,re,hashlib
root=Path(__file__).resolve().parents[1];p=root.parent.parent/'outputs/component-research/text/c884ee22dfd491ce.bin';raw=p.read_bytes();rows=json.loads(raw)['translate'];lookup={r['id']:r['en'] for r in rows};records=[]

for r in rows:
 if not r['id'].startswith('SimGame2Forge:description:'):continue
 id=r['id'].split(':')[-1];m=re.search(r'Sales Exp \+(\d+), Workshop coin \+(\d+)/sec, sales time (\d+) sec',r['en']);assert m
 records.append({'id':id,'name':lookup['SimGame2Forge:name:'+id],'salesXP':int(m[1]),'coinsPerSecond':int(m[2]),'seconds':int(m[3]),'evidenceKey':r['id']})
assert len(records)==50
out={'source':'Readable APK1.7702 translation','sha256':hashlib.sha256(raw).hexdigest(),'records':records,'rules':[r for r in rows if r['id'].startswith('Rule:text:SimGame2_')],'sandbox':{'supplyPerUnit':1,'freeRestock':20,'pearlPrice':2000,'unlocks':'one craft of previous group product','hotRotation':'one product per group daily UTC','evaluation':'not modeled; odds and multipliers missing'}}
(root/'lib/workshop-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print('Imported',len(records),'products with explicit rate/duration/EXP')
