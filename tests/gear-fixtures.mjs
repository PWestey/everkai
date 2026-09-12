// Fixtures standing in for the deleted free gear grants (claimAllGear, claimGear, sandboxAdventure).
// These seed state directly instead of dispatching an action on purpose: most of the tests that used
// those grants are about bonds, blessings, mine clearance or migrations, not about acquisition.
// Routing them through the forge would break a dozen unrelated files every time a forge price moves.
// The forge has its own coverage in artifact-forge.test.mjs.
import {GEAR,EXTRA_ITEMS} from '../lib/adventure.mjs';

/** One more copy of every artifact, exactly as claimAllGear gave. */
export const stockAll=s=>({...s,inventory:{...s.inventory,...Object.fromEntries(GEAR.map(g=>[g.id,Math.min(1e6,(s.inventory[g.id]||0)+1)]))}});

/** One more copy of the named artifacts only, as claimGear gave one at a time. */
export const stock=(s,...ids)=>({...s,inventory:{...s.inventory,...Object.fromEntries(ids.map(id=>[id,Math.min(1e6,(s.inventory[id]||0)+1)]))}});

/** Exactly what sandboxAdventure granted: currency, Fellow EXP and 10 of each carried item.
 *  Gifts are deliberately untouched — the old grant covered EXTRA_ITEMS only, and bonds.test.mjs
 *  distinguishes gift ids from the rest. */
export const supplied=s=>({...s,gold:Math.min(1e12,s.gold+100000),crystals:Math.min(1e9,s.crystals+1000),fellowXP:Math.min(1e9,s.fellowXP+50000),inventory:{...s.inventory,...Object.fromEntries(EXTRA_ITEMS.map(i=>[i.id,Math.min(1e6,(s.inventory[i.id]||0)+10)]))}});
