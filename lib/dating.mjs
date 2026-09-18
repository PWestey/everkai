import {fishingDateBonus} from './fishing.mjs';
import {FAMILY} from './catalog.mjs';
/** The pool a `date` roll draws from, in one place so game.mjs and the gallery panel cannot disagree
 *  about which index a roll lands on. It is the SAVE, not the flag-gated catalogue: an owned crossover
 *  Family member is dateable with ?crossover=1 off, where FAMILY does not list her. Ordered by the
 *  catalogue where it lists a member and by id after that, so the roll is stable. */
export function dateIds(s){
 const order=new Map(FAMILY.map((f,i)=>[f.id,i]));
 return Object.keys(s?.family||{}).sort((a,b)=>(order.get(a)??FAMILY.length)-(order.get(b)??FAMILY.length)||a.localeCompare(b));
}
// Local additive percentage stacking and whole-point rounding. Existing storage cap retained.
export function dateReward(s,id){const f=s.family[id];if(!f)return {base:0,percent:0,total:0,credited:0};const base=f.blessingPower,percent=fishingDateBonus(s),total=Math.floor(base*(100+percent)/100);return {base,percent,total,credited:Math.min(total,Math.max(0,1e9-f.points))}}
