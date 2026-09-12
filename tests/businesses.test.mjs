import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate,settle} from '../lib/game.mjs';
import {BUSINESSES,operationSlots,enterpriseBreakdown} from '../lib/businesses.mjs';
import {funded} from './gear-fixtures.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v),inn='Building_101',shop='Building_301';
test('17 local business identities retain documented employee rates and old saves remain unchanged',()=>{
 assert.equal(BUSINESSES.length,17);assert.equal(new Set(BUSINESSES.map(b=>b.id)).size,17);
 assert.deepEqual(BUSINESSES.map(b=>b.employeeRate),[1,2,3,4,6,8,10,15,20,25,30,35,40,50,60,70,80]);
 const old=fresh(1000);assert.deepEqual(decode(JSON.stringify(old)),old);
 let s=funded(old);for(const b of BUSINESSES)s=run(s,'openEnterprise',b.id).state;
 assert.deepEqual(s.buildings,old.buildings);assert.ok(Math.abs(totalRate(s)-totalRate(old)-1.7)<1e-9);
 for(const b of BUSINESSES)s=run(s,'hireEmployees',b.id,10).state;
 assert.ok(Math.abs(totalRate(s)-(totalRate(old)+1.7+BUSINESSES.reduce((n,b)=>n+10*b.employeeRate,0)))<1e-9);
 assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(valid(s));
});
test('staff thresholds open five slots, cap grants safely, and failed assignments do not move workers',()=>{
 assert.deepEqual([0,49,50,199,200,799,800,4999,5000].map(operationSlots),[1,1,2,2,3,3,4,4,5]);
 let s=run(funded(fresh(1000)),'openEnterprise',inn).state;s=run(s,'assignOperator',inn,'hero_15').state;
 assert.equal(s.buildings.fish.fellow,null);s=run(s,'recruit','hero_1').state;
 assert.ok(run(s,'assignOperator',inn,'hero_1').error);
 s=run(s,'hireEmployees',inn,50).state;s=run(s,'assignOperator',inn,'hero_1').state;
 assert.equal(s.enterprises[inn].fellows.length,2);
 s=run(s,'hireEmployees',inn,5000).state;assert.equal(s.enterprises[inn].employees,5000);
 assert.ok(run(s,'hireEmployees',inn,1).error);assert.ok(valid(s));
});
test('moves across original and starter businesses preserve unique assignments',()=>{
 let s=run(funded(fresh(1000)),'openEnterprise',inn).state;s=run(s,'openEnterprise',shop).state;
 s=run(s,'assignOperator',inn,'hero_15').state;s=run(s,'assignOperator',shop,'hero_15').state;
 assert.deepEqual(s.enterprises[inn].fellows,[]);assert.deepEqual(s.enterprises[shop].fellows,['hero_15']);
 assert.equal(enterpriseBreakdown(s,shop).operation,.1);
 s=run(s,'assign','fish','hero_15').state;assert.deepEqual(s.enterprises[shop].fellows,[]);assert.ok(valid(s));
 const bad=structuredClone(s);bad.enterprises[inn].fellows=['hero_15'];assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));
});
test('hiring settles past earnings at old rate and offline recovery uses new rate thereafter',()=>{
 const initial=run(funded(fresh(1000)),'openEnterprise',inn).state;
 const hired=act(initial,'hireEmployees',11000,inn,50).state;
 assert.equal(hired.pending,initial.pending+10*totalRate(initial));
 assert.equal(settle(hired,21000).pending,hired.pending+10*totalRate(hired));
 for(const employees of [-1,1.2,5001]){const bad={...hired,enterprises:{[inn]:{employees,fellows:[]}}};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
});

test('every original business receives total roster contribution regardless of assignments',()=>{
 let s=run(funded(fresh(1000)),'openEnterprise',inn).state;s=run(s,'openEnterprise',shop).state;
 s=run(s,'recruit','hero_1').state;
 assert.equal(enterpriseBreakdown(s,inn).operation,.2);assert.equal(enterpriseBreakdown(s,shop).operation,.2);
 s=run(s,'assignOperator',inn,'hero_1').state;
 assert.equal(enterpriseBreakdown(s,inn).operation,.2);assert.equal(enterpriseBreakdown(s,shop).operation,.2);
 s=run(s,'removeOperator',inn,'hero_1').state;
 assert.equal(enterpriseBreakdown(s,inn).operation,.2);
});
