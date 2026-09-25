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
/** The seven names the original's own talent tooltip gives a halo level -- `Lv.4` and `Outstanding`
 *  are the same value in two registers (docs/fellow-screen-specs/05-awaken.md). */
export const STAR_TIER_NAMES=data.tierNames;
/** The star the original would count: Everkai's stars clamped to 6, then stepped down until the Fellow's level
 *  supports it. */
export function effectiveStar(f){let k=Math.min(6,f?.stars||0);const level=f?.level||0;while(k>0&&level<HERO_STARS[k-1].next)k--;return k;}
export const starParts=f=>{const k=effectiveStar(f);return {percent:k?HERO_STARS[k].percent:0,flat:k?HERO_STARS[k].flat:0};};
/** THE ROSTER PREREQUISITE (2026-09-22; docs/character-systems-gap.md 2.1, gap 3).
 *
 *  `HeroStar[k].needHeroStarCount` is the original's real brake on stars 4-6, and Everkai had no
 *  equivalent: to take a Fellow to star k+1 the ACCOUNT must already hold `count` Fellows at `star`
 *  or above -- 15 x *3, 20 x *4, 25 x *5. It is what makes Awaken a roster goal rather than a
 *  per-Fellow one, and it costs no currency, which is why it is the right brake to add instead of
 *  re-pricing STAR_COSTS (doc 7.2: re-pricing would change lib/fellow-reset.mjs's refunds of stars
 *  already bought, and `s.summon.starShards` is validated against grants minus spends).
 *
 *  IT GATES THE PURCHASE, NEVER THE READ. A stored star is always legal and always paid, exactly as
 *  `effectiveStar` already treats the level gate -- so a roster that later shrinks can make the next
 *  star unbuyable but can never invalidate a save or take back a star. `validAdventure` is untouched.
 *
 *  THE COUNT INCLUDES THE FELLOW BEING RAISED, who is himself one of the *3s when he stands at *3.
 *  The table cannot distinguish the two readings; this is the one that makes the gate reachable at
 *  all with a roster of exactly `count` Fellows at that star.
 *
 *  COUNTED AT THE GATED STAR, not the stored one: a Fellow whose level does not yet support his star
 *  does not count toward someone else's gate, which is the same rule `effectiveStar` applies to his
 *  own Power. */
export function starRosterGate(s,fellow){
 const f=s?.fellows?.[fellow],at=Math.min(6,f?.stars||0);
 const rule=HERO_STARS[at]?.roster;
 if(!rule)return null;
 const [star,count]=rule;
 let have=0;for(const other of Object.values(s.fellows||{}))if(effectiveStar(other)>=star)have++;
 return {star,count,have,met:have>=count};
}
/** THE GATE LINE, generated from the requirement rather than authored per Fellow -- the original's
 *  own two forms, verbatim (docs/fellow-screen-specs/05-awaken.md):
 *    `Reach Lv. 550 and have 3-Star Fellows x15 to awaken to next Star.`
 *    `Reach Lv. 300 to awaken to the next Star.`
 *  The second form drops the roster clause entirely when only a level gate applies. Null at the top.
 *
 *  The owner ruled on 2026-09-22 that the roster clause is a ROSTER requirement, not a multiplayer
 *  one, so Everkai's single-player design rule does not apply to it and it ships exactly as measured:
 *  not adapted, not softened, not replaced by an invented prerequisite. */
export function gateLine(s,fellow){
 const f=s?.fellows?.[fellow],at=Math.min(6,f?.stars||0),row=HERO_STARS[at];
 if(!row||row.next===null)return null;
 const gate=starRosterGate(s,fellow);
 return gate
  ?`Reach Lv. ${row.next} and have ${gate.star}-Star Fellows x${gate.count} to awaken to next Star.`
  :`Reach Lv. ${row.next} to awaken to the next Star.`;
}
/** Everything the Awaken panel shows for one Fellow, all of it derived. */
export function awakenView(s,fellow){
 const f=s?.fellows?.[fellow];if(!f)return null;
 const stored=f.stars||0,active=effectiveStar(f),at=Math.min(6,stored);
 const row=HERO_STARS[at],parts=starParts(f);
 const halo=HERO_STARS[active].halo;
 // The talent rows the original's Awaken panel lists: this Fellow's OWN star halos, at the level its
 // star broadcasts them, with the next level beside each (docs/fellow-screen-specs/05-awaken.md).
 // Count varies by hero, which is the original's own join -- 3 on some, 4 on others.
 const talents=halosOf(fellow,s.heroAdvance?.fellows?.[fellow]?.magic||0)
  .map(sid=>({skill:sid,...STAR_HALOS[sid]}))
  .filter(x=>x.values)
  .map(x=>({skill:x.skill,name:x.name||x.skill,prop:x.prop,scope:x.scope,level:halo,
            tierName:STAR_TIER_NAMES[halo-1],
            value:x.values[halo-1]||0,next:halo<x.values.length?x.values[halo]||0:null,
            ladder:x.values.map((v,i)=>({level:i+1,tierName:STAR_TIER_NAMES[i],value:v}))}));
 return {stored,active,paid:HERO_STARS[active],parts,halo,talents,
         levelGate:row.next,levelMet:row.next===null||(f.level||0)>=row.next,
         roster:starRosterGate(s,fellow),stones:row.stones,
         inactive:active<stored?HERO_STARS[active].next:null,
         gate:gateLine(s,fellow)};
}
const bondsOf=id=>skillData.heroes[id?.slice?.(5)]?.bonds||[];
/** A hero's current halos after the Rarity Advance changes its magic level has reached. */
/** The halos a Fellow carries at a given Rarity-Advance magic level, each with its own name -- which
 *  is what the original titles the locked preview's first Skills band with, rather than the word
 *  "Aura" (fellow-screen-specs/12-locked-fellow.md).
 *
 *  MEASURED 2026-09-25, and it is why that band has no membership row here: every one of the 128
 *  halos belongs to EXACTLY ONE Fellow (88 with a single member, 40 reachable only through Rarity
 *  Advance). Everkai has no group membership at all, so the spec's P6 -- a row of portraits with only
 *  the missing member greyed -- has nothing to draw. That row is the `HeroBond` group data, which is
 *  catalogue F8, and it should be built with F6's group auras rather than guessed at here. */
export const heroHalos=(id,magic=0)=>halosOf(id,magic).map(sid=>({id:sid,...STAR_HALOS[sid]})).filter(h=>h.name);
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
