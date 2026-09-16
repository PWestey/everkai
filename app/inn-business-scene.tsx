import {originalProgression} from '@/lib/original-progression.mjs';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {BUSINESSES,businessCost,enterpriseState,enterpriseBreakdown,employeeRateFor,operationSlots,hireQuote,sourceEmployeeYield} from '@/lib/businesses.mjs';
import {staffingStatus,staffingRule,enterpriseQuality,defaultQualityBonus,QUALITY_MAX} from '@/lib/staffing.mjs';
import {fellowOperation} from '@/lib/operations.mjs';
import {innGiftEmployeePercent} from '@/lib/inn-guests.mjs';
import {fishingEmployeeBonus} from '@/lib/fishing.mjs';
import {fellowById} from '@/lib/catalog.mjs';
import {wardrobeAppearance} from '@/lib/wardrobe.mjs';
import art from '@/lib/village-map-data.json';
import PaidStaffing from './paid-staffing';
import HireCardPanel from './hire-card-panel';
import FellowPicker from './fellow-picker';
import InnPanel from './inn-panel';
import {SystemMenus} from './panel-pages';

// ONE SHEET. The original manages a building on a single scrolling panel -- hire, level, service
// level and Fellow assignment all visible at once, each control carrying its own cost and progress.
// This scene used to show a summary and then reopen the SAME information in a nested "Operation"
// dialog, so everything was presented twice in two different shapes. The dialog is gone; its
// controls live here. Growth and Service remain as genuinely separate sub-screens.
// The `.inn-*` class names are historical and building-agnostic, so they are reused rather than renamed.
const buildings=art.buildings as Record<string,{src:string}>;
const num=(n:number)=>Number.isFinite(n)?n.toLocaleString(undefined,{maximumFractionDigits:0}):'Beyond the ledger';

export default function BusinessScene({game,action,locked,id='Building_101',onApothecary,onBusinessSelect}:any){
 const [panel,setPanel]=useState<string|null>(null),[picking,setPicking]=useState(false),[batch,setBatch]=useState(1);
 const definition=BUSINESSES.find((d:any)=>d.id===id)!;
 const b=enterpriseState(game)[id],rates=enterpriseBreakdown(game,id);
 const paid=b&&originalProgression(game)?staffingStatus(id,b):null;
 const cost=businessCost(id),sprite=buildings[id];
 const quote=b?hireQuote(game,id,batch):null;
 const slots=b?operationSlots(b.employees):0;
 // SL1-04. Quality used to render only when `paid` (i.e. only under APK growth), so a default save
 // showed no quality row at all and `upgradeStaffQuality` had no button anywhere -- the ladder was
 // unreachable in the UI as well as in the state. Both modes now read one pair of values.
 const quality=b?paid?paid.quality:enterpriseQuality(id,b):0;
 const qualityEarnings=b?paid?paid.bonus:defaultQualityBonus(id,b):0;
 const nextQuality=b&&quality<QUALITY_MAX?staffingRule(id,quality+1):null;
 const rise=nextQuality?(nextQuality.yieldRise-staffingRule(id,quality).yieldRise)/100:0;
 const stock=game.staffingMaterials?.stock||0,stepCost=b&&quality<QUALITY_MAX?staffingRule(id,quality).cost:0;
 const assigned:string[]=b?.fellows??[];
 const tabs=['Growth',...(id==='Building_101'?['Service']:[])];

 return <section className="inn-business-scene" aria-label={definition.name+' business'}>
  <div className="inn-exterior"><h2>{definition.name}</h2>{sprite&&<img src={'./assets/'+sprite.src} alt={definition.name}/>}</div>
  <div className="inn-operation">
   {onBusinessSelect&&<><label className="sr-only" htmlFor="scene-business">Village business</label>
    <NativeSelect id="scene-business" value={id} onChange={(e:any)=>onBusinessSelect(e.target.value)}>{BUSINESSES.map((d:any)=><NativeSelectOption key={d.id} value={d.id}>{d.name}{enterpriseState(game)[d.id]?' · Open':''}</NativeSelectOption>)}</NativeSelect></>}

   <div className="inn-summary">
    <div><span>Earnings</span><strong>{(rates?.total||0).toLocaleString(undefined,{maximumFractionDigits:1})} /s</strong></div>
    <div><span>Employees</span><strong>{(b?.employees||0).toLocaleString()}{paid?<small> / {num(paid.cap)}</small>:null}</strong></div>
   </div>

   {!b
    ? <Button disabled={locked||cost===null||game.gold<cost} onClick={()=>action('openEnterprise',id)}>{cost===null?'No opening price recorded':`Open ${definition.name} · ${cost.toLocaleString()} gold`}</Button>
    : <>
      {/* One Hire button carrying its price, with a multiplier -- the original's pattern -- rather
          than a fixed set of quantities of which most are unaffordable and greyed out. */}
      <div className="inn-hire-row">
       {[1,10,50].map(n=><Button key={n} variant={batch===n?'default':'outline'} aria-pressed={batch===n} onClick={()=>setBatch(n)}>&times;{n}</Button>)}
      </div>
      <div className="inn-hire-row">
       <Button disabled={locked||!quote?.affordable} onClick={()=>action(paid?'paidStaffHire':'hireEmployees',id,batch)}>
        Hire +{quote?.count?.toLocaleString()??0} · {!quote?.count?'Limit reached':num(quote.price)+' gold'}
       </Button>
      </div>

      <div className="inn-quality-row">
       <span>{definition.type?`${definition.type} · ${employeeRateFor(game,definition)} gold/s each`:'Building growth'}</span>
       <Button className="advancement-button" onClick={()=>setPanel('Growth')}>Improve</Button>
      </div>

      <div className="inn-quality-row">
       <span>Quality Lv. {quality} · earnings {num(qualityEarnings*100)}%{nextQuality?` (next ${num(qualityEarnings*100+rise)}%)`:''} · staff limit {num(Math.max(5000,staffingRule(id,quality).cap))}</span>
       {nextQuality
        ? <Button className="advancement-button" disabled={locked||stock<stepCost} onClick={()=>action('upgradeStaffQuality',id)}>
           Level Up · {num(stock)}/{num(stepCost)}
          </Button>
        : <span>Final quality</span>}
      </div>
      {/* The materials faucet was reachable only inside the APK-growth panel, so the button that pays
          for the row above did not exist in a default save either. */}
      <div className="inn-quality-row">
       <span>Building materials · {num(stock)}</span>
       <Button variant="outline" disabled={locked} onClick={()=>action('claimStaffingMaterials')}>Collect today&rsquo;s materials</Button>
      </div>

      {id==='Building_201'&&onApothecary&&<Button variant="outline" onClick={onApothecary}>Open potion counter</Button>}

      {/* Portrait slots that open a picker, instead of a dropdown plus a sentence recomputing the
          bonus for whichever option happened to be highlighted. */}
      <div className="inn-operators">
       <span>Operating Fellows · {assigned.length}/{slots} · earnings +{Math.round(assigned.reduce((n,f)=>n+fellowOperation(game,f,definition).percent,0))}%</span>
       <div>
        {Array.from({length:slots},(_,i)=>{
         const f=assigned[i];
         if(!f)return <Button key={'empty'+i} variant="outline" disabled={locked} aria-label="Assign a Fellow" onClick={()=>setPicking(true)}>+</Button>;
         const p=wardrobeAppearance(game,fellowById(f));
         return <button key={f} aria-label={'Change '+p.name} disabled={locked} onClick={()=>setPicking(true)}><img src={'./assets/'+p.portrait} alt={p.name}/></button>;
        })}
       </div>
      </div>

      <details className="rules-note"><summary>Earnings breakdown</summary>
       <p>Employees {num(rates.employees)} gold/s · whole-roster Power {rates.operation.toLocaleString(undefined,{maximumFractionDigits:3})} gold/s</p>
       <p>Bonus {num(rates.bonus*100)}% — operation {num(((rates.bonus||0)-(rates.qualityBonus||0)-(rates.familyBonus||0)-(rates.farmBonus||0))*100)}%, quality {num((rates.qualityBonus||0)*100)}%, Family Fathoms {num((rates.familyBonus||0)*100)}%, Magic Tree {num((rates.farmBonus||0)*100)}%.</p>
       {originalProgression(game)&&<p>Future hires {sourceEmployeeYield(id)} gold/s each; existing employees keep their earlier rate.</p>}
       <p>Legacy base {definition.employeeRate} + {fishingEmployeeBonus(game,definition.type)} Fishing; +{innGiftEmployeePercent(game,definition.type)}% Inn treasure bonus.</p>
      </details>
      <details className="rules-note"><summary>Hire Cards</summary><HireCardPanel game={game} action={action} locked={locked}/></details>
      <details className="rules-note"><summary>Business rules</summary>
       <p>Names and prices match the readable APK; employee cost follows the original&rsquo;s own curve, which climbs steeply. Each Fellow works in one business, and moving one leaves its previous job vacant. Documented Fifi and Amaterasu bonuses apply to matching businesses; other operation skills are unverified, so most Fellows show +0%.</p>
      </details>
      <FellowPicker game={game} action={action} business={definition} slots={slots} open={picking} locked={locked} onClose={()=>setPicking(false)}/>
      </>}

   <nav className="inn-bottom-actions" aria-label={definition.name+' activities'}>{tabs.map(name=><Button key={name} variant="outline" onClick={()=>setPanel(name)} disabled={!b&&name==='Growth'}>{name}</Button>)}</nav>
  </div>
  <Dialog open={!!panel} onOpenChange={(open:boolean)=>{if(!open)setPanel(null)}}><DialogContent className="stage-detail-sheet"><DialogTitle>{definition.name} · {panel}</DialogTitle><DialogDescription>Manage your {definition.name}</DialogDescription><SystemMenus name="">{panel==='Service'?<InnPanel game={game} action={action} locked={locked}/>:<PaidStaffing game={game} id={id} action={action} locked={locked}/>}</SystemMenus></DialogContent></Dialog>
 </section>;
}
