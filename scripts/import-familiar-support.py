"""Seven whole audited active kits; amounts from pinned public descriptions."""
from pathlib import Path
import hashlib,json,re,html
app=Path(__file__).resolve().parents[1];root=app.parent.parent
spec={
'Pet_22241':('shield','front',5,0,'atk',[('shield',400,2,'primary','atk'),('regen',50,2,'primary','atk')]),
'Pet_23341':('heal','lowest',3,20,'targetMaxHP',[('regen',5,2,'primary','targetMaxHP')]),
'Pet_33231':('damage','front',5,300,'atk',[('shield',10,2,'self','casterMaxHP')]),
'Pet_43231':('damage','randomFront',1,220,'atk',[('regen',100,2,'self','atk')]),
'Pet_8043501':('heal','all',5,300,'atk',[('vulnerable',-35,3,'primary','atk'),('regen',75,2,'primary','atk')]),
'Pet_9013901':('heal','all',5,250,'atk',[('regen',60,2,'primary','atk')]),
'Pet_9023401':('heal','lowestPercent',2,300,'atk',[('vulnerable',-20,2,'primary','atk')])}
proof=json.loads((root/'work/isekai-research/notes/familiar-support-readiness.json').read_text());rows=[]
for p in proof['selected']:
 raw=(root/'outputs/online-audit/public-reference'/p['source'].split('/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/')[1]).read_bytes();assert hashlib.sha256(raw).hexdigest()==p['sha256']
 m=re.search(r'<span class="skill-node-icon">A</span>.*?<strong>(.*?)</strong>\s*<span>(.*?)</span>',raw.decode(),re.S);assert m
 text=html.unescape(re.sub('<[^>]+>','',m[2]));assert text==p['skill']['text'];kind,target,targets,percent,basis,effects=spec[p['id']]
 rows.append({'id':p['id'],'name':html.unescape(m[1]),'text':text,'minVersion':6,'kind':kind,'targeting':target,'targets':targets,'percent':percent,'basis':basis,'effects':[dict(kind=k,percent=n,turns=t,recipient=r,basis=b) for k,n,t,r,b in effects],'source':p['source'],'sha256':p['sha256']})
assert len(rows)==7
(app/'lib/familiar-support-data.json').write_text(json.dumps({'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','boundary':'Whole community active descriptions; combatVersion6 timing, rounding, refresh, targeting and unlock access authored locally.','skills':rows},indent=2)+'\n')
print('Imported seven complete support kits with pinned hashes.')
