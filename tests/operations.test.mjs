import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {fresh,act,decode,settle,totalRate} from '../lib/game.mjs';
import {BUSINESSES,enterpriseBreakdown,enterpriseRate} from '../lib/businesses.mjs';
import {fellowOperation,operationLevel,operationSkills,operationCost,studyNotes,validOperations,
        OPERATION_CAP,OPERATION_LADDER} from '../lib/operations.mjs';
import {tradingPost,negotiationEnergy} from '../lib/trading-post.mjs';
import operationData from '../lib/operation-data.json' with {type:'json'};
import {funded,staffed} from './gear-fixtures.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);return r.state};
function setup(){let s=funded(fresh(1000));for(const f of ['hero_1','hero_117'])s=run(s,'recruit',f);for(const id of ['Building_101','Building_701','Building_401'])s=run(s,'openEnterprise',id);return s;}
test('Fifi operation matches type and level 50 Inn bonus from the version-matched appoint table',()=>{
 const s=setup(),inn=BUSINESSES.find(b=>b.id==='Building_101'),cake=BUSINESSES.find(b=>b.id==='Building_701'),scroll=BUSINESSES.find(b=>b.id==='Building_401');
 s.fellows.hero_1.level=49;assert.equal(fellowOperation(s,'hero_1',inn).percent,30);
 s.fellows.hero_1.level=50;assert.equal(fellowOperation(s,'hero_1',inn).percent,50);assert.equal(fellowOperation(s,'hero_1',cake).percent,30);assert.equal(fellowOperation(s,'hero_1',scroll).percent,0);
 // hero_197 is not recruited here, so it is unknown for lack of ownership, not lack of data.
 assert.equal(fellowOperation(s,'hero_197',inn).known,false);
 // hero_15 is owned and now carries imported appoint data, but all of it is Unfettered (country 5),
 // so none of it applies to a Diligent Inn. Having data and having a matching effect are different.
 assert.equal(fellowOperation(s,'hero_15',inn).known,true);assert.equal(fellowOperation(s,'hero_15',inn).percent,0);
 assert.deepEqual(fellowOperation(s,'hero_1',inn).next.map(e=>e.minLevel),[200]);
 assert.equal(fellowOperation(s,'hero_117',scroll).percent,150);assert.equal(fellowOperation(s,'hero_117',inn).percent,0);
 // The community record stopped at 150 and said so: "Further 20% and 30% effects lack unlock levels
 // and are excluded." The original supplies those levels -- 50 and 200 -- so the ladder now resolves.
 s.fellows.hero_117.level=60;assert.equal(fellowOperation(s,'hero_117',scroll).percent,170);
 s.fellows.hero_117.level=200;assert.equal(fellowOperation(s,'hero_117',scroll).percent,200);
});
test('assignment moves only supported bonuses, retaining whole-roster base and persistence',()=>{
 let s=setup();s.fellows.hero_1.level=50;s.fellows.hero_1.breaks=3;s=staffed(s,'Building_101',50);const base=enterpriseBreakdown(s,'Building_101');
 s=run(s,'assignOperator','Building_101','hero_1');let b=enterpriseBreakdown(s,'Building_101');assert.equal(b.operation,base.operation);assert.equal(b.total,(base.employees+base.operation)*1.5);
 s=run(s,'assignOperator','Building_701','hero_1');assert.equal(enterpriseBreakdown(s,'Building_101').bonus,0);assert.equal(enterpriseBreakdown(s,'Building_701').bonus,.3);
 s=run(s,'assignOperator','Building_401','hero_117');assert.equal(enterpriseBreakdown(s,'Building_401').bonus,1.5);
 assert.equal(enterpriseRate(s),Object.keys(s.enterprises).reduce((n,id)=>n+enterpriseBreakdown(s,id).total,0));assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.equal(settle(s,11000).pending,s.pending+10*totalRate(s));
 s=run(s,'removeOperator','Building_701','hero_1');assert.equal(enterpriseBreakdown(s,'Building_701').bonus,0);
});
test('assigning Operations settles earlier income before new bonus applies',()=>{
 const s=setup();const next=act(s,'assignOperator',11000,'Building_101','hero_1').state;
 assert.equal(next.pending,s.pending+10*totalRate(s));assert.equal(enterpriseBreakdown(next,'Building_101').bonus,.3);
});
test('Reir/Knivi exact building and type scopes stack only while assigned; earlier income stays at old rate',()=>{
 // Pump (hero_5) carried the second scope here and was deleted on 2026-09-17. Knivi (hero_4) is the
 // one surviving Fellow whose lib/operation-data.json row has the IDENTICAL shape -- base type 30, a
 // building extra of 20 at level 50, a type extra of 30 at level 200 -- so this is the same test.
 let s=setup();for(const id of ['hero_3','hero_4']){s=run(s,'recruit',id);s.fellows[id].level=50;s.fellows[id].breaks=3;}
 s=funded(s);for(const id of ['Building_301','Building_801','Building_601'])s=run(s,'openEnterprise',id);
 const definition=id=>BUSINESSES.find(b=>b.id===id);
 for(const [f,named,other,wrong] of [['hero_3','Building_401','Building_601','Building_501'],['hero_4','Building_301','Building_801','Building_401']]){
  assert.equal(fellowOperation(s,f,definition(named)).percent,50);assert.equal(fellowOperation(s,f,definition(other)).percent,30);assert.equal(fellowOperation(s,f,definition(wrong)).percent,0);
  s.fellows[f].level=49;assert.equal(fellowOperation(s,f,definition(named)).percent,30);s.fellows[f].level=50;
 }
 s=staffed(s,'Building_401',50);s=run(s,'assignOperator','Building_401','hero_117');const old=totalRate(s),before=s.pending;
 s=act(s,'assignOperator',s.lastAt+10000,'Building_401','hero_3').state;assert.equal(s.pending,before+10*old);assert.equal(enterpriseBreakdown(s,'Building_401').bonus,2);
 s=run(s,'assignOperator','Building_301','hero_4');assert.equal(enterpriseBreakdown(s,'Building_301').bonus,.5);
 const oldRemove=totalRate(s);const removed=act(s,'removeOperator',s.lastAt+10000,'Building_401','hero_3').state;assert.equal(removed.pending,s.pending+10*oldRemove);s=removed;assert.equal(enterpriseBreakdown(s,'Building_401').bonus,1.5);
 s=run(s,'assignOperator','Building_801','hero_4');assert.equal(enterpriseBreakdown(s,'Building_301').bonus,0);assert.equal(enterpriseBreakdown(s,'Building_801').bonus,.3);
 assert.equal(enterpriseRate(s),Object.keys(s.enterprises).reduce((sum,id)=>sum+enterpriseBreakdown(s,id).total,0));assert.deepEqual(decode(JSON.stringify(s)),s);
});

// ---- THE OPERATION LEVEL (2026-09-22, catalogue row C2; docs/character-systems-gap.md 2.2) ----
// The original's rule is `skillProp_Initial + (level-1) * skillProp_Level` and only the first term was
// imported. These pin the second term, its price column and the save identity that prices it.

/** Play negotiations until the save holds at least `want` Study Notes. Real actions, not a fabricated
 *  receipt: validRun re-derives every field of a run, so a hand-written one would be refused. */
function negotiate(s,want){
 let guard=0;
 while(studyNotes(s)<want){
  if(++guard>4000)throw Error(`could not reach ${want} Study Notes`);
  const t=tradingPost(s),team=Object.keys(s.fellows).filter(id=>negotiationEnergy(s,id).energy>0).slice(0,6);
  if(!team.length){s={...s,lastAt:s.lastAt+86400000};continue;}
  const begun=act(s,'tradeBegin',s.lastAt,'learner',{seq:t.seq,team});
  assert.ok(!begun.error,begun.error);
  const open=tradingPost(begun.state).run;
  const done=act(begun.state,'tradeComplete',begun.state.lastAt+4000,open.id,{seq:tradingPost(begun.state).seq});
  assert.ok(!done.error,done.error);s=done.state;
 }
 return s;
}

test('the Study Notes ladder is the original own column, and level 1 costs nothing',()=>{
 assert.equal(OPERATION_CAP,300);
 assert.equal(OPERATION_LADDER.length,299);
 // Cross-check 1, screenshot 07_fellow_operation: "Upgrade x23 - 1.101K/1.094K", levels 101..123.
 assert.equal(OPERATION_LADDER.slice(100,123).reduce((a,b)=>a+b,0),1094);
 // Cross-check 2: the whole ladder, 1 -> 300.
 assert.equal(operationCost(OPERATION_CAP),25589);
 assert.equal(operationCost(1),0);
 assert.equal(operationCost(2),OPERATION_LADDER[0]);
 // 144 of the 494 imported effects grow; the fixed `Extra` rows carry neither column.
 const effects=operationData.records.flatMap(r=>r.effects);
 assert.equal(effects.length,494);
 assert.equal(effects.filter(e=>e.perLevel).length,144);
 assert.ok(effects.filter(e=>e.perLevel).every(e=>e.perLevel===5&&e.max===300));
 assert.ok(effects.filter(e=>!e.perLevel).every(e=>e.max===undefined));
});

test('a levelled Operation skill pays the original value, and level 1 is exactly today',()=>{
 const s=setup(),inn=BUSINESSES.find(b=>b.id==='Building_101');
 s.fellows.hero_1.level=750;
 // Level 1 reproduces the pre-2026-09-22 numbers exactly: base 30 + building 20 + type extra 30.
 assert.equal(operationLevel(s,'hero_1'),1);
 assert.equal(fellowOperation(s,'hero_1',inn).percent,80);
 // The Faculty tier grows +5 points a level; the two fixed Extra rows do not move at all.
 const at=level=>fellowOperation({...s,operationSkills:{policyVersion:1,levels:{hero_1:level}}},'hero_1',inn).percent;
 assert.equal(at(2),85);
 assert.equal(at(101),580);                 // 30 + 5*100 + 20 + 30
 assert.equal(at(300),1575);                // 30 + 5*299 + 20 + 30 -- x19.7 on this business
 // A level outside the table's own range is read as level 1 rather than trusted, so a corrupted or
 // hand-edited entry degrades to today's value instead of minting one. validOperations refuses it too.
 assert.equal(at(400),80);
 assert.equal(at(0),80);
 const rows=operationSkills({...s,operationSkills:{policyVersion:1,levels:{hero_1:300}}},'hero_1');
 assert.deepEqual(rows.map(r=>r.value).sort((a,b)=>a-b),[20,30,1525]);
 assert.deepEqual(rows.map(r=>r.step),[5,0,0]);
});

test('Study Notes come from won negotiations and are spent through the original ladder',()=>{
 let s=setup();
 assert.equal(studyNotes(s),0);
 // Nothing to spend: the action says where the notes come from rather than failing silently.
 assert.match(act(s,'operationTrain',s.lastAt,'hero_1',1).error,/Study Notes/);
 s=negotiate(s,operationCost(5));
 const before=studyNotes(s);
 s=run(s,'operationTrain','hero_1',1);
 assert.equal(operationLevel(s,'hero_1'),2);
 assert.equal(studyNotes(s),before-OPERATION_LADDER[0]);
 s=run(s,'operationTrain','hero_1',10);
 assert.equal(operationLevel(s,'hero_1'),12);
 assert.equal(studyNotes(s),before-operationCost(12));
 // The balance is DERIVED on both sides, so a round trip must reproduce it exactly.
 assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.equal(studyNotes(decode(JSON.stringify(s))),studyNotes(s));
 // Only this Fellow levelled; the level is per Fellow, shared across ITS skills.
 assert.equal(operationLevel(s,'hero_117'),1);
});

test('validOperations refuses a level no receipt paid for; an absent subtree stays legal',()=>{
 const s=setup();
 assert.equal(validOperations(s),true);                                    // absent subtree
 assert.equal(validOperations({...s,operationSkills:{policyVersion:1,levels:{}}}),true);
 // Rule 12, the exposure this system carries: the level is checked against notes DERIVED from the
 // Trading Post receipts. An unearned level is refused.
 const cheat={...s,operationSkills:{policyVersion:1,levels:{hero_1:300}}};
 assert.equal(validOperations(cheat),false);
 assert.throws(()=>decode(JSON.stringify(cheat)),/Invalid Operation skill levels/);
 // Shape guards.
 assert.equal(validOperations({...s,operationSkills:{policyVersion:2,levels:{}}}),false);
 assert.equal(validOperations({...s,operationSkills:{policyVersion:1,levels:{hero_1:0}}}),false);
 assert.equal(validOperations({...s,operationSkills:{policyVersion:1,levels:{hero_1:301}}}),false);
 assert.equal(validOperations({...s,operationSkills:{policyVersion:1,levels:{hero_1:1.5}}}),false);
 assert.equal(validOperations({...s,operationSkills:{policyVersion:1,levels:{not_a_fellow:2}}}),false);
 assert.equal(validOperations({...s,operationSkills:{policyVersion:1,levels:{},extra:1}}),false);
 // A Fellow who has LEFT the roster keeps his level rather than quarantining everyone else's: the
 // spend identity is the bound, not roster membership.
 let paid=negotiate(setup(),operationCost(3));
 paid=run(paid,'operationTrain','hero_1','max');
 const gone={...paid,fellows:Object.fromEntries(Object.entries(paid.fellows).filter(([id])=>id!=='hero_1'))};
 assert.equal(validOperations(gone),true);
});

test('RULE 12: four live saves decode byte-identically and read their old receipts at the constant',()=>{
 // The exposure this change carries is NOT a stored number -- it is a DERIVED one. `studyNotes` is
 // read off `tradingPost.history`, receipts written by builds that had never heard of Study Notes, so
 // they carry no `notePerWin` and are read at NOTES_PER_WIN. That can only ever ADD notes to an
 // existing save; it can never refuse one. Each fixture is a real 30-day save from the build named in
 // its filename.
 for(const [file,runs,notes] of [['live-save-45828d3-day30.json.gz',456,78870],
                                 ['live-save-4de2a38-day30.json.gz',456,77550],
                                 ['live-save-c5b4477-day30.json.gz',458,79560],
                                 ['power-save-3d47df4-day30.json.gz',446,73620]]){
  const raw=gunzipSync(readFileSync(new URL('./'+file,import.meta.url))).toString('utf8');
  const s=JSON.parse(raw);
  assert.equal(s.tradingPost.history.length,runs,`${file} positive control: it really holds receipts`);
  assert.equal(s.operationSkills,undefined,`${file} predates the subtree`);
  const back=decode(raw);
  assert.equal(JSON.stringify(back),raw,`${file} byte-identical round trip`);
  assert.equal(back.operationSkills,undefined,'decode does not mint the subtree');
  assert.equal(studyNotes(back),notes,`${file} old receipts read at NOTES_PER_WIN`);
  // Both halves of this ratio come from the same save (rule 1): its own receipts, at this project's
  // own per-win rate. 30 days of habit play funds between two and three Fellows all the way to the
  // original's cap of 300 -- 2.88 to 3.08 across the four, i.e. ~10 days a Fellow at this pace.
  const fellows=notes/operationCost(300);
  assert.ok(fellows>2.8&&fellows<3.2,`${file}: ${fellows.toFixed(2)} Fellows' worth of Study Notes`);
 }
});
