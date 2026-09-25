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
/** The group auras whose OWNER is in the roster. Deliberately not gated on `unlockReq`, because that
 *  is `auraProgress` and Everkai has no such counter -- see `bondTalent` below. The Compendium shows
 *  each aura with its threshold so the screen is honest about what is not yet modelled. */
export function activeBondAuras(s){
 return data.auras.filter(a=>Object.hasOwn(s.fellows||{},a.hero));
}
/** NOT WIRED INTO POWER, and the reason is the whole finding of this slice.
 *
 *  A group aura is gated on `HeroBondBonus.unlockReq`, and I first read that as a star threshold --
 *  which was wrong, and the wrongness was visible if I had looked: `STAR_CAP` is 7 and the ladders
 *  run 1..100 and 5..500, ten rungs per hero. `UnderlingManager.lua:2157` settles it:
 *
 *      if not skillData and config.unlockReq <= heroData.auraProgress then
 *
 *  `auraProgress` is a per-hero counter Everkai does not model and whose faucet is not in these three
 *  tables. Wiring the aura to a gate I guessed would have handed a bond-5 Fellow up to +384 Aptitude
 *  on an invented condition -- and a fixture jumped 1.85x when I tried, which is how it was caught.
 *  That is the same error the dispatch Great Success formula had just cost, so: the COLLECTION half
 *  of this table ships, because it needs no magnitude at all, and the aura half waits for
 *  `auraProgress`. Catalogue F6 carries the measurement. */
export function bondTalent(s,id){
 const mine=new Set(bondsOf(id));
 if(!mine.size)return 0;
 let n=0;
 for(const a of activeBondAuras(s))if(mine.has(a.bond))n+=a.value;
 return n;
}
export const bondName=id=>`Bond ${id}`;
export const bondMemberNames=bondId=>(data.groups[bondId]?.members||[]).map(m=>fellowById(m)?.name||m);
