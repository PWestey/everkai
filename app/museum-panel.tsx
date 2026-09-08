import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {KEEPSAKES,museumState,museumBonus,acceptedKeepsakes} from '@/lib/museum.mjs';
export default function MuseumPanel({game,action,locked,onRelics}:any){
 const [query,setQuery]=useState(''),[filter,setFilter]=useState('all'),[page,setPage]=useState(0);
 const accepted=acceptedKeepsakes(game),owned=museumState(game),bonus=museumBonus(game),count=Object.keys(owned).length;
 const items=KEEPSAKES.filter(k=>k.name.toLowerCase().includes(query.toLowerCase())&&(filter==='all'||filter==='bonuses'&&k.effect||filter==='owned'&&Object.hasOwn(owned,k.id)));
 const pages=Math.max(1,Math.ceil(items.length/2)),current=Math.min(page,pages-1);
 return <section><h2>Private Hall</h2>{onRelics&&<Button variant="outline" onClick={onRelics}>Visit excavated relics</Button>}<p>{count} / {KEEPSAKES.length} keepsakes collected · {accepted.length} accepted · {Object.values(owned).filter(Boolean).length} displayed</p>
 <p>Accepted bonuses: +{bonus.aptitude} Fellow Aptitude for Power · +{bonus.basicPowerPercent}% basic Power · +{bonus.powerPercent}% Power</p>
 <div className="business-actions"><Button disabled={locked||count===KEEPSAKES.length} onClick={()=>action('claimMuseum')}>Collect all · Free sandbox</Button><Button variant="outline" disabled={locked||accepted.length===count} onClick={()=>action('acceptMuseum')}>Accept collected keepsakes</Button><Button variant="outline" disabled={locked||!accepted.length} onClick={()=>action('displayMuseum')}>Display all</Button><Button variant="outline" disabled={locked||!count} onClick={()=>action('storeMuseum')}>Store all</Button></div>
 <Input aria-label="Find museum keepsakes" placeholder="Find a keepsake…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/>
 <nav className="panel-pages" aria-label="Museum filters">{[['all','All'],['bonuses','With bonuses'],['owned','Collected']].map(([id,label])=><Button key={id} variant="outline" aria-pressed={filter===id} onClick={()=>{setFilter(id);setPage(0)}}>{label}</Button>)}</nav>
 {items.slice(current*2,current*2+2).map(k=><article className="school-card" key={k.id}><h3>{k.name}</h3><p>{k.effect?`+${k.effect.amount}${k.effect.stat==='aptitude'?' Aptitude to all Fellows':k.effect.stat==='basicPowerPercent'?'% basic Fellow Power':'% Fellow Power'}`:'Collection keepsake · no bonus implemented'}</p><details><summary>Read the keepsake description</summary><p>{k.description}</p></details><Button disabled={locked} onClick={()=>action(!Object.hasOwn(owned,k.id)?'claimKeepsake':!accepted.includes(k.id)?'acceptKeepsake':'toggleKeepsake',k.id)}>{!Object.hasOwn(owned,k.id)?'Collect · Free sandbox':!accepted.includes(k.id)?'Accept keepsake':owned[k.id]?'Store keepsake':'Display keepsake'}</Button></article>)}
 {!items.length&&<p>No keepsakes match this selection.</p>}
 <div className="business-actions"><Button variant="outline" disabled={!current} onClick={()=>setPage(current-1)}>Previous</Button><span>{current+1} / {pages}</span><Button variant="outline" disabled={current>=pages-1} onClick={()=>setPage(current+1)}>Next</Button></div>
 <details className="rules-note"><summary>About Museum bonuses</summary><p>Six keepsakes have explicit numeric bonuses in the readable item text. Others remain collectibles. All 32 keepsakes map to the Private Hall. Accepted bonuses remain when a keepsake is stored; display is cosmetic. Free acquisition and bonus stacking are sandbox choices. Aptitude and basic Power bonuses apply before family bonuses; general Power applies afterward. Museum bonuses currently affect Power only. Original unlocks, upgrades and duplicate rewards are pending.</p></details></section>;
}
