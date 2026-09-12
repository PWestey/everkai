#!/usr/bin/env python3
"""Import pinned, reviewed UI pixels only; no package decoding."""
import argparse,hashlib,json,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('index',type=Path);p.add_argument('--sha256',required=True);p.add_argument('--artifact-map',type=Path);a=p.parse_args()
assert hashlib.sha256(a.index.read_bytes()).hexdigest()==a.sha256
index=json.loads(a.index.read_text());assert index['status']=='complete' and index['count']==65
assert hashlib.sha256(Path(index['manifest']).read_bytes()).hexdigest()==index['manifestSha256']
wanted={'Icon_Intimacy_1','Icon_Intimacy_2','Icon_Intimacy_3','Icon_EmblemStrength_1','Icon_EmblemStrength_2'}|{'Icon_Rarity_'+r+'_1' for r in ['N','R','SR','SSR','UR','LR','SSRPlus','URPlus']}|{'Icon_Hero_Country_'+str(i) for i in range(1,6)}
# Roster tile chrome. Companions have no portrait art of any kind -- 0 of 71 carry one and none
# exists on disk -- so their roster is built from the original's own rarity-framed list cards
# (206x280) plus a career badge (70x70), which is how the original presents them too.
wanted|={'Bg_PetList_Rarity_'+str(i) for i in range(1,7)}|{'Frame_PetList_Rarity_'+str(i) for i in range(1,7)}|{'Icon_Pet_Career_'+str(i) for i in range(1,4)}
rows=[r for r in index['assets'] if r['name'] in wanted];assert len(rows)==len(wanted)==33
for r in rows:
 b=Path(r['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==r['sha256'];assert len(b)<=256*1024
app=Path(__file__).resolve().parents[1];out=app/'public/assets/ui-original';out.mkdir(parents=True,exist_ok=True);data={}
for r in rows:
 path=Path(r['file']);shutil.copyfile(path,out/path.name);data[r['name']]={'src':'ui-original/'+path.name,'sha256':r['sha256'],'sourceIndexSha256':a.sha256,'width':r['width'],'height':r['height']}
(app/'lib/ui-sprite-data.json').write_text(json.dumps(data,indent=2)+'\n');print(f'Imported {len(rows)} exact named UI sprites')

if a.artifact_map:
    assert hashlib.sha256(a.artifact_map.read_bytes()).hexdigest()=='ec2506323444c37b26d002f80e14bfa87c7a64553ee984595b81d99b49054d4e'
    packet=json.loads(a.artifact_map.read_text());chosen={'Base_atlas_f2211nupkt8.png':'title.png','Base_atlas_d1wo1nupmsk.png':'parchment.png'}
    visuals=[(r,chosen[Path(r['file']).name]) for r in packet['textures'] if Path(r['file']).name in chosen]+[(packet['shieldCloseVisualCrop'],'close.png')]
    for r,name in visuals:
        b=Path(r['file']).read_bytes();assert hashlib.sha256(b).hexdigest()==r['sha256'];shutil.copyfile(r['file'],out/name)
    (app/'lib/ui-chrome-evidence.json').write_text(json.dumps([{'src':'ui-original/'+name,'sha256':r['sha256'],'source':r['file'],'binding':'visual-source role; native placement and responsive border slices not asserted'} for r,name in visuals],indent=2)+'\n')
