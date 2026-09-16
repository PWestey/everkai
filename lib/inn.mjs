import {habitDay,habitEarnings} from './habits.mjs';
import {MAX_GOLD} from './limits.mjs';
import {innGiftPolicy,innGuest,innGuestReady,validInnGuests,claimInnGift} from './inn-guests.mjs';
import {innStaminaCap,innServingGains} from './inn-progression.mjs';
import {INN_BASE_STAMINA,innMaxDishEarnings,innQueueEarnings,innRecipeGold,innStationBuildGold} from './inn-economy.mjs';
import data from './inn-data.json' with {type:'json'};
export const INN_STATIONS=data.stations,INN_DISHES=data.dishes,INN_RULES=data.sandbox;
const stations=new Map(INN_STATIONS.map(x=>[x.id,x])),dishes=new Map(INN_DISHES.map(x=>[x.id,x]));
export const freshInn=()=>({served:0,stamina:INN_BASE_STAMINA,popularity:0,blueprints:0,deposit:0,stations:{},menu:[],finesse:{},queue:null});
const int=(v,max=1e9)=>Number.isInteger(v)&&v>=0&&v<=max;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export const innRecipeReady=(i,d)=>i.served>=d.guests&&(!d.station||(i.stations[d.station]||0)>=d.level);
export function validInn(s){
 if(s.inn===undefined)return true;if(!validInnGuests(s))return false;const i=s.inn;
 if(!object(i)||!['served','blueprints'].every(k=>int(i[k]))||!int(i.deposit,MAX_GOLD)||!int(i.stamina,innStaminaCap(i))||(i.refillDay!==undefined&&(typeof i.refillDay!=='string'||i.refillDay.length>10))||(i.popularity!==undefined&&!int(i.popularity))||!object(i.stations)||!object(i.finesse)||!Array.isArray(i.menu)||i.menu.length>80||new Set(i.menu).size!==i.menu.length)return false;
 if(!Object.entries(i.stations).every(([id,l])=>stations.has(id)&&int(l,30)&&l>=1&&i.served>=stations.get(id).guests))return false;
 if(!i.menu.every(id=>typeof id==='string'&&dishes.has(id)&&innRecipeReady(i,dishes.get(id)))||!Object.entries(i.finesse).every(([id,n])=>i.menu.includes(id)&&int(n)))return false;
 if(i.queue===null)return true;const q=i.queue;if(q?.specialGift!==undefined&&(!innGuestReady(s,innGuest(q.specialGift))||q.remaining!==1||q.dish!==innGuest(q.specialGift)?.dish||Object.hasOwn(i.guestGifts||{},q.specialGift)))return false;
 if(q&&q.gains!==undefined&&(!object(q.gains)||!int(q.gains.finesse,480)||q.gains.finesse<1||!int(q.gains.popularity,140)))return false;
 return object(q)&&i.menu.includes(q.dish)&&int(q.remaining,10)&&q.remaining>=1&&Number.isSafeInteger(q.nextAt)&&q.nextAt>=0&&['served','blueprints'].every(k=>i[k]+q.remaining<=1e9)&&i.deposit+q.remaining*innMaxDishEarnings(q.dish)<=MAX_GOLD&&(i.finesse[q.dish]||0)+q.remaining*(q.gains?.finesse||1)<=1e9&&(i.popularity||0)+q.remaining*(q.gains?.popularity||0)<=1e9;
}
// Stamina recovers like the original's Item_SimGame1_Energy (Item.json isRecover 1, recoverCD 1200): one point
// every 20 minutes up to the Inn's cap. Counted from the 20-minute clock boundaries between the save's
// previous lastAt and now, so no timer is stored and frequent settles lose nothing.
export const INN_STAMINA_RECOVER_MS=1200000;
/** BUG-23 narrows the UNRATED Inn's stamina cap from 20 to the original's level-1 energyLimit of 10, so
 *  a real save written under the old cap can be holding 11-20 stamina that validInn would now refuse
 *  outright -- the save the game itself produced and then would not load. Clamp it to the cap it can
 *  legitimately hold. Must run BEFORE decode's per-subtree guards, because those throw (CLAUDE.md:80).
 *  Inert on every save already at or under its cap, and junk still reaches validInn and is still
 *  refused: this only ever lowers an integer stamina toward a value validInn accepts. */
export const repairInn=s=>{const i=s?.inn;if(!object(i)||!Number.isInteger(i.stamina))return s;const cap=innStaminaCap(i);return i.stamina>cap?{...s,inn:{...i,stamina:cap}}:s;};
export function settleInnStamina(s,from,to){const i=s.inn;if(!i||!(to>from))return s;const cap=innStaminaCap(i);if(i.stamina>=cap)return s;const ticks=Math.floor(to/INN_STAMINA_RECOVER_MS)-Math.floor(from/INN_STAMINA_RECOVER_MS);return ticks>0?{...s,inn:{...i,stamina:Math.min(cap,i.stamina+ticks)}}:s;}
/** BUG-31: each guest pays SimGame1FoodLevel.coinEarnings for the dish AT ITS CURRENT LEVEL, and the
 *  proficiency their own meal earns can push the dish up a level for the guest behind them -- so a
 *  queue is paid out guest by guest rather than as count*flat. The finesse total this leaves behind is
 *  identical to the old count*perGuest, so no save's finesse figure moves. */
export function settleInn(s,now){
 const i=s.inn,q=i?.queue;if(!q||now<q.nextAt)return s;
 const count=Math.min(q.remaining,Math.floor((now-q.nextAt)/10000)+1),remaining=q.remaining-count;
 const earned=innQueueEarnings(q.dish,i.finesse[q.dish]||0,q.gains?.finesse||1,count);
 return {...s,inn:{...i,served:i.served+count,popularity:(i.popularity||0)+count*(q.gains?.popularity||0),blueprints:i.blueprints+count,deposit:i.deposit+earned,finesse:{...i.finesse,[q.dish]:(i.finesse[q.dish]||0)+count*(q.gains?.finesse||1)},...(q.specialGift&&!remaining?{guestGifts:{...i.guestGifts,[q.specialGift]:{completedAt:q.nextAt,claimedAt:null,policyVersion:innGiftPolicy(q.specialGift)}}}:{}),queue:remaining?{...q,remaining,nextAt:q.nextAt+10000*count}:null}};
}
export function innAction(s,action,target,value){
 if(!['openInnService','buildInnStation','upgradeInnStation','developInnRecipe','receiveInnGuests','refillInnStamina','collectInnDeposit','serveInnSpecial','claimInnGift'].includes(action))return null;
 const fail=error=>({state:s,error}),i=s.inn;
 if(action==='openInnService'){
  if(i)return fail('Inn service is already open.');if(!s.enterprises?.Building_101)return fail('Open the original Inn business first.');
  return {state:{...s,inn:freshInn()},message:'Inn service opened. Build a kitchen station or develop an eligible recipe.'};
 }
 if(!i)return fail('Open Inn service first.');if(action==='claimInnGift')return claimInnGift(s,target);if(action==='serveInnSpecial'){const rule=innGuest(target);if(!innGuestReady(s,rule))return fail('Meet the rating, recipe and Fellow requirements first.');if(Object.hasOwn(i.guestGifts||{},target))return fail('This special visit has already been served.');const received=innAction(s,'receiveInnGuests',rule.dish,1);if(received.error)return received;return {...received,state:{...received.state,inn:{...received.state.inn,queue:{...received.state.inn.queue,specialGift:target}}},message:'Special visit received. Collect its treasure after the meal.'};}const result=(next,message,extra={})=>({state:{...s,...extra,inn:next},message});
 // The free refill was an unbounded faucet (BUG-29: 18,000 gold/hour forever). It is now the daily habit top-up
 // the catalogue asks for (ECON-09): once a day, after a finished daily habit.
 if(action==='refillInnStamina'){const today=habitDay(s.lastAt);if(i.refillDay===today)return fail('Today’s stamina refill is already used.');if(habitEarnings(s.habits,s.lastAt).dailies<1)return fail('Complete a daily habit to refill Inn stamina.');if(i.stamina>=innStaminaCap(i))return fail('Inn stamina is already full.');return result({...i,stamina:innStaminaCap(i),refillDay:today},'Stamina refilled · daily habit reward.');}
 if(action==='collectInnDeposit'){
  if(!i.deposit)return fail('No Inn earnings to collect.');if(s.gold+i.deposit>MAX_GOLD)return fail('Make room for the full deposit first.');
  return result({...i,deposit:0},'Inn earnings collected.',{gold:s.gold+i.deposit});
 }
 if(action==='buildInnStation'||action==='upgradeInnStation'){
  const station=stations.get(target);if(!station||i.served<station.guests)return fail('Serve more guests to unlock this station.');const level=i.stations[target]||0;
  if(action==='buildInnStation'){
   // BUG-30: the price was 100 * the station's own id (100-1,000 gold), invented locally. The original
   // charges SimGame1Kitchenware.consume of item id 3: nothing at all for stations 1-3, 5,000 for 4-10.
   const cost=innStationBuildGold(target);if(level)return fail('Station already built.');if(s.gold<cost)return fail('More gold needed.');
   return result({...i,stations:{...i.stations,[target]:1}},'Kitchen station built.',{gold:s.gold-cost});
  }
  if(!level||level>=30)return fail('Build the station or choose one below level 30.');if(i.blueprints<level)return fail('Serve guests for more blueprints.');
  return result({...i,blueprints:i.blueprints-level,stations:{...i.stations,[target]:level+1}},'Station upgraded. Check the recipe menu.');
 }
 const dish=dishes.get(target);if(!dish)return fail('Choose a known recipe.');
 if(action==='developInnRecipe'){
  // ECON-17: developing was free. The original charges SimGame1Food.unlockConsume, gold (Item.json row
  // 3), from 500 for the first recipe to 368,640,000,000 for the last; the five guest-gated dishes
  // (30, 45, 54, 56, 57) genuinely cost 0 there, which is why those stay free here.
  if(!innRecipeReady(i,dish))return fail('Meet this recipe’s guest or station requirements.');if(i.menu.includes(target))return fail('Recipe already developed.');
  const price=innRecipeGold(target);if(s.gold<price)return fail('More gold needed to develop this recipe.');
  return result({...i,menu:[...i.menu,target]},'Recipe added to the menu.',{gold:s.gold-price});
 }
 if(i.queue)return fail('Finish the current guest queue first.');if(!i.menu.includes(target))return fail('Develop this recipe first.');if(![1,5,10].includes(value)||i.stamina<value)return fail('Choose an affordable guest group.');
 const gains=innServingGains(i,target);
 // The deposit bound uses the dish's level-50 price: the queue's own proficiency can raise its level
 // while it is being served, so only the top of the ladder is a safe ceiling for the whole queue.
 if((i.popularity||0)+value*gains.popularity>1e9||i.served+value>1e9||i.blueprints+value>1e9||i.deposit+value*innMaxDishEarnings(target)>MAX_GOLD||(i.finesse[target]||0)+value*gains.finesse>1e9)return fail('Make room for all service rewards first.');
 return result({...i,stamina:i.stamina-value,queue:{dish:target,remaining:value,gains,nextAt:s.lastAt+10000}},`${value} guests received. Service continues offline.`);
}
