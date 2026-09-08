import {costumeById,ownsCostume} from './wardrobe.mjs';
import rows from './family-gallery-data.json' with {type:'json'};
export const FAMILY_PICTURES=rows;
const byId=new Map(rows.map(r=>[r.event,r]));
export const familyPictures=id=>rows.filter(r=>r.familyId===id);
export function pictureGate(r,s){
 if(!r?.image)return 'Picture asset unavailable';
 if(r.aliasUnresolved)return 'Source event link unresolved';
 if(r.gates.unlockItemId)return 'Requires a special item route not yet implemented';
 const id=r.gates.unlockClothingId||r.clothingVariant;
 if(id){
  const costume=costumeById(id);
  if(r.gates.unlockType!==2||!costume||costume.ownerId!==r.familyId||(r.gates.unlockClothingId&&r.clothingVariant&&r.gates.unlockClothingId!==r.clothingVariant))return 'Costume event link unresolved';
  if(!ownsCostume(s,id))return 'Collect '+(costume.name||id)+' in Wardrobe first';
 }else if(r.gates.unlockType!==1)return 'Special unlock route not yet implemented';
 if(!Number.isFinite(r.gates.unlockIntimacy))return 'Intimacy requirement unresolved';
 return null;
}
export function validFamilyGallery(s){const g=s?.familyGallery;if(g===undefined)return true;if(!g||g.policyVersion!==1||!g.owned||typeof g.owned!=='object'||Array.isArray(g.owned))return false;return Object.entries(g.owned).every(([id,v])=>{const r=byId.get(id);return r&&!pictureGate(r,s)&&!!s.family?.[r.familyId]&&v&&Number.isSafeInteger(v.unlockedAt)&&v.unlockedAt>=0&&typeof v.seen==='boolean'})}
export function discoverDatePicture(result){if(result.error||!result.welcomed)return result;const s=result.state,id=result.welcomed,f=s.family[id];if(!f)return result;const candidates=familyPictures(id).filter(r=>!pictureGate(r,s)&&f.intimacy>=r.gates.unlockIntimacy&&!s.familyGallery?.owned?.[r.event]).sort((a,b)=>a.gates.unlockIntimacy-b.gates.unlockIntimacy||a.event.localeCompare(b.event));const r=candidates[0];if(!r)return result;const gallery=s.familyGallery||{policyVersion:1,owned:{}};return {...result,state:{...s,familyGallery:{...gallery,owned:{...gallery.owned,[r.event]:{unlockedAt:Math.floor(s.lastAt),seen:false}}}},message:result.message+' A new date picture was discovered.',pictureDiscovered:r.event}}
export function familyGalleryAction(s,action,target){if(action!=='galleryView')return null;const r=byId.get(target),owned=s.familyGallery?.owned?.[target];if(!r||!owned)return {state:s,error:'Discover this picture on a date first.'};if(owned.seen)return {state:s,message:'Picture replayed.'};return {state:{...s,familyGallery:{...s.familyGallery,owned:{...s.familyGallery.owned,[target]:{...owned,seen:true}}}},message:'Picture added to your viewed collection.'}}
