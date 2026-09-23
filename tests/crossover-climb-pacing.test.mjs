import test from 'node:test';import assert from 'node:assert/strict';
import {originalCost,qualityRule,DAILY_BREACH,SOURCE_MATERIALS} from '../lib/original-progression.mjs';
import {CROSSOVER_RARITY_TIERS} from '../lib/crossover-rarity.mjs';

// ---------------------------------------------------------------------------------------------------
// THE N -> UR BALANCE CONTRACT (owner ruling 2026-09-23).
//
// A crossover character is born at quality tier 1 and shows the badge for the tier it has climbed to
// (lib/crossover-rarity.mjs). UR is tier 11, so UR is the TENTH breakthrough, and every breakthrough is
// refused unless the Fellow is already AT its current level cap (lib/original-progression.mjs:146). So
// the climb is a level ladder -- 100, 150, ... 550 -- priced by the original's own HeroLevel EXP column.
//
// Measured against the 30-day pacing fixture (630M Fellow EXP earned in 30 days, ~21M/day at that
// maturity): N -> SSR is about half a day of income, SSR+ -> UR about twelve, and the owner's targets
// are a first UR in roughly 4-8 weeks with later ones faster, because every EXP faucet (mine clearance,
// school rank, stage depth) scales with the Fellow Power the climb produces.
//
// The owner's ruling was to LEAVE THE CURVE ALONE -- these are the original's numbers and the shape is
// wanted: the last break is 63% of the whole climb (the original's table doubles at level 500, 995,000
// EXP/level -> 2,000,000), so a character is cheap to make USEFUL (an SSR staffs a building, an expo
// stall or a trading-post seat exactly as well as a UR) and expensive to make marquee. This file exists
// so that shape cannot drift silently: a change to the EXP column, the tier caps, the material costs or
// the badge ladder has to come here and restate the contract.
// ---------------------------------------------------------------------------------------------------

/** EXP to reach a level from 1, on the original's column. Pure table: no save state is involved. */
const cumulative=level=>{let c=0;for(let l=1;l<level;l++)c+=originalCost(l);return c};

test('the N -> UR climb costs what the balance contract says', ()=>{
 // Positive control: the EXP column really is the original's, with its step at level 500. If this row
 // ever reads flat, the rungs below are being measured against a curve nobody imported.
 assert.deepEqual([originalCost(499),originalCost(500),originalCost(549)],[995000,2000000,4450000]);

 // badge, level gate, cumulative EXP -- one row per breakthrough, tier 1 -> tier 11.
 assert.deepEqual([...Array(10)].map((_,i)=>{
  const to=i+2,cap=qualityRule(to-1).cap;
  return [CROSSOVER_RARITY_TIERS[to-1],cap,cumulative(cap)];
 }),[
  ['N',   100,        71160],
  ['R',   150,       266240],
  ['R',   200,       749990],
  ['SR',  250,      2032490],
  ['SR',  300,      5262490],
  ['SSR', 350,     11732490],
  ['SSR', 400,     24182490],
  ['SSR+',450,     49082490],
  ['SSR+',500,     92707490],
  ['UR',  550,    253957490],
 ]);

 // The shape the contract is about: the last break alone is 63% of the climb, and reaching the first
 // genuinely useful badge (SSR, tier 7) is under 5% of it.
 const total=cumulative(550);
 assert.equal(Math.round((total-cumulative(500))/total*100),63);
 assert.equal(Math.round(cumulative(350)/total*100),5);
});

test('breakthrough materials are never the bottleneck', ()=>{
 const need={};
 for(let q=1;q<=10;q++)for(const c of qualityRule(q).consume)need[c.id]=(need[c.id]||0)+c.count;
 assert.deepEqual(need,{
  Item_Breach_Hero_1_1:19,Item_Breach_Hero_1_2:19,Item_Breach_Hero_1_3:19,
  Item_Breach_Hero_2_1:69,Item_Breach_Hero_2_2:69,Item_Breach_Hero_2_3:69,
 });
 // Positive control: those six are real material ids the daily claim actually stocks.
 for(const id of Object.keys(need))assert.ok(Object.hasOwn(SOURCE_MATERIALS,id),id);
 // One daily claim stocks DAILY_BREACH of EVERY material, so the six accrue in parallel: the whole
 // climb's materials are banked in 7 days of claims, against months of EXP. Levels are the gate.
 assert.equal(DAILY_BREACH,10);
 assert.equal(Math.max(...Object.values(need).map(n=>Math.ceil(n/DAILY_BREACH))),7);
});
