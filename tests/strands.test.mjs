import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {startingSave,act,valid} from '../lib/game.mjs';
import {enterpriseBreakdown,enterpriseRate,businessBonus,BUSINESSES} from '../lib/businesses.mjs';
import {blessingCost} from '../lib/progression.mjs';
import {ACTIONS_PER_SLOT} from '../lib/fathoms.mjs';
import {staffed,funded,costOf} from './gear-fixtures.mjs';

// Every strand the game DECLARES as a village-earnings bonus must actually reach a business.
//
// The bug class this exists for: a strand that is real in every way except the one that matters --
// it has state, it is computed, a panel shows the player a percentage, an action's message promises
// "+1% village earnings" -- and it reaches no business at all. `familyBonus` (progression.mjs:23) is
// exactly that today: game.mjs:104 multiplies it into `buildingRate`, which serves only the three
// legacy starter buildings (catalog.mjs:12 -- fish, inn, garden), and never into `businessBonus`
// (businesses.mjs:56), which is what the 17 real businesses use. Measured: raising every family
// member's skill to 20 (+2,100%) moves `enterpriseRate` by exactly 0, and `totalRate` by 0.837%.
//
// Neither dispatch.test.mjs nor the per-strand suites can catch this. dispatch.test.mjs proves the
// `bless` ACTION is reachable from app/ -- it is. fathoms/farm-yield each prove THEIR OWN strand
// lands. Nothing asserts the set is complete, so a strand can be declared and never wired.
//
// SCOPE: the multiplier stack only -- what `businessBonus` sums. The employee-rate strands (Inn
// treasures, fishing combinations) take a different route into `enterpriseBreakdown.employees` and
// have their own coverage in inn-guests.test.mjs and fishing-employees.test.mjs.
//
// THIS FILE IS EXPECTED TO FAIL on the current tree, on one assertion, naming `familyBonus`. It
// asserts what should be true rather than what is, because a test pinning the defect in place is
// worth nothing. To green it, either wire familyBonus into businessBonus, or stop promising village
// earnings in app/family-panel.tsx and game.mjs:179 -- see docs/slice-buildings.md 5d.

const NOW=1767225600000; // fixed local day, so habitDay() is stable across runs
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,String(r.error));return r.state};
const LIB=new URL('../lib/',import.meta.url),APP=new URL('../app/',import.meta.url);
const read=(dir,f)=>readFileSync(new URL(f,dir),'utf8');
const INN=BUSINESSES.find(b=>b.id==='Building_101'); // Diligent, 50 gold, the cheapest to open

/** An open, staffed Inn on a fresh save. Staff is seeded, not hired: the real curve charges 1.8e13
 *  for 5,000 Inn workers and is UNSAFE past ~4,600, which would bury what these probes measure. */
function inn(){
 let s=funded(startingSave(NOW),costOf('Building_101'));
 s=run(s,'openEnterprise','Building_101');
 return staffed(s,'Building_101',200);
}
const bonusOf=s=>enterpriseBreakdown(s,'Building_101').bonus;

/** The strands `businessBonus` declares, each with the probe that should move the Inn's multiplier.
 *  `key` is the name the strand carries in businessBonus's returned object, or null when it is summed
 *  straight into `total` with no key of its own (appoint skills are the one such strand). */
const STRANDS=[
 {id:'assignedOperation',key:null,declaredIn:'app/business-panel.tsx "assigned operation"',
  probe(){ // hero_1 at level 50 carries Diligent +30% and an Inn-specific +20%: operations.test.mjs
   let s=run(inn(),'recruit','hero_1');
   s={...s,fellows:{...s.fellows,hero_1:{...s.fellows.hero_1,level:50,breaks:3}}};
   return run(s,'assignOperator','Building_101','hero_1');}},

 {id:'quality',key:'quality',declaredIn:'app/business-panel.tsx "quality"',
  probe(){ // yieldRise is real data but gated: staffingStatus returns null without apkStaffing, which
   // needs originalProgression(s). docs/backlog.md "Quality/yieldRise is unreachable outside APK".
   let s=run(inn(),'activateOriginalProgression');
   s=run(s,'startPaidStaffing','Building_101');
   s=run(s,'claimStaffingMaterials');
   return run(s,'upgradeStaffQuality','Building_101');}},

 {id:'family',key:'family',declaredIn:'app/fathom-panel.tsx, app/business-panel.tsx "Family Fathoms"',
  probe(){ // Fathoms need BOTH gates: the intimacy threshold and cumulative habit practice.
   let s=inn(),done=0;
   for(const x of s.habits.items.filter(x=>x.freq==='daily')){
    if(done>=1)break;const r=act(s,'habitComplete',s.lastAt,x.id);if(!r.error){s=r.state;done++}}
   assert.ok(done>0,'fixture completed no daily habit');
   const totals=Object.fromEntries(Object.entries(s.habits.totals).map(([k,v])=>[k,{...v,actions:0}]));
   totals.health={...totals.health,actions:ACTIONS_PER_SLOT};
   const id=Object.keys(s.family)[0];
   s={...s,habits:{...s.habits,totals},family:{...s.family,[id]:{...s.family[id],intimacy:5000}}};
   return run(s,'fathomAdvance',id,1);}},  // slot 1 is Diligent, like the Inn

 {id:'farm',key:'farm',declaredIn:'app/farm-panel.tsx "+X% village earnings from every building"',
  probe(){let s=run(inn(),'openFarm');
   return run({...s,farm:{...s.farm,knowledge:20000}},'farmYieldUpgrade');}},
];

/** What lib/businesses.mjs actually sums, read out of the source rather than assumed. Named keys come
 *  from the returned object; unkeyed strands are the function calls inside the `total:` expression. */
function declaredStrands(){
 const src=read(LIB,'businesses.mjs');
 const body=src.slice(src.indexOf('export function businessBonus('));
 const ret=body.slice(body.indexOf('return {'),body.indexOf('\n}'));
 const total=ret.slice(ret.indexOf('total:'));
 const found=new Set();
 // Zero-width delimiters on purpose: `{quality,family,farm}` shares one comma between each pair, so
 // a pattern that CONSUMES the delimiter matches only every other key. The guard test below caught
 // exactly that in this file's first draft -- it reported 3 strands and silently dropped `family`.
 for(const m of ret.matchAll(/(?<=[{,])\s*([A-Za-z][A-Za-z0-9]*)\s*(?=[,:])/g))if(m[1]!=='total')found.add(m[1]);
 for(const m of total.matchAll(/([A-Za-z][A-Za-z0-9]*)\(/g))found.add(m[1]);
 return found;
}

/** Every app/ file that mentions village earnings at all. Deliberately broad and case-insensitive:
 *  the first draft matched "% village earnings" and silently missed habit-panel's
 *  "Village earnings x1.50" -- and the whole job here is to notice a NEW promise nobody wired.
 *  Files that mention earnings without promising a business bonus are listed, with the reason, in
 *  NOT_A_BUSINESS_STRAND rather than narrowing the pattern back down. */
function earningsClaims(){
 return readdirSync(APP).filter(f=>/\.tsx?$/.test(f))
  .filter(f=>/village earnings/i.test(read(APP,f))).sort();
}

/** Files that mention village earnings without promising a business-multiplier strand, each with why.
 *  An entry here is a claim that it is NOT this file's business -- so each one states its reason. */
const NOT_A_BUSINESS_STRAND=new Map([
 ['habit-panel.tsx','The habit multiplier, applied outside the bonus stack by effectiveRate/accrue (game.mjs:109-112). It scales the whole village rate, businesses included, so it is real income but not an additive strand.'],
 ['apothecary-panel.tsx','Navigation prose only ("Go to village earnings"), promising nothing.'],
 ['blessing-panel.tsx','The opposite of a promise: it states outright that blessings affect Fellow and party Power, NOT village earnings. Honest, and nothing to wire.'],
]);

test('the source extractors still work (a drifted pattern must fail loudly, not pass vacuously)',()=>{
 // Without this guard every assertion below passes when a regex stops matching -- the failure mode
 // is silence, which is exactly how familyBonus stayed unwired through 654 green tests.
 const declared=declaredStrands();
 assert.ok(declared.size>=4,`extracted only ${declared.size} strands from businessBonus; the pattern has drifted`);
 for(const [known,shape] of [['quality','named key'],['family','named key'],['farm','named key'],
                             ['assignedOperation','unkeyed call inside total:']])
  assert.ok(declared.has(known),`extractor missed ${known}; the ${shape} pattern has broken`);
 // ...and the UI-claim scan, whose whole job is to notice a NEW promise nobody wired.
 const claims=earningsClaims();
 assert.ok(claims.length>=6,`found only ${claims.length} village-earnings claims in app/; the pattern has drifted`);
 for(const f of ['apothecary-panel.tsx','blessing-panel.tsx','family-panel.tsx','farm-panel.tsx',
                 'fathom-panel.tsx','habit-panel.tsx'])
  assert.ok(claims.includes(f),`claim scan missed ${f}; the prose pattern has broken`);
});

test('the strand table covers exactly what businessBonus sums, in both directions',()=>{
 const declared=declaredStrands(),tabled=new Set(STRANDS.map(x=>x.key??x.id));
 const untested=[...declared].filter(x=>!tabled.has(x)).sort();
 assert.deepEqual(untested,[],
  `businessBonus sums these, but no probe in STRANDS proves they reach a business:\n`
  +untested.map(x=>`  ${x}`).join('\n')
  +`\n\nAdd a probe, so a strand cannot ship computed-but-unreachable.`);
 const stale=[...tabled].filter(x=>!declared.has(x)).sort();
 assert.deepEqual(stale,[],`STRANDS lists these, but businessBonus no longer sums them — drop them:\n${stale.join('\n')}`);
});

test('every strand in the multiplier stack moves a real business',()=>{
 for(const strand of STRANDS){
  const after=strand.probe(),before=inn();
  assert.ok(valid(after),`${strand.id}: probe produced an invalid save`);
  assert.ok(bonusOf(after)>bonusOf(before),
   `${strand.id} is summed by businessBonus and declared in ${strand.declaredIn}, but exercising it `
   +`left the Inn's bonus at ${bonusOf(after)} — it reaches no business.`);
  // A strand that moves the multiplier must move the money, and both income paths must agree.
  assert.ok(enterpriseBreakdown(after,'Building_101').total>enterpriseBreakdown(before,'Building_101').total,`${strand.id}: bonus moved but income did not`);
  assert.equal(enterpriseRate(after),Object.keys(after.enterprises).reduce((n,id)=>n+enterpriseBreakdown(after,id).total,0),`${strand.id}: enterpriseRate and enterpriseBreakdown drifted apart`);
 }
});

test('the breakdown accounts for its own multiplier: named strands never exceed the total charged',()=>{
 // The panel subtracts the named strands from `bonus` to display "assigned operation", so a named
 // strand that is not in `bonus` would render a negative percentage to the player.
 for(const strand of STRANDS){
  const row=enterpriseBreakdown(strand.probe(),'Building_101');
  for(const key of ['qualityBonus','familyBonus','farmBonus'])assert.ok(key in row,`breakdown is missing ${key}`);
  const named=row.qualityBonus+row.familyBonus+row.farmBonus;
  assert.ok(row.bonus>=named-1e-9,`${strand.id}: named strands (${named}) exceed the charged bonus (${row.bonus})`);
 }
});

// Marked todo, not deleted: check.yml runs `pnpm test` on every push, so leaving this red would
// fail the build for everyone. node:test reports a todo failure without failing the run, so the
// defect stays documented and measurable. Drop the flag the moment familyBonus reaches businessBonus.
test('every village-earnings promise in app/ reaches a business — THIS IS THE familyBonus DEFECT',{todo:'familyBonus (progression.mjs:23) reaches only buildingRate; wire it into businessBonus or retire the promise'},()=>{
 // Each panel that promises the player a village-earnings percentage must be backed by a strand the
 // businesses actually charge. app/family-panel.tsx:33 renders "+{member.skill}% village earnings"
 // and game.mjs:179 answers `bless` with "Family skill improved: +1% village earnings." Both are
 // paid by familyBonus (progression.mjs:23), which game.mjs:104 multiplies into buildingRate only.
 let s=inn();
 const id=Object.keys(s.family)[0];
 s={...s,family:{...s.family,[id]:{...s.family[id],points:blessingCost(s.family[id])}}};
 const before=enterpriseBreakdown(s,'Building_101');
 const after=enterpriseBreakdown(run(s,'bless',id),'Building_101');
 assert.ok(after.bonus>before.bonus,
  'app/family-panel.tsx and game.mjs:179 promise the player "+1% village earnings" for a family '
  +'skill, but familyBonus (progression.mjs:23) is multiplied only into buildingRate (game.mjs:104), '
  +'which serves the three legacy starter buildings. It never reaches businessBonus '
  +'(businesses.mjs:56), so none of the 17 businesses charge it: the Inn bonus stayed at '
  +`${before.bonus}. Measured ceiling if wired: +2,100% across 105 family members; measured effect `
  +'today: 0.837% of totalRate. Fix by adding it to businessBonus, or stop making the promise.');
 // Once wired, the claim scan must keep every promising panel mapped to a live strand.
 for(const f of earningsClaims()){
  if(NOT_A_BUSINESS_STRAND.has(f))continue;
  assert.ok(STRANDS.some(x=>x.declaredIn.includes(f))||f==='family-panel.tsx',
   `${f} promises village earnings but names no strand in STRANDS. Add its probe, or record it in `
   +`NOT_A_BUSINESS_STRAND with the reason it is not part of the business multiplier.`);
 }
});
