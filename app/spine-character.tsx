import {useEffect,useRef} from 'react';
import type * as Spine from '@esotericsoftware/spine-webgl';
import {prepareHumanization} from './spine-humanization';

type Box={x:number,y:number,w:number,h:number};
export type SpineStats={loadMs:number,firstFrameMs:number,fps:number,textureBytes:number,animation:string};

const union=(a:Box|null,b:Box):Box=>!a?{...b}:{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),w:Math.max(a.x+a.w,b.x+b.w)-Math.min(a.x,b.x),h:Math.max(a.y+a.h,b.y+b.h)-Math.min(a.y,b.y)};

/** World-space box of one slot's current attachment, or null for bounding boxes, clipping and empty slots. */
function slotBox(spine:typeof Spine,slot:Spine.Slot):Box|null{
 const a=slot.getAttachment();let v:Float32Array|number[];
 if(a instanceof spine.RegionAttachment){v=new Float32Array(8);a.computeWorldVertices(slot,v,0,2)}
 else if(a instanceof spine.MeshAttachment){v=new Float32Array(a.worldVerticesLength);a.computeWorldVertices(slot,0,a.worldVerticesLength,v,0,2)}
 else return null;
 let x0=Infinity,y0=Infinity,x1=-Infinity,y1=-Infinity;
 for(let i=0;i<v.length;i+=2){x0=Math.min(x0,v[i]);x1=Math.max(x1,v[i]);y0=Math.min(y0,v[i+1]);y1=Math.max(y1,v[i+1])}
 return {x:x0,y:y0,w:x1-x0,h:y1-y0};
}

/** Where the camera looks, measured once from the running idle animation.
 *  - figure: the union of everything drawn across the whole loop, so no pose is ever cropped.
 *  - card: a costume is a painted card (one large attachment carrying the scenery) with the figure and
 *    effects spilling past it. The card is the attachment with the largest area; the figure's centre is
 *    the union of every OTHER attachment's centre that sits over the card. In a cover layout the card
 *    fills the box and the view slides towards the figure without ever showing past the card's edge;
 *    in a contain layout (landscape, Art dialog) the whole card and its effects are shown. */
function measure(spine:typeof Spine,skeleton:Spine.Skeleton,state:Spine.AnimationState,humanize:()=>void,duration:number){
 let all:Box|null=null,card:{box:Box,slot:Spine.Slot}|null=null;
 const samples=24;
 for(let i=0;i<samples;i++){
  state.update(i?duration/samples:0);state.apply(skeleton);skeleton.updateWorldTransform();humanize();
  for(const slot of skeleton.drawOrder){
   if(!slot.bone.active)continue;const box=slotBox(spine,slot);if(!box)continue;
   all=union(all,box);
   if(i===0&&(!card||box.w*box.h>card.box.w*card.box.h))card={box,slot};
  }
 }
 let figure:Box|null=null;
 if(card){
  state.setAnimation(0,state.getCurrent(0)!.animation!.name,true);state.update(0);state.apply(skeleton);skeleton.updateWorldTransform();humanize();
  for(const slot of skeleton.drawOrder){
   if(slot===card.slot||!slot.bone.active)continue;const box=slotBox(spine,slot);if(!box)continue;
   const cx=box.x+box.w/2,cy=box.y+box.h/2,c=card.box;
   if(cx>c.x&&cx<c.x+c.w&&cy>c.y&&cy<c.y+c.h&&box.w*box.h<c.w*c.h*.5)figure=union(figure,box);
  }
 }
 return {all:all!,card:card?.box??null,figure};
}

export function frameCamera(m:{all:Box,card:Box|null,figure:Box|null},mode:'card'|'figure',fit:'cover'|'contain',W:number,H:number){
 const pad=.03;
 if(mode==='card'&&m.card){
  // A card's region carries a few pixels of transparent or feathered border (measured on H111C1:
  // about 1% of its height showed as a light strip at the top), so cover a slightly inset card.
  const inset=.02,c={x:m.card.x+m.card.w*inset,y:m.card.y+m.card.h*inset,w:m.card.w*(1-2*inset),h:m.card.h*(1-2*inset)};
  if(fit==='cover'){
   const scale=Math.max(W/c.w,H/c.h),vw=W/scale,vh=H/scale,f=m.figure||c;
   const clamp=(v:number,lo:number,hi:number)=>Math.min(hi,Math.max(lo,v));
   return {x:clamp(f.x+f.w/2,c.x+vw/2,c.x+c.w-vw/2),y:clamp(c.y+c.h/2,c.y+vh/2,c.y+c.h-vh/2),scale};
  }
 }
 const a=m.all,scale=Math.min(W/a.w,H/a.h)*(1-2*pad);
 return {x:a.x+a.w/2,y:a.y+a.h/2,scale};
}

/** Plays one packaged model with the Spine 4.1 WebGL runtime: the unchanged original skeleton, the
 *  atlas Everkai's renders used, the humanization recipe applied every frame, and the model's first
 *  animation named Idle, looped. Any load, parse, recipe or WebGL failure calls onError once, and the
 *  caller shows the idle clip or still instead. The loop only runs while `running` is true, the page is
 *  visible and the canvas is on screen. */
export default function SpineCharacter({row,label,running,onError,onStats}:{row:any,label:string,running:boolean,onError:(e:unknown)=>void,onStats?:(s:SpineStats)=>void}){
 const canvasRef=useRef<HTMLCanvasElement>(null),runningRef=useRef(running),wake=useRef<()=>void>(()=>{});
 const errorRef=useRef(onError),statsRef=useRef(onStats);errorRef.current=onError;statsRef.current=onStats;
 runningRef.current=running;
 useEffect(()=>{wake.current()},[running]);
 useEffect(()=>{
  const canvas=canvasRef.current;if(!canvas)return;
  let disposed=false,failed=false,raf=0,onScreen=true,dispose=()=>{};
  const start=performance.now();
  const fail=(e:unknown)=>{if(failed||disposed)return;failed=true;console.warn('Spine playback failed for',row.model,e);dispose();errorRef.current(e)};
  (async()=>{
   const spine=await import('@esotericsoftware/spine-webgl');
   if(disposed)return;
   const context=new spine.ManagedWebGLRenderingContext(canvas,{alpha:true,premultipliedAlpha:true,antialias:false});
   if(!context.gl)throw Error('WebGL unavailable');
   // Straight-alpha pages (row.premultiplied false, see scripts/package-spine-model.mjs) are premultiplied
   // by WebGL on upload, so drawing below is premultiplied either way.
   context.gl.pixelStorei(context.gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,row.premultiplied===false);
   const assets=new spine.AssetManager(context,'./assets/'+row.base),renderer=new spine.SceneRenderer(canvas,context,true);
   const lost=(e:Event)=>{e.preventDefault();fail(Error('WebGL context lost'))};
   canvas.addEventListener('webglcontextlost',lost);
   dispose=()=>{
    cancelAnimationFrame(raf);canvas.removeEventListener('webglcontextlost',lost);
    try{assets.dispose();renderer.dispose()}catch{}
    // Give the GPU memory back now; iOS caps live WebGL contexts and does not collect them promptly.
    (context.gl.getExtension('WEBGL_lose_context') as any)?.loseContext();
   };
   assets.loadBinary(row.skeleton.file);assets.loadTextureAtlas(row.atlas.file);
   await new Promise<void>((resolve,reject)=>{const poll=()=>{if(disposed)return resolve();if(assets.hasErrors())return reject(Error(JSON.stringify(assets.getErrors())));if(assets.isLoadingComplete())return resolve();raf=requestAnimationFrame(poll)};poll()});
   raf=0;if(disposed)return;
   const loadMs=performance.now()-start;
   const atlas=assets.require(row.atlas.file) as Spine.TextureAtlas;
   const data=new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(assets.require(row.skeleton.file));
   const skeleton=new spine.Skeleton(data),state=new spine.AnimationState(new spine.AnimationStateData(data));
   const animation=data.findAnimation(row.idle)||data.animations[0];if(!animation)throw Error('No animation');
   skeleton.setToSetupPose();state.setAnimation(0,animation.name,true);
   const humanize=prepareHumanization(spine,skeleton,atlas,row.humanization);
   const measured=measure(spine,skeleton,state,humanize,animation.duration);
   state.setAnimation(0,animation.name,true);skeleton.setToSetupPose();
   const textureBytes=atlas.pages.reduce((s,p)=>s+p.width*p.height*4,0);
   let last=0,frames=0,fpsStart=0,fps=0,firstFrameMs=0,drawn=false;
   const draw=(dt:number)=>{
    const dpr=Math.min(2,window.devicePixelRatio||1),W=canvas.clientWidth,H=canvas.clientHeight;
    if(!W||!H)return;
    const bw=Math.round(W*dpr),bh=Math.round(H*dpr);
    if(canvas.width!==bw||canvas.height!==bh){canvas.width=bw;canvas.height=bh}
    state.update(dt);state.apply(skeleton);skeleton.updateWorldTransform();humanize();
    const fit=getComputedStyle(canvas).objectFit==='cover'?'cover':'contain',cam=frameCamera(measured,row.framing,fit,W,H);
    const gl=context.gl;gl.viewport(0,0,bw,bh);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT);
    renderer.camera.setViewport(bw,bh);renderer.camera.position.x=cam.x;renderer.camera.position.y=cam.y;renderer.camera.zoom=1/(cam.scale*dpr);
    renderer.begin();renderer.drawSkeleton(skeleton,true);renderer.end();
    if(!drawn){drawn=true;firstFrameMs=performance.now()-start;statsRef.current?.({loadMs,firstFrameMs,fps:0,textureBytes,animation:animation.name})}
   };
   const tick=(now:number)=>{
    raf=0;if(disposed||failed)return;
    try{
     draw(last?Math.min(.1,(now-last)/1000):0);last=now;
     frames++;if(!fpsStart)fpsStart=now;
     if(now-fpsStart>=2000){fps=frames*1000/(now-fpsStart);frames=0;fpsStart=now;canvas.dataset.fps=fps.toFixed(1);statsRef.current?.({loadMs,firstFrameMs,fps,textureBytes,animation:animation.name})}
    }catch(e){return fail(e)}
    if(runningRef.current&&onScreen&&!document.hidden)raf=requestAnimationFrame(tick);
   };
   // Paused, hidden or off screen: stop the loop, keeping the last frame. Resuming restarts timing so
   // the animation continues where it stopped instead of jumping ahead by the time spent paused.
   wake.current=()=>{if(disposed||failed)return;if(!raf&&runningRef.current&&onScreen&&!document.hidden){last=0;frames=0;fpsStart=0;raf=requestAnimationFrame(tick)}};
   const visibility=()=>wake.current();
   document.addEventListener('visibilitychange',visibility);
   const observer=new IntersectionObserver(entries=>{onScreen=entries.some(e=>e.isIntersecting);wake.current()});observer.observe(canvas);
   const resize=new ResizeObserver(()=>{if(!raf&&!disposed&&!failed)try{draw(0)}catch(e){fail(e)}});resize.observe(canvas);
   const inner=dispose;dispose=()=>{document.removeEventListener('visibilitychange',visibility);observer.disconnect();resize.disconnect();wake.current=()=>{};inner()};
   canvas.dataset.loadMs=loadMs.toFixed(0);canvas.dataset.textureBytes=String(textureBytes);canvas.dataset.animation=animation.name;
   draw(0);canvas.dataset.firstFrameMs=firstFrameMs.toFixed(0);
   wake.current();
  })().catch(fail);
  return ()=>{disposed=true;dispose()};
 },[row]);
 return <canvas ref={canvasRef} className="character-spine" role="img" aria-label={label} data-model={row.model}/>;
}
