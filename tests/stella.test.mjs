import {powerParts} from '../lib/adventure.mjs';
import test from 'node:test';import {withItems,grantFragments} from './progression-helpers.mjs';import assert from 'node:assert/strict';import {fresh,act,valid,decode,settle,totalRate} from '../lib/game.mjs';import {newFellow,bondedPower} from '../lib/adventure.mjs';import {STELLA_PROFILES,stellaState,stellaEntry,stellaPlan,stellaBonus,STELLA_IDLE_PER_DAY} from '../lib/stella.mjs';import {createPersistence} from '../lib/persistence.mjs';import {BUSINESSES} from '../lib/businesses.mjs';import {FELLOWS} from '../lib/catalog.mjs';import SOURCE from '../lib/stella-data.json' with {type:'json'};
const result=(s,a,id='hero_54',count=1)=>act(s,a,s.lastAt,id,{seq:stellaState(s).seq,count}),go=(s,a,id='hero_54',count=1)=>{const r=result(s,a,id,count);assert.equal(r.error,undefined);assert.ok(valid(r.state),a);return r.state;};
// hero_52 (Angie) and hero_102 (Jewlry) were both deleted in the owner's 2026-09-17 roster trim, so a
// village cannot own either one any more. Angie's ROW stays: stellaRule reads STELLA_PROFILES, so
// dropping it would refuse every save that had ever levelled her (validStella), and
// lib/crossover-stella.mjs templates the shared crossover track off that exact row.
//
// REWRITTEN 2026-09-18. There is no longer such a thing as "an owned Fellow with NO Stella profile":
// STELLA_PROFILES is one profile per original Fellow now, imported from the original's own HeroSpirit
// table (lib/hero-spirit.mjs, scripts/import-hero-spirit.py). The four this file was written around are
// still in it, unchanged -- the importer's positive control reproduces their cost, flat and percent
// columns to the digit -- so every assertion below still measures what it always did; it just names the
// four explicitly instead of taking the whole array.
const LEGACY=['hero_54','hero_56','hero_190','hero_52'];
const OWNABLE=STELLA_PROFILES.filter(p=>LEGACY.includes(p.id)&&FELLOWS.some(f=>f.id===p.id));
const setup=()=>{const s=fresh(1000);for(const id of [...OWNABLE.map(p=>p.id),'hero_101','hero_59'])s.fellows[id]=newFellow();return s;};
test('all source upgrade rows use exact owner fragments and cumulative effects, with full cap',()=>{
 assert.equal(STELLA_PROFILES.length,112,'111 shipped Fellows plus hero_52, whose row outlives her');
 assert.equal(OWNABLE.length,3,'Angie was deleted 2026-09-17; her row stays for old saves and for the crossover track');
 // The four scraped rows and the four imported ones are the same table. Anything else means the
 // importer drifted, and tests/hero-spirit.test.mjs would then be measuring the drift, not the original.
 for(const p of STELLA_PROFILES.filter(p=>LEGACY.includes(p.id))){
  const src=SOURCE.profiles.find(r=>r.id===p.id);
  assert.deepEqual(p.levels.map(r=>[r.level,r.cost,r.flat,r.percent]),src.levels.map(r=>[r.level,r.cost,r.flat,r.percent]),p.id);
 }
 for(const p of OWNABLE){let s=setup();s=go(s,'stellaActivate',p.id);for(let i=0;i<6;i++)s=grantFragments(s,p.id);const stock=s.stella.stock[p.itemId];let spent=0;for(const row of p.levels){s=go(s,'stellaUpgrade',p.id);spent+=row.cost;assert.deepEqual({level:stellaEntry(s,p.id).level,flat:stellaEntry(s,p.id).flat,percent:stellaEntry(s,p.id).percent},{level:row.level,flat:row.flat,percent:row.percent});}assert.equal(s.stella.stock[p.itemId],stock-spent);assert.equal(s.stella.history.length,p.levels.length+1);assert.ok(result(s,'stellaUpgrade',p.id).error);assert.deepEqual(decode(JSON.stringify(s)).stella,s.stella);}});
test('typed effect targets correct current and future Fellows, never increments base aptitude or levels',()=>{let s=setup();const original=structuredClone(s.fellows),unaffected=bondedPower(s,'hero_15');s=go(s,'stellaActivate');s=grantFragments(s);s=go(s,'stellaUpgrade');assert.equal(bondedPower(s,'hero_54'),Math.floor(100*1.05)+500000,'the original\u2019s order: percent first, then the flat extradd');assert.equal(bondedPower(s,'hero_15'),unaffected);assert.deepEqual(s.fellows,original);s=go(s,'stellaUpgrade');assert.equal(stellaEntry(s,'hero_54').flat,1000000);assert.equal(stellaBonus(s,'hero_54').percent,8);assert.equal(bondedPower(s,'hero_54'),Math.floor(100*1.08)+1000000);delete s.fellows.hero_59;s=go(s,'stellaActivate','hero_56');s.fellows.hero_59=newFellow(2);assert.equal(stellaBonus(s,'hero_59').percent,2);});
test('eligibility, activation, cross-fragment spending, stale and batch affordability boundaries',()=>{let s=fresh(1000);assert.ok(result(s,'stellaActivate').error);s=setup();
 // hero_101 used to stand in for "an owned Fellow with no Stella profile". Every original Fellow has
 // one now, so the refusal is checked on a Fellow the roster trim DELETED instead -- which is the case
 // that still has to be refused, and the one a real save can actually present.
 assert.ok(result(s,'stellaActivate','hero_105').error);assert.ok(result(s,'stellaUpgrade').error);s=go(s,'stellaActivate');assert.ok(result(s,'stellaActivate').error);assert.ok(result(s,'stellaUpgrade').error);s=grantFragments(s,'hero_56');assert.ok(result(s,'stellaUpgrade').error);s=grantFragments(s);const plan=stellaPlan(s,'hero_54',5);s=go(s,'stellaUpgrade','hero_54',5);assert.equal(stellaEntry(s,'hero_54').level,5);assert.equal(s.stella.stock.Item_Owner_HeroPiece_54,1000-plan.cost);const seq=s.stella.seq;s=go(s,'stellaUpgrade','hero_54','max');assert.ok(act(s,'stellaUpgrade',s.lastAt,'hero_54',{seq}).error);assert.ok(stellaPlan(s,'hero_54',1).rows.length===0);});
test('failed activation/upgrade persists fragments and exact retry once; receipts survive offline',()=>{let s=setup();s=grantFragments(s);let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);fail=true;assert.throws(()=>p.commit(go(p.current,'stellaActivate')));assert.equal(stellaEntry(p.current,'hero_54'),null);fail=false;p.load(1000);p.commit(go(p.current,'stellaActivate'));const prior=structuredClone(p.current.stella);fail=true;assert.throws(()=>p.commit(go(p.current,'stellaUpgrade','hero_54',5)));assert.deepEqual(p.current.stella,prior);fail=false;p.load(1000);p.commit(go(p.current,'stellaUpgrade','hero_54',5));const final=structuredClone(p.current.stella);p.load(86400000);
 // Offline no longer leaves Stella untouched: fragments drop from idle play now (EVT-22), so the
 // LEDGER is what must survive a day away, while stock grows by exactly the idle accrual and no more.
 assert.deepEqual(p.current.stella.history,final.history,'receipts survive offline');
 assert.deepEqual(p.current.stella.grants,final.grants);
 const gained=(p.current.stella.stock.Item_Owner_HeroPiece_54||0)-(final.stock.Item_Owner_HeroPiece_54||0);
 assert.equal(gained,p.current.stella.idle.Item_Owner_HeroPiece_54,'every fragment gained is recorded as idle');
 assert.ok(gained>0&&gained<=STELLA_IDLE_PER_DAY,`one day away pays at most the daily rate: ${gained}`);});
test('pending Trading/Northern snapshots stay fixed and old-rate income settles before Stella',()=>{let s=setup();s=act(s,'openEnterprise',s.lastAt,BUSINESSES[0].id).state;assert.ok(s.enterprises[BUSINESSES[0].id]);s=act(s,'northStart',s.lastAt,null,{seq:0}).state;s=act(s,'tradeBegin',s.lastAt,'learner',{seq:0,team:['hero_54']}).state;const north=structuredClone(s.northern.run),trade=structuredClone(s.tradingPost.run);s=go(s,'stellaActivate');s=grantFragments(s);const oldRate=totalRate(s),expected=settle(s,s.lastAt+1000);s=act(s,'stellaUpgrade',s.lastAt+1000,'hero_54',{seq:s.stella.seq}).state;assert.equal(s.pending,expected.pending);assert.ok(totalRate(s)>oldRate);assert.deepEqual(s.northern.run,north);assert.deepEqual(s.tradingPost.run,trade);assert.ok(valid(s));});
test('malformed fragment conservation, owner, sequential level and scope rejected; old receipt values not repriced',()=>{let s=grantFragments(go(setup(),'stellaActivate'));s=go(s,'stellaUpgrade');for(const f of [t=>t.stock.Item_Owner_HeroPiece_54++,t=>t.history[1].owner='hero_102',t=>t.history[1].level=5,t=>t.history[1].type='Diligent']){const bad=structuredClone(s);f(bad.stella);assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}s.stella.history[1].paid=21;s.stella.stock.Item_Owner_HeroPiece_54--;s.stella.history[1].flat=499999;assert.deepEqual(decode(JSON.stringify(s)).stella,s.stella);});
test('authored activation is limited and versioned; unmarked v86 receipts keep exact saved benefit',async()=>{
 const {stellaActivation,STELLA_ACTIVATION_POLICY}=await import('../lib/stella.mjs');assert.equal(stellaActivation('hero_102'),null);assert.equal(stellaActivation('hero_54').percent,2);
 let s=go(setup(),'stellaActivate');assert.equal(s.stella.history[0].activationPolicy,STELLA_ACTIVATION_POLICY);delete s.stella.history[0].activationPolicy;s.stella.history[0].percent=3;const old=structuredClone(s.stella);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)).stella,old);assert.equal(bondedPower(s,'hero_54'),103);
 const bad=structuredClone(s);bad.stella.history[0].activationPolicy='unverified-other-policy';assert.equal(valid(bad),false);
});
test('all 111 owned Fellows receive each latest typed contribution exactly once',async()=>{
 // Informed now receives NOTHING here, and that is the point of pinning it: hero_52 (Angie) was the
 // only owner of the Informed Stella track and the owner deleted her on 2026-09-17, so no village can
 // ever activate it again. Her row stays in the data (old saves, and the crossover track templates off
 // it) but it has no reachable owner. Filling that hole would mean inventing a Stella curve and item
 // for another Informed Fellow, or re-pointing an authored track at someone else -- an owner decision.
 const {FELLOWS}=await import('../lib/catalog.mjs');let s=fresh(1000);for(const f of FELLOWS)s.fellows[f.id]=newFellow();const base=structuredClone(s);for(const p of OWNABLE){s=go(s,'stellaActivate',p.id);s=grantFragments(s,p.id);s=go(s,'stellaUpgrade',p.id,5);}
 assert.equal(Object.keys(s.fellows).length,111);
 // The one profile in the whole set that no village can own: hero_52's, kept for old receipts.
 assert.deepEqual(STELLA_PROFILES.filter(p=>!FELLOWS.some(f=>f.id===p.id)).map(p=>[p.id,p.type]),[['hero_52','Informed']]);
 // REBASELINED 2026-09-18 for the ORIGINAL's stacking order: the owner's flat is an `extradd`, added
 // after the typed multiplier, not inside it (lib/stella.mjs applyStella, PropManager.lua:116). Only
 // the three LEGACY owners are climbed here, so every other Fellow's own flat is still zero and the
 // assertion is exactly the typed-contribution one it has always been.
 // Since step 4 every owned hero's star halos add a percent to BOTH states, so the typed percent is checked the
 // additive way -- one more part of the same bucket -- rather than as a factor on the base's Power.
 const sum=o=>Object.values(o).reduce((a,b)=>a+b,0);
 for(const f of FELLOWS){const owner=OWNABLE.find(p=>p.id===f.id),typed=OWNABLE.filter(p=>p.type===f.type),flat=owner?2500000:0,percent=typed.length*17,pb=powerParts(base,f.id);assert.equal(bondedPower(s,f.id),Math.floor(pb.adh*pb.aptitude*(10000+sum(pb.percent)+percent*100)/10000)+sum(pb.flat)+flat,f.id);}
});
test('Elise has separate zero activation, 1500 paid total, cap20 and mixed historical owners',()=>{
 let s=setup();s=go(s,'stellaActivate','hero_54');delete s.stella.history[0].activationPolicy;s.stella.history[0].percent=3;const legacy=structuredClone(s.stella.history);
  // CORRECTED 2026-09-18. Elise's activation granted 0 because no source for it had been recovered and
 // lib/stella-activation-policy.json said so ("original activation unverified"). The original's own
 // table has it: HeroSpirit hero_190 rank 0 grants Hero190_PowerPercent_1 level 1 = 200, i.e. +2%,
 // exactly like the other three. Her POLICY ID is unchanged, so a v86 save that recorded 0 still
 // decodes and keeps the 0 it recorded -- the four legacy ladders are still never repriced.
 s=go(s,'stellaActivate','hero_190');assert.equal(stellaEntry(s,'hero_190').activationPolicy,'private-elise-stella-activation-v1');assert.equal(stellaEntry(s,'hero_190').percent,2);assert.equal(stellaBonus(s,'hero_190').percent,5);
 for(let i=0;i<2;i++)s=grantFragments(s,'hero_190');s=go(s,'stellaUpgrade','hero_190','max');assert.equal(stellaEntry(s,'hero_190').level,20);assert.equal(s.stella.stock.Item_Owner_HeroPiece_190,500);assert.equal(stellaEntry(s,'hero_190').flat,15300000);assert.equal(stellaBonus(s,'hero_190').percent,65);assert.deepEqual(s.stella.history.slice(0,1),legacy);assert.ok(result(s,'stellaUpgrade','hero_190').error);
 const bad=structuredClone(s);bad.stella.history.at(-1).level=21;assert.equal(valid(bad),false);assert.deepEqual(decode(JSON.stringify(s)).stella,s.stella);
});
test('Elise failed write, old-rate settlement and pending encounters preserve prior values',()=>{
 let s=setup();s=act(s,'openEnterprise',s.lastAt,BUSINESSES[0].id).state;s=act(s,'northStart',s.lastAt,null,{seq:0}).state;s=act(s,'tradeBegin',s.lastAt,'learner',{seq:0,team:['hero_190']}).state;s=go(s,'stellaActivate','hero_190');s=grantFragments(s,'hero_190');let raw=JSON.stringify(s),fail=false;const persistence=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));persistence.load(s.lastAt);const old=structuredClone(persistence.current),expected=settle(old,old.lastAt+1000),rate=totalRate(old),candidate=act(old,'stellaUpgrade',old.lastAt+1000,'hero_190',{seq:old.stella.seq,count:5}).state;
 assert.equal(candidate.pending,expected.pending);assert.ok(totalRate(candidate)>rate);assert.deepEqual(candidate.northern.run,old.northern.run);assert.deepEqual(candidate.tradingPost.run,old.tradingPost.run);fail=true;assert.throws(()=>persistence.commit(candidate));assert.deepEqual(persistence.current,old);assert.equal(raw,JSON.stringify(old));fail=false;persistence.load(old.lastAt);persistence.commit(candidate);assert.deepEqual(decode(raw).stella,candidate.stella);
});
test('all three reachable full chains coexist and keep distinct 20/40 caps',()=>{let s=setup();for(const p of OWNABLE){s=go(s,'stellaActivate',p.id);for(let i=0;i<5;i++)s=grantFragments(s,p.id);s=go(s,'stellaUpgrade',p.id,'max');assert.equal(stellaEntry(s,p.id).level,p.id==='hero_190'?20:40);}assert.equal(s.stella.history.length,103,'144 while Angie\u2019s Informed chain was still reachable');assert.deepEqual(decode(JSON.stringify(s)).stella,s.stella);});
