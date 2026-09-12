import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';
import {bondedPower} from '../lib/adventure.mjs';
import {artifactState,gearLevel,ARTIFACT_CAP} from '../lib/artifacts.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v),club='Item_Weapon_Equipment_1_1';
test('artifact upgrades use ore and affect equipped Fellow only, persist through transfers',()=>{
 let s=run(fresh(1000),'sandboxAdventure').state;s=run(s,'equip','hero_15',club).state;
 const before=structuredClone(s),power=bondedPower(s,'hero_15'),income=totalRate(s);
 assert.ok(run(s,'upgradeArtifact','hero_15').error);s={...s,artifacts:{...(s.artifacts||{ore:0,bag:{}}),ore:1000}};s=run(s,'upgradeArtifact','hero_15').state;
 assert.equal(artifactState(s).ore,990);assert.equal(gearLevel(s.fellows.hero_15),2);assert.ok(bondedPower(s,'hero_15')>power);assert.ok(totalRate(s)>income);assert.equal(gearLevel(before.fellows.hero_15),1);
 s=run(s,'equip','hero_15',null).state;assert.equal(s.artifacts.bag[club][2],1);
 s=run(s,'recruit','hero_1').state;s=run(s,'equip','hero_1',club).state;assert.equal(gearLevel(s.fellows.hero_1),2);assert.equal(s.artifacts.bag[club],undefined);
 s=run(s,'equip','hero_15',club).state;assert.equal(gearLevel(s.fellows.hero_15),1);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('old saves retain base equipment; invalid instance metadata is rejected',()=>{
 let s=fresh(1000);assert.deepEqual(decode(JSON.stringify(s)),s);
 s=run(s,'sandboxAdventure').state;s=run(s,'equip','hero_15',club).state;
 for(const mutation of [x=>x.fellows.hero_15.gearLevel=0,x=>x.fellows.hero_15.gearLevel=ARTIFACT_CAP+1,x=>x.artifacts={ore:-1,bag:{}},x=>x.artifacts={ore:0,bag:{[club]:{'2':100}}},x=>x.artifacts={ore:0,bag:{bad:{'2':1}}}]){const x=structuredClone(s);mutation(x);assert.throws(()=>decode(JSON.stringify(x)));}
});
test('level cap and inventory limits cannot consume ore or lose equipped copies',()=>{
 let s=run(fresh(1000),'sandboxAdventure').state;s=run(s,'equip','hero_15',club).state;s={...s,artifacts:{...(s.artifacts||{ore:0,bag:{}}),ore:1000}};
 s.fellows.hero_15.gearLevel=ARTIFACT_CAP;const ore=s.artifacts.ore;assert.ok(run(s,'upgradeArtifact','hero_15').error);assert.equal(s.artifacts.ore,ore);
 s.inventory[club]=1e6;assert.ok(run(s,'equip','hero_15',null).error);assert.equal(gearLevel(s.fellows.hero_15),ARTIFACT_CAP);
});
