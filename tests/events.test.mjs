import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {EVENTS,ISEKAI_EVENTS,CROSSOVER_EVENTS,COMPLETIONS_PER_STAGE,completionsAvailable,completionsEarned,eventClaimed,validEvents,eventById} from '../lib/events.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),a);return r.state};
// Habit completions are the currency, so a fixture has to earn them the way a player does. Dailies are
// once per period, so a long run needs successive days rather than repeated taps on the same task.
function withCompletions(n){
 let s={...fresh(T),habits:starterHabits(T)},day=0;
 while(completionsEarned(s)<n&&day<400){
  const at=T+day*86400000;
  for(const h of s.habits.items.filter(x=>x.freq==='daily')){
   if(completionsEarned(s)>=n)break;
   const r=act(s,'habitComplete',at,h.id);if(!r.error)s=r.state;
  }
  day++;
 }
 assert.ok(completionsEarned(s)>=n,`fixture earned ${completionsEarned(s)} of ${n}`);
 return s;
}

test('an event stage costs habit completions and hands over one of the cast',()=>{
 const cold={...fresh(T),habits:starterHabits(T)};
 assert.match(act(cold,'eventClaim',cold.lastAt,'DemonSlayer').error,/Finish 10 more habits/);
 const s=withCompletions(COMPLETIONS_PER_STAGE);
 const first=eventById('DemonSlayer').stages[0].member;
 assert.equal(s.fellows[first],undefined,'not owned before the event');
 const after=run(s,'eventClaim','DemonSlayer');
 assert.ok(after.fellows[first],'the character joined');
 assert.equal(eventClaimed(after,'DemonSlayer'),1);
 assert.deepEqual(decode(JSON.stringify(after)),after,'the save round-trips');});

test('completions are SPENT, so an event cannot be farmed',()=>{
 const s=withCompletions(COMPLETIONS_PER_STAGE);
 assert.equal(completionsAvailable(s),completionsEarned(s));
 const after=run(s,'eventClaim','DemonSlayer');
 assert.equal(completionsAvailable(after),completionsEarned(after)-COMPLETIONS_PER_STAGE,'the stage was paid for');
 assert.match(act(after,'eventClaim',after.lastAt,'DemonSlayer').error,/Finish \d+ more habit/,'the next stage is not free');
 // Positive control: with enough completions banked, the next stage DOES open.
 const rich=withCompletions(COMPLETIONS_PER_STAGE*2);
 const twice=run(run(rich,'eventClaim','DemonSlayer'),'eventClaim','DemonSlayer');
 assert.equal(eventClaimed(twice,'DemonSlayer'),2);});

test('an unknown event, and a finished one, are both refused',()=>{
 const e=eventById('DemonSlayer');
 // Derived from the arc, not hard-coded: this fixture said 6 and silently under-funded itself the
 // moment Shinobu's two records made the arc seven stages long.
 const s=withCompletions(COMPLETIONS_PER_STAGE*e.stages.length);
 assert.match(act(s,'eventClaim',s.lastAt,'NotAnEvent').error,/Choose an event/);
 let done=s;
 for(let i=0;i<e.stages.length;i++)done=run(done,'eventClaim','DemonSlayer');
 assert.equal(eventClaimed(done,'DemonSlayer'),e.stages.length);
 assert.match(act(done,'eventClaim',done.lastAt,'DemonSlayer').error,/is complete/);
 for(const st of e.stages)assert.ok(st.member.startsWith('hero_')?done.fellows[st.member]:done.family[st.member],st.member);});

test('owning a character already does not block the arc, and does not double-grant',()=>{
 let s=withCompletions(COMPLETIONS_PER_STAGE);
 const first=eventById('DemonSlayer').stages[0].member;
 s=run(s,'recruit',first);
 const owned={...s.fellows[first]};
 const after=run(s,'eventClaim','DemonSlayer');
 assert.equal(eventClaimed(after,'DemonSlayer'),1,'the arc still advances');
 assert.deepEqual(after.fellows[first],owned,'the Fellow the player already had is untouched');});

test('the ledger is checked, so a claimed stage that was never paid for is refused',()=>{
 const s=run(withCompletions(COMPLETIONS_PER_STAGE),'eventClaim','DemonSlayer');
 assert.ok(validEvents(s));
 assert.equal(validEvents({events:undefined}),true,'an old save without the record is fine');
 const t=s.events;
 assert.equal(valid({...s,events:{...t,claimed:{...t.claimed,DemonSlayer:2}}}),false,'a stage claimed without paying');
 assert.equal(valid({...s,events:{...t,spent:0}}),false,'stages claimed with nothing spent');
 assert.equal(valid({...s,events:{...t,claimed:{NotAnEvent:1}}}),false,'an event that does not exist');
 assert.equal(valid({...s,events:{...t,claimed:{DemonSlayer:99}}}),false,'more stages than the event has');
 assert.equal(valid({...s,events:{...t,policyVersion:2}}),false);
 // The character has to actually be in the village: deleting them must invalidate the claim.
 const gone={...s,fellows:{...s.fellows}};delete gone.fellows[eventById('DemonSlayer').stages[0].member];
 assert.equal(valid(gone),false,'a claimed member who is not in the village');
 // Positive control: the untampered save this was derived from still passes.
 assert.equal(valid(s),true);});

test('every event names real, shipped characters and a reachable cast',()=>{
 // Scoped to the eight Isekai arcs, exactly as it was before the 33 crossover arcs existed: those
 // are asserted separately in tests/crossover-arcs.test.mjs, and their cast is not in the flagless
 // catalogue by design. EVENTS still holds all 41 so validEvents can check any save.
 assert.equal(ISEKAI_EVENTS.length,8);
 assert.equal(EVENTS.length,ISEKAI_EVENTS.length+CROSSOVER_EVENTS.length);
 assert.ok(ISEKAI_EVENTS.every(e=>!e.flag),'an Isekai arc is never flagged');
 const EVENTS_=ISEKAI_EVENTS;
 // Resolved by ID, never by name: Shinobu Kocho, Aqua and Roxy Migurdia each ship as a Fellow AND a
 // Family record, and a name-based generator dropped all six. Where a name repeats, the label must
 // disambiguate, or the player sees the same person listed twice with no way to tell them apart.
 for(const e of EVENTS_){
  const names=e.cast.map(c=>c.name);
  for(const c of e.cast){
   if(names.filter(n=>n===c.name).length>1)assert.notEqual(c.label,c.name,`${c.id} shares a name and needs a label`);
   assert.ok(c.label&&c.label.length,`${c.id} has no label`);
  }
  assert.equal(new Set(e.cast.map(c=>c.label)).size,e.cast.length,`${e.id} has two cast entries labelled the same`);
 }
 const ids=new Set([...FELLOWS,...FAMILY].map(p=>p.id));
 let stages=0;
 for(const e of EVENTS_){
  assert.ok(e.stages.length>0,e.id);
  stages+=e.stages.length;
  assert.equal(e.stages.length,e.cast.length,`${e.id}: one stage per cast member`);
  for(const st of e.stages)assert.ok(ids.has(st.member),`${e.id} names ${st.member}, which is not in the catalogue`);
  assert.equal(new Set(e.stages.map(s=>s.member)).size,e.stages.length,`${e.id} lists someone twice`);
 }
 assert.equal(stages,29,'every shipped crossover RECORD is reachable, including the six characters that ship twice');
 // 35 before the owner's 2026-09-17 roster trim deleted six of the cast (Benimaru, Fafnir, Kanna,
 // Bell Cranel, Kazuma, Rudeus Greyrat). Their stages are gone; the surviving stages in the five
 // affected arcs keep their ORIGINAL `step` numbers, which is the only map from a stored `claimed`
 // count -- written against the arc as it was -- to the arc as it is (lib/release-removed.mjs).
 assert.deepEqual(EVENTS_.filter(e=>e.stages.some((st,i)=>st.step!==i+1)).map(e=>e.id).sort(),
  ['DanMachi','Konosuba','Maidragon','Mushoku','TenSura']);
 for(const e of EVENTS_)assert.deepEqual(e.stages.map(st=>st.step),[...e.stages.map(st=>st.step)].sort((a,b)=>a-b),e.id+' steps are still in order');
 assert.ok(EVENTS_.every(e=>e.stages.length>=2),'every arc still has a cast to meet');
 assert.deepEqual(EVENTS_.map(e=>e.stages.length),[7,3,3,3,4,4,3,2],'LycoReco was already a two-hander and lost nobody');
 // Positive control on the membership probe: an id the catalogue really lacks is not accepted.
 assert.equal(ids.has('hero_99999'),false);
 assert.equal(stages*COMPLETIONS_PER_STAGE,290,'the whole cast costs 290 habit completions');});
