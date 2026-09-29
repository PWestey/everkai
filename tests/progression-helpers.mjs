import {stellaRule,stellaState} from '../lib/stella.mjs';
import {startingSave} from '../lib/game.mjs';
/** A new village on the CLASSIC (default) growth curve -- exactly what startingSave() returned before
 *  2026-09-22, when new villages started being born on the original's HeroLevel column instead
 *  (lib/game.mjs startingSave). The classic curve is still live for every save already playing on it,
 *  and it is still the thing `activateOriginalProgression` switches away from, so the measurements and
 *  the activation tests that are ABOUT it build from here. Their pinned numbers are unchanged by the
 *  new-village default; a test that wants the new default just calls startingSave(). */
/** THE ROSTER THESE FIXTURES MEASURE, pinned 2026-09-28 and deliberately NOT startingSave's.
 *
 *  The starting gift is a CONTENT choice -- the owner reset it that day to seven Fellows "to help get
 *  past the initial slow stage" -- and it moved fourteen power fixtures that have nothing to do with it,
 *  including the ceiling positive control. A measurement of what a maxed roster is worth must not shift
 *  because a new village is handed more Fellows on day one, so these helpers pin the roster the pinned
 *  numbers were taken on. A test that wants the CURRENT starting gift calls startingSave() directly. */
const FIXTURE_ROSTER=Object.freeze({fellows:['hero_1','hero_195'],family:['wife_191']});
export const legacyStart=(now=Date.now())=>{
 const {originalProgression:_op,trainingCosts:_tc,...rest}=startingSave(now,{gift:false});
 const keep=(map,ids)=>Object.fromEntries(Object.entries(map).filter(([id])=>ids.includes(id)));
 return {...rest,fellows:keep(rest.fellows,FIXTURE_ROSTER.fellows),family:keep(rest.family,FIXTURE_ROSTER.family),
  buildings:rest.buildings,adventure:{...rest.adventure,party:rest.adventure.party.filter(id=>FIXTURE_ROSTER.fellows.includes(id))}};
};
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
