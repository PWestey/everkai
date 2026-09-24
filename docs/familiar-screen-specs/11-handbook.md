# 11 · Handbook — the Compendium

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/handbook-familiar-list.png`, `img/handbook-info.png`, `img/handbook-book-level.png`

Reached from the hub's **bottom bar**, left of `Shop` — not from the scene, not from the dock, and
**not named anywhere in the hub's own `(i)` manifest**, whose three headings are Contracts,
Development and Tower. Like Dispatch, the Pass and the shop, the Handbook was bolted on after
the system shipped.

Tables: `PetBookLevel` (300 rows), `System.NewPetBookEXP`, `System.NewPetSPBookEXP`,
`PetStar.BookEXP`, `Country` (5 rows), `Pet.Group`, `PetGroup`.
Everkai: **nothing.** Parity row **E8, ABSENT, deferred 2026-09-16**. The Familiar Hall dock has
no slot for it and `app/familiar-hall.tsx:8` mentions it only in a code comment, so a player
cannot tell it is missing (audit **S3**).

---

## 0 · The finding that matters: the Handbook pays out in Fellow types

Both of the Handbook's reward surfaces — the always-visible bonus strip at the top of the
Familiar List, and the Collection Rewards ladder behind the book icon — grant
**`Power of [Type] Fellow +5%`**, across the same five types the Fellow roster filters by.

`img/handbook-book-level.png`, the first five rungs, verbatim:

| Rung | Effect | State |
| --- | --- | --- |
| Lv. 1 | `Power of Inspiring Fellow +5%` | `Completed` |
| Lv. 2 | `Power of Diligent Fellow +5%` | `Not Achieved` |
| Lv. 3 | `Power of Brave Fellow +5%` | `Not Achieved` |
| Lv. 4 | `Power of Informed Fellow +5%` | `Not Achieved` |
| Lv. 5 | `Power of Unfettered Fellow +5%` | *(partially scrolled)* |

That is `Country` 1 → 5 in order. The config confirms the join exactly:

```
Country.json          1 → Inspiring   2 → Diligent   3 → Brave
                      4 → Informed    5 → Unfettered      (en/translate.json, Country:name:n)
PetBookLevel row n    { exp: 100, Reward: …, PowerCoef: { Country: "1".."5", value: 500 } }
```

**So the familiar system feeds the fellow system, and nothing in Everkai models that today.**
This is the only cross-system faucet on the entire Familiar surface that pays a *character*
stat rather than a familiar one, and it is the reason the Compendium is worth more than its
deferral suggests: collecting familiars is, mechanically, a Fellow-power investment.

Everkai already owns the join. `lib/hero-scope.mjs` ships `TYPE_COUNTRY` —
`{Inspiring:'1', Diligent:'2', Brave:'3', Informed:'4', Unfettered:'5'}` — and
`reaches(['country', n], fellowId)`, written for the original's `targetCondition` scoping and
measured against `Hero.json`'s own `country` column (181 rows, distributed 33/34/38/39/36 across
the five). A Compendium bonus is exactly a `country`-scoped percentage. **The hard part is
already built.**

---

## 1 · `PetBookLevel` is flat — name the constancy, do not draw a curve

Per CLAUDE.md rule 6, the interesting fact about this table is what **does not** vary.

Measured across all 300 rows:

| Column | Distinct values | Reading |
| --- | --- | --- |
| `exp` | **1** — always `100` | Every level costs the same 100 Compendium EXP. 300 × 100 = **30,000 total**. Not a curve. |
| `PowerCoef.value` | **1** — always `500` | Every level grants the same coefficient. `value` ends in no `coef`, but `PowerCoef` does: 500 basis points = **+5 %**, which is what the screen prints. |
| `PowerCoef.Country` | 5 | The only column that varies. |
| `Reward` | **2** | `Reward_PetBookLevel_01` on rows 1–50, `_02` on rows 51–300. |

**There is no growth curve in this table.** A ladder rendered as a rising line would be a lie
about the data. It is 300 identical rungs whose only difference is which of five Fellow types
each one pays, plus one reward-tier change at level 50.

### A correction to `docs/familiar-data-inventory.md` §2

That document records `PowerCoef.Country` as *"cycling 1→5 in blocks of 60 rows"*. Measured this
session by run-length encoding the full 300-row sequence: **300 runs, every run of length 1.**
The country cycles `1,2,3,4,5,1,2,3,4,5,…` **one country per level**, not in blocks.

Each country still receives 60 of the 300 levels, so the *total* is unchanged — but the
*interleaving* is the whole player experience of the ladder, and a blocked reading would have
built a Compendium whose first 60 levels all pay Inspiring. Rung 1 pays Inspiring, rung 2 pays
Diligent, rung 3 pays Brave. The screenshot shows precisely that, and the table says why.

At the ceiling: 60 levels × 500 bp = **+300 % Power to each of the five Fellow types**, from
30,000 Compendium EXP. That is a table-derived magnitude, both halves from the config set
(rule 1); no screenshot contributed to it.

### The reward half does not port

| Bundle | Rows | Contents |
| --- | --- | --- |
| `Reward_PetBookLevel_01` | levels 1–50 | 100 × item `4` (**Crystal** — the premium currency) + 10 × `Item_PetClassUP` (**Familiar Crystal**) |
| `Reward_PetBookLevel_02` | levels 51–300 | 100 × item `4` (**Crystal**) + 3 × `Item_PetRefresh1` (**Basic Metamorphixir**) |

Both tiers pay the game's premium currency, which Everkai does not have and should not add (see
spec 12). Both also pay into systems Everkai either ships (`Item_PetClassUP` = class-up items) or
defers (`Item_PetRefresh1` = Metamorphosis, parity **E7**). **Port the `PowerCoef` half; treat the
reward half as an owner decision that is currently blocked on E7 anyway.**

---

## 2 · Familiar List — the main screen

`img/handbook-familiar-list.png`. Title plaque `(i) Familiar List` top-left. Three bands.

```
 0 ───────────────────────────────────────────────────  game bar
   ┌ (i) Familiar List                                ┐
   │  ╭────╮ ┌─────────────────────────────────────┐  │  book icon on a sunburst,
   │  │book│ │ ⬤+5%  ⬤+0%  ⬤+0%  ⬤+0%  ⬤+0% │  │  overlapping a white pill
   │  ╰┤Lv.1├─────────────── 0/100 ─────────────────┐ │  strip of FIVE type chips
   │   └────┘                                       │ │  Lv. plaque + EXP bar
   ├────────────────────────────────────────────────┤ │
   │  ┌───────┐ ┌───────┐ ┌───────┐                 │ │  3-wide grid, scrolls
   │  │lv.249 │ │ lv.1  │ │lv.249 │   EXP           │ │
   │  │ ⬤  art│ │   art │ │   art │   badges        │ │
   │  │ 5★ [▪]│ │ 0★    │ │ 3★    │                 │ │
   │  │Umbran…│ │Wumeow │ │Shibat…│  ← nameplate    │ │
   │  └───────┘ └───────┘ └───────┘                 │ │
   │       … scrolls …                              │ │
   ├────────────────────────────────────────────────┤ │
   │          ( ALL )( ⬤ )( ⬤ )( ⬤ )                │  group filter, ALL + 3
   │            ┌──────────────────┐                 │
   │            │  Quick Collect   │                 │  green, centred
   │            └──────────────────┘                 │
   └─────────────────────────────────────────────────┘
```

### The header — four elements, no sentence

| Element | Treatment | Backing |
| --- | --- | --- |
| **Book icon** | A closed blue-and-gold book on a pale sunburst, top-left. It is a **button** — it opens Collection Rewards (§4). The label is not written; the art is the label | — |
| **`Lv. 1` plaque** | A small chamfered cream plaque **overlapping the book's lower edge**, the number in gold. Same treatment as a familiar's nameplate | `PetBookLevel` row index |
| **EXP bar** | A dark inset bar running the full remaining width from behind the plaque, with `0/100` printed **inside the fill** — Family convention 12, on a fourth screen | `PetBookLevel.exp`, constant 100 |
| **Type-bonus strip** | A white rounded pill holding **five** chips in a fixed order, each a circular type medallion followed by `+n%`. Zero-valued chips are **rendered, not hidden** | five `Country` rows × accumulated `PowerCoef` |

Two conventions are doing all the work here:

1. **Zeros are shown.** `+5% +0% +0% +0% +0%` — four of the five chips are worthless and all five
   render. That is Fellow spec 11's rule (*"the list doubles as a catalogue of what could
   contribute"*) applied to a bonus strip: a player who has never levelled the Compendium can
   still read, in one glance, that it pays five different things and that they advance
   separately. A filtered strip would teach nothing.
2. **The level plaque overlaps the thing it describes.** The `Lv. 1` plaque is attached to the
   book, not floating above the bar. Level, progress and destination are one composed object.

### The card

`lv.` and star count are the same familiar card used on the Growth roster, plus one badge:

| Corner | Element |
| --- | --- |
| top-centre, over the art | `lv.249` in outlined white — **no `/max`**, unlike the Growth roster |
| top-left | the familiar's **Group medallion** (a circular type glyph), with a small gold sub-badge under it |
| **top-right** | a blue **`EXP n`** plate — the claimable Compendium EXP, green `EXP` lettering over a blue book, the number beneath |
| bottom-left | `n ★` — star count |
| bottom-right | a small rectangular art thumbnail (the familiar's appearance/skin marker) |
| foot | chamfered nameplate, rarity-tinted |

**The `EXP n` badge is the claim affordance, and it is a trap.** The `(i)` states *"Tap a Familiar
to claim the corresponding Compendium EXP"* — the badge sits inside the card's tap target, so a
tap that looks like "open this familiar" is a claim. This is the third instance of the same trap
in this capture programme (the Family gallery's chest badges, the hub's speech bubble, this).
**Nothing on this screen was tapped**, for that reason.

If Everkai copies the badge, it must **not** copy the trap: make the badge its own tap target and
let the card body open the familiar.

#### Where the badge's number comes from

Two tables, both constant-valued (rule 6 again):

```
System.NewPetBookEXP    { rare 1:10, 2:20, 3:50, 4:100, 5:400, 9:200 }   ← for owning it
System.NewPetSPBookEXP  { identical values }                             ← for the SP (shining) variant
PetStar.BookEXP         { rare 1:1, 2:2, 3:5, 4:10, 5:40, 9:20 }         ← per star, constant on all 100 rows
```

Cross-checked against the capture: Umbranther is SSR (rarity 4, per `img/explore-area-showall.png`)
at 5★, and its badge reads `150`. From the tables: `100 + 5 × 10 = 150`. Wumeow at lv.1/0★ reads
`100`. The badge is `NewPetBookEXP[rarity] + stars × PetStar.BookEXP[rarity]` — derived from the
config, corroborated by the screen rather than read off it.

The `(i)` names four EXP sources; three are in these two tables and the fourth (awakening) is the
star count they already meter.

### The footer

- **Group filter**: `ALL` plus **three** circular medallions. Same short-by-one bar as the Growth
  roster — `PetGroup` has four rows and `Pet.Group` uses all four (19/19/19/13 across the 70
  familiars). Build against `PetGroup`'s four; the capture index §"class-filter discrepancy"
  carries the unresolved half.
- **`Quick Collect`**: a single green primary, centred, full-width-ish. It claims every pending
  badge at once. No count, no cost, no confirmation dialog visible. The per-card badges are the
  count.

---

## 3 · The `(i)` — Compendium EXP / Compendium Level

`img/handbook-info.png`. The standard parchment sheet, `✕` tab, two `- Heading -` blocks and six
`◆` bullets. Verbatim:

```
- Compendium EXP -
◆ Acquiring new Familiars, awakening them, increasing their stars, and obtaining
  SP Familiars all increase Compendium EXP.
◆ Familiars of different rarity provide different amounts of Compendium EXP.
◆ Tap a Familiar to claim the corresponding Compendium EXP.

- Compendium Level -
◆ Once the Compendium EXP accumulates to a certain value, the Compendium's level
  will automatically increase.
◆ Each time the Compendium's level increases, you receive rewards and enhanced
  power bonuses for different-type Fellows.
```

**78 words, and that is the entire Handbook's prose budget.** Note what it does and does not say:

- It names the four **sources** of EXP and says rarity matters — without printing a single one of
  the six rarity values. Those are on the cards, as badges.
- It says the level rises **automatically** — so there is no "level up" button anywhere, and the
  bar is a readout, not a control.
- The last bullet is the cross-system link stated in the game's own words: *"enhanced power
  bonuses for different-type Fellows"*. §0's finding is not an inference; the game says it.

---

## 4 · Collection Rewards — the ladder

`img/handbook-book-level.png`. Reached by tapping the book icon. Parchment sheet,
`Collection Rewards` centred, `✕` tab top-right, vertically scrolling.

```
 ┌            Collection Rewards               ✕ ┐
 │ ┌──────┐                                      │
 │ │ Lv. 1│   Power of Inspiring Fellow +5%      │  ← rung plaque LEFT, effect RIGHT
 │ └──────┘                                      │     on a TINTED row (claimed)
 │   [item ×100] [item ×10]        Completed     │  ← reward icons, then STATE
 │ ─────────────────────────────────────────────  │
 │ ┌──────┐                                      │
 │ │ Lv. 2│   Power of Diligent Fellow +5%       │     plain row (unclaimed)
 │ └──────┘                                      │
 │   [item ×100] [item ×10]        Not           │  ← two-line, right-aligned
 │                                 Achieved      │
 │ ─────────────────────────────────────────────  │
 │ ┌──────┐   Power of Brave Fellow +5%          │
 │ │ Lv. 3│   …                                  │
 └───────────────────────────────────────────────┘
```

| Element | Treatment |
| --- | --- |
| Rung plaque | `Lv. n` on a red-brown chamfered tab, hard against the row's left edge, vertically centred on the row's first line |
| Effect | One line, right of the plaque, dark text. **The effect is the row's title** — there is no separate reward name |
| Reward icons | Framed item tiles with `×n` in the corner, bottom-left of the row |
| **State** | Right-aligned, opposite the icons: `Completed` on one line, or `Not Achieved` wrapped onto **two** |
| Row tint | The claimed row is on a **warm amber fill**; unclaimed rows are plain cream |

### The Completed / Not Achieved pair

This is the screen's one state machine and it is worth being precise about, because it is
**not** the affordable/unaffordable green/red pair that governs every other gate on this surface
(capture observation 6). It is a two-state *past tense*:

- `Completed` — earned, tinted row, no control.
- `Not Achieved` — not yet earned, plain row, **no control either**.

There is no `Claim` button on any rung. The `(i)` explains why: the level *"will automatically
increase"*, so the reward is paid on the level-up, not collected from this list. **This ladder is
a readout, not a claim surface.** The whole screen has exactly one interactive element: the `✕`.

That makes it the cheapest screen in the entire Familiar capture to build correctly, and the
easiest to build *wrongly* — Everkai's instinct on every other ladder has been to put a button on
each rung.

### Why `Not Achieved` wraps to two lines

It is not a layout accident worth reproducing pixel-for-pixel, but the *reason* is worth keeping:
the state column is narrow because the **effect line** is the row's headline. The design spends
its width on what the rung does, not on its status. Everkai's ladders do the reverse.

---

## 5 · Compared with Everkai

There is nothing to compare. Everkai has **no Compendium screen, no Compendium data, and no UI
string naming it** — parity row **E8**, audit finding **S3**: *"No screen, no UI string, nothing
in the Hall dock. A player cannot tell it is missing."*

So the table below is a build list rather than a diff.

| # | Difference | Kind |
| --- | --- | --- |
| H1 | **The familiar→Fellow Power link does not exist in Everkai.** `PetBookLevel.PowerCoef` is the only cross-system faucet on this surface, and it is unmodelled. Collecting familiars currently pays a player nothing outside the familiar system except a bound familiar's node bonus. | **structural** |
| H2 | No Compendium EXP concept. Everkai stores `owned`, `level` and `stars` per familiar (everything the two EXP tables need) and derives no collection total from them. | **structural** |
| H3 | No Handbook entry point. The Hall dock has four slots (`Familiars · Tower · Exploring · Dispatch`); the original reaches the Handbook from a **bottom bar**, outside its dock, alongside `Shop`. | **structural**, and it interacts with audit question 1 |
| H4 | Everkai's roster has no claimable badge of any kind; `RosterLanding`'s `badge` prop is not even passed on the Companions roster (audit **D6**). The `EXP n` plate is that prop's first real use. | **structural** |
| H5 | No `Quick Collect` anywhere on the surface. Everkai's bulk actions are `Train up to 10` and `Activate all 7 ready`, both with `· Free` or a cost appended after a `·`. | cosmetic |
| H6 | Everkai has no premium currency, so `Reward_PetBookLevel_01/02`'s Crystal half cannot port; and its Metamorphixir half is E7-deferred. | **structural**, but see §1 — the `PowerCoef` half is independent of both |
| H7 | The group filter is `ALL + 3` on this screen as on the Growth roster; `PetGroup` has 4. Everkai's own filter is worse — it hardcodes the **Fellow** types and matches zero familiars (audit **D5**, a live defect). | **structural** — fix D5 before building any familiar filter bar |

---

## 6 · What Everkai should render

```
 (i) Familiar List

 ( book )  [ ⬤+5%   ⬤+0%   ⬤+0%   ⬤+0%   ⬤+0% ]     ← five chips, zeros shown
  ┤Lv.1├───────────────── 0/100 ───────────────┐        ← value inside the bar

 [ lv.249 ]  [ lv.1  ]  [ lv.249 ]
 [ ⬤   art ]  [   art ]  [   art ]   EXP badge, top-right, ITS OWN tap target
 [ 5★  [▪] ]  [ 0★    ]  [ 3★    ]
 [Umbranther][ Wumeow ][Shibataro]
        … scrolls …

            ( ALL )( ⬤ )( ⬤ )( ⬤ )( ⬤ )                ← FOUR, per PetGroup
              [   Quick Collect   ]

 book → ┌ Collection Rewards                  ✕ ┐
        │ ┤Lv.1├  Power of Inspiring Fellow +5% │   amber row
        │  [×100][×10]              Completed   │   NO button
        │ ┤Lv.2├  Power of Diligent Fellow +5%  │   plain row
        │  [×100][×10]              Not Achieved│
        └───────────────────────────────────────┘
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Compendium level + EXP bar | `PetBookLevel`: 300 rows, `exp` 100 flat, 30,000 total | **no** — table unimported (E8); trivial to import, it is flat |
| Per-familiar claimable EXP | `System.NewPetBookEXP[rarity] + stars × PetStar.BookEXP[rarity]` | **derivable** — rarity and stars are both stored; `PetStar.BookEXP` is listed as *dropped* in the data inventory and needs one column added |
| SP (shining) EXP | `System.NewPetSPBookEXP` (identical values) | **derivable** — `e.sp[]` already tracks shining catches |
| Claimed-vs-unclaimed per familiar | a stored per-familiar flag | **no** — one new boolean per familiar; a save-version question, and rule 12 applies only if something is *derived* from it (nothing is) |
| Five type chips, accumulated | sum of `PowerCoef.value` for levels reached, grouped by `Country` | **derivable** once the table is imported |
| **Applying the bonus to Fellows** | `country` → type, then a percentage on that Fellow's Power | **yes** — `lib/hero-scope.mjs`'s `TYPE_COUNTRY` and `reaches(['country',n],id)` are exactly this scope, already measured against `Hero.json` |
| Where the bonus appears to the player | the Power breakdown dialog's **`Compendium+0%`** row | **already specified** — `docs/fellow-screen-specs/11-number-transparency.md` shows `Compendium+0%` in both the Power *and* Aptitude source lists. The original already reserves the slot |
| Group medallion on the card | `Pet.Group` → `PetGroup` (4 rows) | **partially** — `Pet.Group` is carried; `countryIcon()` returns `null` for familiar types (audit D5), so no medallion draws |
| Group filter | `PetGroup`, four rows | **no** — and the current filter is a defect |
| Rung effect text | `Country:name:n` + `PowerCoef.value` | **derivable** |
| Rung rewards | `Reward_PetBookLevel_01/02` | **do not port** — Crystal + a deferred system (§1) |
| `Completed` / `Not Achieved` | level ≥ rung | **derivable** |
| `Quick Collect` | claim every pending badge | **derivable** |

**Note the slot that is already waiting.** Fellow spec 11 captured the original's Power Details
dialog listing `Compendium+0%` under *Power Percentage Bonus* and `Compendium+0` under *Aptitude*.
The original's own number-transparency screen already names the Compendium as a Power source on
every Fellow, at zero, for a player who has not levelled it. Building E8 fills a row that the
Fellow spec has already told Everkai to render.

---

## 7 · Prose to delete, and what replaces it

Everkai ships no Compendium prose, because it ships no Compendium. The entries below are the
prose this screen **prevents** — the places where Everkai currently explains, in words, something
the Handbook would show.

| Delete | Replace with |
| --- | --- |
| `app/familiar-panel.tsx:34` (`P1`) — *"Familiars join by choosing a starter, by contract while Exploring, or as Familiar Tower floor rewards; familiars a village already had are kept…"* (the acquisition half of the 183-word essay) | the Handbook grid itself: 71 cards, owned ones in colour with an `EXP` badge, the rest greyscale. A collection screen explains a collection |
| Any future sentence of the form *"Collecting familiars raises your Fellows' Power"* | the five-chip bonus strip, with its zeros rendered, plus the `Compendium+n%` row in the Power breakdown dialog (Fellow spec 11) |
| Any future sentence explaining how Compendium EXP is earned | the `(i)`'s two blocks, six bullets, 78 words — the original's own copy, which already covers all four sources and the automatic level-up |
| Any `Claim` button on a Collection Rewards rung | nothing. The level rises automatically; the ladder is a readout. Its only control is `✕` |
| A rarity→EXP table written out anywhere | the `EXP n` badge on each card. The `(i)` says only *"Familiars of different rarity provide different amounts"*, and never prints the six values |
