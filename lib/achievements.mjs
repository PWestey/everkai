import data from './achievement-data.json' with {type:'json'};
import {rosterOperation} from './businesses.mjs';
// The original's achievement ladder (E16). Everkai shipped eleven hand-written local milestones; the
// original ships 4,145 steps in 32 chains across 5 categories, and the data was fully recoverable.
//
// TWO TRAPS THIS IMPORT WALKED INTO AND OUT OF, both recorded in achievement-data.json:
//  - Achievement.json is an EMPTY WRAPPER. The rows live in TaskGeneral.json (25,593 rows, 4,145 of them
//    A_task_*). A wrapper-assuming counter reports 0 and reads as "the data does not exist".
//  - 190 of those rows carry taskReq {type, id} rather than {type, count} -- StageClear names a stage
//    ("5-6-0"), not a quantity. That chain is EXCLUDED rather than approximated.
// 22 of the 32 requirement types are excluded, each with its reason in the data file: Arena and ranking
// types are multiplayer (DATA-07 records rankings as server-fabricated), event currencies are not
// permanent systems, and three more were dropped because Everkai has no honest counter for them --
// inventing one to satisfy an achievement is how fake progress gets shipped.
export const ACHIEVEMENT_CHAINS=data.chains;
export const ACHIEVEMENT_CATEGORIES=[...new Set(data.chains.map(c=>c.category))];
export const ACHIEVEMENT_EXCLUDED=data.excluded;

/** Each metric reads state Everkai already keeps. None of them writes, and none of them is a proxy for
 *  something else -- a metric that would have needed a proxy was excluded at import time instead. */
export const METRICS={
 buildingLevels:s=>Object.values(s.buildings||{}).reduce((n,b)=>n+(b?.level||0),0),
 fellowCount:s=>Object.keys(s.fellows||{}).length,
 familyCount:s=>Object.keys(s.family||{}).length,
 totalIntimacy:s=>Object.values(s.family||{}).reduce((n,f)=>n+(f?.intimacy||0),0),
 fellowSkill:s=>Object.values(s.fellows||{}).reduce((n,f)=>n+(f?.skill||0),0),
 rosterPower:s=>Math.floor(rosterOperation(s)*1000),
 dates:s=>s.stats?.dates||0,
 pupils:s=>(s.school?.pupils?.length||0)+(s.school?.graduates||0),
 graduates:s=>s.school?.graduates||0,
 fishCaught:s=>s.fishing?.catches?.length||0,
};
const STEP=new Map();
for(const c of ACHIEVEMENT_CHAINS)for(const st of c.steps)STEP.set(st.id,{...st,chain:c});
export const achievementStep=id=>STEP.get(id)||null;
export const achievementState=s=>s.achievements&&typeof s.achievements==='object'&&!Array.isArray(s.achievements)?s.achievements:{policyVersion:1,claimed:[]};
export const achievementClaimed=s=>new Set(achievementState(s).claimed||[]);
/** The next unclaimed step of a chain, with its progress. Chains are strictly ordered, so a step only
 *  becomes claimable once every step before it is claimed -- the original's `nextTask` link. */
export function chainProgress(s,chain){
 const done=achievementClaimed(s);
 const index=chain.steps.findIndex(st=>!done.has(st.id));
 const step=index===-1?null:chain.steps[index];
 const have=METRICS[chain.metric](s);
 return {step,index:index===-1?chain.steps.length:index,total:chain.steps.length,have,ready:!!step&&have>=step.goal};
}
export function validAchievements(s){
 const t=s.achievements;
 if(t===undefined)return true;
 if(!t||typeof t!=='object'||Array.isArray(t)||t.policyVersion!==1||!Array.isArray(t.claimed))return false;
 if(t.claimed.length>STEP.size||new Set(t.claimed).size!==t.claimed.length)return false;
 const done=new Set(t.claimed);
 for(const id of t.claimed)if(!STEP.has(id))return false;
 // A chain's claims must be a PREFIX of it: claiming step 5 without steps 1-4 is not reachable by play.
 for(const c of ACHIEVEMENT_CHAINS){
  let seen=false;
  for(const st of c.steps){
   if(done.has(st.id)){if(seen)return false}else seen=true;
  }
 }
 return true;
}
export function achievementAction(s,action,target){
 const fail=error=>({error});
 if(action!=='achievementClaim')return null;
 const chain=ACHIEVEMENT_CHAINS.find(c=>c.id===target);
 if(!chain)return fail('Choose an achievement.');
 const p=chainProgress(s,chain);
 if(!p.step)return fail('Every step of this achievement is already claimed.');
 if(!p.ready)return fail(`${p.have.toLocaleString()} of ${p.step.goal.toLocaleString()} — keep going.`);
 const t=achievementState(s);
 const next={...s,achievements:{...t,claimed:[...(t.claimed||[]),p.step.id]},
  crystals:Math.min(Number.MAX_SAFE_INTEGER,(s.crystals||0)+(p.step.crystals||0))};
 if(p.step.gold)next.gold=Math.min(Number.MAX_SAFE_INTEGER,s.gold+p.step.gold);
 const paid=[p.step.crystals?`${p.step.crystals} crystals`:'',p.step.gold?`${p.step.gold.toLocaleString()} gold`:''].filter(Boolean).join(' · ');
 return {state:next,message:`${chain.category} achievement ${p.index+1}/${p.total} claimed${paid?' · '+paid:''}`};
}
