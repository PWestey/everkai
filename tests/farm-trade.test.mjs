import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';import {farmOrder,farmTrade,FARM_ESSENCES} from '../lib/farm-trade.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
function setup(){let s=fresh(1000);for(const [a,t,v] of [['openFarm'],['recruit','hero_1'],['openEnterprise','Building_101'],['sowFarm',0,'Plant1'],['finishFarm',0],['harvestFarm',0]])s=run(s,a,t,v);return s;}
test('crop order → Dew → matching essence → Aptitude closes the local reward loop',()=>{
 let s=setup();const oldRate=totalRate(s),oldAPT=s.fellows.hero_1.aptitude;const order=farmOrder(s.farm,0);assert.equal(order.quantity,10);s=run(s,'deliverFarmOrder',0,order.key);assert.equal(s.farm.harvests.Plant1,0);assert.equal(s.farm.trade.dew,5);
 s=run(s,'buyFarmEssence','SG3TalentCountry2');assert.equal(s.farm.trade.dew,0);assert.equal(s.farm.trade.essences.SG3TalentCountry2,1);
 assert.ok(act(s,'useFarmEssence',1000,'hero_15','SG3TalentCountry2').error);s=run(s,'useFarmEssence','hero_1','SG3TalentCountry2');assert.equal(s.fellows.hero_1.aptitude,oldAPT+1);assert.equal(s.farm.trade.essences.SG3TalentCountry2,0);assert.ok(totalRate(s)>oldRate);assert.deepEqual(decode(JSON.stringify(s)),s);assert.equal(FARM_ESSENCES.length,5);
});
test('stale orders, repeated essence use and capacity errors never consume rewards',()=>{
 let s=setup(),order=farmOrder(s.farm,0);s=run(s,'deliverFarmOrder',0,order.key);assert.ok(act(s,'deliverFarmOrder',1000,0,order.key).error);assert.notEqual(farmOrder(s.farm,0).key,order.key);
 s=run(s,'buyFarmEssence','SG3TalentCountry2');const capped={...s,fellows:{...s.fellows,hero_1:{...s.fellows.hero_1,aptitude:1000}}};assert.ok(act(capped,'useFarmEssence',1000,'hero_1','SG3TalentCountry2').error);assert.equal(capped.farm.trade.essences.SG3TalentCountry2,1);
 s=run(s,'useFarmEssence','hero_1','SG3TalentCountry2');assert.ok(act(s,'useFarmEssence',1000,'hero_1','SG3TalentCountry2').error);assert.ok(act(s,'buyFarmEssence',1000,'SG3TalentCountry2').error);
});
test('optional trade validates policy, quantities, counters and old-rate essence settlement',()=>{
 let s=setup();assert.equal(s.farm.trade,undefined);assert.equal(farmTrade(s.farm).dew,0);s=run(s,'deliverFarmOrder',0,'0:0');s=run(s,'buyFarmEssence','SG3TalentCountry2');
 const before=totalRate(s),next=act(s,'useFarmEssence',11000,'hero_1','SG3TalentCountry2').state;assert.equal(next.pending,s.pending+10*before);
 for(const change of [{policyVersion:2},{dew:-1},{completed:[0,0]},{completed:[0,0,1.5]},{essences:{missing:1}}]){const bad={...s,farm:{...s.farm,trade:{...s.farm.trade,...change}}};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
 assert.equal(farmOrder(s.farm,-1),null);assert.ok(valid(next));
});

import {essencePlan} from '../lib/farm-trade.mjs';
import {createPersistence} from '../lib/persistence.mjs';
const essence='SG3TalentCountry2';
function funded(){const s=setup();s.farm.trade={policyVersion:1,completed:[0,0,0],dew:37,essences:{}};return s;}
test('batch exchange and use equal repeated legacy actions and preserve remainder',()=>{
 let s=funded(),one=s;for(let i=0;i<5;i++)one=run(one,'buyFarmEssence',essence);
 s=run(s,'buyFarmEssence',essence,5);assert.deepEqual(s,one);
 s=run(s,'buyFarmEssence',essence,'max');assert.equal(s.farm.trade.dew,2);assert.equal(s.farm.trade.essences[essence],7);
 one=s;for(let i=0;i<5;i++)one=run(one,'useFarmEssence','hero_1',essence);
 s=run(s,'useFarmEssence','hero_1',{essence,amount:5});assert.deepEqual(s,one);
 s=run(s,'useFarmEssence','hero_1',{essence,amount:'max'});assert.equal(s.farm.trade.essences[essence],0);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('batch planning respects storage, matching ownership, aptitude and invalid input',()=>{
 let s=funded();s.farm.trade.essences[essence]=1e9-2;s=run(s,'buyFarmEssence',essence,'max');assert.equal(s.farm.trade.dew,27);assert.equal(s.farm.trade.essences[essence],1e9);
 s.fellows.hero_1.aptitude=998;s=run(s,'useFarmEssence','hero_1',{essence,amount:5});assert.equal(s.fellows.hero_1.aptitude,1000);assert.equal(s.farm.trade.essences[essence],1e9-2);
 assert.equal(essencePlan(s,essence,'use','max','hero_15').count,0);
 for(const amount of [0,-1,2,1.5,'all'])assert.ok(act(s,'buyFarmEssence',s.lastAt,essence,amount).error);
 assert.ok(act(s,'useFarmEssence',s.lastAt,'hero_1',{essence,amount:'max'}).error);
 assert.ok(act(s,'buyFarmEssence',s.lastAt,'missing','max').error);
});
test('failed batch save admits no partial spend; reload and explicit retry apply once',()=>{
 const s=funded();let raw=JSON.stringify(s),fail=false;
 const storage={getItem:()=>raw,setItem:(key,value)=>{if(fail)throw Error('full');raw=value}};
 const p=createPersistence(()=>storage);p.load(s.lastAt);const before=raw;fail=true;
 assert.throws(()=>p.commit(run(p.current,'buyFarmEssence',essence,5)));assert.equal(raw,before);assert.equal(p.current.farm.trade.dew,37);
 fail=false;p.load(s.lastAt);p.commit(run(p.current,'buyFarmEssence',essence,5));assert.equal(p.current.farm.trade.dew,12);assert.equal(p.current.farm.trade.essences[essence],5);
 p.load(s.lastAt);assert.equal(p.current.farm.trade.essences[essence],5);
});
