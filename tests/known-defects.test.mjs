import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,startingSave,act,valid,decode,totalRate} from '../lib/game.mjs';
import {BUSINESSES,sourceEmployeeYield,employeeCohorts,rosterOperation} from '../lib/businesses.mjs';
import {staffingRule,staffingStatus} from '../lib/staffing.mjs';
import {RANK_FELLOWS,summonState,recruitPrice,recruitRarity,SUMMON_COSTS} from '../lib/summon.mjs';
import {inherentFamiliarBonus} from '../lib/familiar-nodes.mjs';
import {FAMILIARS} from '../lib/familiars.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {bondedPower} from '../lib/adventure.mjs';
import sourceYield from '../lib/employee-yield-data.json' with {type:'json'};
import familiarData from '../lib/familiar-data.json' with {type:'json'};
import {funded,staffed} from './gear-fixtures.mjs';

// Four MEASURED defects, pinned AS THEY BEHAVE TODAY. Every one is filed in docs/parity-catalog.csv
// and NONE is fixed, because each remedy is an owner decision with a save-migration or a test
// rebaseline attached. So this file characterises the wrong behaviour and makes it un-driftable:
// the numbers below were produced by running this code, and a change to any of them has to be a
// deliberate edit here rather than a silent drift in lib/.
//
//   ECON-28  lib/summon.mjs:30     49 of 259 characters recruit free; the charge writes NaN
//   ECON-29  FIXED: bonds scale with stage; training charges the Cost ladders (see its section)
//   BUG-19   lib/business-data.json Museum/Clinic employee rates transposed; one building, two rates
//   ECON-02  lib/staffing.mjs:22   the building-materials faucet has no day gate and no rate limit
//
// WHERE A TEST ASSERTS THE FIX rather than the current state it carries {todo:'…'}, the idiom already
// in use at tests/strands.test.mjs:170 and tests/currency-reachability.test.mjs:180. check.yml runs
// `pnpm test` on every push, so a genuinely red test blocks every deploy for everyone; node:test
// reports a todo failure without failing the run, which keeps the defect documented and measurable.
// Drop each flag the moment its defect is fixed -- the test then goes green on its own.
//
// WHAT THIS FILE IS NOT. It does not re-prove per-system behaviour that already has a suite:
// tests/summon-recruit.test.mjs covers pricing, tests/familiar-nodes.test.mjs covers node effects,
// tests/employee-yields.test.mjs covers the two-cohort split, tests/staffing.test.mjs covers the
// quality ladder. Each defect below is invisible to those files, and the reason why is stated at it.

const LIB=new URL('../lib/',import.meta.url);
const read=f=>readFileSync(new URL(f,LIB),'utf8');
const NOW=1767225600000;                 // fixed local day, so habit-derived state is stable
const T=1000;                            // fixed clock for the fixtures that never advance time
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,String(r.error));return r.state};
const maybe=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);return r.error?s:r.state};
/** summonRecruit is {seq}-guarded and answers "Summon rewards changed. Try again." otherwise, so
 *  every call has to carry the wallet's current sequence number rather than a bare target. */
const recruit=(s,id)=>act(s,'summonRecruit',s.lastAt,id,{seq:summonState(s).seq});

// =============================================================================================
// EXTRACTOR GUARDS FIRST. Four of the assertions below read lib source or lib data as text. If any
// of those patterns drifts, the tests that depend on it would pass while proving nothing at all --
// which is precisely how each of these four defects survived 689 green tests. Fail loudly here.
// =============================================================================================

/** The body of the `claimStaffingMaterials` branch, bounded at the next statement in the action.
 *  A fixed-width window would spill into `startPaidStaffing`/`paidStaffHire` and wrongly credit THEIR
 *  guards (`originalProgression`, the gold check) to the faucet. */
function faucetBranch(){
 const src=read('staffing.mjs'),i=src.indexOf("if(action==='claimStaffingMaterials')");
 if(i<0)return null;
 const rest=src.slice(i),j=rest.indexOf('const b=s.enterprises');
 return j<0?null:rest.slice(0,j);
}
/** The one line that pays a bound familiar its inherent bonus. */
const inherentLine=()=>read('familiar-nodes.mjs').split('\n').find(l=>l.includes('Object.entries(data.inherent[pet]'));
/** The lib modules that import familiar-data.json at all. */
const familiarDataImporters=()=>readdirSync(LIB).filter(f=>f.endsWith('.mjs'))
 .filter(f=>read(f).includes('familiar-data.json')).sort();
/** Of those, any that reads a Cost column from it. Was empty while ECON-29 stood; the fix reads it.
 *  Scoped to the importers, and matched as a PROPERTY READ rather than as prose. A bare /\bCost\b/
 *  over all of lib/ reports lib/artifacts.mjs, whose line 56 is an English sentence ("Cost is twice
 *  the artifact's own verified recycle") about forge prices and has nothing to do with familiars --
 *  a false positive this file shipped with on its first run. */
const COST_READ=/\.Cost\b|\[['"]Cost['"]\]|['"]Cost['"]\s*:/;
const costReaders=()=>familiarDataImporters().filter(f=>COST_READ.test(read(f)));

test('the source and data extractors still work (a drifted pattern must fail loudly, not pass vacuously)',()=>{
 // ECON-02's faucet branch.
 const branch=faucetBranch();
 assert.ok(branch,"no `if(action==='claimStaffingMaterials')` branch in lib/staffing.mjs; the pattern has drifted");
 assert.ok(branch.length>150,`the faucet branch extracted only ${branch.length} chars; the bound has drifted`);
 assert.ok(branch.includes('staffingMaterials')&&branch.includes('claims'),'the faucet branch does not read as the faucet');
 // ...and the bound must not leak the NEXT action's guards into it, or this file would report a gate
 // that belongs to paidStaffHire.
 assert.ok(!branch.includes('paidStaffHire')&&!branch.includes('upgradeStaffQuality'),
  'the faucet branch bound leaked into the next action');

 // ECON-29's inherent line.
 const line=inherentLine();
 assert.ok(line,'no `Object.entries(data.inherent[pet]` line in lib/familiar-nodes.mjs; the pattern has drifted');
 assert.ok(line.includes('familiarBonus')||read('familiar-nodes.mjs').indexOf('export function familiarBonus(')<read('familiar-nodes.mjs').indexOf(line),
  'the inherent assignment is no longer inside familiarBonus');
 // The Cost sweep must be capable of finding something, or "nothing reads Cost" is vacuous. The data
 // file genuinely carries the tables, so a scan of lib/ DATA must hit while the scan of lib/ CODE misses.
 // First: the sweep must actually be looking at a file. An importer list that came back empty would
 // make costReaders() trivially [] and the ECON-29 assertion below would prove nothing.
 assert.deepEqual(familiarDataImporters(),['familiar-supplies.mjs','familiars.mjs'],
  'the familiar-data.json importer sweep has drifted. If another module now imports the file, add it '
  +'here deliberately -- and check whether it reads the Cost columns, which would mean ECON-29 moved.');
 // ...and the matcher must be able to match. These are the three shapes a Cost read could take;
 // the prose sentence is the false positive the first draft of this file tripped on.
 // These are the shapes a module READING the column would use. A bare `{Cost:300}` is deliberately
 // NOT in the list and NOT matched: that is how the column is DEFINED in the data file, not how code
 // reads it, so matching it would make every copy of the table look like a reader.
 for(const shape of ['data.classes[x].Cost','row["Cost"]',"row['Cost']",'{"Cost":300}'])
  assert.ok(COST_READ.test(shape),`the Cost matcher no longer matches \`${shape}\``);
 assert.ok(!COST_READ.test('{Cost:300}'),'the Cost matcher now matches a table DEFINITION, not a read');
 assert.ok(!COST_READ.test("// Cost is twice the artifact's own verified recycle"),
  'the Cost matcher matches prose again; it would report lib/artifacts.mjs as a familiar-cost reader');
 assert.ok(Object.values(familiarData.classes).some(r=>'Cost' in r),'familiar-data.json classes no longer carry Cost');
 assert.ok(Object.values(familiarData.levels).some(r=>'Cost' in r),'familiar-data.json levels no longer carry Cost');
 assert.ok(Object.values(familiarData.stars).some(r=>'Cost' in r),'familiar-data.json stars no longer carry Cost');

 // BUG-19's two data files.
 assert.equal(BUSINESSES.length,17);
 assert.equal(Object.keys(sourceYield.rates).length,17);
 for(const d of BUSINESSES)assert.ok(Number.isInteger(d.employeeRate),`${d.id} has no integer employeeRate`);
 for(const [id,n] of Object.entries(sourceYield.rates))assert.ok(Number.isInteger(n),`${id} has no integer source rate`);

 // ECON-28's price table and wallet. Both are imported values rather than regexes, but the shape they
 // are read for must still hold, or the free-recruit assertions below would be measuring nothing.
 assert.ok(Object.keys(SUMMON_COSTS).length>=8,'SUMMON_COSTS has lost rarities');
 for(const cost of Object.values(SUMMON_COSTS))assert.equal(Object.keys(cost).length,1,'a price names more than one currency; the single-entry read below is wrong');
 assert.ok(Object.hasOwn(summonState(startingSave(NOW)),'stoneFragments'),'the summon wallet no longer holds stoneFragments');
});

// =============================================================================================
// ECON-28 -- 49 of 259 characters recruit free, and the charge writes NaN into the save.
//
// SUMMON_COSTS (lib/summon.mjs:30) prices UR, UR* and set members in `insignias`. summonState
// (lib/summon.mjs:33) creates stoneFragments, stones, insigniaFragments, valiant, archangel and
// starShards -- there is no `insignias` slot and no faucet anywhere fills one. It fails OPEN:
//     if(r[currency]<amount)return fail(...)      undefined < 2  ->  false, so nothing refuses
//     next[currency]=r[currency]-amount           undefined - 2  ->  NaN
// and validSummon's key list omits `insignias`, so valid() returns true, JSON.stringify writes the
// NaN as null, and decode() accepts it on reload.
//
// tests/currency-reachability.test.mjs:180 already pins the STATIC half -- that a priced currency has
// no wallet key. What follows is the RUNTIME half it cannot see: that the purchase actually succeeds,
// what it leaves in the save, and that the corrupt save survives a round trip.
//
// tests/summon-recruit.test.mjs misses all of it because its `stocked()` fixture (line 8) spreads a
// bag over summonState, writing an `insignias` key the real game never produces -- a fixture pinning
// a shape no player can reach, so every price there is paid from a wallet that does not exist.
// =============================================================================================

test('ECON-28: exactly 50 of the 266 catalogue characters are priced in a currency no wallet holds',()=>{
 const catalogue=[...FELLOWS,...FAMILY];
 assert.equal(catalogue.length,266);
 const wallet=Object.keys(summonState(startingSave(NOW)));
 const byCurrency={},unpriced=[];
 for(const p of catalogue){
  const cost=recruitPrice(p.id);
  if(!cost){unpriced.push(p.id);continue}
  const key=Object.keys(cost)[0];(byCurrency[key]??=[]).push(p.id);
 }
 // The whole catalogue, counted once. Measured 2026-09-12; re-measured 2026-09-15 after the seven
 // crossover characters were restored (wife_185 is UR, so valiant went 46 -> 47).
 assert.deepEqual(Object.fromEntries(Object.entries(byCurrency).map(([k,v])=>[k,v.length])),
  {stoneFragments:20,stones:174,valiant:47,archangel:3});
 // Was ['hero_60']: no rarity in the public roster meant summonCost returned null, so the counter
 // refused him and nothing else in the game could grant him. He is free-tier in the original, so
 // the free list prices him and the catalogue is now fully priced.
 // The 22 rank-up Fellows are deliberately unpriced: the original never sells them, each arrives
 // through its player-rank encounter (lib/rank-ladder-data.json). They were 22 of the 42 fragment-
 // priced (free-tier) characters, which is why stoneFragments fell from 42 to 20.
 assert.deepEqual(unpriced.sort(),[...RANK_FELLOWS.keys()].sort(),'only the rank-up Fellows are unpriced');
 // Was ['insignias'] with 49 characters charged against a key the wallet never held. UR/UR*/set are
 // now priced in valiant/archangel, which the forge produces and validSummon guards.
 const phantom=Object.keys(byCurrency).filter(k=>!wallet.includes(k));
 assert.deepEqual(phantom,[],'no cost may name a currency the wallet cannot hold');
 assert.equal(byCurrency.valiant.length+byCurrency.archangel.length,50);
 // Counting from recruitOffers instead would report 48, because startingSave already owns hero_195
 // (UR). The defect is a property of the price table, not of one save, so it is counted over the
 // catalogue. That off-by-one is stated here so a future reader does not "correct" 49 to 48.
 assert.equal(recruitRarity('hero_195'),'UR');
});

// The two tests that used to sit here pinned the BROKEN behaviour -- that a UR joined on an empty
// wallet, that the charge wrote NaN into summon.insignias, and that the corrupt save survived a
// JSON round trip as null. UR/UR*/set are now priced in valiant/archangel, so none of that is
// reachable: an empty wallet refuses with "Needs 2 Valiant Insignias" and a funded one debits
// valiant and writes a receipt validSummon accepts. Current-state tests get DELETED when their
// defect is fixed rather than rebaselined; the invariant that replaces them is the ex-todo below.

test('ECON-28: a UR is refused on an empty wallet and genuinely charged on a funded one',()=>{
 const s=startingSave(NOW);
 assert.deepEqual(recruitPrice('hero_113'),{valiant:2});
 assert.equal(recruitRarity('hero_113'),'UR');
 assert.match(recruit(s,'hero_113').error,/Needs 2 Valiant Insignias/,'the check now fails CLOSED');
 const funded={...s,summon:{...summonState(s),valiant:3}};
 const r=recruit(funded,'hero_113');
 assert.equal(r.error,undefined,r.error);
 assert.equal(summonState(r.state).valiant,1,'two valiant were actually spent');
 assert.deepEqual(summonState(r.state).recruited,[{id:'hero_113',kind:'fellows',paid:2,currency:'valiant'}]);
 assert.ok(valid(r.state));assert.deepEqual(decode(JSON.stringify(r.state)),r.state);
});

test('ECON-28: no successful purchase may leave a NaN balance',()=>{
 // Two invariants, either of which would have stopped this. Both pass since UR/UR*/set were
 // repriced onto valiant/archangel -- currencies the wallet holds and validSummon guards.
 const s=startingSave(NOW),wallet=Object.keys(summonState(s));
 const phantom=[...new Set(Object.values(SUMMON_COSTS).map(c=>Object.keys(c)[0]))].filter(k=>!wallet.includes(k));
 assert.deepEqual(phantom,[],
  `SUMMON_COSTS charges these currencies, but summonState holds no such key, so \`r[currency]\` is `
  +`undefined: the affordability check cannot fail and the charge produces NaN. 49 of 259 characters `
  +`are priced this way and recruit for free: ${phantom.join(', ')}.`);
 // Stated a second time as a runtime invariant, because a future price table could reintroduce the
 // shape without reintroducing this exact key.
 const after=recruit(s,'hero_113');
 if(!after.error)for(const [k,v] of Object.entries(after.state.summon))
  assert.ok(!(typeof v==='number'&&Number.isNaN(v)),`recruiting hero_113 wrote NaN into summon.${k}`);
});

// =============================================================================================
// ECON-29 -- FIXED. bindFamiliar used to pay a familiar's full inherent Power, free, at level 1:
// 71 free binds took a 17-business village from 92,064 to 1,233,109 gold/s (13.4x).
//
// Now familiarBonus (lib/familiar-nodes.mjs) pays a ninth of the inherent bonus per stage past the
// first, so an untrained familiar's bond is worth nothing; trainFamiliar and starFamiliar charge the
// familiar-data.json Cost ladders in the original's Item_PetLevelUP / Item_PetClassUP, which only the
// Familiar Tower's hourly income supplies (lib/familiar-supplies.mjs).
// =============================================================================================

/** A village with all 17 businesses open, 200 staff each and the full 154-Fellow roster. Staff is
 *  seeded rather than hired for the reason gear-fixtures.mjs gives: 200 workers at the Clinic cost
 *  336 billion, which would bury what this measures. */
function village(){
 let s=funded(maybe(startingSave(NOW),'recruitAll'));
 for(const d of BUSINESSES)s=run(s,'openEnterprise',d.id);
 for(const d of BUSINESSES)s=staffed(s,d.id,200);
 return s;
}
const purse=x=>JSON.stringify({gold:x.gold,crystals:x.crystals,fellowXP:x.fellowXP,familiarSupplies:x.familiarSupplies??null});

test('ECON-29 fixed: binding an untrained familiar adds nothing; stage 10 pays the full 1,040,104',()=>{
 let s=run(startingSave(NOW),'adoptFamiliars');
 assert.deepEqual(inherentFamiliarBonus('Pet_1191'),{flat:1000000,finalPercent:4});
 const bound=run(s,'bindFamiliar','Pet_1191','hero_1');
 assert.equal(bondedPower(bound,'hero_1'),100,'a level-1 bond is worth nothing');
 // Positive control: the same bond on a stage-10 familiar pays exactly the old free amount.
 const trained={...bound,familiars:{...bound.familiars,Pet_1191:{level:450,stars:0}}};
 assert.equal(bondedPower(trained,'hero_1'),1_040_104);
 const stage2={...bound,familiars:{...bound.familiars,Pet_1191:{level:50,stars:0}}};
 assert.equal(bondedPower(stage2,'hero_1'),Math.floor((100+Math.floor(1e6/9))*(1+Math.round(4/9*100)/100/100)),'stage 2 pays a ninth');
});

test('ECON-29 fixed: every level and star is charged from the Cost ladders, and nothing else pays for them',()=>{
 let s=run(startingSave(NOW),'adoptFamiliars');
 assert.match(act(s,'trainFamiliar',s.lastAt,'Pet_1191',1).error,/Needs 10 level-up items/,'no items, no training');
 assert.match(act(s,'starFamiliar',s.lastAt,'Pet_1191').error,/class-up items/);
 assert.deepEqual(costReaders(),['familiar-supplies.mjs'],'the Cost columns are read by the supply module');
 s={...s,familiarSupplies:{levelUp:1490,classUp:300,since:null}};
 for(let n=0;n<5;n++)s=run(s,'trainFamiliar','Pet_1191',10);
 assert.match(act(s,'trainFamiliar',s.lastAt,'Pet_1191',1).error,/Needs 70 level-up/,'the purse is spent to the item');
 assert.equal(s.familiars.Pet_1191.level,50,'1,490 level-up and 300 class-up items reach stage 2 exactly');
 assert.deepEqual(s.familiarSupplies,{levelUp:0,classUp:0,since:null});
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('ECON-29 fixed: 71 binds on untrained familiars leave village income where it was',()=>{
 let v=village();
 const before=totalRate(v);
 assert.equal(Math.round(before*10)/10,92_072.3,'the un-bound village rate has moved');
 v=run(v,'adoptFamiliars');
 let bound=0;
 for(const pet of Object.keys(v.familiars)){
  const fellow=Object.keys(v.fellows)[bound];if(!fellow)break;
  const next=maybe(v,'bindFamiliar',pet,fellow);
  if(next!==v){v=next;bound++}
 }
 assert.equal(bound,71);
 assert.equal(Math.round(totalRate(v)*10)/10,92_072.3,'free binds no longer move income (was 1,233,109)');
 // Negative control: the same binds on stage-10 familiars restore the old 13.4x, so the probe can see it.
 // 1,233,117 rather than the 1,233,109 measured on 2026-09-12: restoring the crossover Fellows widened
 // the roster the bind ladder draws from. The ratio, which is what this control is for, is unchanged.
 const trained={...v,familiars:Object.fromEntries(Object.keys(v.familiars).map(id=>[id,{level:450,stars:0}]))};
 assert.equal(Math.round(totalRate(trained)),1_233_117);
});

test('ECON-29 fixed: familiar power must be earned through the shipped Cost tables',()=>{
 let s=run(startingSave(NOW),'adoptFamiliars');
 s=run(s,'bindFamiliar','Pet_1191','hero_1');
 const before=bondedPower(s,'hero_1'),spendable=purse(s);
 s={...s,familiarSupplies:{levelUp:1e6,classUp:1e6,since:null}};const stocked=purse(s);
 for(let n=0;n<5;n++)s=run(s,'trainFamiliar','Pet_1191',10);
 const gained=bondedPower(s,'hero_1')-before;
 assert.ok(gained>0,'training to stage 2 measured no gain; the probe has drifted');
 assert.notEqual(purse(s),stocked,`training granted ${gained.toLocaleString()} Power and charged nothing`);
 assert.notEqual(stocked,spendable);
});

// =============================================================================================
// BUG-19 -- the Museum and Clinic employee rates are transposed, and one building pays two rates.
//
// The original's BuildingBase.yield.count gives Building_901 (Museum) 20 and Building_1401 (Clinic)
// 50. lib/business-data.json has them the other way round; lib/employee-yield-data.json is correct
// on all 17. Root cause on file: scripts/import-businesses.py:10 is a hand-typed dict keyed by NAME.
//
// It is NOT an income exploit -- both files hold the same multiset, so total village income at equal
// staffing is unchanged. What IS wrong is the per-building split, and the fact that once a save opts
// into original progression a SINGLE building pays both numbers: employeeIncome (businesses.mjs:51)
// charges the retained cohort the business-data rate and every later hire the employee-yield rate.
//
// tests/businesses.test.mjs:8 DOES catch it, and an earlier draft of this file claimed otherwise.
// That assertion does not sort: it maps BUSINESSES in FILE ORDER against a rate-ascending literal.
// lib/business-data.json is only stored rate-ascending because scripts/import-businesses.py:19 sorts
// records by employeeRate before writing. So an in-place swap of the two VALUES breaks the ascending
// run and turns that test red -- a correct fix must move the two record blocks as well, or re-run the
// corrected importer, which reorders automatically. Demonstrated below.
// =============================================================================================

test('BUG-19: the rate list is compared in FILE ORDER, so any fix must reorder the records too',()=>{
 // The exact assertion at tests/businesses.test.mjs:8. There is no sort in it and none in that file:
 // the ascending run is a property of how the importer WRITES the data, not of how the test reads it.
 assert.deepEqual(BUSINESSES.map(b=>b.employeeRate),[1,2,3,4,6,8,10,15,20,25,30,35,40,50,60,70,80]);
 // Both files hold the same seventeen numbers; only the id they are attached to differs.
 const ours=BUSINESSES.map(b=>b.employeeRate).sort((a,b)=>a-b);
 const source=Object.values(sourceYield.rates).sort((a,b)=>a-b);
 assert.deepEqual(ours,source,'the two files no longer hold the same multiset');
 assert.equal(ours.reduce((n,v)=>n+v,0),459);
 assert.equal(source.reduce((n,v)=>n+v,0),459,'equal sums are why total village income is unaffected');
});

test('BUG-19: the two rate files agree on every id; the clean swap that was here is corrected',()=>{
 const disagreeing=BUSINESSES.filter(d=>d.employeeRate!==sourceYield.rates[d.id])
  .map(d=>[d.id,d.name,d.employeeRate,sourceYield.rates[d.id]]).sort((a,b)=>a[0]<b[0]?-1:1);
 // Was [['Building_1401','Clinic',20,50],['Building_901','Museum',50,20]] -- a clean swap, each
 // file's value for one being the other's value for two. scripts/import-businesses.py was corrected
 // and re-run, so the two files now agree on all seventeen ids.
 assert.deepEqual(disagreeing,[],
  'the two rate files disagree again. scripts/import-businesses.py:19 is hand-typed by NAME, which '
  +'is what let Museum and Clinic swap unnoticed the first time -- check that dict against '
  +'BuildingBase.yield.count before touching anything else.');
 const museum=BUSINESSES.find(d=>d.id==='Building_901'),clinic=BUSINESSES.find(d=>d.id==='Building_1401');
 assert.equal(museum.employeeRate,20,'Museum pays the original BuildingBase rate');
 assert.equal(clinic.employeeRate,50,'Clinic pays the original BuildingBase rate');
 assert.equal(museum.employeeRate,sourceYield.rates.Building_901);
 assert.equal(clinic.employeeRate,sourceYield.rates.Building_1401);
});

// The dual-rate test that stood here pinned the player-visible consequence -- one building paying
// business-data's 50 to its retained cohort and the original's 20 to every later hire. Both files
// now agree per id, so a building pays ONE rate and that split is unreachable. Current-state tests
// are deleted when their defect is fixed; the invariant that replaces it is the ex-todo below.

test('BUG-19: the two rate files must agree per building id',()=>{
 const wrong=BUSINESSES.filter(d=>d.employeeRate!==sourceYield.rates[d.id])
  .map(d=>`${d.id} (${d.name}): business-data ${d.employeeRate}, BuildingBase ${sourceYield.rates[d.id]}`);
 assert.deepEqual(wrong,[],
  'lib/business-data.json and lib/employee-yield-data.json disagree about the per-worker rate of '
  +'these buildings, so one building pays two different rates depending on when a worker was hired:\n'
  +wrong.map(x=>`  ${x}`).join('\n')
  +'\n\nlib/employee-yield-data.json is the correct one (BuildingBase.yield.count, pin 147f9b73).');
});

// =============================================================================================
// ECON-02 -- the building-materials faucet is ungated.
//
// claimStaffingMaterials (lib/staffing.mjs:22) grants a flat 100 materials with no day gate, no rate
// limit, no cooldown and no clock read at all. Its only bounds are absolute ceilings on the running
// totals (stock 999,900 / claims 1,000,000). So the entire quality ladder of every business is
// reachable in a single frozen instant by holding down one button.
//
// This is pinned as the CURRENT state, deliberately. tests/currency-reachability.test.mjs:148 already
// records that the faucet is a free sandbox grant; what has never been asserted is that it is also
// UNBOUNDED IN TIME, which is the half that makes the quality ladder free. Adding a gate later will
// trip these tests on purpose -- that is the point of them.
// =============================================================================================

/** An Inn with paid progression open, on a frozen clock. */
function inn(){
 let s=funded(fresh(T),1e12);
 s=run(s,'activateOriginalProgression');
 s=run(s,'openEnterprise','Building_101');
 return run(s,'startPaidStaffing','Building_101');
}

// The four current-state tests that stood here pinned the UNGATED faucet: that it read no clock at
// all, that 300 claims landed at one frozen timestamp banking 30,000 materials, that 260 clicks
// bought the Inn's whole ladder, and that 9,692 bought all seventeen. claimStaffingMaterials is now
// one claim per calendar day at 1,000 materials, so none of that is reachable. Current-state tests
// are deleted when their defect is fixed; the invariant that replaces them is the ex-todo below,
// and tests/staffing-daily-materials.test.mjs covers the gate and the reserve identity in full.

test('ECON-02: the materials faucet is gated to one claim per day',()=>{
 // A second claim at the same instant must not pay again. It does today.
 let s=inn();
 const at=s.lastAt;
 const first=run(s,'claimStaffingMaterials',at);
 const second=act(first,'claimStaffingMaterials',at);
 assert.ok(second.error,
  'claimStaffingMaterials paid 100 more materials at the very same timestamp. A faucet whose only '
  +'bound is a 1,000,000-claim ceiling is a button, not an economy: 260 presses max the Inn\'s quality '
  +'ladder (+11,200% earnings) and 9,692 press out all seventeen. Gate it on the day, or price it.');
});
