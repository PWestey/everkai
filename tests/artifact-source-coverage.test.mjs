import test from 'node:test';import assert from 'node:assert/strict';
import rules from '../lib/artifact-rules.json' with {type:'json'};
import {ARTIFACT_CAP,artifactRule,artifactBonus} from '../lib/artifacts.mjs';
import {GEAR} from '../lib/adventure.mjs';

// F11 data-coverage guard. lib/artifact-rules.json is an IMPORT, not a local invention, and until now
// nothing in the suite said so: artifacts.test.mjs and artifact-expansion.test.mjs exercise the
// BEHAVIOUR (ore is spent, copies move, recycling refuses equipped copies) but never assert that a
// single number in the table still matches the original's.
//
// Re-measured 2026-09-15 against the full 1,499-table config set at
// .../apk-audit/configs/config/logic/ (positive control per CLAUDE.md rule 2: that directory returns
// Wife 33, City 15, SimGame3 21). All four imported fields matched 89/89 -- the row this guard
// replaces claimed only "84/84 and 83/83":
//
//   initial   <- Equipment.initialTalent                                         89/89
//   perLevel  <- Equipment.riseTalent                                            89/89
//   ore       <- Equipment.levelupConsume[0].count (Item_Strengthen_Equipment_1) 89/89
//   recycle   <- split_reward/reward_equipmentsmelt.json content count of the
//                same ore item, resolved through Equipment.smeltReward          89/89
//
// The one record with no `recycle` (Item_Weapon_Equipment_6_5) is not a gap in the import: its
// Reward_EquipmentSmelt row genuinely pays no Item_Strengthen_Equipment_1, so `null` IS the measured
// value and forgeCost/recycleArtifact refuse it rather than inventing a price.
//
// These sums are the guard. They are cheap, they are exact, and any edit that adds, drops or retypes
// a record moves at least one of them, which is what the per-field assertions above cannot do from
// inside CI (the config set lives outside the repo and is not shipped).
const RECORDS=89,SUM_INITIAL=3729,SUM_PER_LEVEL=540,SUM_ORE=5400,SUM_RECYCLE=35045,UNPRICED='Item_Weapon_Equipment_6_5';

test('all 89 artifact records still carry their imported Equipment numbers',()=>{
 const ids=Object.keys(rules.records);
 assert.equal(ids.length,RECORDS,'the imported artifact record count has moved');
 for(const [id,r] of Object.entries(rules.records)){
  assert.ok(Number.isInteger(r.initial)&&r.initial>=1,`${id}: initial must be a positive integer (Equipment.initialTalent)`);
  assert.ok(Number.isInteger(r.perLevel)&&r.perLevel>=1,`${id}: perLevel must be a positive integer (Equipment.riseTalent)`);
  assert.ok(Number.isInteger(r.ore)&&r.ore>=1,`${id}: ore must be a positive integer (Equipment.levelupConsume count)`);
  // Measured invariant across all 99 Equipment rows, not an assumption: levelupConsume[0].count is
  // exactly 10 x riseTalent for every artifact in the original. It ties the two imported halves of
  // the upgrade economy together, so a typo in either one is caught here rather than shipping.
  assert.equal(r.ore,10*r.perLevel,`${id}: the original prices one artifact level at 10 x riseTalent`);
  assert.ok(r.recycle===null||Number.isInteger(r.recycle)&&r.recycle>=1,`${id}: recycle must be null or a positive integer`);
 }
 assert.equal(ids.filter(id=>rules.records[id].recycle===null).length,1,'exactly one artifact has no measured smelt reward');
 assert.equal(rules.records[UNPRICED].recycle,null,`${UNPRICED} is the one artifact the original smelts for no ore`);
 assert.equal(ids.reduce((n,id)=>n+rules.records[id].initial,0),SUM_INITIAL,'sum of initialTalent has drifted from the import');
 assert.equal(ids.reduce((n,id)=>n+rules.records[id].perLevel,0),SUM_PER_LEVEL,'sum of riseTalent has drifted from the import');
 assert.equal(ids.reduce((n,id)=>n+rules.records[id].ore,0),SUM_ORE,'sum of levelupConsume has drifted from the import');
 assert.equal(ids.reduce((n,id)=>n+(rules.records[id].recycle||0),0),SUM_RECYCLE,'sum of smelt rewards has drifted from the import');
});

test('every shipped artifact is backed by a record, and level 1 aptitude is the record initial',()=>{
 assert.equal(GEAR.length,RECORDS,'the shop roster and the imported record set must stay the same size');
 for(const g of GEAR){
  const r=artifactRule(g.id);
  assert.ok(r,`${g.id} is sold but carries no imported rule row`);
  // A level-one artifact is worth exactly its initialTalent, with no growth term yet. This is the
  // original's own arithmetic: EquipmentLevel.coefficientADH is level-1 for all 1,000 rows, and the
  // server reads talent as initialTalent + riseTalent * coefficientADH.
  assert.equal(g.aptitude,r.initial,`${g.id}: shop aptitude must be the imported initialTalent`);
  assert.equal(artifactBonus({gear:g.id,gearLevel:1}),0,`${g.id}: level 1 adds no growth`);
  assert.equal(artifactBonus({gear:g.id,gearLevel:2}),r.perLevel,`${g.id}: level 2 adds exactly one riseTalent`);
  assert.equal(artifactBonus({gear:g.id,gearLevel:ARTIFACT_CAP}),r.perLevel*(ARTIFACT_CAP-1),`${g.id}: the cap adds riseTalent x (cap-1)`);
 }
});

test('the artifact level cap is the original levelMax, not a local ceiling',()=>{
 // Equipment.levelMax is 200 for all 99 rows in the original and EquipmentLevel prices 1,000 levels,
 // so 200 is the game's own limit rather than Everkai's. The old value here was a provisional 20.
 assert.equal(ARTIFACT_CAP,200,'ARTIFACT_CAP must stay at the original Equipment.levelMax of 200');
 // The best artifact at the cap: +70 base +7/level x 199 = 1,463 Aptitude, which is why moving this
 // constant moves the roster ceiling. tests/fellow-power.test.mjs pins that consequence.
 const best=GEAR.slice().sort((a,b)=>b.aptitude-a.aptitude)[0];
 assert.equal(best.aptitude+artifactBonus({gear:best.id,gearLevel:ARTIFACT_CAP}),1463);
});
