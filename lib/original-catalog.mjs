import original from './original-content.mjs';
import overrides from './content-overrides.json' with {type:'json'};
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
export const ORIGINAL_CHARACTERS=original.characters;
freeze(ORIGINAL_CHARACTERS);
const characterIndex=new Map(ORIGINAL_CHARACTERS.map(c=>[c.id,c]));
export const originalCharacter=id=>characterIndex.get(id);
/** Was the crossover denylist for albums and pairings; the owner restored those characters 2026-09-15,
 *  so nothing is filtered. Kept so a future removal only has to fill the list again. */
const removedIds=new Set((overrides.removed||[]).map(r=>r.id));
export const removedCharacter=id=>removedIds.has(id);
/** The extraction stays as imported; Everkai's own wording is declared in content-overrides.json and merged per field here. */
export const overriddenFields=id=>overrides.text[id]||null;
export function originalProfile(id){const c=originalCharacter(id);if(!c)throw Error('Missing original character '+id);const f={...c.fields,...overrides.text[id]};return {name:f.name,title:f.title||'',occupation:f.occupation||'',race:f.race||'',description:f.introduce||f.info||''}}
export function searchCharacters(kind,query=''){const q=query.trim().toLocaleLowerCase();return ORIGINAL_CHARACTERS.filter(c=>c.kind===kind&&!removedIds.has(c.id)&&[c.fields.name,c.fields.title,c.fields.race,c.fields.occupation].some(v=>(v||'').toLocaleLowerCase().includes(q))).sort((a,b)=>a.fields.name.localeCompare(b.fields.name)||a.id.localeCompare(b.id));}
