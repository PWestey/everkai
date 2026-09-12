# Faucet map — free grants vs earned sources

Measured 2026-09-12 against `lib/*.mjs`. Thirty grant-shaped actions: **three now deleted, 16 still free, 4 gated by
play, 7 either gated by habits or recovering on their own.** (The header previously read 2026-09-19, a date a week in
the future; the measurement itself was sound.)

> **Scope limit — read `docs/free-action-audit.md` alongside this.** This map classifies actions by *grant-shaped
> name*, so it covers "hands something over for free" and misses the opposite class: **actions that should charge and
> do not**. A 2026-09-12 audit dispatched all 229 action strings against live state and found `hireEmployees`,
> `restockWorkshop`, `expandSchool`, `developInnRecipe`, `adoptFamiliar`/`adoptFamiliars`, `wardrobeCollect` and the
> time-skips (`finishFarm` and friends) are absent from this map entirely. `hireEmployees` is the largest remaining
> economy hole: free and unbounded, while `paidStaffHire` charges 247 gold for the same ten workers.
>
> Also re-open the "Blocked — no other source" verdict on `claimStaffingMaterials` below: the original *does* state a
> source (`Reward_DailyTaskReward_03` daily, `Reward_CityExchanger_01`), so it is convertible rather than blocked. `docs/parity-gaps.md` cross-cutting finding #1 — "acquisition mostly
comes from free sandbox grants, not an earned economy" — is what this tracks.

## Method, and two mistakes worth not repeating

Sources come from the original's own `Item:source:` fields in the research extraction
(`~/Documents/Codex/2026-09-07/.../datasets/Item.json`). Where the original states a path, Everkai
mirrors it; where it states none, the habit journal carries it, because the original's equivalent
recurring source is its Daily Task list.

Two scans that produced wrong answers, recorded so the numbers here can be trusted:

- A regex of `claim|sandbox|supply|free` cannot match `refillEducation`, `refillInnStamina` or
  `treasureRefill`. An earlier count of "19 remaining" missed all three. The pattern must include
  `refill`.
- `banquetPrepare` never appears in an `action==='…'` scan: it shares a branch with `banquetHost`
  (`if(action==='banquetPrepare'||action==='banquetHost')`), so the scan attributes it to the
  latter. It is a free faucet and is **not** in the table below.

Classification is by runtime behaviour, not by name — dispatch the action on a save with no habits
finished and see whether it refuses.

## Converted (10 commits)

| Resource | Was | Now | Original's stated source | Commit |
|---|---|---|---|---|
| Magic Ore | `claimOre` +1000 | 6/daily +24 perfect day; mine, banquet shop, Raphael milestones already existed | — (sized against artifact upgrades) | `d5fbaab` |
| Bait | `claimBait` +20 | starts at 20; a new species returns its bait, every 3rd repeat too; `baitRefill` 1/daily cap 10 | `Item_Bait1` → "Fishing" | `a0afdca` |
| Fairy Bottles | `wishSupply` +100 | 3 per stage clear; `bottleRefill` 2/daily cap 12 | `Item_Token_Gacha_Universal` → "Stages [Clear Stages], Daily Task" | `2bd906a` |
| Insight | `claimInsight` +1000 | `insightRefill` 250/daily cap 3000 | `Item_Box_Talent_1` → "Roaming, Pupil Union, Daily Task" | `2cc53a0` |
| Hire Cards | `claimHireCards` +10 | Banquet shop, 150 coins, 5/day | `Item_Building_Recruit_Increase_1` → "Banquet Shop" | `43fe296` |
| Treasure stamina | `treasureRefill` → 12 | daily recovery in `treasureState`, which already existed | — | `e0c6e61` |
| Northern supplies | `northSupply` → 12 | hourly accrual in `northernSupplies`, which already existed | — | `06df8c5` |
| Banquet materials | `banquetPrepare`, ungated | 1 set per finished daily, cap 2, once a day across all parties | — (the original states no source for Cheese/Beer/Steak/Wine) | `6b8f416` |
| Artifacts | `claimAllGear`, `claimGear`, `sandboxAdventure` | forged from Magic Ore at twice each artifact's own recycle reward; all three grants deleted | — (the original defines only `levelupConsume`; artifacts come from gacha and events Everkai does not have) | `201639f` + this change |
| Education Points | `refillEducation` → cap 6 | already recovered on their own in `settle()`; grant deleted outright | — (5-minute recovery timing is verified; Focus Candy `Item_GetCE_10` adds +1) | this change |

## Still free (13, none tractable)

**Tractable — an earned source exists or is easy to build**

None remain. `refillEducation` was the last one and is now deleted. Every other candidate failed the
recovery test below, or was converted.

The "~70 steps of time advancement" this table used to quote for `refillEducation` was wrong twice
over. The real loops run ~129 iterations across the four grades, not 70 — six lessons per refill
against `ADULT_LESSONS` C:36/B-:45/B:60/B+:84 and then `GRADES` C:125/B-:155/B:200/B+:280. And the
cost never applied, because it assumed the replacement had to be time advancement. Those tests are
about adulthood milestones, not point recovery, so they seed the points directly instead.

| Action | Module | Note |
|---|---|---|
| `buySupply` | adventure.mjs | charges, but only 3 of 84 artifacts carry a price |

**Blocked — removing these strands content**

| Action | Why |
|---|---|
| ~~`claimStaffingMaterials`~~ | **Reclassified 2026-09-12 — convertible, not blocked.** The verdict below was wrong and the scope note above already flagged it. The original states a source verbatim: `Item:source:Item_StarUp_Building_1_1` = *"Fountain of Wishes, Cyrstal Shop, Trading Post Shop, Guild Shop"*, for an item named **Building Upgrade Blueprint**. Everkai already has a Fountain of Wishes, so at least one stated path exists to build against. Original (stale) reasoning: *no `recoverAt`, no `day()`, no settle hook in staffing.mjs; building materials have no other source, so staff quality upgrades stop without it.* Sizing for whoever converts it: quality 1→26 costs **25,915** materials for the Inn and **57,013** for the Museum, against a faucet granting 100 per claim with no cap — so this faucet currently carries the entire quality ladder. |
| `claimConsumable`, `stellaSupply`, `specialBlessingSupply`, `claimOriginalSupplies` | all four fail the recovery test — zero `recoverAt`, zero `day()`, zero `settle` in their modules. Each is the only source of its resource. |
| `stageSupply` | **Raphael event stamina has no other source.** `stageEvent` defaults to `stamina:0` with no `recoverAt` and no `day()` anywhere in the module, so nothing regenerates it. Deleting it strands the stage. |
| `refillInnStamina` | **inn stamina has no other source.** `settleInn` only advances the serving queue — `served`, `popularity`, `blueprints`, `deposit`, `finesse` — and returns early with no queue. Nothing regenerates stamina, so deleting the button strands the inn. Needs a real source built first. |

**Redundant but behavioural — deletable, needs care**

`sandboxSupplies` (game.mjs) refills Energy *and* grants 10 of each gift. Both halves already have
real paths: Energy accrues in `settle` (`energy + elapsed/ENERGY_RECOVERY_MS`, clamped to
`energyCap`), and gifts are purchasable via `buyGift` at 100/200/100/200/500 gold. So nothing needs
building. But two assertions are *about* the grant rather than using it as a fixture —
`family.test.mjs:9` checks the grant does not count as gifting (`stats.gifts` stays 0, `claims`
empty) and `bonds.test.mjs:7` checks it touches only gift ids. Rewriting those is gift-accounting
work, not a mechanical swap. `app/page.tsx` dispatches it.

**Arguably fine — one-time collection conveniences, not economies**

`claimKeepsake`, `claimMuseum`, `claimExpoStall`, `claimInnGift`, `claimCrownKohaku`.

## Already gated

By play: `banquetClaim` (guests seated), `claim` (milestone `metric(s) >= goal`), `stageClaim`
(threshold consumed), `wishFairyClaim` (`fairyAvailable` from `total/500`).

By habits: `roamRefill`, `summonClaimDay`, `summonClaimWeek`, plus the three shipped above.

## Rates, for calibration

- One original day, every daily task cleared: **56 Activity Stamps, 50 Crystal, 2 Magic Ore**.
- A character costs **1 Acquaint Stone (SR) or 2 (SSR)** — Everkai's `SUMMON_COSTS` already match.
- Stones are 0.10% from a pull, fragments 2.10%: the exchange shop is the real route, not luck.
- Everkai's ore sink: artifact upgrades at 10–70/level, ~190 ore for a tier-one artifact to cap,
  ~1330 for top tier. The original's 2 ore/day would take nearly two years for one artifact, which
  is why its rate is deliberately not copied.
