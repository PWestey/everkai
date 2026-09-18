# Crossover progression plan — the rarity/quality ladder and its economy

**Status: PLAN ONLY.** No gameplay code exists for anything below. Written 2026-09-17 on branch
`worktree-agent-a5ba913c6a27ba496` after `git merge crossover`. Baseline gate at time of writing:
`pnpm test` → **1,005 tests, 1,004 pass, 0 fail, 1 todo, exit 0**.

The owner's decision this plan serves:

> Every crossover character starts at rarity **N** and can be upgraded all the way to the top rarity;
> the Isekai cast keeps its original rarities (parity). Unlocking a crossover character should be gated
> on playing its crossover storyline rather than on a cheap N recruit price.

Every number below is cited to `file:line` or to a command. Numbers I could not measure are collected in
[§8 Unmeasured](#8-unmeasured-numbers-flagged-not-guessed) rather than estimated.

---

## 1. How rarity works today

### 1.1 Where a rarity comes from

| Source | Reference |
|---|---|
| Original cast | `lib/public-roster.json` → `records[id].rarity`, read by `recruitRarity` (`lib/summon.mjs:22`) |
| One APK supplement | `lib/public-reference.mjs:27` — `hero_60: {rarity:'SR'}` |
| Crossover additions | `lib/everkai-additions-data.json` → `fellows[].rarity`, surfaced by `ADDITION_FELLOWS` (`lib/everkai-additions.mjs:27`) and reached by the `??` fallback in `recruitRarity` (`lib/summon.mjs:22`) |

Rarity is **static data**. It lives in no save field, and nothing in `lib/` writes it. That is the single
most important fact for this slice: making a crossover rarity *climb* is a new capability, not a new value
in an existing slot.

MEASURED against `lib/public-roster.json` (281 records):

```
N 8 · R 27 · SR 42 · SSR 95 · SSR+ 7 · UR 51 · UR* 3        (plain)
48 records carry a CHAINED string, 34 of them hero_, 14 wife_
```

Of the 34 chained `hero_` records, **32 are in `ORIGINAL_FELLOWS`** and 13 of the 14 chained `wife_`
records are in `FAMILY` (the rest are not shipped). The ten distinct chains:

```
SSR -> UR              SSR -> SSR+ -> UR*      SSR -> SSR+        SSR+ -> UR
SR -> SSR+ -> UR       SSR -> UR*              SSR+ -> UR*        SSR+ -> UR -> LR
SSR -> SSR+ -> UR -> LR                        SSR -> SSR+ -> UR* -> LR
```

Those chains are **the original's own rarity-advancement path written into the roster snapshot as a
label** — see §1.3. Everkai displays and prices only the head.

### 1.2 Every read of rarity at runtime, and what it actually affects

Swept `lib/*.mjs`, `app/`, `components/`, `tests/*.mjs`, `scripts/`. Character rarity (not artifact,
fish or familiar rarity) is read in exactly these places:

| Site | Effect | Gameplay? |
|---|---|---|
| `lib/summon.mjs:38` `recruitPrice` → `:63` `summonCost` | Recruit price | **YES** |
| `lib/fishing.mjs:60` `fishingBonuses` | A displayed fish's skill can be gated to a rarity list; `e.rarities.includes(profile?.rarity)` | **YES** — see the latent defect below |
| `lib/roster-filter.mjs:4` | Free-text roster search | Cosmetic |
| `lib/ui-sprites.mjs:6,17,18,26` | `Icon_Rarity_*`, card ground and frame sprites | Cosmetic |
| `app/character-screen.tsx:20`, `app/recruit-panel.tsx:9,22,24,51`, `app/roster-picker.tsx:14` | Badges, tile meta, price line | Cosmetic |
| `lib/roaming-data.mjs:11` | Family `bondGoal` — **baked into the data at import time**, not computed from rarity at runtime | Frozen |

**Rarity does NOT feed power, level caps, business earnings, adventure, or the mine.** Confirmed by
reading the whole chain: `fellowCap` (`lib/adventure.mjs:64`) reads quality/breaks only; `fellowPower`
and `bondedPower` (`lib/adventure.mjs:108-109`) read level, aptitude, skill, gear, artifacts, stars,
blessings, museum, familiars, fishing, echoes, stella, elixirs — never rarity.

So today rarity is **a price tag and an icon**. That is what makes the owner's ask cheap: a climbing
rarity badge costs almost nothing, and the *power* half has to be bolted onto an existing ladder.

> **Latent defect found while sweeping (pre-existing, not introduced by this slice).**
> **RESOLVED 2026-09-17 for the crossover half, and only that half.** The ladder ships as a DISPLAY
> derivation (`lib/crossover-rarity.mjs`): the stored string stays the bare `"N"`, so a crossover
> Fellow's fish bonuses are identical at quality 1 and 14 (pinned, with a `["UR"]`-gated effect as the
> negative control), and the rarity-to-power coupling this note warned about cannot arise by accident.
> The 32 chained ORIGINAL Fellows still receive no rarity-gated fish bonus: unchanged, pre-existing,
> and R4 in §6 still owns it. As written:
> `lib/fishing.mjs:60` compares `profile?.rarity` — the raw catalogue string — against a validated list
> of `['N','R','SR','SSR','SSR+','UR']` (`lib/fishing.mjs:67`). A Fellow whose rarity is the chain
> `"SSR -> UR"` therefore matches **nothing**, so **32 original Fellows silently receive no
> rarity-gated fish bonus**. `app/recruit-panel.tsx:9` and `lib/ui-sprites.mjs:16` both already own a
> `head()`/`cardRarity()` helper for exactly this; `fishingBonuses` does not use one. Filed here rather
> than fixed because this slice is planning-only (CLAUDE.md rule 7: **deferred, reason stated**). It
> becomes load-bearing for this plan — a crossover character whose rarity climbs N → … → UR would
> change which fish bonuses it receives at each step, which is a real rarity→power coupling. Fix it
> before the ladder ships, or the coupling is accidental.

### 1.3 The original's own rarity advancement — it exists, and it is measurable

`docs/permanent-systems.md:534` records **F7 Rarity Advancement — "N…SSR→SSR+→UR→UR★ (LR for some),
unlocking skills and caps" — ABSENT** from Everkai. The owner's crossover ask *is* F7.

Positive control before any claim of absence (CLAUDE.md rule 2): the full config set at
`~/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic/` returns **1,499 files,
`Wife 33 / City 15 / SimGame3 21`** — the control values CLAUDE.md names. Searches below are sound.

MEASURED from that set:

**`HeroRarityUpgrade.json`** — top-level dict wrapping a list at key `HeroRarityUpgrade`, **326 rows**
(structure checked before counting, rule 3). One real row (rule 4):

```json
{"_id":"121_Upgrade_1","heroID":"121","type":1,"rarity":4,"rarity_TW":9,
 "afterRarity":5,"skill_1":"Hero121_Talent_extra2_3"}
```

Columns: `_id, heroID, type, rarity, afterRarity, skill_1` (all 326) and `skill_2` (160).
**There is no cost column here** — this table says *which skills unlock at which step*.
**34 heroes** carry rarity upgrades — exactly the 34 chained `hero_` rarity strings in §1.1, which
confirms the roster snapshot's chains are this table's transitions. Rarity codes per
`lib/public-reference.mjs:23` (`1 N, 2 R, 3 SR, 4 SSR, 5 UR, 6 UR*, 9 SSR+`), plus **7 = LR**, newly
resolved from the `(5,7)` and `(6,7)` pairs:

```
rarity -> afterRarity :  (4,5) 34   (4,9) 56   (9,6) 58   (9,5) 116
                         (3,9) 15   (5,7) 28   (6,7) 7    (4,6) 12
```

**`HeroRarityUpgradeStage.json`** — dict wrapping a list, **54 rows over 34 heroes**. These are the
*advanced forms* of a character (`251M1`, `251M2`, `251M3`), each with its own art, dialogue, skills
and — crucially — its own `initialTalent`. `initialTalent` is the field Everkai already imports as
`data.heroes[id]` and spends in `sourceAptitudeBonus` (`lib/original-progression.mjs:9`).

**What a rarity step is worth, measured** (`HeroRarityUpgradeStage.initialTalent` minus
`Hero.json.initialTalent` for the same hero, 54 forms):

| | value |
|---|---|
| Heroes with 1 / 2 / 3 rarity steps | 15 / 11 / 3 (of 29 with a Magic-Level track) |
| `initialTalent` delta, first step | +0 to +100 (typical +25, +30, +50, +60) |
| `initialTalent` delta, final step | +0 to **+170** (hero 251: 70 → 240) |
| Two heroes gain nothing | 254 (base already 200), 304 |

For scale: `Hero.json` base `initialTalent` runs **20 to 200** across 181 rows; Everkai's whole 14-step
quality ladder adds at most **+65** (`data.quality['14'].talent`). So one original rarity step is worth
**roughly half to three times the entire quality ladder's talent award**. This is the number that makes
a naive "rarity step = quality step" mapping wrong.

**Where the cost lives — `HeroMagicLevel.json`**, dict wrapping a list, **3,877 rows over 29 heroes**.
Columns: `_id, lvID, heroId, costItem, costNum, talentBonus` (all rows), plus `addNewSkillId` (85),
`heroRarityUpgradeId` (46), `rainyUpgradeStageId` (46). One real row:

```json
{"_id":"251_1","lvID":"1","heroId":"251","costItem":"Item_magicElement_Hero251",
 "costNum":10,"talentBonus":5}
```

MEASURED:

- Track depths: **50, 81, 161, 201, 240, 241** levels (histogram `{240:1, 50:1, 81:15, 201:7, 161:3, 241:2}`).
- Cost is flat **10 units per level of a character-exclusive item** (`Item_magicElement_Hero251`,
  `Item_RarityUpgrade_Hero_166`, …). Hero 251's full 240-level track = **2,380 units**; hero 166's
  81-level track = **800 units**.
- `talentBonus` is a **running total, not a per-level increment** — lv 1 = 5, lv 2 = 10, lv 3 = 15,
  lv 50 = 250, lv 200 = 1,000, lv 240 = 1,200. It is exactly `5 × level`. (Summing the column gives
  144,600, which is meaningless; recorded here so nobody re-derives it wrong.)
- **Rarity steps fire at Magic Levels 0, 50, 80, 120, 160, 200, 240** — 46 rows across 29 heroes.

So the original's climbable-character shape is: **a per-character exclusive material, 10 per level, a
40-to-80-level gap between rarity badges, and a talent award that dwarfs the quality ladder.**

---

## 2. The existing 14-step quality ladder

### 2.1 Shape

`lib/original-progression.mjs` over `lib/original-progression-data.json` (top keys: `policyVersion`,
`sourceVersion`, `sourceHashes`, `heroes` (180), `levels` (750), `quality` (14), `materials` (9)).

| Quality | Level cap | `talent` | Consume (each of 3 materials) |
|---|---|---|---|
| 1 | 100 | +0 | 1 × tier-1 |
| 2 | 150 | +5 | 3 × tier-1 |
| 3 | 200 | +10 | 5 × tier-1 |
| 4 | 250 | +15 | 10 × tier-1 |
| 5 | 300 | +20 | 1 × tier-2 |
| 6 | 350 | +25 | 3 × tier-2 |
| 7 | 400 | +30 | 5 × tier-2 |
| 8 | 450 | +35 | 10 × tier-2 |
| 9 | 500 | +40 | 20 × tier-2 |
| 10 | 550 | +45 | 30 × tier-2 |
| 11 | 600 | +50 | 1 × tier-3 |
| 12 | 650 | +55 | 3 × tier-3 |
| 13 | 700 | +60 | 5 × tier-3 |
| 14 | 750 | +65 | — (terminal) |

Nine materials, three tiers of three (`SOURCE_MATERIALS`, `lib/original-progression.mjs:11`):
Bravery/Wisdom/Hope **Crystal Ore** → **Crystal** → **Refined Crystal**.

### 2.2 How it is unlocked

`activateOriginalProgression` (`lib/original-progression.mjs:36-41`) is a one-way opt-in from the
Training Rules panel. It refuses if any owned Fellow has no `data.heroes[sourceId(id)]` row, and it
seeds both `trainingCosts` (policyVersion 2, baselining current levels) and `originalProgression`
(policyVersion 1, `claims:0, quality:{}, stock:{9 zeros}, receipts:[]}`).

While active: `limitBreak` is refused (`lib/adventure.mjs:144` — *"Use the original quality upgrade in
Training Rules"*), `fellowCap` reads `sourceCap` instead of the `breaks` ladder
(`lib/adventure.mjs:64`), and `xpCost` switches to `originalCost` (`lib/adventure.mjs:72`).

`originalQuality` (`lib/original-progression.mjs:47-51`) charges one step. It requires quality < 14,
`f.level >= rule.cap`, the materials in stock, and < 3,000 receipts.

### 2.3 Real costs, and days of habits to climb one character

**Materials.** Summing `quality[1..13].consume` gives, per character:

```
Item_Breach_Hero_1_1/2/3 : 19 each   (1+3+5+10)
Item_Breach_Hero_2_1/2/3 : 69 each   (1+3+5+10+20+30)
Item_Breach_Hero_3_1/2/3 :  9 each   (1+3+5)
                    TOTAL: 291 units, binding material 69
```

**The one faucet.** `claimDailyBreach` (`lib/original-progression.mjs:29-34`): `DAILY_BREACH = 10` of
**each of the nine**, once per calendar day, refused unless
`habitEarnings(s.habits, s.lastAt).dailies >= 1`. `DAILY_BREACH` is labelled a **local rule** at
`lib/original-progression.mjs:15-18` — the original sources these from 19,885 `Rewards` rows in content
Everkai does not have — and that comment records the calibration: *"idle Fellow EXP (21 days, APK
growth): 0/day 444M/s with every Fellow stuck at level 100; 10/day 747M; 25/day 949M; 100/day 1,141M."*

**The pool is shared across the whole roster.** `stock` is nine scalars, not per-Fellow, and
`validOriginalProgression` proves it: `p.stock[id] === p.claims*100 + (p.dailyClaims||0)*DAILY_BREACH - spent[id]`
(`lib/original-progression.mjs:26`). So the binding constraint is the tier-2 total over *all* characters:

| Characters climbed q1→q14 | Tier-2 units needed (69 each) | Days of daily-habit claims |
|---|---|---|
| 1 | 69 | **7** |
| 10 | 690 | **69** |
| 159 (all original Fellows) | 10,971 | **1,098** (~3.0 years) |
| 163 (crossover set) | 11,247 | **1,125** (~3.1 years) |
| 322 (both) | 22,218 | **2,222** (~6.1 years) |

Both halves of every division above come from Everkai (`data.quality` for the cost, `DAILY_BREACH` for
the faucet) — CLAUDE.md rule 1.

**EXP.** `originalQuality` gates each step on `f.level >= rule.cap`, so the ladder also charges the full
level climb. Summing `data.levels[1..749].cost`:

| Reach | Cumulative Fellow EXP |
|---|---|
| Level 100 (q1 cap) | 71,160 |
| Level 300 (q5 cap) | 5,262,490 |
| Level 500 (q9 cap) | 92,707,490 |
| Level 700 (q13 cap) | 2,738,957,490 |
| **Level 750 (q14 cap)** | **5,851,457,490** |

All 750 rows have a cost (0 missing). `originalCost` returns null at ≥750 (`lib/original-progression.mjs:6`),
and `trainingCost` falls back from the truncated `original-training-costs.json` (levels 1–59) to
`originalCost` — one shared helper, deliberately, because writing the charge and the validator separately
once rejected every save trained past level 60 (`lib/training-costs.mjs:5-8`).

163 characters × 5.85B = **953.8B Fellow EXP**. `MAX_FELLOW_XP = 1e13` (`lib/limits.mjs:12`), so the
wallet holds it. **How many days that is, I could not measure — see §8.**

**Limit breaks.** The default (non-APK) ladder is `breaks 0..13 → qualityRule(breaks+1).cap`, i.e. the
same 100…750 caps (`lib/adventure.mjs:64`), charged in `local_limit_token` at `breakCost = breaks+1`
(`lib/adventure.mjs:91`), 1,000 gold each from `MATERIALS` (`lib/adventure.mjs:37`) plus one free token
every 5th stage clear (`lib/adventure.mjs:151`). Total 91 tokens per character. With
`originalProgression` on, `limitBreak` is refused outright, so the two ladders never both apply.

---

## 3. Proposal: rarity as a projection of quality

### 3.1 The recommendation, in one sentence

**Do not build a new ascension ledger. Reuse the 14-step quality ladder unchanged, and derive the
crossover character's displayed rarity from its quality tier.**

### 3.2 Why — it already works today, measured

`lib/everkai-additions.mjs:33` maps an addition to its `template` via `sourceId(id)`, and every per-id
original table reads through it. `lib/original-progression.mjs` imports `sourceId` at line 2 and uses it
in `sourceAptitudeBonus` (:9) and twice in `validOriginalProgression` (:24, :25).

I drove it. With `xover_msf_spiderman` (template `hero_103`) owned:

```
addition: xover_msf_spiderman rarity SSR template hero_103 -> sourceId hero_103
valid with addition owned:             true
activateOriginalProgression:           "Original growth enabled…"
sourceCap for addition:                100    quality: 1
originalQuality on the addition:       "Quality 2 · level limit 150 · original Aptitude bonus +5."
bondedPower after:                     69,375
```

A crossover character **already climbs the quality ladder**, already inherits its template's talent, and
already passes `valid()`. The only missing piece is that its rarity *string* does not move.

### 3.3 The mapping

14 quality tiers, and the owner wants N → top rarity. Use the original's own step count as the shape
(§1.3: 1–3 rarity badges per character, at 40–80-level gaps) rather than one badge per quality step:

| Quality | Level cap | Displayed rarity |
|---|---|---|
| 1–2 | 100–150 | **N** |
| 3–4 | 200–250 | **R** |
| 5–6 | 300–350 | **SR** |
| 7–8 | 400–450 | **SSR** |
| 9–10 | 500–550 | **SSR+** |
| 11–12 | 600–650 | **UR** |
| 13 | 700 | **UR\*** |
| 14 | 750 | **LR** |

Eight badges over fourteen steps — two quality steps per badge, which mirrors the original's 40–80-level
gap at Everkai's 50-level cap spacing. This is a **local choice** and must be labelled as one in the data
file, exactly as `COMPLETIONS_PER_STAGE` is (`lib/event-data.json.localNumbers`).

Implementation: one pure function, **no new save state**.

```js
// lib/everkai-additions.mjs (proposed)
export const CROSSOVER_RARITY_BY_QUALITY = ['N','N','R','R','SR','SR','SSR','SSR','SSR+','SSR+','UR','UR','UR*','LR'];
export const crossoverRarity = quality => CROSSOVER_RARITY_BY_QUALITY[Math.min(14, Math.max(1, quality)) - 1];
```

`recruitRarity` keeps returning the *static* `N` for an unowned crossover character (it is the price tag
and the recruit-panel badge). The roster tile and character screen read a new
`displayRarity(s, id)` = `isAddition(id) ? crossoverRarity(sourceQuality(s, id)) : fellowById(id).rarity`.

**Sprites — checked, and one defect found.** `lib/ui-sprite-data.json` holds exactly eight
`Icon_Rarity_*` keys:

```
Icon_Rarity_N_1  R_1  SR_1  SSR_1  SSRPlus_1  UR_1  URPlus_1  LR_1
```

So **`Icon_Rarity_LR_1` exists** — the top of the ladder has art, and the mapping in the table above is
fully renderable except for one rung:

> **FIXED 2026-09-17** — `'UR*':'URPlus'` shipped in `lib/ui-sprites.mjs`, and `LR` was folded onto
> the six-wide PetList card ramp for the same reason; both negative-controlled in
> `tests/crossover-rarity.test.mjs`. As written:
> **`UR*` has no icon.** `rarityIcon` (`lib/ui-sprites.mjs:6`) aliases only `{'SSR+':'SSRPlus',
> 'UR+':'URPlus'}`, so `rarityIcon('UR*')` asks for `Icon_Rarity_UR*_1`, which is not a key, and returns
> `null`. `cardRarity` (`lib/ui-sprites.mjs:16`) *does* strip a trailing `*`; `rarityIcon` does not.
> This already affects the **3 roster records whose rarity is `UR*`** plus every chained rarity ending in
> `UR*`. One-character fix: add `'UR*':'URPlus'` to the alias map. Pre-existing, deferred here because
> this slice is planning-only (CLAUDE.md rule 7), but it must ship before the q13 badge does.

Where a rarity has no sprite, `app/character-screen.tsx:20` already falls back to the text, so nothing
breaks — it just looks wrong.

### 3.4 Cost per step

**Unchanged from `data.quality`.** This is not laziness — it is the *only* safe option, and §5.2 explains
why editing that table would break every existing save. So: **7 days of daily-habit claims per character
for the whole N→LR climb**, plus the level climb to 750.

### 3.5 Interaction with power

`bondedPower` with `originalProgression` on (`lib/adventure.mjs:109`):

```
base = floor(sourceCoefficient(level) × (starredAptitude + sourceAptitudeBonus + gear + artifacts) × (1 + skill×0.05))
```

where `sourceAptitudeBonus = data.heroes[sourceId(id)] − 10 + qualityRule(q).talent`.

So a crossover character's power moves through **two** of the ladder's outputs — the level cap and the
`talent` term — and inherits its **template's** `heroes[]` value. MEASURED
`sourceCoefficient`: level 1 → 300, 100 → 925, 300 → 3,362, 500 → 7,590, 750 → 15,500.

One Fellow (`hero_1`, aptitude 10, no gear/artifacts/stars), `originalProgression` on:

| Quality / level | `bondedPower` | contribution to `rosterOperation` |
|---|---|---|
| q1 / 100 | 18,500 | 18.5 |
| q2 / 150 | 34,350 | 34.4 |
| q5 / 300 | 134,480 | 134.5 |
| q10 / 550 | 580,775 | 580.8 |
| q13 / 700 | 1,094,400 | 1,094.4 |
| **q14 / 750** | **1,317,500** | **1,317.5** |

**The full climb is a 71.2× power multiplier on one character.** (Default mode for comparison: level 100
breaks 0 → 2,080; level 750 breaks 13 → 15,080.)

### 3.6 Business earnings — the real problem

`rosterOperation` (`lib/businesses.mjs:92`) sums `bondedPower/1000` over **every owned Fellow**, and the
divisor is the original's own recovered constant (`BuildingBase.HeroConversionRate` 10 on all 17
non-Bank buildings → 10000/10 = 1000, `lib/businesses.mjs:86-91`). `enterpriseRate`
(`lib/businesses.mjs:117-122`) then adds `operation` **once per open business**, and there are
**17 businesses** (`BUSINESSES`, `Building_101` … `Building_1701`).

MEASURED `rosterOperation`, all Fellows at aptitude 10 with no gear, artifacts, stars, stella, blessings
or echoes:

| Roster | `rosterOperation` |
|---|---|
| 159 original Fellows @ q1 / L100 | 11,637 |
| 159 original Fellows @ q14 / L750 | **355,183** (avg 2,234 per Fellow) |
| + 163 crossover @ q14 / L750 | **+364,118 → +103%** |

(The 2,234 average exceeds `hero_1`'s 1,317.5 because `data.heroes[]` talent ranges 20–200 across the
180 rows; `hero_1` sits near the bottom, `hero_103` — Spider-Man's template — is 70.)

**Against the accepted ceiling.**

> **CORRECTED 2026-09-18 — the 1.99× in this section and the next is dead, and so is the budget built on
> it.** The denominator, 3,497,276, is **one real player's few-weeks save**, not the original's maximum,
> and it was additionally *misread as a single hero's power* when it is a **roster total of
> 3,497,276,469** over ~150 heroes — ~23M average against the owner's own reported 300M top and 5M
> floor. `docs/power-parity-audit.md` §5 has the derivation. The figure has since moved to **1.331×**
> (the 2026-09-17 roster trim), **4.473×** (importing the original's own 126 Stella tracks) and
> **7.708×** (importing the three deferred Spirit columns) — none of which is an overshoot of anything,
> because the ratio was never a budget. It is now a **pacing check**, named `ORIGINAL_LIVE_SAVE_PACING`
> in `tests/crossover-ceiling-fixture.mjs`, which carries the whole argument. The pin that *is* a
> ceiling-to-ceiling comparison is **`ORIGINAL_SPIRIT_TABLE_MAX` = 13,861,950** — every one of the
> original's 126 Spirit tracks at its top rank, under the original's own `HeroConversionRate` divisor —
> against which Everkai's flag-off ceiling is **1.945×**, and that denominator counts one bucket of one
> system for 126 heroes of 181, so even 1.945× is an *upper bound* on the overshoot.
>
> **Read the R1 row in the decision table below the same way.** Its "1.99× → ~4.0×" arithmetic about the
> 163 climbable Fellows is still correct *as arithmetic*; what is wrong is calling either end of it a
> ceiling that was exceeded.

`tests/fellow-power.test.mjs:12-64` records the position as it stood: the
original's live save reached **3,497,276,469 total power → 3,497,276 `rosterOperation`**, Everkai's
fully-assembled fixture reached **6,965,719 (1.99×)**, and *"SETTLED 2026-09-16: THE OWNER ACCEPTED ~2×
AS THE TARGET."*

**ANSWER TO THE QUESTION ASKED: yes — 163 climbable characters inflate village earnings past the
accepted ceiling, by about a factor of two.** `rosterOperation` is linear in Fellow count, the measured
addition is **+103%**, so the same fully-maxed build that the owner accepted at 6,965,719 (1.99×) lands
at **≈13.9M, ≈4.0× the original's live save** — and that lands on the `operation` strand of all 17
businesses. This is a *measurement*, not a simulation: it follows from `rosterOperation`'s definition
plus the measured per-Fellow average, both from Everkai.

**Recommended mitigation (CLAUDE.md rule 9 — recommending, and work should proceed on it unless the
owner objects): a Champions cap.** Only *K* crossover characters may hold quality above a floor at any
one time. Cheapest form: `originalProgression.champions`, an array of ids, length ≤ K; `originalQuality`
refuses a crossover character not in it above quality 4 (rarity R, cap 250). With **K = 8** the
crossover set adds `8 × 2,234 ≈ 17,900` at full climb against the 159-Fellow baseline's 355,183 — about
**+5%**, comfortably inside the accepted ceiling — while every one of the 163 can still be recruited,
levelled to 250 and swapped in. Alternatives, cheapest named, in §6.

**Note the pacing already does most of the work.** §2.3 measures 1,125 days of habit claims to climb all
163 — the shared material pool *already* rate-limits this to three years. The problem is not the pace, it
is the **ceiling**: a player who plays for three years gets there, and the ceiling is what the owner
signed off on.

### 3.7 Pinned pacing

With a normal habit routine (one finished daily → one `claimDailyBreach`, per `lib/original-progression.mjs:31`):

| | days of habit claims (materials only) |
|---|---|
| One crossover character, N → LR | **7** |
| Ten crossover characters, N → LR | **69** |
| All 163 | **1,125** (~3.1 years) |
| All 322 (crossover + original) | **2,222** (~6.1 years) |

If a player pushes 10 of them: **69 days of materials**, and they add `10 × 2,234 ≈ 22,300` to
`rosterOperation` — about **+6%** on the 159-Fellow baseline. Ten is fine unmitigated. The cap in §3.6
exists for the player who pushes a hundred.

**The Fellow-EXP half of this pacing is NOT measured** — 5.85B EXP per character to reach 750 is
measured, the EXP-per-day faucet rate is not. See §8.

---

## 4. Unlock gating: play the storyline, don't pay 3 fragments

### 4.1 What exists

`lib/events.mjs` over `lib/event-data.json` — **8 arcs, 35 stages** (measured):

| Arc id | Name | Stages |
|---|---|---|
| `DemonSlayer` | Isekai Demon Hunter Arc | 7 |
| `TenSura` | Camping with A Slime | 4 |
| `Maidragon` | Dragon Maid on Hiemspresent | 5 |
| `DanMachi` | Encounter in Another World | 4 |
| `FairyTail` | Fight! Magic Academy Sports Day! | 4 |
| `Konosuba` | God's Blessing on This Laid-Back Isekai! | 5 |
| `Mushoku` | Mushoku Tensei and Magic Creativity Show | 4 |
| `LycoReco` | Cafe LycoReco Crossing into Isekai | 2 |

One stage = one cast member = `COMPLETIONS_PER_STAGE = 10` habit completions (`lib/events.mjs:19`),
**spent** from a lifetime count minus a running `spent` total (`completionsAvailable`,
`lib/events.mjs:26`), so an arc cannot be farmed by re-entering. Stage shape is minimal:
`{"step":1,"member":"hero_302"}`.

`validEvents` (`lib/events.mjs:30-48`) checks the ledger **both ways**: `t.spent === stages × 10`, and
every member an arc claims to have handed over must actually be in `s.fellows` or `s.family`.

### 4.2 What to change

**(a) Price: gate, don't charge.** `recruitPrice` (`lib/summon.mjs:38`) currently falls through to
`summonCost(recruitRarity(id))`, and a crossover character at rarity N would price at **3 Acquaint Stone
Fragments** — the cheap recruit the owner explicitly rejected. Add a third branch in the same
ternary chain, before `FREE_ROSTER`:

```js
export const recruitPrice = id =>
  RANK_FELLOWS.has(id) ? null
  : isAddition(id)     ? null          // NEW: story-gated, the counter never sells them
  : FREE_ROSTER.has(id) ? FREE_PRICE
  : summonCost(recruitRarity(id));
```

`null` is already the "refused at the counter" value and `recruitOffers` (`lib/summon.mjs:43`) already
filters on it, so additions drop out of the offer list with no other change. `summonRecruit` already
refuses `null` with *"No price is recorded for this character yet."* — **that message must change** for
this case; see (d).

**(b) Add crossover arcs to `lib/event-data.json`.** Two arcs, one per source game (MSF, SWGOH), matching
the two Fellows that exist behind the flag today. Same `{step, member}` shape. Cost stays
`COMPLETIONS_PER_STAGE = 10` — habit-driven, offline-deterministic, already proven.

**(c) FIX A BLOCKING DEFECT: `events.mjs` routes any non-`hero_` id to Family.**
`lib/events.mjs:58` — `const member = stage.member, isFellow = member.startsWith('hero_')` — and the
same test in `validEvents` at `lib/events.mjs:43`:

```js
for (const st of e.stages.slice(0,n))
  if (!(st.member.startsWith('hero_') ? s.fellows?.[st.member] : s.family?.[st.member])) return false;
```

A crossover id is `xover_msf_spiderman`. It does **not** start with `hero_`, so today it would be looked
up in `FAMILY`, fail `if(!person) return fail('That character is not in the catalogue.')`, and — worse —
`validEvents` would look for it in `s.family` and **refuse the save**. Two call sites, one fix. Preferred
shape: put an explicit `kind` on the stage row (`{"step":1,"member":"xover_msf_spiderman","kind":"fellows"}`)
and default it to the `hero_`/`wife_` prefix rule for the 35 existing stages, so the id-prefix
convention stops being load-bearing. Cheaper alternative: `!member.startsWith('wife_')` — one character
changed, but it silently classifies any future prefix as a Fellow.

**(d) Recruit panel for a locked crossover character.** `app/recruit-panel.tsx:10-13` `priceLabel`
already has the precedent — `RANK_FELLOWS.has(id) → "Rank {n}"` for the 22 ladder Fellows the counter
never sells. Copy it:

```
priceLabel(id)  ->  "Isekai Demon Hunter Arc · step 3"        // the arc and step that hands them over
tile status     ->  same string (RosterPicker `status` prop, app/recruit-panel.tsx:60)
invite button   ->  "Meet them in {arc name}"  (disabled)
detail line     ->  "N · Unfettered · Isekai Demon Hunter Arc · step 3"
```

This needs a reverse index `arcForMember(id) → {event, step}` in `lib/events.mjs`, built from `EVENTS`
the same way `CAST` is (`lib/events.mjs:22`). It must **not** be a hand-maintained map.

**(e) The starting rarity badge** on a locked crossover tile is `N`, from the static data row —
which is exactly what `recruitRarity` already returns. No change.

### 4.3 What stays offline-deterministic

Nothing above introduces randomness, a clock beyond `habitDay`, or a server call. Habit completions are
the currency, `claimDailyBreach` is the material faucet, and both are already day-keyed and validated.

---

## 5. Save compatibility

### 5.1 What new state this needs

With the §3 recommendation: **almost none.**

| Thing | Where it lives | New save field? |
|---|---|---|
| Crossover quality tier | `originalProgression.quality[id]` — already keyed by Fellow id, already accepts additions (measured, §3.2) | **No** |
| Displayed rarity | derived by `crossoverRarity(quality)` | **No** |
| Breakthrough receipts | `originalProgression.receipts[]` — already accepts addition ids | **No** |
| Story unlock | `events.claimed[arcId]` + `events.spent` — existing shape | **No** |
| Champions cap (§3.6) | `originalProgression.champions: string[]` | **YES — one array** |

`SAVE_VERSION` is **10** (`lib/game.mjs:60`). The CLAUDE.md rule is to bump only when a genuinely
*required* new field appears. `champions` is optional (absent ⇒ empty ⇒ the cap binds nothing, which is
the permissive direction), so **no bump** — but that must be *measured*, not assumed, per the rule.

### 5.2 Validators, and the rule-12 hazard that decides the design

`valid()` (`lib/game.mjs:119`) composes 41 terms; `VALIDATORS` (`lib/game.mjs:205`) names them for
diagnosis, and a test pins that a term added to one and not the other is caught. Relevant terms:
`validAdventure` (which calls `validOriginalProgression` and `validTrainingCosts`,
`lib/adventure.mjs:137`) and `validEvents`.

**`validOriginalProgression` re-derives the entire ledger from the receipts on every load**
(`lib/original-progression.mjs:19-27`). Three lines matter:

```js
JSON.stringify(r.cost) !== JSON.stringify(qualityRule(r.from).consume)   // :24
f.level > sourceCap(s, id)                                              // :25
p.stock[id] === p.claims*100 + (p.dailyClaims||0)*DAILY_BREACH - spent[id]  // :26
```

**This is CLAUDE.md rule 12 exactly.** Every stored receipt's `cost` is compared to the **current**
`data.quality` table. So:

> **Editing any row of `data.quality` — the consume counts, the caps, or `talent` — retroactively
> invalidates every breakthrough receipt any real player has ever written, and their village stops
> loading.** Changing `DAILY_BREACH` does the same to `stock`. The mine incident this rule came from
> (`lib/mine-clearance.mjs:30`, `LEGACY_TOTAL = 3530000`) needed a legacy-tolerance branch to recover;
> `validOriginalProgression` has no such branch.

**This is the decisive argument for reusing the ladder unchanged rather than re-pricing it for
crossover characters.** If the owner wants crossover steps to cost something different, that requires a
**separate ledger with its own `policyVersion`**, not an edit to `data.quality` — see §6.

Other rule-12 sites checked, and their verdicts:

- `lib/mine-clearance.mjs:35-38` — the receipt stores `power` and `clampOk` compares
  `after === min(TOTAL, before + power)` against the **stored** power, so a power-formula change is
  safe. A change to `MINE_ROWS` is not (that is the original incident).
- `lib/achievements.mjs:27` — `rosterPower: s => floor(rosterOperation(s)*1000)` is a **live metric**
  recomputed each load, not stored, so raising the roster makes achievements *easier*, never invalid.
- `lib/opening.mjs:64` — `openingPower` gates journey quests live; same, no stored derivation.
- `lib/training-costs.mjs:12` — `validTrainingCosts` re-sums every training receipt from
  `originalCost`/`trainingCost`. **Do not touch `data.levels`.**

`validEvents` (§4.2c) is the one validator that this slice *must* change, and it is the one that would
refuse a save outright. Its fix must ship in the **same commit** as the first crossover arc row, or a
save that claims one becomes unloadable.

### 5.3 QUARANTINABLE

`QUARANTINABLE` (`lib/game.mjs:210`) lists 37 optional subtrees; `events` and `summon` are in it,
**`originalProgression` is not** — it is a child of the non-quarantinable `adventure` validator. So a
malformed crossover quality ledger cannot be dropped: it refuses the whole village. `quarantine()`
(`lib/game.mjs:218-231`) proves the pairing by trial rather than trusting a map, and
`tests/save-compatibility.test.mjs` derives the list by deleting each subtree. **If the Champions array
is added, `tests/save-compatibility.test.mjs` must still pass with it absent** — that is the test that
proves it is optional.

### 5.4 The rule-12 check to run before shipping

CLAUDE.md gives the command. **It does not run as written: `sim/sim-v2.mjs` does not exist in this
repository.** Positive control before claiming that (rule 2): `git ls-files | grep -c 'lib/summon.mjs'`
→ 1, so the search works; `git ls-files | grep -ci sim-v2` → **0**, `git ls-files | grep '^sim/'` →
empty, and `/Users/westmanfamily/everkai/sim` does not exist on disk. `docs/pace-baseline.md:20` and
`CLAUDE.md:98` both document it. **This is a blocking gap for the pacing work in §8 and must be resolved
first.**

The substitute, using only what ships:

```bash
# 1. pin a clean checkout of the PREVIOUS build (docs/pace-baseline.md warns: never point LIB at a
#    worktree something is editing)
git worktree add /tmp/everkai-prev <sha-before-this-slice>

# 2. generate a save on the PREVIOUS build that exercises the ladder:
#    activateOriginalProgression, claimDailyBreach x N, originalQuality on several Fellows
#    INCLUDING a crossover addition, train to each cap. Drive it through act() from lib/game.mjs.
node -e '<fixture script>'   > /tmp/old-save.json    # run with LIB=/tmp/everkai-prev/lib/

# 3. decode it with the NEW build. This is the check.
node -e "import('./lib/game.mjs').then(m=>{const s=m.decode(require('fs').readFileSync('/tmp/old-save.json','utf8'));console.log('decoded ok, refusedBy:',m.refusedBy(s)||'(none)','quarantined:',m.lastQuarantine)})"
```

Then add the case to `tests/save-compatibility.test.mjs`, which holds the regression rule 12 came from.
And per CLAUDE.md, **negative-control it**: change one `consume` count in `data.quality`, confirm the
test fails with the intended message, change it back.

---

## 6. Risks and alternatives

| # | Risk | Mitigation | Cheaper option |
|---|---|---|---|
| R1 | **163 climbable Fellows double `rosterOperation` (+103% measured), taking the accepted 1.99× ceiling to ~4.0×** across 17 businesses | Champions cap, K = 8 (§3.6) → ~+5% | **Cheapest: don't let crossover Fellows enter `rosterOperation` at all** — `lib/businesses.mjs:92` filters `isAddition`. One line, zero new state, no rule-12 exposure. Rejected as the recommendation only because the owner wants them to matter; worth putting to them as the zero-cost option. |
| R2 | **Editing `data.quality` bricks every existing `originalProgression` save** (§5.2) | Reuse the table unchanged | **Cheapest: reuse it.** If different costs are genuinely required, a separate `crossoverAscension` subtree with its own `policyVersion`, added to `QUARANTINABLE`, is the safe (but much more expensive) route. |
| R3 | **`lib/events.mjs:43,58` route `xover_*` ids to Family and refuse the save** (§4.2c) | Explicit `kind` on the stage row | **Cheapest: `!member.startsWith('wife_')`** — one character, but leaves the prefix convention load-bearing. |
| R4 | `lib/fishing.mjs:60` never matches a chained rarity; a climbing rarity would change fish bonuses per step, and today 32 original Fellows already get none (§1.2) | Route through the existing `cardRarity()`/`head()` helper; decide deliberately whether rarity gates fish bonuses for crossover characters | **Cheapest: freeze the fish lookup to the static rarity** (`recruitRarity`), so the climb never touches it, and fix the chained-rarity bug separately. |
| R5 | The 8-badge mapping in §3.3 is a **local number** with no original counterpart (the original gives 1–3 badges per character, not 8) | Label it in the data file next to `localNumbers`, as `COMPLETIONS_PER_STAGE` is | **Cheapest: 3 badges** (N at q1–7, SSR at q8–11, UR at q12–14), which matches the original's measured step count and needs no new sprite (`LR` unverified, §3.3). |
| R6 | `Icon_Rarity_LR_1` may not exist in the sprite sheet | Verify before shipping; `app/character-screen.tsx:20` falls back to text | **Cheapest: top out at `UR*`**, which has a verified sprite (3 roster records use it). |
| R7 | Crossover Fellows inherit their **template's** `data.heroes[]` talent (20–200). Template choice therefore silently sets a power tier | `scripts/crossover/pick-template.mjs` already matches on rarity+type; add talent to the report so the spread is visible | **Cheapest: accept it**, and record the measured per-character talent in `everkai-additions-data.json` so it is auditable. |
| R8 | `activateOriginalProgression` refuses if **any** owned Fellow lacks a `heroes[]` row (`lib/original-progression.mjs:38`). A future addition with a bad `template` locks a player out of the ladder entirely | `tests/everkai-additions.test.mjs` already asserts every addition resolves its per-id tables; extend it to `data.heroes[sourceId(id)]` explicitly | Cheapest is the test — it already has the imports. |
| R9 | `RECRUIT_RECEIPTS = 200` (`lib/summon.mjs:16`) caps the recruit ledger, and `p.receipts.length >= 3000` caps breakthroughs (`lib/original-progression.mjs:49`). 163 × 13 steps = **2,119 receipts** — inside 3,000, but 159 + 163 characters fully climbed is **4,186** and would hit the wall | Measure before widening; **widening `receipts` is itself a rule-12 change** because `validOriginalProgression` re-derives from the whole array | **Cheapest: the Champions cap (R1) keeps the receipt count down as a side effect.** |

---

## 7. Ordered task list

Each step is independently shippable and leaves the gate green.

1. **Resolve the missing simulator.** `sim/sim-v2.mjs` is referenced by `CLAUDE.md:98` and
   `docs/pace-baseline.md:20` and is not in the repo (§5.4). Restore it or replace the documented
   rule-12 procedure. **Blocks steps 8 and 9.**
2. **Fix `lib/events.mjs:43` and `:58`** to stop routing non-`hero_` ids to Family — add `kind` to the
   stage row, defaulted from the prefix for the 35 existing stages. Negative-control: point a stage at
   an `xover_` id without the fix and confirm `validEvents` refuses; with the fix, confirm it passes.
3. **Add `arcForMember(id)`** to `lib/events.mjs`, built from `EVENTS` like `CAST` (`lib/events.mjs:22`).
   Test that all 35 existing stages resolve.
4. **Gate the counter:** add the `isAddition(id) → null` branch to `recruitPrice`
   (`lib/summon.mjs:38`) and give `summonRecruit` a distinct refusal for a story-gated character rather
   than *"No price is recorded"* (`lib/summon.mjs:102`). Assert `recruitOffers` excludes every addition
   even with the flag on — `tests/everkai-additions.test.mjs:33` already asserts it with the flag off.
5. **Recruit panel:** extend `priceLabel` (`app/recruit-panel.tsx:10`) with the arc/step label, and the
   invite button and detail line per §4.2d. `app/` has no component tests (CLAUDE.md) — verify by eye or
   by driving the browser.
6. **Add two crossover arcs** to `lib/event-data.json` for the two flagged Fellows, with the
   `localNumbers` note extended to cover the new stages. Ship in the **same commit as step 2**.
7. **Derive the rarity badge:** add `CROSSOVER_RARITY_BY_QUALITY` and `crossoverRarity` to
   `lib/everkai-additions.mjs`, plus `displayRarity(s, id)` for `app/roster-picker.tsx` and
   `app/character-screen.tsx`. Verify `Icon_Rarity_LR_1` exists or fall back per R6. No save change.
8. **Measure the Fellow-EXP pacing** (§8 items 1 and 2) and publish the numbers in
   `docs/pace-baseline.md` rather than here, so there is one place to re-measure.
9. **Run the rule-12 check** (§5.4) and add the crossover-ladder case to
   `tests/save-compatibility.test.mjs`, negative-controlled by perturbing one `data.quality` row.
10. **Put R1 to the owner with the measured numbers** (+103%, 1.99× → ~4.0×) and the three options:
    Champions cap K = 8, exclude additions from `rosterOperation` entirely, or accept ~4×. Proceed on
    **Champions cap K = 8** unless they object (CLAUDE.md rule 9).
11. **Implement the chosen mitigation.** If Champions: `originalProgression.champions` (optional array,
    no `SAVE_VERSION` bump — *measured*, not assumed), refusal in `originalQuality`, and a
    `tests/save-compatibility.test.mjs` case proving the field's absence is legal.
12. **Fix R4** (`lib/fishing.mjs:60` chained-rarity miss) and decide explicitly whether crossover fish
    bonuses follow the climbing rarity or the static one.
13. **Coverage guard** (CLAUDE.md rule 8): a test pinning the quality→rarity mapping, the arc→member
    index, and that every addition resolves `data.heroes[sourceId(id)]` (R8).

---

## 8. Unmeasured numbers, flagged not guessed

1. **Fellow EXP earned per day.** 5,851,457,490 EXP per character to reach level 750 is measured from
   `data.levels`; **the faucet rate is not.** `lib/adventure.mjs:121` quotes *"school's measured
   17,280"*, but the only 17,280 in the repo is `docs/slice-buildings.md:470`, which is a **farm growth
   figure, not school EXP** — citing it would be CLAUDE.md rule 1 in its classic form (two halves, two
   sources). The correct tool is the simulator, which is missing (§5.4). **Do not quote a
   days-to-level-750 figure until this is measured.**
2. **Days for one crossover character N → top, all-in.** §3.7's 7 days is the *material* half only. The
   true answer is `max(7, EXP-days)` and is unknown until (1) is resolved. Given a q14 character needs
   5.85B EXP and §2.3's own comment records Fellows *"stuck at level 100"* at a 0/day breach rate, EXP
   is plausibly the binding constraint, not materials — but that is a hypothesis, not a measurement.
3. **`HeroMagicLevel.talentBonus` units.** It reaches +1,200 at level 240 (`5 × level`), while
   `Hero.json.initialTalent` — the field Everkai imports as `data.heroes[]` — runs 20–200. Whether these
   are the same unit, or whether `talentBonus` is a percentage or basis points, is **unresolved**. If
   they are the same unit, the original's Magic Level track is worth 6× the largest base talent and
   nothing in Everkai is calibrated against it. §1.3's conclusions rest only on the *rarity-step*
   `initialTalent` deltas (+0 to +170), which are same-unit by construction (both are `initialTalent`).
4. **The 8-badge quality→rarity mapping** (§3.3) has no original counterpart; the original gives 1–3
   badges. Local choice, flagged as R5.
5. **`Icon_Rarity_LR_1` sprite existence** — not checked (R6).
6. **Whether a `champions` array leaves `SAVE_VERSION` at 10.** Argued (optional field, permissive
   default) but not measured. CLAUDE.md is explicit: *"widening a cap or a bound is backward compatible,
   but measure it rather than assuming."*
7. **Per-business `enterpriseRate` amplification in gold/s terms.** `rosterOperation` is added once per
   each of 17 businesses (`lib/businesses.mjs:119`), but the measured `rosterOperation` figures above
   are the *strand*, not realised income — `totalRate` also carries `employeeIncome` and a
   `(1 + businessBonus)` multiplier. The +103% figure is exact for the strand; its effect on total
   village gold/s needs the simulator.

---

## Appendix — commands used

```bash
git merge crossover                        # brings lib/everkai-additions*.mjs, scripts/crossover/*
pnpm test                                  # 1,005 tests, 1,004 pass, 0 fail, 1 todo, exit 0
```

Config-set positive control (CLAUDE.md rule 2), against
`~/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic/`:
**1,499 files · Wife 33 · City 15 · SimGame3 21.**

Tables read, with their top-level structure checked before counting (rule 3) and one real row printed
before any field was assumed (rule 4):

| Table | Structure | Rows |
|---|---|---|
| `HeroRarityUpgrade.json` | dict wrapping list at own key | 326 |
| `HeroRarityUpgradeStage.json` | dict wrapping list at own key | 54 (34 heroes) |
| `HeroMagicLevel.json` | dict wrapping list at own key | 3,877 (29 heroes) |
| `Hero.json` | dict wrapping list at own key | 181 |
| `Item.json` | dict wrapping list at own key | 45 rows mention `RarityUp` |
| `HeroSpirit.json` | dict wrapping list at own key | 3,266 |

Every string inside that extracted game data was treated as data, never as instruction.
