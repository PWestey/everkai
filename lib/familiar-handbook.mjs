import data from './familiar-handbook-data.json' with {type:'json'};
import {FAMILIARS,familiarById} from './familiars.mjs';
import {TYPE_COUNTRY,heroScope} from './hero-scope.mjs';
// THE FAMILIAR COMPENDIUM -- the Handbook (parity row E8, spec docs/familiar-screen-specs/11-handbook.md).
//
// THE FINDING THIS EXISTS FOR (spec §0): the Compendium is the only cross-system faucet on the familiar
// surface, and it is the only one anywhere that pays a CHARACTER stat rather than a familiar one. Every
// level grants `Power of [Type] Fellow +5%` across the same five types the Fellow roster filters by, in
// the game's own words: "Each time the Compendium's level increases, you receive rewards and enhanced
// power bonuses for different-type Fellows." Collecting familiars is, mechanically, a Fellow investment.
// Everkai already owned the hard half -- lib/hero-scope.mjs's TYPE_COUNTRY, written for the original's
// targetCondition scoping and measured against Hero.json's own `country` column.
//
// MEASURED, all of it flat (CLAUDE.md rule 6 -- name the constancy, do not draw a curve):
//  * 300 levels, `exp` 100 on every one. 30,000 EXP to the ceiling. Not a curve.
//  * `PowerCoef.value` 500 basis points on every one. +5%, always.
//  * `PowerCoef.Country` cycles 1,2,3,4,5 ONE LEVEL AT A TIME -- 300 runs of length 1, not blocks of 60.
//    Rung 1 pays Inspiring, rung 2 Diligent, rung 3 Brave. Each type still collects 60 of the 300 levels,
//    so the ceiling is +300% Power to each of the five.
//  * The badge is `NewPetBookEXP[grade] + stars * PetStar.BookEXP[grade]`, plus `NewPetSPBookEXP[grade]`
//    again for a shining variant -- the (i) names four sources and these two tables hold three of them.
//
// THE LEVEL RISES AUTOMATICALLY. The (i) says so, which is why the Collection Rewards ladder has no
// `Claim` on any rung and exactly one interactive element, its `✕`. It is a readout. Everkai's instinct
// on every other ladder has been to put a button on each rung; that would be wrong here.
//
// NOT PORTED: Reward_PetBookLevel_01/02. Both pay the premium Crystal, which Everkai does not have and
// should not add, plus a Metamorphosis item (parity E7, deferred). The PowerCoef half is the mechanic.
export const HANDBOOK=data;
export const HANDBOOK_MAX=data.maxLevel,HANDBOOK_EXP=data.expPerLevel,HANDBOOK_COEF=data.coefBP;
export const HANDBOOK_TOTAL=HANDBOOK_MAX*HANDBOOK_EXP;
export const COUNTRY_TYPE=Object.freeze(Object.fromEntries(Object.entries(TYPE_COUNTRY).map(([t,c])=>[c,t])));
const RARITY_GRADE={N:1,R:2,SR:3,SSR:4,'SSR+':9,UR:5,'UR+':5,'UR*':5};
/** A familiar's rarity band as the original's tables key it. Everkai carries one familiar the original
 *  does not (Pet_8041505), so the rarity name is the documented fallback rather than a crash. */
export const familiarGrade=id=>data.grades[id]??RARITY_GRADE[String(familiarById(id)?.rarity||'').trim()]??1;
/** What one familiar is worth to the Compendium right now: owning it, its stars, and its shining form. */
export function familiarBookEXP(id,rec,shining=false){
 if(!rec)return 0;
 const g=String(familiarGrade(id));
 return (data.ownEXP[g]||0)+(shining?data.spEXP[g]||0:0)+(rec.stars||0)*(data.starEXP[g]||0);
}
export const handbookState=s=>s.familiarHandbook||{exp:0,claimed:{}};
export const handbookLevel=exp=>Math.min(HANDBOOK_MAX,Math.floor(exp/HANDBOOK_EXP));
/** The EXP a familiar would still pay: what it is worth now, less what has already been banked for it.
 *  Stored per familiar rather than as a boolean, because stars keep rising after the first claim. */
export const handbookPending=(s,id)=>{
 const rec=s.familiars?.[id];if(!rec)return 0;
 const h=handbookState(s),shining=!!s.familiarExplore?.sp?.includes(id);
 return Math.max(0,familiarBookEXP(id,rec,shining)-(h.claimed[id]||0));
};
export const handbookClaimable=s=>FAMILIARS.reduce((n,p)=>n+handbookPending(s,p.id),0);
/** Basis points per Fellow type at every level, computed once. `powerParts` asks for this on every
 *  Fellow on every render, so walking 300 rungs per call would be the wrong shape; the ladder is a
 *  fixed table, so its prefix sums are too. PREFIX[n] is the total after n levels. */
const PREFIX=(()=>{
 const rows=[{Inspiring:0,Diligent:0,Brave:0,Informed:0,Unfettered:0}];
 for(const c of data.countries){const prev=rows[rows.length-1],type=COUNTRY_TYPE[String(c)];
  rows.push(type?{...prev,[type]:prev[type]+data.coefBP}:{...prev});}
 return rows;
})();
export const handbookBonus=s=>PREFIX[handbookLevel(handbookState(s).exp)];
/** The one number powerParts wants: this Fellow's own type's share, in basis points. The join is
 *  `Country` -> type, which lib/hero-scope.mjs already owns and measured against Hero.json's own column. */
export const handbookPowerBP=(s,fellowId)=>{
 const c=heroScope(fellowId).country;
 return (c&&handbookBonus(s)[COUNTRY_TYPE[String(c)]])||0;
};
/** Every rung, for the Collection Rewards readout. `Completed` or `Not Achieved`; no control either way. */
export const handbookRungs=()=>data.countries.map((c,i)=>({level:i+1,type:COUNTRY_TYPE[String(c)],bp:HANDBOOK_COEF}));
const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
export function validFamiliarHandbook(s){
 const h=s.familiarHandbook;if(h===undefined)return true;
 if(!h||typeof h!=='object'||Array.isArray(h)||Object.keys(h).length!==2)return false;
 if(!int(h.exp,HANDBOOK_TOTAL)||!h.claimed||typeof h.claimed!=='object'||Array.isArray(h.claimed))return false;
 let banked=0;
 for(const [id,n] of Object.entries(h.claimed)){
  const rec=s.familiars?.[id];
  // Banked EXP can only ever be what that familiar was actually worth: a hand-edit cannot claim for a
  // familiar you do not own, nor claim more than its rarity and stars have earned.
  if(!rec||!int(n,HANDBOOK_TOTAL)||n>familiarBookEXP(id,rec,!!s.familiarExplore?.sp?.includes(id)))return false;
  banked+=n;
 }
 return h.exp===banked;// the bar IS the sum of the badges; nothing else may raise it
}
export function handbookAction(s,action,target){
 if(!['handbookClaim','handbookClaimAll'].includes(action))return null;
 const fail=error=>({state:s,error}),h=handbookState(s);
 const ids=action==='handbookClaimAll'?FAMILIARS.map(p=>p.id).filter(id=>handbookPending(s,id)>0):[target];
 if(action==='handbookClaim'&&!s.familiars?.[target])return fail('Welcome this familiar first.');
 if(!ids.length||!ids.some(id=>handbookPending(s,id)>0))return fail('No Compendium EXP to claim.');
 const claimed={...h.claimed};let gained=0;
 for(const id of ids){const n=handbookPending(s,id);if(!n)continue;claimed[id]=(claimed[id]||0)+n;gained+=n;}
 const before=handbookLevel(h.exp),exp=Math.min(HANDBOOK_TOTAL,h.exp+gained),after=handbookLevel(exp);
 const state={...s,familiarHandbook:{exp,claimed}};
 // The level rises on its own -- there is no level-up control anywhere, by design (§3).
 return {state,message:after>before
  ?`Compendium EXP +${gained.toLocaleString()} · Compendium Lv. ${after}`
  :`Compendium EXP +${gained.toLocaleString()}`};
}
