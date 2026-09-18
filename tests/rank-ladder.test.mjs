import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,startingSave,act,valid,decode} from '../lib/game.mjs';
import {FELLOWS,REMOVED} from '../lib/catalog.mjs';
import {RANK_LADDER,RANK_ENCOUNTERS,RANK_ENCOUNTER_ROWS,MAX_RANK,rankCost,rankEarnings,freshOpening} from '../lib/opening.mjs';
import {RANK_FELLOWS,FREE_ROSTER,recruitPrice} from '../lib/summon.mjs';
import {ROAM_FAME,roamingState} from '../lib/roaming.mjs';
import {starterHabits,HABIT_FAME_PER_POINT} from '../lib/habits.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const opened=()=>run(fresh(T),'openingStart');

// The owner's confirmed rank-up sequence (original client play plus the extracted Level/CityAssignEvent
// tables): rank, total Fame, earnings requirement per second, the Fellow the original sends.
// The LADDER is untouched by the 2026-09-17 roster trim -- every rank, Fame cost and earnings
// requirement below is still the original's. What the trim changed is who is waiting at each rank.
const CONFIRMED=[[2,5,30,'hero_1'],[3,40,200,'hero_2'],[4,90,720,'hero_4'],[5,180,1500,'hero_3'],[6,305,3400,'hero_5'],
 [7,465,6150,'hero_13'],[8,665,10500,'hero_19'],[9,915,17000,'hero_14'],[10,1215,35500,'hero_12'],[11,1615,51500,'hero_51'],
 [13,2665,110000,'hero_11'],[14,3515,175000,'hero_15'],[15,4565,230000,'hero_17'],[16,5865,350000,'hero_23'],
 [18,9065,605000,'hero_16'],[19,11165,1000000,'hero_20'],[21,16165,2000000,'hero_21'],[22,20165,3350000,'hero_18'],
 [24,31165,5650000,'hero_25'],[25,38165,8850000,'hero_22'],[27,57165,15000000,'hero_24'],[28,69165,20000000,'hero_61']];

test('the rank ladder and its 22 encounters match the confirmed original sequence exactly',()=>{
 assert.equal(MAX_RANK,28);assert.equal(RANK_LADDER.ranks.length,27);
 const total=r=>RANK_LADDER.ranks.slice(0,r-1).reduce((n,x)=>n+x.fameToNext,0);
 const got=RANK_ENCOUNTER_ROWS.map(e=>[e.rank,total(e.rank),rankEarnings(e.rank-1),e.substituted?.was||e.fellow]);
 assert.deepEqual(got,CONFIRMED,'the original table, including the id B4 originally carried');});

test('what a rank encounter can actually hand over after the 2026-09-17 roster trim',()=>{
 // 14 of the 22 named a Fellow the owner deleted. 13 slots are simply EMPTY: RANK_ENCOUNTERS drops
 // them, so the Rank panel does not offer a Fellow who no longer exists and openingRecruit cannot be
 // asked for one. The ladder still works -- promotion is paid in Fame and gated on earnings, never on
 // an encounter -- and rank 28 still closes it.
 assert.equal(RANK_ENCOUNTER_ROWS.length,22);
 assert.deepEqual(RANK_ENCOUNTERS.map(e=>e.rank),[2,3,4,5,10,11,14,21,28]);
 for(const e of RANK_ENCOUNTERS)assert.ok(FELLOWS.some(f=>f.id===e.fellow),e.id);
 // B4 is the ONE refilled slot. hero_2 (Maxim) was the only free Informed Fellow before rank 28, and
 // the opening quest chain is strictly sequential and requires staffing the Apothecary (Informed), so
 // an empty rank 3 dead-ends every new village. With it, every business type has a free Fellow by
 // rank 5 again -- which is the shape the original had.
 const b4=RANK_ENCOUNTER_ROWS.find(e=>e.id==='B4');
 assert.equal(b4.substituted.was,'hero_2');assert.equal(b4.fellow,'hero_71');
 assert.equal(RANK_ENCOUNTER_ROWS.filter(e=>e.substituted).length,1,'exactly one local substitution');
 const free=new Map();
 for(const e of RANK_ENCOUNTERS){const f=FELLOWS.find(f=>f.id===e.fellow);if(!free.has(f.type)||free.get(f.type)>e.rank)free.set(f.type,e.rank);}
 assert.deepEqual([...free.entries()].sort(),[['Brave',4],['Diligent',2],['Informed',3],['Inspiring',5],['Unfettered',14]],
  'every business type still has a Fellow arriving free, and four of the five by rank 5');});

test('promotion spends Fame, needs the earnings requirement, and runs to rank 28 and no further',()=>{
 let s=run(opened(),'openEnterprise','Building_101');
 // Rank 2 needs 30/s; an opening business star adds 100 prosperity, so earnings are supplied directly.
 s.opening.stars={Building_101:1};
 s.opening.fame=rankCost(1)-1;
 const short=act(s,'openingPromote',s.lastAt);assert.ok(short.error,'one Fame short is refused');assert.deepEqual(short.state,s);
 s.opening.fame=100_000;
 let r=act(s,'openingPromote',s.lastAt);assert.equal(r.error,undefined,r.error);assert.equal(r.state.opening.rank,2);assert.equal(r.state.opening.fame,100_000-rankCost(1));
 s.opening.rank=5;s.opening.fame=rankCost(5);
 r=act(s,'openingPromote',s.lastAt);assert.match(r.error,/earnings/,'3,400/s is required out of rank 5');
 s.opening.rank=MAX_RANK;s.opening.fame=1e9;
 assert.match(act(s,'openingPromote',s.lastAt).error,/complete/);
 assert.ok(valid(s));s.opening.rank=MAX_RANK+1;assert.equal(valid(s),false,'a rank above 28 is not a save');});

test('each rank encounter opens at its rank, brings its Fellow once, and keeps training on a duplicate',()=>{
 let s=opened();
 assert.match(act(s,'openingRecruit',s.lastAt,'B14').error,/not available/,'Kaity waits for rank 14');
 s.opening.rank=14;
 s=run(s,'openingRecruit','B4');assert.ok(s.fellows.hero_71,'Barbara arrives at rank 3');
 assert.match(act(s,'openingRecruit',s.lastAt,'B6').error,/not available/,'rank 6 lost its Fellow in the 2026-09-17 trim and is not offered');
 s.fellows.hero_15.level=9;s=run(s,'openingRecruit','B14');assert.equal(s.fellows.hero_15.level,9,'owned Kaity keeps her training');
 assert.match(act(s,'openingRecruit',s.lastAt,'B4').error,/not available/,'no second Barbara');
 assert.deepEqual(decode(JSON.stringify(s)),s);
 s.opening.city=['B28'];assert.equal(valid(s),false,'a save cannot hold an encounter above its rank');});

test('roaming pays its Fame into the rank pool as well as its own tally',()=>{
 let s=opened();const before=s.opening.fame;
 s=run(s,'roamGo',null,{seq:roamingState(s).seq,roll:.5});
 assert.equal(s.opening.fame-before,ROAM_FAME);assert.equal(roamingState(s).fame,ROAM_FAME);
 // A village that never tapped Start journey used to drop this Fame (plain.opening stayed undefined)
 // while the toast still said "Fame +N". It now opens the same pool openingStart would.
 const plain=run(fresh(T),'roamGo',null,{seq:0,roll:.5});assert.deepEqual(plain.opening,{...freshOpening(),fame:ROAM_FAME});});

test('habit Fame is kept for a real new village that has not started the journey',()=>{
 // startingSave() is what persistence.mjs creates for a first-time player; it has no opening subtree.
 let s=startingSave(T);assert.equal(s.opening,undefined,'positive control: a new village has no journey yet');
 const task=s.habits.items.find(x=>x.freq==='daily'&&x.diff==='med');
 s=run(s,'habitComplete',task.id);
 assert.deepEqual(s.opening,{...freshOpening(),fame:2*HABIT_FAME_PER_POINT},'a normal task pays 10 Fame into a newly opened pool');
 assert.deepEqual(decode(JSON.stringify(s)),s,'the resulting save loads');
 const undone=run(s,'habitUndo');assert.equal(undone.opening.fame,0,'undo still takes the Fame back');});

test('a completed habit pays Fame once per occurrence, and undo takes it back',()=>{
 let s={...opened(),habits:starterHabits(T)};
 const task=s.habits.items.find(x=>x.freq==='daily'&&x.diff==='med');
 const before=s.opening.fame;
 s=run(s,'habitComplete',task.id);
 assert.equal(s.opening.fame-before,10,'a normal task pays 10 Fame');
 const undone=run(s,'habitUndo');assert.equal(undone.opening.fame,before,'undo reverses the Fame with the Gold');
 s=run(s,'habitUncheck',task.id);s=run(s,'habitComplete',task.id);
 assert.equal(s.opening.fame-before,10,'re-completing the same occurrence pays nothing more');});

test('the counter never sells rank-up Fellows; the seven town-event freebies stay free',()=>{
 assert.equal(RANK_FELLOWS.size,22);
 for(const id of RANK_FELLOWS.keys())assert.equal(recruitPrice(id),null,id);
 assert.equal(recruitPrice('hero_71'),null,'B4\u2019s replacement is a rank Fellow now, so the counter stops selling her');
 // hero_2 was rank 3\u2019s Fellow and was deleted on 2026-09-17, so it drops out of RANK_FELLOWS and would
 // fall into this list; FREE_ROSTER is filtered to what still ships, which is what the counter iterates.
 const townEvent=[...FREE_ROSTER].filter(id=>!RANK_FELLOWS.has(id)&&!REMOVED.has(id));
 assert.deepEqual(townEvent,['hero_58','hero_59','hero_60','hero_63','hero_64'],'hero_62 and hero_65 went in the trim');
 // hero_63 and hero_64 have never had a verified base render, so they are free-but-unlisted, exactly as
 // they were before the trim. The three the counter can actually hand over are still free.
 assert.deepEqual(townEvent.filter(id=>FELLOWS.some(f=>f.id===id)),['hero_58','hero_59','hero_60']);
 for(const id of townEvent)assert.deepEqual(recruitPrice(id),{stoneFragments:0},id);});

test('a new village starts with Fifi, not Kaity; saves that already own Kaity still load',()=>{
 const s=startingSave(T);
 assert.ok(s.fellows.hero_1);assert.equal(s.fellows.hero_15,undefined);
 assert.equal(s.buildings.fish.fellow,'hero_1');assert.deepEqual(s.adventure.party,['hero_1']);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.ok(valid(fresh(T)),'the Kaity-owning baseline is still a valid save');
 assert.equal(valid({...s,fellows:{},buildings:{...s.buildings,fish:{...s.buildings.fish,fellow:null}}}),false,'a village with no Fellow is not');});
