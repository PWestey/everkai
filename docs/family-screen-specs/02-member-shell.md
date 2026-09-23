# 02 · Member shell ("Family Training")

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/member-shell-ur.png`, `img/member-shell-ssr.png`, `img/member-shell-r.png`,
`img/member-hide.png`, `img/member-info.png`, `img/stat-intimacy-tooltip.png`,
`img/stat-blessingpower-tooltip.png`

Serves manifest headings 1, 2, 3, 4.

## What it is

The frame every Family section renders inside. Header reads **`Family Training`** — not the
member's name, not "Family". The art is full-bleed behind everything; every panel is a sheet
that slides up over its lower half.

It is the direct counterpart of the Fellow `Cultivate` shell (spec 02 of the Fellow set) and
shares its grammar exactly: rarity badge top-left, name banner top-centre, a right rail,
`‹ ›` paging at the vertical middle of the art, stats along the bottom-left, a primary
affordance bottom-right, an icon dock at the foot.

## Layout

```
 0 ─────────────────────────────────────────────────────  game bar
44 │ (i) Family Training                                 │  header strip, semi-transparent
   │ ╔══╗        ╭─────────────────╮              ◈ Hide │  rarity badge (70,168) 96²
   │ ║UR║        │  Insect Hashira │              ◈ Info │  right rail, 3 items,
   │ ╚══╝        │  Shinobu Kocho  │              ♥ Fav. │  x = 648, y = 165/240/330
   │             ╰─────────────────╯                     │  each ≈ 60 icon + 20 label
   │  ‹                                              ›   │  y ≈ 530, edge-anchored
   │                    full-bleed art                   │
   │        ┌───────────────────────────────┐      ◈Story│  speech bubble, y ≈ 795-885
   │        │ Goo                           │      ◈Trav.│  rail 2, y = 833 / 943
   │        └───────────────────────────────┘      ╭───╮ │
   │ ╭ Loving★★ ◇                                  │Gift│ │  ribbon, left-anchored, y=1026
   │ (♥) Intimacy      (💧) Blessing Power        ╰───╯ │  medallions d≈56, y≈1090
   │      13,710             13,810                      │
1185├─────────────────────────────────────────────────────┤
   │  «    Stella   Bonds   Skills   Blessing  Interact  │  dock
1280└─────────────────────────────────────────────────────┘
```

When a dock panel opens, it occupies from y ≈ 500–650 (varies by section) down to y = 1185,
with a **red `✕` tab clipped to its top-right corner**. The ribbon and stat medallions
migrate up the left edge to sit above the panel; everything else stays put.

## Rarity and the dock

**The dock length is rarity-gated.**

| Rarity | Badge | Dock |
| --- | --- | --- |
| UR | orange/red starburst, white `UR` | `Stella · Bonds · Skills · Blessing · Interact` (5) |
| SSR | gold starburst, gold `SSR` | `Bonds · Skills · Blessing · Interact` (4) |
| SSR+ | gold starburst with `+` | (not tested on Family) |
| R | blue hexagon, blue `R` | `Bonds · Skills · Blessing · Interact` (4) |

This matches the Stella `(i)`'s own wording: *"Some rare Family members have a Stella."* The
dock does not grey the tab out — **it is not there**. Convention 7 (a disabled state is a
different word, not a greyed button) generalises here to: a disabled *section* is an absent
tab.

`Interact` is the default selection and is the state with no panel open.

## Elements

**Rarity badge** — top-left, ≈ 96 px, inert. Not a rarity-upgrade entry point (see README's
unreached list).

**Name banner** — centred, a chamfered brown plate with a gold border. Two lines: **title on
top in larger type, name beneath in smaller**. That is the inverse of most games and of
Everkai, and it is deliberate — the title is the flavour, the name is the identifier. A long
title wraps to two lines and the plate grows.

**`‹ ›` paging** — half-diamond glyphs pinned to the left and right screen edges at y ≈ 530,
≈ 40 px. They page **between family members** in roster order without leaving the current
section. Everkai already has these on `CharacterScreen`.

**Right rail, upper** — `Hide`, `Info`, `Favorite`, stacked, each a diamond icon with its
label beneath in small caps-ish brown. 60 px icons, ~110 px pitch.

**Right rail, lower** — `Story`, `Travel`, `Gift`, same treatment except `Gift`, which is a
larger circular gift-box illustration with the word overlaid. These are the `Interact`
tab's three surfaces (spec 08) and they are **only visible when `Interact` is selected**.

**Speech bubble** — a parchment box, left-aligned text, no name, no portrait, carrying one
line of the member's idle dialogue (`Goo`, `Still working? It's break time. Com`, `Good
morning.` — note the third is visibly truncated in the original). Tapping anywhere dismisses
it and a new one appears on return. It is flavour, not a control.

**Relationship ribbon** — a chamfered plate pinned to the **left screen edge** (it runs off
the edge), carrying the rung name plus its star suffix and a `◇` end cap: `Loving★★`,
`Loving★`, `Acquainted`. **The plate colour is the rung** — gold/brown at Loving, green at
Acquainted.

**Stat medallions** — two, side by side, each a circular embossed icon (`d ≈ 56`) plus a
two-line label/value stack. `Intimacy 13,710`, `Blessing Power 13,810`. Thousands separators.
**Each medallion is a tap target** and opens a dark tooltip, verbatim:

> **Intimacy** — *"Intimacy represents your relationship with Family members. The higher the
> Intimacy, the greater the adopted children. Increasing Intimacy can also unlock operation
> skills and date stories."*

> **Blessing Power** — *"The higher the Blessing Power is, the more Blessing Points you can
> get while dating with Family members. Blessing Points can be used to increase the power of
> the blessed Fellows."*

Those two sentences are the whole Family economy, and they are the model for convention 10:
the explanation lives on the number, not beside it. (Note "operation skills" in the Intimacy
text is the translation's word for Fathom slots — see spec 05.)

## Hide and Info

**`Hide`** replaces the entire interface with the art, leaving one `Show` eye toggle at
(648, 160). Identical to the Fellow shell.

**`Info`** opens a half-sheet titled `Info` containing a bordered table:

```
┌──────────┬──────────────────┬──────────┬──────────────────┐
│  Name    │ Shinobu Kocho    │  Title   │ Insect Hashira   │
├──────────┼──────────────────┴──────────┴──────────────────┤
│  Race    │ Human                                          │
├──────────┼────────────────────────────────────────────────┤
│  Bio     │ A member of the Demon Slayer Corps' highest-   │
│          │ ranking swordsmen, the Hashira. …              │
└──────────┴────────────────────────────────────────────────┘
                                          CV: Saori Hayami
```

Label cells are a darker fill; the `Name`/`Title` row is four cells on one line; `CV:` is
right-aligned italic-weight text outside the table. **No Occupation row** — the Fellow's Info
panel has one, the Family's does not.

## Compared with Everkai

Everkai's `app/family-panel.tsx` already renders `CharacterScreen`, so Hide, Info, `‹ ›`, the
stat row and the rail slot all exist. The gap is the dock.

| Difference | Kind |
| --- | --- |
| Eleven text-labelled `PanelPages` (`Profile · Dates · Gifts · More gifts · Bonds · Stella · Blessings · Fathoms · Latency · Pictures · Wardrobe`) with `Previous · 6 / 11 · Next`, against five icon tabs with no pager | **structural** — the headline change |
| Everkai's `Latency` is a top-level page; the original nests it as a sub-tab of `Skills` | **structural** |
| Everkai's `Gifts` and `More gifts` are two pages; the original has one `Gift` rail surface | **structural** |
| Everkai's `Profile` page repeats name, title, bio, three stats, a skill guide, a rules disclosure and the relationship control; the original splits these across the banner, the `Info` sheet, the medallion tooltips and the `Bonds` tab | **structural** |
| Everkai shows the same page set for every member; the original drops `Stella` below UR | **structural** |
| Everkai's header is the member's name; the original's is `Family Training` | cosmetic |
| Everkai puts the name above the title; the original puts the title above the name | cosmetic |
| Everkai has no relationship ribbon on the art; the rung is a `<h3>Relationship · Tier 3</h3>` inside the Profile page | **structural** |
| Everkai's stats are a plain `label/value` row; the original's are tappable medallions carrying the system's explanation | **structural** — this is where a whole paragraph goes to die |
| Everkai has no idle-dialogue bubble | cosmetic (Everkai has `CharacterScene`, which is a different thing) |
| No `Favorite` in Everkai | cosmetic |

## What Everkai should render

```
(i) Family Training

[UR]        ┌ Insect Hashira ┐                    ◈ Hide
            │ Shinobu Kocho  │                    ◈ Info
            └────────────────┘                    ♥ Favorite
 ‹                    art                    ›
                                                  ◈ Story
             ┌ idle line ┐                        ◈ Travel
             └───────────┘                        ( Gift )
╭ Loving★★ ◇
(♥) Intimacy 13,710      (💧) Blessing Power 13,810     ← both tappable

  «   Stella   Bonds   Skills   Blessing   Interact      ← Stella only on UR
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Rarity badge + dock gating | member rarity; "has a Stella" | **yes** — `familyStellaRule(id)` already returns null for members without one, so the tab can hide on exactly the original's condition |
| Title / name / race / bio / CV | catalog profile | **mostly** — no `race`, no `CV` field |
| Relationship rung name + star suffix | `member.relationship` → rung label | **partially** — Everkai stores 1..5 and prints `Tier 3`; the original's ladder is named (spec 04) |
| Intimacy, Blessing Power | `member.intimacy`, `member.blessingPower` | **yes** |
| Stat tooltips | two fixed strings | **no** — write them; the original's are quoted above |
| Idle dialogue line | per-member line list | **no** |
| Favorite flag | — | **no** |

## Prose to delete, and what replaces it

`app/family-panel.tsx`'s `Profile` page is the single wordiest screen in the Family surface.
Delete, in order:

| Delete | Replace with |
| --- | --- |
| `<small>YOUR FAMILY</small>` above the name | nothing — the header already says `Family Training` |
| `<p>{person.title} · {person.description}</p>` inline on the page | the `Info` sheet behind the rail icon |
| `<details className="rules-note">About these rules</details>` — 78 words covering gifts, auto-date, starting stats, shop prices, pupil formulas and bonds, all on one page | the `(i)` on the roster header. One information panel per surface, not one per page. |
| `Blessing Power increases points earned on dates. Intimacy increases pupil graduation earnings. Improve relationships to raise the Intellect of future pupils.` (`management-hint`) | the two medallion tooltips, verbatim from the original (quoted above). Same information, reached by tapping the number it describes. |
| The three-cell `family-stats` block (`Intimacy / Blessing Power / Blessing Points`) | two medallions on the art for the first two; Blessing Points belongs on the `Blessing` tab where it is spent (spec 07) |
| `Welcome family members to begin gifts and dates.` / `Invite {name} at the Recruit counter in Drakenberg.` | the Preview screen's `Source` tooltip pattern (spec 13) |
| `Previous · 6 / 11 · Next` pager chrome | five icon tabs |
