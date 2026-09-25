import data from './talent-skill-data.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
/** WHO A `targetCondition` REACHES, the original's way (docs/power-sources-import-spec.md 2.1).
 *
 *  The original scopes an account-wide skill to ONE target: `country:<n>` (Country.json -- Everkai calls these
 *  the Fellow TYPES), `rare:<n>` (Hero.json's NUMERIC rarity, 1..9) or `all`. Everkai's catalogue carries
 *  rarity as display labels ("SSR+ -> UR -> LR"), which no numeric `rare` scope can match, so the numbers
 *  are read from the hero's own Hero.json row (lib/talent-skill-data.json). The country<->type map is the
 *  measured one: hero 264 is country 4 and Informed, 114 is country 5 and Unfettered, and the four Stella
 *  country halos already pinned 1 Inspiring, 2 Diligent, 4 Informed (lib/hero-spirit.mjs); 3 is Brave.
 *  A crossover Fellow has no Hero.json row: it takes its TYPE's country and no rarity, so it is reached by
 *  `all` and `country` scopes and never by a `rare` one. */
import {bondsOf} from './hero-bond.mjs';
export const TYPE_COUNTRY=Object.freeze({Inspiring:'1',Diligent:'2',Brave:'3',Informed:'4',Unfettered:'5'});
export function heroScope(id){const h=typeof id==='string'&&id.startsWith('hero_')?data.heroes[id.slice(5)]:null;
 if(h)return {country:h.country,rarity:h.rarity};return {country:TYPE_COUNTRY[fellowById(id)?.type]??null,rarity:null};}
/** Does a [kind, id] scope reach this Fellow? */
export function reaches(scope,id){const [kind,sid]=scope;if(kind==='all')return true;const h=heroScope(id);
 if(kind==='country')return h.country!=null&&h.country===String(sid);
 if(kind==='rare')return h.rarity!=null&&h.rarity===Number(sid);
 // `bond` is the original's fourth scope, and it could not be expressed until HeroBond was imported
 // on 2026-09-25 -- there was no group membership anywhere in the game (catalogue F8/F6).
 if(kind==='bond')return bondsOf(id).includes(String(sid));
 return false;}
