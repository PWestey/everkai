# 07 · Blessing ("Fixed Blessed Fellow")

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/blessing.png`, `img/blessing-unaffordable.png`

Dock position **4**, on every member. Tables: `WifeBless` (798 rows, `wifeid → heroid`),
`WifeBlessBreak`, `WifeCustomBless`. Everkai: `lib/blessings.mjs`, `app/blessing-panel.tsx`.

## Layout

Half sheet, top edge y ≈ 545, `✕` tab top-right. **No sub-tabs.**

```
 ┌ ◇◇  Fixed Blessed Fellow  ◇◇                       ✕ ┐
 │                                                       │
 │                  (◉)   (◉)                            │  portrait circles, d ≈ 100
 │                 POW+4.2K POW+5.1K                     │  badge beneath, green value
 │                                                       │
 │ ┌───────────────────────────────────────────────────┐ │
 │ │ Fellow Blessing  Lv.1     [Quick| x1 |x10| x100 ] │ │  name gold, selector right
 │ │ Blessed Fellow Power+1K        ┌────────────────┐ │ │
 │ │ (Next Level +1.7K)             │  Upgrade x70  •│ │ │  green, ready dot badge
 │ │                                │  🌹 72.64K/70.5K│ │ │  have GREEN if affordable
 │ └───────────────────────────────────────────────────┘ │
 │ ┌───────────────────────────────────────────────────┐ │
 │ │ Advanced Blessing  Lv.1   [Quick| x1 |x10| x100 ] │ │
 │ │ Blessed Fellow Power+0.5%      ┌────────────────┐ │ │
 │ │ (Next Level +1%)               │  Upgrade x1   •│ │ │
 │ │                                │  🌹 72.64K/500  │ │ │
 │ └───────────────────────────────────────────────────┘ │
 │                                                       │
 │              (fixed height — blank below)             │  does not scroll
 └───────────────────────────────────────────────────────┘
```

## The blessed-Fellow row

A centred row of circular Fellow portraits, `d ≈ 100`, each inside a **glowing coloured ring**
whose hue tracks that Fellow's rarity. Under each, a small pill badge: a `POW` glyph and the
Power this member's blessings currently grant that Fellow, in green (`+296M`, `+4.244K`,
`+5.051K`).

**The count varies per member.** One portrait on one member, two on another, four on an
unjoined preview. `WifeBless.json`'s 798 `wifeid → heroid` rows are that list. The portraits
are inert — they are a statement of *who*, and the badge is the statement of *how much*.

The title `Fixed Blessed Fellow` implies a non-fixed counterpart. The Fellow screen has a
`Custom Blessings` tab; `WifeCustomBless.json` exists (45 rows) and gates on
`wifeSpiriteUnlockLevel` and `wifeRarityCondiction: 6`. No member on this save clears it, so
the Family Blessing panel showed **no tabs at all** on all three members tested. Do not build
a Custom tab from this evidence.

## The upgrade rows

Two, identical in shape, differing only in name and unit.

| Part | Treatment |
| --- | --- |
| Header line | skill name + `Lv. n` in gold, left; the 4-segment quantity selector right-aligned on the **same line** |
| Effect | `Blessed Fellow Power+1K` in brown, left |
| Next | `(Next Level +1.7K)` in green, on its own line beneath |
| Action | green `Upgrade xN`, right, with the cost inside on a smaller second line |
| Badge | a small orange dot on the button's top-right corner when it can be pressed |

**The selector is per row, not per screen.** In the capture, row 1 has `x100` selected and
row 2 has `x1`. Each row remembers its own intent.

**The button clamps.** `x100` selected, `Upgrade x70` on the button, `72.64K/70.53K` beneath
— the player holds 72.64K Blessing Points and 70 levels is what that buys. Nothing says so.
Convention 4, the same demonstration as the Fellow Operation panel.

**Have/cost colour.** Affordable: `72.64K` green. Unaffordable (the low-intimacy member):
`0/100` with the `0` red. That is the whole unaffordable state — same button, same verb, one
number in red.

## Why this matters: the loop closes here

The Blessing Power medallion tooltip (spec 02) says it: Blessing Power → more Blessing Points
per date → Blessing upgrades → **Fellow** Power. Together with Bonds (the rung's own
`Shinobu's (Fellow) Power +50%`, spec 04) and Family Stella (`Power of Blessed Fellow +150%`,
spec 03), **three of the five Family sections pay the Fellows this member blesses.** The
portrait row at the top of this panel is the only picture of that relationship anywhere in
the UI, which is why it is the panel's masthead rather than a footnote.

## Compared with Everkai

`app/blessing-panel.tsx` renders `<h2>Fellow blessings</h2>`, a Blessing Points line, a names
line (`Blesses Rissette, Orivita`), then one `blessing-row` per entry of `BLESSINGS` with a
`<h3>{name} · Lv. {level}</h3>`, a value line, an `Improve · n Blessing Points` button and an
`Improve n levels · n points` button, plus a `Special Blessing` section and a 105-word
`rules-note`.

| Difference | Kind |
| --- | --- |
| Everkai names the blessed Fellows in text (`Blesses Rissette, Orivita`); the original draws their portraits with a `POW +n` badge each | **structural** — the single highest-value change on this screen |
| Everkai has no per-Fellow attribution of the Power granted; the original puts it under each portrait | **structural** |
| Two buttons per row (`Improve · 1,200 points` and `Improve 70 levels · 84,000 points`); the original has one selector and one clamping button | **structural** |
| Everkai puts the cost in the button *label*; the original puts it inside the button on a second line, with the have number too | **cosmetic** |
| Everkai has no `(Next Level …)` preview; it prints `+1,000 Power → +1,700 Power` inline | **cosmetic** — both are convention-1 compliant, the original's is terser |
| Everkai's `Special Blessing` section has no counterpart in this capture | **unknown** — `WifeCustomBless` is rarity-gated; leave Everkai's as is and note it |
| Everkai prints `Blessing Points: 72,640` as a separate line; the original folds it into the cost inside the button | **cosmetic** |
| The panel scrolls in Everkai (Special Blessing, legacy-recipient notes); the original's is a fixed two-row sheet | **cosmetic** |

## What Everkai should render

```
◇◇ Fixed Blessed Fellow ◇◇                            ✕

              (◉ Rissette)   (◉ Orivita)
               POW +4.244K    POW +5.051K

 Fellow Blessing  Lv.1        [ Quick | x1 | x10 | x100 ]
 Blessed Fellow Power+1K            [ Upgrade x70      ]
 (Next Level +1.7K)                 [ 🌹 72.64K/70.53K ]

 Advanced Blessing  Lv.1      [ Quick | x1 | x10 | x100 ]
 Blessed Fellow Power+0.5%          [ Upgrade x1       ]
 (Next Level +1%)                   [ 🌹 72.64K/500    ]
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Blessed Fellow list | `blessingRecipients(game,id)` | **yes** |
| Per-Fellow portrait | Fellow art, rarity ring colour | **yes** |
| Per-Fellow `POW +n` from this member | the Power this member's blessings grant *that* Fellow | **derivable** — `blessingValue` is per member, not per recipient; splitting it is arithmetic, not new data |
| Skill name + level | `BLESSINGS[key].name`, `blessingLevel` | **yes** |
| Current + next value | `blessingValue`, `nextBlessingValue` | **yes** |
| Clamped buy count | `blessingPlan(f,key,game,700,id).count` | **yes** — it already computes the max affordable |
| Cost + have | `nextBlessingCost`, `f.points` | **yes** |
| Per-row selector state | — | **no** — one piece of local state per row |

Everything needed is already computed. This section is presentation only.

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Blessing Points: 72,640` | the have number inside each `Upgrade` button |
| `Blesses Rissette, Orivita` | two portraits with `POW +4.244K` / `POW +5.051K` beneath |
| `No pairings yet.` | an empty portrait slot — a grey silhouette in a circular frame (Fellow convention 9) |
| `Retained +1,000 Power for Rissette. New gains follow the APK list above.` | delete from the UI; it is a save-migration note. If it must be surfaced, the portrait of a legacy recipient can carry a muted ring. |
| `Improve · 1,200 Blessing Points` + `Improve 70 levels · 84,000 points` (two buttons) | `[Quick|x1|x10|x100]` plus one `Upgrade x70` with `🌹 72.64K/70.53K` inside |
| `Last enabled level reached` | an inert `Max` pill (convention 7) |
| `Recruit a listed Fellow to activate their bonus. Training is retained for Fellows who join later.` | a desaturated portrait for an unrecruited Fellow, and nothing else |
| `Blessings for this companion follow the classic ladder — 36 Fellow Blessing and 24 Advanced Blessing levels — in both growth modes…` (`management-hint`, 42 words) | the `Lv. n` on each row and the `(Next Level …)` line |
| The 105-word `rules-note` on classic rules, APK growth, rounding, source mode and waived unlocks | an `(i)` on the panel header, if anything at all. The original's Blessing panel has **no `(i)`**; every rule it needs is in the header's `(i)` on the roster. |
