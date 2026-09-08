import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';import {FELLOWS} from '../lib/catalog.mjs';import {bondedPower,fellowCap} from '../lib/adventure.mjs';import {sourceQuality,sourceAptitudeBonus,qualityRule} from '../lib/original-progression.mjs';import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state),a);return r.state};
test('all159 original identities preserve positive legacy Power and earned levels/aptitude/tokens on activation',()=>{
 for(const id of FELLOWS.map(f=>f.id))for(const level of [1,20,60])for(const aptitude of [10,1000]){
  let s=fresh(1000);s=run(s,'recruit',id==='hero_15'?'hero_1':id);s.fellows[id]={...s.fellows[id],level,aptitude,breaks:4,skill:20};const power=bondedPower(s,id),before=structuredClone(s),next=run(s,'activateOriginalProgression');
  assert.ok(bondedPower(next,id)>=power,id);assert.deepEqual(next.fellows,before.fellows);assert.deepEqual(next.inventory,before.inventory);assert.equal(next.fellowXP,before.fellowXP);assert.deepEqual(next.adventure,before.adventure);assert.equal(fellowCap(next.fellows[id],next,id),100);
 }
});
test('all13 source quality transitions conserve9materials, cap750 and final totalTalent65; no local token consumption',()=>{
 let s=run(run(fresh(1000),'activateOriginalProgression'),'claimOriginalSupplies');const token=s.inventory.local_limit_token;
 for(let q=1;q<=14;q++){
  while(s.fellows.hero_15.level<qualityRule(q).cap){s.fellowXP=1e9;s=run(s,'train','hero_15','max');}
  assert.equal(s.fellows.hero_15.level,qualityRule(q).cap);assert.equal(sourceQuality(s,'hero_15'),q);
  if(q<14){const oldPower=bondedPower(s,'hero_15');s=run(s,'originalQuality','hero_15');assert.ok(bondedPower(s,'hero_15')>oldPower);}
 }
 assert.equal(s.fellows.hero_15.level,750);assert.equal(s.originalProgression.receipts.length,13);assert.equal(qualityRule(sourceQuality(s,'hero_15')).talent,65);assert.equal(s.inventory.local_limit_token,token);
 for(let i=1;i<=3;i++){assert.equal(s.originalProgression.stock[`Item_Breach_Hero_1_${i}`],81);assert.equal(s.originalProgression.stock[`Item_Breach_Hero_2_${i}`],31);assert.equal(s.originalProgression.stock[`Item_Breach_Hero_3_${i}`],91);}
 assert.ok(act(s,'originalQuality',1000,'hero_15').error);assert.ok(act(s,'train',1000,'hero_15',1).error);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('old EXP receipts and rate settled before mode upgrade; strict new-cost policy and material conservation',()=>{
 let s=run(fresh(1000),'activateOriginalTraining');s=run(s,'train','hero_15',1);const receipts=structuredClone(s.trainingCosts.receipts),rate=totalRate(s);const result=act(s,'activateOriginalProgression',2000);assert.ok(!result.error);assert.equal(result.state.pending,s.pending+rate);s=result.state;assert.deepEqual(s.trainingCosts.receipts,receipts);assert.ok(act(s,'originalQuality',s.lastAt,'hero_15').error);
 s=run(s,'claimOriginalSupplies');s=run(s,'train','hero_15','max');s=run(s,'originalQuality','hero_15');assert.deepEqual(s.trainingCosts.receipts[0],receipts[0]);assert.equal(s.trainingCosts.receipts[1].costPolicy,3);
 for(const mutate of [x=>x.originalProgression.stock.Item_Breach_Hero_1_1++,x=>x.originalProgression.quality.hero_15=3,x=>x.originalProgression.receipts[0].cost[0].count=2,x=>x.originalProgression.policyVersion=2,x=>x.trainingCosts.receipts[1].costPolicy=4]){const bad=structuredClone(s);mutate(bad);assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
});
test('failed source-quality write preserves stock/quality/receipts and commits once after reload',()=>{
 let s=run(run(fresh(1000),'activateOriginalProgression'),'claimOriginalSupplies');s=run(s,'train','hero_15','max');let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);const before=raw;fail=true;assert.throws(()=>p.commit(run(p.current,'originalQuality','hero_15')));assert.equal(raw,before);assert.equal(sourceQuality(p.current,'hero_15'),1);fail=false;p.load(1000);p.commit(run(p.current,'originalQuality','hero_15'));p.load(1000);assert.equal(sourceQuality(p.current,'hero_15'),2);assert.equal(p.current.originalProgression.stock.Item_Breach_Hero_1_1,99);assert.equal(p.current.originalProgression.receipts.length,1);assert.ok(act(p.current,'originalQuality',1000,'hero_15').error);
});
test('actual pending Northern and Trading snapshots remain frozen across growth activation and training',()=>{
 let s=fresh(1000);s=run(s,'northStart',null,{seq:0});s=run(s,'tradeBegin','veteran',{seq:0,team:['hero_15']});const north=structuredClone(s.northern.run),trade=structuredClone(s.tradingPost.run);
 s=run(s,'activateOriginalProgression');s=run(s,'claimOriginalSupplies');s=run(s,'train','hero_15','max');assert.deepEqual(s.northern.run,north);assert.deepEqual(s.tradingPost.run,trade);const reload=decode(JSON.stringify(s));assert.deepEqual(reload.northern.run,north);assert.deepEqual(reload.tradingPost.run,trade);
});
