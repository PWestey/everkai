// Fixtures standing in for the deleted free gear grants (claimAllGear, claimGear, sandboxAdventure).
// These seed state directly instead of dispatching an action on purpose: most of the tests that used
// those grants are about bonds, blessings, mine clearance or migrations, not about acquisition.
// Routing them through the forge would break a dozen unrelated files every time a forge price moves.
// The forge has its own coverage in artifact-forge.test.mjs.
import {GEAR,EXTRA_ITEMS} from '../lib/adventure.mjs';
import {BUSINESSES,businessCost} from '../lib/businesses.mjs';

/** Enough gold to open businesses, for tests that are about what a business does rather than about
 *  affording it. Opening costs the original's own prices -- 50 for the Inn up to 75,000,000,000 for
 *  the last building -- so a 250-gold fresh() save cannot reach past the Apothecary.
 *  tests/business-opening-cost.test.mjs is what guards the prices themselves. */
export const WHOLE_LADDER=BUSINESSES.reduce((n,b)=>n+(businessCost(b.id)||0),0);
export const funded=(s,gold=WHOLE_LADDER)=>({...s,gold:s.gold+gold});
/** Exactly what the named businesses cost to open. Prefer this over the whole ladder wherever a test
 *  asserts an absolute gold balance, or spends gold as part of what it measures: adding only what is
 *  about to be spent leaves every downstream figure exactly as it was before opening cost anything. */
export const costOf=(...ids)=>ids.reduce((n,id)=>n+(businessCost(id)||0),0);

/** Staff a business directly, for tests about what a business *does* rather than about affording it.
 *  Hiring charges the original's curve, where 200 workers at the Clinic cost 336 billion and 5,000 at
 *  the Museum exceed the safe-integer range entirely -- so funding these fixtures would bury what each
 *  test actually measures, and in one case is impossible. Seeding keeps the save valid: validBusinesses
 *  checks the count and its ceiling, not how the workers arrived.
 *  tests/staffing.test.mjs and tests/businesses.test.mjs are what guard the prices themselves. */
export const staffed=(s,id,employees)=>({...s,enterprises:{...s.enterprises,[id]:{...s.enterprises[id],employees}}});
// staffed() writes `employees` directly, so it is only sound before startPaidStaffing: once apkStaffing
// exists, staffingStatus/validStaffing replay the event log and ignore the field. covered() is the
// free-coverage equivalent -- the same [kind 0] event recordStaff writes for a Hire Card.
export const covered=(s,id,count)=>{const b=s.enterprises[id];return {...s,enterprises:{...s.enterprises,[id]:{...b,employees:b.employees+count,apkStaffing:{...b.apkStaffing,events:[...b.apkStaffing.events,[0,count,0]]}}}};};

/** One more copy of every artifact, exactly as claimAllGear gave. */
export const stockAll=s=>({...s,inventory:{...s.inventory,...Object.fromEntries(GEAR.map(g=>[g.id,Math.min(1e6,(s.inventory[g.id]||0)+1)]))}});

/** One more copy of the named artifacts only, as claimGear gave one at a time. */
export const stock=(s,...ids)=>({...s,inventory:{...s.inventory,...Object.fromEntries(ids.map(id=>[id,Math.min(1e6,(s.inventory[id]||0)+1)]))}});

/** Exactly what sandboxAdventure granted: currency, Fellow EXP and 10 of each carried item.
 *  Gifts are deliberately untouched — the old grant covered EXTRA_ITEMS only, and bonds.test.mjs
 *  distinguishes gift ids from the rest. */
export const supplied=s=>({...s,gold:Math.min(1e12,s.gold+100000),crystals:Math.min(1e9,s.crystals+1000),fellowXP:Math.min(1e9,s.fellowXP+50000),inventory:{...s.inventory,...Object.fromEntries(EXTRA_ITEMS.map(i=>[i.id,Math.min(1e6,(s.inventory[i.id]||0)+10)]))}});
