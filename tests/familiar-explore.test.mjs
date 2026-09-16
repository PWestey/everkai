import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {FAMILIARS,familiarById} from '../lib/familiars.mjs';
import {towerKey,towerState} from '../lib/familiar-tower.mjs';
import {familiarSupplies} from '../lib/familiar-supplies.mjs';
import data from '../lib/familiar-explore-data.json' with {type:'json'};
import {EXPLORE_AREAS,CATCH_ITEMS,STARTERS,HELD_ITEMS,exploreState,exploreAction,staminaAt,encounterPool,catchChance,validFamiliarExplore,INITIAL_SEED} from '../lib/familiar-explore.mjs';

const H=3600e3,T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,t=null,v=null,now=s.lastAt)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),`invalid save after ${a}`);return r.state};
const starter=()=>at(fresh(T),'familiarStarter','Pet_11111');
/** Drive the module directly (no settle), with stamina topped up, for long statistical runs. */
function direct(s,a,t=null,v=null){const e=exploreState(s);const r=exploreAction({...s,familiarExplore:{...e,stamina:20,staminaAt:null}},a,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);return r.state;}

// ---------------------------------------------------------------------------------------------
// Coverage guards: every imported row is present and indexes something real.
// ---------------------------------------------------------------------------------------------
test('every PetArea, PetCatchItem, PetExploreItem and PetExploreLottery row is imported and resolves',()=>{
 assert.equal(EXPLORE_AREAS.length,3,'PetArea has 3 rows');
 assert.deepEqual(EXPLORE_AREAS.map(a=>a.unlock),[0,100,200]);
 assert.deepEqual(EXPLORE_AREAS.map(a=>a.name),['Verdant Forest','Snowy Plains','Endless Desert']);
 assert.deepEqual(EXPLORE_AREAS.map(a=>a.pets.length),[25,25,14]);
 for(const a of EXPLORE_AREAS){
  assert.deepEqual(a.events,{PetCatch:4000,PetExploreItem:5000,PetExploreLottery:1000});
  for(const id of a.pets){assert.ok(familiarById(id),`${id} is a familiar`);assert.ok(data.pets[id]?.alertMax===100,`${id} has catch data`);}
  for(const id of a.ownedOnly)assert.ok(a.pets.includes(id));
  // Every rarity can be met in every area before any owned-only familiar is contracted.
  for(const g of [1,2,3,4])assert.ok(encounterPool({familiars:{}},a,g).length>0,`area ${a.id} grade ${g}`);
  for(const [step,r] of Object.entries(a.scripted)){assert.ok(Number(step)>0);if(r.type==='PetCatch'){assert.ok(a.pets.includes(r.id),r.id);assert.ok([1,2,3].includes(r.mustCatch));}else assert.ok(data.exploreItems.some(x=>x.id===r.id&&x.area===a.id));}
 }
 assert.equal(Object.keys(EXPLORE_AREAS[0].scripted).length,14,'area 1 carries 14 scripted steps');
 assert.deepEqual(CATCH_ITEMS.map(c=>[c.item,c.alert,c.prob]),[
  ['Item_PetCatch1',[30,40],{1:7000,2:1000,3:720,4:310}],
  ['Item_PetCatch2',[30,40],{1:10000,2:8000,3:4000,4:1000}],
  ['Item_PetCatch3',[30,40],{1:10000,2:10000,3:10000,4:10000}]]);
 assert.deepEqual(data.gradeWeights,{1:3350,2:4700,3:1500,4:450});
 assert.equal(data.exploreItems.length,15);for(const a of EXPLORE_AREAS)assert.equal(data.exploreItems.filter(r=>r.area===a.id).length,5);
 assert.equal(data.lottery.length,5);
 assert.deepEqual(data.energy,{item:'Item_PetExploreEnergy',initial:20,max:20,seconds:5400});
 assert.deepEqual(data.soothe,{item:'Item_PetPacify1',alert:30,useMax:3});
 assert.deepEqual(STARTERS,['Pet_11111','Pet_12111','Pet_13111']);
 // Everything an event can grant is either a supply item or a held item: nothing is silently dropped.
 const grants=[...data.exploreItems.flatMap(r=>r.pool?r.pool.map(p=>p[1]):[r.buff]),...data.lottery.map(r=>r.item)];
 for(const id of grants)assert.ok(['Item_PetLevelUP','Item_PetClassUP',...HELD_ITEMS].includes(id),id);
 assert.deepEqual(data.forms.adultStar,15);assert.deepEqual(data.forms.awakenedStar,50);assert.equal(data.forms.threeForms.length,13);
 for(const id of Object.keys(data.pets))assert.ok(data.pets[id].pieces>0,`${id} fragments`);
});

// ---------------------------------------------------------------------------------------------
// ECON-11: acquisition is no longer free.
// ---------------------------------------------------------------------------------------------
test('the starter choice is one of three, once, and only for a village with no familiars',()=>{
 const s=fresh(T);
 assert.match(act(s,'familiarStarter',T,'Pet_1191').error,/one of the three/);
 const a=starter();assert.deepEqual(a.familiars,{Pet_11111:{level:1,stars:0}});assert.equal(exploreState(a).starter,'Pet_11111');
 assert.match(act(a,'familiarStarter',T,'Pet_12111').error,/already joined/);
 // Grandfathered: a village that already owns familiars keeps them and gets no free starter on top.
 const old=at(fresh(T),'adoptFamiliar','Pet_4151');
 assert.match(act(old,'familiarStarter',T,'Pet_11111').error,/already joined/);
 assert.deepEqual(decode(JSON.stringify(old)).familiars,old.familiars,'owned familiars survive a reload untouched');
});

// ---------------------------------------------------------------------------------------------
// Determinism: the seed lives in the save, so nothing can be re-rolled by reloading.
// ---------------------------------------------------------------------------------------------
test('outcomes are deterministic and a reload cannot re-roll or refund anything',()=>{
 let s=starter();const trail=[];
 for(let i=0;i<12;i++){s=at(s,'exploreStep');trail.push(exploreState(s).last.text);while(exploreState(s).encounter)s=at(s,'exploreCatch',null,1);}
 // Same starting save, same inputs, same world.
 let again=starter();for(let i=0;i<12;i++){again=at(again,'exploreStep');assert.equal(exploreState(again).last.text,trail[i]);while(exploreState(again).encounter)again=at(again,'exploreCatch',null,1);}
 assert.deepEqual(again,s);
 // Reload between every action: identical to never reloading.
 let reloaded=starter();for(let i=0;i<12;i++){reloaded=decode(JSON.stringify(at(reloaded,'exploreStep')));while(exploreState(reloaded).encounter)reloaded=decode(JSON.stringify(at(reloaded,'exploreCatch',null,1)));}
 assert.deepEqual(reloaded,s);
 // A failed contract, then "reload the save from before it" and try again: the same failure.
 let t=starter();while(!(exploreState(t).encounter))t=at(t,'exploreStep');
 const before=JSON.stringify(t),first=act(t,'exploreCatch',t.lastAt,null,1),second=act(decode(before),'exploreCatch',t.lastAt,null,1);
 assert.deepEqual(second.state,first.state,'the retry from the older save lands exactly where the first try did');
 // Stamina spent is not refunded by a reload.
 const spent=at(starter(),'exploreStep');assert.equal(exploreState(decode(JSON.stringify(spent))).stamina,19);
 assert.equal(exploreState(fresh(T)).seed,INITIAL_SEED);
});

test('event and rarity frequencies follow the imported weights over a long run',()=>{
 let s=starter();s={...s,familiarExplore:{...exploreState(s),steps:{1:1000,2:0,3:0}}};// past the scripted steps
 const kinds={},grades={1:0,2:0,3:0,4:0};
 for(let i=0;i<6000;i++){s=direct(s,'exploreStep');const e=exploreState(s);const k=e.last.kind;kinds[k]=(kinds[k]||0)+1;if(e.encounter){grades[data.pets[e.encounter.pet].grade]++;s=direct(s,'exploreLeave');}
  // Keep the store from filling, which would turn a grant into a refusal.
  s={...s,familiarSupplies:{levelUp:0,classUp:0,since:null},familiarExplore:{...exploreState(s),items:Object.fromEntries(HELD_ITEMS.map(i=>[i,0]))}};}
 const monster=kinds.encounter/6000,item=(kinds.item+(kinds.buff||0))/6000,flower=kinds.lottery/6000;
 assert.ok(Math.abs(monster-.4)<.03&&Math.abs(item-.5)<.03&&Math.abs(flower-.1)<.02,JSON.stringify(kinds));
 const n=kinds.encounter;assert.ok(Math.abs(grades[1]/n-.335)<.04&&Math.abs(grades[2]/n-.47)<.04&&Math.abs(grades[3]/n-.15)<.03&&Math.abs(grades[4]/n-.045)<.02,JSON.stringify(grades));
});

// ---------------------------------------------------------------------------------------------
// The contract loop.
// ---------------------------------------------------------------------------------------------
test('Alertness rises 30-40 per failure, the monster flees at 100 with its Familiar Tears, and Mochi soothes 30 up to 3 times',()=>{
 // An SSR against a Basic Contract (3.1%) fails nearly always, which makes the flee path observable.
 let s=starter();const e=exploreState(s);
 s={...s,familiarExplore:{...e,encounter:{pet:'Pet_12141',sp:false,alert:0,attempts:0,soothed:0,mustCatch:0},items:{...e.items,Item_PetPacify1:5}}};
 assert.ok(valid(s));
 assert.match(act(s,'exploreSoothe',s.lastAt).error,/0 alertness/);
 assert.match(act(s,'exploreStep',s.lastAt).error,/monster is in front/);
 let fled=false,rises=[],soothes=0;
 for(let i=0;i<20&&!fled;i++){
  const c=exploreState(s).encounter;
  if(c.alert>=60&&c.soothed<3){s=at(s,'exploreSoothe');soothes++;assert.equal(exploreState(s).encounter.alert,Math.max(0,c.alert-30));continue;}
  s=at(s,'exploreCatch',null,1);const after=exploreState(s);
  if(!after.encounter){fled=after.last.kind==='fled';assert.ok(fled||after.last.kind==='caught');break;}
  rises.push(after.encounter.alert-c.alert);
 }
 assert.ok(rises.length&&rises.every(r=>r>=30&&r<=40),JSON.stringify(rises));
 assert.equal(soothes,3,'three soothes, then no more');
 assert.ok(fled,'with this seed the SSR flees rather than being caught');assert.equal(exploreState(s).items.Item_PetExploreRunCoin,10,'Reward_PetRun_4: an SSR leaves 10 Familiar Tears');
 assert.equal(exploreState(s).items.Item_PetPacify1,2);
});

test('contracts: Advanced and Super consume an item, Super always succeeds, a duplicate pays fragments, a scripted meeting succeeds by its attempt',()=>{
 let s=starter();const e=exploreState(s);
 const meet=(x,pet,extra={})=>({...x,familiarExplore:{...exploreState(x),encounter:{pet,sp:false,alert:0,attempts:0,soothed:0,mustCatch:0,...extra}}});
 assert.match(act(meet(s,'Pet_13141'),'exploreCatch',s.lastAt,null,3).error,/No Super Contract left/);
 s={...s,familiarExplore:{...e,items:{...e.items,Item_PetCatch3:2}}};
 s=at(meet(s,'Pet_13141'),'exploreCatch',null,3);
 assert.deepEqual(s.familiars.Pet_13141,{level:1,stars:0});assert.equal(exploreState(s).items.Item_PetCatch3,1);
 s=at(meet(s,'Pet_13141'),'exploreCatch',null,3);
 assert.equal(exploreState(s).pieces.Pet_13141,100,'Reward_Item_Owner_Pet_13141: a duplicate SSR is 100 fragments');
 assert.equal(catchChance('Pet_13141',1),310);assert.equal(catchChance('Pet_11111',2),10000);
 // MustCatch 3 (area 1 step 8, Pet_11321): whatever the rolls, attempt 3 lands.
 let m=meet(s,'Pet_11321',{mustCatch:3});
 for(let i=0;i<3&&exploreState(m).encounter;i++)m=at(m,'exploreCatch',null,1);
 assert.ok(m.familiars.Pet_11321,'caught by the third attempt');
 // Scripted steps really fire in order: area 1 step 2 is Pet_21121.
 let t=at(at(starter(),'exploreStep'),'exploreStep');assert.equal(exploreState(t).encounter.pet,'Pet_21121');assert.equal(exploreState(t).encounter.mustCatch,2);
});

test('stamina: 1 per explore, one back every 5,400 s, never above 20, and Special Potion explores free',()=>{
 let s=starter();
 for(let i=0;i<20;i++){s=at(s,'exploreStep');while(exploreState(s).encounter)s=at(s,'exploreLeave');}
 const e=exploreState(s);assert.equal(e.stamina,0);
 assert.match(act(s,'exploreStep',s.lastAt).error,/Out of stamina/);
 assert.equal(staminaAt(e,s.lastAt+5399e3).stamina,0);assert.equal(staminaAt(e,s.lastAt+5400e3).stamina,1);
 assert.equal(staminaAt(e,s.lastAt+100*H).stamina,20,'a long absence holds 20');
 s=at(s,'exploreStep',null,null,s.lastAt+5400e3);assert.equal(exploreState(s).stamina,0);
 const potion={...s,familiarExplore:{...exploreState(s),encounter:null,items:{...exploreState(s).items,Item_PetExploreBuff_04:1}}};
 const free=at(potion,'exploreStep');assert.equal(exploreState(free).items.Item_PetExploreBuff_04,0);assert.equal(exploreState(free).stamina,0);
});

test('areas open with the Familiar Tower floor and cannot be switched mid-encounter',()=>{
 let s=starter();
 assert.match(act(s,'exploreArea',T,2).error,/floor 100/);
 s=at(fresh(T),'adoptFamiliars');for(const id of ['Pet_1191','Pet_2391','Pet_3191','Pet_4151','Pet_4251'])s=at(s,'towerParty',id);
 s={...s,familiarSupplies:{levelUp:1e9,classUp:1e7,since:null}};for(const id of s.familiarTower.party)for(let i=0;i<10;i++)s=at(s,'trainFamiliar',id,10);
 while(towerState(s).cleared<100)s=at(s,'towerFight',towerKey(s));
 s=at(s,'exploreArea',2);assert.equal(exploreState(s).area,2);
 const e=exploreState(s);const busy={...s,familiarExplore:{...e,encounter:{pet:e.area===2?'Pet_31121':'Pet_11111',sp:false,alert:0,attempts:0,soothed:0,mustCatch:0}}};
 assert.ok(valid(busy));assert.match(act(busy,'exploreArea',T,1).error,/Finish with the monster/);
});

test('NEGATIVE CONTROL: the validator refuses hand-edited exploring state',()=>{
 const s=at(starter(),'exploreStep'),e=exploreState(s);
 const bad=(x,why)=>assert.equal(validFamiliarExplore({...s,familiarExplore:x}),false,why);
 bad({...e,stamina:21},'stamina above the cap');
 bad({...e,stamina:5,staminaAt:null},'a partial tank with no clock');
 bad({...e,area:2},'an area whose tower floor is not cleared');
 bad({...e,items:{...e.items,Item_PetCatch3:1.5}},'a fractional contract');
 bad({...e,items:{...e.items,Item_Gold:1}},'an unknown item');
 bad({...e,pieces:{Pet_4151:10}},'fragments of a familiar not owned');
 bad({...e,sp:['Pet_4151']},'a shining familiar not owned');
 bad({...e,starter:'Pet_1191'},'a starter that is not a starter');
 bad({...e,encounter:{pet:'Pet_4151',sp:false,alert:0,attempts:0,soothed:0,mustCatch:0}},'a monster not in this area');
 bad({...e,encounter:{pet:'Pet_11111',sp:false,alert:100,attempts:0,soothed:0,mustCatch:0}},'a monster that should have fled');
 bad({...e,encounter:{pet:'Pet_11111',sp:false,alert:0,attempts:0,soothed:4,mustCatch:0}},'four soothes');
 bad({...e,policyVersion:2},'an unknown policy');
 assert.equal(valid({...s,familiarExplore:{...e,stamina:21}}),false,'valid() carries the refusal');
 assert.ok(validFamiliarExplore(s));assert.ok(validFamiliarExplore(fresh(T)),'a save with no exploring key is fine');
});
