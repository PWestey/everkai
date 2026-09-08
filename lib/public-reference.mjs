import data from './public-roster.json' with {type:'json'};
import {originalCharacter} from './original-catalog.mjs';
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
freeze(data);
const references=new Map(Object.entries(data.records).filter(([id])=>originalCharacter(id)));
const affinities=new Map([...references].map(([id,r])=>[id,Object.freeze([...new Set(r.blessedFellows||[])].filter(id=>originalCharacter(id)))]));
const affinitySets=new Map([...affinities].map(([id,ids])=>[id,new Set(ids)]));
const EMPTY=Object.freeze([]);
// Keep local identity and artwork authoritative. The public snapshot is newer than the APK.
export const referenceFor=id=>references.get(id)||null;
export const affinityIds=id=>affinities.get(id)||EMPTY;
export const referenceProfile=id=>{const r=referenceFor(id);return {rarity:r?.rarity||null,type:r?.type||null}};

export const hasAffinity=(family,fellow)=>affinitySets.get(family)?.has(fellow)||false;
