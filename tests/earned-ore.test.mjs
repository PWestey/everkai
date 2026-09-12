import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {ORE_PER_DAILY,PERFECT_DAY_ORE,STONE_FRAGMENTS_DAILY_CAP,summonState,summonDay} from '../lib/summon.mjs';
import {artifactState} from '../lib/artifacts.mjs';
import {starterHabits} from '../lib/habits.mjs';
const T=new Date('2026-09-15T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const claim=s=>run(s,'summonClaimDay',null,{seq:summonState(s).seq});
/** A journal with every daily already done, so a claim is a perfect day. */
const seeded=(count=null)=>{let s={...fresh(T),habits:starterHabits(T)};
 const dailies=s.habits.items.filter(x=>x.freq==='daily');
 for(const x of (count===null?dailies:dailies.slice(0,count)))s=run(s,'habitComplete',x.id);
 return s;};

test('Magic Ore is earned from habits, never granted',()=>{
 const s=fresh(T);
 assert.equal(s.artifacts,undefined,'a new save holds no ore');
 assert.throws(()=>act(s,'claimOre',T),/Unknown action/,'the free Magic Ore faucet no longer exists');});

test('a completed day pays ore up to the daily cap, a perfect day pays the bonus too',()=>{
 const partial=claim(seeded(2));
 assert.equal(artifactState(partial).ore,2*ORE_PER_DAILY);
 const {perfect}=summonDay(seeded(),seeded().lastAt);
 assert.equal(perfect,true);
 const full=claim(seeded());
 assert.equal(artifactState(full).ore,STONE_FRAGMENTS_DAILY_CAP*ORE_PER_DAILY+PERFECT_DAY_ORE);
 assert.equal(artifactState(full).ore,60);});

test('earned ore creates a valid artifact subtree and survives a reload',()=>{
 const s=claim(seeded());
 assert.ok(valid(s));
 assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.deepEqual(Object.keys(artifactState(s)).sort(),['bag','ore']);
 assert.deepEqual(artifactState(s).bag,{});});

test('ore accrues onto an existing balance and cannot be double claimed in a day',()=>{
 let s=seeded();s={...s,artifacts:{ore:500,bag:{}}};
 s=claim(s);
 assert.equal(artifactState(s).ore,560);
 assert.match(act(s,'summonClaimDay',s.lastAt,null,{seq:summonState(s).seq}).error,/already claimed/);});
