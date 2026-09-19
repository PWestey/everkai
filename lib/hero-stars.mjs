import data from './hero-star-data.json' with {type:'json'};
import skillData from './talent-skill-data.json' with {type:'json'};
import {reaches} from './hero-scope.mjs';
/** STARS, STAR HALOS AND ORIGIN BOOST, on the original's own tables (docs/power-sources-import-spec.md 4;
 *  scripts/import-hero-stars.py -> lib/hero-star-data.json).
 *
 *  STARS. Everkai keeps its 7 stars and their star-shard prices (lib/fellow-reset.mjs refunds from STAR_COSTS,
 *  so re-pricing would change refunds of stars already bought -- spec 7 question 7). What a star PAYS is now
 *  HeroStar's row, read at power time: star k -> row min(k, 6) (the original has 6), +riseADH percent and
 *  +extraAtk flat (star 3: +3,000 bp and +1,500,000). THE LEVEL GATES ARE HONOURED AT READ TIME: star k needs
 *  the Fellow level HeroStar[k-1].needHeroLevel names (300, 300, 400, 550, 700, 750), and a star the level
 *  does not yet support is inactive until it does. Never refused: a stored star is always legal.
 *
 *  STAR HALOS. Every owned hero broadcasts its Hero.json heroStarHaloSkill rows at the halo level its OWN
 *  (gated) star gives -- level 1 at no star, 7 at six -- to the Fellows each row's scope names (country, Hero.json
 *  rarity, HeroBond group, all, self). Shipped: `atk percent` (the percent bucket), `talent` and `talentpercent`
 *  (coef). HELD OUT, owner-confirmed 2026-09-18: the `atk finalpercent` rows (211 of them; ~9,000 bp of final
 *  multiplier on Shinobu's panel) -- in the real game one Fellow's stars never lifted the whole roster by tens
 *  of percent. A Rarity Advance stage adds or swaps a hero's halos (HeroRarityUpgrade types 2 and 3).
 *
 *  ORIGIN BOOST (HeroLRSpSkill; Everkai ships 251, 260, 263, 264): per level +5 talent, `atk percent` +2,000 at
 *  50 and 100, `talentpercent` +250 every 50 from 150. Level bought in lib/hero-advance.mjs. */
export const HERO_STAR_SOURCE=data.sha256;
export const HERO_STARS=data.stars;
export const STAR_HALOS=data.skills;
export const STAR_HELD=data.held;
/** The star the original would count: Everkai's stars clamped to 6, then stepped down until the Fellow's level
 *  supports it. */
export function effectiveStar(f){let k=Math.min(6,f?.stars||0);const level=f?.level||0;while(k>0&&level<HERO_STARS[k-1].next)k--;return k;}
export const starParts=f=>{const k=effectiveStar(f);return {percent:k?HERO_STARS[k].percent:0,flat:k?HERO_STARS[k].flat:0};};
const bondsOf=id=>skillData.heroes[id?.slice?.(5)]?.bonds||[];
/** A hero's current halos after the Rarity Advance changes its magic level has reached. */
function halosOf(id,magic){const h=data.heroes[id];if(!h)return [];let list=[...h.halos];
 for(const [lv,from,to] of h.changes)if(magic>=lv){if(from){const i=list.indexOf(from);if(i>=0)list[i]=to;else list.push(to);}else if(!list.includes(to))list.push(to);}
 return list;}
const cache=new WeakMap();
/** Every owned hero's halo broadcast, per receiving Fellow: {percent, talent, coef}. Cached per roster object. */
export function starHaloParts(s,id){
 // Cached per roster object, and re-checked against a signature of every hero's gated star, so a roster
 // mutated in place (tests do) can never read a stale broadcast.
 let byFellows=cache.get(s.fellows);const adv=s.heroAdvance||null;let sig='';for(const [hid,f] of Object.entries(s.fellows))sig+=hid+effectiveStar(f)+',';
 if(!byFellows||byFellows.adv!==adv||byFellows.sig!==sig){byFellows={adv,sig,out:new Map()};cache.set(s.fellows,byFellows);
  const src=[];for(const [hid,f] of Object.entries(s.fellows)){const lv=HERO_STARS[effectiveStar(f)].halo;
   for(const sid of halosOf(hid,adv?.fellows?.[hid]?.magic||0)){const x=STAR_HALOS[sid];if(x)src.push([hid,x,x.values[lv-1]||0]);}}
  byFellows.src=src;}
 if(byFellows.out.has(id))return byFellows.out.get(id);
 // A crossover Fellow (no Hero.json row) takes only the `all` rows. Its type is not a country the original
 // knows, and a typed broadcast onto additions is exactly the lever the crossover slice removed
 // (lib/stella.mjs stellaBonus: "type choice was silently the largest power lever"; tests/crossover-stella).
 const out={percent:0,talent:0,coef:0},bonds=bondsOf(id),original=!!skillData.heroes[id?.slice?.(5)];
 for(const [hid,x,v] of byFellows.src){const [kind,sid]=x.scope;
  const hit=kind==='all'||(original&&(kind==='self'?hid===id:kind==='bond'?bonds.includes(sid):reaches(x.scope,id)));if(hit)out[x.prop]+=v;}
 byFellows.out.set(id,out);return out;}
export const originRule=id=>data.origin[id]||null;
export function originParts(id,level){const o=originRule(id);if(!o||!level)return {talent:0,percent:0,coef:0};
 return {talent:o.talent*level,percent:o.percent.filter(r=>r[0]<=level).reduce((n,r)=>n+r[1],0),coef:o.talentPercent.filter(r=>r[0]<=level).reduce((n,r)=>n+r[1],0)};}
