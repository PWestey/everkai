import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';import {xpCost,levelTrainingPlan} from '../lib/adventure.mjs';import {originalTrainingCost} from '../lib/training-costs.mjs';import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
test('original current-row costs1→2 and1→6; opt-in preserves balances, levels, pending snapshots and old price',()=>{
 const s=fresh(1000);assert.equal(levelTrainingPlan(s,'hero_15',1).cost,50);assert.equal(originalTrainingCost(1),100);let next=run(s,'activateOriginalTraining');assert.equal(levelTrainingPlan(next,'hero_15',1).cost,100);for(const k of Object.keys(s))assert.deepEqual(next[k],s[k]);assert.equal(totalRate(next),totalRate(s));assert.ok(act(next,'activateOriginalTraining',1000).error);
 next.fellowXP=600;const trained=run(next,'train','hero_15',5);assert.equal(trained.fellows.hero_15.level,6);assert.equal(trained.fellowXP,0);assert.deepEqual(trained.trainingCosts.receipts,[{id:'hero_15',from:1,to:6,cost:600}]);assert.ok(act(trained,'train',1000,'hero_15',1).error);assert.equal(xpCost(6),Math.ceil(50*1.14**5));
});
test('full original pricing through existing cap60 totals23560; manual and bulk prices equal',()=>{
 let s=run(fresh(1000),'sandboxAdventure');s=run(s,'activateOriginalTraining');const xp=s.fellowXP;
 while(s.fellows.hero_15.level<60){s=run(s,'train','hero_15','max');if(s.fellows.hero_15.level<60)s=run(s,'limitBreak','hero_15');}
 assert.equal(xp-s.fellowXP,23560);assert.equal(s.trainingCosts.receipts.reduce((n,r)=>n+r.cost,0),23560);assert.ok(act(s,'train',1000,'hero_15',1).error);assert.deepEqual(decode(JSON.stringify(s)),s);
 let a=run(fresh(1000),'activateOriginalTraining');a.fellowXP=600;const bulk=run(a,'train','hero_15',5);for(let i=0;i<5;i++)a=run(a,'train','hero_15',1);assert.equal(a.fellowXP,bulk.fellowXP);assert.equal(a.fellows.hero_15.level,bulk.fellows.hero_15.level);
});
test('legacy trained baseline is retained; new recruits start1; altered price/policy/chain rejected',()=>{
 let s=run(fresh(1000),'train','hero_15',1);s=run(s,'activateOriginalTraining');assert.equal(s.trainingCosts.baselineLevels.hero_15,2);s=run(s,'recruit','hero_1');s.fellowXP=1000;s=run(s,'train','hero_1',1);assert.equal(s.trainingCosts.receipts[0].cost,100);
 for(const mutate of [x=>x.trainingCosts.policyVersion=3,x=>x.trainingCosts.receipts[0].cost=50,x=>x.trainingCosts.receipts[0].from=2,x=>x.trainingCosts.baselineLevels.hero_15=1,x=>x.trainingCosts.receipts=[]]){const bad=structuredClone(s);mutate(bad);assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
});
test('failed activation and failed paid training retain pre-action values; one retry commits one receipt',()=>{
 let raw=JSON.stringify(fresh(1000)),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);fail=true;const original=raw;assert.throws(()=>p.commit(run(p.current,'activateOriginalTraining')));assert.equal(raw,original);fail=false;p.load(1000);p.commit(run(p.current,'activateOriginalTraining'));const activated=raw;fail=true;assert.throws(()=>p.commit(run(p.current,'train','hero_15',1)));assert.equal(raw,activated);fail=false;p.load(1000);p.commit(run(p.current,'train','hero_15',1));p.load(1000);assert.equal(p.current.fellowXP,150);assert.equal(p.current.trainingCosts.receipts.length,1);assert.equal(p.current.fellows.hero_15.level,2);
});
