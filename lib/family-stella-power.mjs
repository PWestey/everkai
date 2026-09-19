import {STELLA_BLESS_PAIRS,familyStellaRow} from './family-stella.mjs';
import {stellaEntry} from './stella.mjs';
import {blessingValue,BLESSINGS} from './blessings.mjs';
import {isAddition,additionRecipients} from './everkai-additions.mjs';
import {hasAffinity} from './public-reference.mjs';
/** What Family Stella and the Stella-unlocked blessing pairs pay one Fellow (spec 3.1, 3.4). Pure, derived.
 *
 *  THE STELLA-UNLOCKED PAIRS ARE A SEPARATE SET (rule 12, spec 3.4). WifeBless carries 58 pairs that exist only
 *  once the Fellow's OWN Stella reaches a rank (Orivita's rank 4 opens wife 115's blessing to her: 6,800 bp +
 *  2,525,000 on the owner's panel). They are NOT added to `source.recipients`: validBlessings requires every
 *  stored apkBlessings record's `recipients` to equal that list exactly, so widening it would refuse every save
 *  holding a record for those 58 members. Instead they are read here from the Fellow's Stella rank, and pay the
 *  member's CURRENT ladder value (blessingValue) -- exactly what a listed recipient receives -- as their own
 *  `familyPair` parts, less whatever blessingPower already pays that pair. */
/** Does blessingPower already pay this member's blessing to this Fellow? The same test it applies. */
function blessedByLadder(s,wife,id){const f=s.family?.[wife];if(!f)return false;
 for(const key of Object.keys(BLESSINGS)){const h=f.apkBlessings?.[key];if(h)return h.recipients.includes(id)||h.legacyRecipients.includes(id);}
 return isAddition(wife)?additionRecipients(wife).includes(id):hasAffinity(wife,id);}
/** The pairs this save's Stella ranks have unlocked: [wife, hero]. */
export function stellaBlessPairs(s){const out=[];for(const [wife,hero,rank] of STELLA_BLESS_PAIRS){if(!s.family?.[wife]||!s.fellows?.[hero])continue;const e=stellaEntry(s,hero);if(e&&e.level>=rank)out.push([wife,hero]);}return out;}
/** What blessingPower ALREADY pays this pair for one ladder, by its own rule: an APK record pays a legacy
 *  recipient the value frozen at the record's creation and a listed recipient the growth since; with no record,
 *  an affinity pair is paid the whole current value. */
function paidByLadder(s,wife,id,key){const f=s.family[wife],h=f.apkBlessings?.[key];
 if(!h)return (isAddition(wife)?additionRecipients(wife).includes(id):hasAffinity(wife,id))?blessingValue(f,key):0;
 return (h.legacyRecipients.includes(id)?h.value:0)+(h.recipients.includes(id)?blessingValue(f,key)-h.value:0);}
/** An unlocked pair receives the member's whole CURRENT ladder value -- what a listed recipient gets -- less
 *  whatever blessingPower already pays it (typically the value frozen in an APK record's legacy list). */
export function familyPairBlessing(s,id){const out={flat:0,percent:0};
 for(const [wife,hero] of stellaBlessPairs(s)){if(hero!==id)continue;const f=s.family[wife];
  out.flat+=Math.max(0,blessingValue(f,'flatBlessing')-paidByLadder(s,wife,id,'flatBlessing'));
  out.percent+=Math.max(0,blessingValue(f,'advancedBlessing')-paidByLadder(s,wife,id,'advancedBlessing'));}
 return out;}
/** Family Stella: every activated member whose blessing reaches this Fellow (her ladder or an unlocked pair). */
export function familyStellaParts(s,id){const out={talent:0,percent:0,limit:0};
 const pairs=stellaBlessPairs(s);
 for(const wife of Object.keys(s.familyStella?.ranks||{})){const row=familyStellaRow(s,wife);if(!row||!s.family?.[wife])continue;
  if(!blessedByLadder(s,wife,id)&&!pairs.some(([w,h])=>w===wife&&h===id))continue;
  out.talent+=row[1];out.percent+=row[2];out.limit+=row[3];}
 return out;}
