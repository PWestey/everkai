import {SAVE_KEY,SAVE_VERSION,decode,startingSave,settle,valid} from './game.mjs';
// Only successful synchronous storage writes admit mutations. Timer previews
// are derived from current; they never advance the durable clock themselves.
export function createPersistence(getStorage){
 let current=null,blocked=true;
 function commit(next){
  if(blocked)throw Error('Saving is paused. Retry your saved game first.');
  try{
   if(!valid(next))throw Error('Invalid village state.');
   getStorage().setItem(SAVE_KEY,JSON.stringify(next));
   current=next;
   return current;
  }catch(error){blocked=true;throw error;}
 }
 function load(now){
  blocked=true;
  try{
   const storage=getStorage(),raw=storage.getItem(SAVE_KEY),base=raw?decode(raw):startingSave(now);
   // A decoded existing save is trusted even if the next write is unavailable.
   if(raw)current=base;
   const backup=SAVE_KEY+'-backup-before-v'+SAVE_VERSION;
   if(raw&&JSON.parse(raw).version<SAVE_VERSION&&!storage.getItem(backup))storage.setItem(backup,raw);
   blocked=false;
   return commit(settle(base,now));
  }catch(error){blocked=true;throw error;}
 }
 function restore(candidate,now){
  blocked=true;
  try{
   const next=settle(candidate,now),storage=getStorage(),old=storage.getItem(SAVE_KEY);
   if(old!==null)storage.setItem(SAVE_KEY+'-before-restore',old);
   blocked=false;
   return commit(next);
  }catch(error){blocked=true;throw error;}
 }
 return {get current(){return current},get blocked(){return blocked},commit,load,restore};
}
