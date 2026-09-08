import data from './insight-data.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
export const insightState=s=>s.insight||{balances:{},levels:{}};
const rules=new Map(data.rules.flatMap(r=>r.eligibleFellows.map(id=>[id,r])));
export const insightRule=id=>{const r=rules.get(id);return r&&fellowById(id)?.type===r.type?r:null};
export const insightLevel=(s,id)=>insightState(s).levels[id]||0;
export function validInsight(s){
 if(s.insight===undefined)return true;const i=s.insight,int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max,object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 return object(i)&&object(i.balances)&&object(i.levels)&&Object.entries(i.balances).every(([id,n])=>data.rules.some(r=>r.materialId===id)&&int(n,1e9))&&Object.entries(i.levels).every(([id,n])=>s.fellows[id]&&insightRule(id)&&int(n,insightRule(id).supportedLevels));
}
/** @param {number|string} [amount] */
export function insightTrainingPlan(s,id,amount=1){
 const r=insightRule(id),f=s.fellows[id],level=insightLevel(s,id),balance=r?(insightState(s).balances[r.materialId]||0):0;
 const count=!r||!f||![1,5,'max'].includes(amount)?0:Math.max(0,Math.min(amount==='max'?r.supportedLevels:amount,r.supportedLevels-level,Math.floor(balance/r.cost),Math.floor((1000-f.aptitude)/r.aptitude)));
 return {count,cost:count*(r?.cost||0),level:level+count,aptitude:(f?.aptitude||0)+count*(r?.aptitude||0),balance:balance-count*(r?.cost||0)};
}
export function insightAction(s,action,id,value=1){
 if(!['claimInsight','trainInsight'].includes(action))return null;
 const fail=error=>({state:s,error}),r=insightRule(id),f=s.fellows[id],i=insightState(s);if(!r||!f)return fail('Choose an owned Fellow with documented default Insight I.');
 const balance=i.balances[r.materialId]||0,level=insightLevel(s,id);
 if(action==='claimInsight'){
  const gain=Math.min(1000,1e9-balance);if(!gain)return fail('Use some Insight first.');
  return {state:{...s,insight:{...i,balances:{...i.balances,[r.materialId]:balance+gain}}},message:`Free sandbox supply: ${gain} ${r.type} Insight.`};
 }
 if(value==null)value=1;
 if(![1,5,'max'].includes(value))return fail('Choose one, five or max Insight levels.');
 if(level>=r.supportedLevels)return fail('The supported Insight levels are complete.');
 if(f.aptitude+r.aptitude>1000)return fail('This Fellow has reached the sandbox Aptitude limit.');
 if(balance<r.cost)return fail(`Collect ${r.cost} ${r.type} Insight first.`);
 const plan=insightTrainingPlan(s,id,value);
 return {state:{...s,insight:{balances:{...i.balances,[r.materialId]:plan.balance},levels:{...i.levels,[id]:plan.level}},fellows:{...s.fellows,[id]:{...f,aptitude:plan.aptitude}}},message:`${r.name} level ${plan.level}: Aptitude +${plan.count*r.aptitude} for ${plan.cost} ${r.type} Insight.`};
}
