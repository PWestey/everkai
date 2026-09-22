# 07 · Operation

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Image: `img/operation.png`

**Everkai has no equivalent of this screen.** Cross-reference
`docs/character-systems-gap.md`.

## What it is

Operation is the fellow's *building-assignment* strength — what they add to a building's
earnings when appointed to it. It is the bridge between the Fellow screen and the Village
screen, and Everkai currently expresses the same idea as "appointment yield" buried in a
Stella sentence.

## Layout

A short **half panel**, top edge y ≈ 665, bottom flush to the dock. It does **not**
scroll — the whole section fits.

```
 ┌             ◇ Operation Skill ◇             ✕ ┐
 │ ┌────┬────────────────────────────────────┐   │
 │ │    │ Operation Faculty Ⅶ: Lv. 101/300   │   │
 │ │ art│ When operating building of the     │   │
 │ │    │ Informed type, its earnings get    │   │  "Informed" in green
 │ │    │ +750%.                             │   │
 │ │    │ (Next level +755%)                 │   │  green
 │ └────┴───────────[Quick|x1|x10|x100]──────┘   │
 │                  ┌──────────────────┐         │
 │                  │   Upgrade x23    │         │
 │                  │  1.101K/1.094K   │         │
 │                  └──────────────────┘         │
 │  ─────────◇ Operation Effect ◇─────────       │
 │ ┌───────────────────────────────────────┐     │
 │ │ ★  When operating building of the     │     │
 │ │    Informed type, its earnings get an │     │
 │ │    extra +20%.                        │     │
 │ └───────────────────────────────────────┘     │
 │ ┌───────────────────────────────────────┐     │
 │ │ ★  … an extra +30%.                   │     │
 │ └───────────────────────────────────────┘     │
 └───────────────────────────────────────────────┘
```

## Two blocks

**`Operation Skill`** — one upgradeable skill.
- Title: `Operation Faculty Ⅶ: Lv. 101/300`. The roman numeral is part of the skill's
  name (its tier); the arabic level follows after a colon.
- Effect in brown body text with the **class name coloured green** inside the sentence —
  `the Informed type`. This inline colouring is how the original marks the parameter
  inside a templated string. Worth copying: it turns a sentence into a readable formula.
- `(Next level +755%)` in green parentheses. Note the lowercase `level` here where
  Awaken/Aptitude use `(Next Level …)` — the original is inconsistent; use `Next Level`
  consistently in Everkai.
- Quantity selector, then the green button **below and to the right** of the card, not
  inside it.

**`Operation Effect`** — passive, non-upgradeable effects. Star-bulleted rows, each a
single templated sentence with the class name in green and the value in green. Two rows
observed. There is no level, no cost, no button — these are what the fellow already
grants.

## The clamping example

The selector shows `x100` selected, but the button reads **`Upgrade x23`** with
`1.101K/1.094K` beneath. The player holds 1.101K of the currency; 100 levels would cost
more than that; 23 is what the balance buys. The original never says so — it just changes
the number in the verb.

This is the single clearest demonstration of convention 4 in the index, and the reason to
implement the selector as *intent* rather than *amount*.

## What Everkai should render

A short half panel, two blocks, no scroll.

```
◇ Operation Skill ◇
[art] Operation Faculty VII: Lv. 101/300
      When operating a building of the {Informed} type,
      its earnings get +750%. (Next Level +755%)
                         [Quick|x1|x10|x100]
                         [ Upgrade x23 · 1.101K/1.094K ]

◇ Operation Effect ◇
★ When operating a building of the {Informed} type, its earnings get an extra +20%.
★ When operating a building of the {Informed} type, its earnings get an extra +30%.
```

`{…}` marks the token to render in the class colour.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Operation skill name + tier | name, roman tier | **no** |
| Level / cap | 101 / 300 | **no** |
| Effect template + parameters | class, percent | **partially** — Everkai models appointment yield as a scalar; the template and the class binding are new |
| Next-level value | per-level curve | **no** |
| Upgrade currency + cost curve | item id, cost | **no** |
| Passive operation effects | list of templated effects | **no** |

**What these captures confirm for `docs/character-systems-gap.md`:**

- Operation is a **per-fellow, per-class** multiplier on building earnings, gated on the
  fellow being *appointed to a building of their own class*. It is not a flat yield bonus.
- It has an upgradeable component (`Operation Faculty`, Lv. 101/300, paid) and a set of
  **unlocked passive effects** that stack additively on top (`+20%`, `+30%`).
- The magnitudes here are enormous (`+750%`) and come from a heavily progressed private
  server save — they are exactly the kind of number the caveat forbids importing. Take
  the curve from the config tables.
- The locked-fellow Skills tab (spec 12) also lists `Operation Skill` as one of five
  sections shown for an unowned fellow, with the entry `Operation Faculty V` — so the
  starting tier varies per fellow and is previewable before recruitment.

## Prose to delete, and what replaces it

Nothing to delete — Everkai does not have this screen. When building it:

| Do not write | Write instead |
| --- | --- |
| "Appointment yield +400%" as a bare scalar in a Stella sentence | a real Operation section with a named, levelled skill |
| "This bonus only applies when the Fellow is assigned to a building matching their type." | the effect sentence itself, with `Informed` in the class colour — the condition is in the text the player already reads |
| A rules disclosure explaining stacking | the `Operation Effect` block, one star-bulleted line per effect |
| "You can afford 23 of the 100 upgrades you selected" | `Upgrade x23` |
