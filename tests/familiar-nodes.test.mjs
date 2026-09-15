import test from 'node:test';import {withItems,grantFragments} from './progression-helpers.mjs';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';
import {familiarBonus,familiarNodes} from '../lib/familiar-nodes.mjs';
import {bondedPower} from '../lib/adventure.mjs';
const pet='Pet_4151',run=(s,a,t=pet,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state;};
const setup=()=>run(fresh(1000),'adoptFamiliar');
// A bond pays by stage (nothing at stage 1, all of it at stage 10). Tests about WHAT a bond pays stage the
// familiar to level 450 directly; tests/known-defects.test.mjs covers what reaching that stage costs.
const staged=s=>({...s,familiars:{...s.familiars,[pet]:{...s.familiars[pet],level:Math.max(450,s.familiars[pet].level)}}});
test('UR source nodes require level or stars and explicit activation',()=>{
 let s=setup();assert.ok(act(s,'activateFamiliarNode',1000,pet,'level:5').error);
 s=run(withItems(s),'trainFamiliar',pet,10);s=run(s,'bindFamiliar',pet,'hero_15');assert.equal(familiarBonus(s,'hero_15').flat,0,'a stage-1 bond pays nothing');s=staged(s);assert.equal(familiarBonus(s,'hero_15').flat,3000000);
 s=run(s,'activateFamiliarNode',pet,'level:5');assert.equal(familiarBonus(s,'hero_15').flat,3125000);
 s=run(s,'activateFamiliarNode',pet,'level:10');assert.equal(familiarBonus(s,'hero_15').aptitude,10);
 s=run(withItems(s),'starFamiliar');s=run(s,'activateFamiliarNode',pet,'star:1');assert.equal(familiarBonus(s,'hero_15').aptitude,50);
 assert.ok(act(s,'activateFamiliarNode',1000,pet,'star:1').error);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('binding is one-to-one and follows the selected Fellow without destroying activation',()=>{
 let s=setup();s=run(s,'recruit','hero_1');s=run(withItems(s),'trainFamiliar',pet,10);s=run(s,'activateFamiliarNodes');s=run(s,'bindFamiliar',pet,'hero_15');
 const boosted=bondedPower(s,'hero_15');s=run(s,'bindFamiliar',pet,'hero_1');assert.ok(bondedPower(s,'hero_15')<boosted);assert.equal(s.familiarBonds.hero_15,undefined);
 s=run(s,'adoptFamiliar','Pet_1191');s=run(s,'bindFamiliar','Pet_1191','hero_1');assert.deepEqual(s.familiarBonds,{hero_1:'Pet_1191'});assert.ok(s.familiarNodes[pet].length);
 s=run(s,'unbindFamiliar','Pet_1191');assert.deepEqual(s.familiarBonds,{});
});
test('node activation settles old income, increases roster income, and rejects malformed saves',()=>{
 let s=setup();s=run(s,'openEnterprise','Building_101');s=run(withItems(s),'trainFamiliar',pet,10);s=run(s,'bindFamiliar',pet,'hero_15');
 const r=act(s,'activateFamiliarNodes',11000,pet);assert.equal(r.state.pending,s.pending+10*totalRate(s));assert.ok(totalRate(r.state)>totalRate(s));assert.ok(valid(r.state));
 for(const extra of [{familiarNodes:{[pet]:['level:495']}},{familiarNodes:{[pet]:['level:5','level:5']}},{familiarBonds:{missing:pet}},{familiarBonds:{hero_15:'missing'}},{familiarNodes:[]},{familiarNodes:null},{familiarBonds:null}]){const bad={...s,...extra};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
 assert.equal(familiarNodes(pet).length,199);
});

test('inherent effects apply only while bound, independently of node activation',()=>{
 let s=staged(setup());const base=bondedPower(s,'hero_15');s=run(s,'bindFamiliar',pet,'hero_15');
 assert.deepEqual(familiarBonus(s,'hero_15'),{flat:3000000,aptitude:0,percent:0,finalPercent:15});
 assert.equal(bondedPower(s,'hero_15'),Math.floor((base+3000000)*1.15));assert.equal(s.familiarNodes,undefined);
 s=run(s,'unbindFamiliar');assert.equal(bondedPower(s,'hero_15'),base);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('inherent binding and unbinding settle elapsed income at the previous rate',()=>{
 let s=staged(setup());s=run(s,'openEnterprise','Building_101');
 const bound=act(s,'bindFamiliar',11000,pet,'hero_15').state;
 assert.equal(bound.pending,s.pending+10*totalRate(s));assert.ok(totalRate(bound)>totalRate(s));
 const unbound=act(bound,'unbindFamiliar',21000,pet).state;
 assert.equal(unbound.pending,bound.pending+10*totalRate(bound));assert.equal(totalRate(unbound),totalRate(s));
});
