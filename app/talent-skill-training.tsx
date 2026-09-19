import {Button} from '@/components/ui/button';
import {heroTalentSkills,talentSkillUnlocked,talentSkillLevel,talentSkillCap,talentSkillPlan,talentSkillParts,advancePlan,TALENT_SKILLS,SKILL_PEARL} from '@/lib/talent-skills.mjs';
import {magicRule,pledgeRule,magicLevel,pledgeLevel,magicBonus,pledgeOpen,originRule,originLevel} from '@/lib/hero-advance.mjs';
import {originParts} from '@/lib/hero-stars.mjs';
import {stellaState,SPIRIT_SHARD_ITEM} from '@/lib/stella.mjs';
// Every talent skill the original gives this Fellow (lib/talent-skills.mjs), plus Rarity Advance and Pledge
// (lib/hero-advance.mjs). The Fellow's own Base talent and Insight I keep their own panels above.
const LOCK:any={rarity:(u:any)=>`Rarity Advance ${u.level}`,stella:(u:any)=>`Stella rank ${u.rank}`,star:(u:any)=>`${u.star}★`,pledge:(u:any)=>`Pledge ${u.level}`};
const short=(id:string)=>id.replace(/^Hero\d*_Talent_/,'').replace(/^Hero_Talent_/,'').replace(/_/g,' ');
export default function TalentSkillTraining({id,game,action,locked}:any){
 const list=heroTalentSkills(id) as any[],magic=magicRule(id),pledge=pledgeRule(id),origin=originRule(id);if(!game.fellows[id]||(!list.length&&!magic&&!pledge&&!origin))return null;
 const parts=talentSkillParts(game,id),shards=stellaState(game).stock[SPIRIT_SHARD_ITEM]||0,total=parts.skills+parts.intimacy+parts.stella+parts.stellaBond+parts.rarity+parts.stage;
 const track=(kind:'magic'|'pledge'|'origin',rule:any,level:number,label:string,note:string)=>{if(!rule)return null;return <div className="training-option" key={kind}><div><strong>{label} · Lv. {level}/{rule.max}</strong><p>{note} · {rule.cost} Stella shards a level · {shards.toLocaleString()} held</p></div><div className="business-actions">{([1,10,'max'] as const).map(amount=>{const p=advancePlan(game,id,kind,amount);return <Button key={amount} disabled={locked||!p.count} onClick={()=>kind==='magic'?action('rarityAdvance',id,amount):kind==='origin'?action('originBoost',id,amount):action('pledgeAdvance',id,amount)}>{amount==='max'?'Max':`+${amount}`} · Lv. {p.level} · {p.cost.toLocaleString()} shards</Button>})}</div></div>};
 return <div className="talent-skills"><p><strong>Talent skills · +{total.toLocaleString()} Aptitude</strong> (skills {parts.skills.toLocaleString()} · intimacy {parts.intimacy} · Stella {(parts.stella+parts.stellaBond).toLocaleString()} · Rarity Advance {(parts.rarity+parts.stage).toLocaleString()})</p>
  {track('magic',magic,magicLevel(game,id),'Rarity Advance',`+${magicBonus(id,magicLevel(game,id)).toLocaleString()} Aptitude now`)}
  {origin&&(()=>{const o=originParts(id,originLevel(game,id));return track('origin',origin,originLevel(game,id),'Origin Boost',`+${o.talent} Aptitude · +${o.percent/100}% Power · +${o.coef/100}% Aptitude`)})()}
  {pledge&&(pledgeOpen(game,id)?track('pledge',pledge,pledgeLevel(game,id),'Pledge','unlocks talent skills at 30 / 60 / 100'):<p className="small-note">Pledge opens at {pledge.open[0]==='HeroMagicLevel'?'Rarity Advance':'Fellow level'} {pledge.open[1]}.</p>)}
  {list.map(({skill,unlock}:any)=>{const r=(TALENT_SKILLS as any)[skill],open=talentSkillUnlocked(game,id,skill),level=talentSkillLevel(game,id,skill),cap=talentSkillCap(game,id,skill),pearl=r.c===SKILL_PEARL;
   return <div className="training-option" key={skill}><div><strong>{short(skill)} · {open?`Lv. ${level}/${cap}`:`locked · ${LOCK[unlock.kind]?.(unlock)||'locked'}`}</strong><p>+{r.l} Aptitude a level for {r.p} {pearl?'Skill Pearls':'Insight'}{open?` · now +${(r.i+(level-1)*r.l).toLocaleString()}`:''}</p></div>
    {open&&<div className="business-actions">{([1,25,'max'] as const).map(amount=>{const p=talentSkillPlan(game,id,skill,amount);return <Button key={amount} disabled={locked||!p.count} onClick={()=>action('trainTalentSkill',id,{skill,amount})}>{amount==='max'?'Max':`+${amount}`} · Lv. {p.level} · {p.cost.toLocaleString()} {pearl?'pearls':'Insight'}</Button>})}</div>}</div>})}
 </div>;
}
