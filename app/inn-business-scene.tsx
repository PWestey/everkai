import {originalProgression} from '@/lib/original-progression.mjs';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {BUSINESSES,businessCost,enterpriseState,enterpriseBreakdown,operationSlots,hireQuote} from '@/lib/businesses.mjs';
import {staffingStatus,staffingPlan} from '@/lib/staffing.mjs';
import {fellowById} from '@/lib/catalog.mjs';
import {wardrobeAppearance} from '@/lib/wardrobe.mjs';
import art from '@/lib/village-map-data.json';
import PaidStaffing from './paid-staffing';
import InnPanel from './inn-panel';
import {SystemMenus} from './panel-pages';
// Every business gets the scene the Inn used to have alone: its own building art, a nameplate, a
// stat row and its actions -- rather than a page of prose. The `.inn-*` class names are historical;
// they were always building-agnostic, so they are reused rather than renamed across globals.css.
const buildings=art.buildings as Record<string,{src:string}>;
export default function BusinessScene({game,action,locked,management,id='Building_101',onApothecary,onBusinessSelect}:any){
 const [panel,setPanel]=useState<string|null>(null);
 const definition=BUSINESSES.find((d:any)=>d.id===id)!;
 const b=enterpriseState(game)[id],rates=enterpriseBreakdown(game,id);
 const paid=b&&originalProgression(game)?staffingStatus(id,b):null;
 const cost=businessCost(id),sprite=buildings[id];
 // The Inn's kitchen is Inn-only; the Apothecary has its own counter. Everything else is common.
 const tabs=['Growth',...(id==='Building_101'?['Service']:[]),'Operation'];
 return <section className="inn-business-scene" aria-label={definition.name+' business'}>
  <div className="inn-exterior"><h2>{definition.name}</h2>{sprite&&<img src={'./assets/'+sprite.src} alt={definition.name}/>}</div>
  <div className="inn-operation">
   {onBusinessSelect&&<><label className="sr-only" htmlFor="scene-business">Village business</label>
    <NativeSelect id="scene-business" value={id} onChange={(e:any)=>onBusinessSelect(e.target.value)}>{BUSINESSES.map((d:any)=><NativeSelectOption key={d.id} value={d.id}>{d.name}{enterpriseState(game)[d.id]?' · Open':''}</NativeSelectOption>)}</NativeSelect></>}
   <div className="inn-summary">
    <div><span>Earnings</span><strong>{(rates?.total||0).toLocaleString(undefined,{maximumFractionDigits:1})} /s</strong></div>
    <div><span>Employees</span><strong>{(b?.employees||0).toLocaleString()}</strong></div>
   </div>
   {!b
    ? <Button disabled={locked||cost===null||game.gold<cost} onClick={()=>action('openEnterprise',id)}>{cost===null?'No opening price recorded':`Open ${definition.name} · ${cost.toLocaleString()} gold`}</Button>
    : <><div className="inn-hire-row">{[1,10].map(n=>{const plan=paid?staffingPlan(game,id,n):null,q=paid?null:hireQuote(game,id,n);return <Button key={n} disabled={locked||(paid?(!plan?.count||(plan?.cost||0)>game.gold):!q?.affordable)} onClick={()=>action(paid?'paidStaffHire':'hireEmployees',id,n)}>Hire {paid?plan?.count:q?.count} · {(paid?(plan?.cost||0):(q?.price||0)).toLocaleString()} Gold</Button>})}</div>
      <div className="inn-quality-row"><span>{definition.type?definition.type+' · '+definition.employeeRate+' gold/s each':'Building growth'}</span><Button className="advancement-button" onClick={()=>setPanel('Growth')}>Improve</Button></div>
      {id==='Building_201'&&onApothecary&&<Button variant="outline" onClick={onApothecary}>Open potion counter</Button>}
      <div className="inn-operators"><span>Operating Fellows · {b.fellows.length}/{operationSlots(b.employees)}</span>
       <div>{b.fellows.map((f:string)=>{const p=wardrobeAppearance(game,fellowById(f));return <button key={f} aria-label={'Manage '+p.name} onClick={()=>setPanel('Operation')}><img src={'./assets/'+p.portrait} alt={p.name}/></button>})}<Button variant="outline" onClick={()=>setPanel('Operation')}>Assign</Button></div>
      </div></>}
   <nav className="inn-bottom-actions" aria-label={definition.name+' activities'}>{tabs.map(name=><Button key={name} variant="outline" onClick={()=>setPanel(name)} disabled={!b&&name==='Growth'}>{name}</Button>)}</nav>
  </div>
  <Dialog open={!!panel} onOpenChange={(open:boolean)=>{if(!open)setPanel(null)}}><DialogContent className="stage-detail-sheet"><DialogTitle>{definition.name} · {panel}</DialogTitle><DialogDescription>Manage your {definition.name}</DialogDescription><SystemMenus name="">{panel==='Growth'&&b?<PaidStaffing game={game} id={id} action={action} locked={locked}/>:panel==='Service'?<InnPanel game={game} action={action} locked={locked}/>:management}</SystemMenus></DialogContent></Dialog>
 </section>;
}
