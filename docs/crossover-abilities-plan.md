# Crossover abilities plan — skills, talents, Insight and the rest of the per-Fellow surface

**Slice:** the per-Fellow progression tables for the 163 Everkai-addition Fellows (95 Marvel Strike
Force + 68 SWGOH) shipped behind `?crossover=1`. Everything per-Fellow *except* rarity assignment
(separate slice) and Stella/costumes (separate slice).

**Status:** PLANNING ONLY. No gameplay code in this branch. Every number below was measured by
running the shipped code or reading the shipped tables; each is cited `file:line`. Values I propose
are marked **LOCAL** and every one of them is a *re-use of a measured original value*, not an
invention — see §4.

**What this replaces.** Today the two prototypes borrow a template original Fellow's rows through
`sourceId()` (`lib/everkai-additions.mjs:32`), pinned by `tests/everkai-additions.test.mjs:52-70`.
That placeholder is load-bearing in exactly seven call sites (§1.7) and is what §2 removes.

---

## 1. What I measured

### 1.1 A "skill" in Everkai is an Aptitude node, and almost none of them are trainable

`lib/character-skill-guide.json` holds 281 profiles (165 `fellows`, 116 `family`); 158 of the 159
shipped Fellows have one (`lib/catalog.mjs:16` builds 159; the guide carries 165 because it also
covers unreleased ids). A profile is `{id, name, category, skills:[{id, name, lines[]}]}` —
presentation only, no effect payload.

Every one of the 2,040 fellow skill nodes reduces to the same two display lines. Measured line
templates across all fellow profiles:

| line template | count |
|---|---|
| `Base cap: N` | 2,040 (300 ×1,830, 200 ×207, 7 ×3) |
| `+N Aptitude per level` | 2,040 (+1 ×749, +2 ×401, +3 ×462, +4 ×158, +5 ×151, +6 ×119) |
| `Unlock: Default` | 805 |
| `Unlock: Awakening Lv. N` | 714 |
| `Unlock: Stella N` | 186 |
| `Unlock: Rarity upgrade Lv. N` | 132 |
| `Unlock: Resonance Lv. N` | 45 |
| `Unlock: Costume CN: …` | 169 |

**There is no combat/utility effect anywhere in the skill guide.** Every node is an Aptitude
faucet. That matters for the brief's flavour example ("a web-slinger's skill hits the whole party's
speed"): Everkai has no speed stat and no party-wide per-Fellow hook. The complete set of
per-Fellow effect kinds the engine actually reads is:

- **Aptitude** — talents, Insight, gear, artifacts, stars (`lib/adventure.mjs:106-108`)
- **Power flat / Power %** — blessings, museum, familiar, fishing, artifact echo, bond, Stella,
  elixir (`lib/adventure.mjs:109`)
- **Business earnings %** — operation skills (`lib/operations.mjs:6-7`)

So crossover flavour can live in the **name**, and only in the name. §2.4 says how.

Skills per Fellow ranges 4–27 (mode 11, n=31). Thirty-four "nodes" are section headers with
`id:null` and no lines (e.g. `hero_142 → "SSR"`) — a shape trap worth knowing before any
per-node loop.

### 1.2 Only two nodes per Fellow are trainable

`app/character-skill-guide.tsx:9` renders a node as trainable only when
`isPlayableTalent(id,node)` or `insightRule(id).skillId===node.id`; everything else prints
*"Preview only · this skill can't be trained yet."*

- `isPlayableTalent` (`lib/character-skills.mjs:8`) requires `node.id === 'Hero_Talent_Base_' + r.amount`
  plus exact `name`/`lines` agreement (`lib/talents.mjs:8-12`). Exactly **one node per Fellow**
  qualifies — measured: 165/165 fellow profiles carry exactly one `Hero_Talent_Base_*`.
- Insight matches one node id per Fellow (`lib/insight.mjs:9`).

**Everything else in the guide — all 714 `Hero_Talent_StarSkill_*` awakening nodes, the
`Hero_Talent_SG3_*` / `Hero_Talent_Project_*` pair every Fellow has, the 169 costume talents, the
per-hero `HeroNNN_Talent_Bonus/Pledge/extraN` rows — is display-only.** Measured by running
`isPlayableTalent` and `insightRule` over every node: **316 of 2,040 are trainable, 1,724 do
nothing at runtime** (158 shipped Fellows × 2, plus the guide's unreleased ids).

### 1.3 Talents: three rules, and the tier is a pure function of base rarity

`lib/talents.mjs:7`:

| rule | name | +Aptitude/level | cost (Skill Pearls) | default cap | APK-growth cap |
|---|---|---|---|---|---|
| `Hero_Talent_Base_1` | Ordinary Talent | 1 | 1 | 12 | 299 |
| `Hero_Talent_Base_2` | Outstanding Talent | 2 | 2 | 20 | 299 |
| `Hero_Talent_Base_3` | Supreme Talent | 3 | 3 | 20 | 299 |

`paidCap` 299 comes from `lib/default-talent-source.json` (`baseCap:300`, `paidCap:299`, 176 hero
rows, `source:"APK1.7702 recovered read-only"`), gated on `originalProgression(s)`
(`lib/talents.mjs:16`).

Measured tier counts: Base_1 ×20, Base_2 ×29, Base_3 ×116. Cross-tabulated against catalogue
rarity over all 159 shipped Fellows, the mapping is **exact and total**:

| base rarity | n | talent rule |
|---|---|---|
| N | 5 | Base_1 |
| R | 15 | Base_1 |
| SR | 29 | Base_2 |
| SSR / SSR+ / UR / UR* | 110 | Base_3 |

**Every tier costs exactly 1 pearl per Aptitude** (1/1, 2/2, 3/3). So in APK-growth mode the tier
has *zero* economic effect — it only changes clicks-per-purchase. In default mode it changes reach:
+12 / +40 / +60 Aptitude. That 48-point spread is the whole balance exposure of a mis-assigned
tier, and it is smaller than the spread already present among originals of one rarity (§1.5).

### 1.4 Insight: five identical rules, keyed on `type`, 100% coverage

`lib/insight-data.json` holds 5 rules — one per Fellow type — and they are **numerically
identical**: `cost:100`, `aptitude:1`, `supportedLevels:300`, i.e. 30,000 material for +300
Aptitude.

| type | material | eligible originals |
|---|---|---|
| Inspiring | `Item_Hero_Talent_Country_1` | 30 |
| Diligent | `Item_Hero_Talent_Country_2` | 32 |
| Brave | `Item_Hero_Talent_Country_3` | 35 |
| Informed | `Item_Hero_Talent_Country_4` | 35 |
| Unfettered | `Item_Hero_Talent_Country_5` | 34 |

**Measured: 159 of 159 shipped Fellows are Insight-eligible, with zero exceptions.** Eligibility is
therefore *entirely* a function of `type` — `lib/insight.mjs:9` already double-checks
`fellowById(id).type === r.type`. Supply is a habit faucet: 250 per completed daily, capped 3,000
per refill, one refill per day across all five types (`lib/insight.mjs:4, 26-34`).

### 1.5 The APK base-Aptitude row is per-id, and its floor is a pure function of rarity

`sourceAptitudeBonus = heroes[sourceId(id)] - 10 + qualityRule(quality).talent`
(`lib/original-progression.mjs:10`). `lib/original-progression-data.json.heroes` has 180 rows,
20–200 (median 75). Measured by base rarity over the 159 shipped Fellows:

| base rarity | n | min | median | max | value counts |
|---|---|---|---|---|---|
| N | 5 | 20 | 20 | 20 | 20×5 |
| R | 15 | 35 | 35 | 35 | 35×15 |
| SR | 29 | **50** | 50 | 75 | 50×22, 55×5, 60×1, 75×1 |
| SSR | 64 | **70** | 80 | 110 | 70×11, 75×21, 80×22, 90×1, 100×8, 110×1 |
| SSR+ | 20 | 100 | 100 | 100 | 100×20 |
| UR | 24 | **100** | 120 | 160 | 100×5, 120×15, 160×4 |
| UR* | 2 | 200 | 200 | 200 | 200×2 |

The quality ladder (1–14) is independent of the rarity string: caps 100→750 in 50s, `talent`
0→65 in 5s (`lib/original-progression-data.json.quality`).

### 1.6 Operation skills are a three-slot template whose only variable is rarity

`lib/operation-data.json` — 175 records, `provenance` "Imported from the original
`Hero.operationSkill` and `SkillBase` tables", sha-pinned against `Hero.json` and `SkillBase.json`.
Each record is 2–3 effects (median 3, max 3) at `minLevel` ∈ {1, 50, 200}. Sorting each record by
`minLevel` and grouping by base rarity gives a **single shape per rarity, with no exceptions
outside one SR outlier**:

| base rarity | n | slot A (Lv.1) | slot B (Lv.50) | slot C (Lv.200) | total at Lv.200 |
|---|---|---|---|---|---|
| N | 5 | 30 | 20 | 30 | 80 |
| R | 15 | 50 | 20 | 30 | 100 |
| SR | 26 (+1 at 100) | 70 | 20 | 30 | 120 |
| SSR | 49 | 100 | 20 | 30 | 150 |
| SSR+ | 2 | 100 | 20 | 30 | 150 |
| UR | 24 | 150 | 20 | 30 | 200 |
| UR* | 2 | 200 | 20 | 30 | 250 |

Slots B and C are **20 / 30 on all 175 records without exception**. Slot A is type-targeted; slot B
is type- or single-building targeted (21 records name one `Building_*`); slot C is type-targeted.

A further 31 records have slot A *censored*, not low: their `unresolved` field says
"Rarity-gated appoint skill excluded" and they sum to 50, which is slots B+C alone. Reading those
30 records' `50` as a magnitude is the `SimGame3Plant.time` mistake (CLAUDE.md rule 6) — they are
missing data, and I excluded them from the ladder above.

**Crossovers have no operation row at all today.** `lib/operations.mjs:2,4` keys
`byFellow` by raw id with no `sourceId()`, so measured live:
`fellowOperation(s,'xover_msf_spiderman',Building_101) → {known:false, percent:0}` against
`hero_1 → {known:true, percent:80}` at the same level. This is the single largest functional gap
in the slice.

### 1.7 The exact placeholder surface: seven `sourceId()` call sites

| file:line | what it borrows |
|---|---|
| `lib/talents.mjs:14` | which talent rule applies |
| `lib/talents.mjs:16` | the APK-growth paid cap gate |
| `lib/talents.mjs:19` | the ledger validator's gate |
| `lib/insight.mjs:9` | Insight eligibility |
| `lib/original-progression.mjs:10` | the base-Aptitude row |
| `lib/original-progression.mjs:26` | the save validator's growth gate |
| `lib/original-progression.mjs:33` | the "enable APK growth" precondition |
| `lib/character-skills.mjs:6` | the whole guide node list, minus costume talents |

Nothing else in `lib/` calls it. `scripts/crossover/pick-template.mjs:14-18` picks the template:
lowest-numbered counter-sold original of the same rarity and type that has all five tables.

### 1.8 What crossovers already get free, and what they can never get

Measured, flag-on:

| system | crossovers | why |
|---|---|---|
| Gear Aptitude, artifact levels (`ARTIFACT_CAP` 200) | **works** | `lib/artifacts.mjs:13` reads `f.gear` only, no id |
| Stars (+5% Aptitude ×7) | **works** | `lib/adventure.mjs:100-106`, per-save field |
| Direct Aptitude purchase (1 pearl = +1) | **works** | `lib/adventure.mjs:80` |
| Level / quality / limit break | **works** once §2 supplies a `heroes` row | `lib/adventure.mjs:64` |
| Sandbox family bond (+2%/level, cap 10 → +20%) | **works** | `bondAssign` + `bondFactor` accept any owned id (`lib/bonds.mjs:6,17`) |
| Documented family affinity bond | **never** | `affinityIds` is an original-only reference |
| Fellow Blessing / Advanced Blessing | **never** | `lib/blessings.mjs:25` validates every recipient with `originalCharacter(x)`; measured 153 recipient ids, zero `xover_*` |
| Special Blessing | **never** | same, `lib/special-blessing-data.json` — 153 ids, zero `xover_*` |
| Artifact Echo | **never** | `lib/artifact-echo.mjs:7` requires `r.fellow===id`; measured 33/33 records are named-Fellow, 0 family-support |
| Stella | **never** | `stellaRule` returns nothing (already asserted, `tests/everkai-additions.test.mjs:67`) |
| Costumes | **never** | no costume rows; §5 |

Those four "never" rows are 67% of the pinned per-Fellow ceiling: `tests/fellow-power.test.mjs`
records the ladder 2,269,308 (everything maxed, no stella/blessings/echoes) → 4,484,008 (+stella)
→ 6,684,380 (+blessings) → 6,965,719 (+echoes). **A maxed crossover tops out at roughly the
2,269,308-fixture per-Fellow share, ≈ 14,272 conversion units, against ≈ 43,809 for a maxed
original.** That is the structural reason the balance argument in §3 is easy.

---

## 2. The proposal

### 2.1 The one design decision: numbers are derived, names are authored

§1.3, §1.5 and §1.6 each turned out to be a **pure function of base rarity**, and §1.4 a pure
function of `type`. So the cheap-to-author table is not "6–10 archetype stat blocks" — it is

> **one 7-row rarity ladder plus one 163-row row of `{id, type, archetype}`, and no per-character
> numbers at all.**

Archetypes exist for *naming and type assignment*, not for magnitudes. This is strictly better than
archetype stat blocks: an archetype magnitude would be invented, and a derived magnitude is a
re-use of a measured original value.

### 2.2 Table A — `lib/crossover-progression-data.json` (7 rows, all measured)

One row per rarity, each field the **measured minimum** for that rarity from §1.3/§1.5/§1.6:

| rarity | `baseAptitude` | `talentRule` | `operationSlotA` | `operationSlotB` | `operationSlotC` |
|---|---|---|---|---|---|
| N | 20 | `Hero_Talent_Base_1` | 30 | 20 | 30 |
| R | 35 | `Hero_Talent_Base_1` | 50 | 20 | 30 |
| SR | 50 | `Hero_Talent_Base_2` | 70 | 20 | 30 |
| SSR | 70 | `Hero_Talent_Base_3` | 100 | 20 | 30 |
| SSR+ | 100 | `Hero_Talent_Base_3` | 100 | 20 | 30 |
| UR | 100 | `Hero_Talent_Base_3` | 150 | 20 | 30 |
| UR* | 200 | `Hero_Talent_Base_3` | 200 | 20 | 30 |

Choosing the **minimum** rather than the median is what makes §3 an arithmetic proof rather than an
argument: a crossover at rarity X can never exceed the *weakest* original at rarity X on any
sourced axis. Slot minima happen to equal slot modes at every rarity (§1.6), so operations land on
the median too — exact parity, not a nerf.

`slotB`/`slotC` carry no `building` field: crossovers get the type-targeted form of both, never the
single-building form. That is the weaker of the two shapes (a building effect is strictly narrower
than the type effect, so this is the conservative read) and it removes 21 per-character decisions.

The file carries a `localPolicy` block naming these as derived-from-measured (§4).

### 2.3 Table B — `lib/crossover-abilities-data.json` (163 rows, no numbers)

```
{ "id": "xover_msf_spiderman", "archetype": "skirmisher", "type": "Unfettered" }
```

Three fields. `type` is fully determined by `archetype` (§2.5), so the real authoring cost is **one
word per character** — 163 words. Keeping `type` explicit lets a guard test assert
`type === ARCHETYPES[archetype].type` as a typo catcher rather than trusting a lookup.

`rarity` is **not** in this file: it stays in `lib/everkai-additions-data.json` where the rarity
slice owns it, and Table A is keyed off it at load. That coupling is deliberate — if the rarity
slice moves a character from SSR to UR, every one of its progression numbers moves with it, with
no edit here.

### 2.4 Guide nodes: exactly two per crossover, both trainable

`lib/character-skills.mjs:6` currently clones the template's whole node list minus costume talents,
so Spider-Man's guide shows a stranger's awakening ladder and Alraune's Gift. Replace it with a
generated 2-node profile:

1. the talent node, id `Hero_Talent_Base_{1|2|3}` from Table A — must keep the exact
   `name`/`lines` shape `isPlayableTalent` demands (`lib/talents.mjs:11`), so `name` is the rule's
   canonical name and the flavour name goes in a new sibling field (§2.6)
2. the Insight node, id `Hero_Talent_Country{1-5}Base_1` from the type rule

**Every row a crossover's guide shows is trainable.** No preview-only rows, because there is no
pinned source page to preview — which is also the honest UI answer (§5).

### 2.5 The eight archetypes

Chosen to cover both source rosters, to map onto all five Insight types, and to keep the type split
near the originals' (30–35 each of 159):

| archetype | covers | `type` | naming vocabulary |
|---|---|---|---|
| `vanguard` | armoured frontliners, bruisers, guardians | Brave | Guard, Bulwark, Stand |
| `skirmisher` | fast, acrobatic, mobile strikers | Unfettered | Instinct, Momentum, Rush |
| `shadow` | infiltrators, assassins, spies | Unfettered | Silence, Trace, Shade |
| `marksman` | ranged and precision fighters | Informed | Aim, Focus, Mark |
| `arcanist` | mystics, psychics, Force users | Inspiring | Insight, Current, Rite |
| `commander` | leaders, tacticians, captains | Inspiring | Order, Rally, Plan |
| `artificer` | tech, gadget, engineer, builder | Diligent | Craft, Tune, Method |
| `envoy` | support, healer, diplomat, morale | Diligent | Care, Accord, Welcome |

Two archetypes share each of Unfettered, Inspiring and Diligent; Brave and Informed take one each.
A guard test should hold each type to 28–38 of the 163 (the originals' own 30–35 band, widened by
the 163/159 ratio). Sorting 163 characters into eight buckets is a one-pass, reviewable job; the
rank-ordered `selected-roster.json` makes it easy to spot-check the famous ones first.

### 2.6 Flavour names, derived not written

Every crossover row already carries an `occupation` string written for Everkai
(`lib/everkai-additions-data.json`; e.g. Spider-Man → "Web-Slinger", Vader → "Sith Lord"), and
`tests/everkai-additions.test.mjs:45` already guards it. So:

```
talentFlavour  = `${occupation}'s ${ARCHETYPES[a].words[0]}`   // "Web-Slinger's Instinct"
insightFlavour = `${ARCHETYPES[a].words[1]} Study`              // "Momentum Study"
```

163 distinct name pairs from eight archetype words plus strings that already exist and are already
tested. **Zero new per-character prose**, so no copyrighted-bio risk, and nothing to review for
wording beyond the eight vocabularies. The rendered name appears as a subtitle beside the canonical
rule name, because `isPlayableTalent` compares `node.name` against the rule's own name and will
refuse training if the flavour name is put there.

### 2.7 The ladders work at every tier

Crossovers start at N and climb (owner's decision), and Table A is keyed on the *current* rarity,
so:

- **At N**, `baseAptitude` 20 is the only value any original N has — exact parity, not a floor.
- Each rarity step re-reads Table A: base Aptitude 20→35→50→70→100→100→200, talent tier
  1→1→2→3→3→3→3, slot A 30→50→70→100→100→150→200. No interpolation, no per-tier authoring.
- The quality track (1–14, level cap 100→750) is orthogonal and already works for crossovers once
  a `heroes` row exists — that is the only thing blocking `activateOriginalProgression`
  (`lib/original-progression.mjs:33`).
- Nothing in Table A is a delta, so there is no ladder to get wrong on a rarity change, and no save
  field records a previous rarity's value. §6 covers the save-compatibility check anyway
  (CLAUDE.md rule 12: `sourceAptitudeBonus` is a DERIVED value read by `valid()`).

---

## 3. Balance, with the arithmetic

### 3.1 Per-Fellow power, floor row vs strongest original of the same rarity

Computed with the shipped code (`sourceCoefficient`, `lib/adventure.mjs:106-109`), APK growth, best
gear +70, no blessings/stella/echoes on either side, so both halves of every ratio come from the
same formula:

| rarity | fresh (q1, Lv.1, apt 10) | mid (q5, Lv.300, apt 310) | ceiling (q14, Lv.750, apt 1000, skill 20, 7★) |
|---|---|---|---|
| N | 6,000 / 6,000 = **1.000** | — | 46,345,000 / 46,345,000 = **1.000** |
| R | 10,500 / 10,500 = **1.000** | — | 46,810,000 / 46,810,000 = **1.000** |
| SR | 15,000 / 22,500 = **0.667** | 1,243,940 / 1,327,990 = **0.937** | 47,275,000 / 48,050,000 = **0.984** |
| SSR | 21,000 / 33,000 = **0.636** | 1,311,180 / 1,445,660 = **0.907** | 47,895,000 / 49,135,000 = **0.975** |
| UR | 30,000 / 48,000 = **0.625** | 1,412,040 / 1,613,760 = **0.875** | 48,825,000 / 50,685,000 = **0.963** |

**No ratio exceeds 1.000 at any tier.** N and R are exactly 1.000 because 20 and 35 are the only
values those rarities have — equality with every original, which is the intended "equivalent
Fellow at the same investment", not an overshoot. The gap narrows with investment because Aptitude
(cap 1,000, `lib/adventure.mjs:137`) dominates the per-id term — 40 points out of ~1,135 at the
ceiling. And those ratios *ignore* the four systems crossovers can never have (§1.8), which are 67%
of the real ceiling; including them a maxed crossover is at ≈ 14,272 / 43,809 = **0.33** of a maxed
original.

### 3.2 Earnings

`assignedOperation` (`lib/operations.mjs:10`) sums matching percents ÷ 100. With Table A a crossover
at rarity X gets **exactly** the modal original total for X: 80 / 100 / 120 / 150 / 150 / 200 / 250 %
at level 200 (§1.6). Equal, never more. Slot B/C are the universal 20/30 and slot A is the measured
rarity minimum, so there is no invented percent anywhere in the earnings path.

### 3.3 Pace

Skill Pearls per Aptitude point is **1 at every talent tier and via the direct purchase**
(`lib/talents.mjs:7`, `lib/adventure.mjs:80`). Insight is 100 material per point, identical for all
five types (§1.4), fed by one habit refill a day. A crossover therefore climbs at *precisely* the
same cost per point as an original of the same rarity — the pace is not merely bounded, it is
identical by construction.

### 3.4 The one real ceiling consequence: roster size, not ability values

`rosterOperation` (`lib/businesses.mjs:92`) sums `bondedPower/1000` over **every owned Fellow**, not
the party. Doubling the roster therefore scales village income directly, and that is caused by the
*existence* of 163 Fellows, not by anything in Table A or B.

Arithmetic against the pinned fixture: 163 crossovers at the no-blessing/no-stella/no-echo
per-Fellow share (2,269,308 ÷ 159 = 14,272, × 0.97 for the floor base-Aptitude row) add ≈ 2,256,000
conversion, moving the flag-on ceiling from 6,965,719 to ≈ 9,222,000 — from **1.99x to ≈ 2.64x** of
the 3,497,276 real-save reference.

Two things make that reportable rather than blocking:

1. `tests/fellow-power.test.mjs` **cannot see crossovers**. Node has no `location`, so
   `crossoverEnabled()` is false and `FELLOWS === ORIGINAL_FELLOWS`
   (`lib/everkai-additions.mjs:22-24`, `tests/everkai-additions.test.mjs:29-36`). Every pinned
   number in that file is unchanged by this slice.
2. The owner settled ~2x as the accepted target on 2026-09-16 and recorded that "a change that
   moves this ceiling is no longer a defect by itself. It is still worth REPORTING with before/after
   numbers, but it does not block a slice" (`tests/fellow-power.test.mjs` header).

So the deliverable is a **second, flag-on ceiling pin** (§6, test 7) alongside the untouched
original one — and one owner decision (§8).

---

## 4. Provenance

The rules the repo already enforces, and how this slice obeys them:

- **`lib/character-skill-inventory.json` is frozen** (`tests/content-overrides.test.mjs:10`
  `FROZEN_FILES`) and every one of its 281 profiles carries a `source` URL and a `sha256`. Crossover
  rows must **never** be added to it, nor to `lib/character-skill-guide.json`,
  `lib/operation-data.json` (sha-pinned to `Hero.json` / `SkillBase.json`),
  `lib/insight-data.json`, `lib/default-talent-source.json` or
  `lib/original-progression-data.json`. All six stay byte-identical, so the provenance tests keep
  describing the original game exactly as they do today.
- **Local values live in their own file with a self-label.** `docs/data-provenance.md:31,34` grades
  files `mixed` (20) and `local-invention` (10, "this project's own numbers, self-labelled"). Both
  new files carry a top-level note in the style of `everkai-additions-data.json.policy` and
  `content-overrides.json.note`, and both get a row in `docs/data-provenance.md`. Proposed grade:
  **mixed** — every magnitude is a measured original value re-used under a stated rule, and the
  *selection* rule (per-rarity minimum) plus the archetype/type assignment are local. The note must
  say exactly that, naming §1.3/§1.5/§1.6 as the measurements and "per-rarity minimum" as the local
  rule.
- Crossover ids stay `xover_*`, already asserted never to collide with an APK id
  (`tests/everkai-additions.test.mjs:42-43`), so no original-provenance query can pick one up.
- `tests/everkai-additions.test.mjs:52-70` ("each addition borrows every per-id table…") is the test
  that *documents the placeholder*. It must be rewritten, not deleted, into "each addition derives
  every per-id table from its own rarity and type" (§6, test 1), and `template` /
  `pick-template.mjs` retired or kept only as art-lineage metadata.

---

## 5. Systems crossovers must not use, and what the UI says

| system | decision | UI requirement |
|---|---|---|
| **Costumes / wardrobe** | do not use | the wardrobe panel must say *"No costumes are made for Everkai's crossover Fellows."* — adjacent to another agent's slice; coordinate before touching `app/wardrobe-panel.tsx` |
| **Stella** | do not use | already returns nothing; other agent's slice |
| **Artifact Echo** | do not use | keep the existing *"Equip this artifact on its named Echo Fellow first"* refusal; add a crossover-specific line saying Echoes belong to named original Fellows |
| **Blessings (all three)** | do not use | the Fellow Training overview prints `+0` today, which reads like a bug; it must read *"Family blessings apply to the original Fellows only."* |
| **Documented family affinity bond** | do not use | the sandbox bond assign path stays available and should be pointed at explicitly |
| **Awakening / resonance / rarity-upgrade skill nodes** | do not use | they simply do not appear, because §2.4 generates only trainable nodes |

**The one UI string that must change.** `app/character-skill-guide.tsx:9` currently falls back to
*"No skill entries were published in this character's pinned source page. This does not mean the
original character has no skills."* For a crossover that is false on both counts — there is no
pinned source page and it is not an original character. With §2.4 the fallback stops firing, but
the panel's `<details>` note (*"Pinned community reference; versions may differ from the APK"*) is
still wrong for a crossover and needs a branch: *"An Everkai crossover Fellow. Its talent and
Insight follow this project's own rarity table, not an APK record."*

Also verify `app/insight-training.tsx:5` — its note *"Community mastery: level 300 costs 30,000
matching Insight"* is true for crossovers too (identical rule), so it can stand unchanged.

---

## 6. Tests that guard the new tables

All in the repo's existing style: `node:test`, one assertion block per behaviour, negative control
for each (CLAUDE.md: *every guard test must be negative-controlled*). Flag-on assertions need a
child process setting `globalThis.location={search:'?crossover=1'}`, the pattern in
`tests/crossover-flag-village.mjs:3`.

1. **Rewrite `tests/everkai-additions.test.mjs:52-70`** — "derives from its own rarity and type":
   for every addition, `talentRule(id)` equals Table A's rule for its rarity, `insightRule(id).type`
   equals its `type`, and `sourceId` is no longer consulted. *Negative control:* point one row at a
   rarity absent from Table A and confirm the named failure.
2. **Coverage over all 163** — Table B has exactly 163 rows; its id set equals
   `ADDITION_FELLOWS.map(f=>f.id)` with no extras and no gaps; every `archetype` is one of the
   eight; every `type` equals `ARCHETYPES[archetype].type`. *Negative control:* delete one row, and
   separately add an id not in the catalogue.
3. **No missing rows downstream** — flag-on, for all 163: `talentRule`, `insightRule`,
   `characterSkills`, `fellowOperation(...).known`, `original-progression heroes` row and
   `default-talent-source` row all resolve, and `activateOriginalProgression` succeeds with the
   full crossover roster recruited. *Negative control:* drop one rarity row from Table A.
4. **Bounded values** — Table A: `baseAptitude` ∈ [20, 200] and ≤ the measured minimum for its
   rarity; `operationSlotA` ∈ {30,50,70,100,150,200}; slots B/C exactly 20/30; `talentRule` is one
   of the three ids in `lib/talents.mjs:7`. Trained state: Aptitude never exceeds 1,000, talent
   level never exceeds `talentCap`, Insight never exceeds 300.
5. **Per-rarity non-dominance** — the §3.1 table, asserted: for each rarity, a crossover's
   `bondedPower` at fresh / mid / ceiling investment is `<=` that of every original of the same
   rarity at the same investment. This is the balance guard, and it is the one that must not be
   allowed to pass vacuously. *Negative control:* raise one `baseAptitude` above its rarity's
   measured maximum and confirm the assertion fires.
6. **Earnings non-dominance** — for each rarity, the crossover's level-200 operation total equals
   the modal original total for that rarity and is `<=` the maximum. *Negative control:* bump
   `operationSlotA`.
7. **A flag-on ceiling pin** — a new characterisation test recording the flag-on roster ceiling
   (≈ 9,222,000 by §3.4, to be re-measured by the implementer) *and* asserting that the flag-off
   fixture in `tests/fellow-power.test.mjs` is byte-identical to today's. The second half is the
   important one: it proves the slice cannot move a pinned number.
8. **Provenance intactness** — the six source files in §4 are unchanged (hash them in the test);
   `FROZEN_FILES` still contains `character-skill-inventory.json`; no `xover_*` id appears in any of
   them. *Negative control:* inject an `xover_*` id into a copy and confirm the check fails.
9. **Names are original and short** — every generated flavour name is ≤ 40 characters, is not equal
   to any name in `character-skill-guide.json`, and contains none of the source-IP franchise words.
   *Negative control:* a fixture name that collides.
10. **Save compatibility** — CLAUDE.md rule 12. `sourceAptitudeBonus` is derived and read by
    `valid()`, so generate a flag-on save with the current build (template-borrowed rows) and decode
    it with the new one. For the two prototypes the derived value changes (Spider-Man's template
    `hero_103` vs the SSR floor 70), so this check is **not** optional — measure whether a save that
    trained a prototype still decodes, and if not, whether the fix is a repair-pipeline entry or a
    `SAVE_VERSION` bump.

---

## 7. Ordered task list for the implementing agent

1. Read `lib/everkai-additions.mjs`, `lib/talents.mjs`, `lib/insight.mjs`, `lib/operations.mjs` and
   `lib/original-progression.mjs:10` end to end. Re-run the §1 measurements yourself before
   trusting any table here.
2. **Answer owner decision D1** (§8) — how the 163 rarities are assigned. Table A is keyed on it, so
   nothing below is final until the rarity slice lands. Coordinate with that agent, do not guess.
3. Write `lib/crossover-progression-data.json` (Table A, §2.2) with its `localPolicy` note. Add a
   generator script under `scripts/crossover/` that *re-derives* the seven rows from
   `original-progression-data.json` + `operation-data.json` + the guide, so the table can be
   regenerated rather than trusted — and assert in the script that it reproduces §1.3/§1.5/§1.6.
4. Sort all 163 ids into the eight archetypes (§2.5) and write
   `lib/crossover-abilities-data.json` (Table B). Check the five type counts land in 28–38.
5. Write `lib/crossover-abilities.mjs`: `crossoverRarityRule(id)`, `crossoverTalentRule(id)`,
   `crossoverInsightRule(id)`, `crossoverOperation(id)`, `crossoverGuide(id)`,
   `crossoverBaseAptitude(id)`, `crossoverFlavour(id)`. Import only its two data files, so every
   lib module can use it without an import cycle (the `everkai-additions.mjs:18` pattern).
6. Replace the seven `sourceId()` call sites (§1.7) with `isAddition(id) ? crossover… : original…`.
   Keep `sourceId` exported until step 9 so nothing breaks mid-change.
7. Add crossover support to `lib/operations.mjs` — the one place with no `sourceId()` today and
   therefore the one behaviour change a player will actually notice.
8. Replace `lib/character-skills.mjs:6` with the generated 2-node profile (§2.4), preserving the
   exact `name`/`lines` shape `isPlayableTalent` requires.
9. Retire `template` and `scripts/crossover/pick-template.mjs` from the progression path. Decide
   whether `template` survives as art-lineage metadata; if it goes, update
   `tests/everkai-additions.test.mjs:116`'s key-set assertion.
10. UI: the two strings in §5 plus the blessing `+0` line in `app/fellow-training.tsx`.
11. Write tests 1–10 (§6) and negative-control **each one** by breaking the thing it guards.
12. Run the save-compatibility check (§6.10) before anything else is called done. Then
    `pnpm test`, `pnpm exec tsc --noEmit`, `pnpm build`, capturing `$?` directly.
13. Add rows for both new files to `docs/data-provenance.md` and close the slice's rows in
    `docs/parity-catalog.csv` as Fixed / Deferred-with-reason / Dropped (CLAUDE.md rules 7–8).

---

## 8. What I could not measure, and the owner decisions

**Could not measure**

- **The 163 rarities.** `selected-roster.json` carries only `{rank, character, identity, assetId}`
  — no rarity, no type. Table A is a function of rarity, so its per-character output is unknown
  until the rarity slice publishes. Both prototypes already have one (`SSR`, `UR`), so the ladder
  is exercisable today.
- **The 163 archetypes.** Taste, not measurement (CLAUDE.md rule 10). Eight buckets and a first
  pass from `occupation` is the cheapest route; the owner should review the list once, not
  character by character.
- **Slot A for the 31 censored operation records.** Their real value sits behind a rarity-gated
  `Hero_Appoint_CountryNBase_4` that `lib/operation-data.json` deliberately excludes. It does not
  block Table A (the 144 uncensored records give a complete rarity ladder), but it means the
  originals' true slot-A ceiling is *higher* than measured for those 31 — which only makes the
  floor choice safer.
- **The flag-on ceiling, exactly.** §3.4's ≈ 9,222,000 is extrapolated from the pinned fixture's
  per-Fellow share, not run. It needs a real flag-on `recruitAll` fixture, which is test 7's job.
- **Whether any real save has trained a prototype crossover.** That decides whether §6.10 needs a
  repair entry or nothing at all, and only the owner's device can answer it.

**Owner decisions (recommendation first, per CLAUDE.md rule 9 — work proceeds on these unless the
owner objects)**

- **D1 — rarity assignment for the 163.** Not mine, but Table A cannot be finalised without it.
  *Recommendation:* start every crossover at N as already decided, and let the existing quality
  track (1–14) be the climb; assign the "destination" rarity by the roster's own rank ordering.
- **D2 — the flag-on Power ceiling moving from 1.99x to ≈ 2.64x.** *Recommendation:* accept and
  pin it in a separate flag-on test. The reasoning that made 2x acceptable on 2026-09-16 (3,497,276
  is one real save, not the original's maximum) applies at least as well behind an opt-in flag, and
  the crossovers reach only ≈ 0.33 of a maxed original each.
- **D3 — two guide rows per crossover, or four.** *Recommendation:* two (talent + Insight), both
  trainable. The alternative adds `SG3`/`Project` analogues for visual symmetry with originals, at
  the cost of two preview-only rows per character that do nothing. Say the word and it is a
  four-line change to Table A's generator.
- **D4 — does `template` survive as art-lineage metadata?** *Recommendation:* keep it, clearly
  relabelled as the art/rendering lineage it actually documents, and remove every progression read
  of it.
- **D5 — costumes for crossovers.** *Recommendation:* never. The rendering pipeline produces base
  appearance only (`additionClip` returns null for any `costumeId`,
  `lib/everkai-additions.mjs:36`), and the wardrobe panel should say so rather than show an empty
  shelf. Coordinate with the Stella/costume slice before editing that panel.
