# 01 · Family roster

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/roster.png`, `img/roster-not-yet-joined.png`, `img/roster-info-1.png`,
`img/roster-info-2.png`, `img/autodate-advanced-info.png`, `img/date-item-tooltip.png`

Serves manifest headings 1, 2, 3, 9, 10.

## Layout

720×1280. Five bands, top to bottom.

```
 0 ──────────────────────────────────────────────────────  game bar (shared chrome)
44 ┌ (i) Family                                     ╭───╮ ┐
   │                                                │ ⊕ │ │  Skill Bonus, circular,
   │ Total:  ♥ 69,174   💧 65,385   👥 42           ╰───╯ │  d ≈ 80, centre (651, 95)
148├──────────────────────────────────────────────────────┤
   │  ┌────────┐  ┌────────┐  ┌────────┐   3 columns      │
   │  │  art   │  │        │  │        │   card 208×270   │
   │  │  ♥ n 💧n│  │        │  │        │   gutter 16      │
   │  │ [name] │  │        │  │        │   margin 32      │
   │  └────────┘  └────────┘  └────────┘                  │  vertical scroll
   │        … 14 rows …                                   │
   │  ─────────◇ Not Yet Joined ◇─────────                │
   │  ┌────────┐  desaturated, no stat row                │
1020├──────────────────────────────────────────────────────┤
   │                      [item][item]      ╭────────╮    │  date-item tiles, 64²
1120│  ┌────────────────────────────────┐   │ wagon  │    │  Auto Date, d ≈ 130
   │  │ ☑ Auto Date (i)  DP: 11/11  ⊕ │   ╰────────╯    │
1185├──────────────────────────────────────────────────────┤
   │   «        Study-Tour    Gallery     Family List     │  footer dock, 4 items
1280└──────────────────────────────────────────────────────┘
```

The grid scrolls; the header band and both footer bands are fixed.

## Header

- `(i)` at (25, 74), 36 px tap target, immediately left of the word `Family`. Same glyph and
  placement as every other screen's information affordance. **This is the only prose on the
  surface.**
- **Totals strip.** One line: the word `Total:` in brown, then three pill chips, each
  `icon + value`, in a fixed order — pink heart `♥ 69,174`, blue droplet `💧 65,385`, green
  people `👥 42`. Values carry thousands separators. **No labels.** The icons are the labels,
  and they are the same three icons used on every card and every gate bar on every Family
  screen. Chip height ≈ 32, icon ≈ 24.
- **`Skill Bonus`** top-right: a circular gold medallion, `d ≈ 80`, with the words `Skill
  Bonus` overlaid across its lower third. It is a button, and it opens the account-wide
  Fathom total overlay (spec 12). Note the label sits *on* the art, not beneath it — the same
  treatment as the `Gift` tile on the member screen.

## Card

Card 208 × 270 including nameplate, portrait-oriented, with a decorative arched top.

| Element | Treatment |
| --- | --- |
| Frame | Gold arch on a coloured inner panel. The inner panel colour is the member's **rarity**: warm brown, deep blue, purple, green observed. |
| Art | Bust crop, fills the card, clipped by the arch |
| Stat row | Bottom of the art, over a dark scrim: `♥ 13,710` left, `💧 13,810` right. Same two icons as the header. Not shown at all on unjoined cards. |
| Nameplate | A small chamfered plate overlapping the card's bottom edge, `◇ Name ◇`. **Plate colour encodes rarity** — pink/rose, cyan, lavender, green, cream observed. |
| Badge | A red circular `!` at the top-right corner, ≈ 32 px, when the member has something actionable. |

### "Not Yet Joined"

Same divider convention as the Fellow roster: a centred `◇ Not Yet Joined ◇` ribbon across
the full grid width, then the same cards **desaturated to near-greyscale**, with no stat row
and a muted nameplate. They remain tappable and open the Preview screen (spec 13). There is
no separate list, no filter and no count.

## No sort, no filter

The Fellow roster has `Sort by ▾` and a 6-chip class filter bar. **The Family roster has
neither.** The order appears to be intimacy-descending with the unjoined appended. Anything
Everkai adds here is an addition, not parity.

## Footer band 1 — date items

Two 64 px item tiles centre-right, above the Auto Date bar, each with `X0` printed in the
corner. **A zero count is shown, not hidden.** Tapping a tile opens a dark `Special Effects`
tooltip: the item's name and effect in one sentence, `(Remaining chances: 0)` with the
number coloured (green here), and a green footer line
`The above special effects can be triggered while roaming.`

Observed, verbatim:

- `Flowering Fate: The next date will be held with the chosen family member.`
- `Divination of Fate: Two children can be adopted during your next date.`

## Footer band 2 — Auto Date

A single rounded bar, full width less margins, containing four controls in a row:

1. `☑ Auto Date` — a green checkmark box plus the label. A *setting*, not an action.
2. `(i)` — opens the `Advanced Function` popover (below).
3. `DP: 11/11` — the day's Date Points, have/cap. **After spending, the same slot becomes a
   countdown** (`29:55`) — the cap number is replaced by the time to the next point, in the
   same position, with no label change. Copy this: it is one field doing two jobs.
4. `⊕` — a green plus; a purchase surface. Not opened.

To the right and overlapping the bar, the **primary action**: a circular wagon illustration,
`d ≈ 130`, with `Auto Date` overlaid on its lower edge and a red dot badge. Art-as-button,
bottom-right — convention 6.

### The Auto Date `(i)`

A parchment popover titled **`Advanced Function`**, with:

- `Open Requirement` as a gold sub-heading and its condition beneath
- `Effect` as a gold sub-heading and a **numbered** list
- a green parenthetical qualifier line
- a 3-segment `Function Switch` selector at the foot: `x100 | x1000 | Off`

This is the one place on the Family surface where an explanatory paragraph is allowed, and it
also carries the setting it explains. Worth copying wholesale: the rules and the switch in
one popover means the screen itself needs neither.

## Footer dock

Four items, 96 px tall, icon over label: `«` (back, far left, on its own plinth),
`Study-Tour`, `Gallery`, `Family List`. The three right-hand items carry red dot badges when
they have something new. They are **roster-level**, not member-level — leaving a member
returns here.

## The `(i)` Information panel

A full-height parchment sheet with a red `✕` tab at its top-right corner, titled
`Information`, containing ten `- Heading -` blocks, each with `◆`-bulleted lines. Headings in
order: Family Intimacy, Family Blessing Power, Family Type, Family Relationship, Family
Gifts, Family Skills, Improving relationships, Family Trips, Family Dates, Family List.

It scrolls. Everything the game wants to *say* about Family is in here, and nowhere else.

## Compared with Everkai

Everkai renders `RosterLanding kind="Family"` with a `status` string per card
(`Intimacy 13710`) and a `summary` of `69,174 total Intimacy`.

| Difference | Kind |
| --- | --- |
| Everkai prints `Intimacy 13710` as text under each card; the original prints `♥ 13,710 💧 13,810` as two icon-value pairs over the art | **cosmetic**, but it is the convention that removes the word "Intimacy" from 42 cards |
| Everkai's summary is one sentence, `69,174 total Intimacy`; the original is three icon chips including Blessing Power and the joined count | **cosmetic** |
| Everkai has no `Skill Bonus` overlay | **structural** — the account-wide Fathom total exists (`fathomBonus(game,type)`) and is currently only visible inside the Fathoms page |
| Everkai has no `Not Yet Joined` divider — unjoined members show `Not joined` as a status string | **cosmetic** |
| Everkai has no roster-level footer: Auto Date lives inside the `Dates` page, there is no Study-Tour, Gallery is the `Pictures` page, there is no Family List | **structural** |
| Everkai has no thousands separator on the card status string | **cosmetic** |
| Rarity is not encoded in Everkai's card frame or nameplate | **cosmetic** |

## What Everkai should render

```
(i) Family                                            ( Skill Bonus )
Total:  ♥ 69,174   💧 65,385   👥 42

[card][card][card]      card = art, ♥n 💧n over a scrim, ◇name◇ plate
[card][card][card]      rarity colours the inner panel and the plate
        …
─────── ◇ Not Yet Joined ◇ ───────
[greyed card] …

                                   [item x0][item x0]   (  wagon  )
[ ☑ Auto Date  (i)   DP: 11/11  ⊕ ]                     ( Auto Date )

  «        Study-Tour      Gallery      Family List
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Total Intimacy / Blessing Power / count | sums over `game.family` | **yes** |
| Per-card ♥ / 💧 | `member.intimacy`, `member.blessingPower` | **yes** |
| Rarity colour | member rarity | **yes** (`FAMILY` catalog) |
| Actionable `!` badge | "anything affordable or claimable for this member" | **derivable** — no single predicate exists today |
| Joined / not-joined split | `game.family[id]` | **yes** |
| Date Points + regeneration timer | `game.energy`, `energyCap`, `ENERGY_RECOVERY_MS` | **yes** — Everkai calls it Natural Energy |
| Date-item counts and effects | `lib/tonics.mjs` reserve | **partially** — Everkai has a tonic reserve, not two named single-use modifiers |
| Skill Bonus per-class totals | `fathomBonus(game,type)` ×5 | **yes** |
| Unlocked-skill count (`967`) | count of open slots × members | **derivable** |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `69,174 total Intimacy` (roster summary) | `♥ 69,174  💧 65,385  👥 42` — three chips, no words |
| `Intimacy 13710` per card | `♥ 13,710  💧 13,810` over the art |
| `Not joined` per card | desaturated card, no stat row, under a `◇ Not Yet Joined ◇` divider |
| `Natural Energy 3 / 11` + `Tonic reserve: n · spent first` + `Next Energy in 41s` — three lines in `family-panel.tsx` | one field: `DP: 3/11`, becoming `29:55` when empty. The reserve becomes an item tile with its count. |
| `Selected portrait: {name}. Random dates can choose any joined Family member.` | nothing — delete it; the wagon button is labelled `Auto Date` and the `(i)` explains the rest |
