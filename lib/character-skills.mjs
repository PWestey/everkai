import data from './character-skill-guide.json' with {type:'json'};
import {talentRule} from './talents.mjs';
import {insightRule} from './insight.mjs';
import {crossoverFlavour} from './crossover-abilities.mjs';
import {ADDITION_FELLOWS,ADDITION_FAMILY} from './everkai-additions.mjs';
const profiles=new Map(data.profiles.map(p=>[p.id,p]));
/** A crossover Fellow's guide is GENERATED, two rows, and both of them are trainable.
 *
 *  It used to be its template original's whole node list minus that original's costume talents, so
 *  Spider-Man's guide showed a stranger's six-rung awakening ladder and "Alraune's Gift" -- 25 rows of
 *  which 2 did anything. Measured over the shipped guide: of 2,040 fellow skill nodes only 316 are
 *  trainable (`isPlayableTalent` matches exactly one `Hero_Talent_Base_*` per Fellow, and Insight
 *  matches one node id); the other 1,724 print "Preview only - this skill can't be trained yet."
 *  A crossover Fellow has no pinned source page to preview, so previewing a stranger's page was the
 *  one thing the panel could not honestly do.
 *
 *  Two rows, not four (docs/crossover-abilities-plan.md 8, decision D3 -- the cheaper option taken):
 *  the SG3/Project analogues an original also carries are display-only, so adding them would add two
 *  untrainable rows per character for symmetry alone.
 *
 *  `name` is the RULE's canonical name, because resolveTalentProfile and isPlayableTalent compare
 *  against it; the flavour name lives beside it in `flavour`, derived from the row's own occupation. */
const LINES=(cap,amount)=>['Unlock: Default',`Base cap: ${cap}`,`+${amount} Aptitude per level`];
export function crossoverGuide(f){
 const rule=talentRule(f.id),insightNode=insightRule(f.id),flavour=crossoverFlavour(f.id);
 if(!rule||!insightNode||!flavour)return null;
 return {id:f.id,name:f.name,category:'fellows',archetype:flavour.archetype,generated:true,skills:[
  {id:`Hero_Talent_Base_${rule.amount}`,name:rule.name,flavour:flavour.talent,lines:LINES(300,rule.amount)},
  {id:insightNode.skillId,name:insightNode.name,flavour:flavour.insight,lines:LINES(insightNode.supportedLevels,insightNode.aptitude)},
 ]};
}
for(const f of ADDITION_FELLOWS){const g=crossoverGuide(f);if(g)profiles.set(f.id,g)}
// Family additions the same way, so the skill-guide dialog shows her NAME instead of "Character".
// Their template is an original Family member with no skill entries, so the guide shows its existing
// "no skill entries were published" state rather than borrowing another character's skills -- which
// is also why no crossover Family row may take a template that HAS skills (asserted by test).
for(const f of ADDITION_FAMILY){const t=profiles.get(f.template);if(t)profiles.set(f.id,{...t,id:f.id,name:f.name,template:f.template})}
export const characterSkills=id=>profiles.get(id);
export function isPlayableTalent(id,node){const r=talentRule(id);return profiles.get(id)?.category==='fellows'&&!!r&&profiles.get(id).skills.some(n=>n.id===node?.id)&&node?.id===`Hero_Talent_Base_${r.amount}`&&node.lines.includes('Unlock: Default')&&node.lines.includes(`+${r.amount} Aptitude per level`);}
