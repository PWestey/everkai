import {bondedPower} from './adventure.mjs';
import {fellowById} from './catalog.mjs';
const types=['Inspiring','Diligent','Brave','Informed','Unfettered'];
export const FRONTIER=Array.from({length:12},(_,i)=>{const chapter=Math.floor(i/4),modes=chapter===0?['party','solo']:chapter===1?['solo','solo','solo']:['party','solo','party'];return {id:i+1,chapter:chapter+6,name:['Trailwatch','Relay Pass','Citadel'][chapter],entry:500+100*i,distinct:chapter>0,waves:modes.map((mode,n)=>({mode,type:types[(i+n)%5],power:mode==='party'?6000+800*i:2000+400*i})),rewards:{gold:1500+500*i,xp:3000+1000*i,pearls:5,scrolls:2,tokens:i%4===3?3:0,crystals:i%4===3?50:0}}});
export const frontierState=s=>s.frontier||{policyVersion:1,cleared:0,attempts:0,active:null};
export const frontierKey=a=>`${a.encounter}:${a.attempt}:${a.wave}`;
export function frontierPower(s,a,id){const e=FRONTIER[a.encounter-1],w=e.waves[a.wave];return Math.floor((w.mode==='party'?a.party.reduce((n,f)=>n+bondedPower(s,f),0):bondedPower(s,id))*(fellowById(id)?.type===w.type?1.25:1));}
const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
export function validFrontier(s){
 const f=s.frontier;if(f===undefined)return true;if(!f||f.policyVersion!==1||!int(f.cleared,12)||!int(f.attempts,1e9)||s.adventure?.cleared!==30)return false;
 const a=f.active;if(a===null)return true;const e=FRONTIER[f.cleared];return !!e&&a&&a.encounter===e.id&&a.attempt===f.attempts&&a.attempt>0&&int(a.wave,e.waves.length-1)&&Array.isArray(a.party)&&a.party.length===3&&new Set(a.party).size===3&&a.party.every(id=>Object.hasOwn(s.fellows,id))&&Array.isArray(a.used)&&a.used.length===a.wave&&a.used.every(id=>a.party.includes(id))&&(!e.distinct||new Set(a.used).size===a.used.length);
}
export function frontierAction(s,action,target,value){
 if(!['startFrontier','frontierWave','retreatFrontier'].includes(action))return null;const fail=error=>({state:s,error}),f=frontierState(s),e=FRONTIER[f.cleared];
 if(s.adventure.cleared!==30)return fail('Clear the first 30 stages to enter the Frontier.');
 if(action==='startFrontier'){
  if(!e||f.active||target!==e.id||f.attempts>=1e9)return fail('Choose the next unstarted Frontier encounter.');
  if(s.adventure.party.length!==3)return fail('Choose three Fellows in your adventure party.');if(s.gold<e.entry)return fail('Collect the entry gold first.');
  return {state:{...s,gold:s.gold-e.entry,frontier:{...f,attempts:f.attempts+1,active:{encounter:e.id,attempt:f.attempts+1,wave:0,party:[...s.adventure.party],used:[]}}},message:'Frontier party saved. Choose a leader for each wave.'};
 }
 const a=f.active;if(!a)return fail('Start a Frontier encounter first.');
 if(action==='retreatFrontier')return {state:{...s,frontier:{...f,active:null}},message:'Retreated. Entry fee is not refunded.'};
 if(value!==frontierKey(a)||!a.party.includes(target))return fail('This wave changed. Choose its leader again.');
 if(e.distinct&&a.used.includes(target))return fail('This Fellow already led a wave. Choose another.');
 if(frontierPower(s,a,target)<e.waves[a.wave].power)return fail('More Power needed. Train or choose another leader; nothing was spent.');
 if(a.wave<e.waves.length-1)return {state:{...s,frontier:{...f,active:{...a,wave:a.wave+1,used:[...a.used,target]}}},message:'Wave cleared. Progress saved; next wave ready.'};
 const r=e.rewards,inventory={...s.inventory};for(const [id,n] of [['Item_Talent_Hero_1',r.pearls],['local_skill_scroll',r.scrolls],['local_limit_token',r.tokens]]){if(inventory[id]+n>1e6)return fail('Make room in your bag for the full victory reward.');inventory[id]+=n;}
 if(s.gold+r.gold>1e12||s.fellowXP+r.xp>1e9||s.crystals+r.crystals>1e9)return fail('Spend currency or EXP to make room for the full victory reward.');
 return {state:{...s,gold:s.gold+r.gold,fellowXP:s.fellowXP+r.xp,crystals:s.crystals+r.crystals,inventory,frontier:{...f,cleared:e.id,active:null}},message:`Encounter ${e.id} cleared! Rewards saved${r.tokens?' with chapter milestone rewards':''}.`};
}
