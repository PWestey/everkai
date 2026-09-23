import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {FAMILY_PICTURES,familyPictures,pictureGate} from '@/lib/family-gallery.mjs';
import {dateIds} from '@/lib/dating.mjs';
import {isAddition} from '@/lib/everkai-additions.mjs';
import {availableDateEnergy} from '@/lib/tonics.mjs';

// DATE RECORD (docs/family-screen-specs/11-gallery.md). The original's gallery is a wall of polaroids
// with a two-line caption, a `Collected: n/m` pill over the whole family, a NEW ribbon on an unseen
// find, and a blank padlocked frame for everything not yet discovered. Everkai's was nine lines: a
// paginated list of three `<article>`s that named each locked picture and explained it in a sentence.
//
// The count is family-wide because the original's is: FAMILY_PICTURES is every row, not this member's,
// and the owned map is already keyed by event id across the whole family. NEW is DERIVED, not stored --
// `owned[event].seen` has always been there (it is what `galleryView` sets), so an owned-but-unseen
// entry is exactly the original's NEW and needs no save change.
export default function FamilyGalleryPanel({game,person,action,locked}:any){
 const [current,setCurrent]=useState<string|null>(null),[failed,setFailed]=useState(false),[attempt,setAttempt]=useState(0);
 const pictures=familyPictures(person.id),owned=game.familyGallery?.owned||{},member=game.family[person.id];
 const picture=pictures.find((r:any)=>r.event===current),view=picture&&owned[picture.event];
 const collected=Object.keys(owned).length,ids=dateIds(game);
 const date=()=>action('date',null,(ids.indexOf(person.id)+0.5)/ids.length);
 if(view)return <Dialog open onOpenChange={open=>{if(!open)setCurrent(null)}}><DialogContent className="save-dialog family-picture-viewer">
  <DialogTitle>{person.name} · Picture {pictures.indexOf(picture)+1}</DialogTitle>
  <DialogDescription>Discovered date illustration</DialogDescription>
  <Button variant="outline" onClick={()=>setCurrent(null)}>Back to pictures</Button>
  {failed?<div role="status"><p>The picture could not be loaded. Your discovery is still saved.</p>
   <Button onClick={()=>{setFailed(false);setAttempt(n=>n+1)}}>Retry picture</Button></div>
   :<img key={attempt} src={'./assets/'+picture.image} alt={person.name+' · date picture '+(pictures.indexOf(picture)+1)} onError={()=>setFailed(true)}/>}
  <p className="small-note">Original date illustration. Viewing and replaying grant no rewards.</p>
 </DialogContent></Dialog>;
 return <section className="date-record" aria-label="Date record">
  <header className="date-record-head">
   <h2>Date Record</h2>
   <span className="collected-pill">Collected: {collected}/{FAMILY_PICTURES.length}</span>
  </header>
  {isAddition(person.id)&&!pictures.length&&<p className="management-hint">The picture collection is the original cast’s illustrated date scenes, keyed to artwork this companion does not have. Dates with her still pay Blessing Points as usual.</p>}
  <ol className="polaroid-wall">{pictures.map((r:any,i:number)=>{
   const mark=owned[r.event],gate=pictureGate(r,game);
   const locked_=!mark;
   const reason=gate||(!member?`Welcome ${person.name} first`:`${r.gates.unlockIntimacy} Intimacy, then a date`);
   return <li key={r.event}>
    <button className={'polaroid'+(locked_?' locked':'')} disabled={locked||locked_}
     aria-label={locked_?`Picture ${i+1}, locked · ${reason}`:`View picture ${i+1}`}
     onClick={()=>{if(action('galleryView',r.event)){setCurrent(r.event);setFailed(false)}}}>
     {mark&&!mark.seen&&<b className="new-ribbon">NEW</b>}
     <span className="polaroid-frame">{locked_?<i aria-hidden="true">🔒</i>:<img src={'./assets/'+r.image} alt="" loading="lazy"/>}</span>
     <span className="polaroid-caption"><strong>{person.name}</strong>{locked_?<em>{reason}</em>:<em>Picture {i+1}</em>}</span>
    </button>
   </li>})}</ol>
  <Button className="date-record-date" disabled={locked||!member||availableDateEnergy(game)<1} onClick={date}>Date with {person.name} · 1 Energy</Button>
  <details className="rules-note"><summary>Picture collection rules</summary><p>Local sandbox policy: owned Family dates discover one available base or owned-costume picture at its recovered date-event Intimacy threshold, lowest eligible threshold first. Costume pictures require collecting that exact costume, but it need not be equipped. Collecting or equipping alone never grants a picture. Special-item and unresolved routes stay locked. Conflicting source thresholds use the date-event table. This is not the original server’s selection rule. No extra picture rewards are granted. These original illustrations have not been humanized.</p><p>Available pictures are included in this version’s offline download. If loading fails, retry after connecting; saved discoveries remain intact.</p></details>
 </section>;
}
