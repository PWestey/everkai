// Combat v5: frozen round order, additive modifiers and explicit cast snapshots.
export const modifier=(u,kind)=>Math.max(0,1+u.statuses.filter(s=>s.kind===kind).reduce((n,s)=>n+s.value,0)/100);
export const effectiveAttack=u=>Math.floor(u.ATK*modifier(u,'attack'));
export const effectiveSpeed=u=>Math.max(1,Math.floor(u.SPD*modifier(u,'speed')));
export function statusTargets(units,u,rule,floor,round){
 let pool=units.filter(t=>t.hp>0&&t.side===(['heal','shield','buff'].includes(rule.kind)?u.side:1-u.side));
 const row=rule.targeting?.toLowerCase();if(row?.includes('front')||row?.includes('back')){const selected=pool.filter(t=>row.includes('front')?t.slot<2:t.slot>=2);if(selected.length)pool=selected;}
 const hash=t=>{let h=2166136261;for(const c of `${floor}:${round}:${u.id}:${t.id}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
 if(row?.startsWith('random'))pool.sort((a,b)=>hash(a)-hash(b)||a.slot-b.slot);else if(row==='highestatk')pool.sort((a,b)=>effectiveAttack(b)-effectiveAttack(a)||a.slot-b.slot);else if(row==='highest')pool.sort((a,b)=>b.hp-a.hp||a.slot-b.slot);else if(!row||row==='lowest')pool.sort((a,b)=>a.hp-b.hp||a.slot-b.slot);
 return pool.slice(0,rule.targets);
}
export function putStatus(target,caster,rule,round,name){
 if(target.hp<=0)return null;const key=caster.id+':'+rule.kind,entry={key,source:caster.id,kind:rule.kind,value:['vulnerable','attack','speed','dealt'].includes(rule.kind)?rule.percent:Math.floor(caster.ATK*rule.percent/100*(['bleed','poison'].includes(rule.kind)?caster.outgoing??1:1)),remaining:rule.turns,appliedRound:round,name};
 target.statuses=target.statuses.filter(s=>s.key!==key);target.statuses.push(entry);return entry;
}
export function statusDamage(target,amount){
 const vulnerability=target.statuses.filter(s=>s.kind==='vulnerable').reduce((n,s)=>n+s.value,0);let pending=Math.floor(amount*Math.max(0,1+vulnerability/100)),absorbed=0;
 for(const shield of target.statuses.filter(s=>s.kind==='shield')){const used=Math.min(pending,shield.value);shield.value-=used;pending-=used;absorbed+=used;}
 const damage=Math.min(target.hp,pending);target.hp-=damage;return {damage,absorbed};
}
export function tickStatuses(units,round,log){
 // Resolve all DOT before any duration expiry, including opposing lethal effects.
 for(const u of units){if(u.hp<=0)continue;for(const s of u.statuses)if(round>s.appliedRound&&['bleed','poison'].includes(s.kind)&&u.hp>0){const hit=statusDamage(u,s.value);log.push({round,attacker:s.source,target:u.id,side:units.find(x=>x.id===s.source)?.side??0,skill:true,kind:s.kind,name:s.name+' · '+s.kind,...hit});}}
 for(const u of units){for(const s of u.statuses)if(round>s.appliedRound)s.remaining--;u.statuses=u.statuses.filter(s=>s.remaining>0&&(s.kind!=='shield'||s.value>0));}
}
export function statusBattle(initial,floor,skillFor){
 const units=initial.map(u=>({...u,statuses:[]})),log=[];let rounds=0;
 for(let round=1;round<=15;round++){
  rounds=round;const order=[...units].sort((a,b)=>effectiveSpeed(b)-effectiveSpeed(a)||a.side-b.side||a.slot-b.slot);
  for(const u of order){
   if(u.hp<=0)continue;const target=units.find(t=>t.side!==u.side&&t.hp>0);if(!target)continue;
   const skill=u.rage===100,rule=skill&&u.side===0?skillFor(u.id):null;
   if(rule){
    u.rage=0;const caster={...u,ATK:effectiveAttack(u),outgoing:modifier(u,'dealt')},effects=rule.effects|| (rule.status?[{...rule.status,recipient:'primary'}]:[]);
    const apply=(t,e)=>{const effect=putStatus(t,caster,e,round,rule.name);if(effect)log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'status',name:rule.name,status:effect.kind,value:effect.value,turns:effect.remaining,damage:0});};
    for(const t of statusTargets(units,u,rule,floor,round)){
     if(rule.kind==='heal'){const damage=Math.min(t.HP-t.hp,Math.floor(caster.ATK*rule.percent/100));t.hp+=damage;log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'heal',name:rule.name,damage});}
     if(rule.kind==='damage'){const hit=statusDamage(t,Math.floor(caster.ATK*rule.percent/100*caster.outgoing));t.rage=Math.min(100,t.rage+25);log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:'damage',name:rule.name,...hit});}
     for(const e of effects.filter(e=>e.recipient==='primary'))apply(t,e);
    }
    for(const e of effects.filter(e=>e.recipient==='self'))apply(u,e);
    continue;
   }
   const hit=statusDamage(target,Math.floor(effectiveAttack(u)*(skill?2:1)*modifier(u,'dealt')));u.rage=skill?0:Math.min(100,u.rage+25);target.rage=Math.min(100,target.rage+25);log.push({round,attacker:u.id,target:target.id,side:u.side,skill,...hit});
  }
  tickStatuses(units,round,log);
  if([0,1].some(side=>!units.some(u=>u.side===side&&u.hp>0)))break;
 }
 const hp=side=>units.filter(u=>u.side===side).reduce((n,u)=>n+u.hp,0),playerHP=hp(0),enemyHP=hp(1);
 return {won:playerHP>enemyHP,rounds,playerHP,enemyHP,log};
}
