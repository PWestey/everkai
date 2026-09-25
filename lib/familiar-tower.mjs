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
import {familiarCombatPower} from './familiar-combat.mjs';
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
// All 300 PetTower floors from configs/config/logic, each with its PetTowerArray enemy line-up, its one-time
// Challenge reward (Reward_PetTower_n) and its hourly Income (paid ONLY by lib/familiar-supplies.mjs -- a
// clear here settles the old rate and adds the one-time reward, never an hour of income).
//
// SAVE POLICIES
//  1  12-floor local sandbox (bafe728 and earlier). towerEnemy/towerReward below replay its reports.
//  2  0fac20d: the 300 floors, and a policy-1 save migrated to original floor 25n with its record under `legacy`.
//  3  2026-09-16, owner: "Re-do floor since I don't ever remember actually doing them". A sandbox save
//     (policy 1, or policy 2 still carrying `legacy`) starts again at floor 0 so every one-time reward,
//     the six tower familiars included, is earned by climbing. `legacy` marks exactly the saves to reset,
//     and the reset writes policy 3, so it happens once and a genuine policy-2 climb (no `legacy`) is
//     carried over untouched. Knock-ons, each deliberate and tested (tests/familiar-tower-redo.test.mjs):
//      * nothing is clawed back: Skill Pearls, Fellow EXP, items, familiars all stay;
//      * income already waiting is SETTLED at the old floor's rate before the reset (migrateTowerSave), then
//        the hourly rate is that of the floor actually climbed again;
//      * `redoFrom` keeps the floor the save had reached, and dispatch and exploring areas unlock from it
//        (towerReachOf), so a run already out or an area being explored stays valid;
//      * `prepaid` lists floors whose one-time reward the 25n build already paid (climbed after migrating);
//        those floors pay nothing the second time.
//
// COMBAT VERSION 11 (new reports; version-10 reports replay exactly as written):
//  * MEASURED: enemies are familiars (PetTowerArray.Pet) and now cast that familiar's active skill at full Rage
//    with the same kits the player's familiars use, and carry that familiar's critical base.
//  * MEASURED: team bond, both sides (PetBattleShow.lua shows it for the opponent too): three, four or five
//    familiars of one type add System.PetArrayAdd Group3/4/5 = +10% / +13% / +15% ATK and HP
//    (lang PetFettersTips1-3). Pet.Group is the type (Group 1 Cool 19, 2 Cute 19, 3 Playful 19, 4 Legendary 13).
//  * LOCAL: bond is applied to base stats before stage passives; enemies get no stage passives or Dream
//    Eater's basic heal (their stats are the table's); enemies without a documented kit use a Rage strike.
//
// ENDLESS MODE (after floor 200, System.PetEndlessTowerOpen) -- see endlessEnemies for what is local.
import towerData from './familiar-tower-data.json' with {type:'json'};
import {cloneExplore,grantItems,grantFamiliar} from './familiar-explore.mjs';
import {criticalBase} from './familiar-crit-combat.mjs';
import {settleSupplies,endlessBand} from './familiar-supplies.mjs';
export const TOWER_DATA=towerData;
export const TOWER_FLOORS=towerData.floors.length,LEGACY_FLOORS=12,TOWER_COMBAT_VERSION=11,TOWER_POLICY=3;
export const ENDLESS_OPEN=towerData.endlessOpen,ENDLESS_MAX=1e6;
/** System.PetTowerAutoUnlock = 30 (lang PetAutoTower_LockTip). Auto climbs at most AUTO_BATCH floors a tap (local batch size). */
export const TOWER_AUTO_UNLOCK=30,AUTO_BATCH=10;
export const towerFloor=n=>towerData.floors[n-1]||null;
/** Policies 1 and 2 -> 3 (see the header). Pure; inert on a policy-3 record or anything unrecognised. */
export function migrateTower(t){
 if(!t||typeof t!=='object'||Array.isArray(t))return t;
 if(t.policyVersion===1&&Number.isInteger(t.cleared))
  return {policyVersion:3,cleared:0,attempts:t.attempts,base:t.attempts,party:t.party,last:null,legacy:{cleared:t.cleared,attempts:t.attempts,last:t.last},redoFrom:25*t.cleared};
 if(t.policyVersion===2&&t.legacy&&typeof t.legacy==='object'&&Number.isInteger(t.legacy.cleared)){
  const from=25*t.legacy.cleared;
  return {policyVersion:3,cleared:0,attempts:t.attempts,base:t.attempts,party:t.party,last:null,legacy:t.legacy,redoFrom:Math.max(from,t.cleared),...(t.cleared>from?{prepaid:{from:from+1,to:t.cleared}}:{})};
 }
 if(t.policyVersion===2){const {legacy,...rest}=t;return {...rest,policyVersion:3,base:0};}
 return t;
}
const resets=t=>!!t&&(t.policyVersion===1||t.policyVersion===2&&!!t.legacy);
/** The whole-save migration: income waiting at the old floor is settled BEFORE the floor resets, so no item already
 *  earned is lost. Used by repairSave on load and by towerAction for an in-memory old record. */
export function migrateTowerSave(s){
 const t=s?.familiarTower;if(!t||typeof t!=='object'||t.policyVersion===3)return s;
 let next=s;
 if(resets(t)&&s.familiarSupplies?.since!=null){try{next=settleSupplies(s,s.lastAt)}catch{next=s}}
 return {...next,familiarTower:migrateTower(t)};
}
export const towerState=s=>migrateTower(s.familiarTower)||{policyVersion:3,cleared:0,attempts:0,base:0,party:[],last:null};
export const towerKey=s=>`${towerState(s).cleared}:${towerState(s).attempts}`;
export const endlessState=s=>towerState(s).endless||{cleared:0,attempts:0,last:null};
export const endlessKey=s=>`${endlessState(s).cleared}:${endlessState(s).attempts}`;
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
const TYPE_GROUP={Cool:1,Cute:2,Playful:3,Legendary:4};
/** Pet.Group, falling back to the Everkai type for the one familiar (Pet_8041505) newer than the APK. */
export const groupOf=id=>towerData.pets[id]?.group??TYPE_GROUP[familiarById(id)?.type]??0;
/** The measured team bond: the largest same-type count, 3-5, pays PetArrayAdd GroupN basis points on ATK and HP. */
export function teamBond(ids){
 const counts={};for(const id of ids){const g=groupOf(id);if(g)counts[g]=(counts[g]||0)+1;}
 let best=0,group=0;for(const [g,n] of Object.entries(counts))if(n>best){best=n;group=Number(g);}
 const n=Math.min(5,best);return n>=3?{count:n,group,...towerData.bond[n]}:null;
}
/** The team's ATTRIBUTE: its summed Power with the same-type bond applied.
 *
 *  MEASURED (docs/familiar-screen-specs/09-tower.md §3): `System.PetArrayAdd` Group3/4/5 each carry
 *  THREE fields -- `{ATK, HP, POWER}` at 1000/1300/1500 basis points -- and the client's bond modal
 *  prints all three, the third as `Attribute: +{val}%`. Everkai imported two, so a five-of-a-type team
 *  read 15% low wherever Attribute is shown or used.
 *
 *  POWER is deliberately NOT applied in `bonded()` below. It is an Attribute bonus, not a combat stat:
 *  the battle resolves on ATK/HP/SPD, and `validTower` RE-DERIVES every stored `last` battle
 *  (`originalBattle(r.floor, r.team, r.combatVersion)`), so changing the combat maths without bumping
 *  `combatVersion` would refuse every save that holds a result. Nothing here touches that path.
 */
export function teamAttribute(s,team){
 // `PetInfo:GetPower`, transcribed (lib/familiar-combat.mjs). This used to be three of the nine
 // PetAttr rows with no skill ratio -- the three with the largest CombatAdd, which is why it tracked
 // the real figure closely enough to go unnoticed until PetSkill was imported.
 let n=0;for(const id of team){const p=s.familiars?.[id];if(!p)continue;n+=familiarCombatPower(id,p);}
 const bond=teamBond(team);
 return bond?Math.floor(n*(10000+bond.POWER)/10000):n;
}
/** `Quick Deploy` (09-tower.md 3): the strongest five, bond included.
 *
 *  LOCAL RULE, and flagged as one: the original's button was never pressed (it rewrites the owner's
 *  saved team), so what it optimises is unmeasured. Maximising `teamAttribute` over every 5-subset is
 *  C(70,5) = 12M evaluations, so this tries a small candidate set instead -- the five strongest overall,
 *  and the five strongest inside each type (which is what buys the 10/13/15% same-type bond) -- and
 *  keeps whichever scores highest. It never loses to the naive top-five, because that team is a candidate.
 */
export function quickDeployTeam(s){
 const owned=Object.keys(s.familiars||{});
 if(owned.length<=5)return owned;
 const power=id=>{const st=familiarStats(id,s.familiars[id]);return st.ATK*15+st.HP*1+st.SPD*30;};
 const rank=[...owned].sort((a,b)=>power(b)-power(a));
 const candidates=[rank.slice(0,5)];
 for(const g of new Set(rank.map(groupOf)))if(g)candidates.push([...rank.filter(id=>groupOf(id)===g).slice(0,5),...rank.filter(id=>groupOf(id)!==g)].slice(0,5));
 let best=candidates[0],score=teamAttribute(s,best);
 for(const team of candidates.slice(1)){const n=teamAttribute(s,team);if(n>score){best=team;score=n;}}
 return best;
}
const bonded=(u,bond)=>bond?{...u,ATK:Math.floor(u.ATK*(10000+bond.ATK)/10000),HP:Math.floor(u.HP*(10000+bond.HP)/10000)}:u;
const skillFor=id=>towerSkill(id,10);
/** Version 11 battle between a player snapshot and enemy units {id,pet,ATK,HP,SPD}. */
function battle11(floor,snapshot,enemies){
 const mine=bonded,own=teamBond(snapshot.map(p=>p.id)),theirs=teamBond(enemies.map(e=>e.pet));
 const players=snapshot.map((p,i)=>{const base=mine({...familiarStats(p.id,p),id:p.id,side:0,slot:i},own);return criticalUnit({...passiveStats(base,p),basicHeal:basicHealActive(p)});});
 const foes=enemies.map((e,i)=>{const c=criticalBase(e.pet);return {...bonded({id:e.id,pet:e.pet,ATK:e.ATK,HP:e.HP,SPD:e.SPD,side:1,slot:i},theirs),critBP:c.critBP,resistanceBP:c.resistanceBP};});
 const units=[...players,...foes].map(u=>({...u,hp:u.HP,rage:0}));
 return criticalBattle(units,floor,skillFor,{enemySkills:true});
}
/** A normal floor. combatVersion 10 replays the 0fac20d reports (no enemy skills, no bond, 5% guardians). */
export function originalBattle(floor,snapshot,combatVersion=TOWER_COMBAT_VERSION){
 if(combatVersion===11)return battle11(floor,snapshot,floorEnemies(floor));
 const units=[...snapshot.map((p,i)=>({...familiarStats(p.id,p),id:p.id,side:0,slot:i})),...floorEnemies(floor).map((e,i)=>({id:e.id,ATK:e.ATK,HP:e.HP,SPD:e.SPD,side:1,slot:i}))].map(p=>({...p,hp:p.HP,rage:0}));
 return criticalBattle(units.map(u=>criticalUnit(u.side===0?{...passiveStats(u,snapshot[u.slot]),basicHeal:basicHealActive(snapshot[u.slot])}:u)),floor,skillFor);
}
const fnv=str=>{let h=2166136261;for(const c of str)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h;};
/** ENDLESS floor L.
 *  MEASURED: the band (PetEndlessTower row whose StageRange holds L), its bots (PetEndlessTowerPool rows of that
 *  StageRange, all Lv 200), the per-career count limits CareerMax, the level shown for a bot
 *  Pool.Lv + floor(L x Lvcoef / 10000) (PetBattleShow.lua GetPetInitData), and the band Income.
 *  LOCAL (the server draws bots; no table or client file says how): a repeatable draw keyed on L alone --
 *  1-2 Tanks and 0-1 Supports within CareerMax, Attackers filling to five, Tanks in front -- and each stat
 *  scaled the way Lvcoef scales level: stat x (1 + L x coef / 10000) with the band's ATK/HP/SPD coef. */
export function endlessEnemies(L){
 const band=endlessBand(L);if(!band)return [];
 const bots=towerData.endless.bots.map((b,i)=>({i,band:b[0],pet:b[1],career:b[2],Lv:b[3],ATK:b[4],HP:b[5],SPD:b[6],power:b[7]})).filter(b=>b.band===band.id);
 const pick=(career,n)=>bots.filter(b=>b.career===career).sort((a,b)=>fnv(`endless:${L}:${a.i}`)-fnv(`endless:${L}:${b.i}`)||a.i-b.i).slice(0,n);
 const range=c=>band.careers[String(c)],roll=(c,k)=>{const [lo,hi]=range(c);return lo+fnv(`endless:${L}:${k}`)%(hi-lo+1);};
 const tanks=roll(2,'tanks'),supports=roll(3,'supports'),[alo,ahi]=range(1),attackers=Math.max(alo,Math.min(ahi,5-tanks-supports));
 const scale=(v,k)=>Math.floor(v*(10000+L*band.coef[k])/10000);
 return [...pick(2,tanks),...pick(1,attackers),...pick(3,supports)].map((b,i)=>({id:`enemy${i+1}:${b.pet}`,pet:b.pet,career:b.career,level:b.Lv+Math.floor(L*band.coef.Lv/10000),ATK:scale(b.ATK,'ATK'),HP:scale(b.HP,'HP'),SPD:scale(b.SPD,'SPD')}));
}
export const endlessBattle=(L,snapshot)=>battle11(L,snapshot,endlessEnemies(L));
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
const teamValid=(s,team)=>Array.isArray(team)&&team.length>=1&&team.length<=5&&new Set(team.map(p=>p?.id)).size===team.length&&team.every(p=>p&&Object.keys(p).length===3&&snapshotValid(p)&&Object.hasOwn(s.familiars||{},p.id));
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
/** Policy 2 as 0fac20d wrote it (validated in memory only; decode migrates it first). */
function validPolicy2(s,t){
 if(!int(t.cleared,TOWER_FLOORS)||!int(t.attempts,1e9)||!Array.isArray(t.party)||t.party.length>5||new Set(t.party).size!==t.party.length||!t.party.every(id=>Object.hasOwn(s.familiars||{},id)))return false;
 const base=t.legacy===undefined?{cleared:0,attempts:0}:t.legacy;
 if(t.legacy!==undefined){const l=t.legacy;if(!record(l)||Object.keys(l).length!==3||!validLegacyTower(s,{policyVersion:1,cleared:l.cleared,attempts:l.attempts,party:[],last:l.last}))return false;}
 const floorBase=25*base.cleared;
 if(t.cleared<floorBase||t.attempts<base.attempts||t.cleared-floorBase>t.attempts-base.attempts)return false;
 if(t.last===null)return t.cleared===floorBase&&t.attempts===base.attempts;
 const r=t.last;
 if(!record(r)||r.attempt!==t.attempts||r.attempt<=base.attempts||!int(r.floor,TOWER_FLOORS)||r.floor<=floorBase||r.combatVersion!==10||!teamValid(s,r.team))return false;
 return r.floor===(originalBattle(r.floor,r.team,10).won?t.cleared:t.cleared+1);
}
const P3_KEYS=new Set(['policyVersion','cleared','attempts','base','party','last','legacy','redoFrom','prepaid','endless']);
export function validTower(s){
 const t=s.familiarTower;if(t===undefined)return true;
 if(t?.policyVersion===1)return validLegacyTower(s,t);
 if(!record(t))return false;
 if(t.policyVersion===2)return validPolicy2(s,t);
 if(t.policyVersion!==3||!Object.keys(t).every(k=>P3_KEYS.has(k))||!['policyVersion','cleared','attempts','base','party','last'].every(k=>Object.hasOwn(t,k)))return false;
 if(!int(t.cleared,TOWER_FLOORS)||!int(t.attempts,1e9)||!int(t.base,t.attempts)||!Array.isArray(t.party)||t.party.length>5||new Set(t.party).size!==t.party.length||!t.party.every(id=>Object.hasOwn(s.familiars||{},id)))return false;
 if(t.legacy!==undefined){const l=t.legacy;if(!record(l)||Object.keys(l).length!==3||!validLegacyTower(s,{policyVersion:1,cleared:l.cleared,attempts:l.attempts,party:[],last:l.last})||t.base<l.attempts)return false;}
 if(t.redoFrom!==undefined&&!int(t.redoFrom,TOWER_FLOORS))return false;
 if(t.prepaid!==undefined){const p=t.prepaid;if(!record(p)||Object.keys(p).length!==2||!int(p.from,TOWER_FLOORS)||p.from<1||!int(p.to,TOWER_FLOORS)||p.to<p.from||p.to>(t.redoFrom??0))return false;}
 if(t.cleared>t.attempts-t.base)return false;
 if(t.last===null){if(t.cleared!==0||t.attempts!==t.base)return false;}
 else{
  const r=t.last;
  if(!record(r)||Object.keys(r).length!==4||r.attempt!==t.attempts||r.attempt<=t.base||!int(r.floor,TOWER_FLOORS)||r.floor<1||![10,11].includes(r.combatVersion)||!teamValid(s,r.team))return false;
  if(r.floor!==(originalBattle(r.floor,r.team,r.combatVersion).won?t.cleared:t.cleared+1))return false;
 }
 if(t.endless!==undefined){
  const e=t.endless;
  if(!record(e)||Object.keys(e).length!==3||!int(e.cleared,ENDLESS_MAX)||!int(e.attempts,1e9)||e.cleared>e.attempts)return false;
  if(e.attempts&&t.cleared<ENDLESS_OPEN)return false;
  if(e.last===null)return e.cleared===0&&e.attempts===0;
  const r=e.last;
  if(!record(r)||Object.keys(r).length!==4||r.attempt!==e.attempts||!int(r.floor,ENDLESS_MAX)||r.floor<1||r.combatVersion!==11||!teamValid(s,r.team))return false;
  return r.floor===(endlessBattle(r.floor,r.team).won?e.cleared:e.cleared+1);
 }
 return true;
}
/** What a first clear of `floor` pays, as original item ids. */
export function floorRewardItems(floor){const r=towerFloor(floor).reward,out=[];if(r.levelUp)out.push(['Item_PetLevelUP',r.levelUp]);if(r.classUp)out.push(['Item_PetClassUP',r.classUp]);for(const k of ['Item_PetCatch2','Item_PetPacify1'])if(r[k])out.push([k,r[k]]);return out;}
export const floorPrepaid=(t,floor)=>!!t.prepaid&&floor>=t.prepaid.from&&floor<=t.prepaid.to;
const snapshot=(s,party)=>party.map(id=>({id,level:s.familiars[id].level,stars:s.familiars[id].stars}));
function fight(s){
 const t=towerState(s),floor=t.cleared+1,team=snapshot(s,t.party),result=originalBattle(floor,team);
 const tower={...t,cleared:t.cleared+(result.won?1:0),attempts:t.attempts+1,last:{attempt:t.attempts+1,floor,team,combatVersion:TOWER_COMBAT_VERSION}};
 if(!result.won)return {state:{...s,familiarTower:tower},won:false,floor};
 // A clear settles the tower's item income at the old floor's rate before the new floor's rate applies.
 let next=startSupplies(s);
 if(floorPrepaid(t,floor))return {state:{...next,familiarTower:tower},won:true,floor,prepaid:true};
 const e=cloneExplore(next);
 next=grantItems(next,e,floorRewardItems(floor));if(!next)return {error:'Familiar item storage is full. Spend items before claiming this floor. Nothing was advanced.'};
 let joined=null,pieces=0;const pet=towerFloor(floor).reward.familiar;
 if(pet){const g=grantFamiliar(next,e,pet);next=g.state;if(g.joined)joined=pet;else pieces=g.pieces;}
 return {state:{...next,familiarTower:tower,familiarExplore:e},won:true,floor,joined,pieces};
}
function fightEndless(s){
 const t=towerState(s),e=endlessState(s),floor=e.cleared+1,team=snapshot(s,t.party),won=endlessBattle(floor,team).won;
 const endless={cleared:e.cleared+(won?1:0),attempts:e.attempts+1,last:{attempt:e.attempts+1,floor,team,combatVersion:TOWER_COMBAT_VERSION}};
 // Only the band Income changes with a clear (Reward_PetEndlessTower_1 is Item_PetFeedBox, not modelled).
 const next=won?startSupplies(s):s;
 return {state:{...next,familiarTower:{...t,endless}},won,floor};
}
const rewardText=(floor,r)=>{if(r.prepaid)return 'reward already paid before the redo';const w=towerFloor(floor).reward,parts=[];if(w.levelUp)parts.push(`${w.levelUp} level-up`);if(w.classUp)parts.push(`${w.classUp} class-up`);if(w.Item_PetCatch2)parts.push(`${w.Item_PetCatch2} Advanced Contract`);if(w.Item_PetPacify1)parts.push(`${w.Item_PetPacify1} Ordinary Mochi`);if(r.joined)parts.push(`${familiarById(r.joined).name} joins`);if(r.pieces)parts.push(`${r.pieces} fragments`);return parts.join(' + ');};
export function towerAction(s,action,target){
 if(!['towerParty','towerFront','towerQuickDeploy','towerFight','towerAuto','endlessFight','endlessAuto'].includes(action))return null;
 const fail=error=>({state:s,error}),migrated=migrateTowerSave(s),t=towerState(migrated);
 if(action==='towerFront'){if(!t.party.includes(target))return fail('Add this familiar to the team first.');return {state:{...migrated,familiarTower:{...t,party:[target,...t.party.filter(id=>id!==target)]}},message:'Formation saved. First two slots are front row.'};}
 if(action==='towerQuickDeploy'){
  const party=quickDeployTeam(migrated);
  if(!party.length)return fail('Contract a familiar first.');
  return {state:{...migrated,familiarTower:{...t,party}},message:'Quick Deploy: the strongest five are in formation.'};
 }
 if(action==='towerParty'){
  if(!s.familiars?.[target])return fail('Contract this familiar first.');
  const party=t.party.includes(target)?t.party.filter(id=>id!==target):[...t.party,target];
  if(party.length>5)return fail('Choose at most five familiars.');
  return {state:{...migrated,familiarTower:{...t,party}},message:'Tower team saved.'};
 }
 if(!t.party.length)return fail('Choose at least one familiar.');
 const auto=action.endsWith('Auto');
 if(auto&&t.cleared<TOWER_AUTO_UNLOCK)return fail(`Complete Familiar Tower floor ${TOWER_AUTO_UNLOCK} to unlock auto mode.`);
 if(action.startsWith('endless')){
  if(t.cleared<ENDLESS_OPEN)return fail(`Endless Mode unlocks after Challenge Mode floor ${ENDLESS_OPEN}.`);
  const e=endlessState(migrated);if(target!==endlessKey(migrated)||e.cleared>=ENDLESS_MAX||e.attempts>=1e9)return fail('This tower attempt is no longer available.');
  let state=migrated,cleared=0,last=null;
  for(let i=0;i<(auto?AUTO_BATCH:1);i++){const r=fightEndless(state);state=r.state;last=r;if(!r.won)break;cleared++;}
  return {state,message:auto?`Endless auto cleared ${cleared} floors${last.won?`, up to floor ${last.floor}`:`, then failed floor ${last.floor}`}.`:last.won?`Endless floor ${last.floor} cleared.`:'Defeated. Train or change your team, then retry for free.'};
 }
 if(target!==towerKey(migrated)||t.cleared===TOWER_FLOORS||t.attempts===1e9)return fail('This tower attempt is no longer available.');
 let state=migrated,cleared=0,last=null;
 for(let i=0;i<(auto?AUTO_BATCH:1)&&towerState(state).cleared<TOWER_FLOORS;i++){
  const r=fight(state);if(r.error)return cleared?{state,message:`Auto stopped after ${cleared} floors: ${r.error}`}:fail(r.error);
  state=r.state;last=r;if(!r.won)break;cleared++;
 }
 if(auto)return {state,message:last.won?`Auto mode cleared ${cleared} floors, up to floor ${last.floor}.`:`Auto mode cleared ${cleared} floors, then failed floor ${last.floor}.`};
 return {state,message:last.won?`Floor ${last.floor} cleared · ${rewardText(last.floor,last)}`:'Defeated. Train or change your team, then retry for free.'};
}
