import levels from './farm-level-data.json' with {type:'json'};
import {validFarmTrade,farmTradeAction} from './farm-trade.mjs';
import data from './farm-data.json' with {type:'json'};
export const FARM_PLANTS=data.plants;
const plants=new Map(FARM_PLANTS.map(p=>[p.id,p]));
export const farmPlant=id=>plants.get(id);
const int=n=>Number.isInteger(n)&&n>=0&&n<=1e9;
export function farmHarvestPlan(id,level=1){const p=plants.get(id),r=levels.plants.find(p=>p.id===id)?.levels.find(r=>r.level===level);return p&&r&&r.seconds>0&&r.amount>0?{...p,seconds:r.seconds,amount:r.amount}:null;}
export const farmGrowthKnowledge=p=>Math.floor(p.seconds/60)*2;
export function validFarm(s){
 const f=s.farm;if(f===undefined)return true;
 if(!f||!validFarmTrade(f)||typeof f!=='object'||Array.isArray(f)||!int(f.knowledge)||!f.harvests||typeof f.harvests!=='object'||Array.isArray(f.harvests)||!Array.isArray(f.plots)||f.plots.length<1||f.plots.length>6)return false;
 if(!Object.entries(f.harvests).every(([id,n])=>plants.has(id)&&int(n)))return false;
 return f.plots.every(p=>p===null||(p&&plants.has(p.plant)&&(p.harvestLevel===undefined||[1,2,3].includes(p.harvestLevel))&&!!farmHarvestPlan(p.plant,p.harvestLevel??1)&&Number.isSafeInteger(p.readyAt)&&p.readyAt>=0&&typeof p.watered==='boolean'));
}
export function farmAction(s,action,target,value){
 const trade=farmTradeAction(s,action,target,value);if(trade)return trade;
 if(!['openFarm','sowFarm','waterFarm','harvestFarm','finishFarm','expandFarm'].includes(action))return null;
 const fail=error=>({state:s,error}),f=s.farm;
 if(action==='openFarm'){
  if(f)return fail('Magic Farm is already open.');return {state:{...s,farm:{knowledge:0,harvests:{},plots:[null]}},message:'Magic Farm opened. Choose your first plant.'};
 }
 if(!f)return fail('Open Magic Farm first.');const result=(farm,message)=>({state:{...s,farm},message});
 if(action==='expandFarm'){
  if(f.plots.length>=6)return fail('All six sandbox plots are open.');const cost=f.plots.length*100;if(f.knowledge<cost)return fail('Gain more Knowledge by tending plants.');
  return result({...f,knowledge:f.knowledge-cost+10,plots:[...f.plots,null]},'Plot reclaimed. +10 Knowledge.');
 }
 if(!Number.isInteger(target)||target<0||target>=f.plots.length)return fail('Choose an open plot.');const current=f.plots[target],plots=[...f.plots];
 if(action==='sowFarm'){
  const id=typeof value==='string'?value:value?.plant,level=typeof value==='string'?1:value?.level,p=farmHarvestPlan(id,level);if(![1,2,3].includes(level))return fail('Choose a supported harvest level.');if(current)return fail('Harvest the current plant first.');if(!p)return fail('Choose a known plant.');if(f.knowledge+10>1e9)return fail('Spend Knowledge before sowing.');
  plots[target]={plant:id,harvestLevel:level,readyAt:s.lastAt+p.seconds*1000,watered:false};return result({...f,plots,knowledge:f.knowledge+10},'Seeds sown. +10 Knowledge.');
 }
 if(!current)return fail('Sow this plot first.');const p=farmHarvestPlan(current.plant,current.harvestLevel??1);
 if(action==='waterFarm'){
  if(current.watered||current.readyAt<=s.lastAt)return fail('This plant no longer needs watering.');if(f.knowledge+10>1e9)return fail('Spend Knowledge first.');
  plots[target]={...current,watered:true};return result({...f,plots,knowledge:f.knowledge+10},'Plant watered. +10 Knowledge.');
 }
 if(action==='finishFarm'){
  if(current.readyAt<=s.lastAt)return fail('This plant is already ready.');plots[target]={...current,readyAt:s.lastAt};return result({...f,plots},'Sandbox: plant matured. Harvest when ready.');
 }
 if(current.readyAt>s.lastAt)return fail('This plant is still growing.');const knowledge=farmGrowthKnowledge(p);
 if(f.knowledge+knowledge>1e9||(f.harvests[p.id]||0)+p.amount>1e9)return fail('Make room for the full harvest first.');
 plots[target]=null;return result({...f,plots,knowledge:f.knowledge+knowledge,harvests:{...f.harvests,[p.id]:(f.harvests[p.id]||0)+p.amount}},`${p.amount} ${p.name} harvested. +${knowledge} Knowledge.`);
}
