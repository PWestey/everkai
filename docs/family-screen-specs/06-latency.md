# 06 · Skills → Latency tab

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/latency.png`, `img/latency-results-tooltip.png`, `img/latency-cap-dialog.png`,
`img/latency-locked.png`

The second sub-tab of the `Skills` dock position. Tables: `WifePotentialLevelUnlock`,
`WifePotentialWeight`. Everkai: `lib/latency.mjs`, `app/latency-panel.tsx`.

## Layout

```
      ┌ Skill ┐┌Latency┐
 ┌────┴───────┴┴───────┴──────────────────────────  ✕ ┐
 │                  Increase                           │  two-line centred title
 │                  Latency                            │
 │ ┌─────────────────────────────────────────┬───┐    │
 │ │ ◇     Latency Cap:  400%                │ ⬆ │    │  bar + gold raise button
 │ └─────────────────────────────────────────┴───┘    │
 │   Stimulate to increase village earnings.           │  ONE sentence. That is all.
 │   Increase the Latency cap to get extra bonuses.    │
 │                                                     │
 │                    ╭────────╮                       │
 │                    │  drop  │                       │  d ≈ 200, on a faint mandala
 │                    │ medal- │                       │  ITS COLOUR IS THE RATE
 │                    │  lion  │                       │
 │                    ╰────────╯                       │
 │        All Building Earnings:  +132%                │  green
 │ ┌─────────────────────────────────────────────────┐ │
 │           (i) Success Rate: 50%                     │  rate text in the rate's colour
 │             ┌─────────────┐      ┌──────┐          │
 │             │  Stimulate  │      │ ☑ ×10│          │  green primary + a checkbox
 │             │  ◈ 134/50   │      └──────┘          │
 │             └─────────────┘                         │
 └─────────────────────────────────────────────────────┘
```

## The cap bar

A wide inset bar with `Latency Cap:  400%` centred on it and a small `◇` at the left, plus a
**gold `⬆` button** clipped to its right end. The bar is not a progress bar — it is a plaque.
The `⬆` opens the cap dialog.

## The drop medallion

A large water-drop shield (≈ 200 px) with a tree/water device inside, centred, on a faint
gold mandala backdrop that fills the sheet. **Its colour is the success-rate quartile**, and
the `(i)` supplies the key. At 50 % it is blue; the `Success Rate: 50%` text beneath is the
same blue. The whole panel is one gauge.

That is convention 14, and it is the reason this screen needs almost no words: the player
learns "blue means the odds got worse" once, from the `(i)`, and thereafter reads it at a
glance.

## `All Building Earnings: +132%`

One line, label in brown, value in green, directly under the medallion. This is the
member's own fill, not the account total. The account total does not appear on this screen.

## The `(i)` — "Possible Results"

A dark popover, two blocks:

```
Fail: No Changes
Success:        +1 %        ← green
Great Success:  +2 %        ← green
Super Success:  +4 %        ← green

              ◇  Success Rate  ◇

Success rate will change when the current bonus
is approaching the cap.
Green: 80%          ← green
Blue: 50%           ← blue
Purple: 25%         ← purple
Multicolor: 10%     ← orange/multicolour
```

Four outcomes named, three of them numbered; then the rate key, each line printed **in its
own colour**. It confirms the measured 80/50/25/10 quartiles and the +1/+2/+4 gains exactly,
and it tells you how to read the art.

Note the wording: *"when the current bonus is approaching the cap"* — the rate is a function
of **fill ratio**, not of absolute level. That matches `WifePotentialWeight`'s
`fillRatioMin`/`fillRatioMax` columns.

## The primary action

Green `Stimulate`, centred-left, cost inside: a stone icon and `134/50`, have in **green**
(affordable). To its right, a small **`☑ ×10` checkbox** — not a segmented selector.

The cost shown (`/50`) is already the ×10 price; ticking the box changes the number in the
cost line, not a separate multiplier field. Everkai should use the standard
`Quick | x1 | x10 | x100` selector here instead (README convention note) — `×10` is the only
multiple the original offers, so render the other segments disabled rather than inventing
prices.

## The cap dialog

The `⬆` opens a parchment dialog, `Increase Latency Cap`:

```
┌ Increase Latency Cap                          ✕ ┐
│ ┌──────────────┬────────────────────────────┐   │
│ │ Latency Cap  │   400%  »  420%            │   │  » gold, new value green
│ ├──────────────┼────────────────────────────┤   │
│ │ Latency Bonus│   Village Earnings+4 %     │   │
│ └──────────────┴────────────────────────────┘   │
│   Increase ♥290 to obtain develop chances       │  290 in magenta
│   Current Develop Chances: 0                    │  0 in red
│            ┌───────────┐                        │
│            │  Improve  │                        │  green
│            └───────────┘                        │
└─────────────────────────────────────────────────┘
```

Two-column label/value table with a darker label cell, then two centred lines, then one green
button. The requirement is stated as an **increment** (`Increase ♥290`), not a target — the
member has 13,710 Intimacy and the next `WifePotentialLevelUnlock` row needs 14,000. That is
a cross-check reproducing the gap doc's measurement exactly.

"Develop chances" is the original's currency for cap raises: Intimacy gained past each
threshold grants one. `0` in red is the whole "you cannot do this yet".

## The locked state

On a member below the Intimacy threshold, the panel keeps its title and its one sentence, and
replaces everything else with:

- the **same drop medallion, fully desaturated to grey**
- one line: `♥ Intimacy reaches 2000 to unlock` — the number in magenta
- a green `Improve` button where `Stimulate` would be

No cap bar, no success rate, no cost. Convention 15: same shape, different badge.

## Compared with Everkai

`app/latency-panel.tsx` ships every rule correctly and shows all of them at once. It renders
a `<h3>`, one stones line, two `training-option` blocks with seven `<p>` between them, two
account-total paragraphs, and a three-paragraph `rules-note`. Measured against the original's
**one sentence plus one `(i)`**, this is the single wordiest screen in Everkai's Family
surface.

| Difference | Kind |
| --- | --- |
| No drop medallion, no colour-coded rate | **structural** — the art *is* the success-rate gauge, and without it every rate must be written out |
| The cap is a `<strong>Cap · level 20/41</strong>` line; the original is a plaque plus a `⬆` | **cosmetic** |
| The cap raise is an inline `Widen to +420%` button; the original is a dialog with an `old » new` table and an explicit chances counter | **structural** |
| Everkai states the requirement as a target with a parenthetical (`needs Intimacy 14,000 (she has 13,710)`); the original states the **increment** (`Increase ♥290`) | **cosmetic**, and the increment is better |
| Everkai has no "develop chances" concept — it gates directly on Intimacy plus one Luck Stone | **structural**; check `WifePotentialLevelUnlock` for whether chances are a stored counter before adding one |
| Two `Stimulate` buttons (`×1` and `×10`) side by side; the original has one button and a `×10` checkbox | **cosmetic** |
| Everkai's locked state is a sentence; the original's is a greyed medallion plus one gate line | **structural** |
| The `×10` unlock is explained in a `small-note` (`The original opens ×10 Stimulate at cap level 20.`); the original just does not show the checkbox | **cosmetic** |
| Everkai prints the account total and an *alternative* account total (`if the original had instead shown one shared bar…`) on the member's panel | **structural** — that belongs in `docs/`, not on a game screen |

## What Everkai should render

```
 ┌ Skill ┐┌ Latency ┐
─┴───────┴┴─────────┴─────────────────────────────── ✕

                  Increase
                  Latency

 ◇      Latency Cap: 400%                      [ ⬆ ]

   Stimulate to increase village earnings.
   Increase the Latency cap to get extra bonuses.

                   ( drop )        ← tinted to the rate quartile
                   ( medal )
                   ( lion  )

        All Building Earnings:  +132%

            (i) Success Rate: 50%          ← text in the same colour

          [ Stimulate ]   [ Quick | x1 | x10 | x100 ]
          [ ◈ 134/50  ]
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Cap %, level | `latencyCap`, `latencyLevel`, `LATENCY_CAP_LEVEL` | **yes** |
| Fill %, member bonus | `latencyCount` | **yes** |
| Success rate + quartile | `latencyWeightRow(fill).success` | **yes** |
| Medallion tint per quartile | 4 colours: green / blue / purple / multicolour | **no** — four CSS tokens and four art states (or one art + a hue filter) |
| Outcome table (+1/+2/+4) | weights | **yes** |
| Stimulate cost + have | `STIMULATE_COST`, `luckStones` | **yes** |
| `×10` gate | `STIMULATE_TEN_X` | **yes** |
| Next cap, next bonus | `latencyNextLevel` | **yes** |
| `Increase ♥n` increment | `next.intimacy - next.have` | **derivable** (Everkai has both halves) |
| Develop chances counter | a stored per-member counter | **no** — verify against `WifePotentialLevelUnlock` before adding |
| Locked gate wording | first row's `intimacy` | **yes** |

## Prose to delete, and what replaces it

Everkai's Latency panel currently carries roughly **410 words**. The original's carries
**19** on the panel plus **41** behind the `(i)`. Delete:

| Delete | Replace with |
| --- | --- |
| `Luck Stones: 134 · earned 1,340 from habit actions at 10 each` | the stone icon and `134/50` inside the `Stimulate` button |
| `Next: +420% · needs Intimacy 14,000 (she has 13,710) and 1 Luck Stone` | the cap dialog: `Latency Cap  400% » 420%` and `Increase ♥290 to obtain develop chances` |
| `The bar is 33.0% full, and the original reads the chance off exactly that: 80% below a quarter full, 50% below half, 25% below three quarters, 10% above` | the medallion's colour, plus the `(i)`'s four-line colour key |
| `A success adds +1%, +2% or +4% at weights 7000 / 2000 / 1000 — a mean of +1.5 points a success. 5 Luck Stones a try.` | the `(i)`'s `Fail: No Changes / Success: +1 % / Great Success: +2 % / Super Success: +4 %` block |
| `The original opens ×10 Stimulate at cap level 20.` | no `×10` segment until it is unlocked |
| `This Latency is full. Widen the cap to keep stimulating.` | the `Stimulate` button becomes an inert `Full` pill (convention 7 — a different word, not a greyed button), and the `⬆` gains the ready badge |
| `Across the whole family: +2,340% village earnings, at every business. The original sums this over every member, so each one you raise raises all seventeen businesses again.` | move to the account-wide overlay (spec 12); on the member's panel show only `All Building Earnings: +132%` |
| `If the original had instead shown one shared bar rather than a per-member sum, the same save would be worth +800% — its largest single member. Everkai pays the sum, which is what the client's own GetAllWifeBuildingPotential computes.` | delete from the UI entirely. It is a research note; it belongs in `docs/character-systems-gap.md`, where it already is. |
| The three-paragraph `rules-note` (41 + 55 + 48 words on the table, on Luck Stone provenance, and on the unmodelled `outputRiseFixed` column) | the `(i)` popover with the original's own two blocks. The Luck Stone provenance and the unmodelled column are project notes, not player-facing rules. |
| `Welcome this family member to open her Latency.` / `Latency is the village's own tradition — the original's Family table has no record for this companion…` (44 words) | the locked state: greyed drop plus `♥ Intimacy reaches 2000 to unlock`. For a member with no table record at all, drop the sub-tab, as the original drops the `Stella` tab. |
