import {applyStaticArt as staticArt} from './humanized-static.mjs';
import availability from './roster-availability.mjs';
import original from './original-content.mjs';
import {originalProfile} from './original-catalog.mjs';
import {referenceProfile} from './public-reference.mjs';
import overrides from './content-overrides.json' with {type:'json'};
import {ADDITION_FELLOWS,ADDITION_FAMILY,additionFellowById,additionFamilyById,crossoverEnabled} from './everkai-additions.mjs';
/** The characters Everkai no longer ships. Filled 2026-09-17 with the owner's roster trim: 48 Fellows,
 *  no Family (content-overrides.json `removed`, and the note there for why). This set is load-bearing in
 *  two directions. It takes them OUT of the catalogue here, and it is the whitelist four save ledgers
 *  check so a row naming one of them is still accepted -- trading post runs, Mine Clearance history, APK
 *  progression receipts and Stella history. Whatever leaves the catalogue must land here, or every such
 *  row is refused and the village stops loading (tests/release-removed.mjs pins that contract). */
export const REMOVED=new Set(overrides.removed.map(r=>r.id));
/** The 173 costumes the same trim removed. Wardrobe rows and art are gone, so this list is the only
 *  record of them -- and it has to be a LIST, not "any id the wardrobe cannot resolve": a save naming
 *  one of these is repaired (lib/release-removed.mjs) while a save naming a costume that never existed
 *  is still refused, which is the guard tests/wardrobe.test.mjs negative-controls. */
export const REMOVED_COSTUMES=new Set(overrides.removedCostumes);
const additions=(kind,existing)=>availability.filter(r=>r.status==='verified-base'&&r.id.startsWith(kind+'_')&&!existing.includes(r.id)&&!REMOVED.has(r.id)).map(r=>({id:r.id,art:r.art,portrait:r.art,specialty:null}));
// Stable source IDs remain separate from skins, ownership, and progression.
/** The original Fellows, from the APK extraction. Tests pin this list; Everkai additions never enter it.
 *  hero_105 (Augustine) used to be the third hard-coded seed, carrying specialty:'garden'. The owner
 *  deleted her in the 2026-09-17 trim, and a hard-coded seed is NOT filtered by REMOVED -- only
 *  `additions()` is -- so she had to leave the literal too. `specialty` is written here and read
 *  nowhere (grepped: no consumer), so the Flower Shop lost no rule with her; BUILDINGS still lists it
 *  and lib/businesses.mjs decides who may operate what. */
export const ORIGINAL_FELLOWS=[{id:'hero_15',art:'kaity-idle.webp',portrait:'kaity-still.webp',specialty:'fish'},{id:'hero_1',art:'fifi.webp',portrait:'fifi.webp',specialty:'inn'},...additions('hero',['hero_15','hero_1'])].map(f=>({...f,...originalProfile(f.id),...referenceProfile(f.id)})).map(staticArt);
/** The playable Fellow list. Everkai additions (lib/everkai-additions.mjs) are appended only behind ?crossover=1. */
export const fellowCatalogue=(withAdditions=false)=>withAdditions?[...ORIGINAL_FELLOWS,...ADDITION_FELLOWS]:ORIGINAL_FELLOWS;
export const FELLOWS=fellowCatalogue(crossoverEnabled());
export const BUILDINGS=[{id:'fish',name:'Fish Stall',price:0,description:'Fresh catches for the village.'},{id:'inn',name:'Village Inn',price:400,description:'A warm welcome for passing travelers.'},{id:'garden',name:'Flower Shop',price:1000,description:'A little color for every home.'}];
/** Resolves additions even with the flag off, so a save that recruited one keeps loading (owned, unlisted). */
export const fellowById=id=>ORIGINAL_FELLOWS.find(f=>f.id===id)||additionFellowById(id)||undefined;
/** The original Family, from the APK extraction. Tests pin this list; Everkai additions never enter it.
 *  `originalProfile` THROWS for a non-APK id (lib/original-catalog.mjs:14), which is why additions are
 *  appended after this map rather than folded into its input. */
export const ORIGINAL_FAMILY=[{id:'wife_2',art:'charlotte.webp'},{id:'wife_3',art:'epona.webp'},...additions('wife',['wife_2','wife_3'])].map(f=>({...f,...originalProfile(f.id),...referenceProfile(f.id)})).map(staticArt);
/** The playable Family list. Additions only ever APPEND, which is what keeps every index, every count
 *  and rosterOrder's catalogue tie-break identical with the flag off. */
export const familyCatalogue=(withAdditions=false)=>withAdditions?[...ORIGINAL_FAMILY,...ADDITION_FAMILY]:ORIGINAL_FAMILY;
export const FAMILY=familyCatalogue(crossoverEnabled());
/** The Family twin of fellowById, and for the same reason: a save that welcomed a crossover Family
 *  member must still load with the flag off. validVillage used `FAMILY.some(...)` here while Fellows
 *  went through fellowById, so such a save was REFUSED outright -- and `family` is deliberately not
 *  quarantinable, so the whole village was lost (docs/crossover-family-plan.md 5.1). */
export const familyById=id=>ORIGINAL_FAMILY.find(f=>f.id===id)||additionFamilyById(id)||undefined;
// Names and gift effects verified in the local English translation table.
const giftPrices={gift1:100,gift2:200,gift3:100,gift4:200,gift5:500}; // Local prices; effects are imported.
export const GIFTS=original.gifts.map(g=>({...g,price:giftPrices[g.id]}));
