# Pace baseline

The village's simulated earning pace, and the only figures that should be quoted for it.

## Why this file exists

Earlier sessions recorded a pace of **192M / 333M / 478M gold/s at days 7 / 14 / 21**. Those numbers
**do not reproduce** on `sim/sim-v2.mjs` and cost real time on 2026-09-15, when a night of balance work
was measured against them and appeared to have halved the economy. It had not. The remembered figures
were the wrong yardstick.

This is CLAUDE.md rule 1 in its most expensive form: both halves of a comparison must come from the
same source. A number remembered from another session is not the same source as a number you just
measured, however confident the memory feels. **Re-measure the baseline; never quote one from memory.**

## How to measure

```
LIB=<a clean checkout>/lib/ node sim/sim-v2.mjs 21 apk earned /tmp/out.json
```

Two cautions learned the hard way:

- **Point `LIB` at a checkout nothing is editing.** Two runs were invalidated by re-checking-out the
  worktree they were reading while they ran. Keep a worktree pinned for simulations and leave it alone.
- **Check `done valid=true`.** A run that ends on an invalid save is measuring nothing.

## Measured 2026-09-15 / 16

Both runs on `sim-v2.mjs`, mode `apk earned`, 21 days, each from a clean worktree.

| | day 0 | day 7 | day 14 |
|---|---|---|---|
| Before the 2026-09-15 work (`82bcb71`) | 6,857,924 | 76,233,913 | 178,187,378 |
| After it (`b5d01e6`) | 6,940,244 | 75,566,911 | 176,526,328 |
| Change | +1.2% | **−0.9%** | **−0.9%** |

A night that retired several free faucets, metered others, multiplied Inn guest payouts by 20x to
8,160,000x, rebuilt the farm's costs and added the building quality ladder moved the pace by under one
percent. The tightening and the Inn's larger payouts very nearly cancel.

## An observation, deliberately not a conclusion

Actions taken fell over the same period — 38,502 → 34,233 by day 14, about 11% fewer — for the same
income. That is the shape the Little Helper and the faucet metering would both produce, and it has
**not** been isolated to either. Do not cite it as evidence for one of them without measuring which.

## Related

- `tests/fellow-power.test.mjs` — the Fellow **Power** ceiling, a separate number from earning pace.
  Its header records that the owner accepted ~2x the original's live save as the target on 2026-09-16.
