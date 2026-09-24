import {useState,useEffect,useRef} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {cardStyle,petCardIcon} from '@/lib/ui-sprites.mjs';
import {FAMILIARS,familiarById} from '@/lib/familiars.mjs';
import {DISPATCH_AREAS,DISPATCH_TEAM,dispatchState,dispatchArea,dispatchTeamPower,familiarPower,
 greatSuccessChance,dispatchUnlocked,dispatchDone,dispatchRemaining} from '@/lib/familiar-dispatch.mjs';
import {towerFloorOf} from '@/lib/familiar-supplies.mjs';

// FAMILIAR DISPATCH (docs/familiar-screen-specs/08-dispatch.md).
//
// The original runs a FOUR-STATE machine and Everkai had none of it: LOCKED (seats drawn with padlocks
// and one sentence), IDLE (trays, seats, duration, Confirm), AWAY (`In Progress` and a countdown on the
// screen), and RESULT -- which fires AUTOMATICALLY ON ENTRY. That last one is the structural gap: the
// original grants the reward, resets the screen behind it, and draws a `Result` ribbon over the top
// with the outcome as one coloured word. Everkai had a `Collect dispatch` button and a toast sentence.
//
// The panel carried ~290 words against the original's 21 on screen plus 17 behind the `(i)`; both
// `rules-note` paragraphs were provenance essays written at the PLAYER -- which table each number came
// from and which rule is local. That belongs in docs/parity-catalog.csv and the module header, and both
// already carry it. The `(i)` keeps the one sentence the original actually shows.
//
// NOT CHANGED HERE, deliberately: the Power gate. Spec §7 argues it is probably not a gate in the
// original at all -- a run completed at the 20,000,000 rung on a team well under it, `Confirm` draws
// green rather than inert, and no dispatch string refuses on Power. But the settling measurement
// (pressing Confirm under-powered) commits the owner's team and was not run, and demoting the gate
// means relaxing `validFamiliarDispatch` in the same change or every existing away-run is refused on
// load. That is a mechanics change resting on inference; it gets its own commit and its own save check.
const hhmm=(ms:number)=>{const h=Math.floor(ms/3600e3),m=Math.ceil((ms%3600e3)/60e3);return h?`${h}h ${m}m`:`${m}m`};
const short=(n:number)=>n>=1e6?`${(n/1e6).toFixed(1)}M`:n>=1e3?`${Math.round(n/1e3)}K`:`${n}`;

/** Basic and Extra, as the original draws them: a labelled tray of item tiles with corner counts. */
function Tray({title,items}:{title:string,items:[string,number][]}){
 const shown=items.filter(([,n])=>n>0);
 if(!shown.length)return null;
 return <div className="reward-tray"><h5>{title}</h5>
  <ul>{shown.map(([label,n])=><li key={label}><span>{label}</span><b>{short(n)}</b></li>)}</ul></div>;
}

export default function FamiliarDispatchPanel({game,action,locked}:any){
 const now=Date.now(),d=dispatchState(game),owned=FAMILIARS.filter(p=>game.familiars?.[p.id]);
 const [areas,setAreas]=useState(false),[picker,setPicker]=useState(false),[confirmCancel,setCancel]=useState(false),[info,setInfo]=useState(false);
 const [area,setArea]=useState('1');
 const power=dispatchTeamPower(game),cleared=towerFloorOf(game);
 const run=d.run,running=run?dispatchArea(run.area)!:null,ready=dispatchDone(game,now),left=dispatchRemaining(game,now);
 const picked=dispatchArea(area)!,full=d.team.length===DISPATCH_TEAM;
 // AUTO-REPORT ON ENTRY. The original reports a finished run the moment the screen opens, so the
 // reward is already granted by the time the ribbon is read. The ref keeps it to one attempt per
 // arrival: `dispatchCollect` is guarded server-side by dispatchDone, and a failed write must not
 // become a retry loop (CLAUDE.md saves rules -- a refused action stays refused until the player acts).
 const reported=useRef(false),[result,setResult]=useState<any>(null);
 useEffect(()=>{
  if(!ready||reported.current||locked)return;
  reported.current=true;
  const area_=running,outcome=action('dispatchCollect');
  if(outcome!==false)setResult({area:area_,great:greatSuccessChance(game,run!.area)>0});
 },[ready,locked]);// eslint-disable-line react-hooks/exhaustive-deps
 if(owned.length<DISPATCH_TEAM)return <section className="familiar-dispatch" aria-label="Familiar dispatch">
  <h4 className="bond-ribbon">Familiar Dispatch</h4>
  <ol className="dispatch-seats locked" aria-label="Dispatch team">{Array.from({length:DISPATCH_TEAM},(_,i)=>
   <li key={i}><span className="dispatch-seat" aria-hidden="true">{i<owned.length?'●':'🔒'}</span></li>)}</ol>
  <p className="dispatch-line">Contract {DISPATCH_TEAM} or more familiars to unlock. {owned.length} contracted.</p>
 </section>;
 const seats=Array.from({length:DISPATCH_TEAM},(_,i)=>d.team[i]||null);
 return <section className="familiar-dispatch" aria-label="Familiar dispatch">
  <header className="dispatch-head"><h4 className="bond-ribbon">Area {picked.id}</h4>
   <button className="instruction-link" aria-expanded={info} onClick={()=>setInfo(v=>!v)}>&#9432;</button></header>
  {info&&<p className="instruction-popover" role="note">Great Success Dispatch grants extra rewards.</p>}
  <Tray title="Basic" items={[['Level-up',picked.base.levelUp],['Class-up',picked.base.classUp]]}/>
  <Tray title="Extra" items={[['Level-up',picked.great.levelUp],['Class-up',picked.great.classUp],['Fragment draws',picked.fragments.length]]}/>
  {!run&&<>
   <p className="dispatch-line">Expected Results &middot; Great Success: <b className="great-odds">{full?`${greatSuccessChance(game,picked.id)}%`:'—'}</b></p>
   <ol className="dispatch-seats" aria-label={`Dispatch team ${d.team.length} of ${DISPATCH_TEAM}`}>{seats.map((pid,i)=>{
    const pet=pid?familiarById(pid):null;
    return <li key={i}><button className={'dispatch-seat'+(pet?' filled':'')} disabled={locked} aria-label={pet?`${pet.name}, change`:'Add a familiar'} onClick={()=>setPicker(true)}
     style={pet?cardStyle(pet.rarity) as any:undefined}>{pet?<img src={petCardIcon(pet.rarity)||''} alt=""/>:<span aria-hidden="true">&#65291;</span>}</button></li>})}</ol>
   <p className="dispatch-duration">Dispatch Duration: {picked.hours} hr(s)</p>
   <div className="business-actions">
    <Button className={full&&dispatchUnlocked(game,picked.id)&&power>=picked.power?'ready-badge':''} disabled={locked||!full||!dispatchUnlocked(game,picked.id)||power<picked.power}
     onClick={()=>action('dispatchStart',picked.id)}>Confirm</Button>
    <Button variant="outline" disabled={locked} onClick={()=>setAreas(true)}>Ruin</Button>
   </div>
  </>}
  {run&&running&&<div className="dispatch-away">
   <p className="dispatch-state">In Progress</p>
   <p className="dispatch-line">Time left: {ready?'returning':hhmm(left)}</p>
   <Button variant="outline" disabled={locked} onClick={()=>setCancel(true)}>Cancel</Button>
  </div>}

  <Dialog open={picker} onOpenChange={setPicker}><DialogContent className="save-dialog dispatch-picker">
   <DialogTitle>Select your familiars</DialogTitle>
   <DialogDescription>Great Success: {greatSuccessChance(game,picked.id)}% &middot; Team Attribute {power.toLocaleString()}</DialogDescription>
   <ol className="dispatch-seats" aria-label="Chosen">{seats.map((pid,i)=>{const pet=pid?familiarById(pid):null;
    return <li key={i}><span className={'dispatch-seat'+(pet?' filled':'')} style={pet?cardStyle(pet.rarity) as any:undefined}>
     {pet?<img src={petCardIcon(pet.rarity)||''} alt=""/>:<span aria-hidden="true">&#65291;</span>}</span></li>})}</ol>
   <div className="dispatch-grid">{owned.map(p=>{const on=d.team.includes(p.id);
    return <button key={p.id} className={'dispatch-card'+(on?' chosen':'')} disabled={locked||(!on&&full)} aria-pressed={on}
     style={cardStyle(p.rarity) as any} onClick={()=>action('dispatchTeam',p.id)}>
     <img src={petCardIcon(p.rarity)||''} alt=""/><strong>{p.name}</strong>
     <small>{short(familiarPower(p.id,game.familiars[p.id]))}</small></button>})}</div>
   <Button onClick={()=>setPicker(false)}>OK</Button>
  </DialogContent></Dialog>

  <Dialog open={areas} onOpenChange={setAreas}><DialogContent className="save-dialog dispatch-areas">
   <DialogTitle>Ruin</DialogTitle><DialogDescription>Choose where the team is sent.</DialogDescription>
   {DISPATCH_AREAS.map((a:any)=>{const open_=dispatchUnlocked(game,a.id);
    return <button key={a.id} className={'area-row'+(String(a.id)===area?' current':'')+(open_?'':' locked')} disabled={locked||!open_}
     onClick={()=>{setArea(String(a.id));setAreas(false)}}>
     <strong>Area {a.id}</strong>
     {String(a.id)===area&&<b className="current-ribbon">Current Area</b>}
     <span className="area-trays">{short(a.base.levelUp)} &middot; {short(a.great.levelUp)}</span>
     {!open_&&<span className="area-gate"><i style={{width:`${Math.min(100,Math.round(cleared/a.towerLv*100))}%`}}/><em>{cleared}/{a.towerLv}</em></span>}
    </button>})}
  </DialogContent></Dialog>

  <Dialog open={confirmCancel} onOpenChange={setCancel}><DialogContent className="save-dialog">
   <DialogTitle>Cancel</DialogTitle>
   <DialogDescription>Canceling the dispatch won&rsquo;t grant you any reward. Confirm?</DialogDescription>
   <div className="business-actions"><Button disabled={locked} onClick={()=>{action('dispatchCancel');setCancel(false)}}>Confirm</Button>
    <Button variant="outline" onClick={()=>setCancel(false)}>Back</Button></div>
  </DialogContent></Dialog>

  <Dialog open={!!result} onOpenChange={()=>setResult(null)}><DialogContent className="save-dialog dispatch-result">
   <DialogTitle>Result</DialogTitle>
   <DialogDescription className="sr-only">Dispatch outcome</DialogDescription>
   <p className={'result-word'+(result?.great?' great':'')}>{result?.great?'Great Success':'Success'}</p>
   {result?.area&&<Tray title="Basic" items={[['Level-up',result.area.base.levelUp],['Class-up',result.area.base.classUp]]}/>}
   <Button onClick={()=>setResult(null)}>OK</Button>
  </DialogContent></Dialog>
 </section>;
}
