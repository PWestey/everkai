import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {summonState,recruitOffers,recruitPrice,RECRUIT_RECEIPTS} from '../lib/summon.mjs';
import {newFellow} from '../lib/adventure.mjs';
const T=new Date('2026-09-21T09:00:00').getTime();
const seq=s=>summonState(s).seq;
const buy=(s,id)=>{const r=act(s,'summonRecruit',s.lastAt,id,{seq:seq(s)});assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),id);return r;};
const stocked=(s,bag)=>({...s,summon:{...summonState(s),...bag}});
const base=()=>fresh(T);

test('the counter sells the whole priced roster and never what is already owned',()=>{
 const s=base();
 const offers=recruitOffers(s);
 assert.equal(offers.length,257,'259 shipped, less the unpriced hero_60 and the starter Fellow');
 assert.ok(!offers.some(o=>o.id==='hero_15'),'the starter Fellow is already owned');
 assert.ok(!offers.some(o=>o.id==='hero_60'),'hero_60 has no recorded price');
 for(const o of offers){assert.ok(o.cost,o.id);assert.equal(Object.keys(o.cost).length,1,o.id);}});

test('each currency buys, and the Fellow arrives exactly as recruit would build him',()=>{
 let s=stocked(base(),{stoneFragments:10,stones:5,insignias:4});
 const r=buy(s,'hero_1');s=r.state;
 assert.deepEqual(s.fellows.hero_1,newFellow(),'identical to a recruited Fellow');
 assert.equal(summonState(s).stoneFragments,7,'an N costs three fragments');
 assert.equal(r.recruited,'hero_1');
 s=buy(s,'hero_105').state;
 assert.equal(summonState(s).stones,3,'an SSR costs two stones');
 s=buy(s,'hero_195').state;
 assert.equal(summonState(s).insignias,2,'a UR costs two insignias');
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);});

test('a Family member arrives in the Family shape, under the welcomed key',()=>{
 let s=stocked(base(),{stones:2});
 const r=buy(s,'wife_191');s=r.state;
 assert.deepEqual(s.family.wife_191,{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1});
 assert.equal(r.welcomed,'wife_191');
 assert.equal(r.recruited,undefined,'Family members are welcomed, not recruited');
 assert.equal(summonState(s).stones,0);});

test('too little of the right currency refuses without spending anything',()=>{
 const s=stocked(base(),{stoneFragments:2,stones:0,insignias:0});
 for(const [id,want] of [['hero_1',/3 Acquaint Stone Fragments/],['hero_105',/2 Acquaint Stones/],['hero_195',/2 insignias/]]){
  const r=act(s,'summonRecruit',s.lastAt,id,{seq:seq(s)});
  assert.match(r.error,want,id);
  assert.deepEqual(r.state,s,'a refusal leaves the save untouched');}});

test('unknown, unpriced and already-joined targets are all refused',()=>{
 let s=stocked(base(),{stones:9,stoneFragments:9,insignias:9});
 assert.match(act(s,'summonRecruit',s.lastAt,'nobody',{seq:seq(s)}).error,/Choose someone/);
 assert.equal(recruitPrice('hero_60'),null);
 assert.match(act(s,'summonRecruit',s.lastAt,'hero_60',{seq:seq(s)}).error,/No price is recorded/);
 assert.match(act(s,'summonRecruit',s.lastAt,'hero_15',{seq:seq(s)}).error,/Already joined/);
 s=buy(s,'hero_1').state;
 assert.match(act(s,'summonRecruit',s.lastAt,'hero_1',{seq:seq(s)}).error,/Already joined/);});

test('a stale sequence number is refused, so a repeated tap cannot double charge',()=>{
 const s=stocked(base(),{stoneFragments:9});
 const first=buy(s,'hero_1');
 assert.match(act(first.state,'summonRecruit',first.state.lastAt,'hero_11',{seq:seq(s)}).error,/Summon rewards changed/);});

test('receipts record what was paid, stay unique and survive a reload',()=>{
 let s=stocked(base(),{stoneFragments:10,stones:4});
 s=buy(s,'hero_1').state;s=buy(s,'hero_105').state;
 const receipts=summonState(s).recruited;
 assert.deepEqual(receipts,[
  {id:'hero_1',kind:'fellows',paid:3,currency:'stoneFragments'},
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
 const r=act(old,'summonRecruit',old.lastAt,'hero_1',{seq:0});
 assert.equal(r.error,undefined,r.error);
 assert.ok(valid(r.state));});
