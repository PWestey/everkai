import {MAX_FELLOW_XP} from './limits.mjs';
import {bondedPower,skillCost,breakCost,STAR_COSTS,fellowStars,levelTrainingPlan,fellowCap} from './adventure.mjs';
import {sourceTraining} from './training-costs.mjs';
import {originalProgression,qualityRule,sourceQuality} from './original-progression.mjs';
import {talentRule,talentLevel} from './talents.mjs';
import {insightRule,insightState,insightLevel} from './insight.mjs';
import {stellaRule,stellaState,stellaEntry} from './stella.mjs';
import {artifactRule,artifactState,gearLevel} from './artifacts.mjs';
import {summonState} from './summon.mjs';

// AUTO-OPTIMIZE AND REFUND ALL for one Fellow.
//
// The pair is built around one promise: anything Auto-optimize spends, Refund all can give back
// EXACTLY, and Refund all never gives back anything that was not provably paid. So both read the same
// `refundTracks()`: an investment is either priced by a record the validators already reconcile (training
// receipts, quality receipts, Stella history, recorded artifact Ore) or by a fixed per-step cost that
// every such step has always paid (skill scrolls, limit tokens, star shards, talent pearls, Insight), and
// Auto-optimize only spends on tracks Refund can undo. Nothing here adds state to the save.
//
// Deliberately NOT refunded (kept as they are):
//  - Levels without training receipts. Before APK training costs were switched on, levels were bought on
//    other curves (the old exponential curve, the opening's item-priced table), so their price is unknown.
//  - Local Aptitude bought 1:1 with Skill Pearls, essences, reforges and consumables. They all land in the
//    single `aptitude` number with no per-source counter, so which part came from pearls cannot be told.
//  - Fountain elixirs: their receipts are ordinal-numbered against the Fountain ledger.
//  - Artifact levels once any opening artifact upgrade has happened: that upgrade paid a Strengthen item
//    but recorded Ore, so a recorded Ore figure may include Ore that was never paid.
//  - Stella activation (it is free), the equipped artifact itself (unequipping is already free), and
//    lifetime counters such as `upgrades`.
// No per-Fellow investment is priced in gold or crystals, so neither is ever spent or returned.

const STOCK_CAP=1e6,ORE_CAP=1e9,INSIGHT_CAP=1e9;
const triangle=(n,cost)=>{let t=0;for(let k=0;k<n;k++)t+=cost(k);return t};

/** The per-step cost tables Refund prices with. They are the engine's own functions; tests pass a
 *  deliberately broken copy to prove the round-trip check notices a wrong row. */
export const REFUND_COSTS=Object.freeze({
 skill:k=>skillCost({skill:k}),
 breaks:k=>breakCost({breaks:k}),
 star:k=>STAR_COSTS[k],
});

/** Every pool a Fellow investment can draw on, across the whole village. Tests compare this before and
 *  after; gold and crystals are included so a refund that minted either would show. */
export function refundWallet(s){
 const w={gold:s.gold,crystals:s.crystals,fellowXP:s.fellowXP,starShards:summonState(s).starShards,ore:artifactState(s).ore};
 for(const [k,n] of Object.entries(s.inventory))w['item:'+k]=n;
 for(const [k,n] of Object.entries(insightState(s).balances))w['insight:'+k]=n;
 for(const [k,n] of Object.entries(stellaState(s).stock))w['stella:'+k]=n;
 for(const [k,n] of Object.entries(s.originalProgression?.stock||{}))w['breach:'+k]=n;
 return w;
}

/** Which investments on this Fellow are exactly refundable, and therefore which ones Auto-optimize may use. */
export function refundTracks(s,id){
 const f=s.fellows[id];if(!f)return null;
 const openingUpgrades=s.opening?.upgrades||0;
 return {
  levels:sourceTraining(s),
  quality:originalProgression(s),
  breaks:true,skill:true,stars:true,
  talent:!!talentRule(id),
  insight:!!insightRule(id),
  stella:!!stellaRule(id),
  artifact:!!artifactRule(f.gear)&&openingUpgrades===0&&(gearLevel(f)===1||f.gearOreSpent!==undefined),
 };
}

/** What Refund all would return and the state it would leave. Pure; returns {error} when it cannot be exact. */
export function refundPlan(s,id,costs=REFUND_COSTS){
 const f=s.fellows[id];if(!f)return {error:'Recruit this Fellow first.'};
 const t=refundTracks(s,id),back={},add=(k,n)=>{if(n)back[k]=(back[k]||0)+n};
 const kept=[];let next={...s},fellow={...f};

 // Levels: every receipt for this Fellow, back to its baseline. Receipts carry what was actually paid.
 if(t.levels){
  const mine=s.trainingCosts.receipts.filter(r=>r.id===id);
  if(mine.length){add('fellowXP',mine.reduce((n,r)=>n+r.cost,0));fellow.level=s.trainingCosts.baselineLevels[id]??1;next.trainingCosts={...s.trainingCosts,receipts:s.trainingCosts.receipts.filter(r=>r.id!==id)};}
 }
 if(fellow.level>1)kept.push(t.levels?`levels to ${fellow.level} (trained before APK costs)`:'levels (trained before APK training costs, so no price is on record)');

 // Quality breakthroughs, newest first, only while the remaining level still fits the lower cap.
 if(t.quality){
  const p=s.originalProgression,receipts=[...p.receipts],stock={...p.stock};let q=sourceQuality(s,id),changed=false;
  while(q>1){const i=receipts.findLastIndex(r=>r.id===id);if(i<0||fellow.level>qualityRule(receipts[i].from).cap)break;for(const c of receipts[i].cost){stock[c.id]+=c.count;add('breach:'+c.id,c.count);}q=receipts[i].from;receipts.splice(i,1);changed=true;}
  if(changed){const quality={...p.quality};if(q===1)delete quality[id];else quality[id]=q;next.originalProgression={...p,receipts,stock,quality};}
  if(q>1)kept.push('quality breakthroughs the kept level needs');
 }

 // Limit breaks, newest first, while the level fits (in APK growth the cap ignores breaks).
 while(fellow.breaks>0&&(originalProgression(s)||fellow.level<=fellowCap({...fellow,breaks:fellow.breaks-1},s,id))){add('item:local_limit_token',costs.breaks(fellow.breaks-1));fellow.breaks--;}
 if(fellow.breaks>0)kept.push('limit breaks the kept level needs');

 add('item:local_skill_scroll',triangle(fellow.skill,costs.skill));fellow.skill=0;
 if(fellowStars(fellow)){add('starShards',triangle(fellowStars(fellow),costs.star));delete fellow.stars;}

 let aptitude=fellow.aptitude;
 if(t.talent&&talentLevel(fellow)){const r=talentRule(id),n=talentLevel(fellow);add('item:Item_Talent_Hero_1',n*r.cost);aptitude-=n*r.amount;}
 delete fellow.talentLevel;delete fellow.originalTalent;
 if(t.insight&&insightLevel(s,id)){const r=insightRule(id),n=insightLevel(s,id),i=insightState(s);add('insight:'+r.materialId,n*r.cost);aptitude-=n*r.aptitude;const levels={...i.levels};delete levels[id];next.insight={...i,levels,balances:{...i.balances,[r.materialId]:(i.balances[r.materialId]||0)+n*r.cost}};}
 if(!Number.isInteger(aptitude)||aptitude<10)return {error:'This Fellow’s Aptitude record does not add up, so nothing was refunded.'};
 fellow.aptitude=aptitude;

 if(t.stella&&stellaEntry(s,id)){
  const old=stellaState(s),p=stellaRule(id),paid=old.history.filter(r=>r.owner===id&&r.level>0).reduce((n,r)=>n+r.paid,0);
  if(paid){add('stella:'+p.itemId,paid);next.stella={...old,seq:Math.min(1e9,old.seq+1),stock:{...old.stock,[p.itemId]:(old.stock[p.itemId]||0)+paid},history:old.history.filter(r=>!(r.owner===id&&r.level>0))};}
 }

 if(fellow.gear&&gearLevel(fellow)>1){
  if(t.artifact){add('ore',fellow.gearOreSpent);next.artifacts={...artifactState(s),ore:artifactState(s).ore+fellow.gearOreSpent};fellow.gearLevel=1;delete fellow.gearOreSpent;}
  else kept.push('artifact levels (their Ore was not fully recorded)');
 }

 if(back['item:local_skill_scroll']||back['item:local_limit_token']||back['item:Item_Talent_Hero_1']){const inventory={...s.inventory};for(const k of ['local_skill_scroll','local_limit_token','Item_Talent_Hero_1'])inventory[k]+=back['item:'+k]||0;next.inventory=inventory;}
 if(back.starShards){const r=summonState(s);next.summon={...r,seq:Math.min(1e9,r.seq+1),starShards:r.starShards+back.starShards};}
 if(back.fellowXP)next.fellowXP=s.fellowXP+back.fellowXP;

 // Caps: refuse rather than truncate, or the overflow would simply vanish.
 const after=refundWallet(next),full=Object.keys(back).filter(k=>after[k]>(k==='fellowXP'?MAX_FELLOW_XP:k==='ore'||k.startsWith('insight:')?(k==='ore'?ORE_CAP:INSIGHT_CAP):STOCK_CAP));
 if(full.length)return {error:`Not enough room to take everything back (${full.map(label).join(', ')}). Spend some first; nothing was refunded.`};
 if(!Object.keys(back).length)return {error:'Nothing on this Fellow can be refunded.',kept};
 next.fellows={...s.fellows,[id]:fellow};
 return {state:next,back,kept};
}

const LABELS={fellowXP:'EXP',starShards:'star shards',ore:'Magic Ore','item:local_skill_scroll':'scrolls','item:local_limit_token':'limit tokens','item:Item_Talent_Hero_1':'Skill Pearls'};
function label(k){return LABELS[k]||(k.startsWith('insight:')?'Insight':k.startsWith('stella:')?'Stella fragments':k.startsWith('breach:')?'breakthrough materials':k)}
export function describeAmounts(amounts){
 const merged={};for(const [k,n] of Object.entries(amounts))if(n)merged[label(k)]=(merged[label(k)]||0)+n;
 return Object.entries(merged).map(([k,n])=>`${n.toLocaleString('en-US')} ${k}`).join(', ');
}

/** One step for each refundable track, sized so a step stays small where tracks compete for the
 *  1,000 Aptitude ceiling (talent and Insight) and whole where the pool has no other use on this Fellow. */
function candidates(s,id){
 const t=refundTracks(s,id),f=s.fellows[id],list=[];
 if(t.levels)list.push(['train','max']);
 if(t.quality)list.push(['originalQuality',null]);
 else list.push(['limitBreak',null]);
 list.push(['fellowSkill',null]);
 if(t.talent)list.push(['trainTalent',5]);
 if(t.insight)list.push(['trainInsight',5]);
 list.push(['summonStar',{seq:summonState(s).seq}]);
 if(t.stella)list.push(stellaEntry(s,id)?['stellaUpgrade',{seq:stellaState(s).seq,count:1}]:['stellaActivate',{seq:stellaState(s).seq}]);
 if(t.artifact&&f.gear)list.push(['upgradeArtifactMax',null]);
 return list;
}

export const OPTIMIZE_MAX_STEPS=400;

/** Greedy: at each step take the refundable action with the best Power gain per share of its pool spent
 *  (spent / held before, the largest share when a step draws on several pools). A cap-raising step gains
 *  nothing alone, so it is scored by the Power after it AND the level training it unlocks. Free steps with a
 *  gain (Stella activation) go first. Stops when nothing raises Power or at OPTIMIZE_MAX_STEPS. Every step is
 *  the real action through act(), so no cost or limit can be skipped. */
export function optimizeFellow(s,id,act){
 if(!s.fellows[id])return {state:s,error:'Recruit this Fellow first.'};
 const start=refundWallet(s),before=bondedPower(s,id);let state=s,steps=0;
 for(;steps<OPTIMIZE_MAX_STEPS;steps++){
  const power=bondedPower(state,id),held=refundWallet(state);let best=null;
  for(const [action,value] of candidates(state,id)){
   const r=act(state,action,state.lastAt,id,value);if(r.error)continue;
   let gain=bondedPower(r.state,id)-power;
   if(gain<=0&&['limitBreak','originalQuality'].includes(action)&&refundTracks(r.state,id).levels&&levelTrainingPlan(r.state,id).count){const trained=act(r.state,'train',state.lastAt,id,'max');if(!trained.error)gain=bondedPower(trained.state,id)-power;}
   if(gain<=0)continue;
   const w=refundWallet(r.state);let share=0;for(const k of Object.keys(held))if(w[k]<held[k])share=Math.max(share,(held[k]-w[k])/held[k]);
   const score=share>0?gain/share:Infinity;
   if(!best||score>best.score)best={score,state:r.state};
  }
  if(!best)break;state=best.state;
 }
 if(!steps)return {state:s,error:'Nothing to spend: no materials this Fellow can use right now.'};
 const end=refundWallet(state),spent={};for(const k of Object.keys(start))if(end[k]<start[k])spent[k]=start[k]-end[k];
 const after=bondedPower(state,id);
 return {state,spent,message:`Auto-optimized · Power ${before.toLocaleString('en-US')} → ${after.toLocaleString('en-US')}${Object.keys(spent).length?` · spent ${describeAmounts(spent)}`:''}.`};
}

export function fellowResetAction(s,action,target,act,valid){
 if(!['optimizeFellow','refundFellow'].includes(action))return null;
 const fail=error=>({state:s,error});
 if(!s.fellows[target])return fail('Recruit this Fellow first.');
 if(action==='optimizeFellow'){const r=optimizeFellow(s,target,act);return r.error?fail(r.error):{state:r.state,message:r.message};}
 const plan=refundPlan(s,target);if(plan.error)return fail(plan.error);
 if(!valid(plan.state))return fail('This refund would not leave a valid village, so nothing was refunded.');
 return {state:plan.state,message:`Refunded ${describeAmounts(plan.back)}.${plan.kept.length?` Kept: ${plan.kept.join('; ')}.`:''} Power ${bondedPower(s,target).toLocaleString('en-US')} → ${bondedPower(plan.state,target).toLocaleString('en-US')}.`};
}
