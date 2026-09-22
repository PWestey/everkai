# 03 · Upgrade (the default section) and Limit Break

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/upgrade-below-cap.png`, `img/upgrade-lr-atcap.png`,
`img/upgrade-ssr-atcap.png`, `img/limit-break.png`

## The key finding

**Upgrade is not a panel.** Tapping `Upgrade` in the dock closes whatever panel is open
and returns to the bare shell. The shell *is* the Upgrade screen: art, stat block, and
one primary action. Confirmed on two fellows — tapping `Upgrade` from the bare shell is a
no-op.

So the most-used screen in the whole Fellow surface has **zero explanatory text** and
exactly **two controls**: a quantity selector and a button.

## Below cap — level up

From `img/upgrade-below-cap.png` (Arake, R, Lv. 1 of a higher cap):

```
 POW 1,023,065 (i)
 Lv. 1 ▓░░░░░░░░░░░░           [ Quick | x1 | x10 |▐x100▐ ]
 ✦ Aptitude 119                ┌────────────────────────┐
 🏠 Earnings + 101.4M/s        │      Upgrade x99       │
                               │   EXP 24.43M/71.16K    │
                               └────────────────────────┘
```

- **Level bar** — blue fill, partial. At cap it turns gold and full (both at-cap captures).
- **Quantity selector** — 4 segments, ~52 px each, right-aligned, sitting 40 px above the
  button and the same total width. Selected segment: gold fill, dark text. Unselected:
  brown fill, cream text. `Quick` is leftmost.
- **Primary button** — green, ~200 × 50, two lines:
  - line 1, large: `Upgrade x99` — the verb and the **actual** count, clamped to what is
    affordable. `x100` was selected; 99 levels remained to the cap, so it reads `x99`.
  - line 2, small, inside the button: a currency glyph then `have/cost` —
    `EXP 24.43M/71.16K`. The *have* number is dimmed green here (sufficient).

The clamping is the whole trick. The player picks an intent (`x100`), and the button
tells them the truth about what will happen. There is no "you can only afford 23" message
anywhere — see the Operation screen, where the same selector renders `Upgrade x23`.

## At cap — Limit Break

Both at-cap captures replace the quantity selector + green button with a single
**gold/orange** button reading `Limit Break`, same slot, same size. The level bar is full
and gold. Nothing else changes.

Colour is carrying the meaning: green = the ordinary repeatable action, gold = the
tier-advancing one.

## Limit Break dialog

Centred dialog, cream, shield-X top-right. From `img/limit-break.png`:

```
            Limit Break
         ┌─────────────┐
         │  card art   │        ~150 × 210 rarity-framed portrait
         └─────────────┘
        ( Level Cap 600 » 650 )   pill, cream, the new value in green
        ( Aptitude +50 » +55  )   pill
   ─────◇ Required Items ◇─────
        [▣0/1] [▣0/1] [▣0/1]      three 76 px item tiles
        ┌───────────────────┐
        │    Limit Break    │     green, centred
        └───────────────────┘
```

- The two outcome pills use `»` (a double chevron), not an arrow or the word "to".
  Old value in the body colour, new value in **green**.
- Item tiles: art on a red ground when you lack the item, gold-cornered; count `0/1`
  bottom-right of the tile. The red framing *is* the insufficiency message.
- The button stays green and tappable-looking even when the requirement is unmet — the
  failure is communicated by the tiles, not by disabling.

## Comparison with Everkai

Everkai's Level page (`03_fellow_level_rissette.png`):

```
Fellow EXP: 1,000,000,000,000
[ Train up to 1 · +0 → Lv. 100 · 0 EXP ]  [ Train up to 5 · +0 → Lv. 100 · 0 EXP ]
[ Train max · +0 → Lv. 100 · 0 EXP ]
```

| # | Difference | Kind |
| --- | --- | --- |
| U1 | Everkai renders **three separate buttons**, each carrying its own full sentence. The original has **one** button plus a 4-segment selector. Three buttons × ~40 characters each = 120 characters where the original uses ~25. | **structural** |
| U2 | Everkai has no level bar. The original's partial-blue / full-gold bar is how a player knows at a glance whether this fellow is capped — the thing that decides whether they should be here at all. | **structural** |
| U3 | Everkai's currency is a standalone line `Fellow EXP: 1,000,000,000,000` above the buttons, spelled out in full. The original puts `have/cost` inside the button, abbreviated. | **structural** |
| U4 | Everkai's button text bakes in the preview (`+0 → Lv. 100 · 0 EXP`); the original's button carries only verb + count + cost, and shows nothing when the action is a no-op. Everkai's buttons here read `+0` and `0 EXP` — they are already maxed but still rendered as live buttons. | **structural** |
| U5 | Everkai has no Limit Break at all: `Level limit 100` is a read-only tile on the Overview page. | **structural** (see `docs/character-systems-gap.md`) |
| U6 | Everkai's quantities are 1 / 5 / max; the original's are Quick / x1 / x10 / x100. Adopt the original's, including `Quick`. | cosmetic |

## What Everkai should render

**Upgrade section = the bare shell.** No panel, no heading.

Below cap:

```
[ Quick | x1 | x10 | x100 ]
┌────────────────────────┐
│      Upgrade x99       │   green
│    EXP 24.43M/71.16K   │   have green if sufficient, red if not
└────────────────────────┘
```

At cap:

```
┌────────────────────────┐
│      Limit  Break      │   gold
└────────────────────────┘
```

Rules:
- The count in the verb is `min(selected, affordable, levelsToCap)`.
- If that count is 0, the button is inert and grey — do not render `Upgrade x0`.
- Abbreviate both sides of `have/cost` with the same abbreviator used for Earnings.
- The level bar is blue-partial below cap, gold-full at cap.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Levels to cap | level, cap | yes |
| Affordable count | EXP held, cost curve | yes — `fellow-training.tsx` already computes it for `Train max` |
| Level bar fill | level / cap | yes |
| Limit Break outcomes | next cap, aptitude delta | **no** — needs the limit-break table |
| Limit Break materials | 3 item ids + counts | **no** |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Fellow EXP: 1,000,000,000,000` line | `EXP 24.43M/71.16K` inside the button, abbreviated |
| `Train up to 1 · +0 → Lv. 100 · 0 EXP` (×3 buttons) | one button `Upgrade xN` + the 4-segment selector |
| `Level limit 100` tile on Overview | the gold level bar at cap, and the Limit Break button |
| Any "you don't have enough EXP" phrasing | the have-number turning red |
