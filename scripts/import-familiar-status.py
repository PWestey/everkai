"""Admit only whole supported active descriptions from a pinned public snapshot."""
from pathlib import Path
import re,json,html,hashlib
app=Path(__file__).resolve().parents[1];base=app.parent.parent/'outputs/online-audit/public-reference/wiki'
# Exact audited page hashes prevent silently admitting altered descriptions.
EXPECTED = {'Pet_3191': '1160aaabc9d328f446f387f77517ee39bb1b46a7f0619aab8d2f74d11c50da20', 'Pet_11131': 'a1c2a0372a91f673aa28f484ca1fa30253dc1d2902b5ea1a9c6f6ed56421371c', 'Pet_12131': 'd9fdcba46aefc8d6bca5fbabdc4de664d8fdb20ae9cda33fda6e162399325e83', 'Pet_21121': '98b92d010ba66f916b4b3962ecbb6d9341d218991aac1d607e4669880feb42eb', 'Pet_21131': 'ad43ded7490d0adb6008b1eb9501263a73562258ff0eb610d5603b42ba622725', 'Pet_23131': '4e54520794523f5289435c48b19f84f6bd5d0f44be9a94344f190cf030254d73', 'Pet_23331': '0d16c9e3419089c8cba67a76c23446ef13243e571eb31f3186edfc66064b8c74', 'Pet_31121': '539b4167f94a0fcc390279c900454f53ff23e0574c352fdb7a0bcd9fc5e91231', 'Pet_41131': '096ac7250ae0910e50caea0398d676e4bf8e62b27d02466cd32f33bdd892c1df', 'Pet_42121': '2a0c47f2d3b6e39f223c742a07a2e7f9cdac2ee3b1233558691e501107f14ee5', 'Pet_42131': 'cf55246d8579d03f176f5c43552f0d54d6a151816595e41a13e605909423a749', 'Pet_8021901': '6acd72c542c5ff603eb9ac289a9d6cba78ddfdc8c5e4c463269848bd2d2d6258', 'Pet_8031901': '0cdc284b7b8a6e3c8dc46318cca02676e5192a33afa9d6871f192863e795bfa8', 'Pet_8041501': '9fee93b3079a780aef77b05863b9046d21593efa9b6afd1327be12517396bf0c', 'Pet_8041505': 'b7f5f270d17b57408e777d5f4c9caca20f09df9635463002b174a408197ac5ea', 'Pet_9011901': '4ae6df5ae60b80582afec118a30b6be68f139220cdb9f1af76071e5b519358d7', 'Pet_9041501': 'fbb56dec08d26e7ae77132eba2a0bfab0906a67c7758bce98ab3d8fe6f858045'}
rows=[]
for e in json.loads((base/'wiki_manifest.json').read_text())['entries']:
 if e['category']!='familiars':continue
 p=base/e['url']/'index.html'
 if not p.exists():continue
 b=p.read_bytes();m=re.search(r'<span class="skill-node-icon">A</span>.*?<strong>(.*?)</strong>\s*<span>(.*?)</span>',b.decode(),re.S)
 if not m:continue
 text=html.unescape(re.sub('<[^>]+>','',m[2]));s=re.sub(r'\s+',' ',text.replace('×','*'));s=re.sub(r'\s*\*\s*','*',s)
 selected={
 'Pet_21121':('dot','highest',1,0,'bleed',200,2),
 'Pet_31121':('dot','lowest',1,0,'bleed',200,2),
 'Pet_42121':('dot','random',2,0,'bleed',90,2),
 'Pet_42131':('dot','random',3,0,'bleed',75,2),
 'Pet_21131':('damage','front',5,300,'bleed',25,2),
 'Pet_8021901':('damage','back',5,220,'bleed',50,2),
 'Pet_8031901':('dot','all',5,0,'poison',150,3),
 'Pet_8041505':('damage','all',5,180,'bleed',100,2),
 'Pet_9041501':('damage','all',5,200,'bleed',150,2),
 'Pet_3191':('damage','all',5,150,'vulnerable',25,3),
 'Pet_11131':('damage','randomBack',1,450,'vulnerable',15,3),
 'Pet_12131':('damage','randomFront',1,500,'vulnerable',15,3),
 'Pet_23131':('damage','randomBack',1,450,'vulnerable',15,3),
 'Pet_41131':('damage','back',5,180,'vulnerable',15,3),
 'Pet_8041501':('damage','lowest',1,500,'vulnerable',25,3),
 'Pet_9011901':('damage','lowest',1,450,'vulnerable',25,3),
 'Pet_23331':('shield','front',5,300,'shield',300,2)}
 if e['internal_id'] not in selected:continue
 assert hashlib.sha256(b).hexdigest()==EXPECTED[e['internal_id']], 'Source changed; whole description requires new audit'
 kind,targeting,targets,percent,status,value,turns=selected[e['internal_id']]
 # Every selected entire description was audited; pin checksum in imported evidence.
 assert str(value) in s and str(turns) in s
 assert all(x not in s.lower() for x in ['crit','speed','block','damage dealt','regen'])
 if percent:assert str(percent) in s
 assert {'bleed':'bleed','poison':'poison','vulnerable':'damage taken','shield':'shield'}[status] in s.lower()
 rows.append({'id':e['internal_id'],'name':html.unescape(m[1]),'text':text,'minVersion':4,'kind':kind,'targeting':targeting,'targets':targets,'percent':percent,'status':{'kind':status,'percent':value,'turns':turns},'source':f'https://github.com/Zik-Ascend/isl-tools/blob/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/{e["url"]}index.html','sha256':hashlib.sha256(b).hexdigest()})
assert len(rows)==17
(app/'lib/familiar-status-data.json').write_text(json.dumps({'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','boundary':'Whole selected active descriptions; timing, stacking and unlock access are local combatVersion4 rules, not original formulas.','skills':rows},indent=2)+'\n')
print('17 complete source skill descriptions imported')
