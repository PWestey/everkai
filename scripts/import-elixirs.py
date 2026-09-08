from pathlib import Path
import json,re,hashlib
app=Path(__file__).resolve().parents[1];p=app.parents[1]/'outputs/component-research/datasets/Item.json';rows={r['id']:r['en'] for r in json.loads(p.read_text())};out=[]
for n,ledger in [(1,'Lottery_13'),(2,'Lottery_6')]:
 id=f'Item_Hero_Attribute_Increase_{n}';key='Item:description:'+id;text=rows[key];amount=int(re.search(r"designated Fellow's Power by ([\d,]+)",text).group(1).replace(',',''));out.append(dict(id=id,ledger=ledger,name=rows['Item:name:'+id],amount=amount,sourceKey=key,description=text))
assert [r['amount'] for r in out]==[3000,30000]
(app/'lib/elixir-data.json').write_text(json.dumps({'provenance':{'itemSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'kind':'APK1.7702 readable Item literals','checked':'2026-09-08','stacking':'local final unmultiplied component; original order unresolved'},'items':out},indent=2)+'\n')
