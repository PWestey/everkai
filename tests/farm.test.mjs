import test from 'node:test';import {ripe} from './progression-helpers.mjs';import assert from 'node:assert/strict';
import {fresh,act,settle,decode,valid,totalRate} from '../lib/game.mjs';
import {FARM_PLANTS,farmGrowthKnowledge,FARM_BASE_PLOTS,FARM_MAX_PLOTS} from '../lib/farm.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
test('39 source growth/yield rows and sow-water-offline-harvest conserve Knowledge',()=>{
 assert.equal(FARM_PLANTS.length,39);assert.ok(FARM_PLANTS.every(p=>p.seconds>0&&p.amount>0));const p=FARM_PLANTS.find(p=>p.id==='Plant1');assert.equal(p.seconds,180);assert.equal(p.amount,10);assert.equal(farmGrowthKnowledge(p),6);
 let s=run(fresh(1000),'openFarm');s=run(s,'sowFarm',0,'Plant1');assert.equal(s.farm.knowledge,10);s=run(s,'waterFarm',0);assert.equal(s.farm.knowledge,20);assert.ok(act(s,'waterFarm',1000,0).error);assert.ok(act(s,'harvestFarm',180999,0).error);
 s=settle(decode(JSON.stringify(s)),181000);s=run(s,'harvestFarm',0);assert.equal(s.farm.knowledge,26);assert.equal(s.farm.harvests.Plant1,10);assert.equal(s.farm.plots[0],null);assert.ok(act(s,'harvestFarm',181000,0).error);assert.deepEqual(decode(JSON.stringify(s)),s);
});
// REBASELINED for BUG-36. SimGame3Farmland is the original's plot table: 40 rows, the first three
// isBaseUnlock "1", the rest priced in item 4 -- the Diamond, which lib/opening.mjs already maps to
// crystals -- at 500 + 500 a plot to 10,000, then flat 10,000 from plot 23.
//   openFarm plots       old 1                       new 3   (FARM_BASE_PLOTS)
//   plot cap             old 6                       new 40  (FARM_MAX_PLOTS)
//   4th plot price       old 100 Knowledge (invented) new 500 crystals (SimGame3Farmland row 4)
//   Knowledge after      old 14  (104-100+10)         new 114 (104+10, nothing spent from Knowledge)
test('crystals expand plots on the original ladder; a ripened crop awards no extra global time or repeats',()=>{
 let s=run(fresh(1000),'openFarm');assert.equal(s.farm.plots.length,FARM_BASE_PLOTS);assert.equal(FARM_BASE_PLOTS,3);assert.equal(FARM_MAX_PLOTS,40);
 for(let n=0;n<4;n++){s=run(s,'sowFarm',0,'Plant1');s=run(s,'waterFarm',0);s=ripe(s);assert.throws(()=>act(s,'finishFarm',1000,0),/Unknown action/,'instant maturation is retired');s=run(s,'harvestFarm',0);}
 assert.equal(s.farm.knowledge,104);
 assert.match(act(s,'expandFarm',1000).error,/500 crystals/,'plot 4 is priced in crystals, not Knowledge');
 s={...s,crystals:500};s=run(s,'expandFarm');assert.equal(s.crystals,0);assert.equal(s.farm.knowledge,114);assert.equal(s.farm.plots.length,4);assert.equal(s.lastAt,1000);
 s=run(s,'sowFarm',1,'Plant2');assert.ok(valid(s));assert.equal(s.farm.plots[0],null);
});
test('farm failures preserve crops and protect save/harvest capacity and prior income',()=>{
 const old=fresh(1000);assert.equal(decode(JSON.stringify(old)).farm,undefined);let s=run(old,'openFarm');const start=act(s,'sowFarm',11000,0,'Plant1').state;assert.equal(start.pending,s.pending+10*totalRate(s));
 s=ripe(start);const full={...s,farm:{...s.farm,harvests:{Plant1:1e9}}};assert.ok(act(full,'harvestFarm',s.lastAt,0).error);assert.ok(full.farm.plots[0]);
 for(const change of [{plots:[]},{plots:[{plant:'missing',readyAt:1000,watered:false}]},{knowledge:-1},{harvests:{missing:1}},{plots:[{plant:'Plant1',readyAt:NaN,watered:false}]}]){const bad={...s,farm:{...s.farm,...change}};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
});
