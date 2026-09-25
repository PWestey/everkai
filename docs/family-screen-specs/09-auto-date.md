# 09 · Auto Date — the results screen and the date reader

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/autodate-results.png`, `img/autodate-cg-unlocked.png`,
`img/autodate-advanced-info.png`, `img/date-item-tooltip.png`

Serves manifest heading 9 (*Family Dates*). Reached from the roster footer (spec 01), not
from a member. Tables: `WifeDateEvent`, `WifeEvent*`.

**Spend note.** `Auto Date` was pressed once, deliberately, to capture this. It consumed the
day's 11 Date Points, which regenerate on a visible timer.

## The results screen

A full-screen overlay, not a sheet:

```
 ┌───────────────────────────────────────────────────────┐
 │              ☀ radial glow behind ☀                   │
 │        ╭═══════════════════════════════╮              │
 │        │          Auto Date            │              │  orange ribbon banner
 │        ╰═══════════════════════════════╯
 │                Total Dates: 11                        │  centred, white, no label styling
 │ ┌───────────────────────────────────────────────────┐ │
 │ │ ┌────┐ You spent a good time with Otherin        │ │  pink card, pale-pink border
 │ │ │ art│ ─────────────◇─────────────               │ │  hairline with a rose diamond
 │ │ │    │        🌹 Blessing Points  +1421          │ │  green
 │ │ └────┘                                            │ │
 │ └───────────────────────────────────────────────────┘ │
 │ ┌───────────────────────────────────────────────────┐ │
 │ │ ┌────┐ Shy Jin Yu overcomes her shyness and      │ │
 │ │ │ art│ rewards you with something special on the │ │
 │ │ │    │ street.  ─────────◇─────────              │ │
 │ │ └────┘        🌹 Blessing Points  +1627          │ │  green
 │ │                CG Bonus +20%                      │ │  gold
 │ └───────────────────────────────────────────────────┘ │
 │                      … scrolls …                      │
 └───────────────────────────────────────────────────────┘
```

Every result is one card. The card is:

- **portrait crop at the left**, bleeding off the card's left edge, ≈ 40 % of the card width
- **one narrative sentence** at the right, 1–3 lines, in a lighter pink
- a **hairline rule with a rose diamond** at its centre, separating story from reward
- **reward lines**, each `icon + name + green value`, right-aligned as a group. A second,
  gold line appears for bonuses (`CG Bonus +20%`).

The whole list scrolls. Tapping outside dismisses it.

Two things to copy exactly:

1. **The reward is never in the sentence.** The sentence is flavour; the value is a separate,
   iconed, coloured line below a rule. Everkai currently writes
   `If dated, Charlotte gains 1,627 points (1,421 base · storage capped).`
2. **`Total Dates: 11`** is the only summary. There is no "you earned 14,300 points in total"
   line — the cards carry the numbers.

## The Date Point counter

On the roster footer (spec 01), `DP: 11/11` becomes a **countdown in the same slot**
(`29:55`) once spent. One field, two modes, no label change, no extra line.

## The date reader

A date can trigger a story. The reader is:

**New Story title card** — the roster stays visible behind a black letterbox; a pink
double-heart `New Story` wordmark animates in; a `SKIP ▶` button appears top-right (rounded,
translucent, ≈ 130 × 44).

**Scene** — a horizontal art band across the middle third, black bars above and below, and a
caption bar under the art with the line centred in serif type. Tapping advances.

**Dialogue** — portrait bust bottom-left, a name plate above the text box
(`Private Village` — the player's own village name is the speaker), the line in the box, and
a small `˅` advance caret at the bottom centre.

**`New CG Unlocked`** — an orange ribbon banner over a black scrim, a framed square thumbnail
of the CG beneath it, the CG's title in gold under the frame (`Sweet Morning`, `White Trap`),
and `Tap to continue` centred. It queues: several fire in sequence after one auto-date run.

## Compared with Everkai

Everkai's date flow lives inside the `Dates` pager page: two buttons
(`Random date · 1 Energy`, `Auto-date · Use 3 Energy`), an energy readout, a portrait stage,
and a results path through `onReadStory`.

| Difference | Kind |
| --- | --- |
| No results screen at all — Everkai applies the rewards and updates the numbers in place | **structural** — this is the missing moment of the Family loop |
| Everkai pre-announces the reward (`If dated, Charlotte gains 1,627 points`); the original reports it afterwards, per date, on a card | **structural** |
| `Random date` has no original counterpart; the original's only date buttons are `Auto Date` (roster) and the two paid Travel journeys (spec 08) | **structural** — keep `Random date` if it is wanted, but it is an addition |
| Everkai's energy is three lines of text; the original is `DP: 11/11` → `29:55` | **cosmetic** (covered in spec 01) |
| Everkai has no CG-unlock moment | **structural** — `FamilyGalleryPanel` has the CGs; nothing announces one |
| Everkai's story reader is a panel; the original's is a full-screen letterboxed VN with a persistent `SKIP` | **structural** |

## What Everkai should render

```
             ╭══════ Auto Date ══════╮
                  Total Dates: 11

 ┌──────────────────────────────────────────────┐
 │ [art] You spent a good time with Otherin     │
 │       ──────────────◇──────────────          │
 │              🌹 Blessing Points  +1,421      │
 └──────────────────────────────────────────────┘
 ┌──────────────────────────────────────────────┐
 │ [art] Shy Jin Yu overcomes her shyness…      │
 │       ──────────────◇──────────────          │
 │              🌹 Blessing Points  +1,627      │
 │                    CG Bonus +20%             │
 └──────────────────────────────────────────────┘
```

Then, per unlocked CG:

```
        ╭══ New CG Unlocked ══╮
             [ thumbnail ]
              Sweet Morning
             Tap to continue
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Per-date result: member, points | `dateReward(game,id)` per date in the auto run | **yes** — but `autoDate` currently returns an aggregate; it needs the per-date list |
| Narrative sentence per result | a pool of date-event lines, keyed by event type | **partially** — `lib/dating.mjs` has date outcomes; the original's flavour sentences are in `WifeDateEvent`/`WifeEvent*` |
| `CG Bonus +n%` | a bonus applied when a date unlocks a CG | **no** |
| Total dates run | count | **yes** |
| CG unlock announcement | which CG the date unlocked | **partially** — the gallery knows what is unlocked, nothing announces the transition |
| `SKIP` in the story reader | — | **no** |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `If dated, Charlotte gains 1,627 points (1,421 base · storage capped).` | a results card per date: sentence, rule, `🌹 Blessing Points +1,627` |
| `Auto-date · Use 3 Energy` | `Auto Date` on the wagon (spec 01); the cost is the DP counter beside it |
| `Natural Energy 3 / 11` + `Tonic reserve: n · spent first` + `Next Energy in 41s` | `DP: 3/11`, becoming a countdown when empty |
| `Date bonuses and Energy` disclosure | the roster's Auto Date `(i)` |
| Silent CG unlocks | the `New CG Unlocked` card, queued |

---

## Resolution (2026-09-25)

| Difference | Outcome |
| --- | --- |
| No results screen at all — Everkai applies the rewards and updates the numbers in place | **Fixed.** `autoDate` returns a per-date `report` and `app/date-results.tsx` draws it: an `Auto Date` ribbon, `Total Dates: n`, one card per date naming the member and what it paid, then the run's total. |
| Everkai pre-announces the reward; the original reports it afterwards, per date | **Fixed.** The card is the report, after the fact. |
| No CG-unlock moment | **Fixed.** Each unlocked picture gets its own `New CG Unlocked` announcement. `discoverDatePicture` has always unlocked pictures on a qualifying date; the only trace was a toast that scrolled past with everything else. |
| `Random date` has no original counterpart | **Deferred.** Removing a control players use is a behaviour change, not a presentation one, and the spec offers no replacement for it. |
| Energy as three lines of text | **Covered by spec 01**, not here. |
| The story reader is a panel, not a full-screen VN with `SKIP` | **Deferred.** A reader rebuild is its own slice. |

**The report rides on the result, never the state.** Nothing new is stored, no validator sees it, and
no save is affected — which is why this needed no migration despite touching a live action.

A field-name trap worth recording, and the reason one of the tests exists: `discoverDatePicture` sets
**`pictureDiscovered`**, not `picture`. Reading the wrong key gives a report where every row says "no
CG" and looks entirely correct. The test pins both the right field and the absence of the wrong one.
