import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {PATROL_RECOVERY_MS,PATROL_CEILING,patrolCharges,patrolReadyAt,STAGES} from '../lib/adventure.mjs';

// BUG-40. Measured before the fix: `patrol` was accepted 1,000 times at ONE frozen timestamp, 1,200 EXP
// each at stage 30, with the entry gold returned on every win -- so Fellow EXP had no rate at all and
// any days-of-play costing of the level cap was meaningless.
// The meter is the original's own repeatable-expedition meter, both halves from System.json:
// adventureSupplyrecovery 28800 (seconds) and adventureSupplyCeiling 5.
const T=new Date('2026-09-16T09:00:00').getTime();
const cleared=(now=T)=>{const s=fresh(now);return {...s,adventure:{...s.adventure,cleared:30},gold:1e6,fellows:{...s.fellows,hero_15:{...s.fellows.hero_15,aptitude:1000}}}};
const ok=(s,a,t,now=s.lastAt)=>{const r=act(s,a,now,t);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state};

test('the source meter is the original constants, not a local invention',()=>{
 assert.equal(PATROL_RECOVERY_MS,28800*1000,'System.json adventureSupplyrecovery, in seconds');
 assert.equal(PATROL_CEILING,5,'System.json adventureSupplyCeiling');});

test('a save with no stamp starts full, and five patrols exhaust the bucket at one timestamp',()=>{
 let s=cleared();
 assert.equal(patrolCharges(s),PATROL_CEILING,'an unstamped save is full, never retroactively empty');
 assert.equal(patrolReadyAt(s),null,'nothing is pending at the ceiling');
 const xp=s.fellowXP,gold=s.gold;
 for(let i=0;i<PATROL_CEILING;i++){s=ok(s,'patrol',30);assert.equal(patrolCharges(s),PATROL_CEILING-1-i);}
 assert.equal(s.adventure.patrols,PATROL_CEILING);
 // Patrol EXP is the stage's OWN Fellow EXP from the original's table (stage 30 = chapter 5's boss,
 // item '1' count 1,776), not the invented 40 x stage id it used to be.
 assert.equal(STAGES[29].xp,1776,'stage 30 is chapter 5-6, the boss row that awards 1,776 Fellow EXP');
 assert.equal(s.fellowXP,xp+PATROL_CEILING*STAGES[29].xp,'the stage table value, five times -- never an unmetered faucet');
 assert.equal(s.gold,gold,'the entry deposit still returns on victory');
 // The sixth is refused at the same timestamp, and refusing writes nothing at all.
 const refused=act(s,'patrol',s.lastAt,30);
 assert.ok(refused.error,'a sixth patrol at the SAME timestamp must be refused -- this is the whole of BUG-40');
 assert.match(refused.error,/No patrol supplies left/);
 assert.equal(refused.state.fellowXP,s.fellowXP);
 assert.equal(refused.state.adventure.patrols,PATROL_CEILING);
 assert.deepEqual(decode(JSON.stringify(s)),s);});

test('charges come back on the clock, one per recovery, and never above the ceiling',()=>{
 let s=cleared();
 for(let i=0;i<PATROL_CEILING;i++)s=ok(s,'patrol',30);
 assert.equal(patrolCharges(s),0);
 assert.equal(patrolReadyAt(s),s.lastAt+PATROL_RECOVERY_MS,'the next charge is one recovery out');
 assert.ok(act(s,'patrol',s.lastAt+PATROL_RECOVERY_MS-1,30).error,'one millisecond short is still short');
 assert.equal(patrolCharges(s,s.lastAt+PATROL_RECOVERY_MS),1);
 assert.equal(patrolCharges(s,s.lastAt+3*PATROL_RECOVERY_MS),3);
 assert.equal(patrolCharges(s,s.lastAt+50*PATROL_RECOVERY_MS),PATROL_CEILING,'idle time does not bank past five');
 const later=ok(s,'patrol',30,s.lastAt+PATROL_RECOVERY_MS);
 assert.equal(patrolCharges(later),0);
 // The sustained rate is what matters, and it is NOT the ceiling: 24h / 8h = 3 charges a day, with 5
 // only as a burst after idling. At stage 30 that is 3 x 1,200 = 3,600 Fellow EXP a day against
 // school's 17,280 -- a real rate, where before the honest answer was "unbounded".
 assert.equal(patrolCharges(later,later.lastAt+24*3600e3),3,'a day regenerates three, not five');
 assert.equal(patrolCharges(later,later.lastAt+40*3600e3),PATROL_CEILING,'the ceiling needs 40 idle hours');});

test('a malformed or future-dated patrol stamp is not a save',()=>{
 let s=cleared();s=ok(s,'patrol',30);
 assert.ok(valid(s));
 for(const bad of ['yesterday',1.5,null,s.lastAt+PATROL_CEILING*PATROL_RECOVERY_MS+1]){
  const m={...s,adventure:{...s.adventure,patrolAt:bad}};
  assert.equal(valid(m),false,JSON.stringify(bad));
  assert.throws(()=>decode(JSON.stringify(m)),JSON.stringify(bad));}});
