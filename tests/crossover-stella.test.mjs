import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {grantFragments} from './progression-helpers.mjs';
import {fresh,act,valid,refusedBy,decode,settle,QUARANTINABLE,lastQuarantine} from '../lib/game.mjs';
import {newFellow,bondedPower} from '../lib/adventure.mjs';
import {STELLA_PROFILES,ALL_STELLA_PROFILES,STELLA_HISTORY_MAX,STELLA_IDLE_PER_DAY,CROSSOVER_STELLA,crossoverStella,
 stellaRule,stellaState,stellaEntry,stellaPlan,stellaBonus,stellaActivation,settleStella} from '../lib/stella.mjs';
import {CROSSOVER_SHARD_ITEM,ownsCrossoverStella} from '../lib/crossover-stella.mjs';
import stellaSource from '../lib/stella-data.json' with {type:'json'};
import {FELLOWS} from '../lib/catalog.mjs';
import {ADDITION_FELLOWS,ADDITION_FAMILY} from '../lib/everkai-additions.mjs';
import {HELPER_TASKS} from '../lib/helper.mjs';
import {starterHabits} from '../lib/habits.mjs';

// The shared crossover Stella shard track (docs/crossover-plan.md order of work 8,
// docs/crossover-collection-plan.md 3) and the type-multiplier fix that had to land with it
// (order of work 6, lib/stella.mjs stellaBonus).
//
// EVERYTHING HERE RUNS FLAG OFF, on purpose. `crossoverStella` asks additionKind, which resolves an
// addition whether or not the page carries ?crossover=1 -- that is what keeps a village that recruited
// one loading with the flag off. So a crossover Fellow can be seated in `s.fellows` in an ordinary
// Node test and every mechanism under test is reachable without a child process. The flag-on
// measurements live in tests/crossover-family.test.mjs.

const T=new Date('2026-09-16T09:00:00').getTime();
const DAY=86400000;
const XOVER=ADDITION_FELLOWS[0].id, XOVER2=ADDITION_FELLOWS[1].id;
const ANGIE=stellaSource.profiles.find(p=>p.id==='hero_52');
/** Seat Fellows on a fresh village. This track reads ANGIE's own ladder (hero_52), but the owner
 *  deleted her on 2026-09-17 so no village can own her any more: her ROW stays (lib/crossover-stella.mjs
 *  templates off it, and old saves need stellaRule to resolve her), and the comparisons below moved to
 *  hero_56 (Liz), whose ladder tops out at the same 122% on the Diligent side. */
const own=(...ids)=>{const s=fresh(T);return {...s,habits:starterHabits(T),fellows:{...s.fellows,...Object.fromEntries(ids.map(id=>[id,newFellow()]))}}};
const go=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state};
const maybe=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);return r.error?s:r.state};
/** Activate and buy the whole ladder for one owner, paying from the shared pool. */
const climb=(state,id)=>{let s=grantFragments(state,id,5);
 s=go(s,'stellaActivate',id,{seq:stellaState(s).seq});
 return go(s,'stellaUpgrade',id,{seq:stellaState(s).seq,count:'max'})};

// ---------------------------------------------------------------------------------------------
// The curve. Not authored -- read out of the shipped table at load, so it cannot drift from it.
// ---------------------------------------------------------------------------------------------

test('the crossover ladder IS Angie’s shipped cost and flat columns, with percent zeroed',()=>{
 assert.equal(CROSSOVER_STELLA.levels.length,40);
 assert.deepEqual(CROSSOVER_STELLA.levels.map(r=>r.cost),ANGIE.levels.map(r=>r.cost));
 assert.deepEqual(CROSSOVER_STELLA.levels.map(r=>r.flat),ANGIE.levels.map(r=>r.flat));
 assert.deepEqual(CROSSOVER_STELLA.levels.map(r=>r.level),ANGIE.levels.map(r=>r.level));
 assert.deepEqual([...new Set(CROSSOVER_STELLA.levels.map(r=>r.percent))],[0],'every row is percent 0');
 // POSITIVE CONTROL for that comparison: Angie's own column is NOT all-zero, so the assertion above
 // is testing something. Her ladder ends at +122%, which is the number this track deliberately drops.
 assert.deepEqual([ANGIE.levels[0].percent,ANGIE.levels.at(-1).percent],[5,122]);
 assert.equal(CROSSOVER_STELLA.levels.reduce((n,r)=>n+r.cost,0),4500,'the same 4,500 sink Angie has');
 assert.equal(CROSSOVER_STELLA.levels.at(-1).flat,35300000,'and the same own-Power ceiling');
 assert.equal(CROSSOVER_STELLA.itemId,CROSSOVER_SHARD_ITEM);
 assert.equal(CROSSOVER_STELLA.type,null,'no type, so it can never join an original type’s percent sum');
 // The four original profiles are untouched, and the array every original consumer reads is still four.
 assert.equal(STELLA_PROFILES.length,4);
 assert.deepEqual(STELLA_PROFILES.map(p=>p.id).sort(),['hero_190','hero_52','hero_54','hero_56']);
 assert.equal(ALL_STELLA_PROFILES.length,5);
});

test('the track reaches every crossover FELLOW and nothing else -- not Family, not an original',()=>{
 for(const f of ADDITION_FELLOWS)assert.equal(stellaRule(f.id)?.itemId,CROSSOVER_SHARD_ITEM,f.id);
 assert.equal(ADDITION_FELLOWS.length,133);
 // A crossover Family member has no Stella: a Family record is five integers and no wife of either
 // roster has a profile. NEGATIVE CONTROL for the `xover_` prefix being the wrong test.
 for(const f of ADDITION_FAMILY)assert.equal(stellaRule(f.id),undefined,f.id);
 assert.equal(ADDITION_FAMILY.length,30);
 assert.equal(crossoverStella('xover_msf_nobody'),false,'resolution comes from the data, not the prefix');
 // And the 159 originals keep exactly the four profiles they had.
 assert.equal(stellaRule('hero_52')?.itemId,'Item_Owner_HeroPiece_52');
 assert.equal(stellaRule('hero_1'),undefined);
 assert.equal(stellaActivation(XOVER)?.activationPolicy,'crossover-shard-activation-v1');
 assert.deepEqual([stellaActivation(XOVER).cost,stellaActivation(XOVER).flat,stellaActivation(XOVER).percent],[0,0,0],
  'the Elise precedent: free, grants nothing, opens the paid ladder');
 assert.equal(stellaActivation('hero_1'),null);
});

// ---------------------------------------------------------------------------------------------
// ONE POOL. This is the whole reason the shape was chosen: the mint pays per PROFILE, so 163
// profiles would be 163 parallel faucets against an unchanged 4,500 sink each.
// ---------------------------------------------------------------------------------------------

test('the faucet does not grow with the roster: 1 crossover Fellow and 133 mint the same shards',()=>{
 const one=settleStella(own(XOVER),T,T+DAY);
 const many=settleStella(own(...ADDITION_FELLOWS.map(f=>f.id)),T,T+DAY);
 assert.equal(one.stella.stock[CROSSOVER_SHARD_ITEM],many.stella.stock[CROSSOVER_SHARD_ITEM]);
 // And the rate is the shipped one, unchanged: 500/day x the habit multiplier.
 const mult=one.stella.stock[CROSSOVER_SHARD_ITEM]/STELLA_IDLE_PER_DAY;
 assert.ok(mult>=1&&mult<=2,`habit multiplier out of range: ${mult}`);
 // POSITIVE CONTROL that the mint is running at all, and that one pool is not four: a village owning
 // Angie AND a crossover Fellow accrues into two separate items at the same per-item rate.
 const both=settleStella(own('hero_52',XOVER),T,T+DAY);
 assert.equal(both.stella.stock['Item_Owner_HeroPiece_52'],both.stella.stock[CROSSOVER_SHARD_ITEM]);
 // A village with no crossover Fellow and no profile Fellow still writes NOTHING -- the byte-identity
 // guard that protects every flag-off save and every sim.
 assert.equal(settleStella(fresh(T),T,T+DAY).stella,undefined);
 assert.equal(ownsCrossoverStella(fresh(T)),false);
 // NEGATIVE CONTROL: crossover FAMILY alone does not open the faucet, because nothing could spend it.
 const s=fresh(T);
 assert.equal(settleStella({...s,family:{...s.family,[ADDITION_FAMILY[0].id]:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}}},T,T+DAY).stella,undefined);
});

test('the pool is genuinely shared: 4,500 spent on one Fellow is 4,500 the next cannot spend',()=>{
 let s=own(XOVER,XOVER2);
 s=grantFragments(s,XOVER,5);                       // 5,000 shards, one pool
 const stock=stellaState(s).stock[CROSSOVER_SHARD_ITEM];
 assert.equal(stock,5000);
 s=go(s,'stellaActivate',XOVER,{seq:stellaState(s).seq});
 s=go(s,'stellaUpgrade',XOVER,{seq:stellaState(s).seq,count:'max'});
 assert.equal(stellaEntry(s,XOVER).level,40);
 assert.equal(stellaState(s).stock[CROSSOVER_SHARD_ITEM],500,'4,500 came out of the shared pool');
 s=go(s,'stellaActivate',XOVER2,{seq:stellaState(s).seq});
 s=go(s,'stellaUpgrade',XOVER2,{seq:stellaState(s).seq,count:'max'});
 assert.ok(stellaEntry(s,XOVER2).level<40,'the second Fellow cannot finish on what is left');
 assert.equal(stellaPlan(s,XOVER2,'max').rows.length,0,'and there is nothing left to buy');
 assert.ok(valid(s),refusedBy(s));
 assert.deepEqual(decode(JSON.stringify(s)).stella,s.stella,'the whole two-owner ledger round-trips');
});

test('all 133 ladders fit inside the widened history bound and the unmoved stock cap',()=>{
 assert.equal(STELLA_HISTORY_MAX,144+41*133,'144 for the four originals, 41 rows x 133 crossover owners');
 assert.equal(STELLA_HISTORY_MAX,5597);
 // 733,500 shards for all 163 -- under the per-item 1e6 cap, so that bound does NOT move.
 assert.ok(4500*ADDITION_FELLOWS.length<1e6,'the shared sink must stay inside the shipped stock cap');
 let s=own(...ADDITION_FELLOWS.map(f=>f.id));
 s=grantFragments(s,XOVER,600);                    // 600,000 shards: 4,500 x 133 = 598,500
 for(const f of ADDITION_FELLOWS){
  s=go(s,'stellaActivate',f.id,{seq:stellaState(s).seq});
  s=go(s,'stellaUpgrade',f.id,{seq:stellaState(s).seq,count:'max'});
 }
 assert.equal(stellaState(s).history.length,41*133);
 assert.ok(stellaState(s).history.length<=STELLA_HISTORY_MAX);
 assert.equal(ADDITION_FELLOWS.every(f=>stellaEntry(s,f.id).level===40),true);
 assert.ok(valid(s),refusedBy(s));
 // NEGATIVE CONTROL on the bound: one row past it is refused.
 const over={...s,stella:{...s.stella,history:[...s.stella.history,...Array.from({length:STELLA_HISTORY_MAX-41*133+1},(_,i)=>({...s.stella.history[0],id:1e6+i}))]}};
 assert.equal(valid(over),false,'the history bound must still refuse an unbounded ledger');
});

// ---------------------------------------------------------------------------------------------
// THE TYPE FIX. Measured on both halves: an addition gets no typed percent, an original still gets
// exactly today's.
// ---------------------------------------------------------------------------------------------

test('an addition takes NO typed percent from the original Stellas; an original still takes all of it',()=>{
 // Liz (hero_56) is Diligent. Seat her, one Diligent crossover Fellow and one Diligent ORIGINAL, then
 // climb her own ladder to the top: +122% Diligent. This ran on Angie (hero_52, Informed) until the
 // 2026-09-17 roster trim deleted her; hero_56's ladder reaches the identical 122%, so the measurement
 // is the same one.
 const informed=ADDITION_FELLOWS.find(f=>f.type==='Diligent').id;
 const original=stellaSource.profiles.find(p=>p.id==='hero_56').type;
 assert.equal(original,'Diligent','this test is built on Liz being Diligent');
 let s=own('hero_56',informed,'hero_106');
 const before={x:bondedPower(s,informed),angie:bondedPower(s,'hero_56')};
 s=climb(s,'hero_56');
 assert.equal(stellaEntry(s,'hero_56').percent,122,'Liz’s own ladder reached its top');
 // The ORIGINAL half -- unchanged behaviour, and the positive control for the assertion below.
 assert.equal(stellaBonus(s,'hero_56').percent,122);
 // Her own flat and her own +122%, in the shipped order: floor((power + flat) x (1 + percent/100)).
 // The 1-unit slack is the un-floored base inside bondedPower -- `before.angie` is already floored.
 assert.ok(Math.abs(bondedPower(s,'hero_56')-Math.floor((before.angie+35300000)*2.22))<=1,
  `${bondedPower(s,'hero_56')} is not floor((${before.angie} + 35,300,000) x 2.22)`);
 // The ADDITION half -- zero percent, and its power has not moved at all.
 assert.equal(stellaBonus(s,informed).percent,0,'MEASURED BEFORE THE FIX: 122');
 assert.equal(bondedPower(s,informed),before.x,'another Fellow’s Stella must not touch it');
 // And every OTHER original of that type keeps the typed percent, which is the behaviour being preserved.
 assert.equal(stellaBonus(s,'hero_106').percent,122);
});

test('type stops being a power lever: five crossover Fellows on identical records max identically',()=>{
 const types=['Inspiring','Diligent','Brave','Informed','Unfettered'];
 const picks=types.map(t=>ADDITION_FELLOWS.find(f=>f.type===t).id);
 // hero_52 (Angie) was deleted 2026-09-17 and her Informed track went with her, so three of the four
 // original ladders are climbable. The point of the test is that the five crossover picks END EQUAL,
 // which is if anything a harder thing to hold when the typed percents are uneven.
 const owners=STELLA_PROFILES.filter(p=>FELLOWS.some(f=>f.id===p.id));
 assert.equal(owners.length,3);
 let s=own(...owners.map(p=>p.id),...picks);
 for(const p of owners)s=climb(s,p.id);
 // Before the fix these five differed by 2.84x on identical records. Now they are one number.
 const powers=picks.map(id=>bondedPower(s,id));
 assert.equal(new Set(powers).size,1,`still differs by type: ${JSON.stringify(powers)}`);
 assert.deepEqual(picks.map(id=>stellaBonus(s,id).percent),[0,0,0,0,0]);
 // POSITIVE CONTROL: the originals of those same types do still differ, by exactly the sums that used
 // to leak onto the crossovers -- Inspiring 184 (Rani 122 + Elise 62) and Diligent 122. Informed is 0
 // because its only owner, Angie, was deleted on 2026-09-17: her row is still in STELLA_PROFILES but
 // nobody can own it, so the track pays nothing to anyone.
 const byType={};for(const p of STELLA_PROFILES)byType[p.type]=stellaBonus(s,p.id).percent;
 assert.deepEqual(byType,{Informed:0,Inspiring:184,Diligent:122});
 assert.ok(valid(s),refusedBy(s));
});

test('the shard ladder pays its own flat, and the flat is added after every multiplier',()=>{
 let s=own(XOVER);
 const base=bondedPower(s,XOVER);
 s=climb(s,XOVER);
 const e=stellaEntry(s,XOVER);
 assert.deepEqual([e.level,e.flat,e.percent],[40,35300000,0]);
 assert.equal(stellaBonus(s,XOVER).flat,35300000);
 assert.equal(bondedPower(s,XOVER),base+35300000,'own flat, then a x1 percent: exactly additive');
 assert.ok(valid(s),refusedBy(s));
});

// ---------------------------------------------------------------------------------------------
// Tamper guards and the save contract.
// ---------------------------------------------------------------------------------------------

test('a crossover Stella row is REPRICED against its own ladder, unlike the four legacy ones',()=>{
 let s=climb(own(XOVER),XOVER);
 assert.ok(valid(s));
 const rows=s.stella.history;
 const at=i=>({...s,stella:{...s.stella,history:rows.map((r,j)=>j===i?{...r}:r)}});
 // A percent the ladder does not carry is refused -- this is the row stellaBonus now reads directly.
 const bad=at(rows.length-1);bad.stella.history[rows.length-1].percent=122;
 assert.equal(valid(bad),false,'a tampered crossover percent must not pay out');
 assert.equal(refusedBy(bad),'validStella');
 const badFlat=at(rows.length-1);badFlat.stella.history[rows.length-1].flat=99000000;
 assert.equal(valid(badFlat),false,'nor a tampered flat');
 // The free activation must stay free.
 const badActivation=at(0);badActivation.stella.history[0].flat=1;
 assert.equal(valid(badActivation),false);
 // POSITIVE CONTROL that repricing is CROSSOVER-ONLY: the four originals are deliberately not
 // repriced, because a v86 save keeps the benefit it recorded (tests/stella.test.mjs).
 let o=climb(own('hero_56'),'hero_56');
 const legacy={...o,stella:{...o.stella,history:o.stella.history.map((r,j)=>j===o.stella.history.length-1?{...r,percent:999}:r)}};
 assert.equal(valid(legacy),true,'an original row is still accepted as recorded');
});

test('a crossover shard ledger cannot name an original Fellow, and the subtree stays quarantinable',()=>{
 let s=climb(own(XOVER,'hero_1'),XOVER);
 // An original cannot hold a row on this ladder: stellaRule('hero_1') is undefined, so the row fails.
 const stolen={...s,stella:{...s.stella,history:s.stella.history.map(r=>({...r,owner:'hero_1'}))}};
 assert.equal(valid(stolen),false);
 assert.equal(refusedBy(stolen),'validStella');
 assert.ok(QUARANTINABLE.includes('stella'),'a malformed ledger degrades the track, not the village');
 // The whole save still round-trips, ledger included.
 assert.deepEqual(decode(JSON.stringify(s)).stella,s.stella);
});

test('the Little Helper’s Stella chore reaches the shared track, and keeps its contract',()=>{
 // The chore loops STELLA_PROFILES and reads each profile's id as its owner's id, so before this the
 // shared track was silently skipped: a dead chore claiming to run Stella.
 let s=own(XOVER,XOVER2);
 s=grantFragments(s,XOVER,10);
 const {state,steps}=HELPER_TASKS.find(x=>x.id==='stella').run(s,act,s.lastAt);
 assert.ok(steps>0,'the chore did nothing at all');
 assert.equal(stellaEntry(state,XOVER)?.level,40,'the first crossover Fellow was activated and maxed');
 assert.ok(valid(state),refusedBy(state));
 // It still spends nothing but shards, and only on owned crossover Fellows.
 assert.equal(state.gold,s.gold);
 assert.equal(state.crystals,s.crystals);
 assert.equal(stellaState(state).stock[CROSSOVER_SHARD_ITEM],10000-4500-stellaEntry(state,XOVER2)?.level*0-
  CROSSOVER_STELLA.levels.slice(0,stellaEntry(state,XOVER2)?.level||0).reduce((n,r)=>n+r.cost,0));
 // NEGATIVE CONTROL: with no crossover Fellow owned it is a no-op that writes no subtree.
 const plain=HELPER_TASKS.find(x=>x.id==='stella').run(own('hero_1'),act,T);
 assert.equal(plain.state.stella,undefined,'no ledger for a village with nothing on this track');
});

test('settle writes no crossover ledger for a village that owns none, at any elapsed time',()=>{
 // The byte-identity guard the flag-off contract rests on, driven through settle() rather than
 // settleStella() so the whole pipeline is covered.
 const s=fresh(T);
 for(const days of [0.5,3,30]){
  const out=settle(s,T+days*DAY);
  assert.equal(out.stella,undefined,`${days} days wrote a stella subtree onto a village with no profile`);
 }
 // POSITIVE CONTROL: the same call on a village that DOES own a crossover Fellow writes one.
 assert.ok(settle(own(XOVER),T+DAY).stella.stock[CROSSOVER_SHARD_ITEM]>0);
});

test('pacing, both halves from the shipped grant: 4.5 days a Fellow, 733 for all 163',()=>{
 // Mint: STELLA_IDLE_PER_DAY x the habit multiplier 1.0-2.0. Sink: the ladder's own cost column.
 const sink=CROSSOVER_STELLA.levels.reduce((n,r)=>n+r.cost,0);
 assert.equal(sink,4500);
 assert.equal(sink/(STELLA_IDLE_PER_DAY*2),4.5,'one Fellow at the top habit multiplier');
 assert.equal(sink/STELLA_IDLE_PER_DAY,9,'and at no habits at all');
 const all=(ADDITION_FELLOWS.length+ADDITION_FAMILY.length)*sink;
 assert.equal(all,733500);
 assert.equal(all/(STELLA_IDLE_PER_DAY*2),733.5,'all 163 from one pool');
 // What the Fellows that can actually spend it cost -- 133, because Family have no ladder.
 assert.equal(ADDITION_FELLOWS.length*sink,598500);
});

// ---------------------------------------------------------------------------------------------
// CLAUDE.md RULE 12. The type fix LOWERS a crossover Fellow's power without touching a single source
// row -- the exact shape of the mine-table lockout. The save that stores a value derived from Fellow
// power is the Mine Clearance receipt, and `clampOk` compares `after` against `before + r.power`. The
// fixture below was written by the PREVIOUS build (31c3b32), flag ON, with all four original Stellas
// maxed so the Inspiring type sum (+184%) was live, and its receipt records the power that Fellow had
// THEN. Decoding it here proves the receipt is checked against its STORED power, not a recomputation.
// ---------------------------------------------------------------------------------------------

test('RULE 12: a previous-build save whose mine receipt was dug at the OLD typed power still decodes',()=>{
 const raw=readFileSync(new URL('./crossover-stella-save-31c3b32-mine.json',import.meta.url),'utf8');
 const s=JSON.parse(raw);
 const id=Object.keys(s.fellows).find(k=>crossoverStella(k));
 assert.ok(id,'the fixture must own a crossover Fellow, or this proves nothing');
 const receipt=s.mineClearance.history[0];
 assert.equal(receipt.owner,id);
 assert.equal(receipt.power,11563344,'what the previous build measured with the +184% type sum live');
 // The same Fellow on the same records is weaker now, by exactly the multiplier that was removed.
 assert.equal(bondedPower(s,id),4071600);
 assert.equal(+(receipt.power/bondedPower(s,id)).toFixed(2),2.84,'the Inspiring type sum, now gone');
 // ...and the save still loads, with nothing quarantined. It is no longer a BYTE-IDENTICAL round trip,
 // and that is the 2026-09-17 roster trim rather than anything to do with Stella or the mine: this
 // fixture owns nearly the whole original roster, so 48 of its Fellows are now released on load and
 // refunded (lib/release-removed.mjs). What must not move is everything else -- so the round trip is
 // asserted to be STABLE instead, and the receipt this test is about is compared row for row.
 const back=decode(raw);
 assert.ok(valid(back),refusedBy(back));
 assert.deepEqual(lastQuarantine,[],'nothing may be dropped');
 assert.deepEqual(decode(JSON.stringify(back)),back,'the released save is stable');
 assert.deepEqual(back.mineClearance,s.mineClearance,'the mine ledger is untouched by the release');
 assert.deepEqual(back.fellows[id],s.fellows[id],'and so is the crossover Fellow the receipt names');
 assert.equal(Object.keys(s.fellows).length-Object.keys(back.fellows).length,48,'exactly the 48 the trim deleted left');
 // NEGATIVE CONTROL for the guard that makes this safe: a receipt whose `after` exceeds what its own
 // stored power allows IS still refused, so "it decoded" does not mean validMine stopped checking.
 const bad={...s,mineClearance:{...s.mineClearance,history:[{...receipt,after:receipt.after+1,
  kills:receipt.kills}]}};
 assert.equal(valid(bad),false);
 assert.equal(refusedBy(bad),'validMine');
});
