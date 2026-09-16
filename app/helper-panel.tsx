import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {HELPER_TASKS,helperState,helperBlocked,helperEnabled} from '@/lib/helper.mjs';
// The Little Helper (QOL-01). The original shows a menu of individually switchable chores; this is
// the same shape, minus the purchase screen -- a finished daily habit is what sends the helper out.
export default function HelperPanel({game,action,locked}:any){
 const state=helperState(game),blocked=helperBlocked(game),on=HELPER_TASKS.filter(t=>helperEnabled(game,t.id)).length;
 const ran=state.ranAt?new Date(state.ranAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):null;
 return <section>
  <p>{on} of {HELPER_TASKS.length} chores switched on{ran?` · last sent out at ${ran}`:''}</p>
  <div className="business-actions">
   <Button disabled={locked||!!blocked||!on} onClick={()=>action('helperRun')}>Send the helper out</Button>
   <Button variant="outline" disabled={locked} onClick={()=>HELPER_TASKS.forEach(t=>action('helperToggle',t.id,true))}>Switch all on</Button>
  </div>
  {blocked&&<p role="status">{blocked}</p>}
  <ul className="helper-tasks">
   {HELPER_TASKS.map(t=>{const enabled=helperEnabled(game,t.id);return <li key={t.id}>
    <span>{t.label}</span>
    <Switch checked={enabled} disabled={locked} aria-label={t.label} onCheckedChange={(v:boolean)=>action('helperToggle',t.id,v)}/>
   </li>})}
  </ul>
  <details className="rules-note"><summary>What the helper will and will not do</summary>
   <p>The helper does the repetitive part for you: it collects what is waiting, works the farm, fishes while your bait lasts, welcomes Inn guests and serves the Expo. It taps the same buttons you would, so it can never collect anything twice or hand you more than a day allows.</p>
   <p>It never spends your gold or crystals, never buys an upgrade, and never trains anyone — those choices stay yours. Where a chore has to pick, it sows whichever crop yields most per hour and fishes the deepest water you have opened.</p>
   <p>In the original this feature is sold. Here it is earned: finish one daily habit and the helper runs for the rest of the day.</p>
  </details>
 </section>;
}
