import {habitDay,habitEarnings} from './habits.mjs';
import {FARM_PLANTS,farmHarvestPlan,farmPlantLevel} from './farm.mjs';
import {FISHING_GROUNDS,groundLevel,fishingLevel,fishingState,castKey,fishingIndex} from './fishing.mjs';
import {INN_GUESTS,innGuestReady} from './inn-guests.mjs';
import {expoStepKey} from './expo.mjs';
// The Little Helper -- Everkai's equivalent of the original's Trusteeship system (QOL-01).
//
// WHAT THE ORIGINAL DOES, measured from configs/config/logic/Trusteeship.json (40 rows under a
// `Trusteeship` wrapper key) and the private-server executor map (outputs/private-server/
// hosted_mapping.json, which names every executor's result key):
//   - 40 tasks grouped into 20 categories by `superiors`, ordered by `order`.
//   - `isSelect` is the DEFAULT-ON flag: 36 of 40 rows carry it, 4 are default off.
//   - 14 of 40 carry an `unlockCondition` -- the task is hidden until its own system is open
//     (SimGame1_Level 7, UnlockFirstMedicine, fish_guide, MuseumGuide, PetTowerGuide, PlayerLevel...).
//   - zxSystemConstant.TrusteeshipOutMaxCount = 50 caps one run.
// The executor names settle what the feature is FOR: pickBuild, cityHarvest, harvestOneKey, gainBait,
// museumInfo, petTowerData, simgameOneWelcome, simgameCollect, hostedMedicineInfo, dailyPackage,
// collectionTax. It is a COLLECTION automator. Not one executor spends, upgrades or chooses.
//
// WHAT EVERKAI DOES WITH IT. Two deliberate differences, both stated rather than silent:
//  1. The original SELLS the helper (PanelTrusteeshipBuy.lua: btn_costItem/btn_voucher/btn_recharge,
//     CheckTrusteesshipIsFree). Everkai has no monetisation, so the gate is the game's own currency:
//     completing a daily habit arms the helper for that day. Same gate as the bait refill.
//  2. The helper REPLAYS THE PLAYER'S OWN ACTIONS through act(). It has no reward table and grants
//     nothing directly, so it cannot become a faucet -- every per-day gate (museumDay, supplyDay,
//     restockDay, refillDay) still refuses it exactly as it refuses a tap. That is the whole safety
//     argument, and tests/helper.test.mjs is the negative control for it.
// Tasks are listed in the original's own spirit: collect-only. Anything that spends is NOT here.
export const HELPER_RUN_CAP=50;
// The cap the original puts on one helper run. Chores that loop (casting, sowing) share it rather than
// running until a resource is exhausted, so a run is always bounded and always explainable.
export const CHORE_STEP_CAP=HELPER_RUN_CAP;

// ---------------------------------------------------------------------------------------------
// MINIGAME CHORES. The first version of this file automated collection only, on the reading that the
// original's Trusteeship executors all collect. That reading was too narrow: harvestOneKey (_10),
// simgameOneWelcome (_31) and sg3OrderCommitOneKey (_28) PLAY their minigame's repetitive loop, they
// do not merely bank its takings. So the helper does the chores too.
//
// The line that does NOT move: it never buys an upgrade, a level, a character or a building. Where a
// chore has to CHOOSE, the rule is written here as a local policy rather than left to look like the
// original's -- the original's helper has no such policy, because in the original the player has
// already chosen and the helper only repeats. These rules are mine, and are stated so they can be argued
// with. The invariant a test pins: a helper run never decreases gold or crystals.
// ---------------------------------------------------------------------------------------------

/** LOCAL POLICY: sow the plant with the best throughput -- most crop per hour at the level this farm
 *  has actually earned for it -- and break ties toward the shorter timer so a plot cycles sooner. */
export function bestPlant(s){
 const f=s.farm;if(!f)return null;
 let best=null;
 for(const plant of FARM_PLANTS){
  const level=farmPlantLevel(f,plant.id),plan=farmHarvestPlan(plant.id,level);
  if(!plan||!plan.seconds)continue;
  const rate=plan.amount/plan.seconds;
  if(!best||rate>best.rate||(rate===best.rate&&plan.seconds<best.seconds))best={id:plant.id,rate,seconds:plan.seconds};
 }
 return best&&best.id;
}
/** LOCAL POLICY: fish the deepest ground this fishing level has opened. Deeper grounds carry the species
 *  a collection is still missing; a lower one would keep drawing fish already in the book. */
export function bestGround(s){
 const f=s.fishing;if(!f)return null;
 const have=fishingLevel(fishingIndex(f).exp).level;
 let best=null,bestLevel=-1;
 for(const g of Object.keys(FISHING_GROUNDS)){
  const need=groundLevel(g);
  if(need===null||need>have)continue;
  if(need>bestLevel){bestLevel=need;best=g}
 }
 return best;
}

export const HELPER_TASKS=[
 // `waiting` exists only where the underlying action SUCCEEDS on an empty claim: `collect` banks
 // zero gold and still returns a state, so without this the helper would report a chore it did not do.
 {id:'village',   action:'collect',                 label:'Collect village earnings', note:'Trusteeship_14 pickBuild / _34 cityHarvest', waiting:s=>Math.floor(s.pending)>=1},
 {id:'inn',       action:'collectInnDeposit',       label:'Collect the Inn takings',  note:'Trusteeship_32 simgameCollect'},
 {id:'workshop',  action:'collectWorkshop',         label:'Collect the Workshop',     note:'Trusteeship_28 sg3OrderCommitOneKey'},
 {id:'apothecary',action:'potionCollect',           label:'Collect the Apothecary',   note:'Trusteeship_35/36 hostedMedicineInfo'},
 {id:'museum',    action:'claimMuseum',             label:'Claim Museum revenue',     note:'Trusteeship_27 museumInfo'},
 {id:'familiars', action:'collectFamiliarSupplies', label:'Collect familiar supplies',note:'Trusteeship_30 petTowerData'},
 {id:'bait',      action:'baitRefill',              label:'Refill fishing bait',      note:'Trusteeship_11 gainBait'},
 {id:'supplies',  action:'claimStaffingMaterials',  label:'Claim the daily materials',note:'Trusteeship_18 dailyPackage'},
 // Chores below RUN a loop instead of firing one action. `run` returns the state it reached and how many
 // steps it took; 0 steps means nothing was waiting and the task reports as skipped.
 {id:'farm',      label:'Work the Magic Farm',       note:'Trusteeship_10 harvestOneKey',      run:runFarm},
 {id:'fishing',   label:'Fish while bait lasts',     note:'Trusteeship_11 gainBait',           run:runFishing},
 {id:'innGuests', label:'Welcome the Inn guests',    note:'Trusteeship_31 simgameOneWelcome',  run:runInnGuests},
 {id:'expo',      label:'Serve the Expo stalls',     note:'Trusteeship_37 hostedTDHangupReward',run:runExpo},
 {id:'restock',   action:'restockWorkshop',          label:'Restock the Workshop',             note:'Trusteeship_28 sg3OrderCommitOneKey'},
 {id:'banquets',  label:'Run the Private Banquets',   note:'Local chore: no banquet executor in hosted_mapping.json', run:runBanquets},
 {id:'northern',  label:'Explore the Northern Odyssey',note:'Local chore: no dungeon executor in hosted_mapping.json',run:runNorthern},
];

// Each runner drives the SAME actions the player taps, through the same act(). None of them chooses an
// upgrade, and none spends gold or crystals -- sowing and watering actually PAY Knowledge rather than
// costing it, and a cast spends bait, which the daily refill replaces.
function runFarm(s,act,now){
 let steps=0;const f=()=>s.farm;
 if(!f())return {state:s,steps:0};
 const plots=()=>f().plots||[];
 // Harvest first, so the plot it frees can be re-sown in the same run.
 for(let i=0;i<plots().length&&steps<CHORE_STEP_CAP;i++){
  const r=act(s,'harvestFarm',now,i,null);if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 for(let i=0;i<plots().length&&steps<CHORE_STEP_CAP;i++){
  const r=act(s,'waterFarm',now,i,null);if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 const plant=bestPlant(s);
 if(plant)for(let i=0;i<plots().length&&steps<CHORE_STEP_CAP;i++){
  const r=act(s,'sowFarm',now,i,plant);if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 return {state:s,steps};
}
function runFishing(s,act,now){
 let steps=0;
 if(!s.fishing)return {state:s,steps:0};
 const ground=bestGround(s);
 if(!ground)return {state:s,steps:0};
 while(steps<CHORE_STEP_CAP&&(fishingState(s).bait||0)>0){
  const r=act(s,'castFish',now,castKey(s),ground);
  if(!r||r.error||!r.state)break;
  s=r.state;steps++;
 }
 return {state:s,steps};
}
function runInnGuests(s,act,now){
 let steps=0;
 if(!s.inn)return {state:s,steps:0};
 // The guest list is the shipped rule set, not a queue on the save. innGuestReady is the same gate the
 // panel shows, so the helper offers exactly the visits the player could accept.
 for(const rule of INN_GUESTS){
  if(steps>=CHORE_STEP_CAP)break;
  if(!innGuestReady(s,rule))continue;
  const r=act(s,'serveInnSpecial',now,rule.id,null);
  if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 return {state:s,steps};
}
function runExpo(s,act,now){
 let steps=0;
 // serveExpo is keyed by the CURRENT STEP of the active business day, not by a stall id -- serving is
 // a sequence of five customers, so the key has to be re-read after every step.
 while(steps<CHORE_STEP_CAP&&s.expo?.active){
  const key=expoStepKey(s);
  if(!key)break;
  const r=act(s,'serveExpo',now,key,null);
  if(!r||r.error||!r.state)break;
  s=r.state;steps++;
 }
 return {state:s,steps};
}
const IDS=new Set(HELPER_TASKS.map(t=>t.id));
export const freshHelper=()=>({tasks:Object.fromEntries(HELPER_TASKS.map(t=>[t.id,1])),ranAt:0});
export const helperState=s=>s.helper&&typeof s.helper==='object'&&!Array.isArray(s.helper)?s.helper:freshHelper();
/** A task is on unless it was explicitly switched OFF. That matters for saves written before a chore
 *  existed: their stored `tasks` map has no key for it, and requiring ===1 would deliver every new
 *  chore switched off, where the original ships 36 of its 40 default-on. An explicit 0 still wins. */
export const helperEnabled=(s,id)=>helperState(s).tasks?.[id]!==0;
/** Armed by the same daily habit that refills bait. Returns '' when armed, or the reason it is not. */
export function helperBlocked(s){
 const {dailies}=habitEarnings(s.habits,s.lastAt);
 return dailies<1?'Complete a daily habit to send the Little Helper out.':'';
}

export function validHelper(s){
 const h=s.helper;
 if(h===undefined)return true;
 if(!h||typeof h!=='object'||Array.isArray(h))return false;
 if(!h.tasks||typeof h.tasks!=='object'||Array.isArray(h.tasks))return false;
 for(const [id,v] of Object.entries(h.tasks))if(!IDS.has(id)||(v!==0&&v!==1))return false;
 return Number.isSafeInteger(h.ranAt)&&h.ranAt>=0;
}

/** `act` is passed in rather than imported: game.mjs imports this module, so importing act here
 *  would close a cycle. It also keeps the runner honest -- there is no path to state that does not
 *  go through the same act() a tap goes through. */
export function helperAction(s,action,now,target,value,act){
 const fail=m=>({error:m});
 if(action==='helperToggle'){
  if(!IDS.has(target))return fail('Unknown helper task.');
  if(value!==true&&value!==false)return fail('Choose on or off.');
  const h=helperState(s);
  return {state:{...s,helper:{...h,tasks:{...h.tasks,[target]:value?1:0}}},message:`${HELPER_TASKS.find(t=>t.id===target).label}: helper ${value?'on':'off'}.`};
 }
 if(action==='helperRun'){
  const blocked=helperBlocked(s);if(blocked)return fail(blocked);
  const h=helperState(s);
  const queue=HELPER_TASKS.filter(t=>h.tasks?.[t.id]!==0).slice(0,HELPER_RUN_CAP);
  if(!queue.length)return fail('Every helper task is switched off.');
  let state=s;const done=[],skipped=[];
  for(const t of queue){
   if(t.run){const out=t.run(state,act,now);if(out.steps>0){state=out.state;done.push(`${t.label} (${out.steps})`)}else skipped.push(t.label);continue}
   if(t.waiting&&!t.waiting(state)){skipped.push(t.label);continue}
   const r=act(state,t.action,now,null,null);
   if(r&&!r.error&&r.state){state=r.state;done.push(t.label)}else skipped.push(t.label);
  }
  if(!done.length)return fail('Nothing was waiting: '+skipped.length+' task'+(skipped.length===1?'':'s')+' had nothing to do.');
  const hh=helperState(state);
  return {state:{...state,helper:{...hh,ranAt:now}},
   message:`Little Helper did ${done.length} chore${done.length===1?'':'s'}: ${done.join(', ')}.`+(skipped.length?` ${skipped.length} had nothing waiting.`:'')};
 }
 return null;
}

// ---------------------------------------------------------------------------------------------
// BANQUETS and NORTHERN ODYSSEY. Appended whole, imports included -- ESM hoists them, and keeping
// them here keeps this block readable as one unit.
//
// PROVENANCE, measured rather than assumed. outputs/private-server/hosted_mapping.json names the
// executor behind each of the 40 Trusteeship rows; scanned for ceremony, banquet, dungeon and north
// it returns nothing. Positive control for that claim of absence (CLAUDE.md rule 2): the same scan
// over the same file returns hostedMedicineInfo and hostedTDHangupReward, two names the task table
// above already cites. So neither of these chores has an original counterpart, and every policy
// below is OURS. They are written out so they can be argued with rather than inferred from code.
// ---------------------------------------------------------------------------------------------
import {BANQUET_PARTIES,banquetState} from './banquets.mjs';
import {NORTH,northern,northernStats,northernSupplies,activeRoom,tileKind} from './northern.mjs';

/** LOCAL POLICY (banquets): the PANTRY is the scarce input, not the clock. banquetPrepare is
 *  habit-gated and stamps refillDay, so it stocks at most PANTRY_REFILL_MAX sets once a day, while
 *  banquetHost spends exactly one of each of the chosen party's two materials -- the same two-item
 *  cost for every shipped party. The payout is coinsPerGuest x seats and banquetHost fixes
 *  coinsPerGuest at 100 for every party, so coins per material set is 100 x seats: the Fine Wine
 *  Party (8 seats) pays 800 where the Wine Party (4 seats) pays 400, for an identical cost.
 *  The clock does NOT break that tie and is not the reason for the rule -- both parties seat one
 *  guest every intervalMs, so both earn 100/intervalMs, twenty coins a second. Per SECOND they are
 *  equal; per material SET the larger party is worth double, and material sets are what runs out.
 *  So: prepare for, and host, the largest party available. With `affordable`, the largest party the
 *  pantry can already pay for -- the material test is banquetHost's own guard, copied not restated. */
export function bestBanquetParty(s,affordable){
 const {pantry}=banquetState(s);
 let best=null;
 for(const p of BANQUET_PARTIES){
  if(affordable&&p.materials.some(id=>!(pantry[id]>0)))continue;
  if(!best||p.seats>best.seats)best=p;
 }
 return best&&best.id;
}

// TARGETS, read off banquetAction rather than guessed -- the three do not agree with each other:
// banquetPrepare and banquetHost take a PARTY id (`partyById.get(target)`), banquetClaim takes the
// RUN id (`r.id!==target`), and all three refuse unless `value.seq` equals the banquet subtree's
// current seq, which is the same envelope app/banquet-panel.tsx sends. Nothing here dispatches
// banquetBuy: that exchange is a menu of items with different uses, and choosing is the player's.
function runBanquets(s,act,now){
 let steps=0,prepared=false;
 // Both subtrees are created lazily, so absence is not "system closed". But with neither a banquet
 // record nor a habit record there is provably nothing any of the three actions could do.
 if(!s.banquets&&!s.habits)return {state:s,steps:0};
 const dispatch=(action,target)=>{
  const r=act(s,action,now,target,{seq:banquetState(s).seq});
  if(r&&!r.error&&r.state){s=r.state;steps++;return true}
  return false;
 };
 while(steps<CHORE_STEP_CAP){
  const b=banquetState(s);
  // Claim is ATTEMPTED, never predicted: seatedGuests is a function of the settled clock and that
  // gate belongs to the action. A banquet still seating simply refuses, exactly as the button does.
  if(b.run&&dispatch('banquetClaim',b.run.id))continue;
  // One prepare per run at most: it is day-gated, so a second attempt could only ever be refused.
  if(s.habits&&!prepared){prepared=true;const party=bestBanquetParty(s,false);if(party&&dispatch('banquetPrepare',party))continue}
  if(banquetState(s).run)break; // a banquet still seating blocks hosting; nothing further this run
  const party=bestBanquetParty(s,true);
  if(party&&dispatch('banquetHost',party))continue;
  break;
 }
 return {state:s,steps};
}

// The map is a pure function of the tile index, so derive the groups from tileKind rather than
// transcribing them -- a change to the map then cannot silently desync this chore from the game.
const NORTH_MAP=Array.from({length:9},(_,i)=>tileKind(i));
const NORTH_FREE=NORTH_MAP.flatMap((k,i)=>k==='camp'||k==='cache'?[i]:[]);
const NORTH_SPRINGS=NORTH_MAP.flatMap((k,i)=>k==='heal'?[i]:[]);
const NORTH_BEAST=NORTH_MAP.indexOf('monster'),NORTH_EXIT=NORTH_MAP.indexOf('exit');

/** The northern expedition has NO randomness anywhere: tileKind is fixed, a floor's beast holds
 *  NORTH.monsterHP[floor-1], northAttack always removes exactly r.atk, retaliation is always
 *  NORTH.retaliation[floor-1] and lands even on the killing blow (NORTH.retaliationOnKillingBlow),
 *  and a warm spring restores NORTH.healing capped at maxHP. So "is this beast safe to fight?" is
 *  arithmetic, not judgement, and the helper settles it BEFORE every swing instead of hoping.
 *
 *  northSurvive replays that arithmetic for one beast and returns the HP left once it falls, or null
 *  if the expedition would reach 0 first -- which forfeits every unbanked coin. Springs are spent as
 *  LATE as possible, only when the next blow would otherwise end the run, because a spring drunk at
 *  full HP is thrown away against the maxHP cap; latest use buys the most HP. */
export function northSurvive(hp,maxHP,atk,monsterHP,springs,retaliation){
 for(let hits=Math.ceil(monsterHP/atk);hits>0;hits--){
  if(hp<=retaliation&&springs>0){hp=Math.min(maxHP,hp+NORTH.healing);springs--}
  if(hp<=retaliation)return null;
  hp-=retaliation;
 }
 return hp;
}

/** LOCAL POLICY (Northern Odyssey) -- what the helper will and will not do, and why:
 *  - It NEVER dispatches northTrain. Training buys a permanent ATK or HP level, and the helper does
 *    not buy upgrades. That it is also the one genuine judgement call in the system (ATK or HP, with
 *    no data settling which) is a second reason to leave it: it is the decision worth keeping.
 *  - It only STARTS an expedition whose first beast it can already kill, and only takes northNext
 *    into a floor whose beast it can kill. Entering a dead-end floor would still collect that floor's
 *    three caches, but a Supply has exactly one use, and a floor that is cleared is worth more per
 *    Supply than one that is not: three floors pay 3x15 plus the 20 clear bonus, 21.6 a Supply,
 *    against 15 for a dead end. So those Supplies are left for the player to spend after training.
 *  - Free tiles first. The camps and caches cost no HP, so they are revealed before the first swing;
 *    a beast that then proves unkillable still leaves this floor's coins banked by northFinish
 *    rather than lost. Springs are deliberately NOT part of that sweep -- they are the HP reserve.
 *  - It DOES spend banked expedition coins on northExchange: one fixed item, a fixed 30 coins, no
 *    menu and so no choice; expedition coins have no other sink; and the card sits in the Bag until
 *    the player uses it, so converting early costs nothing. Gold and crystals are never touched.
 *  A note on Supplies: at the cap of NORTH.supplyCap they stop regenerating altogether (recoverAt is
 *  null), so a Supply held at the cap is a pure loss. A player who would rather bank Supplies until
 *  they have trained can switch this one chore off, which is what the per-task toggle is for. */
function runNorthern(s,act,now){
 let steps=0;
 // northStart reaches northernStats, which walks s.fellows, and northExchange indexes s.inventory.
 // Without those two core save fields there is no expedition to run, so the chore does nothing.
 if(!s.fellows||!s.inventory)return {state:s,steps:0};
 const dispatch=(action,target)=>{
  // Every run-scoped action checks value.runId against the CURRENT run, so re-read it every time.
  const n=northern(s);
  const r=act(s,action,now,target,{seq:n.seq,runId:n.run?.id});
  if(r&&!r.error&&r.state){s=r.state;steps++;return true}
  return false;
 };
 const clearable=(floor,hp,maxHP,atk)=>
  northSurvive(hp,maxHP,atk,NORTH.monsterHP[floor-1],NORTH_SPRINGS.length,NORTH.retaliation[floor-1])!==null;
 // Banking comes BEFORE playing, and for a measured reason: a three-floor crawl costs about 35
 // dispatches, so with Supplies in hand the map alone reaches CHORE_STEP_CAP and an exchange placed
 // after it would be starved for as long as Supplies lasted. One sink, one price, no menu -- so
 // convert every full 30 coins already banked, then spend what is left of the cap on the map.
 while(steps<CHORE_STEP_CAP&&northern(s).coins>=30&&dispatch('northExchange',null));
 while(steps<CHORE_STEP_CAP){
  const r=northern(s).run;
  if(!r){
   const stats=northernStats(s);
   if(northernSupplies(s).supplies<1)break;
   if(!clearable(1,stats.maxHP,stats.maxHP,stats.atk))break;
   if(!dispatch('northStart',null))break;
   continue;
  }
  if(r.status!=='exploring'){
   // 'gate' is the only status carrying a decision; 'lost' and 'cleared' can only be banked.
   if(r.status==='gate'&&r.rooms.length<NORTH.floors&&northernSupplies(s).supplies>=1
    &&clearable(r.rooms.length+1,r.hp,r.maxHP,r.atk)&&dispatch('northNext',null))continue;
   if(!dispatch('northFinish',null))break;
   continue;
  }
  const q=activeRoom(r),springs=NORTH_SPRINGS.filter(i=>!q.tiles[i]),hurt=NORTH.retaliation[q.floor-1];
  const free=NORTH_FREE.find(i=>!q.tiles[i]);
  if(free!==undefined){if(!dispatch('northTile',free))break;continue}
  if(!q.tiles[NORTH_BEAST]){
   // q.monsterHP is read off the run, not recomputed, so a part-fought beast is measured as it is.
   if(northSurvive(r.hp,r.maxHP,r.atk,q.monsterHP,springs.length,hurt)===null){
    if(!dispatch('northFinish',null))break; // unkillable from here: bank this floor's caches instead
    continue;
   }
   if(r.hp<=hurt){if(!dispatch('northTile',springs[0]))break;continue}
   if(!dispatch('northAttack',NORTH_BEAST))break;
   continue;
  }
  // Beast down. The signpost refuses until all eight other tiles are resolved, springs included.
  if(springs.length){if(!dispatch('northTile',springs[0]))break;continue}
  if(!dispatch('northTile',NORTH_EXIT))break;
 }
 return {state:s,steps};
}
