// THE TRADING POST'S TWO PROGRESSION LADDERS (2026-09-22, scripts/import-trading-post-ladders.py).
// The owner asked "does the trading post level up to give more coins?" -- it does, twice, and neither
// half was built. Everything numeric here comes out of lib/trading-post-ladder-data.json; this module
// holds only the arithmetic and the two local adaptations, both named.
import data from './trading-post-ladder-data.json' with {type:'json'};

export const COURAGE=data.courage,TAX=data.tax,TRADE_CONSTANTS=data.constants;
export const COURAGE_MAX=COURAGE.length,TAX_MAX=TAX.length;
/** CommercialWarTaxOutputInterval, seconds. The store ticks once an interval; a cap is a whole number of ticks. */
export const TAX_INTERVAL=TRADE_CONSTANTS.CommercialWarTaxOutputInterval;
export const VOUCHER_ITEM=data.voucherItem,GOLD_ITEM=data.goldItem;

/** Team-ATK bonus in basis points at `n` bought Courage levels. 200 a level, 0 at none.
 *  CommercialWarManager.lua:310 `allAtk * (1 + CommercialWarInspireItAtkPercent * courageNum / 10000)`. */
export const courageBp=n=>n>0?COURAGE[Math.min(n,COURAGE_MAX)-1].powerBp:0;
/** The original's gold price of `n` Courage levels: floor(cumulative consumeBase.count x prosperity).
 *  CommercialWarManager.lua:362-376. `prosperity` is totalProsperityPower -- gold per second. */
export const courageCost=(n,prosperity)=>n>0?Math.floor(COURAGE[Math.min(n,COURAGE_MAX)-1].goldPerProsperity*Math.max(0,prosperity)):0;
/** Motivated Power: the original scales the TEAM's summed ATK, and Everkai compares Fellow by Fellow,
 *  so the same factor is applied to each Fellow's Power. floor() matches math.ceil's neighbour choice
 *  nowhere, so this rounds DOWN deliberately: a motivated Fellow never wins a duel it would lose at
 *  an exact threshold by a rounding artefact. */
export const motivatedPower=(power,n)=>Math.floor(power*(1+courageBp(n)/10000));

/** Vouchers to leave `level`. The last row has no successor. */
export const taxUpgradeCost=level=>level>=TAX_MAX?null:TAX[level-1].cost;
/** Vouchers spent reaching `level` from 1. */
export function taxSpent(level){let t=0;for(let l=1;l<level;l++)t+=TAX[l-1].cost;return t}
/** Basis points of prosperity the Counter produces per SECOND at `level`, plus any fishing-artifact
 *  bonus. CommercialWarManager.lua:53-67 -- `taxBuff = cwTaxConf.taxBuff + count_fishAdd`, then
 *  `yieldSec = totalProsperityPower * taxBuff / 10000`. `count_fishAdd` has exactly one source in the
 *  whole config set: the fishing artifact FishArtifact_4501 (CommercialWarCoinUP). */
export const taxBuffBp=(level,fishBp=0)=>TAX[Math.min(Math.max(level,1),TAX_MAX)-1].taxBuff+Math.max(0,fishBp);
/** Capacity in SECONDS of production. CommercialWarManager.lua:546-547 reads taxTimeLimit as a time
 *  limit and divides it by the output interval to get a tick count -- it is a store size, not a buff
 *  duration. Nothing about it needed adapting for offline play: it IS the offline accumulation cap. */
export const taxCapacitySeconds=level=>TAX[Math.min(Math.max(level,1),TAX_MAX)-1].taxTimeLimit;
/** Gold a second at `level`. */
export const taxRate=(level,prosperity,fishBp=0)=>Math.max(0,prosperity)*taxBuffBp(level,fishBp)/10000;
/** Gold the store holds after `seconds` uncollected, floored to whole ticks and capped, exactly as
 *  CommercialWarManager.lua:544-549 counts them: floor(elapsed / interval), never more than
 *  floor(capacity / interval). */
export function taxStored(level,prosperity,seconds,fishBp=0){
 const ticks=Math.min(Math.floor(Math.max(0,seconds)/TAX_INTERVAL),Math.floor(taxCapacitySeconds(level)/TAX_INTERVAL));
 return Math.floor(ticks*TAX_INTERVAL*taxRate(level,prosperity,fishBp));
}
