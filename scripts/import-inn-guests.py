from pathlib import Path
import re,json,html,hashlib
root=Path(__file__).resolve().parents[1];w=root.parents[1];p=w/'outputs/online-audit/public-reference/wiki/inn/index.html';raw=p.read_bytes();text=raw.decode();dishes=json.loads((root/'lib/inn-data.json').read_text())['dishes'];heroes=json.loads((w/'outputs/component-research/datasets/Hero.json').read_text());rows=[]
for chunk in re.split(r'(?=<li id="inn-gifts-)',text)[1:]:
 chunk=chunk.split('<li id="inn-',1)[0] if not chunk.startswith('<li id="inn-') else chunk
 ident=re.search(r'data-id-num="([^"]+)"',chunk)[1]
 if ident not in ['Collection_2','Collection_4','Collection_6','Collection_8','Collection_9','Collection_3','Collection_10']:continue
 name=html.unescape(re.search(r'<span class="inn-item-name">(.*?)</span>',chunk,re.S)[1]);plain=html.unescape(re.sub('<[^>]+>',' ',chunk));plain=re.sub(r'\s+',' ',plain);effect=re.search(r'Employee Earnings of (Informed|Diligent|Unfettered|Inspiring|Brave) Building \+25%',plain)
 level=int(re.search(r'Inn level: (\d+)',plain)[1]);dishname=re.search(r'Dish unlocked: (.*?)(?: Obtain Fellow:|\s*$)',plain)[1].strip();matches=[x for x in dishes if x['name']==dishname];assert len(matches)==1,(ident,dishname)
 fellow=None
 if 'Obtain Fellow: Maxim' in plain:
  m=[x for x in heroes if x['en']=='Maxim' and re.fullmatch(r'Hero:name:\d+',x['id'])];assert len(m)==1;fellow='hero_'+m[0]['id'].split(':')[-1]
 extra={'type':effect[1],'percent':25} if effect else ({'kind':'graduationFlat','amount':500} if re.search(r"When a Pupil graduates, the Pupil.s earnings \+500",plain) else {'kind':'teachAllXP','amount':100} if 'Fellow EXP +100 each time you educate all Pupils' in plain else None);assert extra,(ident,plain)
 rows.append({'id':ident,'name':name,'rating':level,'dish':matches[0]['id'],'dishName':dishname,'fellow':fellow,**extra})
assert len(rows)==7
out={'source':'https://zik-ascend.github.io/isl-tools/wiki/inn/','snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','sha256':hashlib.sha256(raw).hexdigest(),'rules':rows,'scope':'Five typed gifts plus two School treasures; initial values only; cross-source Inn level/rating adapter and visit timing local'};(root/'lib/inn-guest-data.json').write_text(json.dumps(out,indent=2)+'\n');print(rows)
