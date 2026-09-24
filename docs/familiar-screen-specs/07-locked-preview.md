# 07 · Familiar Preview (an uncontracted familiar)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/locked-preview.png`, `img/locked-source.png`, `img/locked-maxlevel.png`,
`img/locked-maxlevel-scrolled.png`, `img/locked-combat-skill.png`,
`img/locked-skill-tooltip.png`, `img/locked-preview-r-paged.png`,
`img/locked-preview-child-form.png`, `img/locked-preview-n-from-encounter.png`
(`img/detail-shell-ssr.png` for contrast).

Reached two ways, from **one component**: tapping a not-yet-joined card on the roster
(spec 02), and tapping `Details` on an exploration encounter. The encounter route is how a
rarity below anything on the roster (`N`) was seen at all.

## Layout

The header strip reads **`Familiar Preview`**, not `Familiar Growth`. The full-size art is a
**grey silhouette** — the strongest single signal on the screen, and the thing that does the
work of a sentence.

```
 0 ──────────────────────────────────────────────────────  currency bar
50 │ Familiar Preview                                     │
   │ ╔══╗        ╭──────────────╮                ╭──────╮ │  rarity badge, left
   │ ║SR║        │  Glutizard   │                │Source│ │  Source top-RIGHT, where
   │ ╚══╝        ╰──────────────╯                ╰──────╯ │  Hide sits on a joined familiar
   │ (◉) Cute                                             │  same inert Group + role rail
   │  ◈  Attacker                                         │  as the joined shell
   │ Unlocks upon Star Upgrade                            │  gold caption, left, y ≈ 500
   │ ┌────────────┐                                       │
   │ │  ▒ chibi ▒ │        ▒▒ grey silhouette ▒▒          │  form tile ≈ 150², polaroid
 ‹ │ │ Adult Form │                                       │  frame with a gold name plate  › 
   │ └────────────┘                          (◯) (◉)      │  two form portraits, ≈ 60,
   │ ┌──────┬────────────────┐                            │  selected has a gold ring
   │ │ Info │ Max Level      │                            │  folder tabs on the panel's
   │ ├──────┴ Preview ───────┴───────────────────────────┐│  top edge, left-aligned
   │ │  <tab content, scrolls>                           ││
1280└───────────────────────────────────────────────────── ┘
```

**There is no dock.** No Metamorphosis, no Awaken, no Level-Up, no Basic Info — the four tabs
of the joined shell (spec 03) are simply not there. There is no `Hide`, no `Appearance`, no
`Info` rail button and no `Combat Attribute` plinth: `Info` becomes a tab, and everything the
`Combat Attribute` modal would have held moves into the second tab. The `‹ ›` edge arrows
still page, between locked familiars.

That is the same rule the Fellow and Family sets recorded — a section you cannot use is
**absent, not disabled** (Fellow spec 02; Family spec 02's "a disabled *section* is an absent
tab") — applied to a whole screen.

## `Source`

A diamond button with its label beneath, top-right, exactly where `Hide` sits on a joined
familiar. Tapping it drops a dark bar immediately under the name banner:

> **`How to Invite: Familiar`**

`How to Invite:` in brown, the source in gold, one line, no panel. Same pattern as the Fellow
set's and the Family set's locked `Source` tooltips.

**Treat the value as unverified.** The string the replacement server returned here reads like
a placeholder, while the same familiar's `Info` tab gives a real answer in its `Source` row
(`Verdant Forest/Snowy Plains`, `Endless Desert` — i.e. `PetArea` names). Measured: the
`Item.json` row for a familiar's own item (`Item_Owner_Pet_11111`) carries `icon`,
`useEffect`, `useParam` and no `source` column at all, so this string is not a simple item
lookup. Everkai should do what `docs/family-screen-specs/13-locked-member.md` decided for the
Family preview: **keep its own faucet answer, copy the form** — a `Source` button with a
one-line tooltip.

## The two form portraits, and the form tile

Two circular portrait medallions sit at the right, just above the tab row. They are the
familiar's forms; the selected one carries a **gold ring** and a small marker above it.
Tapping one swaps the big silhouette and re-labels the left-hand tile.

The left-hand tile is a polaroid-style frame with the form's chibi art and a gold plate naming
it (`Child Form`, `Adult Form`), under a gold caption giving **how that form is obtained**:

| Caption observed | Meaning |
| --- | --- |
| `Initial Appearance` | the child form — what you get on contract |
| `Unlocks upon Star Upgrade` | the adult form — a star threshold |

How many circles to draw is measured, not guessed: `Pet.HalfPic` and `Pet.HeadIcon` carry keys
`{1,2}` on **57** of the 70 rows and `{1,2,3}` on **13**, and the same 13 rows carry a
`Spine3`. The thresholds are `PetStar.IsEvolve`, present on rows **15** and **50**. All 70
rows also carry an `ItemSP`, which is the SP variant the joined `Appearance` dialog's
`On | Off` toggle switches (spec 03).

## Tab: `Info`

The same bordered table as the joined familiar's `Info` sheet, rendered **inline on the
screen** rather than behind a rail button, and it scrolls:

```
┌──────────┬───────────────┬─────────────┬──────────────┐
│  Name    │ Glutizard     │  Attribute  │ Cute         │
├──────────┼───────────────┴─────────────┴──────────────┤
│  Source  │ Verdant Forest/Snowy Plains                │
├──────────┼────────────────────────────────────────────┤
│  Bio     │ …                                          │
└──────────┴────────────────────────────────────────────┘
```

The joined sheet's three `Habit` rows were **not visible** on the preview and the panel was not
scrolled far enough to prove their absence. Do not draw them as present and do not claim they
are gone.

## Tab: `Max Level Preview`

The promise tab, and the reason this screen is worth building. Three sections, top to bottom:

1. **`Bonus`** — the gold band from the joined shell: a POW emblem, `Final Power Bonus +n%`,
   then the same 2 × 2 grid of `Power+flat` / `Aptitude+flat` over `Power+n%` / `Aptitude+n%`.
   This is *what this familiar will pay its bound Fellow at maximum*.
2. **`Combat Attribute`** — `Attack`, `Health`, `Speed` as three labelled rows with their
   icons, at max level.
3. **`Combat Skill`** — a row of circular skill medallions. Tapping one opens a small card:
   the skill's name in gold and its effect text with bracketed magnitudes.

**The number of medallions is rarity.** Counting `Pet.ActiveSkill` + `PassiveSkill1/2/3` over
`Pet.json`, the skill count is a pure function of `grade` — 1, 1, 2, 3, 4, 4 for grades 1, 2,
3, 4, 5, 9 (rows 3, 12, 20, 13, 13, 9). The captures match exactly: the SR shows two
medallions, the R paged next to it shows one.

On that R, the panel showed `Combat Attribute` at its top with no `Bonus` band visible. That
may be scroll position or a real difference; **it was not established**, so build the three
sections in this order and check the R case against the data rather than against this note.

## Compared with Everkai

Everkai has no preview screen. An uncontracted familiar reaches
`app/familiar-panel.tsx:38`, which renders one line:

> `Not contracted yet. Explore Verdant Forest or Snowy Plains · Familiar Tower floor 60`

with a fallback at `:15` for familiars Everkai cannot source:

> `Not found in exploring or the tower: in the original it came from events, the Legendary
> Familiar draw or bundles, which Everkai does not have.`

and above that line the shell still renders its hero card, its `{rarity} · {type}` line and
its `Attack / Health / Speed` row — at level 1, because there is no progress record. So the
one thing Everkai *does* show for an unowned familiar is its **weakest** stats, where the
original shows its **strongest**.

| Difference | Kind |
| --- | --- |
| Two sentences against a whole screen with two tabs, a form switcher and a Source tooltip | **structural** |
| No `Max Level Preview` — and this is the decision-relevant surface on the whole roster: it is what tells you whether a familiar is worth hunting | **structural** |
| Everkai shows an uncontracted familiar's **level-1** stats; the original shows its **max-level** stats and bond payout | **structural** — and it is the same data path, evaluated at a different point |
| No form portraits, no silhouette, no unlock-condition caption | **structural** |
| No skill list, so nothing tells you an SR has two skills and an R has one | **structural** |
| Art is full colour in Everkai; a grey silhouette in the original | **cosmetic**, but it replaces the words "not contracted yet" |
| `Not contracted yet. {source}` as body text; the original is a `Source` button with a one-line tooltip | cosmetic |
| Everkai's header is the familiar's name; the original's is `Familiar Preview` | cosmetic |
| The same component serves the encounter screen's `Details` in the original; Everkai's encounter card (`app/familiar-explore-panel.tsx:16–22`) has no route to a detail view at all | **structural** |

## What Everkai should render

```
Familiar Preview

[SR]         ┌ Glutizard ┐                          [ Source ]
             └───────────┘
(◉) Cute
 ◈  Attacker
 Unlocks upon Star Upgrade
 ┌──────────┐
 │ ▒chibi▒  │        ▒▒ grey silhouette ▒▒
 │Adult Form│                               (◯) (◉)   ← forms
 └──────────┘
 ┌ Info ┐┌ Max Level Preview ┐
─┴──────┴┴───────────────────┴──────────────────────
  Name │ …        │ Attribute │ …
  Source │ …
  Bio  │ …
```

`Source` → `How to Invite: {Everkai's own faucet}`
`Max Level Preview` → `Bonus` (the Final Power Bonus band and its four cells) ·
`Combat Attribute` (ATK / HP / SPD at cap) · `Combat Skill` (medallions → name + effect card)

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Greyscale art + suppressed rail | `CharacterScreen`'s `preview` mode (`app/character-screen.tsx`) | **yes** — built for `docs/family-screen-specs/13-locked-member.md`, unused on this surface |
| Rarity badge, Group + role rail | `Pet.grade`, `Pet.Group`, `Pet.career` | **partially** — values carried, icons not imported |
| `Source` string | Everkai's own faucet: `EXPLORE_AREAS` + tower rewards, already computed by `source()` (`app/familiar-panel.tsx:12–16`) | **yes** — it just needs to become a tooltip instead of a paragraph |
| Info table (Name / Attribute / Source / Bio) | catalog | **mostly** — no Bio for every familiar; `Attribute` is the Group |
| Max-level Attack / Health / Speed | `familiarStats(id, {level: familiarCap(id), stars: <max>})` — the same function, evaluated at the cap | **yes** |
| Max-level bond payout (4 cells + total) | `inherentFamiliarBonus(id)` at full stage | **yes** — `lib/familiar-nodes.mjs` already returns the four fields |
| Combat skills | `Pet.ActiveSkill`/`PassiveSkill1-3` → `PetSkill` (192 rows) + `PetBuff` (137) | **no** — community kits cover 63 of 71, and 8 fall back to a local Rage strike |
| Form portraits + unlock captions | `Pet.HalfPic`/`HeadIcon` keys, `PetStar.IsEvolve` (rows 15, 50) | **partially** — `EXPLORE.forms` has the gates; there is no form art |
| Reached from an encounter's `Details` | the same component, a second call site | **no** — the encounter card has no detail route |

### Numbers seen on this screen, and where the real ones live

| On screen | Do not copy | Take from |
| --- | --- | --- |
| `Final Power Bonus +1%`, `+1.975M`, `+120`, `+135%` | one familiar's replacement-server payout | `lib/familiar-node-data.json` — itself community-sourced, `docs/data-provenance.md:91` — until `PetLevel.ExternalAdd` / `PetStar.ExternalAdd1` are imported |
| `Attack 16041 · Health 168912 · Speed 12288` | — | `Pet.ATK/HP/SPD` at `PetLevel` row 499, `PetClass` row 10, `PetStar` row 100 |
| `[ATK * 500%]` in a skill card | a replacement server's wording | `PetSkill` (192 rows) and `PetBuff` (137 rows), neither imported |
| two skill medallions on an SR, one on an R | — | measured from `Pet`: grade → 1/1/2/3/4/4. This is a rule, not a magnitude: copy it |
| `How to Invite: Familiar` | it reads as a placeholder | Everkai's own faucet, as spec 13 of the Family set ruled |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Not contracted yet. {source(id)}` (`app/familiar-panel.tsx:38`) | the `Familiar Preview` screen: a grey silhouette, a `Source` button, and two tabs. If a familiar is not contracted, the dock does not render — the same rule as `Basic Info` being `bare` (spec 03) |
| `Not found in exploring or the tower: in the original it came from events, the Legendary Familiar draw or bundles, which Everkai does not have.` (`app/familiar-panel.tsx:15`) | a short `Unobtainable` value in the `Source` tooltip; the explanation, if it is wanted at all, is one line in the hub `(i)` |
| the level-1 `Attack / Health / Speed` row rendered for an uncontracted familiar | the `Max Level Preview` tab — the same numbers, evaluated at the cap, where they are a reason to go and catch it |
| `Not contracted` / `Not Yet Joined` status strings on the roster card | the card with its level, badge, stars and bound-Fellow tile removed (spec 02) |

---

## Resolution (2026-09-24)

| Difference | Outcome |
| --- | --- |
| Two sentences against a whole screen | **Fixed.** `Familiar Preview`: a greyscale showcase, a `Source` button with its one-line tooltip, and two tabs. |
| No `Max Level Preview` — "the decision-relevant surface on the whole roster" | **Fixed, and it is the point of this slice.** Everkai showed an uncontracted familiar's **level-1** stats, so the one thing it told you about a familiar you did not have was its *weakest* numbers. The tab evaluates `familiarStats(id, {level: familiarCap(id), stars: <top of PetStar>})` — same function, same rows, at the cap — and adds the bond payout from `inherentFamiliarBonus()` at full stage, which is the comparison a player actually needs before deciding to hunt something. |
| No form portraits, no silhouette | **Partly fixed.** The silhouette is `CharacterScreen`'s `preview` mode, already built for the Family locked-member screen. Form portraits need art that does not exist. |
| No skill list | **Deferred.** `PetSkill` (192 rows) and `PetBuff` (137) are unimported; community kits cover 63 of 71 and the two tables are their own import. |
| `Not contracted yet. {source}` as body text | **Fixed** — a `Source` button and a tooltip, as the original draws it. |
| Everkai's header is the familiar's name | **Fixed** — `Familiar Preview`. |
| The encounter's `Details` should reach the same component | **Deferred.** The encounter now has a `Details` tab (spec 10), but it opens a small sheet rather than routing into this screen; one route, one commit. |

A layout note worth keeping, because it is the second time it has cost an hour:
`.character-screen-controls` is a **flex container**, so a bare block child of it is a flex *item* and
collapses to its min-content. The preview body needs the same `width:100%; min-width:0` wrapper that
`.familiar-growth-wrap` already carries for exactly this reason. Measured in the browser both times.
