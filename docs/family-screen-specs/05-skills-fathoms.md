# 05 · Skills → Skill tab (Fathoms)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/skills-rail.png`, `img/skills-rail-scrolled.png`, `img/skills-rail-locked.png`,
`img/skills-rules-tooltip.png`

Dock position **3**, on every member. Serves manifest heading 6 (*Family Skills*). Tables:
`WifeQuenchingUnlock`, `WifeQuenchingWight`, `WifeQuenchingConsume`. Everkai:
`lib/fathoms.mjs`, `app/fathom-panel.tsx`.

**The `Skills` dock tab has two sub-tabs**, drawn as **folder tabs above the sheet's top
edge**, left-aligned, ≈ 120 × 50 each: `Skill` and `Latency`. The selected one is lighter and
sits flush with the sheet; the unselected one is darker and set back. A red dot badge can sit
on either tab. Latency is spec 06.

## Layout

The tallest sheet on the surface — top edge y ≈ 545 (the folder tabs sit at y ≈ 500–545).

```
      ┌ Skill ┐┌Latency┐
 ┌────┴───────┴┴───────┴──────────────────────────  ✕ ┐
 │               Building Earnings                     │  two-line centred title
 │                    Bonus                            │
 │ ┌─────────────────────────────────────────────────┐ │
 │ │🏠 ♪+257%  ☀+255%  ⚔+260%  📖+261%  🕊+258%      │ │  totals strip, 5 class chips
 │ └─────────────────────────────────────────────────┘ │
 │ ┌─────────────────────────────────────────────────┐ │
 │ │          (📖)      (♪)                    ┌───┐ │ │  above-rail slots
 │ │         +20%      +20%                    │hex│ │ │
 │ │ ╭──╮      ▾        ▾                      │+20%│ │ │
 │ │ │♥ │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┥   │ │ │  the rail (pink)
 │ │ │137│     ▴        ▴        ▴             └───┘ │ │
 │ │ │10 │   (☀)      (⚔)      (🕊)                  │ │  below-rail slots
 │ │ ╰──╯   +21%     +21%     +21%                   │ │
 │ └─────────────────────────────────────────────────┘ │  ← scrolls horizontally
 │ ┌─────────────────────────────────────────────────┐ │
 │ │(☀) Diligent Type                            (i) │ │  selected-slot detail
 │ │    Diligent Building Earnings Bonus+21%         │ │  green
 │ ├─────────────────────────────────────────────────┤ │
 │ │      Success Rate: 35%   Success Rate: 0.32%    │ │
 │ │ (A)  ┌────────────┐      ┌────────────┐         │ │
 │ │Auto  │  Advanced  │      │   Fathom   │         │ │  two greens, side by side
 │ │Fathom│  🎫 134/1  │      │ 🪙4.6aa/20 │         │ │
 │ │      └────────────┘      └────────────┘         │ │
 │ └─────────────────────────────────────────────────┘ │
 └─────────────────────────────────────────────────────┘
```

## The totals strip

A single rounded bar: a house glyph at the far left (meaning "building earnings"), then five
`icon +N%` chips, one per class, in the fixed order **Inspiring, Diligent, Brave, Informed,
Unfettered**. The icons are the same five class medallions used on the Fellow roster's filter
bar. **These are the totals for this member's slots only** — the account-wide version is the
roster's `Skill Bonus` overlay (spec 12).

## The rail

A horizontal **pink/magenta bar** running the panel's full width and beyond, scrollable left
and right. At its left end, a heart medallion on a dark plaque carrying the member's
**Intimacy** (`13710`) — the thing that unlocks slots, drawn as the rail's origin.

Slots hang off the rail alternately above and below, connected by small grey ▾/▴ chevrons, in
a repeating **six-slot cycle**: the five class medallions plus one hexagonal rainbow "all
buildings" medallion. That matches the measured cycle (`buildingCountry` 2, 4, 3, 1, 5, 0)
and 36 slots total.

| Slot state | Drawing | Label pill |
| --- | --- | --- |
| High tier | full-colour medallion, gold ring on the selected one | `+21%` on a dark pill |
| Low tier | the **same medallion desaturated to grey**, orange dot badge | `+1%` |
| Locked | pale medallion, small **gold padlock** corner badge | `♥ 150` — the Intimacy gate |

**The rail's own fill is the progress bar.** It is pink up to the last unlocked slot and
grey/brown beyond it. That single detail replaces "12 of 36 open".

Convention 15 in action: a locked slot is the same medallion with one badge swapped and one
pill swapped. Nothing disappears, nothing is explained.

## The detail card

One row for the selected slot: its medallion at left, the slot's **type name** (`Diligent
Type`) in brown bold, the effect in **green** (`Diligent Building Earnings Bonus+21%`), and a
`(i)` at the right edge.

The `(i)` is the mechanic, verbatim:

> *When using Gold to Fathom skills, the higher the bonus is, the lower the success rate will
> be. The cost of Gold will increase when fathoming the same skill multiple times.*
>
> *When using Luck Stone to Fathom skills, you can get at least a +20% bonus and above. The
> cost of Luck Stones remains the same every time.*

**That second paragraph is new information.** It says Advanced Fathoms **floor at +20%** —
"you can get at least a +20% bonus and above" — not merely that they draw from a
better-weighted column. `docs/character-systems-gap.md` §3.3 derived the 35 % figure as
`Σ WeightHigh above tier 21 ÷ Σ WeightHigh`, which is consistent with a `WeightHigh` column
that is **zero below tier 20**. Check that before implementing: if `WeightHigh` is 0 for
tiers 1–19, then an Advanced Fathom on a fresh slot is a guaranteed jump to at least +20%,
and `lib/fathoms.mjs` must not roll below it. This materially changes early pacing.

## The action row

Three controls on one line:

1. **`Auto Fathom`** at the left — a circled `A` badge with the label beneath, styled like a
   rail icon rather than a button. A spend automation; not touched.
2. **`Advanced`** — green, with `Success Rate: 35%` printed **above** it in green, and the
   cost inside it: ticket icon, `134/1`. Have in green (affordable).
3. **`Fathom`** — green, `Success Rate: 0.32%` above, cost inside: coin icon, `4.601aa/20`.

Two primaries side by side, same size, same colour, distinguished only by their rate and
their currency. The original does not mark one "recommended". The rates change as you select
different slots — on a +1% slot they read `100%` and `92%`.

## Compared with Everkai

`app/fathom-panel.tsx` (56 lines) already models everything: 36 slots, the cycle, tiers,
gates, both roll routes, the gold ladder, the Luck Stone cost, and a `Practise` action that
is Everkai's own free/certain addition.

| Difference | Kind |
| --- | --- |
| Everkai draws a **6×6 grid of tiles**; the original draws a **horizontal rail** anchored on the Intimacy medallion | **structural** — the rail is what makes Intimacy legible as the gate |
| Everkai has a separate `Open n/36` progress meter and a `n practice left today` dot row; the original encodes openness in the rail's own fill and has no daily allowance at all | **structural** |
| Everkai's locked tile shows a padlock and the gate in the *detail* line (`Opens at Intimacy 1,500`); the original prints `♥ 150` **on the tile** | **cosmetic**, but it is convention 8 |
| Everkai's low-tier tiles are the same colour as high-tier with a `--fill` CSS variable; the original desaturates the art itself | **cosmetic** |
| Everkai has three actions (`Practise`, `Gold Fathom`, `Advanced Fathom`); the original has two plus an automation toggle | **structural** — `Practise` is a deliberate Everkai addition (free, certain, habit-paced) and should stay, but it should look like the third button, not like the primary |
| Everkai prints the rate in a sentence (`Gold · 0.32% chance of something better · 4,601 gold`); the original prints `Success Rate: 0.32%` above the button and the cost inside it | **cosmetic** |
| Everkai has no per-member class totals strip | **structural**, trivial — `fathomBonus()` exists |
| Everkai has no `Auto Fathom` | **structural**, and probably should not have one |
| 268-word `rules-note` in three paragraphs against a two-paragraph `(i)` | **cosmetic** by mechanism, the biggest single prose block on the Family surface by volume |

## What Everkai should render

```
 ┌ Skill ┐┌ Latency ┐
─┴───────┴┴─────────┴─────────────────────────────── ✕

              Building Earnings
                    Bonus
 🏠  ♪+257%   ☀+255%   ⚔+260%   📖+261%   🕊+258%

        (📖)     (♪)                       ┌────┐
        +20%    +20%                       │ ⬡  │
 ╭───╮    ▾       ▾                        │+20%│
 │ ♥ │━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┥    │
 │137│    ▴       ▴       ▴                └────┘
 │10 │  (☀)     (⚔)     (🕊)      (🔒)
 ╰───╯  +21%    +21%    +21%      ♥150

 (☀) Diligent Type                                (i)
     Diligent Building Earnings Bonus+21%

        Success Rate: 35%    Success Rate: 0.32%
 (A)    [ Advanced      ]    [ Fathom        ]    [ Practise ]
 Auto   [ 🎫 134/1      ]    [ 🪙 4.6aa/20   ]
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| 36 slots, cycle, type | `FATHOM_SLOTS` | **yes** |
| Tier per slot, `+N%` | `slotTier`, `FATHOM_STEPS` | **yes** |
| Intimacy gate per slot | `slot.intimacy` | **yes** |
| Rail fill boundary | `openSlots()` | **yes** |
| Per-class member totals | per-member sum (Everkai's `fathomBonus` is family-wide) | **partially** — needs a per-member variant |
| Success rates for both routes | `FATHOM_STEPS[tier].rateNormal/rateHigh` | **yes** |
| Costs for both routes | `fathomRollQuote` | **yes** |
| Advanced floor at +20% | `WeightHigh` distribution | **verify** — see above |
| Auto Fathom | — | **no**, and not recommended |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Open 12/36` meter + the practice dot row + `3 practice left today` | the rail's own pink/grey fill, and the practice count as a small badge on the `Practise` button |
| `Fathom 7 · Diligent · Tier 21/25 · +21% earnings → +22%` (the detail `<small>`) | `(☀) Diligent Type` over `Diligent Building Earnings Bonus+21%` in green |
| `Opens at Intimacy 1,500` / `Opens after 240 more habit actions` | `♥ 1500` printed on the tile |
| `Draw the tier table and keep the result only if it beats the +21% held. Rolled 14 times (3 advanced).` | nothing on screen; the `(i)` carries the rule in the original's own two sentences |
| `Gold · 0.32% chance of something better · 4,601 gold` | `Success Rate: 0.32%` above a `Fathom` button with `🪙 4.6aa/20` inside it |
| `Advanced · 35% chance of something better · 1 Luck Stone · 134 held` | `Success Rate: 35%` above an `Advanced` button with `🎫 134/1` inside it |
| The whole 268-word three-paragraph `rules-note` | the two-paragraph `(i)`, quoted verbatim above, plus a line about `Practise` being Everkai's own |
| The `fathomsApply(id)` empty state — 46 words beginning *"Fathoms are the village's own quenching tradition…"* | a rail with every slot locked and the first gate pill showing, or simply no `Skills` tab for that member (the original drops tabs it cannot fill — see spec 02) |
