import {validSpecialBlessings} from './special-blessings.mjs';
import source from './original-blessing-data.json' with {type:'json'};
import {originalProgression} from './original-progression.mjs';
import {originalCharacter} from './original-catalog.mjs';
import {affinityIds,hasAffinity} from './public-reference.mjs';
// Early complete rows transcribed from https://isekai.wiki/Family, checked 2026-09-07.
// Values are totals at each level, not amounts to accumulate at every upgrade.
export const BLESSINGS={
 flatBlessing:{name:'Fellow Blessing',values:[0,1000,1700,2600,3700,5050,6650,8450,10500,12700,15200,17890,20800,24000,27300,30900,34790,38790,43100,47600,52300,57300,62400,67800,73500,79300,85400,91700,98200,105000,112000,119000,127000,134000,142000,150000,159000],costs:[0,100,110,120,130,140,155,170,185,200,215,235,255,275,295,315,335,355,375,395,415,440,465,490,515,540,565,590,615,640,665,695,725,755,785,815,850]},
 advancedBlessing:{name:'Advanced Blessing',values:[0,.005,.01,.015,.02,.025,.03,.035,.04,.045,.05,.055,.06,.065,.07,.075,.08,.085,.09,.095,.10,.105,.11,.115,.12],costs:[0,500,550,600,650,700,755,810,865,920,975,1030,1080,1140,1190,1250,1310,1370,1430,1490,1550,1610,1680,1740,1810]}
};
export const blessingLevel=(f,key)=>f[key]||0;
const sourceValue=(key,level)=>level===0?0:key==='flatBlessing'?source.rows[level].flat:source.rows[level].percent/10000;
export const blessingRecipients=(s,id)=>originalProgression(s)?source.recipients[id]||[]:affinityIds(id);
export const blessingValue=(f,key)=>{const h=f.apkBlessings?.[key];return h?h.value+sourceValue(key,blessingLevel(f,key))-sourceValue(key,h.level):BLESSINGS[key].values[blessingLevel(f,key)];};
export const nextBlessingCost=(f,key,s=null)=>{const level=blessingLevel(f,key);return originalProgression(s)?level>=700?null:source.rows[Math.max(1,level)][key==='flatBlessing'?'flatCost':'percentCost']:BLESSINGS[key].costs[level+1]??null;};
export const nextBlessingValue=(s,f,key)=>originalProgression(s)?blessingValue(f,key)+sourceValue(key,blessingLevel(f,key)+1)-sourceValue(key,blessingLevel(f,key)):BLESSINGS[key].values[blessingLevel(f,key)+1];
export const blessingPower=(s,id)=>Object.entries(s.family).reduce((total,[family,f])=>{
 for(const key of Object.keys(BLESSINGS)){const h=f.apkBlessings?.[key],field=key==='flatBlessing'?'flat':'percent';if(h){if(h.legacyRecipients.includes(id))total[field]+=h.value;if(h.recipients.includes(id))total[field]+=sourceValue(key,blessingLevel(f,key))-sourceValue(key,h.level);}else if(hasAffinity(family,id))total[field]+=blessingValue(f,key);}return total;
},{flat:0,percent:0});
export function validBlessings(s){return validSpecialBlessings(s)&&Object.entries(s.family).every(([id,f])=>{
 if(f.apkBlessings!==undefined&&(!originalProgression(s)||!f.apkBlessings||Array.isArray(f.apkBlessings)||typeof f.apkBlessings!=='object'||Object.keys(f.apkBlessings).some(k=>!BLESSINGS[k])))return false;
 return Object.entries(BLESSINGS).every(([key,r])=>{const level=blessingLevel(f,key),h=f.apkBlessings?.[key];if(!Number.isInteger(level)||level<0||level>700)return false;if(!h)return level<r.values.length;
 if(h.policyVersion!==1||!Number.isInteger(h.level)||h.level<0||h.level>=r.values.length||h.value!==r.values[h.level]||!Array.isArray(h.receipts)||!h.receipts.length||h.receipts.length>700)return false;
 const ids=a=>Array.isArray(a)&&a.length<=300&&new Set(a).size===a.length&&a.every(x=>typeof x==='string'&&x.startsWith('hero_')&&originalCharacter(x));if(!ids(h.legacyRecipients)||!ids(h.recipients)||!h.recipients.length||JSON.stringify(h.recipients)!==JSON.stringify(source.recipients[id]))return false;
 let n=h.level;for(const x of h.receipts){if(!x||x.from!==n||!Number.isInteger(x.to)||x.to<=n||x.to>700)return false;let cost=0;for(let l=n;l<x.to;l++)cost+=source.rows[Math.max(1,l)][key==='flatBlessing'?'flatCost':'percentCost'];if(x.cost!==cost)return false;n=x.to;}return n===level;
 });
});}
export function blessingAction(s,action,target,key){
 if(!['trainBlessing','trainBlessingsMax'].includes(action))return null;
 const fail=error=>({state:s,error}),f=s.family[target];
 if(!f||!Object.hasOwn(BLESSINGS,key))return fail('Choose a family member and a blessing.');
 const recipients=blessingRecipients(s,target);if(!recipients.length)return fail('No supported ungated Fellows are available for new blessings.');
 const plan=blessingPlan(f,key,s,action==='trainBlessing'?1:700);if(!plan.count)return fail('No affordable supported upgrades remain.');
 let extra={};if(originalProgression(s)){const old=f.apkBlessings?.[key]||{policyVersion:1,level:blessingLevel(f,key),value:blessingValue(f,key),legacyRecipients:[...affinityIds(target)],recipients:[...recipients],receipts:[]};extra={apkBlessings:{...f.apkBlessings,[key]:{...old,receipts:[...old.receipts,{from:blessingLevel(f,key),to:plan.level,cost:plan.cost}]}}};}
 return {state:{...s,family:{...s.family,[target]:{...f,...extra,[key]:plan.level,points:f.points-plan.cost}}},message:`${BLESSINGS[key].name}: ${plan.count} upgrades for ${plan.cost.toLocaleString()} Blessing Points.`};
}
export function blessingPlan(f,key,s=null,max=700){
 let level=blessingLevel(f,key),cost=0,count=0;
 while(count<max){const price=nextBlessingCost({...f,[key]:level},key,s);if(price===null||cost+price>f.points)break;cost+=price;level++;count++;}
 return {level,cost,count};
}
