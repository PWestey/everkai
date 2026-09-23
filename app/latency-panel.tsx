import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {InfoDot} from './fellow-shell';
import {QuantityPicker,PrimaryAction,Step,type Quantity} from './original-controls';
import {latencyLevel,latencyCap,latencyCount,latencyFill,latencyWeightRow,latencyNextLevel,
        latencyApply,luckStones,STIMULATE_COST,STIMULATE_TEN_X} from '@/lib/latency.mjs';
/** FAMILY LATENCY, rebuilt to docs/family-screen-specs/06-latency.md.
 *
 *  This was the wordiest screen in Everkai's Family surface: ~410 words -- a stones line, two
 *  `training-option` blocks with seven <p> between them, two account-total paragraphs and a
 *  three-paragraph `rules-note`. The original's carries NINETEEN on the panel and forty-one behind
 *  one `(i)`. Every rule it dropped is still true; it is drawn instead of written:
 *
 *  CONVENTION 14 -- THE MEDALLION'S COLOUR IS THE NUMBER. The success rate is a function of how full
 *  the bar is (`WifePotentialWeight`'s fillRatio columns, which is why the original says "when the
 *  current bonus is approaching the cap" rather than naming a level). The drop is drawn in the
 *  quartile's colour and the rate text matches it, so four sentences of "80% below a quarter full,
 *  50% below half..." become one tinted shape plus a four-line colour key in the `(i)`.
 *
 *  CONVENTION 15 -- A LOCKED THING KEEPS ITS SHAPE. The locked state is the SAME drop, greyed, with
 *  one gate line under it. Not a paragraph explaining what Latency would be.
 *
 *  MOVED OUT, not deleted: the `Across the whole family: +N%` total and the `if the original had
 *  shown one shared bar` counterfactual. The first belongs on a roster-level overview (spec 12) --
 *  a per-member panel is the wrong place to print an account total. The second is a research note
 *  and already lives in docs/character-systems-gap.md.
 *
 *  Nothing here changes what Stimulate costs, what it rolls, or what a cap raise requires. */

const pct=(raw:number)=>(raw/100).toLocaleString('en-US',{maximumFractionDigits:2})+'%';
/** The original's own key, from the `(i)`: Green 80% / Blue 50% / Purple 25% / Multicolor 10%. */
const TONES:[number,string,string][]=[[8000,'green','Green'],[5000,'blue','Blue'],[2500,'purple','Purple'],[1000,'multi','Multicolor']];
const toneOf=(success:number)=>TONES.find(([at])=>success>=at)?.[1]||'multi';

/** The `(i)`: two blocks, the outcomes and the rate key, each rate line in its own colour. Both are
 *  read back from `LATENCY_WEIGHTS` so the popover and the roll cannot drift. */
function ResultsDialog({open,onOpenChange,row}:any){
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="breakdown-dialog">
  <DialogTitle>Possible Results</DialogTitle>
  <DialogDescription className="sr-only">What a Stimulate can roll, and how the success rate is read.</DialogDescription>
  <ul className="result-list">
   <li><span>Fail:</span><b>No Changes</b></li>
   {row.results.map(([gain]:[number,number],i:number)=>
    <li key={gain}><span>{['Success:','Great Success:','Super Success:'][i]||'Success:'}</span><b className="gain">+{gain/100} %</b></li>)}
  </ul>
  <p className="band-rule">&#9671; Success Rate &#9671;</p>
  <p>Success rate will change when the current bonus is approaching the cap.</p>
  <ul className="result-list">{TONES.map(([at,tone,name])=>
   <li key={tone}><b className={'rate-'+tone}>{name}: {at/100}%</b></li>)}</ul>
 </DialogContent></Dialog>;
}

/** The `^` opens this: a two-column old-vs-new table, then the requirement as an INCREMENT, then one
 *  green button. The original states `Increase (heart)290 to obtain develop chances` rather than
 *  `needs Intimacy 14,000 (she has 13,710)`, and the increment is the better reading of the same two
 *  numbers Everkai already holds.
 *
 *  NOT PORTED: `Current Develop Chances: N`. That is a stored per-member counter in the original and
 *  Everkai has none -- it gates a cap raise directly on Intimacy plus one Luck Stone. Inventing a
 *  counter would be a mechanic, so the real gates are shown in its place. */
function CapDialog({open,onOpenChange,game,id,cap,next,action,locked}:any){
 const stones=luckStones(game),short=next?Math.max(0,next.intimacy-next.have):0;
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="breakdown-dialog">
  <DialogTitle>Increase Latency Cap</DialogTitle>
  <DialogDescription className="sr-only">Raise how far this member&rsquo;s Latency can be stimulated.</DialogDescription>
  <table className="pair-table"><tbody>
   <tr><th scope="row">Latency Cap</th><td>{next?<Step from={pct(cap)} to={pct(next.cap)} arrow="&raquo;"/>:pct(cap)}</td></tr>
   <tr><th scope="row">Latency Bonus</th><td>{next?<b className="gain">Village Earnings+{pct(next.cap-cap)}</b>:'At the top'}</td></tr>
  </tbody></table>
  {next
   ?<><p className="gate-line">{short?<>Increase <b className="need">&#9829;{short.toLocaleString('en-US')}</b> to raise the cap</>:<>Ready to raise</>}</p>
     {next.stones?<p className="gate-line">Luck Stones: <b className={stones<next.stones?'need':'gain'}>{stones.toLocaleString('en-US')}</b>/{next.stones}</p>:null}
     <Button className="primary-action" disabled={locked||!next.met||stones<next.stones} onClick={()=>{action('latencyLevel',id);onOpenChange(false)}}><b>Improve</b></Button></>
   :<p className="gate-line">This Latency is as wide as the original allows.</p>}
 </DialogContent></Dialog>;
}

export default function LatencyPanel({id,game,action,locked}:any){
 const [quantity,setQuantity]=useState<Quantity>(1),[info,setInfo]=useState(false),[capOpen,setCap]=useState(false);
 const member=game.family?.[id];
 // A member with no WifePotential record keeps no sub-tab at all (app/family-training.tsx drops it,
 // as the original drops the Stella tab), so the 44-word "there is nothing to port" paragraph goes.
 if(!member||!latencyApply(id))return null;
 const level=latencyLevel(game,id),cap=latencyCap(game,id),count=latencyCount(game,id);
 // latencyWeightRow always lands on a band (its own `|| .at(-1)` fallback), but the table is loaded
 // from JSON so its type admits undefined; the quartile is resolved once, here, and never re-derived.
 const row:any=latencyWeightRow(latencyFill(game,id)),next=latencyNextLevel(game,id);
 const success:number=row?.success??0,stones=luckStones(game),tone=toneOf(success);
 // The unlock gate is the CURRENT level's row, which latencyNextLevel already resolved -- LATENCY_LEVELS[1]
 // is the gate for the SECOND step, and reading it here showed 2,500 where the original shows 2,000.
 const gate:number=next?.intimacy??0;
 const unlocked=cap>0,full=unlocked&&count>=cap,tenX=level>=STIMULATE_TEN_X;
 const step=quantity===10?10:1,price=STIMULATE_COST*step;
 return <section className="latency-panel">
  <h3 className="sheet-title">Increase<br/>Latency</h3>
  {unlocked&&<div className="cap-plaque"><i aria-hidden="true">&#9671;</i><span>Latency Cap: {pct(cap)}</span>
   <button type="button" className={'cap-raise'+(next&&next.met&&stones>=next.stones?' cap-ready':'')} aria-label="Increase Latency Cap" onClick={()=>setCap(true)}>&#8593;</button></div>}
  <p className="one-line">Stimulate to increase village earnings. Increase the Latency cap to get extra bonuses.</p>
  <div className={'latency-drop drop-'+(unlocked?tone:'locked')} role="img"
   aria-label={unlocked?`Success rate ${success/100}%`:'Latency locked'}/>
  {unlocked?<>
   <p className="all-building">All Building Earnings: <b className="gain">+{pct(count)}</b></p>
   <p className="rate-line"><InfoDot label="Possible results and the success-rate key" onClick={()=>setInfo(true)}/>
    <span className={'rate-'+tone}>Success Rate: {success/100}%</span></p>
   <div className="spend-controls">
    <QuantityPicker value={quantity} onChange={setQuantity} allow={tenX?[1,10]:[1]} label="Stimulate quantity"/>
    {full
     ? <span className="inert-pill">Full</span>
     : <PrimaryAction verb={step>1?`Stimulate x${step}`:'Stimulate'} disabled={locked||stones<price}
        currency="Luck Stones" have={stones} cost={price} onClick={()=>action('latencyStimulate',id,step)}/>}
   </div>
  </>:<>
   <p className="gate-line"><b className="need">&#9829; Intimacy reaches {gate.toLocaleString("en-US")}</b> to unlock</p>
   <Button className="primary-action" disabled={locked||!next?.met} onClick={()=>setCap(true)}><b>Improve</b></Button>
  </>}
  {row&&<ResultsDialog open={info} onOpenChange={setInfo} row={row}/>}
  <CapDialog open={capOpen} onOpenChange={setCap} game={game} id={id} cap={cap} next={next} action={action} locked={locked}/>
 </section>;
}
