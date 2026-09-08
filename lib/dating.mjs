import {fishingDateBonus} from './fishing.mjs';
// Local additive percentage stacking and whole-point rounding. Existing storage cap retained.
export function dateReward(s,id){const f=s.family[id];if(!f)return {base:0,percent:0,total:0,credited:0};const base=f.blessingPower,percent=fishingDateBonus(s),total=Math.floor(base*(100+percent)/100);return {base,percent,total,credited:Math.min(total,Math.max(0,1e9-f.points))}}
