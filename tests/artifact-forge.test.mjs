import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {artifactRule,artifactState,forgeCost,FORGE_MULTIPLIER,trackedCopies,ARTIFACT_CAP} from '../lib/artifacts.mjs';
import {GEAR} from '../lib/adventure.mjs';
import rules from '../lib/artifact-rules.json' with {type:'json'};
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
const ok=(s,a,t=null,v=null)=>{const r=run(s,a,t,v);assert.equal(r.error,undefined,r.error);return r.state};
const ore=(s,n)=>({...s,artifacts:{...artifactState(s),ore:n}});
const club='Item_Weapon_Equipment_1_1',unpriced='Item_Weapon_Equipment_6_5';

test('every artifact with a verified reward is priced, and the one without is not',()=>{
 const records=Object.entries(rules.records);
 assert.equal(records.length,84);
 const priced=records.filter(([id])=>forgeCost(id)!==null);
 assert.equal(priced.length,83);
 assert.equal(forgeCost(unpriced),null,'no verified recycle reward means no invented price');
 assert.equal(rules.records[unpriced].recycle,null,'recorded as no verified reward, not merely absent');
 for(const [id,r] of priced)assert.equal(forgeCost(id),r.recycle*FORGE_MULTIPLIER,id);
 // Every GEAR item the shelf can offer resolves through the same table.
 for(const g of GEAR)assert.ok(artifactRule(g.id),g.id);
});

test('forging costs more than melting returns, for all 83 priced artifacts',()=>{
 for(const [id,r] of Object.entries(rules.records)){
  const cost=forgeCost(id);if(cost===null)continue;
  assert.ok(cost>r.recycle,`${id} would be free to mint and melt`);
  assert.equal(cost-r.recycle,r.recycle,`${id} should lose exactly one refund`);}
});

test('forging spends the ore and adds exactly one level-one copy',()=>{
 const s=ore(fresh(1000),100),before=s.inventory[club];
 const r=run(s,'forgeArtifact',club);
 assert.equal(r.error,undefined,r.error);
 assert.equal(r.state.inventory[club],before+1);
 assert.equal(artifactState(r.state).ore,100-forgeCost(club));
 assert.equal(forgeCost(club),10,'an N artifact costs twice its 5 Ore reward');
 assert.match(r.message,/Forged one N artifact for 10 Magic Ore/);
 assert.ok(valid(r.state));assert.deepEqual(decode(JSON.stringify(r.state)),r.state);
 // Nothing else moved.
 for(const key of ['gold','crystals','fellowXP'])assert.equal(r.state[key],s[key],key);
});

test('mint then melt is a strict loss, so the forge is not an ore loop',()=>{
 let s=ore(fresh(1000),1000);
 const start=artifactState(s).ore;
 s=ok(s,'forgeArtifact',club);
 s=ok(s,'recycleArtifact',club,1);
 assert.equal(artifactState(s).ore,start-rules.records[club].recycle,'one refund lost per round trip');
 assert.ok(artifactState(s).ore<start);
 assert.equal(s.inventory[club],fresh(1000).inventory[club],'the copy is gone again');
});

test('mint, upgrade, then tracked melt is also a strict loss',()=>{
 let s=ore(fresh(1000),1000);
 const start=artifactState(s).ore;
 s=ok(s,'forgeArtifact',club);
 s=ok(s,'equip','hero_15',club);
 s=ok(s,'upgradeArtifact','hero_15');
 const spent=s.fellows.hero_15.gearOreSpent;
 assert.ok(spent>0);
 s=ok(s,'equip','hero_15',null);
 const [copy]=trackedCopies(s,club);
 s=ok(s,'recycleTrackedArtifact',club,{level:copy.level,spent:copy.spent});
 assert.equal(artifactState(s).ore,start-rules.records[club].recycle,'the upgrade investment returns, the forge margin does not');
 assert.ok(artifactState(s).ore<start);
 assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('repeated round trips drain ore rather than growing it',()=>{
 let s=ore(fresh(1000),1000);
 let previous=artifactState(s).ore;
 for(let i=0;i<8;i++){
  s=ok(s,'forgeArtifact',club);
  s=ok(s,'recycleArtifact',club,1);
  const now=artifactState(s).ore;
  assert.ok(now<previous,`round trip ${i} did not lose ore`);
  previous=now;}
 assert.equal(previous,1000-8*rules.records[club].recycle);
});

test('too little ore, the unpriced artifact and unknown targets are all refused',()=>{
 const s=ore(fresh(1000),9);
 const poor=run(s,'forgeArtifact',club);
 assert.match(poor.error,/costs 10 Magic Ore/);
 assert.deepEqual(poor.state,s,'a refusal leaves the save untouched');
 const rich=ore(fresh(1000),1e6);
 assert.match(run(rich,'forgeArtifact',unpriced).error,/No forge price is recorded/);
 assert.equal(rich.inventory[unpriced],run(rich,'forgeArtifact',unpriced).state.inventory[unpriced]);
 assert.match(run(rich,'forgeArtifact','not_an_artifact').error,/Choose an artifact to forge/);
 assert.match(run(rich,'forgeArtifact',null).error,/Choose an artifact to forge/);
});

test('a full bag refuses without spending ore',()=>{
 let s=ore(fresh(1000),1000);
 s={...s,inventory:{...s.inventory,[club]:1e6}};
 const r=run(s,'forgeArtifact',club);
 assert.match(r.error,/bag is full/);
 assert.equal(artifactState(r.state).ore,1000);
});

test('a forged artifact upgrades and caps exactly like any other copy',()=>{
 let s=ore(fresh(1000),50000);
 s=ok(s,'forgeArtifact',club);
 s=ok(s,'equip','hero_15',club);
 s=ok(s,'upgradeArtifactMax','hero_15');
 assert.equal(s.fellows.hero_15.gearLevel,ARTIFACT_CAP);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});
