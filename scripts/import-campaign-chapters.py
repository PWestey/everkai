#!/usr/bin/env python3
"""Import campaign chapters 7-150 (after the six opening chapters) from the original stage tables.

Sources, plainly readable config tables in the private-server workspace:
  BattleNormal.json  normal encounters: atk, gold consume, stageId, item1 (Fellow EXP), item5 (Fame)
  LevelBoss.json     chapter bosses (N-6-0): atk, stageId, reward items
  Chapter.json       each chapter's background id
The tables hold 12,000 chapters (BattleNormal 240,000 rows = 20 x 12,000; LevelBoss and Chapter 12,000
each, no gaps). Everkai ships 7-150; LAST is a scope choice, not a data limit.

Output format 2 (lib/campaign-chapters-data.json) is compact: rows are tuples in stage order and _id,
stageId and the consume/inspire item id ('3', gold) are derived, because they are fully determined by
position (asserted below for every row). lib/opening.mjs decodes it back to the exact row objects
format 1 shipped (same keys, same order), so OPENING_STAGES keeps the shape lib/opening-data.json uses.
Rows for chapters 7-50 are pinned to the sha256 of what format 1 shipped in 167b3e9.

Deliberately NOT imported, with reasons (CLAUDE.md rule 7):
  - stageEventId on normal rows: StageEvent rewards name item ids Everkai has no definition for, and its
    'appoint' events use country/count rules the engine does not model (it only knows the opening's
    Fifi appointment). The id is kept as sourceEventId.
  - Boss weapon drops without an Everkai item definition (Item_Weapon_Equipment_1_2, 2_1, 2_2, 3_1).
    Supported items (Fellow EXP, Fame, recruitment token, Item_Weapon_Equipment_1_1) are kept.
  - Row fields the engine does not read: critical, battleLog, bossAvatar, dialogue, NpcAppearance, icon.
Backgrounds: only four stage backgrounds ship as art; other chapter backgrounds use the nearest shipped
scene (Forest_* -> Field_01, City_02 -> City_01, Level_01/02 and the Maze/Mountain/Mine families ->
Level_03, the wild rocky scene), recorded per chapter as source/shown.
"""
import json,hashlib
from pathlib import Path
D=Path('/Users/westmanfamily/Documents/Codex/2026-09-07/your/outputs/private-server/data')
sha=lambda p:hashlib.sha256(p.read_bytes()).hexdigest()
def table(name):
    x=json.loads((D/name).read_text());return x[next(iter(x))] if isinstance(x,dict) else x
FIRST,LAST=7,150
FIRST_STAGE_ID=127  # chapter 6's boss is stage 126 in lib/opening-data.json
# sha256 of json.dumps({'battles','bosses','backgrounds'}, compact) for chapters 7-50 as format 1 shipped them.
SHIPPED_7_50='4d9d798606140f30efffe11e21c8b33ce9ef5339f7b8bae7fa1dac87a553f111'
DROPPED={'Item_Weapon_Equipment_1_2','Item_Weapon_Equipment_2_1','Item_Weapon_Equipment_2_2','Item_Weapon_Equipment_3_1'}
chapter=lambda r:int(r['_id'].split('-')[0])
opening=json.loads(Path('lib/opening-data.json').read_text())
supported={i['_id'] for i in opening['items']}
all_normals=table('BattleNormal.json');all_bosses=table('LevelBoss.json');all_chapters=table('Chapter.json')
assert max(map(chapter,all_normals))>=LAST and max(map(chapter,all_bosses))>=LAST and max(int(c['_id']) for c in all_chapters)>=LAST,'source tables end before LAST'
normals=sorted((r for r in all_normals if FIRST<=chapter(r)<=LAST),key=lambda r:r['stageId'])
bosses=sorted((r for r in all_bosses if FIRST<=chapter(r)<=LAST),key=lambda r:r['stageId'])
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
assert ids==list(range(FIRST_STAGE_ID,FIRST_STAGE_ID+len(ids))),'stageIds must continue the opening ladder without gaps'
assert all(i['id'] in ('1','5') or i['id'] in supported for b in boss_rows for i in b['items'])
assert dropped==DROPPED,('dropped boss items changed; decide each new one explicitly',sorted(dropped))
ART={'Bg_Village_01':'Bg_Village_01','Bg_Field_01':'Bg_Field_01','Bg_City_01':'Bg_City_01','Bg_Level_03':'Bg_Level_03',
     'Bg_City_02':'Bg_City_01','Bg_Level_01':'Bg_Level_03','Bg_Level_02':'Bg_Level_03','Bg_Forest_01':'Bg_Field_01','Bg_Forest_02':'Bg_Field_01','Bg_Forest_03':'Bg_Field_01',
     'Bg_Maze_01':'Bg_Level_03','Bg_Maze_02':'Bg_Level_03','Bg_Maze_03':'Bg_Level_03','Bg_Maze_04':'Bg_Level_03',
     'Bg_Mountain_01':'Bg_Level_03','Bg_Mountain_02':'Bg_Level_03','Bg_Mine_01':'Bg_Level_03'}
backgrounds={}
for c in sorted(all_chapters,key=lambda c:int(c['_id'])):
    n=int(c['_id'])
    if FIRST<=n<=LAST:backgrounds[str(n)]={'source':c['background'],'shown':ART[c['background']]}
assert list(backgrounds)==[str(n) for n in range(FIRST,LAST+1)]

# Chapters 7-50 must be exactly what format 1 shipped.
old=lambda n:FIRST<=n<=50
subset={'battles':[r for r in battles if old(chapter(r))],'bosses':[r for r in boss_rows if old(chapter(r))],
        'backgrounds':{k:v for k,v in backgrounds.items() if old(int(k))}}
got=hashlib.sha256(json.dumps(subset,separators=(',',':')).encode()).hexdigest()
assert got==SHIPPED_7_50,('chapters 7-50 no longer match what shipped',got)

# Encode (format 2). Every derived value is checked against the source row before it is dropped.
def place(c,i):return f'{c}-{i//4+1}-{i%4+1}',FIRST_STAGE_ID+(c-FIRST)*21+i
item_ids=[]
def item_index(i):
    if i not in item_ids:item_ids.append(i)
    return item_ids.index(i)
enc_battles=[];enc_bosses=[]
for c in range(FIRST,LAST+1):
    rows=battles[(c-FIRST)*20:(c-FIRST+1)*20]
    for i,r in enumerate(rows):
        assert (r['_id'],r['stageId'])==place(c,i),(r['_id'],r['stageId'],place(c,i))
        assert [x['id'] for x in r['consume']]==['3']
        t=[r['timelineNameType'],r['mushRoomType'],r['atk'],r['consume'][0]['count'],r['item1'],r['item5']]
        if 'sourceEventId' in r:t.append(r['sourceEventId'])
        enc_battles.append(t)
    b=boss_rows[c-FIRST]
    assert (b['_id'],b['stageId'])==(f'{c}-6-0',place(c,20)[1])
    assert [x['id'] for x in b['inspireConsumeBase']]==['3']
    enc_bosses.append([b['atk'],b['inspireConsumeBase'][0]['count'],[v for i in b['items'] for v in (item_index(i['id']),i['count'])]])
out={'format':2,'firstChapter':FIRST,'lastChapter':LAST,'firstStageId':FIRST_STAGE_ID,
     'battleColumns':['timelineNameType','mushRoomType','atk','consume:3','item1','item5','sourceEventId?'],
     'bossColumns':['atk','inspireConsumeBase:3','items:[itemIds index,count,...]'],
     'itemIds':item_ids,'battles':enc_battles,'bosses':enc_bosses,
     'backgroundArt':{k:v for k,v in ART.items() if any(b['source']==k for b in backgrounds.values())},
     'backgrounds':[backgrounds[str(n)]['source'] for n in range(FIRST,LAST+1)],
     'provenance':{'BattleNormal.json':sha(D/'BattleNormal.json'),'LevelBoss.json':sha(D/'LevelBoss.json'),'Chapter.json':sha(D/'Chapter.json'),
                   'chapters7to50Sha256':SHIPPED_7_50,'droppedBossItems':sorted(dropped),'eventsDeferred':'sourceEventId only; see script header'}}

# Decode in Python the same way lib/opening.mjs does and require an exact round trip.
def decode(d):
    bt=[];bs=[];bg={}
    for c in range(d['firstChapter'],d['lastChapter']+1):
        k=c-d['firstChapter']
        for i,t in enumerate(d['battles'][k*20:(k+1)*20]):
            _id,sid=place(c,i);r={'_id':_id,'timelineNameType':t[0],'mushRoomType':t[1],'atk':t[2],'consume':[{'id':'3','count':t[3]}],'stageId':sid,'item1':t[4],'item5':t[5]}
            if len(t)>6:r['sourceEventId']=t[6]
            bt.append(r)
        b=d['bosses'][k];bs.append({'_id':f'{c}-6-0','atk':b[0],'inspireConsumeBase':[{'id':'3','count':b[1]}],'stageId':place(c,20)[1],
                                    'items':[{'id':d['itemIds'][b[2][j]],'count':b[2][j+1]} for j in range(0,len(b[2]),2)]})
        src=d['backgrounds'][k];bg[str(c)]={'source':src,'shown':d['backgroundArt'][src]}
    return bt,bs,bg
dump=lambda x:json.dumps(x,separators=(',',':'))
assert dump(decode(json.loads(dump(out))))==dump((battles,boss_rows,backgrounds)),'format 2 does not round-trip'
Path('lib/campaign-chapters-data.json').write_text(dump(out)+'\n')
print('chapters',FIRST,'-',LAST,'battles',len(battles),'bosses',len(boss_rows),'stageIds',ids[0],'-',ids[-1],'dropped',sorted(dropped),
      'bytes',Path('lib/campaign-chapters-data.json').stat().st_size)
