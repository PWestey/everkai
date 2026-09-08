"""Import complete normal Power/Aptitude combinations from pinned local hub."""
from pathlib import Path
import re,html,json,hashlib
root=Path(__file__).resolve().parents[1];p=root.parent.parent/'outputs/online-audit/public-reference/wiki/fishing/index.html';s=p.read_text();records=[]
for b in re.findall(r'<article class="fish-combination-node".*?</article>',s,re.S):
 name=html.unescape(re.search(r'<h3>(.*?)</h3>',b)[1]);members=sorted(set(re.findall(r'/fishing/(F\d+)/thumb',b)));assert len(members)>=2
 effects={k:html.unescape(v) for k,v in re.findall(r'<strong>(Normal Skill|Crown Skill)</strong>\s*<span>(.*?)</span>',b,re.S)}
 r={'id':'combination:'+':'.join(members),'name':name,'members':members,'descriptions':effects}
 m=re.fullmatch(r'All Fellow (Aptitude|Power) \+(\d+)(%?)',effects['Normal Skill'])
 if m and ((m[1]=='Power' and m[3]=='%') or (m[1]=='Aptitude' and not m[3])):r['effect']={'kind':'aptitude' if m[1]=='Aptitude' else 'percent','value':int(m[2])}
 if effects['Normal Skill']=='Each time dating with a Family Member, that member will gain 10% more Blessing Point.':r['effect']={'kind':'datePoints','value':10}
 m=re.fullmatch(r'Employee Earnings of (Inspiring|Diligent|Brave|Informed|Unfettered) Building \+5',effects['Normal Skill'])
 if m:r['effect']={'kind':'employee','type':m[1],'value':5}
 m=re.fullmatch(r'Each time educating (Inspiring|Diligent|Brave|Informed|Unfettered) Type Pupils, gain 10% more Fellow EXP.',effects['Normal Skill'])
 if m:r['effect']={'kind':'educationXP','type':m[1].lower(),'value':10}
 if effects['Normal Skill']=='Fellow EXP +15% each time you educate all Pupils':r['effect']={'kind':'educationXP','type':None,'value':15}
 records.append(r)
assert len(records)==34 and sum('effect' in r for r in records)==22 and len({r['id'] for r in records})==34
(root/'lib/fishing-combination-data.json').write_text(json.dumps({'source':'https://raw.githubusercontent.com/Zik-Ascend/isl-tools/b49c78d0c06d535f6e1c62bdc9d5d666cd96e954/wiki/fishing/index.html','sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'records':records,'limits':'Five normal stat, two dating, five typed employee and ten education EXP effects enabled; activation eligibility/permanence and stacking local. Crown and12 other normal effects deferred.'},indent=2)+'\n');print('34 combinations;22 complete supported effects')
