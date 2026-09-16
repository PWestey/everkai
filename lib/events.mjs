import data from './event-data.json' with {type:'json'};
import {FELLOWS,FAMILY} from './catalog.mjs';
import {newFellow} from './adventure.mjs';
// Lite habit-events (EVT-21). The original's crossover mega events each shipped a whole second game --
// stamina map exploration, match-3 turn battles, sparring ladders, an exclusive gacha with pity, a power
// ranking and a paid event pass (docs/event-catalog.md section 4.4). None of that survives contact with
// an offline single-player habit game, and rebuilding it would be building the wrong thing.
//
// What the events were actually FOR, from the player's side, is meeting the cast. Everkai already ships
// all 28 of these characters -- they were reachable only by paying the recruit counter, with no story
// attached. So an event here is an ARC: a short track whose steps are paid for with habit completions,
// each step introducing one member of the cast.
//
// Habit completions are the one currency this game mints, so they are what an event costs. They are
// spent, not merely checked: `spent` is a running total across all events, and what is available is the
// lifetime completion count minus it. That means an event cannot be farmed by re-entering it, and the
// cost of the whole cast (28 stages) is a real 280 completions rather than a formality.
export const EVENTS=data.events;
export const COMPLETIONS_PER_STAGE=10;
export const eventById=id=>EVENTS.find(e=>e.id===id)||null;
const CAST=new Set(EVENTS.flatMap(e=>e.stages.map(s=>s.member)));
export const eventState=s=>s.events&&typeof s.events==='object'&&!Array.isArray(s.events)?s.events:{policyVersion:1,spent:0,claimed:{}};
/** Lifetime habit completions. h.history is capped at 20,000 entries, so a very long-running village can
 *  lose the oldest rows; `earned` can therefore only ever UNDER-report, never over-report, which is the
 *  safe direction -- and 20,000 completions is 71 times the whole cast. */
export const completionsEarned=s=>(s.habits?.history||[]).reduce((n,r)=>n+(r?.kind==='complete'?1:0),0);
export const completionsAvailable=s=>Math.max(0,completionsEarned(s)-(eventState(s).spent||0));
export const eventClaimed=(s,id)=>eventState(s).claimed?.[id]||0;
export const eventNextStage=(s,id)=>{const e=eventById(id);if(!e)return null;const n=eventClaimed(s,id);return n>=e.stages.length?null:e.stages[n]};

export function validEvents(s){
 const t=s.events;
 if(t===undefined)return true;
 if(!t||typeof t!=='object'||Array.isArray(t)||t.policyVersion!==1)return false;
 if(!Number.isSafeInteger(t.spent)||t.spent<0||t.spent>1e7)return false;
 if(!t.claimed||typeof t.claimed!=='object'||Array.isArray(t.claimed))return false;
 let stages=0;
 for(const [id,n] of Object.entries(t.claimed)){
  const e=eventById(id);
  if(!e||!Number.isSafeInteger(n)||n<0||n>e.stages.length)return false;
  stages+=n;
  // Every member an event says it handed over must actually be in the village.
  for(const st of e.stages.slice(0,n))if(!(st.member.startsWith('hero_')?s.fellows?.[st.member]:s.family?.[st.member]))return false;
 }
 // The ledger must add up: nothing was claimed that was not paid for.
 return t.spent===stages*COMPLETIONS_PER_STAGE;
}

export function eventAction(s,action,target){
 const fail=error=>({error});
 if(action!=='eventClaim')return null;
 const e=eventById(target);
 if(!e)return fail('Choose an event.');
 const stage=eventNextStage(s,target);
 if(!stage)return fail(`${e.name} is complete — the whole cast has joined your village.`);
 const have=completionsAvailable(s);
 if(have<COMPLETIONS_PER_STAGE)return fail(`Finish ${COMPLETIONS_PER_STAGE-have} more habit${COMPLETIONS_PER_STAGE-have===1?'':'s'} to continue ${e.name}.`);
 const member=stage.member,isFellow=member.startsWith('hero_');
 const person=(isFellow?FELLOWS:FAMILY).find(p=>p.id===member);
 if(!person)return fail('That character is not in the catalogue.');
 // Already owning the character is not a refusal -- the arc still advances, they simply do not re-join.
 const already=isFellow?!!s.fellows?.[member]:!!s.family?.[member];
 const t=eventState(s);
 const next={...s,events:{...t,spent:(t.spent||0)+COMPLETIONS_PER_STAGE,claimed:{...t.claimed,[target]:eventClaimed(s,target)+1}}};
 if(!already){
  if(isFellow)next.fellows={...s.fellows,[member]:newFellow()};
  else next.family={...s.family,[member]:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}};
 }
 return {state:next,message:`${person.name} joined your village · ${e.name} ${eventClaimed(s,target)+1}/${e.stages.length}`+(already?' (already known — the arc continues)':'')};
}
export const EVENT_CAST=CAST;
