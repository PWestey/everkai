import {bestBanquetParty,northSurvive} from '../lib/helper.mjs';
import {NORTH,northern,tileKind,activeRoom} from '../lib/northern.mjs';
import {BANQUET_PARTIES,banquetState} from '../lib/banquets.mjs';
import {habitDay} from '../lib/habits.mjs';
import {bondedPower} from '../lib/adventure.mjs';
import {FELLOWS} from '../lib/catalog.mjs';
import {TRADE_OPPONENTS,tradingPost,negotiationEnergy} from '../lib/trading-post.mjs';
import {ROAM_QUICK_MAX,roamStamina,roamingState} from '../lib/roaming.mjs';
import {bestNegotiation} from '../lib/helper.mjs';
import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {INN_GUESTS} from '../lib/inn-guests.mjs';
import {BAIT_STORAGE,fishingState} from '../lib/fishing.mjs';
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

 // Positive control: with the system absent, these chores do nothing rather than throwing.
 for(const id of ['expo','innGuests','farm','treasure','duplicates']){
  const out=chore(id)({},(()=>{throw Error('must not dispatch on an absent system')}),T);
  assert.equal(out.steps,0,`${id} dispatched on an empty save`);
 }
 // FISHING IS THE DELIBERATE EXCEPTION. A village that has never fished has no fishing subtree at all,
 // and baitRefill is what creates it -- so this chore MUST reach for the refill on an empty save. It
 // bailed early for a while after the refill moved behind it, which left a first-time player's fishing
 // chore idle forever. Assert the exception rather than quietly dropping fishing from the loop.
 {
  const seen=[];
  chore('fishing')({},(s,action)=>{seen.push(action);return {error:'stub'}},T);
  assert.deepEqual(seen,['baitRefill'],'fishing opens the system with a refill and asks for nothing else');
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
 assert.ok(seen.some(a=>['sowFarm','harvestFarm','castFish','roamQuick','treasureStart','banquetPrepare','northStart'].includes(a)),
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

// COVERAGE, so this cannot rot the way it already did once. The contract test above grew to cover the
// chores whose bugs prompted it and silently missed the rest -- 3 of 8 when this was written. A chore
// with a wrong target is invisible to every other guard, so EVERY chore must have its dispatch checked.
// Adding a chore without adding it here now fails.
test('every chore has its dispatch contract checked, not just the ones that broke',()=>{
 const primed={
  farm:{state:{farm:{plots:[null],knowledge:0,harvests:{}}},allow:['harvestFarm','waterFarm','sowFarm']},
  fishing:{state:{fishing:{bait:5,catches:[],researched:[],displayed:[],skills:{},points:0}},allow:['castFish','baitRefill']},
  innGuests:{state:{inn:{menu:[INN_GUESTS[0].dish],served:9999,stations:{},popularity:1e12},fellows:{[INN_GUESTS[0].fellow]:{}}},allow:['serveInnSpecial']},
  expo:{state:{expo:{stalls:{},assigned:{},sequence:1,active:{sequence:1,step:0,slots:[],customers:[],rewards:[]},last:null,clears:[],spentCoins:0,transferredPearls:0}},allow:['serveExpo']},
  roaming:{state:{family:{},inventory:{},roaming:{policyVersion:1,seq:0,stamina:5,recoverAt:null,fame:0,travels:0,bonds:{},refillDay:null,history:[]}},allow:['roamGo','roamQuick','roamRefill']},
  trading:{state:{fellows:{hero_15:{level:1,aptitude:10,skill:0,breaks:0,gear:null}},tradingPost:{policyVersion:1,seq:0,coins:0,influence:0,run:null,history:[],energy:{},shop:{day:0,bought:0}}},allow:['tradeBegin','tradeComplete']},
  treasure:{state:{treasure:{seq:0,stamina:100,relics:{},gems:{},area:null,run:null}},allow:['treasureStart','treasureDig','treasureAppraise','treasureReturn','treasureRestore','treasureDonate','treasureDisplay']},
  duplicates:{state:{fishing:{bait:0,catches:[],researched:[],displayed:[],skills:{},points:0}},allow:['researchFish','upgradeFish','treasureRestore','treasureDonate','northExchange','mineExchange']},
  banquets:{state:{banquets:{policyVersion:1,seq:0,coins:0,popularity:0,pantry:{},run:null,history:[],shop:{day:0,bought:{}}}},allow:['banquetClaim','banquetPrepare','banquetHost']},
  northern:{state:{northern:{policyVersion:1,seq:0,supplies:12,recoverAt:null,coins:60,atkXP:0,hpXP:0,atkLevel:0,hpLevel:0,consumed:0,run:null,history:[],exchanges:[]}},allow:['northExchange','northStart','northTile','northAttack','northNext','northFinish']},
 };
 // Each overlay sits on a REAL fresh save, not a fragment: the modules reach for fields like s.claims
 // through playerRank, and a hand-built stub throws rather than reporting a contract problem.
 const base=fresh(T);
 const chores=HELPER_TASKS.filter(t=>t.run).map(t=>t.id);
 assert.deepEqual([...chores].sort(),Object.keys(primed).sort(),
  'a chore exists with no dispatch contract checked -- add it to `primed` above');
 for(const id of chores){
  const {state:overlay,allow}=primed[id];const state={...base,...overlay};
  const seen=[];
  const stub=(s,action,now,target,value)=>{seen.push({action,target,value});return {error:'stub'}};
  HELPER_TASKS.find(t=>t.id===id).run(state,stub,T);
  // Not every primed state can reach every chore's first dispatch, but whatever IS dispatched must be
  // an action that chore is allowed to drive -- a typo'd or foreign action name fails here.
  for(const d of seen)assert.ok(allow.includes(d.action),`${id} dispatched ${d.action}, which is not one of ${allow.join(', ')}`);
 }
 // Positive control: the loop really did drive chores, so the assertion above is not vacuous.
 assert.ok(chores.length>=8,`${chores.length} chores checked`);});

test('the banquet chore prepares, hosts and collects the party with the best coin yield',()=>{
 // coinsPerGuest is fixed at 100 inside banquetHost, and every shipped party costs one of each of
 // its two materials, so coins per material set is 100 x seats and the largest party wins outright.
 const best=BANQUET_PARTIES.reduce((a,b)=>b.seats>a.seats?b:a);
 assert.ok(BANQUET_PARTIES.length>1,'there is actually a choice to get right');
 assert.equal(bestBanquetParty(armed(),false),best.id);
 // Negative control on the affordability filter: an empty pantry can pay for nothing.
 assert.equal(bestBanquetParty(armed(),true),null,'an empty pantry hosts nothing');

 const first=run(armed(),'helperRun');
 const b=banquetState(first);
 assert.ok(b.run,'the chore laid a banquet');
 assert.equal(b.run.kind,best.id,`hosted ${b.run.kind}, not the ${best.seats}-seat party`);
 assert.equal(b.run.guests.length,best.seats);
 assert.ok(b.refillDay,'the habit refill was used');
 // The guests then have to arrive; the chore claims by RUN id once they have.
 const later=act(first,'helperRun',first.lastAt+b.run.guests.length*b.run.intervalMs+1000);
 assert.equal(later.error,undefined,later.error);
 const after=banquetState(later.state);
 assert.equal(after.run,null,'the finished banquet was collected');
 assert.equal(after.coins,b.run.coinsPerGuest*best.seats,'the full payout was banked');
 assert.equal(after.history.length,1);
 assert.ok(valid(later.state),'and the save the chore produced is a legal one');
 // The chore never reaches the exchange: choosing among the shop items is the player's, not ours.
 const {seen}=spyRun(armed());
 assert.ok(seen.includes('banquetHost'),'positive control: the chore really ran in a full helper run');
 assert.ok(!seen.includes('banquetBuy'),'the helper does not shop');});

test('northSurvive matches what northAttack actually does, blow for blow',()=>{
 // The predictor is only worth having if it agrees with the real action. Replay one beast through
 // act() and compare the HP it leaves against what northSurvive said it would.
 const hurt=NORTH.retaliation[0],atk=2,maxHP=30;
 assert.equal(northSurvive(maxHP,maxHP,atk,NORTH.monsterHP[0],2,hurt),maxHP-Math.ceil(NORTH.monsterHP[0]/atk)*hurt,
  'three blows at 2 HP each, killing blow included');
 // Negative control: too little HP and no springs is refused, not optimistically rounded up.
 assert.equal(northSurvive(hurt,maxHP,atk,NORTH.monsterHP[2],0,NORTH.retaliation[2]),null);
 assert.equal(northSurvive(1,maxHP,atk,NORTH.monsterHP[0],0,hurt),null,'1 HP cannot take a 2 HP blow');
 // A spring is worth exactly NORTH.healing, and only when it is not thrown away against the cap.
 assert.notEqual(northSurvive(1,maxHP,atk,NORTH.monsterHP[0],2,hurt),null,'springs make the same fight survivable');});

test('the Northern chore never blunders an expedition into a loss',()=>{
 const chore=HELPER_TASKS.find(t=>t.id==='northern').run;
 // validNorthern ties banked coins and XP to the history, so training levels cannot be poked into a
 // save -- they have to be EARNED. Bank camp XP by playing real expeditions first. The Supply count
 // is not part of that arithmetic, so topping Supplies up between descents keeps the save legal.
 const north=s=>northern(s),refill=s=>({...s,northern:{...north(s),supplies:12,recoverAt:null}});
 let bank=refill(armed());
 for(let i=0;i<10&&(north(bank).atkXP<40||north(bank).hpXP<40);i++)bank=refill(chore(bank,act,bank.lastAt).state);
 while(north(bank).run)bank=run(bank,'northFinish',null,{seq:north(bank).seq,runId:north(bank).run.id});
 assert.ok(north(bank).atkXP>=40&&north(bank).hpXP>=40,`only banked ${north(bank).atkXP}/${north(bank).hpXP} XP`);
 assert.ok(valid(bank),'the banked save is legal, so every grid point derived from it is too');
 // Three Supplies is exactly one full three-floor descent, so each grid point is one expedition.
 const at=(atkLevel,hpLevel)=>{
  let s=bank;
  for(let i=0;i<atkLevel;i++)s=run(s,'northTrain','atk',{seq:north(s).seq});
  for(let i=0;i<hpLevel;i++)s=run(s,'northTrain','hp',{seq:north(s).seq});
  return {...s,northern:{...north(s),supplies:3,recoverAt:s.lastAt+3600000}};
 };
 const grid=[0,1,2,3,5,7,10];
 let cleared=0,fought=0;
 for(const atkLevel of grid)for(const hpLevel of grid){
  const start=at(atkLevel,hpLevel),before=north(start).history.length;
  const out=chore(start,act,start.lastAt),n=north(out.state),where=`ATK+${atkLevel} HP+${hpLevel}`;
  for(const h of n.history.slice(before))assert.notEqual(h.outcome,'lost',`${where}: the helper lost an expedition`);
  assert.notEqual(n.run?.status,'lost',`${where}: the helper left an expedition dead`);
  if(n.run)assert.ok(n.run.hp>0,`${where}: an expedition was left at ${n.run.hp} HP`);
  assert.ok(valid(out.state),`${where}: the chore produced an illegal save`);
  fought++;
  if(n.history.slice(before).some(h=>h.outcome==='cleared'))cleared++;
 }
 assert.equal(fought,grid.length**2);
 assert.ok(cleared>0,`positive control: no grid point cleared all ${NORTH.floors} floors, so nothing was played`);

 // NEGATIVE CONTROL, and the reason this test is not vacuous: the same grid, played by the obvious
 // shallow policy -- reveal tiles in order, swing whenever the beast is standing -- DOES lose runs.
 // So "never lost" is a property of the policy, not of a grid where losing was impossible.
 let reckless=0;
 for(const atkLevel of grid)for(const hpLevel of grid){
  let s=at(atkLevel,hpLevel);
  const fire=(a,t)=>{const n=north(s),r=act(s,a,s.lastAt,t,{seq:n.seq,runId:n.run?.id});if(!r.error&&r.state)s=r.state;return !r.error};
  fire('northStart',null);
  for(let step=0;step<CHORE_STEP_CAP&&north(s).run;step++){
   const r=north(s).run,q=activeRoom(r);
   if(r.status==='lost')break;
   if(r.status==='gate'){if(!fire('northNext',null))break;continue}
   if(r.status!=='exploring')break;
   if(!q.tiles[4]){fire('northAttack',4);continue}
   const next=q.tiles.findIndex((v,i)=>!v&&i!==4);
   if(next<0||!fire('northTile',next))break;
  }
  if(north(s).run?.status==='lost')reckless++;
 }
 assert.ok(reckless>0,'the reckless control never died, so this grid cannot prove the policy safe');});

test('an expedition the PLAYER left in a hopeless position is banked, not fought',()=>{
 // The helper only enters a floor it can clear, so on its own runs the mid-fight check never fires.
 // It exists for the run it did not start: a player can swing recklessly, drink both warm springs and
 // close the tab, leaving a live beast and too little HP. Attacking there loses every unbanked coin,
 // so the rule is to take northFinish. This save is that position, and it is a legal one.
 const s=armed(),tiles=[true,true,true,true,false,true,true,true,false];
 // No Supplies left, so the chore cannot start a fresh expedition afterwards and `seen` is just this one.
 const doomed={...s,northern:{policyVersion:1,seq:9,supplies:0,recoverAt:s.lastAt+3600000,coins:0,
  atkXP:0,hpXP:0,atkLevel:0,hpLevel:0,consumed:1,history:[],exchanges:[],
  run:{policyVersion:1,id:9,startedAt:s.lastAt,power:100,atk:2,maxHP:30,hp:NORTH.retaliation[0],paid:1,
   rooms:[{floor:1,tiles,monsterHP:NORTH.monsterHP[0],hits:0}],coins:15,atkXP:4,hpXP:4,status:'exploring'}}};
 assert.ok(valid(doomed),'the hopeless position is a save the game would actually load');
 // Positive control: this really is hopeless -- every spring is gone and the next blow would land last.
 assert.equal(northSurvive(NORTH.retaliation[0],30,2,NORTH.monsterHP[0],0,NORTH.retaliation[0]),null);
 const seen=[];
 const spy=(state,action,now,target,value)=>{seen.push(action);return act(state,action,now,target,value)};
 const out=HELPER_TASKS.find(t=>t.id==='northern').run(doomed,spy,doomed.lastAt);
 assert.ok(!seen.includes('northAttack'),'the helper swung at a beast that would have killed it');
 assert.equal(seen[0],'northFinish','it banked the floor instead');
 const n=northern(out.state);
 assert.equal(n.history[0].outcome,'returned');
 assert.equal(n.history[0].banked,15,'the three caches this floor had already paid were kept');
 assert.ok(valid(out.state));});

test('neither new chore can spend gold or crystals, and northTrain is never dispatched',()=>{
 // The SPENDING regex above is keyed to action-name prefixes, and every action these two chores
 // dispatch begins "banquet" or "north" -- so it would not catch a bad one. Pin the set directly.
 const chore=id=>HELPER_TASKS.find(t=>t.id===id).run;
 const seen=new Set();
 const record=(state,action,now,target,value)=>{seen.add(action);return act(state,action,now,target,value)};
 const s=armed();
 let out=chore('banquets')(s,record,s.lastAt);
 assert.ok(out.state.gold>=s.gold&&out.state.crystals>=s.crystals,'banquets moved gold or crystals');
 // First descent banks expedition coins; the second spends them, because the exchange runs first.
 out=chore('northern')(out.state,record,s.lastAt);
 assert.ok(northern(out.state).coins>=30,'positive control: a descent banked coins there were to spend');
 out=chore('northern')(out.state,record,s.lastAt);
 assert.ok(out.state.gold>=s.gold&&out.state.crystals>=s.crystals,'the north moved gold or crystals');
 assert.ok(seen.has('northExchange'),'banked coins were never spent on the one fixed item');
 assert.ok(!seen.has('northTrain'),'the helper bought an upgrade');
 assert.ok(!seen.has('banquetBuy'),'the helper shopped');
 assert.ok(valid(out.state));
 for(const a of seen)assert.match(a,/^(banquet|north)/,`${a} is not one of these two systems`);});

// A HABIT REFILL IS THE SCARCEST THING THE HELPER TOUCHES -- one a day, and clamped to what will fit.
// baitRefill hands over min(12, storage - bait) and stamps refillDay EITHER WAY, so taking it on a
// nearly-full stock throws most of it away. The helper used to do exactly that: the bait task sat at
// position 7 and the fishing chore at 10, so it refilled before it fished.
test('the helper never spends a habit refill into a nearly-full stock',()=>{
 const busy=()=>{let s={...fresh(T),habits:starterHabits(T)};
  for(const h of s.habits.items.filter(x=>x.freq==='daily').slice(0,20)){const r=act(s,'habitComplete',s.lastAt,h.id);if(!r.error)s=r.state}
  return s};
 const at=b=>{const s=busy();return {...s,fishing:{...fishingState(s),bait:b,refillDay:null}}};

 // A nearly-full stock: the refill alone would hand over 5 of 12 and burn the day.
 const full=at(BAIT_STORAGE-5);
 const wasted=act(full,'baitRefill',full.lastAt);
 assert.equal(fishingState(wasted.state).bait-(BAIT_STORAGE-5),5,'the naive order really does waste 7');

 // Through the helper, the stock is fished down first, so the refill is not thrown away.
 const run=act(full,'helperRun',full.lastAt);
 assert.equal(run.error,undefined,run.error);
 const f=fishingState(run.state);
 const netIn=f.catches.length+f.bait-(BAIT_STORAGE-5);
 assert.ok(netIn>5,`the helper brought in ${netIn} bait, more than the 5 a naive refill would have`);
 assert.ok(f.catches.length>0,'and it actually fished');

 // ORDER IS THE MECHANISM, so pin it: the fishing chore must come before the standalone bait task.
 const ids=HELPER_TASKS.map(t=>t.id);
 assert.ok(ids.indexOf('fishing')<ids.indexOf('bait'),
  'the bait refill must run AFTER the fishing chore, or it refills into a full stock');});
