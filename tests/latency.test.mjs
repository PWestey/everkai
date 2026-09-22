import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {fresh,act,valid,decode,refusedBy} from '../lib/game.mjs';
import {BUSINESSES,enterpriseBreakdown,businessBonus,enterpriseState} from '../lib/businesses.mjs';
import {bondedPower} from '../lib/adventure.mjs';
import {latencyState,latencyLevel,latencyCap,latencyCount,latencyFill,latencyWeightRow,
        latencyNextLevel,latencyBonus,latencyTotalAlternate,validLatency,stimulateRoll,
        luckStones,luckStonesEarned,luckStonesSpent,
        LATENCY_LEVELS,LATENCY_WEIGHTS,LATENCY_CAP_LEVEL,STIMULATE_COST,STIMULATE_TEN_X,
        STONES_PER_ACTION,LATENCY_UNMODELLED} from '../lib/latency.mjs';
import {habitActions} from '../lib/fathoms.mjs';
import {freshHabits} from '../lib/habits.mjs';
import data from '../lib/latency-data.json' with {type:'json'};
import {funded,staffed} from './gear-fixtures.mjs';

// FAMILY LATENCY -- the original's WifePotential. docs/character-systems-gap.md 3.1: the one system
// of the six that was wholly absent, and the one the doc calls the biggest threat to the ceilings.
const T=new Date('2026-09-21T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
/** The same village with its habit counter back at zero, so no Luck Stone has ever been earned.
 *  Zeroing the counter rather than deleting `totals` keeps validHabits happy -- it checks every
 *  domain key is present. */
const spent=s=>({...s,habits:{...s.habits,totals:Object.fromEntries(
 Object.entries(s.habits.totals).map(([k,v])=>[k,{...v,actions:0}]))}});
/** A village with one Family member, enough Intimacy to climb, and enough habit actions to pay. */
function village(intimacy=50000,actions=4000){
 let s=funded(fresh(T));
 // fresh() carries no habit tracker (startingSave adds one), so seat a real, valid one.
 s={...s,habits:freshHabits(T)};
 s={...s,family:{...s.family,wife_1:{intimacy,blessingPower:10,points:0,skill:0,relationship:1}}};
 // habitActions is a sum over the habit domains' lifetime `actions` counters. Raised on one domain,
 // the way tests/fathoms.test.mjs does: the habit engine's own accrual has its own coverage, and what
 // is under test here is the price rather than the faucet.
 s={...s,habits:{...s.habits,totals:{...s.habits.totals,health:{...s.habits.totals.health,actions}}}};
 return s;
}

test('the cap ladder and the roll table are the original\'s own, reproduced twice',()=>{
 assert.equal(LATENCY_LEVELS.length,41);
 assert.equal(LATENCY_CAP_LEVEL,40);
 // Rule 4, one real row, and it is the reference screenshot's own case: an account with 13,710
 // Intimacy sits at level 20 with a +400% cap, because level 21 needs 14,000.
 assert.deepEqual(LATENCY_LEVELS[20],{intimacy:14000,cap:40000,stones:1});
 assert.deepEqual(LATENCY_LEVELS[0],{intimacy:2000,cap:0,stones:0});
 assert.deepEqual(LATENCY_LEVELS[40],{intimacy:null,cap:80000,stones:null});
 assert.deepEqual(LATENCY_LEVELS.map(r=>r.cap).slice(0,4),[0,2000,4000,6000]);
 // Cross-check 2, the same screenshot: "Success Rate: 50%" at 132/400 filled.
 const s={family:{wife_1:{intimacy:0}},latency:{policyVersion:1,seq:0,seed:1,members:{wife_1:{level:20,count:13200,attempts:0}}}};
 assert.equal(latencyCap(s,'wife_1'),40000);
 assert.equal(latencyFill(s,'wife_1'),3300);
 assert.equal(latencyWeightRow(3300).success,5000);
 assert.deepEqual(LATENCY_WEIGHTS.map(w=>w.success),[8000,5000,2500,1000]);
 assert.deepEqual(LATENCY_WEIGHTS[0].results,[[100,7000],[200,2000],[400,1000]]);
 assert.equal(STIMULATE_COST,5);
 assert.equal(STIMULATE_TEN_X,20);
 // Rule 6: the constant column is recorded and not modelled.
 assert.equal(LATENCY_UNMODELLED.outputRiseFixed,400);
 assert.match(LATENCY_UNMODELLED.why,/Constant on all 41 rows/);
 assert.equal(data.sha256.WifePotentialLevelUnlock,'16113ca1c8a07b0a0539538461966b6029108184cd4134231b0a511131fb9ccb');
});

test('a save without the subtree is exactly today: no term, no stones, no state',()=>{
 const s=fresh(T);
 assert.equal(s.latency,undefined);
 assert.equal(latencyBonus(s),0);
 assert.equal(latencyLevel(s,'wife_1'),0);
 assert.equal(validLatency(s),true);
 assert.deepEqual(decode(JSON.stringify(s)),s);
 // The earnings bracket carries the new strand at zero, so no business moves.
 const d=BUSINESSES[0];
 assert.equal(businessBonus({...s,enterprises:{}},d.id,{employees:0,fellows:[]},d).latency,0);
});

test('the cap climbs on Intimacy and Luck Stones, and refuses without either',()=>{
 let s=village(2400,400);                        // 2,400 Intimacy: short of level 1's 2,500 gate
 assert.equal(luckStonesEarned(s),habitActions(s)*STONES_PER_ACTION);
 assert.ok(luckStones(s)>0,'positive control: the habit faucet paid something');
 // Level 0 -> 1 is free in the original but still gated on Intimacy 2,000, which she has.
 assert.deepEqual(latencyNextLevel(s,'wife_1'),{level:1,cap:2000,intimacy:2000,stones:0,have:2400,met:true});
 s=run(s,'latencyLevel','wife_1');
 assert.equal(latencyLevel(s,'wife_1'),1);
 assert.equal(latencyCap(s,'wife_1'),2000);
 // 1 -> 2 needs 2,500 and she has 2,400.
 assert.match(act(s,'latencyLevel',s.lastAt,'wife_1').error,/Raise Intimacy to 2,500/);
 // With the Intimacy, the stone price bites instead.
 const rich={...s,family:{...s.family,wife_1:{...s.family.wife_1,intimacy:50000}}};
 const broke=spent(rich);
 assert.equal(luckStones(broke),0);
 assert.match(act(broke,'latencyLevel',broke.lastAt,'wife_1').error,/Needs 1 Luck Stone/);
 assert.equal(latencyLevel(run(rich,'latencyLevel','wife_1'),'wife_1'),2);
});

test('Stimulate rolls the original\'s weights, is seeded, and a reload cannot re-roll it',()=>{
 let s=village();
 for(let i=0;i<5;i++)s=run(s,'latencyLevel','wife_1');
 assert.equal(latencyCap(s,'wife_1'),10000);
 const seedBefore=latencyState(s).seed;
 const before=luckStones(s);
 s=run(s,'latencyStimulate','wife_1',1);
 assert.equal(luckStones(s),before-STIMULATE_COST,'a try costs 5 stones whether it lands or not');
 assert.notEqual(latencyState(s).seed,seedBefore,'the seed advanced');
 assert.equal(latencyState(s).members.wife_1.attempts,1);
 // The OUTCOME is stored, so a round trip reproduces it exactly rather than rolling again.
 const saved=JSON.stringify(s);
 assert.deepEqual(decode(saved),s);
 assert.equal(latencyCount(decode(saved),'wife_1'),latencyCount(s,'wife_1'));
 // And the roll itself is a pure function of (seed, cap, count).
 const a=stimulateRoll(12345,10000,0),b=stimulateRoll(12345,10000,0);
 assert.deepEqual(a,b);
 assert.equal(a.chance,8000,'an empty bar is the 80% quartile');
 assert.equal(stimulateRoll(12345,10000,9000).chance,1000,'a nearly full bar is the 10% quartile');
 // EVERY roll moves the stream, landed or not. If a failure left the seed where it was, a player
 // could retry the same draw for ever and the 10% quartile would cost nothing but taps.
 let missed=null;
 for(let seed=1;seed<500&&!missed;seed++){const r=stimulateRoll(seed,10000,9900);if(!r.success)missed=[seed,r];}
 assert.ok(missed,'positive control: the 10% quartile does miss');
 assert.notEqual(missed[1].seed,missed[0],'a failed Stimulate advanced the seed');
 assert.notEqual(stimulateRoll(12345,10000,0).seed,12345,'a landed Stimulate advanced the seed');
 // A gain can never overshoot the cap.
 const edge=stimulateRoll(12345,10000,9950);
 assert.ok(edge.gain<=50,`a gain at the brim is trimmed to the cap (${edge.gain})`);
 // x10 is gated exactly where the original gates it.
 assert.match(act(s,'latencyStimulate',s.lastAt,'wife_1',10).error,/x10 Stimulate at Latency level 20/);
});

test('MEASURED: what the account-wide sum does to village earnings, and what the other reading gives',()=>{
 // THE NUMBER THE OWNER ASKED FOR. Both halves from one save (rule 1): the same village, with and
 // without Latency, through the same enterpriseBreakdown.
 let s=funded(fresh(T));
 const d=BUSINESSES.find(b=>b.id==='Building_101');
 s=run(s,'openEnterprise',d.id);
 s=staffed(s,d.id,200);
 const plain=enterpriseBreakdown(s,d.id).total;
 // One hundred Family members, each filled to the owner's own observed +132%. That is the doc's own
 // worked example and it is what the client's GetAllWifeBuildingPotential sums.
 const family={},members={};
 for(let i=1;i<=100;i++){
  const id=`wife_${i}`;
  family[id]={intimacy:50000,blessingPower:10,points:0,skill:0,relationship:1};
  members[id]={level:20,count:13200,attempts:200};
 }
 const loaded={...s,family:{...s.family,...family},latency:{policyVersion:1,seq:0,seed:1,members}};
 // The reading IMPLEMENTED: the sum. 100 x +132% = +13,200%.
 assert.equal(latencyBonus(loaded),132);
 // The reading NOT implemented, reported for comparison: the largest single member, +132%.
 assert.equal(latencyTotalAlternate(loaded),1.32);
 const withLatency=enterpriseBreakdown(loaded,d.id).total;
 const bonus=enterpriseBreakdown(loaded,d.id);
 assert.equal(bonus.latencyBonus,132,'the strand is surfaced in the breakdown, not hidden in the total');
 // The measured consequence, stated as a ratio of the two numbers above.
 const ratio=withLatency/plain;
 // MEASURED, and reported rather than softened (the owner's 2026-09-22 instruction): a hundred
 // members at the owner's own observed +132% each is x133.0 on this business's whole income.
 assert.ok(ratio>130&&ratio<136,`account-wide Latency is x${ratio.toFixed(1)} on this business`);
 // Under the other reading the same save would be worth this instead -- a factor of ~100 smaller.
 const alt={...loaded,latency:{...loaded.latency,members:{wife_1:members.wife_1}}};
 const altTotal=enterpriseBreakdown(alt,d.id).total;
 // The same save under the per-member reading: x2.3 rather than x133.0, i.e. the two readings
 // differ by ~57x on this village's income and by exactly the roster size on the strand itself.
 assert.ok(altTotal/plain>2.3&&altTotal/plain<2.4,`one member alone is x${(altTotal/plain).toFixed(2)}`);
 assert.equal(latencyBonus(loaded)/latencyBonus(alt),100,'the two readings differ by the roster size');
 // AND IT IS NOT A POWER TERM AT ALL. The Fellow-power ceiling does not move by a single point --
 // which is the second half of what the doc asks to be measured.
 const anyFellow=Object.keys(s.fellows)[0];
 assert.equal(bondedPower(loaded,anyFellow),bondedPower(s,anyFellow),'Latency touches no Fellow\'s Power');
});

test('validLatency refuses fill nobody could have rolled, a level Intimacy never reached, or unpaid stones',()=>{
 const base=village();
 const shell=(members)=>({...base,latency:{policyVersion:1,seq:0,seed:1,members}});
 assert.equal(validLatency(base),true,'absent subtree');
 assert.equal(validLatency(shell({})),true);
 assert.equal(validLatency(shell({wife_1:{level:0,count:0,attempts:0}})),true);
 // A fill larger than the cap the stored level allows.
 assert.equal(validLatency(shell({wife_1:{level:1,count:2001,attempts:1000}})),false);
 // A fill no run of attempts could have produced: the best single result on the table is +400.
 assert.equal(validLatency(shell({wife_1:{level:5,count:2000,attempts:4}})),false);
 assert.equal(validLatency(shell({wife_1:{level:5,count:1600,attempts:4}})),true);
 // A level the member's Intimacy never reached.
 const poor={...base,family:{...base.family,wife_1:{...base.family.wife_1,intimacy:2000}}};
 assert.equal(validLatency({...poor,latency:{policyVersion:1,seq:0,seed:1,members:{wife_1:{level:5,count:0,attempts:0}}}}),false);
 // Stones nobody earned. Rule 12's exposure: the balance is DERIVED on both sides.
 const idle=spent(base);
 assert.equal(luckStonesEarned(idle),0);
 assert.equal(validLatency({...idle,latency:{policyVersion:1,seq:0,seed:1,members:{wife_1:{level:0,count:0,attempts:5}}}}),false);
 assert.equal(luckStonesSpent(shell({wife_1:{level:3,count:0,attempts:10}})),2+10*STIMULATE_COST);
 // Shape guards.
 assert.equal(validLatency(shell({wife_1:{level:41,count:0,attempts:0}})),false);
 assert.equal(validLatency(shell({wife_1:{level:-1,count:0,attempts:0}})),false);
 assert.equal(validLatency(shell({nobody:{level:1,count:0,attempts:0}})),false);
 assert.equal(validLatency({...base,latency:{policyVersion:2,seq:0,seed:1,members:{}}}),false);
 assert.equal(validLatency({...base,latency:{policyVersion:1,seq:0,seed:1,members:{},extra:1}}),false);
 // And decode names it rather than quarantining silently when it is the only fault.
 assert.throws(()=>decode(JSON.stringify(shell({wife_1:{level:1,count:99999,attempts:100}}))),/Invalid Family Latency/);
});

test('RULE 12: four live saves from four live builds decode byte-identically and gain no Latency',()=>{
 // The rule-12 exposure the doc names is the DERIVED one: a new earnings term changes business
 // income, and `s.enterprises[*].staffingYield` stores a cohort split. These fixtures were written by
 // builds that had never heard of Latency, and every one of them still decodes exactly.
 for(const file of ['live-save-45828d3-day30.json.gz','live-save-4de2a38-day30.json.gz',
                    'live-save-c5b4477-day30.json.gz','power-save-3d47df4-day30.json.gz']){
  const raw=gunzipSync(readFileSync(new URL('./'+file,import.meta.url))).toString('utf8');
  const s=JSON.parse(raw);
  assert.ok(Object.keys(s.family).length>0,`${file} positive control: it has a family at all`);
  assert.ok(Object.keys(s.enterprises||{}).length>0,`${file} positive control: it has businesses`);
  assert.equal(s.latency,undefined);
  const back=decode(raw);
  assert.equal(JSON.stringify(back),raw,`${file} byte-identical round trip`);
  assert.ok(valid(back),refusedBy(back));
  assert.equal(latencyBonus(back),0,'no save gains Latency it did not earn');
 }
});
