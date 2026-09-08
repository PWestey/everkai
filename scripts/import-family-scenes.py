"""Reuse exact source-layout backgrounds and model joins from the independent read-only art handoff."""
from pathlib import Path
import json,hashlib,shutil
root=Path(__file__).resolve().parents[1]; handoff=Path.home()/'Documents/Codex/2026-09-07/files-pasted-by-the-user-paste/outputs/roster-humanization'
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
models=json.loads((handoff/'integration-manifest.json').read_text())['models']; backgrounds=json.loads((handoff/'backgrounds/manifest.json').read_text());loaders=json.loads((handoff/'backgrounds/provenance/loaders.json').read_text());records=json.loads((root/'lib/roster-batch-evidence.json').read_text());out=root/'public/assets/family-scenes';out.mkdir(exist_ok=True)
assets={}
for name,parent,child in [('Bg_Wife','PanelLockWifeInfo','backGround'),('Bg_Wife_Data','PanelWifeDateNew','bgImg')]:
 row=next(x for x in backgrounds if x['name']==name);assert sha(handoff/row['file'])==row['sha256'];url='ui://'+row['packageId']+row['itemId'];assert any(x['parent']==parent and x['name']==child and x['url']==url for x in loaders);shutil.copyfile(handoff/row['file'],out/(name+'.png'));assets[name]={**row,'asset':'family-scenes/'+name+'.png','layoutParent':parent,'layoutChild':child,'layoutUrl':url}
joined={};excluded=[]
for r in records:
 if not r['id'].startswith('wife_'):continue
 m=models.get(r['model'])
 if not m:excluded.append({'id':r['id'],'model':r['model'],'reason':'No exact model in handoff; do not substitute costume'});continue
 assert m['sceneMode'] in ['external','embedded']
 joined[r['id']]={'model':r['model'],'art':r['art'],'portraitSha256':sha(root/'public/assets'/r['art']),'sceneMode':m['sceneMode'],'dimensions':r.get('dimensions'),'alphaBounds':r.get('alpha_bounds'),'profile':assets['Bg_Wife']['asset'] if m['sceneMode']=='external' else None,'date':assets['Bg_Wife_Data']['asset'] if m['sceneMode']=='external' else None}
out={'policy':'Shared source-layout settings; current art path must match; no dynamic assignment inferred','handoffManifestSha256':sha(handoff/'integration-manifest.json'),'assets':assets,'characters':joined,'excluded':excluded};(root/'lib/family-scene-data.json').write_text(json.dumps(out,indent=2)+'\n');print('Joined',len(joined),'models; excluded',excluded)
