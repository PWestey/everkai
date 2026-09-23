import {useState} from 'react';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {InfoDot} from './fellow-shell';
import {PrimaryAction} from './original-controls';
import {familyStellaRule,familyStellaRank} from '@/lib/family-stella.mjs';
import {stellaState,SPIRIT_SHARD_ITEM} from '@/lib/stella.mjs';
/** FAMILY STELLA, rebuilt to docs/family-screen-specs/03-stella.md.
 *
 *  Was a 24-line `training-option`: one <strong>, three <p> and three quantity buttons
 *  (`+1 · rank 14 · 1,200 shards`), plus a 145-word two-paragraph rules-note. The original gives it
 *  dock position ONE and the biggest visual build on the surface -- a node track down the left third
 *  and a `current -> next` card on the right.
 *
 *  THE TRACK IS A GAUGE, NOT A PICKER, and that is the one place this deliberately does NOT copy
 *  app/stella-panel.tsx: the Fellow's nodes are selectable and show per-node rewards, the Family's
 *  are inert and the card always describes current -> current+1. The spec says so outright ("Do not
 *  carry the Fellow's node-picking over"), so the nodes render as spans rather than buttons.
 *
 *  THE FOUR HALOS NOW HAVE THEIR NAMES. This is the capture's real contribution: Everkai held all
 *  four columns and printed them as one run-on line of values with no names. The original names each
 *  one, gives it its own level, and spells out its effect -- and the names settle
 *  docs/character-systems-gap.md 3.2, which asked whether Family Stella had one halo or several.
 *
 *  NOT MODELLED, and left out rather than invented: the original's `Attribute Boost` section, which
 *  previews the member's own Intimacy and Blessing Power gain per level from WifeSpirit's `AddValue`
 *  rows. Everkai's Family Stella pays the blessed Fellows and the village, not the member's own two
 *  stats, and those rows are not in the imported table (lib/family-stella.mjs carries exactly
 *  [cost, talent, percentBp, talentLimit, yieldBp]). Adding the section would mean inventing a
 *  second faucet for Intimacy.
 *
 *  SCOPE, kept as a comment rather than on-screen prose: of the four halos, `Building Earnings` is
 *  the only ACCOUNT-WIDE one. It is the original's `city | yield percent`; it raises
 *  village earnings at every business rather than anyone's Power, and it is the `stella` strand in
 *  businessBonus (tests/strands.test.mjs names this file for it). The other three reach only the
 *  Fellows this member blesses. The old panel said so in a 145-word rules-note; spec 03 retires the
 *  note, the on-screen effect keeps the original's own wording (`All Building Earnings +n%`), and
 *  this comment is what keeps the strand scan able to find the claim.
 *
 *  Nothing here changes a rank, a cost or an effect. */

/** The four halos, named as the original names them, against the columns Everkai already stores.
 *  `at` indexes rule.ranks[r] = [cost, talent, percentBp, talentLimit, yieldBp]. */
const HALOS:{at:number,name:string,effect:(v:number)=>string,show:(v:number)=>string}[]=[
 {at:1,name:'Aptitude Blessing',effect:v=>`Aptitude of Blessed Fellow +${v.toLocaleString('en-US')}`,show:v=>'+'+v.toLocaleString('en-US')},
 {at:4,name:'Building Earnings',effect:v=>`All Building Earnings +${(v/100).toLocaleString('en-US')}%`,show:v=>'+'+(v/100).toLocaleString('en-US')+'%'},
 {at:2,name:'Power Blessing',effect:v=>`Power of Blessed Fellow +${(v/100).toLocaleString('en-US')}%`,show:v=>'+'+(v/100).toLocaleString('en-US')+'%'},
 {at:3,name:'Aptitude Break Blessing',effect:v=>`Base Aptitude Skill level cap for the Blessed Fellow +${v}`,show:v=>'+'+v},
];
/** A halo's OWN level, which is not the Stella rank: it is how many times that column has moved.
 *  The original prints `Building Earnings Lv. 5` on a Stella at Lv. 13, which is what that means. */
const haloLevel=(ranks:any[],at:number,rank:number)=>{
 let n=0;
 for(let i=1;i<=Math.max(0,rank)&&i<ranks.length;i++)if(ranks[i][at]!==ranks[i-1][at])n++;
 return n;
};

/** The six bullets, verbatim from the original's own Information panel. */
const BULLETS=[
 'Some rare Family members have a Stella.',
 'After inviting a family member, you can activate their Stella to strengthen them.',
 'Family member fragments can be used to upgrade Stella, further boosting their Blessing Power.',
 'Before enhancing a Stella, you can view the effects of each upgrade.',
 "When a family member's Stella reaches certain levels, you can obtain exclusive prefix and suffix titles for the family member.",
 'For some family members, reaching certain Stella levels will grant exclusive title frames and dynamic avatars.',
];

/** `Stella Upgraded` -- what this Stella has ALREADY bought, in the summary register (no arrows). */
function AttributesDialog({open,onOpenChange,ranks,rank}:any){
 const row=rank>=0?ranks[rank]:null;
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="breakdown-dialog">
  <DialogTitle>Stella Upgraded</DialogTitle>
  <DialogDescription className="sr-only">Everything this Stella has already bought.</DialogDescription>
  {row
   ?<><h4 className="source-band">Stella Boost</h4>
     {HALOS.map(h=><div key={h.name} className="halo-row">
      <strong>{h.name} <em>Lv. {haloLevel(ranks,h.at,rank)}</em></strong>
      <p>{h.effect(row[h.at])}</p></div>)}</>
   :<p>This Stella has not been activated yet.</p>}
 </DialogContent></Dialog>;
}

export default function FamilyStellaPanel({game,id,action,locked}:any){
 const [info,setInfo]=useState(false),[attrs,setAttrs]=useState(false);
 const rule=familyStellaRule(id);
 if(!rule||!game.family?.[id])return null;
 const ranks=rule.ranks,rank=familyStellaRank(game,id),active=rank>=0;
 const shards=stellaState(game).stock[SPIRIT_SHARD_ITEM]||0;
 const top=ranks.length-1,atTop=rank>=top;
 const node=Math.min(top,Math.max(0,rank)+ (active?1:0));
 const before=active?ranks[rank]:null,after=ranks[Math.max(0,node)];
 const cost=active&&!atTop?ranks[rank+1][0]:0;
 // Only the halos that actually move at this step, which is what the original's card shows.
 const moving=before?HALOS.filter(h=>after[h.at]!==before[h.at]):HALOS.filter(h=>after[h.at]>0);
 return <section className="stella-panel family-stella">
  <header className="stella-head">
   <InfoDot label="About Family Stella" onClick={()=>setInfo(true)}/>
   <strong>Stella Level: Lv. {Math.max(0,rank)}</strong>
   <button type="button" className="attributes-open" onClick={()=>setAttrs(true)}>
    <i aria-hidden="true">&#9906;</i><span>Attributes</span></button>
  </header>
  <div className="stella-body">
   {/* Inert by design: the track is a gauge and the card always reads current -> current+1. */}
   <div className={'stella-track'+(active?'':' stella-dark')} aria-hidden="true">
    {ranks.slice(1).map((_:any,i:number)=>{const level=i+1;
     return <span key={level} className={'stella-node'+(rank>=level?' lit':'')+(level===node?' node-next':'')}>
      <i>&#10022;</i><span>Lv. {level}</span></span>;})}
   </div>
   <div className="stella-detail">
    <p className="node-step">Lv. {Math.max(0,rank)} <em>&rarr;</em> <b>Lv. {node}</b></p>
    <h4 className="source-band">Stella Boost</h4>
    {atTop&&active
     ?<p className="small-note">This Stella is as high as the original allows.</p>
     :moving.map(h=><div key={h.name} className="halo-row">
       <strong>{h.name} <em>Lv. {haloLevel(ranks,h.at,Math.max(0,rank))} &rarr; {haloLevel(ranks,h.at,node)}</em></strong>
       <p className="step-row"><span>{h.effect(after[h.at]).replace(/\s*\+[\d,.%]+$/,'')}</span>
        <span className="step-value">{before?h.show(before[h.at]):h.show(0)} <em>&rarr;</em> <b>{h.show(after[h.at])}</b></span></p>
      </div>)}
   </div>
  </div>
  <div className="stella-foot">
   {!active
    ?<PrimaryAction verb="Activate" disabled={locked} onClick={()=>action('familyStellaActivate',id)}/>
    :atTop
     ?<span className="inert-pill">Max</span>
     /* One level at a time: the original has no quantity selector on Family Stella at all. */
     :<PrimaryAction verb="Upgrade" disabled={locked||shards<cost} currency="Shards"
       have={shards} cost={cost} onClick={()=>action('familyStellaUpgrade',id,1)}/>}
  </div>
  <AttributesDialog open={attrs} onOpenChange={setAttrs} ranks={ranks} rank={rank}/>
  <Dialog open={info} onOpenChange={setInfo}><DialogContent className="breakdown-dialog">
   <DialogTitle>Family Stella</DialogTitle>
   <DialogDescription className="sr-only">What a Family Stella is and does.</DialogDescription>
   <ul className="bullet-list">{BULLETS.map(b=><li key={b}>{b}</li>)}</ul>
  </DialogContent></Dialog>
 </section>;
}
