import {MAX_FELLOW_XP} from '../lib/limits.mjs';
import test from 'node:test';import {withItems,grantFragments} from './progression-helpers.mjs';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,settle} from '../lib/game.mjs';
import {mineState,mineToday,mineDay,minePlan,validMine,MINE_ROWS,MINE_DEPTH,mineRowName,MINE_UNLOCK_RANK} from '../lib/mine-clearance.mjs';
import {createPersistence} from '../lib/persistence.mjs';
import {stockAll} from './gear-fixtures.mjs';
const DAY=86400000;
// Mine Clearance opens at player rank 12 (lib/mine-clearance.mjs MINE_UNLOCK_RANK); fixtures start there.
const unlocked=s=>({...s,opening:{...act(s,'openingStart',s.lastAt).state.opening,rank:12}});
const go=(s,a,id=null,value=null)=>{const r=act(s,a,s.lastAt,id,value);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
const mine=(s,a,id='hero_54',count=1)=>go(s,a,id,{seq:mineState(s).seq,day:mineToday(s).day,count});
const ready=()=>{let s=go(unlocked(fresh(1000)),'recruit','hero_54');s=go(s,'stellaActivate','hero_54',{seq:0});s=grantFragments(s,'hero_54');return go(s,'stellaUpgrade','hero_54',{seq:s.stella.seq,count:'max'});};
test('fresh earned route across four days clears exact encounters, exchanges20Ore and upgrades without freeOre',()=>{
 let s=ready();assert.equal(minePlan(s,'hero_54').kills.length,15);const gold=s.gold,xp=s.fellowXP,energies=structuredClone({energy:s.energy,adventure:s.adventure,tradingPost:s.tradingPost});
 for(let d=0;d<4;d++){s=settle(s,d*DAY+1000);s=mine(s,'mineDeploy');s=mine(s,'mineExchange','hero_54','max');}
 assert.equal(s.gold-gold,900000);assert.equal(s.fellowXP-xp,172400);assert.equal(s.mineClearance.history.length,4);assert.equal(s.mineClearance.coins,4200);assert.equal(s.artifacts.ore,20);
 s=stockAll(s);s=go(s,'equip','hero_54','Item_Weapon_Equipment_1_1');s=go(s,'upgradeArtifact','hero_54');assert.equal(s.fellows.hero_54.gearLevel,2);assert.equal(s.fellows.hero_54.gearOreSpent,10);assert.equal(s.artifacts.ore,10);assert.deepEqual(s.adventure,energies.adventure);assert.equal(s.tradingPost,energies.tradingPost);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('weak attack saves partial damage, consumes one chance and cannot be replayed or refilled',()=>{
 let s=unlocked(fresh(1000)),p=minePlan(s,'hero_15');assert.equal(p.kills.length,0);assert.ok(p.after>0);const gold=s.gold,xp=s.fellowXP;s=mine(s,'mineDeploy','hero_15');assert.equal(s.gold,gold);assert.equal(s.fellowXP,xp);assert.equal(mineToday(s).progress,p.after);assert.equal(minePlan(s,'hero_15').allowed,false);assert.ok(act(s,'mineDeploy',s.lastAt,'hero_15',{seq:1,day:0}).error);s=go(s,'recruit','hero_1');s=mine(s,'mineDeploy','hero_1');assert.ok(mineToday(s).progress>p.after);assert.equal(s.mineClearance.history[1].before,p.after);
});
test('stale controls across actions/midnight refuse and a Fellow gets one deployment a day',()=>{
 let s=ready(),token={seq:0,day:0};s=mine(s,'mineDeploy');assert.ok(act(s,'mineDeploy',s.lastAt,'hero_54',token).error,'a stale seq refuses');assert.ok(act(s,'mineDeploy',s.lastAt,'hero_54',{seq:1,day:0}).error,'a fresh token does not buy the same Fellow a second run');s=settle(s,DAY);assert.equal(mineToday(s).cleared,0);assert.deepEqual(mineToday(s).used,[]);assert.ok(act(s,'mineDeploy',DAY,'hero_54',{seq:1,day:0}).error,'yesterday’s day token refuses');s=mine(s,'mineDeploy');assert.equal(s.mineClearance.history.length,2);assert.equal(s.mineClearance.coins,5100);
});
// At 8 rows the fixture Fellow cleared the whole mine in one deployment, so the exhaustion refusal
// was reached incidentally by every test above. At 80 rows the floor is 41,678,127,000 Power, far
// past any reachable roster, so the rule now needs its own fixture or it would go unasserted.
test('a mine already cleared to the floor refuses further deployments that day',()=>{
 const last=MINE_ROWS.at(-1),TOTAL=last.cumulativePower,s=ready();
 // A real receipt for a mine cleared to the floor: every row killed, with the exact source totals.
 const receipt={policyVersion:1,id:1,day:mineDay(s),at:s.lastAt,owner:'hero_54',power:TOTAL,before:0,after:TOTAL,
  kills:MINE_ROWS.map(r=>({order:r.order,power:r.power,gold:r.gold,fellowEXP:r.fellowEXP,mineCoin:r.mineCoin})),
  gold:last.cumulativeGold,fellowEXP:last.cumulativeFellowEXP,coins:last.cumulativeMineCoin};
 const exhausted={...s,mineClearance:{...mineState(s),seq:1,coins:last.cumulativeMineCoin,history:[receipt]}};
 assert.ok(validMine(exhausted),'the exhausted fixture must itself be a legal save');
 assert.equal(mineToday(exhausted).progress,TOTAL);
 assert.equal(mineToday(exhausted).cleared,80);
 assert.equal(minePlan(exhausted,'hero_15').allowed,false,'the floor stops a fresh Fellow');
 assert.ok(act(exhausted,'mineDeploy',exhausted.lastAt,'hero_15',{seq:mineState(exhausted).seq,day:mineDay(exhausted)}).error);
 // Negative control: one Power short of the floor and the same Fellow is allowed again.
 const almost=structuredClone(exhausted);almost.mineClearance.history[0].power=TOTAL-1;almost.mineClearance.history[0].after=TOTAL-1;
 assert.equal(minePlan(almost,'hero_15').allowed,true,'one Power short must still allow a deployment');
});
test('shop exact price, shared daily5cap, Ore capacity and historical price retention',()=>{
 let s=ready();for(let d=0;d<2;d++){s=settle(s,d*DAY+1000);s=mine(s,'mineDeploy');}s=mine(s,'mineExchange','hero_54','max');assert.equal(s.artifacts.ore,5);assert.equal(s.mineClearance.coins,3600);assert.equal(mineToday(s).bought,5);assert.ok(act(s,'mineExchange',s.lastAt,null,{seq:3,day:1}).error);
 s=settle(s,2*DAY+1000);assert.equal(mineToday(s).bought,0);s.artifacts.ore=1e9;assert.ok(act(s,'mineExchange',s.lastAt,null,{seq:3,day:2}).error);s.artifacts.ore=1e9-1;s=mine(s,'mineExchange','hero_54','max');assert.equal(s.artifacts.ore,1e9);assert.equal(s.mineClearance.exchanges.at(-1).quantity,1);
 s.mineClearance.exchanges[0].unitPrice=301;s.mineClearance.exchanges[0].paid=1505;s.mineClearance.coins-=5;assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)).mineClearance,s.mineClearance);
});
test('interrupted final reward retains Power damage, participation and wallets until explicit retry',()=>{
 let s=ready();s=mine(s,'mineDeploy','hero_15');let raw=JSON.stringify(s),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);const before=structuredClone(p.current);fail=true;assert.throws(()=>p.commit(mine(p.current,'mineDeploy')));assert.deepEqual(p.current,before);assert.deepEqual(JSON.parse(raw),before);fail=false;p.load(1000);p.commit(mine(p.current,'mineDeploy'));p.load(1000);assert.equal(mineToday(p.current).cleared,15);assert.equal(p.current.mineClearance.coins,2550);assert.equal(p.current.mineClearance.history.length,2);
});
test('malformed ledgers and destination overflow refuse without spending; old saves stay optional',()=>{
 assert.equal(fresh(1000).mineClearance,undefined);let s=mine(ready(),'mineDeploy');for(const mutate of [m=>m.coins++,m=>m.history[0].after--,m=>m.history[0].kills[0].order=2,m=>m.history[0].day++,m=>m.history[0].id=0,m=>m.history[0].at++,m=>m.seq++]){const b=structuredClone(s);mutate(b.mineClearance);assert.equal(validMine(b),false);assert.throws(()=>decode(JSON.stringify(b)));}
 let t=ready();t.fellowXP=MAX_FELLOW_XP;const r=act(t,'mineDeploy',t.lastAt,'hero_54',{seq:0,day:0});assert.ok(r.error);assert.equal(r.state.mineClearance,undefined);assert.equal(r.state.fellowXP,MAX_FELLOW_XP);
});

test('Mine deployments preserve other battle energies and committed snapshots',()=>{
 let s=ready();s=go(s,'northStart',null,{seq:0});s=go(s,'tradeBegin','learner',{seq:0,team:['hero_54']});const old=structuredClone({north:s.northern,trade:s.tradingPost,adventure:s.adventure,energy:s.energy,school:s.school});s=mine(s,'mineDeploy');assert.deepEqual({north:s.northern,trade:s.tradingPost,adventure:s.adventure,energy:s.energy,school:s.school},old);
});

test('the mine stays locked until player rank 12, and the refusal spends nothing',()=>{
 const s=fresh(1000),token={seq:0,day:0};
 const below={...unlocked(s),opening:{...unlocked(s).opening,rank:MINE_UNLOCK_RANK-1}};
 for(const locked of [s,below]){const r=act(locked,'mineDeploy',locked.lastAt,'hero_15',token);assert.match(r.error,/rank 12/);assert.equal(r.state.mineClearance,undefined);}
 assert.equal(act(unlocked(s),'mineDeploy',s.lastAt,'hero_15',token).error,undefined,'rank 12 opens it');});

// Coverage guard for the depth table. The eight rows Everkai shipped until 2026-09-15 came from a
// community page that stopped at eight; the original's highwayBoss table has 80 and the eight match
// it exactly. These are the load-bearing values: every one indexes damage, gold, EXP and Mine Coins,
// and before this guard existed nothing asserted the table's extent at all.
// Negative controls run below: each mutation must be caught, so a silently truncated or re-ordered
// import cannot ship green.
const ANCHORS=[
 {order:1,avatar:'Boss_Mine_01a',power:225000,mineCoin:100,gold:15000,fellowEXP:2500,name:'Rock Baby'},
 {order:8,avatar:'Boss_Mine_04b',power:787000,mineCoin:170,gold:15000,fellowEXP:2800,name:'Great Coal Bat'},
 {order:9,avatar:'Boss_Mine_05a',power:862000,mineCoin:180,gold:15000,fellowEXP:3000,name:null},
 {order:80,avatar:'Boss_Mine_10b',power:6302000000,mineCoin:890,gold:15000,fellowEXP:7000,name:null},
];
const auditRows=rows=>{
 if(rows.length!==80)return 'depth table must carry all 80 highwayBoss rows';
 for(const a of ANCHORS){const r=rows[a.order-1];
  if(!r||r.order!==a.order||r.avatar!==a.avatar||r.power!==a.power||r.mineCoin!==a.mineCoin||r.gold!==a.gold||r.fellowEXP!==a.fellowEXP||(r.name??null)!==a.name)return `row ${a.order} drifted from highwayBoss`;}
 let cp=0,cc=0,cg=0,ce=0;
 for(const [i,r] of rows.entries()){
  if(r.order!==i+1)return 'orders must be 1..80 in order';
  if(i>=8&&r.name!=null)return 'rows past 8 have no source name and must not invent one';
  cp+=r.power;cc+=r.mineCoin;cg+=r.gold;ce+=r.fellowEXP;
  if(r.cumulativePower!==cp||r.cumulativeMineCoin!==cc||r.cumulativeGold!==cg||r.cumulativeFellowEXP!==ce)return `row ${r.order} cumulative columns disagree with the per-row values`;
  if(r.cumulativePower<=(rows[i-1]?.cumulativePower??0))return 'cumulative Power must strictly increase, or clearing cannot be indexed';}
 if(cp!==41678127000||cg!==1200000||ce!==387200||cc!==39600)return 'depth totals drifted from highwayBoss';
 return null;
};
test('the 80-row mine depth table matches highwayBoss, and the guard catches truncation and drift',()=>{
 assert.equal(auditRows(MINE_ROWS),null);
 assert.equal(MINE_DEPTH,80);
 assert.equal(mineRowName(MINE_ROWS[0]),'Rock Baby');
 assert.equal(mineRowName(MINE_ROWS[8]),'Mine guardian 9','unnamed rows are labelled by depth, never invented');
 // Negative controls: each of these is a defect this guard exists to stop.
 const clone=()=>structuredClone(MINE_ROWS);
 const breaks=[
  [rows=>rows.slice(0,8),/all 80/,'truncated back to the community eight'],
  [rows=>{rows.pop();return rows},/all 80/,'a dropped tail row'],
  [rows=>{rows[79].power=1;return rows},/row 80 drifted/,'a changed deep Power'],
  [rows=>{rows[0].mineCoin=999;return rows},/row 1 drifted/,'a changed Mine Coin'],
  [rows=>{rows[8].name='Invented Name';return rows},/row 9 drifted/,'a name invented for an unnamed row'],
  [rows=>{rows[40].name='Invented Name';return rows},/must not invent/,'a name invented deeper in'],
  [rows=>{rows[40].cumulativePower+=1;return rows},/row 41 cumulative/,'a cumulative column out of step'],
  [rows=>{[rows[20],rows[21]]=[rows[21],rows[20]];return rows},/orders must be/,'re-ordered rows'],
 ];
 for(const [mutate,pattern,why] of breaks){const got=auditRows(mutate(clone()));assert.ok(got,`${why} must be caught`);assert.match(got,pattern,why);}
});
