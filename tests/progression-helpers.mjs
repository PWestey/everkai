import {stellaRule,stellaState} from '../lib/stella.mjs';
import {familiarSupplies} from '../lib/familiar-supplies.mjs';
// Familiar training and Stella fragments are now earned (Familiar Tower income; one daily-habit grant).
// Tests about what training or fragments DO, rather than how they are earned, stock the save directly
// with records the engine's own validators accept.
export const withItems=(s,levelUp=1e9,classUp=1e9)=>({...s,familiarSupplies:{levelUp,classUp,since:familiarSupplies(s).since}});
export function grantFragments(s,id='hero_54',times=1){
 const p=stellaRule(id),old=stellaState(s),t={...old,stock:{...old.stock},grants:[...old.grants]};
 for(let i=0;i<times;i++){t.seq++;t.stock[p.itemId]=(t.stock[p.itemId]||0)+1000;t.grants.push({id:t.seq,itemId:p.itemId,count:1000,at:s.lastAt});}
 return {...s,stella:t};
}
