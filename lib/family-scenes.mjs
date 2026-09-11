import {costumeArt} from './wardrobe.mjs';
import {selectedStaticArt} from './humanized-static.mjs';
/** Every Family portrait is a composed render with its setting baked in: the equipped costume
 * render, or the base render. Anything else (for example a stale art path) has no scene. */
export function familyScene(person,context='profile'){if(!['profile','date'].includes(context)||!person?.id?.startsWith('wife_'))return null;const outfit=costumeArt(person.costumeId);if(outfit&&person.art===outfit.art)return {model:outfit.model,mode:'composed',background:null,dimensions:null,alphaBounds:null};const selected=selectedStaticArt(person.id);if(selected&&person.art===selected.art)return {model:selected.model,mode:'composed',background:null,dimensions:null,alphaBounds:null};return null;}
