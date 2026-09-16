import data from './public-roster.json' with {type:'json'};
import {originalCharacter,removedCharacter} from './original-catalog.mjs';
const freeze=value=>{if(value&&typeof value==='object'&&!Object.isFrozen(value)){Object.values(value).forEach(freeze);Object.freeze(value)}return value};
freeze(data);
const references=new Map(Object.entries(data.records).filter(([id])=>originalCharacter(id)));
const affinities=new Map([...references].map(([id,r])=>[id,Object.freeze([...new Set(r.blessedFellows||[])].filter(id=>originalCharacter(id)&&!removedCharacter(id)))]));
const affinitySets=new Map([...affinities].map(([id,ids])=>[id,new Set(ids)]));
const EMPTY=Object.freeze([]);
// F3, 2026-09-15. The public snapshot is the source for Fellow type and rarity, and it simply has no
// record for one shipped Fellow -- `hero_60` (Kamakura). That gap is not cosmetic: `type` is the key
// SEVEN systems match on, so a typed-null Fellow is silently excluded from all of them at once.
// canOperate (lib/businesses.mjs) refuses it for every typed business; insightRule (lib/insight.mjs)
// returns null so its whole +300 Aptitude Insight track is unreachable; and fishingBonuses,
// frontierPower, stellaBonus and the farm essence exchange all fall through their type comparison.
//
// The original has the answer and is unambiguous about it: `Hero.json` row `_id` "60" carries
// `country: "5"` and `rarity: 3`, and its `heroBaseSkill` list names `Hero_Talent_Country5Base_1`
// outright -- the Unfettered Insight I skill. So this is a hole in the WIKI snapshot, not a fact the
// original withholds, and filling it from the APK is recovery rather than invention.
//
// Both mappings were measured, not assumed, by joining the 281 snapshot records to Hero.json on id:
//   country 1..5 -> Inspiring / Diligent / Brave / Informed / Unfettered  (158/158 agreed)
//   rarity  1,2,3,4,5,6,9 -> N, R, SR, SSR, UR, UR*, SSR+                 (no counter-example)
// hero_60 is the ONLY Fellow of 159 missing either field, so this supplement is deliberately a single
// entry rather than a general fallback: a second gap should show up as a failing coverage test
// (tests/fellow-type-coverage.test.mjs), not be absorbed silently here.
const APK_SUPPLEMENT=freeze({hero_60:{rarity:'SR',type:'Unfettered'}});
// Keep local identity and artwork authoritative. The public snapshot is newer than the APK.
export const referenceFor=id=>references.get(id)||null;
export const affinityIds=id=>affinities.get(id)||EMPTY;
export const referenceProfile=id=>{const r=referenceFor(id),extra=APK_SUPPLEMENT[id];
 return {rarity:r?.rarity||extra?.rarity||null,type:r?.type||extra?.type||null}};

export const hasAffinity=(family,fellow)=>affinitySets.get(family)?.has(fellow)||false;
