# Artifact quenching, measured in full (F12-03)

> **STALE RATIO, CORRECTED 2026-09-18.** Every "×N of the original" in this document divides by
> **3,497,276**, which is *one real player's few-weeks save* — not the original's maximum — and which
> was additionally misread as a single hero's power when it is a **roster total of 3,497,276,469**.
> `docs/power-parity-audit.md` §5 has the derivation. The constant is now named
> `ORIGINAL_LIVE_SAVE_PACING` and is a pacing check, not a budget; the ceiling-to-ceiling pin is
> `ORIGINAL_SPIRIT_TABLE_MAX` = 13,861,950. The absolute figures below are still what they measured on
> the day; the *verdicts* drawn from the ratio ("already overshoots", "over budget") are withdrawn.

Quenching is the original's largest artifact-side power lever and Everkai does not have it. This file
is the complete measurement, so that implementing it later is transcription rather than research —
and it records why it is **deferred rather than shipped**: on today's numbers it would take Everkai's
default-mode ceiling from 1.99x the original to 4.10x.

Measured 2026-09-15 against the full 1,499-table config set at
`~/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic/`. Positive control per
CLAUDE.md rule 2: that directory returns `Wife 33, City 15, SimGame3 21`.

## It is one system, not three

`EquipmentQuenching` and "reforge" are the same mechanic. The replacement server exposes it as three
operations on one slot — `equipment_quenching` rolls, `equipment_replace` keeps or discards,
`equipment_quenching_one_key` batches — and there is no Materia, Reforge or Awaken table anywhere in
the dump. Those three names in F12's row text are Everkai-local inventions, not imports.

## Table shapes (rule 3: checked before counting)

| Table | Top level | Rows |
|---|---|---|
| `Equipment.json` | dict wrapping `Equipment` | 99 |
| `EquipmentQuenching.json` | dict wrapping `EquipmentQuenching` | 25 |
| `EquipmentQuenchingConsume.json` | dict wrapping `EquipmentQuenchingConsume` | 2,000 |
| `EquipmentLevel.json` | dict wrapping `EquipmentLevel` | 1,000 |
| `Country.json` | dict wrapping `Country` | 5 |

## The slot

Every artifact instance carries an array of quenching slots. Each slot is
`{rise, prop, quenchingNum, source, country}`.

- **How many.** `Equipment.quenchingSlotSetInitial`, distributed across the 99 artifacts as
  10 (66 artifacts), 8 (8), 6 (7), 5 (4), 4 (4), 12 (4), 3 (3), 2 (3).
  `Equipment.quenchingSlotSetQuality` is 15 on 85 of the 99 and absent on the other 14, so quality
  upgrades (paid in `Item_Equipment_SkillSlot_Increase`, ladder in `EquipmentQuality`, 202 rows) raise
  a slot set to 15.
- **`source`** is `Level` or `Quality` and selects the weight column. Note: `LevelWeightNormal` equals
  `QualityWeightNormal` and `LevelWeightHigh` equals `QualityWeightHigh` **elementwise across all 25
  rows**, so `source` changes nothing numerically in the shipped data. It is a hook, not a difference.
- **`country`** is 1-5 and is re-rolled with every roll. Only slots whose country equals the wearer's
  count toward power. The replacement server draws it uniformly over the five countries and flags that
  as provisional (`equipment_origins` records `initial-1pct-uniform-five-countries-provisional-v1`);
  the initial `rise` of 100 carries the same provisional flag. **These two are the only parts of the
  mechanic that are not recovered from the config tables.**

## The roll

`riseADH` is exactly `100 x row id`, 100 through 2500. Rows 1-4 carry weight 0 in every column and can
never be rolled, so the live range is 500-2500.

| Pool | Rows live | Total weight | EV riseADH | min | P(2500) |
|---|---|---|---|---|---|
| Normal (`costType` 0) | 5-25 | 3,229,317 | 724.73 | 500 | 0.0000081 |
| High (`costType` 1) | 15-25 | 41,300 | 1,748.91 | 1500 | 0.018160 |

A roll writes `lastQuenchingRes` / `lastQuenchingCountry` and does **not** apply. A second call
(`equipment_replace`, `clearLast` false) copies them into `rise`/`country`; `clearLast` true discards.
So the player always keeps the better of old and new, on both value and country match.

## The price

- **Normal is paid in gold.** `EquipmentQuenchingConsume[n].consume` is `{id:"3", count}` for all
  2,000 rows, and `Item.json` id `3` is `Icon_Gold_Big`. The index `n` is the **slot's own**
  `quenchingNum`, which starts at 1 and increments per roll — so the price escalates per slot, not per
  artifact and not per account.

  | roll | 1 | 10 | 20 | 50 | 100 | 200 | 500 | 1000 | 2000 |
  |---|---|---|---|---|---|---|---|---|---|
  | gold | 8 | 671 | 13,062 | 576,701 | 9,612,448 | 1.62e8 | 3.68e15 | 1.81e30 | 4.38e59 |

  Cumulative on one slot: 5.66e4 by roll 20, 5.95e6 by roll 50, 1.95e8 by roll 100. Everkai's
  `MAX_GOLD` of 1e15 (lib/limits.mjs) is exhausted by roll **441** on a single slot.

- **High is paid in an item, at a flat price that never escalates.**
  `System.EquipmentQuenchingConsumeHigh.jsonValue` is `[{id:'Item_Quenching_Equipment_1', count:1}]`
  — one stone per roll, forever.

**This corrects the claim in F12-03's original row text** that quenching "is paid in GOLD ... so it is
the one artifact upgrade that does not require solving the ore economy first". That is true only of the
Normal track, and the Normal track is the bad one: its EV is 2.4x worse, it cannot reach the top of the
table in any realistic number of rolls, and its price is the one that explodes. The track that actually
builds power is High, and High is gated on an item supply exactly the way levelling is gated on ore.

## What a roll budget buys

Accept-if-better, with the 1/5 country gate applied to each roll. Expected best matched `rise` on one
slot:

| rolls | 10 | 20 | 50 | 100 | 275 |
|---|---|---|---|---|---|
| Normal | 770 | 987 | 1,232 | 1,398 | 1,602 |
| High | 1,672 | 1,966 | 2,182 | 2,315 | 2,445 |

Expected rolls to land a country-matched maximum (2500): **275 on High, 621,022 on Normal.**

## How it enters power

`progression.py:51`, the replacement server's Fellow power:

```
value = (base * aptitude * (10000 + blessing_percent + gear_percent) // 10000
         + flat + blessing_flat + wish) * (10000 + pet_bonus['5']) // 10000
```

`equipment.py:62` sums matched slots straight into `gear_percent`:

```
percent += sum(s['rise'] for s in e['quenchingSlot']
               if s['prop'] == 'atk' and s['country'] == HEROES[h['id']]['country'])
```

So 10,000 = +100%, and `rise` is in hundredths of a percent. In Everkai this is the group
`(bondFactor + b.percent + pet.percent/100 + fish.percent/100 + echo.percent/100)` inside
`bondedPower` — the same multiplicative slot as blessing percent, multiplying the base x aptitude term.

Confirmed against the original's live save: hero 1's `Weapon_1_1` holds two matched slots totalling
exactly 1,200 (+12%), the same save's best is 18,000 (+180%, hero 195, `Weapon_7_3`), and its
`equipment_reforges` counter stands at 345.

## Why it is deferred: the ceiling arithmetic

Measured by injecting a constant into `bondedPower`'s percent group and re-reading Everkai's own
`rosterOperation` on the **same** ceiling save from `tests/fellow-power.test.mjs` — both halves of
every ratio below are Everkai's own reach against the original's own live-save total of 3,497,276.
The injection was a temporary measurement harness and is not in the shipped code.

| quench percent | rosterOperation | x original |
|---|---|---|
| +0 (today) | 6,965,719 | 1.99x |
| +12% (the original's hero-1 value) | 7,457,172 | 2.13x |
| +60% | 9,422,987 | 2.69x |
| +120% | 11,880,255 | 3.40x |
| **+180% (the original's observed live-save max)** | **14,337,523** | **4.10x** |
| +375% (15 slots x 2500, the config maximum) | 22,323,645 | 6.38x |

Everkai already **overshoots** the original by 1.99x in default mode. Shipping quenching at the
original's own observed magnitude roughly doubles that again. There is no version of this row that
ships a multiplier without a balance decision first.

## What Everkai has instead, today

Not nothing, and the F12-03 row was wrong to say "zero quench references in lib/":

- `Item_Quenching_Equipment_1` is a real bag item. `lib/opening-data.json` pays out 3 of them across
  the Journey reward tables, and it reaches the Bag through `JOURNEY_ITEMS` in `lib/adventure.mjs`.
- `lib/opening.mjs` has an `openingReforge` action that spends one stone for **+1 Fellow Aptitude** on
  an equipped Fellow below the aptitude cap, and counts it in `opening.reforges` to satisfy the
  original's own `EquipQuench` Journey task.

So the item, the faucet and a sink all exist. What is absent is the original's **mechanic**: per-slot
rolls, the keep-or-discard step, the country gate, and the percent — Everkai's stand-in pays flat
aptitude instead, which is why it does not move the ceiling the way the table above does.

## Recommendation to the owner

Batched, per CLAUDE.md rule 9, with the work proceeding on this recommendation unless overruled:

1. **Do not ship quenching as a percent lever at the original's magnitude.** The measurement above is
   unambiguous and the ceiling is already over.
2. **Keep the `openingReforge` stand-in.** It is the single-player-shaped version of the same sink:
   deterministic, no country gacha, and it lands in aptitude where Everkai's own design rule puts
   growth.
3. If quenching is wanted for its own sake, the shape that fits the single-player rule is
   **deterministic and country-free**: spend N stones to raise one slot one step up the same 25-row
   `riseADH` ladder, no roll, no discard, and a per-Fellow percent cap chosen from the balance target
   rather than from 15 x 2500. The tables above give every number such a version needs.
4. The question that measurement cannot settle, and that therefore reaches the owner: **where should
   default mode's ceiling sit relative to the original's 3,497,276?** Everything in this file is
   downstream of that one number.
