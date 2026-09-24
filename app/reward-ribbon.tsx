import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';

// THE REWARD RIBBON (docs/familiar-screen-specs/10-explore.md §4.5).
//
// One component, five optional slots, one dismissal. The spec's instruction is explicit: build it
// ONCE, with all five slots, before building any of the branches -- because three of Explore's four
// branches end in it, the hub's scene pickup ends in it, and the Compendium's `Quick Collect`
// (spec 11) is the obvious fifth caller. Everkai had no shared payout component at all; every gain
// was a sentence in a `last-result` line, which is why four different surfaces each grew their own.
//
// The variants the captures pin down:
//   scene pickup / Luck Flower draw  `Congratulations`     -- icon and count only
//   lost-item cache                  `Congratulations`   + `You've found lost supplies.`
//   blessing grant                   `Blessing Received` + name, green `Remaining: n`, gold effect
//
// The monster catch deliberately does NOT use it (§4.1): the original gives the catch two full-screen
// animation beats and returns to Explore, with no card and no acknowledgement.
//
// The underlying screen stays visible behind a scrim throughout, so the player always sees WHAT paid.
export type RewardPayout={
 banner?:string;      // defaults to `Congratulations`
 subtitle?:string;    // one sentence, white
 name?:string;        // the item's name -- blessing only
 items:[string,number|string][];
 remaining?:number;   // green pill -- blessing only
 effect?:string;      // gold -- blessing only
};

export default function RewardRibbon({payout,onClose}:{payout:RewardPayout|null,onClose:()=>void}){
 return <Dialog open={!!payout} onOpenChange={open=>{if(!open)onClose()}}>
  <DialogContent className="reward-ribbon" showCloseButton={false}>
   <DialogTitle className="ribbon-banner">{payout?.banner||'Congratulations'}</DialogTitle>
   <DialogDescription className={payout?.subtitle?'ribbon-subtitle':'sr-only'}>
    {payout?.subtitle||'What you received'}</DialogDescription>
   {payout?.name&&<p className="ribbon-name">{payout.name}</p>}
   {/* The blessing variant already names the item on its own line, so the tile carries only the count
       -- the original draws an icon on a radial flare there, never the name twice. */}
   <ul className={'ribbon-items'+(payout?.name?' unlabelled':'')}>{(payout?.items||[]).map(([label,n])=>
    <li key={label}>{!payout?.name&&<span>{label}</span>}<b>&times;{n}</b></li>)}</ul>
   {payout?.remaining!==undefined&&<p className="ribbon-remaining">Remaining: {payout.remaining}</p>}
   {payout?.effect&&<p className="ribbon-effect">{payout.effect}</p>}
   {/* One dismissal, anywhere -- the whole sheet is the button, as the original reads. */}
   <button className="ribbon-continue" onClick={onClose}>Tap to continue</button>
  </DialogContent>
 </Dialog>;
}
