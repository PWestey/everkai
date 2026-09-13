import {innGiftPolicy,innGuest,innGuestReady,validInnGuests,claimInnGift} from './inn-guests.mjs';
import {innStaminaCap,innServingGains} from './inn-progression.mjs';
import data from './inn-data.json' with {type:'json'};
export const INN_STATIONS=data.stations,INN_DISHES=data.dishes,INN_RULES=data.sandbox;
const stations=new Map(INN_STATIONS.map(x=>[x.id,x])),dishes=new Map(INN_DISHES.map(x=>[x.id,x]));
export const freshInn=()=>({served:0,stamina:20,popularity:0,blueprints:0,deposit:0,stations:{},menu:[],finesse:{},queue:null});
const int=(v,max=1e9)=>Number.isInteger(v)&&v>=0&&v<=max;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export const innRecipeReady=(i,d)=>i.served>=d.guests&&(!d.station||(i.stations[d.station]||0)>=d.level);
export function validInn(s){
 if(s.inn===undefined)return true;if(!validInnGuests(s))return false;const i=s.inn;
 if(!object(i)||!['served','blueprints','deposit'].every(k=>int(i[k]))||!int(i.stamina,innStaminaCap(i))||(i.popularity!==undefined&&!int(i.popularity))||!object(i.stations)||!object(i.finesse)||!Array.isArray(i.menu)||i.menu.length>80||new Set(i.menu).size!==i.menu.length)return false;
 if(!Object.entries(i.stations).every(([id,l])=>stations.has(id)&&int(l,30)&&l>=1&&i.served>=stations.get(id).guests))return false;
 if(!i.menu.every(id=>typeof id==='string'&&dishes.has(id)&&innRecipeReady(i,dishes.get(id)))||!Object.entries(i.finesse).every(([id,n])=>i.menu.includes(id)&&int(n)))return false;
 if(i.queue===null)return true;const q=i.queue;if(q?.specialGift!==undefined&&(!innGuestReady(s,innGuest(q.specialGift))||q.remaining!==1||q.dish!==innGuest(q.specialGift)?.dish||Object.hasOwn(i.guestGifts||{},q.specialGift)))return false;
 if(q&&q.gains!==undefined&&(!object(q.gains)||!int(q.gains.finesse,480)||q.gains.finesse<1||!int(q.gains.popularity,140)))return false;
 return object(q)&&i.menu.includes(q.dish)&&int(q.remaining,10)&&q.remaining>=1&&Number.isSafeInteger(q.nextAt)&&q.nextAt>=0&&['served','blueprints'].every(k=>i[k]+q.remaining<=1e9)&&i.deposit+q.remaining*50<=1e9&&(i.finesse[q.dish]||0)+q.remaining*(q.gains?.finesse||1)<=1e9&&(i.popularity||0)+q.remaining*(q.gains?.popularity||0)<=1e9;
}
export function settleInn(s,now){
 const i=s.inn,q=i?.queue;if(!q||now<q.nextAt)return s;
 const count=Math.min(q.remaining,Math.floor((now-q.nextAt)/10000)+1),remaining=q.remaining-count;
 return {...s,inn:{...i,served:i.served+count,popularity:(i.popularity||0)+count*(q.gains?.popularity||0),blueprints:i.blueprints+count,deposit:i.deposit+50*count,finesse:{...i.finesse,[q.dish]:(i.finesse[q.dish]||0)+count*(q.gains?.finesse||1)},...(q.specialGift&&!remaining?{guestGifts:{...i.guestGifts,[q.specialGift]:{completedAt:q.nextAt,claimedAt:null,policyVersion:innGiftPolicy(q.specialGift)}}}:{}),queue:remaining?{...q,remaining,nextAt:q.nextAt+10000*count}:null}};
}
export function innAction(s,action,target,value){
 if(!['openInnService','buildInnStation','upgradeInnStation','developInnRecipe','receiveInnGuests','refillInnStamina','collectInnDeposit','serveInnSpecial','claimInnGift'].includes(action))return null;
 const fail=error=>({state:s,error}),i=s.inn;
 if(action==='openInnService'){
  if(i)return fail('Inn service is already open.');if(!s.enterprises?.Building_101)return fail('Open the original Inn business first.');
  return {state:{...s,inn:freshInn()},message:'Inn service opened. Build a kitchen station or develop an eligible recipe.'};
 }
 if(!i)return fail('Open Inn service first.');if(action==='claimInnGift')return claimInnGift(s,target);if(action==='serveInnSpecial'){const rule=innGuest(target);if(!innGuestReady(s,rule))return fail('Meet the rating, recipe and Fellow requirements first.');if(Object.hasOwn(i.guestGifts||{},target))return fail('This special visit has already been served.');const received=innAction(s,'receiveInnGuests',rule.dish,1);if(received.error)return received;return {...received,state:{...received.state,inn:{...received.state.inn,queue:{...received.state.inn.queue,specialGift:target}}},message:'Special visit received. Collect its treasure after the meal.'};}const result=(next,message,extra={})=>({state:{...s,...extra,inn:next},message});
 if(action==='refillInnStamina')return result({...i,stamina:innStaminaCap(i)},'Sandbox stamina refilled.');
 if(action==='collectInnDeposit'){
  if(!i.deposit)return fail('No Inn earnings to collect.');if(s.gold+i.deposit>1e9)return fail('Make room for the full deposit first.');
  return result({...i,deposit:0},'Inn earnings collected.',{gold:s.gold+i.deposit});
 }
 if(action==='buildInnStation'||action==='upgradeInnStation'){
  const station=stations.get(target);if(!station||i.served<station.guests)return fail('Serve more guests to unlock this station.');const level=i.stations[target]||0;
  if(action==='buildInnStation'){
   const cost=100*Number(target);if(level)return fail('Station already built.');if(s.gold<cost)return fail('More gold needed.');
   return result({...i,stations:{...i.stations,[target]:1}},'Kitchen station built.',{gold:s.gold-cost});
  }
  if(!level||level>=30)return fail('Build the station or choose one below level 30.');if(i.blueprints<level)return fail('Serve guests for more blueprints.');
  return result({...i,blueprints:i.blueprints-level,stations:{...i.stations,[target]:level+1}},'Station upgraded. Check the recipe menu.');
 }
 const dish=dishes.get(target);if(!dish)return fail('Choose a known recipe.');
 if(action==='developInnRecipe'){
  if(!innRecipeReady(i,dish))return fail('Meet this recipe’s guest or station requirements.');if(i.menu.includes(target))return fail('Recipe already developed.');
  return result({...i,menu:[...i.menu,target]},'Recipe added to the menu.');
 }
 if(i.queue)return fail('Finish the current guest queue first.');if(!i.menu.includes(target))return fail('Develop this recipe first.');if(![1,5,10].includes(value)||i.stamina<value)return fail('Choose an affordable guest group.');
 const gains=innServingGains(i,target);
 if((i.popularity||0)+value*gains.popularity>1e9||i.served+value>1e9||i.blueprints+value>1e9||i.deposit+50*value>1e9||(i.finesse[target]||0)+value*gains.finesse>1e9)return fail('Make room for all service rewards first.');
 return result({...i,stamina:i.stamina-value,queue:{dish:target,remaining:value,gains,nextAt:s.lastAt+10000}},`${value} guests received. Service continues offline.`);
}
