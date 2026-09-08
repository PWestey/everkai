import {innGiftSchoolBonus} from './inn-guests.mjs';
import {SCHOOL_TYPES,schoolCapacity,requiredLessons,validPupilFields,validEducationFields,graduationBonus} from './education.mjs';
import original from './original-content.mjs';
// Recovery timing is verified. Other thresholds and formulas are local balance.
export const EDUCATION_RECOVERY_MS=original.educationRecoveryMs,EDUCATION_CAP=6,MAX_PUPILS=3,LESSONS_REQUIRED=6;
export const PUPIL_TYPES=[{id:'curious',name:'Curious',multiplier:1},{id:'creative',name:'Creative',multiplier:1.1},...SCHOOL_TYPES.map(id=>({id,name:id[0].toUpperCase()+id.slice(1),multiplier:1}))];
export const METHODS=[{id:'class',name:'Class',rank:1,progress:1},{id:'workshop',name:'Workshop',rank:2,progress:2},{id:'tutorial',name:'Tutorial',rank:3,progress:3}];
export const relationRequired=tier=>tier*20;
export const pupilReward=(s,p)=>Math.round((1+s.family[p.caretaker].intimacy/100)*(p.intellect/10)*(1+p.education/10)*PUPIL_TYPES.find(t=>t.id===p.type).multiplier*(1+graduationBonus(s,p)/100)*100)/100+innGiftSchoolBonus(s,'graduationFlat');
export function validSchool(s){const integer=(v,max=1e9)=>Number.isInteger(v)&&v>=0&&v<=max;
 if(!s.school||typeof s.school!=='object'||!Number.isFinite(s.school.points)||s.school.points<0||s.school.points>EDUCATION_CAP||!integer(s.school.nextId)||s.school.nextId<1||!integer(s.school.graduates)||!Number.isFinite(s.school.income)||s.school.income<0||s.school.income>1e9||!integer(s.fellowXP)||!Array.isArray(s.school.pupils)||s.school.pupils.length>schoolCapacity(s)||!Array.isArray(s.school.alumni)||s.school.alumni.length>20)return false;
 if(!validEducationFields(s))return false;
 const ids=[];for(const p of s.school.pupils){if(!p||!validPupilFields(p)||!integer(p.id)||p.id<1||p.id>=s.school.nextId||!Object.hasOwn(s.family,p.caretaker)||!PUPIL_TYPES.some(t=>t.id===p.type)||!integer(p.intellect,50)||p.intellect<10||!integer(p.progress,requiredLessons(p))||!integer(p.education,p.grade?2800:60))return false;ids.push(p.id)}
 for(const p of s.school.alumni){if(!p||!validPupilFields(p)||!integer(p.id)||p.id<1||p.id>=s.school.nextId||!Object.hasOwn(s.family,p.caretaker)||!Number.isFinite(p.income)||p.income<0||p.income>1e9)return false;ids.push(p.id)}
 return new Set(ids).size===ids.length&&s.school.graduates>=s.school.alumni.length&&s.school.nextId>s.school.graduates;
}
export const freshSchool=()=>({points:EDUCATION_CAP,nextId:1,graduates:0,income:0,pupils:[],alumni:[]});
