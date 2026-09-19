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
 *  NOT PAID, stated: NewHalo_1 (`city | yield percent`, a business-income stat, not Power -- its size is
 *  recorded per rank as `yield`; importing it would compound village income and is its own decision) and
 *  AddValue intimacy/charm and AddCustomBless (no Everkai table resolves those ids).
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
