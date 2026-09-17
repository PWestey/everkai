import {applyStaticArt as staticArt} from './humanized-static.mjs';
import availability from './roster-availability.mjs';
import original from './original-content.mjs';
import {originalProfile} from './original-catalog.mjs';
import {referenceProfile} from './public-reference.mjs';
import overrides from './content-overrides.json' with {type:'json'};
import {ADDITION_FELLOWS,additionById,crossoverEnabled} from './everkai-additions.mjs';
/** Was the crossover denylist; the owner restored those characters 2026-09-15, so nothing is removed now.
 *  Kept as an empty set because the save repairs (lib/release-removed.mjs) still read it, and a future
 *  removal only has to fill content-overrides.json's `restored` list again. */
export const REMOVED=new Set();
const additions=(kind,existing)=>availability.filter(r=>r.status==='verified-base'&&r.id.startsWith(kind+'_')&&!existing.includes(r.id)&&!REMOVED.has(r.id)).map(r=>({id:r.id,art:r.art,portrait:r.art,specialty:null}));
// Stable source IDs remain separate from skins, ownership, and progression.
/** The original Fellows, from the APK extraction. Tests pin this list; Everkai additions never enter it. */
export const ORIGINAL_FELLOWS=[{id:'hero_15',art:'kaity-idle.webp',portrait:'kaity-still.webp',specialty:'fish'},{id:'hero_1',art:'fifi.webp',portrait:'fifi.webp',specialty:'inn'},{id:'hero_105',art:'augustine.webp',portrait:'augustine.webp',specialty:'garden'},...additions('hero',['hero_15','hero_1','hero_105'])].map(f=>({...f,...originalProfile(f.id),...referenceProfile(f.id)})).map(staticArt);
/** The playable Fellow list. Everkai additions (lib/everkai-additions.mjs) are appended only behind ?crossover=1. */
export const fellowCatalogue=(withAdditions=false)=>withAdditions?[...ORIGINAL_FELLOWS,...ADDITION_FELLOWS]:ORIGINAL_FELLOWS;
export const FELLOWS=fellowCatalogue(crossoverEnabled());
export const BUILDINGS=[{id:'fish',name:'Fish Stall',price:0,description:'Fresh catches for the village.'},{id:'inn',name:'Village Inn',price:400,description:'A warm welcome for passing travelers.'},{id:'garden',name:'Flower Shop',price:1000,description:'A little color for every home.'}];
/** Resolves additions even with the flag off, so a save that recruited one keeps loading (owned, unlisted). */
export const fellowById=id=>ORIGINAL_FELLOWS.find(f=>f.id===id)||additionById(id)||undefined;
export const FAMILY=[{id:'wife_2',art:'charlotte.webp'},{id:'wife_3',art:'epona.webp'},...additions('wife',['wife_2','wife_3'])].map(f=>({...f,...originalProfile(f.id),...referenceProfile(f.id)})).map(staticArt);
// Names and gift effects verified in the local English translation table.
const giftPrices={gift1:100,gift2:200,gift3:100,gift4:200,gift5:500}; // Local prices; effects are imported.
export const GIFTS=original.gifts.map(g=>({...g,price:giftPrices[g.id]}));
