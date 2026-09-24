# 10 · Explore — the event roll

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/explore-after.png`, `img/explore-info.png`, `img/explore-probability.png`,
`img/encounter.png`, `img/encounter-r-rarity.png`, `img/encounter-alertness-raised.png`,
`img/encounter-contract-animation.png`, `img/encounter-contract-success.png`,
`img/locked-preview-n-from-encounter.png`, `img/explore-luck-flower.png`,
`img/explore-luck-flower-probability.png`, `img/explore-luck-flower-result.png`,
`img/explore-npc-event.png`, `img/explore-blessing-buff.png`, `img/explore-blessing-buff-2.png`,
`img/explore-buff-active.png`, `img/explore-lost-item-event.png`,
`img/explore-lost-item-result.png`, `img/explore-areas.png`, `img/explore-area-showall.png`,
`img/explore-area-detail-locked.png`, `img/explore-intro.png`, `img/explore-intro-2.png`,
`img/explore-attract.png`

Serves hub manifest heading 1, *Making Contracts with Monsters* — the only one of the nine hub
destinations that the game's own `(i)` names as a headline system.

Tables: `PetArea`, `PetExploreItem`, `PetExploreLottery`, `PetCatchItem`, `Pet`,
`System.ExplorePetCatchWeight`, `System.PetExploreEnergy*`, `System.PetAssistItem`,
`System.PetAssistItemUseMax`, `System.PetTrap`, `System.PetTrapOpen`,
`System.PetExploreSkip`, `System.PetCatchSkip`, `System.PetExploreAutoUnlock`,
`System.PetExploreBuff_01`.
Everkai: `lib/familiar-explore.mjs`, `lib/familiar-explore-data.json`,
`app/familiar-explore-panel.tsx`.

---

## 0 · The thing to build first: Explore is not a screen

`Explore` is one circular button. Behind it are **four different screens with three different
primary verbs**, chosen by a weighted roll that the player never sees. Everything else in this
spec is downstream of that. If Everkai builds "the Explore screen" it will build the monster
encounter and bolt the rest on; the original's shape is a **roll first, a screen second**, and
the four screens do not share a layout, a control set or a dismissal.

| Branch | Screen | Title plaque | Primary verb | Its own rate table |
| --- | --- | --- | --- | --- |
| Monster encounter | `img/encounter.png` | *(none — the monster's own name plaque)* | `Use` (a contract) | yes — `PetCatchItem` × `System.ExplorePetCatchWeight`, disclosed by `Probability` |
| Luck Flower | `img/explore-luck-flower.png` | `Luck Flower` | `Draw` | yes — `PetExploreLottery`, disclosed by its **own** `Probability` |
| NPC blessing | `img/explore-npc-event.png` | the blessing's name | `Investigate` | no — a flat weighted pick inside `PetExploreItem` |
| Lost-item cache | `img/explore-lost-item-event.png` | `Pleasant Surprise` | `Investigate` | no — the `typ: "reward"` row |

Three of the four **replace the `Explore` button in place** with their own verb, at the same
position and the same size. The monster encounter is the exception: it replaces the whole lower
third with a contract carousel and a `Use` button. The `Ruin` button is on all four, which makes
it the only universal control — and therefore the exit (see X10).

### The roll, from the tables

Read top-down. Both halves of every weight below come from the config set (rule 1); nothing on
this page is read off a screenshot.

```
press Explore  (costs PetArea.cost stamina — constant 1 on all 3 rows, rule 6:
               that is a flat cost, not an area cost curve)
   │
   ├─ is this area's explore count still inside PetArea.unspokenRules?
   │     └─ YES → the SCRIPTED encounter for that step. A fixed pet id, with an
   │              optional MustCatch. The roll below is skipped entirely.
   │
   └─ NO → roll PetArea.EventPool  (identical on all 3 areas, rule 6)
            ├─ PetCatch          4000 ┐
            ├─ PetExploreItem    5000 ├─ of 10,000
            └─ PetExploreLottery 1000 ┘
                    │
   PetCatch ────────┴────────────────────────────────── MONSTER ENCOUNTER
        └─ rarity: System.ExplorePetCatchWeight
              id 1 (N) 3350 · id 2 (R) 4700 · id 3 (SR) 1500 · id 4 (SSR) 450
        └─ then one of this area's pets at that rarity
        └─ then Pet.SPProb for the shining variant

   PetExploreItem ──┴─ roll this area's 5 rows (SpotId 1/2/3, weights sum 500)
        ├─ typ "reward", weight 300 ──────────────────── LOST-ITEM CACHE
        └─ typ "buff",  weights 100 / 5 / 75 / 20 ────── NPC BLESSING
              Item_PetExploreBuff_01 · 02 · 03 · 04

   PetExploreLottery ┴─────────────────────────────────── LUCK FLOWER
        └─ 5 rows, Weight 2 / 5 / 40 / 15 / 38
```

Composed, the leaf distribution is **monster 40 % · lost-item cache 30 % · blessing 20 % · Luck
Flower 10 %**, and the capture confirms all four exist as distinct screens. Everkai's own panel
currently prints `monster 40% · lost item 50% · Luck Flower 10%`
(`app/familiar-explore-panel.tsx:24`) — it names three leaves where the table has four, because
it folds the blessing branch into "lost item". `lib/familiar-explore.mjs` rolls the sub-pool
correctly; only the **label** is wrong. Fix the label, not the model.

### A correction to carry forward

The brief for this spec, and the capture index, attribute the exploration blessings to
**`PetBuff`**. They are not `PetBuff`.

- `PetBuff` is 137 rows of `BuffProb` / `EffectAttr` / `EffectNum` / `round` — the **combat**
  buff table, read by `PetBattleShow.lua` and the Drakenberg Arena panels
  (`docs/familiar-data-inventory.md` §9). It has no exploration surface.
- The blessings are `PetExploreItem` rows with `typ: "buff"`, each paying one of four items,
  `Item_PetExploreBuff_01` … `_04`.

Rule-2 control for that claim, run in this session: the config directory returns
`Wife 33, City 15, SimGame3 21` files and 28 `Pet*` tables; `grep -rl Item_PetExploreBuff_01`
returns `Item.json`, `PetExploreItem.json`, `split_reward/reward_item.json` and the six
`*/translate.json` locales — a working pattern, not a failed one.

The four blessings, named and described from the original's own English string table
(`en/translate.json`, `Item:name:` and `Item:description:`):

| Item | Name | Effect, verbatim | Captured? |
| --- | --- | --- | --- |
| `Item_PetExploreBuff_01` | **Track Identification** | *"When exploring, the chance of finding an SSR monster next time increases."* | no — magnitude is `System.PetExploreBuff_01` |
| `Item_PetExploreBuff_02` | **Valuable Experience** | *"When exploring, the next time you encounter a Luck Flower, you get twice the rewards."* | no |
| `Item_PetExploreBuff_03` | **Fruitful Guidance** | *"When exploring, the next time you find lost item, you get twice the rewards."* | yes, `img/explore-blessing-buff-2.png` |
| `Item_PetExploreBuff_04` | **Special Potion** | *"The following exploration doesn't cost stamina."* | yes, `img/explore-blessing-buff.png` |

Everkai already models all four with these effects (`lib/familiar-explore.mjs` header, local
rule 3). So the blessing branch needs **no new data** — only the badge stack that shows it.

---

## 1 · Explore at rest

`img/explore-after.png`. Full-bleed area art, no panel chrome. Seven controls, all of them
art-as-button (convention 6), none of them labelled with a sentence.

```
 0 ─────────────────────────────────────────────────────  game bar (shared chrome)
   ┌ (i) Snowy Plains                                    ┐  area name, top-left, with (i)
   │ [c1 12][c2 20][c3 1]                                │  THE COUNTER STACK
   │ ┌──────────────────────────────────┐    ╭────────╮  │
   │ │ ▣ After encountering 2 SSR mon-  │    │Probab- │  │  pity banner (left)
   │ │   sters, the next monster is     │    │ ility  │  │  Probability (right, art+label)
   │ │   guaranteed to be Shibataro.    │    ╰────────╯  │
   │ └──────────────────────────────────┘                │
   │                                                     │
   │              ( area art, scrollable scene )         │
   │                                                     │
   │                                        ╭────────╮   │
   │                                        │Full Auto│  │  art+label, right rail
   │                                        ╰────────╯   │
   │                                          ⚡ 47/50    │  stamina, right-aligned
   │            ╭──────────╮        ☑ Skip Animation      │
   │            │ Explore  │                              │  THE primary, d ≈ 150
   │            │Consume ⚡1│                              │  cost INSIDE the button
   │            ╰──────────╯                              │
   │ ╭───────╮                             ╭───────╮     │
   │ │Attract│                             │  Ruin │     │  art+label, bottom corners
   │ ╰───────╯                             ╰───────╯     │
   ├─────────────────────────────────────────────────────┤
   │  «                                          Intro   │  bottom bar, 2 items
   └─────────────────────────────────────────────────────┘
```

| Element | Treatment | Backing |
| --- | --- | --- |
| Area name | `(i)`-prefixed plaque, top-left. The `(i)` here opens the **area**'s information, distinct from the hub's | `PetArea` |
| Counter stack | 2–3 chips in a row under the plaque, each a framed item icon with a count below-right | see §1.1 |
| Pity banner | A wide parchment strip with a portrait cap, one sentence, the target's name in gold | **unsourced — see §1.2** |
| `Probability` | Book-and-scroll art with the word under it, top-right | §3 |
| `Full Auto` | Circular art + label, right rail | unlocks at `System.PetExploreAutoUnlock` = 30 |
| `⚡ n/n` | Lightning glyph, value, cap. No word "stamina" anywhere on the screen | `System.PetExploreEnergy*` |
| `Skip Animation` | A green tick checkbox with a label, immediately under the stamina. **A second, separate `Skip` lives on the encounter screen** (§4.1) — two independent preferences | `System.PetExploreSkip` = 10 here, `System.PetCatchSkip` = 10 there |
| **`Explore`** | Largest control on the screen: circular map-and-magnifier art, `Explore` across its lower third, and **`Consume ⚡1` on a second line inside it** — convention 2, the cost lives in the button. Carries a red `!` badge | `PetArea.cost` |
| `Attract` | Bottom-left, circular | §7 |
| `Ruin` | Bottom-right, circular | §5 |
| `Intro` | Bottom bar, right | §6 |

**`Consume ⚡1` is the single best control on the whole Familiar surface.** It is a verb, its
price, and its currency's icon, in one tap target, with no sentence anywhere on the screen
explaining what exploring costs. Everkai's equivalent is a button labelled
`Explore · free (Special Potion)` beside a separate stamina line and a separate regen line
(`app/familiar-explore-panel.tsx:13–14, :25`).

### 1.1 The counter stack — the entire blessing UI

`img/explore-buff-active.png` against `img/explore-after.png`.

Small framed chips, item-icon over a count, laid out left-to-right under the area plaque and
wrapping to a second row. Across the two captures:

- chip 1 — orange frame, count `12`, unchanged across the whole five-press run
- chip 2 — green frame, count `18` → `20` after the doubled lost-item find, so this is the
  **lost-item counter**
- chip 3 — teal frame, appears only while a blessing is held, count `1` after one charge was
  spent of two

**There is no buff panel.** No list, no timer, no "active effects" section, no tooltip that was
reachable. A blessing exists on screen as one chip with a number, and it is granted by a
full-screen ribbon that is gone in one tap. That is the whole interface for a mechanic that
waives the screen's only cost.

The consequence for Everkai: the blessing's *grant* is loud (a full-screen ribbon, §4.3) and its
*persistence* is quiet (one chip). Copy both halves. A `Remaining: n` pill on a panel row would
be the wrong shape.

### 1.2 The pity banner — evidence, not a number

`img/explore-after.png` carries, in the game's own words:

> *"After encountering 2 SSR monsters, the next monster is guaranteed to be Shibataro."*

**Do not build this from the banner.** No pity, ceiling or guarantee table for familiar
exploration exists in the config set. Control for that absence: the same `ls` pattern returns
nineteen ceiling/PRD tables for other systems — `CommonGachaSPCeiling`, `LotteryNewPRDConfig`,
`JackpotCeiling`, `FestivalLotteryCeiling` and the rest — so the search reaches exactly the
right neighbourhood and finds nothing for `Pet*`. Like the gacha and like the endless-tower bot
draw, this rule lives on the server.

What *is* measurable and adjacent: `Pet.SPOutTime` (5 / 10 / 15) and `PetExploreLottery.OutTime`
(50 on the 2-weight row, 30 on the 5-weight row, absent on the other three). Both look like
"guaranteed within N" ceilings and neither is proven. Record the shape, name the columns, and
leave the arithmetic to whoever can test it — per rule 10, that is a measurement nobody has run
yet, not a question for the owner.

---

## 2 · The Explore `(i)` — "Explore Freely"

`img/explore-info.png`. The same full-height parchment sheet with a red `✕` tab that every other
`(i)` on this surface uses. One `- Explore Freely -` heading and six `◆` bullets. Verbatim:

```
- Explore Freely -
◆ Transcenders can explore different areas, encountering various interesting
  events and unique wild monsters.
◆ Each exploration consumes 1 Stamina.
◆ The Exploration Stamina recovers over time and will not recover once it
  reaches the maximum limit.
◆ Upon encountering a wild monster, use the contract items to attempt forming
  a contract with them; the higher the contract grade, the higher the success rate.
◆ After using a contract, the monster's Alertness increases; if it reaches the
  limit, the monster will flee. Use items like Ordinary Mochi to lower monsters'
  Alertness.
◆ Plan strategically the use of your contracts to obtain more monsters!
```

Six bullets, **101 words, and that is every word the Explore surface spends.** It names the cost,
the regeneration, the fact that a full tank banks nothing, the contract-grade relationship, the
Alertness rule and the one item that fixes it. It does not name a single rate — rates are the
`Probability` screen's job, and they are drawn, not written.

The first bullet is the roll, stated as design intent: *"various interesting events and unique
wild monsters"* — two categories, which is exactly the `PetExploreItem` / `PetCatch` split.

Note bullet 3: *"will not recover once it reaches the maximum limit"*. Everkai already
implements this (`staminaAt()`: *"A full tank does not bank time"*). The original says it out
loud because it is the one thing about a regenerating resource a player cannot see.

---

## 3 · `Probability` — the disclosure screen

`img/explore-probability.png`. A parchment sheet, `Probability` centred, `✕` tab top-right.
Three (four, scrolled) banded sections, one per rarity, each header reading `◇ SSR: 4.5% ◇`
with **the band total in the rarity's own colour**. Beneath each header, a grid of framed
familiar portraits, five per row, **each with its own individual rate printed under it**.

```
 ┌            Probability                  ✕ ┐
 │ ────────── ◇ SSR: 4.5% ◇ ──────────       │  band total, coloured
 │ [art][art][art][art][art]                 │  5 per row, rarity-framed
 │ 0.75% 0.75% 0.75% 0.75% 0.75%             │  per-familiar rate
 │ [art]                                     │
 │ 0.75%                                     │
 │ ────────── ◇ SR: 15% ◇ ───────────        │
 │ [art]×10, 1.5% each                       │
 │ ────────── ◇ R: 47% ◇ ────────────        │
 │ [art]×n, 7.833% each                      │
 └───────────────────────────────────────────┘
```

Three things this does that are worth copying wholesale:

1. **It is the one place the game shows art and a number together at grid density.** Everkai
   writes the same information as `P6`, a `<details>` containing up to 25 comma-joined familiar
   names per rarity (`app/familiar-explore-panel.tsx:27`). This screen is that `<details>`,
   drawn. The card art Everkai needs is already in hand — `petCardIcon(rarity)` is used three
   lines above the disclosure that replaces it.
2. **The band total and the per-member share are both shown**, so the player can see that the
   band is split evenly within itself without being told so.
3. **It is a separate destination, not a tooltip.** A full rate disclosure earns its own screen.

**The numbers to implement are not these.** The band totals come from
`System.ExplorePetCatchWeight` (`3350 / 4700 / 1500 / 450` of 10,000) and the per-familiar share
from the count of that area's pets at that rarity, filtered by the `IsOwnedPet` rule
Everkai already implements. The screenshot's per-familiar figures are the owner's save on a
replacement server with a partially-collected area; they are not a table.

---

## 4 · The four branches

### 4.1 Monster encounter — verb `Use`

`img/encounter.png` (N, Alertness 0), `img/encounter-r-rarity.png` (R, a second rarity),
`img/encounter-alertness-raised.png` (**a failed throw**, Alertness 34),
`img/encounter-contract-animation.png` and `img/encounter-contract-success.png` (the two beats
`Skip` suppresses).

Same area art, no panel; the monster is a sprite standing in the scene, and the UI is a stack of
floating strips over it.

```
   ┌ (i) Snowy Plains                                   ┐
   │ [counter chips]                        ╭────────╮  │
   │ ┌───────────────────────────────────┐  │ Details│  │  art+label, top-right
   │ │  ▣  Clapme                        │  ╰────────╯  │  rarity pip + name plaque
   │ │  ┌─────────────────────────────┐  │              │
   │ │  │      Alertness: 0/100       │  │              │  BAR with the value INSIDE
   │ │  └─────────────────────────────┘  │              │  (Family convention 12)
   │ │  Monster will flee once the       │              │  one sentence, gold
   │ │  alertness is full.               │              │
   │ └───────────────────────────────────┘              │
   │                                                    │
   │                ( monster sprite )                  │
   │                                                    │
   │ ┌────────────────────────────────────────────────┐ │
   │ │ (i) Contract Success Rate: 70%                 │ │  value in GREEN
   │ │     Failed: Alertness +30-40                   │ │  consequence, gold
   │ └────────────────────────────────────────────────┘ │
   │      ╭────╮      ╭────╮      ╭────╮                │  CONTRACT CAROUSEL
   │      │ 1  │      │ 2  │      │ 3  │                │  3 medallions
   │      │ ∞  │      │105 │      │ 86 │                │  stock under each
   │   Basic Contract                                   │  selected one is named
   │            ┌──────────────────┐                    │
   │            │       Use        │                    │  gold primary
   │            └──────────────────┘                    │
   │ ╭──────╮        ☑ Skip                 ╭──────╮    │
   │ │Soothe│                               │ Ruin │    │
   │ ╰──────╯                               ╰──────╯    │
   ├────────────────────────────────────────────────────┤
   │  «                                         Intro   │
   └────────────────────────────────────────────────────┘
```

| Element | Treatment | Backing table |
| --- | --- | --- |
| Rarity pip | A **diamond lozenge carrying the rarity's own letter**, tinted to the rarity — a green `N` on `img/encounter.png`, a blue `R` on `img/encounter-r-rarity.png` — overlapping the plaque's left end | `Pet.grade` |
| Name plaque | A gold-to-transparent gradient banner, the monster's name in white. Two of the three captured monsters carry a small gold sparkle glyph before the name and one does not; **what the sparkle marks was not established** — do not build a meaning onto it | `Pet` |
| **Alertness bar** | A full-width dark inset bar with `Alertness: n/100` **printed inside it**, centred. The fill is **red and grows from the left** as Alertness rises (`img/encounter-alertness-raised.png` at 34). Family convention 12 exactly, on a third system | `Pet.AlertMax` — constant `100` on all 70 rows (rule 6: that is a global cap, not a per-familiar stat) |
| Flee rule | One gold sentence under the bar | `PetCatchItem` |
| `Details` | Opens the **locked-card Preview component**, unchanged — `img/locked-preview-n-from-encounter.png`. Same Info / Max Level Preview tabs, same Source button, same greyscale form tiles. One component, a fourth call site | — |
| Success rate | A torn-parchment strip: `(i)` + `Contract Success Rate: n%`, the value in large orange; `Failed: Alertness +30-40` beneath in plain dark text. **The rate's colour does not change with the rate** — see below | `PetCatchItem.{N,R,SR,SSR}Prob` by grade × rarity; `PetCatchItem.Alert` = `[30, 40]`, **constant on all three grades** (rule 6 — the penalty does not vary by contract grade) |
| Contract carousel | Three circular medallions, the centre one selected and named below the row; **stock printed under each**, and grade 1 shows `∞` rather than a number | `PetCatchItem` (3 rows) |
| `Use` | Gold primary, centred. **No cost inside it** — the cost is the selected medallion's stock | — |
| `Soothe` | Bottom-left art button | `System.PetAssistItem` = `{Item_PetPacify1: 30}`, `System.PetAssistItemUseMax` = 3 |
| `Skip` | Green tick checkbox, centre-bottom, suppresses the result presentation | `System.PetCatchSkip` = 10 |

**The `∞` is the design's whole tutorial.** Grade 1 is unlimited and carries the lowest odds
(`PetCatchItem` row 1: N 7000 / R 1000 / SR 720 / SSR 310 basis points); grades 2 and 3 are
finite and better (grade 3: 10,000 at every rarity — a guaranteed catch). The player learns
"spend the free one on the common thing" from three numbers under three pictures, with no
sentence. Everkai prints the same relationship as `{k.name} · {catchChance}% · {count}` on three
buttons plus a 196-word disclosure restating all twelve percentages
(`app/familiar-explore-panel.tsx:21, :29`).

#### The rate is not colour-coded — a deliberate non-finding

Two encounters at two rarities were captured on the same screen component. The N-tier prints
its rate and the R-tier prints a much worse one, and **both are drawn in the same orange**, at
the same size, on the same parchment. The Latency panel's rule — Family convention 14, *"the
medallion's colour is the number"* — **does not apply here.**

That matters because it is exactly the kind of thing a rebuild invents. Do not add a green/amber/
red scale to the contract rate. The rate is emphasised (large, orange, opposite a small label)
but not graded. What tells the player their odds are bad is the **rarity pip**, which is graded,
and the contract carousel beside it, which offers a better row.

The two observed points are consistent with `PetCatchItem` grade 1 — the unlimited Basic
Contract, whose row reads `NProb 7000, RProb 1000, SRProb 720, SSRProb 310` in basis points.
Cite that row. The screen corroborates two of its four columns; it is not the source of any of
them.

#### The state machine: Alertness is a per-encounter accumulator

`img/encounter-alertness-raised.png` settles the shape of a failure, which was previously
unrolled:

```
enter encounter        Alertness 0/100, Use live
  └─ Use → throw animation
        ├─ FAIL     Alertness += a whole number in PetCatchItem.Alert [30, 40]
        │           bar fills red, value updates, rate strip UNCHANGED,
        │           carousel UNCHANGED, `Use` STILL LIVE  ← the encounter continues
        │           └─ Use again … (the Basic Contract is ∞, so this is free)
        ├─ SUCCESS  capture animation → straight back to Explore
        └─ (at Alertness 100)  the monster flees      ← STILL NOT REACHED
```

**The failure does not end the encounter and does not consume the attempt's screen.** The
success rate is re-rolled unchanged; only Alertness moves. So the encounter is a loop over
attempts with a rising failure counter, and `Soothe` is the control that rewinds it
(`System.PetAssistItem` = 30, at most `System.PetAssistItemUseMax` = 3 per monster).

Everkai implements exactly this (`lib/familiar-explore.mjs` — `Alert` applied per failure, flee
at `Pet.AlertMax`), so this is confirmation, not new mechanics. What is new is that the **screen
does not change** on a failure beyond the bar: no result line, no "that didn't work", no
re-entry. Everkai writes `A failed contract raises Alertness by 30-40. At 100 it flees and
leaves 4 Familiar Tears.` as a standing sentence (`app/familiar-explore-panel.tsx:20`) — the
original puts the first half on the strip permanently (`Failed: Alertness +30-40`) and the
second half on the bar's own caption, and then says nothing when it happens.

#### What `Skip` suppresses — and the reward asymmetry

`Skip` is a checkbox that lives **only on the encounter screen** and persists across encounters,
so it is a stored preference, not a per-encounter toggle (`System.PetCatchSkip` = 10 gates it).
It suppresses **two animation beats**, not a modal:

| Beat | Capture | Treatment |
| --- | --- | --- |
| The throw | `img/encounter-contract-animation.png` | Full-screen. **All chrome hidden** — no Alertness bar, no rate strip, no carousel, no buttons. The monster stands in the unchanged area art with a glowing purple seal spinning above it |
| The capture, on success | `img/encounter-contract-success.png` | Full-screen. The area art is **replaced by a deep blue starfield**; the creature is a pure white silhouette inside a large white ring, with green and gold sparkles below |

And then it is over. With `Skip` off, the successful catch plays those two beats and returns
straight to the Explore screen: **no `Congratulations` card, no item grid, no name plate for the
familiar just acquired.**

**This is an asymmetry worth designing around, and it is the opposite of what a rebuild would
guess.** The Luck Flower draw, the lost-item cache and the blessing grant all use the shared
reward-ribbon component (§4.5). The **catch** — the most significant reward the whole system
produces, a permanent addition to a 70-entry roster — is presented *purely as animation*. Two
captures 1.3 s apart bracket the transition and neither shows a card; a modal briefer than that
is not excluded, but nothing observed suggests one.

The design reading: the ribbon is for things that go into a bag, and a familiar does not go into
a bag. Where the new familiar is *acknowledged* is presumably the Growth roster's and the
Handbook's badges, and `Pet.JoinDialog` / `JoinDialogType` (the columns `PanelPetGetStory.lua`
reads, per the data inventory §9) — neither of which was on screen here.

For Everkai: **do not build a "You caught X!" modal because the other three branches have one.**
If it builds a catch presentation at all, the evidence supports an animation beat, and the
honest fallback is to let the roster badge carry it.

**Still not captured:** the monster fleeing at Alertness 100. Reaching it needs three consecutive
failures on one monster; the run hit 34/100 and then succeeded. It costs nothing (the Basic
Contract is `∞`) and the screen states the rule in the game's own words, so the mechanic is
specified and only its *presentation* is unseen. `Pet.RunReward` is the payout Everkai already
models (Familiar Tears).

### 4.2 Luck Flower — verb `Draw`

`img/explore-luck-flower.png`. **This is `PetExploreLottery`, not `PetLotteryShop`.** It is an
exploration encounter, which is why every sweep of the shop surfaces missed it. `PetLotteryShop`
(21 rows) is the crossover **gacha exchange**, reached from `ScenePetLotteryEntry.lua`, and is
spec 12's problem, not this one.

```
   ┌ (i) Snowy Plains                                   ┐
   │ [counter chips]                       ╭──────────╮ │
   │            Luck Flower                │Probability│ │  title plaque, centred
   │                                       ╰──────────╯ │  its OWN rate table
   │                ╭─────────╮                         │
   │            ╭───┤  petal  ├───╮                     │  6 petals around a face
   │         ╭──┤ p │  (face) │ p ├──╮                  │  each petal = one prize icon
   │         ╰──┤ p ╰─────────╯ p ├──╯                  │  petal colour ≠ rarity
   │            ╰─────────────────╯                     │
   │                   ( NPC )                          │  an NPC stands beside it
   │            ╭──────────╮                            │
   │            │   Draw   │                            │  the wheel, miniaturised
   │            ╰──────────╯                            │  as its own button art
   │                                       ╭──────╮     │
   │                                       │ Ruin │     │
   ├───────────────────────────────────────╰──────╯─────┤
   │  «                                         Intro   │
   └────────────────────────────────────────────────────┘
```

- Six petals around a central face; five carry distinct item icons in the capture and the sixth
  is occluded by the face sprite. **Treat the petal count as decoration and the prize count as
  `PetExploreLottery`'s five rows.** Do not build a six-slot wheel off a sprite.
- The `Draw` button's art is **the flower itself, miniaturised**. The control is a picture of the
  thing it operates. Convention 6 at its purest.
- `Draw` charged **nothing** — stamina went 48 → 48 across the draw. The 1 stamina was spent by
  the `Explore` press that produced the flower. The lottery is a *payout*, not a *spend*, which
  is the opposite of every wheel a player has been trained to distrust.

#### Its own Probability

`img/explore-luck-flower-probability.png`. Same parchment component as §3, three banded sections
— but the bands are **named prize tiers**, not rarities:

```
 ┌            Probability            ✕ ┐
 │ ────── ◇ Ultra-rare Prize ◇ ──────  │   ← band 1, one prize
 │ [art]                               │
 │ ────── ◇ Rare Prize ◇ ────────────  │   ← band 2, one prize
 │ [art]                               │
 │ ────── ◇ Precious Prize ◇ ────────  │   ← band 3, three prizes
 │ [art] [art] [art]                   │
 └─────────────────────────────────────┘
```

**This resolves an open question in `lib/familiar-explore.mjs`.** Its local rule 5 records
*"Luck Flower `OutTime`/`Level` columns are not used (their meaning is not in any table)."*
`Level` is now settled by the capture:

| `PetExploreLottery` row | `Weight` | `Level` | Band on screen |
| --- | ---: | ---: | --- |
| `101` → `Reward_PetExploreLottery_01` | 2 | 1 | Ultra-rare Prize |
| `102` → `Reward_PetExploreLottery_02` | 5 | 2 | Rare Prize |
| `103` → `Reward_PetExploreLottery_03` | 40 | 3 | Precious Prize |
| `104` → `Reward_PetExploreLottery_04` | 15 | 3 | Precious Prize |
| `105` → `Reward_PetExploreLottery_06` | 38 | 3 | Precious Prize |

Three distinct `Level` values, three named bands, and the grouping matches exactly — one prize at
`Level 1`, one at `Level 2`, three at `Level 3`. **`Level` is the Probability modal's band.**
Weights sum to 100, so the band totals are the sums of their rows. Update the module comment.

`OutTime` remains unresolved (present on rows 101 and 102 only, absent on the `Level 3` rows) and
is a pity-ceiling candidate — same status as §1.2. Leave it unused and say why.

#### The result

`img/explore-luck-flower-result.png`. The petal that won **lights up and flares**, the rest dim,
and the shared reward ribbon drops over it: `Congratulations` on a red banner, the item icon with
its count, `Tap to continue` beneath. The wheel is still visible behind the scrim, so the player
sees *which* petal paid.

### 4.3 NPC blessing — verb `Investigate`

`img/explore-npc-event.png` → `img/explore-blessing-buff.png`.

The encounter's entire UI is **the NPC standing in the scene** and a title plaque naming the
blessing before you take it — `Special Potion` is printed at the top of the screen *before*
`Investigate` is pressed. There is no card, no frame and no description; the NPC has a speech
bubble with one line of flavour (*"...I'm not following you. Just passing by."*) and the
`Explore` button has been **replaced in place** by `Investigate`, same position, same size, same
circular art treatment.

```
   ┌ (i) Snowy Plains                    ┐
   │ [counter chips]                     │
   │           Special Potion            │  ← the reward, named up front
   │                                     │
   │            ( NPC art )              │
   │              ╭───────────────╮      │
   │              │ ...I'm not    │      │  speech bubble, tail to the NPC
   │              │ following you.│      │
   │              ╰───────────────╯      │
   │         ╭─────────────╮             │
   │         │ Investigate │             │  ← WHERE Explore WAS
   │         ╰─────────────╯   ╭──────╮  │
   │                           │ Ruin │  │
   ├───────────────────────────╰──────╯──┤
   │  «                          Intro   │
   └─────────────────────────────────────┘
```

`Investigate` opens the grant ribbon — the **same component** as the Luck Flower result, the
lost-item cache and the hub scene pickup (§4.5), with two changes:

- the banner word swaps `Congratulations` → **`Blessing Received`**
- a green **`Remaining: 2`** pill appears under the icon, above the effect line

```
 ┌──────────────────────────────────────┐
 │  ≡≡≡≡≡ Blessing Received ≡≡≡≡≡       │  red banner, ribbon ends
 │            Special Potion            │  name, white
 │              ( icon )                │  large, on a radial flare
 │           ┌─────────────┐            │
 │           │ Remaining: 2│            │  GREEN pill
 │           └─────────────┘            │
 │  The following exploration doesn't   │  gold, one line, the item's own text
 │  cost stamina.                       │
 │          Tap to continue             │
 └──────────────────────────────────────┘
```

The effect line is the item's `Item:description:` string verbatim. **The blessing needs no
authored copy at all** — Everkai already holds all four strings.

Then it collapses to one chip in the counter stack (§1.1) and is never spoken of again.

`img/explore-blessing-buff-2.png` is the second class, `Fruitful Guidance`, identical layout,
`Remaining: 2`, a different one-line effect — confirming this is one component parameterised by
the item row, not two screens.

### 4.4 Lost-item cache — "Pleasant Surprise", verb `Investigate`

`img/explore-lost-item-event.png` → `img/explore-lost-item-result.png`. The 30 % leaf, and
**a full fourth event class** rather than a silent payout.

```
   ┌ (i) Snowy Plains                    ┐
   │ [counter chips]                     │
   │         Pleasant Surprise           │  ← title plaque, same slot as "Luck Flower"
   │                                     │
   │      ( a cache in the scene )       │  a dropped pack, a horn, a sack,
   │                                     │  loose gems — NO character, NO NPC
   │         ╭─────────────╮             │
   │         │ Investigate │             │  ← WHERE Explore WAS, same art treatment
   │         ╰─────────────╯   ╭──────╮  │
   │                           │ Ruin │  │
   ├───────────────────────────╰──────╯──┤
   │  «                          Intro   │
   └─────────────────────────────────────┘
```

Structurally it is the NPC blessing (§4.3) with the character removed: same title-plaque slot,
same `Investigate` in the `Explore` button's position, same `Ruin` beside it, same lack of any
panel. The difference is what is standing in the scene — **an object instead of a person** — and
that is the entire visual distinction between a 30 % branch and a 20 % branch.

That is worth copying because it is the cheapest possible way to make two branches feel
different: one art slot, one title string, one shared verb.

### 4.5 One reward ribbon, three variants

Capture observation 11 said the `Congratulations` ribbon is one component with four call sites.
With the lost-item result captured, the parameterisation is now visible, and it has a **subtitle
slot** the earlier captures did not exercise:

| Variant | Banner word | Subtitle | Name line | Pill | Effect line | Capture |
| --- | --- | --- | --- | --- | --- | --- |
| Scene pickup | `Congratulations` | — | — | — | — | `img/hub-egg-bubble.png` |
| Luck Flower draw | `Congratulations` | — | — | — | — | `img/explore-luck-flower-result.png` |
| **Lost-item cache** | `Congratulations` | **`You've found lost supplies.`** | — | — | — | `img/explore-lost-item-result.png` |
| Blessing grant | **`Blessing Received`** | — | the buff's name | green `Remaining: n` | the item's own description | `img/explore-blessing-buff.png` |

```
 ┌───────────────────────────────────────┐
 │  ≡≡≡≡≡ <banner word> ≡≡≡≡≡            │  red ribbon with flared ends
 │        <subtitle>                     │  optional — one sentence, white
 │        <name>                         │  optional — blessing only
 │          ( icon ×n )                  │  always, on a radial flare
 │        [ Remaining: n ]               │  optional — blessing only, GREEN
 │        <effect line>                  │  optional — blessing only, gold
 │          Tap to continue              │  always
 └───────────────────────────────────────┘
```

Five optional slots, two mandatory ones, one dismissal (`Tap to continue`, anywhere). The
underlying screen stays visible behind a scrim throughout, so the player always sees *what* paid.

**Build the ribbon once, with all five slots, before building any of the branches.** Three of the
four branches end in it, the hub scene pickup ends in it, and the Compendium's `Quick Collect`
(spec 11) is the obvious fifth caller. The catch (§4.1) is the one payout that deliberately does
**not** use it.

---

## 5 · `Ruin` — the world map and Area Detail

### The map

`img/explore-areas.png`. Pressing `Ruin` from any Explore state (it is present on the rest
screen, the encounter, the flower and the NPC event — the **only** control that never leaves)
opens a hand-drawn parchment world map with a faint grid.

```
 ┌─────────────────────────────────────────┐
 │   ▽ ┤ Snowy Plains ├                    │  area pin: marker + name plaque
 │        ( hand-drawn terrain )           │  the pin's marker shape encodes state
 │                                         │
 │                  ◈ ┤ Verdant Forest ├   │
 ├─────────────────────────────────────────┤
 │             Snowy Plains                │  selected area, centred
 │  Contracted: 17/25          🔍 Show All │
 │  [art][art][art][art][art]      ╭────╮  │  a scrolling strip of this
 │                                 │ ▶▶ │  │  area's catchables
 │                                 │ Go │  │  gold primary, bottom-right
 └─────────────────────────────────╰────╯──┘
```

- **Areas are pins on terrain, not rows in a list.** The pin is a marker glyph plus a chamfered
  name plaque; the two captured pins carry different marker glyphs (a downward chevron on the
  current area, a gold lozenge on the other). Everkai renders three `<button>`s with
  ` · tower floor 100` appended to the label of a locked one
  (`app/familiar-explore-panel.tsx:15`). Gates live in `PetArea.unlock` (0 / 100 / 200).
- **`Contracted: 17/25`** — a have/total pair with no bar and no word "progress". This is the
  collection counter Everkai has nowhere.
- The **portrait strip** is a horizontally scrolling row of this area's catchables at thumbnail
  size, with `🔍 Show All` above its right end.
- **`Go`** is the gold primary bottom-right: a double-chevron over the word. Selecting an area
  and entering it are two separate acts.

### Area Detail

`img/explore-area-showall.png`, `img/explore-area-detail-locked.png`. `Show All` opens a parchment
sheet, `Area Detail`, `✕` tab, scrolling, banded by rarity exactly like `Probability` — but here
the cards are **large, named, and stateful**:

```
 ┌          Area Detail            ✕ ┐
 │ ───── ◇ SSR ◇ ─────               │
 │ [SSR][SSR][SSR]                   │  3 per row, rarity badge top-left of each
 │ Umbranther Wumeow Shibataro       │  name UNDER the card
 │ [SSR][SSR][SSR]                   │
 │ Icywl  Snowbear Grandstag         │
 │ ───── ◇ SR ◇ ──────               │
 │ [SR][SR][SR]                      │
 │ Heartcoon Grimacat Goodychest     │
 │ [🔒][🔒][🔒]     ← greyscale + padlock, NAME STILL SHOWN
 │ Glutizard Califox Scarfmink       │
 └───────────────────────────────────┘
```

**The locked treatment is the capture's convention 5 holding for a third time:** the art goes
fully greyscale, a padlock badge sits centred on the card, the rarity badge stays in colour, and
**the name is still printed**. Nothing is hidden. Compare `img/appearance-locked-form.png` and
`img/locked-preview.png` — same rule, three screens.

That is the direct replacement for Everkai's `P6`, the `<details>` of 25 comma-joined names with
`✓` appended to the owned ones. The tick becomes the absence of a padlock; the name stays; the
art arrives.

---

## 6 · `Intro` — the two-page tutorial

`img/explore-intro.png`, `img/explore-intro-2.png`. A dark full-screen overlay with a red `✕`
top-right, a filmstrip rail of page thumbnails down the left edge, page dots at the foot, and a
gold `›` chevron on the right edge to page forward.

Each page carries **two lessons**, and each lesson is one `before ➜ after` image pair over a
bold heading and one sentence. Four lessons, in order:

| Page | Heading | Sentence | Image pair |
| --- | --- | --- | --- |
| 1 | **Explore Area** | *"Consume stamina to explore and encounter different events."* | a map-and-shovel ➜ a montage of the Luck Flower and an NPC |
| 1 | **Contract Monsters** | *"Use contract items wisely to contract wild monsters."* | three contract medallions ➜ a contracted familiar |
| 2 | **Soothe Monsters** | *"Use mochi to soothe monsters when the alertness of wild monsters is too high."* | a mochi ➜ a monster with a full red Alertness bar |
| 2 | **Attract Monsters** | *"Use incense to attract wild monsters of a specified grade."* | an incense burner ➜ an SSR and an SR familiar, rarity-badged |

Footer button: `Continue` on page 1, **`OK` on page 2** — a different word for the terminal step,
convention 7, on a tutorial.

Note the capture index labels page 1 "Explore Area" and page 2 "Contract Monsters". That is one
lesson per page; the captures show **two lessons per page**. The four headings above are what the
images say.

**The first lesson's image pair is the event roll, drawn.** One map icon on the left, a *montage*
of different outcomes on the right. That is the shape of §0 expressed without a word.

---

## 7 · `Attract` → the Trap Item dialog — a toll, not a destination

`img/explore-attract.png`. A parchment dialog, `Trap Item`, `✕` tab, over a dimmed Explore screen.
Two rows, each: item icon on a rarity-framed tile, name in bold, a two-line description, and a
green `Use` button right-aligned. One shared gold footnote under both rows.

```
 ┌  Trap Item                                    ✕ ┐
 │ ┌─────┐ Basic Incense                           │
 │ │ art │ A common incense that emits a scent     │
 │ └─────┘ favored by wild monsters. Used when     │  ┌─────┐
 │         exploring to attract SR and higher-     │  │ Use │
 │         rarity monsters.                        │  └─────┘
 │ ────────────────────────────────────────────    │
 │ ┌─────┐ Advanced Incense                        │
 │ │ art │ A high-end incense … SSR and higher-    │  ┌─────┐
 │ └─────┘ rarity monsters.                        │  │ Use │
 │                                                 │  └─────┘
 │   Used to encounter a monster of same grade.    │  gold, centred
 │   No stamina consumed.                          │  BOTH LINES
 └─────────────────────────────────────────────────┘
```

**Read the footnote carefully, because it is the whole structural point.** *"Used to encounter a
monster of same grade. No stamina consumed."*

`Attract` does not open a new loop. It re-enters **the same monster-encounter screen** from §4.1,
with two differences: the `PetArea.EventPool` roll is skipped (the branch is forced to
`PetCatch`), and `System.ExplorePetCatchWeight` is replaced by `System.PetTrap`:

```
System.PetTrap = {
  Item_PetAssign1: [ {id: SRProb,  weight: 7000}, {id: SSRProb, weight: 3000} ],
  Item_PetAssign2: [ {id: SRProb,  weight: 0},    {id: SSRProb, weight: 1000} ]
}
```

So an incense burns a finite consumable to **buy a better rarity table and skip a cost that
regenerates on its own**. It has one unique surface — this dialog — and no unique destination.
`System.PetTrapOpen` = 10 gates it.

That is why nothing in it was pressed, and it is also the correct disposition for Everkai:
**build the dialog, or build nothing.** An incense is not a system; it is a price tag on a branch
that already exists. Everkai currently lists it in `S8` as "named in a rules disclosure, built
nowhere", which is the right amount of built — the only defect is that it is *named* in prose
rather than being a dimmed `Attract` button with a padlock and a `10` on it.

---

## 8 · Compared with Everkai

`app/familiar-explore-panel.tsx` renders a stamina bar, a regen line, three area `<button>`s, an
idle area card with the original's flavour text, an encounter block, a last-result line, and
**three `<details>` disclosures** carrying `P4` (196 words of percentages), `P5` (the item bag as
sentences) and `P6` (25 comma-joined names per rarity).

| # | Difference | Kind |
| --- | --- | --- |
| X1 | **Everkai has no event roll in its UI.** The panel has two states, IDLE and ENCOUNTER (`app/familiar-explore-panel.tsx:16–25`). The Luck Flower, the blessings and the lost-item cache all resolve into a one-line `last-result` string. Four captured branches, one line of text. | **structural — the headline of this spec** |
| X2 | No Luck Flower screen. `lib/familiar-explore.mjs` rolls `PetExploreLottery` correctly and pays the bundle; the player sees a sentence. | **structural** |
| X3 | No blessing grant and no badge stack. Buffs are held in `e.items` and surface only as a rewritten verb (`Explore · free (Special Potion)`). The `Remaining: n` count is nowhere. | **structural** |
| X4 | No `Probability` screen. Its content ships as `P4`, a 196-word paragraph, *and* again on the three contract buttons. | **structural** |
| X5 | No world map, no area pins, no `Contracted: n/25`. Areas are three buttons with their gate appended to the label. | **structural** |
| X6 | No Area Detail. `P6` is that screen written as running text. | **structural** |
| X7 | No `Intro`. Everkai's equivalent is the prose that would be deleted by having one. | cosmetic — a 4-panel overlay is cheap and deletes P4 outright |
| X8 | The Alertness bar exists but the rule is a sentence beneath it (`:20`); the original prints `0/100` **inside the bar** and the flee rule once, in gold. | cosmetic |
| X9 | Cost is appended to the verb after a `·`; the original puts `Consume ⚡1` on a second line **inside** the button. | cosmetic but pervasive (audit D11) |
| X10 | `Leave it` (`lib/familiar-explore.mjs` local rule 4) — Everkai's own addition, marked as such because the original's screen could not be read. **The capture settles it: there is no `Leave it`.** `img/encounter.png` has `Use`, `Soothe`, `Skip`, `Ruin` and the back arrow. `Ruin` is the exit. | **structural** — and it resolves audit question 8 |
| X11 | Everkai's contract buttons print the rate per button; the original prints **one** `Contract Success Rate` for the *selected* contract and puts the rest behind `Probability`. | cosmetic |
| X12 | `Full Auto` and the two `Skip` checkboxes are absent from Everkai; `S8` lists auto-explore as unbuilt. All three are gated (`System.PetExploreAutoUnlock` 30, `System.PetExploreSkip` 10, `System.PetCatchSkip` 10). | **structural**, and an owner decision — auto-explore is a second idle loop |
| X14 | **No reward ribbon.** Everkai has no shared payout component at all; every gain is a `last-result` sentence. The original routes four (soon five) call sites through one ribbon with five optional slots (§4.5). | **structural** — build the ribbon first |
| X15 | Everkai resolves a successful contract into the same `last-result` sentence as everything else. The original gives the catch **two full-screen animation beats and no card** (§4.1), deliberately unlike its other three payouts. | **structural**, but the correct fix may be to build *less*: see §4.1's warning against inventing a "You caught X!" modal |
| X13 | The four blessing items' names are already in Everkai (`HELD_ITEMS`), but the panel prints `Track Identification ×2 · When exploring, the chance of finding an SSR monster next time increases.` as a `<li>` sentence (`P5`). The original prints the same string **only at the moment of the grant**, then never again. | cosmetic, and it is where most of P5's words go |

---

## 9 · What Everkai should render

### The model, before any screen

```
rollExploreEvent(area, state) -> { branch, payload }
  branch ∈ { 'scripted', 'monster', 'lostItem', 'blessing', 'luckFlower' }
```

One function, five outcomes, and **the panel switches on `branch`**. Everkai's
`lib/familiar-explore.mjs` already computes this internally; it must return the branch as a
first-class value so the UI can render five screens instead of two states plus a sentence.

### Explore at rest

```
 (i) Snowy Plains
 [⚑ 12] [◈ 20] [✦ 1]                          ← counter stack, chips with counts

 ▣ After encountering 2 SSR monsters…          ( Probability )

              ( area art )

                                              ( Full Auto )
                                                ⚡ 47/50
              (  Explore  )                   ☑ Skip Animation
              ( Consume ⚡1 )

 ( Attract )                                    (  Ruin  )
 ──────────────────────────────────────────────────────────
  «                                                 Intro
```

### The four branch screens

```
MONSTER                         LUCK FLOWER
 ◆N┤ Clapme      (Details)       Luck Flower     (Probability)
 [ Alertness: 34/100       ]         ( 6-petal wheel )
 Monster will flee once…
     ( sprite )                      (  Draw  )
 (i) Contract Success Rate: 70%
     Failed: Alertness +30-40    BLESSING            LOST-ITEM CACHE
  (1 ∞) (2 105) (3 86)           Special Potion       Pleasant Surprise
    Basic Contract                    ( NPC )            ( cache art )
     [    Use    ]                 ╭ flavour ╮
 (Soothe)  ☑ Skip   (Ruin)       ( Investigate )      ( Investigate )
```

The rarity pip carries its letter; the Alertness bar fills **red** and the encounter **stays
open** after a failure. `Use` resolves to two animation beats and returns to Explore — no card.
The other three branches end in the shared ribbon (§4.5).

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Branch of the roll | `PetArea.EventPool` + `PetExploreItem` sub-pool | **yes** — rolled internally; must be **returned**, not just applied |
| Scripted-step override | `PetArea.unspokenRules` | **yes** (`e.steps`) |
| Encounter rarity | `System.ExplorePetCatchWeight` | **yes** |
| Shining chance | `Pet.SPProb` | **yes** |
| Alertness value + cap | `Pet.AlertMax` (100, constant) | **yes** |
| Alertness penalty | `PetCatchItem.Alert` `[30,40]`, constant across grades | **yes** |
| Contract stock, `∞` for grade 1 | `PetCatchItem`, `Item_PetCatch1` unlimited | **yes** |
| Success rate for the **selected** contract | `PetCatchItem.{rarity}Prob` | **yes** |
| `Soothe` magnitude + use cap | `System.PetAssistItem` 30, `System.PetAssistItemUseMax` 3 | **yes** |
| `Probability` band totals | `System.ExplorePetCatchWeight` | **yes** |
| `Probability` per-familiar share | area roster at that rarity, `IsOwnedPet` filtered | **yes** |
| Luck Flower prizes + weights | `PetExploreLottery.Weight` | **yes** |
| Luck Flower **bands** | `PetExploreLottery.Level` (1/2/3) | **derivable — newly resolved, see §4.2**; the module currently calls it unused |
| Blessing item, name, effect | `Item:name:` / `Item:description:` for `Item_PetExploreBuff_01..04` | **yes** — all four already modelled |
| Blessing `Remaining: n` | `e.items[buffId]` | **yes** |
| Lost-item cache title + reward | the `typ: "reward"` row's `Reward_PetExploreItem_01` bundle | **yes** — the bundle is imported; the screen and the `Pleasant Surprise` title are not |
| Reward ribbon, five slots | per call site | **no** — no shared payout component exists |
| Catch presentation | two animation beats, no card | **no**, and §4.1 argues for building less here, not more |
| `Skip` as a stored preference | a per-account boolean on the encounter screen | **no** |
| Counter-stack chips | lost-item count, held blessings | **partially** — the counts exist; the chip component does not |
| Pity counter + banner | — | **no, and do not build it.** No table; see §1.2 |
| Stamina, cap, regen | `System.PetExploreEnergy{,Time,Max,Initial}` | **yes** (20 / 5,400 s) |
| Area pins + gates | `PetArea.unlock` (0/100/200) | **yes** |
| `Contracted: n/total` | owned ∩ area roster | **derivable** |
| Area Detail roster + locked state | area roster + `owned` | **yes** — needs the grid, not the names |
| `Full Auto` gate | `System.PetExploreAutoUnlock` = 30 | **derivable**; the loop itself is unbuilt (`S8`) |
| `Skip` / `Skip Animation` gates | `System.PetExploreSkip`, `System.PetCatchSkip` = 10 | **no** — no skip concept today |
| Incense rarity tables | `System.PetTrap`, `System.PetTrapOpen` = 10 | **no** (`S8`) — the dialog is the whole build |

---

## 10 · Prose to delete, and what replaces it

Everkai's Explore panel carries roughly **350 words** across `P4`, `P5` and `P6` plus its inline
sentences. The original's Explore surface carries **101** (the `(i)`) plus four one-line tutorial
captions and two one-line item descriptions shown at the moment of the grant.

| Delete | Replace with |
| --- | --- |
| `P4` ¶1 — *"…events weighted 40% monster, 50% lost item, 10% Luck Flower; monster rarity weighted N 33.5%, R 47%, SR 15%, SSR 4.5%; each familiar's shining chance; contract success by contract grade and rarity (Basic Contract N 70%, R 10%, SR 7.2%, SSR 3.1% and unlimited; Advanced 100/80/40/10%; Super always succeeds)…"* | the **`Probability` screen** (band headers + per-familiar rates under art), plus one `Contract Success Rate: n%` line for the selected contract. Note the sentence is also **wrong by one branch** — the 50 % is lost-item *and* blessing (30/20) |
| `P4` ¶2 — the provenance essay (RNG, `MustCatch`, buff arithmetic, `Leave it`, `OutTime`) | delete. Every sentence already exists in `lib/familiar-explore.mjs`'s header and in `docs/parity-catalog.csv` E5. Audit finding **D9** |
| `P5` *Your exploring items* — `Track Identification ×2 · When exploring, the chance of finding an SSR monster next time increases.` and siblings | the **counter stack**: a chip with the item's icon and its count. The effect sentence appears once, on the `Blessing Received` ribbon, at the moment it is granted |
| `P5`'s two apologies — `· the Familiar Shop is not built yet`, `· kept for Metamorphosis, not built yet` | nothing. A held item with no sink is a chip with a count; "not built yet" is a repo fact (see spec 12 §5 for the shop's actual table) |
| `P6` *Monsters in Verdant Forest* — four `<li>` of up to 25 comma-joined names with `✓` | **Area Detail**: rarity-banded grid of named art cards, locked ones greyscale + padlock, name still shown |
| `P6`'s trailing `Appears only once contracted elsewhere: Snowbear, Treeraffe (a Familiar Tower reward).` | the locked card's `Source` — the same tooltip the locked-preview component already has |
| `+1 stamina in 46m · one point every 90 minutes` (`:14`) | `⚡ 47/50` beside the button; the rate is `(i)` bullet 3, which also explains why a full tank banks nothing |
| `Explored 41 times here. Events: monster 40% · lost item 50% · Luck Flower 10%.` (`:24`) | delete the count; the rates move to `Probability` |
| `A failed contract raises Alertness by 30-40. At 100 it flees and leaves 4 Familiar Tears.` (`:20`) | the **red-filling bar** with `Alertness: 34/100` printed inside it, plus the two standing lines the original already writes: `Monster will flee once the alertness is full.` under the bar and `Failed: Alertness +30-40` on the rate strip. The original says nothing *extra* when a failure happens — the bar moving is the message |
| Any `last-result` sentence reporting a Luck Flower prize, a blessing or a lost-item find | the **reward ribbon** (§4.5), one component, five optional slots, `Tap to continue` |
| Any future `You caught {name}!` line or modal | nothing. §4.1: the catch is two animation beats and a return to Explore. The acknowledgement belongs on the roster and Handbook badges |
| `Already contracted: a new contract pays 40 fragments.` / `This first meeting succeeds by attempt 2.` (`:18`) | a fragment badge on the monster's name plaque. **Delete the second sentence outright** — it exposes `MustCatch`, which is Everkai's own reading of an undocumented column, to the player |
| `Soothe with Ordinary Mochi · -30 · 7 left · 3 uses` (`:22`) | the `Soothe` art button, bottom-left, with the mochi icon and its count; `-30` as a badge. The cap is `(i)` material |
| `Explore · free (Special Potion)` (`:25`) | keep the free-press behaviour, drop the parenthesis: the button stays `Explore` and its `Consume ⚡1` line greys out. The *why* is the third chip in the counter stack |
| `Leave it` (button) | **delete the button.** The capture settles audit question 8: the original's exit is `Ruin`, which is on every Explore state. Everkai's stated reason — "so a player without contracts is never stuck" — is served by `Ruin` too, and the Basic Contract is `∞` so the stuck case cannot arise |
| `Tower floor 175 cleared.` (`:30`) | delete — duplicated from the Tower page (audit D7's sibling) |
| `{area.text}` flavour, up to 50 words (`:23`) | keep, but as the **area art's caption** on the map's area strip, not on the explore screen. The original's explore screen shows the art and says nothing |
