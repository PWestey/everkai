import {useLayoutEffect,type RefObject} from 'react';
import {artBounds,artTransform} from '@/lib/art-framing.mjs';

const fraction=(token:string|undefined,fallback:number)=>{
 if(!token)return fallback;if(token.endsWith('%'))return parseFloat(token)/100;
 return ({left:0,top:0,center:.5,right:1,bottom:1} as Record<string,number>)[token]??fallback;
};

/** Frames a character render to its measured art. About half the renders draw the art small or
 *  off-centre inside a flat viewer surround (lib/art-bounds-data.json); for those this zooms the element
 *  so the art fills its box and centres it, and paints the surround colour behind so the edges never
 *  show. Whatever object-fit and object-position the stylesheet gives the element for the current
 *  layout (cover in portrait, contain in landscape and the Art dialog) is read back and respected,
 *  and the art is never shown smaller than it is without framing. Renders whose art fills the frame
 *  are left untouched. */
export function useArtFraming(ref:RefObject<HTMLImageElement|HTMLVideoElement|null>,path:string|undefined){
 useLayoutEffect(()=>{
  const el=ref.current,measured=artBounds(path);
  if(!el||!measured)return;
  const parent=el.parentElement,apply=()=>{
   const style=getComputedStyle(el),[px,py]=style.objectPosition.split(/\s+/);
   const transform=artTransform(measured.bounds,{width:el.clientWidth,height:el.clientHeight},style.objectFit==='cover'?'cover':'contain',[fraction(px,.5),fraction(py,.5)]);
   el.style.transformOrigin='0 0';el.style.transform=transform||'';
  };
  el.style.backgroundColor=measured.surround;if(parent)parent.style.backgroundColor=measured.surround;
  apply();
  const observer=new ResizeObserver(apply);observer.observe(el);
  return ()=>{observer.disconnect();el.style.transform='';el.style.transformOrigin='';el.style.backgroundColor='';if(parent)parent.style.backgroundColor=''};
 },[ref,path]);
}
