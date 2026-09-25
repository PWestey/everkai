import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Button} from '@/components/ui/button';
import {FAMILY_PICTURES} from '@/lib/family-gallery.mjs';
import {familyById} from '@/lib/catalog.mjs';

// AUTO DATE RESULTS (docs/family-screen-specs/09-auto-date.md).
//
// The structural gap that spec records: Everkai APPLIED every date's rewards and updated the numbers
// in place, so a five-date run left one sentence behind -- `5 dates completed: +7,105 Blessing
// Points` -- and the player never learned which member each date was with, what each one paid, or
// that a date had unlocked a CG at all. The original reports each date on its own card and then
// announces each new CG on its own. "This is the missing moment of the system", in the spec's words.
//
// Everkai also PRE-announced the reward ("If dated, Charlotte gains 1,627 points"); the original
// reports it afterwards, per date. That is the difference between a price list and a result.
//
// The CG announcement is the part that was invisible: `discoverDatePicture` has always unlocked
// pictures on a qualifying date and said so in a toast that scrolled past with everything else.
const title=(event:string)=>FAMILY_PICTURES.find((r:any)=>r.event===event)?.reference||event;

export default function DateResults({report,onClose}:{report:any[]|null,onClose:()=>void}){
 const rows=report||[];
 const unlocked=rows.filter(r=>r.picture);
 const total=rows.reduce((n,r)=>n+(r.points||0),0);
 return <Dialog open={!!report&&!!rows.length} onOpenChange={open=>{if(!open)onClose()}}>
  <DialogContent className="save-dialog date-results" showCloseButton={false}>
   <DialogTitle className="ribbon-banner">Auto Date</DialogTitle>
   <DialogDescription className="date-total">Total Dates: {rows.length}</DialogDescription>
   <ol className="date-cards">{rows.map((r,i)=>{
    const person=familyById(r.id);
    return <li key={i}>
     <p className="date-line">You spent a good time with <strong>{r.name}</strong>{person?.title?<em> · {person.title}</em>:null}</p>
     <span className="date-rule" aria-hidden="true">&#9670;</span>
     <p className="date-points">&#127801; Blessing Points <b>+{(r.points||0).toLocaleString()}</b></p>
     {r.picture&&<p className="date-cg">New picture &middot; {title(r.picture)}</p>}
    </li>})}</ol>
   <p className="date-total-line">&#127801; <b>+{total.toLocaleString()}</b> Blessing Points in total</p>
   {/* Per unlocked CG, its own announcement -- the original gives each one a card rather than
       folding them into the run's summary. */}
   {unlocked.map((r,i)=><div key={'cg'+i} className="cg-unlocked">
    <p className="cg-banner">New CG Unlocked</p>
    <p className="cg-name">{title(r.picture)}</p>
    <small>Find it in the Family gallery.</small>
   </div>)}
   <Button onClick={onClose}>Tap to continue</Button>
  </DialogContent>
 </Dialog>;
}
