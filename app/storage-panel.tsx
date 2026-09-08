import inventoryIcons from '@/lib/inventory-icon-data.json';
import {giftIcon} from '@/lib/ui-sprites.mjs';
import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {CONSUMABLES,GEAR,MATERIALS} from '@/lib/adventure.mjs';
import {FAMILY,GIFTS} from '@/lib/catalog.mjs';
import {artifactRule} from '@/lib/artifacts.mjs';
import {usableCount,consumableAmount,consumableLabel} from '@/lib/consumables.mjs';
import {totalRate} from '@/lib/game.mjs';
import itemArt from '@/lib/item-art.mjs';
import display from '@/lib/inventory-display-data.json';
import SuppliesPanel from './supplies-panel';
import {SystemMenus} from './panel-pages';
const inventoryIcon=(id:string)=>(inventoryIcons as Record<string,any>)[id]?.src?'./assets/'+(inventoryIcons as Record<string,any>)[id].src:giftIcon(id)||itemArt[id as keyof typeof itemArt];
const categories=['Item','Events','Fragment','Combine'];
const registry:Record<string,any>=Object.fromEntries([...MATERIALS,...GEAR,...CONSUMABLES,...GIFTS].map(item=>[item.id,item]));
const short=(name:string)=>name.split(/\s+/).slice(0,2).map(w=>w[0]).join('');
export default function StoragePanel({game,action,locked,onNavigate}:any){
 const [category,setCategory]=useState('Item'),[selected,setSelected]=useState<string|null>(null),[shop,setShop]=useState(false),[shopPage,setShopPage]=useState(0),[recipient,setRecipient]=useState('');
 const source=display as Record<string,any>,family=FAMILY.filter(p=>game.family[p.id]),owner=family.some(p=>p.id===recipient)?recipient:family[0]?.id||'';
 const entries=Object.entries(game.inventory).filter(([,count])=>typeof count==='number'&&count>0).map(([id,count])=>({id,count:count as number,name:registry[id]?.name||source[id]?.name||id,rarity:artifactRule(id)?.rarity||source[id]?.rarity,activity:source[id]?.isActivity===true}));
 const visible=entries.filter(item=>category==='Item'?!item.activity:category==='Events'?item.activity:false);
 const item=selected?registry[selected]:null,consumable=CONSUMABLES.find(x=>x.id===selected),gift=GIFTS.find(x=>x.id===selected),gear=GEAR.find(x=>x.id===selected),count=selected?game.inventory[selected]||0:0;
 const available=consumable?usableCount(game,consumable,owner,totalRate(game)):0;
 const openShop=(page=0)=>{setShopPage(page);setShop(true)};
 return <section className="storage-screen" aria-label="Storage inventory">
  <div className="storage-summary"><span>{entries.length} kinds in your bag</span><Button variant="outline" onClick={()=>openShop()}>Supply shop</Button></div>
  <nav className="storage-tabs" aria-label="Inventory categories">{categories.map(name=><Button key={name} variant="ghost" aria-pressed={category===name} onClick={()=>setCategory(name)}>{name}</Button>)}</nav>
  <div className="storage-grid" aria-label={category+' inventory'}>{visible.map(entry=><button key={entry.id} className={'storage-item rarity-'+String(entry.rarity||'plain').toLowerCase()} aria-label={entry.name+', '+entry.count.toLocaleString()+' owned'} onClick={()=>setSelected(entry.id)}>
   {inventoryIcon(entry.id)?<img src={inventoryIcon(entry.id)} alt=""/>:<span className="item-monogram" aria-hidden="true">{short(entry.name)}</span>}
   <span className="storage-item-name">{entry.name}</span><strong className="storage-count">{entry.count.toLocaleString()}</strong>
  </button>)}</div>
  {!visible.length&&<p className="storage-empty">{category==='Combine'?'No combination recipes are available in this sandbox yet.':category==='Fragment'?'No supported fragments in your bag.':'Your '+(category==='Events'?'event ':'')+'bag is empty.'}</p>}
  <Dialog open={selected!==null} onOpenChange={open=>{if(!open)setSelected(null)}}><DialogContent className="item-detail-sheet"><DialogTitle>{item?.name||source[selected||'']?.name||selected}</DialogTitle><DialogDescription>{count.toLocaleString()} owned{(gear||source[selected||'']?.rarity)?' · Rarity '+(artifactRule(selected)?.rarity||source[selected||'']?.rarity):''}</DialogDescription>
   {selected&&inventoryIcon(selected)&&<img className="item-detail-art" src={inventoryIcon(selected)} alt=""/>}
   <p>{item?.description||item?.detail||(gift?`Adds ${gift.amount} ${gift.stat==='intimacy'?'Intimacy':'Blessing Power'}.`:'This item is kept in your bag.')}</p>
   {(gift||consumable?.target==='family')&&<label>Give to<NativeSelect aria-label="Item recipient" value={owner} onChange={e=>setRecipient(e.target.value)} disabled={locked||!family.length}>{!family.length&&<NativeSelectOption value="">Welcome family first</NativeSelectOption>}{family.map(p=><NativeSelectOption key={p.id} value={p.id}>{p.name}</NativeSelectOption>)}</NativeSelect></label>}
   {consumable&&<><p>Each: +{consumableAmount(consumable,totalRate(game)).toLocaleString()} {consumableLabel(consumable)}</p><div className="item-use-actions">{([1,10,'all'] as const).map(n=><Button key={n} disabled={locked||available<1} onClick={()=>action('useConsumable',selected,{count:n,recipient:owner})}>Use {n==='all'?'all ('+available.toLocaleString()+')':n}</Button>)}</div></>}
   {gift&&<Button disabled={locked||!owner||count<1} onClick={()=>action('gift',owner,gift.id)}>Gift</Button>}
   {gear&&<Button variant="outline" onClick={()=>{setSelected(null);openShop(1)}}>Manage equipment</Button>}
   {MATERIALS.some(m=>m.id===selected)&&<Button variant="outline" onClick={()=>{setSelected(null);onNavigate('fellows')}}>Train Fellows</Button>}
  </DialogContent></Dialog>
  <Dialog open={shop} onOpenChange={setShop}><DialogContent className="storage-shop-sheet"><DialogTitle>Supply shop</DialogTitle><DialogDescription>Supplies and free sandbox grants</DialogDescription><SystemMenus name=""><SuppliesPanel key={shopPage} initialPage={shopPage} game={game} action={action} locked={locked}/></SystemMenus></DialogContent></Dialog>
 </section>;
}
