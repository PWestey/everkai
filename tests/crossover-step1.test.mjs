import test from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {fresh,act,valid,decode,refusedBy,lastQuarantine} from '../lib/game.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {BUSINESSES,enterpriseBreakdown,canOperate} from '../lib/businesses.mjs';
import {fellowOperation,assignedOperation} from '../lib/operations.mjs';
import {EVENTS,ISEKAI_EVENTS,CROSSOVER_EVENTS,COMPLETIONS_PER_STAGE,costPerStage,stageKind,stagePerson,stageOwned,
        validEvents,eventById,eventClaimed,completionsEarned,completionsAvailable} from '../lib/events.mjs';
import {ADDITION_FELLOWS,sourceId,isAddition} from '../lib/everkai-additions.mjs';
import {ORIGINAL_FELLOWS,FELLOWS,FAMILY,fellowById} from '../lib/catalog.mjs';
import {templateCandidates,RARITY_N_ANCHORS} from '../scripts/crossover/pick-template.mjs';
import {talentRule} from '../lib/talents.mjs';
import {insightRule} from '../lib/insight.mjs';
import {characterSkills} from '../lib/character-skills.mjs';
import {newFellow} from '../lib/adventure.mjs';
import {originalProgressionAction} from '../lib/original-progression.mjs';
import operations from '../lib/operation-data.json' with {type:'json'};
import progression from '../lib/original-progression-data.json' with {type:'json'};
import talentSource from '../lib/default-talent-source.json' with {type:'json'};

// The four defects that blocked a crossover Fellow from working at all (docs/crossover-plan.md step 1).
// Every one of them is a bug today, independent of the feature; three of them are save-compatibility
// hazards. This process has no ?crossover=1, so everything here also proves the flag-off behaviour.
const T=new Date('2026-09-16T09:00:00').getTime();
const SPIDER='xover_msf_spiderman',VADER='xover_swgoh_vaderduelsend';
// Spider-Man is one of the four UR starters since 2026-09-19, so the rarity-N ladder is exercised on Wolverine --
// the same type (Unfettered), the same building, no starter badge.
const WOLVERINE='xover_msf_wolverine';
const definition=id=>BUSINESSES.find(b=>b.id===id);
const own=(s,id,level=1)=>({...s,fellows:{...s.fellows,[id]:newFellow(level)}});

// ---------------------------------------------------------------------------------------------------
// 1. lib/operations.mjs never called sourceId()
// ---------------------------------------------------------------------------------------------------

test('a crossover Fellow operates at its OWN rarity ladder, and no original row moved',()=>{
 // Measured before step 1: fellowOperation(s,'xover_msf_spiderman',Building_501) -> {known:false,
 // percent:0}, so the Fellow occupied an operator slot and contributed nothing where the median
 // original contributes +150%. Assigning one was worse than leaving the slot empty. Step 1 fixed that
 // by borrowing the template's row through sourceId(); the abilities slice (docs/crossover-plan.md
 // order of work 5) replaced the borrowed row with the character's OWN rarity ladder, because
 // borrowing handed a rarity-N Fellow the SSR anchor's +150% where an N original earns +80%.
 const resort=definition('Building_501');       // Unfettered, Spider-Man's own type
 const archery=definition('Building_801');      // Brave, Vader's own type
 // The ladder's shape at badge N, which is where every crossover Fellow starts: slot A 30 at Lv.1,
 // +20 at Lv.50, +30 at Lv.200 -- every column the measured MINIMUM for rarity N, so this is exact
 // parity with the five original N Fellows rather than a nerf (tests/crossover-abilities.test.mjs
 // proves the non-dominance for all eight badges).
 for(const [id,building] of [[WOLVERINE,resort],[VADER,archery]]){
  for(const [level,want] of [[1,30],[49,30],[50,50],[199,50],[200,80],[300,80]]){
   const s=own(fresh(T),id,level);
   const got=fellowOperation(s,id,building);
   assert.equal(got.known,true,`${id} is known at level ${level}`);
   assert.equal(got.percent,want,`${id} at level ${level}`);
   assert.ok(got.percent>0,`${id} earns something at level ${level}`);
  }
 }
 const w=own(fresh(T),WOLVERINE,200);
 assert.equal(fellowOperation(w,WOLVERINE,resort).percent,80,'the rarity-N total, all three slots');
 assert.equal(fellowOperation(w,WOLVERINE,archery).percent,0,'and nothing to another type');
 assert.deepEqual(fellowOperation(own(fresh(T),WOLVERINE,1),WOLVERINE,resort).next.map(e=>e.minLevel),[50,200]);
 // The UR starter, same type and building: slot A is the UR rung's 150 from level 1 (the weakest UR original's).
 for(const [level,want] of [[1,150],[50,170],[200,200]])
  assert.equal(fellowOperation(own(fresh(T),SPIDER,level),SPIDER,resort).percent,want,`UR starter Spider-Man at level ${level}`);
 const s=own(fresh(T),SPIDER,200);
 // `template` is no longer read by ANY progression path -- it survives as the art lineage it always
 // documented. NEGATIVE CONTROL for that claim: the template's own percent is 150 and the Fellow's is
 // 200 (the UR starter's rung) at the same level, so a re-introduced sourceId() here would disagree.
 assert.equal(sourceId(SPIDER),'hero_103');
 assert.equal(fellowOperation(own(s,'hero_103',200),'hero_103',resort).percent,150);

 // Every one of the 175 original rows is unchanged: each Fellow's percent is recomputed straight from
 // its OWN row in lib/operation-data.json, so a misrouted sourceId() would disagree here even though
 // the file itself is untouched.
 assert.equal(operations.records.length,175);
 const raw=(row,business,level)=>row.effects
  .filter(e=>(!e.type||e.type===business.type)&&(!e.building||e.building===business.id)&&level>=e.minLevel)
  .reduce((n,e)=>n+e.percent,0);
 let checked=0,nonZero=0;
 for(const row of operations.records){
  assert.match(row.fellow,/^hero_\d+$/,'the table is keyed by original ids only');
  assert.equal(sourceId(row.fellow),row.fellow,`${row.fellow} maps to itself`);
  assert.equal(isAddition(row.fellow),false);
  for(const level of [1,50,200]){
   const st=own(fresh(T),row.fellow,level);
   for(const b of BUSINESSES){
    const got=fellowOperation(st,row.fellow,b);
    assert.equal(got.known,true,`${row.fellow} known`);
    assert.equal(got.percent,raw(row,b,level),`${row.fellow} @${level} in ${b.id}`);
    checked++;if(got.percent>0)nonZero++;
   }
  }
 }
 assert.equal(checked,175*3*BUSINESSES.length);
 assert.ok(nonZero>1000,`only ${nonZero} non-zero cells -- the probe is not actually reading the table`);
 // Positive control on the probe: a Fellow with no row at all is still unknown, so "known:true"
 // above is a fact about the table and not about the function always saying yes.
 assert.equal(fellowOperation(own(fresh(T),'hero_197'),'hero_197',resort).known,true);
 assert.equal(fellowOperation(fresh(T),'hero_197',resort).known,false,'unowned is unknown');
 assert.equal(fellowOperation(own(fresh(T),'xover_msf_nobody'),'xover_msf_nobody',resort).known,false,
  'an id with neither a row nor a template stays unknown');
});

test('a crossover Fellow assigned to a business actually raises that business bonus',()=>{
 // The end of the chain that matters to a player: businessBonus.total -> enterpriseRate.
 assert.equal(canOperate(SPIDER,definition('Building_501')),true,'an Unfettered addition may work there');
 assert.equal(canOperate(SPIDER,definition('Building_801')),false,'and only there');
 const resort=definition('Building_501');
 const s={...own(fresh(T),WOLVERINE,200),enterprises:{Building_501:{employees:5000,fellows:[WOLVERINE]}}};
 assert.equal(assignedOperation(s,resort),0.8,'+80% -- the rarity-N ladder -- reaches assignedOperation');
 const ur={...own(fresh(T),SPIDER,200),enterprises:{Building_501:{employees:5000,fellows:[SPIDER]}}};
 assert.equal(assignedOperation(ur,resort),2,'+200% -- the UR starter’s rung -- reaches it too');
 assert.equal(enterpriseBreakdown(s,'Building_501').bonus>0,true);
 const empty={...s,enterprises:{Building_501:{employees:5000,fellows:[]}}};
 assert.ok(enterpriseBreakdown(s,'Building_501').total>enterpriseBreakdown(empty,'Building_501').total,
  'assigning a crossover Fellow is now better than an empty slot, which was the whole defect');
});

// ---------------------------------------------------------------------------------------------------
// 2. lib/events.mjs inferred Fellow-vs-Family from the id prefix and resolved through flag-gated FELLOWS
// ---------------------------------------------------------------------------------------------------

/** Habit completions are the currency, so a fixture has to earn them the way a player does. */
function withCompletions(n){
 let s={...fresh(T),habits:starterHabits(T)},day=0;
 while(completionsEarned(s)<n&&day<900){
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
/** A synthetic arc, pushed onto EVENTS for one test and removed again. Step 1 deliberately ships NO
 *  crossover arc data (docs/crossover-plan.md step 4 does that), so the mechanism is exercised with a
 *  fixture rather than by shipping rows the owner has not approved. */
function withArc(arc,body){
 EVENTS.push(arc);
 try{body()}finally{const i=EVENTS.indexOf(arc);if(i>=0)EVENTS.splice(i,1)}
}
const xoverArc=(costPerStage=10)=>({id:'XoverFixture',name:'Fixture Arc',source:'test',costPerStage,
 cast:[{id:SPIDER,name:'Spider-Man',kind:'Fellow',title:'t',label:'Spider-Man'}],
 stages:[{step:1,member:SPIDER,kind:'fellows'}]});

test('a stage says which side of the village it belongs to, in data, not by id prefix',()=>{
 // Positive control first: the declared kind must agree with the prefix rule it replaces for all 29
 // shipped stages (35 before the 2026-09-17 roster trim), or `spent` and the ownership check would change meaning for an existing save.
 // Scoped to the eight Isekai arcs: the 33 crossover arcs are exactly the case the prefix rule got
 // wrong, and tests/crossover-arcs.test.mjs asserts their kinds against the roster instead.
 let stages=0;
 for(const e of ISEKAI_EVENTS){
  const cast=new Map(e.cast.map(c=>[c.id,c.kind]));
  for(const st of e.stages){
   stages++;
   assert.ok(st.kind==='fellows'||st.kind==='family',`${e.id}/${st.member} declares no kind`);
   assert.equal(st.kind,st.member.startsWith('hero_')?'fellows':'family',`${e.id}/${st.member}`);
   assert.equal(st.kind,cast.get(st.member)==='Fellow'?'fellows':'family','kind agrees with the cast row');
   assert.equal(stageKind(st),st.kind);
   assert.ok(stagePerson(st),`${st.member} resolves to a catalogue record`);
  }
 }
 assert.equal(stages,29,'all 29 shipped stages (35 before the 2026-09-17 roster trim)');
 // An xover_* stage: the prefix rule sent it to s.family and it failed the catalogue lookup.
 const st={step:1,member:SPIDER,kind:'fellows'};
 assert.equal(SPIDER.startsWith('hero_'),false,'the old rule would have called this Family');
 assert.equal(stageKind(st),'fellows');
 assert.equal(stagePerson(st)?.id,SPIDER,'resolved through fellowById, not the flag-gated FELLOWS');
 assert.equal(FELLOWS.some(f=>f.id===SPIDER),false,'and FELLOWS really does not list it here');
 assert.equal(FAMILY.some(p=>p.id===SPIDER),false);
 assert.equal(stageOwned(own(fresh(T),SPIDER),st),true);
 assert.equal(stageOwned(fresh(T),st),false);
 // A stage with no declared kind still follows the old prefix rule, so filling the field in cannot
 // have shifted an arc that was mid-edit.
 assert.equal(stageKind({member:'hero_302'}),'fellows');
 assert.equal(stageKind({member:'wife_185'}),'family');
});

test('a crossover stage can be claimed and the save it writes still loads with the flag off',()=>{
 withArc(xoverArc(),()=>{
  const s=withCompletions(COMPLETIONS_PER_STAGE);
  assert.equal(s.fellows[SPIDER],undefined);
  const r=act(s,'eventClaim',s.lastAt,'XoverFixture');
  assert.equal(r.error,undefined,`claim refused: ${r.error}`);
  assert.match(r.message,/Spider-Man joined your village/);
  const after=r.state;
  assert.ok(after.fellows[SPIDER],'the addition landed in s.fellows, not s.family');
  assert.equal(after.family[SPIDER],undefined);
  assert.equal(eventClaimed(after,'XoverFixture'),1);
  assert.equal(validEvents(after),true,'validEvents accepts the claim');
  assert.equal(valid(after),true,refusedBy(after));
  const raw=JSON.stringify(after);
  assert.deepEqual(decode(raw),after,'and the save round-trips');
  assert.equal(JSON.stringify(decode(raw)),raw,'byte-identical');
  assert.deepEqual(lastQuarantine,[],'nothing was dropped');
  // NEGATIVE CONTROL built into the test: the same save with the member removed must be refused, so
  // "valid" above is a fact about the ledger and not about validEvents waving it through.
  const gone={...after,fellows:{...after.fellows}};delete gone.fellows[SPIDER];
  assert.equal(valid(gone),false,'a claimed member who is not in the village');
 });
});

// ---------------------------------------------------------------------------------------------------
// 3. validEvents compared a STORED `spent` against stages * COMPLETIONS_PER_STAGE
// ---------------------------------------------------------------------------------------------------

test('stage cost is per arc, and the eight Isekai arcs are pinned at 10 so old saves stay valid',()=>{
 // RULE 12. `s.events.spent` is a stored value DERIVED from this constant. Moving it for the eight
 // shipped arcs refuses every save that ever claimed a stage -- and `events` is quarantinable, so the
 // player would silently lose their arc progress and their ledger. This is the mine-table lockout of
 // 2026-09-16 with a different table.
 assert.equal(ISEKAI_EVENTS.length,8);
 assert.equal(EVENTS.length,8+CROSSOVER_EVENTS.length,'EVENTS holds every arc; only the panel and eventAction are gated');
 const stages=ISEKAI_EVENTS.reduce((n,e)=>n+e.stages.length,0);
 assert.equal(stages,29);   // 35 before the owner's 2026-09-17 roster trim deleted six of the cast

 for(const e of ISEKAI_EVENTS){
  assert.equal(e.costPerStage,10,`${e.id} must stay at 10: saves store spent = stages x this`);
  assert.equal(costPerStage(e.id),10);
 }
 assert.equal(costPerStage('NotAnArc'),COMPLETIONS_PER_STAGE,'an unknown arc falls back to 10');
 // The exact ledger a save that finished every Isekai arc holds: 290 spent, and nothing else.
 let done=fresh(T);
 for(const e of ISEKAI_EVENTS)for(const st of e.stages)done=stageKind(st)==='fellows'
  ?{...done,fellows:{...done.fellows,[st.member]:newFellow()}}
  :{...done,family:{...done.family,[st.member]:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}}};
 const claimed=Object.fromEntries(ISEKAI_EVENTS.map(e=>[e.id,e.stages.length]));
 assert.equal(stages*10,290,'the whole Isekai cast still costs 290 completions');
 assert.equal(validEvents({...done,events:{policyVersion:1,spent:290,claimed}}),true,'290 is the price now');
 for(const wrong of [280,289,291,300,350,0])
  assert.equal(validEvents({...done,events:{policyVersion:1,spent:wrong,claimed}}),false,`${wrong} is not 290`);
 assert.equal(validEvents({...fresh(T),events:{policyVersion:1,spent:0,claimed:{}}}),true);
 // A differently priced arc: the owner's 10/20/30 ladder must be expressible.
 for(const cost of [10,20,30]){
  withArc(xoverArc(cost),()=>{
   assert.equal(costPerStage('XoverFixture'),cost);
   const s=own(fresh(T),SPIDER);
   assert.equal(validEvents({...s,events:{policyVersion:1,spent:cost,claimed:{XoverFixture:1}}}),true,`${cost} paid`);
   for(const wrong of [cost-1,cost+1,0,COMPLETIONS_PER_STAGE===cost?99:COMPLETIONS_PER_STAGE])
    assert.equal(validEvents({...s,events:{policyVersion:1,spent:wrong,claimed:{XoverFixture:1}}}),false,`${wrong} is not ${cost}`);
   // Mixed ledger: an old arc at 10 and a new one at this price add up per arc, not per stage.
   const mixed={...own(s,'hero_302'),events:{policyVersion:1,spent:10+2*cost,claimed:{DemonSlayer:1,XoverFixture:1}}};
   assert.equal(validEvents(mixed),false,'2 x cost for 1 claimed stage');
   assert.equal(validEvents({...mixed,events:{...mixed.events,spent:10+cost}}),true);
   if(cost!==10)assert.equal(validEvents({...mixed,events:{...mixed.events,spent:2*cost}}),false,'DemonSlayer is not repriced to the new arc price');
  });
 }
 // And the action charges the arc's own price, not the constant.
 withArc(xoverArc(30),()=>{
  const poor=withCompletions(20);
  assert.match(act(poor,'eventClaim',poor.lastAt,'XoverFixture').error,/Finish 10 more habits/);
  assert.equal(act(poor,'eventClaim',poor.lastAt,'DemonSlayer').error,undefined,'a 10-cost arc is still affordable');
  const rich=withCompletions(30);
  const r=act(rich,'eventClaim',rich.lastAt,'XoverFixture');
  assert.equal(r.error,undefined,r.error);
  assert.equal(r.state.events.spent,30,'30 spent, not 10');
  assert.equal(completionsAvailable(r.state),completionsEarned(r.state)-30);
  assert.equal(valid(r.state),true,refusedBy(r.state));
 });
});

test('a save written by the PREVIOUS build, before per-arc costs existed, still decodes untouched',()=>{
 // Generated with the pre-change lib (CLAUDE.md rule 12's cheap check) and committed as the fixture:
 //   SAVE_OUT=... LIB=<old checkout>/lib/ node prev-events.mjs
 // It holds one claimed DemonSlayer stage and spent:10 -- the shape a real player's save has.
 const raw=readFileSync(new URL('./event-save-4094f36-demonslayer1.json',import.meta.url),'utf8');
 const stored=JSON.parse(raw);
 assert.deepEqual(stored.events,{policyVersion:1,spent:10,claimed:{DemonSlayer:1}},'the old ledger shape');
 assert.equal(stored.version,10,'no SAVE_VERSION bump was needed');
 assert.equal(validEvents(stored),true,'the stored spent still adds up under the per-arc sum');
 const back=decode(raw);
 assert.equal(valid(back),true,refusedBy(back));
 assert.deepEqual(lastQuarantine,[],'the events subtree was not quarantined');
 assert.equal(JSON.stringify(back),raw,'byte-identical, not repaired and not rewritten');
 assert.ok(back.fellows[eventById('DemonSlayer').stages[0].member],'the Fellow the arc handed over is still there');
 // NEGATIVE CONTROL on the fixture itself: repricing the arc this save paid for locks it out, which is
 // exactly what the pin above prevents. Done by arithmetic rather than by editing the shipped data.
 const repriced={...stored,events:{...stored.events,spent:20}};
 assert.equal(validEvents(repriced),false,'a 20-per-stage DemonSlayer would refuse this save');
});

// ---------------------------------------------------------------------------------------------------
// 4. templateCandidates('N', type) was empty for all five types
// ---------------------------------------------------------------------------------------------------

test('rarity N resolves a progression template for every type: the per-type SSR anchors',()=>{
 // Measured before the fix: templateCandidates('N', t) returned NOTHING for all five types, because
 // the only five rarity-N originals are hero_1..hero_5 and the pick rule excludes FREE_ROSTER. Every
 // crossover character starts at N, so without a template they resolve no talent rule, no Insight
 // rule, no skill guide and no `heroes` growth row -- and activateOriginalProgression refuses outright
 // if ANY owned Fellow lacks a heroes row, which locks the ladder for the whole village.
 const types=[...new Set(ORIGINAL_FELLOWS.map(f=>f.type))].sort();
 assert.deepEqual(types,['Brave','Diligent','Informed','Inspiring','Unfettered']);
 assert.deepEqual(Object.keys(RARITY_N_ANCHORS).sort(),types);
 // hero_102 (Diligent) and hero_105 (Informed) were deleted in the owner's 2026-09-17 roster trim and
 // were re-anchored by the SAME rule; their replacements' operation rows are identical in shape, so
 // the symmetry this pin exists for is intact (scripts/crossover/pick-template.mjs).
 assert.deepEqual(Object.values(RARITY_N_ANCHORS).sort(),['hero_101','hero_103','hero_104','hero_106','hero_133']);
 const raw=new Map(operations.records.map(r=>[r.fellow,r]));
 for(const type of types){
  const got=templateCandidates('N',type);
  assert.deepEqual(got.map(f=>f.id),[RARITY_N_ANCHORS[type]],`N/${type}`);
  const anchor=got[0];
  // The anchor is a real, counter-sold SSR of that exact type with every per-id table an owned Fellow
  // needs -- asserted here rather than trusted, because the pick rule is what makes them all true.
  assert.equal(anchor.rarity,'SSR');
  assert.equal(anchor.type,type);
  assert.ok(talentRule(anchor.id),`${anchor.id} talent rule`);
  assert.equal(insightRule(anchor.id)?.type,type,`${anchor.id} Insight rule type must match, or Insight vanishes`);
  assert.ok(characterSkills(anchor.id)?.skills?.length,`${anchor.id} skill guide`);
  assert.ok(progression.heroes[anchor.id],`${anchor.id} heroes growth row`);
  assert.ok(talentSource.heroes[anchor.id],`${anchor.id} default talent source`);
  // Measured symmetric: 100 @ L1, +20 @ L50, +30 @ L200 = 150% to its own type and nothing elsewhere.
  const row=raw.get(anchor.id);
  assert.ok(row,`${anchor.id} operation row`);
  assert.deepEqual(row.effects.map(e=>[e.minLevel,e.percent,e.type]),[[1,100,type],[50,20,type],[200,30,type]],anchor.id);
  const s=own(fresh(T),anchor.id,200);
  for(const b of BUSINESSES)assert.equal(fellowOperation(s,anchor.id,b).percent,b.type===type?150:0,`${anchor.id} in ${b.id}`);
 }
 // Rarity N had no candidate under the unpinned rule, and still has none by rarity alone -- the pin is
 // what supplies one. Positive control that the rule is not simply returning everything now.
 // hero_2 and hero_5 went in the owner's 2026-09-17 roster trim; three of the original five remain,
 // all still in FREE_ROSTER, so rarity N still has no candidate by rarity alone.
 assert.deepEqual(ORIGINAL_FELLOWS.filter(f=>f.rarity==='N').map(f=>f.id),['hero_1','hero_3','hero_4']);
 assert.deepEqual(templateCandidates('N','NotAType'),[],'an unknown type still has no anchor');
 assert.deepEqual(templateCandidates('LR','Brave'),[],'and an unpinned empty rarity is still empty');
 // Non-N rarities still resolve by the unpinned rule. Spider-Man's SSR/Unfettered pick is unchanged;
 // Vader's UR/Brave pick moved because hero_113 (Leon) was deleted on 2026-09-17, so the rule's
 // 'lowest-numbered' clause now lands on hero_134. Nothing reads `template` for progression any more
 // (lib/crossover-abilities.mjs derives from the rarity ladder), so this only moves a provenance row.
 assert.equal(templateCandidates('SSR','Unfettered')[0].id,'hero_103');
 assert.equal(templateCandidates('UR','Brave')[0].id,'hero_134');
});

test('every shipped addition resolves a template whose progression rows exist',()=>{
 assert.ok(ADDITION_FELLOWS.length>0);
 for(const f of ADDITION_FELLOWS){
  const template=sourceId(f.id);
  assert.equal(template,f.template);
  assert.ok(fellowById(template),`${f.id} template ${template} is a real Fellow`);
  assert.equal(templateCandidates(f.rarity,f.type)[0]?.id,template,'the documented pick rule chose it');
  // R8 from docs/crossover-progression-plan.md: activateOriginalProgression refuses if ANY owned
  // Fellow lacks a heroes row, so a bad template would lock the ladder for the whole village.
  assert.ok(progression.heroes[template],`${f.id} has no heroes growth row`);
  assert.ok(talentSource.heroes[template],`${f.id} has no default talent source`);
  assert.ok(talentRule(f.id)&&insightRule(f.id)&&characterSkills(f.id),`${f.id} per-id tables`);
  assert.ok(operations.records.some(r=>r.fellow===template),`${f.id} has no operation row to borrow`);
  const home=BUSINESSES.find(b=>b.type===f.type);
  assert.ok(fellowOperation(own(fresh(T),f.id,200),f.id,home).percent>0,`${f.id} earns nothing in a ${f.type} business`);
  // activateOriginalProgression must accept a village that owns it. Called directly rather than
  // through act(), which settles and therefore requires a fully valid save.
  const r=originalProgressionAction(own(fresh(T),f.id),'activateOriginalProgression');
  assert.equal(r.error,undefined,`${f.id}: ${r.error}`);
 }
 // Positive control: an owned Fellow with no heroes row really does refuse, so the pass above is a
 // fact about the templates and not about the action always succeeding.
 const bad=originalProgressionAction(own(fresh(T),'xover_msf_nobody'),'activateOriginalProgression');
 assert.match(bad.error,/no verified original growth record/);
});

test('flag on: a crossover stage is claimable and the arc resolves the addition',()=>{
 // FELLOWS is read once at import, so the flag-on case needs its own process.
 const out=JSON.parse(execFileSync(process.execPath,[new URL('./crossover-stage-flagon.mjs',import.meta.url).pathname],{encoding:'utf8'}));
 assert.equal(out.listed,true,'the addition is in FELLOWS with the flag on');
 assert.equal(out.error,null,out.error);
 assert.equal(out.owned,true,'and the stage granted it as a Fellow');
 assert.equal(out.inFamily,false,'not into s.family, which the old prefix rule would have done');
 assert.equal(out.cost,30);
 assert.equal(out.spent,30,'at the arc price, not the constant');
 assert.equal(out.valid,true,out.refusedBy);
 // The same save, decoded by THIS process, which has no flag. The arc data itself is not flag-gated
 // (only the panel will be), so the fixture is present here too.
 withArc(xoverArc(30),()=>{
  const back=decode(out.save);
  assert.equal(valid(back),true,refusedBy(back));
  assert.ok(back.fellows[SPIDER],'still owned with the flag off');
  assert.equal(back.events.spent,30,'and its ledger survived the flag being off');
  assert.equal(JSON.stringify(back),out.save,'byte-identical with the flag off');
  assert.equal(FELLOWS.some(f=>f.id===SPIDER),false,'while the catalogue here still does not list it');
 });
});
