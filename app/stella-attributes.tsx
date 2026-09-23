import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {stellaAttributes,stellaNextRank,stellaShare} from '@/lib/stella-attributes.mjs';
/** STELLA "ATTRIBUTES" -- the cumulative view, as distinct from the node panel's single step.
 *
 *  BUILT TO docs/fellow-screen-specs/04-stella.md: a magnifier glyph captioned `Attributes` at the
 *  panel's top right opens a CENTRED DIALOG titled `Stella Upgraded` listing everything this Fellow's
 *  Stella has unlocked so far, in three sections in this order -- `Stella Boost` (round icon, bold
 *  `Name Lv. N`, a hairline rule, then the effect line), `Attribute Boost` (a glyph and
 *  `Power +223500000`, SPELLED OUT IN FULL DIGITS rather than abbreviated, which is the spec's
 *  deliberate second register), and `New Aptitude Skill` (the same row shape). Two registers of the
 *  same number on two screens: abbreviated on the node panel where you are comparing, exact here
 *  where you are auditing.
 *
 *  It was a <details> disclosure until 2026-09-22; the spec's shape is a dialog behind a magnifier,
 *  because the panel's own body is the node view and this is the "what have I actually got" view.
 *
 *  Spec 11's rule is followed too: zero sources are rendered, never filtered, so the list doubles as
 *  a catalogue of what could contribute. */
const pct=(n:number)=>`+${n.toLocaleString(undefined,{maximumFractionDigits:2})}%`;
const full=(n:number)=>n.toLocaleString('en-US',{useGrouping:false});
export default function StellaAttributes({id,game}:any){
 const [open,setOpen]=useState(false);
 const a=stellaAttributes(game,id);if(!a)return null;
 const next=stellaNextRank(game,id),s=stellaShare(game,id);
 const held=Object.entries(a.held);
 /** `Stella Boost` rows: the named halos this Fellow's ranks have raised, each with its level and
  *  its effect. Rendered even at zero -- a player learns the shape of the track from the list. */
 const boosts=[
  {name:'Own Power',level:a.rank,effect:`Power ${pct(a.power.selfPercent)}`},
  {name:'Type Power',level:a.rank,effect:`Power of every Fellow of this type ${pct(a.power.typedPercent)}`},
  {name:'Trade Expert',level:a.rank,effect:`When operating a building, its earnings get an extra ${pct(a.appoint.bp/100)} — account-wide, and not Power`},
  {name:'Aptitude Limit Break',level:a.rank,effect:`Level cap of all basic aptitude skill +${a.limit.total}`},
 ];
 return <>
  <button type="button" className="magnifier" onClick={()=>setOpen(true)}><span aria-hidden="true">⌕</span>Attributes</button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="breakdown-dialog">
   <DialogTitle>Stella Upgraded</DialogTitle>
   <DialogDescription>{a.rank===null?'Inactive':`Rank ${a.rank}/${a.ranks}`}</DialogDescription>

   <h4 className="source-band">Stella Boost</h4>
   {boosts.map(b=><div key={b.name} className="boost-row"><i aria-hidden="true">◉</i>
    <div><strong>{b.name} {b.level===null?'Lv. 0':`Lv. ${b.level}`}</strong><hr/><span>{b.effect}</span></div></div>)}

   <h4 className="source-band">Attribute Boost</h4>
   <div className="boost-row"><i aria-hidden="true">POW</i><div><span>Power +{full(a.power.flat)}</span></div></div>
   <div className="boost-row"><i aria-hidden="true">✦</i><div><span>Aptitude +{full(a.aptitude.total)}</span></div></div>

   <h4 className="source-band">New Aptitude Skill</h4>
   {a.unlocks.length
    ?a.unlocks.map((u:any)=><div key={u.skill} className="boost-row"><i aria-hidden="true">✦</i>
      <div><strong>{u.open?`Lv. ${u.level}/${u.cap}`:`Rank ${u.rank} opens this`}</strong><hr/><span>Aptitude +{u.aptitude.toLocaleString()}</span></div></div>)
    :<p className="small-note">This Fellow’s Stella opens no extra aptitude skill.</p>}

   <h4 className="source-band">Where it sits</h4>
   <p className="small-note">Own ranks{a.power.worth?` +${a.power.worth.toLocaleString()}`:'+0'} Power · Stella’s share of her percent bucket {pct(a.power.percent)} · of her Aptitude +{a.aptitude.total.toLocaleString()} of {s.aptitudeTotal.toLocaleString()}</p>
   <p className="small-note">Aptitude by source: own+{a.aptitude.own.toLocaleString()} bond+{a.aptitude.bond.toLocaleString()} Family Stella+{a.aptitude.familyStella.toLocaleString()}</p>
   <p className="small-note">Aptitude-skill cap: Stella+{a.limit.stella} Family Stella+{a.limit.familyStella}</p>
   {next&&<p className="small-note">Next rank {next.level} · {next.cost?`${next.cost.toLocaleString()} shards`:'free'} · Power +{next.flat.toLocaleString()}{next.selfPercent?` · own Power ${pct(next.selfPercent)}`:''}{next.percent?` · type Power +${next.percent}%`:''}{next.appointPercent?` · appointment yield ${pct(next.appointPercent)}`:''}{next.talentLimit?` · aptitude cap +${next.talentLimit}`:''}</p>}
   {held.length>0&&<p className="small-note">Held back, and priced · {held.map(([k,v])=>`${k}+${(v as number).toLocaleString()}`).join(' ')} · the original grants this and Everkai does not, because there is no axis for it yet. Shown so a missing number is visible rather than silent.</p>}
  </DialogContent></Dialog>
 </>;
}
