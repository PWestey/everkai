import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,settle} from '../lib/game.mjs';
import {OPENING_STAGES,STAGE_EXP_MULTIPLIER} from '../lib/opening.mjs';
import {DAILY_BREACH,SOURCE_MATERIALS} from '../lib/original-progression.mjs';
import {starterHabits} from '../lib/habits.mjs';
const M=60000,H=60*M,T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,now,t=null,v=null)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};

test('stage clears pay three times their source Fellow EXP; no EXP accrues while idle',()=>{
 assert.equal(STAGE_EXP_MULTIPLIER,3);
 let s=at(fresh(T),'openingStart',T);s.fellows.hero_15.aptitude=1000;s.gold=1e12;
 const first=OPENING_STAGES[0],before=s.fellowXP;
 s=at(s,'openingBattle',T,first._id);
 assert.equal(s.fellowXP-before,first.item1*3,'a normal stage pays item1 x3');
 s.opening.cleared=OPENING_STAGES.findIndex(x=>x.boss);const boss=OPENING_STAGES[s.opening.cleared],exp=boss.items.find(i=>i.id==='1').count;
 const b0=s.fellowXP;s=at(s,'openingBattle',T,boss._id);
 assert.equal(s.fellowXP-b0,exp*3,'a boss pays its EXP item x3');
 // Negative control: twelve hours away with a journey pays no EXP at all.
 assert.equal(settle(s,T+12*H).fellowXP,s.fellowXP);});

test('the daily habit breakthrough claim: needs a habit, lands once a day, and keeps the ledger valid',()=>{
 let s={...at(fresh(T),'activateOriginalProgression',T),habits:starterHabits(T)};
 assert.match(act(s,'claimDailyBreach',T).error,/Complete a daily habit/);
 s=at(s,'habitComplete',T,s.habits.items.find(x=>x.freq==='daily').id);
 s=at(s,'claimDailyBreach',T);
 assert.equal(Object.keys(SOURCE_MATERIALS).length,9);
 for(const id of Object.keys(SOURCE_MATERIALS))assert.equal(s.originalProgression.stock[id],DAILY_BREACH,id);
 assert.equal(s.originalProgression.dailyClaims,1);
 assert.match(act(s,'claimDailyBreach',T+H).error,/already collected/);
 assert.deepEqual(decode(JSON.stringify(s)),s);
 // Negative control: stock the claim count does not account for is not a save.
 const bad=structuredClone(s);bad.originalProgression.dailyClaims=2;assert.equal(valid(bad),false);
 // Next day, with that day's habit done, it lands again.
 const next=T+24*H;let t=at(s,'habitComplete',next,s.habits.items.find(x=>x.freq==='daily').id);
 t=at(t,'claimDailyBreach',next);
 assert.equal(t.originalProgression.stock.Item_Breach_Hero_1_1,2*DAILY_BREACH);});

test('the sandbox supplies button is retired; saves that pressed it still load',()=>{
 const s=at(fresh(T),'activateOriginalProgression',T);
 assert.throws(()=>act(s,'claimOriginalSupplies',T),/Unknown action/,'10M EXP and 100 of each material per press is gone');
 // A save from before the retirement: three presses credited 300 of each material.
 const old=structuredClone(s);old.originalProgression.claims=3;for(const id of Object.keys(SOURCE_MATERIALS))old.originalProgression.stock[id]=300;
 assert.ok(valid(old));assert.deepEqual(decode(JSON.stringify(old)),old);
 // Negative control: stock those presses do not account for is still refused.
 old.originalProgression.stock.Item_Breach_Hero_1_1=301;assert.equal(valid(old),false);});
