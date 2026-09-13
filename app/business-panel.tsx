import BusinessScene from './inn-business-scene';
import {useState} from 'react';
import {BUSINESSES} from '@/lib/businesses.mjs';

// The building sheet itself now lives in BusinessScene: hire, quality, Fellow assignment and the
// disclosures are all on one panel there, the way the original does it. This component is only the
// entry point page.tsx imports, keeping the selected-business state when the caller does not own it.
export default function BusinessPanel({game,action,locked,selectedBusiness,onBusinessSelect,onApothecary}:any){
 const [localSelected,setLocalSelected]=useState(BUSINESSES[0].id);
 const selected=selectedBusiness??localSelected,setSelected=onBusinessSelect??setLocalSelected;
 return <BusinessScene id={selected} game={game} action={action} locked={locked} onApothecary={onApothecary} onBusinessSelect={setSelected}/>;
}
