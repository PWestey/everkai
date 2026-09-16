import {Button} from '@/components/ui/button';
import {EVENTS,COMPLETIONS_PER_STAGE,completionsAvailable,eventClaimed} from '@/lib/events.mjs';
// Lite habit-events (EVT-21). One card per crossover; each step introduces one of its cast and is paid
// for with habit completions, which is the only currency this game mints.
export default function EventPanel({game,action,locked}:any){
 const available=completionsAvailable(game);
 return <section>
  <p>{available.toLocaleString()} habit completion{available===1?'':'s'} banked · {COMPLETIONS_PER_STAGE} opens the next step of any arc</p>
  <div className="event-cards">
   {EVENTS.map((e:any)=>{
    const done=eventClaimed(game,e.id),total=e.stages.length,next=done<total?e.cast[done]:null;
    return <article className="school-card" key={e.id}>
     <h3>{e.name}</h3>
     <p className="small-note">{e.source} · {done} of {total} joined</p>
     <progress value={done} max={total}/>
     <p>{e.cast.map((c:any,i:number)=><span key={c.id} className={i<done?'event-met':'event-unmet'}>{c.name}{i<e.cast.length-1?' · ':''}</span>)}</p>
     {next
      ? <Button disabled={locked||available<COMPLETIONS_PER_STAGE} onClick={()=>action('eventClaim',e.id)}>
         {available<COMPLETIONS_PER_STAGE?`${COMPLETIONS_PER_STAGE-available} more habits to meet ${next.name}`:`Meet ${next.name} · ${COMPLETIONS_PER_STAGE} completions`}
        </Button>
      : <p className="item-status">Arc complete — the whole cast is in your village.</p>}
    </article>})}
  </div>
  <details className="rules-note"><summary>Why these are not the original events</summary>
   <p>In the original each of these ran as a timed mega event with its own game inside it — a stamina map to explore, match-3 battles, a sparring ladder, an exclusive gacha and a power ranking — and then it ended and never came back.</p>
   <p>None of that fits a village you play offline, alone, at your own pace. What is kept is what the events were actually for: meeting the cast. Here the arc runs on the thing you are already doing, and it waits for you.</p>
  </details>
 </section>;
}
