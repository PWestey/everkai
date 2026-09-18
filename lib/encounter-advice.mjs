import {originalProgression} from './original-progression.mjs';
import {stageAt,stageCost,stageReady,ladderPower,adventureAction,levelTrainingPlan,fellowCap,pearlPrice} from './adventure.mjs';
import {talentAction} from './talents.mjs';
import {FRONTIER,frontierPower} from './frontier.mjs';
import {fellowById} from './catalog.mjs';
export function encounterAdvice(s,frontier=false){
 const a=frontier?s.frontier?.active:null,e=a?FRONTIER[a.encounter-1]:null,stage=!frontier?stageAt(s.adventure.cleared+1):null;
 if(frontier&&!a||!frontier&&!stage)return null;
 const ids=a?a.party:s.adventure.party,eligible=a&&e.distinct?ids.filter(id=>!a.used.includes(id)):ids;
 // The campaign is measured against roster Power (the quantity the original's atk column is divided
 // by); the Frontier is still measured against its party, which is what the Frontier fights with.
 const measure=state=>a?Math.max(0,...eligible.map(id=>frontierPower(state,a,id))):ladderPower(state),required=a?e.waves[a.wave].power:stage.atk,power=measure(s);
 // A normal stage has no Power requirement -- Power only sets the price -- so "short of gold" is the
 // only way it can be blocked, and more Power is a legitimate answer to that because it lowers the bill.
 const entry=!frontier?stageCost(stage,power):0;
 if(!frontier&&!stage.boss&&entry!==null&&s.gold<entry)return {power,required,options:s.pending>=1?[{action:'collect',target:null,value:null,after:power,label:'Collect village gold',detail:`${Math.floor(s.pending).toLocaleString()} gold is waiting. This stage costs ${entry.toLocaleString()} gold at your Power.`}]:[],resources:[`You have ${s.gold.toLocaleString()} gold; this stage costs ${entry.toLocaleString()} at your current Power. The price falls as Power rises (it scales with the fourth root of enemy Power over yours). Village businesses accumulate gold while you play or are away.`],ready:false,blockedOnGold:true};
 if(a?power>=required:stageReady(stage,power,s.gold))return {power,required,options:[],resources:[],ready:true};
 const applicable=a&&e.waves[a.wave].mode==='solo'?eligible:ids;
 const candidates=[];
 for(const id of ids){const f=s.fellows[id],name=fellowById(id).name;
  for(const [action,value] of [['train','max'],['trainTalent','max'],['aptitude','max'],['fellowSkill',null],['limitBreak',null]]){
   if(a&&e.waves[a.wave].mode==='solo'&&!eligible.includes(id))continue;
   const result=action==='trainTalent'?talentAction(s,action,id,value):adventureAction(s,action,id,value);if(result.error)continue;
   let after=measure(result.state),extra='';if(action==='limitBreak'){const plan=levelTrainingPlan(result.state,id);if(!plan.count)continue;const trained=adventureAction(result.state,'train',id,'max');after=measure(trained.state);extra=` Then train ${plan.count} levels for ${plan.cost.toLocaleString()} EXP; this button only raises the cap.`;}
   if(after<=power)continue;
   const cost=action==='train'?`${s.fellowXP-result.state.fellowXP} EXP`:action==='trainTalent'||action==='aptitude'?`${s.inventory.Item_Talent_Hero_1-result.state.inventory.Item_Talent_Hero_1} pearls`:action==='fellowSkill'?`${s.inventory.local_skill_scroll-result.state.inventory.local_skill_scroll} scrolls`:`${s.inventory.local_limit_token-result.state.inventory.local_limit_token} tokens`;
   const source={train:'EXP comes from stage victories, cleared-stage patrols and School.',trainTalent:'Pearls come from first clears, Workshop store or Bag & shop.',aptitude:'Pearls come from first clears, Workshop store or Bag & shop.',fellowSkill:'Scrolls come from every third opening stage, Frontier victories or Bag & shop.',limitBreak:'Tokens come from every fifth opening stage, Frontier chapter finales or Bag & shop.'}[action];
   const verb={train:'Train levels',trainTalent:'Train talent',aptitude:'Train local Aptitude',fellowSkill:'Improve skill',limitBreak:'Raise level cap'}[action];
   candidates.push({action,target:id,value,after,label:`${verb} · ${name} · ${cost}`,detail:`${action==='limitBreak'?'After subsequent training':'Projected effective Power'}: ${after.toLocaleString()}${after>=required?' · meets this requirement':''}.${extra} ${source}`});
  }
 }
 // One best option per action, retaining choices across resource types.
 const best=new Map();for(const c of candidates)if(!best.has(c.action)||best.get(c.action).after<c.after)best.set(c.action,c);
 const options=[...best.values()].sort((x,y)=>y.after-x.after).slice(0,3);
 const resources=[];
 if(!options.some(o=>o.action==='train')&&applicable.some(id=>s.fellows[id].level<fellowCap(s.fellows[id],s,id)))resources.push(s.adventure.cleared?`EXP: ${s.fellowXP.toLocaleString()} owned. Cleared-stage patrols award EXP; their gold deposit returns on victory.`:`EXP: ${s.fellowXP.toLocaleString()} owned. Opening stage victories award EXP.`);
 if(applicable.some(id=>s.fellows[id].aptitude<1000)){
  resources.push(`Skill Pearls: ${s.inventory.Item_Talent_Hero_1}. First clears and the Workshop store provide pearls; Bag & shop sells them from ${pearlPrice(s.shopPearls||0).toLocaleString()} gold each.`);
  if(!s.inventory.Item_Talent_Hero_1&&s.gold>=pearlPrice(s.shopPearls||0)+(entry||0)&&options.length<3)options.push({action:'buySupply',target:'Item_Talent_Hero_1',value:1,after:power,label:`Buy 1 Skill Pearl · ${pearlPrice(s.shopPearls||0).toLocaleString()} gold`,detail:'Adds to your bag. Choose an Aptitude or supported talent upgrade afterward; buying alone adds no Power.'});
 }
 if(!originalProgression(s)&&applicable.some(id=>s.fellows[id].level===fellowCap(s.fellows[id],s,id)&&s.fellows[id].breaks<13))resources.push(`Limit-Break Tokens: ${s.inventory.local_limit_token}. Opening stages5/10/15/20/25/30 and Frontier chapter finales award tokens; Bag & shop also sells them.`);
 return {power,required,options,resources,ready:false};
}
