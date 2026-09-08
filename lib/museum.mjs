import data from './museum-data.json' with {type:'json'};
export const KEEPSAKES=data.records;
export const museumState=s=>s.museum||{};
export const acceptedKeepsakes=s=>s.museumAccepted||Object.keys(museumState(s)).filter(id=>museumState(s)[id]);
export function validMuseum(s){
 if(s.museum===undefined)return s.museumAccepted===undefined;
 if(!s.museum||typeof s.museum!=='object'||Array.isArray(s.museum)||!Object.entries(s.museum).every(([id,displayed])=>KEEPSAKES.some(k=>k.id===id)&&typeof displayed==='boolean'))return false;
 if(s.museumAccepted===undefined)return true;
 return Array.isArray(s.museumAccepted)&&new Set(s.museumAccepted).size===s.museumAccepted.length&&s.museumAccepted.every(id=>Object.hasOwn(s.museum,id))&&Object.entries(s.museum).every(([id,shown])=>!shown||s.museumAccepted.includes(id));
}
export function museumBonus(s){
 const bonus={aptitude:0,basicPowerPercent:0,powerPercent:0};
 for(const k of KEEPSAKES)if(acceptedKeepsakes(s).includes(k.id)&&k.effect)bonus[k.effect.stat]+=k.effect.amount;
 return bonus;
}
export function museumAction(s,action,target){
 if(!['claimKeepsake','claimMuseum','acceptKeepsake','acceptMuseum','toggleKeepsake','displayMuseum','storeMuseum'].includes(action))return null;
 const fail=error=>({state:s,error}),museum={...museumState(s)},museumAccepted=[...acceptedKeepsakes(s)];
 if(action==='acceptMuseum'){const additions=Object.keys(museum).filter(id=>!museumAccepted.includes(id));if(!additions.length)return fail('All collected keepsakes are already accepted.');return {state:{...s,museum,museumAccepted:[...museumAccepted,...additions]},message:`${additions.length} keepsakes accepted. Their bonuses remain even when stored.`};}
 if(action==='acceptKeepsake'){if(!Object.hasOwn(museum,target))return fail('Collect this keepsake first.');if(museumAccepted.includes(target))return fail('Already accepted.');return {state:{...s,museum,museumAccepted:[...museumAccepted,target]},message:'Keepsake accepted. Its bonus remains even when stored.'};}
 if(action==='claimMuseum'){
  let count=0;for(const k of KEEPSAKES)if(!Object.hasOwn(museum,k.id)){museum[k.id]=false;count++}
  if(!count)return fail('Your collection is complete.');
  return {state:{...s,museum,museumAccepted},message:`Sandbox: ${count} keepsakes collected. Choose which to display.`};
 }
 if(action==='displayMuseum'||action==='storeMuseum'){
  if(!Object.keys(museum).length)return fail('Collect a keepsake first.');
  for(const id of Object.keys(museum))museum[id]=action==='displayMuseum'&&museumAccepted.includes(id);
  return {state:{...s,museum,museumAccepted},message:action==='displayMuseum'?'Accepted keepsakes displayed.':'Keepsakes stored. Accepted bonuses remain.'};
 }
 const item=KEEPSAKES.find(k=>k.id===target);if(!item)return fail('Choose a known keepsake.');
 if(action==='claimKeepsake'){
  if(Object.hasOwn(museum,target))return fail('This keepsake is already collected.');
  museum[target]=false;
 }else{
  if(!Object.hasOwn(museum,target))return fail('Collect this keepsake first.');
  if(!museumAccepted.includes(target))return fail('Accept this keepsake before displaying it.');
  museum[target]=!museum[target];
 }
 return {state:{...s,museum,museumAccepted},message:action==='claimKeepsake'?`Sandbox: ${item.name} collected.`:`${item.name} ${museum[target]?'displayed':'stored'}.`};
}
