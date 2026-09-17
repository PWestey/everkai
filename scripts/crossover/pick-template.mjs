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

export function templateCandidates(rarity,type){
 return FELLOWS.filter(f=>f.rarity===rarity&&f.type===type&&talentRule(f.id)&&insightRule(f.id)&&characterSkills(f.id)
  &&progression.heroes[f.id]&&talentSource.heroes[f.id]&&recruitPrice(f.id)&&!RANK_FELLOWS.has(f.id)&&!FREE_ROSTER.has(f.id))
  .sort((a,b)=>Number(a.id.split('_')[1])-Number(b.id.split('_')[1]));
}
if(import.meta.url===`file://${process.argv[1]}`){
 const [rarity,type]=process.argv.slice(2);
 const c=templateCandidates(rarity,type);
 if(!c.length){console.error(`No original ${rarity} ${type} Fellow has every table; choose another rarity/type.`);process.exit(1)}
 console.log(c[0].id);
}
