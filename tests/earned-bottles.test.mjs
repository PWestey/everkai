import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {fountainState,BOTTLES_PER_DAILY,BOTTLE_REFILL_MAX} from '../lib/fountain.mjs';
import {STAGE_BOTTLES,FRESH_FOUNTAIN} from '../lib/adventure.mjs';
import {starterHabits} from '../lib/habits.mjs';
const T=new Date('2026-09-17T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const refill=s=>run(s,'bottleRefill',null,{seq:fountainState(s).seq});
const withJournal=()=>({...fresh(T),habits:starterHabits(T),gold:1000000});
const dailies=s=>s.habits.items.filter(x=>x.freq==='daily');

test('Fairy Bottles are earned, never prepared by a button',()=>{
 const s=fresh(T);
 assert.equal(fountainState(s).bottles,0);
 assert.throws(()=>act(s,'wishSupply',T,null,{seq:0}),/Unknown action/,'the free bottle faucet is gone');});

test('clearing a stage releases bottles without fabricating Fairy entitlements',()=>{
 let s={...fresh(T),gold:1000000};
 s=run(s,'battle',1);
 assert.equal(fountainState(s).bottles,STAGE_BOTTLES);
 assert.equal(fountainState(s).total,0,'total counts fairies released by wishing, not bottles granted');
 assert.equal(s.adventure.cleared,1);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);});

test('the inlined fountain default cannot drift from fountainState',()=>{
 assert.deepEqual(Object.keys(FRESH_FOUNTAIN).sort(),Object.keys(fountainState(fresh(T))).sort());
 assert.deepEqual(FRESH_FOUNTAIN,fountainState(fresh(T)));});

test('the daily refill needs a finished habit, scales with dailies and lands once a day',()=>{
 let s=withJournal();
 assert.match(act(s,'bottleRefill',s.lastAt,null,{seq:0}).error,/Complete a daily habit/);
 s=run(s,'habitComplete',dailies(s)[0].id);
 s=refill(s);
 assert.equal(fountainState(s).bottles,BOTTLES_PER_DAILY,'one daily funds two bottles');
 assert.match(act(s,'bottleRefill',s.lastAt,null,{seq:fountainState(s).seq}).error,/already used/);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);});

test('a full day of habits funds about one ten-wish',()=>{
 let s=withJournal();
 for(const x of dailies(s).slice(0,BOTTLE_REFILL_MAX))s=run(s,'habitComplete',x.id);
 s=refill(s);
 assert.equal(fountainState(s).bottles,BOTTLE_REFILL_MAX,'the cap holds however many dailies are done');
 assert.ok(BOTTLE_REFILL_MAX>=9,'a ten-wish costs nine bottles');
 const before=fountainState(s).bottles;
 s=run(s,'wishDraw',null,{seq:fountainState(s).seq,count:10});
 assert.equal(fountainState(s).bottles,before-9);
 assert.equal(fountainState(s).total,10);});
