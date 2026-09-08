import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';import {GEAR,V9_ITEMS} from '../lib/adventure.mjs';
import {basicCopies,artifactState,gearLevel} from '../lib/artifacts.mjs';import added from '../lib/expanded-gear.json' with {type:'json'};
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v),club='Item_Weapon_Equipment_1_1';
test('v9 migration preserves progress and seeds only new artifact stacks',()=>{
 let old=run(fresh(1000),'welcome','wife_2').state;old=run(old,'sandboxAdventure').state;old=run(old,'equip','hero_15',club).state;old=run(old,'claimOre').state;old=run(old,'upgradeArtifact','hero_15').state;
 old.version=9;old.inventory=Object.fromEntries(Object.entries(old.inventory).filter(([id])=>id.startsWith('gift')||V9_ITEMS.some(i=>i.id===id)));
 old.family.wife_2.flatBlessing=12;old.familiars={Pet_1191:{level:11,stars:2}};
 const next=decode(JSON.stringify(old));assert.equal(next.version,10);for(const [k,v] of Object.entries(old))if(!['version','inventory'].includes(k))assert.deepEqual(next[k],v);
 for(const [id,n] of Object.entries(old.inventory))assert.equal(next.inventory[id],n);for(const g of added)assert.equal(next.inventory[g.id],0);
 assert.ok(valid(next));assert.deepEqual(decode(JSON.stringify(next)),next);
});
test('expanded artifacts can be claimed, upgraded and transferred without losing copies',()=>{
 assert.equal(GEAR.length,89);assert.equal(added.length,49);let s=run(fresh(1000),'claimAllGear').state;s=run(s,'claimOre').state;
 for(const g of added){s=run(s,'equip','hero_15',g.id).state;s=run(s,'claimOre').state;s=run(s,'upgradeArtifact','hero_15').state;assert.equal(gearLevel(s.fellows.hero_15),2);s=run(s,'equip','hero_15',null).state;assert.equal(basicCopies(s,g.id),0);assert.equal(s.artifacts.bag[g.id][2],1);}
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('recycling cannot touch upgraded or equipped copies and cannot overflow ore',()=>{
 let s=run(fresh(1000),'claimAllGear').state;s=run(s,'equip','hero_15',club).state;s=run(s,'claimOre').state;s=run(s,'upgradeArtifact','hero_15').state;s=run(s,'equip','hero_15',null).state;
 assert.ok(run(s,'recycleArtifact',club,1).error);s=run(s,'claimAllGear').state;const before=s.artifacts.ore;s=run(s,'recycleArtifact',club,'all').state;assert.equal(s.artifacts.ore,before+5);assert.equal(s.inventory[club],1);assert.equal(s.artifacts.bag[club][2],1);
 s=run(s,'claimAllGear').state;s.artifacts.ore=1e9-4;assert.ok(run(s,'recycleArtifact',club,1).error);assert.equal(s.inventory[club],2);
 assert.ok(run(s,'recycleArtifact','Item_Weapon_Equipment_6_5',1).error);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('maximum upgrade equals sequential upgrades and preserves unused ore',()=>{
 let s=run(fresh(1000),'claimAllGear').state;s=run(s,'equip','hero_15',club).state;s.artifacts.ore=25;
 let manual=run(s,'upgradeArtifact','hero_15').state;manual=run(manual,'upgradeArtifact','hero_15').state;
 const next=run(s,'upgradeArtifactMax','hero_15').state;assert.deepEqual(next,manual);assert.equal(artifactState(next).ore,5);assert.equal(gearLevel(next.fellows.hero_15),3);
});
