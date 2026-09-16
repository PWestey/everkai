import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {ACHIEVEMENT_CHAINS,ACHIEVEMENT_CATEGORIES,ACHIEVEMENT_EXCLUDED,METRICS,chainProgress,achievementStep,validAchievements} from '../lib/achievements.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),a);return r.state};
const chain=id=>ACHIEVEMENT_CHAINS.find(c=>c.id===id);

test('the imported ladder is the original`s, and every step is ordered and priced',()=>{
 assert.equal(ACHIEVEMENT_CHAINS.length,10);
 assert.equal(ACHIEVEMENT_CHAINS.reduce((n,c)=>n+c.steps.length,0),1347,'1,347 steps, against the eleven local milestones that were here before');
 assert.deepEqual([...ACHIEVEMENT_CATEGORIES].sort(),['Family','Lifestyle','Treasure','Village']);
 const ids=new Set();
 for(const c of ACHIEVEMENT_CHAINS){
  assert.ok(METRICS[c.metric],`${c.id} names metric ${c.metric}, which does not exist`);
  let prev=0;
  for(const st of c.steps){
   assert.ok(!ids.has(st.id),`${st.id} appears twice`);ids.add(st.id);
   assert.ok(Number.isSafeInteger(st.goal)&&st.goal>0,`${st.id} goal ${st.goal}`);
   assert.ok(st.goal>=prev,`${st.id}: goals must not go backwards (${prev} -> ${st.goal})`);
   prev=st.goal;
   assert.ok(Number.isSafeInteger(st.crystals)&&st.crystals>=0,`${st.id} crystals`);
  }
 }
 assert.equal(achievementStep([...ids][0]).chain.id,ACHIEVEMENT_CHAINS[0].id);});

test('every requirement type the original ships is either implemented or excluded WITH A REASON',()=>{
 // The whole risk in this import is a type quietly approximated into something Everkai happens to have.
 // 32 types exist; 10 chains are implemented and the rest must each carry a written reason.
 const implemented=new Set(ACHIEVEMENT_CHAINS.map(c=>c.reqType));
 const excluded=Object.keys(ACHIEVEMENT_EXCLUDED);
 assert.equal(implemented.size+excluded.length,32,`${implemented.size} implemented + ${excluded.length} excluded`);
 for(const [type,why] of Object.entries(ACHIEVEMENT_EXCLUDED)){
  assert.ok(!implemented.has(type),`${type} is both implemented and excluded`);
  assert.ok(typeof why==='string'&&why.length>20,`${type} is excluded without a real reason: ${why}`);
 }
 // The StageClear exclusion is about SHAPE, not size, and that must stay written down: those rows carry
 // taskReq {type,id} naming a stage, so a cleared-count would be an invention.
 assert.match(ACHIEVEMENT_EXCLUDED.StageClear,/shape/i);
 // Positive control: the data file really does hold the unmapped reward items rather than substituting.
 const data=JSON.parse(readFileSync(new URL('../lib/achievement-data.json',import.meta.url),'utf8'));
 assert.ok(data.unmappedRewardItems.length>0,'unmapped reward items are listed, not silently swapped');
 assert.ok(data.note.includes('EMPTY WRAPPER'),'the Achievement.json wrapper trap stays recorded');});

test('a step pays only when its metric actually reaches the goal',()=>{
 const s=fresh(T);
 const c=chain('A_task_4');
 const p=chainProgress(s,c);
 assert.equal(p.have,Object.keys(s.fellows).length,'the metric reads real state');
 assert.ok(p.ready,'a fresh village already has 1 Fellow, which is step 1');
 const after=run(s,'achievementClaim','A_task_4');
 assert.equal(after.crystals,s.crystals+c.steps[0].crystals,'crystals were actually paid');
 // Step 2 wants more Fellows, so the same claim must now be refused with its progress.
 assert.match(act(after,'achievementClaim',after.lastAt,'A_task_4').error,/keep going/);
 // Positive control: recruiting until the goal is met opens it again.
 let grown=after;
 while(chainProgress(grown,c).ready===false&&Object.keys(grown.fellows).length<c.steps[1].goal){
  const r=act(grown,'recruit',grown.lastAt);if(r.error)break;grown=r.state;
 }
 assert.ok(chainProgress(grown,c).ready,'reaching the goal makes the next step claimable');
 assert.deepEqual(decode(JSON.stringify(grown)),grown,'the save round-trips');});

test('an unknown chain is refused, and a finished chain stops paying',()=>{
 const s=fresh(T);
 assert.match(act(s,'achievementClaim',s.lastAt,'not_a_chain').error,/Choose an achievement/);
 const c=chain('A_task_4');
 const all={...s,achievements:{policyVersion:1,claimed:c.steps.map(st=>st.id)}};
 assert.match(act(all,'achievementClaim',all.lastAt,'A_task_4').error,/already claimed/);});

test('claims must be a prefix of their chain, so a forged save is refused',()=>{
 const s=run(fresh(T),'achievementClaim','A_task_4');
 assert.ok(validAchievements(s));
 assert.equal(validAchievements({achievements:undefined}),true,'an old save without the record is fine');
 const c=chain('A_task_4');
 // Skipping ahead is not reachable by play: the original links steps with nextTask.
 assert.equal(valid({...s,achievements:{policyVersion:1,claimed:[c.steps[4].id]}}),false,'step 5 without 1-4');
 assert.equal(valid({...s,achievements:{policyVersion:1,claimed:[c.steps[0].id,c.steps[0].id]}}),false,'the same step twice');
 assert.equal(valid({...s,achievements:{policyVersion:1,claimed:['A_task_nope_1']}}),false,'a step that does not exist');
 assert.equal(valid({...s,achievements:{policyVersion:1,claimed:'x'}}),false);
 assert.equal(valid({...s,achievements:{policyVersion:2,claimed:[]}}),false);
 // Positive control: the legitimate prefix this was derived from still passes.
 assert.equal(valid(s),true);
 assert.equal(valid({...s,achievements:{policyVersion:1,claimed:[c.steps[0].id,c.steps[1].id]}}),true,'a real two-step prefix');});
