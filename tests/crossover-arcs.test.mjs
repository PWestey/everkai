import test from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {existsSync,readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fresh,act,valid,decode,refusedBy,lastQuarantine,startingSave} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {EVENTS,ISEKAI_EVENTS,CROSSOVER_EVENTS,COMPLETIONS_PER_STAGE,costPerStage,stageKind,stagePerson,
        validEvents,eventById,visibleEvents,unlockEvent,completionsEarned} from '../lib/events.mjs';
import {ADDITION_FELLOWS,additionById,isAddition} from '../lib/everkai-additions.mjs';
import {ORIGINAL_FELLOWS,FAMILY,fellowById} from '../lib/catalog.mjs';
import {recruitOffers,recruitPrice} from '../lib/summon.mjs';
import {RARITY_N_ANCHORS} from '../scripts/crossover/pick-template.mjs';
import {buildArcs,arcFileText,TIER_COST,tierOf,STAGES_PER_ARC} from '../scripts/crossover/build-arcs.mjs';
import roster from '../lib/crossover-roster-data.json' with {type:'json'};
import arcData from '../lib/crossover-arc-data.json' with {type:'json'};
import {newFellow} from '../lib/adventure.mjs';
import {BUSINESSES,enterpriseBreakdown} from '../lib/businesses.mjs';
import {fellowOperation} from '../lib/operations.mjs';

// The 33 crossover arcs (docs/crossover-storyline-plan.md, tasks 5 / 7 / 8 / 10 of its section 7).
// This process has no ?crossover=1, so every assertion here is also a flag-OFF assertion: the arc data
// is present for validEvents, and nothing the player can act on or see is.
//
// NOT covered here, and deliberately not built: the per-arc prologue scene of section 4.2. It is the
// plan's task 6, it moves two pinned storybook counts, and the gate the owner asked for -- "a crossover
// character joins only by finishing its stage" -- does not depend on it.
const T=new Date('2026-09-16T09:00:00').getTime();
const TYPES=['Brave','Diligent','Informed','Inspiring','Unfettered'];
const FAMILY_SPLIT='docs/crossover-family-split.md';
const own=(s,id)=>({...s,fellows:{...s.fellows,[id]:newFellow()}});
const alpha=(a,b)=>a<b?-1:a>b?1:0;   // oxlint require-array-sort-compare
function withCompletions(n){
 let s={...fresh(T),habits:starterHabits(T)},day=0;
 while(completionsEarned(s)<n&&day<400){
  const at=T+day*86400000;
  for(const h of s.habits.items.filter(x=>x.freq==='daily')){
   if(completionsEarned(s)>=n)break;
   const r=act(s,'habitComplete',at,h.id);if(!r.error)s=r.state;
  }
  day++;
 }
 assert.ok(completionsEarned(s)>=n,`fixture earned ${completionsEarned(s)} of ${n}`);
 return s;
}

// ---------------------------------------------------------------------------------------------------
// Coverage guards: the 163, exactly once each, in the owner's order
// ---------------------------------------------------------------------------------------------------

test('every one of the 163 crossover characters is in exactly one arc',()=>{
 assert.equal(roster.characters.length,163);
 const wanted=new Set(roster.characters.map(c=>c.id));
 const members=CROSSOVER_EVENTS.flatMap(e=>e.stages.map(st=>st.member));
 assert.equal(members.length,163,'163 stages');
 // Set equality both ways, by id and not by count: a swap would keep the count identical.
 const got=new Set(members);
 assert.deepEqual([...got].sort(alpha),[...wanted].sort(alpha));
 assert.equal(got.size,members.length,'no character is in two arcs, or twice in one');
 for(const id of wanted)assert.equal(members.filter(m=>m===id).length,1,id);
 // NEGATIVE CONTROL on the comparison itself: dropping one stage must be named, not tolerated.
 const short=members.filter(m=>m!=='xover_msf_hulk');
 assert.notDeepEqual([...new Set(short)].sort(alpha),[...wanted].sort(alpha));
 assert.equal(new Set(short).has('xover_msf_hulk'),false,'the probe really can see a missing id');
 // And a duplicate must break the size check it is guarded by.
 assert.notEqual(new Set([...members,'xover_msf_hulk']).size,members.length+1);
});

test('the grouping re-derives from the roster: arc n holds ranks 5n-4 .. 5n',()=>{
 for(const franchise of ['Marvel','Star Wars']){
  const ranked=roster.characters.filter(c=>c.franchise===franchise).sort((a,b)=>a.rank-b.rank);
  assert.deepEqual(ranked.map(c=>c.rank),ranked.map((_,i)=>i+1),`${franchise} ranks are 1..n with no gap`);
  const arcs=CROSSOVER_EVENTS.filter(e=>e.franchise===franchise);
  for(const [i,arc] of arcs.entries()){
   const block=ranked.slice(i*STAGES_PER_ARC,(i+1)*STAGES_PER_ARC);
   assert.deepEqual(arc.stages.map(st=>st.member),block.map(c=>c.id),`${arc.id} is ranks ${i*5+1}-${i*5+block.length}`);
   assert.deepEqual(arc.stages.map(st=>st.step),block.map((_,k)=>k+1),`${arc.id} steps are 1..n in order`);
   assert.deepEqual(arc.cast.map(c=>c.id),block.map(c=>c.id),`${arc.id} cast order follows the stages`);
   assert.deepEqual(arc.stages.map(st=>st.kind),block.map(c=>c.kind),'stage kind comes from the roster');
  }
 }
 // The whole file, re-derived from the roster by the generator, byte for byte. Hand-editing the
 // generated arcs -- or the roster without regenerating -- fails here rather than shipping.
 assert.equal(readFileSync(new URL('../lib/crossover-arc-data.json',import.meta.url),'utf8'),arcFileText());
 // NEGATIVE CONTROL: reorder two roster rows and the generator disagrees with the shipped file.
 const swapped=roster.characters.map(c=>c.rank===2&&c.franchise==='Marvel'?{...c,rank:3}
  :c.rank===3&&c.franchise==='Marvel'?{...c,rank:2}:c);
 assert.notDeepEqual(buildArcs(swapped)[0].stages.map(st=>st.member),CROSSOVER_EVENTS[0].stages.map(st=>st.member));
});

test('the roster file is the owner’s own ranking, not a re-derived one',()=>{
 assert.match(roster.source.sha256,/^[0-9a-f]{64}$/,'the source ranking file is hashed');
 // The corpus is private and not in the repo. When it IS present (CROSSOVER_ROSTER=<...>/
 // selected-roster.json) the mirror is compared row by row; otherwise the recorded hash is the record.
 const path=process.env.CROSSOVER_ROSTER;
 if(!path||!existsSync(path)){assert.ok(true,'corpus absent: hash is the only available check');return}
 const text=readFileSync(path,'utf8');
 assert.equal(createHash('sha256').update(text).digest('hex'),roster.source.sha256,'selected-roster.json moved');
 const src=JSON.parse(text);
 for(const [franchise,key] of [['Marvel','MSF'],['Star Wars','SWGOH']]){
  const mine=roster.characters.filter(c=>c.franchise===franchise).sort((a,b)=>a.rank-b.rank);
  assert.deepEqual(mine.map(c=>[c.rank,c.character,c.assetId]),
   src[key].sort((a,b)=>a.rank-b.rank).map(r=>[r.rank,r.character,r.assetId]),franchise);
 }
});

test('arc shape: 33 arcs, 19 Marvel and 14 Star Wars, each inside the proven 2-7 band',()=>{
 assert.equal(CROSSOVER_EVENTS.length,33);
 assert.equal(CROSSOVER_EVENTS.filter(e=>e.franchise==='Marvel').length,19);
 assert.equal(CROSSOVER_EVENTS.filter(e=>e.franchise==='Star Wars').length,14);
 assert.equal(EVENTS.length,41,'with the eight Isekai arcs');
 assert.equal(EVENTS.reduce((n,e)=>n+e.stages.length,0),198);
 const isekai=new Set(ISEKAI_EVENTS.map(e=>e.id));
 for(const e of CROSSOVER_EVENTS){
  assert.match(e.id,/^Xover(Msf|Swgoh)\d\d$/,e.id);
  assert.equal(isekai.has(e.id),false,`${e.id} collides with an Isekai arc id`);
  assert.equal(eventById(e.id),e);
  assert.ok(e.stages.length>=2&&e.stages.length<=7,`${e.id} has ${e.stages.length} stages`);
  assert.equal(e.stages.length,e.cast.length,`${e.id}: one stage per cast member`);
  assert.equal(e.flag,'crossover');
  for(const k of ['name','situation'])assert.ok(typeof e[k]==='string'&&e[k].length>3,`${e.id}.${k}`);
  assert.equal(new Set(e.stages.map(st=>st.title)).size,e.stages.length,`${e.id} repeats a stage title`);
  for(const st of e.stages)assert.ok(typeof st.title==='string'&&st.title.length>3,`${e.id}/${st.member} title`);
  assert.equal(new Set(e.cast.map(c=>c.label)).size,e.cast.length,`${e.id} has two cast entries labelled the same`);
 }
 assert.equal(new Set(EVENTS.map(e=>e.id)).size,41,'every arc id is unique');
 assert.equal(new Set(CROSSOVER_EVENTS.map(e=>e.name)).size,33,'every arc name is unique');
});

// ---------------------------------------------------------------------------------------------------
// The stage cost ladder, and the eight Isekai arcs it must not touch
// ---------------------------------------------------------------------------------------------------

test('stage costs are the owner’s 10/20/30 by tier, and the Isekai arcs are still 10',()=>{
 assert.deepEqual(TIER_COST,{1:10,2:20,3:30});
 assert.deepEqual(arcData.tiers,TIER_COST,'the shipped data file records the same ladder');
 assert.equal(arcData.flag,'crossover');
 assert.ok(/LOCAL/.test(arcData.localNumbers),'the three prices are declared LOCAL in the data file');
 for(const e of ISEKAI_EVENTS)assert.equal(costPerStage(e.id),10,`${e.id} must stay at 10 (rule 12)`);
 assert.equal(ISEKAI_EVENTS.reduce((n,e)=>n+e.stages.length*costPerStage(e.id),0),350);
 const perTier={1:0,2:0,3:0};
 for(const franchise of ['Marvel','Star Wars']){
  const arcs=CROSSOVER_EVENTS.filter(e=>e.franchise===franchise);
  for(const [i,e] of arcs.entries()){
   const tier=tierOf(i+1);
   assert.equal(e.tier,tier,`${e.id} tier`);
   assert.equal(e.costPerStage,TIER_COST[tier],`${e.id} cost`);
   assert.equal(costPerStage(e.id),TIER_COST[tier]);
   perTier[tier]+=e.stages.length;
  }
 }
 assert.deepEqual(perTier,{1:40,2:60,3:63},'40 characters at 10, 60 at 20, 63 at 30');
 const total=CROSSOVER_EVENTS.reduce((n,e)=>n+e.stages.length*e.costPerStage,0);
 assert.equal(total,3490,'the whole crossover cast costs 3,490 habit completions');
 assert.equal(total+350,3840,'and all 198 characters cost 3,840');
 assert.ok(total+350<1e7,'well inside the spent ceiling validEvents enforces');
});

test('the ledger adds up per arc at every tier, and a wrong total is refused',()=>{
 // Arithmetic only, in this flagless process: validEvents must accept a crossover ledger whatever the
 // flag says, or a village that played an arc with the flag on stops loading without it.
 const cases=[['XoverMsf01',10],['XoverMsf06',20],['XoverMsf11',30]];
 let s=fresh(T),spent=0;const claimed={};
 for(const [id,cost] of cases){
  assert.equal(costPerStage(id),cost,id);
  s=own(s,eventById(id).stages[0].member);
  claimed[id]=1;spent+=cost;
 }
 assert.equal(spent,60);
 assert.equal(validEvents({...s,events:{policyVersion:1,spent,claimed}}),true,'10 + 20 + 30');
 // NEGATIVE CONTROLS: the old flat price, and every off-by-one, must all be refused.
 for(const wrong of [3*COMPLETIONS_PER_STAGE,59,61,0,30,90])
  assert.equal(validEvents({...s,events:{policyVersion:1,spent:wrong,claimed}}),false,`${wrong} is not 60`);
 // A claim beyond the arc's length, and an unknown arc, are still refused.
 assert.equal(validEvents({...s,events:{policyVersion:1,spent:spent+10,claimed:{...claimed,XoverMsf01:2}}}),false);
 assert.equal(validEvents({...s,events:{policyVersion:1,spent:10,claimed:{XoverMsf99:1}}}),false);
 assert.equal(validEvents({...s,events:{policyVersion:1,spent:10*6,claimed:{...claimed,XoverMsf01:6}}}),false,'more stages than the arc has');
 // And the member must actually be in the village.
 const gone={...s,fellows:{...s.fellows}};delete gone.fellows[eventById('XoverMsf01').stages[0].member];
 assert.equal(validEvents({...gone,events:{policyVersion:1,spent,claimed}}),false);
});

// ---------------------------------------------------------------------------------------------------
// Who a stage hands over
// ---------------------------------------------------------------------------------------------------

test('every Fellow stage names a shipped, resolvable character, and knows which side it hands them to',()=>{
 const fellowStages=CROSSOVER_EVENTS.flatMap(e=>e.stages.filter(st=>st.kind==='fellows').map(st=>[e,st]));
 assert.equal(fellowStages.length,133);
 for(const [e,st] of fellowStages){
  assert.equal(stageKind(st),'fellows',`${e.id}/${st.member}`);
  const person=stagePerson(st);
  assert.ok(person,`${st.member} does not resolve`);
  assert.equal(person.id,st.member);
  assert.equal(fellowById(st.member),person,'resolved through fellowById, not the flag-gated FELLOWS');
  assert.equal(isAddition(st.member),true);
  assert.equal(FAMILY.some(p=>p.id===st.member),false,`${st.member} is not Family`);
  assert.equal(ORIGINAL_FELLOWS.some(f=>f.id===st.member),false,'and never an original');
  assert.equal(e.cast.find(c=>c.id===st.member).kind,'Fellow');
 }
 assert.deepEqual(fellowStages.map(([,st])=>st.member).sort(alpha),ADDITION_FELLOWS.map(f=>f.id).sort(alpha),
  'the 133 addition records and the 133 Fellow stages are the same set');
 // Positive control on the resolution probe: an id nothing ships still does not resolve.
 assert.equal(stagePerson({member:'xover_msf_nobody',kind:'fellows'}),null);
});

test('the 30 Family stages are exactly the documented split, and wait on the Family layer',()=>{
 const familyStages=CROSSOVER_EVENTS.flatMap(e=>e.stages.filter(st=>st.kind==='family'));
 assert.equal(familyStages.length,30);
 const fromRoster=roster.characters.filter(c=>c.kind==='family').map(c=>c.id);
 assert.deepEqual(familyStages.map(st=>st.member).sort(alpha),fromRoster.sort(alpha));
 // Named by the doc, not invented here: every one of the 30 is a woman the owner's split lists.
 const doc=readFileSync(new URL('../'+FAMILY_SPLIT,import.meta.url),'utf8');
 for(const c of roster.characters.filter(x=>x.kind==='family')){
  const short=c.character.replace(/ \(.*\)$/,'').replace(/,.*$/,'');
  assert.ok(doc.includes(short),`${FAMILY_SPLIT} does not list ${short}`);
 }
 // Positive control: a Fellow-side name must NOT be in the Family lists of that document's 30.
 const thirty=doc.slice(doc.indexOf('## The 30'),doc.indexOf('Women who stay Fellows'));
 assert.equal(thirty.includes('Wolverine'),false,'the probe is reading the right list');
 for(const st of familyStages)assert.equal(isAddition(st.member),false,'no Family addition records yet');
});

test('a Family stage will resolve once the Family additions layer lands',{todo:'docs/crossover-family-split.md: the 30 Family records are a separate slice, built in parallel'},()=>{
 for(const st of CROSSOVER_EVENTS.flatMap(e=>e.stages).filter(st=>st.kind==='family'))
  assert.ok(stagePerson(st),`${st.member} does not resolve yet`);
});

// ---------------------------------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------------------------------

test('all 163 carry one of the five types, and the additions agree with the roster',()=>{
 for(const c of roster.characters){
  assert.ok(TYPES.includes(c.type),`${c.id} type ${c.type}`);
  assert.ok(TYPES.includes(c.roleType),`${c.id} roleType ${c.roleType}`);
  assert.ok(['fellows','family'].includes(c.kind),c.id);
  const record=additionById(c.id);
  if(c.kind!=='fellows'){assert.equal(record,null,`${c.id} is Family and has no Fellow record`);continue}
  assert.ok(record,`${c.id} has no addition record`);
  assert.equal(record.type,c.type,`${c.id}: the addition record and the roster disagree on type`);
  // The shipped prototypes carry their own shorter display name ("Darth Vader" for rank 1 Star Wars);
  // every generated row takes the roster's.
  assert.ok(c.character===record.name||c.character.startsWith(record.name),`${c.id}: ${record.name} vs ${c.character}`);
  // lib/insight.mjs:9 requires an addition's type to EQUAL its template's type, or Insight silently
  // disappears for it. With the per-type anchors that holds by construction; pinned so a hand edit
  // of one without the other fails here.
  if(record.rarity==='N')assert.equal(record.template,RARITY_N_ANCHORS[c.type],`${c.id} must borrow its type's rarity-N anchor`);
  assert.equal(ORIGINAL_FELLOWS.find(f=>f.id===record.template).type,c.type);
 }
 const count=key=>Object.fromEntries(TYPES.map(t=>[t,roster.characters.filter(c=>c[key]===t).length]));
 // Assigned by role first (section 5.1 of the plan), measured over all 163.
 assert.deepEqual(count('roleType'),{Brave:44,Diligent:23,Informed:34,Inspiring:27,Unfettered:35});
 // Then the owner's decision 3: spread his top picks. Five rows moved, and only five.
 assert.deepEqual(count('type'),{Brave:40,Diligent:26,Informed:34,Inspiring:27,Unfettered:36});
 const moved=roster.characters.filter(c=>c.type!==c.roleType);
 assert.deepEqual(moved.map(c=>[c.character,c.roleType,c.type]),[
  ['Wolverine','Brave','Unfettered'],
  ['Captain America (WWII)','Inspiring','Diligent'],
  ['Hulk','Brave','Diligent'],
  ['Thor (Infinity War)','Brave','Inspiring'],
  ['Ahsoka Tano','Brave','Diligent']]);
 for(const c of moved)assert.ok(c.typeMoved&&c.typeMoved.length>10,`${c.id} moved without a stated reason`);
 assert.deepEqual(roster.characters.filter(c=>c.typeMoved).map(c=>c.id),moved.map(c=>c.id));
 // The point of the move, measured as a count: the owner's four named picks (Vader 1, Wolverine 2,
 // Hulk 5, Thor 6) were all Brave. Three of them no longer are, and no type holds more than four of
 // the top twenty by rank.
 const top=roster.characters.filter(c=>c.rank<=10);
 assert.equal(top.length,20);
 assert.equal(top.filter(c=>c.roleType==='Brave').length,7,'measured before: 7 of the top 20 were Brave');
 assert.equal(top.filter(c=>c.type==='Brave').length,3);
 assert.equal(top.filter(c=>c.type==='Diligent').length,4,'measured before: 1');
 for(const t of TYPES)assert.ok(top.filter(c=>c.type===t).length>=3,`${t} has no share of the top 20`);
 // The two shipped prototypes did NOT churn: their type and template are what they always were.
 assert.equal(additionById('xover_msf_spiderman').type,'Unfettered');
 assert.equal(additionById('xover_msf_spiderman').template,'hero_103');
 assert.equal(additionById('xover_swgoh_vaderduelsend').type,'Brave');
 assert.equal(additionById('xover_swgoh_vaderduelsend').template,'hero_113');
});

test('what the type moves are worth, measured through enterpriseBreakdown',()=>{
 // Type changes WHICH buildings a Fellow can ever stand in, and the families are not equal. Measured
 // here rather than quoted: a level-200 crossover Fellow borrows its type's anchor operation row
 // (+150%), and the value of its slot is the difference enterpriseBreakdown reports for that type's
 // best-paying building at the original's top workforce of 26,000.
 const WORKERS=26000;
 const best=type=>BUSINESSES.filter(b=>b.type===type).sort((a,b)=>b.employeeRate-a.employeeRate)[0];
 const slotValue=type=>{
  const who=roster.characters.find(c=>c.type===type&&c.kind==='fellows');
  const b=best(type),base={...fresh(T),fellows:{...fresh(T).fellows,[who.id]:newFellow(200)}};
  assert.equal(fellowOperation(base,who.id,b).percent,150,`${type} anchor percent`);
  return enterpriseBreakdown({...base,enterprises:{[b.id]:{employees:WORKERS,fellows:[who.id]}}},b.id).total
       - enterpriseBreakdown({...base,enterprises:{[b.id]:{employees:WORKERS,fellows:[]}}},b.id).total;
 };
 const value=Object.fromEntries(TYPES.map(t=>[t,Math.round(slotValue(t))]));
 assert.deepEqual(Object.fromEntries(TYPES.map(t=>[t,best(t).employeeRate])),
  {Brave:40,Diligent:80,Informed:50,Inspiring:70,Unfettered:60},'the per-worker rates the families differ by');
 assert.deepEqual(value,{Brave:1560006,Diligent:3120006,Informed:1950006,Inspiring:2730006,Unfettered:2340006});
 // The owner's four named picks were Vader 1, Wolverine 2, Hulk 5, Thor 6 -- all Brave, the weakest.
 // Three of the four moved; Vader stays Brave because he is a SHIPPED row whose template is the UR
 // Brave anchor, and retyping him means retemplating him (docs/crossover-storyline-plan.md 4.6
 // schedules that with the rarity work, where the aptitude change is visible rather than incidental).
 const worth=key=>roster.characters.filter(c=>c.rank<=10).reduce((n,c)=>n+value[c[key]],0);
 assert.equal(worth('roleType'),42900120);
 assert.equal(worth('type'),48360120,'+12.7% across the top twenty by rank');
 assert.ok(worth('type')>worth('roleType'),'the spread is worth more, not just more even');
 assert.equal(additionById('xover_swgoh_vaderduelsend').type,'Brave','rank 1 Star Wars stays where he shipped');
});

test('the crossover prose is short, original, and carries none of the rewritten wording',()=>{
 // tests/content-overrides.test.mjs exempts the single name /Daredevil/ because it is rank 22 of the
 // owner's roster and matches /devil/ as a substring. Nothing else may carry that wording, and the
 // exemption is checked here over the rows themselves rather than over a whole file.
 const WORDING=/demon|devil|succub|incub|\bhell\b|hellish|abyss|infernal/i;
 const EXEMPT=/Daredevil/i;
 for(const c of roster.characters)for(const k of ['character','title','occupation','race','description']){
  const value=c[k];
  assert.ok(typeof value==='string'&&value.trim().length>1,`${c.id}.${k}`);
  assert.ok(value.length<=260,`${c.id}.${k} is longer than a short blurb`);
  if(EXEMPT.test(value))continue;
  assert.ok(!WORDING.test(value),`${c.id}.${k}: ${value}`);
 }
 for(const e of CROSSOVER_EVENTS)for(const value of [e.name,e.situation,...e.stages.map(st=>st.title)]){
  assert.ok(!WORDING.test(value),`${e.id}: ${value}`);
  assert.ok(value.length<=110,`${e.id}: prose longer than a line -- ${value}`);
 }
 // NEGATIVE CONTROL on the probe: it really does fire on the wording it is looking for.
 assert.equal(WORDING.test('an infernal bargain'),true);
 assert.equal(EXEMPT.test('an infernal bargain'),false);
 assert.equal(roster.characters.filter(c=>EXEMPT.test(c.character)).length,1,'exactly one exempted name');
});

// ---------------------------------------------------------------------------------------------------
// Flag off: present for the validator, absent for the player
// ---------------------------------------------------------------------------------------------------

test('with no flag the panel lists only the eight Isekai arcs and a crossover arc cannot be claimed',()=>{
 assert.equal(visibleEvents().length,8);
 assert.deepEqual(visibleEvents(),ISEKAI_EVENTS,'the same array, not a filtered copy');
 assert.equal(visibleEvents(true).length,41,'and all 41 with the flag on');
 const s=withCompletions(30);
 for(const arc of ['XoverMsf01','XoverSwgoh14','XoverMsf11']){
  const r=act(s,'eventClaim',s.lastAt,arc);
  assert.equal(r.error,'Choose an event.',arc);
  const e=eventById(arc);
  // The refusal must not leak the arc's name, its cast or its situation -- it is the same message an
  // arc that does not exist gets.
  assert.equal(r.error.includes(e.name),false);
  for(const c of e.cast)assert.equal(r.error.includes(c.name),false);
  assert.equal(act(s,'eventClaim',s.lastAt,'NotAnArcAtAll').error,r.error,'indistinguishable from unknown');
 }
 // Positive control: an Isekai arc IS claimable in this same process, so the refusal is about the flag.
 assert.equal(act(s,'eventClaim',s.lastAt,'DemonSlayer').error,undefined);
 // And nothing crossover is at the counter.
 assert.deepEqual(recruitOffers(startingSave(0)).filter(o=>isAddition(o.id)),[]);
 for(const f of ADDITION_FELLOWS){
  assert.equal(recruitPrice(f.id),null,f.id);
  assert.ok(unlockEvent(f.id),`${f.id} has no arc to point the counter at`);
 }
 for(const c of roster.characters)assert.ok(unlockEvent(c.id),`${c.id} is in no arc`);
 assert.equal(unlockEvent('hero_1'),null,'and an original is not claimed by a crossover arc');
});

test('flag on: a crossover stage grants that character and nothing else, at its own tier price',()=>{
 const out=JSON.parse(execFileSync(process.execPath,[new URL('./crossover-arcs-flagon.mjs',import.meta.url).pathname],{encoding:'utf8'}));
 assert.deepEqual(out.errors,[],'every claim succeeded');
 assert.deepEqual(out.costs,[10,20,30],'one stage from each tier');
 assert.equal(out.spent,60);
 assert.equal(out.available,out.earned-60,'the ledger moved by exactly the three prices');
 // Exactly the three characters joined, and nothing else about the village changed.
 assert.deepEqual(out.gained,out.members);
 assert.deepEqual(out.familyGained,[],'nothing landed in s.family');
 assert.deepEqual(out.otherChanges,['events','fellows','habits'],'only the ledger, the roster and the undo buffer moved');
 assert.deepEqual(out.habitChanges,['undo'],'the journal itself is untouched: no completion was consumed or minted');
 assert.deepEqual(out.claimed,{XoverMsf01:1,XoverMsf06:1,XoverMsf11:1});
 assert.equal(out.valid,true,out.refusedBy);
 for(const m of out.messages)assert.match(m,/joined your village · .+ 1\/5$/);
 // The same save in THIS process, which has no flag: it decodes byte-identically, keeps the three
 // Fellows and keeps its ledger. This is the save path the owner asked to have checked.
 const back=decode(out.save);
 assert.equal(valid(back),true,refusedBy(back));
 assert.equal(JSON.stringify(back),out.save,'byte-identical with the flag off');
 assert.deepEqual(lastQuarantine,[],'nothing was quarantined');
 for(const id of out.members)assert.ok(back.fellows[id],`${id} is still owned with the flag off`);
 assert.equal(back.events.spent,60);
 // NEGATIVE CONTROL on that decode: the same save with one granted Fellow removed must be refused.
 const gone={...back,fellows:{...back.fellows}};delete gone.fellows[out.members[0]];
 assert.equal(valid(gone),false,'a claimed member who is not in the village');
});
