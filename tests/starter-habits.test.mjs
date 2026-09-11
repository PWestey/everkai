import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,decode,valid} from '../lib/game.mjs';
import {STARTER_TASKS,starterHabits,freshHabits,validHabits,HABIT_DOMAINS,HABIT_FREQS,habitDue,habitDay} from '../lib/habits.mjs';
import {startingSave,newJourney} from '../lib/game.mjs';
const T=new Date('2026-09-14T08:00:00').getTime();

test('a new journal starts with the full starter task list',()=>{const h=starterHabits(T);
 assert.equal(STARTER_TASKS.length,78);assert.equal(h.items.length,78);assert.equal(h.nextId,79);
 assert.ok(validHabits({habits:h}));
 assert.equal(new Set(h.items.map(x=>x.id)).size,78);
 for(const x of h.items){assert.match(x.id,/^h[1-9][0-9]*$/);assert.ok(Number(x.id.slice(1))<h.nextId,x.id);
  assert.ok(HABIT_DOMAINS.includes(x.domain),x.domain);assert.ok(HABIT_FREQS.includes(x.freq),x.freq);
  assert.ok(x.title.trim().length&&x.title.length<=60,x.title);assert.ok(x.notes.length<=500);
  assert.equal(x.done,false);assert.equal(x.streak,0);assert.equal(x.createdAt,T)}
 assert.equal(h.items.filter(x=>x.freq==='daily').length,56);
 assert.equal(h.items.filter(x=>x.freq==='weekly').length,15);
 assert.equal(h.items.filter(x=>x.freq==='monthly').length,6);
 assert.equal(h.items.filter(x=>x.freq==='quarterly').length,1);
 assert.ok(h.items.every(x=>x.freq!=='quarterly'||x.review));});

test('personal wording is kept out of the shipped list',()=>{const titles=STARTER_TASKS.map(t=>t.title);
 assert.ok(titles.includes('Take supplements'));assert.ok(titles.includes('Daily work review'));
 for(const gone of ['Take Meds & Supplements','Daily Queue & Breach Risk Review'])assert.ok(!titles.includes(gone),gone);});

test('a starting save carries the journal, and every daily is due and completable today',()=>{let s=startingSave(T);
 assert.equal(s.habits.items.length,78);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
 const dailies=s.habits.items.filter(x=>x.freq==='daily'&&habitDue(x,T));
 assert.equal(dailies.length,56);
 const r=act(s,'habitComplete',T,dailies[0].id);assert.equal(r.error,undefined,r.error);
 const row=r.state.habits.history.at(-1);
 assert.equal(row.kind,'complete');assert.equal(row.day,habitDay(T));assert.ok(valid(r.state));});

test('fresh() stays empty, and a new journey keeps an existing journal',()=>{
 assert.equal(fresh(T).habits,undefined);
 const mine=act(fresh(T),'habitSave',T,null,{title:'Only mine',freq:'daily',domain:'health'}).state;
 assert.deepEqual(newJourney(mine,T).habits.items.map(x=>x.title),['Only mine']);
 assert.equal(newJourney(fresh(T),T).habits.items.length,78);});
