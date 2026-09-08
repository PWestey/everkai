import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';import {FELLOWS} from '../lib/catalog.mjs';import {talentRule} from '../lib/talents.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
test('rarity talent increments consume documented costs without replacing previous aptitude',()=>{
 for(const rarity of ['N','R','SR','SSR']){
  const id=FELLOWS.find(f=>f.rarity===rarity).id,r=talentRule(id);let s=fresh(1000);if(!s.fellows[id])s=run(s,'recruit',id).state;
  s.fellows[id].aptitude=50;s.inventory.Item_Talent_Hero_1=10;
  s=run(s,'trainTalent',id).state;assert.equal(s.fellows[id].aptitude,50+r.amount);assert.equal(s.inventory.Item_Talent_Hero_1,10-r.cost);assert.equal(s.fellows[id].talentLevel,1);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
 }
});
test('missing next rows and insufficient pearls never consume resources',()=>{
 let s=fresh(1000);assert.ok(run(s,'trainTalent','hero_15').error);s.inventory.Item_Talent_Hero_1=50;s.fellows.hero_15.talentLevel=12;
 const before=structuredClone(s);assert.ok(run(s,'trainTalent','hero_15').error);assert.deepEqual(s,before);s.fellows.hero_15.talentLevel=13;assert.throws(()=>decode(JSON.stringify(s)));
});
