import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {Dialog,DialogClose,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import town from '@/lib/drakenberg-layout.json';
const ASPECT=town.aspect[0]/town.aspect[1];
export default function DrakenbergTown({open,onOpenChange,openModule}:{open:boolean,onOpenChange:(open:boolean)=>void,openModule:(id:string)=>void}){
 const [scroller,setScroller]=useState<HTMLDivElement|null>(null),centered=useRef(false),[size,setSize]=useState({w:0,h:0}),[list,setList]=useState(false);
 // Like the original town, the painting is wider than the screen and pans; about 900px of width keeps the plates apart.
 useEffect(()=>{centered.current=false;if(!scroller)return;const fit=()=>{const w=Math.max(scroller.clientWidth,scroller.clientHeight*ASPECT,Math.min(scroller.clientWidth*2.1,900));setSize({w,h:w/ASPECT})};fit();const ro=new ResizeObserver(fit);ro.observe(scroller);return()=>ro.disconnect()},[scroller]);
 useEffect(()=>{if(!scroller||!size.w||centered.current)return;centered.current=true;scroller.scrollLeft=(size.w-scroller.clientWidth)*.45;scroller.scrollTop=(size.h-scroller.clientHeight)*.5},[scroller,size]);
 const visit=(id:string)=>{onOpenChange(false);openModule(id)};
 return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="drakenberg-town" showCloseButton={false}><header className="town-heading"><div><DialogTitle>Drakenberg</DialogTitle><DialogDescription>Tap a building to visit</DialogDescription></div><Button variant="outline" className="town-list-button" aria-pressed={list} onClick={()=>setList(v=>!v)}>{list?'Town':'List'}</Button><DialogClose className="village-close" aria-label="Return to village"><img src="./assets/ui/close.webp" alt=""/></DialogClose></header>
 {list?<nav className="destination-menu town-list" aria-label="All Drakenberg facilities">{town.facilities.map(f=><Button key={f.id} variant="outline" onClick={()=>visit(f.id)}>{f.label}</Button>)}</nav>:<div className="town-scroller" ref={setScroller}><div className="town-canvas" style={size.w?{width:size.w,height:size.h}:undefined}><img src={'./assets/'+town.art} alt="" draggable={false}/>{town.facilities.map(f=><button type="button" key={f.id} className="town-plate" style={{left:f.x+'%',top:f.y+'%'}} aria-label={'Visit '+f.label} onClick={()=>visit(f.id)}>{f.label}</button>)}</div></div>}
 </DialogContent></Dialog>;
}
