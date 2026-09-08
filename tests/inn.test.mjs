import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid,settle,totalRate} from '../lib/game.mjs';
import {INN_STATIONS,INN_DISHES,innRecipeReady} from '../lib/inn.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
const setup=()=>run(run(fresh(1000),'openEnterprise','Building_101'),'openInnService');
test('station and recipe unlocks follow source gates, with complete loop to upgrades',()=>{
 let s=setup();assert.equal(INN_STATIONS.length,10);assert.equal(INN_DISHES.length,80);
 assert.ok(act(s,'buildInnStation',1000,'4').error);assert.ok(act(s,'developInnRecipe',1000,'1').error);
 s=run(s,'buildInnStation','1');assert.equal(s.gold,150);s=run(s,'developInnRecipe','1');s=run(s,'receiveInnGuests','1',5);
 s=settle(s,51000);assert.equal(s.inn.served,5);assert.equal(s.inn.blueprints,5);assert.equal(s.inn.deposit,250);assert.equal(s.inn.finesse['1'],500);
 s=run(s,'upgradeInnStation','1');s=run(s,'upgradeInnStation','1');assert.equal(s.inn.blueprints,2);assert.equal(s.inn.stations['1'],3);assert.ok(innRecipeReady(s.inn,INN_DISHES.find(d=>d.id==='11')));
 s=run(s,'developInnRecipe','11');s=run(s,'collectInnDeposit');assert.equal(s.gold,400);assert.equal(s.inn.deposit,0);assert.ok(act(s,'collectInnDeposit',s.lastAt).error);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('serial offline service is exact at boundaries and reload cannot double reward',()=>{
 let s=run(setup(),'developInnRecipe','57');s=run(s,'receiveInnGuests','57',10);
 assert.equal(s.inn.stamina,10);assert.equal(settle(s,10999).inn.served,0);
 const first=settle(s,11000);assert.equal(first.inn.served,1);assert.equal(first.inn.queue.remaining,9);
 const reloaded=decode(JSON.stringify(first)),done=settle(reloaded,101000);assert.equal(done.inn.served,10);assert.equal(done.inn.queue,null);assert.equal(done.inn.deposit,500);
 assert.deepEqual(settle(done,101000),done);assert.deepEqual(settle(first,101000),done);assert.equal(settle(done,1000).inn.served,10);assert.ok(valid(done));
});
test('queue admission conserves resources, settles prior income and rejects invalid saves',()=>{
 let s=run(setup(),'developInnRecipe','57');const start=act(s,'receiveInnGuests',11000,'57',10).state;
 assert.equal(start.pending,s.pending+10*totalRate(s));assert.ok(act(start,'receiveInnGuests',11000,'57',1).error);
 for(const count of [0,2,11,-1])assert.ok(act(s,'receiveInnGuests',1000,'57',count).error);
 const capped={...s,inn:{...s.inn,deposit:1e9}};assert.ok(act(capped,'receiveInnGuests',1000,'57',1).error);
 for(const changes of [{stamina:21},{menu:['missing']},{stations:{'4':1}},{queue:{dish:'57',remaining:11,nextAt:10000}},{queue:{dish:'57',remaining:1,nextAt:NaN}},{menu:['57','57']}]){const bad={...s,inn:{...s.inn,...changes}};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
 const old=fresh(1000);assert.equal(decode(JSON.stringify(old)).inn,undefined);
});
