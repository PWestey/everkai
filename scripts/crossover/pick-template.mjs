// Pick the original Fellow whose progression tables an Everkai addition borrows.
// Rule: the lowest-numbered original Fellow with the same rarity AND type that has every per-id
// table an owned Fellow needs (talent rule, Insight rule, skill guide, original growth, default
// talent source) and is sold at the counter (not free, not a rank encounter).
// node scripts/crossover/pick-template.mjs SSR Unfettered  ->  hero_103
import {FELLOWS} from '../../lib/catalog.mjs';
import {talentRule} from '../../lib/talents.mjs';
import {insightRule} from '../../lib/insight.mjs';
import {characterSkills} from '../../lib/character-skills.mjs';
import {recruitPrice,RANK_FELLOWS,FREE_ROSTER} from '../../lib/summon.mjs';
import progression from '../../lib/original-progression-data.json' with {type:'json'};
import talentSource from '../../lib/default-talent-source.json' with {type:'json'};

// Rarity N has no template under the rule above, measured for all five types (rarity R too): the only
// five rarity-N originals are hero_1..hero_5 and all fifteen rarity-R originals are in FREE_ROSTER, which
// the rule excludes. Every crossover character starts at N (docs/crossover-plan.md), so without a pin
// they would resolve no talent rule, no Insight rule, no skill guide and no `heroes` growth row -- and
// activateOriginalProgression refuses outright if ANY owned Fellow lacks a heroes row
// (lib/original-progression.mjs:38), which would lock the whole ladder.
//
// Pinned instead to the per-type SSR anchor, chosen by TYPE alone. Measured in lib/operation-data.json,
// the five are exactly symmetric -- 100% at L1, +20% at L50, +30% at L200 = 150% to their own type --
// so a rarity-N addition borrows the median original's operation row with no invented value, and its
// Insight rule's type agrees with its own type (the lib/insight.mjs:9 requirement).
export const RARITY_N_ANCHORS=Object.freeze({Brave:'hero_101',Diligent:'hero_102',Unfettered:'hero_103',Inspiring:'hero_104',Informed:'hero_105'});
export function templateCandidates(rarity,type){
 const pinned=rarity==='N'?RARITY_N_ANCHORS[type]:null;
 return FELLOWS.filter(f=>(pinned?f.id===pinned:f.rarity===rarity&&f.type===type)&&f.type===type&&talentRule(f.id)&&insightRule(f.id)&&characterSkills(f.id)
  &&progression.heroes[f.id]&&talentSource.heroes[f.id]&&recruitPrice(f.id)&&!RANK_FELLOWS.has(f.id)&&!FREE_ROSTER.has(f.id))
  .sort((a,b)=>Number(a.id.split('_')[1])-Number(b.id.split('_')[1]));
}
if(import.meta.url===`file://${process.argv[1]}`){
 const [rarity,type]=process.argv.slice(2);
 const c=templateCandidates(rarity,type);
 if(!c.length){console.error(`No original ${rarity} ${type} Fellow has every table; choose another rarity/type.`);process.exit(1)}
 console.log(c[0].id);
}
