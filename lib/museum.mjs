import {habitDay,habitEarnings} from './habits.mjs';
import {relicBonus} from './treasure.mjs';
import data from './museum-data.json' with {type:'json'};
export const KEEPSAKES=data.records;
export const museumState=s=>s.museum||{};
export const acceptedKeepsakes=s=>s.museumAccepted||Object.keys(museumState(s)).filter(id=>museumState(s)[id]);
export function validMuseum(s){
 if(s.museumDay!==undefined&&(typeof s.museumDay!=='string'||s.museumDay.length>10))return false;
 if(s.museum===undefined)return s.museumAccepted===undefined;
 if(!s.museum||typeof s.museum!=='object'||Array.isArray(s.museum)||!Object.entries(s.museum).every(([id,displayed])=>KEEPSAKES.some(k=>k.id===id)&&typeof displayed==='boolean'))return false;
 if(s.museumAccepted===undefined)return true;
 return Array.isArray(s.museumAccepted)&&new Set(s.museumAccepted).size===s.museumAccepted.length&&s.museumAccepted.every(id=>Object.hasOwn(s.museum,id))&&Object.entries(s.museum).every(([id,shown])=>!shown||s.museumAccepted.includes(id));
}
// Hall 1 keepsakes pay once Bubo accepts them and keep paying in storage (Rule MuseumHall1_3/_5).
// Treasure Hunt relics are Hall 5/6 exhibits of the same museum and pay only while displayed
// (Rule SimGame5_11: "Once on display, they will provide special enhancements").
/** With a Fellow id, the relic part is SCOPED to that Fellow (lib/treasure.mjs relicBonus) and carries the
 *  relic flat; keepsakes are account-wide. Without one it is the whole collection, for the panel. */
export function museumBonus(s,id=null){
 const relics=relicBonus(s,id),bonus={aptitude:relics.aptitude,basicPowerPercent:relics.basicPowerPercent,powerPercent:relics.powerPercent,flat:relics.flat};
 for(const k of KEEPSAKES)if(acceptedKeepsakes(s).includes(k.id)&&k.effect)bonus[k.effect.stat]+=k.effect.amount;
 return bonus;
}
export function keepsakeBonus(s){
 const bonus={aptitude:0,basicPowerPercent:0,powerPercent:0};
 for(const k of KEEPSAKES)if(acceptedKeepsakes(s).includes(k.id)&&k.effect)bonus[k.effect.stat]+=k.effect.amount;
 return bonus;
}
export function museumAction(s,action,target){
 if(!['claimKeepsake','claimMuseum','acceptKeepsake','acceptMuseum','toggleKeepsake','displayMuseum','storeMuseum'].includes(action))return null;
 const fail=error=>({state:s,error}),museum={...museumState(s)},museumAccepted=[...acceptedKeepsakes(s)];
 if(action==='acceptMuseum'){const additions=Object.keys(museum).filter(id=>!museumAccepted.includes(id));if(!additions.length)return fail('All collected keepsakes are already accepted.');return {state:{...s,museum,museumAccepted:[...museumAccepted,...additions]},message:`${additions.length} keepsakes accepted. Their bonuses remain even when stored.`};}
 if(action==='acceptKeepsake'){if(!Object.hasOwn(museum,target))return fail('Collect this keepsake first.');if(museumAccepted.includes(target))return fail('Already accepted.');return {state:{...s,museum,museumAccepted:[...museumAccepted,target]},message:'Keepsake accepted. Its bonus remains even when stored.'};}
 // Was "Collect all · Free": every keepsake at once. A keepsake is now a daily habit reward, so the
 // collection fills over about a month of play rather than in one tap.
 if(action==='claimMuseum'){
  const next=KEEPSAKES.find(k=>!Object.hasOwn(museum,k.id));
  if(!next)return fail('Your collection is complete.');
  const today=habitDay(s.lastAt);
  if(s.museumDay===today)return fail('Today’s keepsake is already collected.');
  if(habitEarnings(s.habits,s.lastAt).dailies<1)return fail('Complete a daily habit to receive a keepsake.');
  museum[next.id]=false;
  return {state:{...s,museumDay:today,museum,museumAccepted},message:`Daily habit reward: ${next.name}. Accept it to keep its bonus.`};
 }
 if(action==='displayMuseum'||action==='storeMuseum'){
  if(!Object.keys(museum).length)return fail('Collect a keepsake first.');
  for(const id of Object.keys(museum))museum[id]=action==='displayMuseum'&&museumAccepted.includes(id);
  return {state:{...s,museum,museumAccepted},message:action==='displayMuseum'?'Accepted keepsakes displayed.':'Keepsakes stored. Accepted bonuses remain.'};
 }
 const item=KEEPSAKES.find(k=>k.id===target);if(!item)return fail('Choose a known keepsake.');
 if(action==='claimKeepsake'){
  // The same daily allowance as claimMuseum, but the player picks which keepsake it is.
  if(Object.hasOwn(museum,target))return fail('This keepsake is already collected.');
  const today=habitDay(s.lastAt);
  if(s.museumDay===today)return fail('Today’s keepsake is already collected.');
  if(habitEarnings(s.habits,s.lastAt).dailies<1)return fail('Complete a daily habit to receive a keepsake.');
  museum[target]=false;
  return {state:{...s,museumDay:today,museum,museumAccepted},message:`Daily habit reward: ${item.name}. Accept it to keep its bonus.`};
 }else{
  if(!Object.hasOwn(museum,target))return fail('Collect this keepsake first.');
  if(!museumAccepted.includes(target))return fail('Accept this keepsake before displaying it.');
  museum[target]=!museum[target];
 }
 return {state:{...s,museum,museumAccepted},message:action==='claimKeepsake'?`Sandbox: ${item.name} collected.`:`${item.name} ${museum[target]?'displayed':'stored'}.`};
}
