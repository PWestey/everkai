// THE FISHING ARTIFACTS (2026-09-22, scripts/import-fishing-artifacts.py). The owner: "there are
// little artifacts that give bonuses (like the first one that gives 100% more exp per upgrade)."
// The first one is A1401 "Legend Plate - 1"; its skill is {id:FishExp, propType:percent} with
// skillProp_Initial and skillProp_Level both 10000 basis points, so +100% fishing EXP at every level
// to level 200. He remembered it exactly. lib/fishing-data.json has carried them as "measured but not
// built -- see parity row E1" since the first fishing import; this is the build.
//
// Every number is read from lib/fishing-artifact-data.json. The LOCAL choices are all here:
//
//  1. THE ROLL IS AN EXTRA, NOT A RESHARE. lib/fishing-draw-data.json dropped FishLevel's
//     `artifact1`, `artifact2` and `random` columns and renormalised the fish weights. Re-adding them
//     there would re-roll which species every future cast produces. Instead a cast keeps its fish
//     exactly as it is and takes ONE more roll, on the original's full denominator
//     (fish1..5 + artifact1 + artifact2 + random). The shares Everkai cannot pay -- artifact1 (every
//     rare-4 artifact is `isCantGet:1` and is granted by script, never drawn), artifact2 at a spot
//     with no artifact, and random events 3/4/5 (`typ:"box"`, unbuilt) -- fall through and the cast is
//     just its fish, exactly as before. So the absolute per-cast odds of the things that DO pay are
//     the original's to the basis point, and nothing that was already stored moves.
//
//  2. FORWARD ONLY. Artifacts and Pearls accrue from the next cast, never retroactively from stored
//     catches. A save written by the live build decodes unchanged and simply has no `artifacts`.
//
//  3. NO DUPLICATE CONVERSION. Checked, not assumed: the client marks every artifact catch
//     `isNew = true` (GoFishingManager.lua:349-352) and upgrades artifacts out of the bag alone
//     (:667-671, `response.negItems`), where fish bank their own FishExp. A repeat artifact is
//     recorded and pays nothing, and Pearls come only from where the original puts them -- the random
//     event (1 a catch, split by FishSpot.random weights) and the fishing level-up reward on levels
//     63-500 (FishLevel.rewardNormal -> Reward_FishLevelUp, 1 Pearl).
//
//  4. A4501 "Eastern Treasure Box" is `fromActivity: "FishBP"` -- the fishing battle pass, which
//     Everkai does not have. Its effect (the Trading Post Counter rate) is wired and tested, and its
//     acquisition is DEFERRED with that reason rather than invented. `fishArtifactTaxBp` therefore
//     returns 0 today, and the Trading Post reads it anyway so the two systems cannot drift.
import data from './fishing-artifact-data.json' with {type:'json'};

export const FISH_ARTIFACTS=data.records,ARTIFACT_LADDERS=data.ladders,ARTIFACT_WEIGHTS=data.weights;
export const ARTIFACT_SPOT_RANDOM=data.spotRandom,LEVELUP_PEARL_FROM=data.levelUpPearlFrom,LEVELUP_PEARL_TO=data.levelUpPearlTo;
export const PEARL='pearl',BLACK_PEARL='blackPearl';
const byId=new Map(FISH_ARTIFACTS.map(r=>[r.id,r]));
export const fishArtifact=id=>byId.get(id)||null;
/** The Pearl kind an artifact's ladder is bought with. */
export const fishArtifactPearl=id=>ARTIFACT_LADDERS[byId.get(id)?.ladder]?.item==='Item_SimGame4_BlackPearl'?BLACK_PEARL:PEARL;
/** Value of the skill at `level`: i + (level-1)*l, a percent in hundredths of a percent. */
export const fishArtifactValue=(id,level)=>{const r=byId.get(id);return r?r.i+(Math.min(level,r.max)-1)*r.l:0};
/** Pearls to go from `level` to level+1, or null at the cap. */
export function fishArtifactUpgradeCost(id,level){const r=byId.get(id);if(!r||level>=r.max)return null;const row=ARTIFACT_LADDERS[r.ladder].rows.find(x=>level>=x[0]&&level<=x[1]);return row?row[2]:ARTIFACT_LADDERS[r.ladder].rows.at(-1)[2]}
/** Pearls a level has consumed on one artifact. */
export function fishArtifactSpent(id,level){let t=0;for(let l=1;l<level;l++)t+=fishArtifactUpgradeCost(id,l)||0;return t}

const EMPTY={policyVersion:1,found:[],levels:{},bonusExp:0};
export const fishArtifactState=f=>f?.artifacts||EMPTY;
/** Which artifacts are held, and how many of each (a repeat is recorded, and pays nothing). */
export function fishArtifactCounts(f){const out=new Map();for(const x of fishArtifactState(f).found)if(x.kind==='artifact')out.set(x.artifact,(out.get(x.artifact)||0)+1);return out}
export const fishArtifactOwned=(f,id)=>fishArtifactCounts(f).has(id);
/** An owned artifact is at level 1 until it is upgraded; an unowned one is at 0. */
export const fishArtifactLevel=(f,id)=>fishArtifactOwned(f,id)?fishArtifactState(f).levels[id]||1:0;
export const pearlsFound=(f,kind)=>fishArtifactState(f).found.reduce((n,x)=>n+(x.kind===kind?1:0),0);
export const pearlsSpent=(f,kind)=>Object.entries(fishArtifactState(f).levels).reduce((n,[id,l])=>n+(fishArtifactPearl(id)===kind?fishArtifactSpent(id,l):0),0);
export const pearls=(f,kind)=>pearlsFound(f,kind)-pearlsSpent(f,kind);

/** Every held artifact's effect, summed per `field`, in the ORIGINAL'S OWN UNITS -- a percent stays in
 *  basis points here and is divided exactly once, at the accessor. Summing fractions instead makes
 *  three +20% artifacts come out as 0.6000000000000001, which then shows as a 60.00000000000001%
 *  village bonus and fails an exact test for no reason. */
export function fishArtifactBonuses(f){
 const out=Object.create(null);
 for(const r of FISH_ARTIFACTS){const level=fishArtifactLevel(f,r.id);if(!level)continue;
  const key=`${r.system}/${r.field}`;out[key]=(out[key]||0)+fishArtifactValue(r.id,level);}
 return out;
}
const bonus=(f,key)=>fishArtifactBonuses(f)[key]||0;
/** Fishing EXP multiplier from A1401 -- the owner's one. 1 with no artifact, 2 at level 1, 201 at 200. */
export const fishArtifactExpMultiplier=f=>1+bonus(f,'fishing/expPercent')/10000;
/** Bait production from A1402, as a fraction. */
export const fishArtifactBaitBonus=f=>bonus(f,'fishing/baitPercent')/10000;
/** Gold Crown chance from A1403, as a fraction of the band's own weight. */
export const fishArtifactCrownBonus=f=>bonus(f,'fishing/goldCrownPercent')/10000;
/** All Building Earnings from A2503/A3501/A4502, as a fraction -- the same shape as potionYield. */
export const fishArtifactYieldBonus=f=>bonus(f,'village/percent')/10000;
/** Basis points the held artifacts add to the Trading Post Counter's rate (A4501). Already bp, so it
 *  goes straight into GetTaxBuff's `cwTaxConf.taxBuff + count_fishAdd` with no conversion at all. */
export const fishArtifactTaxBp=s=>bonus(s?.fishing,'tradingPost/taxBuffBp');
/** The two that reach Fellow Power, as lib/fishing.mjs effect rows (scope `all`, docs 9.1 buckets).
 *  lib/fishing.mjs carries a percent in hundredths of a percent, so the bp are divided by 100. */
export function fishArtifactPowerEffects(f){
 const b=fishArtifactBonuses(f),out=[];
 if(b['power/percent'])out.push({kind:'percent',value:b['power/percent']/100,scope:['all',null]});
 if(b['power/aptitude'])out.push({kind:'aptitude',value:b['power/aptitude'],scope:['all',null]});
 return out;
}

/** The spot a ground belongs to, and the catches recorded there. */
export const spotCatches=(catches,grounds,spot)=>catches.reduce((n,c)=>n+(grounds[c.ground]?.spot===spot?1:0),0);
/** The scripted grants FishSpot.FishUnspokenRules fires at exactly this spot catch count. */
export const scriptedAt=(spot,count)=>FISH_ARTIFACTS.filter(r=>r.scripted.some(x=>x.spot===spot&&x.count===count));
/** Rare-5 artifacts the draw can actually produce at a spot (the rare-4 ones are all isCantGet). */
export const drawPool=spot=>FISH_ARTIFACTS.filter(r=>!r.isCantGet&&r.spots.includes(spot));

/** ONE extra roll on the original's full denominator. See note 1. `roll1`/`roll2` are the caller's
 *  cast-keyed rolls, so a saved cast always resolves the same way. Returns null for "nothing extra". */
export function castExtra(spot,fishingLevel,roll1,roll2){
 if(!spot)return null;
 const w=ARTIFACT_WEIGHTS[Math.min(Math.max(fishingLevel,1),ARTIFACT_WEIGHTS.length)-1];
 if(!w)return null;
 const [fish,a1,a2,rnd]=w,total=fish+a1+a2+rnd;
 if(!total)return null;
 let x=roll1*total;
 if(x<fish+a1)return null;                       // the fish share, plus the un-drawable rare-4 share
 x-=fish+a1;
 if(x<a2){const pool=drawPool(spot);if(!pool.length)return null;return {kind:'artifact',artifact:pool[Math.min(pool.length-1,Math.floor(roll2*pool.length))].id}}
 x-=a2;
 const sr=ARTIFACT_SPOT_RANDOM[spot];
 if(!sr?.total)return null;
 const p=rnd*sr.pearl/sr.total,b=rnd*sr.blackPearl/sr.total;
 if(x<p)return {kind:PEARL};
 x-=p;
 if(x<b)return {kind:BLACK_PEARL};
 return null;                                     // random events 3/4/5: boxes Everkai has not built
}

const MAX_EXP_MULTIPLIER=1+(byId.get('A1401').i+(byId.get('A1401').max-1)*byId.get('A1401').l)/10000;
export {MAX_EXP_MULTIPLIER};
/** QUARANTINABLE through `fishing`. Optional: absent means the system is untouched, which is what a
 *  save written before 2026-09-22 holds. */
export function fishValidArtifacts(f,lastAt,expPerCatch){
 const a=f.artifacts;if(a===undefined)return true;
 const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
 if(!a||typeof a!=='object'||Array.isArray(a)||a.policyVersion!==1||!Array.isArray(a.found)||a.found.length>Number.MAX_SAFE_INTEGER||!a.levels||typeof a.levels!=='object'||Array.isArray(a.levels))return false;
 if(!int(a.bonusExp,Math.max(0,f.catches.length)*expPerCatch*MAX_EXP_MULTIPLIER))return false;
 const seen=new Set();
 for(let n=0;n<a.found.length;n++){const x=a.found[n];
  if(!x||typeof x!=='object'||x.id!==`find:${n+1}`||![PEARL,BLACK_PEARL,'artifact'].includes(x.kind))return false;
  if(x.kind==='artifact'?!byId.has(x.artifact):x.artifact!==null)return false;
  if(!(x.ground===null||typeof x.ground==='string'&&x.ground.length<=80))return false;
  if(!int(x.at,Number.MAX_SAFE_INTEGER)||x.at>lastAt)return false;
  const key=x.kind==='artifact'?x.artifact:x.kind;
  if(x.duplicate!==(x.kind==='artifact'&&seen.has(key)))return false;
  seen.add(key);}
 const counts=fishArtifactCounts(f);
 for(const [id,l] of Object.entries(a.levels)){const r=byId.get(id);if(!r||!counts.has(id)||!int(l,r.max)||l<1)return false}
 // Rule 12: a level is checked against Pearls DERIVED from `found` through the SkillUpgrade ladder.
 // Re-pricing that ladder would refuse a legal save; tests/fishing-artifacts.test.mjs pins it.
 return pearls(f,PEARL)>=0&&pearls(f,BLACK_PEARL)>=0;
}
