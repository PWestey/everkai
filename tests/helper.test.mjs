import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {HELPER_TASKS,HELPER_RUN_CAP,helperState,validHelper} from '../lib/helper.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),a);return r.state};
const armed=()=>{let s={...fresh(T),habits:starterHabits(T)};return run(s,'habitComplete',s.habits.items.find(x=>x.freq==='daily').id)};

test('the helper is armed by a daily habit, the same gate the bait refill uses',()=>{
 const cold={...fresh(T),habits:starterHabits(T)};
 assert.match(act(cold,'helperRun',cold.lastAt).error,/Complete a daily habit/);
 const s=armed();
 const r=act(s,'helperRun',s.lastAt);
 assert.equal(r.error,undefined);
 assert.match(r.message,/Little Helper did \d+ chore/);
 assert.ok(valid(r.state));
 assert.deepEqual(decode(JSON.stringify(r.state)),r.state,'a save with a helper record round-trips');});

// THE SAFETY PROPERTY. The helper has no reward table: it replays the player's own actions through
// act(). So a helper run must be indistinguishable from tapping those same buttons in that order --
// if it ever diverges, the helper has grown a faucet of its own, which is the defect BUG-40 records
// for the two EXP faucets. This is the whole argument for QOL-01 being safe, so it is pinned.
test('a helper run equals tapping the same buttons by hand, exactly',()=>{
 const start=armed();
 const auto=run(start,'helperRun');
 let manual=start;
 for(const t of HELPER_TASKS){const r=act(manual,t.action,manual.lastAt,null,null);if(!r.error&&r.state)manual=r.state;}
 // Positive control: the run actually did something, so this is not two empty states agreeing.
 assert.notDeepEqual({...auto,helper:null},{...start,helper:null},'the helper changed the save');
 assert.ok(auto.gold>start.gold,`gold moved: ${start.gold} -> ${auto.gold}`);
 assert.deepEqual({...auto,helper:null},{...manual,helper:null},'helper state is the only difference');});

test('the helper cannot claim a daily twice; the gates it replays still refuse it',()=>{
 const start=armed();
 const once=run(start,'helperRun');
 // Positive control: the first run DID claim the day-gated tasks, so a silent no-op cannot pass this.
 assert.notEqual(once.museumDay,start.museumDay,'the museum day-gate was stamped by the first run');
 const twice=act(once,'helperRun',once.lastAt);
 assert.match(twice.error,/Nothing was waiting/,'a second run the same day finds every gate closed');
 // And a hand-tap is refused the same way, which is the point: the helper has no privileged path.
 assert.ok(act(once,'claimMuseum',once.lastAt).error,'the manual button is refused too');});

test('each task is individually switchable, like the original`s isSelect flag',()=>{
 let s=armed();
 for(const t of HELPER_TASKS)s=run(s,'helperToggle',t.id,false);
 assert.match(act(s,'helperRun',s.lastAt).error,/switched off/);
 s=run(s,'helperToggle','museum',true);
 const r=run(s,'helperRun');
 assert.notEqual(r.museumDay,s.museumDay,'the one task left on ran');
 assert.equal(r.gold,s.gold,'and the task that was off did not');
 assert.match(act(s,'helperToggle',s.lastAt,'nosuchtask',true).error,/Unknown helper task/);
 assert.match(act(s,'helperToggle',s.lastAt,'museum','yes').error,/on or off/);});

test('the task list mirrors the original`s collection-only Trusteeship set',()=>{
 // Trusteeship.json ships 40 rows; every executor in hosted_mapping.json collects or claims, and
 // none of them spends. If a task that SPENDS is ever added here, that design line has been crossed.
 const SPENDS=/^(buy|train|upgrade|forge|recruit|welcome|hire|open|build|educate|enroll|expand|sow|summon|stella|bless)/;
 for(const t of HELPER_TASKS)assert.ok(!SPENDS.test(t.action),`${t.id} runs ${t.action}, which spends`);
 assert.equal(new Set(HELPER_TASKS.map(t=>t.id)).size,HELPER_TASKS.length,'ids are unique');
 assert.equal(HELPER_RUN_CAP,50,'zxSystemConstant.TrusteeshipOutMaxCount');
 assert.ok(HELPER_TASKS.length<=HELPER_RUN_CAP);
 // Positive control on the regex: it really does catch a spending action name.
 assert.ok(SPENDS.test('buySupply'));});

test('validHelper refuses a tampered helper record',()=>{
 const s=armed();
 assert.equal(validHelper(s),true);
 assert.equal(validHelper({helper:undefined}),true,'an old save without the record is fine');
 for(const bad of [null,[],'x',{},{tasks:[]},{tasks:{museum:2},ranAt:0},{tasks:{nosuch:1},ranAt:0},{tasks:{museum:1},ranAt:-1},{tasks:{museum:1},ranAt:1.5}])
  assert.equal(validHelper({helper:bad}),false,JSON.stringify(bad));
 // Positive control: the shape this guard is meant to ACCEPT still passes, so it is not refusing all.
 assert.equal(validHelper({helper:{tasks:{museum:1,bait:0},ranAt:0}}),true);
 assert.equal(valid({...s,helper:{tasks:{museum:2},ranAt:0}}),false,'and valid() composes it');});

test('an old save without a helper record loads, and gains one only when used',()=>{
 const old=fresh(T);
 assert.equal(old.helper,undefined,'fresh saves do not carry the record');
 assert.ok(valid(old));
 assert.deepEqual(decode(JSON.stringify(old)),old,'no key is added on load');
 assert.deepEqual(helperState(old).tasks,Object.fromEntries(HELPER_TASKS.map(t=>[t.id,1])),'defaults are all on, like isSelect on 36 of 40 original rows');});
