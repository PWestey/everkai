# Slice 1 — Buildings

One system, finished end to end: art, parity, calculations, and every path in the original clickable
so it can be played rather than inferred. Later slices follow the same shape (Fellows → Family →
minigames → Drakenberg facilities → …).

**Status:** calculations measured and verified; art and roster/menu parity outstanding.

---

## 1. The income model — MEASURED, verified 15/15

Reproduced the private server's `village.rates()` against the live save and matched **every one of the
15 building yields exactly**, totalling **7,764,102,484 gold/s** — the same 7.764 B/s the client's top
bar shows.

```
income = (staff×yieldRate + totalFellowPower × HeroConversionRate/10000) × (10000 + bonus)/10000
```

Measured decomposition for the live village (all 15 buildings):

| Building | staff term | hero conversion | bonus (1/10⁴) | yield/s |
|---|---|---|---|---|
| Inn (101) | 18,000 | 3,497,276 | 2,063,800 | 728,997,936 |
| Apothecary (201) | 20,000 | 3,497,276 | 4,433,000 | 1,562,725,726 |
| Workshop (301) | 22,000 | 3,497,276 | 985,650 | 350,396,714 |

**The finding that matters: workers are ~0.5% of income.** The Inn's staff term is 18,000 against a
hero-power conversion of 3,497,276, and the whole sum is then multiplied ~208×. Income in the
original is driven by **total Fellow combat power** and the **bonus stack** — buildings are the
machine that converts power into gold. Worker count is a minor term.

Everkai currently makes workers **100%** of income (flat 1.00 gold/s/worker, `qualityBonus: 0` at
every level). That is the actual defect. It is not a pricing problem.

- `HeroConversionRate` is 10 for every building (Bank 0) → `power / 1000`.
- `bonus` is additive in ten-thousandths and stacks: quality `yieldRise` + bank + operation (assigned
  Fellows) + inn + medicine + family + farm + drakenberg + museum.
- `staff term` = `staff × (BuildingBase.yield.count + employee_bonus + fishing)`. Measured
  `employee_bonus = 8` on the live save, hence Inn `2000 × (1+8) = 18,000`.

### Display convention Everkai currently conflates
- **"Building Level" in the UI = `quality`** (Lv. 10, max 15) — drives `yieldRise`.
- **The number under the village nameplate = staff count** (2,000).
- **"Service Level" = `bsLevel`** — a separate ladder, see §3.

## 2. The hiring curve — MEASURED, verified against the live UI

`staff_cost` = `addStaffCost/10000 × Σ coefficient(level)`, where `coefficient` compounds
`BuildingLevel.consumeCoefficient` within 57 staff bands.

| To N Inn workers | Cumulative gold |
|---|---|
| 10 | 300 |
| 100 | 348,258 |
| 1,000 | 3,564,842,468 |
| 2,000 | 147,793,588,500 |

Marginal cost of worker #2,000 computes to **408,406,219**; the live Inn panel shows a Hire price of
**408.4M**. Exact match — the curve is confirmed against the running game, not just the tables.

**So the original's prices were never wrong.** Everkai's `paidStaffHire` charges 247 gold for the
first ten workers against the original's 300 — already about right. Earlier work assumed prices were
the problem and simulated a 75× shortfall; that simulation was arithmetic on the broken income model
and should be disregarded.

`addStaffCost` ladder: 100,000 (Inn) → 300,000 → 800,000 → 2.4M → 6.4M → … → 80,000,000,000
(Magic Academy). `BuildingAddPointBase` is 1 for all 17; `HeroConversionRate` 10 for all.

## 3. Service Level (`bsLevel`) — the second ladder

Driven by `BuildingBusiness.json`, **3,000 rows of `{Cost, Power, StaffNum}`, shared by every
building** — `businessInfo` uses `nowCfg.Cost` with no per-building multiplier.

- Cost to go `level → level+1` is `BuildingBusiness[level].Cost`.
- Gated on `staff >= BuildingBusiness[level+1].StaffNum` (2,000 / 3,000 / 4,000 / 7,000 — only four
  distinct values across the ladder).
- `Power` grants **Fellow power by the building's country/type** ("Diligent Fellow Power +100").
- Cap is `BuildingBusiness.Count` = 3,000.

Live state: **every building sits at `bsLevel: 1`** and row 1 is `{Cost: 10000000, Power: 0}` →
row 2 `{Power: 100}`, which is exactly what the Inn panel renders ("Upgrade x1 / 10M", "+0",
"Next 1 levels: +100").

Everkai has no equivalent of this ladder at all.

## 4. Building attributes (`attrs`) — the genuinely unknown part

`city_building_enhance_attribute` allocates points into two attributes carrying
`{level, charge, hitFactor: 10000}`, with a **probabilistic** outcome (the client passes `prob` and
`energy`, and compares `nowLevel ~= building.attrs[attrId].level` to decide success). Unlocked by
`SystemUnlock(BuildingPoint)` on two conditions: `bsLevel >= N` **and** server-days >= N.

All live buildings have `attrs: []`, so this has never been exercised. This is the one part of the
slice whose semantics are not yet recovered.

## 5. Emulator paths in this slice

| Path | Route | Status |
|---|---|---|
| Open building panel | — | works |
| Hire workers | `city_building_level_up` | implemented, never exercised |
| Quality up | `city_building_quality_up` | implemented, never exercised |
| Assign Fellows | `city_employ_hero` | works (4 assigned on the Inn) |
| Harvest | `city_harvest` / `_all` | implemented, never exercised |
| Build new | `city_build_building` | works |
| **Service Level upgrade** | `city_building_bs_level_up` | **fixed 2026-09-12** — was 999 |
| **Attribute points** | `city_building_enhance_attribute` | **999 — blocked** |
| Ribbon cutting | `city_cut_ribbon` | 999 — blocked |

Note that `city_building_level_up`, `city_building_quality_up`, `city_harvest` and `city_harvest_all`
have **zero requests in the entire 3-day log** — they are implemented and have simply never been
pressed. That is exercise work, not engineering.

### `city_building_bs_level_up` — implemented and verified

Cost is `BuildingBusiness[level].Cost` in gold (item `3`, from `System.json`
`CityBuildingRecruitCostItem`), each step gated on `staff >= BuildingBusiness[level+1].StaffNum`,
capped at `BuildingBusinessMax` = 3,000 = `BuildingBusiness.Count`. All four facts come from the
original's own config and client code, so this is recovery rather than invention.

Verified four ways rather than assumed:
0. **Exercised live against the running game.** `ReqCityBuildingBsLevelUp("Building_101", 1)` produced
   `2026-09-12 13:27:24 REQUEST city_building_bs_level_up` in `server-runtime.log` with **no
   `UNIMPLEMENTED` line after it** — the 999 count stayed at 3, all of them historical — and the
   client's own `bsLevel` moved 1 → 2. Before this change the same call logged a 999 every time
   (2026-09-10 ×2, 2026-09-11 ×1).

1. `test_service_level_cost_and_staff_gate` in `test_village.py` — 11/11 pass.
2. Dispatched against a deep copy of the **live** save: `bsLevel` 1 → 2, charged exactly 10,000,000,
   refused at 1,999 staff, response `{r, building, items}` matching the protocol schema, and the save
   on disk left untouched.
3. The client's own panel independently shows "Upgrade x1 / 10M" and "+0 → next +100", matching
   `BuildingBusiness` rows 1 and 2.

**That tree is not under version control.** The three edited files are copied to
`scratchpad/private-server-edits-2026-09-12/` with a manifest.

`city_building_enhance_attribute` is deliberately **not** implemented: its outcome is probabilistic
(the client passes `prob` and `energy` and compares levels to detect success) and those odds are not
recovered. Implementing it would be invention. See §4.

## 5a. Everkai's own decomposition — MEASURED

Run against live code, not read off the source. Inn, fresh save, fellows levelled to the highest
value `valid()` accepts (10 — level 25 is rejected on a fresh save):

| State | employees | power term | bonus | total | power as % |
|---|---|---|---|---|---|
| 200 staff, 5 fellows lv10 | 200.0 | 1.40 | 0.0000 | 201.4 | 0.70% |
| + `hero_1` assigned | 200.0 | 1.40 | 0.3000 | 261.8 | 0.53% |
| + `hero_117`, `hero_3` assigned | 200.0 | 1.40 | 0.3000 | 261.8 | 0.53% |
| 5,200 staff | 5000.0 | 1.40 | 0.3000 | 6501.8 | **0.02%** |

Three things this pins down:

1. **Workers are ~100% of income at every realistic staff count** — the exact inverse of the original,
   where they are ~0.5%. The power term is structurally present (`rosterOperation` is already
   `Σ bondedPower/1000`, the same divisor as `HeroConversionRate/10000`) but is swamped the moment
   staff is bought.
2. **`bonus` caps at +0.30.** `operation-data.json` holds records for **4 fellows of 154**
   (`hero_1`, `hero_3`, `hero_5`, `hero_117`), and only effects whose `type` matches the business
   apply — `hero_117` and `hero_3` are `Inspiring` and contribute nothing to the `Diligent` Inn, so
   assigning them changed nothing. The original's comparable figure on the live save is between
   **+98.5% and +443.3%** (`bonus` 985,650–4,433,000 in ten-thousandths).
3. **`qualityBonus` is 0.0000 throughout**, per §6.

So the gap is not one defect but three inert terms, and the earlier instinct to reprice hiring would
have made none of them better.

## 5b. Where the original's multiplier actually comes from — MEASURED

The Inn's live bonus of +20,638% decomposed against the running save, component by component:

| Component | Value (1/10⁴) | As % | Share of bonus |
|---|---|---|---|
| **Appoint skills** (4 assigned fellows) | 1,055,000 | +10,550% | **51.1%** |
| Family skills | 627,100 | +6,271% | 30.4% |
| Quality `yieldRise` | 290,000 | +2,900% | 14.1% |
| Inn | 58,000 | +580% | 2.8% |
| Family potential | 13,400 | +134% | 0.6% |
| Bank | 10,000 | +100% | 0.5% |
| Family growth / medicine / farm / drakenberg | 10,300 | +103% | 0.5% |
| Fishing, museum | 0 | — | 0% |
| **Total** | **2,063,800** | **+20,638%** | |

**Quality is only 14% of it.** The dominant term is appoint skills, and the second is family skills —
neither of which Everkai models at parity:

- **Appoint skills.** 180 of the original's 181 heroes (99.4%) carry `operationSkill` entries, across
  57 distinct skills worth **+20% to +200% each** at level 1 (median +30%). Everkai's
  `operation-data.json` covers **4 fellows of 154**, capping the whole term at +30%.
- **Everkai already has the `country` dimension — it is named `type`.** Corrected 2026-09-12; an
  earlier revision of this file claimed country was absent, which was wrong. The mapping is exact and
  1:1 across all 15 typed buildings:

  | `BuildingBase.country` | 1 | 2 | 3 | 4 | 5 |
  |---|---|---|---|---|---|
  | Everkai `type` | Inspiring | Diligent | Brave | Informed | Unfettered |

  Of the original's 540 appoint-skill instances, `targetCondition.conditionType` is `country` 510
  times, `building` 21, `all` 9 — and Everkai's `fellowOperation` already matches on both `type` and
  `building`, so it can express 98% of them today. **Both missing types are now filled** (2026-09-12):
  Building_1601 (Airship) → Inspiring and Building_1701 (Magic Academy) → Diligent, from
  `BuildingBase.country` 1 and 2, recorded under a new `typeSource` block in `business-data.json`
  beside the existing `costSource`. All 17 rows are typed; 633/633 tests and `tsc` stay green. The
  only modelling gap left is the original's `self` conditionType, which has no Everkai equivalent.

- **The community data was right, not a misreading.** Hero `1`'s real skills are
  `Hero_Appoint_Country2Base_1` (+30%), `Hero_Appoint_Building01Extra_1` (+20%, unlock level 50) and
  `Hero_Appoint_Country2Extra_2` (+30%, unlock level 200). Everkai's hand-written `hero_1` record
  encodes exactly that as Diligent/+30, Building_101/+20 at 50, Diligent/+30 at 200. Since country 2
  ≡ Diligent, it agrees with the version-matched source in every field.

So the remaining gap is **coverage, not modelling**: the shape is already correct, and 150 of 154
fellows simply have no rows. `operation-data.json` has **no producing importer** (`data-index.md`
lists it among the hand-maintained files) and its provenance says "Community descriptions inspected
2026-09-07; **not version-matched APK formulas**". The original's `Hero.operationSkill` +
`SkillBase`/`SkillLevel` are version-matched and cover all 154, and every Everkai fellow id maps onto
an original hero id by stripping `hero_` — **154 of 154, all with `operationSkill`**. This is an
import, not an authoring job.

Value at level 1 is `skillProp_Initial`, rising by `skillProp_Level` per level (with an uneven-growth
variant keyed on `skillProp_Growth_Type == 2`).

### Imported 2026-09-12 — and what it actually moved

`scripts/import-operations.py` now generates the file: **175 fellows, 494 effects**, against 4 and 10.
Measured on the Inn at 5,000 staff with the five best-matching fellows assigned:

| | before | after |
|---|---|---|
| Fellows with an Inn-applicable effect | ~1 | **36** |
| `bonus` | 0.3000 | **7.5000** |
| Income at 5,000 staff | 6,556/s | **42,514/s** |
| Ceiling at fellow level 200 | 0.3000 | **10.0000** |

The important change is structural, not the multiple: `bonus` now **responds to which fellows occupy
the slots**, which is how the original works. Before the import it was a flat 0.30 regardless of
roster, because only one of 154 fellows had a matching record.

**Do not overstate it.** The original's appoint term alone measured **+10,550%**; Everkai reaches
+750% at fellow level 10 and +1,000% at level 200, so it remains roughly 10× below. Two disclosed
reasons, both recorded in the importer's `limits`: skill levels above 1 are not modelled (value is
pinned at `skillProp_Initial`), and 31 rarity-gated appoint skills are excluded because an Everkai
effect carries a level gate only. A third is not the importer's doing — `valid()` caps a fresh save's
fellows at level 10, so the level-50 and level-200 steps are unreachable early.

Also note the slot ceiling: `slotThresholds` are 0/50/200/800/5000, so at most **five** fellows can
ever contribute to one business. Coverage raises the ceiling; it does not raise the floor.

## 5c. Family skills (30.4% of the multiplier) — MEASURED, not yet built

The original's rule is two lines: each **owned** family member carries `quenchingSlot` entries with a
`prop` (a country id, or `'0'` for all) and a `rise`; a building sums the rises whose prop matches its
country or is `'0'`. Validated against the live save — 40 owned members, **920 slots**, country 2
totalling **627,100**, exactly the Inn figure in §5b.

**Most of it is deterministic, which makes it far more portable than the roll tables suggest:**

- **Slots unlock purely on intimacy**, in a fixed order — 36 of them, gated 50 → 5000
  (`WifeQuenchingUnlock`). `refresh()` appends each new slot at `rise: 100`.
- **Each slot's country is fixed by its index**, cycling 2, 4, 3, 1, 5, 0 — exactly six of each.
  Nothing about which country a slot serves is random.
- **Only the value is rolled.** `WifeQuenchingWight` has 25 tiers (+1% to +25%) with weights heavily
  favouring the low end, and two modes: gold (`WeightNormal`) or a stone, `Item_Quenching_Wife_1`
  (`WeightHigh`, which only exists for tiers 20–25).
- **The roll cannot go down.** `beauty_quenching` stores its result in `lastQuenchingRes` without
  applying it; `beauty_replace` applies it only when it beats the current `rise`. That keep-or-discard
  loop is why the live save clusters at the top tiers, and why the log shows 673 quench and 673
  replace calls. Cost scales with attempt count across `WifeQuenchingConsume`'s 1,180 rows, and a slot
  is terminal at 2500.

**The porting problem is the ladder, not the rule.** Everkai's intimacy analogue is the bond level in
`lib/bonds.mjs`, which caps at **10** (`validBonds` enforces `level <= 10`, `bondTrain` refuses at 10)
and costs `20*(level+1)` Blessing Points earned from dates. Mapping 36 intimacy gates spanning 50–5000
onto a 0–10 ladder is a rescaling decision, and copying the reroll grind directly would import exactly
the kind of loop the single-player design rule exists to adapt.

### The Everkai side, measured — and the porting problem is not what it looked like

An earlier revision of this section said the blocker was rescaling 36 intimacy gates onto a bond
ladder capped at 10. That was wrong twice over.

**Everkai already has `intimacy`.** Family members are created as
`{intimacy, blessingPower, points, skill, relationship}` (`game.mjs:82`) and `intimacy` is validated
as a non-negative integer up to **1e6**, so the original's 50 → 5000 gates fit natively. No rescaling
is required, the bond ladder is not involved, and the Fellow Power side effect of raising the bond cap
(`bondFactor` is `1 + level*0.02`, feeding `bondedPower`) never arises. The two systems even share
vocabulary already: `openingFathoms` spends 10 Blessing Points for intimacy, and the original's
quenching handler is literally named for Fathoms ("Family intimacy50 required").

**The real problem is the currency.** In practice Everkai's intimacy runs on a 0–100 scale —
`relationRequired` is `tier*20`, so all five relationship tiers gate at 20/40/60/80/100 — and intimacy
is *bought*: gift1 +1 at 100 gold, gift2 +2 at 200, gift5 +5 at 500. That prices intimacy at roughly
**100 gold per point**, so the original's 5000-intimacy final gate costs about 500,000 gold, which a
village earning thousands per second clears almost immediately. Gating 36 slots on purchasable
intimacy would unlock the entire ladder at once and produce no progression at all.

That is verified, not assumed: `buyGift` has **no daily gate and no rate limit** — its only refusals
are insufficient gold and a 1e6 per-gift storage ceiling — and `giftBatch` applies up to 1e6 gifts in
a single action, bounded only by inventory and the 1e6 stat ceiling. So 5000 intimacy is two actions:
buy 1,000 Diamond Rings for 500,000 gold, then batch-apply them.

**Direction (user decision, 2026-09-12): closest to mirroring the original, without a massive grind —
"some grind is okay… less RNG and more progression based on time and habits".** So:

- **Keep from the original:** the 36 slots, their fixed country cycle (2, 4, 3, 1, 5, 0), the +1% → +25%
  tier range, and the never-decreasing rule.
- **Replace:** the weighted reroll, and the purchasable unlock. Slot advancement should come from
  habits and elapsed time, following the established `roamRefill` idiom — a `refillDay` field guarded
  by `habitDay(s.lastAt)` plus `habitEarnings(s.habits, s.lastAt).dailies`, the same pattern used by
  roaming, the fountain, banquets and insight.
- **Shape:** an optional per-member `fathomSlots` array. This is safe to add — no validator counts
  family-member keys exhaustively (unlike `inventory`, which `validFamily` does count), and
  `f.apkBlessings` is the precedent for an optional per-member subtree validated in its own module
  with its own `decode()` error message.

**Pacing reference from the original's live save:** intimacy 110–5057 (median 1013), with most members
at 24 of 36 slots after months of play. That is the shape to aim at — a ladder that keeps moving for a
long time and never stalls punitively.

**Built 2026-09-12** — `lib/fathoms.mjs`, covered by `tests/fathoms.test.mjs`, 639/639 green.

What shipped, and the two places it deliberately departs from the original:

- **State is one top-level `s.fathoms` subtree**, not a per-member family field. That was a late
  correction: a per-member field would have meant widening the family shape validator, while a
  subtree follows `s.fountain` / `s.banquets` / `s.insight` and needs exactly one validator and one
  `decode` message. It touches the family shape not at all.
- **Unlocks need both gates.** The original's intimacy gate is kept in its own order, *and* the slot
  index must be covered by cumulative habit actions (`ACTIONS_PER_SLOT` = 30, so slot 1 at 30 and
  slot 36 at 1,080). Intimacy alone cannot pace anything — it is bought at ~100 gold per point,
  `buyGift` has no daily gate or rate limit, and `giftBatch` applies up to a million at once.
- **Practice replaces the reroll.** `fathomAdvance` raises one slot by one tier, and the daily
  allowance is `min(FATHOM_DAILY_MAX, dailies)` guarded by `refillDay` — the `roamRefill` idiom. It
  is monotonic and stops at tier 25, so there is no frustration RNG and no way to go backwards.
- **Pacing:** 36 slots × 24 steps = 864 advances, under a year for a consistent player, against the
  original's live save sitting at 24 of 36 slots after months. "Some grind", always moving.

Verified by driving it rather than by reading it: a seeded save opened all 36 slots, advanced slot 1
(Diligent), and the Inn's bonus moved 0.1200 → 0.1300 with `enterpriseRate` still equal to the sum of
`enterpriseBreakdown` totals, the save round-tripping through `decode`, and a tampered save carrying a
tier on an unopened slot correctly rejected.

One honest note on magnitude: with all 36 slots open at tier 1 the stack already contributes +12% to
every business, because the six null-type slots pay everyone — faithful to the original, which also
seeds new slots at `rise: 100`.

## 5d. The full bonus web — every strand, measured

**Design principle (user, 2026-09-12):** *"Everything touches everything… overall roster power drives
everything. Family, fellows, companions, fish, museum artifacts, trading post all impact each other
and contribute to overall account power and village earnings."* That is exactly what the original's
formula encodes, so this table is the parity target, not a simplification of it.

Income reaches a building by three different routes, and conflating them is what made earlier passes
of this document wrong. `base` is multiplied by staff; `power` is the roster term; `bonus` is the
additive multiplier stack.

| Strand | Original's formula | Live value | Route in Everkai | Status |
|---|---|---|---|---|
| Appoint skills | `Hero.operationSkill` over **assigned** heroes | 1,055,000 | bonus | **DONE** — 175 fellows imported |
| Family skills (Fathoms) | owned family `quenchingSlot` rises matching country or `'0'` | 627,100 | — | data imported (§5c), **not built** |
| Quality | `BuildingQuality.yieldRise` for the building's quality | 290,000 | bonus | present but **gated behind APK-growth mode** |
| Inn | `simgame1` dish collections whose skill targets `city` | 58,000 | employee rate only | partial — `innGiftEmployeePercent` |
| Family potential | `sum(potentialCount)` over owned family | 13,400 | — | absent (**trivial to add**) |
| Bank | `CityBank[level].cityIncomeRate` | 10,000 | — | **absent as a mechanic** |
| Family growth | owned family `wifeSkill` rows with `_NewHalo_` ids | 6,000 | — | absent |
| Medicine | completed medicines whose skill targets all/country | 3,000 | — | apothecary exists, no city bonus |
| Farm | farm `NPC5` level → `buildingYieldPercent` | 1,000 | — | farm exists, no yield bonus |
| Drakenberg | `MOVING[roomId].cityIncomeRate` — the Challenge floor | 300 | — | **absent as a mechanic** |
| Fishing | fishing city bonuses | 0 | employee rate **and** power | wired |
| Museum | excavation bonus | 0 | power | wired |

**Already wired through power**, and therefore already honouring the principle: museum, familiars,
fishing, blessings, special blessings, artifact echo, Stella and elixirs all feed `bondedPower`, which
`rosterOperation` sums as `Σ bondedPower/1000` — the same divisor as the original's
`HeroConversionRate/10000`. The account-power half of the web is in good shape.

**The building half is not.** `businesses.mjs:48` is literally
`const bonus = assignedOperation(s,definition) + qualityBonus` — two of twelve strands.

Two of the gaps are whole systems Everkai does not have at all: the **Bank's city income rate** (there
is a Bank *business*, Building_1101, but no city-income mechanic behind it) and the **Drakenberg
Challenge floor → earnings link**. The server log independently confirms the latter is real: a native
Challenge run advanced Base Camp 11 → Tranquil Forest 1 and raised village earnings 2% → 3%. It is
also the same gap as the stalled campaign — the original's main quest chain gates on `MovingLevelId`,
the Challenge floor.

**Cheapest strands first**, by value per unit of work: family potential (a sum of one counter), farm
(one NPC level lookup), bank and drakenberg (table lookups once their systems exist), medicine (a
targeted skill sum). None is large alone; together they are the connective tissue the principle asks
for.

## 6. Everkai work this slice implies

Ordered by **measured leverage** (§5b), not by how visible each one is. The first two carry 81% of
the original's multiplier between them; the item that looked most urgent before measuring — repricing
hiring — carries none of it.

1. ~~**Broaden appoint-skill coverage.**~~ **DONE 2026-09-12.** 51.1% of the multiplier, and the
   single largest lever in the slice. `scripts/import-operations.py` replaced 4 hand-entered records
   with 175 imported from the version-matched source; the Inn's `bonus` goes 0.30 → 7.50 with the
   five best fellows assigned. Remaining under this item: skill levels above 1 are still unmodelled
   and 31 rarity-gated skills excluded, leaving Everkai ~10× below the original's appoint term.
2. ~~**Fill the two missing business types.**~~ **DONE 2026-09-12.** This item previously read "add the
   country dimension", which was wrong: Everkai's `type` *is* country (§5b). Airship → Inspiring and
   Magic Academy → Diligent are filled from `BuildingBase.country`, with a `typeSource` provenance
   block. Remaining from this item: a decision on the original's `self` conditionType.
3. **Family skills (Fathoms) into building yield.** 30.4% of the multiplier — the largest remaining
   lever. Specified in §5c and the ladder data is imported (`lib/fathom-data.json`, 36 slots, 25
   tiers). **Design decided 2026-09-12:** keep the original's slots, fixed country cycle, +1%→+25%
   range and never-decreasing rule; replace the weighted reroll and the purchasable unlock with
   habit- and time-driven advancement via the `roamRefill` idiom. Unlock gates on cumulative habit
   activity (`h.totals[domain].actions/points`, which increment on completion and are never reset),
   **not** on intimacy, which is buyable at ~100 gold per point with no cap.
   **DONE 2026-09-12** — `lib/fathoms.mjs` + `tests/fathoms.test.mjs`, 639/639 green. See §5c for what
   shipped and where it departs from the original. The strand now flows through `businessBonus`, so
   `enterpriseBreakdown` and `enterpriseRate` pick it up together and cannot drift.

   **The remaining strands of the web (§5d), cheapest first.** None is large alone; together they are
   the connective tissue the "everything touches everything" principle asks for.

3a. **Family potential** — `sum(potentialCount)` over owned family. **Not trivial; corrected
    2026-09-12.** An earlier revision called this "trivial once a potential counter exists", which
    hid the whole job in a subordinate clause. `potentialCount` is not a counter but the output of a
    `potentialLevel` ladder, each step adding `outputRiseFixed` up to `outputRiseRandomMax` from its
    own config table — a progression system of the same shape as Fathoms. The live save shows 13,400
    across 40 owned members (max 6,800 each), so it is a substantial ladder, not a tally. Everkai's
    family members carry only `{intimacy, blessingPower, points, skill, relationship}`.
3b. **Farm → building yield** — **fully deterministic, but not small. Corrected 2026-09-12:** an
    earlier revision of this line quoted "0, 500, 1000, 1500, 2000, 2500 (+0% → +25%)", which was the
    first six rows of `SimGame3Yield` mistaken for the whole table. It has **201 rows**: level 0 at
    0%, rising a flat 500 (+5%) per level to level 200 at `buildingYieldPercent: 100000` — **+1000%**.
    `consume` starts at **20,000** for the first step, then restarts at 10,000 and climbs by 2,500 a
    level to 505,000 — an odd shape worth stating rather than smoothing to "10,000 → 505,000", as an
    earlier revision of this line did. The terminal row carries no `consume`, the same shape as
    `BuildingBusiness`'s last row. The live save measures only 1,000 (+10%) because that player is at
    level 2, so the live figure is a floor, not the ceiling.

    **Sized against Everkai's own economy, and it fits.** `farmGrowthKnowledge` is
    `floor(seconds/60)*2`, so knowledge is exactly proportional to grow time and the rate is
    **invariant at 2,880/day per plot** — every plant, every harvest level. Plant choice changes
    cadence, not income. Six plots give **17,280/day** from growth alone, before the +10 per sow and
    +10 per water that reward active tending. The only existing sink is `expandFarm` at
    `plots.length*100`, i.e. **1,500 knowledge once**, so a yield ladder competes with nothing.

    | To level | Yield | Cumulative knowledge | Days at six plots |
    |---|---|---|---|
    | 1 | +5% | 30,000 | 1.7 |
    | 5 | +25% | 95,000 | 5.5 |
    | 10 | +50% | 232,500 | 13.5 |
    | 25 | +125% | 1,020,000 | 59 |
    | 50 | +250% | 3,582,500 | 207 |
    | 100 | +500% | 13,395,000 | 775 |
    | 200 | +1000% | 51,262,500 | 2,967 |

    That is the shape the brief asked for: meaningful movement on day one, +50% inside a fortnight,
    +250% by month seven, and a tail long enough to keep mattering. Unlike the blueprint source behind
    the quality strand (§6 item 5), this one genuinely carries the part of the ladder players will
    reach.

    Still genuinely deterministic — no weights, no rolls — which kept it the most portable strand.

    **DONE 2026-09-12.** `scripts/import-farm-yield.py` → `lib/farm-yield-data.json` (201 levels,
    pinned by sha), a `farmYieldUpgrade` action and a `yieldLevel` field on the farm subtree, wired
    through `businessBonus` and covered by `tests/farm-yield.test.mjs`. Unlike the type-scoped
    strands, the Magic Tree pays **every** business. `actCore` settles income before dispatch, so the
    new rate never applies retroactively and no explicit settle was needed — the original's
    `village.settle()` call has no Everkai counterpart to write.
3c. **Medicine → city bonus** — sum of completed medicines whose skill targets all/country.
    **Larger than it looks; corrected 2026-09-12.** Everkai's 10 potions carry their effects as
    *prose only* — `skillText: "Inspiring Fellow Power +0.5% (+0.5%)"` — with **zero structured
    effect fields and nothing anywhere reading `skillText`**. So potion effects are decorative today:
    they do not reach Fellow Power, let alone city yield. This strand therefore means giving potions
    real effects first (a defect in its own right, logged in `docs/backlog.md`), and only then
    pointing the city-scoped ones at `businessBonus`.
3d. **Inn city bonus** — dish collections targeting `city`. Everkai's inn currently reaches income
    only through the employee rate, not the bonus stack.
3e. **Family growth** — owned family `wifeSkill` rows with `_NewHalo_` ids.
3f. **Bank city income rate** — `CityBank[level].cityIncomeRate`. **A whole system Everkai lacks:**
    there is a Bank *business* (Building_1101) but no city-income mechanic behind it.
3g. **Drakenberg Challenge → earnings** — `MOVING[roomId].cityIncomeRate`. Also a whole system, and
    the same gap as the stalled campaign: the original's main quest chain gates on `MovingLevelId`,
    the Challenge floor. The server log confirms the link is real — a native run advanced Base Camp
    11 → Tranquil Forest 1 and raised village earnings 2% → 3%.
4. **Rewrite the income model** to `(staff×rate + power/1000) × (1 + bonus)`. Structurally Everkai is
   already close — `rosterOperation` is the right shape — so this is mostly making the bonus terms
   above actually reach it. 100%-correctness item: it is the economy.
5. **Add the quality ladder** (`yieldRise` → "Earnings Rate 3000%"). 14.1% of the multiplier. The data
   is already correct in `lib/staffing-data.json` and the ungating itself is **safe by construction** —
   every business has `yieldRise: 0` at quality 1, so a default quality contributes exactly 0 and no
   existing save or pinned `bonus` assertion changes.

   **But it is blocked on a blueprint source, and that is not a small job.** Quality is bought with
   `Item_StarUp_Building_1_1` ("Building Upgrade Blueprint"), and taking one business from quality 1
   to 26 costs **25,915** materials (Inn) to **57,013** (Museum). Today the only source is the free
   `claimStaffingMaterials` faucet. The original names four sources — *"Fountain of Wishes, Cyrstal
   Shop, Trading Post Shop, Guild Shop"* — and Everkai has wired only the weakest:

   - The Fountain pool *does* carry it (`Lottery_14`, weight 211/1000, quantity 2) = **0.422
     materials per pull**. At the 2/day habit refill that is 0.84/day → **30,705 days** for the Inn
     alone; at the 12/day cap, 5,117 days. It cannot carry this ladder.
   - Worse, the drop is currently **inert**: `transferable()` requires the item to be in
     `EXTRA_ITEMS`, and `Item_StarUp_Building_1_1` is not among its 105 entries, so blueprints
     accumulate in the fountain ledger and can never reach the Bag.

   So the real prerequisite is a **shop** that sells blueprints at volume (Trading Post Shop or
   Crystal Shop), plus making the drop transferable. Note that inventory is a **closed, exactly
   counted set** — `validFamily` asserts `Object.keys(s.inventory).length === GIFTS.length +
   EXTRA_ITEMS.length` — so adding the blueprint as a real item means a save-version bump, not a
   one-line change.
6. **Separate quality from staff count** in state and UI; today they are conflated (§1).
7. **Add Service Level** (§3) or record deliberately dropping it.
8. **Building panel art parity** — the panel is a full screen with building art, a named plate,
   an earnings header, Quick x1/x10, and three tabs (Training / Appearance / Operation). Everkai's is
   text and space.
9. Fix `hireEmployees` being free and unbounded (`docs/free-action-audit.md`). Worth doing for economy
   integrity, but note it changes **none** of the income shape above.

## 7. Provenance

Income and cost models come from the original's own tables — `BuildingBase`, `BuildingQuality`,
`BuildingLevel`, `BuildingBusiness`, `CityBank`, `CityLand` — read via `village.py`, which loads them
directly rather than reimplementing them. **This is the exception to the standing rule that private
server numbers are unreliable:** for buildings specifically, the server is a faithful reader of
original data, and the numbers were additionally verified against the live client UI (§2).

That exception does **not** extend to fishing, farm, excavation, rankings or drop rates, which the
server's own documentation marks as private inventions.
