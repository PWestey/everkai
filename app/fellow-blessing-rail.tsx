import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {blessersOf,BLESSING_SLOTS} from '@/lib/fellow-blessers.mjs';
import {bondsOf,bondGroup} from '@/lib/hero-bond.mjs';
import {fellowById,familyById} from '@/lib/catalog.mjs';
import {cardStyle} from '@/lib/ui-sprites.mjs';

// THE FELLOW'S OWN BLESSING AND GROUP VIEWS (fellow-screen-specs 09 and 08).
//
// B1, and it is spec 09's whole structural point: in the original, Blessing is reachable FROM THE
// FELLOW, because it is a property of the fellow RECEIVING it. Everkai could only reach it from the
// family member giving it -- `blessingRecipients(s, familyId)` answered the forward question and
// nothing anywhere asked the reverse. So a player looking at a Fellow could not see who blesses them.
//
// B3: the original draws a FIXED FOUR-SLOT row, filled or silhouetted, because the row communicates
// CAPACITY -- "you have two more to fill" -- which a list of however-many cannot. The four is the
// original's shape; Everkai enforces no cap of its own and the panel says so rather than implying one.
//
// NOT BUILT, each for a stated reason:
//   `Custom Blessings` (spec 09 tab 2) needs an unlocked-slot concept Everkai has no data for at all.
//   `Resonance` (spec 08, L3) is a whole system -- pairing two Fellows for mutual gain, plus a skill
//   ladder -- with no table behind it in Everkai and none named in the config set by that name.
//   `Form Switch` as a full screen (L2) is a Wardrobe promotion, which is its own slice.
// The `Group` pill below IS built, because HeroBond landed today and it finally has data.
export default function FellowBlessingRail({game,id}:any){
 const [open,setOpen]=useState<null|'blessing'|'group'>(null);
 const blessers=blessersOf(game,id);
 const groups=bondsOf(id);
 if(!blessers.length&&!groups.length)return null;
 return <>
  <div className="fellow-relation-rail">
   {!!blessers.length&&<button onClick={()=>setOpen('blessing')}>
    <span>Blessing</span><em>{blessers.length}/{BLESSING_SLOTS}</em></button>}
   {!!groups.length&&<button onClick={()=>setOpen('group')}>
    <span>Group</span><em>{groups.length}</em></button>}
  </div>

  <Dialog open={open==='blessing'} onOpenChange={()=>setOpen(null)}><DialogContent className="save-dialog">
   <DialogTitle>Blessing</DialogTitle>
   <DialogDescription>{fellowById(id)?.name} is blessed by {blessers.length} family {blessers.length===1?'member':'members'}.</DialogDescription>
   {/* The slot row, not a list: four slots, filled or empty, so the capacity reads at a glance. */}
   <ul className="blessing-slots">{Array.from({length:Math.max(BLESSING_SLOTS,blessers.length)},(_,i)=>{
    const b=blessers[i],f=b?familyById(b.id):null;
    return <li key={i} className={b?'filled':'empty'}>
     <span className="bond-pip" style={f?cardStyle(f.rarity) as any:undefined}/>
     <small>{b?b.name:'—'}</small></li>})}</ul>
   {blessers.map(b=><p key={b.id} className="item-status">
    <strong>{b.name}&rsquo;s Blessing</strong>{b.parts.length?' · '+b.parts.map(p=>`${p.name} +${p.value.toLocaleString()}`).join(' · '):' · not yet trained'}</p>)}
   <p className="small-note">Four slots is the original&rsquo;s shape. Everkai sets no cap of its own.</p>
  </DialogContent></Dialog>

  <Dialog open={open==='group'} onOpenChange={()=>setOpen(null)}><DialogContent className="save-dialog">
   <DialogTitle>Group</DialogTitle>
   <DialogDescription>{fellowById(id)?.name} belongs to {groups.length} bond {groups.length===1?'group':'groups'}.</DialogDescription>
   {groups.map((bid:string)=>{const g=bondGroup(game,bid);if(!g)return null;
    return <section key={bid} className="aura-band">
     <h5>Bond {bid} &middot; {g.have}/{g.total}</h5>
     <ul className="bond-members">{g.members.map((m:string)=>{const f=fellowById(m);
      return <li key={m} className={g.owned.includes(m)?'':'missing'} title={f?.name||m}>
       <span className="bond-pip" style={f?cardStyle(f.rarity) as any:undefined}/>
       <small>{f?.name||m}</small></li>})}</ul>
    </section>})}
  </DialogContent></Dialog>
 </>;
}
