#!/usr/bin/env python3
import argparse,json,hashlib,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('index',type=Path);p.add_argument('--sha256',required=True);a=p.parse_args();assert hashlib.sha256(a.index.read_bytes()).hexdigest()==a.sha256
d=json.loads(a.index.read_text());assert d['status']=='complete' and d['selected']==113 and d['delivered']==101
assert hashlib.sha256(Path(d['manifest']).read_bytes()).hexdigest()==d['manifestSha256']
app=Path(__file__).resolve().parents[1];source=json.loads((app/'lib/inventory-display-data.json').read_text());rows=d['assets'];ids=set();names=set();total=0
for r in rows:
 assert r['id'] not in ids and r['file'] not in names;ids.add(r['id']);names.add(r['file'])
 assert source[r['id']]['icon']==r['icon'] and r['sourceIconMatch'] and r['inverseTransformPixelMatch']
 b=Path(r['file']).read_bytes();assert len(b)==r['bytes']<=256*1024;assert hashlib.sha256(b).hexdigest()==r['sha256'];total+=len(b)
assert total==d['totalBytes']<=4*1024*1024
out=app/'public/assets/inventory';out.mkdir(exist_ok=True);data={}
for r in rows:
 f=Path(r['file']);shutil.copyfile(f,out/f.name);data[r['id']]={'src':'inventory/'+f.name,'icon':r['icon'],'sha256':r['sha256'],'bytes':r['bytes'],'sourceIndexSha256':a.sha256}
(app/'lib/inventory-icon-data.json').write_text(json.dumps(data,indent=2)+'\n')
(app/'lib/inventory-icon-exceptions.json').write_text(json.dumps(d['exceptions'],indent=2)+'\n');print('Imported101 exact inventory images',total)
