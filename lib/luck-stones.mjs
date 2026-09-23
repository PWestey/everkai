import latency from './latency-data.json' with {type:'json'};
import fathom from './fathom-data.json' with {type:'json'};
import {HABIT_DOMAINS} from './habits.mjs';
/** THE LUCK STONE LEDGER, in one place because two systems spend it.
 *
 *  In the ORIGINAL, Family Latency and Advanced Fathoms compete for exactly one currency --
 *  `Item_Quenching_Wife_1`, "Luck Stone", from the Drakenberg Challenge shop
 *  (docs/character-systems-gap.md 3.1 and 3.3). Everkai now has both systems, so the balance has to
 *  be one number, and both of them have to price against it.
 *
 *  WHY ITS OWN MODULE, rather than living in either one. lib/latency.mjs already imports
 *  lib/fathoms.mjs (for `habitActions` and `fathomsApply`), so putting the shared balance in latency
 *  and reading it from fathoms would close a cycle -- and an `export const x = importedThing` at the
 *  top of a cycle is a temporal-dead-zone crash rather than a type error, which is exactly what this
 *  build hit once already. This module imports neither of them: it reads the two subtrees straight
 *  off the save and the two pinned data files, so it sits below both and can be imported by either.
 *
 *  NOTHING IS STORED. The balance is `earned - spent`, both derived:
 *    earned  the lifetime habit-action counter, which habits.mjs only ever increments and never
 *            resets, so it cannot be bought, rolled back or farmed twice.
 *    spent   the Latency cap levels and Stimulate attempts a save holds, plus the Fathom rolls it
 *            holds, each priced from the pinned table.
 *  That is the same shape lib/trading-post.mjs uses for Goodwill Vouchers and lib/operations.mjs for
 *  Study Notes, and it carries the same rule-12 exposure, stated once here: re-rating the faucet or
 *  re-pricing either ladder would refuse a save that is legal today. Both are pinned by
 *  tests/latency.test.mjs and tests/fathoms.test.mjs. */
export const LUCK_STONE=latency.stimulate.item;
/** LOCAL, and the only invented rate either system has: Luck Stones per lifetime habit action.
 *  Anchored on Fathoms' own pacing rather than guessed -- see lib/latency.mjs, which states the
 *  arithmetic and both halves of its ratio. */
export const STONES_PER_ACTION=10;
export const STIMULATE_COST=latency.stimulate.count;
export const FATHOM_STONE=fathom.roll.stone;
export const FATHOM_PREMIUM_STONE=fathom.roll.premiumStone;
/** Lifetime habit actions. The same sum lib/fathoms.mjs exports as `habitActions`; computed here from
 *  HABIT_DOMAINS directly so this module does not have to import fathoms and close a cycle. */
export const stoneActions=s=>HABIT_DOMAINS.reduce((n,k)=>n+(s?.habits?.totals?.[k]?.actions||0),0);
export const luckStonesEarned=s=>stoneActions(s)*STONES_PER_ACTION;
/** What the stored Latency state cost: one stone a cap level after the free first one, five a Stimulate. */
export function latencyStoneSpend(s){
 let n=0;
 for(const m of Object.values(s?.latency?.members||{})){
  const level=Number.isInteger(m?.level)&&m.level>0?Math.min(m.level,latency.levels.length-1):0;
  for(let k=0;k<level;k++)n+=latency.levels[k].stones||0;
  n+=(Number.isInteger(m?.attempts)&&m.attempts>0?m.attempts:0)*STIMULATE_COST;
 }
 return n;
}
/** What the stored ADVANCED Fathom rolls cost: one stone a roll, three on an all-buildings slot
 *  (System.WifeQuenchingConsumeHigh2). Gold rolls are counted separately and cost no stones. */
const premiumSlot=new Set(fathom.slots.filter(x=>x.premium).map(x=>x.slot));
export function fathomStoneSpend(s){
 let n=0;
 for(const slots of Object.values(s?.fathoms?.rolls||{})){
  for(const [slot,row] of Object.entries(slots||{})){
   const advanced=Number.isInteger(row?.advanced)&&row.advanced>0?row.advanced:0;
   n+=advanced*(premiumSlot.has(Number(slot))?FATHOM_PREMIUM_STONE:FATHOM_STONE);
  }
 }
 return n;
}
export const luckStonesSpent=s=>latencyStoneSpend(s)+fathomStoneSpend(s);
export const luckStones=s=>luckStonesEarned(s)-luckStonesSpent(s);
