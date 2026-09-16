import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import inn from '../lib/inn-data.json' with {type:'json'};
import prog from '../lib/inn-progression-data.json' with {type:'json'};
import data from '../lib/inn-economy-data.json' with {type:'json'};
import {INN_DISH_LEVEL_CAP,INN_BASE_STAMINA,innDishLevel,innDishEarnings,innMaxDishEarnings,
 innDishUpgradeCost,innDishToNextLevel,innRecipeGold,innStationBuildGold,innQueueEarnings} from '../lib/inn-economy.mjs';
import {MAX_GOLD} from '../lib/limits.mjs';

// The Inn's money. Everything here was measured from the original config set at
// .../apk-audit/configs/config/logic/ -- SimGame1FoodLevel (4,000 rows = 80 dishes x 50 levels),
// SimGame1Food (80), SimGame1Kitchenware (10), SimGame1Level (21) -- never from a community reference.
//
// This file is the same shape of guard as inn-tables.test.mjs, for the same reason: a lookup table
// shorter than the range that indexes it, absorbed by a fallback, reads at runtime as a legitimately
// small number. The economy tables deliberately THROW instead of falling back, so the job here is to
// prove that every id the game can reach is actually present, and to pin the values themselves.

const DISH_IDS=inn.dishes.map(d=>String(d.id));
const STATION_IDS=inn.stations.map(s=>String(s.id));

test('the earnings, proficiency and price tables cover every dish and every station',()=>{
 assert.equal(DISH_IDS.length,80);assert.equal(STATION_IDS.length,10);
 assert.equal(data.tables.SimGame1FoodLevel,4000,'4,000 rows = 80 dishes x 50 levels; a different count means a different table');
 assert.equal(data.dishLevelCap,50);
 for(const id of DISH_IDS){
  for(const [table,what] of [[data.coin,'coin'],[data.dishLadder,'dishLadder'],[data.developGold,'developGold']])
   assert.ok(Object.hasOwn(table,id),`dish ${id} is missing from ${what}; every one of the 80 dishes must resolve`);
  assert.doesNotThrow(()=>innDishEarnings(id,1),`dish ${id} has no earnings`);
  assert.doesNotThrow(()=>innRecipeGold(id),`dish ${id} has no develop price`);
 }
 for(const id of STATION_IDS)assert.doesNotThrow(()=>innStationBuildGold(id),`station ${id} has no build price`);
 // ...and nothing extra, which is how a stale id would show up.
 assert.deepEqual(Object.keys(data.coin).sort(),[...DISH_IDS].sort());
 assert.deepEqual(Object.keys(data.stationBuildGold).sort(),[...STATION_IDS].sort());
 // The ladder index must point at a ladder that exists and is the full 49 steps (level 50 is terminal).
 assert.equal(data.ladders.length,5,'the 80 dishes share exactly 5 distinct proficiency ladders');
 for(const l of data.ladders){assert.equal(l.length,INN_DISH_LEVEL_CAP-1);assert.ok(l.every(n=>Number.isInteger(n)&&n>0));}
 for(const [dish,idx] of Object.entries(data.dishLadder))assert.ok(data.ladders[idx],`dish ${dish} points at ladder ${idx}, which does not exist`);
 // A missing id must be loud, not a quiet 0 -- this is the property that makes the coverage check above
 // worth anything at all.
 for(const fn of [d=>innDishEarnings(d,1),innRecipeGold,d=>innDishLevel(0,d)])assert.throws(()=>fn('999'),/no entry for 999/);
 assert.throws(()=>innStationBuildGold('11'),/no entry for 11/);
});

test('the earnings ladder is the original SimGame1FoodLevel, spot-pinned at both ends',()=>{
 // Written out by hand. A test that recomputed both sides from the same table would pass through any
 // value change at all. These four rows were read out of SimGame1FoodLevel directly.
 assert.equal(innDishEarnings('1',1),3500);      // _id 1001
 assert.equal(innDishEarnings('1',50),89250);    // _id 1050
 assert.equal(innDishEarnings('57',1),1000);     // _id 57001, the cheapest dish in the game
 assert.equal(innDishEarnings('80',50),408000000); // _id 80050, the dearest
 // Everkai paid 50 for every one of these. The cheapest point on the ladder is 20x that; the dearest is
 // 8,160,000x. This is the size of BUG-31.
 assert.equal(Math.min(...DISH_IDS.map(d=>innDishEarnings(d,1))),1000);
 assert.equal(Math.max(...DISH_IDS.map(d=>innMaxDishEarnings(d))),408000000);
 // Every dish is linear with step = base/2, monotonic, and integral across all 50 levels.
 for(const d of DISH_IDS){
  const c=[...Array(50)].map((_,n)=>innDishEarnings(d,n+1));
  assert.ok(c.every(Number.isInteger),`dish ${d} pays a non-integer`);
  assert.equal(new Set(c.slice(1).map((v,n)=>v-c[n])).size,1,`dish ${d} is not a straight ladder`);
  assert.equal(c[1]-c[0],c[0]/2,`dish ${d}'s step is not half its base`);
 }
 // Levels are clamped, not extrapolated: the table stops at 50 and so does the price.
 assert.equal(innDishEarnings('1',0),3500);assert.equal(innDishEarnings('1',999),89250);
});

test('dish level is bought with the finesse the Inn already banks, at the original consume ladder',()=>{
 // Both halves of this come from the original: finesse PER SERVING is
 // SimGame1KitchenwareLevel.proficiencyCount (lib/inn-progression-data.json finesseByLevel, 100 at
 // station level 1), and finesse PER DISH LEVEL is SimGame1FoodLevel.consume.
 assert.equal(prog.finesseByLevel[0],100,'a serving at station level 1 banks 100 proficiency');
 assert.equal(innDishUpgradeCost('1',1),100);   // SimGame1FoodLevel _id 1001 consume
 assert.equal(innDishUpgradeCost('1',2),300);   // _id 1002
 assert.equal(innDishUpgradeCost('1',49),1200000); // _id 1049, the last real step
 assert.equal(innDishUpgradeCost('1',50),null,'_id 1050 carries the terminator -1, so there is no step 50');
 // So dish 1 stands at level 1 until the first serving, level 2 at 100, level 3 at 100+300.
 assert.equal(innDishLevel(0,'1'),1);assert.equal(innDishLevel(99,'1'),1);
 assert.equal(innDishLevel(100,'1'),2);assert.equal(innDishLevel(399,'1'),2);
 assert.equal(innDishLevel(400,'1'),3);
 assert.equal(innDishToNextLevel(0,'1'),100);assert.equal(innDishToNextLevel(100,'1'),300);
 // The cap is reachable, which is the thing the 1e9 finesse ceiling in validInn has to allow. The
 // dearest ladder needs 83,415,600 proficiency for level 50 -- a twelfth of that ceiling.
 const totals=data.ladders.map(l=>l.reduce((a,b)=>a+b,0));
 // Written out by hand: the sum of SimGame1FoodLevel.consume over levels 1..49 for each of the five
 // ladders. Without this, a single wrong step anywhere in the 245 values passes unnoticed -- the cap
 // checks below read the same totals and would simply move with it.
 assert.deepEqual(totals,[10426950,20853900,36494325,52134750,83415600],'a proficiency step has moved');
 assert.deepEqual(data.ladders.map(l=>l[0]),[100,200,350,500,800],'the first step of each ladder has moved');
 // ...and which dishes use which ladder, in blocks, straight off the table.
 assert.deepEqual(DISH_IDS.map(Number).sort((a,b)=>a-b).map(d=>data.dishLadder[String(d)]),
  [...Array(10).fill(0),...Array(20).fill(1),...Array(20).fill(2),...Array(10).fill(3),...Array(20).fill(4)],
  'dishes 1-10, 11-30, 31-50, 51-60 and 61-80 each share one ladder in SimGame1FoodLevel');
 assert.ok(Math.max(...totals)<1e9,'level 50 must be reachable within the finesse ceiling validInn enforces');
 for(const d of DISH_IDS){
  const total=totals[data.dishLadder[d]];
  assert.equal(innDishLevel(total,d),INN_DISH_LEVEL_CAP,`dish ${d} cannot reach its own cap`);
  assert.equal(innDishLevel(total-1,d),INN_DISH_LEVEL_CAP-1,`dish ${d} reaches its cap one proficiency early`);
  assert.equal(innDishToNextLevel(total,d),null);
 }
 // A queue pays guest by guest, so the level can rise inside one queue. Five guests on dish 1 at 100
 // finesse each stand at levels 1,2,2,2,3 -- the figure tests/inn.test.mjs pins end to end.
 assert.equal(innQueueEarnings('1',0,100,5),3500+5250*3+7000);
 assert.equal(innQueueEarnings('1',0,100,5),26250);
 // ...and never more than the level-50 price a guest, which is the bound validInn reserves against.
 for(const d of ['1','57','80'])assert.ok(innQueueEarnings(d,0,480,10)<=10*innMaxDishEarnings(d));
});

test('station and recipe prices are the original SimGame1Kitchenware and SimGame1Food charges',()=>{
 // BUG-30. Everkai charged 100 * the station id: 100, 200, 300 ... 1,000. SimGame1Kitchenware.consume
 // names item id 3 (Item.json row 3: isCurrency, Icon_Gold_Big) and charges nothing for the first three
 // stations and 5,000 for the rest -- an overcharge of 100-300 and an undercharge of 5x to 12.5x.
 assert.deepEqual(STATION_IDS.map(innStationBuildGold),[0,0,0,5000,5000,5000,5000,5000,5000,5000]);
 // ECON-17. Developing was free. SimGame1Food.unlockConsume, in the same currency:
 assert.equal(innRecipeGold('1'),500);
 assert.equal(innRecipeGold('11'),24000);
 assert.equal(innRecipeGold('80'),368640000000);
 // The five guest-gated dishes genuinely cost nothing there, which is the only reason any recipe is
 // still free -- and it is a measured 0, not a missing row. Every other dish has a price.
 const free=DISH_IDS.filter(d=>innRecipeGold(d)===0).sort((a,b)=>a-b);
 assert.deepEqual(free,['30','45','54','56','57'],
  'the free recipes must be exactly the guest-gated set; a new zero here is a missing price, not a gift');
 assert.deepEqual(free,inn.dishes.filter(d=>d.station==='__guest__').map(d=>String(d.id)).sort((a,b)=>a-b));
 assert.ok(DISH_IDS.every(d=>innRecipeGold(d)<=MAX_GOLD),'a recipe nobody could ever afford is a data error');
});

test('a brand-new Inn starts at the original level-1 energy limit, and the rating ladder is unchanged',()=>{
 // BUG-23. SimGame1Level.energyLimit runs 10, 20, 30, 40, 50, then 60 for the rest. Everkai numbers
 // ratings from the exp thresholds, so its rating R is the original's LEVEL R+1 -- which makes
 // ratingStamina the original's rows 2..21, and leaves the unrated Inn with no row at all. The old
 // fallback filled that hole with 20, the original's level-2 figure, i.e. double.
 assert.equal(INN_BASE_STAMINA,10);
 assert.equal(data.staminaLadder.length,20);
 assert.deepEqual(prog.ratingStamina,data.staminaLadder,
  'lib/inn-progression-data.json ratingStamina must stay SimGame1Level energyLimit rows 2..21');
 assert.equal(prog.ratingStamina[0],20,'rating 1 is original level 2, which is where 20 legitimately lives');
 assert.ok(INN_BASE_STAMINA<prog.ratingStamina[0],'the unrated Inn must start below its first rated cap');
 // freshInn must actually use it rather than carrying its own literal.
 const SRC=readFileSync(new URL('../lib/inn.mjs',import.meta.url),'utf8');
 assert.match(SRC,/freshInn=\(\)=>\(\{served:0,stamina:INN_BASE_STAMINA/,
  'freshInn no longer takes its starting stamina from the measured table');
});
