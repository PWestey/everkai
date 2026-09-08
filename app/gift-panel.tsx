import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {GIFTS} from '@/lib/catalog.mjs';
import {giftIcon,GIFT_DISPLAY_ORDER} from '@/lib/ui-sprites.mjs';
export default function GiftPanel({game,person,action,locked}:any){
 const [selected,setSelected]=useState('gift1'),[quantity,setQuantity]=useState(1);
 const gift=GIFTS.find(g=>g.id===selected)!,member=game.family[person.id];
 const available=member?Math.max(0,Math.min(game.inventory[selected],Math.floor((1e6-member[gift.stat])/gift.amount))):0;
 return <section className="original-gift-panel"><nav className="gift-icon-grid" aria-label="Choose a gift">{GIFT_DISPLAY_ORDER.map(id=>{const g=GIFTS.find(g=>g.id===id)!;return <button key={id} aria-label={g.name} aria-pressed={id===selected} onClick={()=>{setSelected(id);setQuantity(1)}}><img src={giftIcon(id)!} alt=""/><strong>{game.inventory[id].toLocaleString()}</strong></button>})}</nav><div className="gift-description"><h3>{gift.name}</h3><p>Give to {person.name} · +{gift.amount} {gift.stat==='intimacy'?'Intimacy':'Blessing Power'} each</p></div><div className="gift-quantity"><label htmlFor="gift-quantity">Quantity</label><Input id="gift-quantity" aria-label="Gift quantity" type="number" inputMode="numeric" min="1" max={Math.max(1,available)} value={quantity} onChange={e=>setQuantity(Math.max(1,Math.min(1e6,Math.floor(Number(e.target.value)||1))))}/><Button variant="outline" disabled={locked||!available} onClick={()=>setQuantity(available)}>Max</Button></div><div className="item-use-actions"><Button disabled={locked||!available} onClick={()=>action('gift',person.id,selected)}>Gift</Button><Button disabled={locked||!available} onClick={()=>action('giftBatch',person.id,{giftId:selected,count:quantity})}>Batch Gift · {Math.min(quantity,available)}</Button></div><Button className="gift-purchase" variant="outline" disabled={locked||game.gold<gift.price||game.inventory[selected]>=1e6} onClick={()=>action('buyGift',selected)}>Buy {gift.name} · {gift.price} gold</Button></section>;
}
