import {Coins,Diamond,Settings} from 'lucide-react';
import {Button} from '@/components/ui/button';
const compact=(value:number)=>new Intl.NumberFormat('en-US',{notation:'compact',maximumFractionDigits:1}).format(value);
export default function GameResources({gold,crystals,income,onSettings}: {gold:number,crystals:number,income:number,onSettings?:()=>void}){
 return <header className="game-resources"><h1 className="sr-only">Isekai Private Village</h1><div className="resource-pill" title={income.toLocaleString()+' gold per second'}><img src="./assets/menu/building.png" alt=""/><span className="sr-only">Earnings </span><strong>{compact(income)}/s</strong></div><div className="resource-pill" title={gold.toLocaleString()+' gold'}><Coins aria-hidden="true"/><span className="sr-only">Gold </span><strong>{compact(gold)}</strong></div><div className="resource-pill" title={crystals.toLocaleString()+' crystals'}><Diamond aria-hidden="true"/><span className="sr-only">Crystals </span><strong>{compact(crystals)}</strong></div>{onSettings&&<Button className="resource-settings" variant="ghost" aria-label="Save and offline settings" onClick={onSettings}><Settings size={18}/></Button>}</header>;
}
