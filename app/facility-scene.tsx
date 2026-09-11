import town from '@/lib/drakenberg-layout.json';
const ZOOM=2.2;
const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
export const isDrakenbergFacility=(id:string)=>town.facilities.some(f=>f.id===id);
/** The facility's own building, framed from the Drakenberg painting, with its name plate. */
export default function FacilityScene({id}:{id:string}){
 const f=town.facilities.find(x=>x.id===id);if(!f)return null;
 const x=clamp(f.x,50/ZOOM,100-50/ZOOM),y=clamp(f.y,14,86);
 return <div className="facility-scene" aria-hidden="true"><img src={'./assets/'+town.art} alt="" style={{width:ZOOM*100+'%',transform:`translate(-${x}%,-${y}%)`}}/><span className="facility-plate">{f.label}</span></div>;
}
