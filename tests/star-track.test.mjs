import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate,buildingRate} from '../lib/game.mjs';
import {summonState} from '../lib/summon.mjs';
import {STAR_CAP,STAR_COSTS,STAR_APTITUDE_PERCENT,fellowStars,nextStarCost,starredAptitude,fellowFactor,bondedPower,newFellow} from '../lib/adventure.mjs';
import {FELLOWS} from '../lib/catalog.mjs';
import {starRosterGate,starParts,awakenView} from '../lib/hero-stars.mjs';
const T=new Date('2026-09-21T09:00:00').getTime();
const seq=s=>summonState(s).seq;
const shards=(s,n)=>({...s,summon:{...summonState(s),starShards:n}});
const buy=(s,id)=>{const r=act(s,'summonStar',s.lastAt,id,{seq:seq(s)});assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),id);return r.state};
const base=()=>fresh(T);
/** A save whose roster already meets the original's star prerequisites: `n` extra Fellows at 5 stars
 *  and level 750, which clears 15x3*, 20x4* and 25x5* at once. Built by writing the records rather
 *  than buying them, exactly as tests/crossover-ceiling-fixture.mjs does, so the gate under test is
 *  the only thing being exercised. */
const rosterOf=n=>{const s=base(),extra={};
 const ids=FELLOWS.filter(f=>f.id!=='hero_15').slice(0,n).map(f=>f.id);
 for(const id of ids)extra[id]={...newFellow(750),breaks:13,stars:5};
 return {...s,fellows:{...s.fellows,...extra}};};

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
 // Since step 4 (2026-09-18) a star pays HeroStar's row only once the Fellow reaches the original's level gate
 // (300 for the first star): at level 1 it is stored, legal and inactive for Power -- earnings still rise.
 assert.equal(bondedPower(s,'hero_15'),power,'Power waits for the level gate');
 const at300=f=>({...s,fellows:{...s.fellows,hero_15:{...s.fellows.hero_15,level:300,...f}}});
 assert.ok(bondedPower(at300({}),'hero_15')>bondedPower(at300({stars:0}),'hero_15'),'Power rose once the gate is met');
 assert.ok(buildingRate(s,'fish')>fish,'gold per second rose');
 assert.ok(totalRate(s)>gold,'village earnings rose');
 const f=s.fellows.hero_15;
 assert.equal(starredAptitude(f),f.aptitude*(1+STAR_APTITUDE_PERCENT/100));
});

test('stars stack to the cap and then the counter refuses',()=>{
 // THE ROSTER PREREQUISITE (2026-09-22, HeroStar.needHeroStarCount) bites from star 4, so a single
 // Fellow can no longer climb alone: the account needs 15 Fellows at 3 stars, then 20 at 4, then 25
 // at 5. The fixture below seats that roster, which is the whole point of the gate -- Awaken is a
 // roster goal in the original, not a per-Fellow one. tests/hero-stars.test.mjs pins the rows.
 // 25 extras, not 24: hero_15 is level 1 here, so his own stored stars are INACTIVE and he
 // counts for nobody's gate -- the same rule effectiveStar applies to his own Power.
 let s=shards(rosterOf(25),STAR_COSTS.reduce((a,b)=>a+b,0));
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

// ---- THE ROSTER PREREQUISITE (2026-09-22, docs/character-systems-gap.md 2.1 gap 3) ----
// HeroStar.needHeroStarCount is the original's real brake on stars 4-6 and Everkai had none. It gates
// the PURCHASE only: a stored star is never refused and never stops paying.

test('needHeroStarCount gates stars 4, 5 and 6 on the whole roster, and nothing below them',()=>{
 // Stars 1-3 carry no roster rule at all, so a lone Fellow still climbs to 3 exactly as before.
 let s=shards(base(),STAR_COSTS.reduce((a,b)=>a+b,0));
 for(let i=0;i<3;i++)s=buy(s,'hero_15');
 assert.equal(s.fellows.hero_15.stars,3);
 assert.equal(starRosterGate(s,'hero_15').count,15);
 assert.equal(starRosterGate(s,'hero_15').star,3);
 // The 4th is refused, with the count in the message, and nothing is spent.
 const before=summonState(s).starShards;
 const r=act(s,'summonStar',s.lastAt,'hero_15',{seq:seq(s)});
 assert.match(r.error,/Awaken 15 more Fellows to 3★ first \(0\/15\)/);
 assert.equal(summonState(r.state).starShards,before,'a refused star spends nothing');
 // Seat the roster the original asks for and the same purchase goes through.
 const seated=shards({...rosterOf(15),fellows:{...rosterOf(15).fellows,hero_15:s.fellows.hero_15}},before);
 assert.equal(starRosterGate(seated,'hero_15').have,15);
 assert.equal(starRosterGate(seated,'hero_15').met,true);
 assert.equal(buy(seated,'hero_15').fellows.hero_15.stars,4);
});

test('the gate counts ACTIVE stars, and never refuses or un-pays a star already stored',()=>{
 // 15 Fellows stored at 3 stars but only level 1: their stars are inactive, so they count for nobody.
 const sleepy=fresh(T);
 const ids=FELLOWS.filter(f=>f.id!=='hero_15').slice(0,15).map(f=>f.id);
 const low={...sleepy,fellows:{...sleepy.fellows,
  ...Object.fromEntries(ids.map(id=>[id,{...newFellow(1),stars:3}])),
  hero_15:{...sleepy.fellows.hero_15,stars:3}}};
 assert.ok(valid(low),'stored stars a level cannot support are still a legal save');
 assert.equal(starRosterGate(low,'hero_15').have,0);
 assert.equal(starRosterGate(low,'hero_15').met,false);
 // Raising the same Fellows to the level their stars need turns the gate.
 const woken={...low,fellows:{...low.fellows,
  ...Object.fromEntries(ids.map(id=>[id,{...newFellow(750),breaks:13,stars:3}]))}};
 assert.equal(starRosterGate(woken,'hero_15').have,15);
 // A roster that later SHRINKS can make the next star unbuyable, but the stars already bought stay
 // legal and keep paying. That is the rule-12 line this gate must never cross.
 const shrunk={...woken,fellows:{hero_15:{...woken.fellows.hero_15,stars:6,level:750,breaks:13}}};
 assert.ok(valid(shrunk),'a shrunken roster never invalidates stored stars');
 assert.deepEqual(decode(JSON.stringify(shrunk)),shrunk);
 assert.equal(starParts(shrunk.fellows.hero_15).percent,6000,'★6 still pays its whole row');
 assert.equal(starRosterGate(shrunk,'hero_15'),null,'★6 is the original\'s top, so there is no gate above it');
});

test('awakenView is the panel, and it is entirely derived',()=>{
 const s={...fresh(T),fellows:{hero_15:{...newFellow(600),breaks:13,stars:5}}};
 const v=awakenView(s,'hero_15');
 assert.equal(v.stored,5);
 assert.equal(v.active,4,'★5 needs Lv. 700, so at Lv. 600 it steps down to ★4 -- stored, not refused');
 assert.deepEqual(v.parts,{percent:4000,flat:3000000});
 assert.equal(v.halo,5,'the halo level follows the ACTIVE star, not the stored one');
 assert.equal(v.inactive,700,'the level that would make the stored star active again');
 assert.equal(v.levelGate,750);
 assert.equal(v.levelMet,false);
 assert.deepEqual(v.roster,{star:5,count:25,have:0,met:false},'he does not count for his own ★6 gate at ★4');
 assert.equal(v.stones,50,'what the original charges in Acquaint Stones for the sixth star');
 // ★7 is Everkai's own: past the original's table there is no gate and no price left to show.
 const top=awakenView({...s,fellows:{hero_15:{...s.fellows.hero_15,stars:7,level:750}}},'hero_15');
 assert.equal(top.active,6);
 assert.equal(top.roster,null);
 assert.equal(top.stones,null);
 assert.equal(awakenView(s,'nobody'),null);
});
