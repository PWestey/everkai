import data from './operation-data.json' with {type:'json'};
import {hasCrossoverAbilities,crossoverOperationRow} from './crossover-abilities.mjs';
import {sourceQuality} from './original-progression.mjs';
import {stellaAppointBp} from './stella.mjs';
// lib/operation-data.json holds 175 rows, every one keyed by an ORIGINAL `hero_*` id. An Everkai addition
// (lib/everkai-additions.mjs) has no row of its own, so keying this map on the raw id gave a crossover
// Fellow {known:false, percent:0}: it occupied an operator slot and contributed nothing, where a median
// original contributes +150%. Assigning one was measurably worse than leaving the slot empty.
//
// Every other per-id original table already borrows its row from the addition's `template` through
// sourceId() -- talents.mjs:14, insight.mjs:9, original-progression.mjs:10/26/33. This was the one that
// was missed. sourceId() is the identity for every original id, so nothing here changes for them.
const byFellow=new Map(data.records.map(r=>[r.fellow,r]));
/** A crossover Fellow's row is BUILT from its rarity ladder at the badge it has climbed to, instead of
 * borrowed from its template. Measured: borrowing gave a rarity-N crossover Fellow the SSR anchor's
 * +150% at level 200 where an N original earns +80% -- the dominance this removes. The ladder climbs
 * 80% -> 250% over the fourteen quality tiers, each rung the weakest original of the same badge.
 * Nothing stored is derived from it: business income is recomputed from live rates every settle. */
const rowFor=(s,fellow)=>hasCrossoverAbilities(fellow)?crossoverOperationRow(fellow,sourceQuality(s,fellow)):byFellow.get(fellow);

/** THE OPERATION LEVEL (2026-09-22; catalogue row C2; docs/character-systems-gap.md 2.2).
 *
 *  WHAT WAS WRONG. The original's own rule is `skillProp_Initial + (level-1) x skillProp_Level`, and
 *  until now only the first term was imported -- lib/operation-data.json said so in its own `limits`
 *  string. 144 of the 494 imported effects carry `skillProp_Level` 500 bp over `maxUpgradeLevel` 300,
 *  so a Faculty V row worth +150% at level 1 is worth 15,000 + 299x500 = 164,500 bp = +1,645% at 300.
 *  Per-Fellow record totals in this file are min 50, median 150, max 250 points; the same Fellow at
 *  level 300 reaches up to 1,645 + 200 + 300 = 2,145. That is the x8.6-x11 the doc measures.
 *
 *  ONE LEVEL PER FELLOW. MainCityManager:CalBuildingHeroAdd reads a single
 *  `GetSkillData("Hero_Appoint_Base_1")` off the assigned hero, and every Country Faculty tier carries
 *  that same `skillType`, so the level belongs to the Fellow and every levelable appoint row it owns
 *  reads it. The panel shows one skill at a time, so the screenshots cannot separate this from a
 *  level-per-skill reading (doc section 6 question 4); the client line is the only evidence either way
 *  and it says shared. A level-per-skill reading would multiply a three-skill Fellow's record again.
 *
 *  LEVEL 1 IS EXACTLY TODAY. `(level-1) x perLevel` is zero at level 1 and every save starts there, so
 *  no existing number moves until a player spends. That is what makes this safe to land at all.
 *
 *  THE CURRENCY IS THE ORIGINAL'S, THE FAUCET IS LOCAL. The price is the original's own column,
 *  `SkillLevel[Hero_Appoint_Base_1]`, 25,589 Study Notes (`Item_HeroManagerment_Building`) for one
 *  Fellow 1 -> 300, reproduced twice against the reference screenshot in scripts/import-operations.py.
 *  The item's `Item:source` string names the **Trading Post Shop** and Everkai has a Trading Post, so
 *  that is where the notes come from -- but the shop's own stock table is NOT in the 1,499-table
 *  config dump (positive control: the same sweep finds ResourceShop, guildShop, highwayShop and
 *  RandomShop rows, and none of them prices this item; Gve2Transaction spends it rather than selling
 *  it). So the RATE is Everkai's, and it is declared here exactly the way lib/trading-post.mjs
 *  declares VOUCHER_PER_WIN for the same reason: a won negotiation duel pays NOTES_PER_WIN, the rate
 *  is written onto each receipt, and a receipt from before this change is read at the constant. That
 *  only ever ADDS notes to an existing save; it can never refuse one.
 *
 *  SAVES (rule 12). The stored state is one optional subtree, `s.operationSkills = {policyVersion:1,
 *  levels:{hero_x: level}}`, and it is QUARANTINABLE. The BALANCE is not stored: it is
 *  `notesEarned(s) - notesSpent(s)`, both derived, exactly as lib/trading-post.mjs derives Goodwill
 *  Vouchers from the same history against `taxSpent`. `validOperations` re-checks that identity, which
 *  is the documented rule-12 exposure: re-pricing the ladder or the per-win rate would refuse a legal
 *  save, so both are pinned by tests/operations.test.mjs.
 *
 *  WHAT IS DERIVED FROM THE OLD ANSWER, checked before shipping: `s.enterprises[*].staffingYield`
 *  stores a cohort split (`retainedEmployees`, `retainedRate`) and `validBusinesses` pins the rate
 *  against BUSINESSES, not against income; nothing in the save stores a figure computed from
 *  `assignedOperation`. Business income is recomputed from live rates on every settle. */
export const OPERATION_LADDER=data.ladder;
export const OPERATION_CAP=data.skill.cap;
export const OPERATION_SKILL=data.skill.shared;
export const STUDY_NOTE_ITEM=data.skill.item;
/** LOCAL, and the only invented number in this system: Study Notes a won negotiation duel pays. Chosen
 *  to equal the Trade Coins the same win already pays (`coinPerWin` 30), because that is the faucet the
 *  original's own source string names and it needs no second one. At a full roster's four daily duels
 *  each this is ~6,800 notes a day, i.e. ~3.7 days to take one Fellow 1 -> 300. */
export const NOTES_PER_WIN=30;
/** Cumulative Study Notes to stand at each level: CUMULATIVE[1] = 0, CUMULATIVE[300] = 25,589. */
const CUMULATIVE=[0,0];for(const step of OPERATION_LADDER)CUMULATIVE.push(CUMULATIVE.at(-1)+step);
export const operationCost=level=>CUMULATIVE[level]??null;
export const operationState=s=>s?.operationSkills||{policyVersion:1,levels:{}};
/** A Fellow's shared appoint-skill level. Never below 1: the original's skills exist at level 1 unbought. */
export const operationLevel=(s,fellow)=>{const n=operationState(s).levels?.[fellow];return Number.isInteger(n)&&n>=1&&n<=OPERATION_CAP?n:1;};
/** Notes every stored level has spent. The `levels` map is read directly so the validator can price a
 *  candidate map without minting a state. */
export function notesSpent(levels){let n=0;for(const value of Object.values(levels||{}))n+=CUMULATIVE[value]||0;return n;}
/** Notes the Trading Post has paid. Read off the raw receipts rather than through lib/trading-post.mjs,
 *  which imports lib/adventure.mjs and would make this module part of that cycle. */
export function notesEarned(s){let n=0;for(const r of s?.tradingPost?.history||[])n+=(r.wins||0)*(r.notePerWin===undefined?NOTES_PER_WIN:r.notePerWin);return n;}
export const studyNotes=s=>notesEarned(s)-notesSpent(operationState(s).levels);
/** What one effect is worth at a Fellow's operation level. The fixed `Extra` rows carry no `perLevel`
 *  and are unchanged; a growing row is capped at its own `max`, which is 300 on every one of them. */
const effectPercent=(e,level)=>e.percent+(e.perLevel?e.perLevel*(Math.min(level,e.max)-1):0);
export function fellowOperation(s,fellow,business){
 const row=rowFor(s,fellow),owned=s.fellows[fellow];
 if(!row||!owned)return {known:false,percent:0,next:[],level:1};
 const level=operationLevel(s,fellow);
 const matching=row.effects.filter(e=>(!e.type||e.type===business.type)&&(!e.building||e.building===business.id));
 return {known:true,level,percent:matching.filter(e=>owned.level>=e.minLevel).reduce((sum,e)=>sum+effectPercent(e,level),0),next:matching.filter(e=>owned.level<e.minLevel),unresolved:row.unresolved};
}
/** Every levelable effect this Fellow owns, for the panel: what it pays now and what one more level adds. */
export function operationSkills(s,fellow){
 const row=rowFor(s,fellow);if(!row)return [];
 const level=operationLevel(s,fellow);
 return row.effects.map(e=>({...e,level:e.perLevel?level:1,value:effectPercent(e,level),step:e.perLevel||0,
                             capped:!!e.perLevel&&level>=e.max}));
}
/** @param {number|string} [amount] */
export function operationPlan(s,fellow,amount=1){
 const level=operationLevel(s,fellow),none={count:0,cost:0,level,item:STUDY_NOTE_ITEM};
 if(!s?.fellows?.[fellow]||!rowFor(s,fellow)||![1,10,100,'max'].includes(amount))return none;
 if(!operationSkills(s,fellow).some(e=>e.step))return none;
 const have=studyNotes(s),want=amount==='max'?OPERATION_CAP:amount;
 let count=0,cost=0;
 while(count<want&&level+count<OPERATION_CAP&&cost+OPERATION_LADDER[level+count-1]<=have){cost+=OPERATION_LADDER[level+count-1];count++;}
 return {count,cost,level:level+count,item:STUDY_NOTE_ITEM};
}
export function validOperations(s){
 const t=s?.operationSkills;
 if(t===undefined)return true;
 if(!t||typeof t!=='object'||Array.isArray(t)||t.policyVersion!==1||Object.keys(t).length!==2)return false;
 const levels=t.levels;
 if(!levels||typeof levels!=='object'||Array.isArray(levels))return false;
 // Roster membership is deliberately NOT required. A Fellow can leave a save (a roster trim, a reset),
 // and refusing the subtree for that would quarantine every other Fellow's levels with it. The real
 // bound is the spend identity below, which no unowned entry can cheat.
 for(const [id,level] of Object.entries(levels)){
  if(!byFellow.has(id)&&!hasCrossoverAbilities(id))return false;
  if(!Number.isInteger(level)||level<1||level>OPERATION_CAP)return false;
 }
 return notesSpent(levels)<=notesEarned(s);
}
export function operationAction(s,action,target,value){
 if(action!=='operationTrain')return null;
 const fail=error=>({state:s,error});
 if(!s.fellows?.[target])return fail('Recruit this Fellow first.');
 if(!rowFor(s,target))return fail('This Fellow has no Operation skill in the original.');
 const amount=value===undefined||value===null?1:value;
 if(![1,10,100,'max'].includes(amount))return fail('Choose an Operation training amount.');
 if(!operationSkills(s,target).some(e=>e.step))return fail('This Fellow’s Operation skills are the fixed kind and do not level.');
 const level=operationLevel(s,target);
 if(level>=OPERATION_CAP)return fail(`Operation skill is at the original’s cap of ${OPERATION_CAP}.`);
 const plan=operationPlan(s,target,amount);
 if(!plan.count)return fail(`Win negotiations at the Trading Post for Study Notes · ${OPERATION_LADDER[level-1].toLocaleString()} needed, ${studyNotes(s).toLocaleString()} held.`);
 const t=operationState(s);
 return {state:{...s,operationSkills:{policyVersion:1,levels:{...t.levels,[target]:plan.level}}},
         message:`Operation Lv. ${plan.level} · ${plan.cost.toLocaleString()} Study Notes.`};
}
/** THE APPOINTMENT-YIELD HALO (imported 2026-09-18). 57 of the original's 126 Spirit tracks grant
 *  `all | appoint percent` -- +4% to +800% each, and `all` means every Fellow receives it from every
 *  owner who has levelled it, so they sum: 2,721,600 hundredths, i.e. +27,216%, if all 57 were maxed.
 *
 *  WHY THIS IS THE RIGHT AXIS, and it is not an analogy. The halos carry `skillType:
 *  Hero_Appoint_Base_1` (SkillBase.json), which is exactly the skill the original's own
 *  `dispatchconversion` reads -- "the assigned hero's Hero_Appoint_Base_1 skill level only"
 *  (private-server/readable/MainCityManager.lua:421-436, transcribed in docs/isekai-power-graph.md 17).
 *  `assignedOperation` is Everkai's dispatchconversion. So this multiplies the appointment term and
 *  nothing else: it is NOT a Power term, and `bondedPower` is deliberately untouched by it.
 *
 *  IT COMPOUNDS WITH POWER, which is the one thing a reader must not miss (docs/isekai-power-graph.md
 *  ranked gap 7). lib/businesses.mjs computes
 *      income = (employeeIncome + rosterOperation) x (1 + quality + family + farm + assignedOperation)
 *  and the same Stella ledger raises BOTH halves -- `flat`/`selfPowerBp` lift rosterOperation, this
 *  column lifts assignedOperation. Quoting either one alone understates the pair by the other's factor.
 *  The ceiling fixtures therefore report the multiplier separately instead of folding it in.
 *
 *  NOTHING STORED IS DERIVED FROM IT (CLAUDE.md rule 12): business income is recomputed from live rates
 *  on every settle, and the appointment percent is read from the Stella ledger in the same save, never
 *  written back. A save that gains this term gains income from the next settle onward and revalues
 *  nothing it had already banked. */
export function assignedOperation(s,business){
 const appoint=1+stellaAppointBp(s)/10000;
 return (s.enterprises?.[business.id]?.fellows||[]).reduce((sum,f)=>sum+(fellowOperation(s,f,business).percent+5*(s.opening?.operations[f]||0))*appoint,0)/100;
}
