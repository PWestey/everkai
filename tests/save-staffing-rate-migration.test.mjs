import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';
import {BUSINESSES,validBusinesses,reconcileStaffingRates} from '../lib/businesses.mjs';
import {funded,staffed} from './gear-fixtures.mjs';

// lib/business-data.json had the Museum and Clinic per-worker rates transposed against the original's
// BuildingBase.yield.count (BUG-19): Museum 50 / Clinic 20 where the source says 20 / 50.
//
// addStaff stamps staffingYield.retainedRate from BUSINESSES[].employeeRate at hire time, and
// validBusinesses pins that stamp against the same table forever after. So correcting the data makes
// every save that hired at either building under original progression fail valid(), and decode()
// throws "Invalid business workforce" -- a live player, on the deployed site, who did nothing wrong.
//
// The repair therefore has to run BEFORE the per-subtree guards, not in decode()'s trailing repair
// branch: those guards throw rather than return, so a repair placed at the end can never fire for
// `enterprises` at all (CLAUDE.md:80). An earlier draft of this fix put it at the end, and this whole
// file is the test that was missing when that dead repair passed a 715-test green suite.

const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,String(r.error));return r.state};
/** A save that genuinely hired under original progression, so staffingYield is stamped by the game
 *  rather than hand-written. A hand-built `enterprises` row is rejected by validBusinesses for an
 *  unrelated reason -- it requires originalProgression(s) -- which makes it useless as a fixture. */
function hired(id,employees=200){
 let s=run(funded(fresh(1000),1e12),'openEnterprise',id);
 s=staffed(s,id,employees);
 s=run(s,'activateOriginalProgression');
 return run(s,'hireEmployees',id,10);
}
const restamp=(s,id,rate)=>({...s,enterprises:{...s.enterprises,
 [id]:{...s.enterprises[id],staffingYield:{...s.enterprises[id].staffingYield,retainedRate:rate}}}});
/** The value the OLD table stamped for each id: exactly the other building's rate. */
const TRANSPOSED={Building_901:50,Building_1401:20};

test('the shipped table now matches the original on both transposed buildings',()=>{
 const rate=id=>BUSINESSES.find(d=>d.id===id).employeeRate;
 assert.equal(rate('Building_901'),20,'Museum');
 assert.equal(rate('Building_1401'),50,'Clinic');
 // And the stale value each save carries is the other one, which is what makes the fingerprint safe.
 assert.equal(TRANSPOSED.Building_901,rate('Building_1401'));
 assert.equal(TRANSPOSED.Building_1401,rate('Building_901'));
});

test('a save stamped under the transposed table is unloadable without the migration, and loads with it',()=>{
 for(const [id,stale] of Object.entries(TRANSPOSED)){
  const correct=BUSINESSES.find(d=>d.id===id).employeeRate;
  const legacy=restamp(hired(id),id,stale);
  // This is the shape that stopped loading the moment the data was corrected.
  assert.equal(validBusinesses(legacy),false,id+' legacy stamp should fail the guard');
  assert.equal(valid(legacy),false,id);
  const loaded=decode(JSON.stringify(legacy));
  assert.equal(loaded.enterprises[id].staffingYield.retainedRate,correct,id+' was not repaired');
  assert.ok(valid(loaded),id+' is still invalid after repair');
  // Nothing else about the cohort moves: the migration corrects the rate and only the rate.
  assert.equal(loaded.enterprises[id].staffingYield.retainedEmployees,
   legacy.enterprises[id].staffingYield.retainedEmployees,id+' cohort size moved');
  assert.equal(loaded.enterprises[id].employees,legacy.enterprises[id].employees,id+' headcount moved');
 }
});

test('a rate that is neither value is STILL refused, so the repair cannot launder corruption',()=>{
 // 37 is not the correct rate and not the transposed one, so it is not the BUG-19 fingerprint and
 // must reach valid() untouched -- otherwise save repair becomes a way to smuggle in a broken village.
 const junk=restamp(hired('Building_901'),'Building_901',37);
 assert.throws(()=>decode(JSON.stringify(junk)),/Invalid business workforce/);
 assert.equal(reconcileStaffingRates(junk.enterprises),junk.enterprises,'an unrecognised rate must pass through by identity');
});

test('healthy and unstamped saves are untouched',()=>{
 const good=hired('Building_901');
 assert.equal(good.enterprises.Building_901.staffingYield.retainedRate,20,'a fresh hire stamps the corrected rate');
 assert.deepEqual(decode(JSON.stringify(good)),good,'a healthy save must round-trip unchanged');
 // Same object identity, not merely an equal copy: the repair must be a genuine no-op here.
 assert.equal(reconcileStaffingRates(good.enterprises),good.enterprises);
 const unstamped={Building_901:{employees:10,fellows:[]}};
 assert.equal(reconcileStaffingRates(unstamped),unstamped);
 assert.equal(reconcileStaffingRates(undefined),undefined);
});
