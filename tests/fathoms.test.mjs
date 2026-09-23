import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {startingSave,act,valid,decode} from '../lib/game.mjs';
import {enterpriseBreakdown,enterpriseRate,BUSINESSES} from '../lib/businesses.mjs';
import {openSlots,slotTier,fathomBonus,habitActions,FATHOM_SLOTS,FATHOM_STEPS,MAX_TIER,ACTIONS_PER_SLOT,FATHOM_DAILY_MAX,
        fathomRoll,fathomRollQuote,slotRolls,fathomState,validFathoms,FATHOM_GOLD_LADDER,FATHOM_GOLD_REACH} from '../lib/fathoms.mjs';
import {luckStones,luckStonesSpent,FATHOM_STONE} from '../lib/luck-stones.mjs';
import {habitEarnings} from '../lib/habits.mjs';
import {staffed} from './gear-fixtures.mjs';
const NOW=1767225600000; // fixed local day, so habitDay() is stable across runs
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,String(r.error));return r.state};
/** A save with one family member, a completed daily habit, and enough lifetime practice for `slots`. */
function ready(slots=1,intimacy=5000,dailies=FATHOM_DAILY_MAX){
 let s=startingSave(NOW);
 // Complete several daily habits: the practice allowance is min(FATHOM_DAILY_MAX, dailies), so a
 // single completion would allow exactly one advance. Not every starter daily is due today, so
 // failures are skipped rather than asserted away.
 let done=0;
 for(const x of s.habits.items.filter(x=>x.freq==='daily')){
  if(done>=dailies)break;
  const r=act(s,'habitComplete',s.lastAt,x.id);
  if(!r.error){s=r.state;done++}
 }
 assert.ok(done>0,'fixture completed no daily habit');
 // Normalise every domain, not just one: the completions above already incremented their own
 // domains, so habitActions() must be set deliberately rather than assumed.
 const need=slots*ACTIONS_PER_SLOT;
 const totals=Object.fromEntries(Object.entries(s.habits.totals).map(([k,v])=>[k,{...v,actions:0}]));
 totals.health={...totals.health,actions:need};
 s={...s,habits:{...s.habits,totals}};
 const id=Object.keys(s.family)[0];
 s={...s,family:{...s.family,[id]:{...s.family[id],intimacy}}};
 return [s,id];
}

test('the ladder is the original: 36 slots, six per country, tiers 1..25 ascending',()=>{
 assert.equal(FATHOM_SLOTS.length,36);assert.equal(FATHOM_STEPS.length,25);assert.equal(MAX_TIER,25);
 assert.equal(FATHOM_SLOTS[0].intimacy,50);assert.equal(FATHOM_SLOTS.at(-1).intimacy,5000);
 const counts={};for(const s of FATHOM_SLOTS)counts[String(s.type)]=(counts[String(s.type)]||0)+1;
 assert.deepEqual(new Set(Object.values(counts)),new Set([6]));
 assert.deepEqual(FATHOM_STEPS.map(x=>x.percent),[...FATHOM_STEPS.map(x=>x.percent)].sort((a,b)=>a-b));
 // The country cycle is fixed by index, not rolled.
 assert.deepEqual(FATHOM_SLOTS.slice(0,6).map(x=>x.type),['Diligent','Informed','Brave','Inspiring','Unfettered',null]);
});

test('a slot needs BOTH the intimacy gate and cumulative habit practice',()=>{
 // Intimacy alone opens nothing: it is buyable, so it cannot be the pace.
 let [s,id]=ready(0,5000);
 assert.equal(habitActions(s),0);assert.equal(openSlots(s,id),0);
 assert.match(act(s,'fathomAdvance',s.lastAt,id,1).error,/habit actions/);
 // Practice alone opens nothing either.
 [s,id]=ready(36,10);
 assert.equal(openSlots(s,id),0);
 assert.match(act(s,'fathomAdvance',s.lastAt,id,1).error,/Intimacy/);
 // Both, and the slot opens.
 [s,id]=ready(1,50);
 assert.equal(openSlots(s,id),1);
 assert.equal(slotTier(s,id,1),1);assert.equal(slotTier(s,id,2),0);
});

test('practice is daily-capped, monotonic, and stops at the final tier',()=>{
 let [s,id]=ready(1);
 const start=slotTier(s,id,1);
 // The allowance is what the day's habits actually earned, never a fixed number.
 const allowance=Math.min(FATHOM_DAILY_MAX,habitEarnings(s.habits,s.lastAt).dailies);
 assert.ok(allowance>=1);
 for(let i=0;i<allowance;i++)s=run(s,'fathomAdvance',id,1);
 assert.equal(slotTier(s,id,1),start+allowance);
 // The daily allowance is spent; nothing further today.
 assert.match(act(s,'fathomAdvance',s.lastAt,id,1).error,/already used/);
 // It never goes down, and it stops at the top rather than overflowing.
 s={...s,fathoms:{...s.fathoms,day:'',used:0,tiers:{[id]:{1:MAX_TIER}}}};
 assert.equal(slotTier(s,id,1),MAX_TIER);
 assert.match(act(s,'fathomAdvance',s.lastAt,id,1).error,/fully practised/);
});

test('practice requires a completed daily habit, not merely owning family',()=>{
 // startingSave without completing anything: dailies is 0, so there is no allowance.
 let s=startingSave(NOW),id=Object.keys(s.family)[0];
 s={...s,habits:{...s.habits,totals:{...s.habits.totals,health:{...s.habits.totals.health,actions:1000}}}};
 s={...s,family:{...s.family,[id]:{...s.family[id],intimacy:5000}}};
 assert.ok(openSlots(s,id)>0);
 assert.match(act(s,'fathomAdvance',s.lastAt,id,1).error,/daily habit/);
});

test('the bonus reaches business income, matches only its own type, and both income paths agree',()=>{
 let [s,id]=ready(1);
 s={...s,gold:s.gold+1_000_000};
 s=run(s,'openEnterprise','Building_101');           // Inn is Diligent, and slot 1 is Diligent
 s=staffed(s,'Building_101',200);
 const before=enterpriseBreakdown(s,'Building_101');
 s=run(s,'fathomAdvance',id,1);
 const after=enterpriseBreakdown(s,'Building_101');
 const step=FATHOM_STEPS[1].percent/100;             // tier 1 -> tier 2
 assert.ok(after.bonus>before.bonus);
 assert.equal(Number((after.bonus-before.bonus).toFixed(10)),Number((step-FATHOM_STEPS[0].percent/100+0).toFixed(10)));
 assert.ok(after.total>before.total);
 // A Diligent slot must not pay a Brave business.
 assert.equal(fathomBonus(s,'Brave'),0);
 assert.ok(fathomBonus(s,'Diligent')>0);
 // enterpriseRate and enterpriseBreakdown must never drift apart.
 assert.equal(enterpriseRate(s),Object.keys(s.enterprises).reduce((n,x)=>n+enterpriseBreakdown(s,x).total,0));
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('a save cannot carry practice it never earned',()=>{
 const [s,id]=ready(1);
 for(const edit of [
  x=>{x.fathoms={policyVersion:1,day:'',used:0,tiers:{[id]:{36:5}}}},      // a slot that is not open
  x=>{x.fathoms={policyVersion:1,day:'',used:0,tiers:{[id]:{1:MAX_TIER+1}}}}, // beyond the final tier
  x=>{x.fathoms={policyVersion:1,day:'',used:FATHOM_DAILY_MAX+1,tiers:{}}},   // more practice than a day allows
  x=>{x.fathoms={policyVersion:1,day:'',used:0,tiers:{wife_does_not_exist:{1:2}}}},
 ]){
  const bad=structuredClone(s);edit(bad);
  assert.equal(valid(bad),false);
  assert.throws(()=>decode(JSON.stringify(bad)),/Family Fathoms/);
 }
});

// ---- THE ORIGINAL'S ROLL (2026-09-22, docs/character-systems-gap.md 3.3 and 7.4) ----
// Everkai's free habit drip is KEPT; the roll is added beside it. A roll can only ever raise a tier.

/** A save with several slots open, gold to burn and enough habit practice to have earned stones.
 *  Built on `ready()` so the gates under test are the same ones the rest of this file exercises. */
function rollFixture(slots=8){
 const [base,id]=ready(slots,5000);
 return [{...base,gold:1e12},id];
}

test('the weight columns reproduce the original\'s own stored success rates under keep-if-better',()=>{
 // THE DERIVATION. `successRate*` is not stored as a probability of anything the client rolls -- it
 // is exactly P(draw > current tier) when a draw is kept only if strictly better, and it falls out
 // of the weight columns only under that rule. That is what makes the mechanic MEASURED.
 const total=k=>FATHOM_STEPS.reduce((n,s)=>n+s[k],0);
 const above=(k,tier)=>FATHOM_STEPS.filter(s=>s.tier>tier).reduce((n,s)=>n+s[k],0);
 assert.equal(total('normal'),181545);
 assert.equal(total('high'),49500);
 // The reference screenshot's own two numbers, on a +21% slot.
 assert.equal(above('normal',21),585);
 assert.equal(above('high',21),17500);
 assert.equal((above('normal',21)/total('normal')*100).toFixed(3),'0.322');   // panel: "0.32%"
 assert.equal((above('high',21)/total('high')*100).toFixed(2),'35.35');       // panel: "35%"
 assert.equal(FATHOM_STEPS[20].rateNormal,32);
 assert.equal(FATHOM_STEPS[20].rateHigh,3500);
 // Every tier agrees with its own stored rate to within the config's rounding (worst: 0.47 points).
 for(const s of FATHOM_STEPS){
  assert.ok(Math.abs(above('normal',s.tier)/total('normal')-s.rateNormal/10000)<0.005,`tier ${s.tier} normal`);
  assert.ok(Math.abs(above('high',s.tier)/total('high')-s.rateHigh/10000)<0.005,`tier ${s.tier} high`);
 }
 // Expected rolls to the top tier: memoryless and keep-if-better, so it is total/weight(top).
 assert.equal(Math.round(total('normal')/FATHOM_STEPS.at(-1).normal),1815);
 assert.equal(Math.round(total('high')/FATHOM_STEPS.at(-1).high),33);
 // The gold ladder is the original's own, and it passes this village's MAX_GOLD partway up -- which
 // is the point: the gold route is meant to stall and leave the top tiers to advanced rolls.
 assert.equal(FATHOM_GOLD_LADDER.length,1180);
 assert.equal(FATHOM_GOLD_LADDER[0],'10');
 assert.equal(FATHOM_GOLD_LADDER.at(-1),'1000000000000000000000');
 assert.equal(FATHOM_GOLD_REACH,827);
});

test('a roll draws the table\'s own distribution, keeps only a better tier, and is seeded',()=>{
 // Pure: the same seed, column and tier always give the same answer.
 assert.deepEqual(fathomRoll(12345,'normal',1),fathomRoll(12345,'normal',1));
 assert.notEqual(fathomRoll(12345,'normal',1).seed,12345,'every roll advances the stream');
 // KEEP IF STRICTLY BETTER, in both directions.
 const drawn=fathomRoll(12345,'normal',1).drawn;
 assert.equal(fathomRoll(12345,'normal',MAX_TIER).tier,MAX_TIER,'a draw never lowers a tier');
 assert.equal(fathomRoll(12345,'normal',MAX_TIER).kept,false);
 assert.equal(fathomRoll(12345,'normal',drawn).kept,false,'equal is not better');
 // The draw follows the table's weights: 20,000 draws, each tier within a point of its share.
 let seed=1;const seen={};
 for(let i=0;i<20000;i++){const r=fathomRoll(seed,'normal',0);seed=r.seed;seen[r.drawn]=(seen[r.drawn]||0)+1;}
 const total=FATHOM_STEPS.reduce((n,s)=>n+s.normal,0);
 for(const s of FATHOM_STEPS.slice(0,6))
  assert.ok(Math.abs((seen[s.tier]||0)/20000-s.normal/total)<0.01,`tier ${s.tier} share drifted`);
 // The advanced column is zero below tier 20, so an advanced draw always lands at 20 or above.
 for(let i=0,sd=7;i<200;i++){const r=fathomRoll(sd,'high',0);sd=r.seed;assert.ok(r.drawn>=20);}
});

test('a paid roll costs, records the attempt, and a lost roll still moves the price and the seed',()=>{
 let [s,id]=rollFixture();
 assert.equal(slotTier(s,id,1),1,'positive control: slot 1 is open at tier 1');
 const before=fathomRollQuote(s,id,1);
 assert.equal(before.rolls,0);
 assert.equal(before.gold,10,'the original\'s first gold price');
 const gold=s.gold;
 s=run(s,'fathomRollGold',id,1);
 assert.equal(s.gold,gold-10,'the roll was paid for');
 assert.equal(slotRolls(s,id,1).gold,1,'the attempt was recorded, landed or not');
 assert.equal(fathomRollQuote(s,id,1).gold,20,'the ladder stepped up');
 assert.ok(slotTier(s,id,1)>=1,'a roll never lowers a tier');
 assert.notEqual(fathomState(s).seed,undefined);
 // The OUTCOME is stored, so a reload reproduces it rather than rolling again.
 const saved=JSON.stringify(s);
 assert.deepEqual(decode(saved),s);
 assert.equal(slotTier(decode(saved),id,1),slotTier(s,id,1));
 // Twenty more rolls: the tier only ever rises, and the price only ever rises with it.
 let tier=slotTier(s,id,1),price=fathomRollQuote(s,id,1).gold;
 for(let i=0;i<20;i++){
  s=run(s,'fathomRollGold',id,1);
  assert.ok(slotTier(s,id,1)>=tier,'a tier went down');
  assert.ok(fathomRollQuote(s,id,1).gold>=price,'a price went down');
  tier=slotTier(s,id,1);price=fathomRollQuote(s,id,1).gold;
 }
 assert.ok(tier>1,`21 gold rolls raised the slot (tier ${tier})`);
 // A LOST ROLL IS STILL A ROLL. 21 rolls were made and 21 must be recorded -- most of them lost,
 // because after the first few the held tier is above most of the weight column. If a loss did not
 // count, the price would never rise and the weight table would mean nothing.
 assert.equal(slotRolls(s,id,1).gold,21);
 const kept=tier-1;
 assert.ok(kept<21,`positive control: some of the 21 rolls lost (${21-kept} of them)`);
 assert.ok(valid(s));
});

test('an advanced roll spends the same Luck Stones Latency does, three on an all-buildings slot',()=>{
 let [s,id]=rollFixture();
 const before=luckStones(s);
 assert.ok(before>0,'positive control: the habit faucet paid stones');
 s=run(s,'fathomRollAdvanced',id,1);
 assert.equal(luckStones(s),before-1,'a normal slot costs one stone');
 assert.equal(slotRolls(s,id,1).advanced,1);
 // The original's all-buildings slots carry skillQuality 1 and cost three stones (ConsumeHigh2).
 const premium=FATHOM_SLOTS.find(x=>x.premium);
 assert.equal(premium.type,null,'a premium slot is the every-business kind');
 const [wide,wideId]=rollFixture(premium.slot);
 const t=run(wide,'fathomRollAdvanced',wideId,premium.slot);
 assert.equal(luckStones(t),luckStones(wide)-3,'an all-buildings slot costs three, per WifeQuenchingConsumeHigh2');
 // The stone balance is shared with Latency, exactly as in the original.
 assert.equal(luckStonesSpent(s),1);
 // AND IT IS REFUSED WHEN THE BALANCE CANNOT PAY. The balance is derived, so it is spent down by
 // recording rolls the save has actually made rather than by editing a number: with two stones left
 // a normal slot (one stone) still rolls and an all-buildings slot (three) does not.
 const earned=luckStones(wide)+luckStonesSpent(wide);
 const spent=Math.floor(earned/FATHOM_STONE)-2;
 const thin={...wide,fathoms:{...fathomState(wide),rolls:{[wideId]:{1:{gold:0,advanced:spent}}}}};
 assert.ok(valid(thin),'the spent-down fixture is itself a legal save');
 assert.equal(luckStones(thin),2);
 assert.match(act(thin,'fathomRollAdvanced',thin.lastAt,wideId,premium.slot).error,/3 Luck Stones/);
 assert.ok(!act(thin,'fathomRollAdvanced',thin.lastAt,wideId,1).error,'one stone is still affordable');
});

test('the free drip is untouched, and a paid roll is not erased by the next free advance',()=>{
 let [s,id]=rollFixture();
 // A free advance still moves exactly one tier and still costs nothing.
 const before=slotTier(s,id,2),gold=s.gold;
 s=run(s,'fathomAdvance',id,2);
 assert.equal(slotTier(s,id,2),before+1);
 assert.equal(s.gold,gold,'practice is still free');
 // A paid roll, then another free advance: the roll counters and the seed must SURVIVE, or the free
 // advance would silently refund every advanced Fathom the player had paid for.
 s=run(s,'fathomRollAdvanced',id,1);
 const spent=luckStonesSpent(s),seed=fathomState(s).seed;
 s=run(s,'fathomAdvance',id,3);
 assert.equal(luckStonesSpent(s),spent,'a free advance refunded a paid roll');
 assert.equal(fathomState(s).seed,seed,'a free advance reset the roll stream');
 assert.equal(slotRolls(s,id,1).advanced,1);
 assert.ok(valid(s));
});

test('RULE 12: a save written before the roll existed decodes unchanged and is worth the same',()=>{
 // s.fathoms.tiers is a stored value fathomBonus turns into business income, so the whole point of
 // adding the roll beside the drip rather than replacing it is that no tier changes value.
 for(const file of ['live-save-45828d3-day30.json.gz','live-save-4de2a38-day30.json.gz',
                    'live-save-c5b4477-day30.json.gz','power-save-3d47df4-day30.json.gz']){
  const raw=gunzipSync(readFileSync(new URL('./'+file,import.meta.url))).toString('utf8');
  const s=JSON.parse(raw);
  assert.ok(s.fathoms&&Object.keys(s.fathoms.tiers).length>0,`${file} positive control: it holds Fathoms`);
  assert.equal(s.fathoms.seed,undefined,`${file} predates the roll`);
  assert.equal(s.fathoms.rolls,undefined);
  const back=decode(raw);
  assert.equal(JSON.stringify(back),raw,`${file} byte-identical round trip`);
  assert.ok(valid(back));
  // And every type's bonus is exactly what it was: the tier VALUES did not move.
  for(const type of ['Inspiring','Diligent','Brave','Informed','Unfettered'])
   assert.equal(fathomBonus(back,type),fathomBonus(s,type));
  assert.equal(luckStonesSpent(back),0,'no pre-existing save owes a stone for a roll it never made');
 }
});

test('validFathoms bounds the roll state and keeps an absent one legal',()=>{
 const [s,id]=rollFixture();
 const shell=extra=>({...s,fathoms:{...fathomState(s),...extra}});
 assert.equal(validFathoms(s),true,'no roll state yet');
 assert.equal(validFathoms(shell({seed:0,rolls:{}})),true);
 assert.equal(validFathoms(shell({seed:4294967295,rolls:{[id]:{1:{gold:3,advanced:2}}}})),true);
 assert.equal(validFathoms(shell({seed:4294967296})),false,'a seed outside the LCG range');
 assert.equal(validFathoms(shell({seed:-1})),false);
 assert.equal(validFathoms(shell({rolls:{[id]:{1:{gold:-1,advanced:0}}}})),false);
 assert.equal(validFathoms(shell({rolls:{[id]:{1:{gold:1.5,advanced:0}}}})),false);
 assert.equal(validFathoms(shell({rolls:{nobody:{1:{gold:1,advanced:0}}}})),false);
 // A roll recorded against a slot this member has never opened.
 assert.equal(validFathoms(shell({rolls:{[id]:{36:{gold:1,advanced:0}}}})),false);
 assert.throws(()=>decode(JSON.stringify(shell({rolls:{nobody:{1:{gold:1,advanced:0}}}}))),/Invalid Family Fathoms/);
});
