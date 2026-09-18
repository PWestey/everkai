import {Button} from '@/components/ui/button';
import {visibleEvents,COMPLETIONS_PER_STAGE,completionsAvailable,costPerStage,eventClaimed,eventNextStage} from '@/lib/events.mjs';
import PanelPages from './panel-pages';
// Lite habit-events (EVT-21). One card per arc; each stage introduces one of its cast and is paid for
// with habit completions, which is the only currency this game mints.
//
// 41 arcs and 198 cast names in one grid is unusable on a phone, so the arcs are grouped twice: an
// outer page per franchise (Isekai, plus Marvel and Star Wars only when ?crossover=1 is on, because
// visibleEvents() hides flagged arcs without it) and an inner page per stage price, which is also the
// arc tier. The largest single page is then 9 cards instead of 41.

function ArcCard({game,action,locked,arc,available}:any){
 const done=eventClaimed(game,arc.id),total=arc.stages.length,cost=costPerStage(arc.id);
 // Typed loosely on purpose: the stage rows of the eight Isekai arcs and the 33 crossover arcs are
 // structurally different (only the crossover stages carry a written `title`).
 const stage:any=eventNextStage(game,arc.id);
 const next=stage?arc.cast[done]:null;
 return <article className="school-card">
  <h3>{arc.name}</h3>
  {/* `item-status` as well as `small-note`: globals.css:829 hides a bare .small-note inside a system
      sheet, and with 19 arcs on a page the price and the progress are what the player is choosing on. */}
  <p className="small-note item-status">{arc.franchise||arc.source} · {done} of {total} joined · {cost} completions a stage</p>
  {arc.situation&&<p className="small-note item-status">{arc.situation}</p>}
  <progress value={done} max={total}/>
  <p>{arc.cast.map((c:any,i:number)=><span key={c.id} className={i<done?'event-met':'event-unmet'}>{c.label||c.name}{i<arc.cast.length-1?' · ':''}</span>)}</p>
  {next
   ? <>
      {stage.title&&<p className="item-status">Next: {stage.title}</p>}
      <Button disabled={locked||available<cost} onClick={()=>action('eventClaim',arc.id)}>
       {available<cost?`${cost-available} more habits to meet ${next.label||next.name}`:`Meet ${next.label||next.name} · ${cost} completions`}
      </Button>
     </>
   : <p className="item-status">Arc complete — the whole cast is in your village.</p>}
 </article>;
}

function FranchisePage({game,action,locked,arcs,available}:any){
 const joined=arcs.reduce((n:number,a:any)=>n+eventClaimed(game,a.id),0);
 const cast=arcs.reduce((n:number,a:any)=>n+a.stages.length,0);
 const complete=arcs.filter((a:any)=>eventClaimed(game,a.id)>=a.stages.length).length;
 const costs=[...new Set(arcs.map((a:any)=>costPerStage(a.id)))].sort((a:any,b:any)=>a-b) as number[];
 const body=costs.map(cost=><div className="event-cards" key={cost}>
  {arcs.filter((a:any)=>costPerStage(a.id)===cost).map((a:any)=>
   <ArcCard key={a.id} game={game} action={action} locked={locked} arc={a} available={available}/>)}
 </div>);
 return <>
  <p className="small-note item-status">{joined} of {cast} joined · {complete} of {arcs.length} arc{arcs.length===1?'':'s'} complete</p>
  {costs.length>1?<PanelPages labels={costs.map(c=>`${c} each`)}>{body}</PanelPages>:body}
 </>;
}

export default function EventPanel({game,action,locked}:any){
 const available=completionsAvailable(game);
 const arcs=visibleEvents();
 const groups=[...new Set(arcs.map((e:any)=>e.franchise||'Isekai'))] as string[];
 const pages=groups.map(g=>arcs.filter((e:any)=>(e.franchise||'Isekai')===g));
 return <section>
  <p>{available.toLocaleString()} habit completion{available===1?'':'s'} banked · {COMPLETIONS_PER_STAGE} opens the next step of an Isekai arc</p>
  {groups.length>1
   ? <PanelPages labels={groups}>{pages.map((list,i)=>
      <FranchisePage key={groups[i]} game={game} action={action} locked={locked} arcs={list} available={available}/>)}</PanelPages>
   : <FranchisePage game={game} action={action} locked={locked} arcs={arcs} available={available}/>}
  <details className="rules-note"><summary>Why these are not the original events</summary>
   <p>In the original each of the Isekai arcs ran as a timed mega event with its own game inside it — a stamina map to explore, match-3 battles, a sparring ladder, an exclusive gacha and a power ranking — and then it ended and never came back.</p>
   <p>None of that fits a village you play offline, alone, at your own pace. What is kept is what the events were actually for: meeting the cast. Here the arc runs on the thing you are already doing, and it waits for you.</p>
   <p>The Marvel and Star Wars arcs are written for Everkai. They are village situations, not retellings, and the characters in them are the only way those villagers ever arrive — the Recruit counter does not sell them.</p>
  </details>
 </section>;
}
