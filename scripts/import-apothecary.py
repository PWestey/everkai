#!/usr/bin/env python3
from pathlib import Path
import json,re,html,hashlib
app=Path(__file__).resolve().parents[1];w=app.parents[1];src=w/'outputs/online-audit/public-reference/wiki/apothecary/index.html';b=src.read_bytes();s=b.decode();cl=lambda x:html.unescape(re.sub('<[^>]+>','',x)).strip();records=[]
for m in re.finditer(r'<li id="apothecary-potion-[^"]+"[^>]*data-id-num="([^"]+)"[^>]*>(.*?)</article>\s*</li>',s,re.S):
 id,body=m.groups();name=cl(re.search('class="fish-antique-name">(.*?)</span>',body)[1]);fields={k:cl(v) for k,v in re.findall('<strong>(Skill|Unlock Condition)</strong><span>(.*?)</span>',body)};gate=re.fullmatch(r'Unlocked after (\d+) stock sold',fields['Unlock Condition']);records.append({'id':id,'name':name,'soldGate':int(gate[1]) if gate else None,'skillText':fields['Skill'],'unlockText':fields['Unlock Condition']})
assert len(records)==20 and sum(r['soldGate'] is not None for r in records)==10
rp=w/'outputs/component-research/datasets/Rule.json';rules=[r for r in json.loads(rp.read_text()) if r['id'].startswith('Rule:text:Medicine_')];assert len(rules)==9
(app/'lib/apothecary-data.json').write_text(json.dumps({'provenance':{'snapshot':'b49c78d0c06d535f6e1c62bdc9d5d666cd96e954','sha256':hashlib.sha256(b).hexdigest(),'ruleSha256':hashlib.sha256(rp.read_bytes()).hexdigest(),'type':'community counts + local rule text; not version-matched formulas'},'records':records,'rules':rules},indent=2)+'\n')
