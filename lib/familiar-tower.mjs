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
import {startSupplies} from './familiar-supplies.mjs';
export function towerTargets(units,u,rule,floor,round){
 let pool=units.filter(t=>t.hp>0&&t.side===(rule.kind==='heal'?u.side:1-u.side));
 if(rule.targeting?.toLowerCase().includes('front')){const row=pool.filter(t=>t.slot<2);if(row.length)pool=row;}
 if(rule.targeting?.toLowerCase().includes('back')){const row=pool.filter(t=>t.slot>=2);if(row.length)pool=row;}
 const hash=t=>{let h=2166136261;for(const c of `${floor}:${round}:${u.id}:${t.id}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
 if(rule.targeting?.startsWith('random'))pool.sort((a,b)=>hash(a)-hash(b)||a.slot-b.slot);else if(!rule.targeting||rule.targeting==='lowest')pool.sort((a,b)=>a.hp-b.hp||a.slot-b.slot);
 return pool.slice(0,rule.targets);
}
// ---------------------------------------------------------------------------------------------------
// FAMILIAR TOWER, parity row E9.
// Policy 2 (2026-09-16) is the ORIGINAL tower: all 300 PetTower floors from configs/config/logic, each
// with its PetTowerArray enemy line-up (1-5 familiars with their own Level/ATK/HP/SPD), its one-time
// Challenge reward (Reward_PetTower_n) and its hourly Income (paid by lib/familiar-supplies.mjs, which
// is the ONLY place tower income is paid -- a clear here only settles the old rate first).
// Policy 1 was a 12-floor local sandbox (towerEnemy/towerReward below, kept only so its stored battle
// reports still replay). A policy-1 save is migrated by migrateTower: local floor n paid original
// floor 25n's income, so it becomes original floor 25n -- the same hourly rate, the same dispatch
// gates, no hour paid twice. Its old report is kept verbatim under `legacy` and still replayed.
// Floors 1..25n's one-time rewards are NOT paid to a migrated save: that save was paid for those
// clears in the sandbox's own currency (Skill Pearls and Fellow EXP). Owner decision, see E9.
//
// LOCAL, and said in the tower panel too:
//  * Enemies fight with basic attacks and Rage strikes only. PetTowerArray names the enemy familiar,
//    so its active skill is knowable, but the enemy side of the combat engine has never used skills.
//  * Combat is the existing combat-version-10 engine (Speed order, 15 rounds, Rage 25 per hit, higher
//    remaining HP wins), with the local 5% guardian critical chance for enemies.
//  * System.PetArrayAdd (Group3/4/5 formation bonuses) is not applied.
//  * Endless Mode (opens at floor 200, PetEndlessTower 23 bands / PetEndlessTowerPool 705 enemies) is
//    NOT built: its enemies are drawn at random from career-count ranges and its coefficients
//    (Lvcoef 1000, Powercoef 275) have no formula in any table read. Counted in the data file only.
import towerData from './familiar-tower-data.json' with {type:'json'};
import {cloneExplore,grantItems,grantFamiliar} from './familiar-explore.mjs';
export const TOWER_DATA=towerData;
export const TOWER_FLOORS=towerData.floors.length,LEGACY_FLOORS=12,TOWER_COMBAT_VERSION=10;
/** System.PetTowerAutoUnlock = 30 (lang PetAutoTower_LockTip). Auto climbs at most AUTO_BATCH floors a tap (local batch size). */
export const TOWER_AUTO_UNLOCK=30,AUTO_BATCH=10;
export const towerFloor=n=>towerData.floors[n-1]||null;
/** Policy 1 -> 2. Pure; inert on anything that is not a policy-1 record. */
export function migrateTower(t){
 if(!t||typeof t!=='object'||t.policyVersion!==1||!Number.isInteger(t.cleared))return t;
 return {policyVersion:2,cleared:25*t.cleared,attempts:t.attempts,party:t.party,last:null,legacy:{cleared:t.cleared,attempts:t.attempts,last:t.last}};
}
export const towerState=s=>migrateTower(s.familiarTower)||{policyVersion:2,cleared:0,attempts:0,party:[],last:null};
export const towerKey=s=>`${towerState(s).cleared}:${towerState(s).attempts}`;
/** Legacy sandbox only (policy 1 reports). */
export const towerReward=floor=>({pearls:3+floor,xp:500*floor});
export const towerEnemy=floor=>({ATK:180+60*floor,HP:1600+600*floor,SPD:65+3*floor});
/** The original floor's enemy units. Ids carry the slot so they never collide with the player's familiars. */
export const floorEnemies=floor=>towerFloor(floor).enemies.map(([pet,level,ATK,HP,SPD,power],i)=>({id:`enemy${i+1}:${pet}`,pet,level,ATK,HP,SPD,power}));
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
/** Policy 2: the original floor's line-up, fought with the combat-version-10 engine. */
export function originalBattle(floor,snapshot){
 const units=[...snapshot.map((p,i)=>({...familiarStats(p.id,p),id:p.id,side:0,slot:i})),...floorEnemies(floor).map((e,i)=>({id:e.id,ATK:e.ATK,HP:e.HP,SPD:e.SPD,side:1,slot:i}))].map(p=>({...p,hp:p.HP,rage:0}));
 return criticalBattle(units.map(u=>criticalUnit(u.side===0?{...passiveStats(u,snapshot[u.slot]),basicHeal:basicHealActive(snapshot[u.slot])}:u)),floor,id=>towerSkill(id,TOWER_COMBAT_VERSION));
}
/** The sandbox validator, unchanged, for a policy-1 record (in memory, or kept under `legacy`). */
function validLegacyTower(s,t){
 if(!t||t.policyVersion!==1||!int(t.cleared,12)||!int(t.attempts,1e9)||!Array.isArray(t.party)||t.party.length>5||new Set(t.party).size!==t.party.length||!t.party.every(id=>Object.hasOwn(s.familiars||{},id)))return false;
 if(t.last===null)return t.attempts===0&&t.cleared===0;
 const r=t.last;
 if(!r||r.attempt!==t.attempts||r.attempt<1||!int(r.floor,12)||r.floor<1||!Array.isArray(r.team)||r.team.length<1||r.team.length>5||new Set(r.team.map(p=>p?.id)).size!==r.team.length||!r.team.every(p=>snapshotValid(p)&&Object.hasOwn(s.familiars||{},p.id)))return false;
 if(r.combatVersion!==undefined&&![1,2,3,4,5,6,7,8,9,10].includes(r.combatVersion))return false;
 const won=towerBattle(r.floor,r.team,r.combatVersion??1).won;
 return r.floor===(won?t.cleared:t.cleared+1)&&t.cleared<=t.attempts;
}
const teamValid=(s,team)=>Array.isArray(team)&&team.length>=1&&team.length<=5&&new Set(team.map(p=>p?.id)).size===team.length&&team.every(p=>snapshotValid(p)&&Object.hasOwn(s.familiars||{},p.id));
export function validTower(s){
 const t=s.familiarTower;if(t===undefined)return true;
 if(t?.policyVersion===1)return validLegacyTower(s,t);
 if(!t||typeof t!=='object'||Array.isArray(t)||t.policyVersion!==2||!int(t.cleared,TOWER_FLOORS)||!int(t.attempts,1e9)||!Array.isArray(t.party)||t.party.length>5||new Set(t.party).size!==t.party.length||!t.party.every(id=>Object.hasOwn(s.familiars||{},id)))return false;
 const keys=Object.keys(t).sort().join();
 if(keys!=='attempts,cleared,last,party,policyVersion'&&keys!=='attempts,cleared,last,legacy,party,policyVersion')return false;
 // A migrated record: the kept sandbox record must itself be a legal policy-1 tower, and the
 // original floor starts at exactly 25x its cleared floors.
 const base=t.legacy===undefined?{cleared:0,attempts:0}:t.legacy;
 if(t.legacy!==undefined){const l=t.legacy;if(!l||typeof l!=='object'||Object.keys(l).length!==3||!validLegacyTower(s,{policyVersion:1,cleared:l.cleared,attempts:l.attempts,party:[],last:l.last}))return false;}
 const floorBase=25*base.cleared;
 if(t.cleared<floorBase||t.attempts<base.attempts||t.cleared-floorBase>t.attempts-base.attempts)return false;
 if(t.last===null)return t.cleared===floorBase&&t.attempts===base.attempts;
 const r=t.last;
 if(!r||typeof r!=='object'||Object.keys(r).length!==4||r.attempt!==t.attempts||r.attempt<=base.attempts||!int(r.floor,TOWER_FLOORS)||r.floor<=floorBase||r.combatVersion!==TOWER_COMBAT_VERSION||!teamValid(s,r.team))return false;
 const won=originalBattle(r.floor,r.team).won;
 return r.floor===(won?t.cleared:t.cleared+1);
}
/** What a first clear of `floor` pays, as original item ids. */
export function floorRewardItems(floor){const r=towerFloor(floor).reward,out=[];if(r.levelUp)out.push(['Item_PetLevelUP',r.levelUp]);if(r.classUp)out.push(['Item_PetClassUP',r.classUp]);for(const k of ['Item_PetCatch2','Item_PetPacify1'])if(r[k])out.push([k,r[k]]);return out;}
function fight(s){
 const t=towerState(s),floor=t.cleared+1,team=t.party.map(id=>({id,level:s.familiars[id].level,stars:s.familiars[id].stars})),result=originalBattle(floor,team);
 const tower={...t,cleared:t.cleared+(result.won?1:0),attempts:t.attempts+1,last:{attempt:t.attempts+1,floor,team,combatVersion:TOWER_COMBAT_VERSION}};
 if(!result.won)return {state:{...s,familiarTower:tower},won:false,floor};
 // A clear settles the tower's item income at the old floor's rate before the new floor's rate applies.
 let next=startSupplies(s);const e=cloneExplore(next);
 next=grantItems(next,e,floorRewardItems(floor));if(!next)return {error:'Familiar item storage is full. Spend items before claiming this floor. Nothing was advanced.'};
 let joined=null,pieces=0;const pet=towerFloor(floor).reward.familiar;
 if(pet){const g=grantFamiliar(next,e,pet);next=g.state;if(g.joined)joined=pet;else pieces=g.pieces;}
 return {state:{...next,familiarTower:tower,familiarExplore:e},won:true,floor,joined,pieces};
}
const rewardText=(floor,r)=>{const w=towerFloor(floor).reward,parts=[];if(w.levelUp)parts.push(`${w.levelUp} level-up`);if(w.classUp)parts.push(`${w.classUp} class-up`);if(w.Item_PetCatch2)parts.push(`${w.Item_PetCatch2} Advanced Contract`);if(w.Item_PetPacify1)parts.push(`${w.Item_PetPacify1} Ordinary Mochi`);if(r.joined)parts.push(`${familiarById(r.joined).name} joins`);if(r.pieces)parts.push(`${r.pieces} fragments`);return parts.join(' + ');};
export function towerAction(s,action,target){
 if(!['towerParty','towerFront','towerFight','towerAuto'].includes(action))return null;
 const t=towerState(s),fail=error=>({state:s,error}),migrated=t===s.familiarTower?s:{...s,familiarTower:t};
 if(action==='towerFront'){if(!t.party.includes(target))return fail('Add this familiar to the team first.');return {state:{...migrated,familiarTower:{...t,party:[target,...t.party.filter(id=>id!==target)]}},message:'Formation saved. First two slots are front row.'};}
 if(action==='towerParty'){
  if(!s.familiars?.[target])return fail('Contract this familiar first.');
  const party=t.party.includes(target)?t.party.filter(id=>id!==target):[...t.party,target];
  if(party.length>5)return fail('Choose at most five familiars.');
  return {state:{...migrated,familiarTower:{...t,party}},message:'Tower team saved.'};
 }
 if(target!==towerKey(s)||t.cleared===TOWER_FLOORS||t.attempts===1e9)return fail('This tower attempt is no longer available.');
 if(!t.party.length)return fail('Choose at least one familiar.');
 if(action==='towerAuto'&&t.cleared<TOWER_AUTO_UNLOCK)return fail(`Complete Familiar Tower floor ${TOWER_AUTO_UNLOCK} to unlock auto mode.`);
 let state=migrated,cleared=0,last=null;
 for(let i=0;i<(action==='towerAuto'?AUTO_BATCH:1)&&towerState(state).cleared<TOWER_FLOORS;i++){
  const r=fight(state);if(r.error)return cleared?{state,message:`Auto stopped after ${cleared} floors: ${r.error}`}:fail(r.error);
  state=r.state;last=r;if(!r.won)break;cleared++;
 }
 if(action==='towerAuto')return {state,message:last.won?`Auto mode cleared ${cleared} floors, up to floor ${last.floor}.`:`Auto mode cleared ${cleared} floors, then failed floor ${last.floor}.`};
 return {state,message:last.won?`Floor ${last.floor} cleared · ${rewardText(last.floor,last)}`:'Defeated. Train or change your team, then retry for free.'};
}
