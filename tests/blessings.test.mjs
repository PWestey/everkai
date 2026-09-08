import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';
import {bondedPower} from '../lib/adventure.mjs';
import {blessingPower} from '../lib/blessings.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
test('flat blessing levels use cumulative totals and correct next-level cost',()=>{
 let s=run(fresh(1000),'welcome','wife_2').state;s.family.wife_2.points=10000;
 s=run(s,'trainBlessing','wife_2','flatBlessing').state;assert.equal(s.family.wife_2.points,9900);
 s=run(s,'trainBlessing','wife_2','flatBlessing').state;assert.equal(s.family.wife_2.points,9790);assert.equal(blessingPower(s,'hero_12').flat,1700);assert.equal(blessingPower(s,'hero_15').flat,0);
 s=run(s,'recruit','hero_12').state;assert.equal(bondedPower(s,'hero_12'),1800);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('percentage is applied before flat Power and custom pairings cannot redirect blessings',()=>{
 let s=run(fresh(1000),'welcome','wife_2').state;s=run(s,'recruit','hero_12').state;s.family.wife_2.points=10000;
 const rate=totalRate(s);s=run(s,'trainBlessing','wife_2','advancedBlessing').state;assert.equal(s.family.wife_2.points,9500);
 s=run(s,'trainBlessing','wife_2','flatBlessing').state;s=run(s,'bondAssign','wife_2','hero_15').state;
 assert.equal(blessingPower(s,'hero_12').percent,.005);assert.equal(bondedPower(s,'hero_12'),1100);assert.equal(blessingPower(s,'hero_15').percent,0);assert.equal(totalRate(s),rate);
});
test('unowned family, invalid keys, missing costs and corruption are rejected',()=>{
 let s=fresh(1000);assert.ok(run(s,'trainBlessing','wife_2','flatBlessing').error);s=run(s,'welcome','wife_2').state;
 assert.ok(run(s,'trainBlessing','wife_2','flatBlessing').error);assert.ok(run(s,'trainBlessing','wife_2','toString').error);
 s.family.wife_2.flatBlessing=36;s.family.wife_2.points=10000;assert.ok(run(s,'trainBlessing','wife_2','flatBlessing').error);
 s.family.wife_2.flatBlessing=37;assert.throws(()=>decode(JSON.stringify(s)));
});

test('expanded curves preserve old level ten and batch training equals manual upgrades',()=>{
 let s=run(fresh(1000),'welcome','wife_2').state;s.family.wife_2.flatBlessing=10;s.family.wife_2.points=490;
 let manual=run(s,'trainBlessing','wife_2','flatBlessing').state;manual=run(manual,'trainBlessing','wife_2','flatBlessing').state;
 const batch=run(s,'trainBlessingsMax','wife_2','flatBlessing').state;assert.deepEqual(batch,manual);assert.equal(batch.family.wife_2.flatBlessing,12);assert.equal(batch.family.wife_2.points,0);assert.equal(blessingPower(batch,'hero_12').flat,20800);assert.deepEqual(decode(JSON.stringify(batch)),batch);
});
test('batch stops at published caps and preserves unused points',()=>{
 let s=run(fresh(1000),'welcome','wife_2').state;s.family.wife_2.points=100000;
 s=run(s,'trainBlessingsMax','wife_2','advancedBlessing').state;assert.equal(s.family.wife_2.advancedBlessing,24);assert.equal(blessingPower(s,'hero_12').percent,.12);assert.ok(s.family.wife_2.points>0);assert.ok(run(s,'trainBlessingsMax','wife_2','advancedBlessing').error);
});
