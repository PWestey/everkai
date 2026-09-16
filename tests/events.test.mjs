import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {EVENTS,COMPLETIONS_PER_STAGE,completionsAvailable,completionsEarned,eventClaimed,validEvents,eventById} from '../lib/events.mjs';
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
 const s=withCompletions(COMPLETIONS_PER_STAGE*6);
 assert.match(act(s,'eventClaim',s.lastAt,'NotAnEvent').error,/Choose an event/);
 let done=s;const e=eventById('DemonSlayer');
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
 assert.equal(EVENTS.length,8);
 const ids=new Set([...FELLOWS,...FAMILY].map(p=>p.id));
 let stages=0;
 for(const e of EVENTS){
  assert.ok(e.stages.length>0,e.id);
  stages+=e.stages.length;
  assert.equal(e.stages.length,e.cast.length,`${e.id}: one stage per cast member`);
  for(const st of e.stages)assert.ok(ids.has(st.member),`${e.id} names ${st.member}, which is not in the catalogue`);
  assert.equal(new Set(e.stages.map(s=>s.member)).size,e.stages.length,`${e.id} lists someone twice`);
 }
 assert.equal(stages,28,'28 crossover characters ship, and every one is reachable through an event');
 // Positive control on the membership probe: an id the catalogue really lacks is not accepted.
 assert.equal(ids.has('hero_99999'),false);
 assert.equal(stages*COMPLETIONS_PER_STAGE,280,'the whole cast costs 280 habit completions');});
