import bonds from './expo-bond-data.json' with {type:'json'};
import data from './expo-data.json' with {type:'json'};
import {bondedPower} from './adventure.mjs';
export const EXPO_STALLS=[...data.stalls].sort((a,b)=>a.id.localeCompare(b.id));
export const EXPO_STAGES=data.stages.slice(0,5);
const stalls=new Map(EXPO_STALLS.map(x=>[x.id,x]));
const empty={stalls:{},assigned:{},sequence:0,active:null,last:null,clears:[],spentCoins:0,transferredPearls:0};
export const expoState=s=>s.expo||empty;
export const expoStartKey=s=>`expo:start:${expoState(s).sequence+1}`;
export const expoStepKey=s=>{const r=expoState(s).active;return r?`expo:${r.sequence}:step:${r.step}`:''};
export const stallBonus=(id,level)=>{const x=stalls.get(id);return x.base+(level-1)*x.step};
export const expoBond=id=>bonds.records.find(x=>x.stall===id)||null;
export function expoOperator(s,stall,fellow){const e=expoState(s),x=stalls.get(stall),power=bondedPower(s,fellow),bonus=stallBonus(stall,e.stalls[stall]||1),rule=expoBond(stall),bond=rule?.fellow===fellow?{skill:rule.skill,fellow:rule.fellow,percent:rule.percent}:null;return {stall,fellow,power,bonus,goods:x.goods,bond,sales:Math.floor(power*(1+bonus/100)*(1+(bond?.percent||0)/100))}}
function validSlot(x,r,s){if(!obj(x)||!stalls.has(x.stall)||!Object.hasOwn(s.fellows||{},x.fellow)||!int(x.power,1e12)||!Number.isFinite(x.bonus)||x.bonus<0||x.bonus>1000||!goods.includes(x.goods))return false;if(r.policyVersion===1)return x.bond===undefined&&x.sales===Math.floor(x.power*(1+x.bonus/100));if(x.bond!==null&&(!obj(x.bond)||x.bond.skill!=='Towerskill_'+x.stall||x.bond.fellow!==x.fellow||!bonds.records.some(b=>b.skill===x.bond.skill&&b.fellow===x.bond.fellow)||!int(x.bond.percent,100)||x.bond.percent<=0))return false;return x.sales===Math.floor(x.power*(1+x.bonus/100)*(1+(x.bond?.percent||0)/100))}
export function expoLocker(s){const e=expoState(s),out={};for(const r of e.clears)for(const x of r.rewards)out[x.id]=(out[x.id]||0)+x.amount;out.item_TowerDefense_2=(out.item_TowerDefense_2||0)-e.spentCoins;out.Item_Talent_Hero_1=(out.Item_Talent_Hero_1||0)-e.transferredPearls;return out}
export function expoVisitors(r){return r.customers.slice(0,r.step).map(c=>{const capacity=r.slots.reduce((n,x)=>n+Math.floor(x.sales*(c.goods===null||x.goods==='All types'||x.goods===c.goods?1:.1)),0)*r.rounds;return {...c,spent:Math.min(c.funds,capacity),satisfied:capacity>=c.funds}})}
export const expoRating=r=>r.rating-expoVisitors(r).filter(x=>!x.satisfied).length;
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x),int=(x,max=1e9)=>Number.isSafeInteger(x)&&x>=0&&x<=max,goods=['Food','Beverage','Gifts','All types'];
function validRun(r,s){return obj(r)&&[1,2].includes(r.policyVersion)&&int(r.sequence,Number.MAX_SAFE_INTEGER)&&r.sequence>0&&int(r.stage,5)&&r.stage>0&&int(r.startedAt,Number.MAX_SAFE_INTEGER)&&r.startedAt<=s.lastAt&&r.rounds===5&&r.rating===5&&int(r.step,5)&&Array.isArray(r.slots)&&r.slots.length>0&&r.slots.length<=EXPO_STAGES[r.stage-1].slots&&new Set(r.slots.map(x=>x?.stall)).size===r.slots.length&&new Set(r.slots.map(x=>x?.fellow)).size===r.slots.length&&r.slots.every(x=>validSlot(x,r,s))&&Array.isArray(r.customers)&&r.customers.length===5&&r.customers.every(x=>obj(x)&&[null,...goods].includes(x.goods)&&int(x.funds,1e12)&&x.funds>0)&&Array.isArray(r.rewards)&&r.rewards.length>0&&r.rewards.length<=10&&new Set(r.rewards.map(x=>x?.id)).size===r.rewards.length&&r.rewards.every(x=>obj(x)&&data.stages.slice(0,5).some(t=>t.rewards.some(y=>y.id===x.id))&&typeof x.name==='string'&&x.name.length<=100&&int(x.amount,1e6)&&x.amount>0)}
export function validExpo(s){
 if(s.expo===undefined)return true;const e=s.expo;if(!obj(e)||!obj(e.stalls)||!obj(e.assigned)||!int(e.sequence,Number.MAX_SAFE_INTEGER)||!Array.isArray(e.clears)||e.clears.length>5||!int(e.spentCoins)||!int(e.transferredPearls))return false;
 if(!Object.entries(e.stalls).every(([id,l])=>stalls.has(id)&&int(l,Math.min(10,stalls.get(id).maxLevel))&&l>0)||!Object.entries(e.assigned).every(([id,f])=>Object.hasOwn(e.stalls,id)&&Object.hasOwn(s.fellows||{},f))||new Set(Object.values(e.assigned)).size!==Object.keys(e.assigned).length||Object.keys(e.assigned).length>3)return false;
 if(!e.clears.every((r,n)=>validRun(r,s)&&r.stage===n+1&&r.step===5&&expoRating(r)>0&&r.sequence<=e.sequence&&(n===0||r.sequence>e.clears[n-1].sequence)))return false;
 if(e.active!==null&&(!validRun(e.active,s)||e.active.sequence!==e.sequence||e.active.step>=5||e.active.stage!==e.clears.length+1||e.active.sequence<=(e.clears.at(-1)?.sequence||0)))return false;
 if(e.last!==null&&(!validRun(e.last,s)||e.last.step!==5||e.last.sequence>e.sequence||(e.active&&e.last.sequence>=e.active.sequence)||(expoRating(e.last)>0&&!e.clears.some(r=>JSON.stringify(r)===JSON.stringify(e.last)))))return false;
 if(e.sequence===0&&(e.active!==null||e.last!==null||e.clears.length))return false;if(e.sequence>0&&!(e.active?.sequence===e.sequence||e.last?.sequence===e.sequence))return false;
 const costs=Object.values(e.stalls).reduce((n,l)=>n+(l-1)*100,0);if(e.spentCoins!==costs)return false;return Object.values(expoLocker(s)).every(n=>int(n));
}
export function expoAction(s,action,target,value){
 if(!['claimExpoStall','assignExpo','removeExpo','startExpo','serveExpo','upgradeExpo','takeExpoPearls'].includes(action))return null;
 const e=expoState(s),fail=error=>({state:s,error}),done=(expo,message,inventory=s.inventory)=>({state:{...s,expo,inventory},message});
 if(action==='serveExpo'){
  const r=e.active;if(!r||target!==expoStepKey(s))return fail('This visitor was already served.');const next={...r,step:r.step+1};if(next.step<5)return done({...e,active:next},expoVisitors(next).at(-1).satisfied?'Customer satisfied!':'Customer left with money · rating −1.');
  const won=expoRating(next)>0;return done({...e,active:null,last:next,clears:won?[...e.clears,next]:e.clears},won?'Business day cleared · rewards saved in the Expo locker.':'Business day ended · improve your stalls or Fellows and retry.');
 }
 if(e.active)return fail('Finish the current business day first.');
 if(action==='claimExpoStall'){if(!stalls.has(target)||Object.hasOwn(e.stalls,target))return fail('Choose a stall you do not own yet.');return done({...e,stalls:{...e.stalls,[target]:1}},'Stall received · free sandbox claim.');}
 if(action==='assignExpo'){
  if(!Object.hasOwn(e.stalls,target)||!Object.hasOwn(s.fellows,value))return fail('Choose an owned stall and Fellow.');const assigned=Object.fromEntries(Object.entries(e.assigned).filter(([id,f])=>id!==target&&f!==value));assigned[target]=value;const stage=EXPO_STAGES[e.clears.length];if(!stage||Object.keys(assigned).length>stage.slots)return fail(`This stage allows ${stage?.slots||0} stalls. Remove a stall first.`);return done({...e,assigned},'Fellow assigned to Expo stall.');
 }
 if(action==='removeExpo'){if(!Object.hasOwn(e.assigned,target))return fail('This stall is not deployed.');const assigned={...e.assigned};delete assigned[target];return done({...e,assigned},'Stall removed from the Expo route.');}
 if(action==='upgradeExpo'){
  const x=stalls.get(target),level=e.stalls[target];if(!x||!level||value!==level)return fail('This stall improvement is no longer current.');if(level>=Math.min(10,x.maxLevel))return fail('Current stall level cap reached.');if((expoLocker(s).item_TowerDefense_2||0)<100)return fail('Clear more Expo stages for 100 Expo Coins.');return done({...e,stalls:{...e.stalls,[target]:level+1},spentCoins:e.spentCoins+100},'Stall Sales Bonus improved.');
 }
 if(action==='takeExpoPearls'){
  const n=expoLocker(s).Item_Talent_Hero_1||0;if(n<=0||target!==`pearls:${n}:${e.transferredPearls}`)return fail('These pearls were already transferred.');if(s.inventory.Item_Talent_Hero_1+n>1e6)return fail('Make room in the Bag for the full pearl transfer.');return done({...e,transferredPearls:e.transferredPearls+n},`${n} Skill Pearls moved to the Bag.`,{...s.inventory,Item_Talent_Hero_1:s.inventory.Item_Talent_Hero_1+n});
 }
 const stage=EXPO_STAGES[e.clears.length];if(!stage)return fail('All five supported Expo stages cleared.');if(target!==expoStartKey(s)||e.sequence>=Number.MAX_SAFE_INTEGER)return fail('This business day was already started.');
 const slots=Object.entries(e.assigned).map(([stall,fellow])=>expoOperator(s,stall,fellow));if(!slots.length||slots.length>stage.slots)return fail(`Deploy one to ${stage.slots} staffed stalls first.`);
 const picky=stage.types.filter(x=>x.amount!==null),customers=Array.from({length:5},(_,n)=>{const p=picky.length&&n%2===0?picky[n%picky.length]:null;return {goods:p?p.goods:null,funds:p?p.amount:stage.power}});
 const active={policyVersion:2,sequence:e.sequence+1,stage:stage.id,startedAt:s.lastAt,rounds:5,rating:5,step:0,slots,customers,rewards:structuredClone(stage.rewards)};return done({...e,sequence:active.sequence,active},'Expo opened · staff and rewards saved for this business day.');
}
