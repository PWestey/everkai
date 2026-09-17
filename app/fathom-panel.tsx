import {useState} from 'react';
import {Lock} from 'lucide-react';
import {countryIcon} from '@/lib/ui-sprites.mjs';
const TYPES=['Inspiring','Diligent','Brave','Informed','Unfettered'];
import {Button} from '@/components/ui/button';
import {FATHOM_SLOTS,FATHOM_STEPS,MAX_TIER,FATHOM_DAILY_MAX,ACTIONS_PER_SLOT,openSlots,slotTier,fathomBonus,habitActions,fathomState,fathomsApply} from '@/lib/fathoms.mjs';
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
  <details className="rules-note"><summary>About Fathoms</summary><p>The original rolls each slot against a weighted table and keeps the result only when it beats the current one. Everkai advances one tier at a time from habits instead, so progress is monotonic and legible with no frustration RNG. Kept from the original: the 36 slots, their fixed country cycle, the intimacy gates and the +1% to +25% tier range. A slot also needs cumulative habit actions, which cannot be bought — intimacy alone is purchasable and would open the whole ladder at once. Bonuses shown here are this whole family's contribution, not this member’s alone. Each practice raises one open Fathom by a tier, and each Fathom adds its tier as a percentage to matching village earnings. Fathoms never go down and cost no gold.</p></details>
 </article>;
}
