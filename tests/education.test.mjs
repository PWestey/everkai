import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';
import {GRADES,SCHOOL_TYPES,requiredLessons,graduationBonus,schoolCapacity} from '../lib/education.mjs';
import {pupilReward} from '../lib/school.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
const start=()=>run(fresh(1000),'welcome','wife_2').state;
const enroll=(s,grade='D',type='diligent')=>run(s,'enrollPupil','wife_2',{grade,type,name:'Aster'}).state;
test('all documented grades and types complete and round-trip without changing legacy pupils',()=>{
 for(const grade of Object.keys(GRADES))for(const type of SCHOOL_TYPES){
  let s=enroll(start(),grade,type);assert.equal(requiredLessons(s.school.pupils[0]),GRADES[grade]);
  s=run(s,'finishSchool',1).state;assert.equal(s.school.pupils[0].progress,GRADES[grade]);assert.equal(s.school.points,6);assert.ok(valid(s));
  s=run(s,'graduate',1).state;assert.equal(s.school.alumni[0].name,'Aster');assert.equal(s.school.alumni[0].grade,grade);assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(run(s,'graduate',1).error);
 }
 let s=run(start(),'enroll','wife_2','creative').state;assert.equal(requiredLessons(s.school.pupils[0]),6);assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('batch lessons spend only whole available points and match individual classes',()=>{
 let s=enroll(start());s.school.points=2.5;let manual=run(s,'educate',1,'class').state;manual=run(manual,'educate',1,'class').state;
 const batch=run(s,'educateBatch',1).state;assert.deepEqual(batch,manual);assert.equal(batch.school.points,.5);assert.equal(batch.school.pupils[0].progress,2);assert.equal(batch.fellowXP,270);
});
test('graduation bonds apply only to matching new graduates and activation cannot repeat',()=>{
 let s=enroll(start());s=run(s,'finishSchool',1).state;const before=pupilReward(s,s.school.pupils[0]);
 s=run(s,'activateGraduationBond','wife_2').state;assert.equal(graduationBonus(s,s.school.pupils[0]),10);assert.equal(pupilReward(s,s.school.pupils[0]),Math.round(before*1.1*100)/100);assert.ok(run(s,'activateGraduationBond','wife_2').error);
 const other={...s.school.pupils[0],type:'brave'};assert.equal(graduationBonus(s,other),0);
 s=run(s,'graduate',1).state;const income=s.school.income;s=run(s,'gift','wife_2','gift1').state;assert.equal(s.school.income,income);
 assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('expanded seats are optional; malformed grades, names and bond flags are rejected',()=>{
 let s=start();assert.ok(run(s,'enrollPupil','wife_2',{name:'Bad',type:'diligent',grade:['D']}).error);assert.equal(schoolCapacity(s),3);s=run(s,'expandSchool').state;assert.equal(schoolCapacity(s),5);
 for(let i=0;i<5;i++)s=enroll(s);assert.equal(s.school.pupils.length,5);assert.ok(run(s,'enrollPupil','wife_2',{name:'Six',grade:'D',type:'brave'}).error);
 for(const change of [p=>p.grade='A',p=>p.grade=['D'],p=>p.progress=101,p=>p.name=' ']){const bad=structuredClone(s);change(bad.school.pupils[0]);assert.throws(()=>decode(JSON.stringify(bad)));}
 const bad=structuredClone(s);bad.family.wife_2.graduationBond='true';assert.throws(()=>decode(JSON.stringify(bad)));
});

test('graduate-all matches sequential rewards and cannot pay twice',()=>{
 let s=enroll(enroll(start()));s=run(s,'finishSchool',1).state;s=run(s,'finishSchool',2).state;
 let manual=run(s,'graduate',1).state;manual=run(manual,'graduate',2).state;
 const batch=run(s,'graduateAll').state;assert.deepEqual(batch,manual);assert.ok(run(batch,'graduateAll').error);assert.deepEqual(decode(JSON.stringify(batch)),batch);
});
