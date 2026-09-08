from pathlib import Path
import json,re,hashlib
app=Path(__file__).resolve().parents[1];ds=app.parents[1]/'outputs/component-research/datasets';rp=ds/'Rule.json';ip=ds/'Item.json';rules={r['id']:r['en'] for r in json.loads(rp.read_text())};items=json.loads(ip.read_text());out=[]
for n in range(4,16):
 key=f'Rule:text:Lottery_{n}';name,qty,pct=re.fullmatch(r'\s*(.+) x(\d+) ([\d.]+)%',rules[key]).groups();joins=[r['id'].removeprefix('Item:name:') for r in items if r['id'].startswith('Item:name:') and r['en']==name];joins=[j for j in joins if not j.endswith('_Show')];assert len(joins)<=1
 out.append(dict(id=f'Lottery_{n}',name=name,quantity=int(qty),weight=round(float(pct)*10),itemId=joins[0] if joins else None,sourceKey=key))
assert sum(r['weight'] for r in out)==1000
result={'provenance':{'kind':'APK1.7702 readable English rule text','ruleSha256':hashlib.sha256(rp.read_bytes()).hexdigest(),'itemSha256':hashlib.sha256(ip.read_bytes()).hexdigest(),'checked':'2026-09-08','communityRecruit':'https://isekai-slow-life-mgame.fandom.com/wiki/Recruit','recruitEvidence':'acquaintance-recruits.json','communitySynthesis':'https://isekai.wiki/Acquaint_Stone'},'pool':out,'rules':[{'id':k,'en':v} for k,v in rules.items() if k.startswith('Rule:text:Lottery_')],'recruits':json.loads((app/'lib/acquaintance-recruits.json').read_text())['recruits'],'synthesis':{'fragments':20,'stones':1},'fairyReward':{'every':500,'reward':'Lottery_4','quantity':1,'source':'https://isekai-slow-life-mgame.fandom.com/wiki/Fountain_of_Wishes','corroboration':'https://www.reddit.com/r/Isekai_Slow_Life/comments/1l3t2mu','kind':'community reference via search index; direct open unavailable; not version matched','checked':'2026-09-08'}}
(app/'lib/fountain-data.json').write_text(json.dumps(result,indent=2)+'\n')
