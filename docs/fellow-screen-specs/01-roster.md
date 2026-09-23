# 01 · Fellow roster

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/roster-default.png`, `img/roster-info-1.png`, `img/roster-info-2.png`,
`img/roster-sort.png`, `img/roster-filtered.png`, `img/roster-not-yet-joined.png`

## Layout (720 × 1280)

| Band | y | share | Contents |
| --- | --- | --- | --- |
| Currency bar | 0–45 | 3.5% | POW total, earnings/s, gold. Persistent, not part of this screen. |
| Title row | 58–102 | 3.5% | `(i)` badge (28 px) then the word **Fellow**, left-aligned at x = 20. No close button — the dock is the way out. |
| Summary row | 112–148 | 3% | left: roster-count pill (green person glyph + `58`); middle: `POW Record High: 4.938B` pill; right: **Sort by Default ▾** button, 190 × 34, gold fill. |
| Grid | 160–1075 | 71% | 3 columns, scrolls vertically. |
| Class filter bar | 1085–1140 | 4% | Floating capsule, centre-aligned, 6 circular icons. |
| Dock | 1190–1280 | 7% | Home / Village / Fellow / Stage / Drakenberg / Storage. |

The filter bar **floats over** the grid (the grid scrolls beneath it) and is inset
~175 px from each edge. It is not a full-width toolbar.

## The card

197 × 232 including its frame; column gutter ~20 px; left margin 44 px; row pitch ~292 px.

Anatomy, top to bottom:

- **Level banner** — a notched tab on the card's top edge, centred, dark brown,
  `Lv.300`. **Absent entirely** on not-yet-joined cards. This is the single strongest
  owned/unowned signal.
- **Class medallion** — 40 px circle, top-left corner, overlapping the frame. Five
  colours: Inspiring purple/lyre, Diligent gold/broom, Brave red/shield,
  Informed blue/book, Unfettered green/feather.
- **Upgrade badge** — 34 px red circle with `!`, top-right, overlapping the frame.
  Means "something here can be improved right now". Not a count.
- **Portrait** — bust crop, fills the card. Unowned cards are desaturated toward sepia,
  not greyscale, and keep the background art.
- **Name plate** — a ribbon across the bottom with chevron end-caps. Plate *colour*
  carries rarity: pale blue, green, pink/lilac observed. Unowned plates are muted.
- **Selection** — the selected card gains an outer glow and a small book glyph; it is not
  a border colour change.

No power number, no star count, no rarity letters on the card. The original puts
**four** pieces of data on a roster card: level, class, name, and "has an action".

## Sort

`Sort by Default ▾` opens a 4-row list directly beneath, same width, gold-on-cream:

```
Default
Power
Aptitude
Awakening
```

The button label becomes `Sort by <choice>`. No ascending/descending toggle.

## Class filter

Capsule with six 46 px circular buttons: **ALL**, then the five class medallions in the
order Inspiring, Diligent, Brave, Informed, Unfettered. Selected gets a bright ring.
Single-select, not multi.

Applying a filter:
- the **count pill updates** (58 → 12), so the pill is "fellows matching the current
  filter", not "fellows owned";
- the **Not Yet Joined section is filtered too** and still renders, with however many
  cards match (one, in the capture);
- `Record High` does **not** change — it is a global stat.

## Not Yet Joined

A centred divider — the words `Not Yet Joined` in brown caps-case flanked by a hairline
rule with a small diamond at each inner end. Below it, the same grid, same card size,
desaturated, no level banner, no `!` badge. There is no "0 of N" counter and no
explanatory sentence.

## Information panel (`(i)`)

A cream dialog inset ~24 px, titled **Information**, close X on the top-right corner
overlapping the frame. Scrollable body. Content is a run of bold headings each followed
by one short paragraph, in this order:

`Fellow Level` · `Fellow Types` · `Fellow Aptitude` · `Fellow Skills` ·
`Fellow Blessings` · `Fellow Talents` · `Fellow's Aura` · `Fellow Limit Break` ·
`Fellow Awakening`

Fellow Types names the five classes: **Inspiring, Diligent, Brave, Informed, Unfettered**.

This panel is the *only* prose on the whole Fellow surface, and it is one tap away
rather than in the flow.

## Comparison with Everkai

Everkai's roster (`00_fellow_roster.png`): a header card reading
`Fellows — 106 of 244 joined`, a `Sort by ▾` select, a **`Find a fellow…` text input**,
an `Everyone ▾` select, then the class row, then `Joined` / `Not joined` dividers.
Cards carry `2.5K power · Lv. 100` in a banner plus a rarity tag (`SR`) and a class
medallion.

| # | Difference | Kind |
| --- | --- | --- |
| R1 | Everkai has a search field and a second `Everyone ▾` filter; the original has neither. Two extra controls competing with the class bar. | **structural** |
| R2 | Everkai's class filter is a full-width row of buttons pinned under the header; the original's is a floating capsule at the *bottom*, thumb-reachable, over the grid. | **structural** |
| R3 | Everkai's card banner is `2.5K power · Lv. 100` — two stats and a separator. The original shows level only. Power belongs on the detail screen. | cosmetic |
| R4 | Everkai has no "action available" badge. The original's red `!` is what makes the roster scannable at 58+ fellows and is the entry point to the whole upgrade loop. | **structural** |
| R5 | Everkai prints rarity as a letter tag on the card; the original encodes it in the name-plate colour and shows the letter only on the detail screen. | cosmetic |
| R6 | Everkai's count is prose (`106 of 244 joined`) in the header card; the original uses a glyph + number pill that tracks the active filter. | cosmetic |
| R7 | Everkai has no `(i)` panel on the roster, so its explanations are scattered into each sub-page as `About these rules`. The original centralises them here. | **structural** |
| R8 | Everkai's unowned cards are rendered near-black with a red frame; the original desaturates toward sepia and keeps the art legible, which is what makes a "not yet joined" roster still feel like a collection. | cosmetic |

## What Everkai should render

```
┌ (i)  Fellow ─────────────────────────────────┐
│ [👤 58]  [POW Record High: 4.938B]  [Sort ▾] │
├──────────────────────────────────────────────┤
│  ▣ card   ▣ card   ▣ card      (3-col grid)  │
│  ▣ card   ▣ card   ▣ card                    │
│            … Not Yet Joined …                │
│  ▣ dim    ▣ dim    ▣ dim                     │
├──────────────────────────────────────────────┤
│        ( ALL ○ ○ ○ ○ ○ )   ← floating        │
└──────────────────────────────────────────────┘
```

### Data each element needs, and whether Everkai has it

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Level banner | `fellow.level` | yes |
| Class medallion | `fellow.type` (5 values) | yes — already drawn on the card |
| Name plate colour | `fellow.rarity` | yes — currently rendered as a letter tag |
| Red `!` badge | "any affordable upgrade exists for this fellow" | **derivable, not present.** Needs one predicate over level-up EXP, aptitude pearls, origin-boost currency and stella currency. |
| Count pill | filtered length | yes |
| Record High | max roster power ever | **not present** — Everkai tracks current power only. Either add the high-water mark to the save (a new field, so `SAVE_VERSION` applies — see CLAUDE.md rule 12) or drop the pill. Recommend dropping it for now rather than shipping a fake. |
| Sort: Awakening | star count | only once Awaken (spec 05) exists. Until then ship 3 options. |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Fellows — 106 of 244 joined` header card | `[👤 106]` pill beside the title |
| `Find a fellow…` input | nothing (the class filter + sort covers it at this roster size) |
| `Everyone ▾` select | nothing — fold any owned/unowned filtering into the existing `Joined` / `Not joined` dividers |
| `2.5K power · Lv. 100` card banner | `Lv. 100` banner only; power moves to the detail stat block |
| `SR` letter tag on card | name-plate colour |
| Per-sub-page `About these rules` disclosures | one roster-level `(i)` Information panel with the nine headings above |
