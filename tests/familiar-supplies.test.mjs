import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';
import {FAMILIARS} from '../lib/familiars.mjs';
import {towerKey,towerState} from '../lib/familiar-tower.mjs';
import {familiarSupplies,suppliesWaiting,towerIncome,trainingCost,SUPPLY_HOLD_MS} from '../lib/familiar-supplies.mjs';
import supply from '../lib/familiar-supply-data.json' with {type:'json'};
import {starterHabits} from '../lib/habits.mjs';
import {newFellow} from '../lib/adventure.mjs';
import {stellaState} from '../lib/stella.mjs';
const H=3600e3,T=new Date('2026-09-16T09:00:00').getTime();
const at=(s,a,now,t=null,v=null)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const team=()=>{let s=at(fresh(T),'adoptFamiliars',T);for(const p of FAMILIARS.slice(0,5))s=at(s,'towerParty',T,p.id);return s;};

test('the imported income is the original PetTower rows 25..300 in level-up / class-up items',()=>{
 assert.deepEqual(supply.items,{levelUp:'Item_PetLevelUP',classUp:'Item_PetClassUP'});
 assert.equal(supply.holdHours,24);
 assert.deepEqual(supply.floorIncome[0],[110,4]);assert.deepEqual(supply.floorIncome[11],[187,8]);
 assert.equal(supply.floorIncome.length,12);
 assert.deepEqual(trainingCost(1,50),{levelUp:1490,classUp:300},'stage 2 costs 1,490 level-up and 300 class-up');});

test('income starts on the first clear, pays whole hours, and holds 24 hours at most',()=>{
 let s=team();
 assert.deepEqual(suppliesWaiting(s,T+5*H),{levelUp:0,classUp:0,hours:0},'no floor cleared, no income');
 assert.match(act(s,'collectFamiliarSupplies',T+H).error,/Clear Familiar Tower floor 1/);
 s=at(s,'towerFight',T,towerKey(s));
 assert.equal(familiarSupplies(s).since,T);
 assert.match(act(s,'collectFamiliarSupplies',T+H-1).error,/full hour/,'59 minutes pays nothing');
 s=at(s,'collectFamiliarSupplies',T+2.5*H);
 assert.deepEqual({levelUp:familiarSupplies(s).levelUp,classUp:familiarSupplies(s).classUp},{levelUp:220,classUp:8});
 assert.equal(familiarSupplies(s).since,T+2*H,'the half hour carries over');
 s=at(s,'collectFamiliarSupplies',T+2*H+100*H);
 assert.equal(familiarSupplies(s).levelUp,220+24*110,'a long absence holds 24 hours, not 100');
 assert.equal(familiarSupplies(s).since,T+102*H,'a full store restarts the clock');
 assert.deepEqual(decode(JSON.stringify(s)),s);});

test('clearing a higher floor settles the old rate first',()=>{
 let s=team();s=at(s,'towerFight',T,towerKey(s));
 s={...s,familiarSupplies:{...familiarSupplies(s),levelUp:1e6,classUp:1e6}};
 for(const p of FAMILIARS.slice(0,5))for(let i=0;i<3;i++)s=at(s,'trainFamiliar',T,p.id,10);
 const before=familiarSupplies(s);
 const next=act(s,'towerFight',T+3*H,towerKey(s));
 if(next.error||towerState(next.state).cleared!==2)return assert.fail('the level-31 team could not clear floor 2; the fixture has drifted');
 assert.equal(familiarSupplies(next.state).levelUp,before.levelUp+3*110,'three hours paid at floor 1\'s rate');
 assert.equal(towerIncome(next.state).levelUp,120);});

test('the supply record is validated, and a save without one still loads',()=>{
 const old=fresh(T);assert.equal(old.familiarSupplies,undefined);assert.ok(valid(old));
 const good={...old,familiarSupplies:{levelUp:5,classUp:0,since:null}};assert.ok(valid(good));
 for(const bad of [{levelUp:-1,classUp:0,since:null},{levelUp:1.5,classUp:0,since:null},{levelUp:0,classUp:0,since:T+1},{levelUp:0,classUp:0},{levelUp:0,classUp:0,since:null,extra:1}])
  assert.equal(valid({...old,familiarSupplies:bad}),false,JSON.stringify(bad));});

test('earned route: a five-familiar team clears all twelve floors on tower income alone',()=>{
 let s=team(),now=T,hours=0;
 const cheapest=()=>FAMILIARS.slice(0,5).map(p=>p.id).sort((a,b)=>s.familiars[a].level-s.familiars[b].level)[0];
 while(towerState(s).cleared<12&&hours<24*120){
  const f=act(s,'towerFight',now,towerKey(s));if(!f.error&&towerState(f.state).cleared>towerState(s).cleared){s=f.state;continue;}
  now+=H;hours++;const c=act(s,'collectFamiliarSupplies',now);if(!c.error)s=c.state;
  for(let n=0;n<20;n++){const r=act(s,'trainFamiliar',now,cheapest(),1);if(r.error)break;s=r.state;}
 }
 assert.equal(towerState(s).cleared,12,`stopped at floor ${towerState(s).cleared} after ${hours} hours`);
 assert.ok(valid(s));
 // Measured 2026-09-15: the local floors fall within an hour or two, so the full floor-12 income
 // (187 level-up and 8 class-up items an hour) starts almost at once; the pace sits in the Cost ladders.
 assert.ok(hours<24*120);
 console.log(`# earned tower: floor 12 after ${(hours/24).toFixed(1)} days; levels ${FAMILIARS.slice(0,5).map(p=>s.familiars[p.id].level).join('/')}`);});

// The Stella fragment test that stood here pinned the `stellaSupply` button, which is RETIRED:
// fragments now drop from idle play (EVT-22). Its replacement is tests/stella-idle.test.mjs, which
// pins the rate, the habit multiplier, and that settling often pays no more than settling once.
