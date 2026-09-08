"""Import numbered, choice-free city encounter text. Does not reconstruct event triggers."""
import json,re,hashlib
from pathlib import Path
p=Path(__file__).resolve();root=p.parents[3]/'outputs/component-research/datasets';rows=json.loads((root/'Dialog.json').read_text());chars=json.loads((root/'characters.json').read_text());known={c['id'] for c in chars};lookup={r['id']:r['en'] for r in rows};groups={}
for r in rows:
 m=re.fullmatch(r'Dialog:context:(CityEvent([HW])(\d+))-(\d+)',r['id'])
 if not m:continue
 scene,kind,number,line=m.groups();id=('hero_' if kind=='H' else 'wife_')+str(int(number))
 if id not in known:continue
 groups.setdefault(scene,{'id':scene,'characterId':id,'lines':[]})['lines'].append({'number':int(line),'text':r['en'],'sourceKey':r['id'],'speaker':lookup.get('Dialog:overrideName:'+scene+'-'+line)})
scenes=[];excluded=[]
for scene in groups.values():
 lines=sorted(scene['lines'],key=lambda r:r['number']);reason=None
 if [x['number'] for x in lines]!=list(range(1,len(lines)+1)):reason='Non-contiguous line numbers'
 if any(k.startswith('Dialog:choice') and ':'+scene['id']+'-' in k for k in lookup):reason='Branch choices need original flow data'
 if any('momoca' in x['text'].lower() or re.search(r'\{(?!playerName\})[^}]+\}',x['text']+(x['speaker'] or '')) for x in lines):reason='Unresolved text placeholder'
 if reason:excluded.append({'id':scene['id'],'reason':reason});continue
 scene['lines']=lines;scenes.append(scene)
scenes.sort(key=lambda x:x['characterId']);out={'scenes':scenes,'excluded':excluded,'sourceHash':hashlib.sha256((root/'Dialog.json').read_bytes()).hexdigest()}
(p.parents[1]/'lib/original-scenes.mjs').write_text('// Generated from readable original Dialog TextAssets; numbered text replay only.\nexport default '+json.dumps(out,ensure_ascii=False,separators=(',',':'))+';\n')
print('Imported',len(scenes),'scenes,',sum(len(s['lines']) for s in scenes),'lines;',len(excluded),'excluded')
