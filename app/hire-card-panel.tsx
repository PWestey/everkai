import {useState} from 'react';
import {Button} from '@/components/ui/button';
import {NativeSelect,NativeSelectOption} from '@/components/ui/native-select';
import {HIRE_CARDS,hireCardCount,hireTargets} from '@/lib/hire-cards.mjs';
export default function HireCardPanel({game,action,locked}:any){
 const [id,setId]=useState(HIRE_CARDS[0].id),card=HIRE_CARDS.find(c=>c.id===id)!,count=hireCardCount(game,id),eligible=hireTargets(game,card.amount);
 return <section><label htmlFor="hire-card-kind">Hire Card</label><NativeSelect id="hire-card-kind" value={id} onChange={e=>setId(e.target.value)}>{HIRE_CARDS.map(c=><NativeSelectOption key={c.id} value={c.id}>{c.name} · +{c.amount} employees</NativeSelectOption>)}</NativeSelect><h3>{card.name} · ×{count}</h3><p>{card.description}</p><p>{eligible.length} open businesses have room for the full effect.</p><div className="business-actions">{[1,10].map(n=><Button key={n} disabled={locked||!count||!eligible.length} onClick={()=>action('useHireCards',id,{count:n})}>Use {n}</Button>)}</div><p className="small-note">Each card picks an eligible original business at random. Batch use stops when none has room; remaining cards are kept. Uniform selection among open businesses and these capacity rules are local choices. The 1/3/5 employee effects come from the APK.</p></section>;
}
