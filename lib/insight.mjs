import data from './insight-data.json' with {type:'json'};
import {habitDay,habitEarnings} from './habits.mjs';
// A type costs 100 per level to 300, so 30,000 masters one. A strong day funds a tenth of that.
export const INSIGHT_PER_DAILY=250,INSIGHT_REFILL_MAX=3000;
import {fellowById} from './catalog.mjs';
export const insightState=s=>s.insight||{balances:{},levels:{}};
const rules=new Map(data.rules.flatMap(r=>r.eligibleFellows.map(id=>[id,r])));
export const insightRule=id=>{const r=rules.get(id);return r&&fellowById(id)?.type===r.type?r:null};
export const insightLevel=(s,id)=>insightState(s).levels[id]||0;
export function validInsight(s){
 if(s.insight===undefined)return true;const i=s.insight,int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max,object=x=>x&&typeof x==='object'&&!Array.isArray(x);
 return object(i)&&object(i.balances)&&object(i.levels)&&(i.refillDay===undefined||i.refillDay===null||typeof i.refillDay==='string'&&i.refillDay.length<=10)&&Object.entries(i.balances).every(([id,n])=>data.rules.some(r=>r.materialId===id)&&int(n,1e9))&&Object.entries(i.levels).every(([id,n])=>s.fellows[id]&&insightRule(id)&&int(n,insightRule(id).supportedLevels));
}
/** @param {number|string} [amount] */
export function insightTrainingPlan(s,id,amount=1){
 const r=insightRule(id),f=s.fellows[id],level=insightLevel(s,id),balance=r?(insightState(s).balances[r.materialId]||0):0;
 const count=!r||!f||![1,5,'max'].includes(amount)?0:Math.max(0,Math.min(amount==='max'?r.supportedLevels:amount,r.supportedLevels-level,Math.floor(balance/r.cost),Math.floor((1000-f.aptitude)/r.aptitude)));
 return {count,cost:count*(r?.cost||0),level:level+count,aptitude:(f?.aptitude||0)+count*(r?.aptitude||0),balance:balance-count*(r?.cost||0)};
}
export function insightAction(s,action,id,value=1){
 if(!['insightRefill','trainInsight'].includes(action))return null;
 const fail=error=>({state:s,error}),r=insightRule(id),f=s.fellows[id],i=insightState(s);if(!r||!f)return fail('Choose an owned Fellow with documented default Insight I.');
 const balance=i.balances[r.materialId]||0,level=insightLevel(s,id);
 if(action==='insightRefill'){
  // The refillDay guard lives on the insight subtree, not per material: claimInsight took a Fellow id
  // and credited that Fellow's type, so a per-material gate would let one day fund all five types by
  // rotating Fellows. Original source for Unidentified Insight is "Roaming, Pupil Union, Daily Task".
  const today=habitDay(s.lastAt),{dailies}=habitEarnings(s.habits,s.lastAt);
  if(i.refillDay===today)return fail('Today’s habit refill is already used.');
  if(dailies<1)return fail('Complete a daily habit to study Insight.');
  const gain=Math.min(INSIGHT_PER_DAILY*dailies,INSIGHT_REFILL_MAX,1e9-balance);
  if(!gain)return fail('Use some Insight first.');
  return {state:{...s,insight:{...i,refillDay:today,balances:{...i.balances,[r.materialId]:balance+gain}}},message:`Habit refill · ${gain} ${r.type} Insight.`};
 }
 if(value==null)value=1;
 if(![1,5,'max'].includes(value))return fail('Choose one, five or max Insight levels.');
 if(level>=r.supportedLevels)return fail('The supported Insight levels are complete.');
 if(f.aptitude+r.aptitude>1000)return fail('This Fellow has reached the sandbox Aptitude limit.');
 if(balance<r.cost)return fail(`Collect ${r.cost} ${r.type} Insight first.`);
 const plan=insightTrainingPlan(s,id,value);
 return {state:{...s,insight:{balances:{...i.balances,[r.materialId]:plan.balance},levels:{...i.levels,[id]:plan.level}},fellows:{...s.fellows,[id]:{...f,aptitude:plan.aptitude}}},message:`${r.name} level ${plan.level}: Aptitude +${plan.count*r.aptitude} for ${plan.cost} ${r.type} Insight.`};
}
