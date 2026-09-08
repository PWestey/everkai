"""Whole manually audited active kits, with pinned page checksums."""
from pathlib import Path
import re,json,html,hashlib
app=Path(__file__).resolve().parents[1];base=app.parent.parent/'outputs/online-audit/public-reference/wiki'
# kind, target, count, coefficient, effects(kind, percent, turns, recipient)
spec={
'Pet_4251':('damage','all',5,180,[('dealt',-35,3,'primary'),('speed',-50,3,'primary')]),
'Pet_4351':('damage','all',5,180,[('dealt',-35,3,'primary'),('vulnerable',35,3,'primary')]),
'Pet_13131':('damage','randomFront',1,500,[('attack',30,3,'self')]),
'Pet_13141':('damage','random',3,220,[('dealt',-20,3,'primary')]),
'Pet_21231':('damage','randomBack',1,400,[('vulnerable',-15,3,'self')]),
'Pet_21341':('heal','all',5,270,[('attack',20,3,'primary')]),
'Pet_32331':('buff','highestATK',2,0,[('attack',75,2,'primary')]),
'Pet_33131':('damage','back',5,200,[('attack',-30,3,'primary')]),
'Pet_8041502':('damage','random',3,240,[('vulnerable',35,3,'primary'),('attack',25,3,'self')]),
'Pet_8041503':('damage','randomBack',1,500,[('speed',50,3,'self'),('vulnerable',35,3,'primary')]),
'Pet_8042501':('damage','all',5,180,[('attack',-25,3,'primary'),('dealt',-25,3,'primary')]),
'Pet_8043502':('dot','all',5,0,[('poison',150,3,'primary'),('attack',-25,3,'primary'),('speed',-50,3,'primary')]),
'Pet_9041502':('damage','back',5,300,[('bleed',150,2,'primary'),('vulnerable',25,3,'primary')])}
EXPECTED={'Pet_4251': '7c5cf1dc8c7e08d6d62a6b7bd1f86d3ce1a61f8283a60612f5dda26850575236', 'Pet_4351': '9ed8bec6514dc083a51ac603c8fff7c4f675237d7c655dce82f25af2e48bfd4a', 'Pet_13131': '5b28088aae934e02158940fcf48419e7a9d696bee6d21bd7870de2949e402b7f', 'Pet_13141': 'b419bfa2d0805320d9716dbe3da9aa561b26093cbb88a0607ec01b501168e29e', 'Pet_21231': 'a1c243e80b30d71e6757d12964da65102186737073b0b7d93dd35faf85b7d415', 'Pet_21341': '3d14e2e84af33e0b6214fc379064d1a77fab8dddb368b1dd8d419a36f0d0e26d', 'Pet_32331': '02c744550090e274cc57dd28667da69155dedd7282631e784eeae8692d628177', 'Pet_33131': 'db62c3cc5c96209be5fc3541b0ecd242adc9b048bef29c6ab0a0688e1d016991', 'Pet_8041502': '68df74edc299480673f1de4d5fbee4f4ad49e2adc90dff797d638223c7c50f1c', 'Pet_8041503': 'caa11ee32c943fdc9a4c2deb23b56adeb5cb066e1cbd64d689b9b771759e1d01', 'Pet_8042501': 'fb714d4b04193e557db10db485b0c6092a28ba534902c4dedd87c3c892d971f5', 'Pet_8043502': 'eb69bb8ab0ed05c371b86a9d8d826b44f9cbaf45e6db349e5a1e76699f82c00f', 'Pet_9041502': '6c0d575fea4d708ca0ec08e6c738d6e7bb2ac967846d6c8e719eeffc5ef2bc43'}
rows=[]
for e in json.loads((base/'wiki_manifest.json').read_text())['entries']:
 if e['category']!='familiars' or e['internal_id'] not in spec:continue
 p=base/e['url']/'index.html';b=p.read_bytes();m=re.search(r'<span class="skill-node-icon">A</span>.*?<strong>(.*?)</strong>\s*<span>(.*?)</span>',b.decode(),re.S);assert m
 assert hashlib.sha256(b).hexdigest()==EXPECTED[e['internal_id']], 'Changed source requires full kit audit'
 text=html.unescape(re.sub('<[^>]+>','',m[2]));kind,target,targets,percent,effects=spec[e['internal_id']]
 assert not any(x in text.lower() for x in ['crit','block','shield','regen'])
 assert all(str(abs(n)) in text and str(t) in text for _,n,t,_ in effects)
 if percent:assert str(percent) in text
 rows.append({'id':e['internal_id'],'name':html.unescape(m[1]),'text':text,'minVersion':5,'kind':kind,'targeting':target,'targets':targets,'percent':percent,'effects':[{'kind':k,'percent':n,'turns':t,'recipient':r} for k,n,t,r in effects],'source':f'https://github.com/Zik-Ascend/isl-tools/blob/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/{e["url"]}index.html','sha256':hashlib.sha256(b).hexdigest()})
assert len(rows)==13
(app/'lib/familiar-modifier-data.json').write_text(json.dumps({'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','boundary':'Complete active text; combatVersion5 timing, order, stacking and free unlock access authored locally.','skills':rows},indent=2)+'\n')
print('13 complete modifier kits imported')
