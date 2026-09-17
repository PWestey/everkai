// Child process for tests/crossover-arcs.test.mjs: the catalogue reads ?crossover=1 once at import, so
// the claimable path has to run in its own process. Claims stage 1 of one arc from each price tier and
// reports what changed in the village. Prints one JSON line.
globalThis.location={search:'?crossover=1'};
const T=new Date('2026-09-16T09:00:00').getTime();
const {fresh,act,valid,refusedBy}=await import('../lib/game.mjs');
const {starterHabits}=await import('../lib/habits.mjs');
const {costPerStage,eventById,completionsEarned,completionsAvailable}=await import('../lib/events.mjs');
const ARCS=['XoverMsf01','XoverMsf06','XoverMsf11'];          // tier 1, 2, 3
const members=ARCS.map(id=>eventById(id).stages[0].member);
const costs=ARCS.map(costPerStage);
const need=costs.reduce((a,b)=>a+b,0);
let s={...fresh(T),habits:starterHabits(T)};
for(let day=0;completionsEarned(s)<need&&day<60;day++){
 const at=T+day*86400000;
 for(const h of s.habits.items.filter(x=>x.freq==='daily')){
  if(completionsEarned(s)>=need)break;
  const r=act(s,'habitComplete',at,h.id);if(!r.error)s=r.state;
 }
}
const earned=completionsEarned(s),before=s,errors=[],messages=[];
for(const arc of ARCS){
 const r=act(s,'eventClaim',s.lastAt,arc);
 if(r.error)errors.push({arc,error:r.error});else{messages.push(r.message);s=r.state}
}
// What else moved? Compare every top-level key of the save, so "grants the character and nothing else"
// is measured rather than asserted about the two keys we happen to remember.
const changed=(a,b)=>[...new Set([...Object.keys(a||{}),...Object.keys(b||{})])]
 .filter(k=>JSON.stringify(a?.[k])!==JSON.stringify(b?.[k])).sort();
const otherChanges=changed(before,s);
// `habits` shows up because every action resets the one-step undo buffer; naming which sub-keys moved
// keeps "nothing else" a measurement rather than an allowance.
const habitChanges=changed(before.habits,s.habits);
console.log(JSON.stringify({arcs:ARCS,members,costs,need,earned,errors,messages,habitChanges,
 gained:Object.keys(s.fellows).filter(id=>!before.fellows[id]),
 familyGained:Object.keys(s.family).filter(id=>!before.family[id]),
 otherChanges,claimed:s.events.claimed,spent:s.events.spent,available:completionsAvailable(s),
 valid:valid(s),refusedBy:refusedBy(s),save:JSON.stringify(s)}));
