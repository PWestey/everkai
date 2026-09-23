# 12 · Family List and Skill Bonus — the two aggregate views

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/family-list.png`, `img/family-list-pupil-bonus.png`,
`img/skill-bonus-overview.png`

Two roster-level surfaces that answer "where do my Family numbers actually come from". They
are the Family counterpart of the Fellow set's spec 11 (number transparency), and **Everkai
has neither**.

---

## Family List

Roster footer, right-most. Serves manifest heading 10.

A full surface: the same card grid, **grouped by relationship rung, descending**.

```
 0 ───────────────────────────────────────────────────  game bar
44 │ (i) Family List                                   │
   │ ╭══════════════════════════════════════════╮ (i)  │  group banner, full width
   │ │          Loving★★ (1 people)             │      │  colour tracks the rung
   │ ╰══════════════════════════════════════════╯      │
   │ ┌───────┐                                         │
   │ │ card  │                                         │  same card as the roster
   │ └───────┘                                         │
   │ ╭══════════════════════════════════════════╮ (i)  │
   │ │          Loving★ (1 people)              │      │
   │ ╰══════════════════════════════════════════╯      │
   │ ┌───────┐                                         │
   │ └───────┘                                         │
   │ ╭══════════════════════════════════════════╮ (i)  │
   │ │          Loving (4 people)               │      │
   │ ╰══════════════════════════════════════════╯      │
   │ ┌───────┐┌───────┐┌───────┐                       │
   │ └───────┘└───────┘└───────┘                       │
   │                 … scrolls …                       │
   │ ╭══════════════════════════════════════════╮ (i)  │
   │ │          Acquainted (7 people)           │      │  green banner at the bottom
   │ ╰══════════════════════════════════════════╯      │
1185├───────────────────────────────────────────────────┤
   │  «                                                │
1280└───────────────────────────────────────────────────┘
```

- Group banners are chamfered full-width plates carrying `RungName (n people)` centred, with
  a **`(i)` clipped to the banner's right end**.
- Banner colour tracks the rung family — gold/brown at Loving, purple at Affectionate★★,
  green at Acquainted. Same palette as the ribbon on the member art and the banner on the
  Bonds panel.
- Only **joined** members appear. Empty rungs are omitted, not shown empty.
- Cards are the roster card, unchanged.

### The group `(i)` — "Pupil Effect Bonus"

```
 ┌ ◇  Pupil Effect Bonus  ◇  ┐
 │  Intellect:            A+ │   gold
 │  Education Bonus:     175%│   green
 │  Village Earnings Bonus: 500%│ green
 └───────────────────────────┘
```

Three rows, label left, value right. This is **what that rung is worth**, shown on the rung
itself rather than on each member. Together with the Bonds `(i)`'s `A+ » S-` preview
(spec 04) it gives the player both "what I have at this rung" and "what the next rung would
give", in two places, with no paragraphs.

That is the design answer to Everkai's `Future pupil Intellect: 30. Intimacy is not
consumed.`

---

## Skill Bonus Overview

The circular button at the top-right of the roster header. Opens a bordered dark overlay
(not a parchment sheet — this one is a read-out, and it is styled like a tooltip):

```
 ┌ ◁  Skill Bonus Overview  ▷ ┐
 │  Total unlocked skills: 967│   967 in green
 │  ♪ Inspiring  Building Earning Bonus  +6725% │   green
 │  ☀ Diligent   Building Earning Bonus  +6853% │
 │  ⚔ Brave      Building Earning Bonus  +6756% │
 │  📖 Informed  Building Earning Bonus  +6854% │
 │  🕊 Unfettered Building Earning Bonus +6688% │
 └─────────────────────────────────────────────┘
```

Five rows, each `class icon + "{Class} Building Earning Bonus" + green value`, plus one
header line giving the total number of Fathom slots unlocked **across the whole family**.

This is `GetAllWifeBuildingOutputRise(Country)` made visible: the sum, per building class, of
every Fathom slot on every family member. It is the number that actually multiplies the
village's earnings, and the per-member strip on the Skills tab (spec 05) is only the local
contribution to it.

**It has no `(i)` and no prose.** A count, five rows, done.

---

## Compared with Everkai

| Difference | Kind |
| --- | --- |
| No Family List at all | **structural** — Everkai has no rung-grouped view and no per-rung reward view |
| No Skill Bonus Overview | **structural**, and it is the cheapest item in this whole spec set: `fathomBonus(game,type)` already returns exactly these five numbers |
| Everkai's account-wide totals are printed as sentences *inside* per-member panels — `Across the whole family: +2,340% village earnings, at every business` in `latency-panel.tsx`, `Across the whole family: +12.4% to every business's earnings` in `family-stella-panel.tsx`, and the five type chips in `fathom-panel.tsx` | **structural** — the original keeps account totals on account-level surfaces and member values on member surfaces. Everkai mixes them, which is why the member panels read as essays. |

## What Everkai should render

Two new roster-level surfaces, both read-only:

**Family List** — the roster grid, grouped by named rung, descending, with a count in each
banner and an `(i)` per banner holding that rung's three pupil values.

**Overview** — one overlay reached from the roster header, holding everything that is
currently written as an "across the whole family" sentence:

```
 ◁ Family Bonuses ▷
 Total unlocked skills: 967

 ♪ Inspiring  Building Earning Bonus   +6725%
 ☀ Diligent   Building Earning Bonus   +6853%
 ⚔ Brave      Building Earning Bonus   +6756%
 📖 Informed  Building Earning Bonus   +6854%
 🕊 Unfettered Building Earning Bonus  +6688%

 💧 Latency          All Building Earnings  +2340%
 ✦ Family Stella    All Building Earnings  +12%
```

The last two rows are an Everkai extension of the original's overlay, and they are justified:
the original has no single place for them either, and moving them here deletes two paragraphs
from two member panels. Keep them clearly separated from the five measured Fathom rows.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Per-class Fathom totals | `fathomBonus(game,type)` ×5 | **yes** |
| Total unlocked slot count | `Σ openSlots(game,id)` over the family | **derivable** |
| Account Latency total | `latencyBonus(game)` | **yes** |
| Account Family Stella yield | `familyStellaYield(game)` | **yes** |
| Rung names + counts | a named ladder over `member.relationship` | **no** (see spec 04) |
| Per-rung pupil values (Intellect grade, Education %, Village Earnings %) | `lib/school.mjs` | **partially** — the three-value shape is new |

## Prose to delete, and what replaces it

| Delete (and where) | Replace with |
| --- | --- |
| `Across the whole family: +2,340% village earnings, at every business. The original sums this over every member, so each one you raise raises all seventeen businesses again.` — `latency-panel.tsx` | a `Latency  All Building Earnings +2340%` row in the overview |
| `Across the whole family: +12.4% to every business's earnings.` — `family-stella-panel.tsx` | a `Family Stella  All Building Earnings +12%` row in the overview |
| `Bonuses shown here are this whole family's contribution, not this member's alone` — `fathom-panel.tsx` rules-note | the five class rows in the overview, and a **per-member** strip on the member's own Skills tab |
| `{n} recruited Fellows receive this bond. Bonuses from other family members stack.` — `bond-panel.tsx` | the blessed-Fellow portrait row (spec 07) plus the overview |
| `Future pupil Intellect: 30. Intimacy is not consumed.` — `family-panel.tsx` | `Adopted Children Intellect A+` on Bonds, and `Pupil Effect Bonus` behind the rung banner's `(i)` |
