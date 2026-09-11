import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import DrakenbergTown from './drakenberg-town';
import layout from '@/lib/village-layout.json';
import art from '@/lib/village-map-data.json';
const GROUND=art.ground,ASPECT=GROUND.width/GROUND.height,SCROLL_KEY='everkai-village-scroll';
const buildings=art.buildings as Record<string,{src:string,width:number,height:number}>;
export default function VillageMap({game,openBusiness,openModule,collect,locked,income,pending,menuOpen,setMenuOpen}:any){
 const [localMenu,setLocalMenu]=useState(false),menu=menuOpen??localMenu,setMenu=setMenuOpen||setLocalMenu;
 const [scroller,setScroller]=useState<HTMLDivElement|null>(null),[size,setSize]=useState({w:0,h:0}),placed=useRef(false);
 // One continuous village like the original: the ground fills the height (at least 540px so the signs never crowd) and pans left and right; the last position is remembered for this visit.
 useEffect(()=>{if(!scroller)return;const fit=()=>{const h=Math.max(scroller.clientHeight,540);setSize({w:h*ASPECT,h})};fit();const ro=new ResizeObserver(fit);ro.observe(scroller);return()=>ro.disconnect()},[scroller]);
 useEffect(()=>{if(!scroller||!size.w||placed.current)return;placed.current=true;let x=0;try{x=Number(sessionStorage.getItem(SCROLL_KEY))||0}catch{}scroller.scrollLeft=x;scroller.scrollTop=(size.h-scroller.clientHeight)/2},[scroller,size]);
 const remember=()=>{try{sessionStorage.setItem(SCROLL_KEY,String(Math.round(scroller?.scrollLeft||0)))}catch{}};
 return <section className="world spatial-village" aria-label="Your village"><div className="village-scroller" ref={setScroller} onScroll={remember}><div className="village-canvas" style={size.w?{width:size.w,height:size.h}:undefined}><img className="village-ground" src={'./assets/'+GROUND.src} alt="" draggable={false}/>
 {layout.buildings.map(b=>{const s=buildings[b.id];return <button type="button" key={b.id} className="village-building" style={{left:b.x+'%',top:b.y+'%',width:s.width/GROUND.width*100+'%'}} aria-label={'Visit '+b.label} aria-haspopup="dialog" onClick={()=>openBusiness(b.id)}><img src={'./assets/'+s.src} alt="" draggable={false}/><span>{b.label}<small>{b.id==='Building_201'?'Business':game.enterprises?.[b.id]?'Open':'Build · Free'}</small></span></button>})}
 </div></div><div className="village-income"><div><small>VILLAGE GOLD</small><strong>{pending}</strong><span>+{income} / second</span></div><Button disabled={locked||game.pending<1} onClick={collect}>Collect</Button></div><DrakenbergTown open={menu} onOpenChange={setMenu} openModule={openModule}/></section>;
}
