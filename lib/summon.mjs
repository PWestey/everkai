import {habitDay,habitDue,habitEarnings} from './habits.mjs';
import {artifactState} from './artifacts.mjs';
// Habits pay for new characters. A completed daily gives Acquaint Stone Fragments; a perfect day also gives an
// insignia fragment and star shards; a strong week gives extra insignia fragments. All of these numbers are local.
export const STONE_FRAGMENTS_PER_DAILY=2,STONE_FRAGMENTS_DAILY_CAP=6,PERFECT_DAY_BONUS=4,STONE_FRAGMENTS_PER_STONE=10;
export const INSIGNIA_FRAGMENTS_PER_INSIGNIA=5,PERFECT_WEEK_FRAGMENTS=2,PERFECT_DAY_SHARDS=10,WEEK_DAYS_FOR_BONUS=5,WEEK_AREAS_FOR_BONUS=5;
// Magic Ore is earned, never granted. Its only sink is artifact upgrades (10-70 ore per level by tier),
// and the banquet shop and Golemore mine already supply ~25/day, so habits carry the rest of a steady pace.
export const ORE_PER_DAILY=6,PERFECT_DAY_ORE=24;
export const SUMMON_KINDS=['valiant','archangel'],CLAIM_DAYS=40,CLAIM_WEEKS=8,SUMMON_MAX=1e6;
/** What a character costs. N and R sit below one whole stone, so they are priced in the finer unit:
 *  ten fragments make a stone, so an N is three fragments rather than a stone that would overcharge
 *  for the cheapest characters in the game. Set members take their own insignia. */
export const SUMMON_COSTS={N:{stoneFragments:3},R:{stoneFragments:5},SR:{stones:1},SSR:{stones:2},'SSR+':{stones:3},UR:{insignias:2},'UR*':{insignias:2},set:{insignias:1}};
const int=(v,max=SUMMON_MAX)=>Number.isInteger(v)&&v>=0&&v<=max;
const DAY=/^\d{4}-\d{2}-\d{2}$/,WEEK=/^\d{4}-\d{2}-\d{2}$/;
export const summonState=s=>s.summon||{policyVersion:1,seq:0,stoneFragments:0,stones:0,insigniaFragments:0,valiant:0,archangel:0,starShards:0,days:[],weeks:[]};
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
 if(!['summonClaimDay','summonClaimWeek','summonForge'].includes(action))return null;
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
  &&Array.isArray(r.weeks)&&r.weeks.length<=CLAIM_WEEKS&&r.weeks.every(w=>typeof w==='string'&&WEEK.test(w))&&new Set(r.weeks).size===r.weeks.length;
}
