import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,SAVE_KEY} from '../lib/game.mjs';
import {FAMILIARS} from '../lib/familiars.mjs';
import {towerBattle,towerKey,towerState} from '../lib/familiar-tower.mjs';
import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,1000,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
function setup(){let s=run(fresh(1000),'adoptFamiliars');for(const p of FAMILIARS.slice(0,5))s=run(s,'towerParty',p.id);return s;}
test('tower accepts legacy saves, rejects unknown/duplicate teams and bounds team size',()=>{
 const old=fresh(1000);assert.ok(valid(old));assert.deepEqual(decode(JSON.stringify(old)),old);assert.ok(act(old,'towerParty',1000,'bad').error);let s=setup();assert.ok(act(s,'towerParty',1000,FAMILIARS[5].id).error);
 const bad=structuredClone(s);bad.familiarTower.party[1]=bad.familiarTower.party[0];assert.ok(!valid(bad));assert.throws(()=>decode(JSON.stringify(bad)));
 for(const id of [...s.familiarTower.party])s=run(s,'towerParty',id);assert.ok(act(s,'towerFight',1000,towerKey(s)).error);
});
test('battle respects Speed, KO and 15-round cap; Rage strikes occur deterministically',()=>{
 const team=FAMILIARS.slice(0,5).map(p=>({id:p.id,level:1,stars:0})),r=towerBattle(1,team);
 assert.equal(r.log[0].attacker,team[1].id);assert.ok(r.rounds<=15);assert.ok(r.log.some(h=>h.skill));assert.deepEqual(towerBattle(1,team),r);
 const slow=towerBattle(12,[team[0]]);assert.ok(!slow.won);assert.ok(slow.rounds<=15);assert.ok(slow.playerHP>=0);
});
test('first clear and rewards commit together; stale keys and snapshot changes cannot replay rewards',()=>{
 const before=setup(),key=towerKey(before);let s=run(before,'towerFight',key);assert.equal(towerState(s).cleared,1);assert.equal(s.inventory.Item_Talent_Hero_1,before.inventory.Item_Talent_Hero_1+4);assert.equal(s.fellowXP,before.fellowXP+500);
 assert.ok(act(s,'towerFight',1000,key).error);const report=towerBattle(1,s.familiarTower.last.team);s=run(s,'trainFamiliar',FAMILIARS[0].id,10);assert.deepEqual(towerBattle(1,s.familiarTower.last.team),report);assert.deepEqual(decode(JSON.stringify(s)),s);
 const full=setup();full.inventory.Item_Talent_Hero_1=1e6;assert.ok(act(full,'towerFight',1000,towerKey(full)).error);assert.equal(towerState(full).cleared,0);
});
test('all twelve local floors are reachable through existing free training and cannot replay',()=>{
 let s=setup();for(const p of FAMILIARS.slice(0,5))for(let i=0;i<10;i++)s=run(s,'trainFamiliar',p.id,10);
 for(let floor=1;floor<=12;floor++){s=run(s,'towerFight',towerKey(s));assert.equal(towerState(s).cleared,floor);}
 assert.ok(act(s,'towerFight',1000,towerKey(s)).error);
});
test('failed victory write preserves unclaimed floor and reload grants exactly once on explicit retry',()=>{
 let raw=JSON.stringify(setup()),fail=false;const disk={getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('full');raw=v}},store=createPersistence(()=>disk);store.load(1000);const old=raw;
 const next=act(store.current,'towerFight',1000,towerKey(store.current)).state;fail=true;assert.throws(()=>store.commit(next));assert.equal(raw,old);assert.equal(towerState(store.current).cleared,0);
 fail=false;store.load(1000);store.commit(act(store.current,'towerFight',1000,towerKey(store.current)).state);const saved=raw;const reload=createPersistence(()=>disk);reload.load(1000);assert.equal(raw,saved);assert.equal(towerState(reload.current).cleared,1);assert.equal(reload.current.inventory.Item_Talent_Hero_1,next.inventory.Item_Talent_Hero_1);
});
test('policy2 activates documented healing and focused multi-target attacks; policy1 stays unchanged',()=>{
 const team=['Pet_2391','Pet_11141','Pet_41121','Pet_11321'].map(id=>({id,level:10,stars:0}));
 const old=towerBattle(9,team),current=towerBattle(9,team,2);
 assert.ok(!old.log.some(h=>h.kind));assert.ok(current.log.some(h=>h.kind==='heal'&&h.attacker==='Pet_11321'&&h.damage>0));
 assert.ok(current.log.some(h=>h.name==='Ghost Fire Chase'));assert.ok(current.log.some(h=>h.name==="Boss’s Composure"||h.attacker==='Pet_41121'&&h.kind==='damage'));
 for(const h of current.log.filter(h=>h.kind==='heal'))assert.ok(h.damage>=0);
 assert.deepEqual(towerBattle(9,team,1),old);assert.notDeepEqual(current,old);
});
test('old absent-policy reports survive adoption of new skills and reject unknown versions',()=>{
 let s=setup();s=run(s,'towerFight',towerKey(s));delete s.familiarTower.last.combatVersion;assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
 s.familiarTower.last.combatVersion=99;assert.ok(!valid(s));
});
test('policy3 target rules honor front/back, empty rows and unique deterministic random samples',async()=>{
 const {towerTargets,towerSkill}=await import('../lib/familiar-tower.mjs');const u={id:'hero',side:0},enemies=[0,1,2].map(slot=>({id:'enemy'+slot,side:1,slot,hp:100-slot}));
 const front=towerTargets(enemies,u,towerSkill('Pet_23121'),1,1);assert.deepEqual(front.map(t=>t.slot),[0,1]);
 assert.deepEqual(towerTargets(enemies,u,towerSkill('Pet_22121'),1,1).map(t=>t.slot),[2]);
 assert.equal(towerTargets(enemies.slice(0,2),u,towerSkill('Pet_22121'),1,1).length,1);
 const random=towerTargets(enemies,u,towerSkill('Pet_22131'),1,1);assert.equal(new Set(random.map(t=>t.id)).size,3);assert.deepEqual(towerTargets(enemies,u,towerSkill('Pet_22131'),1,1),random);
 assert.equal(towerSkill('Pet_23121',2),undefined);assert.ok(towerSkill('Pet_11321',2));
});
test('formation edits preserve last report snapshot and new row skills leave policy2 reports unchanged',()=>{
 let s=setup();s=run(s,'towerFight',towerKey(s));const last=structuredClone(s.familiarTower.last);s=run(s,'towerFront',s.familiarTower.party[4]);assert.deepEqual(s.familiarTower.last,last);
 const team=['Pet_2391','Pet_23121','Pet_32131','Pet_22131','Pet_11321'].map(id=>({id,level:30,stars:0}));
 const old=towerBattle(9,team,2),next=towerBattle(9,team,3);assert.ok(!old.log.some(h=>h.attacker==='Pet_23121'&&h.name));assert.ok(next.log.some(h=>h.attacker==='Pet_23121'&&h.name));assert.deepEqual(towerBattle(9,team,2),old);
});
