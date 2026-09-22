import {REMOVED} from './catalog.mjs';
import data from './trading-post-data.json' with {type:'json'};import {FELLOWS} from './catalog.mjs';import {bondedPower} from './adventure.mjs';
import {COURAGE_MAX,TAX_MAX,courageBp,courageCost,motivatedPower,taxUpgradeCost,taxSpent,taxBuffBp,taxCapacitySeconds,taxRate,taxStored,VOUCHER_ITEM} from './trading-post-ladders.mjs';
import {fishArtifactTaxBp} from './fishing.mjs';
export const TRADE_OPPONENTS=data.localOpponents,TRADE_SHOP=data.shop;
export {COURAGE_MAX,TAX_MAX,courageBp,courageCost,motivatedPower,taxUpgradeCost,taxBuffBp,taxCapacitySeconds,taxRate,VOUCHER_ITEM};
const int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max,day=s=>Math.floor(s.lastAt/86400000),defaultEnergy=s=>({day:day(s),energy:1,refills:0,recoverAt:null});
// THE TWO LADDERS (2026-09-22, scripts/import-trading-post-ladders.py; lib/trading-post-ladders.mjs
// holds their arithmetic). lib/trading-post-data.json was community-wiki sourced and had NO
// progression at all, which is what the owner's "does the trading post level up to give more coins?"
// was asking about. Two rows of the original answer it, and NEITHER of them is a timed buff:
//
//   MOTIVATE (CommercialWarCourage, 20 rows). Rule:text:CommercialWar_4 -- "During the Preparation
//   stage, Transcenders can spend Gold to Motivate the team and temporarily improve their Power."
//   +2% team ATK a level to +40%, priced at `cumulative consumeBase.count x prosperity` gold. It is
//   bought per negotiation and stored ON the run, so a saved run's motivated Power is frozen with the
//   rest of the run exactly as the team snapshot already was.
//
//   MY COUNTER (CommercialWarTax, 200 rows). Rule:text:CommercialWar_7/_8 -- "a building that
//   continuously accumulates Gold ... Consume Goodwill Vouchers to Level Up the Counter to increase
//   its gold production speed and capacity. The counter's max capacity will be reached automatically
//   after upgrading." `taxBuff` is basis points of prosperity per SECOND (a permanent rate, not a
//   buff), `taxTimeLimit` the store's capacity in seconds of production. THE OFFLINE ADAPTATION IS
//   NONE: taxTimeLimit already IS an offline accumulation cap, so the Counter is stored as a level
//   and a `collectedAt`, and what it holds is derived from elapsed time the same way the original's
//   server derives it. Level 1 is +20% of village income capped at 20 minutes; level 200 is +460%
//   capped at 8h20m.
//
// LOCAL: the Goodwill Voucher faucet. The original pays negotiation rewards from a SERVER-side table
// (System.json names Reward_CommercialWar_RewardBase and CommercialWarRewardCoefficient2 = 0.5 against
// CommercialWarItemBase2 = Item_LvUp_ClanWar_1, but the reward row itself is not in the config dump and
// no readable client line computes it -- positive control: the same sweep finds the Courage cost and
// the tax yield in CommercialWarManager.lua). So the RATE is Everkai's, one voucher a won duel, and it
// is written onto each receipt beside `coinPerWin` so a later re-price cannot invalidate old ones.
// Receipts from before this change have no `voucherPerWin` and are read at the same constant, which
// only ever adds vouchers to an existing save -- it never refuses one.
export const VOUCHER_PER_WIN=1;
export function negotiationEnergy(s,id){const e=s.tradingPost?.energy[id];if(!e||e.day<day(s))return defaultEnergy(s);if(e.energy===0&&e.recoverAt!==null&&s.lastAt>=e.recoverAt&&e.refills<3)return {...e,energy:1,refills:e.refills+1,recoverAt:null};return e}
export function tradingPost(s){const t=s.tradingPost||{policyVersion:1,seq:0,coins:0,influence:0,energy:{},run:null,history:[],shop:{day:day(s),bought:0}};return t.shop.day<day(s)?{...t,shop:{day:day(s),bought:0}}:t}
/** Vouchers a receipt paid. Absent on every receipt written before 2026-09-22; see VOUCHER_PER_WIN. */
const runVouchers=r=>r.wins*(r.voucherPerWin===undefined?VOUCHER_PER_WIN:r.voucherPerWin);
export const vouchersEarned=s=>tradingPost(s).history.reduce((n,r)=>n+runVouchers(r),0);
/** The Counter, or null when it has not been opened. */
export const counter=s=>s.tradingPost?.counter||null;
/** Unspent Goodwill Vouchers: every completed negotiation's, less the ladder's price of the level held. */
export const vouchers=s=>vouchersEarned(s)-taxSpent(counter(s)?.level||1);
/** Gold waiting in the Counter right now. Derived, never stored -- so an offline day banks exactly what
 *  the capacity allows and not a gold more. */
export function counterStored(s,prosperity){const c=counter(s);return c?taxStored(c.level,prosperity,(s.lastAt-c.collectedAt)/1000,fishArtifactTaxBp(s)):0}
export const counterRate=(s,prosperity)=>{const c=counter(s);return c?taxRate(c.level,prosperity,fishArtifactTaxBp(s)):0};
export const counterFull=s=>{const c=counter(s);return !!c&&(s.lastAt-c.collectedAt)/1000>=taxCapacitySeconds(c.level)};
function validCounter(c,s){
 if(c===undefined)return true;
 if(!c||c.policyVersion!==1||!int(c.level,TAX_MAX)||c.level<1||!Number.isSafeInteger(c.collectedAt)||c.collectedAt<0||c.collectedAt>s.lastAt)return false;
 // Rule 12: `level` is checked against a value DERIVED from the receipts, so a re-priced ladder or a
 // re-rated voucher would refuse a legal save. Both are pinned by tests/trading-post.test.mjs.
 return taxSpent(c.level)<=vouchersEarned(s);
}
function validRun(r,s){return r&&r.policyVersion===1&&int(r.id)&&r.simulated===true&&r.opponent&&TRADE_OPPONENTS.some(x=>x.id===r.opponent.id)&&int(r.opponent.power,1e15)&&typeof r.opponent.name==='string'&&r.opponent.name.length<80&&Array.isArray(r.team)&&r.team.length>0&&r.team.length<=6&&new Set(r.team.map(p=>p?.id)).size===r.team.length
 // Courage and the pre-Motivate Power are BOTH absent on every run written before 2026-09-22, and a run
 // that carries one must carry the other: a stored `power` has to be exactly what this Courage does to
 // the stored `base`, so a receipt can never claim a win Motivate did not buy.
 &&(r.courage===undefined?r.courageGold===undefined&&r.team.every(p=>p?.base===undefined):int(r.courage,COURAGE_MAX)&&int(r.courageGold,1e15)&&r.team.every(p=>p&&int(p.base,1e15)&&p.power===motivatedPower(p.base,r.courage)))
 &&r.team.every(p=>p&&(s.fellows?.[p.id]||REMOVED.has(p.id))&&typeof p.name==='string'&&p.name.length<80&&int(p.power,1e15)&&p.paidEnergy===1&&p.won===(p.power>=r.opponent.power))&&r.wins===r.team.filter(p=>p.won).length&&int(r.coinPerWin,1e6)&&int(r.influencePerWin,1e6)&&(r.voucherPerWin===undefined||int(r.voucherPerWin,1e6))&&r.coins===r.wins*r.coinPerWin&&r.influence===r.wins*r.influencePerWin&&Number.isSafeInteger(r.startedAt)&&r.startedAt>=0&&r.startedAt<=s.lastAt&&Number.isSafeInteger(r.readyAt)&&r.readyAt>r.startedAt}
export function validTradingPost(s){if(s?.tradingPost===undefined)return true;const t=s.tradingPost;if(!t||t.policyVersion!==1||!int(t.seq)||!int(t.coins)||!int(t.influence)||!t.energy||Array.isArray(t.energy)||!Object.entries(t.energy).every(([id,e])=>s.fellows?.[id]&&e&&int(e.day)&&e.day<=day(s)&&int(e.energy,1)&&int(e.refills,3)&&(e.recoverAt===null||e.energy===0&&e.refills<3&&Number.isSafeInteger(e.recoverAt)&&e.recoverAt>=0))||!Array.isArray(t.history)||t.history.length>10000||!t.shop||!int(t.shop.day)||t.shop.day>day(s)||!int(t.shop.bought,10))return false;const ids=new Set();for(const r of t.history){if(!validRun(r,s)||r.id>t.seq||ids.has(r.id)||!Number.isSafeInteger(r.completedAt)||r.completedAt<r.readyAt||r.completedAt>s.lastAt)return false;ids.add(r.id)}if(!validCounter(t.counter,s))return false;return t.run===null||validRun(t.run,s)&&t.run.id<=t.seq&&!ids.has(t.run.id)}
export function tradingAction(s,action,target,value,prosperity=0){if(!['tradeBegin','tradeComplete','tradeBuy','tradeOpenCounter','tradeCollectCounter','tradeUpgradeCounter'].includes(action))return null;const old=tradingPost(s),fail=error=>({state:s,error});if(value?.seq!==old.seq||old.seq>=1e9)return fail('The Trading Post changed. Use current controls.');const t={...old,seq:old.seq+1,energy:{...old.energy}};
 if(action==='tradeBegin'){const opponent=TRADE_OPPONENTS.find(x=>x.id===target),ids=value.team,courage=value.courage||0;if(t.run)return fail('Complete your saved negotiation first.');if(t.history.length>=10000)return fail('Negotiation record capacity reached.');if(!opponent||!Array.isArray(ids)||ids.length<1||ids.length>6||new Set(ids).size!==ids.length||!ids.every(id=>Object.hasOwn(s.fellows,id)))return fail('Choose one to six different owned Fellows.');if(!int(courage,COURAGE_MAX))return fail(`Motivate up to ${COURAGE_MAX} levels.`);const gold=courageCost(courage,prosperity);if(gold>s.gold)return fail('Not enough gold to Motivate. No Energy spent.');if(ids.some(id=>negotiationEnergy(s,id).energy<1))return fail('A selected Fellow needs Negotiation Energy. No Energy spent.');const team=ids.map(id=>{const e=negotiationEnergy(s,id);t.energy[id]={...e,energy:0,recoverAt:e.refills<3?s.lastAt+3600000:null};const base=bondedPower(s,id),power=motivatedPower(base,courage);return {id,name:FELLOWS.find(f=>f.id===id).name,base,power,paidEnergy:1,won:power>=opponent.power}}),wins=team.filter(p=>p.won).length;t.run={policyVersion:1,id:t.seq,simulated:true,opponent:{...opponent},team,wins,courage,courageGold:gold,coinPerWin:30,influencePerWin:2,voucherPerWin:VOUCHER_PER_WIN,coins:wins*30,influence:wins*2,startedAt:s.lastAt,readyAt:s.lastAt+3000};return {state:{...s,gold:s.gold-gold,tradingPost:t},message:`Negotiation saved${courage?` · Motivated +${courageBp(courage)/100}% for ${gold.toLocaleString()} gold`:''} · opponents are simulated offline merchants.`};}
 if(action==='tradeComplete'){const r=t.run;if(!r||r.id!==target||s.lastAt<r.readyAt)return fail('Wait until this negotiation is ready.');if(t.coins+r.coins>1e9||t.influence+r.influence>1e9)return fail('Reward balance is full. Paid negotiation retained.');t.coins+=r.coins;t.influence+=r.influence;t.history=[...t.history,{...r,completedAt:s.lastAt}];t.run=null;const v=runVouchers(r);return {state:{...s,tradingPost:t},message:`${r.wins}/${r.team.length} duels won · ${r.coins} Trade Coins · ${r.influence} Influence${v?` · ${v} Goodwill Voucher${v>1?'s':''}`:''}.`};}
 // MY COUNTER. Opening is free, as the original's is: the rules text prices only the LEVEL UPS.
 if(action==='tradeOpenCounter'){if(t.counter)return fail('My Counter is already open.');t.counter={policyVersion:1,level:1,collectedAt:s.lastAt};return {state:{...s,tradingPost:t},message:`My Counter open · ${taxBuffBp(1,fishArtifactTaxBp(s))/100}% of village earnings a second, holding ${Math.round(taxCapacitySeconds(1)/60)} minutes.`};}
 if(action==='tradeCollectCounter'){const c=t.counter;if(!c)return fail('Open My Counter first.');const gold=counterStored(s,prosperity);if(!gold)return fail('My Counter has nothing banked yet.');if(s.gold+gold>1e15)return fail('Gold balance is full. The Counter keeps its takings.');t.counter={...c,collectedAt:s.lastAt};return {state:{...s,gold:s.gold+gold,tradingPost:t},message:`Collected ${gold.toLocaleString()} gold from My Counter.`};}
 if(action==='tradeUpgradeCounter'){const c=t.counter;if(!c)return fail('Open My Counter first.');const cost=taxUpgradeCost(c.level);if(cost===null)return fail('My Counter is at its level limit.');if(vouchers(s)<cost)return fail(`Win ${cost-vouchers(s)} more negotiation duels for Goodwill Vouchers.`);
  // Rule:text:CommercialWar_8: "The counter's max capacity will be reached automatically after
  // upgrading." So the new level's store is full the instant it is bought, which is why the upgrade
  // moves collectedAt BACK by the new capacity rather than forward to now.
  const level=c.level+1,filled=Math.max(0,s.lastAt-taxCapacitySeconds(level)*1000);t.counter={...c,level,collectedAt:filled};
  return {state:{...s,tradingPost:t},message:`My Counter level ${level} · ${taxBuffBp(level,fishArtifactTaxBp(s))/100}% a second, holding ${Math.round(taxCapacitySeconds(level)/60)} minutes · filled on upgrade.`};}
 const q=value.count;if(target!==TRADE_SHOP.id||![1,5].includes(q)||t.coins<TRADE_SHOP.price*q||t.shop.bought+q>10||s.inventory[target]+q>1e6)return fail('Choose an affordable exchange with daily and Bag space.');t.coins-=TRADE_SHOP.price*q;t.shop={...t.shop,bought:t.shop.bought+q};return {state:{...s,tradingPost:t,inventory:{...s.inventory,[target]:s.inventory[target]+q}},message:`Bought ${q} Basic Earnings Card. Use in Bag for village gold.`};
}
