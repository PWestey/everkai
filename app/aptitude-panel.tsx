import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {AptitudeHeader} from './fellow-shell';
import {SpendControls,type Quantity} from './original-controls';
import {talentRule,talentLevel,talentTrainingPlan,talentCap} from '@/lib/talents.mjs';
import {insightRule,insightState,insightLevel,insightTrainingPlan} from '@/lib/insight.mjs';
import {heroTalentSkills,talentSkillUnlocked,talentSkillLevel,talentSkillCap,talentSkillPlan,advancePlan,TALENT_SKILLS,SKILL_PEARL} from '@/lib/talent-skills.mjs';
import {magicRule,pledgeRule,magicLevel,pledgeLevel,magicBonus,pledgeOpen,originRule,originLevel} from '@/lib/hero-advance.mjs';
import {originParts} from '@/lib/hero-stars.mjs';
import {stellaState,SPIRIT_SHARD_ITEM} from '@/lib/stella.mjs';
import {aptitudeTrainingPlan,skillCost} from '@/lib/adventure.mjs';
import CharacterSkillGuide from './character-skill-guide';
import {PEARL_APTITUDE_CAP} from '@/lib/aptitude-cap.mjs';
/** THE APTITUDE SECTION, built to docs/fellow-screen-specs/06-aptitude.md and measured on
 *  img/aptitude-skill.png and img/aptitude-origin-boost.png.
 *
 *  THE FINDING THE CAPTURES MAKE: Aptitude is TWO INDEPENDENT LADDERS behind folder tabs, not one.
 *  Tab 1 is per-SKILL and paid in Skill Pearls; tab 2, `Origin Boost`, is per-FELLOW, runs to Lv. 600
 *  and pays milestone rewards every 50 levels. Everkai already has both -- `heroTalentSkills`,
 *  `talentRule`, `insightRule`, `magicRule`, `pledgeRule` on one side and `originRule` on the other --
 *  and showed them as a stack of bare `training-option` rows with three sentence-long buttons each.
 *
 *  Tab 1 is a scrolling medallion strip with the selected ladder's detail beneath it, so a Fellow's
 *  ladders are visible and switchable in one tap (difference A1: Everkai showed one skill and gave no
 *  way to see the others). The detail is the original's two-line shape: `Name  Level n/max` then
 *  `Aptitude +v (Next Level +v')` -- the actual current value and the actual next value, not a rate
 *  statement like `+1 Aptitude per level` (A5).
 *
 *  Tab 2 is the original's standard long-ladder drawing: reward medallions over a segmented bar with
 *  milestone pills under it. Everkai had no milestone track at all (A2). Every number in it comes from
 *  `originRule(id)` -- HeroLRSpSkill, imported -- and nothing is invented: the two Power milestones at
 *  Lv. 50/100 and the Aptitude ones every 50 from 150 are that table's own rows.
 *
 *  NO BALANCE CHANGE. Every ladder still spends its own currency at its own price through its own
 *  existing action; only the control around it changed (see lib/batch-amounts.mjs). */

type Ladder={
 key:string,name:string,tag:string,level:number,max:number,now:number,next:number,
 currency:string,have:number,unitCost:number,plan:(q:Quantity)=>{count:number,cost:number},run:(q:Quantity)=>void,
 locked?:string,extra?:{label:string,onClick:()=>void},effect?:string,suffix?:string};

/** Every Aptitude ladder this Fellow has, in the order the strip shows them. */
function ladders(game:any,id:string,action:any):Ladder[]{
 const f=game.fellows[id],out:Ladder[]=[];
 const pearls=game.inventory.Item_Talent_Hero_1,shards=stellaState(game).stock[SPIRIT_SHARD_ITEM]||0;
 const talent=talentRule(id);
 if(talent)out.push({key:'talent',name:talent.name,tag:'Aptitude Skill (Basic)',level:talentLevel(f),max:talentCap(game,id),
  now:talentLevel(f)*talent.amount,next:talent.amount,currency:'Skill Pearl',have:pearls,unitCost:talent.cost,
  plan:q=>talentTrainingPlan(game,id,q),run:q=>action('trainTalent',id,q)});
 const insight=insightRule(id);
 if(insight)out.push({key:'insight',name:insight.name,tag:'Insight',level:insightLevel(game,id),max:insight.supportedLevels,
  now:insightLevel(game,id)*insight.aptitude,next:insight.aptitude,currency:insight.type+' Insight',
  have:insightState(game).balances[insight.materialId]||0,unitCost:insight.cost,
  plan:q=>insightTrainingPlan(game,id,q),run:q=>action('trainInsight',id,q),
  // A6: Everkai's own habit refill stays, as a glyph button beside the selector rather than a
  // full-width labelled one.
  extra:{label:'Habit refill',onClick:()=>action('insightRefill',id)}});
 for(const {skill,unlock} of heroTalentSkills(id) as any[]){
  const r=(TALENT_SKILLS as any)[skill],open=talentSkillUnlocked(game,id,skill),level=talentSkillLevel(game,id,skill);
  const pearl=r.c===SKILL_PEARL;
  out.push({key:skill,name:String(skill).replace(/^Hero\d*_Talent_/,'').replace(/^Hero_Talent_/,'').replace(/_/g,' '),
   tag:'Aptitude Skill'+(pearl?' (Basic)':''),level,max:talentSkillCap(game,id,skill),
   now:open?r.i+(level-1)*r.l:0,next:r.l,currency:pearl?'Skill Pearl':'Insight',
   have:pearl?game.inventory[r.c]:(insightState(game).balances[r.c]||0),unitCost:r.p,
   locked:open?undefined:LOCK[unlock.kind]?.(unlock)||'Locked',
   plan:q=>talentSkillPlan(game,id,skill,q),run:q=>action('trainTalentSkill',id,{skill,amount:q})});
 }
 const magic=magicRule(id);
 if(magic)out.push({key:'magic',name:'Rarity Advance',tag:'Rarity',level:magicLevel(game,id),max:magic.max,
  now:magicBonus(id,magicLevel(game,id)),next:magicBonus(id,magicLevel(game,id)+1)-magicBonus(id,magicLevel(game,id)),
  currency:'Stella shard',have:shards,unitCost:magic.cost,plan:q=>advancePlan(game,id,'magic',q),run:q=>action('rarityAdvance',id,q)});
 const pledge=pledgeRule(id);
 if(pledge)out.push({key:'pledge',name:'Pledge',tag:'Pledge',level:pledgeLevel(game,id),max:pledge.max,now:0,next:0,
  currency:'Stella shard',have:shards,unitCost:pledge.cost,
  locked:pledgeOpen(game,id)?undefined:`${pledge.open[0]==='HeroMagicLevel'?'Rarity Advance':'Fellow level'} ${pledge.open[1]}`,
  plan:q=>advancePlan(game,id,'pledge',q),run:q=>action('pledgeAdvance',id,q)});
 out.push({key:'pearl',name:'Aptitude',tag:'Skill Pearl',level:f.aptitude,max:PEARL_APTITUDE_CAP,now:f.aptitude,next:1,
  currency:'Skill Pearl',have:pearls,unitCost:1,plan:q=>aptitudeTrainingPlan(game,id,q),run:q=>action('aptitude',id,q)});
 // Everkai's own Fellow skill sits on the same strip, named for what it actually pays. It is a Power
 // percent rather than Aptitude, so its effect line says so instead of being filed under Aptitude.
 out.push({key:'fellowSkill',name:'Fellow Skill',tag:'Skill Scroll',level:f.skill,max:20,now:(f.skill||0)*5,next:5,
  effect:'Power',suffix:'%',currency:'Skill Scroll',have:game.inventory.local_skill_scroll,unitCost:skillCost(f),
  plan:()=>({count:f.skill<20&&game.inventory.local_skill_scroll>=skillCost(f)?1:0,cost:skillCost(f)}),
  run:()=>action('fellowSkill',id)});
 return out;
}
const LOCK:any={rarity:(u:any)=>`Rarity Advance ${u.level}`,stella:(u:any)=>`Stella rank ${u.rank}`,star:(u:any)=>`${u.star}★`,pledge:(u:any)=>`Pledge ${u.level}`};
/** The medallion's ground carries the ladder's tier, as the capture's coloured discs do. */
const TIER:Record<string,string>={talent:'tier-blue',insight:'tier-green',magic:'tier-purple',pledge:'tier-orange',pearl:'tier-blue',fellowSkill:'tier-red'};
const monogram=(name:string)=>name.split(/\s+/).map(w=>w[0]).join('').slice(0,3).toUpperCase();

function SkillTab({game,id,action,locked}:any){
 const list=ladders(game,id,action),[pick,setPick]=useState(0),[q,setQ]=useState<Quantity>(1);
 const chosen=list[Math.min(pick,list.length-1)];
 if(!chosen)return null;
 // The cost line shows the real price even when nothing is affordable -- a `0/0` would hide it.
 const plan=chosen.plan(q),cost=plan.count?plan.cost:chosen.unitCost;
 return <>
  <div className="medallion-strip" role="tablist" aria-label="Aptitude skills">
   {list.map((l,i)=><button key={l.key} type="button" role="tab" aria-selected={i===pick}
    className={'medallion '+(TIER[l.key]||'tier-blue')+(l.locked?' medallion-locked':'')} onClick={()=>setPick(i)}>
    <span>{monogram(l.name)}</span><b>{l.locked?'🔒':l.level}</b></button>)}
  </div>
  <div className="ladder-detail">
   <p className="ladder-title"><strong>{chosen.name}</strong> <em>Level {chosen.level}/{chosen.max}</em>
    <span className="tag-pill">{chosen.tag}</span></p>
   <p className="ladder-effect">{chosen.locked
    ?<i className="ladder-gate">{chosen.locked}</i>
    :<>{chosen.effect||'Aptitude'} +{chosen.now.toLocaleString()}{chosen.suffix||''} <i>(Next Level +{chosen.next.toLocaleString()}{chosen.suffix||''})</i></>}</p>
  </div>
  <h4 className="band-rule">Improve Skill</h4>
  <div className="improve-row">
   <span className="improve-cost">Use {chosen.currency}<b>{chosen.have.toLocaleString()}/{cost.toLocaleString()}</b></span>
   <SpendControls quantity={q} onQuantity={setQ} label="Upgrade quantity"
    verb={plan.count?`Upgrade x${plan.count}`:'Upgrade'} disabled={locked||!plan.count}
    currency={chosen.currency==='Skill Pearl'?'Pearls':chosen.currency} have={chosen.have} cost={cost}
    onClick={()=>chosen.run(q)}/>
  </div>
  <div className="ladder-extras">
   {chosen.extra&&<Button variant="outline" disabled={locked} onClick={chosen.extra.onClick}>{chosen.extra.label}</Button>}
   <CharacterSkillGuide key={id} id={id} game={game} action={action} locked={locked}/>
  </div>
 </>;
}

function OriginTab({game,id,action,locked}:any){
 const rule=originRule(id),[q,setQ]=useState<Quantity>(1);
 if(!rule)return null;
 const level=originLevel(game,id),parts=originParts(id,level);
 const plan=advancePlan(game,id,'origin',q),cost=plan.count?plan.cost:rule.cost;
 const shards=stellaState(game).stock[SPIRIT_SHARD_ITEM]||0;
 // The milestone rows are HeroLRSpSkill's own: two Power steps, then an Aptitude step every 50.
 const stops=[...rule.percent.map((r:number[])=>({at:r[0],stat:'Power',value:'+'+r[1]/100+'%'})),
  ...rule.talentPercent.map((r:number[])=>({at:r[0],stat:'Aptitude',value:'+'+r[1]/100+'%'}))].sort((a,b)=>a.at-b.at);
 return <>
  <div className="milestone-track">
   <div className="milestone-row">{stops.map(s=><div key={s.at} className={'milestone'+(level>=s.at?' earned':'')}>
    <span>{s.stat}</span><b>{s.value}</b></div>)}</div>
   <div className="milestone-bar">{stops.map((s,i)=>{const from=i?stops[i-1].at:0,fill=Math.max(0,Math.min(1,(level-from)/(s.at-from)));
    return <i key={s.at}><u style={{width:fill*100+'%'}}/></i>})}</div>
   <div className="milestone-pills">{stops.map(s=><span key={s.at} className={level>=s.at?'reached':''}>Lv.{s.at}</span>)}</div>
  </div>
  <div className="ladder-detail">
   <p className="ladder-title"><strong>Origin Boost</strong> <em>Lv.{level}/{rule.max}</em></p>
   <p className="ladder-effect">Aptitude +{parts.talent.toLocaleString()} <i>(Next Level +{rule.talent})</i></p>
  </div>
  <div className="improve-row">
   <span className="improve-cost">Use Stella shard<b>{shards.toLocaleString()}/{cost.toLocaleString()}</b></span>
   <SpendControls quantity={q} onQuantity={setQ} label="Origin Boost quantity"
    verb={plan.count?`Upgrade x${plan.count}`:'Upgrade'} disabled={locked||!plan.count}
    currency="Shards" have={shards} cost={cost}
    onClick={()=>action('originBoost',id,q)}/>
  </div>
 </>;
}

export default function AptitudePanel({game,id,action,locked}:any){
 const [tab,setTab]=useState<'skill'|'origin'>('skill');
 const origin=originRule(id);
 // A section a Fellow cannot have is removed, not disabled: only four LR heroes carry HeroLRSpSkill.
 const showOrigin=!!origin;
 return <section className="aptitude-panel">
  {showOrigin&&<nav className="folder-tabs" aria-label="Aptitude tabs">
   <button type="button" aria-pressed={tab==='skill'} onClick={()=>setTab('skill')}>Aptitude Skill</button>
   <button type="button" aria-pressed={tab==='origin'} onClick={()=>setTab('origin')}>Origin Boost</button>
  </nav>}
  <AptitudeHeader game={game} id={id}/>
  {tab==='origin'&&showOrigin?<OriginTab game={game} id={id} action={action} locked={locked}/>
   :<SkillTab game={game} id={id} action={action} locked={locked}/>}
 </section>;
}
