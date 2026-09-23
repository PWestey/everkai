import {levelTrainingPlan,aptitudeTrainingPlan} from './adventure.mjs';
import {talentTrainingPlan} from './talents.mjs';
/** "SOMETHING HERE CAN BE IMPROVED RIGHT NOW" -- the predicate behind the roster card's red `!`
 *  badge (docs/fellow-screen-specs/01-roster.md, difference R4: "the original's red `!` is what makes
 *  the roster scannable at 58+ fellows and is the entry point to the whole upgrade loop").
 *
 *  It is a MEANS test, not a to-do list: true when this Fellow could take at least one step with what
 *  the village already holds. Three cheap checks cover the three currencies a player actually banks --
 *  Fellow EXP, Skill Pearls on the base talent, and Skill Pearls on raw Aptitude -- and each is one of
 *  the existing plan functions asked for a single step, so the badge can never disagree with the
 *  button it points at. Purely derived: nothing is stored, nothing is spent, no save changes shape. */
export const fellowHasUpgrade=(s,id)=>{
 if(!s?.fellows?.[id])return false;
 return levelTrainingPlan(s,id,1).count>0||talentTrainingPlan(s,id,1).count>0||aptitudeTrainingPlan(s,id,1).count>0;
};
