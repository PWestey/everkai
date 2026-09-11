import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,decode,valid} from '../lib/game.mjs';
import {summonState,summonDay,summonCost,weekStartDay,STONE_FRAGMENTS_PER_STONE,INSIGNIA_FRAGMENTS_PER_INSIGNIA,PERFECT_DAY_SHARDS} from '../lib/summon.mjs';
const MON=new Date('2026-09-07T09:00:00').getTime();// a Monday
const seq=s=>summonState(s).seq;
const run=(s,a,t=null,now=s.lastAt)=>act(s,a,now,t,{seq:seq(s)});
const ok=(s,a,t=null,now=s.lastAt)=>{const x=run(s,a,t,now);assert.equal(x.error,undefined,x.error);assert.ok(valid(x.state));return x.state};
function withHabit(s,title,domain,now=s.lastAt){const r=act(s,'habitSave',now,null,{title,freq:'daily',domain});assert(!r.error,r.error);return r.state}
function complete(s,id,now=s.lastAt){const r=act(s,'habitComplete',now,id);assert(!r.error,r.error);return r.state}

test('costs follow rarity, and set members take one insignia',()=>{assert.deepEqual(summonCost('SR'),{stones:1});assert.deepEqual(summonCost('SSR'),{stones:2});assert.deepEqual(summonCost('SSR+'),{stones:3});assert.deepEqual(summonCost('UR'),{insignias:2});assert.deepEqual(summonCost('SSR -> UR'),{stones:2});assert.deepEqual(summonCost('SSR',true),{insignias:1})});

test('a partial day pays per completed daily; a perfect day adds the bonus, an insignia fragment and star shards',()=>{
 let s=withHabit(withHabit(fresh(MON),'Walk','health'),'Read','learning');
 const [a,b]=s.habits.items;assert.deepEqual(summonDay(s,s.lastAt),{day:'2026-09-07',due:2,done:0,perfect:false});
 s=complete(s,a.id);let x=run(s,'summonClaimDay');assert.equal(x.error,undefined,x.error);
 assert.equal(summonState(x.state).stoneFragments,2);assert.equal(summonState(x.state).insigniaFragments,0);
 assert.match(run(x.state,'summonClaimDay').error,/already claimed/);
 let t=complete(complete(s,a.id),b.id);// both dailies done today
 t=ok(t,'summonClaimDay');const r=summonState(t);
 assert.equal(r.stoneFragments,2*2+4);assert.equal(r.insigniaFragments,1);assert.equal(r.starShards,PERFECT_DAY_SHARDS);
 assert.deepEqual(r.days,['2026-09-07!']);assert.deepEqual(decode(JSON.stringify(t)),t);
 assert.match(run(fresh(MON),'summonClaimDay').error,/daily habit/);});

test('fragments forge into stones and insignias, and stale requests are refused',()=>{
 let s=withHabit(fresh(MON),'Walk','health');const id=s.habits.items[0].id;
 for(let d=0;d<6;d++){const now=MON+d*864e5;s=complete({...s,lastAt:now},id,now);s=ok(s,'summonClaimDay',null,now)}
 const r=summonState(s);assert.equal(r.stoneFragments,6*(2+4));assert.equal(r.insigniaFragments,6);
 assert.match(run(s,'summonForge','gold').error,/insignia to forge/);
 s=ok(s,'summonForge','stone');assert.equal(summonState(s).stones,1);assert.equal(summonState(s).stoneFragments,6*6-STONE_FRAGMENTS_PER_STONE);
 s=ok(s,'summonForge','valiant');assert.equal(summonState(s).valiant,1);assert.equal(summonState(s).insigniaFragments,6-INSIGNIA_FRAGMENTS_PER_INSIGNIA);
 assert.match(run(s,'summonForge','archangel').error,/insignia fragments/);
 assert.ok(act(s,'summonForge',s.lastAt,'stone',{seq:0}).error);});

test('a strong week pays extra insignia fragments once',()=>{
 let s=fresh(MON);for(const [title,domain] of [['Walk','health'],['Read','learning'],['Call','relationship'],['Tidy','household'],['Rest','rest']])s=withHabit(s,title,domain);
 const ids=s.habits.items.map(x=>x.id);
 for(let d=0;d<5;d++){const now=MON+d*864e5;s={...s,lastAt:now};for(const id of ids)s=complete(s,id,now);s=ok(s,'summonClaimDay',null,now)}
 const now=MON+4*864e5;assert.equal(weekStartDay(now),'2026-09-07');
 const before=summonState(s).insigniaFragments;s=ok(s,'summonClaimWeek',null,now);
 assert.equal(summonState(s).insigniaFragments,before+2);
 assert.match(run(s,'summonClaimWeek',null,now).error,/already claimed/);
 assert.match(run(fresh(MON),'summonClaimWeek').error,/perfect days/);});

test('mutated summon saves are rejected',()=>{let base=withHabit(fresh(MON),'Walk','health');base=complete(base,base.habits.items[0].id);const s=ok(base,'summonClaimDay');
 for(const bad of [{stones:-1},{policyVersion:2},{days:['nope']},{days:['2026-09-07','2026-09-07!']},{weeks:['2026-09-07','2026-09-07']},{starShards:1e9}]){
  const m={...s,summon:{...s.summon,...bad}};assert.equal(valid(m),false,JSON.stringify(bad));assert.throws(()=>decode(JSON.stringify(m)),JSON.stringify(bad));}});
