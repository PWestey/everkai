import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';
import {insightRule,insightState,insightLevel} from '../lib/insight.mjs';
import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,id)=>{const r=act(s,a,s.lastAt,id);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
test('default stable skill joins preserve old saves and enable typed progression with income effect',()=>{
 let s=fresh(1000);assert.equal(s.insight,undefined);assert.deepEqual(decode(JSON.stringify(s)),s);const before=totalRate(s);s=run(s,'claimInsight','hero_15');s=run(s,'trainInsight','hero_15');assert.equal(s.fellows.hero_15.aptitude,11);assert.equal(insightLevel(s,'hero_15'),1);assert.equal(insightState(s).balances.Item_Hero_Talent_Country_5,900);assert.ok(totalRate(s)>before);assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.equal(insightRule('wife_1'),null);assert.equal(insightRule('hero_1').skillId,'Hero_Talent_Country2Base_1');
});
test('Insight balances are typed/shared, levels per Fellow, and costs stop at documented cap',()=>{
 let s=run(fresh(1000),'recruit','hero_1');s=run(s,'claimInsight','hero_15');assert.ok(act(s,'trainInsight',1000,'hero_1').error);s=run(s,'claimInsight','hero_1');s=run(s,'trainInsight','hero_1');assert.equal(insightLevel(s,'hero_15'),0);assert.equal(s.insight.balances.Item_Hero_Talent_Country_5,1000);
 for(let n=0;n<30;n++){s=run(s,'claimInsight','hero_15');for(let j=0;j<10;j++)s=run(s,'trainInsight','hero_15');}assert.equal(insightLevel(s,'hero_15'),300);assert.equal(s.fellows.hero_15.aptitude,310);assert.ok(act(s,'trainInsight',1000,'hero_15').error);
 const capped={...s,fellows:{...s.fellows,hero_1:{...s.fellows.hero_1,aptitude:1000}}};assert.ok(act(capped,'trainInsight',1000,'hero_1').error);assert.ok(act(s,'claimInsight',1000,'missing').error);
});
test('corrupt Insight state is rejected and failed writes preserve both cost and effect',()=>{
 let s=run(fresh(1000),'claimInsight','hero_15');for(const i of [{balances:[],levels:{}},{balances:{unknown:10},levels:{}},{balances:{},levels:{hero_15:301}},{balances:{},levels:{hero_1:1}},{balances:{},levels:{hero_15:1.5}}]){const bad={...s,insight:i};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
 let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(key,value)=>{if(fail)throw Error('full');raw=value}}));p.load(1000);const before=raw;fail=true;assert.throws(()=>p.commit(run(p.current,'trainInsight','hero_15')));assert.equal(raw,before);assert.equal(p.current.fellows.hero_15.aptitude,10);fail=false;p.load(1000);p.commit(run(p.current,'trainInsight','hero_15'));p.load(1000);assert.equal(insightLevel(p.current,'hero_15'),1);assert.equal(p.current.insight.balances.Item_Hero_Talent_Country_5,900);
});
