import combinationData from './fishing-combination-data.json' with {type:'json'};
export const FISH_COMBINATIONS=combinationData.records.filter(r=>r.effect).sort((a,b)=>Number(a.effect.kind==='educationXP')-Number(b.effect.kind==='educationXP'));
import crownData from './kohaku-crown-data.json' with {type:'json'};
import data from './fishing-species.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
import {habitDay,habitEarnings} from './habits.mjs';
const priority=id=>({F1101:0,F1102:1,F1103:2}[id]??3);
export const FISH=[...data.records].sort((a,b)=>priority(a.id)-priority(b.id));
export const FISH_GROUNDS=[...new Set(FISH.flatMap(r=>r.locations))].sort();
const species=new Map(FISH.map(r=>[r.id,r]));
export const STARTING_BAIT=20,BAIT_REFILL_MAX=10,BAIT_DUPLICATE_RETURN=3;
// Bait comes from fishing itself, as in the original (Item_Bait1 source: "Fishing"): a new collection
// entry returns the bait it cost, and every third repeat returns one too, so discovery is free and a long
// session drains about two thirds of a bait per cast. A ground holds 10-20 species, so without the repeat
// return a settled player would drain one per cast and fish about ten times a day.
const empty={bait:STARTING_BAIT,catches:[],displayed:[],researched:[],skills:{},points:0};
export const fishingState=s=>s.fishing||empty;
export const castKey=s=>`cast:${fishingState(s).catches.length+1}`;
const cache=new WeakMap();
export function fishingIndex(f){let i=cache.get(f);if(i)return i;const first=new Map(),crowns=new Map(),byId=new Map(),counts=new Map(),researched=new Set(f.researched);for(const c of f.catches){if(!first.has(c.fish))first.set(c.fish,c);if(c.crown&&!crowns.has(c.fish))crowns.set(c.fish,c);byId.set(c.id,c);counts.set(c.fish,(counts.get(c.fish)||0)+1);}const effects=f.displayed.map(id=>{const c=first.get(id),e=c.effect||{kind:'flat',type:c.type,rarities:[],initial:c.flat,increment:c.increment};return {...e,value:e.initial+((f.skills[id]||1)-1)*e.increment}});for(const id of f.crowned||[])if(f.displayed.includes(id)){const e=crowns.get(id).crownEffect;effects.push({...e,value:e.initial});}let datePercent=0;const employeeByType=Object.create(null),educationByType=Object.create(null);for(const c of f.combinations||[]){if(c.effect.kind==='datePoints')datePercent+=c.effect.value;else if(c.effect.kind==='educationXP')educationByType[c.effect.type||'all']=(educationByType[c.effect.type||'all']||0)+c.effect.value;else if(c.effect.kind==='employee')employeeByType[c.effect.type]=(employeeByType[c.effect.type]||0)+c.effect.value;else effects.push({kind:c.effect.kind,value:c.effect.value,type:null,rarities:[]});}i={educationByType,employeeByType,datePercent,first,crowns,byId,counts,researched,effects,duplicate:f.catches.find(c=>c.duplicate&&!c.crown&&!researched.has(c.id))};cache.set(f,i);return i;}
const first=(f,id)=>fishingIndex(f).first.get(id);
export function fishingBonuses(s,id){const profile=fellowById(id),out={flat:0,aptitude:0,percent:0};for(const e of fishingIndex(fishingState(s)).effects)if((!e.type||e.type===profile?.type)&&(!e.rarities.length||e.rarities.includes(profile?.rarity)))out[e.kind]+=e.value;return out;}
export const fishingEmployeeBonus=(s,type)=>fishingIndex(fishingState(s)).employeeByType[type]||0;
export const fishingEducationBonus=(s,type)=>{const b=fishingIndex(fishingState(s)).educationByType;return (b.all||0)+(b[type]||0)};
export const fishingDateBonus=s=>fishingIndex(fishingState(s)).datePercent;
export const fishingBonus=(s,id)=>fishingBonuses(s,id).flat;
export function validFishing(s){
 if(s.fishing===undefined)return true;const f=s.fishing,int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max,obj=x=>x&&typeof x==='object'&&!Array.isArray(x);if(!obj(f)||!int(f.bait,1000)||!(f.refillDay===undefined||f.refillDay===null||typeof f.refillDay==='string'&&f.refillDay.length<=10)||!Array.isArray(f.catches)||f.catches.length>Number.MAX_SAFE_INTEGER||!Array.isArray(f.displayed)||!Array.isArray(f.researched)||!obj(f.skills)||!int(f.points,Number.MAX_SAFE_INTEGER))return false;
 const seen=new Set(),catchById=new Map(),firstAt=new Map();for(let n=0;n<f.catches.length;n++){const c=f.catches[n];if(!obj(c)||c.id!==`catch:${n+1}`||![1,2,3].includes(c.policyVersion)||!species.has(c.fish)||typeof c.name!=='string'||c.name.length>100||!int(c.caughtAt,Number.MAX_SAFE_INTEGER)||c.caughtAt>s.lastAt||!(c.policyVersion===1?int(c.flat,1e6)&&int(c.increment,1e6)&&[null,'Inspiring','Diligent','Brave','Informed','Unfettered'].includes(c.type):obj(c.effect)&&['flat','aptitude','percent'].includes(c.effect.kind)&&int(c.effect.initial,1e6)&&int(c.effect.increment,1e6)&&[null,'Inspiring','Diligent','Brave','Informed','Unfettered'].includes(c.effect.type)&&Array.isArray(c.effect.rarities)&&c.effect.rarities.every(r=>['N','R','SR','SSR','SSR+','UR'].includes(r)))||c.duplicate!==seen.has(c.fish))return false;if(c.policyVersion===3&&(c.fish!==crownData.fishId||c.sourceItem!==crownData.sourceItem||c.crown!==true||!obj(c.crownEffect)||c.crownEffect.kind!=='percent'||c.crownEffect.type!==null||!Array.isArray(c.crownEffect.rarities)||c.crownEffect.rarities.length||!int(c.crownEffect.initial,100)||!int(c.crownEffect.increment,100)))return false;if(c.policyVersion!==3&&(c.crown!==undefined||c.crownEffect!==undefined||c.sourceItem!==undefined))return false;if(!seen.has(c.fish))firstAt.set(c.fish,c.caughtAt);seen.add(c.fish);catchById.set(c.id,c);}
 const crownRows=f.catches.filter(c=>c.policyVersion===3);if(crownRows.length>1)return false;if(f.crowned!==undefined&&(!Array.isArray(f.crowned)||new Set(f.crowned).size!==f.crowned.length||!f.crowned.every(id=>id===crownData.fishId&&crownRows.some(c=>c.fish===id))))return false;
 if(new Set(f.displayed).size!==f.displayed.length||!f.displayed.every(id=>seen.has(id)&&f.skills[id]>=1)||new Set(f.researched).size!==f.researched.length||!f.researched.every(id=>catchById.get(id)?.duplicate&&!catchById.get(id)?.crown))return false;
 if(!Object.entries(f.skills).every(([id,n])=>seen.has(id)&&int(n,3)&&n>=1))return false;
 if(f.combinations!==undefined&&(!Array.isArray(f.combinations)||f.combinations.length>FISH_COMBINATIONS.length||new Set(f.combinations.map(c=>c?.id)).size!==f.combinations.length||!f.combinations.every(c=>obj(c)&&[1,2,3,4].includes(c.policyVersion)&&FISH_COMBINATIONS.some(r=>r.id===c.id&&r.effect.kind===c.effect?.kind&&(!['employee','educationXP'].includes(r.effect.kind)||r.effect.type===c.effect.type))&&Array.isArray(c.members)&&c.id==='combination:'+c.members.join(':')&&c.members.every(id=>seen.has(id)&&firstAt.get(id)<=c.activatedAt)&&typeof c.name==='string'&&c.name.length<=100&&int(c.activatedAt,Number.MAX_SAFE_INTEGER)&&c.activatedAt<=s.lastAt&&obj(c.effect)&&(c.policyVersion===1?['aptitude','percent'].includes(c.effect.kind):c.policyVersion===2?c.effect.kind==='datePoints':c.policyVersion===4?c.effect.kind==='educationXP'&&[null,'inspiring','diligent','brave','informed','unfettered'].includes(c.effect.type):c.effect.kind==='employee'&&['Inspiring','Diligent','Brave','Informed','Unfettered'].includes(c.effect.type))&&int(c.effect.value,1000)&&c.effect.value>0)))return false;
 const spent=Object.values(f.skills).reduce((sum,n)=>sum+n*(n-1),0);return f.points===f.researched.length-spent;
}
export function fishingAction(s,action,target,ground=null){
 if(!['baitRefill','castFish','displayFish','removeFish','researchFish','upgradeFish','claimCrownKohaku','crownKohaku','activateFishCombination'].includes(action))return null;
 const f=fishingState(s),fail=error=>({state:s,error}),done=(fishing,message)=>({state:{...s,fishing},message});
 if(action==='activateFishCombination'){const r=FISH_COMBINATIONS.find(c=>c.id===target);if(!r||!r.members.every(id=>fishingIndex(f).first.has(id)))return fail('Catch every member of this combination first.');if((f.combinations||[]).some(c=>c.id===target))return fail('This combination is already activated.');const c={id:r.id,name:r.name,members:[...r.members],effect:{...r.effect},activatedAt:s.lastAt,policyVersion:r.effect.kind==='educationXP'?4:r.effect.kind==='employee'?3:r.effect.kind==='datePoints'?2:1};return done({...f,combinations:[...(f.combinations||[]),c]},`${r.name} activated · collection bonus unlocked.`);}
 if(action==='claimCrownKohaku'){
  if(f.catches.some(c=>c.sourceItem===crownData.sourceItem))return fail('This guaranteed crown claim is already saved.');
  if(f.catches.length>=Number.MAX_SAFE_INTEGER)return fail('Exact catch sequence limit reached.');const fish=species.get(crownData.fishId),c={id:`catch:${f.catches.length+1}`,fish:fish.id,name:fish.name,effect:{...fish.effect,rarities:[...fish.effect.rarities]},crownEffect:{...crownData.effect,rarities:[]},crown:true,sourceItem:crownData.sourceItem,caughtAt:s.lastAt,policyVersion:3,duplicate:!!first(f,fish.id)};
  return done({...f,catches:[...f.catches,c]},'Gold Crown Kohaku received · free sandbox claim.');
 }
 if(action==='crownKohaku'){
  if(!fishingIndex(f).crowns.has(crownData.fishId)||!f.displayed.includes(crownData.fishId))return fail('Claim Gold Crown Kohaku and place it in the tank first.');if((f.crowned||[]).includes(crownData.fishId))return fail('Kohaku is already crowned.');return done({...f,crowned:[...(f.crowned||[]),crownData.fishId]},'Kohaku crowned · base crown Power bonus active.');
 }
 if(action==='baitRefill'){
   const today=habitDay(s.lastAt),{dailies}=habitEarnings(s.habits,s.lastAt);
   if(f.refillDay===today)return fail('Today’s habit refill is already used.');
   if(dailies<1)return fail('Complete a daily habit to refill bait.');
   const n=Math.min(BAIT_REFILL_MAX,dailies,1000-f.bait);
   if(!n)return fail('Bait storage is full.');
   return done({...f,bait:f.bait+n,refillDay:today},`Habit refill · bait +${n}.`);
  }
 if(action==='castFish'){
  if(target!==castKey(s))return fail('This cast was already handled.');if(!f.bait)return fail('Collect free bait first.');if(f.catches.length>=Number.MAX_SAFE_INTEGER)return fail('Exact catch sequence limit reached. Export your history.');
  const pool=ground?FISH.filter(r=>r.locations.includes(ground)):FISH;if(!pool.length)return fail('Choose a known fishing ground.');const fish=pool[f.catches.length%pool.length],c={id:`catch:${f.catches.length+1}`,fish:fish.id,name:fish.name,effect:{...fish.effect,rarities:[...fish.effect.rarities]},ground:ground||'All grounds',caughtAt:s.lastAt,policyVersion:2,duplicate:!!first(f,fish.id)};
  const back=c.duplicate?(f.catches.length%BAIT_DUPLICATE_RETURN===0?1:0):1;
   return done({...f,bait:Math.min(1000,f.bait-1+back),catches:[...f.catches,c]},`Caught ${c.name}${c.duplicate?' · ready for research':' · new collection entry'}${back?' · bait returned':''}!`);
 }
 if(action==='researchFish'){
  const c=fishingIndex(f).byId.get(target);if(!c?.duplicate||c.crown||f.researched.includes(target))return fail('Choose an unresearched duplicate catch.');return done({...f,researched:[...f.researched,target],points:f.points+1},'Chihaya research complete · +1 Research Point.');
 }
 const c=first(f,target);if(!c)return fail('Catch this fish first.');const level=f.skills[target]||1;
 if(action==='displayFish'){if(f.displayed.includes(target))return fail('Already displayed.');return done({...f,displayed:[...f.displayed,target],skills:{...f.skills,[target]:level}},`${c.name} displayed · normal bonus active.`);}
 if(action==='removeFish'){if(!f.displayed.includes(target))return fail('This fish is not displayed.');return done({...f,displayed:f.displayed.filter(id=>id!==target)},'Fish returned to collection · display bonus paused.');}
 if(!f.displayed.includes(target))return fail('Display this fish before improving its skill.');if(level>=3)return fail('Current sandbox skill cap reached.');const cost=2*level;if(f.points<cost)return fail(`Research duplicates for ${cost} points first.`);
 return done({...f,points:f.points-cost,skills:{...f.skills,[target]:level+1}},`${c.name} skill level ${level+1}.`);
}
