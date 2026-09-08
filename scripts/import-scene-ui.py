#!/usr/bin/env python3
import argparse,json,hashlib,shutil
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('stage_inn',type=Path);p.add_argument('opening',type=Path);a=p.parse_args()
assert hashlib.sha256(a.stage_inn.read_bytes()).hexdigest()=='0504a05fca022855780a06b85dc11d4999361d5c85866baee289632d578f6451'
assert hashlib.sha256(a.opening.read_bytes()).hexdigest()=='9fe1f081bf10573fecb1011f7cf4e4df6fb3f5c79f8f2e7e5f7260873585bd24'
s=json.loads(a.stage_inn.read_text());o=json.loads(a.opening.read_text());assert s['status']==o['status']=='complete'
expected={'1':'Bg_Village_01','2':'Bg_Field_01','3':'Bg_Village_01','4':'Bg_Village_01','5':'Bg_City_01','6':'Bg_Level_03'};assert {x['id']:x['background'] for x in o['chapters']}==expected
rows=s['stage']['pathSprites']+[r for r in s['textures'] if r['name']=='Scene_MainCity_Building_2_1_New'];chapters={}
for c in o['chapters']:
 r=next(r for r in c['layers'] if r['name']==c['background']+'_Mid');rows.append(r);chapters[c['id']]={'background':c['background'],'src':'ui-scenes/'+Path(r['file']).name,'sha256':r['sha256']}
unique={r['file']:r for r in rows}
for r in unique.values():assert hashlib.sha256(Path(r['file']).read_bytes()).hexdigest()==r['sha256']
app=Path(__file__).resolve().parents[1];out=app/'public/assets/ui-scenes';out.mkdir(exist_ok=True)
for r in unique.values():shutil.copyfile(r['file'],out/Path(r['file']).name)
(app/'lib/stage-scene-data.json').write_text(json.dumps({'chapters':chapters,'files':[{'src':'ui-scenes/'+Path(r['file']).name,'name':r['name'],'sha256':r['sha256']} for r in unique.values()],'bindingLimits':'Exact chapter background and named path sprites; camera/runtime controller/parallax remain local presentation. Inn exterior visual match; renderer assembly not asserted.'},indent=2)+'\n')
print('Imported',len(unique),'scene UI assets; exact six chapter joins')
