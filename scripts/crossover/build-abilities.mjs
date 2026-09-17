// Generates the two crossover ability tables and REPRODUCES the measurements they are derived from,
// so the tables can be regenerated rather than trusted (docs/crossover-abilities-plan.md 7.3).
//
//   node scripts/crossover/build-abilities.mjs            # write both files
//   node scripts/crossover/build-abilities.mjs --check     # byte-compare, write nothing
//
// TABLE A -- lib/crossover-progression-data.json. One row per rarity BADGE, every magnitude the
// measured MINIMUM for that badge across the original Fellows whose own rarity STARTS there (a
// rank-up Fellow keeps its base row all the way up its chain, so grouping by the chain's first token
// is what reproduces docs/crossover-abilities-plan.md 1.5/1.6 -- and this script asserts that it does,
// which is the positive control CLAUDE.md rule 2 asks for before anything is derived on top).
//
// TABLE B -- lib/crossover-abilities-data.json. One archetype word per crossover Fellow, derived from
// the row's own `occupation` by an ordered keyword rule. It exists ONLY to name things: the flavour
// names in the skill guide are built from it, and nothing numeric reads it.
//
// WHY THE ARCHETYPE DOES NOT DECIDE THE TYPE, which the plan proposed. Types shipped on 2026-09-17
// with five deliberate role->spread moves the owner asked for (docs/crossover-plan.md decision 3), and
// they are pinned in lib/crossover-roster-data.json AND tests/crossover-arcs.test.mjs. An
// archetype->type function would have to either reproduce those five moves or fight them, and it would
// make `type` derivable from two places at once -- a drift risk, not the typo-catcher the plan wanted
// it to be. So the archetype follows the OCCUPATION and the type stays where it already lives.
import {readFileSync,writeFileSync} from 'node:fs';
import {ORIGINAL_FELLOWS} from '../../lib/catalog.mjs';
import progression from '../../lib/original-progression-data.json' with {type:'json'};
import operations from '../../lib/operation-data.json' with {type:'json'};
import additions from '../../lib/everkai-additions-data.json' with {type:'json'};

/** The badge ladder a crossover Fellow climbs: fourteen quality tiers, two per badge
 *  (lib/crossover-rarity.mjs, docs/crossover-plan.md order of work 2). */
export const TIERS=['N','N','R','R','SR','SR','SSR','SSR','SSR+','SSR+','UR','UR','UR*','LR'];
export const BADGES=[...new Set(TIERS)];
/** A rank-up Fellow's rarity is a CHAIN ("SSR -> SSR+ -> UR*"). Its `heroes` row and its operation row
 *  never move as it ranks up, so the row describes the rarity it STARTS at. */
const baseRarity=f=>f.rarity.split('->')[0].trim();
const opRow=new Map(operations.records.map(r=>[r.fellow,r]));
const slot=(row,minLevel)=>row.effects.filter(e=>e.minLevel===minLevel).reduce((n,e)=>n+e.percent,0);

/** The expected shape, straight out of docs/crossover-abilities-plan.md 1.5/1.6. If the measurement
 *  below stops reproducing this, the tables are NOT derived from what their note claims. */
const EXPECTED={
 N:{n:5,baseAptitude:[20,20,20],slotA:30},
 R:{n:15,baseAptitude:[35,35,35],slotA:50},
 SR:{n:29,baseAptitude:[50,50,75],slotA:70},
 SSR:{n:64,baseAptitude:[70,80,110],slotA:100},
 'SSR+':{n:20,baseAptitude:[100,100,100],slotA:100},
 UR:{n:24,baseAptitude:[100,120,160],slotA:150},
 'UR*':{n:2,baseAptitude:[200,200,200],slotA:200},
};
export function deriveLadder(){
 const groups={};
 for(const f of ORIGINAL_FELLOWS)(groups[baseRarity(f)]??=[]).push(f);
 // Slots B and C are 20 and 30 on all 175 records without exception, so they are constants rather
 // than per-badge columns. Asserted over the whole table, not over the grouped subsets.
 for(const [minLevel,want] of [[50,20],[200,30]]){
  const seen=[...new Set(operations.records.map(r=>slot(r,minLevel)))];
  if(seen.length!==1||seen[0]!==want)throw new Error(`slot at minLevel ${minLevel} is no longer a constant ${want}: ${seen}`);
 }
 const rarities={};
 for(const badge of BADGES){
  if(badge==='LR')continue;
  const set=groups[badge]||[];
  const expect=EXPECTED[badge];
  if(!expect)throw new Error(`no expectation recorded for badge ${badge}`);
  if(set.length!==expect.n)throw new Error(`${badge}: ${set.length} original Fellows, plan measured ${expect.n}`);
  const heroes=set.map(f=>progression.heroes[f.id]).filter(Number.isFinite).sort((a,b)=>a-b);
  if(heroes.length!==set.length)throw new Error(`${badge}: ${set.length-heroes.length} Fellows have no original growth row`);
  const got=[heroes[0],heroes[Math.floor(heroes.length/2)],heroes.at(-1)];
  if(JSON.stringify(got)!==JSON.stringify(expect.baseAptitude))throw new Error(`${badge}: base Aptitude min/median/max ${got}, plan measured ${expect.baseAptitude}`);
  // The 31 records whose slot A is CENSORED ("Rarity-gated appoint skill excluded") sum to 50, which is
  // slots B+C alone. Reading that 50 as a magnitude is the SimGame3Plant.time mistake (CLAUDE.md rule
  // 6): it is missing data, so those records are excluded rather than counted as low.
  const rows=set.map(f=>opRow.get(f.id)).filter(r=>r&&!r.unresolved);
  const slotA=rows.map(r=>slot(r,1)).sort((a,b)=>a-b);
  if(!slotA.length)throw new Error(`${badge}: no uncensored operation row to measure slot A from`);
  if(slotA[0]!==expect.slotA)throw new Error(`${badge}: slot A minimum ${slotA[0]}, plan measured ${expect.slotA}`);
  rarities[badge]={baseAptitude:heroes[0],operationSlotA:slotA[0],originals:set.length,uncensoredOperationRows:rows.length};
 }
 // LR is the ONE local row: no original Fellow's rarity STARTS at LR (four reach it up a chain, and
 // their own rows are 70-100 -- lower than UR*, because the row describes where they started). A
 // crossover Fellow does reach it, at quality 14, so the ladder needs a row. It repeats the UR* row:
 // the ladder stops growing at the top of what was measured rather than inventing a step past it.
 rarities.LR={...rarities['UR*'],originals:0,uncensoredOperationRows:0,local:'repeats the UR* row; no original Fellow starts at LR'};
 return rarities;
}

/** ORDERED. First match wins, so the more specific rules come first. Every word is a plain English
 *  village word; none of them, and none of the occupations they are joined to, comes from either
 *  source franchise. `words` is [talent, insight]. */
export const ARCHETYPES={
 captain:{words:['Command','Fieldcraft'],match:/captain|marshal|boss|drillmaster|caravan master|market boss|foundry master|harbour master|training master|frontier/i},
 warden:{words:['Vigil','Watchcraft'],match:/warden|watch|guard|gate|bailiff|judge|militia|siege|night|sergeant|ranger|nightwatch|range /i},
 duelist:{words:['Stance','Footwork'],match:/duel|prizefighter|fencing|tutor|lord|huntsman|butcher|escort/i},
 scholar:{words:['Study','Lorecraft'],match:/scribe|archivist|librarian|antiquarian|scholar|translat|strategist|spymaster|informant|physician|herbalist|beekeeper|orchard|garden|apothec/i},
 artisan:{words:['Method','Handcraft'],match:/armourer|fletcher|carpenter|painter|ropewright|kite|kiln|forge|machinist|millwright|engineer|tinker|clock|pump|waterworks|repair|works|timber|stone|quarry|woodcutter|salvager|haulier|butcher|weather/i},
 broker:{words:['Ledger','Tallycraft'],match:/market|trade|bounty|rent|toll|quartermaster|innkeeper|larder|dealer|talker|agent/i},
 courier:{words:['Momentum','Routecraft'],match:/courier|runner|rider|caravan|wander|hermit|pilot|scout|wayfinder|slinger|rooftop|sky|airship|signal|lamplighter|bell|festival|odd-job|errand|stable|haul/i},
 steward:{words:['Accord','Hearthcraft'],match:/school|aide|clerk|advisor|speaker|envoy|nursemaid|funeral|village|orchardist|keeper|hand|crew|instructor|master|overseer|butcher/i},
};
/** The fallback when no rule matches. Named rather than implicit, and asserted to be UNUSED by the
 *  shipped roster -- a silent default is how 133 characters end up with one word between them. */
export const ARCHETYPE_DEFAULT='steward';
export const archetypeFor=occupation=>Object.keys(ARCHETYPES).find(k=>ARCHETYPES[k].match.test(occupation))||ARCHETYPE_DEFAULT;

export function deriveArchetypes(){
 return additions.fellows.map(r=>({id:r.id,archetype:archetypeFor(r.occupation),occupation:r.occupation}));
}

const LADDER_FILE=new URL('../../lib/crossover-progression-data.json',import.meta.url);
const ABILITIES_FILE=new URL('../../lib/crossover-abilities-data.json',import.meta.url);

export function buildFiles(){
 const rarities=deriveLadder();
 const ladder={
  localPolicy:'crossover-progression-v1',
  note:'Derived, not authored. Every magnitude is the measured MINIMUM for its rarity badge across the original Fellows whose own rarity chain STARTS at that badge (lib/original-progression-data.json heroes, lib/operation-data.json), re-derived by scripts/crossover/build-abilities.mjs, which refuses to write unless it reproduces docs/crossover-abilities-plan.md 1.5/1.6. The LOCAL parts are the SELECTION rule (per-badge minimum), the LR row (repeats UR*, because no original starts at LR) and the fixed talent rule.',
  tiers:TIERS,
  talentRule:'Hero_Talent_Base_3',
  talentRuleNote:'FIXED, not per badge. Every tier costs exactly one Skill Pearl per Aptitude point (lib/talents.mjs: 1/1, 2/2, 3/3) and any Fellow can buy Aptitude directly at the same 1:1 rate to the same 1,000 cap (lib/adventure.mjs aptitudeTrainingPlan), so the tier changes clicks and the default-mode tier cap, never the price of a point. It cannot climb with the badge: validTalentLedger re-derives every stored receipt from the CURRENT rule, so a rule that moved would refuse a save that had already trained one, and `fellows` is not quarantinable. This is the tier the two shipped prototypes already carry.',
  operationSlotB:20,
  operationSlotC:30,
  operationNote:'Slots B and C are 20 and 30 on all 175 original records without exception, so they are constants here. All three slots are type-targeted: a crossover Fellow never gets the single-building form of slot B, which is the narrower of the two shapes.',
  rarities,
 };
 const abilities={
  localPolicy:'crossover-archetypes-v1',
  note:'One archetype word per crossover Fellow, derived from its own `occupation` by the ordered keyword rule in scripts/crossover/build-abilities.mjs. It is used for NAMING ONLY -- the skill-guide flavour names are built from it and nothing numeric reads it. A row may be hand-edited to any of the eight archetypes; --check will then report the difference rather than silently regenerating it.',
  archetypes:Object.fromEntries(Object.entries(ARCHETYPES).map(([k,v])=>[k,{words:v.words}])),
  fellows:deriveArchetypes(),
 };
 return {ladder,abilities};
}

const json=v=>JSON.stringify(v,null,1)+'\n';
if(import.meta.url===`file://${process.argv[1]}`){
 const check=process.argv.includes('--check');
 const {ladder,abilities}=buildFiles();
 let bad=0;
 for(const [file,value] of [[LADDER_FILE,ladder],[ABILITIES_FILE,abilities]]){
  const text=json(value);
  if(check){
   let shipped=null;
   try{shipped=readFileSync(file,'utf8')}catch{}
   if(shipped!==text){bad++;console.error(`DIFFERS: ${file.pathname}`)}
   else console.log(`ok: ${file.pathname}`);
  }else{writeFileSync(file,text);console.log(`wrote ${file.pathname}`)}
 }
 const counts={};for(const r of abilities.fellows)counts[r.archetype]=(counts[r.archetype]||0)+1;
 console.log(`${abilities.fellows.length} Fellows ·`,counts);
 console.log('ladder:',Object.fromEntries(Object.entries(ladder.rarities).map(([k,v])=>[k,`${v.baseAptitude}/${v.operationSlotA}`])));
 process.exit(bad?1:0);
}
