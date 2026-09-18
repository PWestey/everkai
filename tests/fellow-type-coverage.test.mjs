import test from 'node:test';import assert from 'node:assert/strict';
import {FELLOWS,fellowById} from '../lib/catalog.mjs';
import insightData from '../lib/insight-data.json' with {type:'json'};
import {insightRule} from '../lib/insight.mjs';
import {canOperate} from '../lib/businesses.mjs';

// F3 coverage guard. A Fellow's `type` is one of the original's five countries, and it is the key that
// SEVEN separate systems match on: canOperate (typed businesses), insightRule, fishingBonuses,
// frontierPower, stellaBonus, the farm essence exchange and education. A Fellow whose type is null is
// not "missing a label" -- it is silently locked out of all of them at once, and nothing failed.
//
// That is exactly what had happened. hero_60 (Kamakura) has no record in lib/public-roster.json, the
// wiki snapshot that supplies type and rarity, so `referenceProfile` returned {rarity:null,type:null}
// and the Fellow was inert in every typed system, including a whole +300 Aptitude Insight track. The
// original is unambiguous that it should not be: Hero.json row "60" carries country "5", rarity 3, and
// lists Hero_Talent_Country5Base_1 in its heroBaseSkill. Fixed 2026-09-15 by an APK supplement in
// lib/public-reference.mjs plus the matching eligibleFellows entry in lib/insight-data.json.
//
// Measured against the full 1,499-table config set (positive control per CLAUDE.md rule 2: it returns
// Wife 33, City 15, SimGame3 21). Joining all 159 shipped Fellows to Hero.json on id:
//   - type vs country 1..5 -> Inspiring/Diligent/Brave/Informed/Unfettered: 158/159 already agreed,
//     hero_60 was the single disagreement and is now 159/159.
//   - insight eligibility vs heroBaseSkill containing the rule's skillId: 158/159 already agreed,
//     hero_60 was the single miss and is now 159/159, with zero Everkai-only extras in any rule.
// The config set is not shipped and CI cannot read it, so the assertions below are the in-repo guard:
// they say every Fellow is typed and every typed Fellow reaches its own Insight rule, which is the
// property the join established.

const TYPES=['Inspiring','Diligent','Brave','Informed','Unfettered'];

test('every shipped Fellow carries one of the five original types',()=>{
 assert.equal(FELLOWS.length,111,'the Fellow roster size has moved (159 before the 2026-09-17 roster trim)');
 const untyped=FELLOWS.filter(f=>!f.type).map(f=>`${f.id} (${f.name})`);
 assert.deepEqual(untyped,[],
  `these Fellows have no type and are therefore inert in businesses, insight, fishing, frontier, `+
  `stella and the farm essence exchange: ${untyped.join(', ')}`);
 for(const f of FELLOWS)assert.ok(TYPES.includes(f.type),`${f.id}: '${f.type}' is not one of the original's five countries`);
 // The original's five countries, and roughly even. A silent collapse to one type would still pass
 // the checks above, so pin the split.
 const split={};for(const f of FELLOWS)split[f.type]=(split[f.type]||0)+1;
 // 32/32/32/33/30 before the owner's 2026-09-17 roster trim. The trim was made per character, not per
 // type, so the split stayed roughly even: Informed is the tightest at 18 and still fills every
 // Informed business (tests/businesses.test.mjs pins that floor).
 assert.deepEqual(split,{Unfettered:25,Diligent:25,Brave:20,Inspiring:23,Informed:18});
 assert.equal(Object.values(split).reduce((a,b)=>a+b,0),FELLOWS.length);
});

test('every shipped Fellow carries a rarity',()=>{
 const unrated=FELLOWS.filter(f=>!f.rarity).map(f=>`${f.id} (${f.name})`);
 assert.deepEqual(unrated,[],`these Fellows have no rarity: ${unrated.join(', ')}`);
});

test('every Fellow listed in an Insight rule can actually reach it',()=>{
 assert.equal(insightData.rules.length,5,'there must be exactly one Insight I rule per country');
 const shipped=new Set(FELLOWS.map(f=>f.id));
 let reachable=0;
 for(const rule of insightData.rules){
  assert.equal(rule.supportedLevels,300,`${rule.type}: SkillBase gives every Base_1 maxUpgradeLevel 300`);
  assert.equal(rule.aptitude,1,`${rule.type}: SkillBase gives Base_1 skillProp_Level 1`);
  for(const id of rule.eligibleFellows){
   if(!shipped.has(id))continue;                       // listed but not in the shipped roster
   reachable++;
   // insightRule returns null unless fellowById(id).type equals the rule's type, so a listed Fellow
   // with a drifted or missing type silently loses its whole Insight track. This is the assertion
   // that hero_60 failed.
   assert.equal(fellowById(id).type,rule.type,`${id} is listed under ${rule.type} but is typed '${fellowById(id).type}'`);
   assert.equal(insightRule(id),rule,`${id} is listed under ${rule.type} but insightRule() refuses it`);
  }
 }
 assert.equal(reachable,111,'every shipped Fellow must reach exactly one Insight rule (159 before the 2026-09-17 trim)');
});

test('hero_60 is typed Unfettered and is no longer locked out of typed systems',()=>{
 // The regression this file was written for. Kamakura is APK country 5 / rarity 3.
 const f=fellowById('hero_60');
 assert.equal(f.type,'Unfettered');
 assert.equal(f.rarity,'SR');
 assert.equal(insightRule('hero_60')?.type,'Unfettered','hero_60 must be able to train Unfettered Insight I');
 // And the business gate, the other half of the same bug: canOperate matches on the same field.
 assert.equal(canOperate('hero_60',{type:'Unfettered'}),true);
 assert.equal(canOperate('hero_60',{type:'Brave'}),false);
});
