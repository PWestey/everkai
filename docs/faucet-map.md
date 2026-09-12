# Faucet map — free grants vs earned sources

Measured 2026-09-19 against `lib/*.mjs`. Thirty grant-shaped actions: **20 still free, 4 gated by
play, 6 gated by habits.** `docs/parity-gaps.md` cross-cutting finding #1 — "acquisition mostly
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

## Converted (5 commits, unpushed)

| Resource | Was | Now | Original's stated source | Commit |
|---|---|---|---|---|
| Magic Ore | `claimOre` +1000 | 6/daily +24 perfect day; mine, banquet shop, Raphael milestones already existed | — (sized against artifact upgrades) | `d5fbaab` |
| Bait | `claimBait` +20 | starts at 20; a new species returns its bait, every 3rd repeat too; `baitRefill` 1/daily cap 10 | `Item_Bait1` → "Fishing" | `a0afdca` |
| Fairy Bottles | `wishSupply` +100 | 3 per stage clear; `bottleRefill` 2/daily cap 12 | `Item_Token_Gacha_Universal` → "Stages [Clear Stages], Daily Task" | `2bd906a` |
| Insight | `claimInsight` +1000 | `insightRefill` 250/daily cap 3000 | `Item_Box_Talent_1` → "Roaming, Pupil Union, Daily Task" | `2cc53a0` |
| Hire Cards | `claimHireCards` +10 | Banquet shop, 150 coins, 5/day | `Item_Building_Recruit_Increase_1` → "Banquet Shop" | `43fe296` |

## Still free (20)

**Tractable — an earned source exists or is easy to build**

| Action | Module | Note |
|---|---|---|
| `refillEducation` | game.mjs | named like the shipped refills; likely the same shape |
| `refillInnStamina` | inn.mjs | same |
| `treasureRefill` | treasure.mjs | same |
| `banquetPrepare` | banquets.mjs | **highest leverage.** Free pantry → host → 800 coins (`coinsPerGuest` 100 × 8 seats) → shop. Every banquet-shop price, including the Hire Card above and Magic Ore at 30, rests on this. Farm produce is the natural source but the farm has its own timer skip (`finishFarm`), and `finishFarm` is load-bearing in 8 test sites across 5 files. |
| `claimStaffingMaterials` | staffing.mjs | +100 building materials |
| `stageSupply` | raphael-progress.mjs | +100 event stamina |
| `northSupply` | northern.mjs | refills to 12 |
| `claimConsumable` | consumables.mjs | +10 of an item |
| `stellaSupply` | stella.mjs | +1000 fragments; the original converts duplicate pulls at 400 each |
| `specialBlessingSupply` | special-blessings.mjs | fills Blessing Points to 1e9 — the largest single grant in the game |
| `claimOriginalSupplies` | original-progression.mjs | up to 10M EXP and 100 of each breakthrough item |
| `sandboxSupplies` | game.mjs | 10 of each gift, refills Energy |
| `buySupply` | adventure.mjs | charges, but only 3 of 84 artifacts carry a price |

**Blocked — removing these strands content**

| Action | Why |
|---|---|
| `claimAllGear`, `claimGear` | 81 of 84 artifacts have `price: null` and no drop source anywhere. The original defines only `levelupConsume`; artifacts come from gacha/events it has and Everkai does not. Build an acquisition path first. |
| `sandboxAdventure` | grants every GEAR item via `EXTRA_ITEMS`, so it is an equivalent bypass of the above |

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
