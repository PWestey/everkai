#!/usr/bin/env python3
"""Import reviewed rendered animation clips, never source skeletons/runtime."""
import argparse,hashlib,json,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('manifest',type=Path);p.add_argument('--sha256',required=True);a=p.parse_args()
assert hashlib.sha256(a.manifest.read_bytes()).hexdigest()==a.sha256,'Unreviewed manifest'
rows=json.loads(a.manifest.read_text())['clips'];app=Path(__file__).resolve().parents[1];out=app/'public/assets/idle';out.mkdir(exist_ok=True)
data={};total=0
for row in rows:
    assert row['sourceFilesPass'] and row['allFrameSlotsPass'],'Source/frame validation failed'
    source=Path(row['file']);assert source.suffix=='.mp4'
    assert source.stat().st_size==row['bytes']<=1048576
    assert hashlib.sha256(source.read_bytes()).hexdigest()==row['sha256']
    assert 0<row['height']<=512 and 0<row['width']<=1024
    key=row.get('costumeId') or row['activeId'];assert key not in data
    total+=row['bytes'];assert total<=100*1024*1024
    data[key]={k:row[k] for k in ['id','sha256','bytes','width','height','fps','frames','encodedDuration']}
    data[key].update(owner=row['activeId'],costumeId=row.get('costumeId'),src='idle/'+source.name)
    shutil.copyfile(source,out/source.name)
(app/'lib/character-idle-data.json').write_text(json.dumps(data,indent=2)+'\n')
print(f'Imported {len(data)} reviewed clips, {total} bytes')
