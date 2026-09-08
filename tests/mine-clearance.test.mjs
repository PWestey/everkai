import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,settle} from '../lib/game.mjs';
import {mineState,mineToday,minePlan,validMine} from '../lib/mine-clearance.mjs';
import {createPersistence} from '../lib/persistence.mjs';
const DAY=86400000;
const go=(s,a,id=null,value=null)=>{const r=act(s,a,s.lastAt,id,value);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
const mine=(s,a,id='hero_54',count=1)=>go(s,a,id,{seq:mineState(s).seq,day:mineToday(s).day,count});
const ready=()=>{let s=go(fresh(1000),'recruit','hero_54');s=go(s,'stellaActivate','hero_54',{seq:0});s=go(s,'stellaSupply','hero_54',{seq:s.stella.seq});return go(s,'stellaUpgrade','hero_54',{seq:s.stella.seq,count:'max'});};
test('fresh earned route across four days clears exact encounters, exchanges14Ore and upgrades without freeOre',()=>{
 let s=ready();assert.equal(minePlan(s,'hero_54').kills.length,8);const gold=s.gold,xp=s.fellowXP,energies=structuredClone({energy:s.energy,adventure:s.adventure,tradingPost:s.tradingPost});
 for(let d=0;d<4;d++){s=settle(s,d*DAY+1000);s=mine(s,'mineDeploy');s=mine(s,'mineExchange','hero_54','max');}
 assert.equal(s.gold-gold,480000);assert.equal(s.fellowXP-xp,84800);assert.equal(s.mineClearance.history.length,4);assert.equal(s.mineClearance.coins,120);assert.equal(s.artifacts.ore,14);
 s=go(s,'claimAllGear');s=go(s,'equip','hero_54','Item_Weapon_Equipment_1_1');s=go(s,'upgradeArtifact','hero_54');assert.equal(s.fellows.hero_54.gearLevel,2);assert.equal(s.fellows.hero_54.gearOreSpent,10);assert.equal(s.artifacts.ore,4);assert.deepEqual(s.adventure,energies.adventure);assert.equal(s.tradingPost,energies.tradingPost);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('weak attack saves partial damage, consumes one chance and cannot be replayed or refilled',()=>{
 let s=fresh(1000),p=minePlan(s,'hero_15');assert.equal(p.kills.length,0);assert.ok(p.after>0);const gold=s.gold,xp=s.fellowXP;s=mine(s,'mineDeploy','hero_15');assert.equal(s.gold,gold);assert.equal(s.fellowXP,xp);assert.equal(mineToday(s).progress,p.after);assert.equal(minePlan(s,'hero_15').allowed,false);assert.ok(act(s,'mineDeploy',s.lastAt,'hero_15',{seq:1,day:0}).error);s=go(s,'recruit','hero_1');s=mine(s,'mineDeploy','hero_1');assert.ok(mineToday(s).progress>p.after);assert.equal(s.mineClearance.history[1].before,p.after);
});
test('stale controls across actions/midnight refuse and fully cleared days cannot pay again',()=>{
 let s=ready(),token={seq:0,day:0};s=mine(s,'mineDeploy');assert.ok(act(s,'mineDeploy',s.lastAt,'hero_54',token).error);assert.ok(act(s,'mineDeploy',s.lastAt,'hero_15',{seq:1,day:0}).error);s=settle(s,DAY);assert.equal(mineToday(s).cleared,0);assert.deepEqual(mineToday(s).used,[]);assert.ok(act(s,'mineDeploy',DAY,'hero_54',{seq:1,day:0}).error);s=mine(s,'mineDeploy');assert.equal(s.mineClearance.history.length,2);assert.equal(s.mineClearance.coins,2160);
});
test('shop exact price, shared daily5cap, Ore capacity and historical price retention',()=>{
 let s=ready();for(let d=0;d<2;d++){s=settle(s,d*DAY+1000);s=mine(s,'mineDeploy');}s=mine(s,'mineExchange','hero_54','max');assert.equal(s.artifacts.ore,5);assert.equal(s.mineClearance.coins,660);assert.equal(mineToday(s).bought,5);assert.ok(act(s,'mineExchange',s.lastAt,null,{seq:3,day:1}).error);
 s=settle(s,2*DAY+1000);assert.equal(mineToday(s).bought,0);s.artifacts.ore=1e9;assert.ok(act(s,'mineExchange',s.lastAt,null,{seq:3,day:2}).error);s.artifacts.ore=1e9-1;s=mine(s,'mineExchange','hero_54','max');assert.equal(s.artifacts.ore,1e9);assert.equal(s.mineClearance.exchanges.at(-1).quantity,1);
 s.mineClearance.exchanges[0].unitPrice=301;s.mineClearance.exchanges[0].paid=1505;s.mineClearance.coins-=5;assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)).mineClearance,s.mineClearance);
});
test('interrupted final reward retains Power damage, participation and wallets until explicit retry',()=>{
 let s=ready();s=mine(s,'mineDeploy','hero_15');let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);const before=structuredClone(p.current);fail=true;assert.throws(()=>p.commit(mine(p.current,'mineDeploy')));assert.deepEqual(p.current,before);assert.deepEqual(JSON.parse(raw),before);fail=false;p.load(1000);p.commit(mine(p.current,'mineDeploy'));p.load(1000);assert.equal(mineToday(p.current).cleared,8);assert.equal(p.current.mineClearance.coins,1080);assert.equal(p.current.mineClearance.history.length,2);
});
test('malformed ledgers and destination overflow refuse without spending; old saves stay optional',()=>{
 assert.equal(fresh(1000).mineClearance,undefined);let s=mine(ready(),'mineDeploy');for(const mutate of [m=>m.coins++,m=>m.history[0].after--,m=>m.history[0].kills[0].order=2,m=>m.history[0].day++,m=>m.history[0].id=0,m=>m.history[0].at++,m=>m.seq++]){const b=structuredClone(s);mutate(b.mineClearance);assert.equal(validMine(b),false);assert.throws(()=>decode(JSON.stringify(b)));}
 let t=ready();t.fellowXP=1e9;const r=act(t,'mineDeploy',t.lastAt,'hero_54',{seq:0,day:0});assert.ok(r.error);assert.equal(r.state.mineClearance,undefined);assert.equal(r.state.fellowXP,1e9);
});

test('Mine deployments preserve other battle energies and committed snapshots',()=>{
 let s=ready();s=go(s,'northStart',null,{seq:0});s=go(s,'tradeBegin','learner',{seq:0,team:['hero_54']});const old=structuredClone({north:s.northern,trade:s.tradingPost,adventure:s.adventure,energy:s.energy,school:s.school});s=mine(s,'mineDeploy');assert.deepEqual({north:s.northern,trade:s.tradingPost,adventure:s.adventure,energy:s.energy,school:s.school},old);
});
