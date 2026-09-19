import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {pearlPrice,supplyPurchasePlan,PEARL_ID,PEARL_PRICE_DOUBLING} from '../lib/adventure.mjs';
import {MAX_GOLD} from '../lib/limits.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};

test('the Skill Pearl price starts at 200 gold and doubles every 1,000 pearls bought (2,500 until 2026-09-18)',()=>{
 assert.equal(pearlPrice(0),200);
 assert.equal(pearlPrice(PEARL_PRICE_DOUBLING),400);
 assert.equal(pearlPrice(PEARL_PRICE_DOUBLING*10),204_800);
 assert.equal(PEARL_PRICE_DOUBLING,1000);
 assert.equal(pearlPrice(26_000),Math.round(200*2**26),'26,000 pearls in, one costs 13.4B');
 assert.equal(pearlPrice(1e7),MAX_GOLD,'the price never overflows');});

test('buying charges the ladder and records lifetime purchases; an old save starts at the base price',()=>{
 let s={...fresh(T),gold:1e12};
 assert.equal(s.shopPearls,undefined,'existing saves carry no counter');
 s=run(s,'buySupply',PEARL_ID,25);
 assert.equal(s.shopPearls,25);assert.equal(1e12-s.gold,Array.from({length:25},(_,n)=>pearlPrice(n)).reduce((a,b)=>a+b),'each pearl is charged its own rung');assert.equal(1e12-s.gold,5042);
 s={...s,shopPearls:PEARL_PRICE_DOUBLING*4};
 const before=s.gold;s=run(s,'buySupply',PEARL_ID,1);
 assert.equal(before-s.gold,3200,'the 4,001st pearl costs 16x the base');
 assert.equal(s.shopPearls,PEARL_PRICE_DOUBLING*4+1);
 assert.deepEqual(decode(JSON.stringify(s)),s);
 // Negative control: a counter that is not a whole number is not a save.
 assert.equal(valid({...s,shopPearls:-1}),false);assert.equal(valid({...s,shopPearls:1.5}),false);});

test('a purse short of the next rung buys only what it can afford',()=>{
 const s={...fresh(T),gold:pearlPrice(40_000)*3+1,shopPearls:40_000};
 assert.equal(supplyPurchasePlan(s,PEARL_ID,25).count,2,'rising price admits two of the next pearls, not three');
 // Negative control: other supplies keep their flat price and ignore the counter.
 const scroll=supplyPurchasePlan({...fresh(T),gold:3000,shopPearls:1e6},'local_skill_scroll',5);
 assert.deepEqual(scroll,{count:5,cost:1500,currency:'gold'});});
