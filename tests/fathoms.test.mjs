import test from 'node:test';import assert from 'node:assert/strict';
import {startingSave,act,valid,decode} from '../lib/game.mjs';
import {enterpriseBreakdown,enterpriseRate,BUSINESSES} from '../lib/businesses.mjs';
import {openSlots,slotTier,fathomBonus,habitActions,FATHOM_SLOTS,FATHOM_STEPS,MAX_TIER,ACTIONS_PER_SLOT,FATHOM_DAILY_MAX} from '../lib/fathoms.mjs';
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
