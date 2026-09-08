import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,settle,decode,valid,totalRate} from '../lib/game.mjs';
import {northern,northernSupplies,activeRoom,NORTH} from '../lib/northern.mjs';
import {createPersistence} from '../lib/persistence.mjs';
const result=(s,a,t=null,extra={})=>act(s,a,s.lastAt,t,{seq:northern(s).seq,runId:northern(s).run?.id,...extra});
const go=(s,a,t=null)=>{const x=result(s,a,t);assert.equal(x.error,undefined,x.error);assert.ok(valid(x.state),a);return x.state;};
const start=(s=fresh(1000))=>go(s,'northStart');
function floor(s){for(const i of [0,1,2,3,5,6,7])s=go(s,'northTile',i);while(s.northern.run.status==='exploring'&&activeRoom(s.northern.run).monsterHP)s=go(s,'northAttack');if(s.northern.run.status!=='lost')s=go(s,'northTile',8);return s;}
function train(s=fresh(1000)){s=start(s);s=go(s,'northTile',0);s=go(s,'northTile',5);s=go(s,'northFinish');s=go(s,'northTrain','atk');return go(s,'northTrain','atk');}
test('local three-floor expedition pays supplies, freezes stats and yields useful permanent reward',()=>{
 let s=start(train()),date=s.energy,power=s.northern.run.atk;s.fellows.hero_15.aptitude=1000;assert.equal(s.northern.run.atk,power);
 for(let f=1;f<=3;f++){s=floor(s);assert.equal(s.northern.run.status,f===3?'cleared':'gate');if(f<3)s=go(s,'northNext');}
 const snapshot=structuredClone(s.northern.run);s=decode(JSON.stringify(settle(s,86400000)));assert.deepEqual(s.northern.run,snapshot);
 s=go(s,'northFinish');assert.equal(s.northern.coins,65);assert.equal(s.northern.consumed,4);assert.equal(s.northern.history.length,2);assert.equal(s.northern.atkXP,12);assert.equal(s.energy,date);
 s=go(s,'northExchange');assert.equal(s.northern.coins,35);const gold=s.gold;const used=act(s,'useConsumable',s.lastAt,NORTH.exchangeItem,{count:1});assert.equal(used.error,undefined);assert.equal(used.state.gold,gold+Math.floor(totalRate(s)*60));assert.equal(used.state.inventory[NORTH.exchangeItem],0);assert.ok(valid(used.state));
});
test('fresh loss keeps learned XP and loses unbanked coins; retreat preserves its coins',()=>{
 let s=start();for(let f=1;f<=3;f++){s=floor(s);if(s.northern.run.status==='lost')break;s=go(s,'northNext');}assert.equal(s.northern.run.status,'lost');assert.equal(s.northern.run.hp,0);assert.ok(result(s,'northAttack').error);s=go(s,'northFinish');assert.equal(s.northern.coins,0);assert.equal(s.northern.atkXP,12);assert.equal(s.northern.history[0].outcome,'lost');
 const old=structuredClone(s.northern.history);s=start(s);s=go(s,'northTile',1);s=go(s,'northFinish');assert.equal(s.northern.coins,5);assert.deepEqual(s.northern.history[0],old[0]);s=go(s,'northTrain','hp');assert.equal(s.northern.hpLevel,1);s=start(s);assert.equal(s.northern.run.maxHP,35);
});
test('hourly supplies cannot bank time at full and have no UTC reset or other energy drain',()=>{
 let s=start(fresh(86400000-1000));assert.equal(s.northern.supplies,11);const due=s.northern.recoverAt;assert.equal(northernSupplies(settle(s,86400000)).supplies,11);
 s=settle(s,due-1);assert.equal(northernSupplies(s).supplies,11);s=settle(s,due);assert.deepEqual(northernSupplies(s),{supplies:12,recoverAt:null});
 s=go(s,'northFinish');s=start(s);assert.equal(s.northern.recoverAt,due+3600000);s=go(s,'northSupply');assert.equal(s.northern.recoverAt,null);
 s=go(s,'northFinish');s=settle(s,due+5*3600000);const before={date:s.energy,school:structuredClone(s.school),trade:s.tradingPost,tonics:s.tonics};s=start(s);assert.equal(s.northern.recoverAt,s.lastAt+3600000);assert.equal(s.energy,before.date);assert.deepEqual(s.school,before.school);assert.equal(s.tradingPost,before.trade);assert.equal(s.tonics,before.tonics);
});
test('invalid tiles, completed tiles, stale runs, early exit and repeated rewards refuse',()=>{
 let s=start();for(const i of [-1,4,9,1.2,'1',8])assert.ok(result(s,'northTile',i).error);assert.ok(result(s,'northNext').error);assert.ok(result(s,'northTrain','atk').error);
 const seq=s.northern.seq;s=go(s,'northTile',0);assert.ok(result(s,'northTile',0).error);assert.ok(result(s,'northTile',1,{seq}).error);assert.ok(result(s,'northTile',1,{runId:999}).error);
 s=go(s,'northFinish');assert.ok(result(s,'northFinish').error);assert.ok(result(s,'northExchange').error);assert.equal(s.northern.atkXP,2);
});
test('failed start and finish writes leave supply entitlement and pending reward intact',()=>{
 let raw=JSON.stringify(fresh(1000)),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);fail=true;assert.throws(()=>p.commit(start(p.current)));assert.equal(p.current.northern,undefined);
 fail=false;p.load(1000);p.commit(start(p.current));p.commit(go(p.current,'northTile',0));p.commit(go(p.current,'northTile',1));const snapshot=structuredClone(p.current.northern.run);
 fail=true;assert.throws(()=>p.commit(go(p.current,'northFinish')));assert.deepEqual(p.current.northern.run,snapshot);assert.equal(p.current.northern.coins,0);
 fail=false;p.load(1000);p.commit(go(p.current,'northFinish'));assert.equal(p.current.northern.coins,5);assert.equal(p.current.northern.history.length,1);
 fail=true;assert.throws(()=>p.commit(go(p.current,'northTrain','atk')));assert.equal(p.current.northern.atkLevel,0);fail=false;p.load(1000);p.commit(go(p.current,'northTrain','atk'));assert.equal(p.current.northern.atkLevel,1);assert.equal(p.current.northern.atkXP,0);
});
test('malformed restore and reward overflow preserve original snapshots',()=>{
 let s=start();for(const mutate of [n=>n.run.rooms[0].tiles=[null],n=>n.run.hp=-1,n=>n.run.coins=999,n=>n.consumed=2,n=>n.run.rooms[0].hits=1,n=>n.supplies=12]){const bad=structuredClone(s);mutate(bad.northern);assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
 s=start(train());for(let f=1;f<=3;f++){s=floor(s);if(f<3)s=go(s,'northNext');}s=go(s,'northFinish');s.inventory[NORTH.exchangeItem]=1e6;assert.ok(valid(s));assert.ok(result(s,'northExchange').error);assert.equal(s.northern.coins,65);assert.deepEqual(decode(JSON.stringify(s)).northern,s.northern);
});
test('exhausted Supplies refuse entry without consuming another ledger; free preparation restores access',()=>{
 let s=fresh(1000);for(let i=0;i<12;i++){s=start(s);s=go(s,'northFinish');}const before=structuredClone(s);assert.equal(northernSupplies(s).supplies,0);assert.ok(result(s,'northStart').error);assert.deepEqual(s,before);assert.ok(result(s,'northTrain','atk').error);s=go(s,'northSupply');s=start(s);assert.equal(s.northern.supplies,11);assert.equal(s.northern.history.length,12);
});
