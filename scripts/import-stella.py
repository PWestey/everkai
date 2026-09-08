from pathlib import Path
import json,re,html,hashlib,collections
app=Path(__file__).resolve().parents[1];root=app.parent.parent;base=root/'outputs/online-audit/public-reference/wiki/fellows'
items={r['id']:r['en'] for r in json.loads((root/'outputs/component-research/datasets/Item.json').read_text())};names={r['id']:r['en'] for r in json.loads((root/'outputs/component-research/datasets/Hero.json').read_text())}
inventory=[];profiles=[]
for p in sorted(base.glob('*/index.html')):
 raw=p.read_bytes();s=raw.decode();nodes=re.findall(r'<button class="stella-node\b.*?</button>',s,re.S);inventory.append({'profile':p.parent.name,'levels':len(nodes),'sha256':hashlib.sha256(raw).hexdigest()})
 if p.parent.name not in ['angie','rani','liz','elise']:continue
 name=p.parent.name.title();id={'Angie':'52','Rani':'54','Liz':'56','Elise':'190'}[name];kind={'Angie':'Informed','Rani':'Inspiring','Liz':'Diligent','Elise':'Inspiring'}[name];assert names['Hero:name:'+id]==name
 levels=[]
 for n in nodes:
  level=int(re.search(r'aria-label="Stella (\d+)"',n)[1]);m=re.search(r'<b>Cost:</b> (\d+) x <a[^>]+title="([^"]+)"',n);assert m
  qty=int(m[1]);item=m[2];assert item=='Item_Owner_HeroPiece_'+id;assert items['Item:name:'+item]==name+"'s Fragment"
  effects=[(html.unescape(a),html.unescape(b)) for a,b in re.findall(r'<span class="stella-reward-name">(.*?)</span><span class="stella-reward-desc">(.*?)</span>',n,re.S)];assert len(effects)==2
  flat=next(v for k,v in effects if k=='Attribute Boost');power=re.fullmatch(r'Power \+([\d.]+)([KM])',flat);assert power
  buff=next(v for k,v in effects if k=='Power Boost');match=re.fullmatch(r'All '+kind+r' Fellow Power \+(\d+)%',buff);assert match
  assert 'stella-reward-single' not in n
  levels.append({'level':level,'cost':qty,'itemId':item,'flat':round(float(power[1])*{'K':1000,'M':1000000}[power[2]]),'percent':int(match[1])})
 assert [r['level'] for r in levels]==list(range(1,21 if name=='Elise' else 41))
 profiles.append({'id':'hero_'+id,'name':name,'type':kind,'itemId':'Item_Owner_HeroPiece_'+id,'levels':levels,'source':'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/fellows/'+p.parent.name+'/index.html','sha256':hashlib.sha256(raw).hexdigest()})
(app/'lib/stella-data.json').write_text(json.dumps({'policyVersion':1,'profiles':profiles,'boundary':'Community cumulative paid upgrade rows only. Activation is separate authored policy; local final flat-then-percent stacking and free fragment supply.'},indent=2)+'\n')
out={'sourceCommit':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','publicProfiles':len(inventory),'counts':dict(collections.Counter(r['levels'] for r in inventory)),'rows':sum(r['levels'] for r in inventory),'selectedOwners':[r['id'] for r in profiles],'inventory':inventory}
(root/'outputs/online-audit/stella-inventory.json').write_text(json.dumps(out,indent=2)+'\n');print({k:v for k,v in out.items() if k!='inventory'})
