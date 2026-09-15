import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,settle} from '../lib/game.mjs';
import {OPENING_STAGES,idleExpRate,settleOpeningExp} from '../lib/opening.mjs';
import {DAILY_BREACH,SOURCE_MATERIALS} from '../lib/original-progression.mjs';
import {starterHabits} from '../lib/habits.mjs';
const M=60000,H=60*M,T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,now,t=null,v=null)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const journey=(cleared)=>{const s=at(fresh(T),'openingStart',T);return {...s,opening:{...s.opening,cleared}};};

test('idle Fellow EXP pays the last cleared normal stage, per clock minute',()=>{
 assert.equal(idleExpRate(fresh(T)),0,'no journey, no idle EXP');
 assert.equal(idleExpRate(journey(0)),0,'nothing cleared yet');
 const first=OPENING_STAGES.findIndex(x=>!x.boss);
 assert.equal(idleExpRate(journey(first+1)),OPENING_STAGES[first].item1);
 const boss=OPENING_STAGES.findIndex(x=>x.boss);
 assert.equal(idleExpRate(journey(boss+1)),OPENING_STAGES[boss-1].item1,'a boss clear keeps the previous normal stage rate');
 assert.equal(idleExpRate(journey(126)),OPENING_STAGES.slice(0,126).filter(x=>!x.boss).at(-1).item1);});

test('settling pays whole minutes crossed, loses nothing to frequent saves, and holds 12 hours',()=>{
 const s=journey(200),rate=idleExpRate(s);assert.ok(rate>0);
 const once=settle(s,T+90*M);
 assert.equal(once.fellowXP-s.fellowXP,90*rate,'90 minutes away');
 let often=s;for(let t=T+10000;t<=T+90*M;t+=10000)often=settle(often,t);
 assert.equal(often.fellowXP,once.fellowXP,'settling every 10 seconds pays exactly the same');
 assert.equal(settle(s,T+100*H).fellowXP-s.fellowXP,720*rate,'a long absence pays 12 hours');
 assert.equal(settle(s,T+30000).fellowXP,s.fellowXP,'less than a minute boundary pays nothing');
 // Negative control: the pure helper pays nothing without a journey or when the clock runs backwards.
 assert.equal(settleOpeningExp(fresh(T),T,T+H).fellowXP,fresh(T).fellowXP);
 assert.equal(settleOpeningExp(s,T+H,T).fellowXP,s.fellowXP);
 assert.ok(valid(once));assert.deepEqual(decode(JSON.stringify(once)),once);});

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
