import test from 'node:test';import assert from 'node:assert/strict';
// The habit day, the helper's arming gate and the run record's day key are all LOCAL civil dates
// (habitDay), so every fixture here is written in one zone rather than the machine's. CI runs in UTC
// and the owner's Mac in America/Phoenix; pinning is what makes the two agree
// (tests/power-pacing.test.mjs holds the measurement that taught this).
process.env.TZ='America/Phoenix';
import {fresh,act,valid,decode,QUARANTINABLE,lastQuarantine} from '../lib/game.mjs';
import {newFellow,bondedPower} from '../lib/adventure.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {HELPER_TASKS,HELPER_FOCUS_MAX,HELPER_NOTE_MAX,helperState,validHelper,helperFocusList,helperNote,
 stellaOrder,stellaTracked,crossoverRank} from '../lib/helper.mjs';
import {stellaState,stellaEntry,stellaPlan} from '../lib/stella.mjs';
import {CROSSOVER_SHARD_ITEM} from '../lib/crossover-stella.mjs';
import {SPIRIT_SHARD_ITEM} from '../lib/hero-spirit.mjs';
import {ADDITION_FELLOWS} from '../lib/everkai-additions.mjs';
import {fellowById} from '../lib/catalog.mjs';
import {todayList} from '../lib/today.mjs';
import roster from '../lib/crossover-roster-data.json' with {type:'json'};

// -------------------------------------------------------------------------------------------------
// THE DEFECT THIS FILE PINS (owner, 2026-09-19). Stella's flat lands in full at any level and every
// ladder is paid from one shared pool per roster, so the Little Helper has to choose who climbs.
// Choosing "highest level first" fixed the ORIGINAL Fellows and did nothing for the crossovers:
// MEASURED, all 133 are level 1 with 100 Power at equal investment, so they tie and the tie broke on
// catalogue position -- which lists all 75 Marvel before all 58 Star Wars. The owner saw exactly that.
// The fix is his own two-part decision: a FOCUS pick per Fellow, and his own rank order as the
// fallback. Both halves are asserted here, each with a negative control.
// -------------------------------------------------------------------------------------------------
const T=new Date('2026-09-16T09:00:00').getTime();
const FELLOWS_BY_RANK=roster.characters.filter(c=>c.kind==='fellows');
/** A Marvel Fellow the owner ranked LAST and a Star Wars Fellow he ranked FIRST. Catalogue order puts
 *  the Marvel one first (every Marvel row precedes every Star Wars row); his rank order does not. */
const LATE_MARVEL=FELLOWS_BY_RANK.filter(c=>c.franchise==='Marvel').sort((a,b)=>b.rank-a.rank)[0].id;
const FIRST_SW=FELLOWS_BY_RANK.filter(c=>c.franchise==='Star Wars').sort((a,b)=>a.rank-b.rank)[0].id;
const CATALOGUE=ADDITION_FELLOWS.map(f=>f.id);

/** An armed village (one daily habit done, which is what sends the helper out) owning `ids`. */
const own=(...ids)=>{
 const base=fresh(T);
 const s={...base,habits:starterHabits(T),fellows:{...base.fellows,...Object.fromEntries(ids.map(id=>[id,newFellow()]))}};
 const daily=s.habits.items.find(x=>x.freq==='daily');
 const r=act(s,'habitComplete',s.lastAt,daily.id);
 assert.equal(r.error,undefined,r.error);
 return r.state;
};
/** Idle-paid shards in one pool: the ledger validStella reconciles the stock against. */
const stock=(s,itemId,n)=>({...s,stella:{policyVersion:1,seq:stellaState(s).seq,stock:{...stellaState(s).stock,[itemId]:n},
 idle:{...stellaState(s).idle,[itemId]:n},since:s.lastAt,grants:[...stellaState(s).grants],history:[...stellaState(s).history]}});
const focus=(s,...ids)=>{for(const id of ids){const r=act(s,'helperFocus',s.lastAt,id,true);assert.equal(r.error,undefined,`${id}: ${r.error}`);s=r.state}return s};
/** Run the Stella chore exactly as the helper does, through the same act(). */
const chore=(s,now=s.lastAt)=>{
 const out=HELPER_TASKS.find(t=>t.id==='stella').run(s,act,now);
 assert.ok(valid(out.state),'the chore produced an illegal save');
 assert.deepEqual(decode(JSON.stringify(out.state)),out.state,'the chore’s save round-trips');
 return out;
};
const ranks=(s,id)=>stellaEntry(s,id)?.level||0;
/** Enough for one crossover rank and no more: the ladder's first row costs 20 and its second 30. */
const ONE_RANK=20;

// -------------------------------------------------------------------------------------------------
// 1. THE FOCUS PICKS, in the player's own order.
// -------------------------------------------------------------------------------------------------
test('the focus picks are served first, in the order the player picked them',()=>{
 const [a,b]=[CATALOGUE[0],CATALOGUE[1]];
 const s=stock(own(a,b),CROSSOVER_SHARD_ITEM,ONE_RANK);
 // Positive control: with no picks at all, catalogue-and-rank order serves `a` first, so the test
 // below has to prove the PICK moved the shards rather than the default agreeing with it.
 assert.equal(ranks(chore(s).state,a),1,'without a pick the default order serves the first Fellow');
 const second=focus(s,b);
 assert.deepEqual(helperFocusList(second),[b]);
 const out=chore(second).state;
 assert.equal(ranks(out,b),1,'the picked Fellow took the only affordable rank');
 assert.equal(ranks(out,a),0,'and the unpicked Fellow got none');
 // NEGATIVE CONTROL: pick both, in the other order, and the other one is served.
 const both=focus(s,a,b);
 assert.deepEqual(helperFocusList(both),[a,b],'the array IS the pick order');
 const flipped=chore(both).state;
 assert.equal(ranks(flipped,a),1);
 assert.equal(ranks(flipped,b),0);
 const reversed=chore(focus(s,b,a)).state;
 assert.equal(ranks(reversed,b),1,'picking b first sends the same shard to b');
 assert.equal(ranks(reversed,a),0);
});

test('a maxed focus pick falls through to the next pick',()=>{
 const [a,b,c]=[CATALOGUE[0],CATALOGUE[1],CATALOGUE[2]];
 // 4,500 buys the whole 40-rank ladder, +20 for exactly one rank beyond it.
 const s=stock(own(a,b,c),CROSSOVER_SHARD_ITEM,4500+ONE_RANK);
 const filled=chore(focus(s,a)).state;
 assert.equal(ranks(filled,a),40,'the first pick climbed its whole ladder');
 assert.equal(stellaPlan(filled,a,'max').rows.length,0,'and can take nothing more');
 // Now the same save, with the maxed Fellow still first in the pick order.
 const after=chore(focus({...filled,helper:{...helperState(filled),focus:[]}},a,b)).state;
 assert.equal(ranks(after,a),40,'the maxed pick took nothing');
 assert.equal(ranks(after,b),1,'the next pick took the rank instead');
 assert.equal(ranks(after,c),0,'and nobody below the picks did');
 // NEGATIVE CONTROL: with the first pick NOT maxed, it takes that rank and the second gets none.
 const fresh2=stock(own(a,b,c),CROSSOVER_SHARD_ITEM,ONE_RANK);
 const notMaxed=chore(focus(fresh2,a,b)).state;
 assert.equal(ranks(notMaxed,a),1);
 assert.equal(ranks(notMaxed,b),0);
});

// -------------------------------------------------------------------------------------------------
// 2. THE FALLBACK, with nothing picked.
// -------------------------------------------------------------------------------------------------
test('with no picks, crossover shards follow the owner’s rank order, not catalogue order',()=>{
 // MEASURED, and the whole reason this changed: at equal investment these two are identical.
 const s=stock(own(LATE_MARVEL,FIRST_SW),CROSSOVER_SHARD_ITEM,ONE_RANK);
 assert.equal(s.fellows[LATE_MARVEL].level,s.fellows[FIRST_SW].level,'equal level');
 assert.equal(bondedPower(s,LATE_MARVEL),bondedPower(s,FIRST_SW),'and equal Power, so level and Power decide nothing');
 assert.ok(CATALOGUE.indexOf(LATE_MARVEL)<CATALOGUE.indexOf(FIRST_SW),'catalogue order puts the Marvel Fellow first');
 assert.ok(crossoverRank(FIRST_SW)<crossoverRank(LATE_MARVEL),'the owner’s own order does not');
 assert.deepEqual(stellaOrder(s).filter(id=>id!=='hero_15'),[FIRST_SW,LATE_MARVEL]);
 const out=chore(s).state;
 assert.equal(ranks(out,FIRST_SW),1,'the owner’s rank-1 Fellow took the shard');
 assert.equal(ranks(out,LATE_MARVEL),0,'the catalogue-first Fellow did not');
 // NEGATIVE CONTROL: the same test against a Marvel Fellow the owner ranked FIRST, which is both
 // catalogue-first and rank-first -- that one does take it, so the assertion above is about rank.
 const marvelFirst=FELLOWS_BY_RANK.filter(c=>c.franchise==='Marvel').sort((a,b)=>a.rank-b.rank)[0].id;
 const pair=stock(own(marvelFirst,FIRST_SW),CROSSOVER_SHARD_ITEM,ONE_RANK);
 assert.equal(crossoverRank(marvelFirst),crossoverRank(FIRST_SW),'they share rank 1: the tie breaks on catalogue position');
 const tie=chore(pair).state;
 assert.equal(ranks(tie,marvelFirst),1);
 assert.equal(ranks(tie,FIRST_SW),0);
});

test('with no picks, village shards follow highest level, then Power, then catalogue order',()=>{
 const [low,high]=['hero_1','hero_101'];
 let s=own();
 s={...s,fellows:{...s.fellows,[low]:{...newFellow(),level:1},[high]:{...newFellow(),level:90}}};
 s=stock(s,SPIRIT_SHARD_ITEM,60);
 assert.equal(stellaOrder(s)[0],high,'the level-90 Fellow is first in the queue');
 const out=chore(s).state;
 assert.ok(ranks(out,high)>0,'and took the shards');
 assert.equal(ranks(out,low),0);
 // NEGATIVE CONTROL: swap the levels and the other one is served -- the order is the levels.
 const swapped=stock({...s,fellows:{...s.fellows,[low]:{...newFellow(),level:90},[high]:{...newFellow(),level:1}}},SPIRIT_SHARD_ITEM,60);
 const r=chore(swapped).state;
 assert.ok(ranks(r,low)>0);
 assert.equal(ranks(r,high),0);
 // Power breaks a LEVEL tie: same level, one with an artifact's Aptitude behind it.
 let tie=own();
 tie={...tie,fellows:{...tie.fellows,[low]:{...newFellow(),level:20},[high]:{...newFellow(),level:20,aptitude:900}}};
 assert.ok(bondedPower(tie,high)>bondedPower(tie,low),'the two differ only in Power');
 assert.equal(stellaOrder(tie)[0],high,'the stronger of two equal levels goes first');
});

test('originals and crossovers never compete: they are different pools',()=>{
 let s=own(CATALOGUE[0]);
 s=stock(s,CROSSOVER_SHARD_ITEM,ONE_RANK);
 const out=chore(s).state;
 assert.equal(ranks(out,CATALOGUE[0]),1,'the crossover Fellow spent the crossover pool');
 assert.equal(stellaState(out).stock[SPIRIT_SHARD_ITEM]||0,0,'the village pool was never touched');
 assert.equal(ranks(out,'hero_15'),0,'and the starter, who sorts first, took nothing she could not pay for');
});

// -------------------------------------------------------------------------------------------------
// 3. THE RUN RECORD.
// -------------------------------------------------------------------------------------------------
test('the run record names who got the ranks, and Today and the panel can read it',()=>{
 const pick=CATALOGUE[0],name=fellowById(pick).name;
 const s=stock(own(pick),CROSSOVER_SHARD_ITEM,90);// 20+30+40 = three ranks
 const out=chore(s);
 assert.match(out.note,new RegExp(`^3 ranks for ${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}$`),`the chore reported: ${out.note}`);
 // Through the real run, where it is written to the save.
 const run=act(s,'helperRun',s.lastAt);
 assert.equal(run.error,undefined,run.error);
 assert.ok(valid(run.state),'a save carrying the note is legal');
 assert.deepEqual(decode(JSON.stringify(run.state)),run.state,'and round-trips byte-identically');
 assert.equal(helperNote(run.state,'stella'),`3 ranks for ${name}`);
 const row=todayList(run.state).find(r=>r.id==='stella');
 assert.ok(row,'the Today list has a Stella row');
 assert.match(row.detail,new RegExp(name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')),`the row repeats the helper’s report: ${row.detail}`);
 // NEGATIVE CONTROL: a run on a village with no shards writes no Stella note at all.
 const dry=act(own(pick),'helperRun',s.lastAt);
 assert.equal(dry.error,undefined,dry.error);
 assert.match(helperNote(dry.state,'stella'),/^(\d+ Stellas? activated)?$/,'nothing but the free activations is claimed');
 assert.ok(!/rank/.test(helperNote(dry.state,'stella')),'no ranks are reported when none were bought');
 // The note is bounded, whatever the roster looks like.
 assert.ok(helperNote(run.state,'stella').length<=HELPER_NOTE_MAX);
});

test('a note left over from an earlier day reads as absent, exactly as the ids do',()=>{
 const s=stock(own(CATALOGUE[0]),CROSSOVER_SHARD_ITEM,90);
 const run=act(s,'helperRun',s.lastAt).state;
 assert.ok(helperNote(run,'stella'),'positive control: today it reads');
 assert.equal(helperNote(run,'stella','2026-09-17'),'','and against another day it does not');
});

// -------------------------------------------------------------------------------------------------
// 4. THE SAVE (CLAUDE.md rule 12).
// -------------------------------------------------------------------------------------------------
test('a save with focus picks round-trips, and a save written without them is unchanged',()=>{
 const picked=focus(own(CATALOGUE[0],CATALOGUE[1]),CATALOGUE[1],CATALOGUE[0]);
 assert.deepEqual(picked.helper.focus,[CATALOGUE[1],CATALOGUE[0]]);
 assert.ok(valid(picked));
 assert.deepEqual(decode(JSON.stringify(picked)),picked,'a save with picks decodes byte-identically');
 // What the LIVE build writes: a helper subtree with no `focus` key and no `did.notes`. It must decode
 // byte-identically, which is the claim rule 12 exists for.
 const live={...own(),helper:{tasks:{village:1,stella:1},ranAt:T,did:{day:'2026-09-16',ids:['village']}}};
 assert.ok(valid(live),'the live build’s helper record is still legal');
 assert.deepEqual(decode(JSON.stringify(live)),live,'and decodes byte-identically');
 assert.equal(helperState(decode(JSON.stringify(live))).focus,undefined,'no field is invented for it');
 assert.deepEqual(helperFocusList(live),[],'and it simply has no picks');
});

test('a malformed focus list is refused, and it costs the toggles rather than the village',()=>{
 const s=own(CATALOGUE[0]);
 const h=helperState(focus(s,CATALOGUE[0]));
 const bad=[
  {...h,focus:'hero_15'},
  {...h,focus:[CATALOGUE[0],CATALOGUE[0]]},
  {...h,focus:[42]},
  {...h,focus:['']},
  {...h,focus:['x'.repeat(65)]},
  {...h,focus:Array.from({length:HELPER_FOCUS_MAX+1},(_,i)=>'id_'+i)},
 ];
 for(const helper of bad)assert.equal(validHelper({...s,helper}),false,`accepted: ${JSON.stringify(helper.focus).slice(0,60)}`);
 assert.equal(validHelper({...s,helper:h}),true,'positive control: the real list is accepted');
 // A corrupt list must cost a preference, never the Stella ledger -- which is why `focus` lives in the
 // helper subtree and not in `stella`. Both are QUARANTINABLE, so the one that is dropped is the one
 // that is broken.
 assert.ok(QUARANTINABLE.includes('helper')&&QUARANTINABLE.includes('stella'));
 const broken={...stock(s,CROSSOVER_SHARD_ITEM,90),helper:{...h,focus:[42]}};
 const out=decode(JSON.stringify(broken));
 assert.deepEqual(lastQuarantine,['helper'],'only the helper subtree was dropped');
 assert.deepEqual(out.stella,broken.stella,'the Stella ledger came through untouched');
 assert.equal(out.fellows[CATALOGUE[0]].level,broken.fellows[CATALOGUE[0]].level,'and so did the village');
});

test('a malformed run-record note is refused, and an absent one stays legal',()=>{
 const s=own(CATALOGUE[0]),h=helperState(s);
 const did=n=>({...h,did:{day:'2026-09-16',ids:['stella'],notes:n}});
 const bad=[did({'not-a-chore':'3 ranks'}),did({stella:42}),did({stella:''}),did({stella:'x'.repeat(HELPER_NOTE_MAX+1)}),did([]),did(null),
  {...h,did:{day:'2026-09-16',ids:['stella'],notes:{stella:'ok'},extra:1}}];
 for(const helper of bad)assert.equal(validHelper({...s,helper}),false,`accepted: ${JSON.stringify(helper.did)}`);
 assert.equal(validHelper({...s,helper:did({stella:'3 ranks for Spider-Man'})}),true,'positive control');
 assert.equal(validHelper({...s,helper:{...h,did:{day:'2026-09-16',ids:['stella']}}}),true,'a record written before notes existed stays legal');
});

test('an id that is not an owned Fellow with a ladder cannot be picked',()=>{
 const s=own(CATALOGUE[0]);
 for(const target of ['nobody',CATALOGUE[5],'wife_1',null,42])
  assert.match(act(s,'helperFocus',s.lastAt,target).error||'',/owned Fellow with a Stella track/,`${target} was accepted`);
 // Positive control, and the toggle: picking twice removes the pick.
 const on=act(s,'helperFocus',s.lastAt,CATALOGUE[0]);
 assert.equal(on.error,undefined);
 assert.deepEqual(on.state.helper.focus,[CATALOGUE[0]]);
 const off=act(on.state,'helperFocus',on.state.lastAt,CATALOGUE[0]);
 assert.deepEqual(off.state.helper.focus,[]);
 assert.match(off.message,/no longer a Stella focus/);
 // A stored id that stops naming a Fellow with a ladder is skipped, not fatal: this is the case the
 // validator deliberately does not refuse (a released Fellow, a renamed id, the crossover flag).
 const stale={...s,helper:{...helperState(s),focus:['hero_999',CATALOGUE[0]]}};
 assert.ok(valid(stale),'the save still loads');
 assert.deepEqual(helperFocusList(stale),[CATALOGUE[0]],'and the stale id is simply not served');
 assert.ok(stellaOrder(stale).every(stellaTracked));
});

// -------------------------------------------------------------------------------------------------
// 5. REFUND, unchanged by any of this -- the owner's shards already spent on Spider-Man.
// -------------------------------------------------------------------------------------------------
test('Refund all returns a crossover Fellow’s shards to the CROSSOVER pool',()=>{
 const pick=CATALOGUE[0];
 const s=stock(own(pick),CROSSOVER_SHARD_ITEM,90);
 const spent=chore(s).state;
 assert.equal(ranks(spent,pick),3);
 assert.equal(stellaState(spent).stock[CROSSOVER_SHARD_ITEM],0,'all 90 shards were spent');
 const r=act(spent,'refundFellow',spent.lastAt,pick);
 assert.equal(r.error,undefined,r.error);
 assert.equal(stellaState(r.state).stock[CROSSOVER_SHARD_ITEM],90,'every shard came back to the crossover pool');
 assert.equal(stellaState(r.state).stock[SPIRIT_SHARD_ITEM]||0,0,'and none of them leaked into the village pool');
 assert.equal(ranks(r.state,pick),0,'the ranks went with them');
 assert.ok(valid(r.state));
 assert.deepEqual(decode(JSON.stringify(r.state)),r.state);
});

// -------------------------------------------------------------------------------------------------
// 6. THE RANK TABLE the fallback reads.
// -------------------------------------------------------------------------------------------------
test('the rank order IS lib/crossover-roster-data.json’s, for every crossover Fellow',()=>{
 const fellows=roster.characters.filter(c=>c.kind==='fellows');
 assert.equal(fellows.length,133);
 assert.deepEqual(fellows.filter(c=>crossoverRank(c.id)!==c.rank).map(c=>c.id),[],'no rank drifted');
 assert.equal(crossoverRank('hero_15'),null,'an original Fellow has no rank');
 assert.equal(crossoverRank('not-a-character'),null);
 // Ranks are per franchise, so they repeat: that is why the tie-break below them is stated.
 assert.ok(new Set(fellows.map(c=>c.rank)).size<fellows.length,'ranks are shared between the two rosters');
 // NEGATIVE CONTROL: a rank read off the wrong file would not match.
 assert.notEqual(crossoverRank(FIRST_SW),CATALOGUE.indexOf(FIRST_SW)+1,'rank is not catalogue position');
});
