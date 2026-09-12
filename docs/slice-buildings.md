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
  `building`, so it can express 98% of them today. Two gaps remain: **Building_1601 (Airship) and
  Building_1701 (Magic Academy) have `type: None`** where the original gives them countries 1 and 2,
  i.e. Inspiring and Diligent; and the original's `self` conditionType has no Everkai equivalent.

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

## 6. Everkai work this slice implies

Ordered by **measured leverage** (§5b), not by how visible each one is. The first two carry 81% of
the original's multiplier between them; the item that looked most urgent before measuring — repricing
hiring — carries none of it.

1. **Broaden appoint-skill coverage.** 51.1% of the multiplier. Everkai models 4 fellows of 154
   against the original's 180 of 181. This is the single largest lever in the slice.
2. **Fill the two missing business types.** Superseded 2026-09-12 — this item previously read "add the
   country dimension", which was wrong: Everkai's `type` *is* country (§5b). All that is actually
   missing is `type` on Building_1601 (Airship → Inspiring) and Building_1701 (Magic Academy →
   Diligent), plus a decision on the original's `self` conditionType. Small.
3. **Family skills into building yield.** 30.4% of the multiplier, and currently absent from
   Everkai's business income entirely.
4. **Rewrite the income model** to `(staff×rate + power/1000) × (1 + bonus)`. Structurally Everkai is
   already close — `rosterOperation` is the right shape — so this is mostly making the bonus terms
   above actually reach it. 100%-correctness item: it is the economy.
5. **Add the quality ladder** (`yieldRise` → "Earnings Rate 3000%"). Only 14.1% of the multiplier, and
   the data is already correct in `lib/staffing-data.json`; only the APK-growth gate is wrong.
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
