from pathlib import Path
import json,hashlib
root=Path(__file__).resolve().parents[1];p=root.parent.parent/'outputs/component-research/text/c884ee22dfd491ce.bin';raw=p.read_bytes();rows=json.loads(raw)['translate'];d={r['id']:r['en'] for r in rows};essences=[]
for n,type in enumerate(['Inspiring','Diligent','Brave','Informed','Unfettered'],1):
 id=f'SG3TalentCountry{n}';description=d['Item:description:'+id];assert type in description
 essences.append({'id':id,'name':d['Item:name:'+id],'type':type,'description':description})
out={'source':'Readable APK1.7702','sha256':hashlib.sha256(raw).hexdigest(),'dew':{'id':'SG3Harvest','name':d['Item:name:SG3Harvest'],'description':d['Item:description:SG3Harvest']},'essences':essences}
(root/'lib/farm-trade-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
