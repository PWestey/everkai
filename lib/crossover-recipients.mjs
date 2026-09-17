/** The blessing-recipient rule for crossover Family, as ONE function so the shipped lists and the test
 *  that checks them cannot drift apart (docs/crossover-family-plan.md 2.4).
 *
 *  A crossover Family member blesses ten crossover FELLOWS of her own franchise: her own ten-wide BAND
 *  of that franchise's rank order, bands dealt out in Family rank order and wrapping. Ten is the
 *  original's own measured maximum (lib/original-blessing-data.json: min 0, max 10, mean 5.54), so no
 *  value here leaves the original's range, and 30 x 10 = 300 pairings is a structural cap -- this route
 *  can never exceed it.
 *
 *  WHY BANDS RATHER THAN "HER TEN NEAREST IN RANK", which is what shipped first. Measured on the full
 *  data: the 20 MSF Family hold ranks 11..95 and the window started at the first Fellow ranked at or
 *  above hers, so the windows piled up instead of spreading -- 300 pairings reached only 106 of the 133
 *  Fellows, 27 were blessed by NOBODY and one was blessed by 8 of them. Dealing the bands instead makes
 *  coverage as even as this rule can be: every Fellow is blessed, and within a franchise no Fellow is
 *  blessed more than one time more than any other (MSF 200 pairings over 75 Fellows -> 2 or 3 each;
 *  SWGOH 100 over 58 -> 1 or 2 each). The spread across the two franchises differs only because the
 *  owner's roster splits 20 Family : 75 Fellows against 10 : 58, which is a fact about the roster, not
 *  about this rule. The rank relationship survives: the highest-ranked Family member of a franchise
 *  still blesses its highest-ranked Fellows.
 *
 *  It returns FEWER than ten when the franchise has fewer than ten crossover Fellows in the data (a
 *  band cannot name the same Fellow twice). That was the case while only the 2 Fellow prototypes
 *  shipped and every list held one id; all 133 Fellow rows are in the data now, so every list is ten
 *  and the 300 pairings above are reached. A list can only name characters that exist, because
 *  `validBlessings` requires every recipient to resolve through `fellowById`. As rows land or move,
 *  scripts/crossover/build-additions.mjs re-emits the file and regrows the lists from this function;
 *  nothing stored in a save depends on them (no `apkBlessings` record is ever written for an addition),
 *  so regrowing them cannot refuse an older save -- which is exactly why the lists were allowed to be
 *  short, and why re-cutting them here needs no migration (CLAUDE.md rule 12).
 *
 *  `rank` is the owner's rank within the franchise, and this function is the reason every addition row
 *  carries one. A row without it sorts as Infinity, so the pool's order collapses to the id tiebreak
 *  and the bands are cut out of an alphabetical list instead of a ranked one -- which is what the 131
 *  generated Fellow rows did until they were re-emitted with their ranks
 *  (tests/crossover-family.test.mjs pins both). */
const rank=r=>Number.isSafeInteger(r?.rank)?r.rank:Infinity;
const byRank=(a,b)=>rank(a)-rank(b)||a.id.localeCompare(b.id);
export const RECIPIENTS_PER_FAMILY=10;
export function familyRecipients(family,fellowRows,familyRows=[family],limit=RECIPIENTS_PER_FAMILY){
 const game=family.source?.game;
 const pool=fellowRows.filter(f=>f.source?.game===game).slice().sort(byRank);
 if(!pool.length)return [];
 // Her place among the Family of her own franchise decides which band she gets, so the rule needs that
 // list as well as the Fellow pool. Call it through familyRecipientMap for a whole file rather than
 // per row: a bare call defaults to "she is the only one", which is band 0 for everybody.
 const sisters=familyRows.filter(f=>f.source?.game===game).slice().sort(byRank);
 const start=Math.max(0,sisters.findIndex(f=>f.id===family.id))*limit;
 return Array.from({length:Math.min(limit,pool.length)},(_,i)=>pool[(start+i)%pool.length].id);
}
/** Every crossover Family member's list, derived together. This is the form the generator and the
 *  guard test use, because a band is only even with respect to the whole Family list. */
export const familyRecipientMap=(familyRows,fellowRows,limit=RECIPIENTS_PER_FAMILY)=>
 Object.fromEntries(familyRows.map(f=>[f.id,familyRecipients(f,fellowRows,familyRows,limit)]));
