import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {summonState,recruitOffers,recruitPrice,RECRUIT_RECEIPTS,RANK_FELLOWS} from '../lib/summon.mjs';
import {newFellow} from '../lib/adventure.mjs';
const T=new Date('2026-09-21T09:00:00').getTime();
const seq=s=>summonState(s).seq;
const buy=(s,id)=>{const r=act(s,'summonRecruit',s.lastAt,id,{seq:seq(s)});assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),id);return r;};
const stocked=(s,bag)=>({...s,summon:{...summonState(s),...bag}});
const base=()=>fresh(T);

test('the counter sells the whole priced roster and never what is already owned',()=>{
 const s=base();
 const offers=recruitOffers(s);
 assert.equal(offers.length,244,'266 shipped, less the 22 rank-up Fellows (which include the owned starter, hero_15); hero_60 is priced');
 assert.ok(!offers.some(o=>o.id==='hero_15'),'the starter Fellow is already owned');
 assert.ok(!offers.some(o=>RANK_FELLOWS.has(o.id)),'rank-up Fellows arrive through their encounters, never the counter');
 // hero_60 has no rarity in the public roster, so summonCost returned null and NOTHING in the game
 // could grant him. He is free-tier in the original, so the free list prices him and he is sellable.
 assert.ok(offers.some(o=>o.id==='hero_60'),'hero_60 is free-tier and now offered');
 for(const o of offers){assert.ok(o.cost,o.id);assert.equal(Object.keys(o.cost).length,1,o.id);}});

test('each currency buys, and the Fellow arrives exactly as recruit would build him',()=>{
 let s=stocked(base(),{stoneFragments:10,stones:5,valiant:4});
 const r=buy(s,'hero_60');s=r.state;
 assert.deepEqual(s.fellows.hero_60,newFellow(),'identical to a recruited Fellow');
 assert.equal(summonState(s).stoneFragments,10,'hero_60 is a town-event freebie in the original, so nothing is spent');
 assert.equal(r.recruited,'hero_60');
 s=buy(s,'hero_105').state;
 assert.equal(summonState(s).stones,3,'an SSR costs two stones');
 s=buy(s,'hero_195').state;
 assert.equal(summonState(s).valiant,2,'a UR costs two Valiant Insignias');
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);});

test('a Family member arrives in the Family shape, under the welcomed key',()=>{
 let s=stocked(base(),{stones:2});
 const r=buy(s,'wife_191');s=r.state;
 assert.deepEqual(s.family.wife_191,{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1});
 assert.equal(r.welcomed,'wife_191');
 assert.equal(r.recruited,undefined,'Family members are welcomed, not recruited');
 assert.equal(summonState(s).stones,0);});

test('too little of the right currency refuses without spending anything',()=>{
 const s=stocked(base(),{stoneFragments:2,stones:0,valiant:0});
 // wife_2, not hero_1: every N and R FELLOW is free-tier now, so no Fellow can refuse for want of
 // fragments. Family keeps its rarity pricing (15 characters still priced in fragments).
 for(const [id,want] of [['wife_2',/3 Acquaint Stone Fragments/],['hero_105',/2 Acquaint Stones/],['hero_195',/2 Valiant Insignias/]]){
  const r=act(s,'summonRecruit',s.lastAt,id,{seq:seq(s)});
  assert.match(r.error,want,id);
  assert.deepEqual(r.state,s,'a refusal leaves the save untouched');}});

test('unknown and already-joined targets are refused; nothing shipped is unpriced any more',()=>{
 let s=stocked(base(),{stones:9,stoneFragments:9,valiant:9});
 assert.match(act(s,'summonRecruit',s.lastAt,'nobody',{seq:seq(s)}).error,/Choose someone/);
 // hero_60 was the last unpriced character: no rarity in the public roster meant no price, and the
 // counter refused him outright. He is free-tier in the original, so he now sells for nothing.
 assert.deepEqual(recruitPrice('hero_60'),{stoneFragments:0});
 assert.equal(act(s,'summonRecruit',s.lastAt,'hero_60',{seq:seq(s)}).error,undefined);
 assert.match(act(s,'summonRecruit',s.lastAt,'hero_2',{seq:seq(s)}).error,/No price/,'a rank-up Fellow (Maxim, rank 3) is not sold');
 s=buy(s,'hero_60').state;
 assert.match(act(s,'summonRecruit',s.lastAt,'hero_60',{seq:seq(s)}).error,/Already joined/);});

test('a stale sequence number is refused, so a repeated tap cannot double charge',()=>{
 const s=stocked(base(),{stoneFragments:9});
 const first=buy(s,'hero_60');
 assert.match(act(first.state,'summonRecruit',first.state.lastAt,'hero_58',{seq:seq(s)}).error,/Summon rewards changed/);});

test('receipts record what was paid, stay unique and survive a reload',()=>{
 let s=stocked(base(),{stoneFragments:10,stones:4});
 s=buy(s,'hero_60').state;s=buy(s,'hero_105').state;
 const receipts=summonState(s).recruited;
 assert.deepEqual(receipts,[
  {id:'hero_60',kind:'fellows',paid:0,currency:'stoneFragments'},
  {id:'hero_105',kind:'fellows',paid:2,currency:'stones'}]);
 assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.ok(RECRUIT_RECEIPTS>=200);
 const forged={...s,summon:{...summonState(s),recruited:[...receipts,receipts[0]]}};
 assert.equal(valid(forged),false,'a duplicate receipt is rejected');
 const orphan={...s,summon:{...summonState(s),recruited:[{id:'hero_999',kind:'fellows',paid:1,currency:'stones'}]}};
 assert.equal(valid(orphan),false,'a receipt without the character is rejected');});

test('saves written before the counter existed still load',()=>{
 const s=base();
 const old={...s,summon:{policyVersion:1,seq:0,stoneFragments:4,stones:0,insigniaFragments:0,valiant:0,archangel:0,starShards:0,days:[],weeks:[]}};
 assert.ok(valid(old),'no recruited key is still a valid save');
 assert.deepEqual(summonState(old).recruited,[],'it reads back as an empty ledger');
 const r=act(old,'summonRecruit',old.lastAt,'hero_60',{seq:0});
 assert.equal(r.error,undefined,r.error);
 assert.ok(valid(r.state));});
