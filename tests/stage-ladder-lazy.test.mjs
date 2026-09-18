import test from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import main from '../lib/campaign-chapters-data.json' with {type:'json'};
import {STAGES,OPENING_STAGES,CAMPAIGN,STAGE_COUNT,OPENING_COUNT,LAST_CHAPTER,lateChaptersLoaded} from '../lib/stage-ladder.mjs';

// Chapters 3,001-6,000 are a lazily loaded chunk in the browser (lib/stage-ladder.mjs): in headless Chrome
// with iPhone emulation the startup heap after GC was 38.9 MB with 3,000 chapters bundled and 70.1 MB with
// 6,000. Under Node they install synchronously at import, so this process sees the whole ladder; the lazy
// path is exercised in a child process with EVERKAI_LAZY_CHAPTERS=1, which is exactly what a browser boot
// sees before the chunk arrives.
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const whole=()=>({stages:digest(STAGES),opening:digest(OPENING_STAGES),campaign:digest({b:CAMPAIGN.battles,s:CAMPAIGN.bosses,g:CAMPAIGN.backgrounds,l:CAMPAIGN.lastChapter})});
const UNSPLIT={stages:'14b43272c2d10e45af751ce54c62d12f48da7b764d8fbcfa4a093aece160e3d8',
 opening:'c08b497443d7ad9818a74f5dbee3ccf7837ac7b013fc48a81d2bc661fe3b6703',campaign:'5303774ff1c95d7c32e0e198364fe837fbbc6e3becf8de98ef02ed4e96b996e0'};
function lazy(script){
 const out=execFileSync(process.execPath,['--input-type=module','-e',script],{cwd:new URL('..',import.meta.url),env:{...process.env,EVERKAI_LAZY_CHAPTERS:'1'},encoding:'utf8'});
 return JSON.parse(out.trim().split('\n').at(-1));
}
const LAZY_PROBE=`
import {createHash} from 'node:crypto';
const L=await import('./lib/stage-ladder.mjs'),A=await import('./lib/adventure.mjs'),O=await import('./lib/opening.mjs'),G=await import('./lib/game.mjs');
const digest=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
const base=G.fresh(0);
const at=(cleared)=>({...base,adventure:{...base.adventure,cleared}});
const opened=G.act(G.fresh(0),'openingStart',0).state;
const openAt=c=>({...opened,opening:{...opened.opening,cleared:c}});
const before={loaded:L.lateChaptersLoaded(),stages:L.STAGES.length,opening:L.OPENING_STAGES.length,campaignLast:L.CAMPAIGN.lastChapter,
 count:[L.STAGE_COUNT,L.OPENING_COUNT,L.LAST_CHAPTER],pending:[L.stagePending(18000),L.stagePending(18001),L.stagePending(36000),L.stagePending(36001)],
 stageAt18001:L.stageAt(18001)===undefined,openingPending:[L.openingPending(62999),L.openingPending(63000),L.openingPending(126000)],
 validTop:[A.validAdventure(at(36000)),A.validAdventure(at(36001)),O.validOpening(openAt(126000)),O.validOpening(openAt(126001))],
 chapter:[O.openingChapter(openAt(62999)),O.openingChapter(openAt(63000)),O.openingChapter(openAt(126000))],
 battle:G.act(at(18000),'battle',base.lastAt,18001).error||null,
 openingBattle:G.act(openAt(63000),'openingBattle',base.lastAt,'3001-1-1').error||null,
 wanted:[L.lateChaptersWanted(at((2901-1)*6-1)),L.lateChaptersWanted(at((2901-1)*6)),L.lateChaptersWanted(openAt((2901-1)*21-1)),L.lateChaptersWanted(openAt((2901-1)*21))]};
const {readFileSync}=await import('node:fs');const lateFile=JSON.parse(readFileSync('./lib/campaign-chapters-late-data.json','utf8'));
let wrong=null;try{L.installLateChapters({...lateFile,firstChapter:3002})}catch(e){wrong=e.message}
await L.loadLateChapters();await L.loadLateChapters();
const after={loaded:L.lateChaptersLoaded(),stages:L.STAGES.length,opening:L.OPENING_STAGES.length,again:L.installLateChapters({}),wanted:L.lateChaptersWanted(at(35000)),
 digests:{stages:digest(L.STAGES),opening:digest(L.OPENING_STAGES),campaign:digest({b:L.CAMPAIGN.battles,s:L.CAMPAIGN.bosses,g:L.CAMPAIGN.backgrounds,l:L.CAMPAIGN.lastChapter})},
 battle:G.act(at(18000),'battle',base.lastAt,18001).error||null};
console.log(JSON.stringify({before,wrong,after}));`;

test('Node installs the late chapters at import, so tests and the pacing sim see the whole ladder synchronously',()=>{
 assert.equal(lateChaptersLoaded(),true);
 assert.deepEqual([STAGES.length,OPENING_STAGES.length,CAMPAIGN.lastChapter],[36000,126000,6000]);
 assert.deepEqual([STAGE_COUNT,OPENING_COUNT,LAST_CHAPTER],[36000,126000,6000]);
});

test('before the late chunk arrives: validators accept the whole ladder, and battles say "loading", not "cleared"',()=>{
 const r=lazy(LAZY_PROBE),b=r.before;
 assert.equal(b.loaded,false,'positive control: the child really is on the lazy path');
 assert.deepEqual([b.stages,b.opening,b.campaignLast],[18000,63000,3000]);
 assert.deepEqual(b.count,[36000,126000,6000],'the ladder size comes from the index, not the loaded rows');
 assert.deepEqual(b.pending,[false,true,true,false]);assert.equal(b.stageAt18001,true);
 assert.deepEqual(b.openingPending,[false,true,false]);
 assert.deepEqual(b.validTop,[true,false,true,false],'a save at stage 36,000 / encounter 126,000 loads before the rows do; one past is refused');
 assert.deepEqual(b.chapter,[3000,3001,6000],'the chapter follows from the count alone');
 assert.match(b.battle,/still loading/);assert.match(b.openingBattle,/still loading/);
 assert.deepEqual(b.wanted,[false,true,false,true],'fetched from chapter 2,901 (100 before the split) in either ladder');
 assert.match(r.wrong,/does not continue the stage ladder/,'a chunk that does not continue the ladder is refused');
});

test('after loading, the ladder is exactly the eagerly installed one, and loading is idempotent',()=>{
 const a=lazy(LAZY_PROBE).after;
 assert.deepEqual([a.loaded,a.stages,a.opening,a.again,a.wanted],[true,36000,126000,false,false]);
 assert.deepEqual(a.digests,whole(),'lazy install == eager install, row for row');
 // ...and both equal what the unsplit 6,000-chapter build (ea84349, one static import) decoded, computed from
 // that commit's lib: the split changed where rows live, not one row.
 assert.deepEqual(a.digests,UNSPLIT);
 assert.ok(!/still loading/.test(a.battle||''),'the next stage is now a real stage');
});

test('the main file carries only chapters 7-3000 plus an index that pins the late file',()=>{
 assert.deepEqual([main.firstChapter,main.lastChapter,main.battles.length,main.bosses.length],[7,3000,2994*20,2994]);
 const bytes=readFileSync(new URL('../lib/'+main.late.file,import.meta.url));
 assert.equal(createHash('sha256').update(bytes).digest('hex'),main.late.sha256,'the late file is the one the importer wrote');
 const late=JSON.parse(bytes);
 assert.deepEqual([late.firstChapter,late.lastChapter,late.firstStageId,late.battles.length,late.bosses.length],
  [main.late.firstChapter,main.late.lastChapter,main.late.firstStageId,main.late.battles,main.late.bosses]);
 assert.equal(main.late.firstStageId,main.firstStageId+(main.lastChapter-main.firstChapter+1)*21,'the late file starts on the next stage id');
});

test('nothing imports the late file statically, which would put it back in the precached main chunk',()=>{
 const src=f=>readFileSync(new URL('../'+f,import.meta.url),'utf8');
 const ladder=src('lib/stage-ladder.mjs');
 assert.ok(ladder.includes("import('./campaign-chapters-late-data.json')"),'positive control: the lazy import is there to find');
 const staticImport=/^\s*import\s[^;]*campaign-chapters-late-data\.json/m;
 for(const f of ['lib/stage-ladder.mjs','lib/opening.mjs','lib/adventure.mjs','lib/game.mjs','app/page.tsx','app/stage-screen.tsx','app/adventure-panel.tsx','app/opening-panel.tsx'])
  assert.ok(!staticImport.test(src(f)),f+' imports the late chapters statically');
});
