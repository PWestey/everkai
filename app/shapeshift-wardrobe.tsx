import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {shapeshiftRows,shapeshiftDaily,shapeshiftPercentBp,SHAPESHIFT_TOTAL_BP,CHIP_A_DAY} from '@/lib/shapeshift.mjs';

// THE PROTAGONIST'S WARDROBE -- the only power source in the game that is not scoped to a Fellow.
//
// Five of the fifty outfits carry a skill the original scopes `{conditionType:'all'}`, so what this
// screen buys lifts EVERY Fellow at once: the ones recruited today, the ones still locked behind a
// banner, and the 133 Marvel and Star Wars additions that no `rare` scope ever reaches. That is the
// whole reason it is here, so the screen leads with the roster-wide number rather than a per-outfit one.
//
// The forty-five without a skill are shown, greyed and unbuyable, because the original has them and a
// wardrobe that silently hides nine tenths of itself reads as broken. They are appearance only.
const pct=(bp:number)=>`${(bp/100).toFixed(0)}%`;

export default function ShapeshiftWardrobe({game,action,locked}:any){
 const [open,setOpen]=useState(false);
 const rows=shapeshiftRows(game);
 const daily=shapeshiftDaily(game);
 const now=shapeshiftPercentBp(game);
 const powered=rows.filter((r:any)=>r.capBp);
 const owned=powered.filter((r:any)=>r.owned).length;
 return <>
  <Button variant="outline" className="album-open" onClick={()=>setOpen(true)}>
   Wardrobe &middot; +{pct(now)} to every Fellow</Button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="save-dialog shapeshift-wardrobe">
   <DialogTitle>Your Wardrobe</DialogTitle>
   <DialogDescription>
    Outfits you wear yourself. {owned} of {powered.length} tailored &middot; +{pct(now)} of a possible +{pct(SHAPESHIFT_TOTAL_BP)}
   </DialogDescription>
   <p className="shapeshift-lead">
    Every Fellow in the village shares what you wear &mdash; recruited or not, from this world or another.
   </p>
   <p className="shapeshift-daily" role="status">
    {daily.left?`${daily.left} scrap of cloth to hand out today.`:'Today’s cloth is spent. More tomorrow.'}
   </p>
   <ul className="shapeshift-list">
    {powered.map((r:any)=><li key={r.avatar} className={r.owned?'tailored':''}>
     <div className="shapeshift-name">
      <strong>Outfit {r.clothes.replace('ShapeshiftClothes','')}</strong>
      <small>{r.owned?`Lv. ${r.level}${r.canLevel?` / ${r.maxLevel}`:''}`:'Not tailored'}</small>
     </div>
     <div className="shapeshift-value">
      <strong>+{pct(r.bp)}</strong>
      <small>to every Fellow{r.bp<r.capBp?` · up to +${pct(r.capBp)}`:''}</small>
     </div>
     <div className="shapeshift-buttons">
      {daily.left?<Button variant="outline" disabled={locked} onClick={()=>action('shapeshiftClaim',r.avatar)}>Take cloth</Button>:null}
      {r.next?<Button variant="outline" disabled={locked||!r.next.affordable}
        onClick={()=>action(r.level?'shapeshiftLevel':'shapeshiftUnlock',r.avatar)}>
        {r.next.verb}{r.next.affordable?'':` · needs cloth`}</Button>
       :<span className="shapeshift-capped">At its best</span>}
     </div>
    </li>)}
   </ul>
   <h5 className="ribbon-rule">Appearance only</h5>
   <p className="small-note">
    The other {rows.length-powered.length} outfits change how you look and carry no bonus.
   </p>
   <Button variant="outline" onClick={()=>setOpen(false)}>Close</Button>
  </DialogContent></Dialog>
 </>;
}
