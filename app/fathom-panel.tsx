import {useState} from 'react';
import {Lock} from 'lucide-react';
import {countryIcon} from '@/lib/ui-sprites.mjs';
const TYPES=['Inspiring','Diligent','Brave','Informed','Unfettered'];
import {Button} from '@/components/ui/button';
import {FATHOM_SLOTS,FATHOM_STEPS,MAX_TIER,FATHOM_DAILY_MAX,ACTIONS_PER_SLOT,openSlots,slotTier,fathomBonus,habitActions,fathomState,fathomsApply,fathomRollQuote,slotRolls} from '@/lib/fathoms.mjs';
import {luckStones} from '@/lib/luck-stones.mjs';
import {habitEarnings,habitDay} from '@/lib/habits.mjs';
// The ladder had no screen: fathomAdvance was dispatched in game.mjs and covered by tests, but no
// app path reached it, so the strand worth 30.4% of the original's building multiplier was
// unreachable in play. This panel is the missing door, not new rules -- every gate and number shown
// here is read back from lib/fathoms.mjs so the two cannot drift.
export default function FathomPanel({game,id,action,locked}:any){
 const [pick,setPick]=useState<number|null>(null);
 const member=game.family?.[id];
 if(!member)return <p>Welcome this family member to practise Fathoms.</p>;
 // Said plainly rather than shown as 0/36 open and a row of +0% type bonuses, which reads as a bug.
 if(!fathomsApply(id))return <article className="family-detail fathom-panel"><h2>Family Fathoms</h2>
  <p className="management-hint">Fathoms are the village’s own quenching tradition, and its {FATHOM_SLOTS.length} slots are recorded for the original cast only — this companion has no record in them, so she has no Fathoms to practise and adds nothing to the business bonuses.</p>
  <p>She supports the village through blessings, bonds, dates, trips and the school instead.</p></article>;
 const open=openSlots(game,id),actions=habitActions(game);
 const f=fathomState(game),today=habitDay(game.lastAt),{dailies}=habitEarnings(game.habits,game.lastAt);
 const allowance=Math.min(FATHOM_DAILY_MAX,dailies),used=f.day===today?f.used:0,left=Math.max(0,allowance-used);
 const firstOpen=FATHOM_SLOTS.find((s:any)=>s.slot<=open&&slotTier(game,id,s.slot)<MAX_TIER)?.slot??1,chosen:any=FATHOM_SLOTS.find((s:any)=>s.slot===pick)||FATHOM_SLOTS.find((s:any)=>s.slot===firstOpen)||FATHOM_SLOTS[0];
 const cTier=slotTier(game,id,chosen.slot),cOpen=chosen.slot<=open,cNeed=chosen.slot*ACTIONS_PER_SLOT-actions;
 // THE PAID ROLLS (2026-09-22). The original's own mechanic -- draw the weight column, keep only if
 // strictly better -- offered beside the free practice, never instead of it. Every number here is
 // read back from lib/fathoms.mjs so the panel and the rules cannot drift apart.
 const quote=fathomRollQuote(game,id,chosen.slot),tries=slotRolls(game,id,chosen.slot);
 const stones=luckStones(game);
 const chance=(key:'rateNormal'|'rateHigh')=>cTier>=MAX_TIER?0:(FATHOM_STEPS[cTier-1] as any)[key]/100;
 // One grid of 36 slot tiles and one detail bar, instead of 36 stacked rows (crawl 2026-09-15: 494 words,
 // 12 screens of scroll). Every number is still read from lib/fathoms.mjs.
 return <article className="family-detail fathom-panel"><h2>Family Fathoms</h2>
  <div className="fathom-head"><div className="habit-meter"><span>Open</span><progress value={open} max={FATHOM_SLOTS.length} aria-label="Fathoms open"/><b>{open}/{FATHOM_SLOTS.length}</b></div>
   <p className="fathom-practice" aria-label={`${left} practice left today`}>{Array.from({length:FATHOM_DAILY_MAX},(_,i)=><i key={i} data-on={i<left}/>)}<span>{left?`${left} practice left today`:allowance?'Practice used today':'Finish a daily habit to practise'}</span></p></div>
  <div className="fathom-types">{TYPES.map(type=><div key={type}>{countryIcon(type)&&<img src={countryIcon(type)!} alt=""/>}<span>{type}</span><strong>+{(fathomBonus(game,type)*100).toFixed(0)}%</strong></div>)}</div>
  <div className="fathom-grid" role="radiogroup" aria-label="Fathom slots">{FATHOM_SLOTS.map((slot:any)=>{const unlocked=slot.slot<=open,tier=slotTier(game,id,slot.slot),on=slot.slot===chosen.slot;return <button type="button" key={slot.slot} role="radio" aria-checked={on} className={'fathom-tile'+(unlocked?'':' locked')+(tier>=MAX_TIER?' maxed':'')} style={{'--fill':unlocked?tier/MAX_TIER:0} as any} aria-label={`Fathom ${slot.slot} · ${slot.type||'Every business'}${unlocked?` · tier ${tier} of ${MAX_TIER}`:' · locked'}`} onClick={()=>setPick(slot.slot)}>
   {slot.type&&countryIcon(slot.type)?<img src={countryIcon(slot.type)!} alt=""/>:<span className="fathom-all">All</span>}
   {unlocked?<b>{tier}</b>:<Lock aria-hidden="true"/>}
  </button>})}</div>
  <div className="fathom-detail"><div><strong>Fathom {chosen.slot} · {chosen.type||'Every business'}</strong>
   <small>{cOpen?`Tier ${cTier}/${MAX_TIER} · +${FATHOM_STEPS[cTier-1].percent}% earnings${cTier<MAX_TIER?` → +${FATHOM_STEPS[cTier].percent}%`:''}`:member.intimacy<chosen.intimacy?`Opens at Intimacy ${chosen.intimacy.toLocaleString()}`:`Opens after ${cNeed.toLocaleString()} more habit actions`}</small></div>
   {cOpen&&<Button disabled={locked||cTier>=MAX_TIER||!left} onClick={()=>action('fathomAdvance',id,chosen.slot)}>{cTier>=MAX_TIER?'Maxed':'Practise'}</Button>}</div>
  {cOpen&&<div className="training-option"><div>
   <strong>Fathom this slot · the original’s roll</strong>
   <p>Draw the tier table and keep the result only if it beats the +{FATHOM_STEPS[cTier-1].percent}% held. Rolled {tries.gold+tries.advanced} times{tries.advanced?` (${tries.advanced} advanced)`:''}.</p>
   <p>Gold · {chance('rateNormal')}% chance of something better · {Number.isFinite(quote.gold)?`${quote.gold.toLocaleString()} gold`:'past what the gold ledger can price'}{quote.premium?' (×3, all-buildings slot)':''}</p>
   <p>Advanced · {chance('rateHigh')}% chance of something better · {quote.stones} Luck Stone{quote.stones===1?'':'s'} · {stones.toLocaleString()} held</p>
  </div><div className="business-actions">
   <Button variant="outline" disabled={locked||cTier>=MAX_TIER||!quote.goldAffordable} onClick={()=>action('fathomRollGold',id,chosen.slot)}>Gold Fathom · {Number.isFinite(quote.gold)?quote.gold.toLocaleString():'—'}</Button>
   <Button variant="outline" disabled={locked||cTier>=MAX_TIER||!quote.stoneAffordable} onClick={()=>action('fathomRollAdvanced',id,chosen.slot)}>Advanced Fathom · {quote.stones} stone{quote.stones===1?'':'s'}</Button>
  </div></div>}
  <details className="rules-note"><summary>About Fathoms</summary><p>Kept from the original: the 36 slots, their fixed country cycle, the intimacy gates and the +1% to +25% tier range. A slot also needs cumulative habit actions, which cannot be bought — intimacy alone is purchasable and would open the whole ladder at once. Bonuses shown here are this whole family’s contribution, not this member’s alone, and each Fathom adds its tier as a percentage to matching village earnings.</p><p>There are now two ways to raise a slot, and Fathoms never go down under either. <b>Practise</b> is Everkai’s own: free, certain, one tier, three a day against your dailies. <b>Fathom</b> is the original’s: draw the tier table and keep the draw only if it beats what you hold. The chances shown are the original’s own stored numbers — at +21%, 0.32% on gold and 35% on advanced — and they are not stored as probabilities anywhere; they fall out of the weight columns only under keep-if-better, which is how the mechanic was recovered.</p><p>The gold price is the original’s 1,180-row ladder, indexed by how many times that slot has been rolled: 10 gold at the first and past this village’s gold limit by the 828th, so the gold route stalls near the top exactly as the original intends. Advanced Fathoms cost Luck Stones, the same stones Family Latency spends — in the original those two systems compete for one currency, and here they still do.</p></details>
 </article>;
}
