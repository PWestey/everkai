import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {MATERIALS_PER_DAY,MATERIAL_CLAIM_DAYS,reserve,validStaffingReserve,staffingRule} from '../lib/staffing.mjs';
import {BUSINESSES} from '../lib/businesses.mjs';
import {funded,costOf} from './gear-fixtures.mjs';

// ECON-02. claimStaffingMaterials granted a flat 100 with no clock of any kind, so 969,191
// materials -- the quality ladder of all seventeen businesses -- was 9,692 presses in one instant.
// It is now one claim per calendar day at MATERIALS_PER_DAY.
//
// The reserve identity had to move with it. It was `stock === claims*100 - spent`, which pinned the
// grant size forever: any other rate made every live save fail valid(). It is now
// `stock === granted - spent`, and a save written before this change carries no `granted` at all --
// so the identity reads `(granted ?? claims*100)`, which IS the migration. That fallback is why no
// repair hook was needed, and these tests pin it: a legacy reserve must keep loading untouched.

const DAY=86400000;
// The canonical arity used by every other suite: act(state,action,now,target,value), with `now`
// pinned to s.lastAt. An earlier draft of this file passed four arguments, so `openEnterprise`
// received the building id as its TIMESTAMP and every test failed with "Invalid village state"
// while the engine was perfectly healthy. To move the clock, set lastAt on the state instead.
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,String(r.error));return r.state};
const at=(s,when)=>({...s,lastAt:when});
/** A save enrolled in paid staffing, which is the only state the faucet answers in. */
function enrolled(id='Building_101'){
 let s=run(funded(fresh(1000),costOf(id)),'openEnterprise',id);
 s=run(s,'activateOriginalProgression');
 return run(s,'startPaidStaffing',id);
}
const claim=s=>act(s,'claimStaffingMaterials',s.lastAt);

test('the grant is one claim per calendar day, and the day is what refuses the second',()=>{
 const s=enrolled(),when=s.lastAt;
 const first=claim(s);
 assert.equal(first.error,undefined,String(first.error));
 assert.equal(first.state.staffingMaterials.stock,MATERIALS_PER_DAY);
 // The same instant, and any later instant inside the same day, must both refuse.
 assert.match(String(claim(first.state).error),/already claimed/);
 assert.match(String(claim(at(first.state,when+3600000)).error),/already claimed/);
 // The next calendar day pays again.
 const next=claim(at(first.state,when+DAY));
 assert.equal(next.error,undefined,String(next.error));
 assert.equal(next.state.staffingMaterials.stock,MATERIALS_PER_DAY*2);
 assert.ok(valid(next.state));
 assert.deepEqual(decode(JSON.stringify(next.state)),next.state);
});

test('the reserve identity tracks granted, not claims x 100, so the rate can move',()=>{
 let s=enrolled();
 s=run(s,'claimStaffingMaterials');
 const r=s.staffingMaterials;
 assert.equal(r.granted,MATERIALS_PER_DAY);
 assert.equal(r.stock,r.granted,'nothing spent yet');
 // Spending moves stock but never granted: granted is the running total the identity checks against.
 const cost=staffingRule('Building_101',1).cost;
 const up=run(s,'upgradeStaffQuality','Building_101');
 assert.equal(up.staffingMaterials.granted,MATERIALS_PER_DAY,'granted must not move on a spend');
 assert.equal(up.staffingMaterials.stock,MATERIALS_PER_DAY-cost);
 assert.ok(valid(up));
 // A tampered stock is still refused: the identity is load-bearing, not decorative.
 assert.equal(valid({...up,staffingMaterials:{...up.staffingMaterials,stock:up.staffingMaterials.stock+1}}),false);
 assert.equal(valid({...up,staffingMaterials:{...up.staffingMaterials,granted:MATERIALS_PER_DAY*2}}),false);
});

test('a save written before granted existed still loads, untouched',()=>{
 const base=enrolled();
 // Exactly the shape the old faucet wrote: stock and claims only, stock === claims*100.
 for(const legacy of [{stock:200,claims:2},{stock:100000,claims:1000},{stock:0,claims:0}]){
  const s={...base,staffingMaterials:legacy};
  assert.ok(validStaffingReserve(s),`legacy reserve ${JSON.stringify(legacy)} must stay valid`);
  assert.ok(valid(s));
  assert.deepEqual(decode(JSON.stringify(s)),s,'a legacy reserve must not be rewritten on load');
 }
 // And a legacy reserve whose stock does NOT match claims*100 is still refused.
 assert.equal(validStaffingReserve({...base,staffingMaterials:{stock:250,claims:2}}),false);
});

test('reserve() reads every shape forward, so both writers agree',()=>{
 assert.deepEqual(reserve({}),{stock:0,claims:0,granted:0,days:[]});
 assert.deepEqual(reserve({staffingMaterials:{stock:200,claims:2}}),{stock:200,claims:2,granted:200,days:[]});
 const modern={stock:1000,claims:1,granted:1000,days:['2026-09-13']};
 assert.deepEqual(reserve({staffingMaterials:modern}),modern);
});

test('the day list is bounded and the ladder is reachable but no longer a button',()=>{
 // The claim history cannot grow without bound.
 let s=enrolled();const start=s.lastAt;
 for(let i=0;i<MATERIAL_CLAIM_DAYS+5;i++){
  const r=claim(at(s,start+i*DAY));
  assert.equal(r.error,undefined,String(r.error));
  s=r.state;
 }
 assert.equal(s.staffingMaterials.days.length,MATERIAL_CLAIM_DAYS,'the day list must be capped');
 assert.ok(valid(s));
 // The arc: a button no more, but still reachable. Stated so a retune is a deliberate edit.
 const ladder=id=>{let n=0;for(let q=1;q<26;q++)n+=staffingRule(id,q).cost;return n};
 const inn=ladder('Building_101'),all=BUSINESSES.reduce((n,d)=>n+ladder(d.id),0);
 assert.equal(inn,25_915);
 assert.equal(all,969_191);
 assert.equal(Math.ceil(inn/MATERIALS_PER_DAY),26,'the Inn ladder is 26 daily claims');
 assert.equal(Math.ceil(all/MATERIALS_PER_DAY),970,'all seventeen are 970 daily claims');
});
