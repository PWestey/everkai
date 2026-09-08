import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,settle,decode,valid,totalRate} from '../lib/game.mjs';import {tradingPost,negotiationEnergy,TRADE_SHOP} from '../lib/trading-post.mjs';import {createPersistence} from '../lib/persistence.mjs';
const result=(s,a,t=null,extra={})=>act(s,a,s.lastAt,t,{seq:tradingPost(s).seq,...extra}),run=(s,a,t=null,extra={})=>{const r=result(s,a,t,extra);assert.equal(r.error,undefined);assert.ok(valid(r.state));return r.state},begin=(s=fresh(1000),opponent='learner')=>run(s,'tradeBegin',opponent,{team:['hero_15']}),complete=s=>run(settle(s,s.tradingPost.run.readyAt),'tradeComplete',s.tradingPost.run.id);
test('win reward→source shop→actual earned gold with separate Energy',()=>{let s=begin(),date=s.energy,inv=structuredClone(s.inventory);assert.equal(s.tradingPost.run.team[0].paidEnergy,1);assert.equal(s.energy,date);s=complete(s);assert.equal(s.tradingPost.coins,30);assert.equal(s.tradingPost.influence,2);assert.deepEqual(s.inventory,inv);s=run(s,'tradeBuy',TRADE_SHOP.id,{count:1});const gold=s.gold,rate=totalRate(s);s=act(s,'useConsumable',s.lastAt,TRADE_SHOP.id,{count:1}).state;assert.equal(s.gold,gold+Math.floor(rate*60));assert.equal(s.inventory[TRADE_SHOP.id],0);assert.equal(s.tradingPost.coins,0);assert.deepEqual(decode(JSON.stringify(s)).tradingPost,s.tradingPost)});
test('loss spends negotiation Energy and gives no reward; team frozen against later training',()=>{let s=begin(fresh(1000),'veteran');s.fellows.hero_15.aptitude=1000;assert.equal(s.tradingPost.run.team[0].power,100);assert.ok(result(s,'tradeComplete',s.tradingPost.run.id).error);s=complete(s);assert.equal(s.tradingPost.coins,0);assert.equal(s.tradingPost.influence,0);assert.equal(s.tradingPost.history[0].wins,0);assert.ok(result(s,'tradeBegin','learner',{team:['hero_15']}).error);assert.equal(negotiationEnergy(s,'hero_15').energy,0)});
test('source hour recovery three times then midnight reset without date Energy mutation',()=>{let s=fresh(1000);for(let n=0;n<4;n++){s=complete(begin(s));assert.equal(negotiationEnergy(s,'hero_15').refills,n);const due=s.tradingPost.energy.hero_15.recoverAt;if(n<3){s=settle(s,due-1);assert.equal(negotiationEnergy(s,'hero_15').energy,0);s=settle(s,due);assert.equal(negotiationEnergy(s,'hero_15').energy,1)}else assert.equal(due,null)}s=settle(s,86400000);assert.deepEqual(negotiationEnergy(s,'hero_15'),{day:1,energy:1,refills:0,recoverAt:null});assert.equal(s.tradingPost.history.length,4)});
test('invalid party, missing energy, stale completion and daily/cap exchange refuse atomically',()=>{let s=fresh(1000);for(const team of [[],['hero_15','hero_15'],['hero_102'],Array(7).fill('hero_15')])assert.ok(result(s,'tradeBegin','learner',{team}).error);s=complete(begin(s));const prior=s.tradingPost.seq;assert.ok(result(s,'tradeComplete',s.tradingPost.history[0].id).error);s.tradingPost.coins=300;s=run(s,'tradeBuy',TRADE_SHOP.id,{count:5});s=run(s,'tradeBuy',TRADE_SHOP.id,{count:5});assert.ok(result(s,'tradeBuy',TRADE_SHOP.id,{count:1}).error);assert.ok(act(s,'tradeBuy',s.lastAt,TRADE_SHOP.id,{seq:prior,count:1}).error)});
test('failed start/completion save preserves paid Energy and credits once on retry',()=>{let raw=JSON.stringify(fresh(1000)),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);fail=true;assert.throws(()=>p.commit(begin(p.current)));assert.equal(p.current.tradingPost,undefined);fail=false;p.load(1000);p.commit(begin(p.current));p.load(4000);const id=p.current.tradingPost.run.id;fail=true;assert.throws(()=>p.commit(run(p.current,'tradeComplete',id)));assert.equal(p.current.tradingPost.coins,0);assert.ok(p.current.tradingPost.run);fail=false;p.load(4000);p.commit(run(p.current,'tradeComplete',id));assert.equal(decode(raw).tradingPost.coins,30);assert.equal(p.current.tradingPost.history.length,1)});
test('malformed simulated snapshots rejected; loss and win receipts survive offline day reset',()=>{const s=begin();for(const mutate of [t=>t.run.simulated=false,t=>t.run.team=[null],t=>t.run.coins++,t=>t.energy.hero_15.energy=2]){const bad=structuredClone(s);mutate(bad.tradingPost);assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)))}const restored=decode(JSON.stringify(settle(s,86400000)));assert.deepEqual(restored.tradingPost.run,s.tradingPost.run);assert.equal(tradingPost(restored).shop.day,1)});

test('midnight coincident with hourly recovery gives one reset energy, never a banked extra refill',()=>{
 const midnight=86400000; let s=begin(fresh(midnight-3600000));
 const priorRun=structuredClone(s.tradingPost.run);
 s=decode(JSON.stringify(settle(s,midnight)));
 assert.deepEqual(s.tradingPost.run,priorRun);
 for(let i=0;i<5;i++)assert.deepEqual(negotiationEnergy(s,'hero_15'),{day:1,energy:1,refills:0,recoverAt:null});
 s=run(s,'tradeComplete',priorRun.id); const history=structuredClone(s.tradingPost.history);
 s=begin(s); assert.equal(s.tradingPost.energy.hero_15.refills,0);
 assert.equal(s.tradingPost.energy.hero_15.recoverAt,midnight+3600000);
 s=complete(s); assert.equal(negotiationEnergy(s,'hero_15').energy,0);
 assert.deepEqual(s.tradingPost.history[0],history[0]);
 s=settle(s,midnight+3600000-1); assert.equal(negotiationEnergy(s,'hero_15').energy,0);
 s=settle(s,midnight+3600000); assert.equal(negotiationEnergy(s,'hero_15').refills,1);
 s=begin(decode(JSON.stringify(s))); assert.equal(negotiationEnergy(s,'hero_15').energy,0);
 assert.equal(s.tradingPost.energy.hero_15.refills,1);
});

test('prior-day timer is discarded on reset and cannot restore a new-day spend early',()=>{
 const midnight=86400000; let s=complete(begin(fresh(midnight-10000)));
 const obsolete=s.tradingPost.energy.hero_15.recoverAt;
 s=settle(s,midnight); s=complete(begin(s));
 const due=s.tradingPost.energy.hero_15.recoverAt;
 assert.equal(due,midnight+3600000); assert.ok(obsolete<due);
 s=settle(s,obsolete); assert.equal(negotiationEnergy(s,'hero_15').energy,0);
 s=decode(JSON.stringify(settle(s,due))); assert.equal(negotiationEnergy(s,'hero_15').energy,1);
 const control=settle(s,s.lastAt),beforeEnergy=control.energy,beforeSchool=structuredClone(control.school);
 s=begin(s); assert.equal(s.energy,beforeEnergy); assert.deepEqual(s.school,beforeSchool);
 assert.equal(s.tradingPost.history.length,2);
});

test('failed write after recovery preserves entitlement and isolated tonic/date ledgers',()=>{
 let s=complete(begin(fresh(1000))); const due=s.tradingPost.energy.hero_15.recoverAt;
 s.tonics={policyVersion:1,reserve:3,consumed:0,receipts:[{policyVersion:1,ordinal:1,itemId:'Item_GetDE_10',count:1,effectPerItem:3,total:3,at:s.lastAt}]};
 assert.ok(valid(s)); let raw=JSON.stringify(s),fail=false;
 const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));
 p.load(due); const baseline=structuredClone(p.current),candidate=begin(p.current);
 assert.deepEqual(candidate.tonics,baseline.tonics); assert.equal(candidate.energy,baseline.energy);
 fail=true; assert.throws(()=>p.commit(candidate)); assert.equal(negotiationEnergy(p.current,'hero_15').energy,1);
 assert.deepEqual(p.current.tradingPost.history,baseline.tradingPost.history);
 fail=false;p.load(due);p.commit(begin(p.current));
 assert.equal(negotiationEnergy(p.current,'hero_15').energy,0);assert.equal(p.current.tradingPost.energy.hero_15.refills,1);
 assert.deepEqual(p.current.tonics,baseline.tonics);assert.equal(p.current.energy,baseline.energy);
 assert.deepEqual(decode(raw).tradingPost,p.current.tradingPost);
});
