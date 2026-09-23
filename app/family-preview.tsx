import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {FamilyInfo,RELATIONSHIP_RUNGS} from './family-shell';
import {BlessedFellow} from './blessing-panel';
import {blessingRecipients} from '@/lib/blessings.mjs';
import {relationRequired} from '@/lib/school.mjs';
/** THE NOT-YET-JOINED MEMBER, rebuilt to docs/family-screen-specs/13-locked-member.md.
 *
 *  Everkai rendered an unjoined member through the SAME eleven pager pages as a joined one, each
 *  with its own near-identical empty state:
 *
 *    Welcome family members to begin gifts and dates.
 *    Invite {name} at the Recruit counter in Drakenberg.
 *    Welcome this family member to open her Latency.
 *    Welcome this family member to practise Fathoms.
 *    Welcome this family member to train blessings.
 *    Welcome this family member to create a bond.
 *
 *  Six sentences saying one thing. The original has ONE screen with NO DOCK -- the same rule that
 *  hides `Stella` below UR: a section you cannot use is absent, not explained. The art is fully
 *  desaturated, which does the work of all six sentences, and the two medallions move from the
 *  bottom-left to the centre because the starting values are the only numbers a preview can
 *  honestly show.
 *
 *  `Blessed Fellows` is the genuinely new thing and the reason this screen is worth building:
 *  BEFORE you recruit a member you can see which Fellows she will bless. Three of the five Family
 *  sections pay those Fellows, so it is the single most decision-relevant fact about an unjoined
 *  member, and Everkai had no way to see it at all.
 *
 *  `Source` keeps EVERKAI'S OWN answer -- the Recruit counter in Drakenberg is this build's faucet,
 *  not the original's Daily Wish Bundle -- and copies only the form: a button with a one-line
 *  tooltip, instead of a sentence in the body. */

/** Everkai's own starting values, from the `welcome` action in lib/game.mjs. */
const START={intimacy:0,blessingPower:10};

/** `Relationship Effect`: the rung ladder as rows.
 *
 *  The original prints a pupil-EARNINGS percentage per rung. Everkai has no such column -- its
 *  pupil formula reads `intellect = relationship x 10` and nothing else per rung -- so the ladder
 *  shows the Intellect each rung grants, which is Everkai's own number from its own formula, and
 *  the Intimacy each rung costs. Importing the capture's percentages would be importing a
 *  replacement server's balance. */
function RelationshipEffect(){
 return <table className="pair-table"><tbody>
  {RELATIONSHIP_RUNGS.map((name,i)=><tr key={name}>
   <th scope="row">{name}</th>
   <td>Pupil Intellect {(i+1)*10}{i?` · needs ♥${relationRequired(i).toLocaleString('en-US')}`:''}</td>
  </tr>)}
 </tbody></table>;
}

export function PreviewStats({person}:{person:any}){
 return <div className="preview-stats">
  <div className="preview-medallion"><img src="./assets/ui-original/Icons--Icon_Intimacy_1.png" alt=""/>
   <strong>{START.intimacy}</strong><span>Intimacy</span></div>
  <div className="preview-medallion"><img src="./assets/ui-original/Icons--Icon_EmblemStrength_1.png" alt=""/>
   <strong>{START.blessingPower}</strong><span>Blessing Power</span></div>
 </div>;
}

export function PreviewRail({person}:{person:any}){
 const [open,setOpen]=useState<string|null>(null);
 return <>
  <Button variant="outline" className="rail-icon" onClick={()=>setOpen('Source')} aria-label="Source">
   <img src="./assets/menu/overview.png" alt=""/><span>Source</span></Button>
  <Button variant="outline" className="rail-icon" onClick={()=>setOpen('Bonds')} aria-label="Relationship Effect">
   <img src="./assets/menu/bonds.png" alt=""/><span>Bonds</span></Button>
  <Dialog open={open==='Source'} onOpenChange={o=>{if(!o)setOpen(null)}}><DialogContent className="breakdown-dialog">
   <DialogTitle>How to Invite</DialogTitle>
   <DialogDescription className="sr-only">Where {person.name} comes from.</DialogDescription>
   <p className="source-line">The Recruit counter in Drakenberg</p>
  </DialogContent></Dialog>
  <Dialog open={open==='Bonds'} onOpenChange={o=>{if(!o)setOpen(null)}}><DialogContent className="breakdown-dialog">
   <DialogTitle>Relationship Effect</DialogTitle>
   <DialogDescription className="sr-only">What each relationship rung is worth.</DialogDescription>
   <RelationshipEffect/>
  </DialogContent></Dialog>
 </>;
}

/** Two folder tabs, inline on the screen rather than behind a dock: `Info` and `Blessing`. */
export default function FamilyPreview({game,person}:any){
 const [tab,setTab]=useState('Info');
 const pairs=blessingRecipients(game,person.id);
 return <div className="preview-body sub-tab-panel">
  <nav className="sub-tabs" aria-label="Preview sections">{['Info','Blessing'].map(t=>
   <button key={t} type="button" aria-pressed={tab===t} onClick={()=>setTab(t)}>{t}</button>)}</nav>
  {tab==='Info'
   ?<FamilyInfo person={person}/>
   :<div className="blessed-preview">
     <h4 className="source-band">Blessed Fellows</h4>
     <div className="blessed-row">
      {pairs.length
       ?pairs.map((fid:string)=><BlessedFellow key={fid} game={game} familyId={person.id} fellowId={fid} showGift={false}/>)
       :<div className="blessed-fellow blessed-empty"><span className="blessed-ring"><i aria-hidden="true">&#9679;</i></span></div>}
     </div>
    </div>}
 </div>;
}
