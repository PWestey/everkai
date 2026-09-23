import {Button} from '@/components/ui/button';
import {operationLevel,operationSkills,operationPlan,operationCost,studyNotes,
        OPERATION_CAP,OPERATION_LADDER,NOTES_PER_WIN} from '@/lib/operations.mjs';
/** FELLOW OPERATION -- the original's `Hero_Appoint_*`: what a Fellow adds to the earnings of the
 *  business it operates.
 *
 *  BUILT TO docs/fellow-screen-specs/07-operation.md, which is capture evidence for layout and
 *  wording and explicitly NOT for numbers -- the values, the cap and the price below all come from
 *  SkillBase and SkillLevel instead. Followed from that spec: two blocks, `Operation Skill` over
 *  `Operation Effect`; the title `Operation Faculty V: Lv. 101/300` with the roman numeral as part
 *  of the skill's own name; the effect as one templated sentence with the class named inside it;
 *  `(Next Level +X%)` in the same flow; a quantity selector that is INTENT rather than amount, with
 *  the button showing what the balance actually buys; and star-bulleted passive rows with no level,
 *  no cost and no button. */
const AMOUNTS=[['Quick','max'],['x1',1],['x10',10],['x100',100]] as const;
/** The original's own templated sentence, with the parameter the player reads named inside it. */
const effectSentence=(e:any,extra:boolean)=>{
 const where=e.type?`a building of the ${e.type} type`:e.building?`the ${e.building} building`:'any building';
 return `When operating ${where}, its earnings get ${extra?'an extra ':''}+${e.value.toLocaleString()}%.`;
};
export default function OperationTraining({id,game,action,locked}:any){
 if(!game.fellows[id])return null;
 const skills=operationSkills(game,id);if(!skills.length)return null;
 const level=operationLevel(game,id),notes=studyNotes(game);
 const growing=skills.filter((e:any)=>e.step),fixed=skills.filter((e:any)=>!e.step);
 const next=level<OPERATION_CAP?OPERATION_LADDER[level-1]:null;
 const remaining=operationCost(OPERATION_CAP)-operationCost(level);
 return <section className="school-card">
  <h3>◇ Operation Skill ◇</h3>
  {growing.map((e:any)=><div className="training-option" key={e.skillId}><div>
   <strong>{e.name||'Operation Faculty'}: Lv. {level}/{e.max}</strong>
   <p>{effectSentence(e,false)}{e.capped?'':` (Next Level +${(e.value+e.step).toLocaleString()}%)`}</p>
   {e.minLevel>1&&<p className="small-note">Unlocks at Fellow Lv. {e.minLevel}.</p>}
  </div></div>)}
  {!growing.length&&<p>This Fellow’s Operation skills are the fixed kind and do not level.</p>}

  {!!growing.length&&<>
   <p className="small-note">Study Notes {notes.toLocaleString()} · a won negotiation at the Trading Post pays {NOTES_PER_WIN}</p>
   <div className="business-actions">{AMOUNTS.map(([label,amount])=>{
    const plan=operationPlan(game,id,amount as any);
    // The selector is intent; the button is what the balance buys. `Upgrade x23` when 100 was asked
    // for and 23 is affordable -- the original never explains the clamp, it just shows the number.
    return <Button key={label} disabled={locked||!plan.count} onClick={()=>action('operationTrain',id,amount)}>
     Upgrade x{plan.count} · {notes.toLocaleString()}/{(plan.cost||next||0).toLocaleString()}</Button>;
   })}</div>
   {next!==null&&<p className="small-note">Next level {next.toLocaleString()} Study Notes · {remaining.toLocaleString()} left to reach Lv. {OPERATION_CAP}</p>}
  </>}

  {!!fixed.length&&<>
   <h3>◇ Operation Effect ◇</h3>
   {fixed.map((e:any)=><p key={e.skillId}>★ {effectSentence(e,true)}{e.minLevel>1?` (from Fellow Lv. ${e.minLevel})`:''}</p>)}
  </>}

  <details className="rules-note"><summary>About Operation</summary>
   <p>Every number here is the original’s. A skill is worth <code>skillProp_Initial + (level − 1) × skillProp_Level</code> from SkillBase, capped at its own maxUpgradeLevel of {OPERATION_CAP}, and the price is SkillLevel[Hero_Appoint_Base_1] — 25,589 Study Notes to take one Fellow from 1 to {OPERATION_CAP}. The level belongs to the Fellow and is shared across its Operation skills, because the original’s own building code reads a single Hero_Appoint_Base_1 level off whoever is appointed.</p>
   <p>The star-bulleted effects below the skill are the original’s fixed rows: they unlock at a Fellow level and never level themselves.</p>
   <p>Study Notes come from the Trading Post, which is the shop the original’s own item description names. How many a won duel pays is this project’s rate, because that shop’s stock table is not in the recovered data.</p>
  </details></section>;
}
