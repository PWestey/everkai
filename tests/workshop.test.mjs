import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,settle,totalRate} from '../lib/game.mjs';
import {WORKSHOP_PRODUCTS,workshopHot,workshopUnlocked} from '../lib/workshop.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
import {funded} from './gear-fixtures.mjs';
function setup(){let s=funded(fresh(1000));for(const [a,t] of [['openEnterprise','Building_301'],['openWorkshop'],['recruit','hero_1']])s=run(s,a,t);return s;}
test('50 complete local numeric rows and declared matching policy gate manufacturing',()=>{
 assert.equal(WORKSHOP_PRODUCTS.length,50);assert.ok(WORKSHOP_PRODUCTS.every(p=>Number.isInteger(p.salesXP*1.2)&&p.seconds>0&&p.coinsPerSecond>0));
 let s=setup();assert.ok(act(s,'startWorkshop',1000,'2001',{fellow:'hero_15',count:1}).error);
 assert.ok(act(s,'startWorkshop',1000,'2002',{fellow:'hero_1',count:1}).error);
 s=run(s,'startWorkshop','2001',{fellow:'hero_1',count:1});assert.equal(s.workshop.supplies,19);assert.equal(s.workshop.job.xpPerUnit,36);assert.ok(act(s,'startWorkshop',1000,'2001',{fellow:'hero_1',count:1}).error);assert.ok(valid(s));
});
test('timed coins accrue once, completion EXP unlocks next product, deposit/store connects training',()=>{
 let s=run(setup(),'startWorkshop','2001',{fellow:'hero_1',count:1});const partial=settle(s,11000);assert.equal(partial.workshop.deposit,120);assert.equal(partial.workshop.salesXP.hero_1,0);
 s=settle(decode(JSON.stringify(partial)),301000);assert.equal(s.workshop.deposit,3600);assert.equal(s.workshop.salesXP.hero_1,36);assert.equal(s.workshop.crafted['2001'],1);assert.equal(s.workshop.job,null);assert.equal(workshopUnlocked(s.workshop,'2002'),true);
 assert.deepEqual(settle(s,301000),s);s=run(s,'collectWorkshop');assert.equal(s.workshop.wallet,3600);assert.ok(act(s,'collectWorkshop',s.lastAt).error);const pearls=s.inventory.Item_Talent_Hero_1;s=run(s,'buyWorkshopPearl');assert.equal(s.inventory.Item_Talent_Hero_1,pearls+1);assert.equal(s.workshop.wallet,1600);assert.ok(valid(s));
});
test('batch and sequential jobs conserve rewards and instant finish cannot double credit',()=>{
 let a=setup(),b=setup();a=run(a,'startWorkshop','2001',{fellow:'hero_1',count:5});a=run(a,'finishWorkshop');
 for(let n=0;n<5;n++){b=run(b,'startWorkshop','2001',{fellow:'hero_1',count:1});b=run(b,'finishWorkshop');}
 assert.deepEqual(a.workshop,b.workshop);assert.ok(act(a,'finishWorkshop',1000).error);assert.equal(a.lastAt,1000);assert.deepEqual(decode(JSON.stringify(a)),a);
});
test('hot bonus snapshots across UTC midnight and action settles previous village earnings',()=>{
 let s=setup();s.lastAt=86400000-1000;assert.equal(workshopHot('2001',s.lastAt),true);s=run(s,'startWorkshop','2001',{fellow:'hero_1',count:1});const done=settle(s,86400000+300000);assert.equal(done.workshop.salesXP.hero_1,36);assert.equal(workshopHot('2001',done.lastAt),false);
 const old=setup();const next=act(old,'startWorkshop',11000,'2001',{fellow:'hero_1',count:1}).state;assert.equal(next.pending,old.pending+10*totalRate(old));
});
test('malformed jobs, exhausted capacity and unavailable supplies are rejected',()=>{
 const s=setup();for(const count of [0,2,11,-1])assert.ok(act(s,'startWorkshop',1000,'2001',{fellow:'hero_1',count}).error);
 for(const change of [{supplies:0},{deposit:1e9},{salesXP:{hero_1:1e9}}])assert.ok(act({...s,workshop:{...s.workshop,...change}},'startWorkshop',1000,'2001',{fellow:'hero_1',count:1}).error);
 const started=run(s,'startWorkshop','2001',{fellow:'hero_1',count:1});for(const change of [{count:11},{fellow:'missing'},{xpPerUnit:999},{secondsDone:300,unitsDone:0},{secondsDone:300,unitsDone:1},{startAt:NaN}]){const bad={...started,workshop:{...started.workshop,job:{...started.workshop.job,...change}}};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
 assert.equal(decode(JSON.stringify(fresh(1000))).workshop,undefined);
});
test('versioned sandbox policy accepts legacy jobs without rewriting earned counters',()=>{
 let s=run(setup(),'startWorkshop','2001',{fellow:'hero_1',count:1});assert.equal(s.workshop.job.policyVersion,1);assert.equal(s.workshop.job.assignedType,'Diligent');
 delete s.workshop.job.policyVersion;delete s.workshop.job.assignedType;s.workshop.salesXP.hero_1=100;s.workshop.crafted['2001']=2;
 const restored=decode(JSON.stringify(s));assert.equal(restored.workshop.salesXP.hero_1,100);assert.equal(restored.workshop.crafted['2001'],2);
 const done=settle(restored,301000);assert.equal(done.workshop.salesXP.hero_1,136);assert.equal(done.workshop.crafted['2001'],3);
 for(const change of [{policyVersion:999},{assignedType:'Brave'}])assert.equal(valid({...restored,workshop:{...restored.workshop,job:{...restored.workshop.job,...change}}}),false);
});
test('local mastery preserves earned EXP, pins jobs and conserves fractional coin settlement',()=>{
 let s=setup();s.workshop.salesXP.hero_1=1000;s=run(s,'startWorkshop','2001',{fellow:'hero_1',count:1});s=run(s,'upgradeWorkshopMastery','hero_1');assert.equal(s.workshop.salesXP.hero_1,1000);assert.equal(s.workshop.mastery.hero_1.spent,100);assert.equal(s.workshop.job.masteryTier,0);s=run(s,'finishWorkshop');assert.equal(s.workshop.deposit,3600);
 s=run(s,'startWorkshop','2001',{fellow:'hero_1',count:1});assert.equal(s.workshop.job.masteryTier,1);const all=settle(s,301000);let parts=s;for(let n=1;n<=300;n++)parts=settle(parts,1000+n*1000);assert.deepEqual(parts.workshop,all.workshop);assert.equal(all.workshop.deposit,7560);assert.deepEqual(decode(JSON.stringify(all)),all);
});
test('mastery rejects overspending, unknown policies and invalid ledgers while legacy jobs remain base',()=>{
 let s=setup();assert.ok(act(s,'upgradeWorkshopMastery',1000,'hero_1').error);s.workshop.salesXP.hero_1=5500;for(let i=0;i<10;i++)s=run(s,'upgradeWorkshopMastery','hero_1');assert.equal(s.workshop.mastery.hero_1.spent,5500);assert.equal(s.workshop.salesXP.hero_1,5500);assert.ok(act(s,'upgradeWorkshopMastery',1000,'hero_1').error);
 for(const m of [{tier:1,spent:0,policyVersion:1},{tier:11,spent:6600,policyVersion:1},{tier:1,spent:100,policyVersion:2}])assert.equal(valid({...s,workshop:{...s.workshop,mastery:{hero_1:m}}}),false);
 s=run(s,'startWorkshop','2001',{fellow:'hero_1',count:1});delete s.workshop.job.masteryTier;delete s.workshop.job.masteryPolicy;assert.ok(valid(s));assert.equal(run(s,'finishWorkshop').workshop.deposit,3600);
});
