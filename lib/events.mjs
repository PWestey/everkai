import data from './event-data.json' with {type:'json'};
import crossover from './crossover-arc-data.json' with {type:'json'};
import {fellowById,familyById} from './catalog.mjs';
import {crossoverEnabled} from './everkai-additions.mjs';
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
/** The eight Isekai arcs, from the APK's crossover events. Their names, cast and costPerStage:10 are
 *  save-critical (rule 12) and live in lib/event-data.json. */
export const ISEKAI_EVENTS=data.events;
/** The 33 crossover arcs (163 stages), generated into lib/crossover-arc-data.json from the owner's rank
 *  order by scripts/crossover/build-arcs.mjs. Each carries flag:'crossover'. */
export const CROSSOVER_EVENTS=crossover.events;
/** EVERY arc, flagged or not. validEvents must see all of them: a village that claimed a crossover
 *  stage with ?crossover=1 on has to keep loading with it off, and an arc the validator cannot find is
 *  a refused save and a quarantined `events` subtree. Only what the player can ACT on and SEE is gated
 *  -- see visibleEvents and eventAction. */
export const EVENTS=[...ISEKAI_EVENTS,...CROSSOVER_EVENTS];
export const COMPLETIONS_PER_STAGE=10;
export const eventById=id=>EVENTS.find(e=>e.id===id)||null;
/** The arcs the panel lists. Without the flag that is exactly the eight Isekai arcs, as today. */
export const visibleEvents=(enabled=crossoverEnabled())=>enabled?EVENTS:ISEKAI_EVENTS;
/** Which arc hands this character over, if any. The Recruit counter no longer sells additions, so the
 *  panel needs somewhere to send the player instead (lib/summon.mjs recruitPrice). */
export const unlockEvent=member=>EVENTS.find(e=>e.stages.some(st=>st.member===member))||null;
/** What one stage of THIS arc costs. The eight Isekai arcs are pinned at 10 in lib/event-data.json and
 *  must stay there: `s.events.spent` is a stored value DERIVED from this number (CLAUDE.md rule 12), so
 *  moving it would make validEvents refuse every save that ever claimed a stage -- the mine-table
 *  lockout of 2026-09-16 with a different table. A later arc may price its stages differently; an arc
 *  with no `costPerStage` of its own falls back to the original 10, so the arithmetic for an existing
 *  save is byte-identical either way. */
export const costPerStage=id=>{const raw=eventById(id)?.costPerStage,c=typeof raw==='number'?raw:NaN;return Number.isSafeInteger(c)&&c>0?c:COMPLETIONS_PER_STAGE};
/** Which save subtree a stage hands its member into. Data, not a prefix: `member.startsWith('hero_')`
 *  sent every non-`hero_` id to s.family, so an `xover_*` stage failed eventAction's catalogue lookup
 *  and made validEvents reject the claim outright. A stage with no declared `kind` falls back to that
 *  old prefix rule, so nothing about an existing arc can shift while the field is being filled in. */
export const stageKind=stage=>stage?.kind==='fellows'||stage?.kind==='family'?stage.kind:stage?.member?.startsWith('hero_')?'fellows':'family';
/** The catalogue record a stage hands over. fellowById, not FELLOWS: FELLOWS is flag-gated
 *  (lib/catalog.mjs:18), so with ?crossover=1 off an addition is absent from it and a claim used to
 *  fail with "That character is not in the catalogue." fellowById resolves additions either way.
 *  The family branch now goes through familyById for exactly the same reason: the 30 crossover Family
 *  members of docs/crossover-family-split.md are in the additions layer, so with the flag off a
 *  crossover Family stage failed with "That character is not in the catalogue." and validEvents then
 *  refused every save that had claimed it. */
export const stagePerson=stage=>stageKind(stage)==='fellows'?fellowById(stage?.member)||null:familyById(stage?.member)||null;
/** Is the stage's member already in the village? */
export const stageOwned=(s,stage)=>!!(stageKind(stage)==='fellows'?s.fellows?.[stage?.member]:s.family?.[stage?.member]);
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
 let paid=0;
 for(const [id,n] of Object.entries(t.claimed)){
  const e=eventById(id);
  if(!e||!Number.isSafeInteger(n)||n<0||n>e.stages.length)return false;
  paid+=n*costPerStage(id);
  // Every member an event says it handed over must actually be in the village.
  for(const st of e.stages.slice(0,n))if(!stageOwned(s,st))return false;
 }
 // The ledger must add up: nothing was claimed that was not paid for. Summed per arc rather than
 // stages*COMPLETIONS_PER_STAGE so a differently priced arc can join without refusing older saves.
 return t.spent===paid;
}

export function eventAction(s,action,target){
 const fail=error=>({error});
 if(action!=='eventClaim')return null;
 const e=eventById(target);
 // A flagged arc is refused with the SAME message as an arc that does not exist, so the flag being off
 // does not leak the arc's name, its cast or even that it is there. validEvents still knows them all.
 if(!e||(e.flag&&!crossoverEnabled()))return fail('Choose an event.');
 const stage=eventNextStage(s,target);
 if(!stage)return fail(`${e.name} is complete — the whole cast has joined your village.`);
 const cost=costPerStage(target),have=completionsAvailable(s);
 if(have<cost)return fail(`Finish ${cost-have} more habit${cost-have===1?'':'s'} to continue ${e.name}.`);
 const member=stage.member,isFellow=stageKind(stage)==='fellows';
 const person=stagePerson(stage);
 if(!person)return fail('That character is not in the catalogue.');
 // Already owning the character is not a refusal -- the arc still advances, they simply do not re-join.
 const already=stageOwned(s,stage);
 const t=eventState(s);
 const next={...s,events:{...t,spent:(t.spent||0)+cost,claimed:{...t.claimed,[target]:eventClaimed(s,target)+1}}};
 if(!already){
  if(isFellow)next.fellows={...s.fellows,[member]:newFellow()};
  else next.family={...s.family,[member]:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}};
 }
 return {state:next,message:`${person.name} joined your village · ${e.name} ${eventClaimed(s,target)+1}/${e.stages.length}`+(already?' (already known — the arc continues)':'')};
}
export const EVENT_CAST=CAST;
