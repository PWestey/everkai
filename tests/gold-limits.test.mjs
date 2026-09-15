import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,settle,valid,decode,MAX_AWAY_MS,totalRate} from '../lib/game.mjs';
import {MAX_GOLD} from '../lib/limits.mjs';

test('away income is limited by the 12-hour window, not by a 1e9 pool',()=>{
 const s={...fresh(0),pending:5e9};assert.ok(valid(s));
 const later=settle(s,1000);
 assert.ok(later.pending>=5e9,`pending fell to ${later.pending}; the old clamp cut it to 1e9`);
 // The window itself is still the original's twelve hours: a day away pays the same as twelve hours.
 const half=settle(fresh(0),MAX_AWAY_MS),day=settle(fresh(0),2*MAX_AWAY_MS);
 assert.equal(day.pending,half.pending);assert.ok(totalRate(fresh(0))>0);});

test('the wallet holds trillions: collecting above 1e12 works, and MAX_GOLD stays exact',()=>{
 let s={...fresh(0),gold:2e12,pending:3e12};
 const r=act(s,'collect',0);assert.equal(r.error,undefined,r.error);
 assert.equal(r.state.gold,5e12);assert.ok(valid(r.state));assert.deepEqual(decode(JSON.stringify(r.state)),r.state);
 assert.ok(Number.isSafeInteger(MAX_GOLD*2),'a capped wallet plus a capped pool is still an exact integer');
 const full=act({...fresh(0),gold:MAX_GOLD-10,pending:100},'collect',0).state;
 assert.equal(full.gold,MAX_GOLD);assert.equal(full.pending,90,'the remainder waits instead of vanishing');});
