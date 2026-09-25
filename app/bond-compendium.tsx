import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {cardStyle} from '@/lib/ui-sprites.mjs';
import {fellowById} from '@/lib/catalog.mjs';
import {bondGroups,bondGroup,BOND_AURAS,BOND_ACTIVATION,activeBondAuras} from '@/lib/hero-bond.mjs';

// THE BOND COMPENDIUM (catalogue F8) and the group auras (the missing half of F6).
//
// Everkai had neither, and had no group membership at all: measured 2026-09-25, every one of its 128
// star halos belongs to exactly one Fellow. Inviting a member now raises a group's collection
// progress, and a complete group is worth completing.
//
// WHAT THE DATA'S SHAPE DICTATES, and why this screen is a collection rather than a bonus ladder:
// 23 groups over 131 heroes, but only FOUR groups carry a group aura, and all 57 of those auras
// grant `talent` at +2, +10 or +20. Most groups are a set to finish; a few also pay. The screen says
// which is which rather than implying every group has a reward behind it.
const pct=(g:any)=>Math.round(g.have/g.total*100);

function Member({id,owned}:{id:string,owned:boolean}){
 const f=fellowById(id);
 return <li className={owned?'':'missing'} title={f?.name||id}>
  <span className="bond-pip" style={f?cardStyle(f.rarity) as any:undefined}/>
  <small>{f?.name||id}</small>
 </li>;
}

export default function BondCompendium({game}:any){
 const [open,setOpen]=useState(false),[pick,setPick]=useState<string|null>(null);
 const groups=bondGroups(game);
 const complete=groups.filter((g:any)=>g.complete).length;
 const active=activeBondAuras(game);
 const detail=pick?bondGroup(game,pick):null;
 const auras=(id:string)=>BOND_AURAS.filter((a:any)=>a.bond===id);
 return <>
  <Button variant="outline" className="album-open" onClick={()=>setOpen(true)}>
   Bond Compendium · {complete}/{groups.length} complete</Button>
  <Dialog open={open} onOpenChange={setOpen}><DialogContent className="save-dialog bond-compendium">
   <DialogTitle>Bond Compendium</DialogTitle>
   <DialogDescription>{complete} of {groups.length} groups complete</DialogDescription>
   {detail?<>
    <Button variant="outline" onClick={()=>setPick(null)}>&larr; All groups</Button>
    <h5 className="ribbon-rule">Bond {detail.id} &middot; {detail.have}/{detail.total}</h5>
    <ul className="bond-members">{detail.members.map((m:string)=>
     <Member key={m} id={m} owned={detail.owned.includes(m)}/>)}</ul>
    {auras(detail.id).length
     ?<ul className="bond-auras">{auras(detail.id).map((a:any)=>{
        const on=active.some((x:any)=>x.skill===a.skill);
        return <li key={a.skill} className={on?'on':''}>
         <strong>{fellowById(a.hero)?.name||a.hero}</strong>
         <span>+{a.value} Aptitude to this group</span>
         <em>{on?'owned':'not owned'} &middot; unlocks at {a.unlockReq}</em></li>})}</ul>
     :<p className="item-status">This group carries no aura — it is a set to complete.</p>}
    {detail.id===BOND_ACTIVATION.bond&&<p className="item-status">
     Fielding {BOND_ACTIVATION.need} of this group also grants {BOND_ACTIVATION.value/100}% {BOND_ACTIVATION.prop.toUpperCase()} to its members.</p>}
   </>:
   <ol className="bond-list">{groups.map((g:any)=>
    <li key={g.id}><button onClick={()=>setPick(g.id)} className={g.complete?'complete':''}>
     <strong>Bond {g.id}</strong>
     <span className="bond-bar"><i style={{width:`${pct(g)}%`}}/></span>
     <em>{g.have}/{g.total}</em>
     {!!auras(g.id).length&&<b className="bond-pays">aura</b>}
    </button></li>)}</ol>}
  </DialogContent></Dialog>
 </>;
}
