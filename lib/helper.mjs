import {habitDay,habitEarnings} from './habits.mjs';
import {FARM_PLANTS,farmHarvestPlan,farmPlantLevel} from './farm.mjs';
import {FISHING_GROUNDS,groundLevel,fishingLevel,fishingState,castKey,fishingIndex} from './fishing.mjs';
import {INN_GUESTS,innGuestReady} from './inn-guests.mjs';
import {expoStepKey} from './expo.mjs';
import {ROAM_QUICK_MAX,roamStamina,roamingState} from './roaming.mjs';
import {TRADE_OPPONENTS,tradingPost,negotiationEnergy} from './trading-post.mjs';
import {FELLOWS} from './catalog.mjs';
import {bondedPower} from './adventure.mjs';
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

/** LOCAL POLICY for the Trading Post. Read the payout before reading the opponents: tradingAction sets
 *  coinPerWin:30 and influencePerWin:2 as CONSTANTS -- a win pays the same against the Apprentice as
 *  against the Veteran -- and every Fellow on the team pays one Negotiation Energy whether they win or
 *  lose (`paidEnergy:1`, and validRun pins `won === power >= opponent.power`). So Power above the win
 *  threshold buys nothing, and a Fellow who cannot clear it is pure loss. Two rules follow:
 *   - OPPONENT: the WEAKEST of TRADE_OPPONENTS. Because the test is a single `>=` against one number, a
 *     weaker opponent's winner set CONTAINS every stronger one's, so it can never yield fewer wins, and
 *     it yields them from the cheapest Fellows.
 *   - TEAM: up to six energised Fellows who beat it, taken from the WEAKEST up. A stronger Fellow wins
 *     everything a weaker one wins, so spending the weak ones first costs no reward today and leaves the
 *     strong ones' Energy for a harder opponent the player may pick by hand.
 *  If nobody with Energy clears even the weakest opponent, this returns null and the chore begins
 *  nothing: a losing run burns Energy for zero coins. Power is bondedPower(), the formula the module and
 *  the panel already use -- not one invented here. */
export function bestNegotiation(s){
 if(!s.fellows)return null;
 const opponent=TRADE_OPPONENTS.reduce((a,b)=>a&&a.power<=b.power?a:b,null);
 if(!opponent)return null;
 // Walk FELLOWS rather than the save's keys, exactly as the panel's roster does: tradeBegin looks the
 // name up in FELLOWS, so an id on the save that is not in the catalogue is not a fieldable Fellow.
 const ready=FELLOWS.filter(f=>s.fellows[f.id]&&negotiationEnergy(s,f.id).energy>=1&&bondedPower(s,f.id)>=opponent.power)
  .map(f=>({id:f.id,power:bondedPower(s,f.id)}))
  .sort((a,b)=>a.power-b.power||(a.id<b.id?-1:1));
 if(!ready.length)return null;
 return {opponent:opponent.id,team:ready.slice(0,6).map(p=>p.id)};// validRun caps a team at six.
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
 // Provenance for these two, measured rather than guessed: hosted_mapping.json has NO executor matching
 // roam/travel/trade/negotiation (positive control -- pickBuild, cityHarvest, gainBait, collectionTax and
 // harvestOneKey all come back from the same search). So neither chore claims a row it does not have. The
 // nearest original relatives are _11 gainBait, whose daily refill is the pattern the stamina refill
 // copies, and _40 hostedCommercialwarTax, the merchant-competition takings a single-player Trading Post
 // is the adaptation of.
 {id:'roaming',   label:'Roam while stamina lasts',  note:'Local chore; refill follows Trusteeship_11 gainBait', run:runRoaming},
 {id:'trading',   label:'Run the Trading Post',      note:'Local chore; nearest is Trusteeship_40 hostedCommercialwarTax', run:runTrading},
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
/** LOCAL POLICY for Roaming: spend the stock down first, THEN take the habit refill, then spend what it
 *  gave. Two measured facts make that the optimal order, not a preference. (a) Stamina recovers 1 per
 *  ROAM_RECOVERY_MS up to roamCap and stops there -- recovery at the cap is capacity thrown away, so a
 *  full stock is the only stock that can waste. (b) roamRefill clamps to the cap (`Math.min(st.cap,
 *  st.stamina+...)`) and stamps refillDay either way, so refilling at 18/20 spends the one daily refill
 *  for 2 points instead of up to ROAM_REFILL_MAX. Every roam pays the same ROAM_FAME and the encounter is
 *  decided by a caller-supplied roll, so there is no better or worse moment to roam: the only thing there
 *  is to optimise is not wasting capacity. The refill is included for the same reason the bait refill is
 *  (Trusteeship_11 gainBait): it spends no gold or crystals, it is gated on the very daily habit that
 *  already armed the helper, and roamRefill refuses it a second time on its own. */
function runRoaming(s,act,now){
 let steps=0;
 // roamOnce reads s.family and s.inventory directly and roamStamina reads the rank; a save without them
 // has no Roaming to drive. `s.roaming` is NOT the test -- roamingState() defaults it, and a save that
 // has never roamed carries no such key, so gating on it would make this chore dead on every new save.
 if(!s.family||!s.inventory)return {state:s,steps:0};
 const spend=()=>{
  while(steps<CHORE_STEP_CAP){
   const st=roamStamina(s),seq=roamingState(s).seq;
   const n=Math.min(st.stamina,ROAM_QUICK_MAX,CHORE_STEP_CAP-steps);
   if(n<1)break;
   // The rolls come from the caller: roaming-panel.tsx taps Go with {seq,roll:Math.random()} for a single
   // point and Quick roam with {seq,rolls:[...Math.random()]} capped at ROAM_QUICK_MAX. Same shapes here,
   // and seq is re-read every dispatch because each roam increments it.
   const r=n===1?act(s,'roamGo',now,null,{seq,roll:Math.random()})
                :act(s,'roamQuick',now,null,{seq,rolls:Array.from({length:n},()=>Math.random())});
   if(!r||r.error||!r.state)break;
   steps+=Math.max(1,st.stamina-roamStamina(r.state).stamina);
   s=r.state;
  }
 };
 spend();
 if(steps<CHORE_STEP_CAP){
  const r=act(s,'roamRefill',now,null,{seq:roamingState(s).seq});
  if(r&&!r.error&&r.state){s=r.state;steps++;spend()}
 }
 return {state:s,steps};
}
function runTrading(s,act,now){
 let steps=0;
 // tradeBegin requires owned Fellows; without the roster there is nothing to field.
 if(!s.fellows)return {state:s,steps:0};
 // COMPLETE before BEGIN, in that order: a saved run makes tradeBegin fail outright ('Complete your saved
 // negotiation first'), and a finished run's rewards were fixed when it started, so banking it is free.
 // tradeComplete is keyed by the RUN's id -- a number on s.tradingPost.run -- not by an opponent id.
 const saved=tradingPost(s).run;
 if(saved&&s.lastAt>=saved.readyAt){
  const r=act(s,'tradeComplete',now,saved.id,{seq:tradingPost(s).seq});
  if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 if(steps<CHORE_STEP_CAP&&!tradingPost(s).run){
  const plan=bestNegotiation(s);
  if(plan){
   const r=act(s,'tradeBegin',now,plan.opponent,{seq:tradingPost(s).seq,team:plan.team});
   if(r&&!r.error&&r.state){s=r.state;steps++}
  }
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
