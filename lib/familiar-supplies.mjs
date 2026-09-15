import supply from './familiar-supply-data.json' with {type:'json'};
import data from './familiar-data.json' with {type:'json'};
// Familiar training is paid for with the original's two items (scripts/import-familiar-supplies.py):
// level-up items per PetLevel.Cost and class-up items per PetClass.Cost when a level crosses into the
// next stage. Both come from the Familiar Tower's hourly income, which holds 24 hours uncollected.
// The tower field is read directly rather than imported, because familiar-tower.mjs imports familiars.mjs.
export const FAMILIAR_ITEMS=supply.items,SUPPLY_HOLD_MS=supply.holdHours*3600e3;
const H=3600e3;
export const familiarSupplies=s=>s.familiarSupplies||{levelUp:0,classUp:0,since:null};
export const towerIncome=s=>{const floor=s.familiarTower?.cleared||0;return floor?{levelUp:supply.floorIncome[floor-1][0],classUp:supply.floorIncome[floor-1][1]}:{levelUp:0,classUp:0};};
export function suppliesWaiting(s,now=s.lastAt){const f=familiarSupplies(s);if(f.since===null)return {levelUp:0,classUp:0,hours:0};const hours=Math.floor(Math.min(SUPPLY_HOLD_MS,Math.max(0,now-f.since))/H),r=towerIncome(s);return {levelUp:hours*r.levelUp,classUp:hours*r.classUp,hours};}
/** Credit the whole hours waiting and restart the clock; the partial hour carries over unless held full. */
export function settleSupplies(s,now=s.lastAt){const f=familiarSupplies(s);if(f.since===null)return s;const w=suppliesWaiting(s,now),held=now-f.since>=SUPPLY_HOLD_MS;return {...s,familiarSupplies:{levelUp:f.levelUp+w.levelUp,classUp:f.classUp+w.classUp,since:held?now:f.since+w.hours*H}};}
export const startSupplies=(s,now=s.lastAt)=>familiarSupplies(s).since===null?{...s,familiarSupplies:{...familiarSupplies(s),since:now}}:settleSupplies(s,now);
export const stageOf=level=>Math.floor(level/50)+1;
/** Items to raise a familiar from `from` to `to`, including each stage's class-up. */
export function trainingCost(from,to){let levelUp=0,classUp=0;for(let l=from+1;l<=to;l++){levelUp+=data.levels[l]?.Cost||0;if(stageOf(l)>stageOf(l-1))classUp+=data.classes[stageOf(l)].Cost;}return {levelUp,classUp};}
export const starCost=stars=>data.stars[stars+1]?.Cost??null;
export function validFamiliarSupplies(s){if(s.familiarSupplies===undefined)return true;const f=s.familiarSupplies,int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;return !!f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===3&&int(f.levelUp,1e12)&&int(f.classUp,1e12)&&(f.since===null||int(f.since,Number.MAX_SAFE_INTEGER)&&f.since<=s.lastAt);}
export function supplyAction(s,action){if(action!=='collectFamiliarSupplies')return null;const w=suppliesWaiting(s);if(!w.levelUp&&!w.classUp)return {state:s,error:familiarSupplies(s).since===null?'Clear Familiar Tower floor 1 to start its income.':'Nothing to collect yet. The tower pays each full hour.'};const next=settleSupplies(s),f=familiarSupplies(next);if(f.levelUp>1e12||f.classUp>1e12)return {state:s,error:'Familiar item storage is full. Train a familiar first.'};return {state:next,message:`Collected ${w.levelUp.toLocaleString()} level-up and ${w.classUp.toLocaleString()} class-up items.`};}
