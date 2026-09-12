import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {BUSINESSES,businessCost} from '../lib/businesses.mjs';

const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
const rich=(s,gold)=>({...s,gold});
const INN='Building_101',APOTHECARY='Building_201',WORKSHOP='Building_301';

test('every shipped business is priced from the original, not from us',()=>{
 assert.equal(BUSINESSES.length,17);
 for(const b of BUSINESSES){
  assert.ok(Number.isInteger(b.cost),b.id+' has no imported cost');
  assert.equal(businessCost(b.id),b.cost,b.id);
  assert.ok(businessCost(b.id)>0,b.id);
 }
 // The exact figures the extraction carries, so a reimport that changes them is loud.
 assert.equal(businessCost(INN),50);
 assert.equal(businessCost(APOTHECARY),100);
 assert.equal(businessCost(WORKSHOP),400);
 assert.equal(businessCost('Building_1701'),75000000000);
});

test('costs rise the whole way up the ladder',()=>{
 const ordered=[...BUSINESSES].map(b=>({id:b.id,cost:businessCost(b.id),order:b.order})).sort((a,b)=>a.order-b.order);
 for(let i=1;i<ordered.length;i++)
  assert.ok(ordered[i].cost>ordered[i-1].cost,`${ordered[i].id} should cost more than ${ordered[i-1].id}`);
});

test('an unknown business has no price rather than a guessed one',()=>{
 assert.equal(businessCost('Building_9999'),null);
 assert.equal(businessCost(''),null);
 assert.equal(businessCost(undefined),null);
});

test('opening a business spends the gold',()=>{
 const s=rich(fresh(1000),500);
 const r=run(s,'openEnterprise',INN);
 assert.equal(r.error,undefined,r.error);
 assert.equal(r.state.gold,450,'50 gold for the Inn');
 assert.deepEqual(r.state.enterprises[INN],{employees:0,fellows:[]});
 assert.match(r.message,/opened for 50 gold/);
 assert.ok(valid(r.state));assert.deepEqual(decode(JSON.stringify(r.state)),r.state);
});

test('too little gold refuses without opening or spending',()=>{
 const s=rich(fresh(1000),399);
 const r=run(s,'openEnterprise',WORKSHOP);
 assert.match(r.error,/400 gold/);
 assert.deepEqual(r.state,s,'a refusal leaves the save untouched');
 assert.equal(r.state.enterprises?.[WORKSHOP],undefined);
});

test('a fresh village can afford the first two buildings and not the third',()=>{
 // 250 starting gold: the Inn and Apothecary are reachable immediately, the Workshop is earned.
 let s=fresh(1000);
 assert.equal(s.gold,250);
 s=run(s,'openEnterprise',INN).state;
 s=run(s,'openEnterprise',APOTHECARY).state;
 assert.equal(s.gold,100);
 assert.match(run(s,'openEnterprise',WORKSHOP).error,/400 gold/);
});

test('an already-open business is refused and costs nothing twice',()=>{
 let s=rich(fresh(1000),500);
 s=run(s,'openEnterprise',INN).state;
 const before=s.gold;
 const again=run(s,'openEnterprise',INN);
 assert.match(again.error,/already open/);
 assert.equal(again.state.gold,before);
});

test('an unknown target is still refused before any gold check',()=>{
 const s=rich(fresh(1000),1e9);
 assert.match(run(s,'openEnterprise','Building_9999').error,/Choose a known business/);
 assert.equal(run(s,'openEnterprise','Building_9999').state.gold,1e9);
});
