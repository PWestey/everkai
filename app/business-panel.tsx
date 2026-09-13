import BusinessScene from './inn-business-scene';
import FellowPicker,{FellowSlots} from './fellow-picker';
import {originalProgression} from '@/lib/original-progression.mjs';
import {innGiftEmployeePercent} from '@/lib/inn-guests.mjs';
import {fishingEmployeeBonus} from '@/lib/fishing.mjs';
import {fellowOperation} from '@/lib/operations.mjs';
import {staffingStatus,staffingRule} from '@/lib/staffing.mjs';
import HireCardPanel from './hire-card-panel';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {BUSINESSES,businessCost,enterpriseState,enterpriseBreakdown,employeeRateFor,operationSlots,hireQuote,sourceEmployeeYield} from '@/lib/businesses.mjs';

// ONE SHEET, not five tabs. The original puts hiring, building level, service level and Fellow
// assignment on a single scrolling panel, with each control carrying its own cost and progress, and
// keeps its explanations behind an info button. This panel used to split the same information across
// Employees / Paid growth / Hire cards / Fellows / Earnings and printed ~200 words of provenance
// prose between the reader and the buttons. That prose now lives in the disclosures at the bottom.
const num=(n:number)=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:0}):'Beyond the ledger';

export default function BusinessPanel({game,action,locked,selectedBusiness,onBusinessSelect,onApothecary,plain=false}:any){
 const [localSelected,setLocalSelected]=useState(BUSINESSES[0].id),[picking,setPicking]=useState(false),[batch,setBatch]=useState(1);
 const selected=selectedBusiness??localSelected,setSelected=onBusinessSelect??setLocalSelected;
 const definition=BUSINESSES.find(b=>b.id===selected)!,rows=enterpriseState(game),b=rows[selected],rates=enterpriseBreakdown(game,selected);
 if(!plain)return <BusinessScene id={selected} game={game} action={action} locked={locked} onApothecary={onApothecary} onBusinessSelect={setSelected} management={<BusinessPanel plain game={game} action={action} locked={locked} selectedBusiness={selected}/>}/>;

 const quote=b?hireQuote(game,selected,batch):null;
 const status=b?staffingStatus(selected,b):null;
 const slots=b?operationSlots(b.employees):0;
 const nextQuality=status&&status.quality<26?staffingRule(selected,status.quality+1):null;
 const rise=nextQuality&&status?(nextQuality.yieldRise-staffingRule(selected,status.quality).yieldRise)/100:0;

 return <section><label htmlFor="original-business">Village business</label><NativeSelect id="original-business" value={selected} onChange={e=>setSelected(e.target.value)}>{BUSINESSES.map(d=><NativeSelectOption key={d.id} value={d.id}>{d.name}{rows[d.id]?' · Open':''}</NativeSelectOption>)}</NativeSelect>
  <h2>{definition.name}</h2>
  <p>{definition.type?`${definition.type} type`:'Type not yet verified'} · {b?.staffingYield?'Mixed retained and APK rates':`${employeeRateFor(game,definition)} gold/s per employee`}</p>
  {selected==='Building_201'&&onApothecary&&<Button variant="outline" onClick={onApothecary}>Open potion counter</Button>}

  {!b?<><p>{definition.description}</p><Button disabled={locked||game.gold<(businessCost(selected)??Infinity)} onClick={()=>action('openEnterprise',selected)}>{businessCost(selected)===null?'No opening price recorded':`Open · ${businessCost(selected)!.toLocaleString()} gold`}</Button></>:<>

  <div className="family-stats">
   <div><span>Employees</span><strong>{b.employees.toLocaleString()}{status?<small> / {num(status.cap)}</small>:null}</strong></div>
   <div><span>Fellows</span><strong>{b.fellows.length}/{slots}</strong></div>
   <div><span>Gold / second</span><strong>{rates.total.toLocaleString(undefined,{maximumFractionDigits:2})}</strong></div>
  </div>

  {/* Hire: one button with its price on it, and a multiplier, rather than six fixed quantities
      of which most are greyed out. */}
  <div className="op-row">
   <dl><dt>Employee earnings</dt><dd>{employeeRateFor(game,definition)} gold/s each</dd></dl>
   <div className="op-multiplier">{[1,10,50].map(n=><Button key={n} variant={batch===n?'default':'outline'} onClick={()=>setBatch(n)} aria-pressed={batch===n}>&times;{n}</Button>)}</div>
   <Button disabled={locked||!quote?.affordable} onClick={()=>action('hireEmployees',selected,batch)}>
    Hire +{quote?.count?.toLocaleString()??0}<br/><small>{!quote?.count?'Limit reached':num(quote.price)+' gold'}</small>
   </Button>
  </div>

  {status&&<div className="op-row">
   <dl>
    <dt>Quality</dt>
    <dd>Lv. {status.quality} <small>(Max: Lv. 26)</small></dd>
    <dt>Earnings rate</dt>
    <dd>{num(status.bonus*100)}% {nextQuality&&<span className="op-next">(Next: {num(status.bonus*100+rise)}%)</span>}</dd>
   </dl>
   {nextQuality&&<Button disabled={locked||(game.staffingMaterials?.stock||0)<staffingRule(selected,status.quality).cost} onClick={()=>action('upgradeStaffQuality',selected)}>
    Level Up<br/><small>{num(game.staffingMaterials?.stock||0)}/{num(staffingRule(selected,status.quality).cost)}</small>
   </Button>}
  </div>}

  {/* Fellows: portrait slots that open a picker, instead of a dropdown plus a sentence that
      recomputed the bonus for whichever option happened to be highlighted. */}
  <h3>Operating Fellows</h3>
  <FellowSlots game={game} business={definition} slots={slots} locked={locked} onOpen={()=>setPicking(true)}/>
  <p className="op-next">Earnings +{Math.round(b.fellows.reduce((n:number,id:string)=>n+fellowOperation(game,id,definition).percent,0))}%</p>
  <FellowPicker game={game} action={action} business={definition} slots={slots} open={picking} locked={locked} onClose={()=>setPicking(false)}/>

  <details className="rules-note"><summary>Earnings breakdown</summary>
   <p>Employee earnings: {num(rates.employees)} gold/s · whole-roster Power: {rates.operation.toLocaleString(undefined,{maximumFractionDigits:3})} gold/s</p>
   <p>Bonus {num(rates.bonus*100)}% — assigned operation {num(((rates.bonus||0)-(rates.qualityBonus||0)-(rates.familyBonus||0)-(rates.farmBonus||0))*100)}%, quality {num((rates.qualityBonus||0)*100)}%, Family Fathoms {num((rates.familyBonus||0)*100)}%, Magic Tree {num((rates.farmBonus||0)*100)}%.</p>
   <p>(Employee earnings + roster contribution) × {1+rates.bonus} = {rates.total.toLocaleString(undefined,{maximumFractionDigits:3})} gold/s</p>
   {originalProgression(game)&&<p>Future hires: {sourceEmployeeYield(selected)} base gold/s each. Existing employees keep their earlier rate.</p>}
   {b.staffingYield&&<p>Retained: {num(b.staffingYield.retainedEmployees)} × {b.staffingYield.retainedRate} · APK: {num(b.employees-b.staffingYield.retainedEmployees)} × {sourceEmployeeYield(selected)}.</p>}
   <p>Legacy base {definition.employeeRate} + {fishingEmployeeBonus(game,definition.type)} Fishing; +{innGiftEmployeePercent(game,definition.type)}% Inn treasure bonus.</p>
  </details>

  {/* Paid hiring & quality is NOT repeated here: the scene's "Improve" button already opens it as
      the Growth panel, and showing the same controls twice is the defect this rewrite exists to fix. */}
  <details className="rules-note"><summary>Hire Cards</summary><HireCardPanel game={game} action={action} locked={locked}/></details>

  <details className="rules-note"><summary>Business rules</summary>
   <p>Names and descriptions match the readable APK. Employee prices follow the original&rsquo;s own curve, which climbs steeply — later workers cost billions each. Legacy employee rates come from a community reference; APK-growth hires use recovered yields, preserving the older cohort.</p>
   <p>Each Fellow works in one business; moving one leaves its previous job vacant. Type restrictions are waived. Documented Fifi and Amaterasu bonuses apply to matching businesses; other operation skills remain unverified, so most Fellows currently show +0%. Whole-roster Power ÷ 1,000 follows community reports.</p>
   <p>Opening is free. New business earnings join the village total and offline earnings.</p>
  </details>
  </>}
 </section>;
}
