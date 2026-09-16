import {habitDay,habitEarnings} from './habits.mjs';
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
];
const IDS=new Set(HELPER_TASKS.map(t=>t.id));
export const freshHelper=()=>({tasks:Object.fromEntries(HELPER_TASKS.map(t=>[t.id,1])),ranAt:0});
export const helperState=s=>s.helper&&typeof s.helper==='object'&&!Array.isArray(s.helper)?s.helper:freshHelper();
export const helperEnabled=(s,id)=>helperState(s).tasks?.[id]===1;
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
  const queue=HELPER_TASKS.filter(t=>h.tasks?.[t.id]===1).slice(0,HELPER_RUN_CAP);
  if(!queue.length)return fail('Every helper task is switched off.');
  let state=s;const done=[],skipped=[];
  for(const t of queue){
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
