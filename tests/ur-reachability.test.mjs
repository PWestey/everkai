import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {summonState,recruitPrice,recruitRarity,SUMMON_COSTS,INSIGNIA_FRAGMENTS_PER_INSIGNIA} from '../lib/summon.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();

// ECON-28 was "49 UR-class characters recruit FREE against a wallet key that does not exist". It is
// fixed: UR/UR*/set are priced in valiant/archangel, which summonState holds, and a zero wallet is
// refused. tests/currency-reachability.test.mjs guards that half -- every priced currency is a key the
// wallet HAS.
//
// THE HALF NOBODY GUARDED is the opposite failure, and it is just as bad: a currency the wallet holds
// but nothing can EARN makes those same 49 characters unobtainable instead of free. That guard cannot
// be written by reading names; it has to play the game. So this walks the whole chain with real
// actions -- finish habits, claim a perfect day, forge, recruit -- and if any link breaks, it fails.
const perfectDays=(n)=>{
 let s={...fresh(T),habits:starterHabits(T)},days=0;
 for(let d=0;d<40&&days<n;d++){
  const at=T+d*86400000;
  for(const h of s.habits.items.filter(x=>x.freq==='daily')){const r=act(s,'habitComplete',at,h.id);if(!r.error)s=r.state}
  const c=act(s,'summonClaimDay',at,null,{seq:summonState(s).seq});
  if(!c.error){s=c.state;days++}
 }
 assert.equal(days,n,`only ${days} perfect days claimed of ${n}`);
 return s;
};

test('a UR is reachable from habits alone, through every link of the chain',()=>{
 const cost=recruitPrice('hero_113');
 assert.equal(recruitRarity('hero_113'),'UR');
 assert.deepEqual(cost,{valiant:2},'a UR is priced in valiant');

 // Enough perfect days to forge the two insignias a UR costs.
 const need=INSIGNIA_FRAGMENTS_PER_INSIGNIA*cost.valiant;
 let s=perfectDays(need);
 assert.equal(summonState(s).insigniaFragments,need,'perfect days are the faucet, 1 fragment each');

 for(let i=0;i<cost.valiant;i++){
  const f=act(s,'summonForge',s.lastAt,'valiant',{seq:summonState(s).seq});
  assert.equal(f.error,undefined,f.error);s=f.state;
 }
 assert.equal(summonState(s).valiant,cost.valiant);
 assert.equal(summonState(s).insigniaFragments,0,'the fragments were spent, not duplicated');

 const joined=act(s,'summonRecruit',s.lastAt,'hero_113',{seq:summonState(s).seq});
 assert.equal(joined.error,undefined,joined.error);
 assert.ok(joined.state.fellows.hero_113,'the UR joined');
 assert.equal(summonState(joined.state).valiant,0,'and was charged for');
 assert.ok(valid(joined.state));
 assert.deepEqual(decode(JSON.stringify(joined.state)),joined.state);});

test('a UR is still refused when the chain has not been walked',()=>{
 // Negative control for the test above: without the habits, the same call fails. If this ever passes,
 // ECON-28 is back.
 const s=fresh(T);
 const r=act(s,'summonRecruit',s.lastAt,'hero_113',{seq:summonState(s).seq});
 assert.match(r.error,/Needs 2 Valiant Insignias/);
 assert.equal(s.fellows.hero_113,undefined);
 // And the wallet is untouched -- no NaN, which is the shape the original defect wrote.
 for(const [k,v] of Object.entries(summonState(s)))
  if(typeof v==='number')assert.ok(Number.isFinite(v),`${k} is ${v}`);});

test('every priced currency has a faucet, not just a wallet slot',()=>{
 // Reading the cost table alone cannot answer this, so each currency is EARNED here with real actions.
 const priced=new Set(Object.values(SUMMON_COSTS).map(c=>Object.keys(c)[0]));
 assert.deepEqual([...priced].sort(),['archangel','stoneFragments','stones','valiant']);

 const s=perfectDays(INSIGNIA_FRAGMENTS_PER_INSIGNIA);
 const w=summonState(s);
 assert.ok(w.stoneFragments>0,'stoneFragments come from a claimed day');
 assert.ok(w.insigniaFragments>0,'insigniaFragments come from a PERFECT day');
 // stones and both insignias are forged from those fragments, so reaching the forge proves the rest.
 const forged=act(s,'summonForge',s.lastAt,'valiant',{seq:summonState(s).seq});
 assert.equal(forged.error,undefined,forged.error);
 const other=perfectDays(INSIGNIA_FRAGMENTS_PER_INSIGNIA);
 const arch=act(other,'summonForge',other.lastAt,'archangel',{seq:summonState(other).seq});
 assert.equal(arch.error,undefined,arch.error);
 // Positive control: a currency with no faucet would fail here, which is the whole point.
 assert.ok(summonState(forged.state).valiant===1&&summonState(arch.state).archangel===1);});

test('the dead `insignias` key from the defect window is dropped on load',()=>{
 // Saves written while UR was priced in a phantom currency hold `insignias: null` (a NaN, stringified).
 // Nothing reads it; this is hygiene, so the defect leaves no trace in a real save.
 const s=fresh(T);
 const damaged={...s,summon:{...summonState(s),insignias:null}};
 assert.ok(JSON.stringify(damaged).includes('"insignias":null'),'the fixture really carries the key');
 const back=decode(JSON.stringify(damaged));
 assert.equal(Object.hasOwn(back.summon,'insignias'),false,'the dead key is gone');
 assert.equal(summonState(back).valiant,0,'and the real wallet is untouched');
 assert.deepEqual(decode(JSON.stringify(back)),back,'the repair is inert on an already-clean save');});

test('the whole catalogue is priced in a currency the wallet holds',()=>{
 const wallet=new Set(Object.keys(summonState(fresh(T))));
 const phantom=new Set();
 for(const p of [...FELLOWS,...FAMILY]){
  const cost=recruitPrice(p.id);
  if(cost&&!wallet.has(Object.keys(cost)[0]))phantom.add(Object.keys(cost)[0]);
 }
 assert.deepEqual([...phantom],[],'a cost names a currency no wallet holds -- ECON-28 has returned');
 // Positive control on the probe: a made-up key really would be caught.
 assert.equal(wallet.has('insignias'),false);});
