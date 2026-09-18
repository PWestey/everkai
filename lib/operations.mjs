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
export function fellowOperation(s,fellow,business){
 const row=rowFor(s,fellow),owned=s.fellows[fellow];
 if(!row||!owned)return {known:false,percent:0,next:[]};
 const matching=row.effects.filter(e=>(!e.type||e.type===business.type)&&(!e.building||e.building===business.id));
 return {known:true,percent:matching.filter(e=>owned.level>=e.minLevel).reduce((sum,e)=>sum+e.percent,0),next:matching.filter(e=>owned.level<e.minLevel),unresolved:row.unresolved};
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
