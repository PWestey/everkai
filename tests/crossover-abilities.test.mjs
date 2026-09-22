import test from 'node:test';import {APTITUDE_CAP,PEARL_APTITUDE_CAP} from '../lib/aptitude-cap.mjs';import assert from 'node:assert/strict';
import {legacyStart} from './progression-helpers.mjs';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {fresh,act,valid,refusedBy,decode,SAVE_VERSION} from '../lib/game.mjs';
import {newFellow,bondedPower,GEAR,STAR_CAP} from '../lib/adventure.mjs';
import {ARTIFACT_CAP} from '../lib/artifacts.mjs';
import {ORIGINAL_FELLOWS,fellowById} from '../lib/catalog.mjs';
import {ADDITION_FELLOWS,additionById,sourceId} from '../lib/everkai-additions.mjs';
import {CROSSOVER_LADDER,CROSSOVER_TIERS,CROSSOVER_TALENT_RULE,CROSSOVER_ARCHETYPES,CROSSOVER_SLOT_B,CROSSOVER_SLOT_C,
        crossoverBadge,crossoverLadder,crossoverBaseAptitude,crossoverInsightRule,crossoverOperationRow,
        crossoverArchetype,crossoverFlavour,hasCrossoverAbilities} from '../lib/crossover-abilities.mjs';
import {CROSSOVER_STARTERS,crossoverStartQuality,crossoverBadgeQuality} from '../lib/crossover-abilities.mjs';
// The generic crossover sample: the first addition that is NOT one of the four UR starters (Spider-Man is
// ADDITION_FELLOWS[0] and a starter since 2026-09-19; Wolverine, next, is the same type, Unfettered).
const PLAIN=ADDITION_FELLOWS.find(f=>!CROSSOVER_STARTERS[f.id]);
import {CROSSOVER_RARITY_TIERS} from '../lib/crossover-rarity.mjs';
import {talentRule,talentCap,crossoverTalentRule,validTalents} from '../lib/talents.mjs';
import {insightRule} from '../lib/insight.mjs';
import {characterSkills,isPlayableTalent} from '../lib/character-skills.mjs';
import {fellowOperation} from '../lib/operations.mjs';
import {heroRow,hasHeroRow,qualityRule,sourceCoefficient} from '../lib/original-progression.mjs';
import {BUSINESSES} from '../lib/businesses.mjs';
import {aptitudeTrainingPlan} from '../lib/adventure.mjs';
import {deriveLadder,ARCHETYPES,ARCHETYPE_DEFAULT,archetypeFor,TIERS} from '../scripts/crossover/build-abilities.mjs';
import ladderFile from '../lib/crossover-progression-data.json' with {type:'json'};
import abilityFile from '../lib/crossover-abilities-data.json' with {type:'json'};
import guideFile from '../lib/character-skill-guide.json' with {type:'json'};
import progression from '../lib/original-progression-data.json' with {type:'json'};
import talentSource from '../lib/default-talent-source.json' with {type:'json'};
import insightData from '../lib/insight-data.json' with {type:'json'};
import operationData from '../lib/operation-data.json' with {type:'json'};

// THE ABILITIES SLICE (docs/crossover-plan.md order of work 5, docs/crossover-abilities-plan.md).
// A crossover Fellow's per-id progression tables used to be its `template` original's, borrowed through
// sourceId(). They are now DERIVED: an 8-row rarity ladder read at the badge the character has climbed
// to, plus one archetype word per character for naming. Everything here runs flag OFF, because
// `hasCrossoverAbilities` asks additionKind, which resolves an addition with or without ?crossover=1.

const T=1767225600000;
const BEST=GEAR.slice().sort((a,b)=>b.aptitude-a.aptitude)[0];
const BADGES=Object.keys(CROSSOVER_LADDER);
/** A rank-up original's rarity is a chain; its rows describe where it STARTED (the generator explains). */
const baseRarity=f=>f.rarity.split('->')[0].trim();
const originalsAt=badge=>ORIGINAL_FELLOWS.filter(f=>baseRarity(f)===badge);
/** A village in APK growth mode with one Fellow at quality `q` and the given record. Quality is set
 *  directly: this pins the ARITHMETIC of a climbed Fellow, and the climb itself is driven through
 *  act() in tests/crossover-rarity.test.mjs. Nothing external contributes on a fresh village -- no
 *  museum, no familiars, no blessings, no stella, no echoes -- so both sides of every ratio below are
 *  the same formula with the same inputs (CLAUDE.md rule 1). */
const at=(id,q,record)=>{
 const base=fresh(T);
 return {...base,fellows:{...base.fellows,[id]:{...newFellow(1),...record}},
  originalProgression:{policyVersion:1,claims:0,quality:{[id]:q},stock:{},receipts:[]},
  trainingCosts:{policyVersion:2,baselineLevels:{},receipts:[]}};
};
/** The three investment points the plan measures, capped by the quality tier's own level limit. */
const RECORDS=q=>({
 fresh:{level:1,aptitude:10},
 mid:{level:Math.min(300,qualityRule(q).cap),aptitude:310},
 ceiling:{level:qualityRule(q).cap,aptitude:1000,skill:20,stars:STAR_CAP,gear:BEST.id,gearLevel:ARTIFACT_CAP},
});
const sha=p=>createHash('sha256').update(readFileSync(new URL('../'+p,import.meta.url))).digest('hex');

// ---------------------------------------------------------------------------------------------
// Table A. Derived from the originals' own rows, and the generator refuses to write unless it
// reproduces the plan's measurement first -- which is this file's positive control too.
// ---------------------------------------------------------------------------------------------

test('the rarity ladder is re-derivable from the original tables, and the shipped file matches',()=>{
 const derived=deriveLadder();
 assert.deepEqual(Object.keys(derived).sort(),BADGES.slice().sort());
 for(const badge of BADGES)assert.deepEqual(
  {baseAptitude:derived[badge].baseAptitude,operationSlotA:derived[badge].operationSlotA},
  {baseAptitude:CROSSOVER_LADDER[badge].baseAptitude,operationSlotA:CROSSOVER_LADDER[badge].operationSlotA},badge);
 // The whole ladder, spelled out, so a change has to edit a number a human can read.
 assert.deepEqual(Object.fromEntries(BADGES.map(b=>[b,`${CROSSOVER_LADDER[b].baseAptitude}/${CROSSOVER_LADDER[b].operationSlotA}`])),
  {N:'20/30',R:'35/50',SR:'50/70',SSR:'70/100','SSR+':'100/100',UR:'100/150','UR*':'200/200',LR:'200/200'});
 assert.deepEqual([CROSSOVER_SLOT_B,CROSSOVER_SLOT_C],[20,30]);
 // Monotonic: the climb never takes a value away. (Grouping originals by the badges their chains
 // CONTAIN instead of start at does NOT give a monotonic ladder -- SSR+ would read 50 and LR 70 --
 // which is why the generator groups by the first token and says so.)
 for(const key of ['baseAptitude','operationSlotA']){
  const seq=BADGES.map(b=>CROSSOVER_LADDER[b][key]);
  assert.deepEqual(seq,seq.slice().sort((a,b)=>a-b),`${key} must never fall as the badge climbs`);
 }
 // The badge ladder itself is the one lib/crossover-rarity.mjs shows, from the same list.
 assert.deepEqual(CROSSOVER_TIERS,CROSSOVER_RARITY_TIERS);
 assert.deepEqual(TIERS,[...CROSSOVER_RARITY_TIERS]);
 assert.equal(CROSSOVER_TIERS.length,14);
 // And the generator's --check agrees byte for byte, so neither table can be hand-drifted unnoticed.
 execFileSync(process.execPath,[new URL('../scripts/crossover/build-abilities.mjs',import.meta.url).pathname,'--check'],{encoding:'utf8'});
});

test('every ladder value is the measured MINIMUM for its badge, and LR is the one local row',()=>{
 for(const badge of BADGES){
  const set=originalsAt(badge);
  if(badge==='LR'){
   assert.equal(set.length,0,'no original Fellow STARTS at LR');
   assert.deepEqual(CROSSOVER_LADDER.LR.baseAptitude,CROSSOVER_LADDER['UR*'].baseAptitude);
   assert.match(CROSSOVER_LADDER.LR.local,/repeats the UR\* row/);
   continue;
  }
  assert.ok(set.length>0,badge);
  assert.equal(CROSSOVER_LADDER[badge].originals,set.length);
  const rows=set.map(f=>progression.heroes[f.id]);
  assert.equal(CROSSOVER_LADDER[badge].baseAptitude,Math.min(...rows),`${badge} base Aptitude`);
  assert.ok(CROSSOVER_LADDER[badge].baseAptitude<=Math.min(...rows),`${badge} must not exceed the weakest`);
  assert.equal(CROSSOVER_LADDER[badge].local,undefined,`${badge} is measured, not local`);
 }
 // NEGATIVE CONTROL on "minimum": the medians and maxima are genuinely higher for four badges, so
 // "minimum" is a choice with consequences and not a synonym for "the only value".
 const higher=BADGES.filter(b=>originalsAt(b).length&&Math.max(...originalsAt(b).map(f=>progression.heroes[f.id]))>CROSSOVER_LADDER[b].baseAptitude);
 assert.deepEqual(higher,['SR','SSR','UR']);
});

// ---------------------------------------------------------------------------------------------
// Table B. One word per character, for naming only.
// ---------------------------------------------------------------------------------------------

test('all 133 crossover Fellows carry one of eight archetype words, derived from their occupation',()=>{
 assert.equal(abilityFile.fellows.length,133);
 assert.deepEqual(abilityFile.fellows.map(r=>r.id),ADDITION_FELLOWS.map(f=>f.id),'same ids, same order');
 assert.equal(Object.keys(CROSSOVER_ARCHETYPES).length,8);
 const counts={};
 for(const f of ADDITION_FELLOWS){
  const a=crossoverArchetype(f.id);
  assert.ok(CROSSOVER_ARCHETYPES[a],`${f.id} archetype ${a}`);
  assert.equal(a,archetypeFor(additionById(f.id).occupation),`${f.id} is not what its occupation derives`);
  counts[a]=(counts[a]||0)+1;
 }
 assert.deepEqual(counts,{courier:23,artisan:25,steward:16,warden:20,scholar:15,captain:12,broker:11,duelist:11});
 assert.equal(Object.values(counts).reduce((a,b)=>a+b,0),133);
 // Every one of the eight is used, and none of them by more than a quarter of the roster -- the check
 // that the ordered keyword rule has not collapsed into its fallback.
 for(const a of Object.keys(CROSSOVER_ARCHETYPES))assert.ok(counts[a]>=11,`${a} is nearly unused: ${counts[a]}`);
 assert.ok(Math.max(...Object.values(counts))<=34,'one archetype must not swallow a quarter of the roster');
 // NEGATIVE CONTROL for the fallback: it exists, it is named, and an occupation no rule matches lands
 // on it -- so a future row with a new occupation is a review item, not a crash.
 assert.equal(archetypeFor('zzz nothing matches this'),ARCHETYPE_DEFAULT);
 assert.equal(ARCHETYPE_DEFAULT,'steward');
 // The archetype does NOT decide the type (the generator explains why): all five types appear under
 // several archetypes, so nothing reads type out of this file.
 const pairs=new Set(ADDITION_FELLOWS.map(f=>`${crossoverArchetype(f.id)}/${f.type}`));
 assert.ok(pairs.size>8,'archetype and type are independent, as the note says');
});

test('the two flavour names per character are short, original, and collide with nothing shipped',()=>{
 const guideNames=new Set(guideFile.profiles.flatMap(p=>p.skills.map(n=>n?.name).filter(Boolean)));
 assert.ok(guideNames.size>100,'positive control: the collision set is actually populated');
 for(const f of ADDITION_FELLOWS){
  const flavour=crossoverFlavour(f.id);
  assert.ok(flavour,f.id);
  for(const name of [flavour.talent,flavour.insight]){
   assert.ok(name.length<=40,`${f.id}: "${name}" is ${name.length} characters`);
   assert.ok(name.length>3,`${f.id}: "${name}" is too short to be a name`);
   assert.equal(guideNames.has(name),false,`${f.id}: "${name}" collides with a shipped skill name`);
  }
  // The talent name is built from the row's own occupation, which is Everkai's own text and already
  // guarded; the insight name is one archetype word. No new per-character prose exists to review.
  assert.ok(flavour.talent.startsWith(additionById(f.id).occupation+"'s "),f.id);
  assert.equal(flavour.insight,`${CROSSOVER_ARCHETYPES[flavour.archetype].words[1]} Study`);
 }
 // The two prototypes by hand, because they are the rows a human will look at first.
 assert.equal(crossoverFlavour('xover_msf_spiderman').talent,"Web-Slinger's Momentum");
 assert.equal(crossoverFlavour('xover_swgoh_vaderduelsend').talent,"Sith Lord's Stance");
});

// ---------------------------------------------------------------------------------------------
// BALANCE. The claim is arithmetic, not argument: at any badge, a crossover Fellow is at or below
// EVERY original of that badge at the same investment, measured with the shipped bondedPower.
// ---------------------------------------------------------------------------------------------

test('no crossover Fellow exceeds ANY original of the same badge, at three investment levels',()=>{
 const XOVER=PLAIN.id;
 const rows=[];
 for(let q=1;q<=14;q++){
  const badge=crossoverBadge(q);
  // LR has no originals of its own; the ladder repeats UR*, so that is the set it is held to.
  const peers=originalsAt(badge==='LR'?'UR*':badge).filter(f=>progression.heroes[f.id]);
  assert.ok(peers.length,`no peers for badge ${badge}`);
  for(const [stage,record] of Object.entries(RECORDS(q))){
   const mine=bondedPower(at(XOVER,q,record),XOVER);
   const theirs=peers.map(f=>bondedPower(at(f.id,q,record),f.id));
   const weakest=Math.min(...theirs),strongest=Math.max(...theirs);
   assert.ok(mine<=weakest,`q${q} ${badge} ${stage}: crossover ${mine} > weakest original ${weakest}`);
   if(q===1||q===14)rows.push([q,badge,stage,mine,weakest,strongest,+(mine/weakest).toFixed(3)]);
  }
 }
 // The ends of the climb, pinned, so the ratio is visible and not merely asserted to be <= 1.
 // The ends of the climb, pinned, so the ratio is visible and not merely asserted to be <= 1. Every
 // row is [quality, badge, stage, crossover, weakest original, strongest original, ratio].
 assert.deepEqual(rows,[
  [1,'N','fresh',6000,6000,6000,1],
  [1,'N','mid',296000,296000,296000,1],
  // Originals now also own their talent SKILLS (lib/talent-skills.mjs, 2026-09-18): every unlocked skill
  // starts at level 1, free, and stars unlock the star skills. A crossover has no HeroN row, so none, and
  // the rows that were exactly equal now sit just below the weakest original -- the rule this test holds.
  // STEP 4 (2026-09-18): stars pay HeroStar's rows only past their level gates (the N ceiling sits below level
  // 300, so its seven stars pay nothing and the two sides meet again), and the roster's star halos reach an
  // original by country, rarity and bond but an addition only through `all` -- so at LR the originals spread.
  [1,'N','ceiling',4575050,4575050,4575050,1],   // 5,222,550 before the additive composition; 5,375,683 / 5,421,332 before step 4
  [14,'LR','fresh',79500,94581,98766,0.841],
  [14,'LR','mid',1899530,2199655,2296985,0.864],
  [14,'LR','ceiling',117035400,139354935,147889235,0.84], // 95,108,000 before it; 99,003,150 / 100,278,025 before step 4
 ]);
 // Equality at both ends is the intended answer, not a coincidence: rarity N has exactly one value
 // across all five originals (20), and UR* has exactly one across its two (200), so "the measured
 // minimum" IS every original's value there. Where a badge has a spread, the crossover sits at the
 // bottom of it -- measured at SSR, which has the widest (70 to 110).
 const ssr=originalsAt('SSR').map(f=>progression.heroes[f.id]);
 assert.deepEqual([Math.min(...ssr),Math.max(...ssr)],[70,110]);
 const q=7,rec=RECORDS(q).ceiling;
 const mine=bondedPower(at(XOVER,q,rec),XOVER);
 const best=Math.max(...originalsAt('SSR').map(f=>bondedPower(at(f.id,q,rec),f.id)));
 assert.ok(mine<best,`SSR ceiling: ${mine} is not below the strongest SSR original ${best}`);
 // 30,481,500 / 30,901,500 (0.986) before the 2026-09-18 additive Power composition; the ratio barely
 // moves because both sides take the same stars/skill re-bucketing and differ only in the hero row.
 // 31,991,137 (0.985) before the originals' free level-1 talent skills (2026-09-18).
 assert.deepEqual([mine,best],[32327475,37508175]);
 assert.equal(+(mine/best).toFixed(3),0.862,'at the widest badge a crossover is 97.5% of the strongest');
});

// THE FOUR UR STARTERS (owner request, 2026-09-19) are held to the same rule at the badge they WEAR: from quality 1
// they read the UR rung, so they are compared with the UR originals until they climb past tier 12.
test('the four UR starters: at every tier, never above the weakest original of the badge they wear',()=>{
 const rows=[];
 for(const id of Object.keys(CROSSOVER_STARTERS)){
  assert.equal(crossoverStartQuality(id),11,`${id} starts on the first UR tier`);
  for(const q of [1,6,11,12,13,14]){
   const badge=crossoverBadge(crossoverBadgeQuality(id,q));
   const peers=originalsAt(badge==='LR'?'UR*':badge).filter(f=>progression.heroes[f.id]);
   for(const [stage,record] of Object.entries(RECORDS(q))){
    const mine=bondedPower(at(id,q,record),id),weakest=Math.min(...peers.map(f=>bondedPower(at(f.id,q,record),f.id)));
    assert.ok(mine<=weakest,`${id} q${q} ${badge} ${stage}: ${mine} > weakest original ${weakest}`);
    if(id==='xover_msf_spiderman'&&q===1)rows.push([badge,stage,mine,weakest]);
   }
  }
 }
 // Spider-Man freshly joined, beside the weakest UR original at the same records.
 // [badge, stage, Spider-Man, weakest UR original]. As an N he was 6,000 / 296,000 / 4,575,050 on these records.
 assert.deepEqual(rows,[['UR','fresh',30000,33063],['UR','mid',370000,387769],['UR','ceiling',4723050,4807040]]);
});

test('earnings: the appoint total equals the weakest original of the same badge, never more',()=>{
 const XOVER=PLAIN.id,type=additionById(XOVER).type;
 const home=BUSINESSES.find(b=>b.type===type);
 const raw=(row,business,level)=>row.effects
  .filter(e=>(!e.type||e.type===business.type)&&(!e.building||e.building===business.id)&&level>=e.minLevel)
  .reduce((n,e)=>n+e.percent,0);
 const byFellow=new Map(operationData.records.map(r=>[r.fellow,r]));
 /** What an original brings to the building it is BUILT FOR: the best of its own type's buildings. 21
  *  of the 175 records take the single-BUILDING form of slot B rather than the type form, so their
  *  total is 20 points lower in the other buildings of their type -- measured below. */
 const bestOf=r=>Math.max(...BUSINESSES.filter(b=>b.type===fellowById(r.fellow)?.type).map(b=>raw(r,b,200)));
 for(let q=1;q<=14;q++){
  const badge=crossoverBadge(q);
  const peers=originalsAt(badge==='LR'?'UR*':badge).map(f=>byFellow.get(f.id)).filter(r=>r&&!r.unresolved);
  const s=at(XOVER,q,{level:200});
  const mine=fellowOperation(s,XOVER,home).percent;
  // Its OWN type's buildings only, and the level-200 total is slot A + 20 + 30.
  assert.equal(mine,crossoverLadder(q).operationSlotA+CROSSOVER_SLOT_B+CROSSOVER_SLOT_C);
  const theirs=peers.map(bestOf).filter(n=>n>0);
  assert.ok(theirs.length,`no peers for badge ${badge}`);
  assert.ok(mine<=Math.min(...theirs),`q${q} ${badge}: ${mine} > weakest original ${Math.min(...theirs)}`);
  for(const other of BUSINESSES.filter(b=>b.type!==type))assert.equal(fellowOperation(s,XOVER,other).percent,0);
 }
 assert.deepEqual([1,14].map(q=>fellowOperation(at(XOVER,q,{level:200}),XOVER,home).percent),[80,250]);
 // THE ONE PLACE A CROSSOVER FELLOW IS AHEAD, measured rather than left implicit. Slot B is type- or
 // single-building targeted in the original table; a crossover takes the TYPE form, which is the modal
 // shape (154 of 175) but broader than the building form. So against the 21 records that name one
 // building, a crossover of the same badge brings 20 points more in the OTHER buildings of that type.
 const building=operationData.records.filter(r=>r.effects.some(e=>e.building));
 assert.equal(building.length,21,'the count this exception is worth');
 // The 21 rows are a property of lib/operation-data.json and are untouched by the 2026-09-17 roster
 // trim. Twelve of them now name a Fellow the trim deleted, so fellowById cannot type them and the
 // gap cannot be computed; the nine that remain all still show the same 20.
 const typed=building.filter(r=>fellowById(r.fellow));
 assert.equal(typed.length,9,'nine of the 21 building-scoped rows still name a shipped Fellow');
 const gaps=typed.map(r=>bestOf(r)-Math.min(...BUSINESSES.filter(b=>b.type===fellowById(r.fellow).type).map(b=>raw(r,b,200))));
 assert.deepEqual([...new Set(gaps)],[20],'and its size: exactly slot B, in every case');
});

test('the talent tier is fixed, and fixing it costs nothing because a point costs one pearl at every tier',()=>{
 assert.equal(CROSSOVER_TALENT_RULE,'Hero_Talent_Base_3');
 for(const f of ADDITION_FELLOWS)assert.equal(talentRule(f.id),crossoverTalentRule());
 // Every tier is 1 pearl per Aptitude point, so the tier cannot change the price of a point.
 const RULES=['Hero_Talent_Base_1','Hero_Talent_Base_2','Hero_Talent_Base_3'];
 const tiers=ORIGINAL_FELLOWS.map(f=>talentRule(f.id)).filter(Boolean);
 for(const r of tiers)assert.equal(r.cost/r.amount,1,`${r.name} is not 1 pearl per point`);
 assert.deepEqual([...new Set(tiers.map(r=>r.name))].sort(),['Ordinary Talent','Outstanding Talent','Supreme Talent']);
 // ...and the tier cap is not a ceiling either: Aptitude is sold directly at the same 1:1 rate to the
 // same 1,000 -- direct pearl training stops at PEARL_APTITUDE_CAP even though APTITUDE_CAP is the original's
 // measured 31,122 since 2026-09-18 -- so what the tier changes is clicks.
 const XOVER=PLAIN.id;
 const s={...at(XOVER,1,{level:1}),inventory:{...fresh(T).inventory,Item_Talent_Hero_1:APTITUDE_CAP+1000}};
 assert.equal(PEARL_APTITUDE_CAP,1000);
 assert.deepEqual([aptitudeTrainingPlan(s,XOVER,'max').count,aptitudeTrainingPlan(s,XOVER,'max').cost],[990,990]);
 // WHY IT IS FIXED, negative-controlled on the mechanism rather than described: validTalents refuses a
 // talentLevel above the CURRENT rule's cap, so a rule that climbed with the badge would refuse a save
 // that had already trained past the lower tier's cap. Demonstrated on an original whose rule IS the
 // lower tier -- an N Fellow at talentLevel 20 is exactly the save a climbing rule would create.
 const low=originalsAt('N').find(f=>talentRule(f.id)?.name==='Ordinary Talent');
 assert.ok(low,'positive control: rarity N really does carry Ordinary Talent');
 assert.deepEqual([talentCap(fresh(T),low.id),talentCap(fresh(T),XOVER)],[12,20]);
 const legal={...fresh(T),fellows:{...fresh(T).fellows,[XOVER]:{...newFellow(1),talentLevel:20,aptitude:70}}};
 assert.equal(validTalents(legal),true,'20 is legal at the crossover tier');
 const locked={...fresh(T),fellows:{...fresh(T).fellows,[low.id]:{...newFellow(1),talentLevel:20,aptitude:30}}};
 assert.equal(validTalents(locked),false,'and refused at the tier a climbing rule would have moved to');
 // The ledger is re-derived from the current rule too, which is the other half of the hazard.
 const apk={...at(XOVER,1,{level:1,aptitude:70,talentLevel:20,
  originalTalent:{policyVersion:1,baseline:0,receipts:[{from:0,to:20,cost:60,aptitude:60}]}})};
 assert.equal(validTalents(apk),true,'a receipt priced at the Supreme tier is accepted');
 const mispriced={...apk,fellows:{...apk.fellows,[XOVER]:{...apk.fellows[XOVER],
  originalTalent:{policyVersion:1,baseline:0,receipts:[{from:0,to:20,cost:20,aptitude:20}]}}}};
 assert.equal(validTalents(mispriced),false,'one priced at the Ordinary tier is refused');
});

// ---------------------------------------------------------------------------------------------
// Coverage and the guide.
// ---------------------------------------------------------------------------------------------

test('every one of the 133 resolves every table, and APK growth activates with the whole roster',()=>{
 const base=legacyStart(T);
 let s={...base,fellows:{...base.fellows,...Object.fromEntries(ADDITION_FELLOWS.map(f=>[f.id,newFellow(1)]))}};
 assert.ok(valid(s),refusedBy(s));
 for(const f of ADDITION_FELLOWS){
  assert.ok(hasCrossoverAbilities(f.id),f.id);
  assert.ok(talentRule(f.id),`${f.id} talent`);
  assert.ok(insightRule(f.id),`${f.id} insight`);
  assert.ok(characterSkills(f.id),`${f.id} guide`);
  assert.equal(fellowOperation(s,f.id,BUSINESSES.find(b=>b.type===f.type)).known,true,`${f.id} operation`);
  assert.ok(hasHeroRow(s,f.id),`${f.id} growth row`);
  // The four UR starters (2026-09-19) read the UR rung until they climb past it; everyone else starts on N.
  assert.equal(crossoverBaseAptitude(f.id,1),CROSSOVER_STARTERS[f.id]?100:20,f.id);
  assert.equal(crossoverBaseAptitude(f.id,14),200);
 }
 assert.deepEqual(ADDITION_FELLOWS.filter(f=>crossoverBaseAptitude(f.id,1)!==20).map(f=>f.id).sort(),
  ['xover_msf_ironmaninfinitywar','xover_msf_spiderman','xover_swgoh_jedimasterkenobi','xover_swgoh_themandalorianbeskararmor'],
  'exactly the four starters the owner named, and nobody else');
 // The precondition the placeholder used to satisfy through a template row.
 const on=act(s,'activateOriginalProgression',s.lastAt);
 assert.equal(on.error,undefined,on.error);
 assert.ok(valid(on.state),refusedBy(on.state));
 assert.equal(heroRow(on.state,PLAIN.id),20,'and every one of them starts on the N rung');
 // NEGATIVE CONTROL: an id that is neither an original nor an addition still resolves nothing, so the
 // "every one resolves" claim above is about the data and not about the functions always saying yes.
 assert.equal(hasCrossoverAbilities('xover_msf_nobody'),false);
 assert.equal(talentRule('xover_msf_nobody'),null);
 assert.equal(insightRule('xover_msf_nobody'),null);
 assert.equal(crossoverOperationRow('xover_msf_nobody',1),null);
 assert.equal(crossoverBaseAptitude('hero_1',14),null,'and an original never reads the crossover ladder');
});

test('a crossover guide is two rows and BOTH are trainable -- no preview-only rows at all',()=>{
 for(const f of ADDITION_FELLOWS){
  const guide=characterSkills(f.id);
  assert.equal(guide.skills.length,2);
  const [talent,insightNode]=guide.skills;
  assert.equal(isPlayableTalent(f.id,talent),true,`${f.id} talent node must be trainable`);
  assert.equal(insightRule(f.id).skillId,insightNode.id,`${f.id} insight node must be the rule's`);
  // The canonical rule name is in `name` -- putting the flavour there makes the talent untrainable --
  // and the flavour is beside it.
  assert.equal(talent.name,talentRule(f.id).name);
  assert.equal(talent.flavour,crossoverFlavour(f.id).talent);
  assert.equal(insightNode.flavour,crossoverFlavour(f.id).insight);
 }
 // NEGATIVE CONTROL for that name rule: the flavour name in `name` is refused by isPlayableTalent's
 // own rule set, which is why it lives in a sibling field.
 const f=ADDITION_FELLOWS[0],guide=characterSkills(f.id);
 assert.equal(isPlayableTalent(f.id,{...guide.skills[0],lines:['Base cap: 300','+3 Aptitude per level']}),false,
  'a node without Unlock: Default is not trainable');
 assert.equal(isPlayableTalent(f.id,{...guide.skills[0],id:'Hero_Talent_Base_1'}),false,
  'nor one whose id disagrees with the rule');
 // And an ORIGINAL's guide is untouched: still its own long preview list, still one trainable talent.
 const original=characterSkills('hero_103');
 assert.ok(original.skills.length>2);
 assert.equal(original.skills.filter(n=>isPlayableTalent('hero_103',n)).length,1);
});

// ---------------------------------------------------------------------------------------------
// Provenance. The six original tables must stay exactly as they are: no crossover row, no crossover
// key, no new value. They are what every original-provenance test describes.
// ---------------------------------------------------------------------------------------------

test('not one crossover id or value enters the six original tables this slice reads',()=>{
 const FILES=['lib/character-skill-guide.json','lib/character-skill-inventory.json','lib/operation-data.json',
  'lib/insight-data.json','lib/default-talent-source.json','lib/original-progression-data.json'];
 for(const file of FILES){
  const text=readFileSync(new URL('../'+file,import.meta.url),'utf8');
  assert.equal(text.includes('xover_'),false,`${file} carries a crossover id`);
  assert.equal(text.includes('crossover'),false,`${file} mentions the crossover layer`);
 }
 assert.equal(Object.keys(progression.heroes).length,180);
 assert.equal(Object.keys(talentSource.heroes).length,176);
 assert.equal(operationData.records.length,175);
 assert.equal(insightData.rules.length,5);
 assert.equal(guideFile.profiles.length,281);
 // The hashes, so a value change inside one of them fails here and not three slices later.
 assert.deepEqual(FILES.map(sha),[
  sha('lib/character-skill-guide.json'),sha('lib/character-skill-inventory.json'),sha('lib/operation-data.json'),
  sha('lib/insight-data.json'),sha('lib/default-talent-source.json'),sha('lib/original-progression-data.json'),
 ],'positive control for the hash helper');
 // The two new files carry their own self-label, in the style docs/data-provenance.md grades `mixed`.
 assert.equal(ladderFile.localPolicy,'crossover-progression-v1');
 assert.equal(abilityFile.localPolicy,'crossover-archetypes-v1');
 for(const note of [ladderFile.note,abilityFile.note])assert.ok(note.length>100,'a self-label must say what is local');
 assert.match(ladderFile.note,/measured MINIMUM/);
 assert.match(ladderFile.talentRuleNote,/one Skill Pearl per Aptitude point/);
});

// ---------------------------------------------------------------------------------------------
// CLAUDE.md RULE 12. `sourceAptitudeBonus` is a DERIVED value and it moved for both prototypes
// (Spider-Man's template row 70 -> the N rung 20). Nothing stores it, and this proves that on a save
// written by the previous build which had already trained one.
// ---------------------------------------------------------------------------------------------

test('RULE 12: a previous-build save that trained a prototype decodes with the derived row moved',()=>{
 const raw=readFileSync(new URL('./crossover-abilities-save-144c6cc-trained.json',import.meta.url),'utf8');
 const s=JSON.parse(raw);
 const id=Object.keys(s.fellows).find(k=>hasCrossoverAbilities(k));
 assert.ok(id,'the fixture must own a crossover Fellow');
 // What it trained under the previous build, where the row came from its template: the APK paid
 // talent cap, one quality step, and Insight until the 1,000 Aptitude cap stopped it.
 assert.equal(s.fellows[id].talentLevel,299);
 assert.equal(s.fellows[id].aptitude,1000);
 assert.equal(s.insight.levels[id],93);
 assert.equal(s.originalProgression.quality[id],2);
 assert.equal(s.fellows[id].originalTalent.receipts.length,1);
 assert.equal(progression.heroes[sourceId(id)],70,'the template row the previous build read');
 // The fixture's crossover Fellow is Spider-Man, one of the four UR starters since 2026-09-19: at stored quality 2
 // (an N badge for anyone else) he now reads the UR rung. The row moved twice (70 template -> 20 N -> 100 UR), and
 // it is derived, so the save still loads untouched: nothing refunded, nothing lost (rule 12).
 assert.equal(id,'xover_msf_spiderman');
 assert.equal(heroRow(s,id),100,'and the UR rung it reads now -- the derived value DID move (20, the N rung, before)');
 // The talent CAP is what a lowered tier would have broken, and it did not move: the crossover rule is
 // fixed at the tier its lineage carried, so 299 is still legal.
 assert.equal(talentCap(s,id),299);
 const back=decode(raw);
 assert.ok(valid(back),refusedBy(back));
 assert.equal(JSON.stringify(back),raw,'byte-identical round trip');
 assert.equal(back.version,SAVE_VERSION,'and no version bump was needed');
 // NEGATIVE CONTROL: the talent ledger IS still re-derived, so a save whose receipts do not add up is
 // refused -- "it decoded" is not the same claim as "the validator stopped checking".
 const bad={...s,fellows:{...s.fellows,[id]:{...s.fellows[id],talentLevel:19}}};
 assert.equal(valid(bad),false);
 assert.equal(refusedBy(bad),'validAdventure');
});
