import {Button} from '@/components/ui/button';
import {latencyLevel,latencyCap,latencyCount,latencyFill,latencyWeightRow,latencyNextLevel,
        latencyBonus,latencyTotalAlternate,latencyApply,luckStones,luckStonesEarned,
        LATENCY_CAP_LEVEL,STIMULATE_COST,STIMULATE_TEN_X,STONES_PER_ACTION,
        LATENCY_UNMODELLED} from '@/lib/latency.mjs';
/** FAMILY LATENCY -- the original's WifePotential, which Everkai did not have at all. A cap raised by
 *  Intimacy and a fill raised by a paid roll; the fill, summed over the whole family, is added to
 *  every building's earnings. Plain by design; the visual pass is a separate batch. */
export default function LatencyPanel({id,game,action,locked}:any){
 const member=game.family?.[id];
 if(!member)return <p className="small-note item-status">Welcome this family member to open her Latency.</p>;
 if(!latencyApply(id))return <p className="small-note item-status">Latency is the village’s own tradition — the original’s Family table has no record for this companion, so there is nothing to port. Fathoms work the same way.</p>;
 const level=latencyLevel(game,id),cap=latencyCap(game,id),count=latencyCount(game,id);
 const fill=latencyFill(game,id),row=latencyWeightRow(fill),next=latencyNextLevel(game,id);
 const stones=luckStones(game),account=latencyBonus(game),alternate=latencyTotalAlternate(game);
 const tenX=level>=STIMULATE_TEN_X;
 const full=cap>0&&count>=cap;
 return <section className="school-card"><h3>Latency · +{(count/100).toLocaleString()}% of +{(cap/100).toLocaleString()}%</h3>
  <p>Luck Stones: {stones.toLocaleString()} · earned {luckStonesEarned(game).toLocaleString()} from habit actions at {STONES_PER_ACTION} each</p>
  <div className="training-option"><div>
   <strong>Cap · level {level}/{LATENCY_CAP_LEVEL}</strong>
   {next
    ?<p>Next: +{(next.cap/100).toLocaleString()}% · needs Intimacy {next.intimacy.toLocaleString()} (she has {next.have.toLocaleString()}){next.stones?` and ${next.stones} Luck Stone${next.stones===1?'':'s'}`:' · free'}</p>
    :<p>This Latency is as wide as the original allows.</p>}
  </div>
  <Button disabled={locked||!next||!next.met||stones<(next?.stones??0)} onClick={()=>action('latencyLevel',id)}>
   {next?`Widen to +${(next.cap/100).toLocaleString()}%`:'At the top'}</Button></div>
  <div className="training-option"><div>
   <strong>Stimulate · {(row?.success??0)/100}% success</strong>
   <p>The bar is {(fill/100).toFixed(1)}% full, and the original reads the chance off exactly that: 80% below a quarter full, 50% below half, 25% below three quarters, 10% above</p>
   <p>A success adds +1%, +2% or +4% at weights 7000 / 2000 / 1000 — a mean of +1.5 points a success. {STIMULATE_COST} Luck Stones a try.</p>
   {full&&<p>This Latency is full. Widen the cap to keep stimulating.</p>}
   {!tenX&&<p className="small-note">The original opens ×10 Stimulate at cap level {STIMULATE_TEN_X}.</p>}
  </div>
  <div className="business-actions">
   <Button disabled={locked||full||!cap||stones<STIMULATE_COST} onClick={()=>action('latencyStimulate',id,1)}>Stimulate · {STIMULATE_COST} stones</Button>
   <Button disabled={locked||full||!cap||!tenX||stones<STIMULATE_COST*10} onClick={()=>action('latencyStimulate',id,10)}>Stimulate ×10 · {STIMULATE_COST*10} stones</Button>
  </div></div>
  <p><strong>Across the whole family: +{(account*100).toLocaleString(undefined,{maximumFractionDigits:2})}% to every building’s earnings.</strong> The original sums this over every member, so each one you raise raises all seventeen businesses again.</p>
  <p className="small-note">If the original had instead shown one shared bar rather than a per-member sum, the same save would be worth +{(alternate*100).toLocaleString(undefined,{maximumFractionDigits:2})}% — its largest single member. Everkai pays the sum, which is what the client’s own GetAllWifeBuildingPotential computes.</p>
  <details className="rules-note"><summary>About these rules</summary>
   <p>Every number here is the original’s: 41 cap steps of +2% each from 0% to +800%, gated on Intimacy from 2,000 to 50,000 and costing one Luck Stone a step; success chances of 80% / 50% / 25% / 10% read off how full the bar already is; gains of +1% / +2% / +4% at weights 7000 / 2000 / 1000; and {STIMULATE_COST} Luck Stones a Stimulate. The roll is seeded and its result is saved, so reloading cannot re-roll it.</p>
   <p>Luck Stones are this project’s only invented number here. The original buys them in the Drakenberg Challenge shop, and that shop’s stock is not in the recovered data, so they come from habit actions instead — the same counter that opens Fathom slots, at {STONES_PER_ACTION} stones an action.</p>
   <p>One column of the original’s table is deliberately not modelled: <code>outputRiseFixed</code> is {LATENCY_UNMODELLED.outputRiseFixed} on all 41 rows. A column that never changes is evidence it is not what its name suggests, and nothing readable says what it does, so it is recorded rather than guessed at.</p>
  </details></section>;
}