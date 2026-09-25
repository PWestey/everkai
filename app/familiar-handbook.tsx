import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {cardStyle,petCardIcon} from '@/lib/ui-sprites.mjs';
import {familiarHalf} from '@/lib/familiar-portraits.mjs';
import {FAMILIARS,familiarById} from '@/lib/familiars.mjs';
import {groupOf} from '@/lib/familiar-tower.mjs';
import {HANDBOOK_MAX,HANDBOOK_EXP,HANDBOOK_COEF,handbookState,handbookLevel,handbookPending,
 handbookClaimable,handbookBonus,handbookRungs} from '@/lib/familiar-handbook.mjs';

// THE FAMILIAR COMPENDIUM (docs/familiar-screen-specs/11-handbook.md). Parity row E8, audit S3 --
// Everkai had no Compendium screen, no Compendium data and no UI string naming it, so a player could
// not tell it was missing. That mattered more than the deferral suggested: section 0's finding is
// that this is the ONE cross-system faucet on the familiar surface, and the only thing anywhere that
// pays a CHARACTER stat. Every level grants `Power of [Type] Fellow +5%`, in the game's own words.
//
// Two conventions from the capture do all the work in the header:
//  1. ZEROS ARE SHOWN. `+5% +0% +0% +0% +0%` -- four of five chips are worthless and all five render,
//     so a player who has never levelled it can read, at a glance, that it pays five different things
//     and that they advance separately. A filtered strip would teach nothing.
//  2. The `Lv. n` plaque OVERLAPS the book it describes. Level, progress and destination are one
//     composed object, not a number floating above a bar.
//
// THE CLAIM TRAP, NOT COPIED. The original's `(i)` says "Tap a Familiar to claim the corresponding
// Compendium EXP" -- the badge sits inside the card's tap target, so a tap that looks like "open this
// familiar" is a claim. That is the third instance of the same trap in this capture programme, and
// the spec's instruction is explicit: copy the badge, not the trap. The badge is its own button.
//
// COLLECTION REWARDS HAS NO `Claim` ON ANY RUNG, and that is the point. The (i) says the level "will
// automatically increase", so the reward is paid on the level-up, not collected from the list. The
// ladder is a READOUT whose only control is its close tab -- the cheapest screen in the capture to
// build correctly and the easiest to build wrongly, because Everkai's instinct on every other ladder
// has been to put a button on each rung.
const TYPES=['Inspiring','Diligent','Brave','Informed','Unfettered'];
const GROUP_NAMES=['','Cool','Cute','Playful','Legendary'];

export default function FamiliarHandbook({game,action,locked,onOpen}:any){
 const h=handbookState(game),level=handbookLevel(h.exp),bonus:any=handbookBonus(game);
 const [group,setGroup]=useState(0),[rewards,setRewards]=useState(false),[info,setInfo]=useState(false);
 const owned=FAMILIARS.filter(p=>game.familiars?.[p.id]);
 const shown=group?owned.filter(p=>groupOf(p.id)===group):owned;
 const pending=handbookClaimable(game);
 const into=level>=HANDBOOK_MAX?HANDBOOK_EXP:h.exp-level*HANDBOOK_EXP;
 return <section className="familiar-compendium" aria-label="Familiar List">
  <header className="explore-head">
   <button className="area-plaque" aria-expanded={info} onClick={()=>setInfo(v=>!v)}>&#9432; Familiar List</button>
  </header>
  {info&&<div className="instruction-popover" role="note">
   <p><b>Compendium EXP.</b> Acquiring new Familiars, awakening them, increasing their stars, and obtaining SP Familiars all increase Compendium EXP. Familiars of different rarity provide different amounts of Compendium EXP. Tap a Familiar to claim the corresponding Compendium EXP.</p>
   <p><b>Compendium Level.</b> Once the Compendium EXP accumulates to a certain value, the Compendium&rsquo;s level will automatically increase. Each time the Compendium&rsquo;s level increases, you receive rewards and enhanced power bonuses for different-type Fellows.</p></div>}

  <div className="compendium-head">
   {/* The book is a button: it opens Collection Rewards. The plaque overlaps its lower edge. */}
   <button className="compendium-book" disabled={locked} onClick={()=>setRewards(true)} aria-label="Collection Rewards">
    <span aria-hidden="true">&#128212;</span><em>Lv. {level}</em></button>
   <div className="compendium-right">
    {/* Five chips, in a fixed order, zeros and all. */}
    <ul className="bonus-strip" aria-label="Fellow Power bonus by type">{TYPES.map(t=>
     <li key={t}><i className={'type-dot '+t.toLowerCase()} aria-hidden="true"/><b>+{bonus[t]/100}%</b><span className="sr-only">{t}</span></li>)}</ul>
    <div className="compendium-bar" role="meter" aria-valuenow={into} aria-valuemax={HANDBOOK_EXP} aria-label="Compendium EXP">
     <i style={{width:`${Math.min(100,into/HANDBOOK_EXP*100)}%`}}/>
     <span>{level>=HANDBOOK_MAX?'Max':`${into}/${HANDBOOK_EXP}`}</span></div>
   </div>
  </div>

  <ul className="compendium-grid" aria-label="Contracted familiars">{shown.map(p=>{
   const rec=game.familiars[p.id],n=handbookPending(game,p.id);
   return <li key={p.id}>
    <button className="compendium-card" style={cardStyle(p.rarity) as any} disabled={locked} onClick={()=>onOpen?.(p.id)}>
     <b className="card-level">lv.{rec.level}</b>
     <img src={familiarHalf(p.id)||petCardIcon(p.rarity)||''} alt=""/>
     <em className="card-stars">{rec.stars||0} &#9733;</em>
     <strong>{p.name}</strong></button>
    {/* Its own tap target, deliberately -- the card body opens the familiar (spec 2, "do not copy the trap"). */}
    {n>0&&<button className="exp-badge" disabled={locked} onClick={()=>action('handbookClaim',p.id)}
     aria-label={`Claim ${n} Compendium EXP from ${p.name}`}><span>EXP</span><b>{n}</b></button>}
   </li>})}</ul>
  {!owned.length&&<p className="tower-hint">Contract a familiar first: choose a starter on the Exploring page.</p>}

  <nav className="group-rail" aria-label="Type">{[0,1,2,3,4].map(g=>
   <button key={g} className={group===g?'current':''} aria-pressed={group===g} onClick={()=>setGroup(g)}>{g?GROUP_NAMES[g]:'ALL'}</button>)}</nav>
  <Button className="quick-collect" disabled={locked||!pending} onClick={()=>action('handbookClaimAll')}>Quick Collect</Button>

  <Dialog open={rewards} onOpenChange={setRewards}><DialogContent className="save-dialog collection-rewards">
   <DialogTitle>Collection Rewards</DialogTitle>
   <DialogDescription className="sr-only">Every Compendium level and the Fellow Power it grants</DialogDescription>
   {/* No control on any rung: the level rises automatically, so this is a past tense, not a gate. */}
   {/* 300 rungs, so it opens where the player is. A callback ref, not an effect: the dialog's content
       mounts in its own portal commit (the same reason the tower's Rewards ladder uses one). */}
   <ol ref={(el:HTMLOListElement|null)=>{if(!el||!el.children.length)return;
    const row=el.children[Math.max(0,level-2)] as HTMLElement;
    if(row)el.scrollTop=Math.max(0,row.offsetTop-(el.children[0] as HTMLElement).offsetTop)}}>{handbookRungs().map(r=><li key={r.level} className={r.level<=level?'done':''}>
    <span className="rung-plaque">Lv. {r.level}</span>
    <p>Power of {r.type} Fellow +{r.bp/100}%</p>
    <b>{r.level<=level?'Completed':'Not Achieved'}</b></li>)}</ol>
   {/* The reward half of PetBookLevel is not ported: both tiers pay the premium Crystal, which Everkai
       does not have, plus a Metamorphosis item that is parity E7 and deferred. Section 1. */}
  </DialogContent></Dialog>
 </section>;
}
export {HANDBOOK_COEF};
