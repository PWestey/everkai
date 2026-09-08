import data from './wardrobe-data.json' with {type:'json'};
import assets from './wardrobe-assets.json' with {type:'json'};
export const COSTUMES=data.costumes;
const costumes=new Map(COSTUMES.map(r=>[r.id,r]));
const artwork=new Map(assets.map(r=>[r.costumeId,r]));
const object=v=>!!v&&typeof v==='object'&&!Array.isArray(v);
const ownedActor=(s,id)=>!!(id?.startsWith('wife_')?s.family?.[id]:s.fellows?.[id]);
export const costumeById=id=>costumes.get(id)||null;
export const costumeArt=id=>artwork.get(id)||null;
export const costumesFor=id=>COSTUMES.filter(r=>r.ownerId===id);
export const ownsCostume=(s,id)=>!!s?.wardrobe?.owned?.[id];
export const wardrobeScore=s=>COSTUMES.reduce((sum,r)=>sum+(ownsCostume(s,r.id)?r.collectionScore||0:0),0);
export function validWardrobe(s){
 const w=s?.wardrobe;if(w===undefined)return true;
 if(!object(w)||w.policyVersion!==1||!object(w.owned)||!object(w.equipped))return false;
 if(!Object.entries(w.owned).every(([id,v])=>{const r=costumes.get(id);return r&&ownedActor(s,r.ownerId)&&object(v)&&Number.isSafeInteger(v.collectedAt)&&v.collectedAt>=0}))return false;
 return Object.entries(w.equipped).every(([owner,id])=>typeof id==='string'&&costumes.get(id)?.ownerId===owner&&ownsCostume(s,id)&&ownedActor(s,owner)&&!!artwork.get(id));
}
export function wardrobeAppearance(s,person){const id=s?.wardrobe?.equipped?.[person?.id],r=costumes.get(id),a=artwork.get(id);return r&&a&&r.ownerId===person.id&&ownsCostume(s,id)?{...person,art:a.art,portrait:a.art,costumeId:id,costumeName:r.name||r.id}:person}
export function wardrobeAction(s,action,target,value){
 if(!['wardrobeCollect','wardrobeEquip'].includes(action))return null;
 const fail=error=>({state:s,error}),w=s.wardrobe||{policyVersion:1,owned:{},equipped:{}};
 if(action==='wardrobeCollect'){
  const r=costumes.get(target);if(!r)return fail('Unknown costume.');
  if(!ownedActor(s,r.ownerId))return fail('Welcome or recruit this character first.');
  if(ownsCostume(s,target))return {state:s,message:'This costume is already collected.'};
  return {state:{...s,wardrobe:{...w,owned:{...w.owned,[target]:{collectedAt:Math.floor(s.lastAt)}}}},message:(r.name||r.id)+' collected. This sandbox costume grants no stat bonuses.'};
 }
 if(!ownedActor(s,target))return fail('Welcome or recruit this character first.');
 const equipped={...w.equipped};
 if(value===null){if(!equipped[target])return {state:s,message:'Base appearance is already selected.'};delete equipped[target];}
 else {
  const r=costumes.get(value);if(!r||r.ownerId!==target)return fail('This costume belongs to a different character.');
  if(!ownsCostume(s,value))return fail('Collect this costume first.');
  if(!artwork.get(value))return fail('This costume artwork is not available yet.');
  if(equipped[target]===value)return {state:s,message:'This costume is already equipped.'};
  equipped[target]=value;
 }
 return {state:{...s,wardrobe:{...w,equipped}},message:value===null?'Base appearance restored.':'Costume equipped. Stats are unchanged.'};
}
