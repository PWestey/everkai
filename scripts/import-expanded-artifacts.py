import json,pathlib,re,html,hashlib
ROOT=pathlib.Path(__file__).resolve().parents[1];AUDIT=ROOT.parent.parent/'outputs/online-audit';SOURCE=AUDIT/'public-reference/wiki'
items={x['id']:x['en'] for x in json.loads((ROOT.parent.parent/'outputs/component-research/datasets/Item.json').read_text())}
s=(ROOT/'lib/original-content.mjs').read_text();old=json.loads(s[s.index('{'):s.rindex('}')+1])['gear'];oldids={g['id'] for g in old}
manifest=json.loads((SOURCE/'wiki_manifest.json').read_text());rules={};added=[];excluded=[]
for e in manifest['entries']:
 if e['category']!='artifacts':continue
 id=e['internal_id'].replace('Weapon_','Item_Weapon_Equipment_',1);name=items.get('Item:name:'+id)
 if not name:excluded.append(id);continue
 b=(SOURCE/e['url']/'index.html').read_bytes();text=re.sub(r'\s+',' ',html.unescape(re.sub('<[^>]+>',' ',b.decode())))
 def num(pattern):
  m=re.search(pattern,text);return int(m[1].replace(',','')) if m else None
 r={'initial':num(r'Initial Aptitude (\d[\d,]*)'),'perLevel':num(r'Aptitude per Level (\d[\d,]*)'),'ore':num(r'Level Cost Magic Ore x(\d[\d,]*)'),'recycle':num(r'Recycle Rewards Magic Ore x(\d[\d,]*)'),'source':'https://zik-ascend.github.io/isl-tools/wiki/'+e['url'],'pageSha256':hashlib.sha256(b).hexdigest(),'rarity':e['rarity']}
 assert r['initial'] is not None and r['ore'] and r['perLevel'],id
 rules[id]=r
 if id not in oldids:added.append({'id':id,'name':name,'aptitude':r['initial'],'description':f"Aptitude +{r['initial']}. Special effects are not implemented.",'originalDescription':items.get('Item:description:'+id),'source':r['source'],'price':None})
assert all(rules[g['id']]['initial']==g['aptitude'] for g in old)
(ROOT/'lib/expanded-gear.json').write_text(json.dumps(added,indent=2)+'\n')
(ROOT/'lib/artifact-rules.json').write_text(json.dumps({'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','records':rules,'excludedWithoutLocalIdentity':excluded},indent=2)+'\n')
print('Catalog:',len(rules),'artifacts;',len(added),'added;',len(excluded),'unmatched records excluded')
