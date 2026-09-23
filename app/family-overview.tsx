import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {rungName,rungTone,RELATIONSHIP_RUNGS} from './family-shell';
import {countryIcon} from '@/lib/ui-sprites.mjs';
import {FAMILY} from '@/lib/catalog.mjs';
import {fathomBonus,openSlots} from '@/lib/fathoms.mjs';
import {latencyBonus} from '@/lib/latency.mjs';
import {familyStellaYield} from '@/lib/family-stella.mjs';
/** THE TWO AGGREGATE VIEWS, built to docs/family-screen-specs/12-family-list.md.
 *
 *  These exist because of a rule the original keeps and Everkai broke: ACCOUNT TOTALS BELONG ON
 *  ACCOUNT-LEVEL SURFACES, member values on member surfaces. Everkai printed its account-wide
 *  numbers as sentences inside per-member panels --
 *
 *    "Across the whole family: +2,340% village earnings, at every business..."   (latency-panel)
 *    "Across the whole family: +12.4% to every business's earnings."             (family-stella-panel)
 *    "Bonuses shown here are this whole family's contribution, not this member's alone"
 *                                                                               (fathom-panel)
 *
 *  -- which is a large part of why those panels read as essays, and is also just wrong: the number
 *  did not describe the member whose screen it was on. Specs 05, 06 and 03 each deleted their
 *  sentence on the promise that it would land here. This is that landing.
 *
 *  `Family Bonuses` is the original's `Skill Bonus Overview` (GetAllWifeBuildingOutputRise made
 *  visible) plus two clearly separated Everkai rows for Latency and Family Stella, which the spec
 *  itself proposes: the original has no single home for those either, and putting them here deletes
 *  two paragraphs from two member panels.
 *
 *  It has no `(i)` and no prose. A count, five rows, done. */

const TYPES=['Inspiring','Diligent','Brave','Informed','Unfettered'];
const pct=(fraction:number)=>'+'+(fraction*100).toLocaleString('en-US',{maximumFractionDigits:2})+'%';

function FamilyBonuses({game}:any){
 const ids=Object.keys(game.family||{});
 const slots=ids.reduce((n,id)=>n+openSlots(game,id),0);
 return <div className="bonus-overview">
  <p className="bonus-total">Total unlocked skills: <b className="gain">{slots.toLocaleString('en-US')}</b></p>
  {TYPES.map(type=><p key={type} className="bonus-row">
   {countryIcon(type)&&<img src={countryIcon(type)!} alt=""/>}
   <span>{type} Building Earning Bonus</span><b className="gain">{pct(fathomBonus(game,type))}</b></p>)}
  {/* Everkai's own two, kept visibly apart from the five measured Fathom rows above. */}
  <hr className="source-rule"/>
  <p className="bonus-row"><i aria-hidden="true">&#128167;</i><span>Latency &mdash; All Building Earnings</span>
   <b className="gain">{pct(latencyBonus(game))}</b></p>
  <p className="bonus-row"><i aria-hidden="true">&#10022;</i><span>Family Stella &mdash; All Building Earnings</span>
   <b className="gain">{pct(familyStellaYield(game))}</b></p>
 </div>;
}

/** `Pupil Effect Bonus`: what a rung is worth, shown ON the rung rather than on each member.
 *  Everkai has the Intellect (relationship x 10) and pupilReward's intellect/10 multiplier; the
 *  original's `Education Bonus` and `Village Earnings Bonus` columns are not modelled here, so
 *  they are left out rather than invented (same call as spec 04's two missing gate bars). */
function PupilEffect({tier}:{tier:number}){
 const GRADES=['D','C','B','A+','S-'];
 return <table className="pair-table"><tbody>
  <tr><th scope="row">Intellect</th><td><b className="grade">{GRADES[tier-1]}</b></td></tr>
  <tr><th scope="row">Pupil Intellect</th><td><b className="gain">{tier*10}</b></td></tr>
  <tr><th scope="row">Graduation Reward</th><td><b className="gain">&times;{tier}.0</b></td></tr>
 </tbody></table>;
}

/** The roster grid, grouped by named rung, descending. Only JOINED members appear and empty rungs
 *  are omitted, not drawn empty -- the original's own rule. */
function FamilyList({game,onSelect}:any){
 const [effect,setEffect]=useState<number|null>(null);
 const byId=new Map(FAMILY.map((f:any)=>[f.id,f]));
 const groups=RELATIONSHIP_RUNGS.map((_,i)=>i+1).reverse()
  .map(tier=>({tier,members:Object.keys(game.family||{})
   .filter(id=>game.family[id].relationship===tier&&byId.has(id)).map(id=>byId.get(id) as any)}))
  .filter(g=>g.members.length);
 return <div className="family-list">
  {groups.map(g=><section key={g.tier}>
   <div className={'rung-banner rung-'+rungTone(g.tier)}>
    <b>{rungName(g.tier)} ({g.members.length} {g.members.length===1?'person':'people'})</b>
    <button type="button" className="info-dot" aria-label={'What '+rungName(g.tier)+' is worth'}
     onClick={()=>setEffect(g.tier)}>i</button></div>
   <div className="list-grid">{g.members.map((p:any)=>
    <button type="button" key={p.id} className="list-tile" onClick={()=>onSelect?.(p.id)}>
     <span className="blessed-ring"><img src={'./assets/'+(p.portrait||p.art)} alt=""/></span>
     <b>{p.name}</b>
     <u>&#9829;{Math.round(game.family[p.id].intimacy).toLocaleString('en-US')}</u>
    </button>)}</div>
  </section>)}
  {!groups.length&&<p className="small-note">No family member has joined yet.</p>}
  <Dialog open={effect!==null} onOpenChange={o=>{if(!o)setEffect(null)}}><DialogContent className="breakdown-dialog">
   <DialogTitle>Pupil Effect Bonus</DialogTitle>
   <DialogDescription className="sr-only">What this relationship rung is worth.</DialogDescription>
   {effect!==null&&<PupilEffect tier={effect}/>}
  </DialogContent></Dialog>
 </div>;
}

/** The two buttons that sit in the roster's title row, beside the count. */
export default function FamilyRosterTools({game,onSelect}:any){
 const [open,setOpen]=useState<string|null>(null);
 return <span className="roster-tools">
  <Button variant="outline" className="roster-tool" onClick={()=>setOpen('bonuses')}>Bonuses</Button>
  <Button variant="outline" className="roster-tool" onClick={()=>setOpen('list')}>Family List</Button>
  <Dialog open={open==='bonuses'} onOpenChange={o=>{if(!o)setOpen(null)}}><DialogContent className="breakdown-dialog">
   <DialogTitle>Family Bonuses</DialogTitle>
   <DialogDescription className="sr-only">Every account-wide total the family pays.</DialogDescription>
   <FamilyBonuses game={game}/>
  </DialogContent></Dialog>
  <Dialog open={open==='list'} onOpenChange={o=>{if(!o)setOpen(null)}}><DialogContent className="character-sheet panel-centered">
   <DialogTitle>Family List</DialogTitle>
   <DialogDescription className="sr-only">Every joined member, grouped by relationship rung.</DialogDescription>
   <div className="character-sheet-body"><FamilyList game={game} onSelect={(id:string)=>{setOpen(null);onSelect?.(id)}}/></div>
  </DialogContent></Dialog>
 </span>;
}
