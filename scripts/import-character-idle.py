#!/usr/bin/env python3
"""Import reviewed rendered animation clips, never source skeletons/runtime."""
import argparse,hashlib,json,shutil,math
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('manifest',type=Path);p.add_argument('--sha256',required=True);p.add_argument('--expected-count',type=int);a=p.parse_args()
assert hashlib.sha256(a.manifest.read_bytes()).hexdigest()==a.sha256,'Unreviewed manifest'
document=json.loads(a.manifest.read_text());rows=document['clips'];
if a.expected_count is not None:
    assert document['status']=='complete' and len(rows)==a.expected_count,'Incomplete delivery'
app=Path(__file__).resolve().parents[1];out=app/'public/assets/idle';out.mkdir(exist_ok=True)
base={r['id']:r['model'] for r in json.loads((app/'lib/humanized-static-data.json').read_text())};costumes={r['id']:r for r in json.loads((app/'lib/wardrobe-data.json').read_text())['costumes']}
data={};total=0;filenames=set();copies=[]
for row in rows:
    assert row['sourceFilesPass'] and row['allFrameSlotsPass'],'Source/frame validation failed'
    source=Path(row['file']);assert source.suffix=='.mp4'
    assert source.stat().st_size==row['bytes']<=8*1024*1024
    assert hashlib.sha256(source.read_bytes()).hexdigest()==row['sha256']
    assert 0<row['height']<=1536 and 0<row['width']<=1024
    key=row.get('costumeId') or row['activeId'];assert key not in data
    if row.get('costumeId'):
        expected=costumes[key];assert expected['ownerId']==row['activeId'] and expected['modelId']==row['id'],'Foreign costume/model'
    else:assert base[row['activeId']]==row['id'],'Foreign base model'
    assert source.name not in filenames;filenames.add(source.name)
    assert all(math.isfinite(row[k]) and row[k]>0 for k in ['fps','frames','encodedDuration'])
    assert isinstance(row['frames'],int) and abs(row['frames']/row['fps']-row['encodedDuration'])<0.05
    total+=row['bytes'];assert total<=100*1024*1024
    data[key]={k:row[k] for k in ['id','sha256','bytes','width','height','fps','frames','encodedDuration']}
    data[key].update(owner=row['activeId'],costumeId=row.get('costumeId'),src='idle/'+source.name)
    copies.append((source,out/source.name))
for source,destination in copies:shutil.copyfile(source,destination)
(app/'lib/character-idle-data.json').write_text(json.dumps(data,indent=2)+'\n')
print(f'Imported {len(data)} reviewed clips, {total} bytes')
