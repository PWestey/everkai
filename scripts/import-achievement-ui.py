#!/usr/bin/env python3
import argparse,json,hashlib,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('index',type=Path);a=p.parse_args();assert hashlib.sha256(a.index.read_bytes()).hexdigest()=='3c79583020fa85c56ec212595c605e69be51ac1bda94962362c94379908949bb'
d=json.loads(a.index.read_text());assert d['status']=='complete' and d['count']==7
assert hashlib.sha256(Path(d['manifest']).read_bytes()).hexdigest()==d['manifestSha256']
for r in d['assets']:assert hashlib.sha256(Path(r['file']).read_bytes()).hexdigest()==r['sha256']
app=Path(__file__).resolve().parents[1];out=app/'public/assets/ui-original';data={}
for r in d['assets']:
 f=Path(r['file']);shutil.copyfile(f,out/f.name);data[r['name']]={'src':'ui-original/'+f.name,'sha256':r['sha256']}
(app/'lib/achievement-ui-data.json').write_text(json.dumps(data,indent=2)+'\n');print('Imported7 exact achievement UI sprites')
