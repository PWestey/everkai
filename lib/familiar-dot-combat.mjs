// Combat9 isolates basis-aware DOT. All earlier evaluators stay unchanged.
import {modifier,effectiveAttack,effectiveSpeed,statusTargets,supportAmount,putStatus as legacyPutStatus,statusDamage,tickStatuses} from './familiar-support-combat.mjs';
import {applyBasicHeal} from './familiar-trigger-combat.mjs';
export function putDotStatus(target,caster,rule,round,name){
 const effect=legacyPutStatus(target,caster,rule,round,name);
 if(effect&&['bleed','poison'].includes(rule.kind)&&rule.basis==='targetMaxHP')effect.value=Math.floor(target.HP*rule.percent/100*(caster.outgoing??1));
 return effect;
}
export function dotBattle(initial,floor,skillFor){
 const units=initial.map(u=>({...u,statuses:[]})),log=[];let rounds=0;
 for(let round=1;round<=15;round++){
  rounds=round;const order=[...units].sort((a,b)=>effectiveSpeed(b)-effectiveSpeed(a)||a.side-b.side||a.slot-b.slot);
  for(const u of order){
   if(u.hp<=0)continue;const target=units.find(t=>t.side!==u.side&&t.hp>0);if(!target)continue;
   const skill=u.rage===100,rule=skill&&u.side===0?skillFor(u.id):null;
   if(rule){
    u.rage=0;const caster={...u,ATK:effectiveAttack(u),outgoing:modifier(u,'dealt')},effects=rule.effects|| (rule.status?[{...rule.status,recipient:'primary'}]:[]);
    const apply=(t,e)=>{const effect=putDotStatus(t,caster,e,round,rule.name);if(effect)log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'status',name:rule.name,status:effect.kind,value:effect.value,turns:effect.remaining,damage:0});};
    for(const t of statusTargets(units,u,rule,floor,round)){
     if(rule.kind==='heal'){const damage=Math.min(t.HP-t.hp,supportAmount(caster,t,rule));t.hp+=damage;log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'heal',name:rule.name,damage});}
     if(rule.kind==='damage'){const hit=statusDamage(t,Math.floor(caster.ATK*rule.percent/100*caster.outgoing));t.rage=Math.min(100,t.rage+25);log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'damage',name:rule.name,...hit});}
     for(const e of effects.filter(e=>e.recipient==='primary'))apply(t,e);
    }
    for(const e of effects.filter(e=>e.recipient==='self'))apply(u,e);
    continue;
   }
   const hit=statusDamage(target,Math.floor(effectiveAttack(u)*(skill?2:1)*modifier(u,'dealt')));u.rage=skill?0:Math.min(100,u.rage+25);target.rage=Math.min(100,target.rage+25);log.push({round,attacker:u.id,target:target.id,side:u.side,skill,...hit});
   if(!skill)applyBasicHeal(units,u,round,log);
  }
  tickStatuses(units,round,log);
  if([0,1].some(side=>!units.some(u=>u.side===side&&u.hp>0)))break;
 }
 const hp=side=>units.filter(u=>u.side===side).reduce((n,u)=>n+u.hp,0),playerHP=hp(0),enemyHP=hp(1);
 return {won:playerHP>enemyHP,rounds,playerHP,enemyHP,log};
}
