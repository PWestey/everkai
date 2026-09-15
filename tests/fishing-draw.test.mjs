import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {FISH,fishingState,castKey,fishingLevel,fishingIndex,groundLevel,castOdds,FISHING_LEVELS,FISHING_GROUNDS} from '../lib/fishing.mjs';
import {withCatches} from './fishing-helpers.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state;};
const stocked=(bait=1000)=>{const s=fresh(T);return {...s,fishing:{...fishingState(s),bait}};};
const castAt=(s,g)=>run(s,'castFish',castKey(s),g);
const rarityOf=id=>FISH.find(r=>r.id===id).rarity;

test('the imported tables are the original FishLevel and FishSpot rows',()=>{
 assert.equal(FISHING_LEVELS.length,500);
 assert.deepEqual(FISHING_LEVELS[0],[80,5000,5000,0,0,0],'level 1: half N, half R, nothing rarer');
 assert.deepEqual(FISHING_LEVELS[4],[300,4300,4200,1000,320,70],'UR first appears at level 5');
 assert.deepEqual(Object.fromEntries(Object.entries(FISHING_GROUNDS).map(([g,v])=>[g,v.level])),{
  'Center of the Reef':8,'Crushed Ice':20,'Drakenberg Inner Lake':4,'Drakenberg Lake Center':5,'Drakenberg River Bank':2,
  'Glacier Bay':25,'Island Beach':6,'Island Coastline':10,'Unfrozen Sea Cave':30,'Village River':1});
 assert.deepEqual(fishingLevel(0),{level:1,exp:0,next:80});
 assert.equal(fishingLevel(80).level,2);assert.equal(fishingLevel(79).level,1);
 assert.equal(fishingLevel(4250).level,11,'425 catches reach Island Coastline');});

test('a level-1 angler only lands N and R fish; a practiced one lands every rarity',()=>{
 let s=stocked();
 for(let n=0;n<150;n++)s=castAt(s,'Village River');
 const early=new Set(fishingState(s).catches.slice(0,8).map(c=>rarityOf(c.fish)));
 assert.deepEqual([...early].sort(),['N','R'],'the first eight catches (still level 1) are N and R only');
 // Positive control: the same ground at a high fishing level does produce the rarer tiers.
 let expert=withCatches(stocked(),5000);
 assert.equal(fishingLevel(fishingIndex(fishingState(expert)).exp).level,30,'5,000 catches are 50,000 fishing EXP');
 const before=fishingState(expert).catches.length;
 for(let n=0;n<600;n++)expert=castAt(expert,'Village River');
 const late=new Set(fishingState(expert).catches.slice(before).map(c=>rarityOf(c.fish)));
 for(const r of ['N','R','SR','SSR','UR'])assert.ok(late.has(r),r);
 assert.deepEqual(decode(JSON.stringify(expert)),expert);});

test('odds follow the level row and drop rarities the ground does not hold',()=>{
 const f=fishingState(fresh(T));
 assert.deepEqual(castOdds(f,'Village River').map(o=>[o.rarity,o.chance]),[['N',.5],['R',.5],['SR',0],['SSR',0],['UR',0]]);
 const odds=castOdds(fishingState(withCatches(fresh(T),5000)),'Village River');
 assert.ok(Math.abs(odds.reduce((n,o)=>n+o.chance,0)-1)<1e-9,'chances renormalise to one');});

test('grounds open at their fishing level; no ground or the Event pool cannot be cast',()=>{
 const s=stocked();
 assert.match(act(s,'castFish',s.lastAt,castKey(s),'Unfrozen Sea Cave').error,/fishing level 30/);
 assert.match(act(s,'castFish',s.lastAt,castKey(s),'Drakenberg River Bank').error,/fishing level 2/);
 assert.match(act(s,'castFish',s.lastAt,castKey(s),null).error,/Choose a fishing ground/);
 assert.match(act(s,'castFish',s.lastAt,castKey(s),'Event').error,/Choose a fishing ground/);
 // Negative control: the same cast succeeds once the angler has the level.
 const trained=withCatches(stocked(),5000);
 assert.equal(fishingLevel(fishingIndex(fishingState(trained)).exp).level,groundLevel('Unfrozen Sea Cave'));
 const r=castAt(trained,'Unfrozen Sea Cave');
 assert.ok(FISH.find(x=>x.id===fishingState(r).catches.at(-1).fish).locations.includes('Unfrozen Sea Cave'));});

test('a saved cast always resolves to the same fish',()=>{
 let s=stocked();for(let n=0;n<30;n++)s=castAt(s,'Village River');
 const a=castAt(s,'Village River'),b=castAt(structuredClone(s),'Village River');
 assert.equal(fishingState(a).catches.at(-1).fish,fishingState(b).catches.at(-1).fish);});

test('the starting bait no longer fills the tank: day one reaches only Village River species',()=>{
 let s=fresh(T);
 while(fishingState(s).bait>0)s=castAt(s,'Village River');
 const species=new Set(fishingState(s).catches.map(c=>c.fish));
 assert.ok(species.size<=10,'Village River holds 10 species');
 assert.ok(species.size<FISH.length/4,`${species.size} species from the starting bait`);
 assert.ok(fishingState(s).catches.length>20,'new entries still return their bait');});
