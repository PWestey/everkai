import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';
import {bondedPower,fellowPower} from '../lib/adventure.mjs';
import {museumBonus,KEEPSAKES} from '../lib/museum.mjs';
const run=(s,a,t=null)=>act(s,a,s.lastAt,t);
test('existing saves have no Museum effects until keepsakes are accepted',()=>{
 const old=fresh(1000),before=bondedPower(old,'hero_15');
 assert.deepEqual(decode(JSON.stringify(old)),old);
 let s=run(old,'claimMuseum').state;
 assert.equal(KEEPSAKES.length,31);assert.equal(KEEPSAKES.filter(k=>k.effect).length,6);
 assert.equal(bondedPower(s,'hero_15'),before);
 assert.deepEqual(s.fellows,old.fellows);assert.deepEqual(s.inventory,old.inventory);
 assert.ok(run(s,'claimMuseum').error);assert.ok(run(s,'claimKeepsake','Collection_28').error);
 s=run(s,'acceptMuseum').state;s=run(s,'displayMuseum').state;assert.deepEqual(museumBonus(s),{aptitude:2,basicPowerPercent:6,powerPercent:4});
 assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(valid(s));
 s=run(s,'storeMuseum').state;assert.ok(bondedPower(s,'hero_15')>before);
 assert.equal(totalRate(s),totalRate(old));
});
test('Museum bonuses are derived and affect future recruits without changing training',()=>{
 let s=run(fresh(1000),'claimMuseum').state;s=run(s,'acceptMuseum').state;s=run(s,'displayMuseum').state;
 s=run(s,'recruit','hero_1').state;assert.ok(s.fellows.hero_1);
 for(const id of Object.keys(s.fellows)){
  const f=s.fellows[id];assert.equal(f.aptitude,10);
  assert.equal(bondedPower(s,id),Math.floor(fellowPower({...f,aptitude:12})*1.06*1.04));
 }
 assert.equal(totalRate(s),totalRate(fresh(1000)));
 const displayed=run(s,'displayMuseum').state;assert.deepEqual(displayed,s);
 s=run(s,'toggleKeepsake','Collection_28').state;assert.equal(museumBonus(s).aptitude,2);
 assert.ok(valid(s));
});
test('only known collected keepsakes may be displayed and malformed restores fail',()=>{
 const s=fresh(1000);
 assert.ok(run(s,'toggleKeepsake','Collection_28').error);
 assert.ok(run(s,'claimKeepsake','unknown').error);
 for(const museum of [null,[],true,{Collection_28:1},{unknown:true},{Collection_28:{level:1}}]){
  assert.equal(valid({...s,museum}),false);
  assert.throws(()=>decode(JSON.stringify({...s,museum})));
 }
 const collected=run(s,'claimKeepsake','Collection_24').state;
 assert.equal(collected.crystals,s.crystals);assert.ok(run(collected,'claimKeepsake','Collection_24').error);
 assert.ok(run(collected,'toggleKeepsake','Collection_24').error);assert.equal(run(collected,'acceptKeepsake','Collection_24').state.crystals,s.crystals);
});

test('legacy displayed keepsakes retain accepted bonuses after storing; invalid acceptance is rejected',()=>{
 const legacy={...fresh(1000),museum:{Collection_28:true,Collection_29:false}};
 const power=bondedPower(legacy,'hero_15');let s=run(legacy,'storeMuseum').state;
 assert.deepEqual(s.museumAccepted,['Collection_28']);assert.equal(bondedPower(s,'hero_15'),power);
 assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(run(s,'acceptKeepsake','Collection_28').error);
 s=run(s,'acceptKeepsake','Collection_29').state;assert.equal(museumBonus(s).powerPercent,2);
 for(const museumAccepted of [null,{},['unknown'],['Collection_28','Collection_28']])assert.equal(valid({...s,museumAccepted}),false);
 assert.equal(valid({...fresh(1000),museumAccepted:[]}),false);
});
