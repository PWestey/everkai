import data from './talent-skill-data.json' with {type:'json'};
import {REMOVED} from './catalog.mjs';
import {SPIRIT_SHARD_ITEM} from './hero-spirit.mjs';
/** RARITY ADVANCE AND PLEDGE -- two per-Fellow ladders the original prices in a HERO-OWN item
 *  (docs/power-sources-import-spec.md 4.2 and 1.2; scripts/import-talent-skills.py).
 *
 *    Rarity Advance  HeroMagicLevel: 29 heroes (25 ship in Everkai). Level L pays `talentBonus`
 *                    (5 a level, to 1,000 at 200 or 1,200 at 240; 15 heroes stop at 400), and at the
 *                    levels that name a HeroRarityUpgradeStage the hero's stage changes: a new initial
 *                    talent (Shinobu 100 -> 240) and new talent skills (lib/talent-skills.mjs).
 *                    Every level costs 10 of the hero's own Item_RarityUpgrade_Hero_<id>.
 *    Pledge          HeroPledge: 15 heroes. The pledge level (1..100) costs 10 of Item_HeroPledge_<id> a
 *                    level and unlocks talent skills at pledge levels 30 / 60 / 100. It may only be raised
 *                    once the gate Hero.json pledgeUpgradeOpen names is met (Rarity Advance 200 for
 *                    Shinobu, Fellow level 1 for others). The pledge skill's OWN talent targets a `pledge`
 *                    condition, not `self` -- it is not paid here (spec 5, "pledge transfer", residual).
 *
 *  THE CURRENCY IS THE SHARED STELLA SHARD POOL -- the spec's recommendation (4.6) and the local decision
 *  lib/hero-spirit.mjs already made for Stella itself (LOCAL DECISION 1): the original charges a hero-own
 *  item, Everkai has no pulls to drop hero-own items from, and for Shinobu the Rarity Advance item IS the
 *  item her Stella ranks cost. So each level spends Item_Owner_VillageShard from s.stella.stock at the
 *  original's own count per level.
 *
 *  SAVES (CLAUDE.md rule 12). A new OPTIONAL subtree, `s.heroAdvance = {policyVersion:1, fellows:{id:
 *  {magic, pledge}}}`. Absent means level 0 everywhere, which is every save written before this. The shards
 *  a level cost are NOT stored: every level of both ladders costs the same count (asserted by the importer),
 *  so the spend is DERIVED -- `heroAdvanceSpend` -- and lib/stella.mjs subtracts it in its stock identity.
 *  A save without the subtree subtracts 0, so validStella reads every older save exactly as before. */
export const HERO_ADVANCE_SOURCE=data.sha256;
const hero=id=>typeof id==='string'&&id.startsWith('hero_')?data.heroes[id.slice(5)]||null:null;
export const magicRule=id=>hero(id)?.magic||null;
export const pledgeRule=id=>hero(id)?.pledge||null;
export const heroAdvanceState=s=>s.heroAdvance||{policyVersion:1,fellows:{}};
export const magicLevel=(s,id)=>heroAdvanceState(s).fellows[id]?.magic||0;
export const pledgeLevel=(s,id)=>heroAdvanceState(s).fellows[id]?.pledge||0;
/** HeroMagicLevel.talentBonus at a level: 5 a level except the original's own dips (hero 142 pays 142 at
 *  level 30, after 145 at 29), which ship as exceptions. */
export const magicBonus=(id,level)=>{const m=magicRule(id);if(!m||!level)return 0;const e=m.except.find(x=>x[0]===level);return e?e[1]:m.per*level;};
/** The stage the Fellow has reached: the last HeroRarityUpgradeStage whose level is met, or null. */
export const magicStage=(s,id)=>{const m=magicRule(id),lv=magicLevel(s,id);let out=null;for(const st of m?.stages||[])if(lv>=st[0])out=st;return out;};
/** Hero.json pledgeUpgradeOpen: [HeroMagicLevel|HeroLevel, level]. */
export const pledgeOpen=(s,id)=>{const p=pledgeRule(id);if(!p)return false;const [kind,level]=p.open;return kind==='HeroMagicLevel'?magicLevel(s,id)>=level:(s.fellows[id]?.level||0)>=level;};
/** Shards spent on both ladders, derived from the stored levels (every level costs the same count). */
export function heroAdvanceSpend(s){let n=0;for(const [id,x] of Object.entries(s?.heroAdvance?.fellows||{}))n+=(x.magic||0)*(magicRule(id)?.cost||0)+(x.pledge||0)*(pledgeRule(id)?.cost||0);return n?{[SPIRIT_SHARD_ITEM]:n}:{};}
export function validHeroAdvance(s){
 if(s.heroAdvance===undefined)return true;const t=s.heroAdvance,int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
 if(!t||typeof t!=='object'||Array.isArray(t)||t.policyVersion!==1||!t.fellows||typeof t.fellows!=='object'||Array.isArray(t.fellows))return false;
 for(const [id,x] of Object.entries(t.fellows)){
  if(!(s.fellows[id]||REMOVED.has(id))||!x||typeof x!=='object'||Array.isArray(x)||Object.keys(x).some(k=>!['magic','pledge'].includes(k)))return false;
  if(x.magic!==undefined&&(!magicRule(id)||!int(x.magic,magicRule(id).max)))return false;
  if(x.pledge!==undefined&&(!pledgeRule(id)||!int(x.pledge,pledgeRule(id).max)))return false;
 }
 // Something was paid, so the pool it was paid from must exist; lib/stella.mjs checks the amount.
 return !Object.keys(heroAdvanceSpend(s)).length||s.stella!==undefined;
}
