import test from 'node:test';import assert from 'node:assert/strict';
import {legacyStart,grantFragments} from './progression-helpers.mjs';
import {readdirSync,readFileSync} from 'node:fs';
import {act,valid,totalRate} from '../lib/game.mjs';
import {enterpriseBreakdown,enterpriseRate,businessBonus,BUSINESSES} from '../lib/businesses.mjs';
import {blessingCost} from '../lib/progression.mjs';
import {ACTIONS_PER_SLOT} from '../lib/fathoms.mjs';
import {latencyBonus} from '../lib/latency.mjs';
import {familyStellaYield} from '../lib/family-stella.mjs';
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
 let s=funded(legacyStart(NOW),costOf('Building_101'));
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
   let s=inn();if(!s.fellows.hero_1)s=run(s,'recruit','hero_1');
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

 {id:'latency',key:'latency',declaredIn:'app/latency-panel.tsx "village earnings, at every business"',
  probe(){ // Latency needs an Intimacy-gated cap AND a successful Stimulate; the roll is seeded, so
   // this loop is deterministic -- at an empty bar the original's own chance is 80%.
   let s=inn();
   const id=Object.keys(s.family)[0];
   const totals=Object.fromEntries(Object.entries(s.habits.totals).map(([k,v])=>[k,{...v,actions:0}]));
   totals.health={...totals.health,actions:2000};
   s={...s,habits:{...s.habits,totals},family:{...s.family,[id]:{...s.family[id],intimacy:50000}}};
   s=run(s,'latencyLevel',id);
   for(let i=0;i<20&&!latencyBonus(s);i++)s=run(s,'latencyStimulate',id,1);
   assert.ok(latencyBonus(s)>0,'fixture never landed a Stimulate');
   return s;}},

 {id:'stella',key:'stella',declaredIn:'app/family-stella-panel.tsx "All Building Earnings"',
  probe(){ // Family Stella's `city | yield percent` halo (WifeSpirit NewHalo_1), recorded in the 5th
   // column of every rank row since the import and paid since 2026-09-22. wife_112 reaches it at
   // rank 1 for 20 shards, which is the cheapest route to a non-zero yield on any member.
   let s=inn();
   s={...s,family:{...s.family,wife_112:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}}};
   s=grantFragments(s,'hero_74');            // a pooled ladder, so this funds the shared village pool
   s=run(s,'familyStellaActivate','wife_112');
   s=run(s,'familyStellaUpgrade','wife_112',1);
   assert.ok(familyStellaYield(s)>0,'fixture reached no city-yield rank');
   return s;}},

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
 ['wayfarer-profile.tsx','Reads village earnings, never adds to them: the player-rank promotion requirement (openingProsperity vs rankEarnings), shown beside the Promote button with a link to Businesses.'],
 ['apothecary-panel.tsx','Navigation prose only ("Go to village earnings"), promising nothing.'],
 ['family-overview.tsx','A READ-ONLY view over strands other files already declare: it prints fathomBonus() per class, latencyBonus() and familyStellaYield(), and adds nothing to any of them. Added 2026-09-23 with docs/family-screen-specs/12-family-list.md, which moves the "Across the whole family" sentences off the per-member panels and onto one account-level surface — so the totals it shows are exactly the `family`, `latency` and `stella` strands, declared in fathom-panel.tsx, latency-panel.tsx and family-stella-panel.tsx respectively. If this file ever starts ADDING a bonus rather than reading one, it needs its own probe instead of this entry.'],
 ['village-events-panel.tsx','Reads village earnings, never adds to them. CitySpecialEventManage CSEM_1-6 are earnings GOALS (70,000 -> 5,000,000 gold/s) that the panel compares totalRate against; reaching one pays items into the bag. Nothing in lib/village-events.mjs touches businessBonus or any rate.'],
 ['blessing-panel.tsx','The opposite of a promise: blessings affect Fellow and party Power, NOT village earnings. Honest, and nothing to wire. Since 2026-09-23 the denial is a SOURCE COMMENT rather than on-screen prose -- docs/family-screen-specs/07-blessing.md retires the 105-word rules-note that used to carry it, and the original\'s Blessing panel has no such sentence. The scan reads file text, so the comment keeps this entry live; if it is ever deleted, this test fails rather than the claim quietly disappearing.'],
 ['fishing-artifacts.tsx','The three "All Building Earnings +20% (+5% a level)" antiques (A2503/A3501/A4502, FishArtifact.json -> SkillBase target=city, conditionType=all). They multiply inside buildingRate beside potionYield, which is the same shape the original gives them and the same place the potions land, so they raise the legacy starter buildings and NOT businessBonus. Wiring them into the business stack would be a second, unmeasured channel: the original applies one city-scoped percent to every building, and Everkai`s business multiplier is a different stack with its own strands. The panel says exactly this.'],
 ['trading-post.tsx','My Counter (CommercialWarTax, 200 rows) READS village earnings and never adds to them: it is a separate store that accrues totalRate x taxBuff/10000 a second up to taxTimeLimit seconds, and pays the player in gold on collect (lib/trading-post-ladders.mjs taxRate/taxStored). Motivate (CommercialWarCourage) likewise only PRICES itself in seconds of village income. Neither touches businessBonus or buildingRate. The fishing artifacts that genuinely DO raise building earnings (A2503/A3501/A4502, "All Building Earnings +20%") multiply inside buildingRate beside potionYield instead, exactly as the original`s target=city/conditionType=all skills do, and fishing-panel.tsx is where that is claimed.'],
 // The claim MOVED FILE on 2026-09-23 and did not change: the Family surface's eleven-page pager
 // became the original's five icon tabs (docs/family-screen-specs/02-member-shell.md), so the
 // `Family skill` block left family-panel.tsx's deleted Profile page for the `Blessing` tab in
 // family-training.tsx. Same sentence, same mechanic, same reason it is not a business strand.
 ['family-training.tsx','BUG-12, resolved by retiring the promise rather than wiring it. familyBonus (progression.mjs:23) multiplies into buildingRate only, which serves the legacy starter buildings, and the panel now says so. It is NOT wired into businessBonus on purpose: F16 records that Family Fathoms is the original\'s family-earnings channel (WifeQuenching*, sha-matched) and already feeds businessBonus as the `family` strand, so adding familyBonus would double-count the family contribution. An earlier version of this entry also cited SL1-13\'s x334.0 overshoot as a second reason; that figure was REFUTED 2026-09-13 as a fixture artefact (it needs welcomeAll, which is test-only, plus 82.8 years of Fathom practice), and the stack is in fact short at every reachable state. The double-count is the whole argument and does not need it.'],
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
 for(const f of ['apothecary-panel.tsx','blessing-panel.tsx','family-training.tsx','farm-panel.tsx',
                 'fathom-panel.tsx','habit-panel.tsx','family-stella-panel.tsx','latency-panel.tsx'])
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

// BUG-12, resolved by RETIRING the promise rather than wiring it, and this test now pins that
// choice rather than the defect. familyBonus (progression.mjs:23) multiplies into buildingRate only.
// Wiring it into businessBonus would have been wrong twice over:
//   F16    -- Family Fathoms is the original's family-earnings channel (WifeQuenching*, sha-matched
//             in docs/data-provenance.md:99) and ALREADY feeds businessBonus as the `family` strand,
//             so familyBonus on top would double-count the family contribution.
//   SL1-13 -- measured the stack at x334.0 against the original Inn's x206.4. REFUTED 2026-09-13:
//             that figure needs 105 family members at 36 maxed slots, which takes welcomeAll
//             (test-only) and 82.8 years of Fathom practice. At reachable states the stack is SHORT
//             (1yr x127.8, 3yr x135.4, 10yr x162.0). The argument below does not rest on it: the
//             double-count with Fathoms stands on its own.
// So the panel and the bless message now say what is true: the family skill raises the legacy
// starter buildings, and Fathoms is what reaches the businesses.
test('the family skill raises the starter buildings and deliberately does NOT reach a business',()=>{
 let s=inn();
 const id=Object.keys(s.family)[0];
 s={...s,family:{...s.family,[id]:{...s.family[id],points:blessingCost(s.family[id])}}};
 const beforeRate=totalRate(s),before=enterpriseBreakdown(s,'Building_101');
 const blessed=run(s,'bless',id);
 const after=enterpriseBreakdown(blessed,'Building_101');
 // It is a real bonus -- on the buildings it actually serves.
 assert.ok(totalRate(blessed)>beforeRate,
  'familyBonus must still raise buildingRate; if this fails the mechanic was removed, not just the claim');
 // ...and it must stay out of the business stack, or the family contribution is counted twice.
 assert.equal(after.bonus,before.bonus,
  'blessing moved the business multiplier. familyBonus must NOT reach businessBonus: Family Fathoms '
  +'(F16) is already the family strand there, so adding familyBonus counts the family contribution '
  +"twice. If this is now intended, retire Fathoms' family strand first.");
 assert.equal(after.familyBonus,before.familyBonus,'the family strand is Fathoms, and blessing is not Fathoms');
 // Once wired, the claim scan must keep every promising panel mapped to a live strand.
 for(const f of earningsClaims()){
  if(NOT_A_BUSINESS_STRAND.has(f))continue;
  assert.ok(STRANDS.some(x=>x.declaredIn.includes(f)),
   `${f} promises village earnings but names no strand in STRANDS. Add its probe, or record it in `
   +`NOT_A_BUSINESS_STRAND with the reason it is not part of the business multiplier.`);
 }
});
