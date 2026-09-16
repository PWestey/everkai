import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,act,valid} from '../lib/game.mjs';
import {operationSlots,BUSINESSES} from '../lib/businesses.mjs';
const data=JSON.parse(readFileSync(new URL('../lib/business-data.json',import.meta.url),'utf8'));

// BUG-42 claimed Everkai had "a DIFFERENT MECHANIC, not a wrong number": that the original caps Fellow
// slots at five and SELLS the fifth for 5,000, while Everkai ramps slots with employee count. The row
// warned -- correctly -- that it must not be patched by swapping constants.
//
// It was a false premise, and the decompiled client settles every part of it:
//
//   MainCityManager:GetBuildingUnlockHeroNum(buildingId)
//     local _num = building.level or 0
//     local conditon = zxSystemConstant.CityHeroUnlockCondition        -- [0,50,200,800,5000]
//     for k, val in ipairs(conditon or {}) do
//       if _num < val then return k - 1 end
//     end
//     return buildingQualityConf and buildingQualityConf.heroLimit      -- 5
//
// There is no cost anywhere in it: the "5,000" on the locked fifth slot is the NEXT THRESHOLD being
// displayed, not a price. And `building.level` is not an upgrade level -- the client aliases it twice,
// `local staffCount = building.level` (Doc_Player_MainCityManager.lua:390) and `staff_num =
// response.building.level` (:513). It is the staff count, which is exactly what Everkai passes.
//
// CityHero5UnlockPlayerLevel = 40 was read on an earlier pass as a missing fifth-slot gate. It is
// declared in SystemConstants.lua and READ NOWHERE -- a dead constant, the same shape as FishBookRank,
// which this very row cites as the reason a constant matching a constant proves nothing.
//
// So this file exists to stop the "fix": Everkai's rule already IS the original's.
const ORIGINAL_CONDITION=[0,50,200,800,5000];   // System.json CityHeroUnlockCondition
const ORIGINAL_HERO_LIMIT=5;                    // BuildingQuality.heroLimit, 5 on all 469 rows

/** The original's own function, transcribed from the Lua above, so the two can be compared directly. */
const originalSlots=staff=>{
 for(let k=1;k<=ORIGINAL_CONDITION.length;k++)if(staff<ORIGINAL_CONDITION[k-1])return k-1;
 return ORIGINAL_HERO_LIMIT;
};

test('Everkai`s slot rule is the original`s function, not a local invention',()=>{
 assert.deepEqual(data.slotThresholds,ORIGINAL_CONDITION,'the thresholds are CityHeroUnlockCondition');
 // Compared across every boundary and either side of it, not at a few hand-picked points.
 const probes=new Set([0,1,49,50,51,199,200,201,799,800,801,4999,5000,5001,26000]);
 for(const n of probes)assert.equal(operationSlots(n),originalSlots(n),`staff ${n}`);
 assert.equal(operationSlots(0),1,'a new building opens with one slot');
 assert.equal(operationSlots(5000),ORIGINAL_HERO_LIMIT,'and tops out at heroLimit');
 // Positive control: the transcribed function is not trivially equal to Everkai's -- it really does
 // step, so agreement above means something.
 assert.notEqual(originalSlots(0),originalSlots(5000));});

test('slots are never sold: no cost appears anywhere in opening one',()=>{
 // The row's whole premise was a purchase. Assignment refuses on the THRESHOLD and spends nothing.
 let s=fresh(new Date('2026-09-16T09:00:00').getTime());
 const id=BUSINESSES[0].id;
 const opened=act(s,'openEnterprise',s.lastAt,id);
 assert.equal(opened.error,undefined,opened.error);
 s=opened.state;
 const before={gold:s.gold,crystals:s.crystals};
 // With one slot open, a second assignment must be refused for want of STAFF, not of money.
 const first=act(s,'assignOperator',s.lastAt,id,'hero_15');
 if(!first.error){
  s=first.state;
  const second=act(s,'assignOperator',s.lastAt,id,Object.keys(s.fellows)[0]);
  if(second.error)assert.match(second.error,/employee|staff|hire/i,`refused for the wrong reason: ${second.error}`);
 }
 assert.equal(s.gold,before.gold,'opening a slot cost no gold');
 assert.equal(s.crystals,before.crystals,'and no crystals');
 assert.ok(valid(s));});

test('the fifth-slot player-level constant is dead in the original, so Everkai omits it correctly',()=>{
 // CityHero5UnlockPlayerLevel = 40 exists in SystemConstants.lua and nothing reads it. Everkai has no
 // such gate, and that is FAITHFUL rather than missing. Pinned so the next reader does not add it.
 assert.equal(operationSlots(5000),ORIGINAL_HERO_LIMIT,
  'the fifth slot opens on staff alone -- if a player-level gate is ever added, this is the line to argue with');});
