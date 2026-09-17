import ladder from './crossover-progression-data.json' with {type:'json'};
import table from './crossover-abilities-data.json' with {type:'json'};
import insight from './insight-data.json' with {type:'json'};
import {additionById,additionKind} from './everkai-additions.mjs';
/** CROSSOVER ABILITIES -- what a crossover Fellow's per-id progression tables say, now that it has its
 *  own instead of borrowing a template original's (docs/crossover-plan.md order of work 5,
 *  docs/crossover-abilities-plan.md 2).
 *
 *  WHAT THIS REPLACES. Every per-id ORIGINAL table is keyed by `hero_*` ids, and an addition used to
 *  borrow the rows of its `template` through `sourceId()` -- seven call sites (talents 3, insight 1,
 *  original-progression 3) plus the whole skill guide. So a rarity-N crossover Fellow read an SSR
 *  anchor's rows: base Aptitude 70-120 where an N original has 20, and +150% appoint percent where an
 *  N original has +80%. That is the placeholder this module removes, and it was a dominance bug: a
 *  crossover Fellow beat the original of its own rarity on two axes at the same investment.
 *
 *  THE ONE DESIGN DECISION: numbers are DERIVED, names are authored. Measured (plan 1.3/1.5/1.6), the
 *  base-Aptitude row, the appoint percent and the talent tier are each a pure function of rarity, and
 *  Insight is a pure function of type. So the whole table is an 8-row rarity ladder plus one archetype
 *  WORD per character -- and no per-character number at all. Every magnitude in the ladder is the
 *  measured MINIMUM for its badge, which is what turns the balance claim into arithmetic: at any badge
 *  a crossover Fellow is at or below EVERY original of that badge, on every sourced axis.
 *
 *  THE LADDER IS READ AT THE CLIMBED BADGE, not at the stored rarity. A crossover Fellow's stored
 *  `rarity` is the bare string "N" forever (lib/crossover-rarity.mjs explains why: eight ["N"]-gated
 *  fishing effects) and its DISPLAYED badge climbs with the quality tier it has paid for. Keying the
 *  ladder on that badge is what makes the climb worth something: base Aptitude 20 -> 200 and appoint
 *  percent 80% -> 250% over fourteen tiers, each rung equal to the weakest original wearing the same
 *  badge. Rule 12 was checked before this was wired: nothing stored is derived from either value
 *  (Mine Clearance stores the power it dug with, not a recomputation), and `validOriginalProgression`
 *  only asks whether a growth row EXISTS.
 *
 *  THE TALENT RULE IS THE ONE COLUMN THAT DOES NOT CLIMB, and that is a save-compatibility decision
 *  rather than a balance one: `validTalentLedger` re-derives every stored receipt's cost and Aptitude
 *  from the CURRENT rule, so a rule that moved with the badge would refuse a save that had already
 *  trained a talent -- and `fellows` is not in QUARANTINABLE, so the village would be lost rather than
 *  degraded. It costs nothing to hold it fixed: every tier is one Skill Pearl per Aptitude point
 *  (1/1, 2/2, 3/3) and any Fellow can buy Aptitude directly at the same 1:1 rate up to the same 1,000
 *  cap, so the tier decides clicks and the default-mode tier cap, never the price of a point.
 *
 *  This module imports only its data files and lib/everkai-additions.mjs, so every lib module can use
 *  it without an import cycle -- including lib/original-progression.mjs, which is why the quality tier
 *  is passed IN rather than read from the state here. */
export const CROSSOVER_TIERS=Object.freeze([...ladder.tiers]);
export const CROSSOVER_LADDER=ladder.rarities;
export const CROSSOVER_TALENT_RULE=ladder.talentRule;
export const CROSSOVER_SLOT_B=ladder.operationSlotB,CROSSOVER_SLOT_C=ladder.operationSlotC;
/** Is this id a crossover FELLOW, i.e. one of the characters this module describes? Family additions
 *  have none of these tables: a Family record is five integers and no Family system is keyed by rarity. */
export const hasCrossoverAbilities=id=>additionKind(id)==='fellows';
/** The badge for a quality tier, clamped the way lib/crossover-rarity.mjs clamps it. */
export const crossoverBadge=quality=>CROSSOVER_TIERS[Math.min(CROSSOVER_TIERS.length,Math.max(1,Number.isInteger(quality)?quality:1))-1];
/** The ladder row for a quality tier. */
export const crossoverLadder=quality=>CROSSOVER_LADDER[crossoverBadge(quality)];
/** A crossover Fellow's base-Aptitude row -- what `original-progression-data.json.heroes[id]` is for an
 *  original. Returns null for anything else, so a caller cannot accidentally give one to an original. */
export const crossoverBaseAptitude=(id,quality=1)=>hasCrossoverAbilities(id)?crossoverLadder(quality).baseAptitude:null;
/** Insight is a pure function of `type`: the five rules are numerically identical (cost 100, +1
 *  Aptitude, 300 levels) and differ only in which material they spend. 133 of 133 are eligible. */
const insightByType=new Map(insight.rules.map(r=>[r.type,r]));
export const crossoverInsightRule=id=>hasCrossoverAbilities(id)?insightByType.get(additionById(id)?.type)||null:null;
/** The appoint-skill row, shaped exactly like a lib/operation-data.json record so lib/operations.mjs can
 *  read it with the same filter. All three slots are type-targeted -- a crossover Fellow never gets the
 *  single-building form of slot B, which is the narrower of the two shapes the originals use. */
export function crossoverOperationRow(id,quality=1){
 if(!hasCrossoverAbilities(id))return null;
 const type=additionById(id)?.type,row=crossoverLadder(quality);
 if(!type||!row)return null;
 return {fellow:id,effects:[
  {type,percent:row.operationSlotA,minLevel:1},
  {type,percent:CROSSOVER_SLOT_B,minLevel:50},
  {type,percent:CROSSOVER_SLOT_C,minLevel:200},
 ]};
}
export const CROSSOVER_ARCHETYPES=table.archetypes;
const archetypes=new Map(table.fellows.map(r=>[r.id,r]));
export const crossoverArchetype=id=>archetypes.get(id)?.archetype||null;
/** The two flavour names, derived from strings that already ship and are already guarded: the row's own
 *  `occupation` (written for Everkai, tests/everkai-additions.test.mjs) and one archetype word. No new
 *  per-character prose, so there is nothing here that could be a retold bio or a copyrighted line.
 *
 *  The flavour name is a SIBLING of the node's name, never the name itself: `isPlayableTalent` compares
 *  the node against its rule, and `resolveTalentProfile` compares `name` against the rule's canonical
 *  name, so putting the flavour there would make the talent untrainable. */
export function crossoverFlavour(id){
 const row=archetypes.get(id),person=additionById(id);
 if(!row||!person)return null;
 const words=CROSSOVER_ARCHETYPES[row.archetype]?.words;
 if(!words)return null;
 return {archetype:row.archetype,talent:`${person.occupation}'s ${words[0]}`,insight:`${words[1]} Study`};
}
