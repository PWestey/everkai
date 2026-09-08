import {totalRate} from '@/lib/game.mjs';
import itemArt from '@/lib/item-art.mjs';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {CONSUMABLES} from '@/lib/adventure.mjs';
import {FAMILY} from '@/lib/catalog.mjs';
import {usableCount,consumableAmount,consumableLabel} from '@/lib/consumables.mjs';
export default function ConsumableShelf({game,action,locked,familyId=null}:any){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0),[recipient,setRecipient]=useState('');
 const family=FAMILY.filter(f=>game.family[f.id]),selected=familyId|| (family.some(f=>f.id===recipient)?recipient:family[0]?.id||'');
 const items=CONSUMABLES.filter(i=>(!familyId||i.target==='family')&&(i.name+' '+i.description).toLowerCase().includes(query.toLowerCase())),pages=Math.max(1,Math.ceil(items.length/2)),current=Math.min(page,pages-1);
 return <><Input aria-label="Find consumable supplies" type="search" placeholder="Find stones, gifts or earnings cards…" value={query} onChange={e=>{setQuery(e.target.value);setPage(0)}}/>{!familyId&&<><label htmlFor="supply-recipient">Gift recipient</label><NativeSelect id="supply-recipient" value={selected} disabled={locked||!family.length} onChange={e=>setRecipient(e.target.value)}>{!family.length&&<NativeSelectOption value="">Welcome family first</NativeSelectOption>}{family.map(f=><NativeSelectOption key={f.id} value={f.id}>{f.name}</NativeSelectOption>)}</NativeSelect></>}
 {items.slice(current*2,current*2+2).map(i=>{const available=usableCount(game,i,selected,totalRate(game));return <article className="school-card" key={i.id}><div className="identity">{itemArt[i.id as keyof typeof itemArt]&&<img className="item-icon" src={itemArt[i.id as keyof typeof itemArt]} alt="" width="64" height="64"/>}<h3>{i.name}</h3><strong>×{game.inventory[i.id].toLocaleString()}</strong></div><p>{i.description}</p>{i.stat==='gold'&&<p>Now: +{consumableAmount(i,totalRate(game)).toLocaleString()} gold per card</p>}{i.target==='family'&&game.family[selected]&&<p>For {family.find(f=>f.id===selected)?.name} · {game.family[selected][i.stat].toLocaleString()} {consumableLabel(i)}</p>}<div className="consumable-actions">{([1,10,'all'] as const).map(count=><Button key={count} disabled={locked||!available} onClick={()=>action('useConsumable',i.id,{count,recipient:selected})}>Use {count==='all'?`all (${available.toLocaleString()})`:count}</Button>)}<Button variant="outline" disabled={locked||game.inventory[i.id]>=1e6} onClick={()=>action('claimConsumable',i.id)}>Take 10 · Sandbox</Button></div></article>})}
 {!items.length&&<p>No supplies match.</p>}<nav className="album-pagination" aria-label="Supply pages"><Button variant="outline" disabled={!current} onClick={()=>setPage(current-1)}>Previous</Button><span>{current+1} / {pages}</span><Button variant="outline" disabled={current===pages-1} onClick={()=>setPage(current+1)}>Next</Button></nav><p className="small-note">Effects match the original item descriptions. Free supply grants are sandbox settings. Earnings cards use your current sandbox income, rounded down to whole gold per card. Bulk use stops before the stat limit and leaves unused items in your bag.</p></>;
}
