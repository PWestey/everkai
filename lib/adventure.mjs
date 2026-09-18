import opening from './opening-data.json' with {type:'json'};
import {MAX_GOLD} from './limits.mjs';
import {specialAptitude} from './special-blessings.mjs';
import {originalProgression,originalCost,sourceCap,qualityRule,sourceAptitudeBonus,sourceCoefficient,validOriginalProgression,originalProgressionAction} from './original-progression.mjs';
import {sourceTraining,trainingCost,validTrainingCosts,activateTrainingCosts,recordTraining} from './training-costs.mjs';
import {stellaBonus} from './stella.mjs';
import {elixirPower} from './elixirs.mjs';
import {artifactEchoBonus} from './artifact-echo.mjs';
import {fishingBonuses,validFishing} from './fishing.mjs';
import {validInsight} from './insight.mjs';
import {recordAptitude,validAptitudeLedger} from './aptitude-ledger.mjs';
import {familiarBonus} from './familiar-nodes.mjs';
import {museumBonus} from './museum.mjs';
import expandedGear from './expanded-gear.json' with {type:'json'};
import {STAGES,STAGE_COUNT,stageAt,stagePending,stageCost,stageReady,openingBossReady} from './stage-ladder.mjs';
export {STAGES,STAGE_COUNT,stageAt,stagePending,stageCost,stageReady};
// Kept local on purpose: lib/fountain.mjs imports from this module, so importing fountainState back
// would close an import cycle. tests/earned-bottles.test.mjs fails if this shape drifts from fountainState().
// Fairy Bottles used to be a flat 3 per stage -- invented, and on an 18,000-stage ladder that would have
// been a 54,000-bottle faucet. The original releases the universal token from the BOSS row only, one per
// boss (`items: [... {id:'Item_Token_Gacha_Universal', count:1}]` on all 3,000 imported boss rows), so a
// clear now pays that row's own count: 0 on a normal stage, 1 on a boss, 3,000 over the whole ladder.
export const stageBottles=stage=>stage?.bottles||0;
export const FRESH_FOUNTAIN={policyVersion:1,seq:0,seed:123456789,bottles:0,total:0,ledger:{},history:[],recruited:[]};
import {blessingPower} from './blessings.mjs';
import {validTalents} from './talents.mjs';
import {artifactBonus,validArtifacts,transferArtifact,artifactRule} from './artifacts.mjs';
import original from './original-content.mjs';
import {bondFactor} from './bonds.mjs';
import {APTITUDE_CAP,PEARL_APTITUDE_CAP} from './aptitude-cap.mjs';
// Verified: EXP levels, separate Aptitude/skills, limit breaks, named equipment bonuses.
// Costs, Power formula, stages, party rules and loot amounts are local reconstruction.
// ECON-22: buySupply priced only 3 of the 89 shipped artifacts; the other 86 had price null, so the
// shelf showed no Buy button and the only other door (forgeArtifact) is gated on Magic Ore. The three
// shipped prices were 30 / 60 / 90 crystals for the artifacts whose OWN rule rows carry ore 10 / 20 / 30
// (lib/artifact-rules.json, one record per artifact). That is exactly 3x ore in all three cases, so the
// price curve is read back out of the same table rather than invented: every artifact is now priced at
// three times its own recorded upgrade ore, which reproduces all three shipped prices unchanged.
// Both halves of that ratio come from lib/artifact-rules.json. Guarded by tests/artifact-prices.test.mjs.
export const ARTIFACT_PRICE_PER_ORE=3;
export const artifactPrice=id=>{const ore=artifactRule(id)?.ore;return Number.isInteger(ore)&&ore>0?ARTIFACT_PRICE_PER_ORE*ore:null};
const ORIGINAL_GEAR=original.gear.map(g=>({...g,price:artifactPrice(g.id)}));
export const GEAR=[...ORIGINAL_GEAR,...expandedGear.map(g=>({...g,price:artifactPrice(g.id)}))];
export const MATERIALS=[{id:'Item_Talent_Hero_1',name:'Skill Pearl',price:200,detail:'Local effect: +1 Fellow Aptitude. The price doubles every 2,500 pearls bought.'},{id:'local_skill_scroll',name:'Skill Scroll',price:300,detail:'Improve a Fellow skill'},{id:'local_limit_token',name:'Local Limit-Break Token',price:1000,detail:'Raise a Fellow level cap'}];
// LEGACY_ITEMS fixes the exact inventory KEY SET that a v5/v6 save is allowed to carry (validFamily
// counts it), so it must NOT follow the live price table. It used to be spelled
// `ORIGINAL_GEAR.filter(g=>g.price!==null)`, which happened to name these three; pricing the other 86
// artifacts (ECON-22) would silently have widened it from 3 items to 89 and made every real v5/v6 save
// fail to decode. Pinned to the three ids those saves actually shipped with.
export const LEGACY_ITEMS=[...MATERIALS,...ORIGINAL_GEAR.filter(g=>['Item_Weapon_Equipment_1_1','Item_Weapon_Equipment_2_1','Item_Weapon_Equipment_3_1'].includes(g.id))];
export const V7_ITEMS=[...MATERIALS,...ORIGINAL_GEAR.filter(g=>/^Aptitude \+\d+\./.test(g.description))];
export const CONSUMABLES=original.consumables;
export const V8_ITEMS=[...V7_ITEMS,...CONSUMABLES.filter(i=>!['gold','points'].includes(i.stat)).map(i=>({...i,price:null}))];
export const V9_ITEMS=[...MATERIALS,...ORIGINAL_GEAR,...CONSUMABLES.map(i=>({...i,price:null}))];
// Journey rewards are ordinary bag items. They used to land in opening.locker, a second inventory only the
// Journey page listed, so a save at stage 1,917 held 91 recruitment tokens the player could not find. The 25
// ids the opening tables award that no other system stocks are added here, unpriced (the shop does not sell
// them); repairSave reconciles older saves and moves any locker contents across.
/** Journey rewards other systems already hold: hire cards live in Staffing (their purchase receipt records
 *  destination 'staffing'), so they must not also become Bag items. */
const OWNED_ELSEWHERE=new Set(['Item_Building_Recruit_Increase_1','Item_Building_Recruit_Increase_2','Item_Building_Recruit_Increase_3']);
export const JOURNEY_ITEMS=opening.items.filter(i=>!['1','3','4','5'].includes(i._id)).map(i=>({id:i._id,name:i.name||i._id,price:null,journey:true}))
 .filter(i=>![...MATERIALS,...GEAR,...CONSUMABLES].some(x=>x.id===i.id)&&!/^gift\d+$/.test(i.id)&&!OWNED_ELSEWHERE.has(i.id));
export const EXTRA_ITEMS=[...MATERIALS,...GEAR,...CONSUMABLES.map(i=>({...i,price:null})),...JOURNEY_ITEMS];
export const emptyMaterials=()=>Object.fromEntries(EXTRA_ITEMS.map(x=>[x.id,0]));
export const newFellow=(level=1)=>({level,aptitude:10,skill:0,breaks:0,gear:null});
// Default mode now reads the original's own quality ladder: breaks 0-13 map to tiers 1-14, giving
// caps 100,150,...,750 instead of 20+breaks*10 topping out at 60. A fresh Fellow starts at 100
// because that IS the original's quality-1 levelLimit. Widening only accepts more, so every
// existing save (breaks 0-4, levels <=60) stays valid without migration.
export const fellowCap=(f,s=null,id=null)=>originalProgression(s)?sourceCap(s,id):qualityRule(Math.min(14,(f.breaks||0)+1)).cap;
// The default curve was 50*1.14^(level-1) -- exponential, 142x the original at level 60, and past
// the wallet ceiling by level ~140. The original's curve already ships and matches its table
// 750/750, so using it is a correction. NOTE sourceTraining's table is TRUNCATED: it matches
// levels 1-59 and returns null from 60, which would freeze training at 60. The fall-back to
// originalCost lives in trainingCost(), which validTrainingCosts uses for the SAME sum -- when the
// charge and the recomputation were written separately, the game billed originalCost(60) while the
// validator denied any price past 59, and every save trained past level 60 failed valid().
export const xpCost=(level,s=null)=>originalProgression(s)?(originalCost(level)??Infinity):s&&sourceTraining(s)?(trainingCost(level)??Infinity):(originalCost(level)??Infinity);
/** @param {number|string} [amount] */
export function levelTrainingPlan(s,id,amount='max'){
 const f=s.fellows[id];if(!f||sourceTraining(s)&&s.trainingCosts.receipts.length>=10000||![1,5,'max'].includes(amount))return {count:0,cost:0,level:f?.level||0};
 let level=f.level,cost=0,count=0;while(level<fellowCap(f,s,id)&&count<(amount==='max'?750:amount)&&cost+xpCost(level,s)<=s.fellowXP){cost+=xpCost(level,s);level++;count++;}return {count,cost,level};
}
/** @param {number|string} [amount] */
export function aptitudeTrainingPlan(s,id,amount='max'){
 const f=s.fellows[id];const count=!f||![1,5,'max'].includes(amount)?0:Math.max(0,Math.min(amount==='max'?PEARL_APTITUDE_CAP:amount,PEARL_APTITUDE_CAP-f.aptitude,s.inventory.Item_Talent_Hero_1));return {count,cost:count,aptitude:(f?.aptitude||0)+count};
}
// Local rule. The original sells no Skill Pearls for gold at all; they come only from rewards, and
// removing the gold shop cut simulated day-21 income from 552M/s to 208M/s. The shop stays, but its
// price doubles every 2,500 pearls bought over the save's life (counted in s.shopPearls): the first
// few thousand stay near 200 gold, and the tens of thousands a full roster wants track income instead
// of costing nothing once income reaches billions a day.
export const PEARL_ID='Item_Talent_Hero_1',PEARL_BASE_PRICE=200,PEARL_PRICE_DOUBLING=2500;
export const pearlPrice=bought=>Math.min(MAX_GOLD,Math.round(PEARL_BASE_PRICE*2**(bought/PEARL_PRICE_DOUBLING)));
export function supplyPurchasePlan(s,id,amount=1){const item=EXTRA_ITEMS.find(i=>i.id===id);if(!item||item.price==null||![1,5,25].includes(amount))return {count:0,cost:0,currency:'gold'};if(id===PEARL_ID){const bought=s.shopPearls||0,room=Math.min(amount,1e6-s.inventory[id]);let count=0,cost=0;while(count<room&&cost+pearlPrice(bought+count)<=s.gold){cost+=pearlPrice(bought+count);count++;}return {count,cost,currency:'gold'};}const currency=GEAR.some(g=>g.id===id)?'crystals':'gold',count=Math.max(0,Math.min(amount,1e6-s.inventory[id],Math.floor(s[currency]/item.price)));return {count,cost:count*item.price,currency};}
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
/** A Fellow's Aptitude after its stars. Used ONLY by the starter buildings now (lib/game.mjs buildingRate
 *  reads fellowFactor), which are Everkai's own local income model and are deliberately left as they were.
 *  Fellow Power no longer reads it: the original puts stars in the `percent` bucket, see powerParts. */
export const starredAptitude=f=>f.aptitude*(1+fellowStars(f)*STAR_APTITUDE_PERCENT/100);
export const fellowFactor=f=>(starredAptitude(f)+(GEAR.find(g=>g.id===f.gear)?.aptitude||0)+artifactBonus(f))/10*(1+f.skill*.05);
/** The OLD default-mode record-only Power, kept for the starter-building tests that read it. bondedPower no
 *  longer calls it; for a Fellow with no stars and no external source the two agree exactly. */
export const fellowPower=f=>Math.floor((80+20*f.level)*fellowFactor(f));
// ---------------------------------------------------------------------------------------------------
// FELLOW POWER, REBUILT 2026-09-18 ON THE ORIGINAL'S OWN COMPOSITION.
//
// docs/power-parity-audit.md 1.4 reproduces two of the owner's real Power Details panels to the unit
// (2,665,123,377 and 456,778,931) with this, and nothing else does:
//
//   Aptitude = floor( S talent x (1 + S coefpercent/1e4) )
//   Power    = floor( ( floor(ADH(level) x Aptitude x (1 + S percent/1e4)) + S flat ) x (1 + S final/1e4) )
//
// It is the client's Formula_ADD (private-server/readable/PropManager.lua:99-117) with extrapercent 0:
// `calc_formual_part` SUMS every named system into its bucket, so every "percent" row -- stars, family,
// artifacts, Stella -- ADDS inside one factor rather than multiplying another; flats sit outside that
// factor; one small final multiplier wraps the lot. What the old spine got wrong, measured against it:
//   * stars multiplied Aptitude (a coef effect); the panel reads them as FORMULA_PERCENT/"herostar";
//   * skill and museum basicPowerPercent were separate multipliers; they are parts of `percent`;
//   * Stella's percent multiplied EVERYTHING, flats included, as an outer wrapper (applyStella). The
//     server sends it as `percent/underlingskillpower` -- one more part of the same bucket;
//   * museum powerPercent and the familiar's finalPercent multiplied each other; both are `final`.
// Every Everkai source now sits in the bucket the original uses for the same system; the table is in
// docs/power-parity-audit.md 9. BOTH MODES use this one composition. The only difference is ADH:
//   APK growth   HeroLevel.coefficientADH, 300 -> 15,500 (sourceCoefficient), plus the hero row's own
//                initialTalent + quality talent (sourceAptitudeBonus) as a talent part;
//   default      (80 + 20 x level) / 10, i.e. 10 -> 1,508: the pre-existing default-mode scale, which is
//                what the old `fellowFactor`'s /10 did, folded into the level column so the formula is
//                identical and a fresh default Fellow is still worth exactly 100.
// Power is DERIVED and never stored, so no save changes shape (CLAUDE.md rule 12 -- tested in
// tests/power-composition.test.mjs against saves written by the previous build).
// ---------------------------------------------------------------------------------------------------
export const POWER_BP=10000;
/** One star is +5% -- Everkai's own magnitude (STAR_APTITUDE_PERCENT), now in the original's bucket. */
export const STAR_POWER_BP=STAR_APTITUDE_PERCENT*100;
/** One Fellow-skill level is +5%, the same local magnitude it always had, now a part of `percent`. */
export const SKILL_POWER_BP=500;
/** The default-mode level column. */
export const defaultADH=level=>(80+20*level)/10;
export const levelADH=(s,level)=>originalProgression(s)?sourceCoefficient(level):defaultADH(level);
/** Whole percent -> basis points. Rounded because several sources store decimals (0.12 x 1e4 is 1199.99..). */
const bp=pct=>Math.round(pct*100);
const total=o=>Object.values(o).reduce((n,v)=>n+v,0);
/** EVERKAI-ONLY: the familiar node grid (lib/familiar-nodes.mjs). Its SHAPE is the original's -- a pet
 *  writes talent, percent, flat and final (PetInfo.lua:848-852, PetManager.lua:57-63) -- so its parts sit
 *  in those buckets. Its MAGNITUDE has no original counterpart (docs/power-parity-audit.md 4.3: 97% of a
 *  maxed Fellow). Every part it contributes is named `familiar` so it can be re-priced later without
 *  hunting for it. It is NOT removed or reduced here: that would take banked value from real saves. */
export const EVERKAI_ONLY_PARTS=Object.freeze(['familiar']);
/** The composition itself, on bucket SUMS, in exact integer basis points. Exported so the owner's two real
 *  Power Details panels can be fed straight in (tests/power-composition.test.mjs): it returns
 *  2,665,123,377 and 456,778,931, the displayed totals, to the unit. */
export function composePower({adh,talent,coefpercent=0,percent=0,flat=0,final=0}){
 const aptitude=Math.floor(talent*(POWER_BP+coefpercent)/POWER_BP);
 const base=Math.floor(adh*aptitude*(POWER_BP+percent)/POWER_BP);
 return {aptitude,base,power:Math.floor((base+flat)*(POWER_BP+final)/POWER_BP)};
}
/** Every part of one Fellow's Power, by bucket and by source. Pure, derived, never stored. */
export function powerParts(s,id){
 const f=s.fellows[id],b=blessingPower(s,id),m=museumBonus(s),pet=familiarBonus(s,id),fish=fishingBonuses(s,id),echo=artifactEchoBonus(s,id),st=stellaBonus(s,id);
 const talent={record:f.aptitude,hero:sourceAptitudeBonus(s,id),gear:GEAR.find(g=>g.id===f.gear)?.aptitude||0,artifact:artifactBonus(f),family:specialAptitude(s,id),museum:m.aptitude,fishing:fish.aptitude,echo:echo.aptitude,familiar:pet.aptitude};
 const coefpercent={};
 const percent={stars:fellowStars(f)*STAR_POWER_BP,skill:(f.skill||0)*SKILL_POWER_BP,bonds:Math.round((bondFactor(s,id)-1)*POWER_BP),family:Math.round(b.percent*POWER_BP),museum:bp(m.basicPowerPercent),fishing:bp(fish.percent),echo:bp(echo.percent),stella:bp(st.percent),familiar:bp(pet.percent)};
 const flat={family:b.flat,fishing:fish.flat,stella:st.flat,elixir:elixirPower(s,id),familiar:pet.flat};
 const final={museum:bp(m.powerPercent),familiar:bp(pet.finalPercent)};
 const adh=levelADH(s,f.level);
 const {aptitude,base,power}=composePower({adh,talent:total(talent),coefpercent:total(coefpercent),percent:total(percent),flat:total(flat),final:total(final)});
 return {adh,talent,coefpercent,aptitude,percent,base,flat,final,power};
}
export const bondedPower=(s,id)=>powerParts(s,id).power;
/** The adventure party's own Power. Still the party's, because the party is what the Frontier fights
 *  with (lib/frontier.mjs) -- but it is NOT what the stage ladder is measured against; see ladderPower. */
export const teamPower=s=>s.adventure.party.reduce((n,id)=>n+bondedPower(s,id),0);
/** What a stage is measured against. The original compares `battleconf.atk` with `zzPropMgr.heroTotalPower`,
 *  which is the WHOLE roster's summed Power -- the same field the roster screen prints as "all fighting"
 *  (readable/SceneUnderling.lua:606), not a party subset. Rule 1: the atk side of that comparison comes
 *  from the original's table, so the Power side has to be the quantity the original divided by. Comparing
 *  the original's atk against a 3-Fellow party would be the two halves coming from different games.
 *  The x100 in default mode is the pre-existing local adapter between Everkai's two Power modes
 *  (`bondedPower` divides by 10 outside originalProgression); it is unchanged from openingPower, which
 *  this function replaces and which is re-exported from lib/opening.mjs under its old name. */
export const ladderPower=s=>Math.floor(Object.keys(s.fellows).reduce((n,id)=>n+bondedPower(s,id),0)*(originalProgression(s)?1:100));
export const freshAdventure=()=>({cleared:0,party:['hero_15'],patrols:0,lastBattle:null});
// BUG-40: patrol was the second unmetered Fellow EXP faucet. It was accepted 1,000 times at ONE frozen
// timestamp -- 1,200 EXP each at stage 30, with the entry gold returned on every win, so it cost nothing
// and took no time. It needs a clock rather than a day key, because a day key would still let one
// timestamp pay out once and hide the real rate.
// The meter is the original's own repeatable-expedition meter, taken whole from System.json:
// `adventureSupplyrecovery` 28800 (seconds -> 8 hours per charge) and `adventureSupplyCeiling` 5.
// Both halves of the rate come from that one table. The SUSTAINED rate is 24h / 8h = 3 charges a day
// (5 is only the burst after idling ~40h), so at stage 30 patrol EXP is 3 x 1,200 = 3,600 a day against
// school's measured 17,280 -- a real rate instead of "as fast as you can click".
export const PATROL_RECOVERY_MS=28800000,PATROL_CEILING=5;
/** The refill anchor. A save with no stamp (fresh, or written before this gate) starts with a full
 *  bucket rather than an empty one, so the gate never retroactively takes patrols away. */
const patrolAnchor=(s,now)=>Number.isSafeInteger(s.adventure?.patrolAt)?s.adventure.patrolAt:now-PATROL_CEILING*PATROL_RECOVERY_MS;
export const patrolCharges=(s,now=s.lastAt)=>Math.max(0,Math.min(PATROL_CEILING,Math.floor((now-patrolAnchor(s,now))/PATROL_RECOVERY_MS)));
/** When the next charge lands, or null at the ceiling. */
export const patrolReadyAt=(s,now=s.lastAt)=>patrolCharges(s,now)>=PATROL_CEILING?null:patrolAnchor(s,now)+(patrolCharges(s,now)+1)*PATROL_RECOVERY_MS;
/** Spend one charge: advance the anchor by one recovery, after discarding refill older than the ceiling. */
const spendPatrol=(s,now)=>Math.max(patrolAnchor(s,now),now-PATROL_CEILING*PATROL_RECOVERY_MS)+PATROL_RECOVERY_MS;
export function validAdventure(s){const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
 // Rule 12. The ladder went from 30 invented stages to the original's 18,000, so both bounds widen.
 // A widening only ever accepts MORE saves, so every existing save still decodes -- but the derived
 // gate in lib/frontier.mjs did NOT widen for free: it read `s.adventure.cleared!==30` as a save-validity
 // condition, so the first player to clear stage 31 would have had their Frontier save refused. That
 // comparison is now `>=30`. See tests/adventure-ladder.test.mjs for the negative control.
 if(!int(s.crystals,1e9)||!s.adventure||!int(s.adventure.cleared,STAGE_COUNT)||!int(s.adventure.patrols,1e9)||!Array.isArray(s.adventure.party)||s.adventure.party.length<1||s.adventure.party.length>3||new Set(s.adventure.party).size!==s.adventure.party.length||!s.adventure.party.every(id=>Object.hasOwn(s.fellows,id)))return false;
 // patrolAt is optional (older saves have none) and may sit below zero only under a synthetic
 // zero-epoch test clock. It can never sit more than one full bucket in the future.
 if(s.adventure.patrolAt!==undefined&&(!Number.isSafeInteger(s.adventure.patrolAt)||s.adventure.patrolAt>s.lastAt+PATROL_CEILING*PATROL_RECOVERY_MS))return false;
 // b.power is now the roster total, which after the Stella/Spirit import is expected to pass 1e12;
 // the old 1e12 bound would have refused the save of anyone who reached it. Widened to 1e18.
 const b=s.adventure.lastBattle;if(b!==null&&(!b||!int(b.stage,STAGE_COUNT)||b.stage<1||!int(b.power,1e18)||typeof b.won!=='boolean'||!['battle','patrol'].includes(b.kind)))return false;
 return (s.shopPearls===undefined||int(s.shopPearls,1e12))&&validOriginalProgression(s)&&validTrainingCosts(s)&&validFishing(s)&&validInsight(s)&&validTalents(s)&&validAptitudeLedger(s)&&validArtifacts(s)&&Object.entries(s.fellows).every(([id,f])=>int(f.aptitude,APTITUDE_CAP)&&f.aptitude>=10&&int(f.skill,20)&&int(f.breaks,13)&&(f.stars===undefined||int(f.stars,STAR_CAP))&&f.level<=fellowCap(f,s,id)&&(f.gear===null||(s.version>=10?GEAR:ORIGINAL_GEAR).some(g=>g.id===f.gear)));
}
export function adventureAction(s,action,target,value){const fail=error=>({state:s,error});const bounded=n=>Math.min(1e9,n);
 const original=originalProgressionAction(s,action,target);if(original)return original;
 if(action==='activateOriginalTraining'){if(sourceTraining(s))return fail('APK training costs are already active.');return {state:activateTrainingCosts(s),message:'APK EXP costs now apply to future training. Existing levels and balances preserved.'};}
 if(action==='train'){const f=s.fellows[target];if(!f||![1,5,'max'].includes(value))return fail('Choose a Fellow and a training amount.');const plan=levelTrainingPlan(s,target,value);if(!plan.count)return fail(f.level>=fellowCap(f,s,target)?'Limit break this Fellow to raise the level cap.':'Earn more Fellow EXP from school or stages.');return {state:{...s,...recordTraining(s,target,f.level,plan.level,plan.cost),fellowXP:s.fellowXP-plan.cost,upgrades:s.upgrades+plan.count,fellows:{...s.fellows,[target]:{...f,level:plan.level}}},message:`Trained ${plan.count} levels for ${plan.cost} EXP. Fellow reached Lv. ${plan.level}.`}}
 if(action==='aptitude'){const amount=value??1;if(![1,5,'max'].includes(amount))return fail('Choose an Aptitude training amount.');const p=aptitudeTrainingPlan(s,target,amount);if(!p.count)return fail(s.fellows[target]?.aptitude>=PEARL_APTITUDE_CAP?`Skill Pearls train Aptitude directly only up to ${PEARL_APTITUDE_CAP.toLocaleString()}. Talent upgrades, artifacts, Stella, Family, the museum and fishing raise it further.`:'Choose an owned Fellow below 1,000 Aptitude with Skill Pearls available.');return {state:{...s,inventory:{...s.inventory,Item_Talent_Hero_1:s.inventory.Item_Talent_Hero_1-p.cost},fellows:{...s.fellows,[target]:recordAptitude({...s.fellows[target],aptitude:p.aptitude},'item:'+PEARL_ID,p.cost,p.count)}},message:`+${p.count} local Aptitude for ${p.cost} Skill Pearls.`};}
 if(['fellowSkill','limitBreak'].includes(action)){const f=s.fellows[target];if(!f)return fail('Recruit this Fellow first.');const key=action==='aptitude'?'aptitude':action==='fellowSkill'?'skill':'breaks',cap=action==='aptitude'?APTITUDE_CAP:action==='fellowSkill'?20:13,item=action==='aptitude'?'Item_Talent_Hero_1':action==='fellowSkill'?'local_skill_scroll':'local_limit_token',cost=action==='aptitude'?1:action==='fellowSkill'?skillCost(f):breakCost(f);if(f[key]>=cap)return fail('Current upgrade limit reached.');if(action==='limitBreak'&&originalProgression(s))return fail('Use the original quality upgrade in Training Rules.');if(action==='limitBreak'&&f.level<fellowCap(f,s,target))return fail('Reach the current level cap first.');if(s.inventory[item]<cost)return fail('Get more materials from stages or the supply shop.');return {state:{...s,inventory:{...s.inventory,[item]:s.inventory[item]-cost},fellows:{...s.fellows,[target]:{...f,[key]:f[key]+1}}},message:action==='limitBreak'?'Level cap raised by 10.':'Fellow improved. Power and business earnings increased.'}}
 if(action==='equip'){const f=s.fellows[target];if(!f||!(value===null||GEAR.some(g=>g.id===value)))return fail('Choose a Fellow and valid equipment.');if(f.gear===value)return fail('Already equipped.');if(value&&s.inventory[value]<1)return fail('That equipment is not in your bag.');if(f.gear&&s.inventory[f.gear]>=1e6)return fail('Make room in your bag first.');return {state:transferArtifact(s,target,value),message:value?'Equipment equipped. Previous equipment returned to your bag.':'Equipment returned to your bag.'}}
 if(action==='party'){if(!Object.hasOwn(s.fellows,target))return fail('Recruit this Fellow first.');const party=s.adventure.party.includes(target)?s.adventure.party.filter(id=>id!==target):[...s.adventure.party,target];if(!party.length||party.length>3)return fail('Your party must contain 1 to 3 Fellows.');return {state:{...s,adventure:{...s.adventure,party}},message:'Adventure party updated.'}}
 if(action==='buySupply'){const amount=value??1;if(![1,5,25].includes(amount))return fail('Choose a purchase amount.');const plan=supplyPurchasePlan(s,target,amount);if(!plan.count)return fail('This supply is unavailable, your bag is full, or you need more currency.');return {state:{...s,[plan.currency]:s[plan.currency]-plan.cost,...(target===PEARL_ID?{shopPearls:(s.shopPearls||0)+plan.count}:{}),inventory:{...s.inventory,[target]:s.inventory[target]+plan.count}},message:`${plan.count} supplies purchased for ${plan.cost} ${plan.currency}.`};}
 // THE VILLAGE CAMPAIGN, rebuilt on the original's own ladder (lib/stage-ladder.mjs).
 //
 // What changed and why. The old ladder was `power: ceil(100 * 1.16^i)` over 30 invented stages,
 // topping out at 7,401 -- which a single trained Fellow clears, so nothing on it was a challenge.
 // Every number below is now the stage's own row: `atk` from BattleNormal/LevelBoss, the entry price
 // from that row's `consume`, the EXP from its `item1`, the Fairy Bottle from the boss row's own item.
 //
 // The two resolution rules are the client's, not ours:
 //   normal stage -- Power is not a gate, it is the PRICE. The stage charges its battles' base gold
 //                   scaled by (atk/Power)^(1/4), and you clear it if you can pay (canNormalWin).
 //   boss stage   -- a hard, strictly-greater Power gate, free to attempt (canWinLevelBoss).
 // So the ladder now has a real wall every 6th stage and a cost curve in between, instead of one
 // flat comparison that a level-20 Fellow passed.
 //
 // REMOVED INVENTED FAUCETS. The old clear paid `gold: 100n` (a stage was a gold SOURCE; in the
 // original it is only ever a sink), `crystals: 10/30` (the stage rows award no diamonds at all --
 // item id '4' appears in no row of the ladder), and a Skill Pearl every stage / scroll every 3rd /
 // limit-break token every 5th. At 30 stages those were small; carried onto 18,000 they would have
 // been 1.8M gold, 195k crystals, 18,000 pearls, 6,000 scrolls and 3,600 tokens. They are gone.
 // Pearls, scrolls and tokens remain buyable (MATERIALS) and the Frontier still awards them.
 // The stage's Player EXP (`item5`, a constant 8 on every stage of all 3,000 chapters -- rule 6: a
 // constant column is named, not treated as a curve) is NOT granted here: Fame is the opening
 // journey's rank currency and openingBattle already pays it, so paying it twice would double it.
 if(action==='battle'||action==='patrol'){const stage=stageAt(target);if(!stage&&stagePending(target))return fail('The next chapters are still loading. Reconnect once if this persists; your progress is safe.');if(!stage||(action==='battle'?stage.id!==s.adventure.cleared+1:stage.id>s.adventure.cleared))return fail('Choose the next stage or a cleared patrol.');
  // The charge is checked BEFORE the Power comparison so a refused patrol never writes lastBattle either.
  if(action==='patrol'&&patrolCharges(s)<1)return fail('No patrol supplies left. One returns every 8 hours, up to five.');
  const power=ladderPower(s);
  // A boss is refused on Power and nothing is spent; a normal stage is refused on gold. Both write
  // lastBattle so the panel can show what was short, exactly as the old defeat branch did.
  const cost=stageCost(stage,power);
  if(cost===null)return fail('Train a Fellow first.');
  const won=stageReady(stage,power,s.gold),lastBattle={stage:stage.id,power,won,kind:action};
  if(stage.boss&&!openingBossReady(stage,power))return {state:{...s,adventure:{...s.adventure,lastBattle}},error:`This boss needs Power strictly above ${stage.atk.toLocaleString()}. No gold was spent.`};
  if(s.gold<cost)return {state:{...s,adventure:{...s.adventure,lastBattle}},error:`This stage costs ${cost.toLocaleString()} gold at your Power. Collect village gold, or raise Power to lower the price.`};
  // Patrol repeats a CLEARED stage for its own EXP, metered by the original's repeatable-expedition
  // clock (adventureSupplyrecovery 28800s, ceiling 5 -- both from System.json). Its deposit is the
  // stage's own price and is returned on victory, as before; what changed is that the deposit and the
  // EXP are the stage's table values instead of the invented 25n and 40n.
  const xp=stage.xp;
  // Clearing a stage releases Fairy Bottles, as in the original (Item_Token_Gacha_Universal source:
  // "Stages [Clear Stages], Daily Task"): the boss row's own count, one per boss. The daily habit
  // refill carries the recurring half. total counts fairies released by wishing and is left alone.
  const base=s.fountain||FRESH_FOUNTAIN,bottles=action==='battle'?stageBottles(stage):0;
  const fountain=bottles?{...base,bottles:Math.min(1e6,base.bottles+bottles)}:null;
  return {state:{...s,gold:Math.min(MAX_GOLD,s.gold-cost+(action==='battle'?0:cost)),fellowXP:bounded(s.fellowXP+xp),...(fountain?{fountain}:{}),adventure:{...s.adventure,cleared:action==='battle'?stage.id:s.adventure.cleared,patrols:bounded(s.adventure.patrols+(action==='patrol'?1:0)),...(action==='patrol'?{patrolAt:spendPatrol(s,s.lastAt)}:{}),lastBattle}},message:action==='battle'?`Stage ${stage.chapter}-${stage.section} cleared for ${cost.toLocaleString()} gold! +${xp.toLocaleString()} EXP${bottles?` and ${bottles} Fairy Bottle${bottles===1?'':'s'}`:''}.`:`Patrol complete: +${xp.toLocaleString()} EXP. Entry gold returned. ${patrolCharges({...s,adventure:{...s.adventure,patrolAt:spendPatrol(s,s.lastAt)}})} patrol supplies left.`}}
 return null;
}
