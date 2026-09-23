import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {APTITUDE_CAP,PEARL_APTITUDE_CAP} from '@/lib/aptitude-cap.mjs';
import {STAR_CAP} from '@/lib/adventure.mjs';
import {STAR_TIER_NAMES} from '@/lib/hero-stars.mjs';
import {OPERATION_CAP} from '@/lib/operations.mjs';
/** THE ROSTER `(i)` INFORMATION PANEL, built to docs/fellow-screen-specs/01-roster.md.
 *
 *  The original's Fellow list carries one `(i)` whose panel enumerates the nine sub-systems in the
 *  game's OWN decomposition (README.md, "The original's own manifest", read off img/roster-info-1.png
 *  and -2.png): Fellow Level, Fellow Types, Fellow Aptitude, Fellow Skills, Fellow Blessings, Fellow
 *  Talents, Fellow's Aura, Fellow Limit Break, Fellow Awakening. A bold heading, one short paragraph,
 *  nine times.
 *
 *  "This panel is the ONLY prose on the whole Fellow surface, and it is one tap away rather than in
 *  the flow." That is why it exists: Everkai's explanations were scattered across every sub-page as
 *  `About these rules` disclosures (difference R7), and the section rebuilds deleted them. The
 *  headings are the original's; the paragraphs are EVERKAI'S OWN, moved here rather than invented --
 *  the Quick-setup paragraph is verbatim from app/fellow-reset.tsx, as spec 02 directs. */
const SECTIONS:[string,any][]=[
 ['Fellow Level',<>Fellow levels are bought with Fellow EXP on the original&rsquo;s own cost curve. The Upgrade section&rsquo;s selector is an intent and its button shows the count you can actually afford. <em>Auto-optimize spends the EXP and materials you hold on a Fellow, best Power first. It never spends gold or crystals, and Refund all can always undo it.</em> Both live behind the <b>(i)</b> beside the level bar, with Training Rules.</>],
 ['Fellow Types',<>Every Fellow is one of five types — <b>Inspiring, Diligent, Brave, Informed, Unfettered</b>. The type decides which buildings a Fellow&rsquo;s Operation skill pays at, which type-scoped bonuses reach them, and the class medallion on their card.</>],
 ['Fellow Aptitude',<>Aptitude is the multiplier the level column is worth. Skill Pearls buy it point for point only up to {PEARL_APTITUDE_CAP.toLocaleString()}; beyond that it comes from talent upgrades, artifacts, Stella, Family blessings, the museum and fishing, up to {APTITUDE_CAP.toLocaleString()}. Every source is listed in the <b>(i)</b> beside Total Aptitude.</>],
 ['Fellow Skills',<>The Aptitude section holds two independent ladders. <b>Aptitude Skill</b> is per-skill and paid in Skill Pearls or Insight; <b>Origin Boost</b> is per-Fellow, runs to Lv. 600 and pays a milestone every fifty levels. A locked skill shows its gate on its medallion.</>],
 ['Fellow Blessings',<>A Family member&rsquo;s blessing raises the Fellows they are bonded to — flat Power, percent Power, and Family Aptitude. Flat Power is added after the percentage bonuses, which is the order the original uses.</>],
 ['Fellow Talents',<>A Fellow&rsquo;s own talent is their base Aptitude ladder, priced from the original&rsquo;s recovered table through source level 300. Rarity Advance and Pledge sit beside it, both paid from the shared Stella shard pool.</>],
 ['Fellow’s Aura',<>An awakened Fellow broadcasts halos: bonuses that reach themselves, their type, their group or the whole roster. What a Fellow&rsquo;s halos are worth right now is in the Awaken section&rsquo;s <b>(i)</b>. Halos only pay where the village has the system they fire in.</>],
 ['Fellow Limit Break',<>A Fellow stops at their level cap until a Limit Break raises it. The gold button at the cap opens a dialog showing the new cap, the Aptitude it carries and the materials it costs; a tile on a red ground is one you do not hold yet.</>],
 ['Fellow Awakening',<>Awakening is per-Fellow star progression to {STAR_CAP}★. Each star raises a base value and a multiplier and lifts every talent one tier — {STAR_TIER_NAMES.join(', ')} — and opens a new aptitude track. A star the Fellow&rsquo;s level does not yet support is stored, never refused.</>],
 ['Fellow Operation',<>Operation is what a Fellow adds to the earnings of the building they are appointed to. One levelled skill to Lv. {OPERATION_CAP} plus fixed effects that unlock at a Fellow level and never level themselves.</>],
];
export default function FellowInformation(){
 const [open,setOpen]=useState(false);
 return <>
  <button type="button" className="info-dot" aria-label="About Fellows" onClick={()=>setOpen(true)}>i</button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="breakdown-dialog">
   <DialogTitle>Information</DialogTitle>
   <DialogDescription className="sr-only">How every part of a Fellow works.</DialogDescription>
   {SECTIONS.map(([heading,body])=><div key={heading} className="info-section">
    <h4>{heading}</h4><p>{body}</p></div>)}
  </DialogContent></Dialog>
 </>;
}
