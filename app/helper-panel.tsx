import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';
import {HELPER_GROUPS,HELPER_TASKS,helperState,helperBlocked,helperEnabled,helperNote,helperFocusList} from '@/lib/helper.mjs';
import {fellowById} from '@/lib/catalog.mjs';
import {todaySummary} from '@/lib/today.mjs';
// The Little Helper (QOL-01). The original shows a menu of individually switchable chores; this is
// the same shape, minus the purchase screen -- a finished daily habit is what sends the helper out.
// The list is long (every repeatable loop in the game), so it is folded into groups that fit a phone.
export default function HelperPanel({game,action,locked,onNavigate}:any){
 const state=helperState(game),blocked=helperBlocked(game),on=HELPER_TASKS.filter((t:any)=>helperEnabled(game,t.id)).length;
 // The same arithmetic the Today list heads with, from the same function, so the two panels cannot
 // disagree about how much of the day is left.
 const today=todaySummary(game);
 const ran=state.ranAt?new Date(state.ranAt).toLocaleTimeString([],{hour:'numeric',minute:'2-digit'}):null;
 // "Switch all on" means every FREE chore. A chore that spends gold is only ever switched on by name.
 const free=HELPER_TASKS.filter((t:any)=>!t.defaultOff);
 // WHERE THE SHARDS WENT. The Stella chore spends one shared pool across the whole roster, so the
 // run record names who actually got the ranks (lib/helper.mjs runStella). Shown here and in Today.
 const stella=helperNote(game,'stella'),focus=helperFocusList(game);
 return <section>
  <p>{on} of {HELPER_TASKS.length} chores switched on{ran?` · last sent out at ${ran}`:''}</p>
  {stella&&<p className="small-note item-status">Stella: {stella}</p>}
  <p className="small-note">{focus.length
   ?`Stella focus: ${focus.map((id:string)=>fellowById(id)?.name||id).join(' → ')}. The helper fills these ladders first, in that order.`
   :'No Stella focus picks. Open a Fellow’s Stella page to send the helper’s shards there first; otherwise it follows your own order and finishes one ladder before starting the next.'}</p>
  <p className="small-note">Today’s list: {today.done} of {today.total} done{today.byHelper?`, ${today.byHelper} of them by him`:''}.{' '}
   <button type="button" className="today-link" onClick={()=>onNavigate?.('today')}>Open Today</button></p>
  <div className="business-actions">
   <Button disabled={locked||!!blocked||!on} onClick={()=>action('helperRun')}>Send the helper out</Button>
   <Button variant="outline" disabled={locked} onClick={()=>free.forEach((t:any)=>action('helperToggle',t.id,true))}>Switch all free chores on</Button>
  </div>
  {blocked&&<p role="status">{blocked}</p>}
  {HELPER_GROUPS.map(g=>{
   const tasks=HELPER_TASKS.filter((t:any)=>t.group===g.id),count=tasks.filter((t:any)=>helperEnabled(game,t.id)).length;
   return <details key={g.id} className="helper-group" open={g.id!=='spending'&&tasks.length<=4}>
    <summary><span>{g.label}</span><small>{count} of {tasks.length} on</small></summary>
    {g.id==='spending'&&<p className="small-note">These spend your gold. They stay off until you switch one on.</p>}
    <ul className="helper-tasks">
     {tasks.map((t:any)=>{const enabled=helperEnabled(game,t.id);return <li key={t.id}>
      <span>{t.label}</span>
      <Switch checked={enabled} disabled={locked} aria-label={t.label} onCheckedChange={(v:boolean)=>action('helperToggle',t.id,v)}/>
     </li>})}
    </ul>
   </details>})}
  <details className="rules-note"><summary>What the helper will and will not do</summary>
   <p>The helper does the repetitive part for you: it collects what is waiting, claims your habit rewards and achievements, works the farm, fishes, runs the Inn, Workshop and Expo, roams, trades, digs the Treasure Hunt, deploys the Mine, hosts banquets, descends the Northern Odyssey, makes wishes, walks the village, runs Raphael's support stage, climbs the Familiar Tower, sends familiars on dispatch and runs the School. It taps the same buttons you would, so it can never collect anything twice or hand you more than a day allows.</p>
   <p>Free chores never spend your gold or crystals. They do spend things that can only buy one thing: Education Points on lessons, Stella fragments on that Fellow's Stella, Fairy Bottles on wishes, duplicates on their own item. Anything that spends gold sits in its own group and is off until you switch it on.</p>
   <p>Habit rewards are claimed once your day is perfect, so you keep the perfect-day bonus; if the day is still not perfect by 9 pm, the helper claims it as it stands so it is not lost at midnight. It forges Acquaint Stones, but never chooses between Valiant and Archangel insignias.</p>
   <p>Where a chore has to pick, it takes the best-paying option: grade D pupils (the most income per Education Point) with your closest caretaker, the crop that yields most per hour, the dish and product that pay most, the strongest familiars for dispatch, the cheapest team that still wins a negotiation. It only plays an Expo day, a Tower floor or a Northern floor it is certain to win, and leaves quiz answers, your formations and your training to you.</p>
   <p>In the original this feature is sold. Here it is earned: finish one daily habit and the helper runs for the rest of the day.</p>
  </details>
 </section>;
}
