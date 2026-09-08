import data from './farm-trade-data.json' with {type:'json'};
import policy from './farm-order-policy.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
export const FARM_ESSENCES=data.essences;
export const FARM_TRADE_POLICY=policy;
const essences=new Map(FARM_ESSENCES.map(e=>[e.id,e]));
const int=n=>Number.isInteger(n)&&n>=0&&n<=1e9;
export const farmTrade=f=>f.trade||{policyVersion:1,completed:[0,0,0],dew:0,essences:{}};
export function farmOrder(f,slot){
 if(!Number.isInteger(slot)||slot<0||slot>=3)return null;const t=farmTrade(f),serial=t.completed[slot],offer=policy.offers[(slot+serial*3)%policy.offers.length];
 return {...offer,key:`${slot}:${serial}`,dew:policy.dewPerOrder};
}
export function validFarmTrade(f){
 if(f.trade===undefined)return true;const t=f.trade;
 return !!t&&typeof t==='object'&&!Array.isArray(t)&&t.policyVersion===1&&int(t.dew)&&Array.isArray(t.completed)&&t.completed.length===3&&t.completed.every(int)&&t.essences&&typeof t.essences==='object'&&!Array.isArray(t.essences)&&Object.entries(t.essences).every(([id,n])=>essences.has(id)&&int(n));
}
/** @param {any} s @param {string} essenceId @param {string} kind @param {number|string} amount @param {string|null} fellowId */
export function essencePlan(s,essenceId,kind,amount=1,fellowId=null){
 const essence=essences.get(essenceId),f=s.farm,t=f?farmTrade(f):null,owned=t?.essences[essenceId]||0,fellow=s.fellows[fellowId];
 if(!essence||!t||![1,5,'max'].includes(amount)||!['buy','use'].includes(kind))return {count:0,cost:0,gain:0};
 const available=kind==='buy'?Math.min(Math.floor(t.dew/policy.essenceDewCost),1e9-owned):fellow&&fellowById(fellowId)?.type===essence.type?Math.min(owned,Math.floor((1000-fellow.aptitude)/policy.aptitudePerEssence)):0;
 const count=Math.max(0,Math.min(amount==='max'?available:amount,available));return {count,cost:count*(kind==='buy'?policy.essenceDewCost:1),gain:count*(kind==='buy'?1:policy.aptitudePerEssence)};
}
export function farmTradeAction(s,action,target,value){
 if(!['deliverFarmOrder','buyFarmEssence','useFarmEssence'].includes(action))return null;
 const fail=error=>({state:s,error}),f=s.farm;if(!f)return fail('Open Magic Farm first.');const t=farmTrade(f),result=(trade,message,extra={})=>({state:{...s,...extra,farm:{...f,trade}},message});
 if(action==='deliverFarmOrder'){
  const order=farmOrder(f,target);if(!order||value!==order.key)return fail('This order changed. Choose its current offer.');if((f.harvests[order.plant]||0)<order.quantity)return fail('Harvest the requested crops first.');if(t.dew+order.dew>1e9||t.completed[target]>=1e9)return fail('Use Morning Dew before delivering more.');
  const completed=[...t.completed];completed[target]++;return {state:{...s,farm:{...f,harvests:{...f.harvests,[order.plant]:f.harvests[order.plant]-order.quantity},trade:{...t,dew:t.dew+order.dew,completed}}},message:'Local order delivered. +5 Magic Morning Dew.'};
 }
 const essenceId=action==='buyFarmEssence'?target:typeof value==='string'?value:value?.essence,amount=action==='buyFarmEssence'?(value??1):typeof value==='string'?1:(value?.amount??1),essence=essences.get(essenceId);if(![1,5,'max'].includes(amount))return fail('Choose one, five or max essences.');if(!essence)return fail('Choose a known Alraune essence.');
 if(action==='buyFarmEssence'){
  if((t.essences[essence.id]||0)>=1e9)return fail('Use some essence first.');const plan=essencePlan(s,essence.id,'buy',amount);if(!plan.count)return fail('Deliver orders for more Morning Dew.');
  return result({...t,dew:t.dew-plan.cost,essences:{...t.essences,[essence.id]:(t.essences[essence.id]||0)+plan.count}},`${essence.name} received.`);
 }
 const fellow=s.fellows[target];if(!fellow||fellowById(target)?.type!==essence.type)return fail('Choose an owned Fellow of the matching type.');if(!(t.essences[essence.id]>0))return fail('Exchange Morning Dew for this essence first.');if(fellow.aptitude+policy.aptitudePerEssence>1000)return fail('This Fellow has reached the current Aptitude limit.');
 const plan=essencePlan(s,essence.id,'use',amount,target);return result({...t,essences:{...t.essences,[essence.id]:t.essences[essence.id]-plan.cost}},`Sandbox essence effect: Aptitude +${plan.gain}.`,{fellows:{...s.fellows,[target]:{...fellow,aptitude:fellow.aptitude+plan.gain}}});
}
