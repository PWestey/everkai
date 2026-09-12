import {specialAptitude} from './special-blessings.mjs';
import {originalProgression,originalCost,sourceCap,sourceAptitudeBonus,sourceCoefficient,validOriginalProgression,originalProgressionAction} from './original-progression.mjs';
import {sourceTraining,originalTrainingCost,validTrainingCosts,activateTrainingCosts,recordTraining} from './training-costs.mjs';
import {applyStella} from './stella.mjs';
import {elixirPower} from './elixirs.mjs';
import {artifactEchoBonus} from './artifact-echo.mjs';
import {fishingBonuses,validFishing} from './fishing.mjs';
import {validInsight} from './insight.mjs';
import {familiarBonus} from './familiar-nodes.mjs';
import {museumBonus} from './museum.mjs';
import expandedGear from './expanded-gear.json' with {type:'json'};
// Kept local on purpose: lib/fountain.mjs imports from this module, so importing fountainState back
// would close an import cycle. tests/earned-bottles.test.mjs fails if this shape drifts from fountainState().
export const STAGE_BOTTLES=3;
export const FRESH_FOUNTAIN={policyVersion:1,seq:0,seed:123456789,bottles:0,total:0,ledger:{},history:[],recruited:[]};
import {blessingPower} from './blessings.mjs';
import {validTalents} from './talents.mjs';
import {artifactBonus,validArtifacts,transferArtifact} from './artifacts.mjs';
import original from './original-content.mjs';
import {bondFactor} from './bonds.mjs';
// Verified: EXP levels, separate Aptitude/skills, limit breaks, named equipment bonuses.
// Costs, Power formula, stages, party rules and loot amounts are local reconstruction.
const gearPrices={Item_Weapon_Equipment_1_1:30,Item_Weapon_Equipment_2_1:60,Item_Weapon_Equipment_3_1:90}; // Local shop prices.
const ORIGINAL_GEAR=original.gear.map(g=>({...g,price:gearPrices[g.id]??null}));
export const GEAR=[...ORIGINAL_GEAR,...expandedGear];
export const MATERIALS=[{id:'Item_Talent_Hero_1',name:'Skill Pearl',price:200,detail:'Local effect: +1 Fellow Aptitude'},{id:'local_skill_scroll',name:'Skill Scroll',price:300,detail:'Improve a Fellow skill'},{id:'local_limit_token',name:'Local Limit-Break Token',price:1000,detail:'Raise a Fellow level cap'}];
export const LEGACY_ITEMS=[...MATERIALS,...ORIGINAL_GEAR.filter(g=>g.price!==null)];
export const V7_ITEMS=[...MATERIALS,...ORIGINAL_GEAR.filter(g=>/^Aptitude \+\d+\./.test(g.description))];
export const CONSUMABLES=original.consumables;
export const V8_ITEMS=[...V7_ITEMS,...CONSUMABLES.filter(i=>!['gold','points'].includes(i.stat)).map(i=>({...i,price:null}))];
export const V9_ITEMS=[...MATERIALS,...ORIGINAL_GEAR,...CONSUMABLES.map(i=>({...i,price:null}))];
export const EXTRA_ITEMS=[...MATERIALS,...GEAR,...CONSUMABLES.map(i=>({...i,price:null}))];
export const emptyMaterials=()=>Object.fromEntries(EXTRA_ITEMS.map(x=>[x.id,0]));
export const newFellow=(level=1)=>({level,aptitude:10,skill:0,breaks:0,gear:null});
export const fellowCap=(f,s=null,id=null)=>originalProgression(s)?sourceCap(s,id):20+f.breaks*10;
export const xpCost=(level,s=null)=>originalProgression(s)?(originalCost(level)??Infinity):s&&sourceTraining(s)?(originalTrainingCost(level)??Infinity):Math.ceil(50*Math.pow(1.14,level-1));
/** @param {number|string} [amount] */
export function levelTrainingPlan(s,id,amount='max'){
 const f=s.fellows[id];if(!f||sourceTraining(s)&&s.trainingCosts.receipts.length>=10000||![1,5,'max'].includes(amount))return {count:0,cost:0,level:f?.level||0};
 let level=f.level,cost=0,count=0;while(level<fellowCap(f,s,id)&&count<(amount==='max'?750:amount)&&cost+xpCost(level,s)<=s.fellowXP){cost+=xpCost(level,s);level++;count++;}return {count,cost,level};
}
/** @param {number|string} [amount] */
export function aptitudeTrainingPlan(s,id,amount='max'){
 const f=s.fellows[id];const count=!f||![1,5,'max'].includes(amount)?0:Math.max(0,Math.min(amount==='max'?1000:amount,1000-f.aptitude,s.inventory.Item_Talent_Hero_1));return {count,cost:count,aptitude:(f?.aptitude||0)+count};
}
export function supplyPurchasePlan(s,id,amount=1){const item=EXTRA_ITEMS.find(i=>i.id===id);if(!item||item.price==null||![1,5,25].includes(amount))return {count:0,cost:0,currency:'gold'};const currency=GEAR.some(g=>g.id===id)?'crystals':'gold',count=Math.max(0,Math.min(amount,1e6-s.inventory[id],Math.floor(s[currency]/item.price)));return {count,cost:count*item.price,currency};}
export const skillCost=f=>f.skill+1;
export const breakCost=f=>f.breaks+1;
// Stars are a per-Fellow halo track. The depth and the effect type are from the original: SkillBase
// carries 1,004 Hero_Star_Halo_Nomal rows with maxUpgradeLevel 7, 156 of 181 Heroes own one, and the
// universal exchange item is described as improving Fellow Stars as well as recruiting.
// The magnitude is ours. The extraction has no star cost table, and every percent-bearing row
// Everkai has calibrated against turned out to be a flat `talent` prop, so there is nothing to pin
// the original's percent scale to. Treat these numbers as local balance, like artifact upgrade
// costs and the Power formula. Stars are stored only once earned, so saves without them are
// unchanged and fellowFactor is an exact no-op at zero stars.
export const STAR_CAP=7,STAR_APTITUDE_PERCENT=5,STAR_COSTS=Object.freeze([10,20,30,50,70,100,140]);
export const fellowStars=f=>f?.stars||0;
/** What the next star costs in star shards, or null at the cap. */
export const nextStarCost=f=>STAR_COSTS[fellowStars(f)]??null;
/** A Fellow's Aptitude after its stars. Applied here rather than in bondedPower's additive stack so
 *  it reaches village earnings through buildingRate as well as Power through fellowPower. */
export const starredAptitude=f=>f.aptitude*(1+fellowStars(f)*STAR_APTITUDE_PERCENT/100);
export const fellowFactor=f=>(starredAptitude(f)+(GEAR.find(g=>g.id===f.gear)?.aptitude||0)+artifactBonus(f))/10*(1+f.skill*.05);
export const fellowPower=f=>Math.floor((80+20*f.level)*fellowFactor(f));
export const bondedPower=(s,id)=>{const b=blessingPower(s,id),m=museumBonus(s),pet=familiarBonus(s,id),fish=fishingBonuses(s,id),echo=artifactEchoBonus(s,id),f=s.fellows[id];const adjusted={...f,aptitude:f.aptitude+specialAptitude(s,id)+m.aptitude+pet.aptitude+fish.aptitude+echo.aptitude};const base=(originalProgression(s)?Math.floor(sourceCoefficient(f.level)*(starredAptitude(adjusted)+sourceAptitudeBonus(s,id)+(GEAR.find(g=>g.id===f.gear)?.aptitude||0)+artifactBonus(f))*(1+f.skill*.05)):fellowPower(adjusted))*(1+m.basicPowerPercent/100);return applyStella(s,id,Math.floor((base*(bondFactor(s,id)+b.percent+pet.percent/100+fish.percent/100+echo.percent/100)+b.flat+pet.flat+fish.flat)*(1+m.powerPercent/100)*(1+pet.finalPercent/100))+elixirPower(s,id))};
export const teamPower=s=>s.adventure.party.reduce((n,id)=>n+bondedPower(s,id),0);
export const STAGES=Array.from({length:30},(_,i)=>{const n=i+1;return {id:n,chapter:Math.ceil(n/6),name:['Village Road','Forest Crossing','Riverside Trail','Mountain Pass','Ancient Gate'][Math.floor(i/6)],boss:n%6===0,power:Math.ceil(100*Math.pow(1.16,i)),cost:50*n,gold:100*n,xp:125*n,crystals:n%6===0?30:10}});
export const freshAdventure=()=>({cleared:0,party:['hero_15'],patrols:0,lastBattle:null});
export function validAdventure(s){const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
 if(!int(s.crystals,1e9)||!s.adventure||!int(s.adventure.cleared,30)||!int(s.adventure.patrols,1e9)||!Array.isArray(s.adventure.party)||s.adventure.party.length<1||s.adventure.party.length>3||new Set(s.adventure.party).size!==s.adventure.party.length||!s.adventure.party.every(id=>Object.hasOwn(s.fellows,id)))return false;
 const b=s.adventure.lastBattle;if(b!==null&&(!b||!int(b.stage,30)||b.stage<1||!int(b.power,1e12)||typeof b.won!=='boolean'||!['battle','patrol'].includes(b.kind)))return false;
 return validOriginalProgression(s)&&validTrainingCosts(s)&&validFishing(s)&&validInsight(s)&&validTalents(s)&&validArtifacts(s)&&Object.entries(s.fellows).every(([id,f])=>int(f.aptitude,1000)&&f.aptitude>=10&&int(f.skill,20)&&int(f.breaks,4)&&(f.stars===undefined||int(f.stars,STAR_CAP))&&f.level<=fellowCap(f,s,id)&&(f.gear===null||(s.version>=10?GEAR:ORIGINAL_GEAR).some(g=>g.id===f.gear)));
}
export function adventureAction(s,action,target,value){const fail=error=>({state:s,error});const bounded=n=>Math.min(1e9,n);const count=n=>Math.min(1e6,n);
 const original=originalProgressionAction(s,action,target);if(original)return original;
 if(action==='activateOriginalTraining'){if(sourceTraining(s))return fail('APK training costs are already active.');return {state:activateTrainingCosts(s),message:'APK EXP costs now apply to future training. Existing levels and balances preserved.'};}
 if(action==='train'){const f=s.fellows[target];if(!f||![1,5,'max'].includes(value))return fail('Choose a Fellow and a training amount.');const plan=levelTrainingPlan(s,target,value);if(!plan.count)return fail(f.level>=fellowCap(f,s,target)?'Limit break this Fellow to raise the level cap.':'Earn more Fellow EXP from school or stages.');return {state:{...s,...recordTraining(s,target,f.level,plan.level,plan.cost),fellowXP:s.fellowXP-plan.cost,upgrades:s.upgrades+plan.count,fellows:{...s.fellows,[target]:{...f,level:plan.level}}},message:`Trained ${plan.count} levels for ${plan.cost} EXP. Fellow reached Lv. ${plan.level}.`}}
 if(action==='aptitude'){const amount=value??1;if(![1,5,'max'].includes(amount))return fail('Choose an Aptitude training amount.');const p=aptitudeTrainingPlan(s,target,amount);if(!p.count)return fail('Choose an owned Fellow below the Aptitude cap with Skill Pearls available.');return {state:{...s,inventory:{...s.inventory,Item_Talent_Hero_1:s.inventory.Item_Talent_Hero_1-p.cost},fellows:{...s.fellows,[target]:{...s.fellows[target],aptitude:p.aptitude}}},message:`+${p.count} local Aptitude for ${p.cost} Skill Pearls.`};}
 if(['fellowSkill','limitBreak'].includes(action)){const f=s.fellows[target];if(!f)return fail('Recruit this Fellow first.');const key=action==='aptitude'?'aptitude':action==='fellowSkill'?'skill':'breaks',cap=action==='aptitude'?1000:action==='fellowSkill'?20:4,item=action==='aptitude'?'Item_Talent_Hero_1':action==='fellowSkill'?'local_skill_scroll':'local_limit_token',cost=action==='aptitude'?1:action==='fellowSkill'?skillCost(f):breakCost(f);if(f[key]>=cap)return fail('Current upgrade limit reached.');if(action==='limitBreak'&&originalProgression(s))return fail('Use the original quality upgrade in Training Rules.');if(action==='limitBreak'&&f.level<fellowCap(f,s,target))return fail('Reach the current level cap first.');if(s.inventory[item]<cost)return fail('Get more materials from stages or the supply shop.');return {state:{...s,inventory:{...s.inventory,[item]:s.inventory[item]-cost},fellows:{...s.fellows,[target]:{...f,[key]:f[key]+1}}},message:action==='limitBreak'?'Level cap raised by 10.':'Fellow improved. Power and business earnings increased.'}}
 if(action==='equip'){const f=s.fellows[target];if(!f||!(value===null||GEAR.some(g=>g.id===value)))return fail('Choose a Fellow and valid equipment.');if(f.gear===value)return fail('Already equipped.');if(value&&s.inventory[value]<1)return fail('That equipment is not in your bag.');if(f.gear&&s.inventory[f.gear]>=1e6)return fail('Make room in your bag first.');return {state:transferArtifact(s,target,value),message:value?'Equipment equipped. Previous equipment returned to your bag.':'Equipment returned to your bag.'}}
 if(action==='party'){if(!Object.hasOwn(s.fellows,target))return fail('Recruit this Fellow first.');const party=s.adventure.party.includes(target)?s.adventure.party.filter(id=>id!==target):[...s.adventure.party,target];if(!party.length||party.length>3)return fail('Your party must contain 1 to 3 Fellows.');return {state:{...s,adventure:{...s.adventure,party}},message:'Adventure party updated.'}}
 if(action==='buySupply'){const amount=value??1;if(![1,5,25].includes(amount))return fail('Choose a purchase amount.');const plan=supplyPurchasePlan(s,target,amount);if(!plan.count)return fail('This supply is unavailable, your bag is full, or you need more currency.');return {state:{...s,[plan.currency]:s[plan.currency]-plan.cost,inventory:{...s.inventory,[target]:s.inventory[target]+plan.count}},message:`${plan.count} supplies purchased for ${plan.cost} ${plan.currency}.`};}
 if(action==='battle'||action==='patrol'){const stage=STAGES.find(x=>x.id===target);if(!stage||(action==='battle'?stage.id!==s.adventure.cleared+1:stage.id>s.adventure.cleared))return fail('Choose the next stage or a cleared patrol.');const power=teamPower(s),cost=action==='battle'?stage.cost:25*stage.id;const lastBattle={stage:stage.id,power,won:power>=stage.power,kind:action};if(power<stage.power)return {state:{...s,adventure:{...s.adventure,lastBattle}},error:'Your party needs more Power. No gold was spent.'};if(s.gold<cost)return fail('Collect village gold to fund this expedition.');const inventory={...s.inventory};if(action==='battle'){inventory.Item_Talent_Hero_1=count(inventory.Item_Talent_Hero_1+1);if(stage.id%3===0)inventory.local_skill_scroll=count(inventory.local_skill_scroll+1);if(stage.id%5===0)inventory.local_limit_token=count(inventory.local_limit_token+1)}const xp=action==='battle'?stage.xp:40*stage.id;
  // Clearing a stage releases Fairy Bottles, as in the original (Item_Token_Gacha_Universal source:
  // "Stages [Clear Stages], Daily Task"). Thirty stages exist, so this is a finite trickle; the daily
  // habit refill carries the recurring half. total counts fairies released by wishing and is left alone.
  const base=s.fountain||FRESH_FOUNTAIN;
  const fountain=action==='battle'?{...base,bottles:Math.min(1e6,base.bottles+STAGE_BOTTLES)}:null;
  return {state:{...s,gold:Math.min(1e12,s.gold-cost+(action==='battle'?stage.gold:cost)),fellowXP:bounded(s.fellowXP+xp),crystals:bounded(s.crystals+(action==='battle'?stage.crystals:0)),inventory,...(fountain?{fountain}:{}),adventure:{...s.adventure,cleared:action==='battle'?stage.id:s.adventure.cleared,patrols:bounded(s.adventure.patrols+(action==='patrol'?1:0)),lastBattle}},message:action==='battle'?`Stage ${stage.id} cleared! +${stage.xp} EXP, ${stage.crystals} crystals, ${STAGE_BOTTLES} Fairy Bottles and materials.`:`Patrol complete: +${xp} EXP. Entry gold returned.`}}
 return null;
}
