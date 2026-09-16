import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,settle,valid,decode} from '../lib/game.mjs';
import {stellaState,STELLA_IDLE_PER_DAY,STELLA_PROFILES,settleStella} from '../lib/stella.mjs';
import {starterHabits,habitEarnings} from '../lib/habits.mjs';
const T=new Date('2026-09-16T09:00:00').getTime(),DAY=86400000;
const ITEM='Item_Owner_HeroPiece_54';
const owner=()=>{const f=fresh(T);return {...f,habits:starterHabits(T),fellows:{...f.fellows,hero_54:{level:1,aptitude:10,skill:0,breaks:0,gear:null}},stella:{policyVersion:1,seq:0,stock:{},grants:[],history:[]}}};
const held=s=>stellaState(s).stock[ITEM]||0;

// EVT-22. The rate is not a taste call: the retired `stellaSupply` button paid 1,000 fragments a day per
// profile behind a finished daily habit. earningsMultiplier runs 1.0 to 2.0, so a 500/day base carried by
// that multiplier reproduces the button's 1,000/day exactly for a player who keeps their habits. Both
// halves of that come from the shipped grant, which is the only way this number can be checked.
test('idle play pays 500 fragments a day, and a full habit multiplier doubles it to the old 1,000',()=>{
 const s=owner();
 assert.equal(habitEarnings(s.habits,s.lastAt).multiplier,1,'no habits done yet');
 assert.equal(held(settle(s,T+DAY)),STELLA_IDLE_PER_DAY);
 assert.equal(STELLA_IDLE_PER_DAY,500);

 // Drive the multiplier up with real habit completions rather than writing one in.
 let busy=s;
 for(const h of busy.habits.items.filter(x=>x.freq==='daily').slice(0,40)){
  const r=act(busy,'habitComplete',busy.lastAt,h.id);if(!r.error)busy=r.state;
 }
 // Measured over a window INSIDE the same day: the multiplier is read at the end of the window, and
 // today's completions stop counting at midnight, exactly as they do for gold.
 const half=T+DAY/2,mult=habitEarnings(busy.habits,half).multiplier;
 assert.ok(mult>1,`the multiplier moved: ${mult}`);
 assert.equal(held(settle(busy,half)),Math.floor(STELLA_IDLE_PER_DAY/2*mult),'the gold multiplier carries fragments too');
 assert.ok(STELLA_IDLE_PER_DAY*mult<=1000,`never above the button's old ceiling: ${STELLA_IDLE_PER_DAY*mult}/day`);
 assert.equal(Math.floor(STELLA_IDLE_PER_DAY*2),1000,'and at the 2.0 cap it lands exactly on the old rate');});

test('settling often pays no more than settling once -- tapping cannot mint fragments',()=>{
 const s=owner();
 const once=held(settle(s,T+DAY));
 let often=s;for(let i=1;i<=24;i++)often=settle(often,T+i*DAY/24);
 assert.equal(held(often),once,'24 hourly settles == 1 daily settle');
 let spam=s;for(let i=1;i<=500;i++)spam=settle(spam,T+i*DAY/500);
 assert.equal(held(spam),once,'500 settles in the same day == 1 daily settle');
 // Positive control: the probe can see a difference when there really is one.
 assert.ok(held(settle(s,T+2*DAY))>once,'two days really does pay more than one');});

test('fragments accrue only for a Stella profile the player owns',()=>{
 const f=fresh(T);
 const stranger={...f,habits:starterHabits(T),stella:{policyVersion:1,seq:0,stock:{},grants:[],history:[]}};
 assert.equal(f.fellows.hero_54,undefined,'a fresh village does not own hero_54');
 assert.deepEqual(stellaState(settle(stranger,T+30*DAY)).stock,{},'30 idle days pay an unowned profile nothing');
 // Positive control: the same 30 days DO pay once the Fellow is owned.
 assert.ok(held(settle(owner(),T+30*DAY))>0);});

test('the ledger still reconciles, so a tampered stock is refused',()=>{
 const s=settle(owner(),T+3*DAY);
 assert.ok(valid(s));
 assert.deepEqual(decode(JSON.stringify(s)),s,'an idle-earned save round-trips unchanged');
 const t=stellaState(s);
 assert.equal(t.idle[ITEM],t.stock[ITEM],'idle drops are recorded, not just added to stock');
 // Negative control: hand-editing stock without the matching idle record must not pass.
 assert.equal(valid({...s,stella:{...t,stock:{...t.stock,[ITEM]:t.stock[ITEM]+1}}}),false,'stock above the ledger');
 assert.equal(valid({...s,stella:{...t,idle:{...t.idle,[ITEM]:t.idle[ITEM]+1}}}),false,'ledger above the stock');
 assert.equal(valid({...s,stella:{...t,since:s.lastAt+1}}),false,'a future accrual clock');});

test('the free supply button is gone, and old saves that used it still load',()=>{
 const s=owner();
 assert.throws(()=>act(s,'stellaSupply',s.lastAt,'hero_54',{seq:0}),/Unknown action/,'the button is retired');
 // A save written while the button existed carries `grants` and no `idle`; it must still reconcile.
 const legacy={...s,stella:{policyVersion:1,seq:1,stock:{[ITEM]:1000},grants:[{id:1,itemId:ITEM,count:1000,at:T}],history:[]}};
 assert.ok(valid(legacy),'the old grant ledger is still accepted');
 assert.deepEqual(decode(JSON.stringify(legacy)),legacy);
 const grown=settle(legacy,T+DAY);
 assert.equal(held(grown),1000+STELLA_IDLE_PER_DAY,'and idle drops accrue on top of what was banked');
 assert.ok(valid(grown));});

test('a full ladder is reachable in a stated number of idle days, not an invented one',()=>{
 // hero_54 costs 4,500 fragments across 40 levels. At 500/day that is 9 idle days, or 4.5 if habits
 // are kept -- the same pace the retired daily button gave, which is the point of the chosen rate.
 const p=STELLA_PROFILES.find(x=>x.id==='hero_54');
 const total=p.levels.reduce((n,r)=>n+r.cost,0);
 assert.equal(total,4500);
 assert.equal(total/STELLA_IDLE_PER_DAY,9,'nine idle days at the base rate');
 assert.equal(held(settle(owner(),T+9*DAY)),total,'and nine days really does pay for the whole ladder');});
