import test from 'node:test';
import assert from 'node:assert/strict';
import {FAMILY,FELLOWS} from '../lib/catalog.mjs';
import blessings from '../lib/original-blessing-data.json' with {type:'json'};
import special from '../lib/special-blessing-data.json' with {type:'json'};
import {FAMILY_PICTURES} from '../lib/family-gallery.mjs';
import {COSTUMES} from '../lib/wardrobe.mjs';
import {FATHOM_SLOTS,FATHOM_STEPS} from '../lib/fathoms.mjs';
import fathoms from '../lib/fathom-data.json' with {type:'json'};

// Coverage guard for the Family slice's shipped data tables (CLAUDE.md rule 8). Each count below was
// measured on 2026-09-15 against the original's own tables in
// .../apk-audit/configs/config/logic/, and the ORIGINAL half of every ratio is written down next to
// the Everkai half so a future drift report cannot silently mix the two sources again.
//
// These are deliberately exact equalities, not ">= 0" smoke checks: the failure mode this guards
// against is a table quietly shrinking or growing (F14 recorded 175 date pictures on 2026-09-12 and
// the real figure was already 177 by 2026-09-15, with nothing failing in between).

const pairs = o => Object.values(o).reduce((n, a) => n + a.length, 0);
const familyIds = new Set(FAMILY.map(f => f.id));
const fellowIds = new Set(FELLOWS.map(f => f.id));

test('blessing recipient tables ship the exact derived cast, in lockstep with each other', () => {
 // ORIGINAL (WifeBless.json): 798 rows, 739 carrying a heroid, 129 distinct wifeid, 58 spirit-gated.
 // Restricted to the 107 Family members Everkai rosters that is 651 pairs; dropping the 49 spirit-gated
 // ones leaves 602; keeping only heroes in Everkai's 159-Fellow roster leaves 593.
 // EVERKAI: exactly those 593, with a zero-length set difference in both directions.
 assert.equal(Object.keys(blessings.recipients).length, 107);
 assert.equal(pairs(blessings.recipients), 593);
 // The Special Blessing table reuses the same cast; if they ever diverge, specialEligible and
 // blessingRecipients disagree about who can be blessed at all.
 assert.deepEqual(Object.keys(special.recipients).sort(), Object.keys(blessings.recipients).sort());
 assert.equal(pairs(special.recipients), 593);
 // wife_251 is the single legitimate empty list: the original's WifeBless.json has ZERO rows for
 // wifeid 251 (measured, not assumed), because she is a WifeCustomBless-only member. So an empty
 // list here is faithful data, and exactly one of them is expected.
 const empty = Object.entries(blessings.recipients).filter(([, a]) => !a.length).map(([id]) => id);
 assert.deepEqual(empty, ['wife_251']);
 for (const [wife, heroes] of Object.entries(blessings.recipients)) {
  assert.ok(familyIds.has(wife), wife + ' is not a shipped Family member');
  assert.equal(new Set(heroes).size, heroes.length, wife + ' has duplicate recipients');
  for (const hero of heroes) assert.ok(fellowIds.has(hero), wife + ' blesses unshipped ' + hero);
 }
});

test('Special Blessing activation is a documented choice, not an open question', () => {
 // F17 asked for the original's activation PRICE. There is none: WifeCustomBless.json (45 rows,
 // 8 distinct wifeid) has no cost/price/consume key on any row, and gates on wifeRarityCondiction
 // (5/6/9) plus wifeSpiriteUnlockLevel (0/3/6/10) instead. The sandbox gate below is the substitute.
 assert.ok(/^RESOLVED /.test(special.provenance.activationCost), 'activation cost must stay resolved');
 assert.match(special.provenance.activationCost, /WifeCustomBless\.json/);
 assert.deepEqual(special.gate, {flat: 700, advanced: 700});
 assert.equal(Object.keys(special.rows).length, 700);
});

test('Fathom slots and steps still match the original quenching tables 1:1', () => {
 // ORIGINAL: WifeQuenchingUnlock.json 36 rows (sha256 361f81e2...), WifeQuenchingWight.json 25 rows
 // (sha256 014b5cfa...). Both hashes re-verified against the live config set on 2026-09-15.
 assert.equal(FATHOM_SLOTS.length, 36);
 assert.equal(FATHOM_STEPS.length, 25);
 assert.deepEqual(FATHOM_STEPS.map(s => s.percent), Array.from({length: 25}, (_, i) => i + 1));
 // The original's country cycle is 2,4,3,1,5,0 repeating, and country '0' is the all-business slot.
 assert.deepEqual(FATHOM_SLOTS.map(s => s.sourceCountry),
  Array.from({length: 36}, (_, i) => ['2', '4', '3', '1', '5', '0'][i % 6]));
 assert.deepEqual(FATHOM_SLOTS.filter(s => s.type === null).map(s => s.slot), [6, 12, 18, 24, 30, 36]);
 // Intimacy gates rise strictly, 50 to 5,000.
 assert.equal(FATHOM_SLOTS[0].intimacy, 50);
 assert.equal(FATHOM_SLOTS[35].intimacy, 5000);
 assert.ok(FATHOM_SLOTS.every((s, i) => i === 0 || s.intimacy > FATHOM_SLOTS[i - 1].intimacy));
 assert.equal(fathoms.sources.length, 2);
 assert.equal(fathoms.sources[0].sha256, '361f81e24b1d1014c59bfe4a49a6bb9442c116245e318da713e725007ddd927c');
 assert.equal(fathoms.sources[1].sha256, '014b5cfa45cb47f54b9afd4bf4c923a567c6b1d5623a1223503b06ae17da03ae');
});

test('date pictures and costumes ship the counts the catalogue quotes', () => {
 // ORIGINAL WifeDateEvent.json: 777 rows; 390 isCG=1; 195 gallery pictures (unlockReqEventId +
 // playback + unlockReward), 58 of them costume-gated and 2 item-gated.
 // EVERKAI: 177 picture records. Catalogue row F14 quotes this number, so pin it.
 assert.equal(FAMILY_PICTURES.length, 177);
 assert.equal(FAMILY_PICTURES.filter(r => !r.image).length, 17);
 // 10 of the 177 belong to members Everkai does not roster. They are not a defect: each one carries
 // inActiveFamilyCatalog false, and validFamilyGallery requires s.family[familyId], so none of them
 // can ever be discovered. The reachable population is the other 167. If that flag ever stops lining
 // up with the roster, the two numbers below stop agreeing and this fails.
 const orphans = FAMILY_PICTURES.filter(r => !familyIds.has(r.familyId));
 assert.equal(orphans.length, 10);
 assert.ok(orphans.every(r => r.inActiveFamilyCatalog === false), 'an orphan picture claims to be active');
 assert.equal(FAMILY_PICTURES.filter(r => r.inActiveFamilyCatalog === false).length, 10);
 assert.equal(FAMILY_PICTURES.length - orphans.length, 167);
 // ORIGINAL WifeClothes.json: 111 rows. EVERKAI ships 101 of them; the 10 absent all belong to six
 // members (wife_16, wife_56, wife_60, wife_71, wife_117, wife_163) who are not on Everkai's roster,
 // so no rostered member is missing a costume. The other 157 are Fellow costumes.
 assert.equal(COSTUMES.length, 258);
 assert.equal(COSTUMES.filter(r => r.kind === 'wife').length, 101);
 assert.equal(COSTUMES.filter(r => r.kind === 'hero').length, 157);
 for (const r of COSTUMES) {
  assert.ok(r.ownerId, r.id + ' has no ownerId');
  assert.equal(r.ownerId.startsWith('wife_'), r.kind === 'wife', r.id + ' kind/ownerId disagree');
 }
 assert.equal(COSTUMES.filter(r => r.kind === 'wife' && !familyIds.has(r.ownerId)).length, 0);
});
