# 10 · Equipment slots — Familiar and Artifact

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/familiar-select.png`, `img/artifact.png`,
`img/upgrade-below-cap.png` (both slots empty)

Two 76 px square tiles stacked on the right rail beneath the Blessing button. The upper
is the **familiar**, the lower the **artifact**. Each tile shows the equipped thing's art
with its level on a strip across the tile's foot (`Lv. 249`, `Lv. 104`).

**Empty tile:** a large `✚` on a brown ground with a **small red dot badge** at the
top-right — the badge meaning "you own something that could go here". Both tiles on the
R fellow were empty and badged. No caption, no "no familiar equipped" text.

## Select Familiar (a centred dialog)

```
 ┌            Select Familiar                 ✕ ┐
 │ ┌──────────────────────────────────────────┐ │
 │ │ [SSR art]  lv.249  Shibataro   [Unbind]  │ │  currently bound, on a raised band
 │ │            POW +0                        │ │
 │ └──────────────────────────────────────────┘ │
 │ ─────────────────────────────────────────── │
 │ ┌──────────────────────────────────────────┐ │
 │ │ [art]  lv.249  Treeraffe   Free Attempts:2│ │  red
 │ │        POW +0 ▬▬▬▬         [  Equip  ]   │ │  green
 │ └──────────────────────────────────────────┘ │
 │ ┌──────────────────────────────────────────┐ │
 │ │ [art]  lv.249  Snowbear    Free Attempts:2│ │
 │ │        POW +0 ▬▬▬▬         [  Swap   ]   │ │
 │ └──────────────────────────────────────────┘ │
 │   … Umbranther, Grandstag …                  │
 └──────────────────────────────────────────────┘
```

- The **bound** familiar sits at the top on its own raised band, separated by a rule, with
  an **orange `Unbind`** button. Orange = the destructive-ish counterpart to green.
- Each candidate row: a ~100 px art tile with a rarity frame, a **star count badge**
  (`5★`) at its lower-left, and a **small circular portrait of the fellow currently
  holding it** overlapping its upper-right. That overlay is how you see, at a glance, that
  taking this familiar costs another fellow theirs.
- Then `lv.NNN` and the name, a `POW +0` pill over a progress bar, `Free Attempts: 2` in
  red, and a green action button.
- The verb differs by context: **`Equip`** for the first free candidate, **`Swap`** for
  ones already bound elsewhere. Same colour, different word — the word carries the
  consequence.

## Artifact (a centred dialog)

```
 ┌                 Artifact                   ✕ ┐
 │ ┌──────────────────────────────────────────┐ │
 │ │ ⬡UR ◆ POW 351,021,325                    │ │  banner across the art's top
 │ │                                          │ │
 │ │            [ artifact art ]              │ │
 │ │                                          │ │
 │ │      Lv.104 │ Giyu Tomioka's Nichirin    │ │  nameplate over the art's foot
 │ │             │ Sword                      │ │
 │ ├────────────┬─────────────┬───────────────┤ │
 │ │ 📖 10/10   │   ✦ +781    │  🍃 Lv. 0 (i) │ │  3-cell stat strip
 │ │ POW +170%  │             │               │ │
 │ └────────────┴─────────────┴───────────────┘ │
 │  [Unequip]   [  Change  ]   [  Enhance  ]    │
 └──────────────────────────────────────────────┘
```

- The whole artifact is presented as **one large art card**, ~570 × 450, with the rarity
  badge and total Power laid over its top edge and the level + name over its foot. The
  art is the subject; the numbers ride on it.
- Beneath, a **3-cell stat strip** — class affinity `10/10` with `POW +170%`,
  aptitude `+781`, and a third stat at `Lv. 0` with an `(i)`. Cells are equal width,
  divided by hairlines.
- **Three actions, three treatments**: `Unequip` is a small icon-plus-caption button at
  the left (de-emphasised), `Change` is green (the ordinary action), `Enhance` is orange
  (the progression action). Size and colour rank them without any explanatory text.

## Comparison with Everkai

Everkai has `familiar-panel.tsx`, `familiar-node-panel.tsx`, `equipment-shelf.tsx` and an
`Equipment` page in the fellow pager (`05_fellow_equipment_rissette.png`).

| # | Difference | Kind |
| --- | --- | --- |
| E1 | Everkai reaches equipment through a pager page; the original puts two always-visible tiles on the rail, so the equipped items are part of the fellow's portrait at all times. | **structural** |
| E2 | Everkai's familiar binding uses a `NativeSelect` dropdown of fellow names plus `Bind Fellow · Free` / `Unbind` buttons and a 40-word rules note. The original uses a scrolling list of art cards where each row shows who currently holds the item. | **structural** |
| E3 | The original's candidate rows show the **current holder's portrait** on the item art. Everkai has no equivalent, so a player cannot see the cost of a swap without leaving the screen. | **structural** |
| E4 | `Equip` vs `Swap` as distinct verbs for free vs contested items — Everkai uses one verb. | cosmetic but valuable |
| E5 | The original's artifact view is art-first with numbers overlaid; Everkai's equipment page is a list. | **structural** |
| E6 | The original's empty slot is a `✚` tile with a red dot; Everkai writes "no equipment". | cosmetic |
| E7 | Everkai's `About these rules` on the familiar panel ("Level and star nodes use public reference values. Activation and rebinding are free sandbox choices…") has no original counterpart on this screen. | **structural** |

## What Everkai should render

**On the rail:** two square tiles, art + `Lv.N` strip, or `✚` + red dot when empty.

**Familiar dialog:** bound item on a raised band with an orange `Unbind`; then a scrolling
list of candidates, each with art (rarity frame, star badge, holder portrait overlay),
level, name, a stat pill, and a green `Equip`/`Swap`.

**Artifact dialog:** one large art card with rarity + power over the top and level + name
over the foot; a 3-cell stat strip; `Unequip` (small) / `Change` (green) / `Enhance`
(orange).

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Equipped familiar + level | id, level | yes |
| Equipped artifact + level | id, level | yes |
| Candidate familiars | owned list | yes |
| Current holder of each candidate | fellow id per familiar | yes — `bindFamiliar` already tracks it |
| Star count per familiar | stars | yes |
| Artifact power / affinity / aptitude | the 3 stat cells | **partially** — Everkai has artifact power and aptitude (`Artifacts+781` appears in the aptitude breakdown); the `10/10` class-affinity cell and the `Lv. 0` third stat need checking against the tables |
| `Free Attempts: N` | a per-item counter | **no** — and this looks like a gacha/reroll counter from the original's monetised loop. Check the tables before importing; under the single-player design rule it may be dropped. |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Base binding bonus applies while bound; activated nodes add to it. One Familiar per Fellow. Rebinding moves its activated bonuses with it.` | the rail tiles (capacity) + the holder portrait on each candidate (consequence) + an `(i)` for the rest |
| `About these rules` on the familiar panel | the `(i)` |
| A `NativeSelect` of fellow names | the art-card candidate list |
| `Bind Fellow · Free` / `Activate all N ready · Free` labels | `Equip` / `Swap`, with the cost inside the button when there is one |
| "No equipment in this slot" | the `✚` tile with a red dot badge |
