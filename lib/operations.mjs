import data from './operation-data.json' with {type:'json'};
import {sourceId} from './everkai-additions.mjs';
// lib/operation-data.json holds 175 rows, every one keyed by an ORIGINAL `hero_*` id. An Everkai addition
// (lib/everkai-additions.mjs) has no row of its own, so keying this map on the raw id gave a crossover
// Fellow {known:false, percent:0}: it occupied an operator slot and contributed nothing, where a median
// original contributes +150%. Assigning one was measurably worse than leaving the slot empty.
//
// Every other per-id original table already borrows its row from the addition's `template` through
// sourceId() -- talents.mjs:14, insight.mjs:9, original-progression.mjs:10/26/33. This was the one that
// was missed. sourceId() is the identity for every original id, so nothing here changes for them.
const byFellow=new Map(data.records.map(r=>[r.fellow,r]));
export function fellowOperation(s,fellow,business){
 const row=byFellow.get(sourceId(fellow)),owned=s.fellows[fellow];
 if(!row||!owned)return {known:false,percent:0,next:[]};
 const matching=row.effects.filter(e=>(!e.type||e.type===business.type)&&(!e.building||e.building===business.id));
 return {known:true,percent:matching.filter(e=>owned.level>=e.minLevel).reduce((sum,e)=>sum+e.percent,0),next:matching.filter(e=>owned.level<e.minLevel),unresolved:row.unresolved};
}
export function assignedOperation(s,business){
 return (s.enterprises?.[business.id]?.fellows||[]).reduce((sum,f)=>sum+fellowOperation(s,f,business).percent+5*(s.opening?.operations[f]||0),0)/100;
}
