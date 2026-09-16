import data from './village-event-data.json' with {type:'json'};
import {habitDay,habitEarnings} from './habits.mjs';
import {playerRank} from './progression.mjs';
// Village Events (parity rows C5 / BUG-38). Every id, weight, correct option, reward and line of
// text below is the original's, imported by scripts/import-village-events.py from
// CityDailyEvent / CitySpecialEvent / CitySpecialEvent01 / CitySpecialEventManage / CityAssignEvent
// and the English translation TextAsset (SHA-256 c884ee22… , 239,580 records; all 74 referenced
// dialog ids resolved, none missing). lib/village-event-data.json carries the per-table hashes.
export const VILLAGE_EVENTS=data;
export const VILLAGE_DAILY=data.daily;
export const VILLAGE_CHOICES=data.choices;
// The earnings-goal chain is CSEM_1..CSEM_6. The four W1E1_* rows in the same table are Gina's
// delayTime-only chain (role.wife [1], no `object`); they are imported and measured but not
// modelled here -- see docs/parity-catalog.csv C5.
export const VILLAGE_MANAGE=data.manage.filter(r=>r.id.startsWith('CSEM_'));
export const VILLAGE_MANAGE_DEFERRED=data.manage.filter(r=>!r.id.startsWith('CSEM_'));
/** The original's dialog line for an id, or null. `{playerName}` is left exactly as shipped. */
export const villageLine=id=>Object.hasOwn(data.dialog,id)?data.dialog[id]:null;
export const villageSpeaker=id=>Object.hasOwn(data.speakers,id)?data.speakers[id]:null;
// The original addresses the player as {playerName}. app/roaming-panel.tsx already stands "Village
// Elder" in for that token; toast messages built here use the same stand-in, and villageLine keeps
// the raw text so the data stays exactly as shipped.
export const villageSpoken=text=>(text||'').replaceAll('{playerName}','Village Elder');
// One combined draw pool. In the original these are two timers -- CityDailyEvent runs three times a
// day at System.CityDailyEventTime [10,14,20] under CityDailyEventLimit 3, and a special incident
// refreshes every CitySpecialEventRefreshTime 43,200s. Everkai has no real-time windows, so both
// collapse into the established single-player gate: one claim a day after a finished daily habit,
// exactly as s.supplyDay (lib/consumables.mjs), s.museumDay (lib/museum.mjs) and f.refillDay
// (lib/fishing.mjs) work. Every row keeps its own `weight`, so the 6 choice incidents are
// 6*50 / (26*50) = 3/13 of draws. The type-2 raid (CSE02) and type-3 (CSE03, weight 0 in this
// build) rows are not in this pool; they are measured in the catalogue row instead.
export const VILLAGE_POOL=[
 ...data.daily.map(e=>({...e,kind:'daily'})),
 ...data.choices.map(e=>({...e,kind:'choice'})),
];
export const VILLAGE_POOL_WEIGHT=VILLAGE_POOL.reduce((n,e)=>n+e.weight,0);
const byId=new Map(VILLAGE_POOL.map(e=>[e.id,e]));
export const villageEventById=id=>byId.get(id)||null;
// The same repeatable roll lib/fishing.mjs castRoll(n,salt) uses, so a saved draw always resolves
// the same way and a test can assert a distribution instead of hoping. Salts are local to this
// module, so village draws and casts never share a sequence.
export const villageRoll=(n,salt)=>{let t=(Math.imul(n,0x9E3779B1)^Math.imul(salt,0x85EBCA6B))>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
/** Draw number `n` (1-based) from the weighted pool. Pure: the same n always gives the same row. */
export function drawVillageEvent(n){
 let roll=villageRoll(n,7)*VILLAGE_POOL_WEIGHT;
 for(const e of VILLAGE_POOL){if(roll<e.weight)return e;roll-=e.weight;}
 return VILLAGE_POOL[VILLAGE_POOL.length-1];
}
const MAX_ITEM=1e6;
export const villageReward=id=>(Object.hasOwn(data.rewards,id)?data.rewards[id]:[]);
/** Split a reward into what Everkai can pay and what it has no item for.
 *  An original item with no Everkai equivalent pays NOTHING -- it is never swapped for something
 *  invented. s.inventory is reconciled to exactly the ids the game ships (lib/game.mjs
 *  reconcileInventory), so membership in it is the mapping test. */
export function villageRewardPlan(s,id){
 const paid=[],unmapped=[];
 for(const c of villageReward(id))(Object.hasOwn(s.inventory,c.id)?paid:unmapped).push(c);
 return {paid,unmapped};
}
export const villageState=s=>s.villageEvents||null;
export const freshVillageEvents=()=>({version:1,day:null,draws:0,pending:null,seen:[],manage:{step:0,accepted:false}});
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const int=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export function validVillageEvents(s){
 const v=s?.villageEvents;if(v===undefined)return true;
 if(!obj(v)||v.version!==1)return false;
 if(!(v.day===null||typeof v.day==='string'&&v.day.length<=10))return false;
 if(!int(v.draws,Number.MAX_SAFE_INTEGER))return false;
 if(!(v.pending===null||byId.has(v.pending)))return false;
 if(!Array.isArray(v.seen)||v.seen.length>VILLAGE_POOL.length||new Set(v.seen).size!==v.seen.length||!v.seen.every(id=>byId.has(id)))return false;
 if(!obj(v.manage)||!int(v.manage.step,VILLAGE_MANAGE.length)||typeof v.manage.accepted!=='boolean')return false;
 // A finished chain cannot still be mid-step, and a pending draw must have been drawn.
 if(v.manage.accepted&&v.manage.step>=VILLAGE_MANAGE.length)return false;
 return !(v.pending&&v.draws<1);
}
/** The chain step awaiting the player, or null when the chain is complete. */
export const villageManageStep=s=>VILLAGE_MANAGE[villageState(s)?.manage.step??0]||null;
// CSEM_1 unlocks at the original's PlayerLvUpNum 10. lib/opening.mjs already maps that requirement
// type onto the opening rank ladder, which IS the original's Level.json, so that is the same-source
// match; Everkai's own village rank is accepted as a local fallback so the chain stays reachable
// for a save that never began the opening journey.
export const villageRank=s=>Math.max(s.opening?.rank||0,playerRank(s));
export function villageManageLocked(s,row=villageManageStep(s)){
 if(!row)return null;
 for(const u of row.unLock||[])if(u.type==='PlayerLvUpNum'&&villageRank(s)<u.count)return `Reach rank ${u.count} to meet this adviser.`;
 return null;
}
export function villageEventAction(s,action,target,value,income=0){
 if(!['villageEvent','villageResolve','villageChoose','villageManageAccept','villageManageFinish'].includes(action))return null;
 const fail=error=>({state:s,error}),v=villageState(s)||freshVillageEvents();
 const pay=(next,id,note)=>{
  const {paid,unmapped}=villageRewardPlan(s,id),inventory={...next.inventory};
  for(const c of paid)inventory[c.id]=Math.min(MAX_ITEM,inventory[c.id]+c.count);
  const got=paid.map(c=>`${c.count} ${c.id.replace(/^Item_/,'').replaceAll('_',' ')}`).join(', ');
  return {state:{...next,inventory},message:`${note}${got?` · ${got}`:''}${unmapped.length?` · ${unmapped.length} reward${unmapped.length>1?'s':''} have no Everkai item and paid nothing`:''}`};
 };
 if(action==='villageEvent'){
  if(v.pending)return fail('Settle today’s village event first.');
  const today=habitDay(s.lastAt);
  if(v.day===today)return fail('Today’s village event is already claimed.');
  if(habitEarnings(s.habits,s.lastAt).dailies<1)return fail('Complete a daily habit to walk the village.');
  if(v.draws>=Number.MAX_SAFE_INTEGER)return fail('Exact village-event sequence limit reached.');
  const draws=v.draws+1,e=drawVillageEvent(draws);
  return {state:{...s,villageEvents:{...v,day:today,draws,pending:e.id}},message:`A villager stops you: ${villageSpoken(villageLine(e.dialog[0])||e.prompt||'…')}`};
 }
 if(action==='villageResolve'||action==='villageChoose'){
  if(!v.pending)return fail('Walk the village first.');
  const e=byId.get(v.pending);
  if(target!==v.pending||!e)return fail('That is not the village event waiting for you.');
  if(action==='villageResolve'&&e.kind!=='daily')return fail('This villager is asking you to choose.');
  if(action==='villageChoose'&&e.kind!=='choice')return fail('This event has no choice to make.');
  if(action==='villageChoose'&&![1,2].includes(value))return fail('Choose option 1 or 2.');
  const right=action==='villageChoose'?value===e.correctOption:true;
  const rewardId=e.kind==='choice'?(right?e.reward1:e.reward2):e.reward;
  const seen=v.seen.includes(e.id)?v.seen:[...v.seen,e.id];
  const note=villageSpoken(e.kind==='choice'?(right?e.goodText:e.badText):(villageLine(e.dialog[0])||'The villager thanks you.'));
  return pay({...s,villageEvents:{...v,pending:null,seen}},rewardId,note);
 }
 const row=villageManageStep(s);
 if(!row)return fail('The village management chain is complete.');
 if(action==='villageManageAccept'){
  if(v.manage.accepted)return fail('This goal is already accepted.');
  const locked=villageManageLocked(s,row);if(locked)return fail(locked);
  return pay({...s,villageEvents:{...v,manage:{...v.manage,accepted:true}}},row.beforeReward||'',villageSpoken(row.desc)||'Goal accepted.');
 }
 if(!v.manage.accepted)return fail('Accept this goal first.');
 if(!(income>=row.object))return fail(`Village earnings must reach ${row.object.toLocaleString()} gold/s — currently ${Math.floor(income).toLocaleString()}.`);
 const note=villageSpoken(villageLine(row.afterDialog[0]))||'Goal reached.';
 return pay({...s,villageEvents:{...v,manage:{step:v.manage.step+1,accepted:false}}},row.afterReward||'',note);
}
