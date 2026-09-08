import {originalProgression,originalCost} from './original-progression.mjs';
import data from './original-training-costs.json' with {type:'json'};
export const originalTrainingCost=level=>data.costs[level]??null;
export const sourceTraining=s=>s.trainingCosts?.policyVersion===2;
export function validTrainingCosts(s){
 const t=s.trainingCosts;if(t===undefined)return true;
 const integer=n=>Number.isInteger(n)&&n>=1&&n<=750;
 if(!t||t.policyVersion!==2||!t.baselineLevels||typeof t.baselineLevels!=='object'||Array.isArray(t.baselineLevels)||!Array.isArray(t.receipts)||t.receipts.length>10000)return false;
 const levels={};for(const [id,n] of Object.entries(t.baselineLevels)){if(!Object.hasOwn(s.fellows,id)||!integer(n))return false;levels[id]=n;}
 for(const r of t.receipts){if(!r||(r.costPolicy!==undefined&&r.costPolicy!==3)||r.costPolicy===3&&!originalProgression(s)||!Object.hasOwn(s.fellows,r.id)||!integer(r.from)||!integer(r.to)||r.to<=r.from||r.from!==(levels[r.id]??1))return false;let cost=0;for(let i=r.from;i<r.to;i++){const n=r.costPolicy===3?originalCost(i):originalTrainingCost(i);if(n===null)return false;cost+=n;}if(r.cost!==cost)return false;levels[r.id]=r.to;}
 return Object.entries(s.fellows).every(([id,f])=>f.level===(levels[id]??1));
}
export const activateTrainingCosts=s=>({...s,trainingCosts:{policyVersion:2,baselineLevels:Object.fromEntries(Object.entries(s.fellows).map(([id,f])=>[id,f.level])),receipts:[]}});
export const recordTraining=(s,id,from,to,cost)=>sourceTraining(s)?{trainingCosts:{...s.trainingCosts,receipts:[...s.trainingCosts.receipts,{id,from,to,cost,...(originalProgression(s)?{costPolicy:3}:{})}]}}:{};
