import data from './character-skill-guide.json' with {type:'json'};
import {talentRule} from './talents.mjs';
import {ADDITION_FELLOWS} from './everkai-additions.mjs';
const profiles=new Map(data.profiles.map(p=>[p.id,p]));
// An addition's guide is its template's, minus the template's own costume talents (Hero_Clothes_Talent_*).
for(const f of ADDITION_FELLOWS){const t=profiles.get(f.template);if(t)profiles.set(f.id,{...t,id:f.id,name:f.name,template:f.template,skills:t.skills.filter(n=>!String(n.id).startsWith('Hero_Clothes_Talent_'))})}
export const characterSkills=id=>profiles.get(id);
export function isPlayableTalent(id,node){const r=talentRule(id);return profiles.get(id)?.category==='fellows'&&!!r&&profiles.get(id).skills.some(n=>n.id===node?.id)&&node?.id===`Hero_Talent_Base_${r.amount}`&&node.lines.includes('Unlock: Default')&&node.lines.includes(`+${r.amount} Aptitude per level`);}
