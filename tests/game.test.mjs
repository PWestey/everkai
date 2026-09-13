import test from 'node:test';import assert from 'node:assert/strict';import {fresh,settle,act,rate,cost,decode,MAX_AWAY_MS} from '../lib/game.mjs';
test('upgrade is paid, increases earnings, and survives a serialized restart',()=>{let s=fresh(1000);s=act(s,'upgrade',1000).state;assert.equal(s.gold,250);assert.equal(s.fellowXP,200);assert.equal(s.fellows.hero_15.level,2);s=decode(JSON.stringify(s));assert.equal(s.fellows.hero_15.level,2);assert.equal(settle(s,2000).pending,30+rate(2))});
test('collecting twice cannot duplicate gold',()=>{const s=act(fresh(1000),'collect',2000).state;assert.equal(s.gold,282);assert.equal(act(s,'collect',2000).state.gold,282)});
test('insufficient Fellow EXP cannot grant a level',()=>{const s={...fresh(1000),fellowXP:0};assert.ok(act(s,'upgrade',1000).error);assert.equal(act(s,'upgrade',1000).state.fellows.hero_15.level,1)});
test('earnings before upgrade use old rate',()=>{const s=act(fresh(0),'upgrade',10000).state;assert.equal(s.pending,50);assert.equal(settle(s,11000).pending,53.5)});
test('clock rollback does not create duplicate earnings',()=>{const s=settle(fresh(1000),500);assert.equal(s.lastAt,1000);assert.equal(s.pending,30);assert.equal(settle(s,1000).pending,30)});
// Pins the number, not just the shape. The old assertion used MAX_AWAY_MS on both sides, so it held
// for any value and could not catch the constant drifting -- it passed unchanged when 8h became 12h.
// 12h is the original's own ceiling: System.json {"_id":"offlineMaxTime","integerValue":43200}.
test('away earnings stop at the original twelve-hour ceiling',()=>{
 assert.equal(MAX_AWAY_MS,12*60*60*1000);
 assert.equal(settle(fresh(0),MAX_AWAY_MS*4).pending,30+MAX_AWAY_MS/1000*2);
});
test('malformed and incompatible saves rejected',()=>{for(const s of [{},{...fresh(),version:99},{...fresh(),fellows:{hero_15:{level:0}}},{...fresh(),gold:-1},{...fresh(),lastAt:null}])assert.throws(()=>decode(JSON.stringify(s)))});
