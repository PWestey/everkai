import test from 'node:test';import assert from 'node:assert/strict';
import {summonCost,SUMMON_COSTS,STONE_FRAGMENTS_PER_STONE} from '../lib/summon.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import roster from '../lib/public-roster.json' with {type:'json'};

test('the cheapest characters are priced below a whole stone',()=>{
 assert.deepEqual(summonCost('N'),{stoneFragments:3});
 assert.deepEqual(summonCost('R'),{stoneFragments:5});
 assert.ok(SUMMON_COSTS.N.stoneFragments<STONE_FRAGMENTS_PER_STONE,'an N is less than one stone');
 assert.ok(SUMMON_COSTS.R.stoneFragments<STONE_FRAGMENTS_PER_STONE,'an R is less than one stone');
 assert.ok(SUMMON_COSTS.N.stoneFragments<SUMMON_COSTS.R.stoneFragments,'N is cheaper than R');});

test('an unknown rarity is refused, never quietly charged as SSR',()=>{
 for(const bad of [undefined,null,'','LR','nonsense',{},0])
  assert.equal(summonCost(bad),null,String(bad));
 assert.notDeepEqual(summonCost('LR'),SUMMON_COSTS.SSR,'the old silent default is gone');});

test('rarity chains price from their head, and the whole roster is priced',()=>{
 assert.deepEqual(summonCost('SSR -> UR'),SUMMON_COSTS.SSR);
 assert.deepEqual(summonCost('SSR+ -> UR*'),SUMMON_COSTS['SSR+']);
 const people=[...FELLOWS,...FAMILY];
 const unpriced=people.filter(p=>!summonCost(roster.records[p.id]?.rarity)).map(p=>p.id);
 // hero_60 Kamakura ships with art and an extraction record but is absent from the public roster
 // snapshot, so it has no rarity to price. The counter refuses it rather than inventing a cost.
 assert.deepEqual(unpriced,['hero_60']);
 assert.equal(people.length-unpriced.length,258);});

test('every tier is payable in exactly one currency',()=>{
 for(const [tier,cost] of Object.entries(SUMMON_COSTS)){
  const keys=Object.keys(cost);
  assert.equal(keys.length,1,`${tier} mixes currencies`);
  assert.ok(['stoneFragments','stones','insignias'].includes(keys[0]),`${tier} uses an unknown currency`);
  assert.ok(Number.isInteger(cost[keys[0]])&&cost[keys[0]]>0,`${tier} has a bad amount`);}});
