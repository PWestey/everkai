import data from './hero-bond-data.json' with {type:'json'};
import {fellowById} from './catalog.mjs';
// HERO BOND -- the Fellow groups (catalogue F8, the Bond Compendium) and their group auras (the
// missing half of F6). One module because they are one table set; see scripts/import-hero-bond.py.
//
// WHY THEY ARE ONE SLICE, measured 2026-09-25: every one of Everkai's 128 star halos belongs to
// exactly ONE Fellow, so there was no group membership anywhere in the game. The locked-fellow
// preview wanted it (spec 12's P6, a row of member portraits with only the missing one greyed), F8
// wanted it for collection progress, and F6 wanted it for the auras that scale with members owned.
// All three read `HeroBond`.
//
// WHAT THE SHAPE OF THE DATA SAYS (rule 6): 23 groups over 131 heroes, but only FOUR groups carry a
// group aura and all 57 of those auras grant `talent`, at +2, +10 or +20. So the Compendium is broad
// and the payout is narrow -- most groups are a collection to complete, not a bonus to chase. The
// one `HeroBondCondition` row set is narrower still: all thirteen are bond 5 needing 5 members.
export const BOND_GROUPS=data.groups,BOND_AURAS=data.auras,BOND_ACTIVATION=data.activation;
const BY_HERO=new Map();
for(const [id,g] of Object.entries(data.groups))for(const m of g.members){
 if(!BY_HERO.has(m))BY_HERO.set(m,[]);BY_HERO.get(m).push(id);
}
/** The groups this Fellow belongs to. */
export const bondsOf=id=>BY_HERO.get(id)||[];
/** A group, with who is in it and how much of it this village owns. */
export function bondGroup(s,bondId){
 const g=data.groups[bondId];if(!g)return null;
 const owned=g.members.filter(m=>Object.hasOwn(s.fellows||{},m));
 return {id:bondId,members:g.members,owned:owned.map(m=>m),
  have:owned.length,total:g.members.length,complete:g.members.length>0&&owned.length===g.members.length};
}
export const bondGroups=s=>Object.keys(data.groups).filter(id=>data.groups[id].members.length)
 .map(id=>bondGroup(s,id)).sort((a,b)=>b.have/b.total-a.have/a.total||a.id.localeCompare(b.id));
/** Every group aura this village has unlocked: a member owned, at or past the aura's star threshold.
 *  `unlockReq` is read against the Fellow's gated star, the same figure `starHaloParts` broadcasts on. */
/** AURA PROGRESS -- the gate, built 2026-09-28 on a MARKED-LOCAL reading.
 *
 *  `UnderlingManager.lua:2165` gates acquiring a group aura on
 *      config.unlockReq <= heroData.auraProgress
 *  and docs/aura-progress-measurement.md traces what that counter is. Everything below is measured
 *  except one step, which is named:
 *    * it is PER HERO, and it is the aura's OWNER who must clear the gate (`CheckHeroAuraRed(heroId)`
 *      reads the HeroBondBonus rows keyed on that heroId against that hero's own auraProgress);
 *    * it is set from the response to `ReqUpgradeSkill` (UnderlingManager.lua:844), so it moves when
 *      that Fellow's SKILLS are upgraded, not on stars, levels or collection;
 *    * `System.AuraProgress` is 1, and the task string reads "Upgrade Fellows' aura skills {count}
 *      times".
 *  **LOCAL:** that each upgrade is worth exactly 1, and that a skill's first level is its free unlock
 *  rather than a purchase -- so progress is the number of levels BOUGHT above the unlock. The server
 *  computes the real figure and the client never displays it, so this is the honest reading of
 *  `System.AuraProgress = 1`, not a transcription. It is the number to re-price if the auras pace wrong.
 *
 *  This replaces a WRONG reading, kept here because it cost real time: `unlockReq` was first taken for
 *  a star threshold, which a glance would have refuted (STAR_CAP is 7; the ladders run 1..250) and
 *  which moved a fixture 1.85x before it was caught. */
export function auraProgress(s,id){
 const skills=s?.fellows?.[id]?.talentSkills;
 if(!skills||typeof skills!=='object')return 0;
 let n=0;
 for(const level of Object.values(skills))if(Number.isInteger(level)&&level>1)n+=level-1;
 return n;
}

/** Every group aura this village actually has: its owner is recruited AND has cleared the aura's own
 *  `unlockReq` on the counter above. Before 2026-09-28 this returned every owned aura ungated, because
 *  there was no counter to gate it on. */
export function activeBondAuras(s){
 return data.auras.filter(a=>Object.hasOwn(s.fellows||{},a.hero)&&a.unlockReq<=auraProgress(s,a.hero));
}
/** What the Compendium shows: every owned aura and whether its gate is met, so a locked one is visible
 *  rather than simply absent. */
export function bondAuraRows(s){
 return data.auras.filter(a=>Object.hasOwn(s.fellows||{},a.hero))
  .map(a=>({...a,progress:auraProgress(s,a.hero),unlocked:a.unlockReq<=auraProgress(s,a.hero)}));
}
/** The group-aura talent reaching this Fellow: every unlocked aura on a bond they belong to. */
export function bondTalent(s,id){
 const mine=new Set(bondsOf(id));
 if(!mine.size)return 0;
 let n=0;
 for(const a of activeBondAuras(s))if(mine.has(a.bond))n+=a.value;
 return n;
}
export const bondName=id=>`Bond ${id}`;
export const bondMemberNames=bondId=>(data.groups[bondId]?.members||[]).map(m=>fellowById(m)?.name||m);
