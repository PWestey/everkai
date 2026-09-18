import data from './operation-data.json' with {type:'json'};
import {hasCrossoverAbilities,crossoverOperationRow} from './crossover-abilities.mjs';
import {sourceQuality} from './original-progression.mjs';
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
export function assignedOperation(s,business){
 return (s.enterprises?.[business.id]?.fellows||[]).reduce((sum,f)=>sum+fellowOperation(s,f,business).percent+5*(s.opening?.operations[f]||0),0)/100;
}
