import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {INN_GUESTS} from '../lib/inn-guests.mjs';
import {expoStepKey} from '../lib/expo.mjs';
import {BANQUET_PARTIES,banquetState} from '../lib/banquets.mjs';
import {NORTH,northern,tileKind,activeRoom} from '../lib/northern.mjs';
import {bestBanquetParty,northSurvive} from '../lib/helper.mjs';
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
 // ONE STATED EXCEPTION. This assertion used to read "a second run finds EVERY gate closed", which
 // was true only while every chore exhausted its input inside one run. The Northern Odyssey does not:
 // Supplies regenerate hourly to a cap of 12 and a single run's CHORE_STEP_CAP spends about four, so
 // a second run at the same instant legitimately still has Supplies -- exactly as the player's own
 // button would. It is not day-gated, so it is switched off here rather than the guard being softened.
 const noNorth=run(once,'helperToggle','northern',false);
 const twice=act(noNorth,'helperRun',noNorth.lastAt);
 assert.match(twice.error,/Nothing was waiting/,'a second run the same day finds every day-gate closed');
 // The banquet habit refill is day-gated (refillDay) and must be one of the gates that stayed shut.
 assert.equal(once.banquets.refillDay,run(start,'helperRun').banquets.refillDay,'the banquet refill is stamped once a day');
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

 // Banquets: the three actions do NOT agree on what a target is. Prepare and host take a PARTY id;
 // claim takes the RUN id. All three also refuse unless value.seq matches the subtree's seq, so the
 // envelope is pinned here too -- a chore that sent the right target in the wrong envelope would be
 // exactly as dead as one that sent a stall id to serveExpo.
 const seqStub=()=>{const seen=[];return [seen,(state,action,now,target,value)=>{seen.push({action,target,value});return {error:'stub'}}]};
 const party=BANQUET_PARTIES.reduce((a,b)=>b.seats>a.seats?b:a);
 const pantry=Object.fromEntries(party.materials.map(id=>[id,3]));
 const hostSave={banquets:{policyVersion:1,seq:11,coins:0,popularity:0,pantry,run:null,history:[],shop:{day:0,bought:{}}}};
 [seen,stub]=seqStub();
 chore('banquets')(hostSave,stub,T);
 assert.equal(seen.length,1,'the Banquet chore dispatched');
 assert.equal(seen[0].action,'banquetHost');
 assert.ok(BANQUET_PARTIES.some(p=>p.id===seen[0].target),`${seen[0].target} is not a party id`);
 assert.deepEqual(seen[0].value,{seq:11},'banquetAction refuses any other seq');
 // And with a banquet already laid, the first thing asked for is a CLAIM keyed by the run id.
 const laid={banquets:{...hostSave.banquets,seq:12,pantry:{},run:{id:9,kind:party.id,guests:['a'],startedAt:0,intervalMs:5000}}};
 [seen,stub]=seqStub();
 chore('banquets')(laid,stub,T);
 assert.equal(seen[0].action,'banquetClaim');
 assert.equal(seen[0].target,9,'banquetClaim matches r.id, not a party id');
 assert.deepEqual(seen[0].value,{seq:12});

 // Northern: run-scoped actions check value.runId against the CURRENT run as well as value.seq, and
 // northTile takes a tile INDEX. A party id or a floor number here would silently never resolve.
 const north=(run,extra={})=>({fellows:{},inventory:{[NORTH.exchangeItem]:0},
  northern:{policyVersion:1,seq:21,supplies:5,recoverAt:1,coins:0,atkXP:0,hpXP:0,atkLevel:0,hpLevel:0,consumed:1,run,history:[],exchanges:[],...extra}});
 const tiles=(...on)=>Array.from({length:9},(_,i)=>on.includes(i));
 const runAt=(t,over={})=>({policyVersion:1,id:7,startedAt:0,power:0,atk:2,maxHP:30,hp:30,paid:1,coins:0,atkXP:0,hpXP:0,status:'exploring',
  rooms:[{floor:1,tiles:t,monsterHP:6,hits:0}],...over});
 [seen,stub]=seqStub();
 chore('northern')(north(runAt(tiles())),stub,T);
 assert.equal(seen[0].action,'northTile','free tiles are swept before the first swing');
 assert.equal(typeof seen[0].target,'number');
 assert.ok(seen[0].target>=0&&seen[0].target<=8&&tileKind(seen[0].target)!=='monster','a tile index, and not the beast');
 assert.deepEqual(seen[0].value,{seq:21,runId:7},'seq AND runId, or the action refuses');
 // With every free tile gone the beast is next, and northAttack is keyed to the beast's own index.
 [seen,stub]=seqStub();
 chore('northern')(north(runAt(tiles(0,1,2,3,5,6,7))),stub,T);
 assert.equal(seen[0].action,'northAttack');
 assert.equal(tileKind(seen[0].target),'monster',`tile ${seen[0].target} is not the ice beast`);
 // At the signpost the chore either continues or banks -- never a stale runId either way.
 [seen,stub]=seqStub();
 chore('northern')(north(runAt(tiles(0,1,2,3,4,5,6,7,8),{status:'gate',hp:30,rooms:[{floor:1,tiles:tiles(0,1,2,3,4,5,6,7,8),monsterHP:0,hits:3}]})),stub,T);
 assert.ok(['northNext','northFinish'].includes(seen[0].action),seen[0].action);
 assert.deepEqual(seen[0].value,{seq:21,runId:7});
 // Banked coins are converted before the map, so the step cap cannot starve the exchange.
 [seen,stub]=seqStub();
 chore('northern')(north(null,{coins:90}),stub,T);
 assert.equal(seen[0].action,'northExchange','coins banked earlier are spent first');

 // Positive control: with the system absent, each chore correctly does nothing rather than throwing.
 for(const id of ['expo','innGuests','farm','fishing','banquets','northern']){
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
// BANQUETS and NORTHERN ODYSSEY.
// ---------------------------------------------------------------------------------------------

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
