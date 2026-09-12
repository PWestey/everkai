import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {BANQUET_PARTIES,banquetState,PANTRY_PER_DAILY,PANTRY_REFILL_MAX} from '../lib/banquets.mjs';
import {starterHabits} from '../lib/habits.mjs';
const T=new Date('2026-09-20T09:00:00').getTime();
const wine=BANQUET_PARTIES.find(p=>p.id==='wine');
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const prepare=(s,kind='wine')=>run(s,'banquetPrepare',kind,{seq:banquetState(s).seq});
const withJournal=()=>({...fresh(T),habits:starterHabits(T)});
const dailies=s=>s.habits.items.filter(x=>x.freq==='daily');
const pantry=(s,id)=>banquetState(s).pantry[id]||0;

test('the pantry needs a finished habit, never a free press',()=>{
 const s=withJournal();
 assert.equal(pantry(s,wine.materials[0]),0);
 assert.match(act(s,'banquetPrepare',s.lastAt,'wine',{seq:0}).error,/Complete a daily habit/);});

test('one finished daily stocks one set of the party materials',()=>{
 let s=withJournal();
 s=run(s,'habitComplete',dailies(s)[0].id);
 s=prepare(s);
 for(const id of wine.materials)assert.equal(pantry(s,id),PANTRY_PER_DAILY);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);});

test('the day caps the stock however many dailies are finished',()=>{
 let s=withJournal();
 for(const x of dailies(s).slice(0,PANTRY_REFILL_MAX+5))s=run(s,'habitComplete',x.id);
 s=prepare(s);
 for(const id of wine.materials)assert.equal(pantry(s,id),PANTRY_REFILL_MAX);});

test('one stocking a day, across every party',()=>{
 let s=withJournal();
 s=run(s,'habitComplete',dailies(s)[0].id);
 s=prepare(s,'wine');
 assert.match(act(s,'banquetPrepare',s.lastAt,'wine',{seq:banquetState(s).seq}).error,/already used/);
 assert.match(act(s,'banquetPrepare',s.lastAt,'fine',{seq:banquetState(s).seq}).error,/already used/,
  'the guard is on the banquet subtree, not per party');});

test('a stocked pantry still funds a banquet, and hosting spends exactly what it lists',()=>{
 let s=withJournal();
 s=run(s,'habitComplete',dailies(s)[0].id);
 s=prepare(s);
 s=run(s,'banquetHost','wine',{seq:banquetState(s).seq});
 for(const id of wine.materials)assert.equal(pantry(s,id),0,'hosting consumed the listed materials');
 assert.deepEqual(banquetState(s).run.paid,Object.fromEntries(wine.materials.map(id=>[id,1])));
 assert.ok(valid(s));});
