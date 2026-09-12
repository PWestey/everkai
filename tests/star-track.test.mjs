import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate,buildingRate} from '../lib/game.mjs';
import {summonState} from '../lib/summon.mjs';
import {STAR_CAP,STAR_COSTS,STAR_APTITUDE_PERCENT,fellowStars,nextStarCost,starredAptitude,fellowFactor,bondedPower} from '../lib/adventure.mjs';
const T=new Date('2026-09-21T09:00:00').getTime();
const seq=s=>summonState(s).seq;
const shards=(s,n)=>({...s,summon:{...summonState(s),starShards:n}});
const buy=(s,id)=>{const r=act(s,'summonStar',s.lastAt,id,{seq:seq(s)});assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),id);return r.state};
const base=()=>fresh(T);

test('the ladder is seven deep with rising prices, matching the original depth',()=>{
 assert.equal(STAR_CAP,7,'Hero_Star_Halo_Nomal rows carry maxUpgradeLevel 7');
 assert.equal(STAR_COSTS.length,STAR_CAP,'one price per star');
 for(let i=1;i<STAR_COSTS.length;i++)assert.ok(STAR_COSTS[i]>STAR_COSTS[i-1],`star ${i+1} must cost more than star ${i}`);
 for(const c of STAR_COSTS)assert.ok(Number.isInteger(c)&&c>0);
});

test('a Fellow with no stars is completely unchanged, so old saves keep their exact numbers',()=>{
 const s=base(),f=s.fellows.hero_15;
 assert.equal(f.stars,undefined,'the field only appears once earned');
 assert.equal(fellowStars(f),0);
 assert.equal(starredAptitude(f),f.aptitude,'zero stars is an exact no-op, not a rounding');
 assert.equal(fellowFactor(f),(f.aptitude+0)/10*(1+f.skill*.05));
 assert.equal(nextStarCost(f),STAR_COSTS[0]);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('a star costs shards, is recorded on the Fellow, and survives a reload',()=>{
 let s=shards(base(),STAR_COSTS[0]+5);
 s=buy(s,'hero_15');
 assert.equal(s.fellows.hero_15.stars,1);
 assert.equal(summonState(s).starShards,5,'exactly the first price was spent');
 assert.equal(nextStarCost(s.fellows.hero_15),STAR_COSTS[1]);
 assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('a star raises both Power and village earnings, not just one of them',()=>{
 // fellowFactor is the single point buildingRate and fellowPower share; this is what proves it.
 let s=shards(base(),STAR_COSTS[0]);
 const power=bondedPower(s,'hero_15'),gold=totalRate(s),fish=buildingRate(s,'fish');
 assert.ok(gold>0&&fish>0&&power>0,'hero_15 works the fish building on a fresh save');
 s=buy(s,'hero_15');
 assert.ok(bondedPower(s,'hero_15')>power,'Power rose');
 assert.ok(buildingRate(s,'fish')>fish,'gold per second rose');
 assert.ok(totalRate(s)>gold,'village earnings rose');
 const f=s.fellows.hero_15;
 assert.equal(starredAptitude(f),f.aptitude*(1+STAR_APTITUDE_PERCENT/100));
});

test('stars stack to the cap and then the counter refuses',()=>{
 let s=shards(base(),STAR_COSTS.reduce((a,b)=>a+b,0));
 for(let i=0;i<STAR_CAP;i++)s=buy(s,'hero_15');
 assert.equal(s.fellows.hero_15.stars,STAR_CAP);
 assert.equal(summonState(s).starShards,0,'the full ladder costs exactly the sum of its prices');
 assert.equal(nextStarCost(s.fellows.hero_15),null);
 assert.equal(starredAptitude(s.fellows.hero_15),s.fellows.hero_15.aptitude*(1+STAR_CAP*STAR_APTITUDE_PERCENT/100));
 const r=act(shards(s,1000),'summonStar',s.lastAt,'hero_15',{seq:seq(s)});
 assert.match(r.error,/fully starred|cap/i);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('too few shards, unknown Fellows and Family members are refused without spending',()=>{
 const poor=shards(base(),STAR_COSTS[0]-1);
 const r=act(poor,'summonStar',poor.lastAt,'hero_15',{seq:seq(poor)});
 assert.match(r.error,new RegExp(String(STAR_COSTS[0])));
 assert.deepEqual(r.state,poor,'a refusal leaves the save untouched');
 const rich=shards(base(),1000);
 assert.match(act(rich,'summonStar',rich.lastAt,'nobody',{seq:seq(rich)}).error,/Choose an owned Fellow/);
 assert.match(act(rich,'summonStar',rich.lastAt,'hero_1',{seq:seq(rich)}).error,/Choose an owned Fellow/,'not recruited yet');
 assert.equal(summonState(act(rich,'summonStar',rich.lastAt,'nobody',{seq:seq(rich)}).state).starShards,1000);
});

test('a stale sequence number is refused, so a repeated tap cannot double charge',()=>{
 const s=shards(base(),1000),stale=seq(s);
 const first=buy(s,'hero_15');
 assert.match(act(first,'summonStar',first.lastAt,'hero_15',{seq:stale}).error,/Summon rewards changed/);
 assert.equal(first.fellows.hero_15.stars,1,'still one star, not two');
});

test('a forged star count is rejected by validation',()=>{
 const s=shards(base(),1000);
 for(const bad of [STAR_CAP+1,-1,1.5,'3',null]){
  const forged={...s,fellows:{...s.fellows,hero_15:{...s.fellows.hero_15,stars:bad}}};
  assert.equal(valid(forged),false,String(bad));
  assert.throws(()=>decode(JSON.stringify(forged)),String(bad));
 }
});

test('saves written before stars existed still load and can earn one',()=>{
 const s=base();
 assert.equal(s.fellows.hero_15.stars,undefined);
 const old=JSON.parse(JSON.stringify(s));
 assert.ok(valid(old));
 const loaded=decode(JSON.stringify(old));
 assert.equal(fellowStars(loaded.fellows.hero_15),0);
 const r=act(shards(loaded,STAR_COSTS[0]),'summonStar',loaded.lastAt,'hero_15',{seq:0});
 assert.equal(r.error,undefined,r.error);
 assert.equal(r.state.fellows.hero_15.stars,1);
 assert.ok(valid(r.state));
});
