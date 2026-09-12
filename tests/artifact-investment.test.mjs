import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,SAVE_KEY} from '../lib/game.mjs';
import {GEAR} from '../lib/adventure.mjs';
import {trackedCopies,artifactRule} from '../lib/artifacts.mjs';
import {createPersistence} from '../lib/persistence.mjs';
const club='Item_Weapon_Equipment_1_1',run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
function equipped(){let s=run(fresh(1000),'claimAllGear').state;s=run(s,'equip','hero_15',club).state;s={...s,artifacts:{...(s.artifacts||{ore:0,bag:{}}),ore:1000}};return s;}
test('new investments survive batch upgrades, transfer, save reload and exact recycling',()=>{
 let s=equipped();s.artifacts.ore=35;s=run(s,'upgradeArtifactMax','hero_15').state;
 assert.equal(s.fellows.hero_15.gearOreSpent,30);assert.equal(s.artifacts.ore,5);
 assert.ok(run(s,'recycleTrackedArtifact',club,{level:4,spent:30}).error);
 s=run(s,'equip','hero_15',null).state;assert.deepEqual(trackedCopies(s,club),[{level:4,spent:30,count:1}]);
 s=decode(JSON.stringify(s));s=run(s,'recycleTrackedArtifact',club,{level:4,spent:30}).state;
 assert.equal(s.artifacts.ore,40);assert.equal(s.inventory[club],0);assert.deepEqual(trackedCopies(s,club),[]);assert.ok(valid(s));
 assert.ok(run(s,'recycleTrackedArtifact',club,{level:4,spent:30}).error);
});
test('mixed legacy and recorded copies remain distinguishable at the same level',()=>{
 let s=equipped();s=run(s,'upgradeArtifact','hero_15').state;s=run(s,'equip','hero_15',null).state;
 s.inventory[club]++;s.artifacts.bag[club][2]++; // Add one historical copy with unknown spending.
 s=run(s,'equip','hero_15',club).state;assert.equal(s.fellows.hero_15.gearOreSpent,10);
 assert.deepEqual(trackedCopies(s,club),[]);s=run(s,'equip','hero_15',null).state;
 s=run(s,'recycleTrackedArtifact',club,{level:2,spent:10}).state;assert.equal(s.inventory[club],1);
 s=run(s,'equip','hero_15',club).state;assert.equal(s.fellows.hero_15.gearOreSpent,undefined);
 s=run(s,'upgradeArtifact','hero_15').state;assert.equal(s.fellows.hero_15.gearOreSpent,undefined);
 s=run(s,'equip','hero_15',null).state;assert.deepEqual(trackedCopies(s,club),[]);assert.ok(valid(s));
});
test('refund uses recorded spending and rejects capacity overflow and malformed ledgers',()=>{
 let s=equipped();s=run(s,'upgradeArtifact','hero_15').state;
 s.fellows.hero_15.gearOreSpent=21; // Historical recorded price differs from today's rule.
 s=run(s,'upgradeArtifact','hero_15').state;assert.equal(s.fellows.hero_15.gearOreSpent,31);
 s=run(s,'equip','hero_15',null).state;s.artifacts.ore=1e9-35;
 assert.ok(run(s,'recycleTrackedArtifact',club,{level:3,spent:31}).error);assert.equal(s.inventory[club],1);
 for(const paidBag of [null,[],{[club]:{3:{31:2}}},{[club]:{4:{31:1}}},{[club]:{3:{'-1':1}}}]){
  const bad={...s,artifacts:{...s.artifacts,paidBag}};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));
 }
});
test('every known base reward returns invested Ore; unknown base reward stays protected',()=>{
 let s=run(fresh(1000),'claimAllGear').state;s.artifacts={ore:1000000,bag:{}};
 for(const g of GEAR){
  s=run(s,'equip','hero_15',g.id).state;const before=s.artifacts.ore,r=artifactRule(g.id);
  s=run(s,'upgradeArtifact','hero_15').state;s=run(s,'equip','hero_15',null).state;
  const result=run(s,'recycleTrackedArtifact',g.id,{level:2,spent:r.ore});
  if(r.recycle){assert.ok(!result.error);s=result.state;assert.equal(s.artifacts.ore,before+r.recycle)}else assert.ok(result.error);
 }
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('storage failure cannot admit a recycled copy or its refund',()=>{
 let s=equipped();s=run(s,'upgradeArtifact','hero_15').state;s=run(s,'equip','hero_15',null).state;
 let raw=JSON.stringify(s),fail=false;const disk={getItem:k=>k===SAVE_KEY?raw:null,setItem(k,v){if(fail)throw Error('quota');if(k===SAVE_KEY)raw=v}};
 const store=createPersistence(()=>disk);store.load(1000);const saved=store.current;fail=true;
 const next=run(saved,'recycleTrackedArtifact',club,{level:2,spent:10}).state;assert.throws(()=>store.commit(next));
 assert.equal(store.current,saved);assert.equal(decode(raw).inventory[club],1);assert.equal(decode(raw).artifacts.ore,saved.artifacts.ore);
});
