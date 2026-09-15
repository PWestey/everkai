import {habitDay,habitEarnings} from './habits.mjs';
import {MAX_FELLOW_XP,MAX_GOLD} from './limits.mjs';
import {EDUCATION_CAP} from './school.mjs';
import {CONSUMABLES} from './adventure.mjs';
// Exact effects from readable item descriptions. Acquisition and storage caps are sandbox rules.
export const consumableCap=item=>item.target==='school'?EDUCATION_CAP:item.stat==='gold'?MAX_GOLD:item.stat==='fellowXP'?MAX_FELLOW_XP:item.stat==='points'?1e9:1e6;
export const consumableAmount=(item,earningsRate=0)=>item.effect==='earningsSeconds'?Math.floor(item.amount*earningsRate):item.amount;
export const consumableLabel=item=>item.target==='school'?'Education Points':({gold:'gold',points:'Blessing Points',fellowXP:'Fellow EXP',intimacy:'Intimacy',blessingPower:'Blessing Power'}[item.stat]);
/** @param {any} s @param {any} item @param {string|null} recipient */
export function usableCount(s,item,recipient=null,earningsRate=0){
 const owner=item.target==='family'?s.family[recipient]:item.target==='school'?s.school:s,amount=consumableAmount(item,earningsRate);
 if(!owner||!Number.isFinite(amount)||amount<=0)return 0;
 return Math.max(0,Math.min(s.inventory[item.id],Math.floor((consumableCap(item)-owner[item.stat])/amount)));
}
export function consumableAction(s,action,target,value,earningsRate=0){
 if(!['claimConsumable','useConsumable'].includes(action))return null;
 const fail=error=>({state:s,error}),item=CONSUMABLES.find(i=>i.id===target);
 if(!item)return fail('Choose a supported supply.');
 // ECON-07 / BUG-40: this was free for ANY consumable, unlimited, including Ancient Exp Stones at 250,000
 // Fellow EXP each -- one of the two unmetered Fellow EXP faucets. It is now one claim a day, after a
 // finished daily habit, like the other daily rewards.
 if(action==='claimConsumable'){
  if(s.inventory[target]>=1e6)return fail('Your bag is full for this supply.');
  const today=habitDay(s.lastAt);
  if(s.supplyDay===today)return fail('Today’s supply claim is already used.');
  if(habitEarnings(s.habits,s.lastAt).dailies<1)return fail('Complete a daily habit to claim supplies.');
  const amount=Math.min(10,1e6-s.inventory[target]);
  return {state:{...s,supplyDay:today,inventory:{...s.inventory,[target]:s.inventory[target]+amount}},message:`Daily habit reward: ${amount} ${item.name}.`};
 }
 const recipient=value?.recipient,requested=value?.count;
 if(![1,10,'all'].includes(requested))return fail('Choose Use 1, Use 10 or Use all.');
 if(item.target==='family'&&!Object.hasOwn(s.family,recipient))return fail('Welcome and choose a family member first.');
 const available=usableCount(s,item,recipient,earningsRate),count=Math.min(available,requested==='all'?available:requested);
 if(!count&&item.stat==='gold'&&earningsRate<=0)return fail('Assign a Fellow to start village earnings before using this card.');
 if(!count)return fail(s.inventory[target]<1?'Your bag is empty for this supply.':'There is no room for this supply’s full effect.');
 const amount=count*consumableAmount(item,earningsRate),inventory={...s.inventory,[target]:s.inventory[target]-count};
 const state=item.target==='school'?{...s,inventory,school:{...s.school,points:s.school.points+amount}}:item.target==='family'?{...s,inventory,family:{...s.family,[recipient]:{...s.family[recipient],[item.stat]:s.family[recipient][item.stat]+amount}},stats:{...s.stats,gifts:Math.min(1e9,s.stats.gifts+(item.stat==='points'?0:count))}}:{...s,inventory,[item.stat]:s[item.stat]+amount};
 return {state,message:`Used ${count} ${item.name}: +${amount.toLocaleString()} ${consumableLabel(item)}.`};
}

/** The optional day stamp for the daily supply claim. */
export const validSupplyClaim=s=>s.supplyDay===undefined||typeof s.supplyDay==='string'&&s.supplyDay.length<=10;
