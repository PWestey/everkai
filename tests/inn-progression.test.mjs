import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,settle,decode,valid} from '../lib/game.mjs';
import {innRating,innStaminaCap,innServingGains} from '../lib/inn-progression.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
function setup(){let s=fresh(1000);for(const [a,t] of [['openEnterprise','Building_101'],['openInnService'],['buildInnStation','1'],['developInnRecipe','1']])s=run(s,a,t);return s;}
test('known station gains snapshot at reception and unlock rating stamina thresholds',()=>{
 let s=setup();s.inn.popularity=494;s=run(s,'receiveInnGuests','1',1);assert.deepEqual(s.inn.queue.gains,{finesse:100,popularity:6});
 s.inn.blueprints=10;s=run(s,'upgradeInnStation','1');s=settle(s,11000);
 assert.equal(s.inn.popularity,500);assert.equal(s.inn.finesse['1'],100);assert.equal(innRating(s.inn),2);assert.equal(innStaminaCap(s.inn),30);
 s=run(s,'refillInnStamina');assert.equal(s.inn.stamina,30);assert.deepEqual(innServingGains(s.inn,'1'),{finesse:110,popularity:8});assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('missing gains stay bounded and legacy queued meals keep their promised rewards',()=>{
 let s=setup();s.inn.stations['1']=3;assert.deepEqual(innServingGains(s.inn,'1'),{finesse:120,popularity:0});assert.deepEqual(innServingGains(s.inn,'57'),{finesse:1,popularity:0});
 s=run(s,'receiveInnGuests','1',1);delete s.inn.queue.gains;delete s.inn.popularity;const next=settle(decode(JSON.stringify(s)),11000);assert.equal(next.inn.finesse['1'],1);assert.equal(next.inn.popularity,0);
 for(const gains of [{finesse:0,popularity:0},{finesse:241,popularity:0},{finesse:100,popularity:35}])assert.equal(valid({...s,inn:{...s.inn,queue:{...s.inn.queue,gains}}}),false);
 const full={...s,inn:{...s.inn,queue:null,popularity:1e9,stations:{'1':1}}};assert.ok(act(full,'receiveInnGuests',1000,'1',1).error);
});
