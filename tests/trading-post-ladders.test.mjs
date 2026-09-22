// THE TRADING POST'S TWO LADDERS (2026-09-22). Every number asserted here is read back out of the
// original's own tables through lib/trading-post-ladder-data.json, so a drifted import fails loudly.
import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
// The fixture was written on the owner's Mac (America/Phoenix) and some checks read "today" in local time; CI runs in UTC.
process.env.TZ='America/Phoenix';
import {fresh,act,settle,decode,valid,totalRate} from '../lib/game.mjs';
import {tradingPost,counter,counterStored,counterRate,counterFull,vouchers,vouchersEarned,VOUCHER_PER_WIN} from '../lib/trading-post.mjs';
import {COURAGE,TAX,COURAGE_MAX,TAX_MAX,TAX_INTERVAL,courageBp,courageCost,motivatedPower,taxUpgradeCost,taxSpent,taxBuffBp,taxCapacitySeconds,taxRate,taxStored,VOUCHER_ITEM} from '../lib/trading-post-ladders.mjs';

const at=s=>({seq:tradingPost(s).seq});
const run=(s,a,t=null,extra={})=>{const r=act(s,a,s.lastAt,t,{...at(s),...extra});assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state));return r.state};
const begin=(s,extra={})=>run(s,'tradeBegin','learner',{team:['hero_15'],...extra});
const complete=s=>run(settle(s,s.tradingPost.run.readyAt),'tradeComplete',s.tradingPost.run.id);
const cycle=(s,n)=>{for(let i=0;i<n;i++){s=complete(begin(s));const e=s.tradingPost.energy.hero_15;if(e.recoverAt)s=settle(s,e.recoverAt);else s=settle(s,(Math.floor(s.lastAt/86400000)+1)*86400000)}return s};

test('the imported ladders are the original tables, not a rescaling',()=>{
 // CommercialWarCourage: 20 rows, powerRise 200 a level, consumeBase in gold ("3").
 assert.equal(COURAGE.length,20);assert.equal(COURAGE_MAX,20);
 assert.deepEqual(COURAGE[0],{level:1,powerBp:200,stepGoldPerProsperity:4,goldPerProsperity:4});
 assert.equal(COURAGE.at(-1).powerBp,4000);
 for(let n=1;n<=COURAGE_MAX;n++)assert.equal(courageBp(n),200*n);
 assert.equal(courageBp(0),0);assert.equal(courageBp(99),4000,'past the last row the ladder holds, never extrapolates');
 // CommercialWarTax: 200 rows, Goodwill Vouchers, bp/s and a capacity in seconds.
 assert.equal(TAX.length,200);assert.equal(TAX_MAX,200);assert.equal(VOUCHER_ITEM,'Item_LvUp_ClanWar_1');
 assert.deepEqual(TAX[0],{level:1,cost:5,taxBuff:2000,taxTimeLimit:1200});
 assert.deepEqual(TAX.at(-1),{level:200,cost:3200000,taxBuff:46000,taxTimeLimit:30000});
 assert.equal(TAX_INTERVAL,10,'System.json CommercialWarTaxOutputInterval');
 assert.equal(taxUpgradeCost(TAX_MAX),null,'the last row has no successor');
 assert.equal(taxSpent(1),0);assert.equal(taxSpent(3),5+12);
 assert.equal(taxSpent(TAX_MAX),128415990,'every voucher the full ladder costs');
});

test('taxBuff is a RATE and taxTimeLimit a CAPACITY, read out of the client, not a timed buff',()=>{
 // CommercialWarManager.lua:63-69 -- yieldSec = prosperity * taxBuff / 10000.
 assert.equal(taxRate(1,1000),1000*2000/10000);
 assert.equal(taxRate(200,1000),1000*46000/10000);
 // :541-547 -- the store holds floor(taxTimeLimit / interval) ticks and no more, so an offline week
 // banks exactly the capacity. That IS the offline cap; nothing about it needed adapting.
 assert.equal(taxCapacitySeconds(1),1200);assert.equal(taxCapacitySeconds(200),30000);
 assert.equal(taxStored(1,1000,600),600*200,'half the capacity pays half');
 assert.equal(taxStored(1,1000,1200),1200*200,'exactly the capacity');
 assert.equal(taxStored(1,1000,86400*7),1200*200,'a week offline pays the capacity and not a gold more');
 assert.equal(taxStored(1,1000,5),0,'less than one output interval has not ticked yet');
 // The fishing artifact adds to the RATE, exactly where GetTaxBuff adds count_fishAdd.
 assert.equal(taxBuffBp(1,1000),3000);assert.equal(taxRate(1,1000,1000),1000*3000/10000);
});

test('Motivate costs gold, freezes on the run, and can only ever raise a stored Power',()=>{
 let s=fresh(1000);s={...s,gold:10_000_000};
 const prosperity=totalRate(s),price=courageCost(5,prosperity);
 assert.equal(price,Math.floor(COURAGE[4].goldPerProsperity*prosperity));
 const before=s.gold;s=begin(s,{courage:5});
 assert.equal(s.gold,before-price,'the gold is charged when the negotiation starts');
 const r=s.tradingPost.run;
 assert.equal(r.courage,5);assert.equal(r.courageGold,price);
 assert.equal(r.team[0].power,motivatedPower(r.team[0].base,5));
 assert.equal(r.team[0].power,Math.floor(r.team[0].base*1.1),'+2% a level, five levels');
 assert.ok(r.team[0].power>=r.team[0].base);
 // The run's snapshot survives a reload and an offline day exactly as it did before Motivate existed.
 assert.deepEqual(decode(JSON.stringify(settle(s,s.lastAt+86400000))).tradingPost.run,r);
 // NEGATIVE CONTROL: a receipt that claims a motivated Power its own Courage cannot buy is refused.
 for(const mutate of [t=>t.run.team[0].power++,t=>t.run.courage=0,t=>{t.run.courage=undefined},
                      t=>{t.run.team[0].base=undefined},t=>t.run.courage=COURAGE_MAX+1]){
  const bad=structuredClone(s);mutate(bad.tradingPost);
  assert.equal(valid(bad),false,'a forged Motivate receipt must be refused');
  assert.throws(()=>decode(JSON.stringify(bad)));
 }
});

test('Motivate is refused when the gold is not there, and spends no Energy doing it',()=>{
 let s=fresh(1000);s={...s,gold:0};
 const before=structuredClone(s.tradingPost);
 const r=act(s,'tradeBegin',s.lastAt,'learner',{...at(s),team:['hero_15'],courage:COURAGE_MAX});
 assert.match(r.error,/gold/i);
 assert.deepEqual(r.state.tradingPost,before,'no Energy, no run, no gold');
 assert.equal(r.state.gold,0);
 // Courage 0 is free at any gold, which is what the Little Helper always fields.
 assert.equal(courageCost(0,1e9),0);
 assert.ok(!act(s,'tradeBegin',s.lastAt,'learner',{...at(s),team:['hero_15'],courage:0}).error);
});

test('a save written before the ladders decodes byte-identically and gains no state',()=>{
 // The exact shape the live build writes: a run and a receipt with no courage, base or voucherPerWin.
 const s=complete(begin(fresh(1000)));
 const legacy=structuredClone(s);
 delete legacy.tradingPost.history[0].courage;delete legacy.tradingPost.history[0].courageGold;
 delete legacy.tradingPost.history[0].voucherPerWin;delete legacy.tradingPost.history[0].team[0].base;
 const raw=JSON.stringify(legacy);
 assert.ok(valid(legacy),'a legacy receipt must still validate');
 assert.deepEqual(decode(raw).tradingPost,legacy.tradingPost,'decode must not rewrite it');
 assert.equal(legacy.tradingPost.counter,undefined,'no Counter appears on its own');
 // It still earns vouchers, at the same constant, so the ladder is reachable from an old save.
 assert.equal(vouchersEarned(legacy),legacy.tradingPost.history[0].wins*VOUCHER_PER_WIN);
});

test('My Counter opens free, accrues on elapsed time, caps offline and empties on collect',()=>{
 let s=fresh(1000);s={...s,gold:1000};
 assert.match(act(s,'tradeCollectCounter',s.lastAt,null,at(s)).error,/Open My Counter/);
 s=run(s,'tradeOpenCounter');
 const c=counter(s);assert.deepEqual(c,{policyVersion:1,level:1,collectedAt:1000});
 assert.equal(counterStored(s,totalRate(s)),0,'nothing has elapsed yet');
 assert.equal(counterRate(s,totalRate(s)),totalRate(s)*0.2,'level 1 is 2000 bp a second');
 // Ten minutes: half the level-1 capacity.
 s=settle(s,1000+600_000);
 const half=counterStored(s,totalRate(s));
 assert.equal(half,Math.floor(600*taxRate(1,totalRate(s))));
 assert.ok(!counterFull(s));
 // A week offline pays the capacity and stops. THIS is the offline adaptation: there is none needed.
 s=settle(s,1000+7*86400_000);
 const full=counterStored(s,totalRate(s));
 assert.equal(full,Math.floor(1200*taxRate(1,totalRate(s))));
 assert.ok(counterFull(s));
 const gold=s.gold;s=run(s,'tradeCollectCounter');
 assert.equal(s.gold,gold+full);
 assert.equal(counterStored(s,totalRate(s)),0,'collecting empties it');
 assert.equal(counter(s).collectedAt,s.lastAt);
 assert.match(act(s,'tradeCollectCounter',s.lastAt,null,at(s)).error,/nothing banked/);
 assert.deepEqual(decode(JSON.stringify(s)).tradingPost.counter,counter(s));
});

test('levelling the Counter costs won duels, fills it on upgrade, and cannot be forged',()=>{
 let s=fresh(1000);s={...s,gold:1000};s=run(s,'tradeOpenCounter');
 assert.equal(vouchers(s),0);
 assert.match(act(s,'tradeUpgradeCounter',s.lastAt,null,at(s)).error,/Goodwill Vouchers/);
 s=cycle(s,5);                                    // five won duels, five vouchers
 assert.equal(vouchersEarned(s),5);assert.equal(vouchers(s),5);
 s=run(s,'tradeUpgradeCounter');
 assert.equal(counter(s).level,2);assert.equal(vouchers(s),0,'level 1 -> 2 costs the table\'s 5');
 // Rule:text:CommercialWar_8 -- the store is full the moment it levels.
 assert.equal(counterStored(s,totalRate(s)),Math.floor(Math.floor(taxCapacitySeconds(2)/TAX_INTERVAL)*TAX_INTERVAL*taxRate(2,totalRate(s))));
 assert.ok(counterFull(s));
 assert.match(act(s,'tradeUpgradeCounter',s.lastAt,null,at(s)).error,/Goodwill Vouchers/);
 // NEGATIVE CONTROL: a level the receipts cannot pay for, and a malformed Counter, are both refused.
 for(const mutate of [t=>t.counter.level=50,t=>t.counter.level=0,t=>t.counter.level=TAX_MAX+1,
                      t=>t.counter.collectedAt=-1,t=>t.counter.policyVersion=2,
                      t=>t.counter.collectedAt=t.counter.collectedAt+1e12,t=>t.history=[]]){
  const bad=structuredClone(s);mutate(bad.tradingPost);
  assert.equal(valid(bad),false,'a Counter level its receipts cannot pay for must be refused');
  assert.throws(()=>decode(JSON.stringify(bad)),/Invalid Trading Post/);
 }
 // ...and a legal level survives the round trip.
 assert.deepEqual(decode(JSON.stringify(s)).tradingPost.counter,counter(s));
});

test('what a realistic account gains, measured on a day-30 live save',()=>{
 // RULE 1: both halves of every ratio come from the same place. The PRICE is the original's table
 // (lib/trading-post-ladder-data.json); the INCOME is totalRate() on the day-30 save the live build
 // wrote (tests/live-save-45828d3-day30.json.gz, 30 days of APK-growth habit play), not a fresh village.
 const s=decode(gunzipSync(readFileSync(new URL('./live-save-45828d3-day30.json.gz',import.meta.url))).toString('utf8'));
 const p=totalRate(s);
 assert.ok(p>0,'the fixture must have a village');
 const rows=[1,2,5,10,20,30,50,200].map(level=>({level,
  perSecond:taxRate(level,p),
  perFullCycle:taxStored(level,p,taxCapacitySeconds(level)),
  hours:taxCapacitySeconds(level)/3600,
  vouchers:taxSpent(level)}));
 // The shape the owner asked about: it really does level up, and it really does pay more.
 assert.equal(taxBuffBp(200)/taxBuffBp(1),23,'level 200 is 23x level 1 per second');
 assert.equal(rows[0].perFullCycle,Math.floor(1200*p*0.2));
 assert.ok(rows.at(-1).perFullCycle>rows[0].perFullCycle*500,'and 575x per full cycle, on a 25x longer one');
 assert.equal(rows.find(r=>r.level===10).vouchers,313,'ten levels is 313 won duels');
 assert.equal(rows.find(r=>r.level===20).vouchers,1414,'twenty is 1,414 -- reachable; 200 is 128,415,990 and is not');
 assert.equal(taxCapacitySeconds(30),30000,'the capacity stops growing at level 30; only the rate goes on');
 console.log(`  My Counter on the day-30 save (village ${Math.round(p).toLocaleString()} gold/s):`);
 for(const r of rows)console.log(`   lv${String(r.level).padStart(3)}  ${(taxBuffBp(r.level)/10000).toFixed(2)}x income/s`
  +`  ${Math.round(r.perFullCycle).toLocaleString().padStart(18)} gold a full cycle (${r.hours.toFixed(2)} h)`
  +`  ${r.vouchers.toLocaleString()} won duels`);
 console.log(`  Motivate on the same save: lv1 +2% for ${courageCost(1,p).toLocaleString()} gold,`
  +` lv20 +40% for ${courageCost(20,p).toLocaleString()} gold (${COURAGE.at(-1).goldPerProsperity.toFixed(0)} seconds of income)`);
});
