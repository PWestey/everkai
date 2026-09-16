import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';
import {FAMILIARS} from '../lib/familiars.mjs';
import {towerKey,towerState} from '../lib/familiar-tower.mjs';
import {familiarSupplies,suppliesWaiting,towerIncome,floorIncome,towerFloorOf,trainingCost,SUPPLY_HOLD_MS} from '../lib/familiar-supplies.mjs';
import supply from '../lib/familiar-supply-data.json' with {type:'json'};
import towerData from '../lib/familiar-tower-data.json' with {type:'json'};
import {starterHabits} from '../lib/habits.mjs';
import {newFellow} from '../lib/adventure.mjs';
import {stellaState} from '../lib/stella.mjs';
const H=3600e3,T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,now,t=null,v=null)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const team=()=>{let s=at(fresh(T),'adoptFamiliars',T);for(const p of FAMILIARS.slice(0,5))s=at(s,'towerParty',T,p.id);return s;};

test('the income is the original PetTower.Income of every one of the 300 floors, in level-up / class-up items',()=>{
 assert.deepEqual(supply.items,{levelUp:'Item_PetLevelUP',classUp:'Item_PetClassUP'});
 assert.equal(supply.holdHours,24);
 assert.equal(towerData.floors.length,300);
 assert.deepEqual(floorIncome(1),{levelUp:100,classUp:0});assert.deepEqual(floorIncome(20),{levelUp:107,classUp:4});
 // The sandbox's twelve rates were rows 25n; the same rows are still what those floors pay.
 assert.deepEqual([1,2,3,4,5,6,7,8,9,10,11,12].map(n=>towerData.floors[25*n-1].income),[[110,4],[120,5],[130,5],[141,5],[151,6],[162,7],[172,7],[182,7],[184,8],[185,8],[186,8],[187,8]]);
 assert.deepEqual(floorIncome(300),{levelUp:187,classUp:8});assert.deepEqual(floorIncome(0),{levelUp:0,classUp:0});
 assert.deepEqual(trainingCost(1,50),{levelUp:1490,classUp:300},'stage 2 costs 1,490 level-up and 300 class-up');});

test('income starts on the first clear, pays whole hours, and holds 24 hours at most',()=>{
 let s=team();
 assert.deepEqual(suppliesWaiting(s,T+5*H),{levelUp:0,classUp:0,hours:0},'no floor cleared, no income');
 assert.match(act(s,'collectFamiliarSupplies',T+H).error,/Clear Familiar Tower floor 1/);
 s=at(s,'towerFight',T,towerKey(s));
 assert.equal(familiarSupplies(s).since,T);
 assert.match(act(s,'collectFamiliarSupplies',T+H-1).error,/full hour/,'59 minutes pays nothing');
 s=at(s,'collectFamiliarSupplies',T+2.5*H);
 // Floor 1's own first-clear reward (Reward_PetTower_01, 20 level-up) sits in the store beside two hours of floor 1 income.
 assert.deepEqual({levelUp:familiarSupplies(s).levelUp,classUp:familiarSupplies(s).classUp},{levelUp:20+200,classUp:0});
 assert.equal(familiarSupplies(s).since,T+2*H,'the half hour carries over');
 s=at(s,'collectFamiliarSupplies',T+2*H+100*H);
 assert.equal(familiarSupplies(s).levelUp,220+24*100,'a long absence holds 24 hours, not 100');
 assert.equal(familiarSupplies(s).since,T+102*H,'a full store restarts the clock');
 assert.deepEqual(decode(JSON.stringify(s)),s);});

test('clearing a higher floor settles the old rate first, and pays no hour twice',()=>{
 let s=team();while(towerState(s).cleared<3)s=at(s,'towerFight',T,towerKey(s));
 assert.equal(towerIncome(s).levelUp,100);
 const before=familiarSupplies(s);
 const next=act(s,'towerFight',T+3*H,towerKey(s));
 if(next.error||towerState(next.state).cleared!==4)return assert.fail('the team could not clear floor 4; the fixture has drifted');
 // Floor 4's Income is 101 (the first rise). Three hours at floor 3's 100, plus floor 4's 20-item reward.
 assert.equal(towerIncome(next.state).levelUp,101);
 assert.equal(familiarSupplies(next.state).levelUp,before.levelUp+3*100+towerData.floors[3].reward.levelUp,'three hours at floor 3\'s rate plus the first-clear reward');
 assert.equal(familiarSupplies(next.state).since,T+3*H);
 assert.deepEqual(suppliesWaiting(next.state,T+3*H),{levelUp:0,classUp:0,hours:0},'the settled hours are not waiting a second time');});

test('the supply record is validated, and a save without one still loads',()=>{
 const old=fresh(T);assert.equal(old.familiarSupplies,undefined);assert.ok(valid(old));
 const good={...old,familiarSupplies:{levelUp:5,classUp:0,since:null}};assert.ok(valid(good));
 for(const bad of [{levelUp:-1,classUp:0,since:null},{levelUp:1.5,classUp:0,since:null},{levelUp:0,classUp:0,since:T+1},{levelUp:0,classUp:0},{levelUp:0,classUp:0,since:null,extra:1}])
  assert.equal(valid({...old,familiarSupplies:bad}),false,JSON.stringify(bad));});

test('earned route: a five-familiar team clears the first 60 original floors on tower income alone',()=>{
 let s=team(),now=T,hours=0;
 const cheapest=()=>FAMILIARS.slice(0,5).map(p=>p.id).sort((a,b)=>s.familiars[a].level-s.familiars[b].level)[0];
 while(towerState(s).cleared<60&&hours<24*120){
  const f=act(s,'towerFight',now,towerKey(s));if(!f.error&&towerState(f.state).cleared>towerState(s).cleared){s=f.state;continue;}
  now+=H;hours++;const c=act(s,'collectFamiliarSupplies',now);if(!c.error)s=c.state;
  for(let n=0;n<20;n++){const r=act(s,'trainFamiliar',now,cheapest(),1);if(r.error)break;s=r.state;}
 }
 assert.equal(towerState(s).cleared,60,`stopped at floor ${towerState(s).cleared} after ${hours} hours`);
 assert.ok(valid(s));
 // FAMILIARS.slice(0,5) is the SSR+/UR top of the roster. Measured 2026-09-16 with the same loop run to
 // floor 300 on tower income alone: this team 1.5 days (level 74), an SSR explore team (12141/13141/21341/
 // 22241/23341) 17.8 days (level 116), an SR team 22.6 days (level 140). An N/R team stalls at level 49
 // on floor 8, because floors 1-19 pay no class-up items: the next class-up must come from Exploring.
 assert.ok(hours<24*120);
 console.log(`# earned tower: floor 60 after ${(hours/24).toFixed(1)} days; levels ${FAMILIARS.slice(0,5).map(p=>s.familiars[p.id].level).join('/')}`);});

// The Stella fragment test that stood here pinned the `stellaSupply` button, which is RETIRED:
// fragments now drop from idle play (EVT-22). Its replacement is tests/stella-idle.test.mjs, which
// pins the rate, the habit multiplier, and that settling often pays no more than settling once.
