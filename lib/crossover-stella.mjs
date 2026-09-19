import data from './stella-data.json' with {type:'json'};
import {additionKind} from './everkai-additions.mjs';
/** The ONE shared Stella shard track for the crossover Fellows (docs/crossover-plan.md order of work 8,
 *  docs/crossover-collection-plan.md 3).
 *
 *  Why one pool and not 163. `settleStella` pays its idle drop IN FULL to every owned profile's own item
 *  (lib/stella.mjs:45-50), so 163 profiles would be 163 parallel 500/day streams against an unchanged
 *  4,500 sink each -- every crossover Fellow maxed in 4.5 days, and the ceiling the 500/day rate was
 *  chosen to reproduce (lib/stella.mjs:19-20) broken. One pool keeps the faucet at exactly today's
 *  per-profile rate however large the roster gets: 500/day x the habit multiplier, 4,500 per Fellow,
 *  733,500 for all 163 -- under the per-item 1e6 stock cap, so no bound moves for the stock either.
 *
 *  Why the columns are read, not copied. `cost` and `flat` are Angie's shipped columns READ FROM
 *  lib/stella-data.json at load: the cost cannot drift from the original table because it IS the original
 *  table. Until 2026-09-19 the flat was hers unchanged too (35,300,000 at the top); it is now hers times
 *  CROSSOVER_FLAT_SCALE (below), for crossover parity -- 423,600,000 at the top, for the same 4,500 shards.
 *
 *  Why `percent` is zeroed. `stellaBonus` sums `percent` across every activated Stella OF THE SAME TYPE
 *  (lib/stella.mjs:58). A crossover Fellow's own percent would be harmless -- this profile's `type` is
 *  null and no Fellow has a null type -- but the collection plan's shape is deliberate: crossovers get
 *  the OWN half of Stella here and the earned percent half from lib/crossover-accord.mjs, which is
 *  sized against the measured ceiling. Two tracks with one magnitude each, rather than one track whose
 *  two columns cannot be tuned apart.
 *
 *  LOCAL, and self-labelled as such: the local decisions are (a) that one shared profile stands in for
 *  163, (b) that `percent` is zeroed, and (c) the free activation. Every magnitude is a measured
 *  original value, re-used unchanged. `originalValueVerified` is false for the whole Stella file
 *  (lib/stella-activation-policy.json) and that is not improved here.
 *
 *  Family additions are excluded: a Family record is five integers (lib/game.mjs:99) and no Family
 *  member of either roster has a Stella profile, so `crossoverStella` asks additionKind for 'fellows'
 *  rather than trusting the `xover_` prefix. The MINT is gated the same way -- a village owning only
 *  crossover Family would otherwise stockpile shards nothing can spend. */
const ANGIE=data.profiles.find(p=>p.id==='hero_52');
if(!ANGIE)throw new Error('lib/stella-data.json no longer carries the hero_52 profile this track reads');
export const CROSSOVER_SHARD_ITEM='Item_Owner_XoverShard';
export const CROSSOVER_STELLA_ID='crossover';
/** CROSSOVER PARITY (owner decision, taken 2026-09-19 once the Power scale had settled): a maxed crossover
 *  Fellow should match a maxed ORIGINAL of the middle type again. MEASURED on one finished flag-on state with
 *  every 2026-09-18 sink maxed (talent skills, Rarity Advance, Pledge, Origin, Family Stella, quench --
 *  tests/crossover-family-village.mjs `fullyMaxed`): with Angie's flat column unscaled a maxed crossover
 *  reached 67,942,164 against a Diligent original's 462,211,046, i.e. 0.147x. What an original has and a
 *  crossover cannot: talent skills (+7,350 Aptitude on the Diligent median), Family Stella (+1,083 Aptitude,
 *  +561%), its OWN Stella percent (+727%) and a ladder three times Angie's. None of those exist for a character
 *  who is not in the original, so the shortfall is made up on the ONE crossover-only track there is.
 *
 *  THE LEVER IS THE FLAT COLUMN, scaled by one authored factor. Why flat and not `percent`: a flat is added
 *  after every multiplier, so it cannot multiply anything else a crossover owns and cannot be typed (this
 *  profile's `type` is null); the percent that would do the same job is +10,600%, which would also multiply
 *  every future percent a crossover gains. Why the shape stays Angie's: the COST column and the per-level
 *  shape are still her measured ones, so the track is earned through the same pool at the same 4,500 shards
 *  per Fellow -- only the magnitude is local. LOCAL, and labelled: `CROSSOVER_FLAT_SCALE`. */
export const CROSSOVER_FLAT_SCALE=12;
/** The receipts the live build (main@45828d3, crossover on by default) writes: Angie's flat unscaled. validStella
 *  reprices this track, so it accepts a row from EITHER ladder (CLAUDE.md rule 12), and Power reads the
 *  CURRENT ladder by level (lib/stella.mjs stellaBonus) -- a village that bought levels before the scale keeps
 *  them and gets the scaled value for them, with nothing re-written. */
export const CROSSOVER_STELLA_V1_LEVELS=Object.freeze(ANGIE.levels.map(r=>Object.freeze({level:r.level,cost:r.cost,itemId:CROSSOVER_SHARD_ITEM,flat:r.flat,percent:0,selfPowerBp:0,appointYieldBp:0,talentLimit:0})));
export const CROSSOVER_STELLA=Object.freeze({
 id:CROSSOVER_STELLA_ID,name:'Crossover',type:null,itemId:CROSSOVER_SHARD_ITEM,
 // The three columns imported on 2026-09-18 are zeroed here for the SAME reason `percent` is: a
 // crossover character has no Stella table of its own, so any value in them would be authored rather
 // than measured. They are stated explicitly rather than left undefined so every ladder in the game has
 // one row shape, which is what lets validStella and the panel read them without a per-track branch.
 levels:Object.freeze(CROSSOVER_STELLA_V1_LEVELS.map(r=>Object.freeze({...r,flat:r.flat*CROSSOVER_FLAT_SCALE}))),
 legacyLevels:CROSSOVER_STELLA_V1_LEVELS,
 source:`lib/stella-data.json hero_52 (Angie) cost column; her flat column x${CROSSOVER_FLAT_SCALE} (crossover parity, local); percent zeroed`,
 localPolicy:'crossover-shared-shard-v2',
 // `reprice` is what validStella's `priced` check keys on (lib/stella.mjs). It used to infer the same
 // thing from `type===null`, which stopped being a safe proxy on 2026-09-18 when every ORIGINAL Fellow
 // gained an imported ladder that is also repriceable but is NOT shared. Stating it here keeps this
 // track's behaviour exactly what it was: every row must match its own ladder, because this track has
 // never shipped and no save can hold an older row of it.
 reprice:true,
});
/** The Elise precedent exactly (lib/stella-activation-policy.json:23-30): a free activation that grants
 *  nothing and merely unlocks paid training. It carries its own policy id so validStella's
 *  activationPolicy check distinguishes it from the typed one. */
export const CROSSOVER_STELLA_ACTIVATION=Object.freeze({cost:0,flat:0,percent:0,selfPowerBp:0,appointYieldBp:0,talentLimit:0,activationPolicy:'crossover-shard-activation-v1'});
/** Does this id use the shared crossover track? Crossover FELLOWS only, flag-independent (an owned
 *  character keeps its systems with the flag off -- lib/everkai-additions.mjs). */
export const crossoverStella=id=>additionKind(id)==='fellows';
/** Does the village own anything that can spend shards? */
export const ownsCrossoverStella=s=>Object.keys(s?.fellows||{}).some(crossoverStella);
