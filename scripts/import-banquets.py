#!/usr/bin/env python3
from pathlib import Path
import json,hashlib
app=Path(__file__).resolve().parents[1];w=app.parents[1];rp=w/'outputs/component-research/datasets/Rule.json';ip=w/'outputs/component-research/datasets/Item.json';items={r['id']:r['en'] for r in json.loads(ip.read_text())};materials=[{'id':f'Item_Ceremony_0{i}','name':items[f'Item:name:Item_Ceremony_0{i}']} for i in range(1,5)];assert [m['name'] for m in materials]==['Cheese','Beer','Steak','Wine']
rows=[('Item_Talent_Hero_1','Skill Pearl',300,10),('Item_GetCE_10','Focus Candy',2,100),('gift4','Jewel Necklace',20,20),('gift2','Gemstone Ring',30,20),('Item_Strengthen_Equipment_1','Magic Ore',30,20),('Item_Gcoin_YieldPack_1','Basic Earnings Card',2,50)]
for id,name,_,_ in rows:assert items['Item:name:'+id]==name
out={'provenance':{'url':'https://isekai.wiki/index.php?title=Banquet&oldid=7601','checked':'2026-09-08','kind':'manually transcribed community seats/shop rows, not version matched','itemSha256':hashlib.sha256(ip.read_bytes()).hexdigest(),'ruleSha256':hashlib.sha256(rp.read_bytes()).hexdigest()},'materials':materials,'parties':[{'id':'wine','name':'Wine Party','seats':4,'materials':[m['id'] for m in materials[:2]]},{'id':'fine','name':'Fine Wine Party','seats':8,'materials':[m['id'] for m in materials[2:]]}],'shop':[{'id':id,'name':name,'price':price,'dailyLimit':limit} for id,name,price,limit in rows],'rules':[r for r in json.loads(rp.read_text()) if r['id'].startswith('Rule:text:Ceremony_')]}
(app/'lib/banquet-data.json').write_text(json.dumps(out,indent=2)+'\n')
