import {useEffect,useRef} from 'react';
import {Lock} from 'lucide-react';
// A horizontal strip of tappable choices with art, replacing a dropdown where the choice is a person,
// fish, place or building (visual audit 2026-09-14: "forms instead of scene-led interaction"). The
// original game picks these from portrait rows, not menus. Keyboard: arrows move, like a radio group.
export type PickItem={id:string,name:string,img?:string|null,sub?:string,disabled?:boolean,lockNote?:string,muted?:boolean};
export default function PickStrip({label,items,value,onChange,shape='portrait'}:{label:string,items:PickItem[],value:string,onChange:(id:string)=>void,shape?:'portrait'|'square'|'chip'}){
 const box=useRef<HTMLDivElement>(null);
 useEffect(()=>{box.current?.querySelector<HTMLElement>('[aria-checked=true]')?.scrollIntoView({block:'nearest',inline:'center'})},[value]);
 const move=(dir:number)=>{const open=items.filter(x=>!x.disabled);const i=open.findIndex(x=>x.id===value);const next=open[(i+dir+open.length)%open.length];if(next){onChange(next.id);requestAnimationFrame(()=>box.current?.querySelector<HTMLElement>('[aria-checked=true]')?.focus())}};
 return <div className={'pick-strip pick-'+shape} role="radiogroup" aria-label={label} ref={box} onKeyDown={e=>{if(e.key==='ArrowRight'||e.key==='ArrowDown'){e.preventDefault();move(1)}if(e.key==='ArrowLeft'||e.key==='ArrowUp'){e.preventDefault();move(-1)}}}>
  {items.map(x=>{const on=x.id===value;return <button type="button" key={x.id} role="radio" aria-checked={on} tabIndex={on?0:-1} disabled={x.disabled} className={'pick'+(x.muted?' pick-muted':'')} onClick={()=>onChange(x.id)} aria-label={x.name+(x.sub?' · '+x.sub:'')+(x.disabled&&x.lockNote?' · '+x.lockNote:'')}>
   {x.img!==undefined&&<span className="pick-art">{x.img?<img src={'./assets/'+x.img} alt="" loading="lazy"/>:null}{x.disabled&&<span className="pick-lock"><Lock aria-hidden="true"/></span>}</span>}
   <span className="pick-name">{x.name}</span>{(x.disabled&&x.lockNote||x.sub)&&<span className="pick-sub">{x.disabled&&x.lockNote?x.lockNote:x.sub}</span>}
  </button>})}
 </div>;
}
