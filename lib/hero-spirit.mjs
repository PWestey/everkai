import data from './hero-spirit-data.json' with {type:'json'};
import {ORIGINAL_FELLOWS,fellowById} from './catalog.mjs';
/** THE ORIGINAL'S OWN STELLA TABLES, for every Fellow that has one.
 *
 *  scripts/import-hero-spirit.py resolves HeroSpirit.json (3,266 rows, 126 of 181 heroes) through
 *  SkillBase.json and SkillLevel.json into lib/hero-spirit-data.json. Everything below is read from
 *  that file at load; nothing here is authored except the three decisions labelled LOCAL.
 *
 *  WHY THIS REPLACED FOUR PROFILES. Everkai shipped four Stella profiles scraped from four community
 *  character pages, and a comment saying no other character had a track. The original's own tables say
 *  126 do. The four Everkai had are real -- the importer's positive control reproduces all four to the
 *  digit, cost column, flat column and percent column -- but they are four of a hundred and twenty-six.
 *
 *  WHAT THE ORIGINAL ACTUALLY GRANTS, per rank, and what Everkai models. The BUCKET column is the
 *  client's own (private-server/readable/PropManager.lua:99-117); it is the whole reason two of these
 *  compose differently even though both read "a percent":
 *      fightBase = base * (1 + Spercent/1e4) * (1 + Sextrapercent/1e4) * coef * (1 + Scoefpercent/1e4)
 *                  + Sextradd
 *      fight     = fightBase * (1 + Stotalpercent/1e4)
 *  and `calc_formual_part` (:76-97) is a plain SUM over every contributing system -- never a max.
 *
 *    scope/prop            heroes  what it does                        bucket        Everkai
 *    self  atk extradd        126  the owner's own flat Power          extradd       `flat`
 *    country atk percent        4  +N% to every Fellow of one TYPE     percent       `percent`
 *    self  atk percent        116  +N% to the OWNER alone              percent       `selfPowerBp`
 *    all   appoint percent     57  every Fellow's appointment yield    percent(appoint) `appointYieldBp`
 *    self  talentLvLimit       57  +50/+100 to the owner's talent cap  (a cap, not a term) `talentLimit`
 *    self  talent              17  the owner's own talent              coef          LEFT OUT
 *    bond  atk% / talent    114 ids a NAMED HERO GROUP's Power/talent  percent/coef  LEFT OUT
 *
 *  `percent` and `selfPowerBp` ARE THE SAME BUCKET at different scopes, so they are summed into one
 *  (1 + S/10000) factor rather than applied one after the other. Getting that wrong is worth up to 2x
 *  on a Fellow who has both. `flat` is `extradd` and is still added AFTER the factor, as before.
 *
 *  WHAT IS STILL LEFT OUT, and it is an absent AXIS rather than an absent measurement:
 *    * `bond:<n>` names one of HeroBond.json's 23 hero GROUPS. Everkai has no group-membership axis --
 *      lib/bonds.mjs is a per-PAIR intimacy level, not a roster -- so shipping these would mean
 *      inventing the grouping as well as the bonus. The owner's own instruction: say so, leave it out.
 *    * `self | talent` is the `coef` bucket, whose Everkai axis is `aptitude`, and `aptitude` is capped
 *      at 1,000 by a check a SAVE is validated against (validAdventure). Raising that cap is
 *      docs/power-parity-audit.md step 5 -- its "highest blow-up risk" item -- and a separate decision.
 *  Both stay in `unmodelledMax` per hero, priced, so neither needs another research pass. Their size:
 *  17 heroes x up to +2,050 talent, and 114 bond ids at up to +450% to a group.
 *
 *  ONLY FOUR HEROES GRANT A TYPE-WIDE PERCENT, and they are exactly the four Everkai already had
 *  (52 -> country 4 Informed, 54 and 190 -> country 1 Inspiring, 56 -> country 2 Diligent). So
 *  `stellaBonus` summing percent across a type is the original's rule, not a local invention -- the
 *  client sums every contributing source into one (1 + percent/10000) factor
 *  (private-server/readable/PropManager.lua:76-119, UnderlingData.lua:373-376) and never takes a max --
 *  and the reason only four exist is that the original only ever wrote four.
 *
 *  LOCAL DECISION 1 -- ONE SHARED SHARD POOL. In the original each rank costs that hero's own fragment,
 *  which drops from pulls. Everkai has no pulls, so fragments come from idle play, and `settleStella`
 *  pays its drop IN FULL to every owned profile's own item: 85 private items would be 85 parallel
 *  500/day faucets and every ladder would finish in days. So every track this module adds spends ONE
 *  shared item, exactly as lib/crossover-stella.mjs does, while KEEPING each Fellow's own real cost
 *  column. Sink, both halves from the shipped tables: 694,867 shards for the whole roster against
 *  STELLA_IDLE_PER_DAY 500 x the habit multiplier's 1.0-2.0, i.e. 695 days of kept habits and 1,390
 *  without. The four ladders that ALREADY SHIPPED keep their own private fragment items untouched,
 *  because real saves hold stock in them.
 *
 *  LOCAL DECISION 2 -- THE 23 FELLOWS THE ORIGINAL GIVES NOTHING. Everkai ships 111 original Fellows;
 *  88 have a real track. The 23 that do not are the low-rarity ones (the original's own rule is close
 *  to "SSR and above get one"). The owner asked that everyone have a track, so they share one flat-only
 *  ladder -- hero_190's, the SMALLEST flat column in the whole recovered table (15,300,000 over 20
 *  ranks for 1,500 shards). Re-used unchanged; the local part is that they have it at all.
 *
 *  LOCAL DECISION 3 -- ANGIE'S INFORMED LADDER IS RE-POINTED AT hero_74. hero_52 owned the only
 *  Informed country halo and the 2026-09-17 roster trim deleted her, so no village could take an
 *  Informed Stella percent. Her row stays (old receipts resolve through it, and lib/crossover-stella.mjs
 *  templates off it) and her ladder is given to hero_74. MEASURED, not chosen: of the 18 Informed
 *  Fellows that ship, hero_195 is excluded because she is a STARTER and a starter with a private
 *  fragment item makes every fresh village mint one; matching the rarity of all four authored owners
 *  (SR) leaves hero_61, hero_71, hero_74; and of those only hero_74 has a fragment item in the
 *  original's Item.json ("Lucoa's Fragment", Item_Owner_HeroPiece_74). She also has NO Spirit track of
 *  her own in HeroSpirit.json, so the transferred ladder overwrites no recovered row. One filter chain,
 *  one survivor. */

/** The four ids whose profiles Everkai has shipped since v86. Their fragment items and ladders must not
 *  move: real saves hold stock and receipts against them. */
export const SHIPPED_SPIRIT=Object.freeze(['hero_52','hero_54','hero_56','hero_190']);
const SHIPPED=SHIPPED_SPIRIT;
/** country id -> Everkai type. MEASURED from the four country halos against the four owners' own types
 *  in lib/public-reference.mjs; countries 3 and 5 are never used by a Spirit halo, so they are absent
 *  rather than guessed. */
const COUNTRY_TYPE=Object.freeze({'1':'Inspiring','2':'Diligent','4':'Informed'});
export const HERO_SPIRIT_SOURCE=data.source;
export const SPIRIT_SHARD_ITEM='Item_Owner_VillageShard';
export const INFORMED_STELLA_OWNER='hero_74';

const source=new Map(data.profiles.map(p=>['hero_'+p.heroId,p]));
const heroSpirit=id=>source.get(id)||null;
export {heroSpirit};
/** hero_190's ladder: the smallest flat column recovered, and the default for a Fellow the original
 *  gives no track at all. */
const SMALLEST=source.get('hero_190');
if(!SMALLEST)throw new Error('lib/hero-spirit-data.json no longer carries hero_190; the default ladder is gone');
const ANGIE=source.get('hero_52');
if(!ANGIE)throw new Error('lib/hero-spirit-data.json no longer carries hero_52; the Informed ladder is gone');

/** Turn one imported profile into the shape lib/stella.mjs consumes. `ranks` are cumulative totals at
 *  that rank and `percent` arrives in hundredths of a percent (12,200 = +122%), which is how the client
 *  reads it too (PropManager.lua:116 divides by 10,000 into a multiplier; the UI divides by 100). */
function profile(id,src,{itemId,name,type,flatOnly=false}){
 const paid=src.ranks.filter(r=>r.rank>0);
 // `flatOnly` drops the BROADCAST columns and nothing else. It is used for LOCAL DECISION 2 only: the
 // default ladder is hero_190's, and hers happens to carry a country-1 percent, which would hand every
 // trackless Fellow an Inspiring bonus their own character never granted -- and hand it to them 23
 // times over, since the type sum adds every owner. `appointYieldBp` is scoped `all` and would spread
 // the same way, so it is dropped by the same flag; the SELF-scoped columns (`flat`, `selfPowerBp`,
 // `talentLimit`) only ever reach their own owner and are untouched. As it happens hero_190 carries no
 // appointment or self-percent column at all, so today the appoint clause is a no-op -- it is written
 // down because the next ladder promoted to the default might carry one, and asserted in
 // tests/hero-spirit.test.mjs so "no-op" stays a measurement rather than an assumption.
 //
 // UNITS, and they are not uniform on purpose. `percent` is whole percent because that is the unit the
 // four shipped ladders have always stored and real saves hold receipts in it. The two new columns stay
 // in the original's OWN unit -- hundredths of a percent, i.e. basis points -- because converting them
 // makes them fractional (hero_194 rank 39 is 124,550 bp = +1,245.5%), and every other number a save
 // stores is an integer that `Number.isSafeInteger` can check. The `Bp` suffix is the unit; divide by
 // 100 for a percent and by 10,000 for a multiplier, exactly as PropManager.lua:116 does.
 const pct=r=>flatOnly?0:r.percent/100;
 const appoint=r=>flatOnly?0:r.appointYieldBp;
 const row=r=>({flat:r.flat,percent:pct(r),selfPowerBp:r.selfPowerBp,appointYieldBp:appoint(r),talentLimit:r.talentLimit});
 return Object.freeze({
  id,name,type,itemId,flatOnly,
  levels:Object.freeze(paid.map(r=>Object.freeze({level:r.rank,cost:r.cost,itemId,...row(r)}))),
  activation:Object.freeze({cost:0,...row(src.ranks[0])}),
  source:`lib/hero-spirit-data.json hero_${src.heroId}${flatOnly?' (self-scoped columns only)':''}`,
  reprice:!SHIPPED.includes(id),
 });
}
const typeOf=id=>fellowById(id)?.type??null;
/** Which imported ladder a Fellow uses, and why. Exported so tests can assert the partition rather than
 *  re-deriving it. */
export function spiritPlan(id){
 if(id===INFORMED_STELLA_OWNER)return {src:ANGIE,why:'repointed'};
 const own=heroSpirit(id);
 if(own)return {src:own,why:'imported'};
 return {src:SMALLEST,why:'default'};
}
/** The profiles Everkai ships, built once. The four that already shipped keep their own private
 *  fragment item; everything else spends the shared shard. */
const built=[];
for(const f of ORIGINAL_FELLOWS){
 const {src,why}=spiritPlan(f.id);
 const shipped=SHIPPED.includes(f.id);
 const type=typeOf(f.id);
 const flatOnly=why==='default';
 // A country halo only pays out to the type it names, so an imported or re-pointed ladder whose country
 // does not match its new owner's type would silently move a whole type's bonus somewhere else. Refused
 // here rather than measured later. (The default ladder is exempt: `flatOnly` has already dropped its
 // percent, which is exactly why that flag exists.)
 if(!flatOnly&&src.country&&COUNTRY_TYPE[src.country]!==type)
  throw new Error(`${f.id} (${type}) would carry a country-${src.country} (${COUNTRY_TYPE[src.country]}) Stella percent`);
 built.push(profile(f.id,src,{itemId:shipped?src.itemId:SPIRIT_SHARD_ITEM,name:f.name,type,flatOnly}));
}
/** hero_52's own row, kept so `stellaRule('hero_52')` still resolves for a save that levelled her before
 *  the roster trim deleted her, and so lib/crossover-stella.mjs can keep templating off her ladder. */
const ANGIE_PROFILE=profile('hero_52',ANGIE,{itemId:ANGIE.itemId,name:'Angie',type:COUNTRY_TYPE[ANGIE.country]});
export const SPIRIT_PROFILES=Object.freeze([...built,ANGIE_PROFILE]);
const byId=new Map(SPIRIT_PROFILES.map(p=>[p.id,p]));
export const spiritProfile=id=>byId.get(id)||null;
/** Every Fellow whose track spends the shared shard: what makes the faucet flat rather than per-owner. */
export const SPIRIT_SHARD_OWNERS=Object.freeze(built.filter(p=>p.itemId===SPIRIT_SHARD_ITEM).map(p=>p.id));
const shardOwners=new Set(SPIRIT_SHARD_OWNERS);
export const spiritShard=id=>shardOwners.has(id);
export const ownsSpiritShard=s=>Object.keys(s?.fellows||{}).some(id=>shardOwners.has(id));
/** The whole sink, for pacing. Both halves come from the shipped tables: this column and
 *  STELLA_IDLE_PER_DAY. */
export const SPIRIT_SHARD_SINK=built.filter(p=>p.itemId===SPIRIT_SHARD_ITEM)
 .reduce((n,p)=>n+p.levels.reduce((m,r)=>m+r.cost,0),0);
/** The columns the original grants and Everkai does not, per hero, at their maxed value. Nothing reads
 *  this at runtime; it exists so the remaining gap stays costed (tests/hero-spirit.test.mjs). */
export const SPIRIT_UNMODELLED=Object.freeze(Object.fromEntries(
 data.profiles.map(p=>['hero_'+p.heroId,Object.freeze({...p.unmodelledMax})])));
export const SPIRIT_COUNTRY_TYPE=COUNTRY_TYPE;
