import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,settle,totalRate} from '../lib/game.mjs';
import {BUSINESSES,enterpriseBreakdown,enterpriseRate} from '../lib/businesses.mjs';
import {fellowOperation} from '../lib/operations.mjs';
import {funded} from './gear-fixtures.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
function setup(){let s=funded(fresh(1000));for(const f of ['hero_1','hero_117'])s=run(s,'recruit',f);for(const id of ['Building_101','Building_701','Building_401'])s=run(s,'openEnterprise',id);return s;}
test('Fifi operation matches type and level 50 Inn bonus from the version-matched appoint table',()=>{
 const s=setup(),inn=BUSINESSES.find(b=>b.id==='Building_101'),cake=BUSINESSES.find(b=>b.id==='Building_701'),scroll=BUSINESSES.find(b=>b.id==='Building_401');
 s.fellows.hero_1.level=49;assert.equal(fellowOperation(s,'hero_1',inn).percent,30);
 s.fellows.hero_1.level=50;assert.equal(fellowOperation(s,'hero_1',inn).percent,50);assert.equal(fellowOperation(s,'hero_1',cake).percent,30);assert.equal(fellowOperation(s,'hero_1',scroll).percent,0);
 // hero_197 is not recruited here, so it is unknown for lack of ownership, not lack of data.
 assert.equal(fellowOperation(s,'hero_197',inn).known,false);
 // hero_15 is owned and now carries imported appoint data, but all of it is Unfettered (country 5),
 // so none of it applies to a Diligent Inn. Having data and having a matching effect are different.
 assert.equal(fellowOperation(s,'hero_15',inn).known,true);assert.equal(fellowOperation(s,'hero_15',inn).percent,0);
 assert.deepEqual(fellowOperation(s,'hero_1',inn).next.map(e=>e.minLevel),[200]);
 assert.equal(fellowOperation(s,'hero_117',scroll).percent,150);assert.equal(fellowOperation(s,'hero_117',inn).percent,0);
 // The community record stopped at 150 and said so: "Further 20% and 30% effects lack unlock levels
 // and are excluded." The original supplies those levels -- 50 and 200 -- so the ladder now resolves.
 s.fellows.hero_117.level=60;assert.equal(fellowOperation(s,'hero_117',scroll).percent,170);
 s.fellows.hero_117.level=200;assert.equal(fellowOperation(s,'hero_117',scroll).percent,200);
});
test('assignment moves only supported bonuses, retaining whole-roster base and persistence',()=>{
 let s=setup();s.fellows.hero_1.level=50;s.fellows.hero_1.breaks=3;s=run(s,'hireEmployees','Building_101',50);const base=enterpriseBreakdown(s,'Building_101');
 s=run(s,'assignOperator','Building_101','hero_1');let b=enterpriseBreakdown(s,'Building_101');assert.equal(b.operation,base.operation);assert.equal(b.total,(base.employees+base.operation)*1.5);
 s=run(s,'assignOperator','Building_701','hero_1');assert.equal(enterpriseBreakdown(s,'Building_101').bonus,0);assert.equal(enterpriseBreakdown(s,'Building_701').bonus,.3);
 s=run(s,'assignOperator','Building_401','hero_117');assert.equal(enterpriseBreakdown(s,'Building_401').bonus,1.5);
 assert.equal(enterpriseRate(s),Object.keys(s.enterprises).reduce((n,id)=>n+enterpriseBreakdown(s,id).total,0));assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.equal(settle(s,11000).pending,s.pending+10*totalRate(s));
 s=run(s,'removeOperator','Building_701','hero_1');assert.equal(enterpriseBreakdown(s,'Building_701').bonus,0);
});
test('assigning Operations settles earlier income before new bonus applies',()=>{
 const s=setup();const next=act(s,'assignOperator',11000,'Building_101','hero_1').state;
 assert.equal(next.pending,s.pending+10*totalRate(s));assert.equal(enterpriseBreakdown(next,'Building_101').bonus,.3);
});
test('Reir/Pump exact building and type scopes stack only while assigned; earlier income stays at old rate',()=>{
 let s=setup();for(const id of ['hero_3','hero_5']){s=run(s,'recruit',id);s.fellows[id].level=50;s.fellows[id].breaks=3;}
 s=funded(s);for(const id of ['Building_501','Building_1001','Building_601'])s=run(s,'openEnterprise',id);
 const definition=id=>BUSINESSES.find(b=>b.id===id);
 for(const [f,named,other,wrong] of [['hero_3','Building_401','Building_601','Building_501'],['hero_5','Building_501','Building_1001','Building_401']]){
  assert.equal(fellowOperation(s,f,definition(named)).percent,50);assert.equal(fellowOperation(s,f,definition(other)).percent,30);assert.equal(fellowOperation(s,f,definition(wrong)).percent,0);
  s.fellows[f].level=49;assert.equal(fellowOperation(s,f,definition(named)).percent,30);s.fellows[f].level=50;
 }
 s=run(s,'hireEmployees','Building_401',50);s=run(s,'assignOperator','Building_401','hero_117');const old=totalRate(s),before=s.pending;
 s=act(s,'assignOperator',s.lastAt+10000,'Building_401','hero_3').state;assert.equal(s.pending,before+10*old);assert.equal(enterpriseBreakdown(s,'Building_401').bonus,2);
 s=run(s,'assignOperator','Building_501','hero_5');assert.equal(enterpriseBreakdown(s,'Building_501').bonus,.5);
 const oldRemove=totalRate(s);const removed=act(s,'removeOperator',s.lastAt+10000,'Building_401','hero_3').state;assert.equal(removed.pending,s.pending+10*oldRemove);s=removed;assert.equal(enterpriseBreakdown(s,'Building_401').bonus,1.5);
 s=run(s,'assignOperator','Building_1001','hero_5');assert.equal(enterpriseBreakdown(s,'Building_501').bonus,0);assert.equal(enterpriseBreakdown(s,'Building_1001').bonus,.3);
 assert.equal(enterpriseRate(s),Object.keys(s.enterprises).reduce((sum,id)=>sum+enterpriseBreakdown(s,id).total,0));assert.deepEqual(decode(JSON.stringify(s)),s);
});
