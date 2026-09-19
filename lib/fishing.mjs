import combinationData from './fishing-combination-data.json' with {type:'json'};
export const FISH_COMBINATIONS=combinationData.records.filter(r=>r.effect).sort((a,b)=>Number(a.effect.kind==='educationXP')-Number(b.effect.kind==='educationXP'));
import crownData from './kohaku-crown-data.json' with {type:'json'};
import data from './fishing-species.json' with {type:'json'};
import fishApk from './fishing-apk-data.json' with {type:'json'};
import draw from './fishing-draw-data.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
import skillData from './fish-skill-data.json' with {type:'json'};
import {reaches} from './hero-scope.mjs';
import {habitDay,habitEarnings} from './habits.mjs';
const priority=id=>({F1101:0,F1102:1,F1103:2}[id]??3);
export const FISH=[...data.records].sort((a,b)=>priority(a.id)-priority(b.id));
export const FISH_GROUNDS=[...new Set(FISH.flatMap(r=>r.locations))].sort();
const species=new Map(FISH.map(r=>[r.id,r]));
// The original draw (scripts/import-fishing-draw.py): a cast first rolls a rarity from the fishing
// level's FishLevel weights, then one species of that rarity from the chosen ground. Grounds open at
// their FishSpot level, and every catch pays 10 fishing EXP. Rarities a ground does not hold, and the
// unimplemented artifact/random-event weights, are left out and the rest renormalised. The rolls are a
// repeatable sequence keyed on the catch number, so a saved cast always resolves the same way.
const RARITY=['N','R','SR','SSR','UR'];
export const FISHING_GROUNDS=draw.grounds,FISH_EXP=draw.expPerCatch,FISHING_LEVELS=draw.levels;
export const groundLevel=g=>draw.grounds[g]?.level??null;
export function fishingLevel(exp){let level=1;while(level<FISHING_LEVELS.length&&exp>=FISHING_LEVELS[level-1][0]){exp-=FISHING_LEVELS[level-1][0];level++;}return {level,exp,next:level<FISHING_LEVELS.length?FISHING_LEVELS[level-1][0]:null};}
const castRoll=(n,salt)=>{let t=(Math.imul(n,0x9E3779B1)^Math.imul(salt,0x85EBCA6B))>>>0;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296;};
export function castOdds(f,ground){const lv=fishingLevel(fishingIndex(f).exp).level,row=FISHING_LEVELS[lv-1],pool=FISH.filter(r=>r.locations.includes(ground)),weights=RARITY.map((r,i)=>pool.some(x=>x.rarity===r)?row[i+1]:0),total=weights.reduce((a,b)=>a+b,0);return RARITY.map((rarity,i)=>({rarity,chance:total?weights[i]/total:0,species:pool.filter(x=>x.rarity===rarity)})).filter(x=>x.species.length);}
// Fish.json gives every species four length bands (long1..long3, longG) drawn on the constant weights
// 5000/2500/1500/1000 — 50/25/15/10%. Lengths are hundredths of a centimetre. The fourth band is the
// original's Gold Crown band; Everkai records which band a catch landed in but does NOT grant a crown
// from it, because activating 86 crown skills moves the Fellow Power ceiling far past the original's.
export const LENGTH_BANDS=4,LENGTH_SCALE=100;
export const fishLengths=id=>fishApk.records[id]||null;
export const formatLength=n=>`${(n/LENGTH_SCALE).toFixed(2)} cm`;
/** The band and exact length a cast lands on. Keyed on the catch number, so a saved cast never rerolls. */
export function rollLength(n,id){
 const row=fishLengths(id);if(!row?.bands?.[0])return null;
 const weights=row.weights,total=weights.reduce((a,b)=>a+b,0);if(!total)return null;
 let roll=castRoll(n,3)*total,band=0;
 for(let i=0;i<LENGTH_BANDS;i++){if(roll<weights[i]){band=i;break}roll-=weights[i];if(i===LENGTH_BANDS-1)band=weights.findLastIndex(w=>w>0)}
 const [lo,hi]=row.bands[band];
 return {band:band+1,length:lo+Math.floor(castRoll(n,4)*(hi-lo+1))};
}
/** Longest catch per species, which is what the original's Encyclopedia records. */
export function lengthRecords(f){const out=new Map();for(const c of f.catches)if(Number.isInteger(c.length)&&!(out.get(c.fish)>=c.length))out.set(c.fish,c.length);return out;}
export function drawFish(f,ground){const odds=castOdds(f,ground),n=f.catches.length+1;let roll=castRoll(n,1),pick=odds.filter(o=>o.chance>0);for(const o of pick){if(roll<o.chance)return o.species[Math.floor(castRoll(n,2)*o.species.length)];roll-=o.chance;}const last=pick.at(-1);return last?last.species[Math.floor(castRoll(n,2)*last.species.length)]:null;}
// Bait follows the original's supply (System.json FishBaitTime 7200, FishBaitTimeMax 86400, FishBaitMax 50):
// one bait per 2 hours accruing to 12 a day, held to 50. Everkai pays that daily allowance through a finished
// daily habit instead of a timer, per the single-player design, and keeps its local returns (a new species
// returns its bait, and every third repeat returns one). Measured over 21 simulated days (APK growth, earned
// play): a 30/day refill reached 719M gold/s with the tank at 294M of 631M Power; this returns 477M/s with the
// tank at 89M of 414M. Storage above 50 in older saves stays valid; the refill simply stops at 50.
export const STARTING_BAIT=20,BAIT_REFILL_MAX=12,BAIT_STORAGE=50,BAIT_DUPLICATE_RETURN=3;
// Bait comes from fishing itself, as in the original (Item_Bait1 source: "Fishing"): a new collection
// entry returns the bait it cost, and every third repeat returns one too, so discovery is free and a long
// session drains about two thirds of a bait per cast. A ground holds 10-20 species, so without the repeat
// return a settled player would drain one per cast and fish about ten times a day.
const empty={bait:STARTING_BAIT,catches:[],displayed:[],researched:[],skills:{},points:0};
export const fishingState=s=>s.fishing||empty;
export const castKey=s=>`cast:${fishingState(s).catches.length+1}`;
const cache=new WeakMap();
// THE ORIGINAL'S FISH SKILLS (2026-09-18, docs/power-sources-import-spec.md 2; scripts/import-fish-skills.py).
// Power now reads each displayed species' OWN skill (Fish.json skillA -> SkillBase) at power time: its stat,
// its value at the stored level, and its scope -- country OR rarity OR all, matched against the Fellow's
// Hero.json country and numeric rarity (lib/hero-scope.mjs). The catch's stored `effect` stays a receipt and
// is still validated exactly as before; it is simply no longer what Power reads, because its wiki-derived
// {type, rarities} scoping never matched a rarity-scoped fish to anyone.
//   * LEVELS past 3. The original's level is uncapped and priced on the skill's SkillUpgrade ladder (FishExp:
//     1 a level at 1-3, 2 at 4-6, ... 150 from 401). Everkai's research points are the FishExp analogue. Levels
//     2-3 keep Everkai's n(n-1) price, because validFishing re-derives `points` from it and changing it would
//     refuse every save with an upgraded fish (rule 12); levels 4+ cost the ladder's own count.
//   * GOLD CROWN. A displayed species whose own catch landed in the Gold Crown length band (band 4, 10% of casts,
//     already recorded on every policy-4 catch) also pays its skillB at level 1. Derived from stored catches.
//     Kohaku's claimable crown keeps its own path (crownEffect), so it is never counted twice.
export const FISH_SKILL_MAX=10000,FISH_SKILL_SOURCE=skillData.sha256;
export const fishSkill=id=>skillData.species[id]||null;
/** Research points to go from `level` to level+1. */
export function fishLevelCost(id,level){if(level<3)return 2*level;const r=fishSkill(id);const row=r&&skillData.ladders[r.ladder].find(x=>level>=x[0]&&level<=x[1]);return row?row[2]:skillData.ladders[r?.ladder]?.at(-1)?.[2]??2*level;}
/** Research points a species at level `n` has consumed: n(n-1) up to 3, then the ladder. */
export function fishSkillSpent(id,n){let t=0;for(let l=1;l<n;l++)t+=fishLevelCost(id,l);return t;}
const skillEffect=(x,level)=>{const v=x.i+(level-1)*x.l;return x.stat==='talent'?{kind:'aptitude',value:v,scope:x.scope}:x.type==='extradd'?{kind:'flat',value:v,scope:x.scope}:{kind:'percent',value:v/100,scope:x.scope};};
export function fishingIndex(f){let i=cache.get(f);if(i)return i;const first=new Map(),crowns=new Map(),byId=new Map(),counts=new Map(),researched=new Set(f.researched);let exp=0;for(const c of f.catches){if(!c.sourceItem)exp+=draw.expPerCatch;if(!first.has(c.fish))first.set(c.fish,c);if(c.crown&&!crowns.has(c.fish))crowns.set(c.fish,c);byId.set(c.id,c);counts.set(c.fish,(counts.get(c.fish)||0)+1);}const gold=new Set();for(const c of f.catches)if(c.band===4)gold.add(c.fish);const effects=f.displayed.map(id=>{const x=fishSkill(id);if(x)return skillEffect(x,f.skills[id]||1);const c=first.get(id),e=c.effect||{kind:'flat',type:c.type,rarities:[],initial:c.flat,increment:c.increment};return {...e,value:e.initial+((f.skills[id]||1)-1)*e.increment}});for(const id of f.displayed){const g=fishSkill(id)?.gold;if(g&&gold.has(id)&&!(f.crowned||[]).includes(id))effects.push(skillEffect(g,1));}for(const id of f.crowned||[])if(f.displayed.includes(id)){const e=crowns.get(id).crownEffect;effects.push({...e,value:e.initial});}let datePercent=0;const employeeByType=Object.create(null),educationByType=Object.create(null);for(const c of f.combinations||[]){if(c.effect.kind==='datePoints')datePercent+=c.effect.value;else if(c.effect.kind==='educationXP')educationByType[c.effect.type||'all']=(educationByType[c.effect.type||'all']||0)+c.effect.value;else if(c.effect.kind==='employee')employeeByType[c.effect.type]=(employeeByType[c.effect.type]||0)+c.effect.value;else effects.push({kind:c.effect.kind,value:c.effect.value,type:null,rarities:[]});}i={exp,educationByType,employeeByType,datePercent,first,crowns,byId,counts,researched,effects,duplicate:f.catches.find(c=>c.duplicate&&!c.crown&&!researched.has(c.id))};cache.set(f,i);return i;}
const first=(f,id)=>fishingIndex(f).first.get(id);
export function fishingBonuses(s,id){const profile=fellowById(id),out={flat:0,aptitude:0,percent:0};for(const e of fishingIndex(fishingState(s)).effects){if(e.scope){if(reaches(e.scope,id))out[e.kind]+=e.value;}else if((!e.type||e.type===profile?.type)&&(!e.rarities?.length||e.rarities.includes(profile?.rarity)))out[e.kind]+=e.value;}return out;}
export const fishingEmployeeBonus=(s,type)=>fishingIndex(fishingState(s)).employeeByType[type]||0;
export const fishingEducationBonus=(s,type)=>{const b=fishingIndex(fishingState(s)).educationByType;return (b.all||0)+(b[type]||0)};
export const fishingDateBonus=s=>fishingIndex(fishingState(s)).datePercent;
export const fishingBonus=(s,id)=>fishingBonuses(s,id).flat;
export function validFishing(s){
 if(s.fishing===undefined)return true;const f=s.fishing,int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max,obj=x=>x&&typeof x==='object'&&!Array.isArray(x);if(!obj(f)||!int(f.bait,1000)||!(f.refillDay===undefined||f.refillDay===null||typeof f.refillDay==='string'&&f.refillDay.length<=10)||!Array.isArray(f.catches)||f.catches.length>Number.MAX_SAFE_INTEGER||!Array.isArray(f.displayed)||!Array.isArray(f.researched)||!obj(f.skills)||!int(f.points,Number.MAX_SAFE_INTEGER))return false;
 const seen=new Set(),catchById=new Map(),firstAt=new Map();for(let n=0;n<f.catches.length;n++){const c=f.catches[n];if(!obj(c)||c.id!==`catch:${n+1}`||![1,2,3,4].includes(c.policyVersion)||!species.has(c.fish)||typeof c.name!=='string'||c.name.length>100||!int(c.caughtAt,Number.MAX_SAFE_INTEGER)||c.caughtAt>s.lastAt||!(c.policyVersion===1?int(c.flat,1e6)&&int(c.increment,1e6)&&[null,'Inspiring','Diligent','Brave','Informed','Unfettered'].includes(c.type):obj(c.effect)&&['flat','aptitude','percent'].includes(c.effect.kind)&&int(c.effect.initial,1e6)&&int(c.effect.increment,1e6)&&[null,'Inspiring','Diligent','Brave','Informed','Unfettered'].includes(c.effect.type)&&Array.isArray(c.effect.rarities)&&c.effect.rarities.every(r=>['N','R','SR','SSR','SSR+','UR'].includes(r)))||c.duplicate!==seen.has(c.fish))return false;if(c.policyVersion===3&&(c.fish!==crownData.fishId||c.sourceItem!==crownData.sourceItem||c.crown!==true||!obj(c.crownEffect)||c.crownEffect.kind!=='percent'||c.crownEffect.type!==null||!Array.isArray(c.crownEffect.rarities)||c.crownEffect.rarities.length||!int(c.crownEffect.initial,100)||!int(c.crownEffect.increment,100)))return false;if(c.policyVersion!==3&&(c.crown!==undefined||c.crownEffect!==undefined||c.sourceItem!==undefined))return false;
  // Policy 4 is a policy-2 catch that also records the original's length band. Nothing else may carry one.
  if(c.policyVersion===4){const row=fishLengths(c.fish);if(!row?.bands?.[0]||![1,2,3,4].includes(c.band)||!Number.isInteger(c.length)||c.length<row.bands[c.band-1][0]||c.length>row.bands[c.band-1][1])return false;}
  else if(c.length!==undefined||c.band!==undefined)return false;if(!seen.has(c.fish))firstAt.set(c.fish,c.caughtAt);seen.add(c.fish);catchById.set(c.id,c);}
 const crownRows=f.catches.filter(c=>c.policyVersion===3);if(crownRows.length>1)return false;if(f.crowned!==undefined&&(!Array.isArray(f.crowned)||new Set(f.crowned).size!==f.crowned.length||!f.crowned.every(id=>id===crownData.fishId&&crownRows.some(c=>c.fish===id))))return false;
 if(new Set(f.displayed).size!==f.displayed.length||!f.displayed.every(id=>seen.has(id)&&f.skills[id]>=1)||new Set(f.researched).size!==f.researched.length||!f.researched.every(id=>catchById.get(id)?.duplicate&&!catchById.get(id)?.crown))return false;
 // Widened from 3 (2026-09-18): the original's fish skill is uncapped, bought on its FishExp ladder.
 if(!Object.entries(f.skills).every(([id,n])=>seen.has(id)&&int(n,FISH_SKILL_MAX)&&n>=1))return false;
 if(f.combinations!==undefined&&(!Array.isArray(f.combinations)||f.combinations.length>FISH_COMBINATIONS.length||new Set(f.combinations.map(c=>c?.id)).size!==f.combinations.length||!f.combinations.every(c=>obj(c)&&[1,2,3,4].includes(c.policyVersion)&&FISH_COMBINATIONS.some(r=>r.id===c.id&&r.effect.kind===c.effect?.kind&&(!['employee','educationXP'].includes(r.effect.kind)||r.effect.type===c.effect.type))&&Array.isArray(c.members)&&c.id==='combination:'+c.members.join(':')&&c.members.every(id=>seen.has(id)&&firstAt.get(id)<=c.activatedAt)&&typeof c.name==='string'&&c.name.length<=100&&int(c.activatedAt,Number.MAX_SAFE_INTEGER)&&c.activatedAt<=s.lastAt&&obj(c.effect)&&(c.policyVersion===1?['aptitude','percent'].includes(c.effect.kind):c.policyVersion===2?c.effect.kind==='datePoints':c.policyVersion===4?c.effect.kind==='educationXP'&&[null,'inspiring','diligent','brave','informed','unfettered'].includes(c.effect.type):c.effect.kind==='employee'&&['Inspiring','Diligent','Brave','Informed','Unfettered'].includes(c.effect.type))&&int(c.effect.value,1000)&&c.effect.value>0)))return false;
 // Every level's price is derived: n(n-1) through level 3 -- the only levels a save written before 2026-09-18
 // can hold, so the identity it met is untouched -- then the species' own SkillUpgrade ladder.
 const spent=Object.entries(f.skills).reduce((sum,[id,n])=>sum+fishSkillSpent(id,n),0);return f.points===f.researched.length-spent;
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
   // max(0,...): a save from before the 50 cap can hold more than that, and a negative refill must refuse, not debit.
   const n=Math.max(0,Math.min(BAIT_REFILL_MAX,dailies,BAIT_STORAGE-f.bait));
   if(!n)return fail('Bait storage is full.');
   return done({...f,bait:f.bait+n,refillDay:today},`Habit refill · bait +${n}.`);
  }
 if(action==='castFish'){
  if(target!==castKey(s))return fail('This cast was already handled.');if(!f.bait)return fail('Collect free bait first.');if(f.catches.length>=Number.MAX_SAFE_INTEGER)return fail('Exact catch sequence limit reached. Export your history.');
  if(groundLevel(ground)===null)return fail('Choose a fishing ground.');const need=groundLevel(ground),have=fishingLevel(fishingIndex(f).exp).level;if(have<need)return fail(`${ground} opens at fishing level ${need}.`);const fish=drawFish(f,ground);if(!fish)return fail('Choose a fishing ground.');const n=f.catches.length+1,size=rollLength(n,fish.id);const c={id:`catch:${n}`,fish:fish.id,name:fish.name,effect:{...fish.effect,rarities:[...fish.effect.rarities]},ground:ground||'All grounds',caughtAt:s.lastAt,policyVersion:size?4:2,duplicate:!!first(f,fish.id),...(size||{})};
  const back=c.duplicate?(f.catches.length%BAIT_DUPLICATE_RETURN===0?1:0):1;
   return done({...f,bait:Math.min(1000,f.bait-1+back),catches:[...f.catches,c]},`Caught ${c.name}${c.duplicate?' · ready for research':' · new collection entry'}${back?' · bait returned':''}!`);
 }
 if(action==='researchFish'){
  const c=fishingIndex(f).byId.get(target);if(!c?.duplicate||c.crown||f.researched.includes(target))return fail('Choose an unresearched duplicate catch.');return done({...f,researched:[...f.researched,target],points:f.points+1},'Chihaya research complete · +1 Research Point.');
 }
 const c=first(f,target);if(!c)return fail('Catch this fish first.');const level=f.skills[target]||1;
 if(action==='displayFish'){if(f.displayed.includes(target))return fail('Already displayed.');return done({...f,displayed:[...f.displayed,target],skills:{...f.skills,[target]:level}},`${c.name} displayed · normal bonus active.`);}
 if(action==='removeFish'){if(!f.displayed.includes(target))return fail('This fish is not displayed.');return done({...f,displayed:f.displayed.filter(id=>id!==target)},'Fish returned to collection · display bonus paused.');}
 if(!f.displayed.includes(target))return fail('Display this fish before improving its skill.');if(level>=FISH_SKILL_MAX)return fail('This fish skill is at its level limit.');const cost=fishLevelCost(target,level);if(f.points<cost)return fail(`Research duplicates for ${cost} points first.`);
 return done({...f,points:f.points-cost,skills:{...f.skills,[target]:level+1}},`${c.name} skill level ${level+1}.`);
}
