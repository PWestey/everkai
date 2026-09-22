import {stellaRule,stellaState} from '../lib/stella.mjs';
import {startingSave} from '../lib/game.mjs';
/** A new village on the CLASSIC (default) growth curve -- exactly what startingSave() returned before
 *  2026-09-22, when new villages started being born on the original's HeroLevel column instead
 *  (lib/game.mjs startingSave). The classic curve is still live for every save already playing on it,
 *  and it is still the thing `activateOriginalProgression` switches away from, so the measurements and
 *  the activation tests that are ABOUT it build from here. Their pinned numbers are unchanged by the
 *  new-village default; a test that wants the new default just calls startingSave(). */
export const legacyStart=(now=Date.now())=>{const {originalProgression:_op,trainingCosts:_tc,...rest}=startingSave(now);return rest};
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
import {KEEPSAKES} from '../lib/museum.mjs';
// Free grants that are now daily habit rewards (claimConsumable, claimMuseum) or retired (finishFarm).
// Tests about what those things DO seed the state directly; the earning rules have their own coverage.
export const stockConsumable=(s,id,count=10)=>({...s,inventory:{...s.inventory,[id]:(s.inventory[id]||0)+count}});
export const allKeepsakes=s=>({...s,museum:Object.fromEntries(KEEPSAKES.map(k=>[k.id,false]))});
/** Bring a growing plot to ready, as waiting out its timer would. */
export const ripe=(s,plot=0)=>({...s,farm:{...s.farm,plots:s.farm.plots.map((p,i)=>i===plot&&p?{...p,readyAt:s.lastAt}:p)}});
