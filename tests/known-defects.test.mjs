import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {fresh,startingSave,act,valid,decode,totalRate} from '../lib/game.mjs';
import {BUSINESSES,sourceEmployeeYield,employeeCohorts,rosterOperation} from '../lib/businesses.mjs';
import {staffingRule,staffingStatus} from '../lib/staffing.mjs';
import {summonState,recruitPrice,recruitRarity,SUMMON_COSTS} from '../lib/summon.mjs';
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
//   ECON-29  lib/familiar-nodes:16 bindFamiliar pays full inherent Power for nothing
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
const inherentLine=()=>read('familiar-nodes.mjs').split('\n').find(l=>l.includes('Object.assign(bonus,data.inherent['));
/** The lib modules that import familiar-data.json at all. */
const familiarDataImporters=()=>readdirSync(LIB).filter(f=>f.endsWith('.mjs'))
 .filter(f=>read(f).includes('familiar-data.json')).sort();
/** Of those, any that reads a Cost column from it. Should be empty: that is the defect.
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
 assert.ok(line,'no `Object.assign(bonus,data.inherent[' + '])` line in lib/familiar-nodes.mjs; the pattern has drifted');
 assert.ok(line.includes('familiarBonus')||read('familiar-nodes.mjs').indexOf('export function familiarBonus(')<read('familiar-nodes.mjs').indexOf(line),
  'the inherent assignment is no longer inside familiarBonus');
 // The Cost sweep must be capable of finding something, or "nothing reads Cost" is vacuous. The data
 // file genuinely carries the tables, so a scan of lib/ DATA must hit while the scan of lib/ CODE misses.
 // First: the sweep must actually be looking at a file. An importer list that came back empty would
 // make costReaders() trivially [] and the ECON-29 assertion below would prove nothing.
 assert.deepEqual(familiarDataImporters(),['familiars.mjs'],
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

test('ECON-28: exactly 49 of the 259 catalogue characters are priced in a currency no wallet holds',()=>{
 const catalogue=[...FELLOWS,...FAMILY];
 assert.equal(catalogue.length,259);
 const wallet=Object.keys(summonState(startingSave(NOW)));
 const byCurrency={},unpriced=[];
 for(const p of catalogue){
  const cost=recruitPrice(p.id);
  if(!cost){unpriced.push(p.id);continue}
  const key=Object.keys(cost)[0];(byCurrency[key]??=[]).push(p.id);
 }
 // The whole catalogue, counted once. Measured 2026-09-12.
 assert.deepEqual(Object.fromEntries(Object.entries(byCurrency).map(([k,v])=>[k,v.length])),
  {stoneFragments:35,stones:174,insignias:49});
 assert.deepEqual(unpriced,['hero_60'],'the one character the counter cannot price at all');
 // 49 of them are charged against a key the wallet has never held.
 const phantom=Object.keys(byCurrency).filter(k=>!wallet.includes(k));
 assert.deepEqual(phantom,['insignias']);
 assert.equal(byCurrency.insignias.length,49);
 // Counting from recruitOffers instead would report 48, because startingSave already owns hero_195
 // (UR). The defect is a property of the price table, not of one save, so it is counted over the
 // catalogue. That off-by-one is stated here so a future reader does not "correct" 49 to 48.
 assert.equal(recruitRarity('hero_195'),'UR');
});

test('ECON-28: a UR joins on a completely empty wallet, and the charge leaves NaN behind',()=>{
 const s=startingSave(NOW);
 assert.equal(summonState(s).insignias,undefined,'the wallet holds no insignias slot at all');
 assert.deepEqual(recruitPrice('hero_113'),{insignias:2});
 assert.equal(recruitRarity('hero_113'),'UR');
 const r=recruit(s,'hero_113');
 // No refusal: `undefined < 2` is false, so the affordability check never fires.
 assert.equal(r.error,undefined,'the counter refused; the affordability check now fails CLOSED');
 assert.match(r.message,/Leon joined for 2 insignias\./);
 assert.ok(r.state.fellows.hero_113,'Leon joined');
 // `undefined - 2` is NaN, and it is written straight into the wallet.
 assert.ok(Number.isNaN(r.state.summon.insignias),'the charge no longer writes NaN');
 // Every real balance is untouched: nothing anywhere was actually spent.
 for(const k of ['stoneFragments','stones','insigniaFragments','valiant','archangel','starShards'])
  assert.equal(r.state.summon[k],0,`${k} moved; the charge is no longer free`);
 // The receipt records a payment that never happened, and passes validSummon's receipt check.
 assert.deepEqual(r.state.summon.recruited,[{id:'hero_113',kind:'fellows',paid:2,currency:'insignias'}]);
});

test('ECON-28: the NaN save is accepted by valid() and survives a JSON round trip as null',()=>{
 const bad=recruit(startingSave(NOW),'hero_113').state;
 assert.ok(Number.isNaN(bad.summon.insignias));
 // validSummon's key list omits `insignias`, so nothing ever inspects it.
 assert.ok(valid(bad),'valid() now rejects the NaN wallet');
 const raw=JSON.stringify(bad);
 assert.match(raw,/"insignias":null/,'JSON.stringify no longer writes the NaN as null');
 // And the reload is accepted, so the corruption is durable rather than transient.
 const reloaded=decode(raw);
 assert.equal(reloaded.summon.insignias,null);
 assert.ok(reloaded.fellows.hero_113,'Leon is still on the roster after the reload');
});

test('ECON-28: no successful purchase may leave a NaN balance — THE FIX, NOT THE CURRENT STATE',
 {todo:'SUMMON_COSTS prices UR/UR*/set in `insignias`, a key summonState never creates. Give the wallet the key, add it to validSummon and give it a faucet, or reprice those rarities onto valiant/archangel. Either way the NaN already written into shipped saves needs a migration.'},()=>{
 // Two invariants, either of which would have stopped this. Both fail today, on purpose.
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
// ECON-29 -- bindFamiliar pays a familiar's full inherent Power, free, at level 1.
//
// familiarBonus (lib/familiar-nodes.mjs:16) does `Object.assign(bonus,data.inherent[pet])` on the
// strength of the bond alone. adoptFamiliars grants all 71 at no cost (lib/familiars.mjs:27) and
// bindFamiliar (lib/familiar-nodes.mjs:23) charges nothing, so the whole inherent table is payable
// in 72 free clicks with zero investment. Nothing in lib/ reads familiar-data.json's Cost tables.
//
// tests/familiar-nodes.test.mjs:28 pins ONE pet's inherent values and the arithmetic around them.
// What it never asserts -- and what this section adds -- is that the bind costs nothing at all, and
// what the whole table is worth to the village economy.
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

test('ECON-29: one free bind takes a fresh Fellow from 100 Power to 1,040,104 — a 10,401x jump',()=>{
 let s=startingSave(NOW);
 assert.equal(bondedPower(s,'hero_15'),100,'a fresh Fellow is worth exactly 100 Power');
 s=run(s,'adoptFamiliars');
 assert.equal(Object.keys(s.familiars).length,71,'all 71 familiars are granted in a single free action');
 assert.deepEqual(s.familiars.Pet_1191,{level:1,stars:0},'granted at level 1 with no stars');
 assert.deepEqual(inherentFamiliarBonus('Pet_1191'),{flat:1000000,finalPercent:4});
 const bound=run(s,'bindFamiliar','Pet_1191','hero_15');
 // floor((100 + 1,000,000) * 1.04). The pet is level 1 and unstarred; none of that is consulted.
 assert.equal(bondedPower(bound,'hero_15'),1_040_104);
 assert.ok(valid(bound),'the free 1.04M-Power save is a legal save');
});

test('ECON-29: adopting and binding spends nothing — no gold, no currency, no level, no stars',()=>{
 let s=startingSave(NOW);
 const before=JSON.stringify({gold:s.gold,crystals:s.crystals,fellowXP:s.fellowXP,ore:s.artifacts?.ore,
  inventory:s.inventory,summon:s.summon,staffingMaterials:s.staffingMaterials});
 s=run(s,'adoptFamiliars');
 const bound=run(s,'bindFamiliar','Pet_1191','hero_15');
 const after=JSON.stringify({gold:bound.gold,crystals:bound.crystals,fellowXP:bound.fellowXP,ore:bound.artifacts?.ore,
  inventory:bound.inventory,summon:bound.summon,staffingMaterials:bound.staffingMaterials});
 assert.equal(after,before,'adopting and binding now charge something; this defect may be fixed');
 // The pet itself is untouched too: the inherent bonus is not gated on level or stars in any way.
 assert.deepEqual(bound.familiars.Pet_1191,{level:1,stars:0});
 // Node activation IS correctly gated, which is why the power lands on the BIND rather than the nodes.
 // Reported alongside this defect as a 10,792-action chain worth 443M Power; NOT reproduced.
 assert.match(String(act(bound,'activateFamiliarNodes',bound.lastAt,'Pet_1191').error),
  /No eligible inactive node selected/,'node activation is no longer gated at level 1');
});

test('ECON-29: the inherent table nothing charges for spans 30,000 to 3,000,000 flat Power',()=>{
 const flats=FAMILIARS.map(p=>inherentFamiliarBonus(p.id).flat??0).sort((a,b)=>a-b);
 assert.equal(flats.length,71);
 assert.equal(flats[0],30_000);
 assert.equal(flats[Math.floor(flats.length/2)],500_000);
 assert.equal(flats[flats.length-1],3_000_000);
 // The Cost ladders the original charges for exactly this are present in the data and read by nobody.
 assert.deepEqual(costReaders(),[],
  'a lib module now reads a Cost column. If familiar Costs are being charged, ECON-29 is fixed and '
  +'this file should be revisited.');
 const classCosts=Object.values(familiarData.classes).reduce((n,r)=>n+(r.Cost||0),0);
 const levelCosts=Object.values(familiarData.levels).reduce((n,r)=>n+(r.Cost||0),0);
 const starCosts=Object.values(familiarData.stars).reduce((n,r)=>n+(r.Cost||0),0);
 assert.ok(classCosts>0&&levelCosts>0&&starCosts>0,'the shipped Cost tables are non-empty and unspent');
});

test('ECON-29: 71 free binds multiply a 17-business village income by 13.4x',()=>{
 let v=village();
 assert.equal(Object.keys(v.fellows).length,154);
 assert.equal(Object.keys(v.enterprises).length,17);
 const before=totalRate(v);
 assert.equal(Math.round(before*10)/10,92_063.8,'the un-bound village rate has moved');
 assert.equal(Math.round(rosterOperation(v)*10)/10,15.4,'154 untrained Fellows are worth 154*100/1000');
 v=run(v,'adoptFamiliars');
 let bound=0;
 for(const pet of Object.keys(v.familiars)){
  const fellow=Object.keys(v.fellows)[bound];if(!fellow)break;
  const next=maybe(v,'bindFamiliar',pet,fellow);
  if(next!==v){v=next;bound++}
 }
 assert.equal(bound,71,'binding is strictly 1:1, so 71 familiars cover 71 of 154 Fellows');
 const after=totalRate(v);
 assert.equal(Math.round(after),1_233_109);
 assert.equal(Math.round(rosterOperation(v)),67_136);
 assert.equal(Math.round(after/before*10)/10,13.4,'71 free actions multiply village income 13.4x');
 assert.ok(valid(v),'the whole 13.4x fixture is a legal save, so this really is reachable');
 // It stays under the default-mode ceiling tests/fellow-power.test.mjs:179 pins (138,699), because
 // that fixture ALSO maxes every record and activates every node. Binding alone lands below it.
 assert.ok(rosterOperation(v)<138_699,'binding alone must stay below the maxed-roster ceiling');
});

test('ECON-29: familiar power must be earned through the shipped Cost tables — THE FIX',
 {todo:'bindFamiliar (familiar-nodes.mjs:23) and adoptFamiliars (familiars.mjs:27) are both free, and familiarBonus (familiar-nodes.mjs:16) pays full inherent Power on the bond alone. Charge the familiar-data.json Cost ladders (classes 300-15,000; levels summing 626,190; stars summing 5,000), or scale the inherent bonus by level and stars.'},()=>{
 // The invariant that would have stopped it: an action worth a million Power must cost something.
 // The purse is summarised to a handful of scalars rather than compared whole: a failing notEqual
 // prints BOTH sides, and spreading the 100-key inventory across a CI log twice buries the message.
 const purse=x=>JSON.stringify({gold:x.gold,crystals:x.crystals,fellowXP:x.fellowXP,
  gifts:x.inventory.gift1,ore:x.artifacts?.ore??null,materials:x.staffingMaterials?.stock??0,
  summon:x.summon?JSON.stringify(x.summon):null});
 let s=run(startingSave(NOW),'adoptFamiliars');
 const before=bondedPower(s,'hero_15'),spendable=purse(s);
 const bound=run(s,'bindFamiliar','Pet_1191','hero_15');
 const gained=bondedPower(bound,'hero_15')-before;
 assert.ok(gained>0,'the fixture measured no gain; the probe has drifted');
 assert.notEqual(purse(bound),spendable,
  `binding Pet_1191 to hero_15 granted ${gained.toLocaleString()} Power and charged nothing at all. `
  +'Familiar power is meant to be earned through the Cost tables shipped in lib/familiar-data.json, '
  +'which no module reads. Measured: 71 free binds take a 17-business village from 92,064 to '
  +'1,233,109 gold/s.');
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
// tests/businesses.test.mjs:8 cannot catch it: it compares a rate list SORTED BY RATE, so swapping
// 20 and 50 leaves that assertion byte-identical. Demonstrated below.
// =============================================================================================

test('BUG-19: the existing rate test is blind to a transposition, because it sorts by rate',()=>{
 // The exact assertion at tests/businesses.test.mjs:8, and the reason it passes either way.
 assert.deepEqual(BUSINESSES.map(b=>b.employeeRate),[1,2,3,4,6,8,10,15,20,25,30,35,40,50,60,70,80]);
 // Both files hold the same seventeen numbers; only the id they are attached to differs.
 const ours=BUSINESSES.map(b=>b.employeeRate).sort((a,b)=>a-b);
 const source=Object.values(sourceYield.rates).sort((a,b)=>a-b);
 assert.deepEqual(ours,source,'the two files no longer hold the same multiset');
 assert.equal(ours.reduce((n,v)=>n+v,0),459);
 assert.equal(source.reduce((n,v)=>n+v,0),459,'equal sums are why total village income is unaffected');
});

test('BUG-19: exactly two ids disagree between the two rate files, and it is a clean swap',()=>{
 const disagreeing=BUSINESSES.filter(d=>d.employeeRate!==sourceYield.rates[d.id])
  .map(d=>[d.id,d.name,d.employeeRate,sourceYield.rates[d.id]]).sort((a,b)=>a[0]<b[0]?-1:1);
 assert.deepEqual(disagreeing,[
  ['Building_1401','Clinic',20,50],   // business-data says 20; the original says 50
  ['Building_901','Museum',50,20],    // business-data says 50; the original says 20
 ],'the set of disagreeing buildings has changed. If one was fixed, update this; if a new one '
  +'appeared, the importer has drifted again -- scripts/import-businesses.py:10 is hand-typed by NAME.');
 // A clean swap, not two independent errors: each file's value for one is the other's value for two.
 const museum=BUSINESSES.find(d=>d.id==='Building_901'),clinic=BUSINESSES.find(d=>d.id==='Building_1401');
 assert.equal(museum.employeeRate,sourceYield.rates.Building_1401);
 assert.equal(clinic.employeeRate,sourceYield.rates.Building_901);
});

test('BUG-19: after one paid hire the Museum pays 50 to old staff and 20 to new, from one building',()=>{
 // The player-visible consequence. staffingYield is seeded by addStaff, NOT by
 // activateOriginalProgression alone -- a probe that skips the hire sees undefined.
 const id='Building_901';
 let s=funded(fresh(T),1e12);
 s=run(s,'openEnterprise',id);
 s=staffed(s,id,100);
 s=run(s,'activateOriginalProgression');
 s=run(s,'startPaidStaffing',id);
 assert.equal(s.enterprises[id].staffingYield,undefined,'staffingYield is not seeded until a hire lands');
 s=run(s,'paidStaffHire',id,1);
 // One building, two rates: the retained cohort keeps business-data's 50, the new hire pays the
 // original's 20. Both are charged by employeeIncome (lib/businesses.mjs:51).
 assert.deepEqual(s.enterprises[id].staffingYield,{policyVersion:1,retainedEmployees:100,retainedRate:50});
 assert.equal(sourceEmployeeYield(id),20);
 assert.deepEqual(employeeCohorts(s,id),{retained:100,retainedRate:50,source:1,sourceRate:20});
 assert.ok(valid(s),'the dual-rate save is legal, so the split is shipped behaviour');
});

test('BUG-19: the two rate files must agree per building id — THIS IS THE TRANSPOSITION',
 {todo:'lib/business-data.json has Museum (Building_901) 50 and Clinic (Building_1401) 20; the original BuildingBase.yield.count is Museum 20 and Clinic 50, and lib/employee-yield-data.json is correct on all 17. Fixing the data needs a test rebaseline: five assertions across tests/employee-yields.test.mjs:13,14,16 and tests/staffing.test.mjs:14,18 use Building_901 with expectations built on 50.'},()=>{
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

test('ECON-02: the faucet reads no clock at all — no day gate, no cooldown, no rate limit',()=>{
 const branch=faucetBranch();
 // Every token that would indicate a time gate. The faucet must contain none of them today.
 for(const token of ['habitDay','lastAt','recoverAt','elapsed','Date','now','cooldown','settle'])
  assert.ok(!branch.includes(token),
   `claimStaffingMaterials now mentions \`${token}\`. If a gate was added, ECON-02 is being fixed and `
   +'the current-state assertions below are expected to fail -- update them WITH the decision.');
 // Its only guards are absolute ceilings on the running totals, not a rate.
 assert.match(branch,/r\.stock>999900\|\|r\.claims>=1000000/,'the ceiling guard has changed');
 assert.match(branch,/stock:r\.stock\+100,claims:r\.claims\+1/,'the flat +100 grant has changed');
 assert.match(branch,/Sandbox/,'the grant no longer announces itself as a sandbox faucet');
});

test('ECON-02: 300 claims land at one frozen timestamp, banking 30,000 materials',()=>{
 let s=inn();
 const at=s.lastAt;
 let accepted=0;
 for(let i=0;i<300;i++){
  const r=act(s,'claimStaffingMaterials',at);   // the SAME instant, 300 times over
  if(r.error)break;
  s=r.state;accepted++;
 }
 assert.equal(accepted,300,'the faucet now refuses inside a single instant; a rate limit has appeared');
 assert.deepEqual(s.staffingMaterials,{stock:30_000,claims:300});
 assert.equal(s.lastAt,at,'no time passed at all');
 assert.ok(valid(s),'300 instantaneous claims produce a legal save');
});

test('ECON-02: 260 clicks buy the Inn its whole 26-tier ladder, +11,200% quality bonus',()=>{
 const id='Building_101';
 // The bill, straight from the shipped rules: 25 upgrades from quality 1 to 26.
 const ladder=idOf=>{let n=0;for(let q=1;q<26;q++)n+=staffingRule(idOf,q).cost;return n};
 assert.equal(ladder(id),25_915);
 assert.equal(Math.ceil(ladder(id)/100),260,'260 claims of 100 materials cover the Inn outright');
 let s=inn();
 assert.equal(staffingStatus(id,s.enterprises[id]).quality,1);
 assert.equal(staffingStatus(id,s.enterprises[id]).bonus,0);
 const at=s.lastAt;
 for(let i=0;i<300;i++)s=run(s,'claimStaffingMaterials',at);
 let upgrades=0;
 for(;;){const r=act(s,'upgradeStaffQuality',at,id);if(r.error){assert.match(String(r.error),/Final business quality reached/);break}s=r.state;upgrades++}
 const status=staffingStatus(id,s.enterprises[id]);
 assert.equal(upgrades,25);
 assert.equal(status.quality,26);
 assert.equal(status.bonus,112,'the whole ladder is worth +11,200% to this business');
 assert.equal(status.spent,25_915);
 assert.equal(s.staffingMaterials.stock,30_000-25_915);
 assert.ok(valid(s),'the free maxed-quality Inn is a legal save');
});

test('ECON-02: 9,692 clicks buy the quality ladder of all seventeen businesses',()=>{
 // Stated as the size of the hole rather than exercised: the number is what matters, and building
 // seventeen ladders would spend a second for no extra information.
 const ladder=id=>{let n=0;for(let q=1;q<26;q++)n+=staffingRule(id,q).cost;return n};
 const all=BUSINESSES.reduce((n,d)=>n+ladder(d.id),0);
 assert.equal(all,969_191);
 assert.equal(Math.ceil(all/100),9_692);
 // Well inside the faucet's own ceilings, so nothing stops a player from doing exactly this.
 assert.ok(9_692<1_000_000,'the claims ceiling is two orders of magnitude beyond the whole game');
});

test('ECON-02: the materials faucet must be gated — THE FIX, NOT THE CURRENT STATE',
 {todo:'claimStaffingMaterials (staffing.mjs:22) has no day gate and no rate limit, so the quality ladder of all 17 businesses (969,191 materials) is 9,692 free clicks in one instant. The original states sources -- Reward_DailyTaskReward_03 and Reward_CityExchanger_01 (50 per trade) -- so this is convertible rather than blocked; docs/faucet-map.md records that it needs a shop plus a save-version bump.'},()=>{
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
