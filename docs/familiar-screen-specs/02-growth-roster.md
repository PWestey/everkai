# 02 · Familiar Growth (the roster)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/growth-roster.png`, `img/growth-sort-open.png`, `img/growth-filter-applied.png`,
`img/growth-roster-scrolled.png`, `img/growth-not-yet-joined.png`, `img/growth-locked-cards.png`

Serves manifest heading 2 (Familiar Development). Reached from the hub's middle building
(spec 01).

## Layout

720 × 1280. Scaled from the 270 × 480 capture, so read the pixels as proportions.

| Band | y | share | Contents |
| --- | --- | --- | --- |
| Currency bar | 0–45 | 3.5% | persistent chrome |
| Title row | 50–90 | 3% | `(i)` badge then **Familiar Growth**, left-aligned at x ≈ 20. No close button — the `«` plinth is the way out. |
| Summary row | 95–140 | 3.5% | left: a count pill (green familiar glyph + number) on a pale capsule; right: `Sort by Default ▾`, a brown/gold button ≈ 190 × 34. Nothing between them. |
| Grid | 145–1080 | 73% | 3 columns, vertical scroll, continuous through the `Not Yet Joined` divider. |
| Filter capsule | 1085–1140 | 4% | a floating capsule, centred, inset ~180 px each side, over the grid. |
| Back plinth | 1190–1280 | 7% | `«` at the far left. The rest of the bar is empty. |

```
 0 ───────────────────────────────────────────────  currency bar
50 │ (i) Familiar Growth                          │
   │ ( 🐾 33 )                    [ Sort by … ▾ ] │
145├──────────────────────────────────────────────┤
   │  ▣ card    ▣ card    ▣ card    3 columns     │
   │  ▣ card    ▣ card    ▣ card    card ≈ 190×230│
   │             … scrolls …                      │
   │  ────◇ Not Yet Joined ◇────                  │
   │  ▣ dim     ▣ dim     ▣ dim                   │
1085│        ( ALL ○ ○ ○ )   ← floats over the grid│
1190├──────────────────────────────────────────────┤
   │  «                                           │
1280└──────────────────────────────────────────────┘
```

This is the **Fellow roster's grammar exactly** (`docs/fellow-screen-specs/01-roster.md`):
`(i)` + title, count pill + sort, three-wide grid, floating class capsule, `Not Yet Joined`
divider. Three differences, all reductions: no `POW Record High` pill in the summary row, two
sort options instead of four, and the count pill does not track the filter (below).

## The card

≈ 190 × 230 including the frame; three to a row with a ~16 px gutter and a ~30 px margin.
An arched brown top, a coloured inner panel, a chamfered name plate overlapping the bottom.

| Element | Where | Treatment |
| --- | --- | --- |
| Level | centred **on the arch itself**, not on a separate tab | `lv.249`, white, no plate behind it. **Absent entirely on a not-yet-joined card.** |
| Action badge | top-right corner, ≈ 32 px, overlapping the frame | red circle with `!`. Absent on a not-yet-joined card. |
| Group medallion | top-left corner of the art, ≈ 34 px | a circular glyph, one of four, the same art as the filter capsule's chips. Present on **every** card, owned or not. |
| Role badge | directly beneath the Group medallion, ≈ 26 px | a small gold diamond. One of three. Present on every card. Inert. |
| Art | fills the card, clipped by the arch | bust crop of the familiar's chibi render |
| Stars | bottom-centre of the art, over the art | a number then one star glyph — `5★`, not five pips. Absent on a not-yet-joined card. |
| Bound Fellow | bottom-right of the art, ≈ 48 px square | the bound Fellow's framed portrait, when one is bound. This is the only place on the roster where the Fellow link is visible. |
| Name plate | overlapping the card's bottom edge | cream / lavender / pale blue / pale green observed — **the plate colour is the rarity**, as on the Fellow roster (R5). |
| Inner panel | behind the art | also rarity-tinted: brown, purple, blue, green observed. |

So the original puts **seven** things on a familiar card: level, group, role, art, stars, bound
Fellow, name — plus "has an action". That is three more than the Fellow card carries, and the
two extras that earn their place are the **star count** and the **bound Fellow portrait**,
because both are per-familiar state you would otherwise have to open the card to see.

### Not yet joined

A centred `Not Yet Joined` divider — brown text flanked by a hairline rule with a small
diamond at each inner end, identical to the Fellow roster's. Below it, the same grid, same
card size, **same full-colour art**, with four things removed: the level, the `!` badge, the
star count and the bound-Fellow tile. The name plate and inner panel keep their rarity colour,
muted a step.

Note the contrast with the Preview screen (spec 07), where the same familiar's **full-size art
is a grey silhouette**. The capture index's observation that "locked art is greyscale
everywhere" does not hold on the roster card: here the art stays readable and the *missing
chrome* is the signal. That is convention 15 in its strict form — one element changes, nothing
is hidden — and it is why a not-yet-joined familiar roster still reads as a collection.

## Sort

`Sort by Default ▾` opens a two-row list directly beneath it, same width, gold-on-cream:

```
Sort by Default
Rarity
```

**Two options.** The Fellow roster has four (Default / Power / Aptitude / Awakening); the
Family roster has none. No ascending/descending toggle. `Rarity` orders by `Pet.grade`, which
takes six values across the 70 rows (`Pet.json`: grade 1 ×3, 2 ×12, 3 ×20, 4 ×13, 5 ×13,
9 ×9).

## The Group filter

A floating capsule with four circular chips: `ALL`, then three coloured Group medallions
(blue, gold, red observed). Single-select, bright ring on the selected chip. The `《 》`
chevrons flanking the capsule are **decorative end-caps** — confirmed on the device: they do
not scroll or page, and tapping them does nothing.

**Two corrections that must not be re-derived wrongly:**

1. **`PetClass.json` is not a class table.** Its 10 rows are a star-tier growth curve — `Cost`,
   `LevelMax`, `ATKcoef`, `HPcoef`, `SPDadd`, `PassiveSkillUnlock` — matching `Pet.ClassMax`
   (constant `10` on all 70 rows) and the Awaken screen's ladder. Nothing filters on it.
2. **The filter is `Group`.** `PetGroup.json` has **4** rows (`Icon_Pet_Group_1..4`) and
   `Pet.Group` uses all four, distributed **19 / 19 / 19 / 13** across the 70 familiars. The
   roster's capsule shows only three; the dispatch picker (`img/dispatch-familiar-picker.png`)
   shows four. The likeliest reading is that the roster omits a Group the owner has no members
   of — **unconfirmed**, and recorded as the remaining question in `CAPTURE-INDEX.md`. Build
   against `PetGroup`'s four either way.

`PetCareer.json` (3 rows, `Icon_Pet_Career_1..3`, `Pet.career` distributed 42 / 13 / 15) is the
**role** badge on the card and the detail shell's left rail. It is not a filter anywhere, and
tapping it does nothing.

Group is not cosmetic: `System.PetArrayAdd` pays a tower formation bonus keyed on same-Group
counts (`Group3` / `Group4` / `Group5`), so the thing the roster filters by is the thing the
Tower team is built around.

## The count pill

A pale capsule with a green familiar glyph and a number, top-left of the summary row.
**Applying a Group filter did not change it** (`img/growth-filter-applied.png`) — it stayed at
the owned count while the grid showed a subset.

That is the opposite of the Fellow roster, where the equivalent pill tracks the active filter
(Fellow spec 01: "so the pill is 'fellows matching the current filter', not 'fellows owned'").
One of the two is the original being inconsistent with itself. **Follow the Fellow roster**:
a number beside a filtered grid should describe the filtered grid. Precedent: the Family
README's ruling on the quantity selector, where Everkai adopts the consistent form rather than
copying the original's local inconsistency.

## Compared with Everkai

Everkai renders `RosterLanding kind="Companions"` (`app/familiar-panel.tsx:29–33`) over
`RosterPicker`. Since the Fellow rebuild this component already has the divider, the rarity
name-plate colour, the floating type capsule and the level banner, and the two defects the
audit recorded (D5's hardcoded Fellow-country capsule, D6's dead sort keys) are **already
fixed in the code**: the capsule is built from the entries' own types
(`app/roster-picker.tsx:61–63`) and `sortKeys` are passed. What remains:

| Difference | Kind |
| --- | --- |
| Everkai's grid **paginates** — `pageSize={9}` with a `Previous · n / m · Next` nav (`app/roster-picker.tsx:31,55`). The original scrolls continuously, and the `Not Yet Joined` divider is a point in that scroll, not a page boundary | **structural** |
| Everkai has a `Find a companion…` search input (`app/roster-picker.tsx:42`). The original has no search on any of the three rosters. Kept deliberately for the 244-card Fellow roster; on a 71-card familiar roster with a Group filter and a sort it is a third control competing with two | **structural** |
| The sort control is **rendered only when `power` is passed** (`app/roster-landing.tsx:29`), and `familiar-panel.tsx` does not pass it — so the familiar `sortKeys` are computed and the control never draws. The original's roster has a sort | **structural** — a live defect, not a style point |
| `badge` is not passed either, so no card carries the red `!`. On a roster where training, starring and node activation are all per-familiar, that is the entry point to the whole loop | **structural** |
| `info` is not passed, so there is no `(i)` on the roster; the original's `(i)` is on the hub (spec 01) and the roster inherits the system's one panel | cosmetic — resolved by spec 01 |
| No star count on the card. Stars are a per-familiar upgrade track with 100 rows behind it and no other roster-level readout | **structural** |
| No bound-Fellow portrait on the card. Everkai binds familiars in two places (audit D1) and shows the binding in neither roster | **structural** |
| No Group medallion art: `countryIcon()` returns null for the four familiar types, so `class-medallion` never draws and the capsule falls back to the type **word** (`app/roster-picker.tsx:49,63`) | cosmetic, but it is four sprites away from being right |
| No role badge — Everkai does not model `PetCareer` at the card level | cosmetic |
| Header reads `Companions`; the original's is `Familiar Growth`, and every other Everkai surface says `Familiars` (audit §0) | cosmetic |
| The summary is the sentence `{n} contracted` (`app/familiar-panel.tsx:32`); the original is a glyph-and-number pill | cosmetic |
| Everkai's level banner is a separate notched tab reading `Lv. 249`; the original prints `lv.249` on the arch itself with no plate | cosmetic |
| Everkai offers five sort orders (default, level, stars, rarity, name); the original offers two | cosmetic — but the two it offers are the two that are free |

## What Everkai should render

```
(i) Familiar Growth
( 🐾 12 )                                   [ Sort by Default ▾ ]

 ▣ lv.249 ⊙   ▣ lv.249 ⊙   ▣ lv.1 ⊙      card: group medallion ↖, role badge under it,
 ▣            ▣            ▣             art, `5★` at the art's foot, bound Fellow ↘,
 ─────── ◇ Not Yet Joined ◇ ───────       name plate coloured by rarity
 ▣ dim        ▣ dim        ▣ dim         dim = no level, no ⊙, no stars, no Fellow

              ( ALL ○ ○ ○ ○ )   ← floating, four Groups
 «
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Level on the arch | `game.familiars[id].level` | **yes** |
| Level cap for the readout | `PetClass.LevelMax` (`50 × class − 1`, top row 499) | **yes** — `familiarCap()` |
| Star count | `game.familiars[id].stars`; ladder `PetStar` (100 rows) | **yes** |
| Group medallion | `Pet.Group` → `PetGroup` (4 rows, `Icon_Pet_Group_n`) | **partially** — the type is carried; the four icons are not imported |
| Role badge | `Pet.career` → `PetCareer` (3 rows, `Icon_Pet_Career_n`) | **no** — `PetCareer` is carried in `familiar-tower-data.json` but never drawn |
| Rarity colour | `Pet.grade` (6 values) | **yes** — `cardStyle()` / `plate-*` |
| Bound Fellow portrait | `game.familiarBonds` | **yes** — read today only inside the bond panel |
| Red `!` badge | "this familiar has an affordable train, star or node right now" | **derivable** — `trainingCost`, `starCost` and `familiarNodes` all exist; no predicate combines them |
| Count pill | filtered length | **yes** |
| Sort: Default / Rarity | roster order + `Pet.grade` | **yes** — already computed, just not rendered |

### Numbers seen on this screen, and where the real ones live

| On screen | Do not copy | Take from |
| --- | --- | --- |
| `33` in the count pill | one save's owned count | roster length; the catalogue is `Pet.json`, **70 rows** (Everkai carries 71 — `Pet_8041505` has no config row, flagged at `docs/data-provenance.md:371`) |
| `lv.249`, `lv.1` | end-game and fresh saves | `PetLevel` (499 rows) capped per stage by `PetClass.LevelMax` |
| `5★` | — | `PetStar`, 100 rows; `Pet.ClassMax` is a constant `10` and is the *stage* max, not the star max |
| three filter chips | the capsule is short by one | `PetGroup`, **4** rows, used 19/19/19/13 |
| two sort options | — | this is layout: copy it |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `{n} contracted` summary line (`app/familiar-panel.tsx:32`) | the count pill: a glyph and a number |
| `Companions` as the roster's name (`app/familiar-panel.tsx:29`) | `Familiar Growth`, and `Familiar` for the system — one name, everywhere (audit §0) |
| `Find a companion…` search input | nothing — the Group capsule plus a two-option sort is the original's whole filtering surface for 70 cards |
| `Previous · n / m · Next` under the grid | a continuously scrolling grid; the `Not Yet Joined` divider is already in the scroll (`app/roster-picker.tsx:45`) |
| `No matches. Try another search or another type.` (`app/roster-picker.tsx:54`) | an empty grid under the divider. With four correct Group chips and no search, the only way to reach zero cards is a Group you own none of — and that state should show the `Not Yet Joined` half, not a sentence |
| the type **word** in the capsule chips | the four `Icon_Pet_Group_n` sprites; `ALL` stays a word, as in the original |
