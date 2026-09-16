import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {INN_GUESTS} from '../lib/inn-guests.mjs';
import {expoStepKey} from '../lib/expo.mjs';
import {HELPER_TASKS,HELPER_RUN_CAP,CHORE_STEP_CAP,helperState,validHelper,helperAction,helperEnabled,bestPlant,bestGround} from '../lib/helper.mjs';
import {bestNegotiation} from '../lib/helper.mjs';
import {ROAM_QUICK_MAX,roamStamina,roamingState} from '../lib/roaming.mjs';
import {TRADE_OPPONENTS,tradingPost,negotiationEnergy} from '../lib/trading-post.mjs';
import {FELLOWS} from '../lib/catalog.mjs';
import {bondedPower} from '../lib/adventure.mjs';
import {habitDay} from '../lib/habits.mjs';
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

// A chore that dispatches the WRONG TARGET is invisible to every test above: it simply never succeeds,
// reports "nothing waiting", and looks like an idle system. Two shipped that way -- the Expo chore passed
// stall ids to serveExpo, which compares against expoStepKey ("expo:1:step:0"), and the Inn chore read
// s.inn.guests, which does not exist. So each chore's dispatch CONTRACT is pinned here directly: the
// runners are reachable through HELPER_TASKS, and a stub act records what they ask for without needing a
// save the validator would accept.
test('each chore dispatches the target its action actually expects',()=>{
 const chore=id=>HELPER_TASKS.find(t=>t.id===id).run;
 const spyStub=()=>{const seen=[];return [seen,(state,action,now,target)=>{seen.push({action,target});return {error:'stub'}}]};

 // Expo: the key is the CURRENT STEP of the active day, and is re-read each step.
 const active={sequence:1,step:0,slots:[],customers:[],rewards:[]};
 const expoSave={expo:{stalls:{},assigned:{},sequence:1,active,last:null,clears:[],spentCoins:0,transferredPearls:0}};
 let [seen,stub]=spyStub();
 chore('expo')(expoSave,stub,T);
 assert.equal(seen.length,1,'the Expo chore dispatched');
 assert.equal(seen[0].action,'serveExpo');
 assert.equal(seen[0].target,expoStepKey(expoSave),`expected ${expoStepKey(expoSave)}, got ${seen[0].target}`);
 assert.match(seen[0].target,/^expo:\d+:step:\d+$/,'a stall id would never match');

 // Inn: the guest list is the shipped rule set, and the target must be one of its ids.
 const guest=INN_GUESTS[0];
 const innSave={inn:{menu:[guest.dish],served:9999,stations:{},popularity:1e12},fellows:{[guest.fellow]:{}}};
 [seen,stub]=spyStub();
 chore('innGuests')(innSave,stub,T);
 assert.ok(seen.length>=1,'the Inn chore dispatched');
 assert.equal(seen[0].action,'serveInnSpecial');
 assert.ok(INN_GUESTS.some(r=>r.id===seen[0].target),`${seen[0].target} is not a guest id`);

 // Roaming: roamingAction ignores `target` entirely -- the contract lives in the VALUE. `seq` must be the
 // CURRENT roaming seq (every single roam increments it) and the rolls are generated by the caller, the
 // way roaming-panel.tsx does it. Recording the shape is not enough to prove it is the right shape, so the
 // recorded dispatch is then REPLAYED through the real act(): a stale seq is refused with 'Roaming
 // changed', a roll outside [0,1) or more than ROAM_QUICK_MAX of them with 'Invalid roaming roll'.
 const spyVal=()=>{const seen=[];return [seen,(state,action,now,target,value)=>{seen.push({action,target,value});return {error:'stub'}}]};
 const roamSave=armed();
 let [rseen,rstub]=spyVal();
 chore('roaming')(roamSave,rstub,roamSave.lastAt);
 // Two dispatches: the roam the stub refuses, then the refill it tries once roaming has stopped. Both
 // carry the seq, which is the whole contract for roamRefill.
 assert.equal(rseen.length,2,`the Roaming chore dispatched ${rseen.map(x=>x.action).join(', ')}`);
 assert.ok(['roamGo','roamQuick'].includes(rseen[0].action),`${rseen[0].action} is not a roaming action`);
 assert.equal(rseen[1].action,'roamRefill');
 assert.equal(rseen[1].value.seq,roamingState(roamSave).seq,'the refill carries the current roaming seq too');
 assert.equal(rseen[0].value.seq,roamingState(roamSave).seq,'the dispatch carries the current roaming seq');
 const rolls=rseen[0].action==='roamGo'?[rseen[0].value.roll]:rseen[0].value.rolls;
 assert.ok(Array.isArray(rolls)&&rolls.length>=1&&rolls.length<=ROAM_QUICK_MAX,`${rolls.length} rolls, cap ${ROAM_QUICK_MAX}`);
 assert.ok(rolls.every(x=>typeof x==='number'&&x>=0&&x<1),'every roll is a number in [0,1)');
 const replayed=act(roamSave,rseen[0].action,roamSave.lastAt,rseen[0].target,rseen[0].value);
 assert.equal(replayed.error,undefined,`the real action refused the chore's own dispatch: ${replayed.error}`);
 assert.ok(roamStamina(replayed.state).stamina<roamStamina(roamSave).stamina,'and the replayed dispatch really roamed');

 // Trading Post: tradeBegin is keyed by an OPPONENT id with the team in the value; tradeComplete is keyed
 // by the RUN's numeric id. Handing tradeComplete an opponent id is exactly the invisible-chore failure.
 const tradeSave=armed();
 let [tseen,tstub]=spyVal();
 chore('trading')(tradeSave,tstub,tradeSave.lastAt);
 assert.equal(tseen.length,1,'the Trading chore dispatched');
 assert.equal(tseen[0].action,'tradeBegin','with no saved run there is nothing to complete');
 assert.ok(TRADE_OPPONENTS.some(o=>o.id===tseen[0].target),`${tseen[0].target} is not an opponent id`);
 assert.equal(tseen[0].value.seq,tradingPost(tradeSave).seq,'the dispatch carries the current Trading Post seq');
 const began=act(tradeSave,'tradeBegin',tradeSave.lastAt,tseen[0].target,tseen[0].value);
 assert.equal(began.error,undefined,`the real action refused the chore's own tradeBegin: ${began.error}`);
 const savedRun=tradingPost(began.state).run;
 assert.deepEqual(savedRun.team.map(p=>p.id),tseen[0].value.team,'the team it asked for is the team that was fielded');
 const ready={...began.state,lastAt:savedRun.readyAt};
 [tseen,tstub]=spyVal();
 chore('trading')(ready,tstub,ready.lastAt);
 assert.equal(tseen.length,1,'the Trading chore dispatched on a ready run');
 assert.equal(tseen[0].action,'tradeComplete');
 assert.equal(typeof tseen[0].target,'number','an opponent id string would never match a run id');
 assert.equal(tseen[0].target,savedRun.id,`tradeComplete takes the run id ${savedRun.id}`);
 assert.equal(act(ready,'tradeComplete',ready.lastAt,tseen[0].target,tseen[0].value).error,undefined,
  'and the real action accepts the completion the chore asked for');

 // Positive control: with the system absent, each chore correctly does nothing rather than throwing.
 for(const id of ['expo','innGuests','farm','fishing','roaming','trading']){
  const out=chore(id)({},(()=>{throw Error('must not dispatch on an absent system')}),T);
  assert.equal(out.steps,0,`${id} dispatched on an empty save`);
 }});

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

test('the Roaming chore spends the stock before it takes the daily refill',()=>{
 // The measured reason this order matters: roamRefill clamps to the cap and stamps refillDay either way,
 // so refilling a nearly-full stock spends the one daily refill for a point or two instead of up to
 // ROAM_REFILL_MAX. Recovery also stops at the cap, so a full stock is the only stock that can waste.
 const s=armed();
 const {result,seen}=spyRun(s);
 assert.equal(result.error,undefined,result.error);
 const i=seen.indexOf('roamRefill');
 assert.ok(i>0,'the chore took the habit refill');
 assert.ok(['roamGo','roamQuick'].includes(seen[i-1]),`refilled after ${seen[i-1]}, not after roaming`);
 assert.ok(seen.slice(i+1).some(a=>a==='roamGo'||a==='roamQuick'),'and it spent what the refill gave');
 assert.equal(roamStamina(result.state).stamina,0,'stamina ends spent, not sitting at the cap');
 assert.equal(roamingState(result.state).refillDay,habitDay(s.lastAt));
 // Positive control on the ordering assertion: a roaming dispatch really is what precedes the refill, so
 // `i>0` is not passing merely because some other chore happened to dispatch first.
 assert.ok(['roamGo','roamQuick'].includes(seen.find(a=>a==='roamGo'||a==='roamQuick')));
 // The per-run cap still bounds it, exactly as it bounds fishing.
 const roams=seen.filter(a=>a==='roamGo'||a==='roamQuick').length;
 assert.ok(roams>0&&roams<=CHORE_STEP_CAP,`${roams} roaming dispatches`);
 assert.ok(valid(result.state));});

test('the Trading chore fields the cheapest team that still wins, and never a loser',()=>{
 // A win pays coinPerWin:30 / influencePerWin:2 whoever it is against, and every Fellow pays one
 // Negotiation Energy win or lose. So Power above the threshold buys nothing: take the weakest opponent
 // (its winner set contains every other's) and the weakest qualifying Fellows (a strong Fellow wins
 // everything a weak one does, so their Energy is worth more kept).
 const s=armed();
 const weakest=TRADE_OPPONENTS.reduce((a,b)=>a.power<=b.power?a:b);
 const strongest=TRADE_OPPONENTS.reduce((a,b)=>a.power>=b.power?a:b);
 assert.ok(strongest.power>weakest.power,'positive control: the opponents really do differ in Power');
 const {result}=spyRun(s);
 const run=tradingPost(result.state).run;
 assert.ok(run,'a negotiation was begun');
 assert.equal(run.opponent.id,weakest.id,'the weakest opponent was chosen');
 assert.equal(run.wins,run.team.length,'every Fellow fielded won; none paid Energy for nothing');
 assert.ok(run.team.length>=1&&run.team.length<=6,'and the team is within the 1..6 validRun bound');
 // The team rule needs more than one Fellow to bite, so field a synthetic roster of eight at different
 // levels. bestNegotiation is pure, so this needs no save the validator would accept.
 const base=s.fellows[Object.keys(s.fellows)[0]];
 const ids=FELLOWS.slice(0,8).map(f=>f.id);
 const many={...s,fellows:Object.fromEntries(ids.map((id,n)=>[id,{...base,level:base.level+n*3}]))};
 const powers=ids.map(id=>bondedPower(many,id));
 assert.equal(new Set(powers).size,ids.length,'positive control: the eight synthetic Fellows differ in Power');
 assert.ok(powers.every(p=>p>=weakest.power),'positive control: all eight can beat the weakest opponent');
 assert.ok(ids.every(id=>negotiationEnergy(many,id).energy>=1),'positive control: all eight have Energy');
 const plan=bestNegotiation(many);
 assert.equal(plan.opponent,weakest.id);
 assert.equal(plan.team.length,6,'the six-Fellow cap was filled');
 assert.deepEqual(plan.team.map(id=>bondedPower(many,id)).sort((a,b)=>a-b),powers.slice().sort((a,b)=>a-b).slice(0,6),
  'the six WEAKEST qualifying Fellows were fielded, not the six strongest');
 // A loser is never fielded, and 'weakest first' means weakest AMONG THOSE WHO WIN. That distinction is
 // the whole point: on this roster the four Fellows below the threshold ARE the weakest of the eight, so a
 // rule that just sorted by Power and took six would field four Fellows who pay Energy and lose.
 const mixed={...s,fellows:Object.fromEntries(ids.map((id,n)=>[id,{...base,aptitude:n<4?1:10,level:base.level+n}]))};
 const losers=ids.filter(id=>bondedPower(mixed,id)<weakest.power);
 assert.equal(losers.length,4,'positive control: four of the eight really are too weak to win');
 const mixedPlan=bestNegotiation(mixed);
 assert.ok(mixedPlan.team.every(id=>!losers.includes(id)),`fielded a Fellow who cannot win: ${mixedPlan.team.join(', ')}`);
 assert.equal(mixedPlan.team.length,ids.length-losers.length,'and fielded every Fellow who can');
 const allWeak={...s,fellows:Object.fromEntries(ids.map(id=>[id,{...base,aptitude:1}]))};
 assert.equal(bestNegotiation(allWeak),null,'with nobody able to win, no Energy is spent at all');
 assert.equal(bestNegotiation({}),null,'an empty roster plans nothing');});

test('the two new chores never spend gold or crystals',()=>{
 // The SPENDING regex above is a name test; this is the balance test, on the actions these chores dispatch.
 const s=armed();
 const seen=[];
 const spy=(state,action,now,target,value)=>{seen.push(action);return act(state,action,now,target,value)};
 let state=s,steps=0;
 for(const id of ['roaming','trading']){const out=HELPER_TASKS.find(t=>t.id===id).run(state,spy,state.lastAt);state=out.state;steps+=out.steps}
 assert.ok(steps>0&&seen.length>0,'positive control: both chores actually dispatched');
 assert.equal(state.gold,s.gold,`gold moved ${s.gold} -> ${state.gold}`);
 assert.equal(state.crystals,s.crystals,`crystals moved ${s.crystals} -> ${state.crystals}`);
 // Trade Coins are a separate currency and the shop is the only thing that spends them. The helper never
 // touches tradeBuy: it banks coins and leaves the exchange to the player, like every other purchase.
 assert.ok(!seen.includes('tradeBuy'),'the helper does not shop at the Trading Post');
 assert.ok(tradingPost(state).coins>=tradingPost(s).coins,'Trade Coins never fall either');
 assert.ok(valid(state));});
