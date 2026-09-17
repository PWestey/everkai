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
 *  Why the columns are not authored. `cost` and `flat` are Angie's shipped columns READ FROM
 *  lib/stella-data.json at load, not copied: the crossover track cannot drift from the original table
 *  because it IS the original table. The top of the ladder is therefore 35,300,000 own Power, the same
 *  own-Power ceiling an Isekai Stella reaches, for the same 4,500 fragments.
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
export const CROSSOVER_STELLA=Object.freeze({
 id:CROSSOVER_STELLA_ID,name:'Crossover',type:null,itemId:CROSSOVER_SHARD_ITEM,
 levels:Object.freeze(ANGIE.levels.map(r=>Object.freeze({level:r.level,cost:r.cost,itemId:CROSSOVER_SHARD_ITEM,flat:r.flat,percent:0}))),
 source:'lib/stella-data.json hero_52 (Angie) cost/flat columns, percent zeroed',
 localPolicy:'crossover-shared-shard-v1',
});
/** The Elise precedent exactly (lib/stella-activation-policy.json:23-30): a free activation that grants
 *  nothing and merely unlocks paid training. It carries its own policy id so validStella's
 *  activationPolicy check distinguishes it from the typed one. */
export const CROSSOVER_STELLA_ACTIVATION=Object.freeze({cost:0,flat:0,percent:0,activationPolicy:'crossover-shard-activation-v1'});
/** Does this id use the shared crossover track? Crossover FELLOWS only, flag-independent (an owned
 *  character keeps its systems with the flag off -- lib/everkai-additions.mjs). */
export const crossoverStella=id=>additionKind(id)==='fellows';
/** Does the village own anything that can spend shards? */
export const ownsCrossoverStella=s=>Object.keys(s?.fellows||{}).some(crossoverStella);
