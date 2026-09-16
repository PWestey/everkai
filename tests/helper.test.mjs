import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {HELPER_TASKS,HELPER_RUN_CAP,CHORE_STEP_CAP,helperState,validHelper,helperAction,helperEnabled,bestPlant,bestGround} from '../lib/helper.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),a);return r.state};
const armed=()=>{let s={...fresh(T),habits:starterHabits(T)};return run(s,'habitComplete',s.habits.items.find(x=>x.freq==='daily').id)};
// A save with the minigames actually open, so the chores have something to do.
const stocked=()=>{let s=armed();const f=act(s,'openFarm',s.lastAt);if(!f.error)s=f.state;return s};

test('the helper is armed by a daily habit, the same gate the bait refill uses',()=>{
 const cold={...fresh(T),habits:starterHabits(T)};
 assert.match(act(cold,'helperRun',cold.lastAt).error,/Complete a daily habit/);
 const s=armed();
 const r=act(s,'helperRun',s.lastAt);
 assert.equal(r.error,undefined);
 assert.match(r.message,/Little Helper did \d+ chore/);
 assert.ok(valid(r.state));
 assert.deepEqual(decode(JSON.stringify(r.state)),r.state,'a save with a helper record round-trips');});

// THE SAFETY PROPERTY, restated now that the helper also PLAYS the minigames.
// It no longer makes sense to compare a run against a fixed list of single taps -- a chore loops, and
// how many times it loops depends on the save. What must stay true is stronger and easier to check:
// every bit of state the helper reaches, it reaches through act(), and it never spends the player's
// money. helperAction takes `act` as a parameter, so a test can hand it a spy and see exactly which
// actions a run dispatched. That is not vacuous the way a regex over task names would be, because a
// chore has no action name to inspect.
const SPENDING=/^(buy|forge|recruit|welcome|hire|open|build|educate|enroll|expand|summon|stella|bless|upgrade|train|limitBreak|equip|assign|adopt|bind)/;
function spyRun(s){
 const seen=[];
 const spy=(state,action,now,target,value)=>{seen.push(action);return act(state,action,now,target,value)};
 const r=helperAction(s,'helperRun',s.lastAt,null,null,spy);
 return {result:r,seen};
}
test('a helper run reaches state only through act(), and never spends gold or crystals',()=>{
 const s=stocked();
 const {result,seen}=spyRun(s);
 assert.equal(result.error,undefined,result.error);
 // Positive control: the run really did dispatch a variety of actions, so the assertions below bite.
 assert.ok(seen.length>=5,`only ${seen.length} actions dispatched`);
 assert.ok(new Set(seen).size>=3,`only ${new Set(seen).size} distinct actions`);
 for(const a of new Set(seen))assert.ok(!SPENDING.test(a),`the helper dispatched ${a}, which spends`);
 assert.ok(result.state.gold>=s.gold,`gold fell ${s.gold} -> ${result.state.gold}`);
 assert.ok(result.state.crystals>=s.crystals,`crystals fell ${s.crystals} -> ${result.state.crystals}`);
 assert.ok(valid(result.state));
 // Positive control on the regex itself.
 assert.ok(SPENDING.test('buySupply')&&SPENDING.test('upgradeInnStation'));});

test('a chore cannot reach past a gate that refuses the player',()=>{
 // Run twice in the same moment. Everything the first run could do, it did; the second must find the
 // same gates closed, because a chore has no privileged path -- it taps what the player taps.
 const s=stocked();
 const first=helperAction(s,'helperRun',s.lastAt,null,null,act);
 assert.equal(first.error,undefined);
 const second=helperAction(first.state,'helperRun',first.state.lastAt,null,null,act);
 if(!second.error){
  // A second run may still do something only where the underlying action is legitimately repeatable
  // at one timestamp; it must not have re-run the day-gated ones.
  assert.equal(second.state.museumDay,first.state.museumDay,'the museum day-gate was not re-claimed');
 }
 assert.ok(valid(first.state));});

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

test('the task list follows the original`s Trusteeship set, chores included',()=>{
 // Trusteeship.json ships 40 tasks. The executors COLLECT (museumInfo, simgameCollect) and also PLAY
 // the repetitive loop (harvestOneKey _10, simgameOneWelcome _31, sg3OrderCommitOneKey _28). Everkai
 // does both. What none of them does is buy something, which is what SPENDING pins above.
 assert.equal(new Set(HELPER_TASKS.map(t=>t.id)).size,HELPER_TASKS.length,'ids are unique');
 assert.equal(HELPER_RUN_CAP,50,'zxSystemConstant.TrusteeshipOutMaxCount');
 for(const t of HELPER_TASKS){
  assert.ok(t.action||t.run,`${t.id} does nothing`);
  assert.ok(!(t.action&&t.run),`${t.id} is both a single action and a chore`);
  assert.ok(t.label&&t.note,`${t.id} is missing a label or its provenance note`);
 }
 assert.ok(CHORE_STEP_CAP<=HELPER_RUN_CAP);});

test('a chore honours the per-run cap, rather than running until a resource is gone',()=>{
 // Asserting CHORE_STEP_CAP <= HELPER_RUN_CAP only checks a constant; it passes happily while the loop
 // ignores it. This counts what a run actually dispatched, with bait stocked far past the cap.
 let s=stocked();
 s=run(s,'baitRefill');
 s={...s,fishing:{...s.fishing,bait:1000}};
 const {result,seen}=spyRun(s);
 assert.equal(result.error,undefined,result.error);
 const casts=seen.filter(a=>a==='castFish').length;
 assert.ok(casts>0,'the fishing chore ran at all');
 assert.ok(casts<=CHORE_STEP_CAP,`cast ${casts} times, past the cap of ${CHORE_STEP_CAP}`);
 // Positive control: with that much bait it WOULD have gone further unbounded, so the cap is what stopped it.
 assert.ok(result.state.fishing.bait>CHORE_STEP_CAP,'bait was left over, so the cap stopped the loop, not the bait');});

test('validHelper refuses a tampered helper record',()=>{
 const s=armed();
 assert.equal(validHelper(s),true);
 assert.equal(validHelper({helper:undefined}),true,'an old save without the record is fine');
 for(const bad of [null,[],'x',{},{tasks:[]},{tasks:{museum:2},ranAt:0},{tasks:{nosuch:1},ranAt:0},{tasks:{museum:1},ranAt:-1},{tasks:{museum:1},ranAt:1.5}])
  assert.equal(validHelper({helper:bad}),false,JSON.stringify(bad));
 // Positive control: the shape this guard is meant to ACCEPT still passes, so it is not refusing all.
 assert.equal(validHelper({helper:{tasks:{museum:1,bait:0},ranAt:0}}),true);
 assert.equal(valid({...s,helper:{tasks:{museum:2},ranAt:0}}),false,'and valid() composes it');});

test('a save written before a chore existed gets it switched ON, not off',()=>{
 // The bug this pins was found by looking at the panel, not by a test: a save that had used the helper
 // stored a tasks map with only the then-known ids, and a ===1 check delivered every newly added chore
 // switched OFF. The original ships 36 of its 40 default-on, so absent must mean on.
 const s=armed();
 const older={...s,helper:{tasks:{village:1,museum:1},ranAt:0}};
 assert.ok(valid(older),'a partial tasks map is a legal record');
 for(const t of HELPER_TASKS)assert.equal(helperEnabled(older,t.id),true,`${t.id} should be on by default`);
 // An explicit off still wins, so a player's choice is never overridden.
 const off={...s,helper:{tasks:{farm:0},ranAt:0}};
 assert.equal(helperEnabled(off,'farm'),false);
 assert.equal(helperEnabled(off,'fishing'),true);
 // And a run on the older save really does reach a chore it had no key for.
 const {seen}=spyRun(older);
 assert.ok(seen.includes('sowFarm')||seen.includes('harvestFarm')||seen.includes('castFish'),
  `a chore ran on the older save: ${[...new Set(seen)].join(', ')}`);});

test('an old save without a helper record loads, and gains one only when used',()=>{
 const old=fresh(T);
 assert.equal(old.helper,undefined,'fresh saves do not carry the record');
 assert.ok(valid(old));
 assert.deepEqual(decode(JSON.stringify(old)),old,'no key is added on load');
 assert.deepEqual(helperState(old).tasks,Object.fromEntries(HELPER_TASKS.map(t=>[t.id,1])),'defaults are all on, like isSelect on 36 of 40 original rows');});
