import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {fountainState,OPENING_DRAWS} from '../lib/fountain.mjs';
import data from '../lib/fountain-data.json' with {type:'json'};
const T=new Date('2026-09-16T09:00:00').getTime();
const stocked=()=>({...fresh(T),fountain:{policyVersion:1,seq:0,seed:123456789,bottles:2000,total:0,ledger:{},history:[],recruited:[]}});
const draw=(s,count=1)=>{const f=fountainState(s);const r=act(s,'wishDraw',s.lastAt,null,{seq:f.seq,count});assert.equal(r.error,undefined,r.error);return r.state};
const drawn=s=>fountainState(s).history.flatMap(h=>h.rewards.map(r=>r.id));

// System.LotteryUnspokenRules is a bare array of ten reward ids where the game's other *UnspokenRules
// keys use a {count,type,id} shape, so what it MEANT was ambiguous from the data alone. What settled it
// was the owner's own play: asked cold -- without being shown the table -- whether their very first wish
// gave an Acquaint Stone, they said yes. BaseLottery_Reward_01 is that item, and it is the rarest row in
// the pool: weight 1 of 1,000, which a roll reaches 0.1% of the time. That is not a coincidence, so the
// bare array forces the first ten draws in order.
test('the first ten wishes follow the original`s scripted opening, in order',()=>{
 let s=stocked();
 for(let i=0;i<10;i++)s=draw(s);
 assert.deepEqual(drawn(s),OPENING_DRAWS);
 assert.equal(OPENING_DRAWS.length,10);
 // The first one is the item the owner remembered, and it is the rarest in the pool.
 const first=data.pool.find(r=>r.id===OPENING_DRAWS[0]);
 assert.equal(first.name,'Acquaint Stone');
 const total=data.pool.reduce((n,r)=>n+r.weight,0);
 assert.equal(first.weight,Math.min(...data.pool.map(r=>r.weight)),'the scripted first draw is the rarest row');
 assert.equal(total,1000,'the pool weights sum to 1,000');
 assert.equal(first.weight/total*100,0.1,'which a roll would reach 0.1% of the time');
 assert.ok(valid(s));
 assert.deepEqual(decode(JSON.stringify(s)),s);});

test('wish eleven onward is rolled again, and a ten-draw spans the handover',()=>{
 let s=stocked();
 for(let i=0;i<10;i++)s=draw(s);
 const after=drawn(draw(s,10)).slice(10);
 assert.equal(after.length,10);
 // Positive control: those ten are real pool ids, so "not scripted" does not mean "nothing happened".
 for(const id of after)assert.ok(data.pool.some(r=>r.id===id),id);
 // They must not simply repeat the script; the odds of that by chance are negligible.
 assert.notDeepEqual(after,OPENING_DRAWS,'the roll took over');

 // A single ten-wish draw spanning the boundary from zero gets the script, then rolls.
 let batch=stocked();
 batch=draw(batch,10);
 assert.deepEqual(drawn(batch),OPENING_DRAWS,'one ten-draw from a fresh fountain IS the script');
 const next=drawn(draw(batch,1)).slice(10);
 assert.equal(next.length,1);});

test('the mapping to the original`s table is exact, not approximate',()=>{
 // Everkai's pool is BaseLottery with ids offset by +3 and weights divided by 10. If either half of
 // that drifts, the scripted ids stop naming the rows the original scripted and this test says so.
 const BASE=[10,40,70,180,210,540,910,910,1270,1640,2110,2110];
 assert.equal(data.pool.length,BASE.length);
 data.pool.forEach((r,i)=>{
  assert.equal(r.weight,BASE[i]/10,`${r.id} weight`);
  assert.equal(r.id,'Lottery_'+(i+4),`${r.id} is BaseLottery_Reward_${String(i+1).padStart(2,'0')} offset by 3`);
 });
 const seq=data.openingSequence;
 assert.deepEqual(seq.draws,seq.original.map(x=>'Lottery_'+(Number(x.split('_').at(-1))+3)),'the stored mapping is the offset');
 for(const id of seq.draws)assert.ok(data.pool.some(r=>r.id===id),`${id} is a real pool row`);
 assert.equal(seq.source.key,'LotteryUnspokenRules');});
