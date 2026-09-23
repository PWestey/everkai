# 04 · Stella

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/stella-main.png` (Lv. 20), `img/stella-level0.png` (Lv. 0, empty),
`img/stella-node.png` (a node selected), `img/stella-info.png`,
`img/stella-attributes-1.png`, `img/stella-attributes-2.png`

## Layout

A **half panel**, top edge at y ≈ 520, bottom flush to the dock. Two columns.

```
 ┌ (i)  ◇ Stella ◇                        ✕ ┐
 │ Stella Level: Lv. 20        [🔍Attributes]│
 ├──────────────┬───────────────────────────┤
 │              │      Lv. 19 → Lv. 20      │
 │   ✦ Lv.19    │  ┌─ Attribute Boost ────┐ │
 │    ╲         │  │ POW Power +208.5M     │ │
 │  ◇Lv.10      │  │            → +223.5M  │ │  new value green
 │      ✦Lv.20  │  └───────────────────────┘ │
 │  ◇Lv.20      │  ┌─ Stella Boost ───────┐ │
 │        ✦Lv.11│  │ ◉ Demon Slayer Corps  │ │
 │              │  │   Lv. 9 → Lv. 10      │ │
 │              │  │   Aptitude +1810→+2050│ │
 │   35%        │  └───────────────────────┘ │
 │              │        [  Activated  ]     │
 └──────────────┴───────────────────────────┘
```

**Left column (~35%)** — a vertical constellation: a curved golden track with star nodes
on and beside it, each tagged with a small brown pill giving its unlock level
(`Lv. 1`, `Lv. 9`, `Lv. 10`, `Lv. 11`, `Lv. 20`). It scrolls vertically. The track behind
reached nodes is bright gold; ahead of them it is dark. The **selected** node is drawn
larger with a blue-white core and its pill highlights gold.

At Lv. 0 (`img/stella-level0.png`) the same constellation renders with the stars
**unfilled** — dark blue diamonds in gold outlines — and the track is dull red-brown.
Same shape, different fill. Nothing is hidden, nothing says "locked".

**Right column (~65%)** — the selected node's contents:

- a centred header `Lv. 19 → Lv. 20` (arrow, not `»`, at node level)
- one or more banded sections, each a title strip over a content block:
  - `Dynamic Avatar Reward` — a thumbnail plus the reward's name, with `(Acquired)` in
    green at the strip's right end when already owned
  - `Attribute Boost` — glyph, stat name, `old → new`, new in green
  - `Stella Boost` — a circular icon, the boost's name, `Lv. 9 → Lv. 10`, then the effect
    `Aptitude +1810 → +2050`
- the section scrolls if it overflows

**Primary action** — centred at the panel's foot, not bottom-right (Stella is the one
exception to the bottom-right rule; the panel owns its own action row).

| State | Rendering |
| --- | --- |
| Can upgrade | green `Upgrade` with `have/cost` beneath, e.g. `0/20` with `0` in red |
| Already taken | `Activated` — a red-outlined, unfilled, inert pill |

## `(i)` Information

Standard cream dialog explaining the Stella system. Prose lives here and nowhere else in
the section.

## `Attributes` (the magnifier)

Top-right of the panel, a magnifier glyph with the caption `Attributes`. Opens a centred
dialog titled **`Stella Upgraded`** listing the **cumulative** effect of everything the
fellow's Stella has unlocked so far — as distinct from the right column, which shows one
node.

Sections, in order (`img/stella-attributes-1.png`, `-2.png`):

| Section | Row shape |
| --- | --- |
| `Stella Boost` | 64 px round icon, bold `Name Lv. N`, hairline rule, effect line in brown — e.g. `Demon Slayer Corps Lv. 10` / `Aptitude +2050`; `Trade Expert Lv. 3` / `When operating a building, its earnings get an extra +800%.`; `Aptitude Limit Break Lv. 2` / `Level cap of all basic aptitude skill +100` |
| `Attribute Boost` | glyph + `Power +223500000` — **spelled out in full digits**, unlike the abbreviated `+223.5M` on the node panel |
| `New Aptitude Skill` | same row shape — `Potential Unleashed I` / `Aptitude +1`, `II` / `+2`, `III` / `+3` |

Two registers of the same number on two screens, deliberately: abbreviated where you are
comparing, exact where you are auditing.

## Comparison with Everkai

Everkai's Stella page (`06_fellow_stella_rissette.png`) is, in full:

> `Rissette · Stella inactive`
> `2,372 village shards · Own flat Power +0 · own Power +0% · every Fellow's appointment yield +0% · talent cap +0`
> `From level & Aptitude 3,785 · Fixed 0`
> `20 upgrade levels · 18,000 village shards for the whole ladder · at the top: +149,000,000 own flat Power · own Power +475% · appointment yield +400% · talent cap +100`
> `[ Activate private Stella · Free ]`
> `About these rules`

| # | Difference | Kind |
| --- | --- | --- |
| S1 | Everkai has **no constellation and no per-node view**. The entire 20-level ladder is collapsed into two sentences: current totals and end-state totals. A player cannot see what the *next* level gives, which is the only question this screen exists to answer. | **structural** |
| S2 | Everkai shows no `old → new` anywhere. The original shows it on every stat, every node. | **structural** |
| S3 | Everkai has no cumulative-summary dialog; the original's `Attributes` is exactly the "what have I actually got" view Everkai tries to cram into line 2. | **structural** |
| S4 | Everkai's costs are prose (`2,372 village shards`, `18,000 village shards for the whole ladder`); the original's live as `have/cost` inside the button. | **structural** |
| S5 | Everkai's button reads `Activate private Stella · Free`; the original reads `Upgrade` with the cost beneath, and `Activated` when done. Everkai's word "private" and the `· Free` suffix have no original counterpart. | cosmetic |
| S6 | Everkai has no Dynamic Avatar reward concept. The original hands out an avatar at certain nodes and marks it `(Acquired)`. | **structural** — needs a data check against the config tables |
| S7 | Everkai's `About these rules` disclosure belongs behind the `(i)`. | cosmetic |

## What Everkai should render

Two columns in a half panel.

**Left, ~35%:** a vertical node track. Everkai already has `family-stella-panel.tsx` and a
20-level ladder — the levels exist, only the visual does not. Minimum viable version: a
vertical rail of 20 dots with milestone pills, filled up to the current level, the
selected one enlarged. The ornate curve can come later; the *shape* is what carries the
meaning.

**Right, ~65%:** the selected node, as banded sections:

```
        Lv. 9 → Lv. 10
┌ Attribute Boost ──────────────┐
│ POW Power  +58.5M → +73.5M    │
└───────────────────────────────┘
┌ Stella Boost ─────────────────┐
│ ◉ Demon Slayer Corps          │
│   Lv. 9 → Lv. 10              │
│   Aptitude +1810 → +2050      │
└───────────────────────────────┘
```

**Foot:** `Upgrade` + `have/cost`, or `Activated`.

**Top-right:** an `Attributes` magnifier opening the cumulative dialog.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Node list with unlock levels | the 20-level ladder | yes |
| Per-node deltas (`old → new`) | per-level stat values | yes — Everkai already knows the end-state totals, so it has the curve; it just never renders the step |
| Per-node Stella Boost entries | named boosts with their own levels | **partially** — Everkai models flat Power / Power% / yield% / talent cap. The original's named boosts (`Demon Slayer Corps`, `Trade Expert`, `Aptitude Limit Break`) are a richer structure. Cross-check `docs/character-systems-gap.md`. |
| Dynamic Avatar reward | avatar id + acquired flag | **no** |
| Cost per node | shard cost curve | yes |
| Cumulative summary | sum over unlocked nodes | derivable |

**What these captures confirm for `docs/character-systems-gap.md`:** Stella is a
*per-node* system with per-node rewards of at least three kinds (attribute, named boost,
cosmetic), not a flat ladder of scalars. If the gap doc derives it as a scalar ladder
from the tables, these screenshots contradict that reading and the tables should be
re-read for a node/reward join.

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `2,372 village shards · Own flat Power +0 · own Power +0% · every Fellow's appointment yield +0% · talent cap +0` | the `Attributes` cumulative dialog, one row per stat |
| `20 upgrade levels · 18,000 village shards for the whole ladder · at the top: …` | the constellation itself — 20 nodes you can see and tap, each showing its own step |
| `From level & Aptitude 3,785 · Fixed 0` | the Power `(i)` breakdown (spec 11) |
| `Rissette · Stella inactive` | the unfilled constellation |
| `· Free` / `· 2,372 village shards` in button labels | `have/cost` on the button's second line |
| `About these rules` | the `(i)` Information dialog |
