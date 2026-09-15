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
// The retired sandbox supplies button granted 10M EXP and 100 of each breakthrough material per press.
// Tests that need that stock credit ten daily habit claims (10 each) and the EXP directly.
export const stockOriginal=(s,claims=10)=>({...s,fellowXP:s.fellowXP+claims*1e6,originalProgression:{...s.originalProgression,dailyClaims:(s.originalProgression.dailyClaims||0)+claims,stock:Object.fromEntries(Object.entries(s.originalProgression.stock).map(([k,n])=>[k,n+claims*10]))}});
