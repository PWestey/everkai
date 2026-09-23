import data from './family-stella-data.json' with {type:'json'};
import {SPIRIT_SHARD_ITEM} from './hero-spirit.mjs';
import {REMOVED} from './catalog.mjs';
import blessData from './original-blessing-data.json' with {type:'json'};
import {affinityIds} from './public-reference.mjs';
/** FAMILY STELLA -- the original's WifeSpirit (docs/power-sources-import-spec.md 3.1; catalogue row F19).
 *  scripts/import-family-stella.py -> lib/family-stella-data.json: 89 family members, 21 or 41 ranks. Each rank
 *  pays, to the Fellows that member BLESSES (`bless:<wife>` scope), the CUMULATIVE value of three halos:
 *    NewHalo_2 talent (Shinobu's member 185 at rank 20: 355), NewHalo_3 atk percent (15,000 bp), and
 *    NewHalo_4 a talent LEVEL cap raise. Their Power parts live in lib/family-stella-power.mjs.
 *  NOW PAID (2026-09-22): NewHalo_1, `city | yield percent`. It is a business-income stat, not Power, and
 *  it was recorded per rank as the 5th column and deliberately left unwired -- docs/character-systems-gap.md
 *  3.2 calls that half of the gap, and 7.1 says it is the SAME decision as Family Latency, because both are
 *  per-member percentages the original sums over the whole roster and adds to every building. Latency landed
 *  uncapped on the owner's 2026-09-22 instruction ("implement what the original's tables and client say,
 *  faithfully, without inventing caps or brakes"), so leaving this one held would be the inconsistent half of
 *  one decision. `familyStellaYield` is the account-wide sum; lib/businesses.mjs adds it as its own named
 *  strand beside Latency, so the two can be read apart. Scope `city` is the village, so it reaches the
 *  seventeen businesses -- the same reach Latency has, and not the three legacy starter buildings, which the
 *  original's own building formula does not cover either.
 *  STILL NOT PAID, stated: AddValue intimacy/charm and AddCustomBless (no Everkai table resolves those ids).
 *
 *  CURRENCY: the shared Stella shard pool -- the spec's recommendation (7 question 4), and the same local rule as
 *  hero Stella and Rarity Advance: each rank costs the original's own count (a hero-own crystal or a member's
 *  fragment in the original) in Item_Owner_VillageShard.
 *
 *  SAVES (rule 12): an optional subtree `s.familyStella = {policyVersion:1, ranks:{wife_N: rank}}`; a member is
 *  active once she holds a rank (0 is the free activation). The shards spent are DERIVED from the stored ranks
 *  and the pinned cost column (sha256 in the data file), and lib/stella.mjs subtracts them in its stock
 *  identity. A save without the subtree subtracts nothing. */
export const FAMILY_STELLA_SOURCE=data.sha256;
export const FAMILY_STELLA=data.wives;
export const STELLA_BLESS_PAIRS=data.stellaPairs;
export const familyStellaRule=wife=>data.wives[wife]||null;
export const familyStellaState=s=>s.familyStella||{policyVersion:1,ranks:{}};
/** The member's rank, or -1 when she has not been activated. */
export const familyStellaRank=(s,wife)=>{const r=s.familyStella?.ranks?.[wife];return Number.isInteger(r)?r:-1;};
/** Every member's row at her current rank: [cost, talent, percent bp, talent limit, yield bp]. */
export const familyStellaRow=(s,wife)=>{const r=familyStellaRank(s,wife);return r<0?null:familyStellaRule(wife)?.ranks[r]||null;};
/** THE ACCOUNT-WIDE CITY YIELD, as a fraction ready to add to a business multiplier. The 5th column of
 *  every activated member's CURRENT rank row, summed -- the original's own `city | yield percent` halo.
 *  74 of the 89 members carry one; all 74 maxed is 1,598,000 bp = +15,980%, and the largest single member
 *  is +545%. Read fresh from the stored ranks, never written back, so no save stores a derived total. */
export function familyStellaYield(s){
 let bp=0;
 for(const wife of Object.keys(s?.familyStella?.ranks||{})){
  const row=familyStellaRow(s,wife);
  if(row&&s.family?.[wife])bp+=row[4]||0;
 }
 return bp/10000;
}
export function familyStellaSpend(s){let n=0;for(const [w,r] of Object.entries(s?.familyStella?.ranks||{})){const rule=familyStellaRule(w);if(!rule)continue;for(let i=1;i<=r;i++)n+=rule.ranks[i][0];}return n?{[SPIRIT_SHARD_ITEM]:n}:{};}
/** The largest talent-limit raise Family Stella can ever give ONE Fellow: the top NewHalo_4 of every member who
 *  can bless it by any route (her APK list, her affinity list, an unlocked pair). The validator bound
 *  lib/talent-skills.mjs adds; it depends only on the tables, never on a save's progress. */
const limitBound=new Map();
for(const [wife,w] of Object.entries(data.wives)){const top=w.ranks.at(-1)[3];if(!top)continue;
 const who=new Set([...(blessData.recipients[wife]||[]),...affinityIds(wife),...data.stellaPairs.filter(p=>p[0]===wife).map(p=>p[1])]);
 for(const id of who)limitBound.set(id,(limitBound.get(id)||0)+top);}
export const familyLimitBound=id=>limitBound.get(id)||0;
export function validFamilyStella(s){
 if(s.familyStella===undefined)return true;const t=s.familyStella;
 if(!t||typeof t!=='object'||Array.isArray(t)||t.policyVersion!==1||!t.ranks||typeof t.ranks!=='object'||Array.isArray(t.ranks)||Object.keys(t).length!==2)return false;
 for(const [w,r] of Object.entries(t.ranks)){const rule=familyStellaRule(w);if(!rule||!(s.family?.[w]||REMOVED.has(w))||!Number.isInteger(r)||r<0||r>=rule.ranks.length)return false;}
 return !Object.keys(familyStellaSpend(s)).length||s.stella!==undefined;
}
