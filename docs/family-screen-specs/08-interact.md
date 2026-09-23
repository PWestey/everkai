# 08 · Interact — Gift, Travel, Story

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/gift.png`, `img/travel.png`, `img/travel-instruction.png`, `img/story.png`

Dock position **5**, the **default**. Serves manifest headings 5 and 8 (*Family Gifts*,
*Family Trips*). Tables: `WifeTravel.json`, `WifeDateEvent.json`.

## What `Interact` is

Selecting `Interact` opens **no panel**. It is the shell's resting state: full art, the idle
dialogue bubble, and the lower right rail — `Story`, `Travel`, `Gift` — which is only visible
here. Each of those three opens its own half sheet.

That is worth stating plainly because it is the opposite of a tab: the "tab" is the absence
of a panel, and its contents are three rail buttons. Everkai's pager has no equivalent idea.

---

## Gift

Half sheet, top edge y ≈ 845 (the shortest on the surface), `✕` tab top-right.

```
 ┌ ◇  Select a gift  ◇                                ✕ ┐
 │ ┌────┐┌────┐┌────┐┌────┐┌────┐                       │  5 tiles, 110², gutter 16
 │ │ring││ring││ring││wrth││bead│                       │  rarity frame per tile
 │ │  20││1765││1287││  35││   0│                       │  count bottom-right
 │ └────┘└────┘└────┘└────┘└────┘                       │
 │   ˅                                                   │  caret under the selected
 │ ┌───────────────────────────────────────────────────┐ │
 │ │ ♥ Gold Ring    Intimacy +1                        │ │  name bold, effect brown
 │ └───────────────────────────────────────────────────┘ │
 │     ┌──────────────┐        ┌──────────────┐          │
 │     │     Gift     │        │  Batch Gift  │          │  two greens, equal weight
 │     └──────────────┘        └──────────────┘          │
 └───────────────────────────────────────────────────────┘
```

- Tiles are rarity-framed squares (blue / purple / gold observed) with the **count in the
  bottom-right corner**. A count of `0` is shown, not hidden — the tile is simply not
  selectable.
- The selected tile gets a gold border and a small `˅` caret beneath it, outside the tile.
  That caret is the only selection indicator; there is no highlight fill.
- The detail row is `icon + name + effect`, one line: `♥ Gold Ring   Intimacy +1`.
- Two primaries, equal size, side by side: `Gift` and `Batch Gift`. No quantity selector.

The strip scrolls horizontally if there are more than five gift types.

---

## Travel

Half sheet, top edge y ≈ 845.

```
 ┌ ◇  Choose a Journey  ◇                             ✕ ┐
 │ ┌───────────────────────────────────────────────────┐ │
 │ │▒▒▒▒▒ banner art, full card width ▒▒▒▒▒     (i)    │ │  art IS the card background
 │ │ Sailing Trip                          Instruction │ │  title in cyan over the art
 │ │ Taking a trip on the ferry        ┌────────────┐  │ │
 │ │ guarantees encountering 1 child.  │    Trip   ◣│  │ │  green + red -80% starburst
 │ │                                   │  💎 1T/80  │  │ │
 │ └───────────────────────────────────└────────────┘──┘ │
 │ ┌───────────────────────────────────────────────────┐ │
 │ │▒▒▒▒▒ banner art ▒▒▒▒▒                             │ │
 │ │ Airship Journey                   ┌────────────┐  │ │
 │ │ Taking a journey by plane         │  Journey   │  │ │
 │ │ guarantees encountering 2 children│  🎟 0/1    │  │ │  have RED
 │ └───────────────────────────────────└────────────┘──┘ │
 └───────────────────────────────────────────────────────┘
```

Two wide illustrated cards stacked. **The art is the card**, not an icon beside it — each
journey's scene fills its whole row and the text sits over a scrim. The title is coloured
(cyan on one, cream on the other), the body is one sentence, and the action is a green button
with the cost inside.

The `Trip` button carries a red **`-80%` starburst** clipped to its top-right corner: a
discount badge, drawn on the button rather than beside it. Its `(i) Instruction` link sits
above the button and opens:

> *There are 5 Crystal discounts for Sailing Trip each week.*
> *The first 2 Sailing Trips enjoy a 80% discount.*
> *The last 3 Sailing Trips enjoy a 50% discount.*
> *Discount resets every Monday.*
> *Remaining 80% OFF: 2*
> *Remaining 50% OFF: 3*

Rules first, then the two live counters, in the same popover. That is the pattern to copy for
anything with a weekly allowance.

---

## Story

Half sheet, top edge y ≈ 845, scrolls.

```
 ┌ ◇  Story  ◇                                        ✕ ┐
 │        ╭════════ Date Story ════════╮                 │  dark hatched section ribbon
 │ ┌───────────────────────────────────────────┬─────┐  │
 │ │ Quiet Moments   [CG]                      │  ≫  │  │  replay button, boxed
 │ └───────────────────────────────────────────┴─────┘  │
 │        ╭═══════ Become Family ══════╮                 │
 │ ┌───────────────────────────────────────────┬─────┐  │
 │ │ Become Family I                           │  ≫  │  │
 │ └───────────────────────────────────────────┴─────┘  │
 │ ┌───────────────────────────────────────────┬─────┐  │
 │ │ Become Family II                          │  ≫  │  │
 │ └───────────────────────────────────────────┴─────┘  │
 └───────────────────────────────────────────────────────┘
```

Section ribbons are dark with diagonal hatching and pointed ends — visually distinct from the
flat grey section bars used inside Stella. Rows are a title plus, where one exists, a small CG
thumbnail inline; the replay `≫` is a separate boxed button at the right edge, ≈ 56 px.

Locked stories are presumably absent rather than greyed — none were visible on the tested
members.

---

## Compared with Everkai

Everkai splits this across four pager pages: `Profile` (idle scene), `Dates` (auto-date,
trips), `Gifts` and `More gifts`.

| Difference | Kind |
| --- | --- |
| Four pager pages against one resting state with three rail buttons | **structural** |
| `Gifts` and `More gifts` are two pages of stacked gift rows; the original is one horizontal tile strip with one detail line | **structural** — and it is why Everkai needs two pages |
| Everkai's `ConsumableShelf` is a separate page; the original folds consumables into the same strip | **structural** |
| `app/family-trip-panel.tsx` renders trips as `blessing-row`s with `<h3>{name} · 80 Crystals</h3>` and a sentence; the original renders them as full-width illustrated banners | **structural** |
| Everkai prints `{left} of 2 trips left today · {crystals} Crystals` above the rows; the original puts the allowance behind the `(i)` and the currency inside the button | **cosmetic** |
| Everkai has no discount concept; the original has a weekly discount ladder with a starburst badge and live counters | **structural** (and schedule numbers must come from config, not from this capture) |
| Everkai's story replay is `CharacterScene` + `onReadStory` on the Profile page, ungrouped; the original groups stories under named section ribbons | **cosmetic** |
| Everkai shows the gift effect in a sentence per row; the original shows it once, for the selected tile | **structural** |

## What Everkai should render

```
Interact (default):  art + idle line + rail [Story] [Travel] [Gift]

Gift:    ◇ Select a gift ◇
         [🔵20][🟣1765][🟡1287][🔵35][🟣0]
            ˅
         ♥ Gold Ring   Intimacy +1
              [ Gift ]        [ Batch Gift ]

Travel:  ◇ Choose a Journey ◇
         ▒ Sailing Trip ▒▒▒▒▒▒▒▒▒▒▒▒▒▒    (i) Instruction
           Taking a trip on the ferry
           guarantees encountering 1 child.   [ Trip    ]◣-80%
                                              [ 💎 1T/80]
         ▒ Airship Journey ▒▒▒▒▒▒▒▒▒▒▒▒
           …2 children.                       [ Journey ]
                                              [ 🎟 0/1  ]

Story:   ◇ Story ◇
         ══ Date Story ══
         Quiet Moments [CG]                              [ ≫ ]
         ══ Become Family ══
         Become Family I                                 [ ≫ ]
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Gift item list, counts, rarity | `lib/gifts` via `GiftPanel` | **yes** |
| Gift effect per item | per-item Intimacy/Charm | **yes** |
| Batch gift | a "use all" action | **yes** |
| Journey name, art, body, child count | `TRIPS` in `lib/family-trips.mjs` | **mostly** — no banner art asset per journey |
| Journey cost + currency | `trip.crystals` | **yes** (with a documented local substitution for Perfume) |
| Weekly discount ladder + counters | — | **no**; `WifeTravel.json` is 20 rows of `travelCount`/`costGold` — check it before inventing a discount schedule |
| Story list, grouped | `CharacterScene`, `onReadStory` | **partially** — no section grouping |
| CG thumbnail per story | gallery art | **yes** (`FamilyGalleryPanel` has them) |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `More gifts` as a second page | one horizontal tile strip, scrolled |
| A per-row gift effect sentence on every gift | one detail line for the selected tile |
| `{n} of 2 trips left today · 4,613 Crystals` | `(i) Instruction` holding the allowance, and the currency inside the button |
| `Guarantees twins · +180 Blessing Power · +1,627 Blessing Points · Crystal price is local: the original charges 1 Perfume, an item with no route in the recovered data` | the original's own one-sentence body (`Taking a journey by plane guarantees encountering 2 children.`) plus the cost inside the button. The Perfume substitution is a project note. |
| `Selected portrait: {name}. Random dates can choose any joined Family member.` | delete |
| `Date bonuses and Energy` disclosure (`Fishing combination bonus: +n% Blessing Points. Each date uses 1 Energy, even at the point storage cap. Spend points on blessings to make room.`) | the roster's Auto Date `(i)` (spec 01), which is where the original puts date rules |
