# 06 · Level-Up (the two milestone rails, Advance, Progress Reversion)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/detail-levelup.png` (Lv. 249 — **at the stage cap**, verb reads `Advance`),
`img/detail-levelup-lv1.png` (Lv. 1 — verb reads `Level Up`, with the `☑ ×10` checkbox),
`img/levelup-node-locked.png` (a rail node's tooltip),
`img/levelup-info.png` (the shared `Familiar Attribute` glossary)

Dock position **3** of 4. Serves the hub manifest's heading 2, *Familiar Development*. It
carries a red `!` badge on both captures — the dock icon says "something here is ready".

Tables: **`PetLevel.json`** (499 rows — `Cost`, `ATKcoef`, `HPcoef`, `SPDadd`,
`ExternalAdd` on 99 of them) and **`PetClass.json`** (10 rows — `Cost`, `LevelMax`,
`ATKcoef`, `HPcoef`, `SPDadd`, `PassiveSkillUnlock`), plus `System.PetLevelUPItem` and
`System.PetClassUPItem`, which name the two currencies.

## Two corrections before the layout

**`PetClass` belongs here, not to Awaken.** Its 10 rows are the *stage* ladder —
`LevelMax` is `50 × stage − 1` exactly, giving 49, 99, 149 … 499, and `Pet.ClassMax` is a
constant 10 on all 70 rows. The client reads it in `PanelPetUpgradeStage.lua`
(`zxPetClassConfigs`, `RqUpgradeStage`), which is what this tab's `Advance` button opens.
The index's note that **`PetClass` is not a class or type table and nothing filters on it**
stands and is important; only its attachment to the star ladder was wrong (spec 05).

**`PetBookLevel` is not this tab.** Its 300 rows are the **Handbook / Compendium**
(`UI/Pet/Book/PanelPetBookLevelReward.lua`, `ScenePetBookList.lua`, `Doc/Pet/PetBookInfo.lua`
— `docs/familiar-data-inventory.md` §9), which is a different destination off the hub
(`handbook-familiar-list.png`, `handbook-book-level.png`), and it is parity row **E8**.
Per CLAUDE.md rule 6 it should be named for what it is rather than presented as a growth
curve: **`exp` is the constant 100 on all 300 rows and `PowerCoef.value` is the constant 500
on all 300 rows — only `PowerCoef.Country` varies, cycling 1→5 in 60-row blocks. That is a
flat 30,000-exp ladder paying a fixed coefficient to one country per level, not a curve.**
Nothing on the Level-Up tab reads it.

## Layout

A half panel, top edge ≈ y 535 of 1280 — the same shell as Awaken, band for band.

```
 ┌ ◇  Level Up  ◇                                     ✕ ┐
 │ ┌ 🗡 8053 ┬ ❤ 68801 ┬ 🪶 4046 ┐            [ i ]      │  identical to Awaken's
 │ ╭ (POW)+1.75M  (✦)+128  (%)+80% ╮     [Quick Activate]│  THREE pills on this tab
 │ ┌──────────────────────────────────────────────────┐ │
 │ │   (✦)+4      (✦)+4     (%)🔒      (✦)🔒          │ │  upper rail: levels ≡0 (mod 10)
 │ │                        lv.250     lv.260          │ │
 │ │ (+Lv.249+)━━━━━━━━━━━━━━━━━━━━━━━━━●──────────    │ │  progress bar, pill on the fill
 │ │  (POW)+50K  (POW)+50K  (POW)🔒    (POW)🔒         │ │  lower rail: levels ≡5 (mod 10)
 │ │                        lv.255     lv.265          │ │
 │ └──────────────────────────────────────────────────┘ │
 │                       ☑ × 10                          │  only in the `Level Up` state
 │  ◆                ╭── Advance ──╮ •                   │  • = red "ready" dot
 │ Progress          │  💎 6878/3000 │                   │
 │ Reversion         ╰──────────────╯                    │
 └───────────────────────────────────────────────────────┘
        [Metamorphosis] [Awaken] [Level-Up] [Basic-Info]
```

| Element | Rendering | Notes |
| --- | --- | --- |
| Attribute strip + `(i)` | Byte-for-byte the Awaken tab's | Opens the shared `Familiar Attribute` glossary (spec 05). One component, three call sites. |
| Cumulative capsule | **Three** pills here: a flat-Power medallion, an aptitude star, a Power-% medallion | Exactly the three `addtype`s `PetLevel.ExternalAdd` pays. Awaken's capsule holds two. The capsule is a per-ladder subtotal. |
| `Quick Activate` | Small outlined button, right-aligned | `RqActiveLevelExternalAttrOneKey` — the bulk form of `RqActiveLevelExternalAttr`. No `have/cost` pair, unlike every spend on this panel. Not pressed. |
| Progress bar | One horizontal track across the band, filled to the current level, with a cream `+ Lv. N +` pill riding at the fill's end | At Lv. 249 the fill is nearly complete because 249 **is** the stage-5 cap (`PetClass.LevelMax`). The bar measures progress to the *cap*, not to 499. |
| Upper rail | Medallions **above** the bar, one per milestone at levels ≡ 0 (mod 10) | Aptitude-star glyph mostly; a `%` glyph at some. |
| Lower rail | Medallions **below** the bar, one per milestone at levels ≡ 5 (mod 10) | Always the `POW` shield. |
| Reached node | Full-colour medallion; pill beneath is **dark green with the value** (`+4`, `+50K`) | |
| Unreached node | Desaturated medallion with a **padlock corner badge**; the same pill now reads **`lv.NNN`** | Convention 15 in its purest form: *the pill swaps the reward for the gate.* |
| Selected node | A **gold ring** around the medallion | |
| Node tooltip | A dark translucent box over the rail: the medallion at full size + `Power+50K` | Not a centred modal. It has no dismiss control and no title. |
| `☑ ×10` | A checkbox tile with a green tick and the label `x 10`, centred **above** the button | Present in the `Level Up` state; **absent** in the `Advance` state. |
| Primary button | Green pill, centred, with a **red dot badge** at its top-right when the action is available | Verb and currency both change with state — see below. |
| `Progress Reversion` | Diamond icon with a circular-arrow glyph and a two-line caption, lower **left** | Gold at Lv. 249; dark/greyed at Lv. 1. Same slot and treatment as `Clear` on the Metamorphosis tab. |

## The two milestone rails are one table

`PetLevel.ExternalAdd` is present on **99 of 499 rows** — every fifth level, 5 through 495,
with no gaps. Split by `addtype` (values shown are the table's, for the SSR column):

| Rail | Levels | Rows | `addtype` | Bucket |
| --- | --- | ---: | --- | --- |
| lower (`POW`) | 5, 15, 25 … 495 — i.e. ≡ 5 (mod 10) | 50 | `1` | flat Power |
| upper (star) | 10, 20, 30 … 490, minus the nine below | 40 | `2` | Aptitude |
| upper (`%`) | **50, 100, 150, 200, 250, 300, 350, 400, 450** | 9 | `3` | Power % |

The captures match this row for row: the Lv. 1 familiar shows `lv.5 / lv.15 / lv.25 / lv.35`
on the lower rail and `lv.10 / lv.20 / lv.30` on the upper; the Lv. 249 familiar shows
`lv.255 / lv.265` below and `lv.250 / lv.260` above — **and the `lv.250` medallion is drawn
with a `%` glyph while `lv.260` is a star**, which is precisely the `addtype 3` row at level
250. The nine Power-% milestones land on the first level of each new stage
(`PetClass.LevelMax + 1`), which is why a stage crossing feels like a step rather than a
toll.

**So the rails are not decoration and not a summary — they are `PetLevel.ExternalAdd`
rendered in place, split by bucket onto two sides of the level bar.**

## `Level Up` and `Advance` are one button with two states

| | `Level Up` | `Advance` |
| --- | --- | --- |
| When | level < the current stage's `PetClass.LevelMax` | level == that cap |
| Cost item | a fruit icon — `System.PetLevelUPItem` = `Item_PetLevelUP` | a blue crystal — `System.PetClassUPItem` = `Item_PetClassUP` |
| Cost source | `PetLevel.Cost` (absent on row 1; 50 distinct values across the other 498 — a step ladder, not a per-level curve; 626,190 for 1→499) | `PetClass.Cost` (0, 300, 500, 1000, 2000, 3000, 5000, 7500, 10000, 15000 — 44,300 for the whole ladder) |
| `×10` checkbox | present | **absent** |
| Client | `RqUpgradeLevel`, `GetCostByLevel`, `IsLevelMax` | `RqUpgradeStage`, `CanUpgradeStage`, `GetCostByStage` |
| On press | **not pressed** | **not pressed** |

This is convention 7 in the original's own hands: *a disabled state is a different word.*
Everkai has one verb, `Train +1`, which silently charges both currencies and never stops
(see T2 below).

**What `Advance` opens was not captured, and is not invented here.** The client carries a
separate panel, `UI/Pet/Detail/PanelPetUpgradeStage.lua`, whose identifiers include
`txtCurStage1`, `txtCurStage2`, `txtTarStage1`, `txtTarStage2`, `txtCurLevelMax`,
`txtTarLevelMax` and `zxPetClassConfigs` — i.e. a current-versus-target stage panel that
prints the level cap before and after. That is what exists; its layout is unspecced because
the button is a spend and was deliberately not pressed.

## `Progress Reversion` — what is known and what is not

**Not opened.** The index records why: unlike a cost dialog, it could not be established
from outside whether it confirms first or reverts immediately, and a reversion is
irreversible for the owner's familiar.

What the client says, and nothing more: `CompPetDetailUpgrade.lua` carries
**`CanResetLevelStage`** and **`RqPetReset`** beside `btnReset`. The name pairs level and
stage, so the control reverts **both ladders together**, not the level alone. No refund
table was found in this pass — `docs/familiar-implementation-audit.md` S9 says the same and
the search here did not change it. Everkai's ledger disposition (**DROP until a table turns
up**) should become **DEFER**: the feature demonstrably exists and has a named request; only
its refund arithmetic is unmeasured, and it is server-side.

## Compared with Everkai

Everkai's Level-Up is the first half of the `Training` page (`app/familiar-panel.tsx:36`),
which reads, in full:

> `Level 212 / 450 · Stage 5 · 3 stars`
> `18,400 level-up items · 260 class-up items · 40 fragments`
> `[ Train +1 · 1,240 level-up + 50 class-up ]` `[ Train up to 10 ]`
> `[ Add star · 20 class-up ]`
> `Tower income` · `4,400 + 180 waiting` · `[ Collect tower items ]`

| # | Difference | Kind |
| --- | --- | --- |
| T1 | **The 99 milestones are invisible.** Everkai's level is a number in a sentence; the original draws every fifth level as a node you can tap, with its reward or its gate on it. This is the largest single visual gap on the familiar surface. | **structural** |
| T2 | **Level and stage are one action in Everkai and two in the original.** `lib/familiars.mjs:10` derives `familiarStage = floor(level/50)+1` from the level, and `familiarCap(id)` returns `classes[classMax].LevelMax` = 499 for every familiar, so a familiar trains 1 → 499 without ever stopping; `trainingCost` (`lib/familiar-supplies.mjs`) folds `PetClass.Cost` in as a silent toll at each 50-boundary. The original **caps the level at `PetClass.LevelMax` and requires a separate `Advance`**, with its own currency, its own panel and its own word. A stored stage is also what makes `Progress Reversion` possible; a derived one cannot be reverted. | **structural** |
| T3 | **Two buttons instead of a quantity selector.** `Train +1` / `Train up to 10`. The original uses a `☑ ×10` checkbox above one button. Per the Family README, Everkai should copy *neither* — the 4-segment `Quick \| x1 \| x10 \| x100` is the house standard and the original's checkbox is its own inconsistency. | **structural** (audit D12) |
| T4 | **Everkai's item names are its own field names.** `level-up items` / `class-up items`, printed 28 times across four panels. `System.PetLevelUPItem` and `System.PetClassUPItem` name them `Item_PetLevelUP` / `Item_PetClassUP`, and the capture shows each button carrying **its own icon** — a fruit on `Level Up`, a blue crystal on `Advance`. An icon plus a number replaces the phrase entirely. | **structural** (audit §3.4) |
| T5 | **The per-level bonuses are on the wrong screen**, as `<option>` strings in the bind panel's `<select>` (`app/familiar-node-panel.tsx:15`): `Level 150: +2,400,000 Power, +18 Aptitude`. The original puts them on the rails, on this tab. | **structural** |
| T6 | **No `Quick Activate`.** Everkai's `Activate all N ready · Free` lives on the bind panel and carries a non-cost in its label. | **structural** |
| T7 | **No `Progress Reversion`**, and no stored stage to revert (T2). | **structural** |
| T8 | **The tower-income control is duplicated** — the same `collectFamiliarSupplies` button appears here and on the Tower page (audit D7). The original's Level-Up tab has no income control at all; it is a growth panel, not an economy panel. | **structural** |
| T9 | Cost appended to the verb after a `·` rather than set inside the button on a second line. | cosmetic (audit D11) |
| T10 | Disabled-when-short and disabled-at-max render identically; the original recolours the `have` number and never greys the button. | cosmetic (audit D13) |
| T11 | `Level 212 / 450 · Stage 5 · 3 stars` puts three ladders in one sentence. The original gives each its own tab. | cosmetic once T1/T2 land |

### One thing Everkai already has, and does not know it has

`lib/familiar-node-data.json` carries, per rarity group (`1, 2, 3, 4, 5, 9` — the same six
keys the APK's `ExternalAdd` columns use), **99 `level` nodes and 100 `star` nodes**. It is
marked in `docs/data-provenance.md:91` as *"wiki/community"* with *"Power ordering
explicitly reconstructed"*, and `app/familiar-node-panel.tsx:19` repeats that on screen.

Measured this pass, both halves named (CLAUDE.md rule 1): **all 1,194 node effects across
the six groups match `PetLevel.ExternalAdd` and `PetStar.ExternalAdd1` exactly**, with
`addtype 1→flat`, `2→aptitude`, `3→percent`, `5→finalPercent` and the percent types divided
by 100. Zero mismatches. The `inherent` map matches `Pet.ExternalAdd` by grade exactly too
(grade 4 → flat 500,000 + finalPercent 2, grade 5 → 3,000,000 + 15, and so on for all six).

So the rails need no new data. What they need is a re-import **from the config set** so the
provenance caveat can be deleted rather than restated, and a renderer.

## What Everkai should render

- **The shared shell**: attribute strip, `(i)` onto the nine-row glossary, a cumulative
  capsule with one pill per bucket this ladder pays, `Quick Activate` beside it.
- **One level bar with two rails.** Lower rail: the 50 flat-Power milestones. Upper rail:
  the 40 aptitude and 9 Power-% milestones. Reached nodes coloured with their value; unreached
  greyed with a padlock and `lv.N` in the pill's place; the selected one ringed, with a small
  dark tooltip carrying its icon and effect.
- **One primary button** whose verb is `Level Up` below the cap and `Advance` at it, with
  the matching item icon and `have/need` inside it, a red dot badge when available, and the
  `have` recolouring rather than the button greying.
- **A 4-segment quantity selector** above it (house standard, not the original's checkbox),
  disabled in the `Advance` state.
- **`Progress Reversion`** at the lower left in the de-emphasised diamond treatment, behind
  a confirm — *once there is a refund rule to implement*. Shipping the control without one
  is worse than omitting it.
- **Move the tower-income card off this tab** and onto the Tower page alone (D7/T8).

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| 499 level rows, cost and coefficients | `PetLevel` | **yes** — verified exact |
| 99 milestone rewards, split by bucket | `PetLevel.ExternalAdd` | **yes** in value (community mirror, verified exact above); **no** as an import from the config set |
| 10 stage rows, cost and `LevelMax` | `PetClass` | **yes** in value; **but `LevelMax` is not enforced** — see T2 |
| Two currencies and their icons | `System.PetLevelUPItem`, `System.PetClassUPItem`, `Item.json` icons | names **no**, values **yes** |
| Stage passives | `PetClass.PassiveSkillUnlock` (rows 2, 4, 6) | **no** — Everkai uses a local v7 stage policy |
| `Advance` confirm panel | `PanelPetUpgradeStage` cur/target stage + cur/target `LevelMax` | **no** |
| Reversion refund | not found in any table this pass | **no** |
| Nine attributes for the glossary | `PetAttr` 9 rows | **partially** — 3 of 9 |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Level 212 / 450 · Stage 5 · 3 stars` (`app/familiar-panel.tsx:36`) | the level bar with its `Lv. N` pill; the stage is the bar's *endpoint* (`PetClass.LevelMax`); the stars move to the Awaken tab |
| `18,400 level-up items · 260 class-up items · 40 fragments` | three item icons with counts, coloured against the next cost (convention 3) |
| `Train +1 · 1,240 level-up + 50 class-up` | `Level Up` with the fruit icon and `have/need` inside the button |
| `Train up to 10` | the quantity selector; the verb stays one word |
| `Level 150: +2,400,000 Power, +18 Aptitude` and its 98 `<option>` siblings (`app/familiar-node-panel.tsx:15`) | the two rails — same values, on the tab that earns them |
| `Activate all 7 ready · Free` | `Quick Activate`, on this tab, no `· Free` |
| `Tower income` / `Clear floor 1` / `Next full hour` / `Collect tower items` (`app/familiar-panel.tsx:36`) | delete from this tab entirely; the Tower page already owns it (D7) |
| the first two-thirds of *About familiar progression* (`app/familiar-panel.tsx:39`) — every sentence about where numbers came from | `docs/parity-catalog.csv`, where all of it already exists verbatim. Not the `(i)` — a player has no use for provenance. |
| *"A bound familiar gives its Fellow nothing at stage 1, then a ninth of its bonus per stage up to the full bonus at stage 10."* | see spec 13 — this local rule is contradicted by the capture, so the sentence should not be relocated, it should be resolved |
