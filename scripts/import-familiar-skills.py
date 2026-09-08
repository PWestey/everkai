"""Read thirteen instantaneous active skills from the already pinned public snapshot."""
import pathlib,json,re,html,hashlib
root=pathlib.Path(__file__).resolve().parents[1];base=root.parent.parent/'outputs/online-audit/public-reference/wiki'
spec={'Pet_11321':('heal',300,1),'Pet_11141':('damage',400,2),'Pet_41121':('damage',320,1)}
spec.update({'Pet_11111':('damage',300,1),'Pet_12111':('damage',300,1),'Pet_13111':('damage',300,1),'Pet_22121':('damage',350,1),'Pet_33121':('damage',350,1),'Pet_32121':('damage',400,1),'Pet_23121':('damage',240,5),'Pet_32131':('damage',450,5),'Pet_22131':('damage',220,3),'Pet_43121':('damage',160,3)})
rows=[]
for e in json.loads((base/'wiki_manifest.json').read_text())['entries']:
 if e['category']!='familiars' or e['internal_id'] not in spec:continue
 p=base/e['url']/'index.html';b=p.read_bytes();m=re.search(r'<span class="skill-node-icon">A</span>.*?<strong>(.*?)</strong>\s*<span>(.*?)</span>',b.decode(),re.S)
 assert m,e['url'];kind,percent,targets=spec[e['internal_id']]
 text=html.unescape(re.sub('<[^>]+>','',m[2]));assert str(percent) in text
 targeting='randomFront' if 'random enemy in the front row' in text else 'randomBack' if 'random enemy in the back row' in text else 'front' if 'all front-row' in text else 'random' if 'random' in text else 'lowest'
 rows.append({'minVersion':2 if e['internal_id'] in ['Pet_11321','Pet_11141','Pet_41121'] else 3,'targeting':targeting,'id':e['internal_id'],'name':html.unescape(m[1]),'text':text,'kind':kind,'percent':percent,'targets':targets,'source':f'https://github.com/Zik-Ascend/isl-tools/blob/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/{e["url"]}index.html','sha256':hashlib.sha256(b).hexdigest()})
assert len(rows)==13
(root/'lib/familiar-skill-data.json').write_text(json.dumps({'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','classification':'Community active descriptions; not APK1.7702 matched; passive skills and unlock thresholds missing','skills':rows},indent=2)+'\n')
