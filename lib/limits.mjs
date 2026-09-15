// Shared ceilings. A leaf module with no imports, because game.mjs imports every module that clamps
// these values -- exporting the constant from there would be circular, which is why `1e9` was
// copy-pasted into nine separate files instead.

/** Fellow EXP the wallet may hold.
 *  The old ceiling was 1e9, BELOW the 5,851,433,930 one Fellow costs to reach the original's level
 *  cap of 750 -- so the ladder was unreachable at any faucet rate, and a save above 1e9 was refused
 *  outright by decode(). Widening only accepts more, so existing saves stay valid; the reverse (a
 *  save written above the old bound, opened by an older cached build) is the deploy-ordering hazard
 *  recorded in BUG-39. 1e13 clears a full 154-Fellow roster with room to spare and stays far below
 *  Number.MAX_SAFE_INTEGER, below MAX_GOLD. */
export const MAX_FELLOW_XP=1e13;

/** Gold the wallet and the uncollected pool may hold.
 *  Was 1e12 in the wallet and 1e9 in `pending`. The original shows balances in hundreds of trillions
 *  (645.8T in an owner screenshot), its staffing curve charges ~1.8e13 for 5,000 Inn workers (unaffordable
 *  under 1e12), and at 500M/s the 1e9 pending clamp filled in two seconds, so a night away paid two
 *  seconds of income. The 12-hour offline window (System.json offlineMaxTime 43,200 s) is the
 *  original's only limit on away income. 1e15 stays ~9x below Number.MAX_SAFE_INTEGER, so sums of a
 *  capped wallet and a capped pool remain exact. */
export const MAX_GOLD=1e15;
