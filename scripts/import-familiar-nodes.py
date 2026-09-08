"""Import numeric facts from pinned cached public data; execute no external code."""
import json,re,html,hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1];source=root.parent.parent/'outputs/online-audit/public-reference/wiki'
raw=(source/'assets/pet_simulator.json').read_bytes();tables=json.loads(raw)
manifest=json.loads((source/'wiki_manifest.json').read_text())
records={};groups={};inherent={}
for e in manifest['entries']:
 if e['category']!='familiars':continue
 text=(source/e['url']/'index.html').read_text();d=json.loads(html.unescape(re.search('data-pet-sim="([^"]+)"',text)[1]));rare=str(d['rarity']);nodes=[]
 for kind,table in [('level','levels'),('star','stars')]:
  for threshold,row in tables[table].items():
   effects={}
   for key,values in row.items():
    if not key.startswith('ExternalAdd'):continue
    value=values.get(rare)
    if value:
     field={'1':'flat','2':'aptitude','3':'percent','5':'finalPercent'}[str(value['addtype'])]
     effects[field]=effects.get(field,0)+value['value']/(100 if field in ['percent','finalPercent'] else 1)
   if effects:nodes.append({'id':f'{kind}:{threshold}','kind':kind,'threshold':int(threshold),'effects':effects})
 groups[rare]=nodes;records[e['internal_id']]=rare
 effects={}
 for value in d.get('ExternalAdd',[]):
  field={'1':'flat','2':'aptitude','3':'percent','5':'finalPercent'}[str(value['addtype'])]
  effects[field]=effects.get(field,0)+value['value']/(100 if field in ['percent','finalPercent'] else 1)
 inherent[e['internal_id']]=effects
out={'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','source':'https://github.com/Zik-Ascend/isl-tools','tableSha256':hashlib.sha256(raw).hexdigest(),'policy':'Manual free activation; one-to-one freely reversible binding; reconstructed Power ordering. Community data not APK-version-matched.','records':records,'groups':groups,'inherent':inherent}
(root/'lib/familiar-node-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print(len(records),'profiles;',sum(map(len,groups.values())),'nodes')
