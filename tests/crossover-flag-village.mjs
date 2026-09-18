// Child process for tests/everkai-additions.test.mjs: the catalogue reads ?crossover=1 once at import,
// so a flag-on village has to be built in its own process. Prints one JSON line.
//
// The two prototypes used to arrive at the Recruit counter here. They cannot any more -- recruitPrice
// returns null for every addition (lib/summon.mjs) -- so this village earns habit completions and
// claims stage 1 of each character's own arc, which is now the only route in. That is also the path a
// real player takes, so this doubles as the end-to-end check of the unlock gate.
globalThis.location={search:'?crossover=1'};
const T=new Date('2026-09-16T09:00:00').getTime();
const {fresh,act,valid,refusedBy}=await import('../lib/game.mjs');
const {starterHabits}=await import('../lib/habits.mjs');
const {FELLOWS,FAMILY,ORIGINAL_FELLOWS,ORIGINAL_FAMILY}=await import('../lib/catalog.mjs');
const {recruitOffers,recruitPrice}=await import('../lib/summon.mjs');
const {CROSSOVER_EVENTS}=await import('../lib/events.mjs');
const roster=(await import('../lib/crossover-roster-data.json',{with:{type:'json'}})).default;
const {bondedPower}=await import('../lib/adventure.mjs');
const {insightRule}=await import('../lib/insight.mjs');
const {costPerStage,completionsEarned,completionsAvailable,unlockEvent,visibleEvents}=await import('../lib/events.mjs');
const ids=['xover_msf_spiderman','xover_swgoh_vaderduelsend'];
const arcs=ids.map(id=>unlockEvent(id).id);
const need=arcs.reduce((n,a)=>n+costPerStage(a),0);
const log=[];
let s={...fresh(T),habits:starterHabits(T)};
// Earn the completions the way a player does: whole days of the shipped journal.
for(let day=0;completionsEarned(s)<need&&day<30;day++){
 const at=T+day*86400000;
 for(const h of s.habits.items.filter(x=>x.freq==='daily')){
  if(completionsEarned(s)>=need)break;
  const r=act(s,'habitComplete',at,h.id);if(!r.error)s=r.state;
 }
}
const earnedBeforeClaims=completionsEarned(s);
s={...s,fellowXP:1e9,inventory:{...s.inventory,Item_Talent_Hero_1:500},
 summon:{policyVersion:1,seq:0,stoneFragments:0,stones:5,insigniaFragments:0,valiant:5,archangel:0,starShards:0,days:[],weeks:[],recruited:[]}};
const offered=recruitOffers(s).filter(o=>ids.includes(o.id)).map(o=>({id:o.id,rarity:o.rarity,cost:o.cost}));
const step=(action,target,value)=>{const r=act(s,action,s.lastAt,target,value);log.push({action,target,error:r.error||null,message:r.message||null});if(!r.error)s=r.state;return r};
// The counter must refuse them by name, pointing at the arc rather than at a missing price.
const counterRefusals=ids.map(id=>({id,price:recruitPrice(id),error:act(s,'summonRecruit',s.lastAt,id,{seq:s.summon.seq}).error||null}));
for(const [i,id] of ids.entries()){
 step('eventClaim',arcs[i]);
 step('train',id,5);
 step('trainTalent',id,5);
 const rule=insightRule(id);
 if(rule){s={...s,insight:{balances:{...(s.insight?.balances||{}),[rule.materialId]:1000},levels:{...(s.insight?.levels||{})}}};step('trainInsight',id,1)}
}
step('activateOriginalProgression');

// ---- THE FLAG-ON CENSUS over all 163, measured here because only this process has the flag. ------
// Everything else in this file is about the two prototypes; this is the whole roster at once: it is
// listed, it is in exactly one arc, and the counter neither offers nor prices a single one of them.
const census=(()=>{
 const rosterIds=roster.characters.map(c=>c.id);
 const fellowIds=roster.characters.filter(c=>c.kind==='fellows').map(c=>c.id);
 const familyIds=roster.characters.filter(c=>c.kind==='family').map(c=>c.id);
 const listedFellows=FELLOWS.filter(f=>f.addition).map(f=>f.id);
 const listedFamily=FAMILY.filter(f=>f.addition).map(f=>f.id);
 const allOffers=recruitOffers(s);
 const stages=CROSSOVER_EVENTS.flatMap(e=>e.stages.map(st=>({member:st.member,arc:e.id,kind:st.kind})));
 // Set equality, plus order equality reported separately. The Fellow rows are emitted in the roster's
 // own rank order; the 30 hand-authored Family rows are grouped by franchise instead, and nothing
 // reads the catalogue in rank order, so that is recorded rather than asserted away.
 const sameSet=(a,b)=>JSON.stringify([...a].sort())===JSON.stringify([...b].sort());
 return {
  rosterSize:rosterIds.length,
  fellows:{roster:fellowIds.length,listed:listedFellows.length,
   same:sameSet(listedFellows,fellowIds),sameOrder:JSON.stringify(listedFellows)===JSON.stringify(fellowIds)},
  family:{roster:familyIds.length,listed:listedFamily.length,
   same:sameSet(listedFamily,familyIds),sameOrder:JSON.stringify(listedFamily)===JSON.stringify(familyIds)},
  originals:{fellows:ORIGINAL_FELLOWS.length,family:ORIGINAL_FAMILY.length},
  totals:{fellows:FELLOWS.length,family:FAMILY.length},
  // The counter, over the WHOLE roster and not just the ids this village recruited.
  offeredAdditions:allOffers.filter(o=>rosterIds.includes(o.id)).map(o=>o.id),
  offerCount:allOffers.length,
  pricedAdditions:rosterIds.filter(id=>recruitPrice(id)!==null),
  // Arcs: exactly one stage per character, and the kind on it matches the roster's own split.
  stageCount:stages.length,
  inNoArc:rosterIds.filter(id=>!stages.some(st=>st.member===id)),
  inTwoArcs:rosterIds.filter(id=>stages.filter(st=>st.member===id).length>1),
  kindDisagrees:roster.characters.filter(c=>stages.find(st=>st.member===c.id)?.kind!==c.kind).map(c=>c.id),
  // Types, flag ON: a Fellow's catalogue type must equal the roster's; Family carry null.
  typeDisagrees:roster.characters.filter(c=>{
   const rec=[...FELLOWS,...FAMILY].find(f=>f.id===c.id);
   return !rec||rec.type!==(c.kind==='fellows'?c.type:null);
  }).map(c=>c.id),
 };
})();

console.log(JSON.stringify({census,listed:FELLOWS.filter(f=>ids.includes(f.id)).map(f=>f.id),offered,log,counterRefusals,
 arcs,need,earnedBeforeClaims,spent:s.events?.spent??null,available:completionsAvailable(s),
 visibleArcs:visibleEvents().length,valid:valid(s),refusedBy:refusedBy(s),
 fellows:Object.fromEntries(ids.map(id=>[id,s.fellows[id]||null])),power:Object.fromEntries(ids.map(id=>[id,s.fellows[id]?bondedPower(s,id):null])),save:JSON.stringify(s)}));
