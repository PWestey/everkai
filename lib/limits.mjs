// Shared ceilings. A leaf module with no imports, because game.mjs imports every module that clamps
// these values -- exporting the constant from there would be circular, which is why `1e9` was
// copy-pasted into nine separate files instead.

/** Fellow EXP the wallet may hold.
 *  The old ceiling was 1e9, BELOW the 5,851,433,930 one Fellow costs to reach the original's level
 *  cap of 750 -- so the ladder was unreachable at any faucet rate, and a save above 1e9 was refused
 *  outright by decode(). Widening only accepts more, so existing saves stay valid; the reverse (a
 *  save written above the old bound, opened by an older cached build) is the deploy-ordering hazard
 *  recorded in BUG-39. 1e13 clears a full 154-Fellow roster with room to spare and stays far below
 *  Number.MAX_SAFE_INTEGER, matching the 1e12 gold ceiling already used elsewhere. */
export const MAX_FELLOW_XP=1e13;
