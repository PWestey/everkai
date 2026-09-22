# 05 · Awaken

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/awaken-4star.png` (LR, 4 of 5 stars),
`img/awaken-0star.png` (SSR+, 0 stars), `img/awaken-tier-tooltip.png`

**Everkai has no equivalent of this screen.** Cross-reference
`docs/character-systems-gap.md`.

## Layout

The only **full panel** in the Fellow surface: top edge y ≈ 210, bottom flush to the dock,
shield-X overlapping its top-right. The art is visible only as a strip above it.

```
 ┌          ◇ Current Effect ◇             ✕ ┐
 │        ╱  ★ ★ ★ ☆ ☆  ╲                    │  star banner
 │   POW  Base Value +1.5M   Multiplier +30% │  summary strip
 │ ┌───┬─────────────────────────────────┬─┐ │
 │ │art│ Lv.4 Support Power           (i)│ │ │  talent row ×4
 │ │   │ Aptitude % of UR and above      │ │ │
 │ │   │ quality Fellows+2.5%            │ │ │
 │ │   │ (Next Level +3%)                │ │ │  green
 │ └───┴─────────────────────────────────┴─┘ │
 │   … three more talent rows …              │
 │ ┌───────────────────────────────────────┐ │
 │ │ ⬤ ⬤ ⬤ 🔒 🔒 …                          │ │  medal row, scrolls horizontally
 │ └───────────────────────────────────────┘ │
 │  Reach Lv. 550 and have 3-Star Fellows    │  gate line, centred
 │       x15 to awaken to next Star.         │
 │          [ 💎 11/15 ]                     │  primary action
 └───────────────────────────────────────────┘
```

## Pieces

**Star banner** — a horizontally-stretched hexagon with 5 stars. Earned stars are gold,
unearned are dark. The banner's **fill changes with progress**: violet/blue gradient at
4 stars, flat brown at 0 stars. So the banner itself is a progress indicator, not just a
container.

**Summary strip** — `POW  Base Value +1.5M   Multiplier +30%`, both values green.
At 0 stars: `Base Value +0   Multiplier +0%`. Two numbers, no sentence.

**Talent rows** — one per awakening talent. 90 px square art tile on the left with a
rarity-coloured ground (red, purple, gold observed), then:
- title line: `Lv.4 Support Power` — the level prefixes the name, in gold
- effect line: the current effect, in brown body text, with class names coloured green
- `(Next Level +3%)` appended in green, in parentheses, on the same flow
- an `(i)` button at the row's right edge

Talent count varies: the LR has **four** (`Support Power`, `Synergy Power`,
`Negotiation Master`, `Power Boost`), the SSR+ has **three** (`Aptitude Boost`,
`Negotiation Specialist`, `Power Boost`). Row names differ by tier too —
`Negotiation Master` vs `Negotiation Specialist`.

**Talent `(i)` tooltip** — a dark translucent overlay, not a cream dialog. It lists the
**whole tier ladder** for that talent, one line each, with the current tier in green and
wrapped in parentheses:

```
Novice:      Aptitude % of UR and above quality Fellows+1%
Proficient:  … +1.5%
Virtuoso:    … +2%
(Outstanding) … +2.5%      ← current, green
Perfect:     … +3%
Divine:      … +3.5%
Ascendent:   … +4%
```

Seven named tiers: **Novice, Proficient, Virtuoso, Outstanding, Perfect, Divine,
Ascendent**. Note the naming — the row header says `Lv.4` but the tooltip says
`Outstanding`; the numeric level and the tier name are the same thing in two registers.

**Medal row** — a horizontally scrolling strip of ~112 px circular medals, one per star.
Earned medals are coloured (green, blue, purple in sequence — the colour is the star's
tier); unearned are silver with a padlock badge at the upper right. At 0 stars all five
visible medals are locked. A sixth is partially visible at the right edge, so the row
scrolls and there are more than five.

**Gate line** — centred, brown, with the numerals in **red**:
- `Reach Lv. 550 and have 3-Star Fellows x15 to awaken to next Star.`
- `Reach Lv. 300 to awaken to the next Star.`

The second form drops the material clause entirely when only a level gate applies. The
gate line is the one sentence on this screen, and it is generated from the requirement,
not authored per fellow.

**Primary action** — a green button, centred, containing a fragment-item glyph and
`have/cost`:
- `11/15` with **11 in red** — insufficient
- `11/3` with **11 in green** — sufficient

No verb at all. The button is the cost.

## State table

| State | Star banner | Summary | Medals | Gate line | Button |
| --- | --- | --- | --- | --- | --- |
| 0 stars | brown, all dark | `+0` / `+0%` | all locked | level gate only | `11/3`, green |
| Mid | violet, n gold | real values | n coloured, rest locked | level + material gate | `11/15`, red if short |
| Max | *(not captured)* | | | | |

## What Everkai should render

Everkai has no awakening system, so this is new construction. Build it as a full panel,
in this order of value:

1. **Star banner + summary strip.** Two numbers and five stars answer "what is awakening
   worth to me" immediately.
2. **Talent rows** with `Lv.N Name` / effect / `(Next Level +X)`. This is the pattern
   Everkai should reuse for *every* levelled effect in the game — it fits a whole
   progression step into one line and one parenthesis.
3. **Medal row** with locked padlocks.
4. **Gate line**, generated from the requirement.
5. **Cost button** with red/green have-colouring.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Star count / cap | per-fellow star state | **no** — new save field |
| Base Value / Multiplier | totals from earned stars | **no** |
| Talent set per rarity | 3 or 4 named talents, varying by tier | **no** |
| Tier ladder per talent | 7 tiers × effect value | **no** |
| Medal art per star | icon set | **no** |
| Gate requirement | level threshold + material + count | **no** |
| Fragment currency | an item id and balance | **partially** — Everkai has item inventory |

**What these captures confirm for `docs/character-systems-gap.md`:**

- Awakening is **per-fellow star progression**, 5+ stars, not a global tier.
- Each star grants a *set* of talents that level together, and talent **count varies by
  rarity** (3 for SSR+, 4 for LR) — so the table join is rarity → talent set, not fellow
  → talent list.
- Talent levels have **seven named tiers**, and the numeric level and tier name are
  interchangeable labels for the same value. If the gap doc found 7 rows per talent, that
  matches; if it found a different count, the tooltip here is direct evidence.
- The gate is **compound**: a level threshold *and* a count of other fellows at a given
  star level (`3-Star Fellows x15`). A roster-wide dependency, not a per-fellow cost.
  That is unusual and worth flagging to the owner before implementing — it makes
  awakening a late-game roster goal rather than a per-character choice, and Everkai's
  single-player design rule may call for adapting it.

## Prose to delete, and what replaces it

Nothing to delete — this screen does not exist in Everkai yet. Build it to the
conventions rather than adding it as another paragraph page. Specifically:

| Do not write | Write instead |
| --- | --- |
| "Awakening this Fellow to the next star requires…" | the gate line, generated: `Reach Lv. 550 and have 3-Star Fellows x15 to awaken to next Star.` |
| "Support Power is currently at Outstanding, which grants +2.5%. The next tier grants +3%." | `Lv.4 Support Power` / `… +2.5%(Next Level +3%)` |
| A rules disclosure listing the seven tiers | the `(i)` tooltip, current tier in green parentheses |
| "You need 4 more fragments" | `11/15` with 11 in red |
