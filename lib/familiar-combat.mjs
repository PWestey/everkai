import data from './familiar-combat-data.json' with {type:'json'};
import stats from './familiar-data.json' with {type:'json'};
import {familiarStage} from './familiars.mjs';
// PetSkill (192 rows) and PetBuff (137) -- together 42% of all familiar rows that had never been
// imported -- plus the six attribute columns Everkai never carried and the skill ids each familiar owns.
// scripts/import-familiar-combat.py holds the measurement; this module holds the two client functions.
//
// TRANSCRIBED, not inferred, from private-server/readable/PetInfo.lua:
//
//   GetAttrValue(attr, stage, level, star)                                      :763, :796
//     base = Pet[PetAttr[attr].Field]
//     ATK  x (1 + (PetClass[stage].ATKcoef + PetLevel[level].ATKcoef)/10000) x (1 + PetStar[star].ATKcoef/10000)
//     HP   the same with HPcoef
//     SPD  x (1 + (PetClass[stage].SPDadd + PetLevel[level].SPDadd)/10000)      -- NO star term
//     CRIT, CRIT_RES, Block, ACC, DI, DR are flat
//     then x (1 + skillAddRatio/10000) + skillAddValue, from the SkillType 4 rows whose EffectAttr is
//     this attribute (EffectNumType 1 -> ratio, 2 -> flat), floor
//
//   GetPower(stage, level, star)                                                :763
//     SUM over ALL NINE attrs of GetAttrValue(attr) x PetAttr[attr].CombatAdd,
//     x (1 + skillAddRatio/10000) where that ratio is Combatcoef(ActiveSkill) plus Combatcoef of each
//     PassiveSkillN whose stage gate is met, floor
//
// WHAT EVERKAI HAD: `ATK x 15 + HP x 1 + SPD x 30` -- three of the nine attributes, no skill ratio.
// The three it had are the three with the largest CombatAdd, which is why the old figure tracked the
// real one loosely enough to go unnoticed.
//
// COMBAT IS DELIBERATELY NOT CHANGED HERE. `familiarStats` (lib/familiars.mjs) is the function every
// stored tower battle replays through, and `validTower` re-derives them -- the combatVersion ladder
// versions the ENGINE, not the stat function, so changing ATK/HP/SPD would refuse every save holding a
// result at every version at once. The SkillType 4 modifiers therefore reach POWER here and not the
// battle; unifying them is a combatVersion 12 change with its own save check.
const ATTRS=Object.entries(data.attr);
const PASSIVE_STAGE=Object.entries(data.passiveUnlock).map(([stage,key])=>[Number(stage),key]);
export const FAMILIAR_COMBAT=data;
export const familiarSkill=id=>data.skills[String(id)]||null;
export const familiarBuff=id=>data.buffs[String(id)]||null;
/** The skill ids a familiar owns at this stage: its active, plus each passive whose stage gate is met. */
export function familiarSkillIds(id,progress){
 const row=data.pets[id];if(!row)return [];
 const stage=familiarStage(progress?.level||1),out=[];
 if(row.skills.ActiveSkill)out.push(row.skills.ActiveSkill);
 for(const [gate,key] of PASSIVE_STAGE)if(stage>=gate&&row.skills[key])out.push(row.skills[key]);
 return out;
}
/** GetAttrValue for all nine attributes. */
export function familiarAttrs(id,progress){
 const row=data.pets[id];
 if(!row)return null;
 const level=stats.levels[progress.level],stage=stats.classes[familiarStage(progress.level)],star=stats.stars[progress.stars]||{};
 // The SkillType 4 rows this familiar owns, indexed by the attribute they modify.
 const ratio={},flat={};
 for(const sid of familiarSkillIds(id,progress)){
  const s=data.skills[sid];
  if(!s||s.SkillType!==4||s.EffectAttr===undefined||s.EffectNum===undefined)continue;
  const a=String(s.EffectAttr);
  if(s.EffectNumType===1)ratio[a]=(ratio[a]||0)+s.EffectNum;
  else if(s.EffectNumType===2)flat[a]=(flat[a]||0)+s.EffectNum;
 }
 const out={};
 for(const [key,conf] of ATTRS){
  let v=row.attrs[conf.field]||0;
  if(conf.field==='ATK'||conf.field==='HP'){
   const suffix=conf.field+'coef';
   v=v*(1+((level[suffix]||0)+(stage[suffix]||0))/10000)*(1+(star[suffix]||0)/10000);
  }else if(conf.field==='SPD'){
   v=v*(1+((level.SPDadd||0)+(stage.SPDadd||0))/10000);
  }
  out[conf.field]=Math.floor(v*(1+(ratio[key]||0)/10000)+(flat[key]||0));
 }
 return out;
}
/** GetPower. Nine attributes by their CombatAdd, then the active and unlocked-passive Combatcoef. */
export function familiarCombatPower(id,progress){
 const attrs=familiarAttrs(id,progress);
 if(!attrs)return 0;
 let sum=0;
 for(const [,conf] of ATTRS)sum+=(attrs[conf.field]||0)*conf.combatAdd;
 let bp=0;
 for(const sid of familiarSkillIds(id,progress)){const s=data.skills[sid];if(s?.Combatcoef)bp+=s.Combatcoef;}
 return Math.floor(sum*(1+bp/10000));
}
