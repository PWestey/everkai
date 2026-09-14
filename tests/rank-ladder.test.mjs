import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,startingSave,act,valid,decode} from '../lib/game.mjs';
import {FELLOWS} from '../lib/catalog.mjs';
import {RANK_LADDER,RANK_ENCOUNTERS,MAX_RANK,rankCost,rankEarnings} from '../lib/opening.mjs';
import {RANK_FELLOWS,FREE_ROSTER,recruitPrice} from '../lib/summon.mjs';
import {ROAM_FAME,roamingState} from '../lib/roaming.mjs';
import {starterHabits,HABIT_FAME_PER_POINT} from '../lib/habits.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const opened=()=>run(fresh(T),'openingStart');

// The owner's confirmed rank-up sequence (original client play plus the extracted Level/CityAssignEvent
// tables): rank, total Fame, earnings requirement per second, Fellow.
const CONFIRMED=[[2,5,30,'Fifi'],[3,40,200,'Maxim'],[4,90,720,'Knivi'],[5,180,1500,'Reir'],[6,305,3400,'Pump'],
 [7,465,6150,'Lincale'],[8,665,10500,'Prim'],[9,915,17000,'Woolf'],[10,1215,35500,'Belle'],[11,1615,51500,'Quenchy'],
 [13,2665,110000,'Björnson'],[14,3515,175000,'Kaity'],[15,4565,230000,'Meaden'],[16,5865,350000,'Rogile'],
 [18,9065,605000,'Geast'],[19,11165,1000000,'Guarg'],[21,16165,2000000,'Mirac'],[22,20165,3350000,'Dr.Dotor'],
 [24,31165,5650000,'Boatter'],[25,38165,8850000,'Hawker'],[27,57165,15000000,'Arake'],[28,69165,20000000,'Cimitir']];

test('the rank ladder and its 22 Fellows match the confirmed original sequence exactly',()=>{
 assert.equal(MAX_RANK,28);assert.equal(RANK_LADDER.ranks.length,27);
 const total=r=>RANK_LADDER.ranks.slice(0,r-1).reduce((n,x)=>n+x.fameToNext,0);
 const got=RANK_ENCOUNTERS.map(e=>[e.rank,total(e.rank),rankEarnings(e.rank-1),FELLOWS.find(f=>f.id===e.fellow)?.name]);
 assert.deepEqual(got,CONFIRMED);});

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
 s=run(s,'openingRecruit','B6');assert.ok(s.fellows.hero_5,'Pump arrives at rank 6');
 s.fellows.hero_15.level=9;s=run(s,'openingRecruit','B14');assert.equal(s.fellows.hero_15.level,9,'owned Kaity keeps her training');
 assert.match(act(s,'openingRecruit',s.lastAt,'B6').error,/not available/,'no second Pump');
 assert.deepEqual(decode(JSON.stringify(s)),s);
 s.opening.city=['B28'];assert.equal(valid(s),false,'a save cannot hold an encounter above its rank');});

test('roaming pays its Fame into the rank pool as well as its own tally',()=>{
 let s=opened();const before=s.opening.fame;
 s=run(s,'roamGo',null,{seq:roamingState(s).seq,roll:.5});
 assert.equal(s.opening.fame-before,ROAM_FAME);assert.equal(roamingState(s).fame,ROAM_FAME);
 // Negative control: without a journey there is no rank pool to pay, and roaming still works.
 const plain=run(fresh(T),'roamGo',null,{seq:0,roll:.5});assert.equal(plain.opening,undefined);});

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
 const townEvent=[...FREE_ROSTER].filter(id=>!RANK_FELLOWS.has(id));
 assert.deepEqual(townEvent,['hero_58','hero_59','hero_60','hero_62','hero_63','hero_64','hero_65']);
 for(const id of townEvent)assert.deepEqual(recruitPrice(id),{stoneFragments:0},id);});

test('a new village starts with Fifi, not Kaity; saves that already own Kaity still load',()=>{
 const s=startingSave(T);
 assert.ok(s.fellows.hero_1);assert.equal(s.fellows.hero_15,undefined);
 assert.equal(s.buildings.fish.fellow,'hero_1');assert.deepEqual(s.adventure.party,['hero_1']);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.ok(valid(fresh(T)),'the Kaity-owning baseline is still a valid save');
 assert.equal(valid({...s,fellows:{},buildings:{...s.buildings,fish:{...s.buildings.fish,fellow:null}}}),false,'a village with no Fellow is not');});
