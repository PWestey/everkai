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

Verified three ways rather than assumed:
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

## 6. Everkai work this slice implies

1. **Rewrite the income model** to `(staff×rate + power/1000) × (1 + bonus)`. This is the 100%-correctness
   item — it is the economy.
2. **Separate quality from staff count** in state and UI; today they are conflated.
3. **Add the quality ladder** (`yieldRise` → "Earnings Rate 3000%") — Everkai's `qualityBonus` is
   hardcoded 0.
4. **Add Service Level** (§3) or record deliberately dropping it.
5. **Building panel art parity** — the panel is a full screen with building art, a named plate,
   an earnings header, Quick x1/x10, and three tabs (Training / Appearance / Operation). Everkai's is
   text and space.
6. Fix `hireEmployees` being free and unbounded (`docs/free-action-audit.md`).

## 7. Provenance

Income and cost models come from the original's own tables — `BuildingBase`, `BuildingQuality`,
`BuildingLevel`, `BuildingBusiness`, `CityBank`, `CityLand` — read via `village.py`, which loads them
directly rather than reimplementing them. **This is the exception to the standing rule that private
server numbers are unreliable:** for buildings specifically, the server is a faithful reader of
original data, and the numbers were additionally verified against the live client UI (§2).

That exception does **not** extend to fishing, farm, excavation, rankings or drop rates, which the
server's own documentation marks as private inventions.
