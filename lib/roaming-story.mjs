import data from './roaming-scenes.mjs';
import {ROAM_FAMILY} from './roaming-data.mjs';
// The original numbers each roaming Family member's meetings; bond thresholds for them are not in the readable text.
// Local pacing: the numbered meetings are spread evenly across the bond goal, so the joining meeting plays the last one.
export const ROAM_SCENES=data.scenes;
export const roamScenesFor=id=>ROAM_SCENES.filter(s=>s.characterId===id);
const beforeJoin=id=>roamScenesFor(id).filter(s=>s.step!=='After');
export function roamStoryStep(id,bond){
 const f=ROAM_FAMILY.find(x=>x.id===id),pre=beforeJoin(id);
 if(!f||!pre.length||!Number.isInteger(bond)||bond<1)return null;
 return pre[Math.min(pre.length-1,Math.floor((Math.min(bond,f.bondGoal)-1)*pre.length/f.bondGoal))];
}
export const roamAfterStory=id=>roamScenesFor(id).find(s=>s.step==='After')||null;
/** The story a roaming record plays: the meeting reached by that bond, or the after-joining scene for an invited roaming member. */
export function roamStoryFor(h){
 if(h?.kind==='bond'||h?.kind==='joined')return roamStoryStep(h.target,h.amount);
 if(h?.kind==='intimacy'&&ROAM_FAMILY.some(f=>f.id===h.target))return roamAfterStory(h.target);
 return null;
}
/** Every story a player has reached with a member; all of them once the member has joined, however they joined. */
export function roamUnlockedStories(game,id){
 const f=ROAM_FAMILY.find(x=>x.id===id);if(!f)return [];
 const joined=!!game.family?.[id],bond=joined?f.bondGoal:(game.roaming?.bonds?.[id]||0),pre=beforeJoin(id),at=bond?pre.indexOf(roamStoryStep(id,bond)):-1,after=joined?roamAfterStory(id):null;
 return [...pre.slice(0,at+1),...(after?[after]:[])];
}
