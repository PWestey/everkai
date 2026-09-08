import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,valid,decode,SAVE_KEY} from '../lib/game.mjs';import {FARM_PLANTS,farmHarvestPlan} from '../lib/farm.mjs';import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,t=null,v=null,now=1000)=>{const r=act(s,a,now,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state;};
test('all39 three-level source schedules are complete and level1 matches existing source',()=>{
 assert.equal(FARM_PLANTS.length,39);for(const p of FARM_PLANTS){const first=farmHarvestPlan(p.id);assert.equal(first.seconds,p.seconds);assert.equal(first.amount,p.amount);for(const level of [1,2,3]){const r=farmHarvestPlan(p.id,level);assert.ok(r.seconds>0&&r.amount>0);}}
});
test('level3 schedule survives reload and harvests into existing stock after real elapsed time',()=>{
 let s=run(fresh(1000),'openFarm');s=run(s,'sowFarm',0,{plant:'Plant1',level:3});assert.equal(s.farm.plots[0].readyAt,7201000);assert.equal(s.farm.plots[0].harvestLevel,3);
 s=decode(JSON.stringify(s));s=run(s,'harvestFarm',0,null,7201000);assert.equal(s.farm.harvests.Plant1,100);assert.equal(s.farm.knowledge,250);assert.equal(s.farm.plots[0],null);assert.ok(act(s,'harvestFarm',7201000,0).error);
});
test('legacy growing crops retain level1; bad levels and full stock are refused',()=>{
 let s=run(fresh(1000),'openFarm');s=run(s,'sowFarm',0,'Plant1');delete s.farm.plots[0].harvestLevel;assert.ok(valid(s));s=run(s,'finishFarm',0);s=run(s,'harvestFarm',0);assert.equal(s.farm.harvests.Plant1,10);
 assert.ok(act(s,'sowFarm',1000,0,{plant:'Plant1',level:4}).error);s=run(s,'sowFarm',0,{plant:'Plant1',level:2});s.farm.plots[0].harvestLevel=null;assert.ok(!valid(s));s.farm.plots[0].harvestLevel=2;s=run(s,'finishFarm',0);s.farm.harvests.Plant1=1e9;const r=act(s,'harvestFarm',1000,0);assert.ok(r.error);assert.deepEqual(r.state.farm,s.farm);
});
test('interrupted higher-level harvest keeps crop and reward together until explicit retry',()=>{
 let s=run(fresh(1000),'openFarm');s=run(s,'sowFarm',0,{plant:'Plant1',level:2});s=run(s,'finishFarm',0);let raw=JSON.stringify(s),fail=false;const disk={getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('full');raw=v}},p=createPersistence(()=>disk);p.load(1000);const old=raw;fail=true;assert.throws(()=>p.commit(act(p.current,'harvestFarm',1000,0).state));assert.equal(raw,old);
 fail=false;p.load(1000);assert.equal(p.current.farm.plots[0].harvestLevel,2);p.commit(act(p.current,'harvestFarm',1000,0).state);const r=createPersistence(()=>disk).load(1000);assert.equal(r.farm.harvests.Plant1,50);assert.equal(r.farm.plots[0],null);
});
