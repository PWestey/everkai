import type * as Spine from '@esotericsoftware/spine-webgl';

/** One replacement from a humanization recipe: generated art drawn in `slot`'s bone space, either
 *  instead of the slot's attachment or (retainOriginal) as an overlay drawn right after it. */
export type Replacement={slot:string;region:string;vertices:number[];uvs?:number[];triangles?:number[];hullLength?:number;bone?:string;retainOriginal?:boolean;onlyWhenAttached?:boolean;drawAfter?:string};
export type Humanization={hideSlots:string[];replacements:Replacement[]};

/** A port of the handoff viewers' replacement-art.js (the Fellows copy, a superset of the Family one),
 *  with its window globals (humanized, activeRecipe, activeReplacementAttachments,
 *  humanizationOverlaySlots) turned into per-skeleton state, so two characters on screen at once (the
 *  character screen and its Art dialog) cannot overwrite each other's recipe.
 *
 *  Returns the per-frame hook. Call it after animationState.apply() and updateWorldTransform() and
 *  before drawing, exactly where the viewers' SpinePlayer `update` callback runs, because an animation
 *  can re-show a hidden attachment on any frame. Throws if the recipe names a slot, bone or region the
 *  model lacks, so a mismatch falls back to the video instead of drawing an animal-eared character. */
export function prepareHumanization(spine:typeof Spine,skeleton:Spine.Skeleton,atlas:Spine.TextureAtlas,recipe:Humanization){
 const art=new Map<string,{attachment:Spine.MeshAttachment,item:Replacement}>();
 for(const item of recipe.replacements||[]){
  if(!skeleton.findSlot(item.slot))throw Error('Missing replacement slot: '+item.slot);
  const region=atlas.findRegion(item.region);
  if(!region)throw Error('Missing replacement region: '+item.region);
  if(item.vertices.length<6||item.vertices.length%2||item.vertices.some(v=>!Number.isFinite(v))||(item.uvs&&item.uvs.length!==item.vertices.length))throw Error('Invalid artwork registration');
  const mesh=new spine.MeshAttachment(item.region,item.region);
  mesh.region=region;
  mesh.regionUVs=new Float32Array(item.uvs||[0,1,0,0,1,0,1,1]);
  if(item.bone){
   const bone=skeleton.findBone(item.bone);
   if(!bone)throw Error('Missing artwork anchor: '+item.bone);
   mesh.bones=item.vertices.filter((_,i)=>i%2===0).flatMap(()=>[1,bone.data.index]);
   mesh.vertices=new Float32Array(item.vertices.flatMap((v,i)=>i%2?[v,1]:[v]));
  }else mesh.vertices=new Float32Array(item.vertices);
  mesh.worldVerticesLength=item.vertices.length;
  mesh.triangles=item.triangles||[0,1,2,2,3,0];
  mesh.hullLength=item.hullLength||item.vertices.length;
  mesh.updateRegion();
  art.set(item.slot,{attachment:mesh,item});
 }
 const overlays=new Map<string,Spine.Slot>(),overlaySet=new Set<Spine.Slot>();
 const hidden=(recipe.hideSlots||[]).map(name=>skeleton.findSlot(name)).filter((s):s is Spine.Slot=>!!s);
 return function applyHumanization(){
  for(const slot of hidden)slot.setAttachment(null);
  if(overlaySet.size)skeleton.drawOrder=skeleton.drawOrder.filter(slot=>!overlaySet.has(slot));
  for(const [name,{attachment,item}] of art){
   const slot=skeleton.findSlot(name)!;
   if(item.retainOriginal){
    if(item.onlyWhenAttached&&!slot.attachment)continue;
    let overlay=overlays.get(name);
    if(!overlay){
     overlay=new spine.Slot(new spine.SlotData(skeleton.slots.length,'humanized_'+name,slot.bone.data),slot.bone);
     overlays.set(name,overlay);overlaySet.add(overlay);
    }
    overlay.setAttachment(attachment);
    const after=(item.drawAfter&&skeleton.findSlot(item.drawAfter))||slot;
    skeleton.drawOrder.splice(skeleton.drawOrder.indexOf(after)+1,0,overlay);
    continue;
   }
   if(!item.onlyWhenAttached||slot.attachment)slot.setAttachment(attachment);
   if(item.drawAfter){
    const after=skeleton.findSlot(item.drawAfter),at=skeleton.drawOrder.indexOf(slot);
    if(after&&at>=0&&after!==slot){skeleton.drawOrder.splice(at,1);skeleton.drawOrder.splice(skeleton.drawOrder.indexOf(after)+1,0,slot)}
   }
  }
 };
}
