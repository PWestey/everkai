import {useMemo,useState} from 'react';
import {Button} from '@/components/ui/button';
import {TODAY_GROUPS,TODAY_STATE_LABELS,todayList,todaySummary} from '@/lib/today.mjs';
// TODAY (QOL-02). "A daily list like there is in Isekai that tells me everything that should be done,
// and if auto helper does it, it gets marked."
//
// The list is DERIVED -- lib/today.mjs reads the save and returns rows; nothing here writes state, and
// the only buttons are "send the helper out" and the jumps to each system. Recomputed with useMemo on
// the game object because the village ticks: the probes are plain reads of already-settled state, so a
// tick costs one pass over the rows, not a simulated helper run.
//
// PHONE FIRST (390px). Forty-odd rows will not fit on one screen, so: finished work collapses out of
// the way behind one switch, locked systems behind another, and the count at the top is the answer to
// the only question the owner asked ("what is left?").
const LABEL:Record<string,string>=TODAY_STATE_LABELS;
const CHIP:Record<string,string>={todo:'today-todo',done:'today-done',helper:'today-helper',locked:'today-locked'};
const MARK:Record<string,string>={todo:'○',done:'✓',helper:'✓',locked:'—'};

export default function TodayPanel({game,action,locked,onNavigate}:any){
 const [showDone,setShowDone]=useState(false);
 const [showLocked,setShowLocked]=useState(false);
 const rows=useMemo(()=>todayList(game),[game]);
 const sum=useMemo(()=>todaySummary(game),[game]);
 const visible=rows.filter(r=>r.state==='todo'||(showDone&&(r.state==='done'||r.state==='helper'))||(showLocked&&r.state==='locked'));
 const pct=sum.total?Math.round(100*sum.done/sum.total):0;
 return <section className="today-panel">
  <div className="today-count">
   <strong>{sum.done} of {sum.total} done today</strong>
   <div className="today-bar" role="img" aria-label={`${pct}% of today’s list done`}><i style={{width:pct+'%'}}/></div>
   <small>{sum.byHelper?`${sum.byHelper} done by the Little Helper · `:''}{sum.todo} left{sum.locked?` · ${sum.locked} not open yet`:''}</small>
  </div>
  {sum.helperBlocked
   ? <p className="small-note" role="status">{sum.helperBlocked}</p>
   : <Button className="wide" disabled={locked||!sum.helperReady} onClick={()=>action('helperRun')}>
      {sum.helperReady?'Send the Little Helper out':'Nothing here for the Little Helper'}
     </Button>}
  <div className="today-filters">
   <Button variant="outline" aria-pressed={showDone} onClick={()=>setShowDone(v=>!v)}>{showDone?'Hide':'Show'} finished</Button>
   <Button variant="outline" aria-pressed={showLocked} onClick={()=>setShowLocked(v=>!v)}>{showLocked?'Hide':'Show'} not open yet</Button>
  </div>
  {!visible.length&&<p className="small-note">Everything on today’s list is done. The list starts again tomorrow.</p>}
  {TODAY_GROUPS.map((g:any)=>{
   const list=visible.filter(r=>r.group===g.id);
   if(!list.length)return null;
   return <div key={g.id} className="today-group">
    <h3>{g.label}</h3>
    <p className="small-note">{g.note}</p>
    <ul>
     {list.map(r=><li key={r.id} className={CHIP[r.state]}>
      <span className="today-mark" aria-hidden="true">{MARK[r.state]}</span>
      <div>
       <strong>{r.label}</strong>
       <span className="today-state">{LABEL[r.state]}{r.detail?` · ${r.detail}`:''}</span>
       {r.pays&&<small>Pays: {r.pays}</small>}
      </div>
     </li>)}
    </ul>
   </div>;
  })}
  <details className="rules-note"><summary>How this list decides</summary>
   <p>Every line is read straight from your village, not from a separate checklist — so a line can only say “Done” when the thing behind it really cannot be done again today. A line the Little Helper finished is marked as his. If it becomes possible again (the village banks more gold, say), it goes back to “Not done”, because it is.</p>
   <p>The day turns at your own midnight, the same boundary your habit journal uses, not at a server’s. Everything under “Claim before the day turns” is lost if you do not take it.</p>
   <p>In the original this list is a second reward table: each task pays activity points on top of its own reward, with chests at 10, 20 and 30 points. Everkai pays you once, through your habits, so this list pays nothing — it only tells you what is left.</p>
  </details>
  <Button variant="outline" className="wide" onClick={()=>onNavigate?.('helper')}>Open the Little Helper</Button>
 </section>;
}
