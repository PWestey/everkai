import {useState} from 'react';
import {Lock} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {InfoDot} from './fellow-shell';
import {PrimaryAction,abbrev} from './original-controls';
import {countryIcon} from '@/lib/ui-sprites.mjs';
import {FATHOM_SLOTS,FATHOM_STEPS,MAX_TIER,FATHOM_DAILY_MAX,ACTIONS_PER_SLOT,openSlots,slotTier,
        memberFathomBonus,habitActions,fathomState,fathomsApply,fathomRollQuote} from '@/lib/fathoms.mjs';
import {luckStones} from '@/lib/luck-stones.mjs';
import {habitEarnings,habitDay} from '@/lib/habits.mjs';
/** FAMILY FATHOMS, rebuilt to docs/family-screen-specs/05-skills-fathoms.md.
 *
 *  Everkai drew a 6x6 GRID of tiles with an `Open 12/36` progress meter beside it. The original
 *  draws a HORIZONTAL RAIL anchored on the member's Intimacy medallion, with the slots hanging off
 *  it alternately above and below, and THE RAIL'S OWN FILL IS THE PROGRESS BAR -- pink up to the
 *  last unlocked slot, grey beyond it. That is not decoration: the rail is what makes Intimacy
 *  legible as the thing that opens slots, which a grid plus a separate meter never showed.
 *
 *  Convention 15 throughout: a locked slot is the SAME medallion with a padlock corner badge and a
 *  `(heart) 150` pill where the `+N%` pill was. Nothing disappears, nothing is explained. A low-tier
 *  slot is the same medallion desaturated, so the art carries the tier as well as the pill does.
 *
 *  THE TOTALS STRIP IS THIS MEMBER'S, not the family's. Everkai printed the account-wide
 *  `fathomBonus()` on every member's panel; the original prints the five class totals for the member
 *  you are looking at and keeps the account-wide version on a roster overlay (spec 12). That is what
 *  `memberFathomBonus` is for, and `fathomBonus` is now its sum, so they cannot drift.
 *
 *  Nothing here changes what a roll costs, what it draws, or what it keeps. */

const TYPES=['Inspiring','Diligent','Brave','Informed','Unfettered'];
const pct=(n:number)=>Math.round(n*100).toLocaleString('en-US');

/** The `(i)`, quoted verbatim from the original, plus one line for the action Everkai added. */
function RulesDialog({open,onOpenChange}:any){
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="breakdown-dialog">
  <DialogTitle>Fathom</DialogTitle>
  <DialogDescription className="sr-only">How the two Fathom routes differ.</DialogDescription>
  <p>When using Gold to Fathom skills, the higher the bonus is, the lower the success rate will be.
   The cost of Gold will increase when fathoming the same skill multiple times.</p>
  <p>When using Luck Stone to Fathom skills, you can get at least a +20% bonus and above. The cost of
   Luck Stones remains the same every time.</p>
  {/* Measured 2026-09-23 against the imported table, because that second sentence is a claim about
      the DISTRIBUTION and not just the odds: WeightHigh is exactly 0 for tiers 1-19 and non-zero
      only from tier 20, so an advanced draw can never land below +20%. lib/fathoms.mjs already
      honours it -- 20,000 draws from a fresh slot never drew below tier 20, while the gold column
      drew tier 1 on the same seeds. The floor is real and it is paid. */}
  {/* The one claim this screen has to keep making: a Fathom adds its tier as a percentage to
      MATCHING village earnings, and that is the `family` strand in businessBonus. It lives behind
      the `(i)` because that is the only place the original allows prose -- but it must live
      somewhere, and tests/strands.test.mjs scans for exactly this sentence so a screen cannot
      quietly stop promising what the multiplier is still paying. */}
  <p className="small-note">Each Fathom adds its tier as a percentage to matching village earnings.
   Practise is Everkai&rsquo;s own third route: free, certain, one tier, and paced by your daily
   habits rather than by gold or stones.</p>
 </DialogContent></Dialog>;
}

export default function FathomPanel({game,id,action,locked}:any){
 const [pick,setPick]=useState<number|null>(null),[info,setInfo]=useState(false);
 const member=game.family?.[id];
 if(!member||!fathomsApply(id))return null;
 const open=openSlots(game,id),actions=habitActions(game);
 const f=fathomState(game),today=habitDay(game.lastAt),{dailies}=habitEarnings(game.habits,game.lastAt);
 const allowance=Math.min(FATHOM_DAILY_MAX,dailies),used=f.day===today?f.used:0,left=Math.max(0,allowance-used);
 const firstOpen=FATHOM_SLOTS.find((s:any)=>s.slot<=open&&slotTier(game,id,s.slot)<MAX_TIER)?.slot??1;
 const chosen:any=FATHOM_SLOTS.find((s:any)=>s.slot===pick)||FATHOM_SLOTS.find((s:any)=>s.slot===firstOpen)||FATHOM_SLOTS[0];
 const cTier=slotTier(game,id,chosen.slot),cOpen=chosen.slot<=open;
 const quote=fathomRollQuote(game,id,chosen.slot),stones=luckStones(game);
 const chance=(key:'rateNormal'|'rateHigh')=>cTier>=MAX_TIER?0:(FATHOM_STEPS[cTier-1] as any)[key]/100;
 const typeName=chosen.type?chosen.type+' Type':'All Buildings';
 return <article className="fathom-panel">
  <h3 className="sheet-title">Building Earnings<br/>Bonus</h3>
  {/* This member's five class totals, in the original's fixed order. */}
  <div className="fathom-totals"><span className="totals-house" aria-hidden="true">&#8962;</span>
   {TYPES.map(type=><span key={type} className="totals-chip">{countryIcon(type)&&<img src={countryIcon(type)!} alt={type}/>}
    <b>+{pct(memberFathomBonus(game,id,type))}%</b></span>)}</div>
  {/* The rail. Its fill IS the progress bar, so there is no `Open n/36` meter. */}
  <div className="fathom-rail-wrap">
   <div className="rail-origin"><img src="./assets/ui-original/Icons--Icon_Intimacy_1.png" alt=""/>
    <b>{Math.round(member.intimacy).toLocaleString('en-US')}</b></div>
   <div className="fathom-rail" role="radiogroup" aria-label="Fathom slots"
    style={{'--n':FATHOM_SLOTS.length,'--openn':open} as any}>
    {FATHOM_SLOTS.map((slot:any)=>{
     const unlocked=slot.slot<=open,tier=slotTier(game,id,slot.slot),on=slot.slot===chosen.slot;
     const need=Math.max(0,slot.slot*ACTIONS_PER_SLOT-actions);
     return <button type="button" key={slot.slot} role="radio" aria-checked={on}
      className={'rail-slot'+(slot.slot%2?' slot-above':' slot-below')+(unlocked?'':' slot-locked')+(on?' slot-on':'')}
      style={{'--sat':unlocked?Math.max(.18,tier/MAX_TIER):.1} as any}
      aria-label={`Fathom ${slot.slot} · ${slot.type||'Every business'}${unlocked?` · +${FATHOM_STEPS[tier-1].percent}%`:` · locked, Intimacy ${slot.intimacy}`}`}
      onClick={()=>setPick(slot.slot)}>
      <span className="slot-art">{slot.type&&countryIcon(slot.type)
       ?<img src={countryIcon(slot.type)!} alt=""/>
       :<i className="slot-all" aria-hidden="true">&#11042;</i>}
       {unlocked?null:<Lock className="slot-lock" aria-hidden="true"/>}</span>
      {/* Convention 8: the gate is printed ON the tile. The original's pill is the Intimacy gate;
          Everkai's slots have a second, unpurchasable one (cumulative habit actions), so the pill
          shows whichever of the two is actually binding rather than a gate already cleared. */}
      <u className={unlocked?'slot-pill':'slot-pill slot-gate'}
       title={unlocked?undefined:member.intimacy<slot.intimacy?`Intimacy ${slot.intimacy.toLocaleString('en-US')}`:`${need.toLocaleString('en-US')} more habit actions`}>
       {unlocked?`+${FATHOM_STEPS[tier-1].percent}%`
        :member.intimacy<slot.intimacy?`♥${slot.intimacy.toLocaleString('en-US')}`:`✦${need.toLocaleString('en-US')}`}</u>
     </button>;})}
   </div>
  </div>
  {/* The detail card: type name, the effect in green, and the `(i)`. */}
  <div className="fathom-detail">
   <span className="slot-art detail-art">{chosen.type&&countryIcon(chosen.type)
    ?<img src={countryIcon(chosen.type)!} alt=""/>:<i className="slot-all" aria-hidden="true">&#11042;</i>}</span>
   <div><strong>{typeName}</strong>
    {cOpen
     ?<b className="gain">{chosen.type?chosen.type+' ':''}Building Earnings Bonus+{FATHOM_STEPS[cTier-1].percent}%</b>
     :member.intimacy<chosen.intimacy
      ?<b className="need">&#9829; {chosen.intimacy.toLocaleString('en-US')}</b>
      /* Everkai's own second gate, and the only place it needs saying: Intimacy is purchasable and
         would otherwise open the whole ladder at once, so a slot also wants habit actions. */
      :<b className="need">{Math.max(0,chosen.slot*ACTIONS_PER_SLOT-actions).toLocaleString('en-US')} more habit actions</b>}</div>
   <InfoDot label="How the two Fathom routes differ" onClick={()=>setInfo(true)}/>
  </div>
  {cOpen&&<div className="fathom-actions">
   <div className="rate-stack"><small className="gain">Success Rate: {chance('rateHigh')}%</small>
    <PrimaryAction verb="Advanced" disabled={locked||cTier>=MAX_TIER||!quote.stoneAffordable}
     currency="Stones" have={stones} cost={quote.stones} onClick={()=>action('fathomRollAdvanced',id,chosen.slot)}/></div>
   <div className="rate-stack"><small className="gain">Success Rate: {chance('rateNormal')}%</small>
    <PrimaryAction verb="Fathom" disabled={locked||cTier>=MAX_TIER||!quote.goldAffordable}
     currency="Gold" have={game.gold} cost={Number.isFinite(quote.gold)?quote.gold:Infinity}
     onClick={()=>action('fathomRollGold',id,chosen.slot)}/></div>
   <div className="rate-stack"><small>{left?`${left} left today`:'None today'}</small>
    <Button className="primary-action practise-action" disabled={locked||cTier>=MAX_TIER||!left}
     onClick={()=>action('fathomAdvance',id,chosen.slot)}><b>Practise</b></Button></div>
  </div>}
  <RulesDialog open={info} onOpenChange={setInfo}/>
 </article>;
}
