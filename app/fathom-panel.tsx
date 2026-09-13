import {Button} from '@/components/ui/button';
import {FATHOM_SLOTS,FATHOM_STEPS,MAX_TIER,FATHOM_DAILY_MAX,ACTIONS_PER_SLOT,openSlots,slotTier,fathomBonus,habitActions,fathomState} from '@/lib/fathoms.mjs';
import {habitEarnings,habitDay} from '@/lib/habits.mjs';
// The ladder had no screen: fathomAdvance was dispatched in game.mjs and covered by tests, but no
// app path reached it, so the strand worth 30.4% of the original's building multiplier was
// unreachable in play. This panel is the missing door, not new rules -- every gate and number shown
// here is read back from lib/fathoms.mjs so the two cannot drift.
export default function FathomPanel({game,id,action,locked}:any){
 const member=game.family?.[id];
 if(!member)return <p>Welcome this family member to practise Fathoms.</p>;
 const open=openSlots(game,id),actions=habitActions(game);
 const f=fathomState(game),today=habitDay(game.lastAt),{dailies}=habitEarnings(game.habits,game.lastAt);
 const allowance=Math.min(FATHOM_DAILY_MAX,dailies),used=f.day===today?f.used:0,left=Math.max(0,allowance-used);
 return <article className="family-detail"><h2>Family Fathoms</h2>
  <p>{open} of {FATHOM_SLOTS.length} Fathoms open · Intimacy {member.intimacy.toLocaleString()} · {actions.toLocaleString()} lifetime habit actions</p>
  <p className="management-hint">Each Fathom adds its tier as a percentage to matching village earnings. Practice is monotonic — a Fathom never goes down — and costs no gold. {left?`${left} practice left today.`:allowance?'Today’s practice is used.':'Complete a daily habit to practise.'}</p>
  <div className="family-stats">
   <div><span>Inspiring</span><strong>+{(fathomBonus(game,'Inspiring')*100).toFixed(0)}%</strong></div>
   <div><span>Diligent</span><strong>+{(fathomBonus(game,'Diligent')*100).toFixed(0)}%</strong></div>
   <div><span>Brave</span><strong>+{(fathomBonus(game,'Brave')*100).toFixed(0)}%</strong></div>
   <div><span>Informed</span><strong>+{(fathomBonus(game,'Informed')*100).toFixed(0)}%</strong></div>
   <div><span>Unfettered</span><strong>+{(fathomBonus(game,'Unfettered')*100).toFixed(0)}%</strong></div>
  </div>
  {FATHOM_SLOTS.map((slot:any)=>{
   const unlocked=slot.slot<=open,tier=slotTier(game,id,slot.slot);
   const scope=slot.type||'Every business';
   const needActions=slot.slot*ACTIONS_PER_SLOT-actions;
   return <div className="blessing-row" key={slot.slot}>
    <h3>Fathom {slot.slot} · {scope}{unlocked?` · Tier ${tier}/${MAX_TIER}`:''}</h3>
    {unlocked
     ? <><p>+{FATHOM_STEPS[tier-1].percent}% {slot.type?slot.type+' ':''}earnings{tier<MAX_TIER?` · next tier +${FATHOM_STEPS[tier].percent}%`:' · fully practised'}</p>
        <Button disabled={locked||tier>=MAX_TIER||!left} onClick={()=>action('fathomAdvance',id,slot.slot)}>{tier>=MAX_TIER?'Fully practised':'Practise · +1 tier'}</Button></>
     : <p>{member.intimacy<slot.intimacy
        ? `Locked · raise Intimacy to ${slot.intimacy.toLocaleString()}`
        : `Locked · ${needActions.toLocaleString()} more habit actions`}</p>}
   </div>;
  })}
  <details className="rules-note"><summary>About Fathoms</summary><p>The original rolls each slot against a weighted table and keeps the result only when it beats the current one. Everkai advances one tier at a time from habits instead, so progress is monotonic and legible with no frustration RNG. Kept from the original: the 36 slots, their fixed country cycle, the intimacy gates and the +1% to +25% tier range. A slot also needs cumulative habit actions, which cannot be bought — intimacy alone is purchasable and would open the whole ladder at once. Bonuses shown here are this whole family's contribution, not this member’s alone.</p></details>
 </article>;
}
