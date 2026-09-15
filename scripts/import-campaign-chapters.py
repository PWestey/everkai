#!/usr/bin/env python3
"""Import campaign chapters 7-50 (after the six opening chapters) from the original stage tables.

Sources, plainly readable config tables in the private-server workspace:
  BattleNormal.json  normal encounters: atk, gold consume, stageId, item1 (Fellow EXP), item5 (Fame)
  LevelBoss.json     chapter bosses (N-6-0): atk, stageId, reward items
  Chapter.json       each chapter's background id
Rows keep the exact shape lib/opening-data.json already uses, so OPENING_STAGES simply grows.

Deliberately NOT imported, with reasons (CLAUDE.md rule 7):
  - stageEventId on normal rows: 88 references to 60 StageEvent rows whose rewards name ~40 item ids
    Everkai has no definition for, and whose 'appoint' events use country/count rules the engine does
    not model (it only knows the opening's Fifi appointment). The id is kept as sourceEventId.
  - Boss weapon drops without an Everkai item definition (Item_Weapon_Equipment_1_2, 2_1, 2_2, 3_1).
    Supported items (Fellow EXP, Fame, recruitment token, Item_Weapon_Equipment_1_1) are kept.
Backgrounds: only four stage backgrounds ship as art; other chapter backgrounds use the nearest family
(Forest_* -> Field_01, City_02 -> City_01, Level_01/02 -> Level_03), recorded per chapter.
"""
import json,hashlib
from pathlib import Path
D=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def table(name):
    x=json.loads((D/name).read_text());return x[next(iter(x))] if isinstance(x,dict) else x
FIRST,LAST=7,50
chapter=lambda r:int(r['_id'].split('-')[0])
opening=json.loads(Path('lib/opening-data.json').read_text())
supported={i['_id'] for i in opening['items']}
normals=[r for r in table('BattleNormal.json') if FIRST<=chapter(r)<=LAST]
bosses=[r for r in table('LevelBoss.json') if FIRST<=chapter(r)<=LAST]
battles=[];dropped=set()
for r in normals:
    row={k:r[k] for k in ('_id','timelineNameType','mushRoomType','atk','consume','stageId','item1','item5')}
    if r.get('stageEventId'):row['sourceEventId']=r['stageEventId']
    battles.append(row)
boss_rows=[]
for r in bosses:
    items=[i for i in r['items'] if i['id'] in supported];dropped|={i['id'] for i in r['items'] if i['id'] not in supported}
    boss_rows.append({'_id':r['_id'],'atk':r['atk'],'inspireConsumeBase':r['inspireConsumeBase'],'stageId':r['stageId'],'items':items})
assert len(battles)==(LAST-FIRST+1)*20 and len(boss_rows)==LAST-FIRST+1,(len(battles),len(boss_rows))
ids=sorted(r['stageId'] for r in battles+boss_rows)
assert ids==list(range(127,127+len(ids))),'stageIds must continue the opening ladder without gaps'
assert all(i['id'] in ('1','5') or i['id'] in supported for b in boss_rows for i in b['items'])
ART={'Bg_Village_01':'Bg_Village_01','Bg_Field_01':'Bg_Field_01','Bg_City_01':'Bg_City_01','Bg_Level_03':'Bg_Level_03',
     'Bg_City_02':'Bg_City_01','Bg_Level_01':'Bg_Level_03','Bg_Level_02':'Bg_Level_03','Bg_Forest_01':'Bg_Field_01','Bg_Forest_02':'Bg_Field_01','Bg_Forest_03':'Bg_Field_01'}
backgrounds={}
for c in table('Chapter.json'):
    n=int(c['_id'])
    if FIRST<=n<=LAST:backgrounds[str(n)]={'source':c['background'],'shown':ART[c['background']]}
out={'firstChapter':FIRST,'lastChapter':LAST,'battles':battles,'bosses':boss_rows,'backgrounds':backgrounds,
     'provenance':{'BattleNormal.json':sha(D/'BattleNormal.json'),'LevelBoss.json':sha(D/'LevelBoss.json'),'Chapter.json':sha(D/'Chapter.json'),
                   'droppedBossItems':sorted(dropped),'eventsDeferred':'sourceEventId only; see script header'}}
Path('lib/campaign-chapters-data.json').write_text(json.dumps(out,separators=(',',':'))+'\n')
print('battles',len(battles),'bosses',len(boss_rows),'dropped',sorted(dropped),'bytes',Path('lib/campaign-chapters-data.json').stat().st_size)
