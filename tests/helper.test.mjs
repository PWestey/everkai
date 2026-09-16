import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {INN_GUESTS} from '../lib/inn-guests.mjs';
import {expoStepKey} from '../lib/expo.mjs';
import {TREASURE_AREAS,TREASURE_RELICS,tileGem} from '../lib/treasure.mjs';
import {FISH,FISHING_GROUNDS,groundLevel,fishingIndex,fishingLevel} from '../lib/fishing.mjs';
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
// The regex is a NAME-SHAPED PROXY for "buys something with the player's money". `upgradeFish` is its one
// false positive among the chores: fishing.mjs spends `points`, which exist only as the output of
// researchFish on a duplicate catch, can buy nothing else, and cap out because the skill caps at level 3.
// The property the proxy stands in for -- gold and crystals never fall -- is asserted DIRECTLY below and
// is untouched by it. Nothing else belongs in this set; add a chore that really spends and the gate holds.
const DUPLICATE_ONLY=new Set(['upgradeFish']);
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
 for(const a of new Set(seen))assert.ok(!SPENDING.test(a)||DUPLICATE_ONLY.has(a),`the helper dispatched ${a}, which spends`);
 assert.ok(result.state.gold>=s.gold,`gold fell ${s.gold} -> ${result.state.gold}`);
 assert.ok(result.state.crystals>=s.crystals,`crystals fell ${s.crystals} -> ${result.state.crystals}`);
 assert.ok(valid(result.state));
 // Positive control on the regex itself, and on the narrowness of its one exception.
 assert.ok(SPENDING.test('buySupply')&&SPENDING.test('upgradeInnStation'));
 assert.deepEqual([...DUPLICATE_ONLY],['upgradeFish'],'the SPENDING exception covers exactly one action');});

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
 // A second run may still do stamina- or bait-backed work: the Treasure Hunt holds up to 300 Steeltooth
 // stamina against a 50-step cap, so one run cannot exhaust a day's digging and the next legitimately
 // continues -- exactly as the sibling test above already allows. What must NOT repeat is a DAY-gated
 // claim, which is what this test is actually for, so assert that directly instead of via "nothing left".
 if(twice.error)assert.match(twice.error,/Nothing was waiting/);
 else assert.equal(twice.state.museumDay,once.museumDay,'the day-gated claims were not re-run');
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

 // Treasure Hunt. treasureAction opens with `if(value!==old.seq)`, so the VALUE carries the expedition
 // sequence number -- a chore passing null here would be refused on every single dispatch and report
 // "nothing waiting" forever. The stub above drops `value`, which is exactly the blind spot, so these use
 // a stub that records it. Targets differ per action: an AREA id to start and to appraise, a TILE INDEX
 // to dig, a RELIC id to restore/donate/display.
 const valueStub=()=>{const seen=[];return [seen,(state,action,now,target,value)=>{seen.push({action,target,value});return {error:'stub'}}]};
 const AREAS=new Set(TREASURE_AREAS.map(a=>a.id)),RELICS=new Set(TREASURE_RELICS.map(r=>r.id));
 const camp=(extra)=>({lastAt:T,treasure:{policyVersion:1,seq:7,seed:1,day:Math.floor(T/86400000),stamina:9,xp:0,trip:null,gems:{},relics:{},...extra}});
 const dispatch=(id,save)=>{const [seen,stub]=valueStub();chore(id)(save,stub,T);return seen};

 let first=dispatch('treasure',camp())[0];
 assert.equal(first.action,'treasureStart');
 assert.ok(AREAS.has(first.target),`${first.target} is not a treasure region id`);
 assert.equal(first.value,7,'treasureStart must carry the expedition seq as its value, not null');

 first=dispatch('treasure',camp({trip:{id:6,area:TREASURE_AREAS[0].id,tiles:[]}}))[0];
 assert.equal(first.action,'treasureDig');
 assert.equal(first.target,2,'gem tiles (i%3===2) are dug first');
 assert.ok(tileGem(first.target),'the first dig targets a gemstone tile');
 assert.equal(first.value,7);

 first=dispatch('treasure',camp({gems:{[TREASURE_AREAS[0].id]:3}}))[0];
 assert.equal(first.action,'treasureAppraise');
 assert.ok(AREAS.has(first.target),`appraisal is keyed by REGION; ${first.target} is not one`);
 assert.ok(!RELICS.has(first.target),'a relic id would never match an appraisal');

 const relic=TREASURE_RELICS[0].id;
 first=dispatch('treasure',camp({relics:{[relic]:{materials:0,donated:true,displayed:false}}}))[0];
 assert.equal(first.action,'treasureDisplay');
 assert.equal(first.target,relic,'display is keyed by RELIC id');

 // Duplicate spending. One save carrying all five sinks; the stub refuses every dispatch, so each stage
 // fires exactly once and the whole contract is visible in one recording.
 const dupSave={lastAt:T,
  fishing:{bait:0,points:10,displayed:['F1101','F1102'],skills:{F1101:2,F1102:1},researched:[],
   catches:[{id:'catch:1',fish:'F1101',duplicate:false},{id:'catch:2',fish:'F1101',duplicate:true}]},
  treasure:{policyVersion:1,seq:4,seed:1,day:Math.floor(T/86400000),stamina:0,xp:0,trip:null,gems:{},
   relics:{[relic]:{materials:3,donated:true,displayed:true}}},
  northern:{policyVersion:1,seq:5,coins:60},
  mineClearance:{policyVersion:1,seq:9,coins:1500,history:[],exchanges:[]}};
 const dup=dispatch('duplicates',dupSave),by=a=>dup.find(x=>x.action===a);
 assert.equal(by('researchFish').target,'catch:2','researchFish takes a CATCH id, not a species id');
 assert.match(by('researchFish').target,/^catch:\d+$/);
 assert.ok(!by('researchFish').target.startsWith('F'),'a species id would silently research nothing');
 assert.equal(by('treasureRestore').target,relic);
 assert.equal(by('treasureRestore').value,4,'restore carries the treasure seq');
 assert.deepEqual(by('northExchange').value,{seq:5},'northExchange reads value?.seq, so it needs an object');
 assert.deepEqual(by('mineExchange').value,{seq:9,day:Math.floor(T/86400000),count:'max'},
  'mineExchange checks value.seq AND value.day against mineDay(s), which comes from s.lastAt');
 assert.equal(by('upgradeFish').target,'F1102','cheapest first: the displayed fish at the LOWEST level');
 assert.equal(dup.filter(x=>x.action==='upgradeFish').length,1);

 // Negative control for the Treasure Hunt specifically: the system is PRESENT but Steeltooth is out of
 // stamina and nothing is banked. treasureStart costs no stamina, so without its own guard the chore
 // would start-and-return in a loop and report 50 chores done for nothing.
 assert.equal(chore('treasure')(camp({stamina:0}),()=>{throw Error('must not dispatch with no stamina')},T).steps,0);

 // Positive control: with the system absent, each chore correctly does nothing rather than throwing.
 for(const id of ['expo','innGuests','farm','fishing','treasure','duplicates']){
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

// ---------------------------------------------------------------------------------------------
// TREASURE HUNT and DUPLICATE SPENDING (appended).
// ---------------------------------------------------------------------------------------------

test('the Treasure Hunt chore digs, banks, appraises and donates through the real gates',()=>{
 const s=stocked();
 assert.equal(s.treasure,undefined,'a fresh save carries no expedition record');
 const {result,seen}=spyRun(s);
 assert.equal(result.error,undefined,result.error);
 const t=result.state.treasure;
 assert.ok(t,'the chore created an expedition record');
 assert.ok(valid(result.state),'and the save it produced is still a legal save');
 assert.deepEqual(decode(JSON.stringify(result.state)),result.state,'and it round-trips');
 // It really played the loop rather than firing one action.
 for(const a of ['treasureStart','treasureDig','treasureReturn','treasureAppraise','treasureDonate'])
  assert.ok(seen.includes(a),`the chore never dispatched ${a}: ${[...new Set(seen)].filter(x=>x.startsWith('treasure')).join(', ')}`);
 assert.ok(t.stamina<100,`stamina was never spent (${t.stamina})`);
 assert.ok(t.xp>0,'no Steeltooth EXP was banked');
 assert.ok(Object.keys(t.relics).length>0,'no relic was appraised out of the gemstones');
 assert.ok(Object.values(t.relics).every(r=>r.donated&&r.displayed),'every appraised relic was donated and displayed');
 // treasureRestore is excluded: it belongs to the duplicates chore, which has its own budget.
 assert.ok(seen.filter(a=>a.startsWith('treasure')&&a!=='treasureRestore').length<=CHORE_STEP_CAP,'the chore stayed inside the step cap');
 // Negative control: switched off, the chore leaves the system completely untouched.
 const off=helperAction({...s,helper:{tasks:{treasure:0},ranAt:0}},'helperRun',s.lastAt,null,null,act);
 assert.equal(off.error,undefined,off.error);
 assert.equal(off.state.treasure,undefined,'with the chore off, no expedition was ever started');});

test('the duplicates chore spends duplicates on their own items, and never gold or crystals',()=>{
 // Two runs: the first fills the book with duplicate catches and duplicate relic materials, the second
 // spends them. A displayed fish is placed by hand, because displaying is a choice the helper does not make.
 let s=stocked();
 s=helperAction(s,'helperRun',s.lastAt,null,null,act).state;
 const caught=[...new Set(s.fishing.catches.map(c=>c.fish))][0];
 const shown=act(s,'displayFish',s.lastAt,caught);
 assert.equal(shown.error,undefined,shown.error);
 // The first run drained the day's bait, so stock some by hand: the second run has to CATCH new duplicates
 // before it can research them, otherwise this test would pass on an empty sink.
 s={...shown.state,fishing:{...shown.state.fishing,bait:40}};
 assert.ok(valid(s),'the stocked fixture is a legal save');
 const before={gold:s.gold,crystals:s.crystals,points:s.fishing.points,researched:s.fishing.researched.length,
  skill:s.fishing.skills[caught]||1,restored:Object.values(s.treasure.relics).filter(r=>r.restorations?.length).length};
 const {result,seen}=spyRun(s);
 assert.equal(result.error,undefined,result.error);
 const f=result.state.fishing;
 // Positive controls: each sink actually moved, so the assertions below are not vacuous.
 assert.ok(f.researched.length>before.researched,`no duplicate catch was researched (${before.researched})`);
 assert.ok(seen.includes('researchFish')&&seen.includes('treasureRestore'),'both duplicate sinks were dispatched');
 assert.ok(f.skills[caught]>before.skill,`the displayed fish gained no skill level (${before.skill})`);
 assert.equal(f.skills[caught],3,'and with points to spare it went to fishing.mjs`s level-3 cap');
 assert.ok(seen.includes('upgradeFish'),'the Research Point sink ran');
 assert.ok(Object.values(f.skills).every(l=>l<=3),'no skill was pushed past the cap');
 assert.ok(Object.values(result.state.treasure.relics).filter(r=>r.restorations?.length).length>before.restored,
  'at least one relic was restored with its own materials');
 // THE LINE: item-specific duplicates and minigame coins are fine; gold and crystals are not.
 assert.ok(result.state.gold>=before.gold,`gold fell ${before.gold} -> ${result.state.gold}`);
 assert.equal(result.state.crystals,before.crystals,'crystals were untouched');
 assert.ok(valid(result.state));
 assert.deepEqual(decode(JSON.stringify(result.state)),result.state);
 // Research Points are conserved exactly: each research pays 1, each upgrade costs 2*level.
 const spent=Object.entries(f.skills).reduce((n,[,l])=>n+l*(l-1),0);
 assert.equal(f.points,f.researched.length-spent,'the points ledger fishing.mjs validates still balances');
 // Negative control: with the chore off, nothing is spent.
 const off=helperAction({...s,helper:{tasks:{duplicates:0},ranAt:0}},'helperRun',s.lastAt,null,null,act);
 assert.equal(off.state.fishing.researched.length,before.researched,'with the chore off, no duplicate was researched');
 assert.equal(off.state.fishing.skills[caught],before.skill,'and no Research Point was spent');});

test('bestGround picks the most UNCAUGHT species, which measurably is not the deepest ground',()=>{
 // MEASURED, and the reason the old "deepest unlocked" rule was replaced. Ground sizes do not grow with
 // depth: at fishing level 10 the deepest unlocked ground is Island Coastline (18 species) while three
 // shallower ones hold 20. Simulated from fresh on the shipped draw, deepest-first reaches 39 distinct
 // species in 1,600 casts and this rule reaches 59.
 const deepest=level=>Object.keys(FISHING_GROUNDS).filter(g=>groundLevel(g)!==null&&groundLevel(g)<=level)
  .reduce((a,b)=>groundLevel(b)>groundLevel(a)?b:a);
 const uncaught=(g,have)=>FISH.filter(r=>r.locations.includes(g)&&!have.has(r.id)).length;
 // A book holding one species, with enough EXP to have opened everything up to level 10.
 const one=FISH[0];
 let n=1;while(fishingLevel(10*n).level<10&&n<1e4)n++;
 const f={bait:0,points:0,displayed:[],researched:[],skills:{},
  catches:Array.from({length:n},(_,i)=>({id:`catch:${i+1}`,fish:one.id}))};
 const level=fishingLevel(fishingIndex(f).exp).level;
 assert.ok(level>=10,`the fixture reached fishing level ${level}`);
 const have=fishingIndex(f).first,pick=bestGround({fishing:f}),deep=deepest(level);
 assert.notEqual(pick,deep,`the deepest ground ${deep} is not the one with the most uncaught species`);
 assert.ok(uncaught(pick,have)>uncaught(deep,have),
  `${pick} holds ${uncaught(pick,have)} uncaught, ${deep} only ${uncaught(deep,have)}`);
 assert.equal(uncaught(pick,have),Math.max(...Object.keys(FISHING_GROUNDS)
  .filter(g=>groundLevel(g)!==null&&groundLevel(g)<=level).map(g=>uncaught(g,have))),'and it is the maximum');
 // Negative control on the tie-break: with the whole book caught every ground holds 0 uncaught, and the
 // rule falls back to depth -- so it can never pick a shallower ground for no reason.
 const done={...f,catches:FISH.map((r,i)=>({id:`catch:${i+1}`,fish:r.id}))
  .concat(Array.from({length:n},(_,i)=>({id:`catch:${FISH.length+i+1}`,fish:one.id})))};
 const doneLevel=fishingLevel(fishingIndex(done).exp).level;
 assert.equal(bestGround({fishing:done}),deepest(doneLevel),'a complete book falls back to the deepest ground');
 assert.equal(bestGround({}),null,'and a save without fishing picks nothing');});
