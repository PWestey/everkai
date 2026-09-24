import {MAX_GOLD} from './limits.mjs';
import {validHabits,settleHabits,habitAction,habitEarnings,starterHabits} from './habits.mjs';
import {giftBatch} from './gift-batch.mjs';
import {validWardrobe,wardrobeAction} from './wardrobe.mjs';
import {validFamilyGallery,discoverDatePicture,familyGalleryAction} from './family-gallery.mjs';
import {validOpening,openingAction,observeOpening} from './opening.mjs';
import {specialBlessingAction} from './special-blessings.mjs';
import {originalProgression,withOriginalProgression,repairOriginalProgression} from './original-progression.mjs';
import {mineAction,validMine} from './mine-clearance.mjs';
import {stellaAction,validStella,settleStella} from './stella.mjs';
import {northernAction,validNorthern} from './northern.mjs';
import {roamingAction,validRoaming} from './roaming.mjs';
import {summonAction,validSummon} from './summon.mjs';
import {tradingAction,validTradingPost} from './trading-post.mjs';
import {operationAction,validOperations} from './operations.mjs';
import {stageEventAction,validStageEvent} from './raphael-progress.mjs';
import {tonicAction,validTonics,availableDateEnergy,spendDateEnergy} from './tonics.mjs';
import {elixirAction,validElixirs} from './elixirs.mjs';
import {fountainAction,validFountain} from './fountain.mjs';
import {banquetAction,validBanquets} from './banquets.mjs';
import {validApothecary,settleApothecary,apothecaryAction,potionYield} from './apothecary.mjs';
import {treasureAction,validTreasure,treasureIncome} from './treasure.mjs';
import {validStory,storyAction} from './storybook.mjs';
import {dateReward,dateIds} from './dating.mjs';
import {validExpo,expoAction} from './expo.mjs';
import {parseSaveJSON} from './save-format.mjs';
import {fishingAction,validFishing,fishingArtifactYield} from './fishing.mjs';
import {insightAction,validInsight} from './insight.mjs';
import {validTower,towerAction,migrateTowerSave} from './familiar-tower.mjs';
import {validFamiliarExplore,exploreAction} from './familiar-explore.mjs';
import {validFamiliarHandbook,handbookAction} from './familiar-handbook.mjs';
import {validFrontier,frontierAction} from './frontier.mjs';
import {validFarm,farmAction,FARM_MAX_PLOTS} from './farm.mjs';
import {validWorkshop,settleWorkshop,workshopAction} from './workshop.mjs';
import {validInn,settleInn,settleInnStamina,innAction,repairInn} from './inn.mjs';
import {hireCardAction,validHireCards} from './hire-cards.mjs';
import {businessAction,validBusinesses,enterpriseRate,reconcileStaffingRates,BUSINESSES,canOperate} from './businesses.mjs';
import {museumAction,validMuseum} from './museum.mjs';
import {villageEventAction,validVillageEvents} from './village-events.mjs';
import {educationReward,educationAction,requiredLessons,schoolCapacity} from './education.mjs';
import {blessingAction,validBlessings} from './blessings.mjs';
import blessingSource from './original-blessing-data.json' with {type:'json'};
import specialSource from './special-blessing-data.json' with {type:'json'};
import {originalCharacter} from './original-catalog.mjs';
import {helperAction,validHelper} from './helper.mjs';
import {eventAction,validEvents} from './events.mjs';
import {achievementAction,validAchievements} from './achievements.mjs';
import {familiarAction,validFamiliars} from './familiars.mjs';
import {stageAction,validStage} from './raphael.mjs';
import {talentAction} from './talents.mjs';
import {talentSkillAction,validTalentSkills} from './talent-skills.mjs';
import {validHeroAdvance} from './hero-advance.mjs';
import {validFamilyStella} from './family-stella.mjs';
import {validQuench,quenchAction} from './quench.mjs';
import {artifactAction} from './artifacts.mjs';
import {fellowResetAction} from './fellow-reset.mjs';
import {consumableAction,validSupplyClaim} from './consumables.mjs';
import {bondFactor,validBonds,bondAction} from './bonds.mjs';
import {fathomAction,validFathoms} from './fathoms.mjs';
import {latencyAction,validLatency} from './latency.mjs';
import {familyTripAction,validFamilyTrips} from './family-trips.mjs';
import {FELLOWS,BUILDINGS,FAMILY,GIFTS,fellowById,familyById} from './catalog.mjs';
import {releaseRemoved} from './release-removed.mjs';
import {MILESTONES,energyCap,ENERGY_RECOVERY_MS,blessingCost,familyBonus,playerRank} from './progression.mjs';
import {EDUCATION_RECOVERY_MS,EDUCATION_CAP,MAX_PUPILS,LESSONS_REQUIRED,PUPIL_TYPES,METHODS,relationRequired,pupilReward,validSchool,freshSchool} from './school.mjs';
import {EXTRA_ITEMS,LEGACY_ITEMS,V7_ITEMS,V8_ITEMS,V9_ITEMS,emptyMaterials,newFellow,freshAdventure,validAdventure,adventureAction,fellowFactor,xpCost} from './adventure.mjs';
export const SAVE_VERSION=10;
export const SAVE_KEY='isekai-private-village-v1'; // Keep the installed app's storage key.
// Offline accrual stops at the original's own ceiling: System.json carries
// {"_id":"offlineMaxTime","integerValue":43200} -- twelve hours, and the private server clamps to it
// (village.py OFFLINE_LIMIT=43200). The 8h here was a prototype value, logged as a parity gap in
// docs/parity-gaps.md. Time beyond the window is discarded rather than banked, as in the original.
export const MAX_LEVEL=750, MAX_BUILDING_LEVEL=10, MAX_AWAY_MS=12*60*60*1000;
export const rate=level=>2+(level-1)*1.5;
export const cost=xpCost;
export const buildingCost=level=>Math.ceil(200*Math.pow(1.7,level-1));
const number=n=>Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
const level=(n,max)=>Number.isInteger(n)&&n>=1&&n<=max;
const common=s=>!!s&&['gold','pending','lastAt','earned','upgrades'].every(k=>number(s[k]))&&Number.isInteger(s.gold)&&Number.isInteger(s.upgrades);
// A save must not become unloadable because content left the game. The five Nichirin Swords went
// out with the demon-to-angel rewrite, and validFamily counts inventory keys exactly, so every save
// written before it stopped loading: decode refused it, settle threw "Invalid village state", and
// the player saw "Saving is unavailable" with no way back in. This rebuilds the inventory from the
// ids the game has today -- dropping ones it no longer knows, restoring ones added since, and
// keeping every count that still means something. Removed items are discarded, which is the point:
// there is nothing left for them to refer to.
const inventoryIds=()=>[...GIFTS.map(g=>g.id),...EXTRA_ITEMS.map(i=>i.id)];
export function reconcileInventory(inventory){
 const held=inventory&&typeof inventory==='object'&&!Array.isArray(inventory)?inventory:{};
 // Counts are carried through exactly as found, never coerced. Sanitising them here would launder a
 // corrupt value past valid() and turn save repair into a way to smuggle in a broken village. This
 // decides which ids exist and nothing else; absent ids start at zero.
 return Object.fromEntries(inventoryIds().map(id=>[id,Object.hasOwn(held,id)?held[id]:0]));
}
/** @returns {{version:number,gold:number,pending:number,lastAt:number,earned:number,upgrades:number,fellows:Record<string,{level:number,aptitude:number,skill:number,breaks:number,gear:string|null}>,bonds:Record<string,{fellow:string|null,level:number}>,family:Record<string,{intimacy:number,blessingPower:number,points:number,skill:number,relationship:number}>,adventure:any,crystals:number,school:any,fellowXP:number,inventory:Record<string,number>,energy:number,claims:string[],stats:{gifts:number,dates:number},buildings:Record<string,{level:number,fellow:string|null}>}} */
export function fresh(now=Date.now()){return {version:10,bonds:{},adventure:freshAdventure(),crystals:0,school:freshSchool(),fellowXP:250,inventory:{...emptyMaterials(),gift1:5,gift2:0,gift3:5,gift4:0,gift5:0},energy:3,claims:[],stats:{gifts:0,dates:0},gold:250,pending:30,lastAt:now,earned:0,upgrades:0,fellows:{hero_15:newFellow()},family:{},buildings:{fish:{level:1,fellow:'hero_15'}}}}
// Two characters the original sold only through paid VIP levels. Everkai has no recharge of any
// kind, so there is no path to them at all; a new village simply starts with them. The rest of the
// VIP-only roster needs nothing special: the Recruit counter sells every shipped, priced character,
// so they are already reachable with habit-earned currency.
// fresh() deliberately stays minimal -- it is the baseline for the test suite and for save
// validation, not what a player receives.
export const STARTER_PICKS=Object.freeze({fellows:['hero_195'],family:['wife_191']});
const starterRoster=()=>({
 fellows:Object.fromEntries(STARTER_PICKS.fellows.map(id=>[id,newFellow()])),
 family:Object.fromEntries(STARTER_PICKS.family.map(id=>[id,{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}]))});
// A new village's first Fellow is Fifi, the original's initial companion (its rank-2 encounter, B2,
// then acknowledges her without a duplicate). fresh() keeps Kaity for the test baseline; Kaity is a
// rank-14 reward in the original, so a player now earns her there.
// A NEW VILLAGE IS BORN ON THE ORIGINAL'S LEVEL CURVE (2026-09-22). The owner, on the default curve:
// "Leveling up does not give a lot of power... taking my 450 Neptune to 500 only gave a mil or less."
// Measured, both curves from each one's own column (rule 1): `defaultADH = (80+20*level)/10` runs 10 at
// level 1 to 1,508 at 750, so 450 -> 500 is +11.0%; HeroLevel.coefficientADH -- the original's own column,
// lib/original-progression-data.json -- runs 300 to 15,500, and 450 -> 500 is +19.3% on a base 7.0x larger.
// Every power import since 2026-09-18 (Stella, talent skills, stars, the account floor, the composition
// itself) is calibrated on that column, so the default curve was the only part of Power still on the old
// scale. EXP PRICES DO NOT MOVE: `trainingCost` and `xpCost` already bill the original's HeroLevel table
// in BOTH modes (lib/training-costs.mjs; the two tables agree on all 59 rows they share), so a new village
// pays exactly what it paid before and gets the original's Power for it.
// The default curve is kept for saves already playing on it -- switching is a choice on the Training Rules
// screen, because it changes what a roster is worth on the stage ladder (app/training-rules.tsx shows both
// numbers before the press). Nothing is migrated silently.
export const startingSave=(now=Date.now())=>{const base=fresh(now),r=starterRoster();
 return withOriginalProgression({...base,habits:starterHabits(now),fellows:{hero_1:newFellow(),...r.fellows},buildings:{...base.buildings,fish:{...base.buildings.fish,fellow:'hero_1'}},adventure:{...base.adventure,party:['hero_1']},family:{...base.family,...r.family}})};
function validVillage(s){
 if(!common(s)||![2,3,4,5,6,7,8,9,10].includes(s.version)||!s.fellows||typeof s.fellows!=='object'||Array.isArray(s.fellows)||!s.family||typeof s.family!=='object'||Array.isArray(s.family)||!s.buildings||typeof s.buildings!=='object'||Array.isArray(s.buildings))return false;
 // A village needs a Fellow and its Fish Stall. It used to require Kaity specifically, which only held
 // because every save began with her; new villages now begin with Fifi (see startingSave).
 if(!Object.keys(s.fellows).length||!s.buildings.fish)return false;
 if(!Object.entries(s.fellows).every(([id,f])=>fellowById(id)&&f&&level(f.level,originalProgression(s)?750:s.version>=5?MAX_LEVEL:20)))return false;
 if(s.version===2&&Object.keys(s.family).length)return false;
 // familyById, not FAMILY.some: FAMILY is flag-gated (lib/catalog.mjs), so with ?crossover=1 off a
 // welcomed crossover Family member was absent from it and this refused the save -- and `family` is
 // not in QUARANTINABLE, so the village was lost rather than degraded. Fellows have gone through
 // fellowById at the line above since the additions layer landed; this is the same widening, and it
 // still refuses an id the DATA does not know (tests/crossover-family.test.mjs).
 if(s.version>=3&&!Object.entries(s.family).every(([id,f])=>familyById(id)&&f&&['intimacy','blessingPower','points','skill'].every(k=>Number.isInteger(f[k])&&f[k]>=0)&&f.intimacy<=1e6&&f.blessingPower>=1&&f.blessingPower<=1e6&&f.points<=1e9&&f.skill<=20))return false;
 const assigned=[];
 for(const [id,b] of Object.entries(s.buildings)){if(!BUILDINGS.some(x=>x.id===id)||!b||!level(b.level,MAX_BUILDING_LEVEL)||!(b.fellow===null||(Object.hasOwn(s.fellows,b.fellow)&&typeof b.fellow==='string')))return false;if(b.fellow)assigned.push(b.fellow)}
 return new Set(assigned).size===assigned.length;
}
function validFamily(s){return validVillage(s)&&[3,4,5,6,7,8,9,10].includes(s.version)&&s.inventory&&typeof s.inventory==='object'&&!Array.isArray(s.inventory)&&Object.keys(s.inventory).length===(s.version>=5?GIFTS.length+(s.version>=10?EXTRA_ITEMS:s.version===9?V9_ITEMS:s.version===8?V8_ITEMS:s.version===7?V7_ITEMS:LEGACY_ITEMS).length:GIFTS.length)&&[...GIFTS,...(s.version>=5?(s.version>=10?EXTRA_ITEMS:s.version===9?V9_ITEMS:s.version===8?V8_ITEMS:s.version===7?V7_ITEMS:LEGACY_ITEMS):[])].every(g=>Number.isInteger(s.inventory[g.id])&&s.inventory[g.id]>=0&&s.inventory[g.id]<=1e6)&&Array.isArray(s.claims)&&new Set(s.claims).size===s.claims.length&&s.claims.every(id=>MILESTONES.some(m=>m.id===id))&&number(s.energy)&&s.energy<=energyCap(s)&&s.stats&&['dates','gifts'].every(k=>Number.isInteger(s.stats[k])&&s.stats[k]>=0&&s.stats[k]<=1e9)}
function validV4(s){return validFamily(s)&&[4,5,6,7,8,9,10].includes(s.version)&&Object.values(s.family).every(f=>Number.isInteger(f.relationship)&&f.relationship>=1&&f.relationship<=5)&&validSchool(s)}
export function valid(s){return validFamiliarHandbook(s)&&validVillageEvents(s)&&validAchievements(s)&&validEvents(s)&&validHelper(s)&&validSupplyClaim(s)&&validHabits(s)&&validWardrobe(s)&&validFamilyGallery(s)&&validOpening(s)&&validMine(s)&&validStella(s)&&validNorthern(s)&&validRoaming(s)&&validSummon(s)&&validTradingPost(s)&&validStageEvent(s)&&validTonics(s)&&validElixirs(s)&&validFountain(s)&&validBanquets(s)&&validApothecary(s)&&validTreasure(s)&&validV4(s)&&validStory(s)&&validExpo(s)&&s.version===10&&validTower(s)&&validFamiliarExplore(s)&&validFrontier(s)&&validInn(s)&&validWorkshop(s)&&validFarm(s)&&validHireCards(s)&&validBusinesses(s)&&validMuseum(s)&&validBlessings(s)&&validFamiliars(s)&&validStage(s)&&validAdventure(s)&&validTalentSkills(s)&&validOperations(s)&&validHeroAdvance(s)&&validFamilyStella(s)&&validQuench(s)&&validBonds(s)&&validFathoms(s)&&validLatency(s)&&validFamilyTrips(s)}
function upgradeSave(s){return {...s,version:10,bonds:{},adventure:freshAdventure(),crystals:0,inventory:reconcileInventory(s.inventory),fellows:Object.fromEntries(Object.entries(s.fellows).map(([id,f])=>[id,{...newFellow(f.level)}]))}}
/** Repairs that must run BEFORE the per-subtree guards below, because those guards throw rather than
 *  return: a repair placed at the end of decode() can never fire for `enterprises` (CLAUDE.md:80).
 *  Every entry here must be inert on a healthy save -- reconcileStaffingRates rewrites only the two
 *  BUG-19 ids and only when the stored rate is exactly the other building's, so a junk value still
 *  reaches valid() and is still refused. */
function repairSave(s){
 if(!s||typeof s!=='object')return s;
 s=releaseRemoved(s);
 // BUG-23 lowered the unrated Inn's stamina cap from 20 to the original's 10, so a save written under
 // the old cap is clamped here rather than refused by validInn below. Inert on a healthy save.
 s=repairInn(s);
 // Journey rewards moved from opening.locker into the bag. Older saves keep their counts: the bag gains the
 // new ids at zero (reconcileInventory never coerces a stored count), then anything held in the locker is
 // added and the locker emptied. Inert once a save has been through it.
 if(s.version===10&&s.inventory&&typeof s.inventory==='object'&&!Array.isArray(s.inventory)){
  const ids=inventoryIds();
  if(Object.keys(s.inventory).length!==ids.length||ids.some(id=>!Object.hasOwn(s.inventory,id)))s={...s,inventory:reconcileInventory(s.inventory)};
  const locker=s.opening?.locker;
  if(locker&&typeof locker==='object'&&!Array.isArray(locker)&&Object.keys(locker).length){
   const inventory={...s.inventory};let moved=false;
   for(const [id,n] of Object.entries(locker))if(Object.hasOwn(inventory,id)&&Number.isInteger(n)&&n>0&&Number.isInteger(inventory[id])&&inventory[id]+n<=1e6){inventory[id]+=n;moved=true}
   if(moved)s={...s,inventory,opening:{...s.opening,locker:Object.fromEntries(Object.entries(locker).filter(([id])=>!Object.hasOwn(inventory,id)))}};
  }
 }
 const family=reconcileRecipients(s.family);if(family!==s.family)s={...s,family};
 // FARM PLOT OVERSHOOT. For about two hours on 2026-09-16 the farm shipped with 40 plots before the
 // decompiled client corrected it to SimGame3Field's 12. A save written in that window can hold more
 // plots than the cap, and validFarm refuses it outright -- a silent lockout of my own making. Trim to
 // the cap rather than refuse: losing a plot beyond 12 is bad, losing the village is worse. Inert on
 // every save at or under the cap, which is all of them outside that window.
 if(s.farm&&typeof s.farm==='object'&&Array.isArray(s.farm.plots)&&s.farm.plots.length>FARM_MAX_PLOTS){
  s={...s,farm:{...s.farm,plots:s.farm.plots.slice(0,FARM_MAX_PLOTS)}};
 }
 // ECON-28 residue. While UR/UR*/set were priced in `insignias` -- a key summonState never created --
 // the charge computed `undefined - 2` and wrote NaN, which JSON.stringify stores as null. The pricing
 // is long since moved to valiant/archangel, but a save written in that window still carries the dead
 // key. Nothing reads it, so this is hygiene rather than a fix: drop it so the defect leaves no trace.
 if(s.summon&&typeof s.summon==='object'&&!Array.isArray(s.summon)&&Object.hasOwn(s.summon,'insignias')){
  const {insignias,...rest}=s.summon;s={...s,summon:rest};
 }
 // FAMILIAR TOWER POLICY 1/2 -> 3 (2026-09-16, owner "re-do floors"). A sandbox save -- policy 1, or policy 2
 // still carrying the `legacy` marker the 25n migration wrote -- restarts the 300 floors at 0 after its waiting
 // income is settled at the old rate; a genuine policy-2 climb only gains `base:0`. Writes policy 3, so it runs
 // once. See lib/familiar-tower.mjs migrateTowerSave. Inert on a policy-3 or absent tower.
 if(s.familiarTower&&typeof s.familiarTower==='object'&&(s.familiarTower.policyVersion===1||s.familiarTower.policyVersion===2))s=migrateTowerSave(s);
 // CRYSTALS SPENT ON A TIER THE LIMIT BREAKS ALREADY GAVE (2026-09-22, owner: "I just spent one crystal of
 // each to get him to 150 max when he's at 300 already"). Those receipts are dropped and their materials
 // returned, exactly as recorded. Inert on every save with no such receipt -- which is every save not in APK
 // growth, and every APK save whose Fellows have no limit breaks. See repairOriginalProgression.
 s=repairOriginalProgression(s);
 if(s.enterprises===undefined)return s;
 let enterprises=reconcileStaffingRates(s.enterprises);
 // Saves written before type-restricted assignment may hold an operator of the wrong type. Release
 // them (the Fellow simply returns to the roster) rather than rejecting the village.
 if(enterprises&&typeof enterprises==='object'&&!Array.isArray(enterprises)){const released=Object.fromEntries(Object.entries(enterprises).map(([id,b])=>{const d=BUSINESSES.find(x=>x.id===id);return [id,b&&Array.isArray(b.fellows)&&d&&b.fellows.some(f=>!canOperate(f,d))?{...b,fellows:b.fellows.filter(f=>canOperate(f,d))}:b]}));if(Object.entries(released).some(([id,b])=>b!==enterprises[id]))enterprises=released;}
 return enterprises===s.enterprises?s:{...s,enterprises};
}
/** A save that levelled a blessing keeps a SNAPSHOT of that blessing's recipient list, and validBlessings
 *  (lib/blessings.mjs:25) requires the snapshot to equal the shipped table exactly -- so any change to the
 *  shipped cast breaks saves written on the other side of it, in BOTH directions:
 *    - removing characters (2026-09-11) left snapshots naming ids the table no longer had;
 *    - restoring them (2026-09-15) left snapshots written in between MISSING the ids the table now has.
 *  Both are repaired by re-pinning the snapshot to the current table -- but only when every id the save
 *  holds that the table does not is a character the original's index no longer knows. A snapshot naming a
 *  real character the table never listed is tampering, stays untouched, and is still refused. */
function reconcileRecipients(family){
 if(!family||typeof family!=='object'||Array.isArray(family))return family;
 const heal=(stored,table)=>{
  if(!Array.isArray(stored)||!Array.isArray(table)||!table.length)return stored;
  if(JSON.stringify(stored)===JSON.stringify(table))return stored;
  const known=new Set(table);
  // "Removed content" means an id NOTHING in the game knows any more. fellowById is part of that
  // test because a crossover Fellow is a character the game knows perfectly well -- resolved by the
  // additions data rather than the APK index -- so a snapshot naming one is preserved and refused as
  // tampering, exactly like a real original the table never listed. Without this it was treated as
  // gone and the snapshot was silently re-pinned, erasing the recipient (D5).
  if(stored.some(x=>!known.has(x)&&(originalCharacter(x)||fellowById(x))))return stored;
  return [...table];
 };
 let changed=false;
 const next=Object.fromEntries(Object.entries(family).map(([id,f])=>{
  if(!f||typeof f!=='object')return [id,f];
  let g=f;
  if(f.apkBlessings&&typeof f.apkBlessings==='object'&&!Array.isArray(f.apkBlessings)){const b=Object.fromEntries(Object.entries(f.apkBlessings).map(([k,h])=>[k,h&&typeof h==='object'?(()=>{const r=heal(h.recipients,blessingSource.recipients[id]);return r===h.recipients?h:{...h,recipients:r}})():h]));if(Object.entries(b).some(([k,h])=>h!==f.apkBlessings[k]))g={...g,apkBlessings:b};}
  if(f.specialBlessing&&typeof f.specialBlessing==='object'){const r=heal(f.specialBlessing.recipients,specialSource.recipients[id]);if(r!==f.specialBlessing.recipients)g={...g,specialBlessing:{...f.specialBlessing,recipients:r}};}
  if(g!==f)changed=true;return [id,g];
 }));
 return changed?next:family;
}

/** The same terms valid() composes, named. `valid` is a fast boolean for the engine; this exists so a
 *  refused save can tell the player which system rejected it instead of a sentence that names nothing.
 *  Kept beside valid() and pinned by a test, because a term added to one and not the other is a silent
 *  hole in the diagnosis. */
export const VALIDATORS={validFamiliarHandbook,validVillageEvents,validAchievements,validEvents,validHelper,validSupplyClaim,validHabits,validWardrobe,validFamilyGallery,validOpening,validMine,validStella,validNorthern,validRoaming,validSummon,validTradingPost,validStageEvent,validTonics,validElixirs,validFountain,validBanquets,validApothecary,validTreasure,validV4,validStory,validExpo,validTower,validFamiliarExplore,validFrontier,validInn,validWorkshop,validFarm,validHireCards,validBusinesses,validMuseum,validBlessings,validFamiliars,validStage,validAdventure,validTalentSkills,validOperations,validHeroAdvance,validFamilyStella,validQuench,validBonds,validFathoms,validLatency,validFamilyTrips};
export function refusedBy(s){for(const [name,fn] of Object.entries(VALIDATORS)){try{if(!fn(s))return name}catch(error){return name+' (threw: '+(error&&error.message)+')'}}return ''}
/** Subtrees whose absence is legal -- derived by test, not asserted: tests/save-compatibility.test.mjs
 *  checks that deleting each one leaves every validator happy. `bonds` and the core village shape are
 *  deliberately absent from this list; they cannot be dropped. */
export const QUARANTINABLE=['fishing','farm','inn','workshop','museum','treasure','stella','northern','roaming','summon','tradingPost','expo','fountain','banquets','apothecary','frontier','hireCards','enterprises','familiars','fathoms','helper','events','achievements','villageEvents','familyTrips','mineClearance','stageEvent','tonics','elixirs','story','insight','wardrobe','familyGallery','opening','tower','blessings','familiarExplore','operationSkills','latency'];
/** What the last decode() had to quarantine, for the UI to report. Not persisted, not part of the save. */
export let lastQuarantine=[];
/** LAST RESORT, after every targeted repair has run and the save would otherwise be REFUSED ENTIRELY.
 *  A village should not be lost because one subsystem is malformed. For the validator that is refusing,
 *  find the optional subtree whose removal makes THAT validator pass -- proving the pairing rather than
 *  trusting a map -- drop it, and carry on. Whatever is dropped is reported to the player; silence here
 *  would be worse than the refusal. If nothing helps, the save is still refused, exactly as before. */
function quarantine(s){
 const dropped=[];
 for(let round=0;round<QUARANTINABLE.length&&!valid(s);round++){
  const failing=refusedBy(s);if(!failing)break;
  const fn=VALIDATORS[failing];if(!fn)break;
  const key=QUARANTINABLE.find(k=>{
   if(!Object.hasOwn(s,k))return false;
   const without={...s};delete without[k];
   try{return fn(without)}catch{return false}
  });
  if(!key)break;
  const next={...s};delete next[key];s=next;dropped.push(key);
 }
 return {state:s,dropped};
}
export function decode(raw){let s=repairSave(parseSaveJSON(raw));if(s&&!validHabits(s))throw Error("Invalid habit tracker.");if(s&&!validWardrobe(s))throw Error("Invalid wardrobe collection.");if(s&&!validFamilyGallery(s))throw Error("Invalid Family picture collection.");if(s&&!validOpening(s))throw Error("Invalid opening journey.");if(s&&!validMine(s))throw Error("Invalid Mine Clearance.");if(s&&!validStella(s))throw Error('Invalid Stella progression.');if(s&&!validNorthern(s))throw Error('Invalid Northern expedition.');if(s&&!validTradingPost(s))throw Error('Invalid Trading Post.');if(s?.operationSkills!==undefined&&!validOperations(s))throw Error('Invalid Operation skill levels.');if(s&&!validStageEvent(s))throw Error('Invalid Raphael support runs.');if(s&&!validTonics(s))throw Error('Invalid tonic reserve.');if(s&&!validElixirs(s))throw Error('Invalid elixir receipts.');if(s&&!validFountain(s))throw Error('Invalid Fountain of Wishes.');if(s&&!validFathoms(s))throw Error('Invalid Family Fathoms.');if(s?.latency!==undefined&&!validLatency(s))throw Error('Invalid Family Latency.');if(s&&!validFamilyTrips(s))throw Error('Invalid family trips.');if(s&&!validBanquets(s))throw Error('Invalid private Banquets.');if(s&&!validApothecary(s))throw Error('Invalid Apothecary counter.');if(s&&!validTreasure(s))throw Error('Invalid Treasure Hunt.');if(s&&!validStory(s))throw Error('Invalid story bookmarks.');if(s&&!validExpo(s))throw Error('Invalid Mushroom Expo.');if(s&&!validFishing(s))throw Error('Invalid Fishing collection.');if(s&&!validInsight(s))throw Error('Invalid Insight progression.');if(s?.frontier!==undefined&&!validFrontier(s))throw Error('Invalid Frontier campaign.');if(s?.roaming!==undefined&&!validRoaming(s))throw Error('Invalid Roaming.');if(s?.summon!==undefined&&!validSummon(s))throw Error('Invalid summon rewards.');if(s?.farm!==undefined&&!validFarm(s))throw Error('Invalid Magic Farm.');if(s?.workshop!==undefined&&!validWorkshop(s))throw Error('Invalid Workshop production.');if(s?.inn!==undefined&&!validInn(s))throw Error('Invalid Inn service.');if(s?.hireCards!==undefined&&!validHireCards(s))throw Error('Invalid Hire Cards.');if(s?.enterprises!==undefined&&!validBusinesses(s))throw Error('Invalid business workforce.');if(s&&!validMuseum(s))throw Error('Invalid Museum collection.');if(s?.version===1){if(!common(s)||!level(s.level,20))throw Error('This is not a compatible village save.');return {...fresh(s.lastAt),gold:s.gold,pending:s.pending,earned:s.earned,upgrades:s.upgrades,fellowXP:0,fellows:{hero_15:newFellow(s.level)}}}if(s?.version===2){if(!validVillage(s))throw Error('This is not a compatible village save.');return upgradeSave({...fresh(s.lastAt),...s,version:4,inventory:fresh().inventory,energy:3,claims:[],stats:{gifts:0,dates:0},school:freshSchool(),fellowXP:0})}if(s?.version===3){if(!validFamily(s))throw Error('This is not a compatible village save.');return upgradeSave({...s,version:4,family:Object.fromEntries(Object.entries(s.family).map(([id,f])=>[id,{...f,relationship:1}])),school:freshSchool(),fellowXP:0})}if(s?.version===4){if(!validV4(s))throw Error('This is not a compatible village save.');return upgradeSave(s)}if(s?.version===5){if(!validV4(s)||!validAdventure(s))throw Error('This is not a compatible village save.');return {...s,version:10,bonds:{},inventory:reconcileInventory(s.inventory)}}if(s?.version===6){if(!validV4(s)||!validAdventure(s)||!validBonds(s))throw Error('This is not a compatible village save.');return {...s,version:10,inventory:reconcileInventory(s.inventory)}}if(s?.version===7){if(!validV4(s)||!validAdventure(s)||!validBonds(s))throw Error('This is not a compatible village save.');return {...s,version:10,inventory:reconcileInventory(s.inventory)}}if(s?.version===8){if(!validV4(s)||!validAdventure(s)||!validBonds(s))throw Error('This is not a compatible village save.');return {...s,version:10,inventory:reconcileInventory(s.inventory)}}if(s?.version===9){if(!validV4(s)||!validBlessings(s)||!validFamiliars(s)||!validStage(s)||!validAdventure(s)||!validBonds(s))throw Error('This is not a compatible village save.');return {...s,version:10,inventory:reconcileInventory(s.inventory)}}// A current-version save whose only fault is a stale inventory is repaired rather than refused.
// It must still pass valid() afterwards, so a genuinely broken village is rejected exactly as before.
if(s&&typeof s==='object'&&s.version===SAVE_VERSION&&!valid(s)){const repaired={...s,inventory:reconcileInventory(s.inventory)};if(valid(repaired))return repaired;}
lastQuarantine=[];
if(!valid(s)){const q=quarantine(s);if(valid(q.state)){lastQuarantine=q.dropped;s=q.state;}
 else throw Error('This is not a compatible village save. Refused by: '+(refusedBy(s)||'an unknown check'));}
return s}
// Fishing artifacts A2503/A3501/A4502 are "All Building Earnings +20% (+5% a level)", the same
// target=city/conditionType=all shape as a potion, so they multiply here beside potionYield. With no
// artifact held the factor is exactly 1 and no existing village rate moves.
// Medicine.effect -> SkillBase: every unlocked potion is target=city, conditionType=all, +5% yield.
// That is "every building in every country", so it multiplies building income and nothing else.
export function buildingRate(s,id){const b=s.buildings[id];if(!b?.fellow)return 0;return rate(s.fellows[b.fellow].level)*(1+.2*(b.level-1))*(1+familyBonus(s))*fellowFactor(s.fellows[b.fellow])*bondFactor(s,b.fellow)*(1+potionYield(s))*(1+fishingArtifactYield(s))}
export const totalRate=s=>Object.keys(s.buildings).reduce((n,id)=>n+buildingRate(s,id),0)+s.school.income+enterpriseRate(s)+treasureIncome(s);
/** A fresh start that keeps the habit journal. Items, history and settings carry over; everything else resets. */
// Starting over is a new village, so it grants the starter picks exactly as a first run does.
export function newJourney(state,now=Date.now()){const base=startingSave(now);return {...base,habits:state?.habits?{...state.habits}:base.habits}}
export const earningsMultiplier=(state,now)=>habitEarnings(state.habits,now).multiplier;
export const effectiveRate=(state,now)=>totalRate(state)*earningsMultiplier(state,now);
/** Village Gold earned over [start, start+elapsed], with the habit multiplier re-evaluated at each local midnight. */
function accrue(state,start,elapsed){const base=totalRate(state);if(!(elapsed>0)||!base)return 0;if(!state.habits?.history?.length)return elapsed/1000*base;let t=start,sum=0;const end=start+elapsed;while(t<end){const d=new Date(t);d.setHours(24,0,0,0);const next=Math.min(end,d.getTime());sum+=(next-t)/1000*earningsMultiplier(state,t);t=next}return sum*base}
export function settle(state,now){if(!valid(state)||!number(now))throw Error('Invalid village state');const elapsed=Math.min(MAX_AWAY_MS,Math.max(0,now-state.lastAt));return settleStella(settleInnStamina(settleHabits(settleApothecary(settleWorkshop(settleInn({...state,school:{...state.school,points:Math.min(EDUCATION_CAP,state.school.points+elapsed/EDUCATION_RECOVERY_MS)},energy:Math.min(energyCap(state),state.energy+elapsed/ENERGY_RECOVERY_MS),pending:Math.min(MAX_GOLD,state.pending+accrue(state,state.lastAt,elapsed)),lastAt:Math.max(now,state.lastAt)},Math.max(now,state.lastAt)),Math.max(now,state.lastAt)),Math.max(now,state.lastAt)),now),state.lastAt,now),state.lastAt,now)}
export function act(state,action,now=Date.now(),target=null,value=null){const result=observeOpening(state,actCore(state,action,now,target,value),action);if(!action.startsWith('habit')&&!result.error&&result.state.habits?.undo)result.state={...result.state,habits:{...result.state.habits,undo:null}};return action==='date'?discoverDatePicture(result):result}
function actCore(state,action,now=Date.now(),target=null,value=null){
 const s=settle(state,now);const fail=error=>({state:s,error});
 const habit=habitAction(s,action,target,value,now);if(habit)return habit;
 const opening=openingAction(s,action,target,value,totalRate(s));if(opening){if(!opening.error&&!valid(opening.state))return fail("This opening action exceeds a village storage limit.");return opening;}
 const wardrobe=wardrobeAction(s,action,target,value);if(wardrobe)return wardrobe;
 const gallery=familyGalleryAction(s,action,target);if(gallery)return gallery;
 const story=storyAction(s,action,target,value);if(story)return story;
 const tower=towerAction(s,action,target);if(tower)return tower;
 const book=handbookAction(s,action,target);if(book)return book;
 const explore=exploreAction(s,action,target,value);if(explore)return explore;
 const farm=farmAction(s,action,target,value);if(farm)return farm;
 const workshop=workshopAction(s,action,target,value);if(workshop)return workshop;
 const inn=innAction(s,action,target,value);if(inn)return inn;
 const hiring=hireCardAction(s,action,target,value);if(hiring)return hiring;
 const business=businessAction(s,action,target,value);if(business)return business;
 const stella=stellaAction(s,action,target,value);if(stella)return stella;
 const mine=mineAction(s,action,target,value);if(mine)return mine;
 const north=northernAction(s,action,target,value);if(north)return north;const roam=roamingAction(s,action,target,value);if(roam)return roam;const call=summonAction(s,action,target,value);if(call)return call;
 const trading=tradingAction(s,action,target,value,totalRate(s));if(trading)return trading;
 const operation=operationAction(s,action,target,value);if(operation)return operation;
 const event=stageEventAction(s,action,target,value);if(event)return event;
 const tonic=tonicAction(s,action,target,value);if(tonic)return tonic;
 const elixir=elixirAction(s,action,target,value);if(elixir)return elixir;
 const fountain=fountainAction(s,action,target,value);if(fountain)return fountain;
 const banquet=banquetAction(s,action,target,value);if(banquet)return banquet;
 const apothecary=apothecaryAction(s,action,target,value,totalRate(s));if(apothecary)return apothecary;
 const treasure=treasureAction(s,action,target,value);if(treasure)return treasure;
 const museum=museumAction(s,action,target);if(museum)return museum;
 const village=villageEventAction(s,action,target,value,totalRate(s));if(village)return village;
 const consumable=consumableAction(s,action,target,value,totalRate(s));if(consumable)return consumable;
 // The Little Helper replays the player's own actions, so it is dispatched LAST: every module above
 // has already had its chance to claim the action name, and act() is handed in rather than imported.
 const ach=achievementAction(s,action,target);if(ach)return ach;
 const ev=eventAction(s,action,target);if(ev)return ev;
 const helper=helperAction(s,action,now,target,value,act);if(helper)return helper;
 if(action==='graduateAll'){
  const ids=s.school.pupils.filter(p=>p.progress>=requiredLessons(p)).map(p=>p.id);if(!ids.length)return fail('No pupils are ready to graduate.');
  let next=s;for(const id of ids){const result=act(next,'graduate',s.lastAt,id);if('error' in result)return fail(result.error);next=result.state;}
  return {state:next,message:`${ids.length} pupils graduated. Earnings and rewards saved.`};
 }
 const education=educationAction(s,action,target,value,playerRank(s));if(education)return education;
 const specialBlessing=specialBlessingAction(s,action,target,value);if(specialBlessing)return specialBlessing;
 const blessing=blessingAction(s,action,target,value);if(blessing)return blessing;
 const familiar=familiarAction(s,action,target,value);if(familiar)return familiar;
 const stage=stageAction(s,action,target,value);if(stage)return stage;
 const frontier=frontierAction(s,action,target,value);if(frontier)return frontier;
 const expo=expoAction(s,action,target,value);if(expo)return expo;
 const fishing=fishingAction(s,action,target,value);if(fishing)return fishing;
 const reset=fellowResetAction(s,action,target,act,valid);if(reset)return reset;
 const insight=insightAction(s,action,target,value);if(insight)return insight;
 const talent=talentAction(s,action,target,value);if(talent)return talent;
 const talentSkill=talentSkillAction(s,action,target,value);if(talentSkill)return talentSkill;
 const quench=quenchAction(s,action,target,value);if(quench)return quench;
 const artifact=artifactAction(s,action,target,value);if(artifact)return artifact;
 const bond=bondAction(s,action,target,value);if(bond)return bond;
 const fathom=fathomAction(s,action,target,value);if(fathom)return fathom;
 const latency=latencyAction(s,action,target,value);if(latency)return latency;
 const trip=familyTripAction(s,action,target,value);if(trip)return trip;
 const adventure=adventureAction(s,action==='upgrade'?'train':action,action==='upgrade'?(target||'hero_15'):target,action==='upgrade'?1:value);if(adventure)return adventure;
 // Additions are EXCLUDED from both grants. They are unlocked by playing their storyline
 // (lib/events.mjs), so a sandbox "everyone joins" would hand over all 163 crossover characters free
 // and delete the only thing that unlocks them. With the flag off `list` never held them anyway; this
 // is what makes the two grants behave identically with the flag ON.
 if(action==='recruitAll'||action==='welcomeAll'){const isFellow=action==='recruitAll',key=isFellow?'fellows':'family',list=(isFellow?FELLOWS:FAMILY).filter(f=>!f.addition),missing=list.filter(f=>!Object.hasOwn(s[key],f.id));if(!missing.length)return fail('Everyone available has already joined.');const added=Object.fromEntries(missing.map(f=>[f.id,isFellow?newFellow():{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}]));return {state:{...s,[key]:{...s[key],...added}},message:`Welcomed ${missing.length} ${isFellow?'Fellows':'family members'}. Existing progress preserved.`}}
 if(action==='relationship'){const f=s.family[target];if(!f)return fail('Welcome this family member first.');if(f.relationship>=5)return fail('Current relationship cap reached.');if(f.intimacy<relationRequired(f.relationship))return fail('Increase Intimacy with gifts first.');return {state:{...s,family:{...s.family,[target]:{...f,relationship:f.relationship+1}}},message:'Relationship improved. Future pupils will have higher Intellect.'}}
 if(action==='enroll'){if(!Object.hasOwn(s.family,target)||!PUPIL_TYPES.some(t=>t.id===value))return fail('Choose a caretaker and pupil type.');if(s.school.pupils.length>=schoolCapacity(s))return fail('Graduate a pupil to make room.');if(s.school.nextId>=1e9)return fail('Enrollment limit reached.');const p={id:s.school.nextId,caretaker:target,type:value,intellect:s.family[target].relationship*10,progress:0,education:0};return {state:{...s,school:{...s.school,nextId:s.school.nextId+1,pupils:[...s.school.pupils,p]}},message:`Pupil ${p.id} enrolled.`}}
 if(action==='educate'){const p=s.school.pupils.find(p=>p.id===target),method=METHODS.find(m=>m.id===value);if(!p||!method)return fail('Choose an enrolled pupil and lesson.');if(p.progress>=requiredLessons(p))return fail('This pupil is ready to graduate.');if(playerRank(s)<method.rank)return fail('Increase your rank to unlock this lesson.');if(s.school.points<1)return fail('Education Points are recovering.');const gain=Math.min(p.grade?1:method.progress,requiredLessons(p)-p.progress),reward=educationReward(s,p,playerRank(s));return {state:{...s,fellowXP:s.fellowXP+reward.credited,school:{...s.school,points:Math.max(0,s.school.points-1),pupils:s.school.pupils.map(x=>x.id===target?{...x,progress:x.progress+gain,education:x.education+gain*playerRank(s)}:x)}},message:`Class completed: +${gain} progress and +${reward.credited} Fellow EXP.`}}
 if(action==='graduate'){const p=s.school.pupils.find(p=>p.id===target);if(!p||p.progress<requiredLessons(p))return fail('Complete this pupil’s education first.');const income=pupilReward(s,p);return {state:{...s,inventory:{...s.inventory,gift1:Math.min(1e6,s.inventory.gift1+1)},school:{...s.school,graduates:s.school.graduates+1,income:Math.min(1e9,s.school.income+income),pupils:s.school.pupils.filter(x=>x.id!==target),alumni:[{id:p.id,caretaker:p.caretaker,income,...(p.name?{name:p.name}:{}),...(p.grade?{grade:p.grade,type:p.type}:{})},...s.school.alumni].slice(0,20)}},message:`Graduated! +${income.toFixed(2)} gold/s and 1 Gold Ring.`}}
 // A named target resolves through familyById so a crossover member is RECOGNISED rather than falling
 // through to the misleading "All current family members have arrived." -- and is then refused with the
 // reason, because her storyline is the unlock. The untargeted form still walks the listed catalogue.
 if(action==='welcome'){if(target&&familyById(target)?.addition)return fail(Object.hasOwn(s.family,target)?'This family member has already arrived.':'Play this character’s storyline to welcome them.');
  const f=target?FAMILY.find(f=>f.id===target&&!Object.hasOwn(s.family,f.id)):FAMILY.find(f=>!f.addition&&!Object.hasOwn(s.family,f.id));if(!f)return fail('All current family members have arrived.');return {state:{...s,family:{...s.family,[f.id]:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}}},message:`${f.name} joined your family!`,welcomed:f.id}}
 if(action==='giftBatch')return giftBatch(s,target,value);
 if(action==='gift'){const f=s.family[target],gift=GIFTS.find(g=>g.id===value);if(!f||!gift)return fail('Choose a family member and a gift.');if(s.inventory[gift.id]<1)return fail('You do not have this gift.');if(f[gift.stat]+gift.amount>1e6)return fail('There is no room for this gift’s full effect.');return {state:{...s,inventory:{...s.inventory,[gift.id]:s.inventory[gift.id]-1},family:{...s.family,[target]:{...f,[gift.stat]:Math.min(1e6,f[gift.stat]+gift.amount)}},stats:{...s.stats,gifts:Math.min(1e9,s.stats.gifts+1)}},message:`Gift given: +${gift.amount} ${gift.stat==='intimacy'?'Intimacy':'Blessing Power'}.`}}
 if(action==='buyGift'){const gift=GIFTS.find(g=>g.id===target);if(!gift)return fail('Unknown gift.');if(s.gold<gift.price)return fail('Collect more gold to buy this gift.');if(s.inventory[gift.id]>=1e6)return fail('Gift storage is full.');return {state:{...s,gold:s.gold-gift.price,inventory:{...s.inventory,[gift.id]:s.inventory[gift.id]+1}},message:`${gift.name} added to your bag.`}}
 if(action==='autoDate'){
  const count=availableDateEnergy(s);if(!Object.keys(s.family).length)return fail('Welcome a family member first.');if(count<1)return fail('Energy is recovering.');
  const rolls=value??Array.from({length:count},()=>Math.random());
  if(!Array.isArray(rolls)||rolls.length!==count||!rolls.every(n=>Number.isFinite(n)&&n>=0&&n<1))return fail('Invalid auto-date selections.');
  const before=Object.values(s.family).reduce((sum,f)=>sum+f.points,0);let next=s;
  for(const roll of rolls){const result=act(next,'date',s.lastAt,null,roll);if('error' in result)return fail(result.error);next=result.state;}
  const gained=Object.values(next.family).reduce((sum,f)=>sum+f.points,0)-before;
  return {state:next,message:`${count} dates completed: +${gained.toLocaleString()} Blessing Points.`};
 }
 // The pool is the SAVE, not the flag-gated catalogue. Ordered by the catalogue where it lists a
 // member and by id after that, so the roll is stable and an owned-but-unlisted crossover member is
 // dateable with the flag off -- previously she was never drawn, and if she was the player's only
 // Family member `date` reported "Welcome a family member first." on a village that had one.
 if(action==='date'){const ids=dateIds(s);
  if(!ids.length)return fail('Welcome a family member first.');if(availableDateEnergy(s)<1)return fail('Energy is recovering.');const roll=value??Math.random();if(!Number.isFinite(roll)||roll<0||roll>=1)return fail('Invalid date selection.');const id=ids[Math.floor(roll*ids.length)],f=s.family[id],points=dateReward(s,id).credited;return {state:{...spendDateEnergy(s),family:{...s.family,[id]:{...f,points:Math.min(1e9,f.points+points)}},stats:{...s.stats,dates:Math.min(1e9,s.stats.dates+1)}},message:`Time with ${familyById(id)?.name??id}: +${points} Blessing Points.`,welcomed:id}}
 if(action==='bless'){const f=s.family[target];if(!f)return fail('Welcome this family member first.');if(f.skill>=20)return fail('This skill is fully upgraded.');const price=blessingCost(f);if(f.points<price)return fail('Go on more dates to earn Blessing Points.');return {state:{...s,family:{...s.family,[target]:{...f,points:f.points-price,skill:f.skill+1}}},message:'Family skill improved: +1% earnings at the starter buildings. Family Fathoms are what raise the businesses.'}}
 if(action==='claim'){const m=MILESTONES.find(m=>m.id===target);if(!m||s.claims.includes(m.id))return fail('This reward is not available.');if(m.metric(s)<m.goal)return fail('Finish this milestone first.');const inventory={...s.inventory};for(const gift of GIFTS)inventory[gift.id]=Math.min(1e6,inventory[gift.id]+(m.reward[gift.id]||0));return {state:{...s,gold:Math.min(MAX_GOLD,s.gold+m.reward.gold),inventory,claims:[...s.claims,m.id]},message:`Milestone complete: +${m.xp} Rank EXP and rewards.`}}
 // ECON-15: `sandboxSupplies` is deleted, not gated. Both halves already had real, metered paths --
 // Energy accrues in settle() against energyCap, and gifts are bought with buyGift at 100/200/100/200/500
 // gold -- so the grant was a duplicate faucet with nothing behind it. Unknown actions throw, so any
 // stale dispatch is loud rather than silent.
 if(action==='collect'){const amount=Math.min(Math.floor(s.pending),Math.max(0,MAX_GOLD-s.gold));return {state:{...s,gold:s.gold+amount,pending:s.pending-amount,earned:Math.min(Number.MAX_SAFE_INTEGER,s.earned+amount)},amount,message:`${amount} gold collected`}}
 if(action==='recruit'){const f=target?FELLOWS.find(f=>f.id===target&&!Object.hasOwn(s.fellows,f.id)):FELLOWS.find(f=>!Object.hasOwn(s.fellows,f.id));if(!f)return fail('All current Fellows have joined your village.');return {state:{...s,fellows:{...s.fellows,[f.id]:newFellow()}},message:`${f.name} joined your village!`,recruited:f.id}}
 if(action==='unlock'){const b=BUILDINGS.find(b=>b.id===target);if(!b)return fail('Unknown building.');if(s.buildings[target])return fail('This business is already open.');if(s.gold<b.price)return fail('Collect a little more gold first.');return {state:{...s,gold:s.gold-b.price,buildings:{...s.buildings,[target]:{level:1,fellow:null}}},message:`${b.name} is open. Assign a Fellow to start earning.`}}
 if(action==='buildingUpgrade'){const b=s.buildings[target];if(!b)return fail('Open this business first.');if(b.level>=MAX_BUILDING_LEVEL)return fail('This business is fully upgraded.');const price=buildingCost(b.level);if(s.gold<price)return fail('Collect a little more gold first.');return {state:{...s,gold:s.gold-price,buildings:{...s.buildings,[target]:{...b,level:b.level+1}}},message:'Business upgraded — earnings increased.'}}
 if(action==='assign'){if(!s.buildings[target])return fail('Open this business first.');if(value!==null&&!Object.hasOwn(s.fellows,value))return fail('Recruit this Fellow first.');const buildings=Object.fromEntries(Object.entries(s.buildings).map(([id,b])=>[id,{...b,fellow:id===target?value:value&&b.fellow===value?null:b.fellow}]));const enterprises=s.enterprises?Object.fromEntries(Object.entries(s.enterprises).map(([id,b])=>[id,{...b,fellows:b.fellows.filter(f=>f!==value)}])):undefined;return {state:{...s,buildings,...(enterprises?{enterprises}:{})},message:value?`${fellowById(value).name} assigned to this business.`:'Assignment cleared.'}}
 throw Error('Unknown action');
}
