import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {pupilReward} from '../lib/school.mjs';
import {requiredLessons} from '../lib/education.mjs';
import {pupilMilestone,ADULT_LESSONS} from '../lib/school-maturation.mjs';
import {createPersistence} from '../lib/persistence.mjs';
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
function enrolled(grade){let s=run(fresh(1000),'welcome','wife_2');return run(s,'enrollPupil','wife_2',{grade,type:'brave',name:'Learner'});}
test('all four grade boundaries derive from lessons, never accumulated education or intimacy',()=>{
 for(const [grade,adult] of Object.entries(ADULT_LESSONS)){
  const s=enrolled(grade),p=s.school.pupils[0],end=requiredLessons(p);
  for(const [progress,stage,next] of [[adult-1,'Growing pupil',adult],[adult,'Adult pupil',end],[end,'Ready to graduate',end]]){
   assert.deepEqual(pupilMilestone({...p,progress,education:99999},end),{adult,stage,next,label:next===adult?'Adulthood':'Graduation',remaining:Math.max(0,next-progress)});
  }
 }
 for(const p of [{grade:'D',progress:99},{progress:5}]){const end=requiredLessons(p);assert.equal(pupilMilestone(p,end).adult,null);assert.equal(pupilMilestone(p,end).stage,'Learning');assert.equal(pupilMilestone({...p,progress:end},end).stage,'Ready to graduate');}
});
test('ordinary refills and milestone lessons stop at adulthood, then graduate with existing income and ring',()=>{
 for(const [grade,adult] of Object.entries(ADULT_LESSONS)){
  let s=enrolled(grade);const p=()=>s.school.pupils[0];
  while(p().progress<adult){s=run(s,'refillEducation');s=run(s,'educateToMilestone',p().id);assert.ok(p().progress<=adult);}
  assert.equal(p().progress,adult);assert.equal(pupilMilestone(p(),requiredLessons(p())).stage,'Adult pupil');
  s=decode(JSON.stringify(s));const standard=run(s,'finishSchool',p().id);
  while(p().progress<requiredLessons(p())){s=run(s,'refillEducation');s=run(s,'educateToMilestone',p().id);}
  assert.equal(s.fellowXP,standard.fellowXP);assert.equal(pupilReward(s,p()),pupilReward(standard,standard.school.pupils[0]));
  const expected=pupilReward(s,p()),oldRing=s.inventory.gift1;s=run(s,'graduate',p().id);
  assert.equal(s.school.alumni[0].income,expected);assert.equal(s.inventory.gift1,oldRing+1);assert.deepEqual(decode(JSON.stringify(s)),s);
 }
});
test('near-boundary fractional stock is conserved and failed save cannot admit a stage change',()=>{
 let s=enrolled('C');s.school.pupils[0].progress=35;s.school.pupils[0].education=35;s.school.points=5.5;
 let raw=JSON.stringify(s),fail=false;const storage=createPersistence(()=>({getItem:()=>raw,setItem:(k,v)=>{if(fail)throw Error('quota');raw=v}}));storage.load(1000);
 const before=raw,next=run(storage.current,'educateToMilestone',1);assert.equal(next.school.points,4.5);assert.equal(next.school.pupils[0].progress,36);
 fail=true;assert.throws(()=>storage.commit(next));assert.equal(raw,before);assert.equal(storage.current.school.pupils[0].progress,35);
 fail=false;storage.load(1000);storage.commit(run(storage.current,'educateToMilestone',1));storage.load(1000);assert.equal(storage.current.school.pupils[0].progress,36);assert.equal(storage.current.school.points,4.5);
 const after=JSON.stringify(storage.current);pupilMilestone(storage.current.school.pupils[0],125);assert.equal(JSON.stringify(storage.current),after);
});
