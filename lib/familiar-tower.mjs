import critData from './familiar-crit-data.json' with {type:'json'};
import {criticalBattle,criticalUnit} from './familiar-crit-combat.mjs';
import dotData from './familiar-dot-data.json' with {type:'json'};
import {dotBattle} from './familiar-dot-combat.mjs';
import {triggerBattle,basicHealActive} from './familiar-trigger-combat.mjs';
import {passiveStats} from './familiar-passives.mjs';
import supportData from './familiar-support-data.json' with {type:'json'};
import {statusBattle as supportBattle} from './familiar-support-combat.mjs';
import modifierData from './familiar-modifier-data.json' with {type:'json'};
import {statusBattle as modifierBattle} from './familiar-modifier-combat.mjs';
import statusData from './familiar-status-data.json' with {type:'json'};
import {statusBattle} from './familiar-status-combat.mjs';
import skillData from './familiar-skill-data.json' with {type:'json'};
export const towerSkill=(id,version=10)=>[...skillData.skills,...statusData.skills,...modifierData.skills,...supportData.skills,...dotData.skills,...critData.skills].find(s=>s.id===id&&s.minVersion<=version);
import {familiarById,familiarStats,familiarCap} from './familiars.mjs';
export function towerTargets(units,u,rule,floor,round){
 let pool=units.filter(t=>t.hp>0&&t.side===(rule.kind==='heal'?u.side:1-u.side));
 if(rule.targeting?.toLowerCase().includes('front')){const row=pool.filter(t=>t.slot<2);if(row.length)pool=row;}
 if(rule.targeting?.toLowerCase().includes('back')){const row=pool.filter(t=>t.slot>=2);if(row.length)pool=row;}
 const hash=t=>{let h=2166136261;for(const c of `${floor}:${round}:${u.id}:${t.id}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
 if(rule.targeting?.startsWith('random'))pool.sort((a,b)=>hash(a)-hash(b)||a.slot-b.slot);else if(!rule.targeting||rule.targeting==='lowest')pool.sort((a,b)=>a.hp-b.hp||a.slot-b.slot);
 return pool.slice(0,rule.targets);
}
export const TOWER_FLOORS=12;
export const towerState=s=>s.familiarTower||{policyVersion:1,cleared:0,attempts:0,party:[],last:null};
export const towerKey=s=>`${towerState(s).cleared}:${towerState(s).attempts}`;
export const towerReward=floor=>({pearls:3+floor,xp:500*floor});
export const towerEnemy=floor=>({ATK:180+60*floor,HP:1600+600*floor,SPD:65+3*floor});
const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
const snapshotValid=p=>p&&familiarById(p.id)&&int(p.level,familiarCap(p.id))&&p.level>=1&&int(p.stars,100);
export function towerBattle(floor,snapshot,combatVersion=1){
 const units=[...snapshot.map((p,i)=>({...familiarStats(p.id,p),id:p.id,side:0,slot:i})),...Array.from({length:3},(_,i)=>({...towerEnemy(floor),id:`Guardian ${i+1}`,side:1,slot:i}))].map(p=>({...p,hp:p.HP,rage:0}));
 if(combatVersion===10)return criticalBattle(units.map(u=>criticalUnit(u.side===0?{...passiveStats(u,snapshot[u.slot]),basicHeal:basicHealActive(snapshot[u.slot])}:u)),floor,id=>towerSkill(id,10));
 if(combatVersion===9)return dotBattle(units.map(u=>u.side===0?{...passiveStats(u,snapshot[u.slot]),basicHeal:basicHealActive(snapshot[u.slot])}:u),floor,id=>towerSkill(id,9));
 if(combatVersion===8)return triggerBattle(units.map(u=>u.side===0?{...passiveStats(u,snapshot[u.slot]),basicHeal:basicHealActive(snapshot[u.slot])}:u),floor,id=>towerSkill(id,7));
 if(combatVersion===7)return supportBattle(units.map(u=>u.side===0?passiveStats(u,snapshot[u.slot]):u),floor,id=>towerSkill(id,7));
 if(combatVersion===6)return supportBattle(units,floor,id=>towerSkill(id,6));
 if(combatVersion===5)return modifierBattle(units,floor,id=>towerSkill(id,5));
 if(combatVersion===4)return statusBattle(units,floor,id=>towerSkill(id,4));
 const log=[];let rounds=0;
 for(let round=1;round<=15;round++){
  rounds=round;
  const order=[...units].sort((a,b)=>b.SPD-a.SPD||a.side-b.side||a.slot-b.slot);
  for(const u of order){
   if(u.hp<=0)continue;const target=units.find(t=>t.side!==u.side&&t.hp>0);if(!target)break;
   const skill=u.rage===100,rule=skill&&u.side===0&&combatVersion>=2?towerSkill(u.id,combatVersion):null;
   if(rule){
    const targets=towerTargets(units,u,combatVersion===2?{...rule,targeting:'lowest'}:rule,floor,round);u.rage=0;
    for(const t of targets){const amount=Math.floor(u.ATK*rule.percent/100),damage=Math.min(rule.kind==='heal'?t.HP-t.hp:t.hp,amount);t.hp+=rule.kind==='heal'?damage:-damage;if(rule.kind==='damage')t.rage=Math.min(100,t.rage+25);log.push({round,attacker:u.id,target:t.id,side:u.side,skill:true,kind:rule.kind,name:rule.name,damage});}
    continue;
   }
   const damage=Math.min(target.hp,u.ATK*(skill?2:1));
   u.rage=skill?0:Math.min(100,u.rage+25);target.hp-=damage;target.rage=Math.min(100,target.rage+25);
   log.push({round,attacker:u.id,target:target.id,side:u.side,skill,damage});
  }
  if([0,1].some(side=>!units.some(u=>u.side===side&&u.hp>0)))break;
 }
 const hp=side=>units.filter(u=>u.side===side).reduce((n,u)=>n+u.hp,0),playerHP=hp(0),enemyHP=hp(1);
 return {won:playerHP>enemyHP,rounds,playerHP,enemyHP,log};
}
export function validTower(s){
 const t=s.familiarTower;if(t===undefined)return true;
 if(!t||t.policyVersion!==1||!int(t.cleared,12)||!int(t.attempts,1e9)||!Array.isArray(t.party)||t.party.length>5||new Set(t.party).size!==t.party.length||!t.party.every(id=>Object.hasOwn(s.familiars||{},id)))return false;
 if(t.last===null)return t.attempts===0&&t.cleared===0;
 const r=t.last;
 if(!r||r.attempt!==t.attempts||r.attempt<1||!int(r.floor,12)||r.floor<1||!Array.isArray(r.team)||r.team.length<1||r.team.length>5||new Set(r.team.map(p=>p?.id)).size!==r.team.length||!r.team.every(p=>snapshotValid(p)&&Object.hasOwn(s.familiars||{},p.id)))return false;
 if(r.combatVersion!==undefined&&![1,2,3,4,5,6,7,8,9,10].includes(r.combatVersion))return false;
 const won=towerBattle(r.floor,r.team,r.combatVersion??1).won;
 return r.floor===(won?t.cleared:t.cleared+1)&&t.cleared<=t.attempts;
}
export function towerAction(s,action,target){
 if(!['towerParty','towerFront','towerFight'].includes(action))return null;
 const t=towerState(s),fail=error=>({state:s,error});
 if(action==='towerFront'){if(!t.party.includes(target))return fail('Add this familiar to the team first.');return {state:{...s,familiarTower:{...t,party:[target,...t.party.filter(id=>id!==target)]}},message:'Formation saved. First two slots are front row.'};}
 if(action==='towerParty'){
  if(!s.familiars?.[target])return fail('Welcome this familiar first.');
  const party=t.party.includes(target)?t.party.filter(id=>id!==target):[...t.party,target];
  if(party.length>5)return fail('Choose at most five familiars.');
  return {state:{...s,familiarTower:{...t,party}},message:'Tower team saved.'};
 }
 if(target!==towerKey(s)||t.cleared===12||t.attempts===1e9)return fail('This tower attempt is no longer available.');
 if(!t.party.length)return fail('Choose at least one familiar.');
 const floor=t.cleared+1,team=t.party.map(id=>({id,...s.familiars[id]})),result=towerBattle(floor,team,10),reward=towerReward(floor);
 if(result.won&&(s.inventory.Item_Talent_Hero_1+reward.pearls>1e6||s.fellowXP+reward.xp>1e9))return fail('Spend Skill Pearls or Fellow EXP before claiming this floor. Nothing was advanced.');
 return {state:{...s,inventory:{...s.inventory,Item_Talent_Hero_1:s.inventory.Item_Talent_Hero_1+(result.won?reward.pearls:0)},fellowXP:s.fellowXP+(result.won?reward.xp:0),familiarTower:{...t,cleared:t.cleared+(result.won?1:0),attempts:t.attempts+1,last:{attempt:t.attempts+1,floor,team,combatVersion:10}}},message:result.won?`Floor ${floor} cleared · ${reward.pearls} Skill Pearls + ${reward.xp} Fellow EXP`:'Defeated. Train or change your team, then retry for free.'};
}
