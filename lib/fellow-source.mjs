import {RANK_FELLOWS,recruitPrice,CURRENCY_NAMES} from './summon.mjs';
import {WISH_RECRUITS} from './fountain.mjs';
// `How to Invite` for a Fellow you do not have (docs/fellow-screen-specs/12-locked-fellow.md §Source).
// One line, and the whole acquisition UI: no route button, no odds, no fragment progress.
//
// The original names its own place ("Treasure Hunt"); spec 13 of the Family set ruled that Everkai
// answers with EVERKAI'S route instead, because naming a place the player cannot go is worse than
// naming one they can. Measured across the 111-Fellow roster: 97 are bought at the Recruit counter,
// 9 are Wayfarer rank rewards -- which is exactly why `recruitPrice` returns null for them, they are
// not for sale -- and 5 appear in the Fountain's wish. Nothing falls through, so the last branch is a
// real fallback rather than the answer for most of the roster.
const currency=cost=>Object.entries(cost||{}).map(([k,n])=>`${n} ${CURRENCY_NAMES[k]||k}`).join(' + ');
export function fellowSource(id){
 const rank=RANK_FELLOWS.get(id);
 if(rank)return `Wayfarer rank ${rank} — a rank reward, not for sale`;
 const wish=WISH_RECRUITS.find(r=>r.id===id&&r.kind==='fellows');
 if(wish)return `the Fountain's wish · ${wish.category}`;
 const price=recruitPrice(id);
 if(price)return `the Recruit counter in Drakenberg · ${currency(price)}`;
 return 'a storyline arc; not offered at the Recruit counter';
}
