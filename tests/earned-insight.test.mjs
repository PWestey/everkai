import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {insightRule,insightState,INSIGHT_PER_DAILY,INSIGHT_REFILL_MAX} from '../lib/insight.mjs';
import {starterHabits} from '../lib/habits.mjs';
const T=new Date('2026-09-18T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const withJournal=()=>({...fresh(T),habits:starterHabits(T)});
const dailies=s=>s.habits.items.filter(x=>x.freq==='daily');
const balance=(s,id)=>insightState(s).balances[insightRule(id).materialId]||0;

test('Insight is earned, never granted by a button',()=>{
 const s=fresh(T);
 assert.equal(s.insight,undefined,'a new save holds no Insight');
 assert.throws(()=>act(s,'claimInsight',T,'hero_15'),/Unknown action/,'the free Insight faucet is gone');});

test('the refill needs a finished habit and scales with the day',()=>{
 let s=withJournal();
 assert.match(act(s,'insightRefill',s.lastAt,'hero_15').error,/Complete a daily habit/);
 s=run(s,'habitComplete',dailies(s)[0].id);
 s=run(s,'insightRefill','hero_15');
 assert.equal(balance(s,'hero_15'),INSIGHT_PER_DAILY,'one daily funds one portion');
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);});

test('the cap holds however many dailies are finished',()=>{
 let s=withJournal();
 for(const x of dailies(s))s=run(s,'habitComplete',x.id);
 s=run(s,'insightRefill','hero_15');
 assert.equal(balance(s,'hero_15'),INSIGHT_REFILL_MAX);
 assert.ok(INSIGHT_REFILL_MAX<30000,'a full type still takes many days to master');});

test('one refill a day covers every type, so rotating Fellows cannot multiply it',()=>{
 // fresh() owns only hero_15, so a second Fellow has to be recruited for this to test anything.
 let s=run(withJournal(),'recruit','hero_1');
 assert.notEqual(insightRule('hero_1').materialId,insightRule('hero_15').materialId,'two real types');
 s=run(s,'habitComplete',dailies(s)[0].id);
 s=run(s,'insightRefill','hero_15');
 assert.equal(balance(s,'hero_15'),INSIGHT_PER_DAILY);
 assert.match(act(s,'insightRefill',s.lastAt,'hero_1').error,/already used/,
  'the guard is on the Insight subtree, not per material');
 assert.equal(balance(s,'hero_1'),0,'a second type stays empty on the same day');
 assert.match(act(s,'insightRefill',s.lastAt,'hero_15').error,/already used/);});

test('an unowned Fellow is still refused',()=>{
 let s=withJournal();
 s=run(s,'habitComplete',dailies(s)[0].id);
 assert.ok(act(s,'insightRefill',s.lastAt,'missing').error);});
