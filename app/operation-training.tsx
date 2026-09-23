import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {operationLevel,operationSkills,operationPlan,operationCost,studyNotes,
        OPERATION_CAP,OPERATION_LADDER,NOTES_PER_WIN} from '@/lib/operations.mjs';
import {SpendControls,type Quantity} from './original-controls';
import {InfoDot} from './fellow-shell';
/** FELLOW OPERATION -- the original's `Hero_Appoint_*`: what a Fellow adds to the earnings of the
 *  business it operates.
 *
 *  BUILT TO docs/fellow-screen-specs/07-operation.md, which is capture evidence for layout and
 *  wording and explicitly NOT for numbers -- the values, the cap and the price below all come from
 *  SkillBase and SkillLevel instead. The structure landed first (d47070d); this is the visual pass
 *  against img/operation.png:
 *
 *   * a short half panel that does NOT scroll -- the whole section fits;
 *   * `Operation Skill`: an art tile beside a card whose title is `Name: Lv. 101/300`, the effect
 *     as one templated sentence with THE CLASS NAME COLOURED GREEN inside it (the original's way of
 *     marking the parameter in a template, which turns a sentence into a readable formula), and
 *     `(Next Level +755%)` in green parentheses in the same flow;
 *   * the quantity selector and the green button sit BELOW AND RIGHT of the card, not inside it;
 *   * `Operation Effect`: star-bulleted passive rows with no level, no cost and no button.
 *
 *  The selector is INTENT, not amount: `x100` selected with 23 affordable renders `Upgrade x23`,
 *  which the capture shows and the original never explains. */

/** The original's own templated sentence, with the parameter the player reads named inside it and
 *  coloured, exactly as the capture colours `Informed`. */
function EffectSentence({e,extra}:{e:any,extra:boolean}){
 const where=e.type?<>a building of the <b>{e.type}</b> type</>:e.building?<>the <b>{e.building}</b> building</>:<>any building</>;
 return <>When operating {where}, its earnings get {extra?'an extra ':''}+{e.value.toLocaleString()}%.</>;
}
export default function OperationTraining({id,game,action,locked}:any){
 const [q,setQ]=useState<Quantity>(1),[info,setInfo]=useState(false);
 if(!game.fellows[id])return null;
 const skills=operationSkills(game,id);if(!skills.length)return null;
 const level=operationLevel(game,id),notes=studyNotes(game);
 const growing=skills.filter((e:any)=>e.step),fixed=skills.filter((e:any)=>!e.step);
 const next=level<OPERATION_CAP?OPERATION_LADDER[level-1]:null;
 const remaining=operationCost(OPERATION_CAP)-operationCost(level);
 const plan=operationPlan(game,id,q as any),cost=plan.count?plan.cost:(next||0);
 return <section className="operation-panel">
  <h3 className="band-rule">Operation Skill</h3>
  {growing.map((e:any)=><div className="operation-card" key={e.skillId}>
   <span className="operation-art tier-orange" aria-hidden="true">⌂</span>
   <div>
    <p className="operation-title">{e.name||'Operation Faculty'}: <em>Lv. {level}/{e.max}</em></p>
    <p className="operation-effect"><EffectSentence e={e} extra={false}/>
     {e.capped?null:<i> (Next Level +{(e.value+e.step).toLocaleString()}%)</i>}</p>
    {e.minLevel>1&&<p className="operation-gate">Unlocks at Fellow Lv. {e.minLevel}.</p>}
   </div>
  </div>)}
  {!growing.length&&<p className="operation-gate">This Fellow’s Operation skills are the fixed kind and do not level.</p>}

  {!!growing.length&&<div className="operation-foot">
   <SpendControls quantity={q} onQuantity={setQ} label="Operation quantity"
    verb={plan.count?`Upgrade x${plan.count}`:'Upgrade'} disabled={locked||!plan.count}
    currency="Notes" have={notes} cost={cost} onClick={()=>action('operationTrain',id,q)}/>
  </div>}

  {!!fixed.length&&<>
   <h3 className="band-rule">Operation Effect</h3>
   {fixed.map((e:any)=><p className="operation-passive" key={e.skillId}><span aria-hidden="true">★</span>
    <span><EffectSentence e={e} extra/>{e.minLevel>1?<i> (from Fellow Lv. {e.minLevel})</i>:null}</span></p>)}
  </>}

  <div className="operation-info"><InfoDot label="About Operation" onClick={()=>setInfo(true)}/></div>
  <Dialog open={info} onOpenChange={setInfo}><DialogContent className="save-dialog">
   <DialogTitle>Operation</DialogTitle>
   <DialogDescription>Study Notes {notes.toLocaleString()}{next!==null?` · next level ${next.toLocaleString()} · ${remaining.toLocaleString()} left to reach Lv. ${OPERATION_CAP}`:''}</DialogDescription>
   <p>Every number here is the original’s. A skill is worth <code>skillProp_Initial + (level − 1) × skillProp_Level</code> from SkillBase, capped at its own maxUpgradeLevel of {OPERATION_CAP}, and the price is SkillLevel[Hero_Appoint_Base_1] — 25,589 Study Notes to take one Fellow from 1 to {OPERATION_CAP}. The level belongs to the Fellow and is shared across its Operation skills, because the original’s own building code reads a single Hero_Appoint_Base_1 level off whoever is appointed.</p>
   <p>The star-bulleted effects are the original’s fixed rows: they unlock at a Fellow level and never level themselves.</p>
   <p>Study Notes come from the Trading Post, which is the shop the original’s own item description names. A won negotiation pays {NOTES_PER_WIN}; how many a duel pays is this project’s rate, because that shop’s stock table is not in the recovered data.</p>
  </DialogContent></Dialog>
 </section>;
}
