#!/usr/bin/env python3
"""Normalize reviewed dialogue edges; never infer order from numeric suffixes."""
import json,hashlib
from pathlib import Path
p=Path('/Users/westmanfamily/Documents/Codex/2026-09-08/isekai-source-research/outputs/opening-presentation.json')
assert hashlib.sha256(p.read_bytes()).hexdigest()=='cfcdc6423c2b8d07ac8e021aed001d955391a517c265d9ac7924f650cbe773f8'
x=json.loads(p.read_text());nodes={n['id']:n for n in x['dialogueNodes']};identities={i['reference']:i for i in x['speakerIdentities']};earned={e['event']:e for e in x['earnedEncounterIdentities']};chapters={c['id']:c['labels']['desc'].strip() for c in x['chapters']};dest={d['id']:d['name'] for d in x['destinations']};out=[];links={}
for s in x['scenes']:
 lines=[];seen=set();at=s['root']
 while at in s['nodes']:
  assert at not in seen,'loop';seen.add(at);n=nodes[at];e=n['edges'];options=[(k,e[k]) for k in e if k=='nextDialog' or k.startswith('choice') and k.endswith('nextDialog')];assert len(options)<=1,('multiple branches need a renderer',at)
  speaker=n['localizedFields'].get('overrideName');ref=n['speakerRef'];pos={'mid':'middleCharId','left':'leftCharId','right':'rightCharId'}.get(ref.get('position'));person=identities.get(ref.get(pos)) if pos else None
  art=None
  if speaker=='empty':speaker=None
  elif speaker:
   if person and speaker==person['name']:art=person['localArt']
  elif person:speaker=person['name'];art=person['localArt']
  choice=n['localizedFields'].get('choice1text') if options and options[0][0]=='choice1nextDialog' else None
  lines.append({'number':len(lines)+1,'nodeId':at,'text':n['text'],'sourceKey':n['textKey'],'speaker':speaker,'speakerArt':art,'choiceLabel':choice,'nextNode':options[0][1] if options else None,'speakerRef':ref,'presentation':n['presentation']})
  at=options[0][1] if options else None
 assert seen==set(s['nodes']),(s['root'],'unvisited included nodes')
 assert at is None or not s['completeReachableGraph'] and at in s['omittedNext'],('unexpected cutoff',at)
 id='CityEventH03' if s['owner']=='B5' else 'opening:'+s['root'];links[s['owner']]=id
 if s['owner']=='B5':continue
 isCharacter=s['owner'] in earned;isChapter=s['owner'][0].isdigit();boss=isChapter and '-6-0' in s['owner'];character=earned[s['owner']]['catalogId'] if isCharacter else ''
 title=earned[s['owner']]['name']+'’s arrival' if isCharacter else ('Chapter '+s['owner'][0]+': '+chapters[s['owner'][0]]+(' — victory line' if boss else ' — opening excerpt') if isChapter else dest[s['owner']]+' — opening excerpt')
 out.append({'id':id,'characterId':character,'title':title,'category':'arrival' if isCharacter else 'chapter' if isChapter else 'village','lines':lines,'excerpt':not s['completeReachableGraph'],'root':s['root'],'owner':s['owner'],'omittedNext':s.get('omittedNext',[]),'sourceField':s['field'],'speakerPolicy':'explicit current node only; no inherited NPC identity'})
assert len(out)==19 and sum(len(s['lines']) for s in out)==114
result={'scenes':out,'links':links,'chapters':chapters,'taskTemplates':x['taskTemplates'],'provenance':{'packetSha256':hashlib.sha256(p.read_bytes()).hexdigest(),'reusedScene':'CityEventH03','newScenes':19,'newLines':114,'noEconomy':True}}
Path('lib/opening-presentation-data.json').write_text(json.dumps(result,separators=(',',':'),ensure_ascii=False)+'\n')
