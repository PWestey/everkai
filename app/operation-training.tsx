import {Button} from '@/components/ui/button';
import {operationLevel,operationSkills,operationPlan,operationCost,studyNotes,
        OPERATION_CAP,OPERATION_LADDER,NOTES_PER_WIN} from '@/lib/operations.mjs';
/** The Fellow's Operation panel: the original's `Hero_Appoint_*` skills, their shared level, and the
 *  fixed "Operation Effect" rows the panel lists beneath them. Deliberately plain -- the visual pass
 *  is a separate batch. */
export default function OperationTraining({id,game,action,locked}:any){
 if(!game.fellows[id])return null;
 const skills=operationSkills(game,id);if(!skills.length)return null;
 const level=operationLevel(game,id),notes=studyNotes(game),growing=skills.filter((e:any)=>e.step);
 const fixed=skills.filter((e:any)=>!e.step),next=level<OPERATION_CAP?OPERATION_LADDER[level-1]:null;
 return <div className="training-option"><div>
  <strong>Operation skill · Lv. {level}/{OPERATION_CAP}</strong>
  <p>Study Notes: {notes.toLocaleString()} · won negotiations at the Trading Post pay {NOTES_PER_WIN} each</p>
  {growing.map((e:any)=><p key={e.skillId}>{e.type||e.building||'Every business'} · +{e.value.toLocaleString()}%{e.capped?' (at the cap)':` (next +${(e.value+e.step).toLocaleString()}%)`}{e.minLevel>1?` · needs Fellow Lv. ${e.minLevel}`:''}</p>)}
  {!!fixed.length&&<p>Operation Effect: {fixed.map((e:any)=>`+${e.value}% ${e.type||e.building||'everywhere'} at Lv. ${e.minLevel}`).join(' · ')}</p>}
  <p>One level is +{growing[0]?.step||0} percentage points on every skill above; the level is the Fellow’s and is shared between them, as it is in the original.</p>
  {next!==null&&<p>Next level costs {next.toLocaleString()} Study Notes · {(operationCost(OPERATION_CAP)-operationCost(level)).toLocaleString()} left to reach {OPERATION_CAP}</p>}
 </div><div className="business-actions">{([1,10,100,'max'] as const).map(amount=>{
  const plan=operationPlan(game,id,amount);
  return <Button key={amount} disabled={locked||!plan.count} onClick={()=>action('operationTrain',id,amount)}>
   Operation {amount==='max'?'max':`up to ${amount}`} · Lv. {plan.level} · {plan.cost.toLocaleString()} notes</Button>;
 })}</div>
 <details className="rules-note"><summary>About these rules</summary><p>Every number here is the original’s: the value is <code>skillProp_Initial + (level−1) × skillProp_Level</code> from SkillBase, capped at maxUpgradeLevel 300, and the price is SkillLevel[Hero_Appoint_Base_1] — 25,589 Study Notes to take one Fellow from 1 to 300. Study Notes come from the Trading Post, which is the shop the original’s own item description names; how many a won duel pays is this project’s rate, because the shop’s stock table is not in the recovered data.</p></details></div>;
}
