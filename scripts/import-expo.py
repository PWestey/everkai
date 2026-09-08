"""Read pinned local hub only. Preserve all evidence; only first five stages playable."""
from pathlib import Path
import re,json,html,hashlib
root=Path(__file__).resolve().parents[1]
p=root.parent.parent/'outputs/online-audit/public-reference/wiki/expo/index.html'
b=p.read_bytes();s=b.decode()
def text(x):return ' '.join(html.unescape(re.sub('<[^>]+>',' ',x)).split())
def field(b,k):
 m=re.search(r'<td>'+re.escape(k)+r'</td><td>(.*?)</td>',b,re.S)
 assert m,k
 return m[1]
def num(x):return int(text(x).replace(',',''))
stalls=[]
for b in re.findall(r'<li id="expo-stall-.*?</li>',s,re.S):
 ident=re.search('data-id-text="([^"]+)"',b)[1];name=text(re.search(r'<h3[^>]*>(.*?)</h3>',b,re.S)[1]);goods=html.unescape(re.search('data-obj-type="([^"]+)"',b)[1]);raw=text(b)
 growth=re.search(r'Power bonus ([\d.]+)%(?: \(\+([\d.]+)%\))?',raw)
 stalls.append({'id':ident,'name':name,'goods':goods,'base':float(growth[1]),'step':float(growth[2] or 0),'maxLevel':int(re.search(r'Max level: (\d+)',raw)[1]),'evidence':raw})
stages=[]
for n,b in re.findall(r'<details id="expo-stage-stage(\d+)"(.*?)</details>',s,re.S):
 rewards=[]
 for r in re.findall(r'<a class="event-reward-chip .*?</a>',field(b,'Clear reward'),re.S):
  ident=html.unescape(re.search(r'title="([^"]+)"',r)[1]);name=html.unescape(re.search(r'alt="(.*?) preview"',r)[1]);amount=num(re.search(r'event-reward-count">×(.*?)</span>',r)[1]);rewards.append({'id':ident,'name':name,'amount':amount})
 types=[]
 for r in field(b,'Type requirements').split('<br>'):
  t=text(r);m=re.fullmatch(r'(Food|Beverage|Gifts)(?: : ([\d,]+))?',t);assert m,t
  types.append({'goods':m[1],'amount':int(m[2].replace(',','')) if m[2] else None})
 stages.append({'id':int(n),'slots':num(field(b,'Stall slots')),'power':num(field(b,'Power required')),'satisfaction':num(field(b,'Satisfaction target')),'types':types,'flags':text(field(b,'Special flags')),'rewards':rewards})
assert len(stalls)==35 and len(stages)==100 and all(x['flags']=='None' for x in stages[:5])
out={'source':'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/expo/index.html','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'limits':'Community rows; not verified version-matched formulas. Only stages1–5 playable. Customer simulation, progression gating and coin upgrades local.','stalls':stalls,'stages':stages}
(root/'lib/expo-data.json').write_text(json.dumps(out,indent=2)+'\n')
print(len(stalls),'stalls;',len(stages),'stages;',stages[:1])
