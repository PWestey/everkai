# 04 · Bonds (the relationship rung)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/bonds.png`, `img/bonds-lowest-rung.png`, `img/bonds-blessing-ladder.png`,
`img/bonds-intellect-preview.png`

Dock position **2**, on every member. Serves manifest headings 4 and 7 (*Family
Relationship*, *Improving relationships*). Table: `WifeIntimacyDegree.json`.

**Read the name carefully.** The original's `Bonds` is the *relationship rung* — Acquainted →
Forever★★. It is **not** Everkai's `Bonds` page, which is Fellow pairing. Everkai's
relationship control lives on its `Profile` page. The two need swapping.

## Layout

Half sheet, top edge y ≈ 645, `✕` tab top-right.

```
 ┌ ◇  Current Bond  ◇                                 ✕ ┐
 │        ╭───◇═════════════════◇───╮                   │
 │        │       Loving★★          │                   │  rung banner, gold, centred
 │        ╰──────────────────────────╯                   │
 │ ┌────┬────────────────────────────────────────┬───┐  │
 │ │icon│ Lv.4:Family Blessing                   │(i)│  │
 │ │    │ ──────────────────────────────────────  │   │  │
 │ │    │ Shinobu's (Fellow) Power +50%          │   │  │
 │ └────┴────────────────────────────────────────┴───┘  │
 │ ┌───────────────────────────────────────────┬───┐   │
 │ │ Adopted Children Intellect   A+           │(i)│   │
 │ └───────────────────────────────────────────┴───┘   │
 │                                                       │
 │ Intimacy:       ♥[▓▓▓▓▓▓░░░ 13710/20000 ]  ┌────────┐│
 │ Blessing Power: 💧[▓▓▓▓▓▓░░░ 13810/20000 ] │Improve ││  green, right, v-centred
 │ Total Family:   👥[▓▓▓▓▓▓▓▓▓▓ 42/30      ] └────────┘│  on the three bars
 └───────────────────────────────────────────────────────┘
```

## The rung banner

A wide gold chamfered plate, centred, carrying the rung name with its star suffix. Colour
tracks the rung family: gold/brown at `Loving`, green at `Acquainted`. Same wording and
colour as the ribbon on the art (spec 02) and as the group headers in the Family List
(spec 12) — one vocabulary, three places.

## The two effect cards

Both are wide rows with a `(i)` button pinned to the right edge.

**Card 1 — the bond's own skill.** Icon at left (a distinct art asset per skill), then:
- Title `Lv.4:Family Blessing` — the rung level and the skill's name, colon-joined, gold.
  **The skill name varies per member**: `Family Blessing` on one, `Love Blessing` on another.
- A hairline rule.
- The effect as a templated sentence: `Shinobu's (Fellow) Power +50%`. The `(Fellow)`
  disambiguator is the original's own — a member and a Fellow can share a name.

At `Lv.0` the whole effect line is rendered **grey**, and the template gains a trailing
parenthetical: `Camping Under the Stars points earned +4(Unlocks at Acquainted)`. That is the
convention: an inactive effect keeps its text, loses its colour, and names its gate in
parentheses. No separate "locked" badge, no greyed-out card.

**Card 2 — the pupil grade.** `Adopted Children Intellect` plus a single **letter grade**
(`A+`, `D`) in a colour that tracks the grade. No icon, no rule, no sentence.

## The two `(i)` tooltips — the best prose-to-visual swap on the surface

**Card 1's `(i)`** — a dark popover listing the *remaining* ladder, one line per rung, the
current one **green** and prefixed with its rung in parentheses:

```
(Loving★) Shinobu's (Fellow) Power +50%      ← green
Forever:  Shinobu's (Fellow) Power +60%
Forever★★:Shinobu's (Fellow) Power +70%
```

**Card 2's `(i)`** — a four-row `old » new` table with gold `»` chevrons and the new value
green:

```
Pupil Intellect:    A+   »  S-
Education Reward:  📗175% » 200%
Graduation Reward: 📕 48  » 54
Basic Earnings:    🏠500% » 600%
```

This is the canonical convention-1 artefact for the whole game. Four numbers, four icons,
one glyph, zero sentences. Everkai's equivalent today is
`Future pupil Intellect: {relationship*10}. Intimacy is not consumed.`

## The gate block

Three rows, each `label:` at left and a progress bar filling the rest of the width, with
`have/need` printed **inside the fill**, centred, small.

| Row | Icon | Bar colour |
| --- | --- | --- |
| `Intimacy:` | pink heart | pink |
| `Blessing Power:` | blue droplet | cyan |
| `Total Family:` | green people | green |

A met gate is a **full bar** (`42/30` — the bar does not clamp its label to the target, it
shows the real have). An unmet gate is partly filled against a dark track. Nothing says which
one is short. Nothing says "requires". Convention 12.

`Total Family` is an **account-wide** gate — how many members you have joined — sitting in a
per-member panel. Worth noting: the original gates a personal relationship on roster breadth,
exactly as `HeroStar.needHeroStarCount` gates Fellow Awaken on roster breadth.

## The primary action

Green `Improve`, right-hand side, vertically centred against the three bars rather than
sitting below them. It carries an **orange dot badge** when every gate is met. It is *not*
disabled when they are not — the badge is the affordance, the press is the feedback. (Not
pressed; see README.)

## Compared with Everkai

Everkai splits this across two places:

- `app/family-panel.tsx` Profile page: `<h3>Relationship · Tier 3</h3>`,
  `<p>Future pupil Intellect: 30. Intimacy is not consumed.</p>`, and a button reading
  `Improve relationship · requires 2,000 Intimacy`.
- `app/bond-panel.tsx` (`Bonds` page): an entirely different system — Fellow pairing, a
  `<select>` of recruited Fellows, `Bond level 3/10`, `+6% per Fellow`, a `Strengthen · n
  points` button and a 54-word `rules-note` about a community wiki snapshot.

| Difference | Kind |
| --- | --- |
| Everkai's `Bonds` tab is Fellow pairing; the original's is the relationship rung | **structural** — the label collides. Rename Everkai's pairing UI (it belongs with `Blessing`, spec 07) and give `Bonds` the rung. |
| `Tier 3` against named rungs (`Acquainted` … `Forever★★`) | **structural** — the names are content the original ships and Everkai does not |
| One gate (`requires 2,000 Intimacy`) against three gates as bars | **structural** — Everkai's `relationRequired()` models Intimacy only; Blessing Power and Total Family are not gates today |
| `Future pupil Intellect: 30` against `A+ » S-` plus three more previewed rewards | **structural** |
| The rung's granted skill (`Lv.4: Family Blessing → Shinobu's Power +50%`) has no Everkai equivalent on this screen | **structural** — but see `lib/blessings.mjs`; Everkai pays Fellow Power from Family, just not off the rung |
| Everkai's cost/gate is in the button label; the original's is in bars, and the button is one word | **cosmetic** |
| No rung ladder preview | **structural** |
| 54-word `rules-note` against two `(i)` popovers | **cosmetic** by mechanism, **structural** by volume |

## What Everkai should render

```
◇ Current Bond ◇                                       ✕

              ╭── ◇  Loving★★  ◇ ──╮

[icon] Lv.4:Family Blessing                          (i)
       ─────────────────────────────
       Shinobu's (Fellow) Power +50%

       Adopted Children Intellect   A+                (i)

Intimacy:       ♥ [▓▓▓▓▓▓░░░ 13,710/20,000 ]    ┌─────────┐
Blessing Power: 💧[▓▓▓▓▓▓░░░ 13,810/20,000 ]    │ Improve │
Total Family:   👥[▓▓▓▓▓▓▓▓▓▓ 42/30        ]    └─────────┘
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Rung name + star suffix | a named ladder keyed off `member.relationship` | **no** — Everkai stores 1..5 and prints `Tier n`. `WifeIntimacyDegree.json` has the levels; the *names* come from `translate.json`. |
| Rung's granted skill name + level + effect | per-member skill id | **no** |
| Full rung ladder for the `(i)` | every rung's effect value | **no** |
| Pupil grade letter | grade at this rung | **partially** — Everkai computes `relationship*10` as a number, not a graded letter |
| Pupil `» next` preview (4 rows) | next rung's grade, education %, graduation count, basic earnings % | **partially** — `lib/school.mjs` has pupil formulas; the four-row shape is new |
| Intimacy gate | `relationRequired(member.relationship)` | **yes** |
| Blessing Power gate | — | **no** |
| Total Family gate | `Object.keys(game.family).length` vs a per-rung target | **derivable**, not modelled |
| `Improve` ready badge | all three gates met | **derivable** |

**Before building the three-bar block, check `WifeIntimacyDegree.json`.** Its rows carry
`intimacy`, `charm` and a `consume` item per `wifeId`/`level` — that is two of the three
gates plus a currency, and it is per-member, not a shared curve. The `Total Family` gate is
not in that table; find it before inventing a number (rule 1).

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Relationship · Tier 3` | the named rung on a gold banner, matching the ribbon on the art |
| `Future pupil Intellect: 30. Intimacy is not consumed.` | `Adopted Children Intellect  A+` with an `(i)` holding the four-row `»` preview |
| `Improve relationship · requires 2,000 Intimacy` | three gate bars and a one-word `Improve` |
| `app/bond-panel.tsx`'s `This family member supports their original Fellows together. Dates supply Blessing Points for training.` | the Blessing tab's blessed-Fellow portrait row (spec 07) — the pairing is a picture of who, not a sentence about what |
| `{n} recruited Fellows receive this bond. Bonuses from other family members stack.` | delete; it restates the portrait row |
| `Total bond bonus: +18% Power and business earnings.` | the `POW +n` badge under the blessed Fellow's portrait (spec 07) |
| The 54-word wiki-snapshot `rules-note` | a provenance note in `docs/`, not on screen |
