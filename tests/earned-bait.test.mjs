import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {fishingState,castKey,STARTING_BAIT,BAIT_REFILL_MAX,BAIT_DUPLICATE_RETURN,FISH} from '../lib/fishing.mjs';
import {starterHabits} from '../lib/habits.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const cast=s=>run(s,'castFish',castKey(s),'Village River');
const withJournal=()=>({...fresh(T),habits:starterHabits(T)});

test('bait is stocked at the start, never granted by a button',()=>{
 const s=fresh(T);
 assert.equal(fishingState(s).bait,STARTING_BAIT);
 assert.throws(()=>act(s,'claimBait',T),/Unknown action/,'the free bait faucet is gone');});

test('a new collection entry returns the bait it cost; every third repeat returns one',()=>{
 let s=fresh(T),news=0,repeats=0;s={...s,fishing:{...fishingState(s),bait:100}};
 for(let n=0;n<60;n++){
  const before=fishingState(s),index=before.catches.length;s=cast(s);const c=fishingState(s).catches.at(-1);
  const back=c.duplicate?(index%BAIT_DUPLICATE_RETURN===0?1:0):1;
  assert.equal(fishingState(s).bait,before.bait-1+back,`cast ${index+1}`);
  if(c.duplicate)repeats++;else news++;
 }
 // Positive control: the draw really produced both kinds, so both branches above were exercised.
 assert.ok(news>0&&repeats>0,`${news} new, ${repeats} repeats`);
 assert.ok(fishingState(s).bait<100,'repeats drain the stock now that discovery is a draw');
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.ok(FISH.length>news);});

test('the daily refill needs a finished habit and only lands once a day',()=>{
 let s=withJournal();
 s={...s,fishing:{...fishingState(s),bait:0}};
 assert.match(act(s,'baitRefill',s.lastAt).error,/Complete a daily habit/);
 const first=s.habits.items.find(x=>x.freq==='daily');
 s=run(s,'habitComplete',first.id);
 s=run(s,'baitRefill');
 assert.equal(fishingState(s).bait,1,'one finished daily refills one bait');
 assert.match(act(s,'baitRefill',s.lastAt).error,/already used/);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);});

test('the refill is capped and respects bait storage',()=>{
 let s=withJournal();
 for(const x of s.habits.items.filter(x=>x.freq==='daily').slice(0,BAIT_REFILL_MAX+4))s=run(s,'habitComplete',x.id);
 s={...s,fishing:{...fishingState(s),bait:0}};
 s=run(s,'baitRefill');
 assert.equal(fishingState(s).bait,BAIT_REFILL_MAX,'more dailies than the cap still stops at the cap');
 let full=withJournal();
 full=run(full,'habitComplete',full.habits.items.find(x=>x.freq==='daily').id);
 full={...full,fishing:{...fishingState(full),bait:1000}};
 assert.match(act(full,'baitRefill',full.lastAt).error,/storage is full/);});
