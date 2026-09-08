// Combat10: authored deterministic critical system; versions1–9 remain unchanged.
import data from './familiar-crit-data.json' with {type:'json'};
import {modifier,effectiveAttack,effectiveSpeed,statusTargets,supportAmount,statusDamage,tickStatuses} from './familiar-support-combat.mjs';
import {putDotStatus} from './familiar-dot-combat.mjs';
import {applyBasicHeal} from './familiar-trigger-combat.mjs';
export function criticalBase(id){const b=data.bases.find(x=>x.id===id);if(!b)throw Error('Missing explicit critical stats for '+id);return b;}
export const criticalUnit=u=>({...u,...(u.side===0?criticalBase(u.id):data.guardians)});
const sum=(u,kind)=>u.statuses.filter(s=>s.kind===kind).reduce((n,s)=>n+s.value,0);
export const criticalRating=u=>u.critBP+sum(u,'crit');
export const criticalChance=(caster,target)=>Math.max(0,Math.min(10000,(caster.critAtCast??criticalRating(caster))-target.resistanceBP-sum(target,'critRes')));
export function criticalRoll({floor,round,attacker,target,hitOrdinal=0}){let h=2166136261;for(const c of `10:crit:${floor}:${round}:${attacker}:${target}:${hitOrdinal}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h%10000;}
export function criticalHit(target,caster,ratio,event){const critChanceBP=criticalChance(caster,target),critRollBP=criticalRoll({...event,attacker:caster.id,target:target.id}),critical=critRollBP<critChanceBP;const hit=statusDamage(target,Math.floor(caster.ATK*ratio*(caster.outgoing??1)*(critical?1.5:1)));return {...hit,critical,critChanceBP,critRollBP};}
export function putCriticalStatus(target,caster,rule,round,name){
 if(!['crit','critRes'].includes(rule.kind))return putDotStatus(target,caster,rule,round,name);
 if(target.hp<=0)return null;const key=caster.id+':'+rule.kind,entry={key,source:caster.id,kind:rule.kind,value:rule.basisPoints,remaining:rule.turns,appliedRound:round,name};target.statuses=target.statuses.filter(s=>s.key!==key);target.statuses.push(entry);return entry;
}
export function criticalBattle(initial,floor,skillFor){
 const units=initial.map(u=>({...u,statuses:[]})),log=[];let rounds=0;
 for(let round=1;round<=15;round++){
  rounds=round;const order=[...units].sort((a,b)=>effectiveSpeed(b)-effectiveSpeed(a)||a.side-b.side||a.slot-b.slot);
  for(const u of order){
   if(u.hp<=0)continue;const target=units.find(t=>t.side!==u.side&&t.hp>0);if(!target)continue;
   const skill=u.rage===100,rule=skill&&u.side===0?skillFor(u.id):null;
   if(rule){
    u.rage=0;const caster={...u,ATK:effectiveAttack(u),outgoing:modifier(u,'dealt'),critAtCast:criticalRating(u)},effects=rule.effects|| (rule.status?[{...rule.status,recipient:'primary'}]:[]);
    const apply=(t,e)=>{const effect=putCriticalStatus(t,caster,e,round,rule.name);if(effect)log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'status',name:rule.name,status:effect.kind,value:effect.value,turns:effect.remaining,damage:0});};
    for(const [hitOrdinal,t] of statusTargets(units,u,rule,floor,round).entries()){
     if(rule.kind==='heal'){const damage=Math.min(t.HP-t.hp,supportAmount(caster,t,rule));t.hp+=damage;log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'heal',name:rule.name,damage});}
     if(rule.kind==='damage'){const hit=criticalHit(t,caster,rule.percent/100,{floor,round,hitOrdinal});t.rage=Math.min(100,t.rage+25);log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'damage',name:rule.name,...hit});}
     for(const e of effects.filter(e=>e.recipient==='primary'))apply(t,e);
    }
    for(const e of effects.filter(e=>e.recipient==='self'))apply(u,e);
    continue;
   }
   const hit=criticalHit(target,{...u,ATK:effectiveAttack(u),outgoing:modifier(u,'dealt'),critAtCast:criticalRating(u)},skill?2:1,{floor,round,hitOrdinal:0});u.rage=skill?0:Math.min(100,u.rage+25);target.rage=Math.min(100,target.rage+25);log.push({round,attacker:u.id,target:target.id,side:u.side,skill,...hit});
   if(!skill)applyBasicHeal(units,u,round,log);
  }
  tickStatuses(units,round,log);
  if([0,1].some(side=>!units.some(u=>u.side===side&&u.hp>0)))break;
 }
 const hp=side=>units.filter(u=>u.side===side).reduce((n,u)=>n+u.hp,0),playerHP=hp(0),enemyHP=hp(1);
 return {won:playerHP>enemyHP,rounds,playerHP,enemyHP,log};
}
