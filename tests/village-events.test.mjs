import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {EXTRA_ITEMS} from '../lib/adventure.mjs';
import {GIFTS} from '../lib/catalog.mjs';
import {VILLAGE_EVENTS,VILLAGE_DAILY,VILLAGE_CHOICES,VILLAGE_MANAGE,VILLAGE_MANAGE_DEFERRED,VILLAGE_POOL,
 drawVillageEvent,villageRoll,villageEventById,villageReward,villageRewardPlan,villageLine,
 villageState,villageManageStep,validVillageEvents} from '../lib/village-events.mjs';
const T=new Date('2026-09-17T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const withJournal=()=>({...fresh(T),habits:starterHabits(T)});
const dailies=s=>s.habits.items.filter(x=>x.freq==='daily');
const dayLater=(s,n=1)=>({...s,lastAt:s.lastAt+n*86400000,habits:{...s.habits,lastNow:s.habits.lastNow+n*86400000}});
// Walk one full day: finish a habit, draw, and settle whatever came up.
function walk(s){
 s=run(s,'habitComplete',dailies(s).find(x=>!x.done).id);
 s=run(s,'villageEvent');
 const e=villageEventById(villageState(s).pending);
 return {state:e.kind==='choice'?run(s,'villageChoose',e.id,e.correctOption):run(s,'villageResolve',e.id),event:e};
}

test('the five imported tables keep the row counts the source has',()=>{
 assert.equal(VILLAGE_DAILY.length,20,'CityDailyEvent');
 assert.equal(VILLAGE_CHOICES.length,6,'CitySpecialEvent01');
 assert.equal(VILLAGE_MANAGE.length,6,'CitySpecialEventManage CSEM_1..6');
 assert.equal(VILLAGE_MANAGE_DEFERRED.length,4,'the W1E1 delayTime chain is imported, not modelled');
 assert.equal(VILLAGE_EVENTS.assign.length,26,'CityAssignEvent minus the 6 lib/opening.mjs already pays');
 assert.deepEqual(VILLAGE_EVENTS.openingOwnedAssign.sort(),['A2','B2','B3','B4','B5','C1']);
 assert.equal(VILLAGE_POOL.length,26);
 assert.equal(Object.keys(VILLAGE_EVENTS.rewards).length,73,'every referenced reward id resolved');
 assert.equal(VILLAGE_EVENTS.provenance.translateSha256,
  'c884ee22dfd491ce0c700109f955465b34ef518f6e73d4132993e9d01f4d35bc');
 assert.equal(VILLAGE_EVENTS.provenance.translateRecords,239580);
 assert.deepEqual(VILLAGE_EVENTS.provenance.dialogIdsMissing,[]);
 assert.equal(VILLAGE_EVENTS.provenance.dialogIdsResolved,74);
 // The chain's earnings goals are the original's, in order.
 assert.deepEqual(VILLAGE_MANAGE.map(r=>r.object),[70000,150000,600000,1200000,2500000,5000000]);
 assert.deepEqual(VILLAGE_MANAGE[0].unLock,[{type:'PlayerLvUpNum',count:10}]);
});

test('every event row carries its text, its weight and a resolvable reward',()=>{
 for(const e of VILLAGE_POOL){
  assert.ok(e.weight>0,e.id);
  assert.ok(e.dialog.length&&typeof villageLine(e.dialog[0])==='string',`${e.id} dialog`);
  const ids=e.kind==='choice'?[e.reward1,e.reward2]:[e.reward];
  for(const id of ids)assert.ok(villageReward(id).length>0,`${e.id} -> ${id}`);
  if(e.kind==='choice'){
   assert.ok([1,2].includes(e.correctOption),e.id);
   for(const k of ['prompt','option1','option2','goodText','badText'])assert.ok(e[k]?.length,`${e.id}.${k}`);
   assert.notEqual(e.goodText,e.badText,`${e.id}: the two outcomes must read differently`);
   assert.notDeepEqual(villageReward(e.reward1),villageReward(e.reward2),
    `${e.id}: the good and bad payouts must actually differ`);
  }
 }
});

test('the draw is repeatable from its seed and follows the source weights',()=>{
 assert.equal(drawVillageEvent(1).id,drawVillageEvent(1).id);
 assert.deepEqual(drawVillageEvent(42),drawVillageEvent(42));
 const counts=new Map();
 for(let n=1;n<=26000;n++){const e=drawVillageEvent(n);counts.set(e.id,(counts.get(e.id)||0)+1);}
 assert.equal(counts.size,26,'every row is reachable');
 // All 26 rows carry weight 50, so a uniform pool is the source's own distribution.
 for(const [id,n] of counts)assert.ok(n>800&&n<1200,`${id} drawn ${n} times in 26,000 (expected ~1,000)`);
 const choice=[...counts].filter(([id])=>villageEventById(id).kind==='choice').reduce((a,[,n])=>a+n,0);
 assert.ok(choice>5200&&choice<6800,`choice incidents ${choice}/26,000 (expected ~6,000 = 3/13)`);
 // A different salt must not reproduce the cast sequence.
 assert.notEqual(villageRoll(5,7),villageRoll(5,1));
});

test('the daily walk needs a finished habit and lands once a day',()=>{
 let s=withJournal();
 assert.match(act(s,'villageEvent',s.lastAt).error,/Complete a daily habit/);
 s=run(s,'habitComplete',dailies(s)[0].id);
 s=run(s,'villageEvent');
 assert.ok(villageState(s).pending,'an event is waiting');
 assert.match(act(s,'villageEvent',s.lastAt).error,/Settle today/);
 const e=villageEventById(villageState(s).pending);
 s=e.kind==='choice'?run(s,'villageChoose',e.id,e.correctOption):run(s,'villageResolve',e.id);
 assert.equal(villageState(s).pending,null);
 assert.match(act(s,'villageEvent',s.lastAt).error,/already claimed/);
 s=dayLater(s);
 s=run(s,'habitComplete',dailies(s).find(x=>!x.done).id);
 s=run(s,'villageEvent');
 assert.equal(villageState(s).draws,2,'the seed counter advances, so tomorrow is a new draw');
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('the choice matters: the right option pays the good reward, the wrong one does not',()=>{
 const s=withJournal();
 for(const e of VILLAGE_CHOICES){
  const good=villageRewardPlan(s,e.reward1),bad=villageRewardPlan(s,e.reward2);
  assert.notDeepEqual(good.paid.concat(good.unmapped),bad.paid.concat(bad.unmapped),e.id);
 }
 // Drive one real incident both ways from the same save and compare the inventories.
 const e=VILLAGE_CHOICES.find(x=>villageRewardPlan(s,x.reward1).paid.length&&villageRewardPlan(s,x.reward2).paid.length);
 assert.ok(e,'at least one incident pays a mapped item on both branches');
 let base=run(s,'habitComplete',dailies(s)[0].id);
 base={...base,villageEvents:{version:1,day:null,draws:1,pending:e.id,seen:[],manage:{step:0,accepted:false}}};
 const right=run(base,'villageChoose',e.id,e.correctOption);
 const wrong=run(base,'villageChoose',e.id,e.correctOption===1?2:1);
 assert.notDeepEqual(right.inventory,wrong.inventory,'the good and bad payouts land differently');
 const gained=id=>Object.entries(id.inventory).filter(([k,v])=>v!==base.inventory[k]).map(([k,v])=>[k,v-base.inventory[k]]);
 assert.deepEqual(gained(right),villageRewardPlan(s,e.reward1).paid.map(c=>[c.id,c.count]));
 assert.deepEqual(gained(wrong),villageRewardPlan(s,e.reward2).paid.map(c=>[c.id,c.count]));
 assert.match(act(base,'villageChoose',base.lastAt,e.id,3).error,/option 1 or 2/);
 assert.match(act(base,'villageResolve',base.lastAt,e.id).error,/asking you to choose/);
});

test('rewards pay only in Everkai item ids; unmapped originals pay nothing',()=>{
 const known=new Set([...GIFTS.map(g=>g.id),...EXTRA_ITEMS.map(i=>i.id)]);
 const s=fresh(T),unmapped=new Set();
 for(const [id,content] of Object.entries(VILLAGE_EVENTS.rewards))
  for(const c of content){
   assert.equal(known.has(c.id),Object.hasOwn(s.inventory,c.id),`${id}:${c.id} membership must agree`);
   if(!known.has(c.id))unmapped.add(c.id);
  }
 // Recorded so a later import that maps one of these has to update this list deliberately.
 assert.deepEqual([...unmapped].sort(),[
  'Item_Breach_ItemPack_1','Item_CGImage_W06_02','Item_Ceremony_01','Item_Ceremony_02',
  'Item_ClothesChip_W1C1','Item_Date_Wife_Special_1','Item_EXPBox_Resources_1',
  'Item_GetFE_10','Item_Gift_Ceremony_3','Item_Hero_Talent_Country_5','Item_Owner_Hero_11',
  'Item_Owner_Hero_12','Item_Owner_Hero_13','Item_Owner_Hero_14','Item_Owner_Hero_15',
  'Item_Owner_Hero_16','Item_Owner_Hero_17','Item_Owner_Hero_18','Item_Owner_Hero_19',
  'Item_Owner_Hero_20','Item_Owner_Hero_21','Item_Owner_Hero_22','Item_Owner_Hero_23',
  'Item_Owner_Hero_24','Item_Owner_Hero_25','Item_Owner_Hero_5','Item_Owner_Hero_51',
  'Item_Owner_Hero_58','Item_Owner_Hero_59','Item_Owner_Hero_61','Item_Owner_Hero_62',
  'Item_Owner_Hero_65','Item_Owner_Wife_65','Item_Owner_Wife_66','Item_Owner_Wife_69',
  'Item_Piece_Hero_Universal','Item_Quenching_Wife_1','Item_Talent_Hero_Piece',
 ]);
 // Nothing is substituted: a reward whose every item is unmapped adds no inventory at all.
 const only=Object.entries(VILLAGE_EVENTS.rewards).find(([,c])=>c.every(x=>!known.has(x.id)));
 assert.ok(only,'positive control: such a reward exists to test');
 assert.equal(villageRewardPlan(s,only[0]).paid.length,0);
});

test('the earnings chain unlocks at the original rank and pays each step once',()=>{
 let s=withJournal();
 assert.match(act(s,'villageManageAccept',s.lastAt).error,/Reach rank 10/);
 s=run(s,'openingStart');
 s={...s,opening:{...s.opening,rank:10},villageEvents:{version:1,day:null,draws:0,pending:null,seen:[],manage:{step:0,accepted:false}}};
 assert.ok(valid(s),'a rank-10 opening save is a real save, not a fixture');
 const step=villageManageStep(s);
 assert.equal(step.id,'CSEM_1');
 assert.match(act(s,'villageManageFinish',s.lastAt).error,/Accept this goal first/);
 const r=act(s,'villageManageAccept',s.lastAt);assert.equal(r.error,undefined,r.error);s=r.state;
 assert.equal(villageState(s).manage.accepted,true);
 assert.match(act(s,'villageManageAccept',s.lastAt).error,/already accepted/);
 assert.match(act(s,'villageManageFinish',s.lastAt).error,/70,000 gold\/s/);
 assert.ok(validVillageEvents(s));
});

test('a week of walking meets distinct villagers and never double-pays a claim',()=>{
 let s=withJournal(),seen=[];
 for(let d=0;d<7;d++){const w=walk(s);s=w.state;seen.push(w.event.id);s=dayLater(s);}
 assert.equal(villageState(s).draws,7);
 assert.equal(new Set(seen).size,seen.length,'seven days drew seven different rows');
 assert.deepEqual(villageState(s).seen.slice().sort(),seen.slice().sort());
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('malformed village-event saves are refused and an absent one stays valid',()=>{
 const s=fresh(T);
 assert.ok(valid(s),'a save with no villageEvents is untouched');
 assert.equal(validVillageEvents(s),true);
 const base={version:1,day:null,draws:1,pending:null,seen:[],manage:{step:0,accepted:false}};
 assert.ok(valid({...s,villageEvents:base}),'positive control: the good shape passes');
 for(const bad of [null,[],true,{...base,version:2},{...base,pending:'nope'},{...base,seen:['nope']},
  {...base,seen:['D2','D2']},{...base,draws:-1},{...base,manage:{step:99,accepted:false}},
  {...base,manage:{step:0,accepted:'yes'}},{...base,manage:{step:6,accepted:true}},
  {...base,day:'2026-09-17-too-long'},{...base,draws:0,pending:'D2'}]){
  assert.equal(validVillageEvents({...s,villageEvents:bad}),false,JSON.stringify(bad));
  assert.equal(valid({...s,villageEvents:bad}),false,JSON.stringify(bad));
 }
});
