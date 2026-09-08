import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,decode,totalRate,SAVE_KEY} from '../lib/game.mjs';import {aptitudeTrainingPlan,supplyPurchasePlan} from '../lib/adventure.mjs';import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,t,v)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
test('supply and Aptitude batches equal singles with exact cost and no cap waste',()=>{
 let s=fresh(1000);s.gold=4999;const p=supplyPurchasePlan(s,'Item_Talent_Hero_1',25);assert.equal(p.count,24);assert.equal(p.cost,4800);let a=run(s,'buySupply','Item_Talent_Hero_1',25),b=s;for(let i=0;i<24;i++)b=run(b,'buySupply','Item_Talent_Hero_1',1);assert.deepEqual(a,b);a=run(a,'aptitude','hero_15','max');for(let i=0;i<24;i++)b=run(b,'aptitude','hero_15',1);assert.deepEqual(a,b);assert.equal(a.gold,199);assert.deepEqual(decode(JSON.stringify(a)),a);
 s.fellows.hero_15.aptitude=999;s.inventory.Item_Talent_Hero_1=25;assert.equal(aptitudeTrainingPlan(s,'hero_15').count,1);assert.equal(run(s,'aptitude','hero_15','max').inventory.Item_Talent_Hero_1,24);s.inventory.Item_Talent_Hero_1=999999;assert.equal(supplyPurchasePlan(s,'Item_Talent_Hero_1',25).count,1);
});
test('bad batch requests and failed writes preserve money, materials and old earnings',()=>{
 let s=fresh(1000);s.gold=10000;s.inventory.Item_Talent_Hero_1=25;for(const v of [0,-1,2,'all']){assert.ok(act(s,'buySupply',1000,'Item_Talent_Hero_1',v).error);assert.ok(act(s,'aptitude',1000,'hero_15',v).error);}
 assert.equal(act(s,'aptitude',11000,'hero_15','max').state.pending,s.pending+totalRate(s)*10);
 let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('Quota');if(k===SAVE_KEY)raw=v;}}));p.load(1000);fail=true;assert.throws(()=>p.commit(run(p.current,'aptitude','hero_15','max')));assert.equal(decode(raw).fellows.hero_15.aptitude,10);assert.equal(p.current.inventory.Item_Talent_Hero_1,25);fail=false;p.load(1000);p.commit(run(p.current,'aptitude','hero_15','max'));assert.equal(decode(raw).fellows.hero_15.aptitude,35);
});
