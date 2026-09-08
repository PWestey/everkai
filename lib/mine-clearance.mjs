import data from './mine-clearance-data.json' with {type:'json'};
import {bondedPower} from './adventure.mjs';
import {artifactState} from './artifacts.mjs';
// Policy1 encounter thresholds are frozen. Add a new policy instead of rewriting old runs.
export const MINE_ROWS=data.rows;
const DAY=86400000,LIMIT=10000,TOTAL=MINE_ROWS.at(-1).cumulativePower;
const int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
export const mineDay=s=>Math.floor(s.lastAt/DAY);
export const mineState=s=>s.mineClearance||{policyVersion:1,seq:0,coins:0,history:[],exchanges:[]};
export function mineToday(s){const m=mineState(s),day=mineDay(s),history=m.history.filter(r=>r.day===day),progress=history.at(-1)?.after||0;return {day,progress,used:history.map(r=>r.owner),cleared:MINE_ROWS.filter(r=>r.cumulativePower<=progress).length,bought:m.exchanges.filter(r=>r.day===day).reduce((n,r)=>n+r.quantity,0)};}
export function minePlan(s,id){const today=mineToday(s),power=s.fellows[id]?bondedPower(s,id):0,allowed=power>0&&!today.used.includes(id)&&today.progress<TOTAL,after=allowed?Math.min(TOTAL,today.progress+power):today.progress,kills=MINE_ROWS.filter(r=>r.cumulativePower>today.progress&&r.cumulativePower<=after);return {allowed,power,before:today.progress,after,kills,gold:kills.reduce((v,r)=>v+r.gold,0),fellowEXP:kills.reduce((v,r)=>v+r.fellowEXP,0),coins:kills.reduce((v,r)=>v+r.mineCoin,0)};}
export function mineShopPlan(s){const m=mineState(s),t=mineToday(s);const quantity=Math.max(0,Math.min(5-t.bought,Math.floor(m.coins/300),1e9-artifactState(s).ore));return {quantity,paid:quantity*300};}
export function validMine(s){
 if(s?.mineClearance===undefined)return true;const m=s.mineClearance;
 if(!m||m.policyVersion!==1||!int(m.seq)||!int(m.coins)||!Array.isArray(m.history)||m.history.length>LIMIT||!Array.isArray(m.exchanges)||m.exchanges.length>LIMIT||m.seq!==m.history.length+m.exchanges.length)return false;
 const ids=new Set(),days=new Map();let earned=0,spent=0,prevId=0,prevAt=0;
 const record=r=>r&&int(r.id)&&r.id>0&&r.id<=m.seq&&!ids.has(r.id)&&int(r.at,Number.MAX_SAFE_INTEGER)&&r.at<=s.lastAt&&r.day===Math.floor(r.at/DAY);
 for(const r of m.history){
  if(!record(r)||r.id<=prevId||r.at<prevAt||r.policyVersion!==1||!s.fellows?.[r.owner]||!int(r.power,1e15)||r.power===0||!int(r.before,TOTAL)||r.before===TOTAL||r.after!==Math.min(TOTAL,r.before+r.power)||!Array.isArray(r.kills))return false;
  ids.add(r.id);prevId=r.id;prevAt=r.at;const d=days.get(r.day)||{progress:0,used:new Set()};if(d.progress!==r.before||d.used.has(r.owner))return false;d.progress=r.after;d.used.add(r.owner);days.set(r.day,d);
  const expected=MINE_ROWS.filter(x=>x.cumulativePower>r.before&&x.cumulativePower<=r.after);
  if(r.kills.length!==expected.length||r.kills.some((k,i)=>!k||k.order!==expected[i].order||k.power!==expected[i].power||!int(k.gold)||!int(k.fellowEXP)||!int(k.mineCoin)))return false;
  if(r.gold!==r.kills.reduce((v,k)=>v+k.gold,0)||r.fellowEXP!==r.kills.reduce((v,k)=>v+k.fellowEXP,0)||r.coins!==r.kills.reduce((v,k)=>v+k.mineCoin,0))return false;earned+=r.coins;
 }
 prevId=0;prevAt=0;const purchases=new Map();
 for(const r of m.exchanges){
  if(!record(r)||r.id<=prevId||r.at<prevAt||r.policyVersion!==1||r.itemId!==data.shop.itemId||!int(r.quantity,5)||r.quantity===0||!int(r.unitPrice)||r.unitPrice===0||r.paid!==r.quantity*r.unitPrice||!int(r.paid))return false;
  ids.add(r.id);prevId=r.id;prevAt=r.at;const n=(purchases.get(r.day)||0)+r.quantity;if(n>5)return false;purchases.set(r.day,n);spent+=r.paid;
 }
 // Sorted action ledger also forbids spending coins before they were earned.
 const actions=[...m.history.map(r=>({id:r.id,at:r.at,delta:r.coins})),...m.exchanges.map(r=>({id:r.id,at:r.at,delta:-r.paid}))].sort((a,b)=>a.id-b.id);let balance=0,at=0;
 for(const r of actions){balance+=r.delta;if(balance<0||r.at<at)return false;at=r.at;}
 return ids.size===m.seq&&earned-spent===m.coins;
}
export function mineAction(s,action,id,value){
 if(!['mineDeploy','mineExchange'].includes(action))return null;const m=mineState(s),fail=error=>({state:s,error});
 if(value?.seq!==m.seq||value?.day!==mineDay(s))return fail('The mine changed. Use the current controls.');
 if(action==='mineExchange'){
  const max=mineShopPlan(s),quantity=value.count==='max'?max.quantity:value.count??1;if(![1,5,'max',undefined].includes(value.count)||!int(quantity,5)||!quantity||quantity>max.quantity||m.exchanges.length>=LIMIT)return fail('Need Mine Coins, remaining daily allowance and equipment space.');
  const paid=quantity*300,x={policyVersion:1,id:m.seq+1,day:mineDay(s),at:s.lastAt,itemId:data.shop.itemId,quantity,unitPrice:300,paid};
  return {state:{...s,mineClearance:{...m,seq:m.seq+1,coins:m.coins-paid,exchanges:[...m.exchanges,x]},artifacts:{...artifactState(s),ore:artifactState(s).ore+quantity}},message:`${quantity} Magic Ore moved to Equipment for ${paid} Mine Coins.`};
 }
 const p=minePlan(s,id);if(!p.allowed||m.history.length>=LIMIT)return fail('Choose an unused owned Fellow; each has one deployment per day.');
 if(!int(p.power,1e15)||s.gold+p.gold>Number.MAX_SAFE_INTEGER||s.fellowXP+p.fellowEXP>1e9||m.coins+p.coins>1e9)return fail('Reward storage is full. Deployment and damage were not spent.');
 const receipt={policyVersion:1,id:m.seq+1,day:mineDay(s),at:s.lastAt,owner:id,power:p.power,before:p.before,after:p.after,kills:p.kills.map(r=>({order:r.order,power:r.power,gold:r.gold,fellowEXP:r.fellowEXP,mineCoin:r.mineCoin})),gold:p.gold,fellowEXP:p.fellowEXP,coins:p.coins};
 return {state:{...s,gold:s.gold+p.gold,fellowXP:s.fellowXP+p.fellowEXP,mineClearance:{...m,seq:m.seq+1,coins:m.coins+p.coins,history:[...m.history,receipt]}},message:p.kills.length?`Cleared ${p.kills.length} encounters · ${p.gold} gold · ${p.fellowEXP} EXP · ${p.coins} Mine Coins.`:'Damage saved. This Fellow rests until tomorrow; another Fellow can continue.'};
}
