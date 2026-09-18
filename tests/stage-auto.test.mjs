import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {OPENING,OPENING_STAGES,LAST_CHAPTER,openingPower,openingQuote,openingAutoGate,openingChapter,eventLimit,
        AUTO_CHAPTER,AUTO_RANK,AUTO_SPEED_S,ONEKEY_CHAPTER,ONEKEY_VIP,EVENT_ONEKEY_CHAPTER,EVENT_ONEKEY_RANK,EVENT_LIMIT} from '../lib/opening.mjs';

// ---------------------------------------------------------------------------------------------
// D1. The parity catalogue carried "THE CAMPAIGN SPINE ENDS AT CHAPTER 6 (nextDeferredTask
// Main_task_001490 at order 157)" alongside a later line recording a 63,000-stage import. Both
// cannot be true. These assertions pin what the measurement found, so the stale half cannot return:
// the STAGE ladder runs chapters 1-6000 (1-3000 until the 2026-09-18 extension), and what actually stops short is the QUEST chain, which is
// a different spine and is not blocked by missing data.
// ---------------------------------------------------------------------------------------------
test('D1: the stage ladder is the imported 6,000 chapters; the quest chain is what stops at 136',()=>{
 assert.equal(LAST_CHAPTER,6000);
 assert.equal(OPENING_STAGES.length,126000,'126,000 stages, not a six-chapter prefix');
 assert.equal(OPENING_STAGES.at(-1)._id,'6000-6-0');
 // The quest chain is the OTHER spine. 136 imported tasks, ending on a StageClear of the chapter-6
 // boss, with nextTask Main_task_001490 -- the row that the stale note read as a hard stop.
 assert.equal(OPENING.tasks.length,136);
 const last=OPENING.tasks.at(-1);
 assert.equal(last._id,'Main_task_001480');
 assert.equal(last.order,156);
 assert.deepEqual(last.taskReq,{type:'StageClear',id:'6-6-0'});
 assert.equal(last.nextTask,'Main_task_001490');
 // Main_task_001490 is `EquipCount count 2` in the original's TaskGeneral.json, and EquipCount is a
 // requirement openingRequirement ALREADY evaluates. So the chain was never blocked on unknown data;
 // it simply was not imported past 136. Anything that reads this as "blocked" is reading it wrong.
 const src=readFileSync(new URL('../lib/opening.mjs',import.meta.url),'utf8');
 assert.match(src,/case 'EquipCount':/,'EquipCount is an implemented requirement type');
});

test('D1 negative control: a truncated stage ladder fails the pin',()=>{
 const truncated=OPENING_STAGES.slice(0,126);
 assert.equal(truncated.at(-1)._id,'6-6-0','126 stages really is the six-chapter prefix');
 assert.notEqual(truncated.length,126000,'the pin above would fail on a six-chapter ladder');
});

// ---------------------------------------------------------------------------------------------
// D2. Every constant is from configs/config/logic/System.json. The catalogue row said Auto Handle
// unlocks "at chapter 50 or with a monthly pass"; the table keeps three separate gates and chapter 50
// belongs to the ROADSIDE-EVENT one-key, not to Full-Auto.
// ---------------------------------------------------------------------------------------------
test('D2: the three auto gates are the original\'s own, and they are distinct',()=>{
 assert.deepEqual([AUTO_CHAPTER,AUTO_RANK],[2,4],'StageBattleAutoLimitChapter / ...PlayerLevel');
 assert.equal(AUTO_SPEED_S,1.7,'StageBattleAutoSpeed');
 assert.deepEqual([ONEKEY_CHAPTER,ONEKEY_VIP],[20,5],'StageBattleOneKeyLimitChapter / ...VIP');
 assert.deepEqual([EVENT_ONEKEY_CHAPTER,EVENT_ONEKEY_RANK],[50,30],'StageBattleEventOneKey... -- chapter 50 is THIS gate');
 assert.notEqual(AUTO_CHAPTER,EVENT_ONEKEY_CHAPTER,'conflating these two is the error the row carried');
 // StageBattleEventLimit: 25 queued roadside encounters, 100 from player level 35.
 assert.deepEqual(EVENT_LIMIT,[{rank:1,count:25},{rank:35,count:100}]);
 assert.deepEqual([eventLimit(1),eventLimit(34),eventLimit(35),eventLimit(99)],[25,25,100,100]);
});

const started=()=>{const s=act(fresh(0),'openingStart',0).state;s.fellows.hero_15.aptitude=1000;s.gold=1e12;return s};

test('D2: Full-Auto is gated by chapter 2 and rank 4, and refuses before both',()=>{
 const s=started();
 assert.equal(openingChapter(s),1);
 assert.equal(openingAutoGate(s),'Full-Auto opens in chapter 2.');
 assert.ok(act(s,'openingAuto',0).error,'refused inside chapter 1');
 // Past the chapter gate but still rank 1.
 const inCh2={...s,opening:{...s.opening,cleared:21}};
 assert.equal(openingChapter(inCh2),2);
 assert.equal(openingAutoGate(inCh2),'Full-Auto opens at rank 4.');
 assert.ok(act(inCh2,'openingAuto',0).error);
 // Both satisfied.
 const armed={...s,opening:{...s.opening,cleared:21,rank:4}};
 assert.equal(openingAutoGate(armed),'');
 const r=act(armed,'openingAuto',0);
 assert.ok(!r.error,r.error);
 assert.ok(r.ran>0);
});

test('D2: Full-Auto clears at most one event-queue length and pays exactly what taps pay',()=>{
 const armed=(()=>{const s=started();return {...s,opening:{...s.opening,cleared:21,rank:4}}})();
 const auto=act(armed,'openingAuto',0);
 assert.ok(!auto.error,auto.error);
 assert.ok(auto.ran<=eventLimit(4),`ran ${auto.ran} within the ${eventLimit(4)} queue length`);
 // Replay the same run one tap at a time and require an identical state. This is the whole safety
 // argument: Full-Auto cannot be a faucet because it is the same stageStep.
 let tapped=armed;
 for(let i=0;i<auto.ran;i++){
  const st=OPENING_STAGES[tapped.opening.cleared];
  const r=act(tapped,'openingBattle',0,st._id);
  assert.ok(!r.error,r.error);tapped=r.state;
 }
 assert.equal(tapped.gold,auto.state.gold,'same gold spent');
 assert.equal(tapped.fellowXP,auto.state.fellowXP,'same Fellow EXP earned');
 assert.equal(tapped.opening.cleared,auto.state.opening.cleared,'same stages cleared');
 assert.deepEqual(tapped.opening.events,auto.state.opening.events,'same roadside queue');
 assert.ok(valid(auto.state));
 assert.deepEqual(decode(JSON.stringify(auto.state)),auto.state,'survives a save round-trip');
});

test('D2: Full-Auto stops on empty pockets rather than half-paying a stage',()=>{
 const s=started();
 const st=OPENING_STAGES[21];
 const cost=openingQuote(st,openingPower(s));
 assert.ok(cost>1,'positive control: the next stage really does cost gold');
 // Exactly one stage of funding.
 const armed={...s,gold:cost,opening:{...s.opening,cleared:21,rank:4}};
 const r=act(armed,'openingAuto',0);
 assert.ok(!r.error,r.error);
 assert.equal(r.ran,1,'one stage affordable, one stage cleared');
 assert.equal(r.state.opening.cleared,22);
 assert.match(r.stop,/Not enough Gold/,'stopped for the stated reason');
 assert.ok(valid(r.state));
 // With no gold at all it clears nothing and returns an error instead of a zero-stage success.
 const broke={...armed,gold:0};
 const none=act(broke,'openingAuto',0);
 assert.ok(none.error,'a run that can clear nothing is an error, not a silent no-op');
 assert.deepEqual(none.state,broke,'and it leaves the save untouched');
});

test('D2: Full-Auto refuses on an unstarted journey',()=>{
 assert.equal(openingAutoGate(fresh(0)),'Begin the opening journey first.');
 assert.ok(act(fresh(0),'openingAuto',0).error);
});

// This started life as a test that filled the queue and asserted the stop. It PASSED with the stop
// deleted, because the fill could never reach the cap -- a silently skipped assertion. The reason is
// worth recording rather than hiding: Everkai defines 12 roadside events against a 25-deep queue, so
// the StageBattleEventLimit stop is sourced but DORMANT. It becomes reachable only when the 11,988
// deferred sourceEventIds (5,988 in chapters 7-3000, 6,000 in 3001-6000) are imported (D1). Asserting the arithmetic keeps the dormancy measured.
test('D2: the roadside-queue stop is sourced but unreachable until events are imported',()=>{
 const definable=OPENING.stageEvents.length;
 assert.equal(definable,12,'positive control: the 12 opening roadside events really are defined');
 assert.equal(OPENING_STAGES.filter(x=>x.stageEventId).length,definable,'and only those stages queue one');
 assert.equal(OPENING_STAGES.filter(x=>x.sourceEventId).length,11988,'11,988 more are named but not defined');
 assert.ok(definable<eventLimit(1),`${definable} definable events cannot fill a ${eventLimit(1)}-deep queue`);
});
