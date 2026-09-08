import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,totalRate} from '../lib/game.mjs';
import {levelTrainingPlan,xpCost} from '../lib/adventure.mjs';
import {talentTrainingPlan,talentRule} from '../lib/talents.mjs';
const run=(s,a,v)=>{const r=act(s,a,s.lastAt,'hero_15',v);assert.ok(!r.error,r.error);return r.state};
test('max level training equals singles, respects exact budget and never auto breaks',()=>{
 let s=fresh(1000);s.fellowXP=xpCost(s.fellows.hero_15.level)+xpCost(s.fellows.hero_15.level+1)-1;
 const p=levelTrainingPlan(s,'hero_15');assert.equal(p.count,1);const a=run(s,'train','max');assert.deepEqual(a,run(s,'train',1));assert.equal(a.fellowXP,s.fellowXP-p.cost);
 s.fellowXP=1e9;let b=s;const plan=levelTrainingPlan(s,'hero_15');for(let i=0;i<plan.count;i++)b=run(b,'train',1);assert.deepEqual(run(s,'train','max'),b);assert.equal(b.fellows.hero_15.level,20);assert.equal(b.fellows.hero_15.breaks,0);assert.deepEqual(decode(JSON.stringify(b)),b);
});
test('max talents equal singles and preserve prior Aptitude at source and resource boundaries',()=>{
 let s=fresh(1000);const r=talentRule('hero_15');assert.ok(r);s.inventory.Item_Talent_Hero_1=1000;s.fellows.hero_15.aptitude=100;
 const plan=talentTrainingPlan(s,'hero_15');let b=s;for(let i=0;i<plan.count;i++)b=run(b,'trainTalent',1);assert.deepEqual(run(s,'trainTalent','max'),b);assert.equal(b.fellows.hero_15.aptitude,100+plan.count*r.amount);assert.equal(b.fellows.hero_15.talentLevel,r.cap);assert.ok(act(b,'trainTalent',1000,'hero_15','max').error);
 s.fellows.hero_15.aptitude=999;assert.equal(talentTrainingPlan(s,'hero_15').count,Math.floor(1/r.amount));s.fellows.hero_15.aptitude=100;s.inventory.Item_Talent_Hero_1=r.cost*2-1;assert.equal(talentTrainingPlan(s,'hero_15').count,1);
});
test('batch actions reject invalid amounts and settle earnings at pre-training Power',()=>{
 let s=fresh(1000);s.fellowXP=1e6;for(const a of ['train','trainTalent'])for(const v of [-1,0,2,Infinity,'all'])assert.ok(act(s,a,1000,'hero_15',v).error);
 const r=act(s,'train',11000,'hero_15','max');assert.ok(!r.error);assert.equal(r.state.pending,s.pending+totalRate(s)*10);
});
