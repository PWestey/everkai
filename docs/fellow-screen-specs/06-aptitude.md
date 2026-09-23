# 06 · Aptitude — Aptitude Skill and Origin Boost

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/aptitude-skill.png`, `img/aptitude-origin-boost.png`,
`img/aptitude-breakdown.png`

A **half panel** with two folder tabs riding its top edge: `Aptitude Skill` (default) and
`Origin Boost`. Both tabs share a header row:

```
        ✦ Total Aptitude 12565 (i)
```

Centred, the number in green, with an `(i)` that opens the breakdown dialog (spec 11).
That `(i)` is the most valuable single control on the Fellow surface — see below.

## Tab 1 · Aptitude Skill

```
 ┌ Aptitude Skill │ Origin Boost                ✕ ┐
 │       ✦ Total Aptitude 12565 (i)               │
 │  ⓵  ⓶  ⓷  ⓸  ⓹ ▸                              │  medallion strip, scrolls, selected ringed
 │ ┌────────────────────────────────────────────┐ │
 │ │ Talent Awakening III  Level 149/400        │ │
 │ │ Aptitude +298 (Next Level +300)            │ │  green
 │ │                      (Aptitude Skill（Basic）)│ │  tag pill, right
 │ │  ─────◇ Improve Skill ◇─────               │ │
 │ │  Use Skill Pearl        [Quick|x1|x10|x100]│ │
 │ │  🪙 405/2               ┌────────────────┐ │ │
 │ │                         │  Upgrade x1    │ │ │
 │ │                         │    405/2       │ │ │
 │ └─────────────────────────└────────────────┘─┘ │
 └────────────────────────────────────────────────┘
```

**Medallion strip** — 100 px circular skill icons in a horizontally scrolling row. Each
has a coloured ground (blue, green, blue, purple, orange observed) carrying the skill's
tier. The selected one gets a gold ring **and a small caret beneath it** pointing at the
detail block — so the strip and the detail are visibly joined.

**Detail block:**
- line 1: `Talent Awakening III` in brown bold, then `Level 149/400` in green
- line 2: `Aptitude +298` in gold, then `(Next Level +300)` in green parentheses
- right: a pill tag `Aptitude Skill（Basic）` classifying the skill. The full-width
  parentheses are the original's own typography (CJK-derived); reproduce as ASCII.
- `─── ◇ Improve Skill ◇ ───` divider
- cost row: `Use Skill Pearl` as the label, the currency glyph and `405/2` beneath it
- quantity selector + green button, as everywhere. Button repeats the cost.

## Tab 2 · Origin Boost

A **milestone track** — structurally different from tab 1, and the more interesting of
the two.

```
 ┌ Aptitude Skill │ Origin Boost                ✕ ┐
 │       ✦ Total Aptitude 12565 (i)               │
 │  ┌────┐ ┌────┐ ┌────┐ ┌────┐ ┌────┐            │
 │  │ ⬆  │ │ ⬆  │ │ ✦  │ │ ✦  │ │ ✦  │            │  reward medallions
 │  │Power│ │Power│ │Apt │ │Apt │ │Apt │            │
 │  │+20% │ │+20% │+2.5%│+2.5%│+2.5%│            │
 │  └────┘ └────┘ └────┘ └────┘ └────┘            │
 │  ▓▓▓▓▓│▓▓▓▓▓│▓▓▓▓▓│▓▓▓▓▓│▓▓▓▓░│░░░░░           │  segmented bar
 │  (Lv.50)(Lv.100)(Lv.150)(Lv.200)(Lv.250)       │  milestone pills
 │ ┌────────────────────────────────────────────┐ │
 │ │ Lv.244/600              [Quick|x1|x10|x100]│ │
 │ │ Aptitude +1220          ┌────────────────┐ │ │
 │ │  (Next Level +5)        │  Upgrade x100  │ │ │
 │ │                         │     6/1K       │ │ │
 │ └─────────────────────────└────────────────┘─┘ │
 └────────────────────────────────────────────────┘
```

- **Reward medallions** sit *above* the bar, each aligned over the segment it ends.
  Each shows an icon, a stat name and the value (`Power +20%`, `Aptitude +2.5%`). Earned
  medallions are warm-coloured; the unearned one at the right is silver/grey.
- **The bar is segmented**, one segment per milestone interval, with a gap between
  segments. Filled segments are gold; the current partial segment is partially filled;
  future ones are dark brown.
- **Milestone pills** sit *below* the bar (`Lv.50` … `Lv.250`), gold for reached, brown
  for not. The track scrolls horizontally — a `.0` pill is clipped at the left edge.
- Detail block: `Lv.244/600` then `Aptitude +1220 (Next Level +5)` — same two-line shape
  as tab 1, so the two tabs feel like one system.

This "medallion / segmented bar / pill" triple is the original's standard way of drawing
a long ladder with milestone payouts, and Everkai has nothing like it. It is reusable for
every milestone track in the game.

## Comparison with Everkai

Everkai's Skills page (`04_fellow_skills_rissette.png`):

> `Unfettered Insight I · Lv. 0/300`
> `0 Unfettered Insight · +1 Aptitude per level`
> `[ Study up to 1 · Lv. 0 · +0 Aptitude · 0 Insight ]`
> `[ Study up to 5 · Lv. 0 · +0 Aptitude · 0 Insight ]`
> `[ Study max · Lv. 0 · +0 Aptitude · 0 Insight ]`
> `[ Habit refill · Unfettered Insight ]`
> `About these rules`
> `Talent skills · +3 Aptitude (skills 3 · intimacy 0 · Stella 0 · Rarity Advance 0)`

| # | Difference | Kind |
| --- | --- | --- |
| A1 | Everkai shows **one skill**; the original shows a **scrolling strip of all of them** with the selected one's detail beneath. Everkai has no way to see or switch between a fellow's aptitude skills on this screen. | **structural** |
| A2 | Everkai has **no Origin Boost tab** — no milestone track at all. | **structural** |
| A3 | Everkai's three `Study up to …` buttons each restate the level, the gain and the cost. The original uses one button + a 4-segment selector, cost inside the button. | **structural** |
| A4 | Everkai's last line, `Talent skills · +3 Aptitude (skills 3 · intimacy 0 · Stella 0 · Rarity Advance 0)`, is a **breakdown crammed into a parenthesis**. The original's version of exactly this is the `(i)` breakdown dialog: 16 labelled sources in two columns. | **structural** |
| A5 | Everkai's `+1 Aptitude per level` is a rate statement; the original gives `Aptitude +298 (Next Level +300)` — the actual current value and the actual next value. | cosmetic but load-bearing |
| A6 | `Habit refill · Unfettered Insight` is an Everkai-only mechanic (per the single-player design rule). Keep it, but move it to a glyph button beside the quantity selector rather than a full-width labelled button. | cosmetic |
| A7 | Everkai has no total-aptitude header; the number is only visible on Overview. The original keeps `Total Aptitude` at the top of the section that changes it. | cosmetic |

## What Everkai should render

**Header (both tabs):** `✦ Total Aptitude 12,565 (i)`, centred, number green.

**Tab `Aptitude Skill`:**
- a horizontally scrolling medallion strip of the fellow's aptitude skills, selected one
  ringed with a caret
- detail block: `Name  Level n/max` · `Aptitude +v (Next Level +v')` · tag pill
- `─── Improve Skill ───`
- cost label + `have/cost`, quantity selector, green `Upgrade xN` with the cost repeated

**Tab `Origin Boost`:**
- reward medallions above a segmented bar with milestone pills below
- detail block `Lv.n/max` · `Aptitude +v (Next Level +v')`
- quantity selector + green button

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Skill list per fellow | ids, names, tiers | yes — `character-skill-guide.tsx` already enumerates them |
| Skill level / cap | level, cap | yes (`talentLevel`, `talentCap`) |
| Current and next aptitude value | per-level values | yes |
| Skill classification tag | `Basic` vs other | **no** — needs a column from the skill table |
| Skill medallion art + tier colour | icon set | **partially** — Everkai has skill icons |
| Origin Boost level / cap | a 600-level ladder | **no** |
| Origin Boost milestones | level → reward | **no** |
| Total Aptitude source breakdown | 16 named sources | **partially** — Everkai already computes several (`skills`, `intimacy`, `Stella`, `Rarity Advance`); see spec 11 |

**What these captures confirm for `docs/character-systems-gap.md`:** Aptitude has two
independent upgrade ladders per fellow — a *per-skill* one paid in Skill Pearls and a
*per-fellow* Origin Boost one running to Lv. 600 with milestone payouts every 50 levels.
If the gap doc treats aptitude as a single ladder, that is contradicted here. The
breakdown dialog also names `Origin Boost` twice — once as a flat `+1220` and once as
`+5%` — so Origin Boost contributes both additively and multiplicatively.

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Talent skills · +3 Aptitude (skills 3 · intimacy 0 · Stella 0 · Rarity Advance 0)` | `Total Aptitude 12,565 (i)` → breakdown dialog |
| `0 Unfettered Insight · +1 Aptitude per level` | `Aptitude +298 (Next Level +300)` |
| Three `Study up to … · … · … · …` buttons | one `Upgrade xN` + `Quick|x1|x10|x100` |
| `Lv. 0/300` on its own line | `Level 149/400` in green on the title line |
| `About these rules` | the section `(i)` |
| Everkai's absent Origin Boost prose (do not write it) | the medallion / segmented-bar / pill track |
