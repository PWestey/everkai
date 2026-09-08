import {WORKSHOP_POLICY,workshopType,validWorkshopPolicyJob} from './workshop-policy.mjs';
import data from './workshop-data.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
export const WORKSHOP_PRODUCTS=data.records.map(p=>({...p,type:workshopType(p.id)}));
export const workshopMastery=(w,id)=>w.mastery?.[id]?.tier||0;
export const workshopAvailableXP=(w,id)=>(w.salesXP[id]||0)-(w.mastery?.[id]?.spent||0);
const coins=(p,j,seconds)=>Math.floor(seconds*p.coinsPerSecond*(10+(j.masteryTier||0))/10);
const byId=new Map(WORKSHOP_PRODUCTS.map(p=>[p.id,p]));
export const workshopProduct=id=>byId.get(id);
export const workshopHot=(id,now)=>Number(id)%1000===((Math.floor(now/86400000)%10+10)%10)+1;
export const workshopUnlocked=(w,id)=>Number(id)%1000===1||(w.crafted[String(Number(id)-1)]||0)>0;
export const freshWorkshop=()=>({supplies:20,deposit:0,wallet:0,crafted:{},salesXP:{},job:null});
const int=(v,max=1e9)=>Number.isInteger(v)&&v>=0&&v<=max;
const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
export function validWorkshop(s){
 const w=s.workshop;if(w===undefined)return true;
 if(!object(w)||!['supplies','deposit','wallet'].every(k=>int(w[k]))||!object(w.crafted)||!object(w.salesXP))return false;
 if(!Object.entries(w.crafted).every(([id,n])=>byId.has(id)&&int(n))||!Object.entries(w.salesXP).every(([id,n])=>Object.hasOwn(s.fellows,id)&&int(n)))return false;
 if(w.mastery!==undefined&&(!object(w.mastery)||!Object.entries(w.mastery).every(([id,m])=>Object.hasOwn(s.fellows,id)&&object(m)&&m.policyVersion===1&&int(m.tier,10)&&m.spent===50*m.tier*(m.tier+1)&&m.spent<=(w.salesXP[id]||0))))return false;
 if(w.job===null)return true;const j=w.job,p=byId.get(j?.product);
 if(!object(j)||!p||!((j.masteryTier===undefined&&j.masteryPolicy===undefined)||(j.masteryPolicy===1&&int(j.masteryTier,10)&&j.masteryTier<=workshopMastery(w,j.fellow)))||!Object.hasOwn(s.fellows,j.fellow)||!validWorkshopPolicyJob(j)||fellowById(j.fellow)?.type!==workshopType(p.id,j.policyVersion??1)||!int(j.count,10)||j.count<1||!Number.isSafeInteger(j.startAt)||j.startAt<0||!int(j.secondsDone,j.count*p.seconds-1)||!int(j.unitsDone,j.count-1)||j.unitsDone!==Math.floor(j.secondsDone/p.seconds)||![p.salesXP,p.salesXP*1.2].includes(j.xpPerUnit))return false;
 return w.deposit+coins(p,j,j.count*p.seconds)-coins(p,j,j.secondsDone)<=1e9&&(w.salesXP[j.fellow]||0)+(j.count-j.unitsDone)*j.xpPerUnit<=1e9&&(w.crafted[p.id]||0)+j.count-j.unitsDone<=1e9;
}
export function settleWorkshop(s,now){
 const w=s.workshop,j=w?.job;if(!j)return s;const p=byId.get(j.product),seconds=Math.min(j.count*p.seconds,Math.max(j.secondsDone,Math.floor((now-j.startAt)/1000))),units=Math.floor(seconds/p.seconds),delta=seconds-j.secondsDone,completed=units-j.unitsDone;
 if(!delta)return s;
 return {...s,workshop:{...w,deposit:w.deposit+coins(p,j,seconds)-coins(p,j,j.secondsDone),crafted:{...w.crafted,[p.id]:(w.crafted[p.id]||0)+completed},salesXP:{...w.salesXP,[j.fellow]:(w.salesXP[j.fellow]||0)+completed*j.xpPerUnit},job:units===j.count?null:{...j,secondsDone:seconds,unitsDone:units}}};
}
export function workshopAction(s,action,target,value){
 if(!['openWorkshop','restockWorkshop','startWorkshop','finishWorkshop','collectWorkshop','buyWorkshopPearl','upgradeWorkshopMastery'].includes(action))return null;
 const fail=error=>({state:s,error}),w=s.workshop;
 if(action==='openWorkshop'){
  if(w)return fail('Workshop production is already open.');if(!s.enterprises?.Building_301)return fail('Open the original Workshop business first.');
  return {state:{...s,workshop:freshWorkshop()},message:'Workshop production opened.'};
 }
 if(!w)return fail('Open Workshop production first.');const result=(next,message,extra={})=>({state:{...s,...extra,workshop:next},message});
 if(action==='upgradeWorkshopMastery'){
  if(!Object.hasOwn(s.fellows,target))return fail('Choose an owned Fellow.');
  const tier=workshopMastery(w,target),cost=100*(tier+1);
  if(tier>=10)return fail('Local mastery is at its tier 10 cap.');
  if(workshopAvailableXP(w,target)<cost)return fail(`Earn ${cost} available Sales EXP first.`);
  return result({...w,mastery:{...w.mastery,[target]:{policyVersion:1,tier:tier+1,spent:(w.mastery?.[target]?.spent||0)+cost}}},'Local mastery upgraded. Future jobs gain 10% more base coins.');
 }
 if(action==='restockWorkshop'){const count=Math.min(20,1e9-w.supplies);if(!count)return fail('Workshop Supplies are full.');return result({...w,supplies:w.supplies+count},`${count} local Workshop Supplies added.`);}
 if(action==='collectWorkshop'){
  if(!w.deposit)return fail('No Workshop coins to collect.');if(w.wallet+w.deposit>1e9)return fail('Spend wallet coins before collecting the full deposit.');
  return result({...w,wallet:w.wallet+w.deposit,deposit:0},'Workshop coins collected.');
 }
 if(action==='buyWorkshopPearl'){
  if(w.wallet<2000)return fail('Collect 2,000 Workshop coins first.');const id='Item_Talent_Hero_1';if(s.inventory[id]>=1e9)return fail('Use some Skill Pearls first.');
  return result({...w,wallet:w.wallet-2000},'Skill Pearl added to your bag.',{inventory:{...s.inventory,[id]:s.inventory[id]+1}});
 }
 if(action==='finishWorkshop'){
  if(!w.job)return fail('No manufacturing task is running.');const p=byId.get(w.job.product);
  return {state:settleWorkshop(s,w.job.startAt+w.job.count*p.seconds*1000),message:'Sandbox: remaining production time completed.'};
 }
 const p=byId.get(target),fellow=value?.fellow,count=value?.count;
 if(w.job)return fail('Manufacturing cannot be canceled. Finish the current task first.');
 if(!p||!workshopUnlocked(w,target))return fail('Craft the preceding product to unlock this one.');
 if(!Object.hasOwn(s.fellows,fellow)||fellowById(fellow)?.type!==p.type)return fail('Choose an owned Fellow matching this product’s sandbox type.');
 if(![1,5,10].includes(count)||w.supplies<count)return fail('Choose a batch with enough supplies.');
 const masteryTier=workshopMastery(w,fellow),xpPerUnit=p.salesXP*(workshopHot(target,s.lastAt)?1.2:1);
 if(w.deposit+coins(p,{masteryTier},count*p.seconds)>1e9||(w.salesXP[fellow]||0)+count*xpPerUnit>1e9||(w.crafted[target]||0)+count>1e9)return fail('Make room for the complete batch rewards first.');
 return result({...w,supplies:w.supplies-count,job:{product:target,masteryPolicy:1,masteryTier,policyVersion:WORKSHOP_POLICY,assignedType:p.type,fellow,count,startAt:s.lastAt,secondsDone:0,unitsDone:0,xpPerUnit}},'Manufacturing started. Workshop coins accumulate during production.');
}
