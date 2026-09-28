// COSTUME SKILLS -- catalogue F9, slice A. Everkai's wardrobe used to say "This sandbox costume grants
// no stat bonuses" on collection. In the original a costume is a progression system, and this is the
// part of it that needs no invented economy.
//
// LEVEL 1 IS OWNING IT. A costume's skills scale with its level, and levels come from duplicate chips
// out of an event economy Everkai has no counterpart for -- but `HeroClothes.consume` is one chip and
// that is the UNLOCK, so a collected costume is level 1 and everything level 1 pays is sourced.
// scripts/import-costume-skills.py resolves the ladders at that level and asserts the result.
//
// TWO SKILLS, and only one of them is about the wearer:
//   self  -- HeroClothes.clothesTalentSkill, `self`-scoped talent, at `talentSkillBaseLevel`. Paid to
//            the costume's own owner. 43 of the 85 shipped costumes, ~55 talent each.
//   halo  -- `country`-scoped talent, paid to EVERY Fellow of that type whether they own a costume or
//            not. 69 of the 85, and it comes from Family costumes too: WifeClothesHaloSkill1 is
//            `target: hero`, so a Family member's outfit lifts Fellows. This is the bulk of the value
//            and the reason F9 is not a reward for owning the right characters -- 450 to 1,140 talent
//            per country, reaching the 133 crossover Fellows through TYPE_COUNTRY like everything else.
//
// OWNING pays, not WEARING. UnderlingData.lua:97-117 walks a hero's costume list and reads each one's
// skill data; it never asks which is equipped.
//
// OUT OF THIS SLICE, deliberately: levelling (no chip economy), and the ClothesExtraEffect half --
// 2,182 rows paying `atk` and `maxLevel` through `skill` and `bless` scopes lib/hero-scope.mjs does
// not implement. `deferredPercentHalos` records the 33 Family percent halos that unlock at level 2.
import data from './costume-skill-data.json' with {type:'json'};
import {reaches} from './hero-scope.mjs';

const ROWS=data.costumes;
// Read straight off the save rather than through wardrobe.mjs: that module now prints what a costume
// pays when it is collected, and importing it back here would make the two circular.
const owns=(s,id)=>!!s?.wardrobe?.owned?.[id];
export const COSTUME_SKILL_LEVEL=data.modelledLevel;          // 1
export const DEFERRED_PERCENT_HALOS=Object.freeze(data.deferredPercentHalos.map(Object.freeze));
export const costumeSkillRow=id=>ROWS[id]||null;

/** Every collected costume, once, so both contributors walk the same list. */
const collected=s=>Object.keys(ROWS).filter(id=>owns(s,id));

/** The talent a Fellow gets from costumes THEY own. `owner` is written by the importer FROM
 *  lib/wardrobe-data.json, so it cannot disagree with the catalogue -- a test pins that. */
export function costumeSelfTalent(s,fellowId){
 let n=0;
 for(const id of collected(s)){
  const r=ROWS[id];
  if(r.self&&r.owner===fellowId)n+=r.self.talent;
 }
 return n;
}

/** The talent a Fellow gets from every collected costume scoped to their country -- theirs or not. */
export function costumeHaloTalent(s,fellowId){
 let n=0;
 for(const id of collected(s)){
  const h=ROWS[id].halo;
  if(h&&reaches(['country',h.country],fellowId))n+=h.talent;
 }
 return n;
}

/** What the wardrobe screen shows for one costume. */
export function costumeSkillSummary(id){
 const r=ROWS[id];
 if(!r)return null;
 return {self:r.self?r.self.talent:0,halo:r.halo?{country:r.halo.country,talent:r.halo.talent}:null};
}

/** The country totals, for the screen's "what your collection broadcasts" line. */
export function costumeHaloTotals(s){
 const by={};
 for(const id of collected(s)){
  const h=ROWS[id].halo;
  if(h)by[h.country]=(by[h.country]||0)+h.talent;
 }
 return by;
}
