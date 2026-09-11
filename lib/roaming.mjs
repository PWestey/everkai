import {FAMILY} from './catalog.mjs';
import {playerRank} from './progression.mjs';
import {habitEarnings,habitDay} from './habits.mjs';
import {ROAM_LOCATIONS,ROAM_EVENTS,ROAM_FAMILY} from './roaming-data.mjs';
export {ROAM_LOCATIONS,ROAM_EVENTS,ROAM_FAMILY};
// Original rules: roaming costs 1 stamina, stamina recovers 1 per 30 minutes up to a rank-based limit, each roam gives Fame,
// meeting an uninvited Family member builds bond toward inviting them, meeting an invited one raises Intimacy, Fellow events give items.
// Local rules: the cap formula, encounter odds, +5 Intimacy, the item table, and the once-a-day habit refill.
export const ROAM_RECOVERY_MS=30*60000,ROAM_FAME=24,ROAM_CAP_MAX=60,ROAM_HISTORY=50,ROAM_INTIMACY=5,ROAM_QUICK_MAX=10,ROAM_REFILL_MAX=6;
export const ROAM_REWARDS=['gift1','gift2','gift3','gift4','Item_GetCE_10'];
const KINDS=['bond','joined','intimacy','event'],DAY=/^\d{4}-\d{2}-\d{2}$/;
const int=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
export const roamCap=s=>Math.min(ROAM_CAP_MAX,20+2*(playerRank(s)-1));
export const roamingState=s=>s.roaming||{policyVersion:1,seq:0,stamina:null,recoverAt:null,fame:0,travels:0,bonds:{},refillDay:null,history:[]};
export const roamFamily=id=>ROAM_FAMILY.find(f=>f.id===id);
export const roamLocation=id=>ROAM_LOCATIONS.find(l=>l.id===id);
/** Current stamina with whole points recovered since the last spend; a missing value means a full, never-used stock. */
export function roamStamina(s){
 const r=roamingState(s),cap=roamCap(s);
 if(r.stamina===null)return {stamina:cap,recoverAt:null,cap};
 if(r.stamina>=cap||r.recoverAt===null||s.lastAt<r.recoverAt)return {stamina:r.stamina,recoverAt:r.stamina>=cap?null:r.recoverAt,cap};
 const count=1+Math.floor((s.lastAt-r.recoverAt)/ROAM_RECOVERY_MS),stamina=Math.min(cap,r.stamina+count);
 return {stamina,recoverAt:stamina>=cap?null:r.recoverAt+count*ROAM_RECOVERY_MS,cap};
}
function mulberry(seed){let a=seed>>>0;return()=>{a=(a+0x6D2B79F5)>>>0;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296}}
/** Picks one encounter from a roll in [0,1): an uninvited roaming Family member, an invited Family member, or a Fellow event. */
export function roamEncounter(s,roll){
 const rand=mulberry(Math.floor(roll*4294967296)),pending=ROAM_FAMILY.filter(f=>!s.family[f.id]),owned=Object.keys(s.family).sort(),pick=(list)=>list[Math.floor(rand()*list.length)],r=rand();
 if(pending.length&&r<.45){const f=pick(pending);return {kind:'bond',target:f.id,location:f.location}}
 if(owned.length&&r<.7){const id=pick(owned);return {kind:'intimacy',target:id,location:roamFamily(id)?.location??pick(ROAM_LOCATIONS).id}}
 const e=pick(ROAM_EVENTS);return {kind:'event',target:e.id,location:e.location,item:pick(ROAM_REWARDS)};
}
function roamOnce(s,r,roll){
 const st=roamStamina({...s,roaming:r});if(st.stamina<1)return null;
 const e=roamEncounter(s,roll),stamina=st.stamina-1,next={...r,seq:r.seq+1,stamina,recoverAt:st.recoverAt??(stamina<st.cap?s.lastAt+ROAM_RECOVERY_MS:null),fame:Math.min(1e9,r.fame+ROAM_FAME),travels:Math.min(1e9,r.travels+1),bonds:{...r.bonds}};
 let family=s.family,inventory=s.inventory,entry={id:r.seq,at:s.lastAt,kind:e.kind,target:e.target,location:e.location},message;
 const name=id=>FAMILY.find(f=>f.id===id)?.name||id;
 if(e.kind==='bond'){const f=roamFamily(e.target),bond=Math.min(f.bondGoal,(r.bonds[e.target]||0)+1);next.bonds[e.target]=bond;entry.amount=bond;
  if(bond>=f.bondGoal){family={...family,[e.target]:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}};entry.kind='joined';message=`${name(e.target)} joined your family!`}
  else message=`${name(e.target)} has spent a wonderful time with you. Bond ${bond}/${f.bondGoal}`}
 else if(e.kind==='intimacy'){const p=family[e.target],gain=Math.max(0,Math.min(ROAM_INTIMACY,1e6-p.intimacy));family={...family,[e.target]:{...p,intimacy:p.intimacy+gain}};entry.amount=gain;message=`${name(e.target)} · Intimacy +${gain}`}
 else{const ev=ROAM_EVENTS.find(x=>x.id===e.target);message=ev.text;if(Object.hasOwn(inventory,e.item)&&inventory[e.item]<1e6){inventory={...inventory,[e.item]:inventory[e.item]+1};entry.item=e.item}}
 next.history=[...r.history,entry].slice(-ROAM_HISTORY);
 return {state:{...s,family,inventory,roaming:next},message:`${roamLocation(e.location).name}: ${message} · Fame +${ROAM_FAME}`,entry};
}
export function roamingAction(s,action,target,value){
 if(!['roamGo','roamQuick','roamRefill'].includes(action))return null;
 const fail=error=>({state:s,error}),r=roamingState(s);
 if(value?.seq!==r.seq||r.seq>=1e9)return fail('Roaming changed. Try again.');
 const rolls=action==='roamGo'?[value.roll]:action==='roamQuick'?value.rolls:[];
 if(action!=='roamRefill'&&(!Array.isArray(rolls)||!rolls.length||rolls.length>ROAM_QUICK_MAX||!rolls.every(x=>typeof x==='number'&&x>=0&&x<1)))return fail('Invalid roaming roll.');
 if(action==='roamRefill'){
  const today=habitDay(s.lastAt),{dailies}=habitEarnings(s.habits,s.lastAt),st=roamStamina(s);
  if(r.refillDay===today)return fail('Today’s habit refill is already used.');
  if(dailies<1)return fail('Complete a daily habit to refill stamina.');
  if(st.stamina>=st.cap)return fail('Stamina is already full.');
  const stamina=Math.min(st.cap,st.stamina+Math.min(ROAM_REFILL_MAX,dailies)),gain=stamina-st.stamina;
  return {state:{...s,roaming:{...r,seq:r.seq+1,stamina,recoverAt:stamina>=st.cap?null:st.recoverAt,refillDay:today}},message:`Habits restored ${gain} Roaming Stamina`};
 }
 let state=s,last=null,count=0;
 for(const roll of rolls){const out=roamOnce(state,roamingState(state),roll);if(!out)break;state=out.state;last=out;count++}
 if(!count)return fail('No Roaming Stamina left.');
 return {state,message:count===1?last.message:`Roamed ${count} times · Fame +${count*ROAM_FAME}`};
}
export function validRoaming(s){
 const r=s?.roaming;if(r===undefined)return true;
 return !!r&&typeof r==='object'&&!Array.isArray(r)&&r.policyVersion===1&&int(r.seq,1e9)&&(r.stamina===null?r.recoverAt===null:int(r.stamina,ROAM_CAP_MAX))&&(r.recoverAt===null||int(r.recoverAt,Number.MAX_SAFE_INTEGER))&&int(r.fame,1e9)&&int(r.travels,1e9)&&(r.refillDay===null||typeof r.refillDay==='string'&&DAY.test(r.refillDay))
  &&!!r.bonds&&typeof r.bonds==='object'&&!Array.isArray(r.bonds)&&Object.entries(r.bonds).every(([id,v])=>{const f=roamFamily(id);return !!f&&int(v,f.bondGoal)})
  &&Array.isArray(r.history)&&r.history.length<=ROAM_HISTORY&&r.history.every(h=>!!h&&typeof h==='object'&&int(h.id,1e9)&&int(h.at,Number.MAX_SAFE_INTEGER)&&KINDS.includes(h.kind)&&typeof h.target==='string'&&!!roamLocation(h.location)&&(h.item===undefined||ROAM_REWARDS.includes(h.item))&&(h.amount===undefined||int(h.amount,1e6)));
}
