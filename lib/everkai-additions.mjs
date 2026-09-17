import data from './everkai-additions-data.json' with {type:'json'};
/** Everkai additions: Fellows that are NOT from the original APK (lib/everkai-additions-data.json).
 *
 *  Visibility. They join FELLOWS -- and so the roster, the Recruit counter and the character screen --
 *  only when the page is opened with ?crossover=1. Node (tests, sims, imports) has no `location`, so
 *  the catalogue there is exactly the original one.
 *
 *  Saves. fellowById resolves them whether or not the flag is on, so a village that recruited one with
 *  the flag on still loads without it: the Fellow stays owned, keeps its progress and receipts, and is
 *  simply not listed. No save field is added, so SAVE_VERSION does not move.
 *
 *  Progression. Every per-id table (talent rule, Insight eligibility, skill guide, original growth,
 *  default talent source) is keyed by original ids. An addition borrows those rows from its `template`,
 *  an original Fellow of the same rarity and type (scripts/crossover/pick-template.mjs), through
 *  sourceId(). Character-specific systems with no generic row -- Stella constellations and costumes --
 *  return nothing for an addition and their panels already treat that as "not available".
 *
 *  This module imports only its data, so every lib module can use it without an import cycle. */
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
freeze(data);
export const ADDITIONS_FLAG=data.flag;
export function crossoverEnabled(search=typeof location==='undefined'?'':location.search){
 return new URLSearchParams(search).get(ADDITIONS_FLAG)==='1';
}
const rows=data.fellows.filter(r=>r.art&&r.template);
/** Catalogue records, shaped like FELLOWS entries plus `addition:true` and their provenance. */
export const ADDITION_FELLOWS=Object.freeze(rows.map(r=>Object.freeze({id:r.id,art:r.art,portrait:r.art,specialty:null,name:r.name,title:r.title,occupation:r.occupation,race:r.race,description:r.description,rarity:r.rarity,type:r.type,addition:true,template:r.template,source:r.source})));
const byId=new Map(ADDITION_FELLOWS.map(f=>[f.id,f]));
export const additionById=id=>byId.get(id)||null;
export const isAddition=id=>byId.has(id);
/** The id to use for a per-id ORIGINAL table: the template for an addition, the id itself otherwise. */
export const sourceId=id=>byId.get(id)?.template??id;
/** The rendered idle clip, shaped like a lib/character-idle-data.json row. Base appearance only. */
export function additionClip(person){
 const r=rows.find(x=>x.id===person?.id);
 return r?.clip&&!person.costumeId?{id:r.id,owner:r.id,costumeId:null,...r.clip}:null;
}
export const ADDITION_ROWS=rows;
