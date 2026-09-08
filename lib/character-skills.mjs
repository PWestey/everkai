import data from './character-skill-guide.json' with {type:'json'};
import {talentRule} from './talents.mjs';
const profiles=new Map(data.profiles.map(p=>[p.id,p]));
export const characterSkills=id=>profiles.get(id);
export function isPlayableTalent(id,node){const r=talentRule(id);return profiles.get(id)?.category==='fellows'&&!!r&&profiles.get(id).skills.some(n=>n.id===node?.id)&&node?.id===`Hero_Talent_Base_${r.amount}`&&node.lines.includes('Unlock: Default')&&node.lines.includes(`+${r.amount} Aptitude per level`);}
