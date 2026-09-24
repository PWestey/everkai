import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {fellowById} from '@/lib/catalog.mjs';
import {familiarBonus} from '@/lib/familiar-nodes.mjs';
import {bondedPower} from '@/lib/adventure.mjs';
import {cardStyle} from '@/lib/ui-sprites.mjs';

// BIND, from the familiar's side (docs/familiar-screen-specs/13-bind.md).
//
// The original binds from BOTH sides and it is one action: `PanelHeroChoosePet` (Fellow -> familiar)
// and `PanelPetChooseHero` (familiar -> Fellow) issue the same request and share one button caption.
// Everkai already ships the Fellow side correctly -- `SelectFamiliar` in app/fellow-shell.tsx, built
// to docs/fellow-screen-specs/10-familiar-artifact.md: a raised band for the bound one with an orange
// `Unbind`, art cards, the current holder's portrait as an overlay, and `Equip`/`Swap`. This is its
// mirror, so the two views finally agree; spec 13's ruling is that the Fellow side is the correct one
// and this is what the familiar side must become.
//
// What it replaces: a `NativeSelect` of Fellow names with `Bind Fellow · Free` and a peer `Unbind`,
// under a sentence explaining capacity, effect and consequence in prose. The tile states the capacity,
// the five-bucket readout states the effect, and `POW old » new` states the consequence.
//
// NOT PORTED: the `Free Attempts: N` footer. It is a DAILY REBIND ALLOWANCE (the client's
// `PetDetailSelectHeroFreeTimesToday`, priced by `System.HeroPetSlotCost` = [0, 0, 50, ...]), not a
// gacha counter as the Fellow spec had assumed -- and spec 13 recommends dropping it either way,
// because Everkai charges nothing to rebind and a counter that never moves is furniture.
const BUCKET:[string,string][]=[['flat','Power'],['aptitude','Aptitude'],['percent','Power %'],['finalPercent','Final Power %']];

export default function FamiliarBind({game,id,action,locked}:any){
 const [open,setOpen]=useState(false);
 const bonds:Record<string,string>=game.familiarBonds||{};
 const boundFellow=Object.keys(bonds).find(f=>bonds[f]===id)||null;
 const partner:any=boundFellow?fellowById(boundFellow):null;
 // The five buckets this bond pays. familiarBonus() already returns four of them; the fifth
 // (Aptitude %) is PetExternalAdd row 4 and arrives with Metamorphosis, spec 04.
 const bonus=boundFellow?familiarBonus(game,boundFellow):{flat:0,aptitude:0,percent:0,finalPercent:0};
 const owned=Object.keys(game.fellows||{});
 // POW old » new, per Fellow: what that Fellow is worth now against what this familiar would make it.
 const preview=(fellow:string)=>{
  const now=bondedPower(game,fellow);
  const moved={...game,familiarBonds:{...bonds,[fellow]:id}};
  return [now,bondedPower(moved,fellow)] as [number,number];
 };
 return <div className="familiar-bind">
  <button className={'bind-tile'+(partner?' filled':'')} disabled={locked} aria-label={partner?`Bound to ${partner.name}. Change`:'Bind a Fellow'} onClick={()=>setOpen(true)}>
   {partner?<><img src={'./assets/'+(partner.portrait||partner.art)} alt="" loading="lazy"/><b>lv.{game.fellows[boundFellow!]?.level??1}</b></>
    :<span aria-hidden="true">&#10010;</span>}
  </button>
  {!!boundFellow&&<div className="bind-readout">
   <p className="bind-banner">Final Power Bonus +{bonus.finalPercent||0}%</p>
   <dl>{BUCKET.map(([k,label])=><div key={k}><dt>{label}</dt><dd>{k.includes('ercent')?`+${(bonus as any)[k]||0}%`:`+${Number((bonus as any)[k]||0).toLocaleString()}`}</dd></div>)}</dl>
  </div>}
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="save-dialog familiar-select">
   <DialogTitle>Select Fellow</DialogTitle>
   <DialogDescription>One familiar per Fellow.</DialogDescription>
   {partner&&<><div className="familiar-row familiar-bound">
    <span className="familiar-art" style={cardStyle(partner.rarity) as any}><img src={'./assets/'+(partner.portrait||partner.art)} alt=""/></span>
    <div><strong>lv.{game.fellows[boundFellow!]?.level??1} {partner.name}</strong><p>{partner.rarity} &middot; {partner.type}</p></div>
    <Button className="primary-action primary-tier" disabled={locked} onClick={()=>{action('unbindFamiliar',id);setOpen(false)}}><b>Unbind</b></Button>
   </div><hr className="source-rule"/></>}
   {owned.filter(f=>f!==boundFellow).sort((a,b)=>bondedPower(game,b)-bondedPower(game,a)).map(f=>{
    const who:any=fellowById(f);if(!who)return null;
    const [now,after]=preview(f),held=bonds[f];
    return <div className="familiar-row" key={f}>
     <span className="familiar-art" style={cardStyle(who.rarity) as any}><img src={'./assets/'+(who.portrait||who.art)} alt=""/></span>
     <div><strong>lv.{game.fellows[f]?.level??1} {who.name}</strong>
      <p className="pow-pill">{Number(now).toLocaleString()} &raquo; {Number(after).toLocaleString()}</p></div>
     <Button className="primary-action" disabled={locked} onClick={()=>{action('bindFamiliar',id,f);setOpen(false)}}><b>{held?'Swap':'Equip'}</b></Button>
    </div>})}
   {!owned.length&&<p className="familiar-empty">No Fellow has joined yet.</p>}
  </DialogContent></Dialog>
 </div>;
}
