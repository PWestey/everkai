import {pupilMilestone} from './school-maturation.mjs';
import {innGiftSchoolBonus} from './inn-guests.mjs';
import {fishingEducationBonus} from './fishing.mjs';
import bonds from './graduation-bonds.json' with {type:'json'};
// Local base and rounding policy; source percentages affect only new education awards.
export function educationReward(s,p,rank,awards=1){const base=rank*10,percent=fishingEducationBonus(s,p.type),perAward=Math.floor(base*(100+percent)/100),total=perAward*awards;return {base,percent,perAward,total,credited:Math.min(total,Math.max(0,1e9-s.fellowXP))}}
export const SCHOOL_TYPES=['inspiring','diligent','brave','informed','unfettered'];
export const GRADES={D:100,C:125,'B-':155,B:200,'B+':280};
export const schoolCapacity=s=>s.school.seats||3;
export const requiredLessons=p=>p.grade?GRADES[p.grade]:6;
export const graduationBond=id=>bonds[id]||null;
export const graduationBonus=(s,p)=>SCHOOL_TYPES.includes(p.type)?Object.entries(s.family).reduce((n,[id,f])=>n+(f.graduationBond&&bonds[id]?.type===p.type?bonds[id].percent:0),0):0;
export const validEducationFields=s=>(s.school.seats===undefined||s.school.seats===5)&&Object.entries(s.family).every(([id,f])=>f.graduationBond===undefined||typeof f.graduationBond==='boolean'&&(!f.graduationBond||!!bonds[id]));
export const validPupilFields=p=>(p.grade===undefined||typeof p.grade==='string'&&Object.hasOwn(GRADES,p.grade)&&SCHOOL_TYPES.includes(p.type))&&(p.name===undefined||typeof p.name==='string'&&p.name.trim().length>0&&p.name.length<=30);
export function educationRoundPlan(s,rank){const pupils=s.school.pupils.filter(p=>p.progress<requiredLessons(p)),count=pupils.length,base=pupils.reduce((n,p)=>n+educationReward(s,p,rank).total,0),bonus=count?innGiftSchoolBonus(s,'teachAllXP'):0;return {count,affordable:count>0&&s.school.points>=count,total:base+bonus,bonus,credited:Math.min(base+bonus,Math.max(0,1e9-s.fellowXP))};}
export function educationAction(s,action,target,value,rank){
 const fail=error=>({state:s,error});
 if(action==='educateAllRound'){const plan=educationRoundPlan(s,rank);if(!plan.count)return fail('No pupils need another lesson.');if(!plan.affordable)return fail('Recover enough Education Points for every participating pupil.');return {state:{...s,fellowXP:s.fellowXP+plan.credited,school:{...s.school,points:s.school.points-plan.count,pupils:s.school.pupils.map(p=>p.progress<requiredLessons(p)?{...p,progress:p.progress+1,education:p.education+rank}:p)}},message:`${plan.count} pupils attended class · +${plan.credited} Fellow EXP.`};}

 if(action==='expandSchool')return {state:{...s,school:{...s.school,seats:5}},message:'Five school seats opened for sandbox play.'};
 if(action==='activateGraduationBonds'){
  const family=Object.fromEntries(Object.entries(s.family).map(([id,f])=>[id,bonds[id]?{...f,graduationBond:true}:f]));
  return {state:{...s,family},message:'All supported family graduation bonds activated.'};
 }
 if(action==='activateGraduationBond'){
  const f=s.family[target];if(!f||!bonds[target])return fail('No supported graduation bond for this family member.');
  if(f.graduationBond)return fail('This bond is already active.');
  return {state:{...s,family:{...s.family,[target]:{...f,graduationBond:true}}},message:'Documented graduation bonus activated for sandbox play.'};
 }
 if(action==='enrollPupil'){
  if(!s.family[target]||!value||!SCHOOL_TYPES.includes(value.type)||typeof value.grade!=='string'||!Object.hasOwn(GRADES,value.grade)||typeof value.name!=='string'||!value.name.trim()||value.name.trim().length>30)return fail('Choose a caretaker, name, type and grade.');
  if(s.school.pupils.length>=schoolCapacity(s)||s.school.nextId>=1e9)return fail('Graduate a pupil to make room.');
  const p={id:s.school.nextId,caretaker:target,name:value.name.trim(),grade:value.grade,type:value.type,intellect:s.family[target].relationship*10,progress:0,education:0};
  return {state:{...s,school:{...s.school,nextId:s.school.nextId+1,pupils:[...s.school.pupils,p]}},message:`${p.name} enrolled.`};
 }
 if(!['educateBatch','educateToMilestone','finishSchool'].includes(action))return null;
 const p=s.school.pupils.find(p=>p.id===target);if(!p)return fail('Choose an enrolled pupil.');
 const remaining=requiredLessons(p)-p.progress;if(remaining<=0)return fail('This pupil is ready to graduate.');
 const gain=action==='finishSchool'?remaining:Math.min(action==='educateToMilestone'?pupilMilestone(p,requiredLessons(p)).remaining:remaining,Math.floor(s.school.points));if(!gain)return fail('Education Points are recovering.');
 const reward=educationReward(s,p,rank,gain);
 return {state:{...s,fellowXP:s.fellowXP+reward.credited,school:{...s.school,points:action==='finishSchool'?s.school.points:s.school.points-gain,pupils:s.school.pupils.map(x=>x.id===target?{...x,progress:x.progress+gain,education:x.education+gain*rank}:x)}},message:`${action==='finishSchool'?'Sandbox: ':''}${gain} lessons completed · +${reward.credited} Fellow EXP.`};
}
