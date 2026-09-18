// The default-mode village-earnings ceiling, built ONCE so the flag-off and flag-on numbers come from
// the same code (CLAUDE.md rule 1: both halves of a ratio come from the same source).
//
// Stages 0-3 reproduce tests/fellow-power.test.mjs's pinned ceiling exactly -- 2,269,308 -> 4,484,008
// -> 6,684,380 -> 6,965,719 -- and that reproduction IS the positive control for anything measured on
// top of it (CLAUDE.md rule 2). The flag-on variant seats the crossover Fellows this build actually
// ships -- recruited at the counter and maxed like the rest -- plus the 30 crossover Family welcomed
// and trained on the shipped default 36/24 blessing ladder, and adds stage 4: their shared Stella
// shard track (lib/crossover-stella.mjs), which is the equivalent bonus track of
// docs/crossover-plan.md order of work 6. Stage 4 is a no-op with the flag off.
//
// Imported by tests/crossover-family.test.mjs (no flag) and tests/crossover-family-village.mjs
// (?crossover=1, in its own process because the catalogue reads the flag once at import).
import {withItems,grantFragments,allKeepsakes,stockConsumable} from './progression-helpers.mjs';
import {startingSave,act,valid,refusedBy} from '../lib/game.mjs';
import {rosterOperation} from '../lib/businesses.mjs';
import {GEAR,STAR_CAP,CONSUMABLES,newFellow,bondedPower} from '../lib/adventure.mjs';
import {ARTIFACT_CAP} from '../lib/artifacts.mjs';
import {ARTIFACT_ECHOES} from '../lib/artifact-echo.mjs';
import {STELLA_PROFILES,stellaState,stellaActivation,stellaEntry,CROSSOVER_STELLA,crossoverStella,stellaAppointBp} from '../lib/stella.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {BUSINESSES,enterpriseState,enterpriseRate,businessBonus} from '../lib/businesses.mjs';
import spiritData from '../lib/hero-spirit-data.json' with {type:'json'};

const NOW=1767225600000;                 // the same fixed day tests/fellow-power.test.mjs uses
const BEST=GEAR.slice().sort((a,b)=>b.aptitude-a.aptitude)[0];
const maybe=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);return r.error?s:r.state};
const maxedRecords=s=>({...s,fellows:Object.fromEntries(Object.keys(s.fellows).map(id=>
 [id,{level:750,aptitude:1000,skill:20,breaks:13,gear:BEST.id,stars:STAR_CAP,gearLevel:ARTIFACT_CAP}]))});
const FRESH_FAMILY={intimacy:0,blessingPower:10,points:0,skill:0,relationship:1};

/** @param {{crossover?:boolean,family?:boolean}} options `family:false` seats the
 *  crossover FELLOWS but not the 30 crossover Family, which is what isolates the Family blessing
 *  contribution. */
export function buildCeiling({crossover=false,family=true}={}){
 const notes={};
 let s=maybe(startingSave(NOW),'recruitAll');
 if(crossover){
  // The crossover FELLOWS this build ships. They are the only recipients a crossover Family member
  // blesses, and blessingPower is summed per Fellow IN THE ROSTER -- so without them in s.fellows the
  // Family side contributes exactly zero to rosterOperation and the measurement would be vacuous.
  // recruitAll deliberately skips additions (their storyline is the unlock), so the counter is used.
  s={...s,summon:{policyVersion:1,seq:0,stoneFragments:0,stones:0,insigniaFragments:0,valiant:99,archangel:99,starShards:0,days:[],weeks:[],recruited:[]}};
  for(const f of FELLOWS.filter(f=>f.addition)){
   const before=s;s=maybe(s,'summonRecruit',f.id,{seq:s.summon.seq});
   if(s===before)s={...s,fellows:{...s.fellows,[f.id]:newFellow()}};
  }
  notes.crossoverFellows=FELLOWS.filter(f=>f.addition).length;
 }
 s=maxedRecords(s);
 s=maybe(allKeepsakes(s),'acceptMuseum');
 s=maybe(s,'adoptFamiliars');
 let bound=0;
 for(const pet of Object.keys(s.familiars||{})){
  const fellow=Object.keys(s.fellows)[bound];if(!fellow)break;
  const next=maybe(s,'bindFamiliar',pet,fellow);
  if(next!==s){s=maybe(next,'activateFamiliarNodes',pet);bound++}
 }
 s={...s,familiars:Object.fromEntries(Object.entries(s.familiars).map(([id,p])=>[id,{...p,level:Math.max(450,p.level)}]))};
 const stage0=Math.round(rosterOperation(s));

 // Stage 1 -- STELLA. Since 2026-09-18 this is every original Fellow, not four: lib/hero-spirit.mjs
 // gives each one a per-owner profile built from the original's own HeroSpirit table. Fragments are
 // minted through the sandbox grant ledger validStella reconciles, because how they are EARNED has its
 // own pacing measurement (one shared pool, 500/day x the habit multiplier); what this stage measures is
 // the legal ceiling the tracks put in reach. `notes.stellaTracks` records how many actually maxed, so
 // a profile that silently stops being reachable shows up as a count rather than as a moved total.
 let tracks=0;
 for(const p of STELLA_PROFILES.filter(p=>s.fellows[p.id]&&stellaActivation(p.id))){
  s=maybe(s,'stellaActivate',p.id,{seq:stellaState(s).seq});
  // The WHOLE ladder is funded up front, then bought. Granting 1,000 at a time and stopping at the
  // first refusal silently left the 25 most expensive ladders part-built -- a single level near the top
  // of an 18,000-shard ladder costs more than 1,000 on its own -- and a ceiling that quietly stops
  // short is worse than no ceiling. `notes.stellaTracks` below is the guard that would have caught it.
  s=grantFragments(s,p.id,Math.ceil(p.levels.reduce((n,r)=>n+r.cost,0)/1000));
  for(let i=0;i<3;i++){
   const before=s;s=maybe(s,'stellaUpgrade',p.id,{seq:stellaState(s).seq,count:'max'});
   if(s===before)break;
  }
  if(stellaEntry(s,p.id)?.level===p.levels.length)tracks++;
 }
 notes.stellaTracks=tracks;
 const stage1=Math.round(rosterOperation(s));

 // Stage 2 -- BLESSINGS. welcomeAll seats the ORIGINAL family only.
 s=maybe(s,'welcomeAll');
 notes.originalFamily=Object.keys(s.family).length;
 if(crossover&&family){
  // The 30 are minted rather than welcomed, because `welcome` refuses an addition on purpose (the
  // storyline is the unlock) and no crossover arc data exists yet. This is the SAME five-integer
  // record lib/events.mjs writes when a stage hands one over, so it is the state a real unlock
  // produces -- and valid() is asserted below on the finished save rather than assumed.
  s={...s,family:{...s.family,...Object.fromEntries(FAMILY.filter(f=>f.addition).map(f=>[f.id,{...FRESH_FAMILY}]))}};
  notes.crossoverFamily=FAMILY.filter(f=>f.addition).length;
 }
 const points=CONSUMABLES.find(i=>i.stat==='points'&&i.target==='family');
 s=stockConsumable(s,points.id,4000);
 let funded=0;
 for(const id of Object.keys(s.family)){
  const before=s;s=maybe(s,'useConsumable',points.id,{recipient:id,count:10});
  if(s!==before)funded++;
 }
 let trained=0;
 for(const id of Object.keys(s.family))for(const key of ['flatBlessing','advancedBlessing']){
  const before=s;s=maybe(s,'trainBlessingsMax',id,key);if(s!==before)trained++;
 }
 notes.funded=funded;notes.trained=trained;
 const stage2=Math.round(rosterOperation(s));

 // Stage 3 -- ARTIFACT ECHOES.
 let enabled=0;
 for(const r of ARTIFACT_ECHOES.filter(r=>r.fellow&&s.fellows[r.fellow]&&GEAR.some(g=>g.id===r.item))){
  s={...s,fellows:{...s.fellows,[r.fellow]:{...s.fellows[r.fellow],gear:r.item,gearLevel:ARTIFACT_CAP}}};
  const before=s;s=maybe(s,'enableArtifactEcho',r.fellow);if(s!==before)enabled++;
 }
 notes.echoes=enabled;
 const stage3=Math.round(rosterOperation(s));

 // Stage 4 -- THE SHARED CROSSOVER SHARD TRACK (lib/crossover-stella.mjs). One pool, 4,500 shards per
 // crossover Fellow, Angie's own flat column. Shards are minted the way stage 1 mints fragments --
 // through the same sandbox grant ledger validStella reconciles -- because how they are EARNED has its
 // own pacing measurement (500/day x the habit multiplier, one pool); what this stage measures is the
 // legal ceiling the track puts in reach. Flag off there are no crossover Fellows, so it is a no-op and
 // the ceiling === stage3, which is what makes the flag-off control below still reproduce fellow-power.
 let shards=0;
 const crossovers=Object.keys(s.fellows).filter(crossoverStella);
 if(crossovers.length){
  s=grantFragments(s,crossovers[0],Math.ceil(crossovers.length*CROSSOVER_STELLA.levels.reduce((n,r)=>n+r.cost,0)/1000));
  for(const id of crossovers){
   s=maybe(s,'stellaActivate',id,{seq:stellaState(s).seq});
   const before=s;s=maybe(s,'stellaUpgrade',id,{seq:stellaState(s).seq,count:'max'});
   if(s!==before&&stellaEntry(s,id)?.level===CROSSOVER_STELLA.levels.length)shards++;
  }
  notes.shardTracksMaxed=shards;
 }
 const ceiling=Math.round(rosterOperation(s));
 // What the crossover Fellows are worth in the finished state, so any proposal to give them a further
 // own-power PERCENT can be priced without rebuilding the fixture: a uniform +1% across them is worth
 // exactly crossoverWorth/100 more conversion (docs/crossover-plan.md order of work 6).
 const crossoverWorth=Math.round(Object.keys(s.fellows).filter(crossoverStella).reduce((n,id)=>n+bondedPower(s,id)/1000,0));
 // *** THE COMPOUND. Added 2026-09-18, and it is the reason `ceiling` alone is not the answer. ***
 // `ceiling` is rosterOperation -- ONE of the two factors in lib/businesses.mjs's income:
 //     income = (employeeIncome + rosterOperation) x (1 + quality + family + farm + assignedOperation)
 // The Stella ledger lifts BOTH. `flat` and `selfPowerBp` lift the left factor; the imported
 // appointment column lifts `assignedOperation` inside the right one. Quoting either alone understates
 // the pair by the other's factor -- docs/isekai-power-graph.md ranked gap 7 -- so the fixture measures
 // both on ONE state and reports them side by side. Every step below is a real action through act(),
 // and valid() is asserted on the finished save, so this is a reachable state and not an injection.
 let v={...s,gold:1e15};
 for(const d of BUSINESSES)v=maybe(v,'openEnterprise',d.id);
 for(const d of BUSINESSES)for(let i=0;i<50;i++)v=maybe(v,'hireEmployees',d.id,10);
 const ids=Object.keys(v.fellows);let seat=0,operators=0;
 for(const d of BUSINESSES)for(let k=0;k<8;k++){const before=v;v=maybe(v,'assignOperator',d.id,ids[seat]);if(v===before)break;seat++;operators++}
 const strands=BUSINESSES.filter(d=>enterpriseState(v)[d.id]).map(d=>businessBonus(v,d.id,enterpriseState(v)[d.id],d).total);
 const powers=Object.keys(s.fellows).map(id=>bondedPower(s,id));
 const village={
  businesses:Object.keys(enterpriseState(v)).length,operators,
  appointBp:stellaAppointBp(v),                       // the imported column, summed over every owner
  bonusMax:Math.round(Math.max(...strands,0)),        // the biggest business multiplier reached
  goldPerSecond:Math.round(enterpriseRate(v)),        // the COMPOUNDED number: both factors together
  valid:valid(v),refusedBy:refusedBy(v),
 };
 // The per-Fellow half of the re-anchored pin: what one maxed Fellow displays, which is the number the
 // owner reported from the original (300,000,000) and the one a player actually looks at.
 const fellow={top:Math.max(...powers),weakest:Math.min(...powers),count:powers.length};
 return {stage0,stage1,stage2,stage3,stage4:stage3,ceiling,crossoverWorth,village,fellow,valid:valid(s),refusedBy:refusedBy(s),notes,state:s};
}
/** *** A PACING CHECK. NOT A PARITY TARGET. RENAMED 2026-09-18 SO IT CANNOT BE READ AS ONE AGAIN. ***
 *
 *  3,497,276 is ONE REAL PLAYER'S SAVE after a few weeks: the total Fellow power on the original's own
 *  live save (3,497,276,469), divided by the original's own recovered HeroConversionRate of 10/10000.
 *  Both halves are the original's, and the other half of every ratio below is Everkai's own
 *  rosterOperation, so the DIVISION is sound (CLAUDE.md rule 1). What was never sound is treating the
 *  quotient as a parity budget.
 *
 *  WHY, in one line, from docs/power-parity-audit.md 5: the numerator is Everkai's FULLY ASSEMBLED
 *  MAXIMUM and the denominator is an ordinary mid-game account. The two are not the same kind of
 *  number, so "1.99x over the original" was never a thing this ratio could say. The audit also records
 *  the misreading that made it look like one -- 3,497,276 was taken for a single hero's power, and it
 *  is a ROSTER TOTAL of 3.497 billion over ~150 heroes, i.e. ~23M average against a 300M top and a 5M
 *  floor, which is exactly what the owner remembers. The original's own ceiling for ONE hero is over a
 *  billion (audit 3b), three orders above this denominator.
 *
 *  KEEP USING IT for what it is good for: a stable, real, dated point that says how a maxed Everkai
 *  village compares to a real few-weeks Isekai account. A ratio that moves here is worth reporting.
 *  It is not worth blocking a slice over, and it is not a budget. */
export const ORIGINAL_LIVE_SAVE_PACING=3497276;

/** *** THE SECOND PIN, added 2026-09-18: the ORIGINAL'S OWN TABLE MAXIMUM. ***
 *
 *  Measured here rather than quoted, from the same file lib/ ships (lib/hero-spirit-data.json, resolved
 *  by scripts/import-hero-spirit.py out of HeroSpirit/SkillBase/SkillLevel), so it cannot drift from the
 *  ladders being measured against it. Both halves of the ratio are still from one source each: the
 *  numerator is Everkai's rosterOperation, the denominator is the original's own Spirit column under the
 *  original's own HeroConversionRate divisor.
 *
 *  WHAT IT IS: every one of the original's 126 Spirit tracks at its top rank, summed, converted at
 *  /1000. 13,861,950.
 *  WHAT IT IS NOT: the original's maximum. It counts ONE bucket (`extradd`) of ONE system, for the 126
 *  heroes of 181 that have it, and none of the base term, the talent stack, the percent stack, stars,
 *  museum, fishing or the account-wide floor. So it is a FLOOR on the original's own ceiling, and a
 *  ratio against it is an UPPER bound on how far over the original Everkai sits. Reading 1.94x as
 *  "Everkai is twice the original" would repeat the exact mistake this pin exists to retire. */
export const ORIGINAL_SPIRIT_TABLE_MAX=Math.round(
 spiritData.profiles.reduce((n,p)=>n+p.ranks.at(-1).flat,0)/1000);
/** The single biggest per-hero flat the original's Spirit tables reach (hero 251/253-264's rank 20:
 *  223,500,000). The per-FELLOW half of the re-anchored pin, which is the number the owner actually
 *  reported seeing -- docs/power-parity-audit.md 5 recommends exactly this as the replacement target:
 *  a Fellow's displayed Power against the original's at the same place, not a roster total against one
 *  save. His own best hero was ~300,000,000 and 70-90% of it was this one term. */
export const ORIGINAL_BEST_SPIRIT_FLAT=Math.max(...spiritData.profiles.map(p=>p.ranks.at(-1).flat));
/** The owner's own report of his best hero on the original, after a few weeks (CLAUDE.md rule 11).
 *  Kept next to the table maximum because it is the only per-hero figure that comes from a human
 *  playing the game rather than from a table. */
export const ORIGINAL_OWNER_BEST_HERO=300000000;
export const withItemsHelper=withItems;
