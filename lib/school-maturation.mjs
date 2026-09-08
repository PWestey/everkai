// Community School revision811; presentation thresholds, not grade or reward upgrades.
export const ADULT_LESSONS=Object.freeze({C:36,'B-':45,B:60,'B+':84});
export function pupilMilestone(p,completion){
 const adult=ADULT_LESSONS[p.grade]??null;
 const complete=p.progress>=completion;
 const next=!complete&&adult!==null&&p.progress<adult?adult:completion;
 return {adult,stage:complete?'Ready to graduate':adult===null?'Learning':p.progress<adult?'Growing pupil':'Adult pupil',next,label:next===adult?'Adulthood':'Graduation',remaining:Math.max(0,next-p.progress)};
}
