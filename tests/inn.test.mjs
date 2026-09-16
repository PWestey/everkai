import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid,settle,totalRate} from '../lib/game.mjs';
import {INN_STATIONS,INN_DISHES,innRecipeReady} from '../lib/inn.mjs';
import {MAX_GOLD} from '../lib/limits.mjs';
import {funded,costOf} from './gear-fixtures.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
const setup=()=>run(run(funded(fresh(1000),costOf('Building_101')),'openEnterprise','Building_101'),'openInnService');
test('station and recipe unlocks follow source gates, with complete loop to upgrades',()=>{
 let s=setup();assert.equal(INN_STATIONS.length,10);assert.equal(INN_DISHES.length,80);
 assert.ok(act(s,'buildInnStation',1000,'4').error);assert.ok(act(s,'developInnRecipe',1000,'1').error);
 // Exactly the two recipe prices this test is about to spend, so every gold figure below is the fixture's
 // own 250 again once they are paid. SimGame1Food unlockConsume: dish 1 costs 500, dish 11 costs 24,000.
 s=funded(s,24500);const before=s.gold;
 // REBASELINED (BUG-30): was `assert.equal(s.gold,150)` -- Everkai charged an invented 100 * station id.
 // SimGame1Kitchenware.consume charges item id 3 (gold) 0 for stations 1-3 and 5,000 for stations 4-10,
 // so building the Oven is free and gold is unchanged at 24,750.
 s=run(s,'buildInnStation','1');assert.equal(s.gold,before,'stations 1-3 cost nothing in SimGame1Kitchenware');
 // REBASELINED (ECON-17): developing was free; the original charges SimGame1Food.unlockConsume.
 s=run(s,'developInnRecipe','1');assert.equal(s.gold,before-500);
 s=run(s,'receiveInnGuests','1',5);
 s=settle(s,51000);assert.equal(s.inn.served,5);assert.equal(s.inn.blueprints,5);assert.equal(s.inn.finesse['1'],500);
 // REBASELINED (BUG-31): was `assert.equal(s.inn.deposit,250)` -- a flat 50 gold a guest. Dish 1 pays
 // SimGame1FoodLevel.coinEarnings 3,500 at level 1 rising 1,750 a level, and its proficiency ladder
 // (SimGame1FoodLevel.consume) is 100, 300, 500..., so with 100 finesse a serving from
 // SimGame1KitchenwareLevel.proficiencyCount at station level 1 the five guests stand at levels
 // 1, 2, 2, 2, 3 and pay 3,500 + 5,250 + 5,250 + 5,250 + 7,000 = 26,250.
 assert.equal(s.inn.deposit,26250);
 s=run(s,'upgradeInnStation','1');s=run(s,'upgradeInnStation','1');assert.equal(s.inn.blueprints,2);assert.equal(s.inn.stations['1'],3);assert.ok(innRecipeReady(s.inn,INN_DISHES.find(d=>d.id==='11')));
 s=run(s,'developInnRecipe','11');assert.equal(s.gold,250,'both recipe prices paid, back to the fixture balance');
 s=run(s,'collectInnDeposit');assert.equal(s.gold,26500);assert.equal(s.inn.deposit,0);assert.ok(act(s,'collectInnDeposit',s.lastAt).error);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('serial offline service is exact at boundaries and reload cannot double reward',()=>{
 let s=run(setup(),'developInnRecipe','57');s=run(s,'receiveInnGuests','57',10);
 // REBASELINED (BUG-23): was `assert.equal(s.inn.stamina,10)` from a starting 20. A brand-new Inn is the
 // original's SimGame1Level row 1, energyLimit 10, so ten guests spend the lot.
 assert.equal(s.inn.stamina,0);assert.equal(settle(s,10999).inn.served,0);
 const first=settle(s,11000);assert.equal(first.inn.served,1);assert.equal(first.inn.queue.remaining,9);
 const reloaded=decode(JSON.stringify(first)),done=settle(reloaded,101000);assert.equal(done.inn.served,10);assert.equal(done.inn.queue,null);
 // REBASELINED (BUG-31): was 500 (flat 50 x 10). Dish 57 is guest-gated, so it earns the finesse-1
 // fallback a serving; its ladder needs 500 proficiency for level 2, so all ten guests pay the level-1
 // price of 1,000 from SimGame1FoodLevel.
 assert.equal(done.inn.deposit,10000);
 assert.deepEqual(settle(done,101000),done);assert.deepEqual(settle(first,101000),done);assert.equal(settle(done,1000).inn.served,10);assert.ok(valid(done));
});
test('queue admission conserves resources, settles prior income and rejects invalid saves',()=>{
 let s=run(setup(),'developInnRecipe','57');const start=act(s,'receiveInnGuests',11000,'57',10).state;
 assert.equal(start.pending,s.pending+10*totalRate(s));assert.ok(act(start,'receiveInnGuests',11000,'57',1).error);
 for(const count of [0,2,11,-1])assert.ok(act(s,'receiveInnGuests',1000,'57',count).error);
 // REBASELINED (BUG-31): was a deposit of 1e9, which the old flat-50 admission check refused. The deposit
 // ceiling is now MAX_GOLD, the same ceiling collectInnDeposit already pays into, so the refusal is
 // exercised at MAX_GOLD instead. Dish 57's level-50 price is 25,500, which is what the check reserves.
 const capped={...s,inn:{...s.inn,deposit:MAX_GOLD}};assert.ok(act(capped,'receiveInnGuests',1000,'57',1).error);
 assert.ok(!act({...s,inn:{...s.inn,deposit:MAX_GOLD-25500}},'receiveInnGuests',1000,'57',1).error,'exactly enough room is admitted');
 for(const changes of [{deposit:MAX_GOLD+1},{menu:['missing']},{stations:{'4':1}},{queue:{dish:'57',remaining:11,nextAt:10000}},{queue:{dish:'57',remaining:1,nextAt:NaN}},{menu:['57','57']}]){const bad={...s,inn:{...s.inn,...changes}};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
 // Stamina over the cap is the one Inn fault that is REPAIRED rather than refused: BUG-23 lowered the
 // unrated cap from 20 to 10, so a save the old build legitimately wrote would otherwise stop loading.
 for(const stamina of [11,21]){const bad={...s,inn:{...s.inn,stamina}};assert.equal(valid(bad),false);assert.equal(decode(JSON.stringify(bad)).inn.stamina,10,'an over-cap save is clamped, not refused');}
 const old=fresh(1000);assert.equal(decode(JSON.stringify(old)).inn,undefined);
});
