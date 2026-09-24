# 04 · Metamorphosis (Basic / Refined / Purified)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/detail-metamorphosis.png` (Basic, affordable), `img/metamorph-refined.png`
(Refined), `img/metamorph-purified.png` (Purified, unaffordable), `img/metamorph-info.png`,
`img/detail-shell-ssr.png` (where the result is printed)

Dock position **1** of 4 on the owned-familiar detail shell
(`Metamorphosis · Awaken · Level-Up · Basic Info`). Not in the hub's own `(i)` manifest,
which names only Contracts, Development and Tower.

Tables: **`PetRefreshItem.json`** (3 rows — the three Metamorphixir grades),
**`PetExternalSkill.json`** (49 rows — the weighted roll pools),
**`PetExternalAdd.json`** (5 rows — the five bonus buckets and their grade thresholds),
`Pet.ExternalSkillNum` (slots per familiar), `PetStar.ExternalSkillNum` (the stars at which
slots open). The client calls the whole system **Evolve**
(`UI/Pet/Detail/CompPetDetailEvolve.lua`, `Icon_Pet_Evolve_1/2/3`); "Metamorphosis" is the
English UI word. Everkai's parity row is **E7, ABSENT**.

## Layout

A tall sheet — top edge ≈ y 275 of 1280, deeper than the Awaken and Level-Up half-panels —
with **three file-folder tabs riding above its top edge**, overlapping the art. The active
tab is taller and lighter. `✕` is a red tab clipped to the sheet's top-right corner.

```
 ╭─Basic──╮ ╭Refined╮ ╭Purified╮                        ← folder tabs, 2 lines each
 ┌────────┴─┴───────┴─┴────────┴───────────────────╮ ✕
 │            (i)   Basic Metamorphixir             │   title, `(i)` inline at its left
 │ ┌──────────────────────────┬────────────────────┐│
 │ │ Before Metamorphosis     │✚ Unequipped by Fell││   red ribbon = the bind control
 │ ├──────────────────────────┴────────────────────┤│
 │ │ ( ? )   ???                        │   ???    ││   one row per OWNED slot
 │ ├───────────────────────────────────────────────┤│
 │ │           SSR+ Familiar: 2 Slots              ││   grey caption, not a slot
 │ ├───────────────────────────────────────────────┤│
 │ │           UR Familiar: 3 Slots                ││   grey caption, not a slot
 │ └───────────────────────────────────────────────┘│
 │                      ▼▼▼                          │   big hollow gold arrow
 │ ┌─ Possible Attributes after Metamorphosis ─────┐│
 │ │ (POW) Power                        │ 50K~4M   ││
 │ │ ( ✦ ) Aptitude        [ Rare ]     │ 2~200    ││
 │ │ ( % ) Power           [ Rare ]     │ 3%~240%  ││
 │ └───────────────────────────────────────────────┘│
 │  ◆              ╭─ Metamorphose ─╮                │
 │ Clear           │  🧪  10 / 1     │               │   have green, need white
 └───────────────────────────────────────────────────┘
        [Metamorphosis] [Awaken] [Level-Up] [Basic-Info]
```

| Element | Rendering | Notes |
| --- | --- | --- |
| Folder tabs | Three, above the sheet: `Basic Metamorphose`, `Refined Metamorphose`, `Purified Metamorphose`, two lines each | The active tab is raised and lighter. They are *tabs on the sheet*, not buttons in it. |
| Title | `Basic / Refined / Purified Metamorphixir` on two lines, with the `(i)` medallion inline to its **left** | The title names the **item**, the tab names the **verb**. |
| `Before Metamorphosis` | Cream band, left-aligned | Section header for the current-slot block (`itemCur1` in the client). |
| Bind ribbon | Red parallelogram at the band's right end: a gold `✚` medallion + `Unequipped by Fellows` | It is a **control** — `CompPetDetailEvolve.lua` carries `btnBindHero`. It opens the same picker as the shell's `✚` (spec 13). Red because nothing is equipped. |
| Slot row | `( ? )` medallion · `???` on cream · `???` on grey, with a notched right cap | One row per slot the familiar owns. The **same row shape** as a rolled attribute; only the fill changes (convention 15). |
| Grade captions | Two flat grey bars: `SSR+ Familiar: 2 Slots`, `UR Familiar: 3 Slots` | Not slots and not disabled slots — statements about grades above this one. An SSR familiar shows one real slot and these two captions. |
| Arrow | Large hollow gold chevron, centred, between the two blocks | The before→after axis is vertical here, not the `→` / `»` glyph pair. |
| `Possible Attributes after Metamorphosis` | Small-caps caption over a list of rows | `itemTar1` in the client — the *pool*, not a prediction. |
| Attribute row | bucket medallion · attribute name · optional grade badge · range on grey, notched cap | Badges seen: gold `Rare`, red `Super Rare`. Rows with no badge carry the pool's lowest tier. |
| `Clear` | Black diamond, trash glyph, caption beneath, lower-**left** | `btnReset`. The de-emphasised destructive control. Same slot and treatment as `Progress Reversion` on Level-Up (spec 06). |
| `Metamorphose` | Green hexagonal button, centred, item icon + `have / need` on a second line | Cost **inside** the button (convention 2). |

## The three sub-tabs

The three tabs are three **items**, each with its own balance, which is why one can be
affordable while another is not on the same familiar at the same moment. The captured pair
is `10/1` green on Basic against `0/1` red on Purified — with `30/1` green on Refined in
between — and that is one screen, three tabs, three currencies, not one gate flickering.

The pools come from `PetRefreshItem.json`, **not** from the screen:

| Tab | `PetRefreshItem` row | `Item` | Buckets in `Scope` (table values) |
| --- | --- | --- | --- |
| Basic | `1`, `ItemType 1` | `Item_PetRefresh1` (`Icon_Pet_Evolve_1`) | prop 1 add 50,000–4,000,000 · prop 2 add 2–200 · prop 3 percent 300–24,000 |
| Refined | `2`, `ItemType 2` | `Item_PetRefresh2` (`Icon_Pet_Evolve_2`) | prop 1 add 2,500,000–4,000,000 · prop 2 add 125–200 · prop 3 percent 15,000–24,000 · prop 4 percent 500–800 |
| Purified | `3`, `ItemType 3` | `Item_PetRefresh3` (`Icon_Pet_Evolve_3`) | prop 2 add 187–250 · prop 3 percent 22,500–30,000 · prop 4 percent 750–1,000 |

`prop` indexes `PetExternalAdd.json`, whose five rows are the buckets
(`docs/isekai-power-graph.md:216`, `PetManager.lua:57–63`): 1 Power, 2 Aptitude, 3 Power %,
4 Aptitude %, 5 All-Power %. `PetExternalAdd.GradeSection` carries five thresholds per
bucket — that is the `(i)`'s "five grades based on the value increase: N, R, SR, SSR, UR",
and it is what the `Rare` / `Super Rare` badges classify.

Three rows on Basic, four on Refined, three on Purified — **the table's bucket count per
row and the captured row count per tab agree exactly**, and so does the ordering. The
per-roll weighting is `PetExternalSkill.json`: 49 rows keyed `ItemType` 1/2/3 (31/8/10),
each a weighted pool of `{type, min, max}`, with `CostAdd` running 0→300 across 40 distinct
values — a per-roll cost escalation that the captured (never-rolled) state does not show.

## States

| State | Rendering | Captured |
| --- | --- | --- |
| Slot never rolled | `( ? ) ??? ???` | yes, all three tabs |
| Slot rolled | bucket medallion + attribute + value — the row shape the "after" block already uses | **no** (the familiar has never been metamorphosed) |
| Slot locked by the player | `CompPetDetailEvolve.lua` carries `btnLock`, `_OnClickLock`, `IsEvolveAttrLocked`, `RqPetEvolveSkillLockSlot`, and `PetRefreshItem` carries `Cost1: 2` / `Cost2: 3` beside `Cost: 1` — a lock-count cost ladder | **no**, and nothing on the captured screen shows it, because there is nothing rolled to lock |
| Affordable | `have` in **green**, button green | yes — Basic `10/1`, Refined `30/1` |
| Unaffordable | `have` in **red**, button **still green** | yes — Purified `0/1`. The button does not grey and does not change word; only the number recolours. |
| Slot not yet unlocked | — | **not captured**. `PetStar.ExternalSkillNum` opens slots at stars **5** and **10**; `Pet.ExternalSkillNum` gives 0 slots to grades 1/2/3, 1 to grade 4, 2 to grade 9, 3 to grade 5. The captured familiar is grade 4 at 5★, so its one slot is already open. |
| Familiar with no slots at all | — | **not captured**; grades 1–3 (N/R/SR) have `ExternalSkillNum: 0` on all 35 such rows. |

`Metamorphose` and `Clear` were **not pressed** — a spend and a destructive wipe. The
affordable/unaffordable pair was captured instead, on the sub-tabs, deliberately.

## `(i)` Information

One cream dialog, two headings, eight bullets, and it is the only prose on the surface. In
the game's own words it establishes, without a single number the tables do not also carry:

- three items, one verb, and each item's pool floor — Basic's lowest is N-grade, Refined's
  lowest is SSR-grade, Purified's lowest is UR-grade, all three topping out at UR;
- which buckets each item can roll (Basic: Power, Aptitude, Power %; Refined: adds
  Aptitude %; Purified: drops flat Power) — **matching `PetRefreshItem.Scope`'s prop lists
  exactly**;
- slots by grade: *"No bonus slots for N~SR grade familiars; 1 bonus slot for SSR grade
  familiars; 2 bonus slots for SSR+ grade familiars; 3 bonus slots for UR grade familiars."*
  Measured against `Pet.ExternalSkillNum`: grades 1/2/3 → 0 (35 rows), grade 4 → 1 (13),
  grade 9 → 2 (9), grade 5 → 3 (13). **Exact.** This also fixes the grade enum for the whole
  Familiar surface: 1 N, 2 R, 3 SR, 4 SSR, 9 SSR+, 5 UR.
- *"Bonus slots unlock as the familiar's star upgrades."* → `PetStar.ExternalSkillNum`,
  present on exactly two rows, stars 5 and 10.

## Compared with Everkai

Everkai renders **no Metamorphosis screen at all**. `app/familiar-explore-panel.tsx:28`
lists the accumulated items inside the *Your exploring items* disclosure and apologises:

> `Basic Metamorphixir ×3 · kept for Metamorphosis, not built yet`

| # | Difference | Kind |
| --- | --- | --- |
| M1 | The system is absent. Two Metamorphixir grades accumulate in the save with no sink; the whole Fellow-Power faucet the buckets feed is missing. | **structural** |
| M2 | Everkai knows only two of the three items. `lib/familiar-explore-data.json:47–48` names `Item_PetRefresh1` "Basic Metamorphixir" and `Item_PetRefresh2` "Refined Metamorphixir"; there is no `Item_PetRefresh3`. `PetRefreshItem` has **three** rows and the original ships three sub-tabs. | **structural** |
| M3 | Everkai drops Metamorphixirs from **exploring**. In the original they are not an exploration reward: `PetExploreItem.json` (15 rows) contains no `PetRefresh*` at all; the references are in `ExchangeShop` (a `PetRefreshShop`), `ScoreExchange`, `GeneralActivity`, `GiftEvent` and a gacha bag, plus `System.PetRefreshInitial`. Everkai's faucet is local and unmarked. | **structural** |
| M4 | Everkai has no concept of a per-familiar **bonus slot**, so nothing carries `Pet.ExternalSkillNum` or `PetStar.ExternalSkillNum`. The data inventory lists both as dropped. | **structural** |
| M5 | Everkai has no attribute **lock**, and no per-roll cost escalation (`PetExternalSkill.CostAdd`). | **structural** — but see the note below; it is second-order. |
| M6 | Where Everkai *would* put the result, it has no place for it: the original prints the five buckets on the shell under the art (`Final Power Bonus +x%` as a gold banner over a 2×2 grid). Everkai's familiar detail shows only a 3-cell ATK/HP/SPD row (`app/familiar-panel.tsx:35`). | **structural** |

There is no cosmetic row in this table, because there is nothing to dress.

**What this settles for the E7 balance warning.** The catalogue defers E7 as an owner
decision because it moves the power economy. The capture sharpens the decision rather than
making it: the system is **one button, one item, one row per slot**, gated to SSR and above
(`Pet.ExternalSkillNum` is 0 on exactly half the roster), and its magnitude is bounded by
`PetExternalAdd.GradeSection` — bucket 1 tops at 3,750,000. It is small in UI and large in
economy. Recommend building the panel against the tables and gating the *faucet*, not the
screen.

## What Everkai should render

A fourth growth surface beside Training, reached from an icon dock (spec 06's D2), shaped
as above:

- **Three tabs, one per `PetRefreshItem` row**, each carrying its own item balance. Do not
  collapse them into a grade `<select>`; the tab *is* the currency.
- **A slot block sized by `Pet.ExternalSkillNum`**, one row per owned slot, `???` when
  unrolled, with the grade captions for the tiers above kept as flat grey bars — they are
  the cheapest possible explanation of why a player's SR familiar has none.
- **A pool block** listing that item's buckets from `PetRefreshItem.Scope`, each with its
  grade badge from `PetExternalAdd.GradeSection`. The pool is not a prediction and should
  not be worded as one.
- **`Metamorphose`** with the item icon and `have/need` inside it, green, the `have`
  recolouring red when short — the button itself does not grey.
- **`Clear`** at the lower left in the de-emphasised diamond treatment, behind a confirm.
- The `(i)` holds every sentence.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Three tabs and their items | `PetRefreshItem` 3 rows, `Item` field | **partially** — two of three names in `familiar-explore-data.json`; `Item_PetRefresh3` missing |
| Slot count per familiar | `Pet.ExternalSkillNum` | **no** — never imported |
| Slot unlock stars | `PetStar.ExternalSkillNum` (stars 5, 10) | **no** |
| Roll pool per tab | `PetRefreshItem.Scope`, weighted by `PetExternalSkill` (49 rows) | **no** |
| Bucket identities and grade thresholds | `PetExternalAdd` 5 rows | **partially** — the bucket meanings are recorded in `docs/isekai-power-graph.md:216`; the rows are not imported |
| Per-roll cost escalation | `PetExternalSkill.CostAdd` (0→300, 40 distinct) | **no** |
| Lock cost ladder | `PetRefreshItem.Cost1`, `Cost2` | **no** |
| Where the result is paid | the same four/five buckets the shell prints; `lib/familiar-nodes.mjs` already pays `flat`/`aptitude`/`percent`/`finalPercent` into `bondedPower` | **yes** — the payment path exists and is already wired to business earnings |
| Metamorphixir sources | `ExchangeShop`, `ScoreExchange`, `GeneralActivity`, `GiftEvent`, `System.PetRefreshInitial` | **no** — Everkai invents an exploring drop |

The last row of that table is the good news: Everkai does not need a new power pipeline for
E7. Its familiar→Fellow bonus already carries the four fields these buckets fill.

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Basic Metamorphixir ×3 · kept for Metamorphosis, not built yet` (`app/familiar-explore-panel.tsx:28`) | the item's icon and count in the bag, and a real Metamorphosis tab to spend it on |
| `· the Familiar Shop is not built yet` and the rest of the apology pattern in the same disclosure | nothing — an item with a sink needs no apology |
| any future sentence explaining what a grade badge means | the `(i)`, which already says it in the original's words |
| any future sentence explaining slot counts | the two grey grade-caption bars, which are the original's own answer |
