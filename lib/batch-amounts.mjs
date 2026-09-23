/** THE BATCH SIZES A FELLOW'S APTITUDE LADDERS ACCEPT.
 *
 *  The original's repeatable spends all wear the same 4-segment quantity selector, `Quick | x1 | x10 |
 *  x100`, with the button showing the count that is actually affordable
 *  (docs/fellow-screen-specs/README.md convention 4; captured on img/aptitude-skill.png,
 *  img/aptitude-origin-boost.png, img/operation.png and img/upgrade-below-cap.png). Everkai's ladders
 *  each grew their own set -- 1/5/max here, 1/10/max there, 1/5/25/max on talent skills -- so the same
 *  control could not be used twice.
 *
 *  Widening the set is NOT a balance change. Every one of these plans is
 *  `count = min(requested, levels remaining, units affordable)` and prices `count x cost`, so `+100` is
 *  exactly what a hundred `+1` presses cost and grants. The receipts these actions write aggregate
 *  (aptitudeLedger keys by what was paid; originalTalent stores one {from,to} span), so a batched save
 *  and a singly-trained save are the same save -- no stored value is derived from the batch size
 *  (CLAUDE.md rule 12).
 *
 *  5 and 25 stay in the list because tests, lib/fellow-reset.mjs and lib/helper.mjs already name them. */
export const BATCH_AMOUNTS=Object.freeze([1,5,10,25,100,'max']);
export const isBatchAmount=amount=>BATCH_AMOUNTS.includes(amount);
