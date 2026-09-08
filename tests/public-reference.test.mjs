import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';
import {affinityIds,referenceFor} from '../lib/public-reference.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {bondFactor,bondFor} from '../lib/bonds.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
test('reference facts match audited identities and exclude online-only IDs',()=>{
 assert.equal(FELLOWS.find(f=>f.id==='hero_15').rarity,'R');
 assert.equal(FELLOWS.find(f=>f.id==='hero_15').type,'Unfettered');
 assert.equal(FAMILY.find(f=>f.id==='wife_2').rarity,'N');
 assert.deepEqual(affinityIds('wife_2'),['hero_12','hero_5']);
 assert.equal(referenceFor('hero_261'),null);
});
test('documented bond trains all owned paired Fellows once, not arbitrary Fellows, and persists',()=>{
 let s=run(fresh(1000),'welcome','wife_2').state;
 assert.equal(bondFor(s,'wife_2').original,true);
 assert.ok(run(s,'bondTrain','wife_2').error);
 s=run(s,'recruit','hero_12').state;s.family.wife_2.points=100;
 s=run(s,'bondTrain','wife_2').state;
 assert.equal(s.family.wife_2.points,80);assert.equal(bondFactor(s,'hero_12'),1.02);assert.equal(bondFactor(s,'hero_15'),1);
 s=run(s,'recruit','hero_5').state;
 assert.equal(bondFactor(s,'hero_5'),1.02);
 assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(valid(s));
});
test('legacy custom bonds retain targets and training until an explicit switch',()=>{
 let s=run(fresh(1000),'welcome','wife_2').state;
 s.bonds.wife_2={fellow:'hero_15',level:4};
 s=decode(JSON.stringify(s));assert.equal(bondFactor(s,'hero_15'),1.08);
 s=run(s,'recruit','hero_12').state;
 s=run(s,'bondAffinity','wife_2').state;
 assert.equal(s.bonds.wife_2.level,4);assert.equal(bondFactor(s,'hero_15'),1);assert.equal(bondFactor(s,'hero_12'),1.08);
 s=run(s,'bondAssign','wife_2','hero_15').state;assert.equal(bondFactor(s,'hero_15'),1.08);assert.equal(bondFactor(s,'hero_12'),1);
 assert.ok(valid(s));
 const bad=structuredClone(s);bad.bonds.wife_2.original='yes';assert.throws(()=>decode(JSON.stringify(bad)));
});
