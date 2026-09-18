import {additionKind} from './everkai-additions.mjs';
import {sourceQuality} from './original-progression.mjs';
import {fellowById,familyById} from './catalog.mjs';
/** A crossover Fellow's DISPLAYED rarity, derived from the quality tier it has already climbed to
 *  (docs/crossover-progression-plan.md 3.3, docs/crossover-plan.md order of work 2).
 *
 *  Why derived rather than stored. Measured: nothing in lib/ ever writes a Fellow's `rarity` -- it is a
 *  static catalogue string -- and the 14-step quality ladder a crossover Fellow already climbs is
 *  stored as `s.originalProgression.quality[id]`, which validOriginalProgression already validates
 *  (lib/original-progression.mjs:25-26). So this adds NO save field, needs no SAVE_VERSION bump, and
 *  no validator changes: it is a pure function of state that already round-trips.
 *
 *  Why the STORED rarity stays the bare string "N". Verified, not assumed: lib/fishing-species.json
 *  carries 172 effect rows with a `rarities` list, 66 of them non-empty (R 12, SR 12, SSR/SSR+ 22,
 *  N 8, UR 12 -- the same 8 `["N"]` rows in lib/fishing-apk-data.json), and `fishingBonuses`
 *  (lib/fishing.mjs:60) matches with `e.rarities.includes(profile?.rarity)` -- an EXACT string test
 *  against the catalogue row. Exactly 8 of those gates are `["N"]`. A chained string ("N -> R -> ...")
 *  matches no gate at all, so storing a ladder string would silently drop those 8 effects, which is
 *  what already happens to the 32 original Fellows carrying chained rarities. Storing a climbing bare
 *  string would be worse: it would swap the 8 `["N"]` effects for the 12 `["UR"]` ones as the badge
 *  moved, making rarity a power term by accident. Derived-for-display keeps fishing exactly where it
 *  is at every tier, which tests/crossover-rarity.test.mjs pins in both directions.
 *
 *  The mapping is LOCAL -- a choice, not a measurement. Eight badges over fourteen tiers, two tiers per
 *  badge, which is the shape the original's own advancement has (34 heroes, 1-3 rarity steps each at
 *  40-80 Magic Levels apart; docs/crossover-progression-plan.md 1.3) rendered at Everkai's 50-level
 *  quality spacing. Every rung has art: `Icon_Rarity_LR_1` ships and `UR*` maps onto the `URPlus`
 *  sprite (lib/ui-sprites.mjs), so the badge resolves at all fourteen tiers.
 *
 *  It applies to crossover FELLOWS only. A crossover Family member has no quality tier -- the ladder is
 *  keyed by `s.fellows` -- and the original cast keeps its own rarities (parity). */
export const CROSSOVER_RARITY_TIERS=Object.freeze(['N','N','R','R','SR','SR','SSR','SSR','SSR+','SSR+','UR','UR','UR*','LR']);
export const CROSSOVER_RARITY_TOP=CROSSOVER_RARITY_TIERS[CROSSOVER_RARITY_TIERS.length-1];
/** The badge for a quality tier. Out-of-range input clamps rather than returning undefined: a rarity of
 *  `undefined` renders as an empty badge and would read as missing art rather than as a bad tier. */
export const crossoverRarity=quality=>CROSSOVER_RARITY_TIERS[Math.min(CROSSOVER_RARITY_TIERS.length,Math.max(1,Number.isInteger(quality)?quality:1))-1];
/** Is this id a crossover Fellow, i.e. one whose badge climbs? */
export const rarityClimbs=id=>additionKind(id)==='fellows';
/** What the UI should show as `id`'s rarity in the village `s`. Everyone else -- the 159 original
 *  Fellows, all 107 original Family and the 30 crossover Family -- reads its catalogue string. */
export const climbedQuality=(s,id)=>s?.originalProgression?sourceQuality(s,id):1;
export function displayRarity(s,id){
 if(rarityClimbs(id))return crossoverRarity(climbedQuality(s,id));
 return (fellowById(id)||familyById(id))?.rarity??null;
}
/** A catalogue record with its displayed rarity substituted, for the tiles and panels that read
 *  `person.rarity`. Returns the SAME object when nothing changes, so React memo keys stay stable and a
 *  flag-off village hands the untouched catalogue rows straight through. */
export function withDisplayRarity(s,person){
 if(!person||!rarityClimbs(person.id))return person;
 const rarity=crossoverRarity(climbedQuality(s,person.id));
 return rarity===person.rarity?person:{...person,rarity};
}
/** The same over a catalogue array. Identity-stable when no row moves. */
export function displayRoster(s,rows){
 const mapped=rows.map(r=>withDisplayRarity(s,r));
 return mapped.some((r,i)=>r!==rows[i])?mapped:rows;
}
