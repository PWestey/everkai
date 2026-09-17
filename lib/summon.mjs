import ladder from './rank-ladder-data.json' with {type:'json'};
import {habitDay,habitDue,habitEarnings} from './habits.mjs';
import {artifactState} from './artifacts.mjs';
import {FELLOWS,FAMILY} from './catalog.mjs';
import {newFellow,STAR_CAP,STAR_COSTS,STAR_APTITUDE_PERCENT,fellowStars,nextStarCost} from './adventure.mjs';
import roster from './public-roster.json' with {type:'json'};
import {additionById} from './everkai-additions.mjs';
// Habits pay for new characters. A completed daily gives Acquaint Stone Fragments; a perfect day also gives an
// insignia fragment and star shards; a strong week gives extra insignia fragments. All of these numbers are local.
export const STONE_FRAGMENTS_PER_DAILY=2,STONE_FRAGMENTS_DAILY_CAP=6,PERFECT_DAY_BONUS=4,STONE_FRAGMENTS_PER_STONE=10;
export const INSIGNIA_FRAGMENTS_PER_INSIGNIA=5,PERFECT_WEEK_FRAGMENTS=2,PERFECT_DAY_SHARDS=10,WEEK_DAYS_FOR_BONUS=5,WEEK_AREAS_FOR_BONUS=5;
// Magic Ore is earned, never granted. Its only sink is artifact upgrades (10-70 ore per level by tier),
// and the banquet shop and Golemore mine already supply ~25/day, so habits carry the rest of a steady pace.
export const ORE_PER_DAILY=6,PERFECT_DAY_ORE=24;
export const SUMMON_KINDS=['valiant','archangel'],CLAIM_DAYS=40,CLAIM_WEEKS=8,SUMMON_MAX=1e6;
export const RECRUIT_RECEIPTS=200;
/** `insignias` is retained ONLY for backward compatibility: saves written before UR was repriced
 *  carry receipts with currency:'insignias', and validSummon requires every receipt currency to be
 *  a key here. Removing it would retroactively invalidate those saves. Nothing is priced in it. */
export const CURRENCY_NAMES={stoneFragments:'Acquaint Stone Fragments',stones:'Acquaint Stones',valiant:'Valiant Insignias',archangel:'Archangel Insignias',insignias:'insignias'};
/** A character's shop rarity, from the public roster snapshot (Everkai additions carry their own). */
export const recruitRarity=id=>roster.records[id]?.rarity??additionById(id)?.rarity??null;
/** The characters the original hands over for nothing. Hero.json marks each one `from` 玩家等级
 *  (player level) or 城镇事件 (town event) -- 29 ids, 5 N + 15 R + 9 SR -- and the original awards
 *  them across player levels 2-28 and town events. Everkai was charging for all of them: 150
 *  fragments all told, about fifteen perfect habit days for characters the original gives away in
 *  its first hour. Priced at zero rather than null on purpose: null is the "no price recorded"
 *  refusal in summonRecruit, and a free character must pass through the counter, not be rejected
 *  by it. This also makes hero_60 obtainable at last -- the public roster has no rarity for him, so
 *  summonCost returned null and nothing in the game could grant him. */
export const FREE_ROSTER=new Set(['hero_1','hero_2','hero_3','hero_4','hero_5','hero_11','hero_12','hero_13','hero_14','hero_15','hero_16','hero_17','hero_18','hero_19','hero_20','hero_21','hero_22','hero_23','hero_24','hero_25','hero_51','hero_58','hero_59','hero_60','hero_61','hero_62','hero_63','hero_64','hero_65']);
export const FREE_PRICE={stoneFragments:0};
/** What the counter charges for a character, or null when nothing prices them. */
/** The 22 rank-up Fellows (lib/rank-ladder-data.json). The original never sells them: each arrives
 *  through a village encounter at its player rank (openingRecruit), so the counter does not offer
 *  them. The other 7 FREE_ROSTER ids are town-event characters and stay free here. */
export const RANK_FELLOWS=new Map(ladder.encounters.map(e=>[e.fellow,e.rank]));
export const recruitPrice=id=>RANK_FELLOWS.has(id)?null:FREE_ROSTER.has(id)?FREE_PRICE:summonCost(recruitRarity(id));
/** Everyone the counter can sell today: shipped, priced and not already joined. */
export function recruitOffers(s){
 const owned=new Set([...Object.keys(s.fellows||{}),...Object.keys(s.family||{})]);
 return [...FELLOWS.map(f=>({...f,kind:'fellows'})),...FAMILY.map(f=>({...f,kind:'family'}))]
  .filter(p=>!owned.has(p.id)&&recruitPrice(p.id))
  .map(p=>({id:p.id,name:p.name,kind:p.kind,rarity:recruitRarity(p.id),cost:recruitPrice(p.id)}));
}
/** What a character costs. N and R sit below one whole stone, so they are priced in the finer unit:
 *  ten fragments make a stone, so an N is three fragments rather than a stone that would overcharge
 *  for the cheapest characters in the game. Set members take their own insignia. */
export const SUMMON_COSTS={N:{stoneFragments:3},R:{stoneFragments:5},SR:{stones:1},SSR:{stones:2},'SSR+':{stones:3},UR:{valiant:2},'UR*':{archangel:2},set:{archangel:1}};
// UR/UR*/set used to be priced in `insignias`, a key summonState NEVER creates. That failed open,
// not closed: `undefined < 2` is false so the affordability check could not fire, and
// `undefined - 2` wrote NaN into the wallet -- which validSummon accepted (its key list omits
// `insignias`) and JSON.stringify persisted as null. 49 of 259 characters recruited for nothing.
// They are now priced in valiant and archangel, which the forge already produces (5 insignia
// fragments each) and which validSummon already guards. Those two currencies previously had no
// sink anywhere in the game, so this gives the forge its missing purpose rather than inventing a
// currency. A fully perfect week yields 9 insignia fragments, so a 2-insignia UR is ~1.1 weeks.
const int=(v,max=SUMMON_MAX)=>Number.isInteger(v)&&v>=0&&v<=max;
const DAY=/^\d{4}-\d{2}-\d{2}$/,WEEK=/^\d{4}-\d{2}-\d{2}$/;
export const summonState=s=>{const r=s.summon||{policyVersion:1,seq:0,stoneFragments:0,stones:0,insigniaFragments:0,valiant:0,archangel:0,starShards:0,days:[],weeks:[]};return r.recruited?r:{...r,recruited:[]}};
/** The price for a rarity, or null when the rarity is unknown. Returning null rather than defaulting
 *  keeps an unpriced character loud: it is refused at the counter instead of quietly charging SSR. */
export const summonCost=(rarity,inSet=false)=>inSet?SUMMON_COSTS.set:SUMMON_COSTS[String(rarity||'').split(' ->')[0].trim()]||null;
export function weekStartDay(now){const d=new Date(now);d.setHours(0,0,0,0);d.setDate(d.getDate()-(d.getDay()+6)%7);return habitDay(d.getTime())}
/** Today's habit standing: dailies due, dailies completed and whether the day is perfect. */
export function summonDay(s,now){
 const h=s.habits,day=habitDay(now);
 const due=(h?.items||[]).filter(x=>x.freq==='daily'&&habitDue(x,now)).length;
 const done=(h?.history||[]).filter(x=>x.kind==='complete'&&x.day===day&&String(x.period).startsWith('d:')).length;
 return {day,due,done,perfect:due>0&&done>=due};
}
export function summonAction(s,action,target,value){
 if(!['summonClaimDay','summonClaimWeek','summonForge','summonRecruit','summonStar'].includes(action))return null;
 const fail=error=>({state:s,error}),r=summonState(s);
 if(value?.seq!==r.seq||r.seq>=1e9)return fail('Summon rewards changed. Try again.');
 const next={...r,seq:r.seq+1},add=(k,n)=>{next[k]=Math.min(SUMMON_MAX,next[k]+n)};
 if(action==='summonClaimDay'){
  const {day,due,done,perfect}=summonDay(s,s.lastAt);
  if(r.days.some(d=>d.startsWith(day)))return fail('Today’s habit rewards are already claimed.');
  if(!done)return fail('Complete a daily habit first.');
  const fragments=Math.min(STONE_FRAGMENTS_DAILY_CAP,done)*STONE_FRAGMENTS_PER_DAILY+(perfect?PERFECT_DAY_BONUS:0);
  const ore=Math.min(STONE_FRAGMENTS_DAILY_CAP,done)*ORE_PER_DAILY+(perfect?PERFECT_DAY_ORE:0),bank=artifactState(s);
  add('stoneFragments',fragments);if(perfect){add('insigniaFragments',1);add('starShards',PERFECT_DAY_SHARDS)}
  next.days=[...r.days,day+(perfect?'!':'')].slice(-CLAIM_DAYS);
  return {state:{...s,summon:next,artifacts:{...bank,ore:Math.min(1e9,bank.ore+ore)}},message:perfect?`Perfect day · ${fragments} Acquaint Stone Fragments, 1 insignia fragment, ${PERFECT_DAY_SHARDS} star shards, ${ore} Magic Ore`:`${done}/${due} dailies · ${fragments} Acquaint Stone Fragments, ${ore} Magic Ore`};
 }
 if(action==='summonClaimWeek'){
  const week=weekStartDay(s.lastAt);
  if(r.weeks.includes(week))return fail('This week’s bonus is already claimed.');
  const perfectDays=r.days.filter(d=>d.endsWith('!')&&d.slice(0,10)>=week).length,{areas}=habitEarnings(s.habits,s.lastAt);
  if(perfectDays<WEEK_DAYS_FOR_BONUS||areas<WEEK_AREAS_FOR_BONUS)return fail(`Needs ${WEEK_DAYS_FOR_BONUS} perfect days and ${WEEK_AREAS_FOR_BONUS} life areas this week (now ${perfectDays} and ${areas}).`);
  add('insigniaFragments',PERFECT_WEEK_FRAGMENTS);next.weeks=[...r.weeks,week].slice(-CLAIM_WEEKS);
  return {state:{...s,summon:next},message:`Strong week · ${PERFECT_WEEK_FRAGMENTS} insignia fragments`};
 }
 if(action==='summonRecruit'){
  // A counter, not a gacha: the original's own data shows stones are 0.10% from a pull and the
  // exchange is the real route, and this game is deterministic and offline. You pick, you pay.
  const person=[...FELLOWS.map(f=>({...f,kind:'fellows'})),...FAMILY.map(f=>({...f,kind:'family'}))].find(f=>f.id===target);
  if(!person)return fail('Choose someone the village can invite.');
  if(Object.hasOwn(s[person.kind],person.id))return fail('Already joined. Nothing spent; existing progress kept.');
  const cost=recruitPrice(person.id);
  if(!cost)return fail('No price is recorded for this character yet.');
  const [currency,amount]=Object.entries(cost)[0];
  if(r[currency]<amount)return fail(`Needs ${amount} ${CURRENCY_NAMES[currency]}.`);
  if(r.recruited.length>=RECRUIT_RECEIPTS)return fail('Recruitment record is full.');
  next[currency]=r[currency]-amount;
  next.recruited=[...r.recruited,{id:person.id,kind:person.kind,paid:amount,currency}];
  const joined=person.kind==='fellows'?newFellow():{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1};
  return {state:{...s,summon:next,[person.kind]:{...s[person.kind],[person.id]:joined}},
   message:amount?`${person.name} joined for ${amount} ${CURRENCY_NAMES[currency]}.`:`${person.name} joined your village.`,
   ...(person.kind==='fellows'?{recruited:person.id}:{welcomed:person.id})};
 }
 if(action==='summonStar'){
  // Placed before the forge fall-through below: anything reaching `const kind=target` is treated as
  // a forge target, so a new action must branch above it rather than after it.
  const f=s.fellows?.[target];
  if(!f)return fail('Choose an owned Fellow to star.');
  if(fellowStars(f)>=STAR_CAP)return fail('This Fellow is fully starred.');
  const cost=nextStarCost(f);
  if(r.starShards<cost)return fail(`Needs ${cost} star shards.`);
  next.starShards=r.starShards-cost;
  const stars=fellowStars(f)+1;
  return {state:{...s,summon:next,fellows:{...s.fellows,[target]:{...f,stars}}},
   message:`${stars}★ · +${stars*STAR_APTITUDE_PERCENT}% Aptitude for ${cost} star shards.`};
 }
 const kind=target;
 if(kind==='stone'){
  if(r.stoneFragments<STONE_FRAGMENTS_PER_STONE)return fail(`Needs ${STONE_FRAGMENTS_PER_STONE} Acquaint Stone Fragments.`);
  next.stoneFragments=r.stoneFragments-STONE_FRAGMENTS_PER_STONE;add('stones',1);
  return {state:{...s,summon:next},message:'Forged an Acquaint Stone'};
 }
 if(!SUMMON_KINDS.includes(kind))return fail('Choose an insignia to forge.');
 if(r.insigniaFragments<INSIGNIA_FRAGMENTS_PER_INSIGNIA)return fail(`Needs ${INSIGNIA_FRAGMENTS_PER_INSIGNIA} insignia fragments.`);
 next.insigniaFragments=r.insigniaFragments-INSIGNIA_FRAGMENTS_PER_INSIGNIA;add(kind,1);
 return {state:{...s,summon:next},message:kind==='valiant'?'Forged a Valiant Insignia':'Forged an Archangel Insignia'};
}
export function validSummon(s){
 const r=s?.summon;if(r===undefined)return true;
 return !!r&&typeof r==='object'&&!Array.isArray(r)&&r.policyVersion===1&&int(r.seq,1e9)
  &&['stoneFragments','stones','insigniaFragments','valiant','archangel','starShards'].every(k=>int(r[k]))
  &&Array.isArray(r.days)&&r.days.length<=CLAIM_DAYS&&r.days.every(d=>typeof d==='string'&&DAY.test(d.replace(/!$/,'')))&&new Set(r.days.map(d=>d.slice(0,10))).size===r.days.length
  &&Array.isArray(r.weeks)&&r.weeks.length<=CLAIM_WEEKS&&r.weeks.every(w=>typeof w==='string'&&WEEK.test(w))&&new Set(r.weeks).size===r.weeks.length
  &&(r.recruited===undefined||Array.isArray(r.recruited)&&r.recruited.length<=RECRUIT_RECEIPTS
   &&r.recruited.every(x=>!!x&&typeof x==='object'&&typeof x.id==='string'&&['fellows','family'].includes(x.kind)&&int(x.paid)&&x.paid>=0&&Object.hasOwn(CURRENCY_NAMES,x.currency)&&!!s[x.kind]?.[x.id])
   &&new Set(r.recruited.map(x=>x.id)).size===r.recruited.length);
}
