import test from 'node:test';import {stockOriginal,legacyStart} from './progression-helpers.mjs';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {fresh,startingSave,act,valid,refusedBy,decode,totalRate} from '../lib/game.mjs';import {FELLOWS} from '../lib/catalog.mjs';import {bondedPower,fellowCap,powerParts,xpCost,defaultADH} from '../lib/adventure.mjs';import {sourceQuality,sourceAptitudeBonus,qualityRule,originalProgression,heroRow,sourceCoefficient} from '../lib/original-progression.mjs';import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state),a);return r.state};
test('all159 original identities preserve positive legacy Power, earned levels/aptitude/tokens AND the level cap on activation',()=>{
 for(const id of FELLOWS.map(f=>f.id))for(const level of [1,20,60])for(const aptitude of [10,1000]){
  let s=fresh(1000);s=run(s,'recruit',id==='hero_15'?'hero_1':id);s.fellows[id]={...s.fellows[id],level,aptitude,breaks:4,skill:20};const power=bondedPower(s,id),cap=fellowCap(s.fellows[id],s,id),before=structuredClone(s),next=run(s,'activateOriginalProgression');
  assert.ok(bondedPower(next,id)>=power,id);assert.deepEqual(next.fellows,before.fellows);assert.deepEqual(next.inventory,before.inventory);assert.equal(next.fellowXP,before.fellowXP);assert.deepEqual(next.adventure,before.adventure);
  // THE CAP IS CARRIED, not reset to quality 1's 100. Four local limit breaks are tier 5 in BOTH modes.
  assert.equal(cap,300);assert.equal(fellowCap(next.fellows[id],next,id),cap,id);
  // ...and the Aptitude the crystal ladder pays is NOT handed over with it: sourceAptitudeBonus reads the
  // EARNED quality (1), so the bonus is the hero row alone and no quality talent comes free.
  assert.equal(sourceAptitudeBonus(next,id),heroRow(next,id)-10,id);assert.equal(sourceQuality(next,id),1);
 }
});
// -------------------------------------------------------------------------------------------------
// THE REGRESSION THIS CARRY EXISTS FOR (2026-09-22). Before it, activation read the EARNED quality alone,
// so every Fellow dropped to tier 1 / level limit 100 and `validOriginalProgression` refused any save with
// a Fellow above it -- act() returned NO error and handed back a village decode() then threw on. Measured
// on the real default-mode fixture below: 112 Fellows, one at level 750 with 13 breaks, ladder Power
// 9,744,993,900. The owner's own save has a Fellow at 450, so "Use APK growth" was one press from losing it.
// -------------------------------------------------------------------------------------------------
test('a default-mode save with Fellows past level 100 survives activation: valid, decodable, same level caps',()=>{
 const raw=readFileSync(new URL('./crossover-stella-save-31c3b32-mine.json',import.meta.url),'utf8');
 const s=decode(raw);
 // Positive control (CLAUDE.md rule 2): the fixture really carries what this test protects.
 assert.equal(originalProgression(s),false,'the fixture is on the classic curve');
 const deep=Object.entries(s.fellows).filter(([,f])=>f.level>100);
 assert.ok(deep.length>=1,`positive control: ${deep.length} Fellows past level 100`);
 assert.equal(Math.max(...Object.values(s.fellows).map(f=>f.breaks||0)),13,'positive control: a fully limit-broken Fellow');
 const caps=Object.fromEntries(Object.entries(s.fellows).map(([id,f])=>[id,fellowCap(f,s,id)]));
 const r=act(s,'activateOriginalProgression',s.lastAt);
 assert.ok(!r.error,r.error);
 assert.ok(valid(r.state),refusedBy(r.state));
 assert.deepEqual(decode(JSON.stringify(r.state)).fellows,r.state.fellows,'the switched save decodes');
 assert.deepEqual(Object.fromEntries(Object.entries(r.state.fellows).map(([id,f])=>[id,fellowCap(f,r.state,id)])),caps,'every level cap carried');
 assert.deepEqual(r.state.fellows,s.fellows,'no Fellow record moved');
 // NEGATIVE CONTROL: the cap guard still bites. One level past the carried cap and the save is refused.
 const over=Object.keys(r.state.fellows).find(id=>r.state.fellows[id].level===caps[id]&&caps[id]<750)||Object.keys(r.state.fellows)[0];
 const bad={...r.state,fellows:{...r.state.fellows,[over]:{...r.state.fellows[over],level:caps[over]+1}}};
 assert.equal(valid(bad),false,'a level past the carried cap is still refused');
 assert.throws(()=>decode(JSON.stringify(bad)));
});
test('a new village is born on the original’s level curve, at the original’s EXP prices',()=>{
 const s=startingSave(1767225600000);
 assert.equal(originalProgression(s),true,'startingSave now switches APK growth on');
 assert.ok(valid(s),refusedBy(s));
 const raw=JSON.stringify(s);assert.equal(JSON.stringify(decode(raw)),raw,'a brand-new save round-trips byte-identically');
 // The level column is the original's, and the EXP price is the one BOTH modes already billed.
 assert.equal(powerParts(s,'hero_1').adh,sourceCoefficient(1));
 assert.equal(xpCost(1,s),xpCost(1,legacyStart(1767225600000)),'switching the curve did not move the price of a level');
 // NEGATIVE CONTROL: the classic baseline really is the other curve, so this test can tell them apart.
 assert.equal(powerParts(legacyStart(1767225600000),'hero_1').adh,defaultADH(1));
});
test('all13 source quality transitions conserve9materials, cap750 and final totalTalent65; no local token consumption',()=>{
 let s=stockOriginal(run(fresh(1000),'activateOriginalProgression'));const token=s.inventory.local_limit_token;
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
 s=stockOriginal(s);s=run(s,'train','hero_15','max');s=run(s,'originalQuality','hero_15');assert.deepEqual(s.trainingCosts.receipts[0],receipts[0]);assert.equal(s.trainingCosts.receipts[1].costPolicy,3);
 for(const mutate of [x=>x.originalProgression.stock.Item_Breach_Hero_1_1++,x=>x.originalProgression.quality.hero_15=3,x=>x.originalProgression.receipts[0].cost[0].count=2,x=>x.originalProgression.policyVersion=2,x=>x.trainingCosts.receipts[1].costPolicy=4]){const bad=structuredClone(s);mutate(bad);assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
});
test('failed source-quality write preserves stock/quality/receipts and commits once after reload',()=>{
 let s=stockOriginal(run(fresh(1000),'activateOriginalProgression'));s=run(s,'train','hero_15','max');let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);const before=raw;fail=true;assert.throws(()=>p.commit(run(p.current,'originalQuality','hero_15')));assert.equal(raw,before);assert.equal(sourceQuality(p.current,'hero_15'),1);fail=false;p.load(1000);p.commit(run(p.current,'originalQuality','hero_15'));p.load(1000);assert.equal(sourceQuality(p.current,'hero_15'),2);assert.equal(p.current.originalProgression.stock.Item_Breach_Hero_1_1,99);assert.equal(p.current.originalProgression.receipts.length,1);assert.ok(act(p.current,'originalQuality',1000,'hero_15').error);
});
test('actual pending Northern and Trading snapshots remain frozen across growth activation and training',()=>{
 let s=fresh(1000);s=run(s,'northStart',null,{seq:0});s=run(s,'tradeBegin','veteran',{seq:0,team:['hero_15']});const north=structuredClone(s.northern.run),trade=structuredClone(s.tradingPost.run);
 s=run(s,'activateOriginalProgression');s=stockOriginal(s);s=run(s,'train','hero_15','max');assert.deepEqual(s.northern.run,north);assert.deepEqual(s.tradingPost.run,trade);const reload=decode(JSON.stringify(s));assert.deepEqual(reload.northern.run,north);assert.deepEqual(reload.tradingPost.run,trade);
});
