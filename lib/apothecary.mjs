import {MAX_GOLD} from './limits.mjs';
import {recipeKnown,validRecipeDiscoveries,discoverMedicine} from './medicine-discovery.mjs';
import data from './apothecary-data.json' with {type:'json'};
import effectData from './apothecary-effect-data.json' with {type:'json'};
export const POTIONS=data.records.filter(p=>p.soldGate!==null);
const byId=new Map(POTIONS.map(p=>[p.id,p])),integer=(x,max=1e9)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
export const potionRecipes=s=>POTIONS.filter(p=>recipeKnown(s,p.id));
/** Medicine.effect/levelUpSkill resolved through SkillBase. percent kinds are APK integers: 100 = 1%. */
export const POTION_EFFECTS=effectData.records;
const effectById=new Map(POTION_EFFECTS.map(r=>[r.id,r]));
export const potionEffect=id=>effectById.get(id)||null;
/** Every Medicine.effect row is target=city / conditionType=all / yield percent, flat at 500 (= +5%). */
export const POTION_YIELD_PERCENT=500;
/**
 * The original grants each unlocked potion's completion skill: +5% yield to every building, in every
 * country, forever — skillProp_Level is absent, so it never scales with the potion's level.
 * Everkai's discrete analogue of "unlocked" is a known recipe, so the bonus tracks potionRecipes().
 */
export const potionYield=s=>potionRecipes(s).length*POTION_YIELD_PERCENT/10000;
export const apothecaryCap=a=>a.shelves.length*500;
export function validApothecary(s){const a=s?.apothecary;if(!validRecipeDiscoveries(s))return false;if(a===undefined)return true;return !!a&&a.policyVersion===1&&integer(a.seq)&&integer(a.sold)&&integer(a.deposit,1500)&&Array.isArray(a.shelves)&&a.shelves.length>=1&&a.shelves.length<=3&&new Set(a.shelves.map(x=>x?.id)).size===a.shelves.length&&a.shelves.every(x=>x&&byId.has(x.id)&&integer(x.units,20)&&integer(x.price,1000)&&x.price>0&&Number.isSafeInteger(x.nextAt)&&x.nextAt>=0&&x.nextAt<=s.lastAt+20000&&x.policyVersion===1)&&a.deposit<=apothecaryCap(a)}
export function settleApothecary(s,now){if(!s.apothecary)return s;const a={...s.apothecary,shelves:s.apothecary.shelves.map(x=>({...x}))},cap=apothecaryCap(a);
 // At most sixty bottles are pending. Process actual sale order, not a bulk repricing.
 for(let n=0;n<60;n++){const due=a.shelves.filter(x=>x.units&&x.nextAt<=now&&a.deposit+x.price<=cap&&a.sold<1e9).sort((x,y)=>x.nextAt-y.nextAt);if(!due.length)break;const x=due[0];x.units--;a.deposit+=x.price;a.sold++;x.nextAt+=20000;}
 // Paused/full shelves don't bank instant customers for a later collection.
 for(const x of a.shelves)if(x.nextAt<=now)x.nextAt=now+20000;
 return {...s,apothecary:a};}
export function potionPrice(s,villageRate){return 10+potionRecipes(s).length+Math.min(100,Math.floor(villageRate/100))}
export function apothecaryAction(s,action,target,value,villageRate){if(action==='potionDiscover')return discoverMedicine(s,target,value);if(!['apothecaryOpen','potionStock','potionCollect'].includes(action))return null;const fail=error=>({state:s,error});
 if(action==='apothecaryOpen'){if(s.apothecary)return fail('The counter is already open.');return {state:{...s,apothecary:{policyVersion:1,seq:0,sold:0,deposit:0,shelves:[{id:'1001',units:1,price:10,nextAt:s.lastAt+20000,policyVersion:1}]}},message:'Counter opened · one free starter Healing Potion is on the shelf.'};}
 const old=s.apothecary;if(!old||value?.seq!==old.seq||old.seq>=1e9)return fail('This counter changed. Use its current controls.');const a={...old,seq:old.seq+1,shelves:old.shelves.map(x=>({...x}))};
 if(action==='potionCollect'){const amount=Math.min(a.deposit,Math.floor(MAX_GOLD-s.gold));if(amount<=0)return fail(a.deposit?'Your gold wallet is full.':'The deposit is empty.');a.deposit-=amount;return {state:{...s,apothecary:a,gold:s.gold+amount},message:`Collected ${amount} Apothecary gold.`};}
 const q=value.quantity,potion=byId.get(target);if(![1,5,20].includes(q)||!potion||!recipeKnown(s,target))return fail('Learn this recipe through sales or a recipe visitor first.');if(s.gold<q*5)return fail(`Brewing requires ${q*5} gold.`);let slot=a.shelves.findIndex(x=>x.id===target);if(slot>=0&&a.shelves[slot].units)return fail('Sell this batch before brewing another.');if(slot<0){slot=a.shelves.findIndex(x=>!x.units);if(slot<0){if(a.shelves.length>=3)return fail('All three shelves have stock.');slot=a.shelves.length;}}
 a.shelves[slot]={id:target,units:q,price:potionPrice(s,villageRate),nextAt:s.lastAt+20000,policyVersion:1};return {state:{...s,apothecary:a,gold:s.gold-q*5},message:`${q} ${potion.name} stocked · customers arrive every20 seconds.`};}
