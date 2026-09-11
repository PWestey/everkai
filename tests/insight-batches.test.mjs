import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,settle,totalRate} from '../lib/game.mjs';
import {FELLOWS} from '../lib/catalog.mjs';import {newFellow} from '../lib/adventure.mjs';
import {insightRule,insightTrainingPlan} from '../lib/insight.mjs';import {createPersistence} from '../lib/persistence.mjs';
const go=(s,a,id='hero_15',value=null)=>{const r=act(s,a,s.lastAt,id,value);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state;};
test('all mapped playable Fellows reach300 using exactly30000 of their type and preserve prior Aptitude',()=>{
 let s=fresh(1000);for(const f of FELLOWS)s.fellows[f.id]=newFellow();let count=0;const totals={};
 for(const f of FELLOWS){const rule=insightRule(f.id);if(!rule)continue;count++;totals[rule.materialId]=(totals[rule.materialId]||0)+30000;
 for(let j=0;j<30;j++)s=go(s,'claimInsight',f.id);
 const before=s.fellows[f.id].aptitude,plan=insightTrainingPlan(s,f.id,'max');assert.equal(plan.count,300);assert.equal(plan.cost,30000);
 s=go(s,'trainInsight',f.id,'max');assert.equal(s.fellows[f.id].aptitude,before+300);assert.equal(s.insight.levels[f.id],300);assert.equal(insightTrainingPlan(s,f.id,'max').count,0);}
 assert.equal(count,153);for(const [id,spent] of Object.entries(totals))assert.equal(s.insight.balances[id],0);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('affordable previews match admitted results at currency, level and Aptitude boundaries',()=>{
 let s=go(fresh(1000),'claimInsight');s.insight.balances.Item_Hero_Talent_Country_5=399;
 assert.deepEqual(insightTrainingPlan(s,'hero_15',5),{count:3,cost:300,level:3,aptitude:13,balance:99});s=go(s,'trainInsight','hero_15',5);assert.equal(s.insight.balances.Item_Hero_Talent_Country_5,99);
 s=go(s,'claimInsight');s.fellows.hero_15.aptitude=999;assert.equal(insightTrainingPlan(s,'hero_15','max').count,1);s=go(s,'trainInsight','hero_15','max');assert.equal(s.fellows.hero_15.aptitude,1000);assert.ok(act(s,'trainInsight',s.lastAt,'hero_15',1).error);
 for(const value of [0,-1,1.5,10,'5',{},Infinity]){assert.equal(insightTrainingPlan(s,'hero_15',value).count,0);assert.ok(act(s,'trainInsight',s.lastAt,'hero_15',value).error);}
});
test('legacy30 saves gain no automatic levels or rewards and may explicitly train beyond30',()=>{
 let s=go(fresh(1000),'claimInsight');s.insight.levels.hero_15=30;s.fellows.hero_15.aptitude=137;const copy=structuredClone(s);s=decode(JSON.stringify(s));assert.deepEqual(s,copy);
 s=go(s,'trainInsight','hero_15',5);assert.equal(s.insight.levels.hero_15,35);assert.equal(s.fellows.hero_15.aptitude,142);assert.equal(s.insight.balances.Item_Hero_Talent_Country_5,500);
 s=go(s,'trainInsight','hero_15','max');s=go(s,'claimInsight');s=go(s,'trainInsight','hero_15','max');assert.equal(s.insight.levels.hero_15,50);assert.equal(s.fellows.hero_15.aptitude,157);assert.equal(s.insight.balances.Item_Hero_Talent_Country_5,0);
});
test('batch persistence failure retains resources and permits only explicit retry after reload',()=>{
 const s=go(fresh(1000),'claimInsight');let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);fail=true;assert.throws(()=>p.commit(go(p.current,'trainInsight','hero_15','max')));assert.deepEqual(p.current,s);assert.deepEqual(JSON.parse(raw),s);fail=false;p.load(1000);p.commit(go(p.current,'trainInsight','hero_15','max'));p.load(1000);assert.equal(p.current.insight.levels.hero_15,10);assert.equal(p.current.insight.balances.Item_Hero_Talent_Country_5,0);
});
test('training settles old income and preserves already committed event combat snapshots',()=>{
 let s=go(fresh(1000),'claimInsight');s=go(s,'northStart',null,{seq:0});s=go(s,'tradeBegin','learner',{seq:0,team:['hero_15']});const north=structuredClone(s.northern.run),trade=structuredClone(s.tradingPost.run),expected=settle(s,2000),rate=totalRate(s);const r=act(s,'trainInsight',2000,'hero_15',5);assert.ok(!r.error,r.error);s=r.state;assert.equal(s.pending,expected.pending);assert.ok(totalRate(s)>rate);assert.deepEqual(s.northern.run,north);assert.deepEqual(s.tradingPost.run,trade);
});
