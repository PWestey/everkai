import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {AlertDialog,AlertDialogContent,AlertDialogTitle,AlertDialogDescription,AlertDialogCancel,AlertDialogAction} from '@/components/ui/alert-dialog';
import {refundPlan,describeAmounts} from '@/lib/fellow-reset.mjs';
import {sourceTraining} from '@/lib/training-costs.mjs';

/** Auto-optimize and Refund all for one owned Fellow. The engine decides what is refundable; this only
 *  previews it, so the confirm step shows exactly what comes back and what stays. */
export default function FellowReset({game,id,name,action,locked}:any){
 const [confirm,setConfirm]=useState(false);
 const plan:any=refundPlan(game,id);
 return <div className="training-option">
  <div><strong>Quick setup</strong><p>Auto-optimize spends the EXP and materials you hold on {name}, best Power first. It never spends gold or crystals, and Refund all can always undo it.</p>{!sourceTraining(game)&&<p className="small-note">Levels are left alone until APK training costs are on (Training Rules), because only those levels have a price on record.</p>}</div>
  <div className="business-actions">
   <Button disabled={locked} onClick={()=>action('optimizeFellow',id)}>Auto-optimize</Button>
   <Button variant="outline" disabled={locked||!!plan.error} onClick={()=>setConfirm(true)}>Refund all</Button>
  </div>
  <AlertDialog open={confirm} onOpenChange={setConfirm}><AlertDialogContent>
   <AlertDialogTitle>Refund {name}?</AlertDialogTitle>
   <AlertDialogDescription>{plan.error?plan.error:`You get back exactly what was spent: ${describeAmounts(plan.back)}.`}</AlertDialogDescription>
   {!plan.error&&plan.kept.length>0&&<p className="small-note">Stays as it is: {plan.kept.join('; ')}.</p>}
   {!plan.error&&<p className="small-note">Aptitude: {plan.aptitude.refunded.toLocaleString()} comes off and is paid back. {plan.aptitude.kept>0?`${plan.aptitude.kept.toLocaleString()} above the base stays: it was gained before Aptitude was tracked, or from sources that don’t record a price.`:'None stays above the base.'}</p>}
   <p className="small-note">Elixirs, Stella activation and the equipped artifact stay.</p>
   <AlertDialogCancel>Cancel</AlertDialogCancel>
   <AlertDialogAction disabled={locked||!!plan.error} onClick={()=>{action('refundFellow',id);setConfirm(false)}}>Refund all</AlertDialogAction>
  </AlertDialogContent></AlertDialog>
 </div>;
}
