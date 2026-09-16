import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {WISH_POOL,WISH_RECRUITS,WISH_COSTS,WISH_APK,fountainState,wishReward} from '../lib/fountain.mjs';
// lib/fountain-data.json was read off the in-game rule text; lib/fountain-apk-data.json comes from
// BaseLottery / BaseLotteryExchange / split_reward / System / BreachLevel. Neither is trusted alone.
const apkPool=WISH_APK.pool,apkExchange=WISH_APK.exchange;
const stocked=(bottles=900)=>({...fresh(1000),fountain:{policyVersion:1,seq:0,seed:123456789,bottles,total:0,ledger:{},history:[],recruited:[]}});
const run=(s,a,t=null,n=null)=>{const r=act(s,a,s.lastAt,t,{seq:fountainState(s).seq,count:n});assert.equal(r.error,undefined);assert.ok(valid(r.state));return decode(JSON.stringify(r.state))};

test('the shipped drop table is the original BaseLottery table, row for row',()=>{
 assert.equal(apkPool.length,12);
 assert.equal(WISH_POOL.length,12);
 assert.equal(WISH_APK.weightTotal,10000);
 assert.equal(apkPool.reduce((n,r)=>n+r.weight,0),10000);
 assert.equal(WISH_POOL.reduce((n,r)=>n+r.weight,0),1000);
 // The rule text quotes percentages; the config quotes weights out of 10,000. Same order, same rows.
 WISH_POOL.forEach((r,i)=>{
  const a=apkPool[i];
  assert.equal(r.weight*10,a.weight,`weight ${r.id}`);
  assert.equal(r.weight/10,a.percent,`percent ${r.id}`);
  assert.equal(r.quantity,a.quantity,`quantity ${r.id}`);
  assert.equal(r.itemId,a.itemId,`itemId ${r.id}`);
 });
 // No reward is left without the original's item id any more.
 assert.equal(WISH_POOL.every(r=>typeof r.itemId==='string'&&r.itemId.length>0),true);
});

test('draw costs, Fairy cadence and fragment synthesis are the original System/BreachLevel values',()=>{
 assert.deepEqual([...WISH_COSTS],[[1,1],[10,9],[100,90]]);
 assert.deepEqual(WISH_APK.drawCosts.map(d=>d.key),['LotterySingleDrawCost','LotteryTenDrawCost','LotteryHundredDrawCost']);
 assert.equal(WISH_APK.fairy.cadence,500);
 assert.deepEqual(WISH_APK.fragmentsPerStone,{id:'Item_Piece_Hero_Universal',count:20});
 // The original's undocumented opening sequence is recorded but deliberately not applied.
 assert.equal(WISH_APK.unspokenRules.applied,false);
 assert.equal(WISH_APK.unspokenRules.value.length,10);
 assert.equal(WISH_APK.unspokenRules.value[0],'BaseLottery_Reward_01');
 // Positive control: the wish stream really is the pool, not the scripted sequence.
 assert.equal(wishReward(0.0005).id,'Lottery_4');
 assert.equal(wishReward(0.999).id,'Lottery_15');
});

test('a hundred-wish draw spends ninety bottles and saves a hundred rewards',()=>{
 let s=stocked(90);
 s=run(s,'wishDraw',null,100);
 assert.equal(s.fountain.bottles,0);
 assert.equal(s.fountain.total,100);
 assert.equal(s.fountain.history.at(-1).paid,90);
 assert.equal(s.fountain.history.at(-1).rewards.length,100);
 // Negative controls: an unpriced count and an unaffordable bulk draw both refuse without charging.
 for(const [count,bottles] of [[100,89],[50,900],[0,900],[1000,1e6]]){
  const t=stocked(bottles),r=act(t,'wishDraw',t.lastAt,null,{seq:0,count});
  assert.ok(r.error,`count ${count} with ${bottles} bottles should refuse`);
  assert.equal(fountainState(r.state).bottles,bottles);
 }
});

test('every shipped recruit cost is the original exchange price, and the one gap is named',()=>{
 assert.equal(apkExchange.length,16);
 assert.equal(WISH_RECRUITS.length,15);
 const apkById=new Map(apkExchange.map(r=>[r.character,r]));
 for(const p of WISH_RECRUITS){
  const a=apkById.get(p.id);
  assert.ok(a,`${p.id} is not in BaseLotteryExchange`);
  assert.equal(p.cost,a.cost,`cost ${p.id}`);
  assert.equal(p.kind,a.kind,`kind ${p.id}`);
  assert.equal(p.name,a.name,`name ${p.id}`);
 }
 // The single missing row, recorded so it stays measurable rather than forgotten.
 const missing=apkExchange.filter(a=>!WISH_RECRUITS.some(p=>p.id===a.character));
 assert.deepEqual(missing.map(a=>[a.character,a.cost,a.name]),[['wife_60',1,'Wenreesa']]);
});

test('Wenreesa cannot be recruited because Drakenberg has no such Family member',{todo:'roster slice: wife_60 has no catalog entry or art, so BaseLotteryExchange_19 cannot be offered'},()=>{
 let s=stocked(0);
 s={...s,fountain:{...s.fountain,ledger:{Lottery_4:5}}};
 const r=act(s,'wishRecruit',s.lastAt,'wife_60',{seq:0});
 assert.equal(r.error,undefined);
});
