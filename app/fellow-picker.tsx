import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {wardrobeAppearance} from '@/lib/wardrobe.mjs';
import {fellowOperation} from '@/lib/operations.mjs';
import {FELLOWS,fellowById} from '@/lib/catalog.mjs';

// The original shows every eligible Fellow at once as a card -- portrait, level, its own earnings
// bonus, and a numbered badge marking the slot it currently fills -- with the COMBINED total above
// the grid. That combined figure is the whole decision ("is this worth doing"), so it is stated once
// rather than recomputed per selection the way a dropdown forces.
const pct=(n:number)=>`+${Math.round(n)}%`;

export default function FellowPicker({game,action,business,slots,open,onClose,locked}:any){
 const assigned:string[]=game.enterprises?.[business.id]?.fellows??[];
 const candidates=FELLOWS.filter((f:any)=>Object.hasOwn(game.fellows,f.id))
  .map((f:any)=>({...f,percent:fellowOperation(game,f.id,business).percent,slot:assigned.indexOf(f.id)}))
  .sort((a:any,b:any)=>b.percent-a.percent||a.name.localeCompare(b.name));
 const total=assigned.reduce((n,id)=>n+fellowOperation(game,id,business).percent,0);
 const full=assigned.length>=slots;

 return <Dialog open={open} onOpenChange={(o:boolean)=>{if(!o)onClose()}}>
  <DialogContent className="fellow-picker">
   <DialogTitle>Select Operating Fellows</DialogTitle>
   <DialogDescription>Assigned Fellows raise this business&rsquo;s earnings. Each Fellow works in one business at a time.</DialogDescription>

   {/* Current assignment, mirroring the row on the sheet so the dialog shows what it is changing. */}
   <div className="inn-operators"><div>
    {Array.from({length:slots},(_,i)=>{
     const f=assigned[i];
     if(!f)return <Button key={'empty'+i} variant="outline" aria-label="Empty slot" disabled>+</Button>;
     const p=wardrobeAppearance(game,fellowById(f));
     return <button key={f} aria-label={p.name} disabled><img src={'./assets/'+p.portrait} alt={p.name}/></button>;
    })}
   </div></div>
   <p className="fellow-total">Earnings {pct(total)}</p>

   <h3>Fellows capable of operating {business.name}</h3>
   <div className="fellow-grid">
    {candidates.map((f:any)=>{
     const p=wardrobeAppearance(game,fellowById(f.id)),here=f.slot>=0;
     return <button type="button" key={f.id} className={'fellow-card'+(here?' assigned':'')}
       disabled={locked||(!here&&full)}
       onClick={()=>action(here?'removeOperator':'assignOperator',business.id,f.id)}>
      <span className="fellow-card-level">Lv.{game.fellows[f.id].level}</span>
      <img src={'./assets/'+p.portrait} alt="" loading="lazy"/>
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
