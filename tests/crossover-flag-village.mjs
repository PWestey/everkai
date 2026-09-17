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
const {FELLOWS}=await import('../lib/catalog.mjs');
const {recruitOffers,recruitPrice}=await import('../lib/summon.mjs');
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
console.log(JSON.stringify({listed:FELLOWS.filter(f=>ids.includes(f.id)).map(f=>f.id),offered,log,counterRefusals,
 arcs,need,earnedBeforeClaims,spent:s.events?.spent??null,available:completionsAvailable(s),
 visibleArcs:visibleEvents().length,valid:valid(s),refusedBy:refusedBy(s),
 fellows:Object.fromEntries(ids.map(id=>[id,s.fellows[id]||null])),power:Object.fromEntries(ids.map(id=>[id,s.fellows[id]?bondedPower(s,id):null])),save:JSON.stringify(s)}));
