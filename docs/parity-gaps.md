# Everkai permanent-system parity audit — RETIRED 2026-09-15

**This file no longer holds an audit. Do not quote it; it is a pointer.**

It was a hand-written snapshot of the repository at `e9ef386` (2026-09-11), and it drifted. It had no
guard test, no generator, and no way to notice when the code moved underneath it. BUG-04.

## Where the record lives now

| Question | Read |
|---|---|
| What is missing, per item, with priority and status | **`docs/parity-catalog.csv`** — 229 rows, 12 columns, guarded by `tests/parity-catalog.test.mjs` |
| How finished each facility is, for a player deciding where to spend time | **`lib/system-maturity.json`** — guarded by `tests/system-maturity.test.mjs`, which fails if a Drakenberg facility reaches the town unlabelled |
| Where every `lib/*.json` number came from, and whether its source still resolves | **`docs/data-provenance.md`** |
| Which tables exist in the original's config set, and the traps in reading them | **`docs/data-index.md`** |
| Free grants vs earned sources | **`docs/faucet-map.md`** and **`docs/free-action-audit.md`** |
| Which tests cover a system | `ls tests/` — the lists in the old text were transcribed by hand and went stale |

## Why deleted rather than regenerated

Regenerating it from the catalogue was the alternative, and it is not possible honestly. The
catalogue's 12 columns carry no Depth verdict and no test list, so a generator would have had to
invent the two things the old document was actually read for. A generated file that invents its most
quoted fields is worse than no file.

The prose also duplicated records that *are* maintained: the Depth verdicts duplicate
`lib/system-maturity.json`, and the "Missing or local" bullets duplicate the catalogue.

## What it got wrong, measured 2026-09-15 before deleting

Three independent checks, each against the shipped code rather than against another document:

1. **§0 finding 1** listed `claimBait` +20, `wishSupply` +100, `claimOre` +1000,
   `specialBlessingSupply`, `claimOriginalSupplies`, Farm "Mature now", Treasure refill, Northern
   supplies and `refillEducation` as live free grants. MEASURED: **none of the eleven named grants
   still exists** in `lib/*.mjs`; they were converted or retired, and `tests/retired-faucets.test.mjs`
   guards several of them as gone. The document had been patched with a "Status note" above the
   finding rather than corrected — a caveat stack is how a snapshot dies.
2. **§6 Depth** read "The actual fishing minigame (odds, lengths, crowns, antiques, levels, bait
   economy) is missing, since casts are deterministic round-robin." MEASURED: `lib/fishing.mjs`
   `drawFish`/`castOdds` roll a rarity from the fishing level's `FishLevel` weights and then a
   species from the chosen ground; `FISHING_LEVELS` is the level curve; `claimCrownKohaku` /
   `crownKohaku` ship a crown. Four of the six are implemented.
3. **§6 "Missing or local"** quoted `fishing-data.json`'s `unimplemented` list, which was itself
   stale in five entries (BUG-10, fixed the same day, now guarded by
   `tests/fishing-record-drift.test.mjs`).

`lib/system-maturity.json` already carried the warning in its own `note`: every count there "was read
from the shipped module or data file, never from docs/parity-gaps.md, which has drifted from the code
more than once."

The full original text is in git history at `a5bdc44^` and earlier, if a specific 2026-09-11 verdict
is ever needed for comparison.
