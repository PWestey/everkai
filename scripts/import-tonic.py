from pathlib import Path
import json,hashlib,re
app=Path(__file__).resolve().parents[1];p=app.parents[1]/'outputs/component-research/datasets/Item.json';rows={r['id']:r['en'] for r in json.loads(p.read_text())};id='Item_GetDE_10';key='Item:description:'+id;amount=int(re.search(r'obtain (\d+) Energy',rows[key]).group(1));assert amount==3
(app/'lib/tonic-data.json').write_text(json.dumps({'id':id,'name':rows['Item:name:'+id],'ledger':'Lottery_9','amount':amount,'description':rows[key],'sourceKey':key,'sourceSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'version':'APK1.7702 readable English','localPolicy':{'reserveCap':30,'order':'reserve before natural Energy','receiptLimit':100000}},indent=2)+'\n')
