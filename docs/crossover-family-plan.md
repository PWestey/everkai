# Crossover Family: the 30

The owner's brief is `docs/crossover-family-split.md`: of the 163 crossover characters, **30 women join
as Family** and **133 stay Fellows**. This document measures what that costs and what it needs. It is
the Family counterpart of `docs/crossover-progression-plan.md`, `-abilities-`, `-collection-` and
`-storyline-`, and it does not re-measure what they already cover. Decisions already taken are in
`docs/crossover-plan.md`; where one of them changes a number here it is named.

**Planning only. No gameplay code was changed to write this.** Every figure below was produced by
running Everkai's own modules; where a figure is an extrapolation it says so, and §8 lists what could
not be measured at all. Positive control for every measurement in §2: the same script reproduces
`tests/fellow-power.test.mjs`'s four pinned stages exactly — 2,269,308 → 4,484,008 → 6,684,380 →
6,965,719 — before adding anything (CLAUDE.md rule 2).

---

## 0. The one-paragraph summary

A Family member is a much smaller object than a Fellow: **five integers** and nothing else is required
(`lib/game.mjs:99`), and every one of the eight Family systems reads either those integers or a table
keyed by Family id. Ten such tables exist, and exactly **two** of them actually block a crossover
Family member: the blessing recipient lists and the catalogue itself. The single hard defect is
`lib/game.mjs:112` — Family membership is validated against the `FAMILY` **array** while Fellows are
validated through `fellowById()`, so a save that welcomed a crossover Family member **is refused
outright and cannot be quarantined**. That is measured, not predicted (§5.1).

---

## 1. What a new Family member needs

### 1.1 The minimum record

`lib/game.mjs:99` and `:312` both mint the same object, and it is the whole required shape:

```js
{intimacy:0, blessingPower:10, points:0, skill:0, relationship:1}
```

Bounds, from `validVillage` (`lib/game.mjs:112`) and `validV4` (`:118`):

| Field | Meaning | Bound | Checked at |
|---|---|---|---|
| `intimacy` | gift/date currency; gates Fathoms and gallery pictures | integer 0…1,000,000 | `game.mjs:112` |
| `blessingPower` | what a date pays out | integer **1**…1,000,000 | `game.mjs:112` |
| `points` | Blessing Points wallet | integer 0…1,000,000,000 | `game.mjs:112` |
| `skill` | the starter-building family skill | integer 0…20 | `game.mjs:112` |
| `relationship` | pupil Intellect tier | integer 1…5 | `game.mjs:118` |

Every other Family field is **optional** and absent on a new member: `flatBlessing`,
`advancedBlessing`, `apkBlessings`, `specialBlessing` (`lib/blessings.mjs:21-28`,
`lib/special-blessings.mjs:6`) and `graduationBond` (`lib/education.mjs:19`).

**No new save field is needed for a crossover Family member.** `SAVE_VERSION` stays 10
(`lib/game.mjs:60`) — same reasoning as `lib/everkai-additions.mjs:10`, and §5 verifies rather than
assumes it.

### 1.2 Every table keyed by Family id

Measured counts, all from the shipped data:

| Table / source | Rows today | Keyed by | What a crossover id gets today | Needed? |
|---|---|---|---|---|
| `lib/catalog.mjs:22` `FAMILY` | **107** | id | **absent** — and `originalProfile()` (`lib/original-catalog.mjs:14`) **throws** `Missing original character` for a non-APK id, so naively appending 30 rows crashes at module load | **Yes — blocking** |
| `lib/original-blessing-data.json` `recipients` | 107 keys / **593 pairings** (min 0, max 10, mean 5.54) | Family id → `hero_*` list | `undefined` → `blessingRecipients()` returns `[]`, `blessingAction` fails *"No supported ungated Fellows are available for new blessings."* (`lib/blessings.mjs:33`) | **Yes — blocking** |
| `lib/public-roster.json` `records[].blessedFellows` | 107 usable / **663 pairings** (min 0, max 12, mean 6.20) | Family id | `affinityIds()` returns `EMPTY`; `lib/public-reference.mjs:5-6` filters to `originalCharacter(id)` | **Yes — blocking (default mode)** |
| `lib/special-blessing-data.json` `recipients` | 107 keys / 593 pairings (identical key set to the above, pinned at `tests/family-data-coverage.test.mjs:33`) | Family id | `undefined` → `specialEligible` false | Optional (§2.5) |
| `lib/family-gallery-data.json` | **177** picture rows over 117 ids (167 reachable; 10 orphans) | `familyId` | `familyPictures()` → `[]`; panel shows an empty gallery, `discoverDatePicture` is a no-op | No (§3.2) |
| `lib/wardrobe-data.json` `costumes` | 258 (**101** `kind:'wife'`) | `ownerId` | `costumesFor()` → `[]` | No — owner decided **no costumes** |
| `lib/humanized-static-data.json` | 266 (107 wife + 159 hero) | id | no row → `applyStaticArt` passes the person through unchanged, keeping the crossover art | No |
| `lib/graduation-bonds.json` | **38** Family ids | id | `graduationBond()` → `null`; `validEducationFields` then requires `graduationBond` be absent or `false` (`lib/education.mjs:19`) | No |
| `lib/roaming-data.mjs` `ROAM_FAMILY` | **9** | id | `roamFamily()` → `undefined`; never offered as a roaming encounter | No |
| `lib/fountain.mjs` `WISH_RECRUITS` | 15 (**7** family) | id | not listed; `lib/fountain.mjs:41` would **throw** on `originalCharacter(p.id).fields.name` if one were added | No — do not add |
| `lib/art-bounds-data.json` | 1,039 measured / 780 rows | art path | **0 `crossover/` entries** → `artBounds()` null → no framing transform. Already true for the two shipped crossover Fellows | **Yes — defect D7** |
| `lib/everkai-additions-data.json` | `fellows: 2` | id | no `family` array exists yet | **Yes — blocking** |

Tables with **no** per-Family key, so nothing is needed: gifts (`lib/catalog.mjs:24-25`, 5 generic
items), family consumables (11 generic items, `lib/consumables.mjs:49`), Fathom slots/steps
(`lib/fathom-data.json`, 36 + 25 rows, not keyed by member), family trips
(`lib/family-trip-data.json`, 2 trips), school/pupil types, achievements (`lib/achievements.mjs:21-32`
— every metric reads save state).

### 1.3 Files frozen by tests

`tests/content-overrides.test.mjs:10` `FROZEN_FILES` is exactly ten names:

```
original-content.mjs   public-roster.json          roster-availability.mjs
roster-batch-evidence.json   source-character-index.json   content-overrides.json
family-gallery-data.json     character-skill-inventory.json
inventory-icon-exceptions.json   drakenberg-layout.json
```

Six of those matter here: `original-content.mjs` (the APK profile source `originalProfile` reads),
`public-roster.json` (the default-mode affinity source), `family-gallery-data.json`,
`roster-availability.mjs` (what `additions()` filters on), `content-overrides.json` and
`source-character-index.json`.

"Frozen" in that test means **exempt from the infernal-wording sweep**, not read-only. Two live
consequences for this slice:

1. Crossover Family text must live in a **non**-frozen file, so it *is* swept by
   `/demon|devil|succub|incub|\bhell\b|hellish|abyss|infernal/i` on every `"key":"value"` pair whose
   key is not in `FROZEN_KEYS` (`tests/content-overrides.test.mjs:11,28-38`). None of the 30 names
   trips it; a *description* saying "hellish" or "abyss" would.
2. **`lib/original-blessing-data.json` must not gain crossover keys.**
   `tests/family-data-coverage.test.mjs:29,30,41` pins `107` keys, `593` pairings and asserts every
   key is in `FAMILY`. In Node `crossoverEnabled()` is false, so `FAMILY` is 107 and adding 30 keys
   fails at `:41`. **The crossover recipient lists belong in `lib/everkai-additions-data.json`**, read
   through an additions-aware accessor. This is a measured constraint, not a preference.

### 1.4 What each of the eight Family systems needs

| System | Entry point | Works for a crossover id today? | Needs |
|---|---|---|---|
| Welcome | `game.mjs:312` `welcome`, `:307` `welcomeAll` | No — searches `FAMILY`; with an unlisted target the message is the misleading *"All current family members have arrived."* | `familyById()`; storyline unlock (`lib/events.mjs`) |
| Gifts | `game.mjs:313-315`, `lib/gift-batch.mjs:3-9` | **Yes** — reads `s.family[recipient]` only | nothing |
| Dates | `game.mjs:316-325`, `lib/dating.mjs:3` | Partly — `date` draws ids from `FAMILY` (`:325`), so with the flag off an owned crossover member is never picked and `FAMILY.find(...).name` would be undefined if it were | draw from `s.family`, or `familyById()` |
| Bonds | `lib/bonds.mjs` | **Yes, in custom mode** — `bondFor` returns `{fellow:null,level:0,original:false}` and `bondAssign` accepts any recruited Fellow. `bondAffinity` refuses *"No documented Fellow pairing is available yet."* | affinity list (§2) if documented pairings are wanted |
| Fathoms | `lib/fathoms.mjs:40-70` | **Yes** — `openSlots`/`fathomBonus` iterate `s.family` with no catalogue lookup. This is the problem, not the gap (§2.3) | a deliberate decision, see §2.3 |
| Trips | `lib/family-trips.mjs:92-150` | **Yes** — `s.family?.[target]`, and `validFamilyTrips:69` checks `s.family` | nothing |
| School caretaking | `game.mjs:309`, `lib/education.mjs:45-50`, `lib/school.mjs:14` | **Yes** — caretaker is `Object.hasOwn(s.family, …)`. `pupilReward` (`school.mjs:10`) uses `intimacy` and `relationship`, both generic | nothing; graduation bonds stay absent |
| Gallery | `lib/family-gallery.mjs` | Degrades cleanly — zero pictures | nothing (§3.2) |

**`sourceId()` works for Family the same way it works for Fellows, but nothing calls it on a Family
id today.** `lib/everkai-additions.mjs:32` is `byId.get(id)?.template ?? id`, where `byId` is built
from `ADDITION_FELLOWS` (`:28`). Add `family` rows to the same data file and the same function
resolves them. The difference is *which* tables need a template: a Fellow borrows six per-id tables
(talent rule, Insight eligibility, skill guide, original growth, default talent source, operations).
A Family member needs a template for **one** thing — the blessing recipient list — and that list is
better authored than borrowed (§2.4), because borrowing an original Family member's list would make
30 crossover characters bless the *same* original Fellows twice over.

### 1.5 `originalCharacter(` and `originalProfile(` — every site

Grepped across `lib/`, `app/`, `scripts/`, `tests/`:

| Site | Effect on a crossover Family id |
|---|---|
| `lib/original-catalog.mjs:14` `originalProfile` | **throws** `Missing original character <id>` |
| `lib/original-catalog.mjs:15` `searchCharacters` | never returns it — the Family album stays 148 original rows |
| `lib/public-reference.mjs:5` | excluded from `references` → `referenceProfile` gives `{rarity:null,type:null}` |
| `lib/public-reference.mjs:6` | excluded from `affinities` → `affinityIds` `EMPTY`, `hasAffinity` false |
| `lib/blessings.mjs:25` | recipient ids must be `startsWith('hero_') && originalCharacter(x)` — so a crossover Family member's APK blessing may target **only original Fellows**, and a crossover *Fellow* can never be a recipient |
| `lib/game.mjs:187` `reconcileRecipients` | a stored snapshot naming a crossover id is treated as *removed content* and **silently re-pinned** to the shipped table, because `originalCharacter(x)` is undefined for it. So crossover recipients would be quietly erased on load (defect D5) |
| `lib/fountain.mjs:41` | `originalCharacter(p.id).fields.name` — **throws** if a crossover is ever added to `WISH_RECRUITS` |
| `app/blessing-panel.tsx:10,11`, `app/bond-panel.tsx:12`, `app/storybook-panel.tsx:5` | `originalProfile(p).name` — **throws** if a recipient/pairing list ever names a crossover Fellow |
| `tests/original-content.test.mjs:3`, `tests/everkai-additions.test.mjs:32,43`, `tests/acquaintance-roster.test.mjs:7` | assertion sites; safe with the flag off |

---

## 2. Blessings and the ceiling

### 2.1 What a blessing is, measured

Two ladders, both authored as *totals at each level* (`lib/blessings.mjs:6-11`):

| Ladder | Default mode (`BLESSINGS`) | APK mode (`original-blessing-data.json`) |
|---|---|---|
| `flatBlessing` "Fellow Blessing" | 36 levels, max **+159,000 flat Power**; cost 100…850/level | 700 levels, max **+16,151,000 flat**; total cost L1→L700 **2,440,562,025 points** |
| `advancedBlessing` "Advanced Blessing" | 24 levels, max **+12% Power**; cost 500…1,810/level | 700 levels, max **+350%**; total cost **2,198,189,445 points** |
| Special Blessing | not available (`special-blessings.mjs:3` requires APK mode) | 700 levels, +2 Family Aptitude/level → **+1,400** at L700; total cost **4,767,865,100 points** |

Which mode applies is `originalProgression(s)` (`lib/original-progression.mjs:5`). The APK flat cap is
**101.6×** the default cap; this ratio is the single most important number in this section.

**Who a blessing buffs.** `blessingPower(s,id)` (`lib/blessings.mjs:18-20`) sums, over every member of
`s.family`, the flat and percent a member contributes to Fellow `id` — gated by `hasAffinity(family,id)`
in default mode, or by the stored `recipients` snapshot in APK mode. It then lands in `bondedPower`
(`lib/adventure.mjs:109`) as `base*(bondFactor + percent + …) + flat + …`, and `rosterOperation`
(`lib/businesses.mjs:92`) divides the roster total by 1,000 — the original's own recovered
`HeroConversionRate` divisor.

**The snapshot repair.** `reconcileRecipients` (`lib/game.mjs:181-199`, called at `:145` inside
`repairSave` so it runs *before* the per-subtree guards) re-pins a stored `recipients` array to the
shipped table whenever every id the save holds that the table does not is a character
`originalCharacter()` no longer knows. It exists because `validBlessings` (`lib/blessings.mjs:25`)
requires byte-equality with the shipped list, and the cast changed twice (2026-09-11 removal,
2026-09-15 restore). **Consequence for this slice:** an `xover_*` recipient is exactly the shape that
repair treats as removed content, so it would be healed away rather than preserved (D5).

### 2.2 What crossover Family blessings would add — measured

Method: reproduce `tests/fellow-power.test.mjs`'s default-mode ceiling fixture, then re-run it with 30
extra Family members holding the same default 36/24 ladder and *N* recipients each. The affinity table
and the `FAMILY` array were patched **in a scratch copy of `lib/`**; nothing in the repo changed.
Positive control: stages 0–3 reproduce 2,269,308 / 4,484,008 / 6,684,380 / 6,965,719 exactly.

| Recipients per crossover Family | Pairings added | Blessing stage | Ceiling | vs the original's live save (3,497,276) | Δ on the ceiling |
|---|---|---|---|---|---|
| — (shipped 107 Family only) | — | 6,684,380 | **6,965,719** | **1.99×** | — |
| 3 | 90 | 6,987,127 | 7,270,752 | 2.08× | **+305,033 (+4.4%)** |
| 6 | 180 | 7,279,625 | 7,566,095 | 2.16× | **+600,376 (+8.6%)** |
| 10 (the original's own maximum) | 300 | 7,675,949 | **7,967,550** | **2.28×** | **+1,001,831 (+14.4%)** |

Linear at **≈3,336 `rosterOperation` per (Family, Fellow) pairing** on a fully-maxed roster. All four
states pass `valid()`. The owner's settled position is *"SETTLED 2026-09-16: THE OWNER ACCEPTED ~2× AS
THE TARGET"* (`tests/fellow-power.test.mjs:58-65`), with the explicit note that a change moving the
ceiling is *"still worth REPORTING … but it does not block a slice."* **2.28× is inside that.**

**Against decision 1's ~4× village-earnings figure.** That figure is
`docs/crossover-progression-plan.md` §3.6: 163 crossover *Fellows* at q14/L750 add +364,118 to a
355,183 baseline (**+103%**), taking 6,965,719 → ≈13.9M ≈**4.0×**. The Family split removes 30 of
those 163 from `rosterOperation` altogether, so on that document's own per-Fellow average of 2,234 the
Fellow-side addition drops to 133 × 2,234 ≈ 297,100 — **+84% instead of +103%, ≈12.8M ≈3.67×**. Adding
§2.2's +1.0M brings it back to ≈**3.95×**, i.e. **the split plus full-strength Family blessings lands
just under the 4.0× the owner already accepted.** (Both halves of the +84% come from the progression
plan's own measurements; the ±30 characters are not individually identified, so the figure is
proportional, not exact — §8.)

### 2.3 The bigger lever nobody has costed: Fathoms

`fathomBonus(s,type)` (`lib/fathoms.mjs:57-70`) iterates **every** member of `s.family` with **no
per-member gate that scales with roster size**: `openSlots` (`:40-50`) requires the member's own
intimacy *and* a **global** lifetime habit-action total (`habitActions`, `:35`). Once a village passes
1,080 lifetime actions, every Family member with enough intimacy has all 36 slots open at once.

Each fully-practised member contributes **12 slots × 25% = +300%** to any one business type (6 slots of
that type + 6 all-business slots; `lib/fathom-data.json` — 6 per country plus 6 with `type:null`).
Measured, with all slots at `MAX_TIER`:

| Family | `fathomBonus('Diligent')` | `familyBonus` (starter buildings) |
|---|---|---|
| 107 (shipped) | **321.0** | 21.40 |
| 137 (107 + 30) | **411.0** | 27.40 |

Business income is `(employees + operation) × (1 + assignedOperation + quality + fathom + farm)`
(`lib/businesses.mjs:100-104`). The bonus term goes `1+321 → 1+411`, i.e. **×1.280 on all 17
businesses** — and the starter buildings go `1+21.4 → 1+27.4`, ×1.268 (`lib/progression.mjs:23`,
`lib/game.mjs:242`). **That is a larger multiplier than everything in §2.2, and it is pure count
inflation: nothing about it is earned.**

**Recommendation: crossover Family do not enter `fathomBonus`.** This is a faithfulness argument, not
a balance patch. Fathoms *are* the original's Wife Quenching — 36 slots from `WifeQuenchingUnlock.json`
in the original's own country cycle 2,4,3,1,5,0, 25 tiers from `WifeQuenchingWight.json`, both hashes
pinned at `tests/family-data-coverage.test.mjs:60-73`. A character who is not in that table has no
quenching record to port, so leaving them out is the honest reading. Cheapest implementation: one
`isAddition(id)` skip in the loop at `lib/fathoms.mjs:59`, plus the same skip in `validFathoms`
(`:76-84`) so a crossover member's tiers can never be stored. Cost to the player: crossover Family
contribute through blessings, bonds, dates, trips and the school, not through Fathoms. Village
earnings then stay at exactly the 4.0× decision 1 accepted, with the Family side contributing nothing
new to it.

If the owner would rather they had Fathoms, the measured price is **×1.28 on every business** and the
alternative mitigations are (a) cap how many members' Fathoms count, which also changes the accepted
107-member baseline, or (b) scale their contribution by a fraction, which is an invented number. Both
are worse than leaving them out.

### 2.4 The blessing curve to ship for the 30

**Recommendation, in one line:** the shipped **default 36/24 ladder** (max +159,000 flat and +12%
Power), **10 recipients each**, drawn **only from the 133 crossover Fellows**, and **no `apkBlessings`
history record** — so a crossover Family member is capped at the default ladder in *both* modes.

Why each part:

- **Default ladder, not the APK one.** `validBlessings:23` already enforces it: with no `apkBlessings`
  record the check is `level < r.values.length`, i.e. 36 and 24. So this needs one line in
  `blessingAction` (`lib/blessings.mjs:35` — skip the `extra` branch for additions) and nothing else,
  and it is save-legal by construction. The APK ladder is 101.6× larger and §2.6 shows why nothing
  should be added to it yet.
- **10 recipients, the original's own maximum** (measured max in `original-blessing-data.json` is 10;
  mean 5.54; the public snapshot's max is 12, mean 6.20). Every value stays inside the original's own
  range, and 10 maximises how much of the crossover power gap closes. Measured price: +1,001,831
  (§2.2), ceiling 2.28×.
- **Recipients are crossover Fellows, not original ones.** This is what decision 4 asked for. 30
  Family × 10 = **300 pairings over 133 crossover Fellows = 2.26 blessings each**, against the
  original Fellows' measured **593 pairings over 153 blessed Fellows = 3.88 each**. So a crossover
  Fellow receives **58% of an original Fellow's blessing support** — deliberately under parity, and
  the cap is structural: 30 Family at the original's 10-recipient maximum cannot exceed 300 pairings,
  so this route can close at most 58% of the gap no matter how it is arranged. Reaching parity would
  need 17.2 recipients per Family, well outside the original's range.
- **Assignment rule** (so it cannot drift): each crossover Family member blesses the 10 crossover
  Fellows nearest her in the owner's rank order within her own franchise, wrapping; re-derived by test
  from `selected-roster.json` and `lib/everkai-additions-data.json`, never hard-coded — the same
  discipline `docs/crossover-storyline-plan.md` uses for arcs.

**Two code changes this requires, both small and both already implied by existing defects:**

1. `lib/blessings.mjs:25` `ids()` must accept a recipient resolved by `fellowById()` rather than
   `startsWith('hero_') && originalCharacter(x)`. Without this, a crossover Fellow can never be a
   blessing recipient in APK mode at all. Keep the `.length<=300`, uniqueness and snapshot-equality
   checks exactly as they are.
2. `lib/game.mjs:187` `reconcileRecipients` must treat an id that `fellowById()` resolves as *known*,
   not as removed content — otherwise it erases crossover recipients on load (D5).

**If crossover Family blessings should NOT buff original Fellows at all** — which is what
recommendation above already delivers — the alternative costs nothing extra: it is the *same* 300
pairings pointed at a different set, and the ceiling delta measured in §2.2 is an **upper bound** for
it, because the percent term multiplies each recipient's `base` and a crossover Fellow's base is at or
below an equivalent original's (`docs/crossover-abilities-plan.md`'s parity requirement). So the
recommended shape is both the fairer one and the cheaper one.

### 2.5 Special Blessing: leave it out

`specialEligible` (`lib/special-blessings.mjs:3`) requires APK mode **and** both earlier blessings at
level 700 **and** a non-empty `special-blessing-data.json` recipient list. Under §2.4 a crossover
Family member is capped at level 36/24, so the gate can never open and no new data is needed. The
`specialAptitude` contribution (up to +1,400 Aptitude per blessed Fellow) therefore stays entirely
with the original 107, which is where the measured 32× APK figure in §2.6 already lives.

### 2.6 A finding that is not about crossovers, and should be pinned before anything is added to it

`tests/fellow-power.test.mjs` pins default mode **with** blessings (6,684,380) and APK mode **without**
them (7,315,225, `:371`) — but nothing pins **APK mode with blessings**. Minting 107 Family at APK
blessing level 700 on the same roster the test uses gives:

| State | `rosterOperation` | vs 3,497,276 |
|---|---|---|
| APK, no family blessings (pinned at `:371`) | 7,315,225 | 2.09× |
| APK, 107 Family at blessing L700 | **113,214,728** | **32.4×** |
| APK, +30 crossover Family at L700 | 145,144,573 | 41.5× (+28.2%) |

The +28.2% is exactly 30/107, because at L700 the blessing term dominates the whole expression. Like
the existing APK test at `:377`, this state is **not** a legal save (levels are set directly rather
than through receipts), so it pins arithmetic, not reachability — but the *arithmetic* says the
shipped APK blessing ladder is worth 16× the whole rest of the game's power. **That overshoot exists
today and has nothing to do with crossovers.** It is reported here rather than fixed because it is out
of this slice's scope (CLAUDE.md rule 7), and it is the strongest reason to keep crossover Family off
the APK ladder (§2.4): a 30-member addition to a 32× strand is a bad place to spend the owner's
accepted headroom.

---

## 3. Relationship content: one look, no original scenes

All text written for the 30 must be **short and original**: village-life and relationship beats only,
no copyrighted bios, no retold plots, nothing sexual. The existing crossover descriptions in
`lib/everkai-additions-data.json` are the model — ≤260 characters, pinned at
`tests/everkai-additions.test.mjs:46`. Apply the same cap to Family rows.

### 3.1 The art stage, `familyScene` and `sceneMode`

`familyScene(person,context)` (`lib/family-scenes.mjs:5`) returns a scene only when the id starts with
`wife_` **and** the person's `art` equals the composed render recorded for it. For a crossover id it
returns `null` in both `profile` and `date` contexts — **verified**.

`FamilyArtStage` (`app/family-art-stage.tsx:4`) then renders class `scene-fallback`, which
`app/globals.css:73` styles as a meadow gradient
(`radial-gradient(ellipse at 50% 70%, #f8e9b7, #b6c6a4, #587b69)`) behind a `object-fit:contain`
portrait. **That is the correct look and needs no change.** The original Family portraits are composed
renders with their setting baked in; a crossover render has no baked setting, so the fallback
background is exactly what should stand behind it. Recommendation: **leave `familyScene` returning
`null` for additions** — do not widen the `wife_` test — and let `scene-fallback` do the work.
External backgrounds stay out of scope until crossover-plan step 9 re-renders each character into a
location, at which point these members get `mode:'composed'` for free by gaining a
`humanized-static-data.json`-equivalent row.

### 3.2 The idle clip does stand in

`characterClip(person)` (`app/character-artwork.tsx:10`) already falls through to
`additionClip(person)` (`lib/everkai-additions.mjs:34-37`), which returns the rendered clip for any
addition row without a costume. So a crossover Family member's character screen plays the same
1024×1536 / 12 fps / 24-frame idle clip the two crossover Fellows play today — **no Family-specific
work needed**, provided the `family` rows carry the same `clip` object.

One prefix bug to fix on the way: `app/character-artwork.tsx:40` routes to `FamilyArtStage` only for
`wife_` ids, so a crossover Family member whose clip fails to load falls back to a bare `<img>` rather
than the art stage (D3).

### 3.3 Gallery, dates and trips

| Surface | Behaviour for a crossover Family member | Recommendation |
|---|---|---|
| Gallery (`lib/family-gallery.mjs`) | 0 pictures; `familyPictures` `[]`; `discoverDatePicture` a no-op; `validFamilyGallery` unaffected | **Leave empty.** The 177 rows are the APK's `Illust` package (`requiredEnglishPackage:"Illust"`), keyed to art these characters do not have. Show the panel's existing empty state and say pictures come from the original cast |
| Dates (`app/family-panel.tsx:36`) | `FamilyArtStage context="date"` → fallback gradient + portrait; payout is `dateReward` = `blessingPower × (1+fishing%)`, wholly generic | Works as-is once §5 lets them into the `date` id pool |
| Trips (`app/family-trip-panel.tsx`) | Fully generic; `tripPlan` reads `s.family[id]`. Children name their caretaker via `id.replace('wife_','Family member ')` at `:13`, which leaves the raw `xover_*` id on screen (D4) | Fix `:13` to use `familyById(id)?.name ?? id` |
| Art stage on the roster grid | `RosterPicker` uses `f.art`, which the addition row supplies | works |
| Character screen skill guide (`app/family-panel.tsx:35`) | `characterSkills(id)` resolves through `sourceId()` for additions — already proven for Fellows at `tests/everkai-additions.test.mjs:64-66` | verify for Family rows |

**Text to author, and nothing more:** per member, `name`, `title`, `occupation`, `race`,
`description` (≤260 chars) — the same five fields the addition rows already carry. No date dialogue,
no scenes, no gallery captions.

---

## 4. Collection totals, achievements and milestones

### 4.1 What shifts, and what does not

Every achievement metric reads **save state**, never the catalogue (`lib/achievements.mjs:21-32`), so
**nothing shifts for a player who never welcomes a crossover Family member.** For one who does:

| Metric | Chain | Steps | Goal ceiling | Effect of +30 Family |
|---|---|---|---|---|
| `familyCount` | `A_task_7` | 93 | **93** | accelerated; 107 originals already clear the ceiling, so **nothing new unlocks** |
| `totalIntimacy` | `A_task_6` | 165 | 200,000 | accelerated within the existing ceiling |
| `dates` | `A_task_8` | 165 | 20,000 | unchanged (per-date, not per-member) |
| `pupils` / `graduates` | `A_task_9` / `A_task_11` | 108 / 109 | 30,000 / 1,000,000 | accelerated (more caretakers, more trip children) |
| `rosterPower` | `A_task_5` | 176 | 4,000,000,000 | accelerated by §2.2 |

`MILESTONES` (`lib/progression.mjs:3-17`, 11 rows): `twoFamily` (goal 2) and `firstBlessing` (goal 1)
are the only Family ones and both are save-state. **No milestone or achievement count needs to move.**

Counts that are **catalogue**-derived and therefore do shift with the flag on: `FAMILY.length`
107 → 137; `[...FELLOWS,...FAMILY].length` 266 → 429 (pinned in four places —
`tests/content-overrides.test.mjs:15`, `tests/known-defects.test.mjs:146`,
`tests/humanized-static.test.mjs:2`, `tests/roster-batch.test.mjs:4`); `recruitOffers` 244 (107 of
them Family). In Node `crossoverEnabled()` is false (`tests/everkai-additions.test.mjs:23-27`), so all
of these stay put and the suite is unaffected — **the guard that makes that safe is
`tests/everkai-additions.test.mjs:30-35`, and it must gain a Family equivalent.**

### 4.2 The `?crossover=1` flag keeps them identical when off

`FAMILY` must be built the same way `FELLOWS` is (`lib/catalog.mjs:17-18`): an
`ORIGINAL_FAMILY`/`familyCatalogue(withAdditions)` pair where additions only ever **append**, plus a
`familyById()` that resolves them **flag-independently** (`lib/catalog.mjs:21` is the model). The
append-only shape is what keeps every index, every count and `rosterOrder`'s catalogue tie-break
identical with the flag off.

### 4.3 The Family-side defects — every site

Grepped for `startsWith('wife_')` and `originalCharacter(` across `lib/`, `app/`, `scripts/`, `tests/`.
Five id-prefix sites and nine catalogue-gated ones; the `originalCharacter(` table is §1.5.

| # | Site | Defect | Severity |
|---|---|---|---|
| **D1** | `lib/game.mjs:112` | Family validated with `FAMILY.some(x=>x.id===id)` while Fellows use `fellowById(id)` at `:110`. A save holding a crossover Family id is **refused** (`refusedBy` → `validV4`) and `family` is not in `QUARANTINABLE` (`:210`), so the village is lost. **Measured** (§5.1) | **Blocking** |
| **D2** | `lib/wardrobe.mjs:7` | `ownedActor` routes by `id.startsWith('wife_')`: a crossover Family id is looked up in `s.fellows`, so `wardrobeCollect`/`wardrobeEquip` refuse *"Welcome or recruit this character first"* for a welcomed member, and `validWardrobe:16-17` would reject a legitimately-owned costume | Latent (no crossover costumes ship) — fix with `familyById` |
| **D3** | `app/character-artwork.tsx:40` | Same prefix test picks `FamilyArtStage` vs a bare `<img>`; a crossover Family member loses the art stage on clip failure | Cosmetic |
| **D4** | `app/family-trip-panel.tsx:13` | `id.replace('wife_','Family member ')` leaves the raw `xover_*` id on screen for another caretaker's child | Cosmetic |
| **D5** | `lib/game.mjs:187` | `reconcileRecipients` treats any id `originalCharacter()` does not know as removed content and re-pins the snapshot, so a crossover recipient is **silently erased on load** | **Blocking for §2.4** |
| **D6** | `lib/blessings.mjs:25` | Recipients must `startsWith('hero_') && originalCharacter(x)`; a crossover Fellow can never be blessed, and a crossover Family member's snapshot can never equal `source.recipients[id]` (`undefined`) | **Blocking for §2.4** |
| **D7** | `lib/art-bounds-data.json` | Zero `crossover/` entries, so `artBounds()` is null and no framing transform is applied to any crossover render, Family or Fellow. `tests/art-framing.test.mjs:12` cannot catch it because flag-off `FELLOWS`/`FAMILY` never mention those paths | Real, shared with the Fellow slice |
| **D8** | `lib/game.mjs:325` `date`, `:307` `welcomeAll`, `:312` `welcome` | All three iterate the flag-gated `FAMILY`. With the flag off an owned crossover member is never dated; `welcome` with an unlisted target reports the misleading *"All current family members have arrived."*; with the flag **on**, `welcomeAll` grants all 30 **free**, bypassing the storyline unlock — the Family twin of the `recruitAll` issue in `docs/crossover-collection-plan.md` §5.2 | Blocking (flag-off dates) |
| **D9** | `lib/events.mjs:59` | `(isFellow?FELLOWS:FAMILY).find(...)` — a crossover Family arc stage fails *"That character is not in the catalogue."* with the flag off. Note the *opposite* of the filed Fellow defect: `:43`'s `startsWith('hero_')` routes crossover **Family** to the correct `s.family` branch by accident, while routing crossover **Fellows** wrongly | Blocking (with §2 of the storyline plan) |
| **D10** | `app/roster-landing.tsx:16` | *"X of {entries.length} joined"* counts against the flag-gated array, so an owned crossover member is not counted with the flag off | Cosmetic |
| **D11** | `app/page.tsx:138`, `app/family-panel.tsx:26` | `FAMILY.find(...)||FAMILY[0]` — an owned crossover member cannot be opened with the flag off (silently falls back to the first member). `app/page.tsx:64` also hard-codes `'wife_2'` as the default selection | Cosmetic |
| **D12** | `lib/helper.mjs:592`, `lib/roaming.mjs:38`, `app/original-album.tsx:16`, `app/school-panel.tsx:15`, `app/storage-panel.tsx:24`, `app/consumable-shelf.tsx:12`, `app/opening-panel.tsx:25`, `app/family-gallery-panel.tsx`, `app/storybook-panel.tsx:4`, `lib/summon.mjs:42,98`, `lib/fountain.mjs:41` | Twelve more `FAMILY`-array reads. Each degrades to "not listed" rather than crashing; all are fixed at once by `familyCatalogue()`/`familyById()` | Cosmetic |

`lib/summon.mjs:22` `recruitRarity` already falls back to `additionById(id)?.rarity`, so once Family
rows exist there they inherit the counter price — **which must then be suppressed**, because
`docs/crossover-plan.md` step 3 says crossovers are unlocked by playing a storyline, not bought.
`recruitPrice → null` for additions gives exactly that: `recruitOffers` filters them out (`:44`) and
`summonRecruit` refuses with *"No price is recorded for this character yet."*

---

## 5. Save compatibility

### 5.1 The measured lockout

```
FAMILY has the id?      false
valid(save):            false
refusedBy(save):        validV4
family in QUARANTINABLE? false
decode(save) THREW:     This is not a compatible village save. Refused by: validV4
```

Positive control, same script, same save shape: a crossover **Fellow** gives `valid: true`,
`refusedBy: ''`. So the method works and the asymmetry is real, not a broken probe.

`docs/crossover-collection-plan.md` §5.2 already records the `:110` vs `:112` asymmetry and calls it
"load-bearing" — correct for Fellows. **For Family it is the opposite: it is the lockout.** The fix is
the one line the Fellow side already has: validate Family with `familyById(id)`.

### 5.2 State, validators and quarantine

- **New state needed: none.** A crossover Family member is five integers in the existing `family`
  record. Optional subtrees they touch — `bonds`, `fathoms`, `familyTrips`, `familyGallery`,
  `school` — all key on `Object.hasOwn(s.family, …)` (`lib/bonds.mjs:7`, `lib/fathoms.mjs:77`,
  `lib/family-trips.mjs:69`, `lib/family-gallery.mjs:19`, `lib/school.mjs:14`), so they follow
  automatically once `s.family` accepts the id.
- **`SAVE_VERSION` stays 10** (`lib/game.mjs:60`). Verify, do not assume: no *required* field appears,
  and every widening (`familyById` in place of `FAMILY.some`, `fellowById` in place of the `hero_`
  prefix in `lib/blessings.mjs:25`) accepts strictly more than before.
- **`QUARANTINABLE`** (`lib/game.mjs:210`, 37 entries) already lists `fathoms`, `familyTrips`,
  `familyGallery` and `blessings`, and `tests/save-compatibility.test.mjs` derives the list by
  deleting each one and checking every validator still passes — so it must be re-run, not edited.
  `family` is **not** and must not become quarantinable: dropping it would silently delete the
  player's relationships. `bonds` is likewise non-quarantinable by design.
- **`VALIDATORS`** (`lib/game.mjs:205`) must stay in lockstep with `valid()` (`:119`);
  `tests/save-compatibility.test.mjs` reads `valid()`'s source to enforce it. No new validator is
  needed here, so this is a no-op — but it is the check that would catch a Family validator being
  added to one and not the other.

### 5.3 Rule 12: what is derived from the Family count

Rule 12 asks what is *computed from* a table before widening it. Four derived values depend on the
Family population, and each was checked:

| Derived value | Where | Moves with +30 Family? | Breaks a save? |
|---|---|---|---|
| `familyBonus` = Σ`skill`×0.01 | `lib/progression.mjs:23` | 21.40 → 27.40 | **No** — read at render/settle time, never stored or compared |
| `fathomBonus` | `lib/fathoms.mjs:57-70` | 321.0 → 411.0 per type | **No** — derived, never stored. §2.3 removes this anyway |
| `blessingPower` | `lib/blessings.mjs:18-20` | +1,001,831 `rosterOperation` | **No** — derived |
| `rosterOperation` / `enterpriseRate` | `lib/businesses.mjs:92,117` | see §2 | **No** — derived, and `staffingYield` receipts store rates, not roster totals |
| Stored `recipients` snapshot | `lib/blessings.mjs:25` + `lib/game.mjs:181-199` | **YES** | **YES — this is the rule-12 hazard.** Byte-equality with the shipped list means *any* change to a Family member's recipient list refuses every save written on the other side of it, in both directions. Crossover lists must therefore live in their own table and be compared against that table, and D5 must be fixed first |

**The cheap check, run in both directions before merging** (CLAUDE.md "Saves"): generate a save with
the previous build and decode it with the new one, and vice versa. There is no `sim/` directory in
this checkout, so the harness to use is `tests/crossover-flag-village.mjs` — it already builds a
flag-on village in a child process (`globalThis.location={search:'?crossover=1'}`, `:3`), drives real
actions, and hands the JSON to a flag-off parent that decodes it
(`tests/everkai-additions.test.mjs:89-103`). **Extend that harness to welcome a crossover Family
member, gift her, date her, bond her, take a trip and enrol the child, then assert the flag-off parent
still loads the save with her progress intact.** That single test is the whole of §5.

### 5.4 What happens to a save that welcomed one, with the flag off

After D1 and D8 are fixed:

- **Loads.** `familyById` resolves her; `valid()` passes; nothing is quarantined.
- **Keeps everything mechanical.** `blessingPower`, `familyBonus`, `bondFactor`, `dateReward`,
  consumables, gifts, trips and school caretaking all iterate `s.family` directly, so her
  contributions keep applying whether or not she is listed.
- **Is not listed, and not reachable.** She does not appear on the Family roster, the recruit counter,
  the album or `welcomeAll`; `app/page.tsx:138` cannot open her screen. Identical to the Fellow-side
  contract at `lib/everkai-additions.mjs:8-10`: *owned, unlisted.*
- **One behaviour worth calling out:** if she is the player's **only** Family member, `date`
  (`lib/game.mjs:325`) draws from `FAMILY` and reports *"Welcome a family member first."* Fixing
  `date` to draw from `s.family` (and name through `familyById`) removes the last flag-off dead end.

---

## 6. Decision 4's equivalent bonus track, for Family

**Family already have a fair equivalent, and it is blessings.** The Fellow-side gap decision 4 exists
to close (~0.33 of a maxed original) comes from two systems that key on character identity: Stella
constellations, which return nothing for an addition (`lib/everkai-additions.mjs:15-16`), and blessings,
which a Fellow only *receives*. Neither has a Family analogue, because **nothing in the Family
progression is identity-keyed at all**:

- `blessingValue` (`lib/blessings.mjs:15`) is a function of **level only**.
- `blessingCost` (`lib/progression.mjs:22`) is `20×(skill+1)` — level only.
- `dateReward` (`lib/dating.mjs:3`) is `blessingPower × (1+fishing%)` — state only.
- `bondCost` (`lib/bonds.mjs:3`) and `bondFactor` (`:6`) are level only.
- Fathoms, trips, gifts, consumables and the school: all generic.
- Family `type` is `null` for **all 107** shipped members (measured), so no type-keyed system touches
  them at all.

The **only** identity-keyed input on the whole Family side is *who a blessing lands on* — the
recipient list. So there is no gap to close with a new track: a crossover Family member who trains
her blessings to the shipped cap reaches **exactly the same `blessingPower` as an original** at the
same investment. Giving her a recipient list (§2.4) is therefore not a bonus track, it is the missing
data, and 10 recipients from the original's own maximum makes her a fully average member of the cast.

**Recommendation: do not build a Family bonus track.** Ship §2.4's recipient lists instead and spend
the design budget on the Fellow-side track decision 4 actually needs. If the owner wants a visible
crossover-Family flourish anyway, the cheapest honest one is a **shared crossover Blessing-Point
faucet** matching the shared shard pool in `docs/crossover-plan.md` step 8 — one pool, flat, minted
from habits, so it does not scale with how many crossover Family are welcomed. It must not be a
per-member multiplier: §2.3 shows what per-member additive strands do to this economy.

---

## 7. Ordered task list

Each step is independently shippable and each one is green before the next begins.

1. **Fix D1.** Add `ORIGINAL_FAMILY`, `familyCatalogue(withAdditions)` and `familyById(id)` to
   `lib/catalog.mjs`, mirroring `:15-21` exactly. Guard `originalProfile` so an addition never reaches
   it (`lib/original-catalog.mjs:14` throws). Switch `lib/game.mjs:112` to `familyById(id)`. Test: a
   save holding an unknown `xover_*` **family** id is still refused — the negative control from
   `tests/everkai-additions.test.mjs:105-110`, which must fail with the intended message when
   deliberately broken.
2. **Add the `family` array to `lib/everkai-additions-data.json`** with the same 14-key row shape as
   `fellows` (`tests/everkai-additions.test.mjs:116`) plus a `recipients` list, and assert
   `ADDITION_FAMILY.length === data.family.length` — `lib/everkai-additions.mjs:25` silently drops a
   row missing `art` or `template`, which would remove a character without a word.
3. **Fix D8, D9, D10, D11, D12** — replace every `FAMILY.find/some/filter` with
   `familyById`/`familyCatalogue` as appropriate. Make `date` (`lib/game.mjs:325`) draw from
   `s.family`. Decide `welcomeAll`: filter additions out, or record it as a sandbox convenience.
4. **Fix D5 and D6** so a crossover recipient survives `reconcileRecipients` and passes
   `validBlessings`. Negative-control both: a snapshot naming a *real original* the table never listed
   must still be refused as tampering (`lib/game.mjs:187`'s whole purpose).
5. **Ship the recipient lists (§2.4)** — 30 × 10 pairings, re-derived by test from `selected-roster.json`
   and the additions data, never hard-coded. Pin the flag-on ceiling figure (7,967,550 / 2.28×) in its
   own test, the way decision 1 requires for the Fellow side.
6. **Cap crossover Family at the default 36/24 ladder** — one branch in `lib/blessings.mjs:35` so no
   `apkBlessings` record is written for an addition. Assert `blessingPlan` stops at 36 and 24 for them
   in **both** modes.
7. **Remove crossover Family from `fathomBonus` and `validFathoms` (§2.3).** Pin
   `fathomBonus('Diligent') === 321.0` with the flag on, so the 321 → 411 inflation cannot return
   unnoticed.
8. **Storyline unlock.** Assign the 30 to arcs alongside the 133 Fellows (this is
   `docs/crossover-storyline-plan.md`'s work); every stage carries `kind:'fellows'|'family'` as data;
   `lib/events.mjs:59` resolves through `fellowById`/`familyById`. Set `recruitPrice → null` for all
   additions so the counter does not sell them.
9. **Author the five text fields per member** — ≤260 characters, swept by
   `tests/content-overrides.test.mjs:28-38`. No dates, no scenes, no bios.
10. **Fix D3, D4, D7** — art-stage routing, the trip-child name, and measured art bounds for every
    `crossover/` asset (`scripts/measure-art-bounds.mjs`; this closes the gap for the Fellow slice
    too).
11. **Extend `tests/crossover-flag-village.mjs`** to the full Family loop and assert the flag-off
    parent loads the save with her progress intact (§5.3). This is the rule-12 check.
12. **Add a Family coverage guard** to `tests/family-data-coverage.test.mjs`: 107 original +
    30 addition recipient keys **in separate tables**, 593 original pairings unchanged, 300 addition
    pairings, every addition recipient resolvable by `fellowById`. Negative-control each equality.

---

## 8. Numbers I could not measure

| Number | Why not |
|---|---|
| The exact Fellow-side ceiling after the split (133 not 163) | `docs/crossover-progression-plan.md` measured +364,118 for 163 at an average of 2,234 per Fellow, but `selected-roster.json` carries no per-character `type`/`rarity` (that document's §8 records the same gap), so which templates the 30 women would have used is unknown. **+84% is 103% × 133/163 — proportional, not exact.** |
| The default-mode ceiling contribution of 133 crossover *Fellows* | Never measured by anyone; the progression plan's +103% is an APK-mode q14/L750 figure. §2.2's Family numbers are default mode. The two must not be added (rule 1). |
| The real delta when crossover Family bless crossover **Fellows** | Measured against maxed **original** Fellows, because only two crossover Fellows ship today. The percent term multiplies each recipient's `base`, and a crossover Fellow's base is at or below an equivalent original's, so **+1,001,831 is an upper bound.** |
| Whether APK-mode blessing level 700 is actually reachable | Costs 4,638,751,470 Blessing Points per member for both ladders against a 1e9 `points` cap, so it needs many fund-and-train cycles. The faucet rate was not measured, and the minted 32.4× state in §2.6 is not a legal save. |
| Rendered bytes for 30 crossover Family stills + clips | The art is built in the scratchpad, not in `public/assets/`. `docs/crossover-collection-plan.md` §8 records the same gap for all 163 (6.14 MB webp + 93.46 MB mp4 total). The precache limit (104.4 MB today) is the binding constraint. |
| Which of the 30 the owner will keep | `docs/crossover-family-split.md` presents the list "for the owner to amend". Every count here scales linearly in the member count, so an amendment changes the numbers, not the conclusions. |
| Whether the owner wants crossover Family to have Fathoms | Taste, after the ×1.28 price in §2.3 is on the table. Recommendation stands unless he objects (rule 9). |
| The original's own value for anything crossover-specific | There is none — these characters are not in the APK. Every invented value above is marked local. |

---

## 9. Owner decisions, batched, with recommendations

| # | Question | Recommendation (work proceeds on this unless you object) |
|---|---|---|
| F1 | Should the 30 crossover Family have Fathoms? | **No.** Fathoms are the original's Wife Quenching, and including them multiplies late-game business earnings by **1.28×** for nothing earned. They keep blessings, bonds, dates, trips and the school. |
| F2 | Whom do their blessings buff? | **The 133 crossover Fellows, 10 each.** That is what decision 4 asked for, it closes 58% of the crossover Fellows' blessing gap, and it costs the same as blessing originals. |
| F3 | Which blessing ladder? | **The default 36/24 one, in both modes** (+159,000 flat, +12%). Ceiling 1.99× → **2.28×**, inside the ~2× you accepted. The APK ladder is 101.6× larger and §2.6 shows it is already a 32× strand before crossovers touch it. |
| F4 | Does the Family side need its own bonus track (decision 4)? | **No.** Nothing in Family progression is identity-keyed, so there is no gap — a crossover Family member reaches exactly an original's `blessingPower` at the same investment. Give her a recipient list instead. |
| F5 | `welcomeAll` with the flag on grants all 30 free, bypassing the storyline unlock | **Filter additions out of `welcomeAll`**, matching the `recruitAll` decision in the collection plan. |
| F6 | Separately: APK mode with blessings reaches **32.4×** the original's live save, today, with no crossovers involved | **Pin it in `tests/fellow-power.test.mjs` before anything is added to it.** Reported, not fixed — out of this slice (rule 7). |
