import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate,settle} from '../lib/game.mjs';
import {BUSINESSES,operationSlots,enterpriseBreakdown,canOperate,ANY_BUILDING_FELLOWS} from '../lib/businesses.mjs';
import {FELLOWS,fellowById} from '../lib/catalog.mjs';
import {funded,staffed} from './gear-fixtures.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v),inn='Building_101',shop='Building_301';
test('17 local business identities retain documented employee rates and old saves remain unchanged',()=>{
 assert.equal(BUSINESSES.length,17);assert.equal(new Set(BUSINESSES.map(b=>b.id)).size,17);
 assert.deepEqual(BUSINESSES.map(b=>b.employeeRate),[1,2,3,4,6,8,10,15,20,25,30,35,40,50,60,70,80]);
 const old=fresh(1000);assert.deepEqual(decode(JSON.stringify(old)),old);
 let s=funded(old);for(const b of BUSINESSES)s=run(s,'openEnterprise',b.id).state;
 assert.deepEqual(s.buildings,old.buildings);assert.ok(Math.abs(totalRate(s)-totalRate(old)-1.7)<1e-9);
 // Seeded rather than hired: this asserts the per-employee rate, and ten workers at the Magic Academy
 // alone cost about 195 million. tests/staffing.test.mjs guards the prices themselves.
 for(const b of BUSINESSES)s=staffed(s,b.id,10);
 assert.ok(Math.abs(totalRate(s)-(totalRate(old)+1.7+BUSINESSES.reduce((n,b)=>n+10*b.employeeRate,0)))<1e-9);
 assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(valid(s));
});
test('staff thresholds open five slots, cap grants safely, and failed assignments do not move workers',()=>{
 assert.deepEqual([0,49,50,199,200,799,800,4999,5000].map(operationSlots),[1,1,2,2,3,3,4,4,5]);
 // The Inn is Diligent, so its operators are Fifi (hero_1) and Belle (hero_12); Kaity is Unfettered.
 let s=run(funded(fresh(1000)),'openEnterprise',inn).state;s=run(s,'recruit','hero_1').state;s=run(s,'recruit','hero_12').state;
 s=run(s,'assign','fish','hero_1').state;s=run(s,'assignOperator',inn,'hero_1').state;
 assert.equal(s.buildings.fish.fellow,null);
 assert.match(String(run(s,'assignOperator',inn,'hero_15').error),/Only Diligent Fellows/,'Kaity is not Diligent');
 assert.ok(run(s,'assignOperator',inn,'hero_12').error,'one slot below 50 staff');
 s=staffed(s,inn,50);s=run(s,'assignOperator',inn,'hero_12').state;
 assert.equal(s.enterprises[inn].employees,50);
 assert.equal(s.enterprises[inn].fellows.length,2);
 // Staff is seeded because this is about slot thresholds and the cap, not about affording workers.
 s=staffed(s,inn,5000);assert.equal(s.enterprises[inn].employees,5000);
 // At the cap the refusal is the cap itself, before any price is quoted.
 assert.match(String(act({...s,gold:1e12},'hireEmployees',s.lastAt,inn,1).error),/limit reached/);assert.ok(valid(s));
});
test('moves across original and starter businesses preserve unique assignments',()=>{
 // Kaity is Unfettered: she moves between the two Unfettered businesses, Spring Resort (501) and 1001.
 const a='Building_501',b='Building_1001';
 let s=run(funded(fresh(1000)),'openEnterprise',a).state;s=run(s,'openEnterprise',b).state;
 s=run(s,'assignOperator',a,'hero_15').state;s=run(s,'assignOperator',b,'hero_15').state;
 assert.deepEqual(s.enterprises[a].fellows,[]);assert.deepEqual(s.enterprises[b].fellows,['hero_15']);
 assert.equal(enterpriseBreakdown(s,b).operation,.1);
 s=run(s,'assign','fish','hero_15').state;assert.deepEqual(s.enterprises[b].fellows,[]);assert.ok(valid(s));
 const bad=structuredClone(s);bad.enterprises[a].fellows=['hero_15'];assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));
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
test('a business employs only Fellows of its type; Maren and Adeline work anywhere; old mismatches are released on load',()=>{
 let s=run(funded(fresh(1000)),'openEnterprise',inn).state;
 assert.match(String(run(s,'assignOperator',inn,'hero_15').error),/Only Diligent Fellows can work at Inn/,'Unfettered Kaity at the Diligent Inn');
 // hero_193 (Maren) was the other 'works anywhere' Fellow and was deleted on 2026-09-17, so Adeline
 // is the only one left with the privilege (lib/businesses.mjs).
 assert.deepEqual([...ANY_BUILDING_FELLOWS],['hero_53']);
 for(const [id,type] of [['hero_53','Unfettered']]){
  const t=run(s,'recruit',id).state;assert.equal(fellowById(id).type,type);
  const r=run(t,'assignOperator',inn,id);assert.equal(r.error,undefined,`${id} works anywhere`);}
 for(const d of BUSINESSES){const owned=FELLOWS.filter(f=>canOperate(f.id,d)&&!ANY_BUILDING_FELLOWS.has(f.id));assert.ok(owned.every(f=>f.type===d.type),d.id);assert.ok(owned.length>=18,`${d.id} has ${owned.length} eligible Fellows`);}
 // The floor was 20 before the 2026-09-17 roster trim. Informed is now the tightest type at 18 --
 // still more than the 3 operator slots any business opens with, so no building lost its workforce.
 const perType={};for(const f of FELLOWS)if(f.type)perType[f.type]=(perType[f.type]||0)+1;
 assert.deepEqual(perType,{Unfettered:25,Diligent:25,Brave:20,Inspiring:23,Informed:18});
 // A save from before the rule, with Kaity operating the Inn, still loads -- with her released.
 const old=structuredClone(s);old.buildings.fish.fellow=null;old.enterprises[inn].fellows=['hero_15'];
 const loaded=decode(JSON.stringify(old));assert.deepEqual(loaded.enterprises[inn].fellows,[]);assert.ok(valid(loaded));
});
