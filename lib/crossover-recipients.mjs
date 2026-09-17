/** The blessing-recipient rule for crossover Family, as ONE function so the shipped lists and the test
 *  that checks them cannot drift apart (docs/crossover-family-plan.md 2.4).
 *
 *  A crossover Family member blesses the ten crossover FELLOWS nearest her in the owner's rank order
 *  within her own franchise, wrapping. Ten is the original's own measured maximum
 *  (lib/original-blessing-data.json: min 0, max 10, mean 5.54), so no value here leaves the original's
 *  range, and 30 x 10 = 300 pairings is a structural cap -- this route can never exceed it.
 *
 *  It returns FEWER than ten when the franchise has fewer than ten crossover Fellows in the data. That
 *  was the case while only the 2 Fellow prototypes shipped and every list held one id; all 133 Fellow
 *  rows are in the data now, so every list is ten and the 300 pairings above are reached. A list can
 *  only name characters that exist, because `validBlessings` requires every recipient to resolve
 *  through `fellowById`. As rows land or move, scripts/crossover/build-additions.mjs re-emits the file
 *  and regrows the lists from this function; nothing stored in a save depends on them (no
 *  `apkBlessings` record is ever written for an addition), so regrowing them cannot refuse an older
 *  save -- which is exactly why the lists were allowed to be short.
 *
 *  `rank` is the owner's rank within the franchise, and this function is the reason every addition row
 *  carries one. A row without it sorts as Infinity, so the pool's order collapses to the id tiebreak
 *  and "nearest in rank" quietly becomes "alphabetical" -- which is what the 131 generated Fellow rows
 *  did until they were re-emitted with their ranks (tests/crossover-family.test.mjs pins both). */
const rank=r=>Number.isSafeInteger(r?.rank)?r.rank:Infinity;
export const RECIPIENTS_PER_FAMILY=10;
export function familyRecipients(family,fellowRows,limit=RECIPIENTS_PER_FAMILY){
 const pool=fellowRows.filter(f=>f.source?.game===family.source?.game).slice().sort((a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id));
 if(!pool.length)return [];
 let start=pool.findIndex(f=>rank(f)>=rank(family));
 if(start<0)start=0;
 return Array.from({length:Math.min(limit,pool.length)},(_,i)=>pool[(start+i)%pool.length].id);
}
