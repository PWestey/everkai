import {validArtifactEchoes,enableArtifactEcho} from './artifact-echo.mjs';
import data from './artifact-rules.json' with {type:'json'};
export const artifactRule=id=>data.records[id]||null;
export const ARTIFACT_CAP=20; // Conservative sandbox limit; original endgame caps remain unverified.
export const gearLevel=f=>f.gear?f.gearLevel||1:1;
export const artifactBonus=f=>f.gear?(artifactRule(f.gear)?.perLevel||0)*(gearLevel(f)-1):0;
export const artifactState=s=>s.artifacts||{ore:0,bag:{}};
const int=(v,max)=>Number.isInteger(v)&&v>=0&&v<=max;
export function validArtifacts(s){
 if(!validArtifactEchoes(s))return false;
 if(!Object.values(s.fellows).every(f=>f.gearLevel===undefined||Number.isInteger(f.gearLevel)&&f.gearLevel>=1&&f.gearLevel<=ARTIFACT_CAP&&(f.gear!==null||f.gearLevel===1)))return false;
 if(!Object.values(s.fellows).every(f=>f.gearOreSpent===undefined||artifactRule(f.gear)&&gearLevel(f)>1&&int(f.gearOreSpent,1e9)&&f.gearOreSpent>0))return false;
 if(s.artifacts===undefined)return true;
 const a=s.artifacts;if(!a||!int(a.ore,1e9)||!a.bag||typeof a.bag!=='object'||Array.isArray(a.bag))return false;
 const validBag=Object.entries(a.bag).every(([id,levels])=>artifactRule(id)&&levels&&typeof levels==='object'&&!Array.isArray(levels)&&Object.entries(levels).every(([l,n])=>String(Number(l))===l&&Number(l)>=2&&Number(l)<=ARTIFACT_CAP&&Number.isInteger(Number(l))&&int(n,1e6)&&n>0)&&Object.values(levels).reduce((a,b)=>a+b,0)<=s.inventory[id]);
 if(!validBag)return false;
 if(a.paidBag===undefined)return true;
 if(!a.paidBag||typeof a.paidBag!=='object'||Array.isArray(a.paidBag))return false;
 return Object.entries(a.paidBag).every(([id,levels])=>artifactRule(id)&&levels&&typeof levels==='object'&&!Array.isArray(levels)&&Object.entries(levels).every(([level,costs])=>a.bag[id]?.[level]&&costs&&typeof costs==='object'&&!Array.isArray(costs)&&Object.entries(costs).every(([ore,count])=>String(Number(ore))===ore&&int(Number(ore),1e9)&&Number(ore)>0&&int(count,1e6)&&count>0)&&Object.values(costs).reduce((sum,n)=>sum+n,0)<=a.bag[id][level]));
}
// Ordinary level-one copies remain counted in inventory. Only upgraded copies need metadata.
function removePaid(paidBag,id,level,spent){
 if(--paidBag[id][level][spent]===0)delete paidBag[id][level][spent];
 if(!Object.keys(paidBag[id][level]).length)delete paidBag[id][level];
 if(!Object.keys(paidBag[id]).length)delete paidBag[id];
}
export function transferArtifact(s,target,value){
 const f=s.fellows[target],a=artifactState(s),bag=structuredClone(a.bag),paidBag=structuredClone(a.paidBag||{}),inventory={...s.inventory};
 let nextLevel=1,nextSpent;
 if(value){
  const levels=bag[value]||{},available=Object.keys(levels).map(Number).filter(l=>levels[l]>0).sort((a,b)=>b-a);
  if(available.length){
   nextLevel=available[0];const paid=Object.keys(paidBag[value]?.[nextLevel]||{}).map(Number).sort((a,b)=>a-b);
   if(paid.length){nextSpent=paid[0];removePaid(paidBag,value,nextLevel,nextSpent)}
   if(--levels[nextLevel]===0)delete levels[nextLevel];if(!Object.keys(levels).length)delete bag[value];
  }
  inventory[value]--;
 }
 if(f.gear){inventory[f.gear]++;if(gearLevel(f)>1){
  bag[f.gear]||={};bag[f.gear][gearLevel(f)]=(bag[f.gear][gearLevel(f)]||0)+1;
  if(f.gearOreSpent!==undefined){paidBag[f.gear]||={};paidBag[f.gear][gearLevel(f)]||={};paidBag[f.gear][gearLevel(f)][f.gearOreSpent]=(paidBag[f.gear][gearLevel(f)][f.gearOreSpent]||0)+1;}
 }}
 const fellow={...f,gear:value,gearLevel:nextLevel};delete fellow.gearOreSpent;
 if(nextSpent!==undefined)fellow.gearOreSpent=nextSpent;
 return {...s,inventory,artifacts:{...a,bag,paidBag},fellows:{...s.fellows,[target]:fellow}};
}
export function trackedCopies(s,id){return Object.entries(artifactState(s).paidBag?.[id]||{}).flatMap(([level,costs])=>Object.entries(costs).map(([spent,count])=>({level:Number(level),spent:Number(spent),count}))).sort((a,b)=>a.level-b.level||a.spent-b.spent);}
export function trackedRefund(s,id,level,spent){const rule=artifactRule(id);return rule?.recycle&&artifactState(s).paidBag?.[id]?.[level]?.[spent]?spent+rule.recycle:null;}
export function artifactAction(s,action,target,value){
 if(action==='enableArtifactEcho')return enableArtifactEcho(s,target);
 if(!['upgradeArtifact','upgradeArtifactMax','recycleArtifact','recycleTrackedArtifact'].includes(action))return null;
 const fail=error=>({state:s,error}),a=artifactState(s);
 if(action==='recycleTrackedArtifact'){
  const level=value?.level,spent=value?.spent;
  if(!int(level,ARTIFACT_CAP)||level<2||!int(spent,1e9)||spent<1)return fail('Choose a copy with a recorded upgrade investment.');
  const refund=trackedRefund(s,target,level,spent);if(refund===null)return fail('This copy has no complete investment record or verified base reward.');
  if(a.ore+refund>1e9)return fail('Make room for the full Magic Ore refund first.');
  const bag=structuredClone(a.bag),paidBag=structuredClone(a.paidBag);
  if(--bag[target][level]===0)delete bag[target][level];if(!Object.keys(bag[target]).length)delete bag[target];
  removePaid(paidBag,target,level,spent);
  return {state:{...s,inventory:{...s.inventory,[target]:s.inventory[target]-1},artifacts:{...a,bag,paidBag,ore:a.ore+refund}},message:`Recycled one level-${level} copy: ${spent} invested Ore returned plus ${artifactRule(target).recycle} base Ore.`};
 }
 if(action==='recycleArtifact'){
  const rule=artifactRule(target);if(!rule?.recycle||![1,'all'].includes(value))return fail('Choose equipment with a documented recycle reward.');
  const count=Math.min(basicCopies(s,target),value==='all'?1e6:1,Math.floor((1e9-a.ore)/rule.recycle));
  if(!count)return fail('No level-one copies can be recycled, or Magic Ore storage is full.');
  return {state:{...s,inventory:{...s.inventory,[target]:s.inventory[target]-count},artifacts:{...a,ore:a.ore+count*rule.recycle}},message:`Recycled ${count} level-one copies: +${count*rule.recycle} Magic Ore.`};
 }
 const f=s.fellows[target],r=artifactRule(f?.gear);if(!f||!r)return fail('Equip a supported artifact first.');
 if(gearLevel(f)>=ARTIFACT_CAP)return fail('Current sandbox artifact level limit reached.');
 if(a.ore<r.ore)return fail('Take more Magic Ore from the Equipment page.');
 const count=action==='upgradeArtifactMax'?artifactUpgradePlan(s,target).count:1;
 return {state:{...s,artifacts:{...a,ore:a.ore-r.ore*count},fellows:{...s.fellows,[target]:{...f,gearLevel:gearLevel(f)+count,...(gearLevel(f)===1||f.gearOreSpent!==undefined?{gearOreSpent:(f.gearOreSpent||0)+r.ore*count}:{})}}},message:`Artifact reached level ${gearLevel(f)+count}: +${r.perLevel*count} Aptitude.`};
}

export const basicCopies=(s,id)=>Math.max(0,(s.inventory[id]||0)-Object.values(artifactState(s).bag[id]||{}).reduce((a,b)=>a+b,0));
export function artifactUpgradePlan(s,id){const f=s.fellows[id],r=artifactRule(f?.gear);if(!r)return {count:0,cost:0};const count=Math.min(ARTIFACT_CAP-gearLevel(f),Math.floor(artifactState(s).ore/r.ore));return {count,cost:count*r.ore};}
