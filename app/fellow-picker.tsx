import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {selectedStaticArt} from '@/lib/humanized-static.mjs';
import {fellowOperation} from '@/lib/operations.mjs';
import {FELLOWS} from '@/lib/catalog.mjs';

// The original shows every eligible Fellow at once as a card -- portrait, level, its own earnings
// bonus, and a numbered badge marking the slot it currently fills -- with the COMBINED total above
// the row. That combined figure is the whole decision ("should I do this"), so it is stated once
// rather than recomputed per selection the way a dropdown forces.

const pct=(n:number)=>`+${Math.round(n)}%`;

export function FellowSlots({game,business,slots,onOpen,locked}:any){
 const assigned:string[]=game.enterprises?.[business.id]?.fellows??[];
 const cells=Array.from({length:slots},(_,i)=>assigned[i]??null);
 return <button type="button" className="fellow-slots" disabled={locked} onClick={onOpen}
   aria-label={`Operating Fellows: ${assigned.length} of ${slots} assigned. Change assignment.`}>
  {cells.map((id,i)=>{
   const art=id?selectedStaticArt(id):null;
   return <span className={'fellow-slot'+(id?'':' empty')} key={i}>
    {id&&art?<img src={'./assets/'+art.art} alt="" loading="lazy"/>:<span className="fellow-slot-empty" aria-hidden="true">+</span>}
    {id&&<span className="fellow-slot-bonus">{pct(fellowOperation(game,id,business).percent)}</span>}
   </span>;
  })}
 </button>;
}

export default function FellowPicker({game,action,business,slots,open,onClose,locked}:any){
 const assigned:string[]=game.enterprises?.[business.id]?.fellows??[];
 // Everyone recruited can operate; the original heads this list with the building it is for.
 const candidates=FELLOWS.filter(f=>Object.hasOwn(game.fellows,f.id))
  .map(f=>({...f,percent:fellowOperation(game,f.id,business).percent,slot:assigned.indexOf(f.id)}))
  .sort((a,b)=>b.percent-a.percent||a.name.localeCompare(b.name));
 const total=assigned.reduce((n,id)=>n+fellowOperation(game,id,business).percent,0);
 const full=assigned.length>=slots;
 return <Dialog open={open} onOpenChange={o=>{if(!o)onClose()}}>
  <DialogContent className="fellow-picker">
   <DialogTitle>Select Operating Fellows</DialogTitle>
   <DialogDescription>Assigned Fellows raise this business&rsquo;s earnings. Each Fellow works in one business at a time.</DialogDescription>
   <FellowSlots game={game} business={business} slots={slots} locked onOpen={()=>{}}/>
   <p className="fellow-total">Earnings {pct(total)}</p>
   <h3>Fellows capable of operating {business.name}</h3>
   <div className="fellow-grid">
    {candidates.map(f=>{
     const art=selectedStaticArt(f.id),here=f.slot>=0;
     return <button type="button" key={f.id} className={'fellow-card'+(here?' assigned':'')}
       disabled={locked||(!here&&full)}
       onClick={()=>action(here?'removeOperator':'assignOperator',business.id,f.id)}>
      <span className="fellow-card-level">Lv.{game.fellows[f.id].level}</span>
      {art&&<img src={'./assets/'+art.art} alt="" loading="lazy"/>}
      {here&&<span className="fellow-card-slot" aria-hidden="true">{f.slot+1}</span>}
      <span className="fellow-card-bonus">Earnings {pct(f.percent)}</span>
      <span className="fellow-card-name">{f.name}</span>
     </button>;
    })}
   </div>
   <Button className="wide" onClick={onClose}>OK</Button>
  </DialogContent>
 </Dialog>;
}
