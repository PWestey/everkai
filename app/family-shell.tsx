import {useState,type ReactNode} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {originalCharacter} from '@/lib/original-catalog.mjs';
/** THE FAMILY TRAINING SHELL'S PERSISTENT FURNITURE, built to docs/family-screen-specs/02-member-shell.md.
 *
 *  The original's Family screen is the Fellow `Cultivate` shell's twin: rarity badge top-left, name
 *  banner top-centre, a right rail, `<` `>` paging, stats bottom-left, an icon dock at the foot. Three
 *  things on it are NOT on the Fellow shell, and they are what this file adds:
 *
 *  1. THE RELATIONSHIP RIBBON. A chamfered plate pinned to the left screen edge carrying the rung name
 *     and its star suffix, its colour tracking the rung. Everkai printed `Relationship - Tier 3` as an
 *     <h3> inside a pager page; the original never writes the word "tier" and never hides the rung
 *     behind a page (spec 02 difference table, spec 04's banner, spec 12's group headers -- one
 *     vocabulary, three places).
 *  2. THE STAT MEDALLIONS ARE TAP TARGETS. Convention 10: the explanation lives ON the number, not
 *     beside it. Everkai's `management-hint` paragraph said the same two things in its own words under
 *     every member; these are the original's own sentences, quoted, reached by tapping the number each
 *     one describes.
 *  3. THE INFO SHEET IS A TABLE, with Race and CV and no Occupation row -- the Fellow's Info panel has
 *     an Occupation row and the Family's does not.
 *
 *  Nothing here changes what an action does, costs or yields. */

/** The rung ladder, read off the captures rather than invented: `img/bonds-lowest-rung.png` names the
 *  bottom rung `Acquainted`, `img/family-list.png` groups the roster `Loving**` / `Loving*` / `Loving`
 *  in descending order, and `img/bonds-blessing-ladder.png` continues past them to `Forever`.
 *
 *  Everkai stores `relationship` as 1..5 with a cap of 5 and gates each step on `relationRequired()`.
 *  THAT IS UNCHANGED -- this is a naming table over the same five integers, so the same five steps cost
 *  and yield exactly what they did. The original's ladder runs further (`Forever**`); Everkai's cap is
 *  local balance and raising it is not this pass's business. */
export const RELATIONSHIP_RUNGS=['Acquainted','Loving','Loving★','Loving★★','Forever'];
export const rungName=(tier:number)=>RELATIONSHIP_RUNGS[Math.max(0,Math.min(RELATIONSHIP_RUNGS.length-1,(tier|0)-1))];
/** Colour tracks the rung family: green at `Acquainted`, gold/brown from `Loving` up (spec 04). */
export const rungTone=(tier:number)=>(tier|0)<=1?'green':'gold';

/** The two sentences that are the whole Family economy, quoted verbatim from the original's own
 *  medallion tooltips (spec 02). "operation skills" is the translation's word for Fathom slots. */
const MEDALLIONS:Record<string,{icon:string,blurb:string}>={
 Intimacy:{icon:'ui-original/Icons--Icon_Intimacy_1.png',
  blurb:'Intimacy represents your relationship with Family members. The higher the Intimacy, the greater the adopted children. Increasing Intimacy can also unlock operation skills and date stories.'},
 'Blessing Power':{icon:'ui-original/Icons--Icon_EmblemStrength_1.png',
  blurb:'The higher the Blessing Power is, the more Blessing Points you can get while dating with Family members. Blessing Points can be used to increase the power of the blessed Fellows.'}};

/** Ribbon + two tappable medallions, over the art, under every section. */
export function FamilyStatBlock({game,id}:any){
 const f=game.family?.[id];const [open,setOpen]=useState<string|null>(null);
 if(!f)return null;
 const values:[string,number][]=[['Intimacy',f.intimacy],['Blessing Power',f.blessingPower]];
 return <div className="family-stat-block">
  <div className={'rung-ribbon rung-'+rungTone(f.relationship)}><b>{rungName(f.relationship)}</b><i aria-hidden="true">&#9671;</i></div>
  <div className="family-medallions">{values.map(([label,value])=>
   <button type="button" key={label} className="family-medallion" onClick={()=>setOpen(label)} aria-label={label+' — what it does'}>
    <img src={'./assets/'+MEDALLIONS[label].icon} alt=""/>
    <span>{label}</span><strong>{Math.round(value).toLocaleString('en-US')}</strong>
   </button>)}</div>
  <Dialog open={!!open} onOpenChange={o=>{if(!o)setOpen(null)}}><DialogContent className="breakdown-dialog">
   <DialogTitle>{open||''}</DialogTitle>
   <DialogDescription className="sr-only">What {open} does.</DialogDescription>
   <p>{open?MEDALLIONS[open].blurb:''}</p>
  </DialogContent></Dialog>
 </div>;
}

/** The `Info` sheet's bordered table. `Name`/`Title` share one row, then `Race`, then `Bio`, then a
 *  right-aligned `CV:` outside the table. No Occupation row (spec 02). */
export function FamilyInfo({person,children}:{person:any,children?:ReactNode}){
 const cv=(originalCharacter(person.id)?.fields?.cv||'').replace(/\s+/g,' ').trim();
 return <div className="member-info">
  <table className="member-info-table"><tbody>
   <tr><th scope="row">Name</th><td>{person.name}</td><th scope="row">Title</th><td>{person.title||'—'}</td></tr>
   <tr><th scope="row">Race</th><td colSpan={3}>{person.race||'—'}</td></tr>
   <tr><th scope="row">Bio</th><td colSpan={3}>{person.description||'No biography was recovered for this character.'}</td></tr>
  </tbody></table>
  {cv?<p className="member-cv">CV: {cv}</p>:null}
  {children}
 </div>;
}

/** THE RIGHT RAIL'S LOWER GROUP. `Story`, `Travel`, `Gift` are the `Interact` tab's three surfaces
 *  (spec 08) and the original shows them only while `Interact` is selected, which is why `interact`
 *  gates them here rather than them being always-on furniture.
 *
 *  `Gallery` and `Wardrobe` ride the same rail. Neither has a home on the original's member screen --
 *  the Date Record is a roster-level surface (spec 11) and the capture found NO control anywhere on
 *  the Family surface that reaches costumes (README, "Not reached, and why"). They keep a one-tap
 *  reach here, exactly as the Fellow rebuild parked `Form Switch` on its rail, rather than being
 *  deleted along with the pager that used to carry them. */
export function FamilyRail({interact,children}:{interact:boolean,children:Record<string,ReactNode>}){
 const [open,setOpen]=useState<string|null>(null);
 const lower:[string,string][]=[['Story','overview'],['Travel','building'],['Gift','gifts']];
 const extras:[string,string][]=[['Gallery','relics'],['Wardrobe','relics']];
 const tiles=interact?[...lower,...extras]:extras;
 return <>
  {tiles.map(([label,icon])=><Button key={label} variant="outline" className="rail-icon" onClick={()=>setOpen(label)} aria-label={label}>
   <img src={'./assets/menu/'+icon+'.png'} alt=""/><span>{label}</span></Button>)}
  {tiles.map(([label])=><Dialog key={label} open={open===label} onOpenChange={o=>{if(!o)setOpen(null)}}>
   <DialogContent className="character-sheet panel-centered">
    <DialogTitle>{label}</DialogTitle><DialogDescription className="sr-only">{label} for this family member.</DialogDescription>
    <div className="character-sheet-body">{children[label]}</div>
   </DialogContent></Dialog>)}
 </>;
}
