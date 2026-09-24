import data from './familiar-dispatch-data.json' with {type:'json'};
import {familiarStats,familiarById} from './familiars.mjs';
import {cloneExplore,grantPieces} from './familiar-explore.mjs';
import {towerReachOf} from './familiar-supplies.mjs';
import {teamAttribute} from './familiar-tower.mjs';
// Familiar Dispatch (parity row E10), imported by scripts/import-familiar-dispatch.py from the APK
// config set. Five familiars go to one of nine areas on a timed run; the run always pays its base
// reward and, on a Great Success, an extra one. Cancelling pays nothing (lang.json Pet_Dispatch_Text14).
//
// MEASURED from configs/config/logic: the nine areas' tower-floor gate (PetDispatch.TowerLv), team
// power gate (PetDispatch.Power), duration figure (PetDispatch.Time, 20 on every row), and both
// reward bundles in the same two items the Familiar Tower pays and training charges
// (split_reward/reward_petdispatch.json: base Item_PetLevelUP x1000n, great +x200n and, from area 6,
// Item_PetClassUP 5/10/25/50). Power's weights are PetAttr.CombatAdd -- ATK 15, HP 1, SPD 30.
// Positive control on that reading: the original Pet.json's five strongest familiars score
// 86,130 at level 1, 6,671,778 at max level and 27,680,957 fully maxed, and Everkai's own five
// strongest score the identical three numbers -- so the gate ladder 100,000..20,000,000 spans
// exactly this familiar roster and the weights are right.
//
// TWO THINGS ARE LOCAL AND MARKED AS SUCH:
// 1. TIME UNIT. PetDispatch.Time is 20 on all nine rows and no other Pet* table or System key holds
//    a dispatch duration (the importer asserts both), so 20 is the only duration there is -- but the
//    table does not name its unit. Everkai reads it as HOURS. The argument is measured: at 20 hours
//    area 9 pays 9,000 level-up items per run, about 450/hour against the tower's 187/hour at the
//    same floor -- a strong second faucet. At 20 minutes it would pay 27,000/hour, 144x the tower,
//    which would make the tower pointless and fund a whole familiar (626,190 level-up items to
//    level 499) in under a day. The original also sells five escalating skips a day for 200-1,000
//    diamonds (PetDispatch_QuickBuy), which is only worth selling against a long timer.
// 2. GREAT SUCCESS ARITHMETIC -- NO LONGER LOCAL, and the local rule it replaced was measurably wrong.
//    This header used to say "the expression combining them is NOT in any table". That was true of the
//    CONFIG tables and false of the client, which carries the expression in source:
//
//        PetManager.lua:3393  GetBigSuccess(levelId, petLineup)
//          crit = PetDispatch_Crit / 10000
//          p    = crit + (totalPower / levelPower) ^ PetDispatch_Coefficient - 1
//          if p < 0 then p = 0 end        -- a floor, and NO ceiling
//          return p * 100
//
//    Everkai's local rule was `30 x (1 + 0.5 x (P/L - 1))`, clamped to 100. The two agree at exactly
//    the gate and nowhere else, and they disagree in BOTH directions:
//
//        P/L      original   Everkai
//        0.50        0.71%    22.50%   <- an under-powered team was ~32x too likely to crit
//        1.00       30.00%    30.00%
//        2.00       71.42%    45.00%   <- doubling the gate was worth far less than it should be
//        4.00      130.00%    75.00%   <- the original guarantees it; Everkai never exceeded 75%
//
//    Both constants were already imported and already asserted; only the expression was invented.
//    Fixed 2026-09-24. There is no upper clamp in the model -- above 100% the roll simply always wins,
//    which is what `p * 100` with no ceiling means -- and the DISPLAY clamp in the panel is Everkai's,
//    so a player is shown `100%` rather than an impossible `130%`.
//
//    NOT a save migration (rule 12 checked): a run stores `{area, since}` and nothing else, the roll is
//    resolved at collection from that key, and `validFamiliarDispatch` never re-derives the chance. An
//    in-flight run resolves at the new odds; no stored value can be invalidated.
//
// Gates: since 2026-09-16 the Familiar Tower has the original 300 floors, so each area opens at its own
// PetDispatch.TowerLv. (The 12-floor sandbox mapped it to ceil(TowerLv/25); a sandbox save is read as
// original floor 25n, which opens exactly the same areas it had.) Also local: dispatched familiars are
// not withheld from the Familiar Tower team.
// PAID since 2026-09-16: the Great Success fragment pools (Reward_PetDispatch_Add_n_k, every entry an
// Item_Owner_PetPiece_*) pay one uniform draw each into familiarExplore.pieces (dispatchFragments).
export const DISPATCH_AREAS=data.areas,DISPATCH_TEAM=data.teamSize,DISPATCH_CRIT_BP=data.critBP,DISPATCH_COEFFICIENT=data.coefficient,COMBAT_ADD=data.combatAdd;
const H=3600e3,MAX_ITEMS=1e12;
export const dispatchArea=id=>DISPATCH_AREAS.find(a=>a.id===Number(id));
export const dispatchState=s=>s.familiarDispatch||{team:[],run:null};
/** PetAttr.CombatAdd applied to a familiar's trained stats: the Power the area gates are stated in. */
export function familiarPower(id,progress){const st=familiarStats(id,progress);return st.ATK*COMBAT_ADD.ATK+st.HP*COMBAT_ADD.HP+st.SPD*COMBAT_ADD.SPD;}
// The dispatch screen's Attribute is the SAME figure the tower banner prints, bond included: spec 08 §8
// and spec 09 §3. `teamAttribute` applies `System.PetArrayAdd`'s POWER component, which Everkai had been
// dropping -- so a five-of-a-type team read 15% low here too, in the Great Success input.
// SAVE-SAFE in the only direction that matters: this figure only ever RISES, and `validFamiliarDispatch`
// re-checks `>= area.power` on load, so no run that was legal when it started can become illegal.
export function dispatchTeamPower(s,team=dispatchState(s).team){return teamAttribute(s,team);}
/** LOCAL rule over measured inputs (see the header): 30% at the gate, half credit for surplus power. */
/** `PetManager:GetBigSuccess`, transcribed. Both halves of the ratio come from the same place Everkai
 *  gates on (rule 1): `dispatchTeamPower` against the area's own `Power` column. Uncapped above 100. */
export function greatSuccessChance(s,areaId,team=dispatchState(s).team){
 const area=dispatchArea(areaId);if(!area)return 0;
 if(!team.length||!area.power)return 0;
 const raw=(DISPATCH_CRIT_BP/10000+Math.pow(dispatchTeamPower(s,team)/area.power,DISPATCH_COEFFICIENT)-1)*100;
 return Math.max(0,Math.round(raw*100)/100);
}
/** Repeatable roll, so the same saved run always resolves the same way. */
function greatSuccessRoll(areaId,since,team){let h=2166136261;for(const c of `${areaId}:${since}:${[...team].join(',')}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return h%10000;}
/** One uniform draw per fragment pool, keyed on the run. LOCAL: the draw order; the pools and weights are measured. */
export function dispatchFragments(areaId,since,team){
 return (dispatchArea(areaId)?.fragments||[]).map((pool,k)=>{let h=2166136261;for(const c of `${areaId}:${since}:${[...team].join(',')}:pool${k}`)h=Math.imul(h^c.charCodeAt(0),16777619)>>>0;return pool.entries[h%pool.entries.length];});
}
export const dispatchHours=areaId=>dispatchArea(areaId)?.hours??0;
export const dispatchDone=(s,now=s.lastAt)=>{const r=dispatchState(s).run;return !!r&&now-r.since>=dispatchHours(r.area)*H;};
export const dispatchRemaining=(s,now=s.lastAt)=>{const r=dispatchState(s).run;return r?Math.max(0,r.since+dispatchHours(r.area)*H-now):0;};
/** An area is offered once its original tower floor (PetDispatch.TowerLv) has been cleared. */
export const dispatchUnlocked=(s,areaId)=>{const a=dispatchArea(areaId);return !!a&&towerReachOf(s)>=a.towerLv;};
export function validFamiliarDispatch(s){
 if(s.familiarDispatch===undefined)return true;
 const d=s.familiarDispatch;
 if(!d||typeof d!=='object'||Array.isArray(d)||Object.keys(d).length!==2||!Array.isArray(d.team))return false;
 if(d.team.length>DISPATCH_TEAM||new Set(d.team).size!==d.team.length||!d.team.every(id=>typeof id==='string'&&Object.hasOwn(s.familiars||{},id)))return false;
 if(d.run===null)return true;
 const r=d.run,area=dispatchArea(r?.area);
 if(!r||typeof r!=='object'||Array.isArray(r)||Object.keys(r).length!==2||!area)return false;
 if(!Number.isInteger(r.since)||r.since<0||r.since>s.lastAt)return false;
 // Levels, stars and cleared floors only ever rise, so a run that was legal when it started is still
 // legal now: re-checking both gates costs nothing and refuses a hand-edited run.
 return d.team.length===DISPATCH_TEAM&&dispatchUnlocked(s,r.area)&&dispatchTeamPower(s)>=area.power;
}
export function dispatchAction(s,action,target){
 if(!['dispatchTeam','dispatchStart','dispatchCollect','dispatchCancel'].includes(action))return null;
 const d=dispatchState(s),fail=error=>({state:s,error}),owned=Object.keys(s.familiars||{}).length;
 if(owned<DISPATCH_TEAM)return fail(`Welcome ${DISPATCH_TEAM} familiars before dispatching.`);
 if(action==='dispatchTeam'){
  if(d.run)return fail('A dispatch is already out. Collect or cancel it first.');
  if(!s.familiars?.[target])return fail('Welcome this familiar first.');
  const team=d.team.includes(target)?d.team.filter(id=>id!==target):[...d.team,target];
  if(team.length>DISPATCH_TEAM)return fail(`Choose exactly ${DISPATCH_TEAM} familiars.`);
  return {state:{...s,familiarDispatch:{...d,team}},message:'Dispatch team saved.'};
 }
 if(action==='dispatchCancel'){
  if(!d.run)return fail('No dispatch is out.');
  // lang.json Pet_Dispatch_Text14: cancelling forfeits the run entirely.
  return {state:{...s,familiarDispatch:{...d,run:null}},message:'Dispatch cancelled. No rewards were earned.'};
 }
 if(action==='dispatchStart'){
  if(d.run)return fail('A dispatch is already out. Collect or cancel it first.');
  const area=dispatchArea(target);
  if(!area)return fail('Choose a dispatch area.');
  if(d.team.length!==DISPATCH_TEAM)return fail(`Not enough familiars. Assign ${DISPATCH_TEAM} to continue.`);
  if(!dispatchUnlocked(s,area.id))return fail(`Unlocks at floor ${area.towerLv} in the Familiar Tower.`);
  const power=dispatchTeamPower(s);
  if(power<area.power)return fail(`Needs ${area.power.toLocaleString()} team Power. This team has ${power.toLocaleString()}.`);
  return {state:{...s,familiarDispatch:{...d,run:{area:area.id,since:s.lastAt}}},message:`Dispatched to area ${area.id} for ${area.hours} hours · ${greatSuccessChance(s,area.id)}% Great Success.`};
 }
 if(!d.run)return fail('No dispatch is out.');
 if(!dispatchDone(s))return fail(`Still away. ${Math.ceil(dispatchRemaining(s)/H)} hours left.`);
 const area=dispatchArea(d.run.area),great=greatSuccessRoll(d.run.area,d.run.since,d.team)<Math.round(greatSuccessChance(s,d.run.area)*100);
 const f=s.familiarSupplies||{levelUp:0,classUp:0,since:null};
 const levelUp=area.base.levelUp+(great?area.great.levelUp:0),classUp=area.base.classUp+(great?area.great.classUp:0);
 if(f.levelUp+levelUp>MAX_ITEMS||f.classUp+classUp>MAX_ITEMS)return fail('Familiar item storage is full. Train a familiar first.');
 // Great Success also pays one draw from each Reward_PetDispatch_Add_<area>_<k> pool (uniform weight 100),
 // repeatable for the same run like the Great Success roll itself.
 const fragments=great?dispatchFragments(d.run.area,d.run.since,d.team):[];
 let explore=null;
 if(fragments.length){explore=cloneExplore(s);for(const [id,n] of fragments)if(!grantPieces(explore,id,n))return fail('Familiar fragment storage is full.');}
 return {state:{...s,familiarSupplies:{...f,levelUp:f.levelUp+levelUp,classUp:f.classUp+classUp},familiarDispatch:{...d,run:null},...(explore?{familiarExplore:explore}:{})},
  message:`${great?'Great Success! ':''}Dispatch returned with ${levelUp.toLocaleString()} level-up${classUp?` and ${classUp.toLocaleString()} class-up`:''} items${fragments.length?` and ${fragments.map(([id,n])=>`${n} ${familiarById(id).name} fragments`).join(', ')}`:''}.`};
}
