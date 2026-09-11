import {useEffect,useState} from 'react';
import town from '@/lib/drakenberg-layout.json';
const ASPECT=town.aspect[0]/town.aspect[1],ZOOM=2.2;
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
export const isDrakenbergFacility=(id:string)=>town.facilities.some(f=>f.id===id);
/** The facility's own building, framed from the Drakenberg painting and kept covering the scene at any size, with its name plate. */
export default function FacilityScene({id}:{id:string}){
 const [box,setBox]=useState<HTMLDivElement|null>(null),[size,setSize]=useState({w:0,h:0}),f=town.facilities.find(x=>x.id===id);
 useEffect(()=>{if(!box)return;const fit=()=>setSize({w:box.clientWidth,h:box.clientHeight});fit();const ro=new ResizeObserver(fit);ro.observe(box);return()=>ro.disconnect()},[box]);
 if(!f)return null;
 const iw=Math.max(size.w*ZOOM,size.h*ASPECT),ih=iw/ASPECT,left=clamp(size.w/2-f.x/100*iw,size.w-iw,0),top=clamp(size.h/2-f.y/100*ih,size.h-ih,0);
 return <div className="facility-scene" ref={setBox} aria-hidden="true">{size.w>0&&<img src={'./assets/'+town.art} alt="" style={{width:iw,height:ih,left,top}}/>}<span className="facility-plate">{f.label}</span></div>;
}
