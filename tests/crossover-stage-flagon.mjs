// Child process for tests/crossover-step1.test.mjs: the catalogue reads ?crossover=1 once at import,
// so the flag-on path has to run in its own process. Prints one JSON line.
//
// The arc is a FIXTURE, pushed onto EVENTS here rather than shipped: step 1 of docs/crossover-plan.md
// introduces the per-arc cost MECHANISM, and step 4 is what writes the 33 real crossover arcs.
globalThis.location={search:'?crossover=1'};
const T=new Date('2026-09-16T09:00:00').getTime();
const {fresh,act,valid,refusedBy}=await import('../lib/game.mjs');
const {starterHabits}=await import('../lib/habits.mjs');
const {EVENTS,costPerStage,completionsEarned}=await import('../lib/events.mjs');
const {FELLOWS}=await import('../lib/catalog.mjs');
const ID='xover_msf_spiderman',ARC='XoverFixture',COST=30;
EVENTS.push({id:ARC,name:'Fixture Arc',source:'test',costPerStage:COST,
 cast:[{id:ID,name:'Spider-Man',kind:'Fellow',title:'t',label:'Spider-Man'}],
 stages:[{step:1,member:ID,kind:'fellows'}]});
let s={...fresh(T),habits:starterHabits(T)};
for(let day=0;completionsEarned(s)<COST&&day<900;day++){
 const at=T+day*86400000;
 for(const h of s.habits.items.filter(x=>x.freq==='daily')){
  if(completionsEarned(s)>=COST)break;
  const r=act(s,'habitComplete',at,h.id);if(!r.error)s=r.state;
 }
}
const r=act(s,'eventClaim',s.lastAt,ARC);
if(!r.error)s=r.state;
console.log(JSON.stringify({listed:FELLOWS.some(f=>f.id===ID),cost:costPerStage(ARC),error:r.error||null,
 message:r.message||null,owned:!!s.fellows[ID],inFamily:!!s.family[ID],spent:s.events?.spent??null,
 valid:valid(s),refusedBy:refusedBy(s),save:JSON.stringify(s)}));
