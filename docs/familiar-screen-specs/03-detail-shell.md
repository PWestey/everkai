# 03 · The familiar detail shell

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/detail-shell-ssr.png`, `img/detail-shell-lv1.png`, `img/detail-hide.png`,
`img/detail-info.png`, `img/detail-info-habits.png`, `img/detail-appearance.png`,
`img/appearance-locked-form.png`, `img/detail-combat-attribute.png`,
`img/detail-combat-attribute-scrolled.png`, `img/detail-combatpower-info.png`,
`img/detail-click-dialog.png`, `img/detail-bindslot.png`

The frame every familiar section renders inside. Get it right once and the Level-Up, Awaken
and Metamorphosis specs are mostly content — exactly as the Fellow `Cultivate` shell
(`docs/fellow-screen-specs/02-cultivate-shell.md`) and the Family member shell
(`docs/family-screen-specs/02-member-shell.md`) did for their sets.

## What it is

Full-bleed familiar art from under the currency bar to the top of the dock, with floating
chrome on it. No page background, no card, no scroll container. The header strip reads
**`Familiar Growth`** — the *roster's* name, not the familiar's. (Fellow's reads `Cultivate`,
Family's reads `Family Training`; all three name the activity, never the character.)

A familiar has **no title**, so the centred banner is one line.

## Layout

```
 0 ──────────────────────────────────────────────────────  currency bar (POW · earnings · gold)
50 │ Familiar Growth                                      │  header strip, semi-transparent
   │ ╔══╗        ╭──────────────╮                  ◈ Hide │  rarity badge (x≈40,y≈150) ≈ 90px
   │ ║SSR║        │  Treeraffe   │             ◈ Appearance│  right rail, 3 items,
   │ ╚══╝        ╰──────────────╯                  ◈ Info │  x ≈ 650, pitch ≈ 100
   │ (◉) Cute                                             │  Group medallion + label, INERT
   │  ◈  Attacker                                         │  role badge + label, INERT
   │ ‹                                                  › │  edge arrows, y ≈ 545
   │                   full-bleed art                     │
   │          ┌──────────────────────────┐                │  click-dialog caption box,
   │          │ When feeding it, k▏      │                │  y ≈ 700–790, art-tap only
   │ ╭──────╮ └──────────────────────────┘                │
   │ │Combat│                                             │  Combat Attribute plinth,
   │ │Attrib│                                     ┌────┐  │  left edge, y ≈ 790–860
   │ ╰──────╯                                     │ ✚  │  │  bind slot ≈ 90², y ≈ 930
   │ ╭ Lv. 249   5★ ◇                             └────┘  │  level/star plate, left-anchored
   │ ┌──────────────────────────────────────────────────┐ │
   │ │ (POW) Final Power Bonus +n%                      │ │  gold band, full width
   │ ├───────────────────────┬──────────────────────────┤ │
   │ │ (POW) Power+n         │ ✦ Aptitude+n             │ │  2 × 2 grid
   │ │ (POW%) Power+n%       │ ✦ Aptitude+n%            │ │
1190├──────────────────────────────────────────────────────┤
   │  «        Metamorphosis  Awaken  Level-Up  Basic Info│  dock, 4 entries + back
1280└──────────────────────────────────────────────────────┘
```

When a dock panel opens it covers the lower half up to the dock; the level/star plate and the
Power band sit above it or are covered, and the rails stay put.

## The two rails

**Left rail, upper — two inert labels.** A circular Group medallion with its name beneath
(`Cute`, `Playful`, `Cool` observed), then a smaller gold diamond with the role beneath
(`Attacker` observed). Both were tapped on the device: **nothing happens.** There is no class
screen and no career screen. They are the card's two badges (spec 02), enlarged and captioned,
and this is the only place in the system where either is spelled out in words.

**Left rail, lower — `Combat Attribute`.** A chamfered plinth flush to the left edge, a
crossed-swords shield glyph over a two-line label. It is the only left-rail *button*, and it
opens the modal below.

**Right rail — `Hide`, `Appearance`, `Info`.** Diamond icons ≈ 60 px with the label beneath,
pitch ≈ 100 px, at x ≈ 650. Same shape and position as the Fellow shell's `Hide / Info /
Favorite` and the Family shell's `Hide / Info / Favorite`. **There is no Favorite on a
familiar**, and `Appearance` takes the slot it would have used.

Note what is *not* on the rails: no Blessing, no Resonance, no artifact tile. The familiar is
the thing that gets equipped, so the equipment relationship appears as the **bind slot**, not
as a rail of slots.

## `‹ ›` edge arrows

Gold chevrons pinned to the left and right screen edges at y ≈ 545 (~43% height), clear of
both rails. They page **between familiars in the roster's current order**, without leaving the
current section — `img/detail-shell-lv1.png` is `img/detail-shell-ssr.png` after one `‹`, and
the whole shell re-renders for a Lv. 1, 0★ familiar with the same rail set. The same arrows
page the locked Preview screen (spec 07).

## The level / star plate

A chamfered brown plate pinned to the **left screen edge** (it runs off it), carrying
`Lv. n` in gold and then `n★` — a number and one star glyph, not a row of pips. Identical
grammar to the Family shell's relationship ribbon. It is the shell's only persistent stat
readout apart from the Power band.

## The Final Power Bonus band

A full-width gold band — a POW emblem, the words `Final Power Bonus`, and a percentage — over
a 2 × 2 dark grid:

```
(POW)  Power+<flat>        ✦ Aptitude+<flat>
(POW%) Power+<percent>%    ✦ Aptitude+<percent>%
```

Four cells, two icons each used twice (a solid POW emblem for the flat row, a hollow one for
the percentage row; a four-point star for Aptitude). **This is what the familiar pays its
bound Fellow**, and it is on the shell under every section, the way the Fellow shell keeps
Power / Level / Aptitude / Earnings visible under every section (Fellow spec 02, difference
C4). The `Lv. 1` capture shows the same band with the percentage cells at zero — the band does
not disappear when it has nothing to say; the number does the talking.

## The `✚` bind slot

A square framed tile ≈ 90 px at the bottom-right of the art, above the Power band: a grey
Fellow **silhouette** behind a large `+`. Convention 9 — an empty slot is drawn, not
described. Tapping it opens:

**`Select Fellow`** — a centred dialog, red `✕` clipped to its top-right corner, one scrolling
row per Fellow:

| Column | Content |
| --- | --- |
| left | the Fellow's framed portrait, rarity-coloured |
| middle | `lv.<n>` then the Fellow's name, then `POW <before> ➜ <after>` with the after value in green |
| right | a green **`Equip`** button |

and a footer line, centred, in red: **`Free Attempts: 2`**.

`docs/fellow-screen-specs/10-familiar-artifact.md` captured the *Fellow's* side of this
binding and deliberately did not port that counter, leaving a question open in the audit
(§6.12) about whether it needs a table lookup. **It does, and the table is there:**
`System.HeroPetSlotCost` is `[0, 0, 50, 100, 150, 200, 250, 300, 350, 400, 450, 500]` with
`System.HeroPetSlotItem` `"4"` and `System.HeroPetSlot` `[{hero_lv: 1}]`, plus
`System.PetRecallDiscount` `0.1`. The ladder's **first two entries are zero**, which is
exactly what a "free attempts" counter of 2 would be counting. Whether the counter counts
lifetime binds or a daily allowance is *not* settled by the capture — measure it before
building, but build the ladder from `HeroPetSlotCost`, not from the screenshot.

The two binding UIs Everkai ships today (audit D1) both call `bindFamiliar`; this dialog is
the shape the original uses on the familiar side, and it is close enough to
`SelectFamiliar` (`app/fellow-shell.tsx:148–171`) that one component with the roles swapped
covers both.

## The `Combat Attribute` modal

A centred dialog over a dimmed shell, red `✕` at its top-right. Top to bottom:

1. the rarity badge and name banner **repeated** from the shell, with the Group and role
   diamonds beside them;
2. the familiar's chibi render, centred;
3. `Obtained in: <timestamp>` — a date and time, the only place the game records when you
   contracted it;
4. a large circular **paw-power medallion** with the familiar's Power inside it, and a small
   `(i)` beside it;
5. a three-cell stat row: `Attack`, `Health`, `Speed`, each with its own icon;
6. a `— Combat Skill —` divider, then one card per skill: a circular skill medallion, the
   skill's name in gold, and its effect text with bracketed magnitudes
   (`[ATK*420%]`, `[ATK*75%]`). The list scrolls.

**How many skill cards there are is measured, not guessed.** Counting
`Pet.ActiveSkill` + `PassiveSkill1/2/3` per row of `Pet.json`, the count is a pure function of
`grade`:

| `Pet.grade` | rows | skills |
| --- | --- | --- |
| 1 | 3 | 1 |
| 2 | 12 | 1 |
| 3 | 20 | 2 |
| 4 | 13 | 3 |
| 5 | 13 | 4 |
| 9 | 9 | 4 |

The captures agree (SR shows two, R shows one — spec 07). The skills' **text and numbers**
live in `PetSkill` (192 rows) and `PetBuff` (137 rows), both of which Everkai has never
imported: its 63 documented kits are community-derived (`docs/data-provenance.md:87–96`, data
inventory §7 rank 1).

### The `(i)` → `Familiar Attribute`

A second, darker modal **stacked on top of the first** — one component with three call sites
(here, and the `(i)` on Level-Up and on Awaken). Two sections:

```
Basic Attribute      Attack · Health · Speed
Special Attribute    Crit · Crit Resistance · Block · Accuracy ·
                     Damage Increase · Damage Reduction
```

Three plus six is nine, and that is exactly `PetAttr.json`: 9 rows, `type: 1` for the three
Basic and `type: 2` for the six Special, with `CombatAdd` weights ATK 15, HP 1, SPD 30, and
CRIT / CRIT_RES / Block / ACC 5 each, DI / DR 30 each. **The modal is the table.** Everkai's
dispatch importer reads only ATK/HP/SPD and asserts `{15, 1, 30}` (data inventory §4), so
`Pet.CRIT` and `Pet.Block` — `500` on 55 of the 70 familiars — are missing from every power
figure Everkai computes. Fixing that is three rows of import and it moves a shipped gate.

## The art-tap click-dialog — a caption, not a gallery

Tapping the familiar's art plays a line of its dialogue: a translucent, full-width caption box
low over the art, left-aligned text, **typewriter reveal** (`img/detail-click-dialog.png`
catches it mid-render at `When feeding it, k`), no speaker name, no portrait, no dismiss
control, and no next-arrow. The rest of the chrome stays exactly where it was.

**This is the memory story, and it is not a screen.** `Pet.ClickDialog` carries **three**
line ids for all 70 familiars; `Pet.ClickEmoji` carries three emote effects and
`Pet.ClickEmojiAct` the animation. `Pet.ClickRatio` is `[300, 100]` on all 70 rows — a rule-6
constant, so do not read it as a per-familiar weight. `System.PetStoryIntervalTime` is `3600`.

Do not confuse it with two neighbours:

| Thing | Table | Where it appears |
| --- | --- | --- |
| Click-dialog / memory story | `Pet.ClickDialog` (3 lines × 70) | tapping the art on this shell |
| Join story | `PetMemoryStory` (12 rows = 4 familiars × 3 beats), `Pet.JoinDialog` | the "familiar joined" panel — one reader, `PanelPetGetStory.lua` |
| Hub scene chatter | `System.PetStoryAsk` (`Pet_Main_*` dialog ids) | the hub scene (spec 01) |

**There is no story gallery anywhere in the Familiar surface.** If Everkai builds a "memory
stories" page it is inventing a screen; the line belongs on the art.

## `Appearance` and `Info`

**`Appearance`** opens a centred dialog titled `Appearance`, red `✕`:

- a large preview of the selected form, greyscale when that form is locked;
- a small polaroid tile at the preview's lower-left with a gold plate naming the form
  (`Child Form`, `Adult Form`);
- a `Form` section: a caption stating that form's unlock condition — observed verbatim
  `Contract to unlock.` and `Unlocks after awakening a familiar.` — then a row of form tiles,
  the owned one carrying a green `✓`, the locked one **greyscale with a padlock**;
- a row reading `Unlocks after obtaining a SP Familiar.` with a 2-segment `On | Off` toggle;
- a primary at the foot: green **`Selected`** text when this form is already active, an inert
  grey **`Select`** button when the form is locked. Convention 7 — a different word, not a
  greyed button.

How many tiles: `Pet.HalfPic` and `Pet.HeadIcon` carry keys `{1,2}` on **57** familiars and
`{1,2,3}` on **13**, and 13 rows carry a `Spine3` — so **two forms for most familiars, three
for thirteen**. The evolve thresholds are `PetStar.IsEvolve`, present on rows **15** and
**50**. The SP toggle is real content too: `Pet.ItemSP` exists on all 70 rows.

**`Info`** opens a half-sheet titled `Info`, red `✕` on the corner, holding a bordered table —
same component as the Family member's Info sheet, different columns:

```
┌──────────┬───────────────┬─────────────┬──────────────┐
│  Name    │ Treeraffe     │  Attribute  │ Cute         │
├──────────┼───────────────┴─────────────┴──────────────┤
│  Source  │ Endless Desert                             │
├──────────┼────────────────────────────────────────────┤
│  Bio     │ …                                          │
├──────────┼────────────────────────────────────────────┤
│  Habit 1 │ Unlocks after learning the habit.          │
│  Habit 2 │ Unlocks after learning the habit.          │
│  Habit 3 │ Unlocks after learning the habit.          │
└──────────┴────────────────────────────────────────────┘
```

No `Title`, no `Race`, no `CV` — a familiar has none. **Three `Habit` rows, all unlearned on
every familiar on the owner's save**, so the filled state was never seen and must not be
invented. The `Attribute` cell is the Group; the `Source` cell is an area name or names.

**`Hide`** blanks every piece of chrome including the currency bar and the dock, leaving the
art edge to edge with a single `Show` diamond at the top-right. Identical to the Fellow and
Family shells.

## The dock, and the fourth tab that is not a panel

Five slots: a `«` back plinth at the far left, then **`Metamorphosis` · `Awaken` · `Level-Up`
· `Basic Info`**, icons ≈ 60 px with the caption beneath, right-weighted. A tab with something
to do carries a red dot on its icon (`Level-Up` in the capture).

**`Basic Info` is a close button dressed as a tab.** It opens nothing: it dismisses whatever
panel is open and returns you to the bare shell, and the bare shell — art, rails, level plate,
Power band — *is* the basic info. This is the same finding the Fellow set recorded for
`Upgrade` (`docs/fellow-screen-specs/03-upgrade.md`), and Everkai already implements the
mechanism: `PanelPages`' `bare` prop (`app/panel-pages.tsx:22–27, 32`) keeps the index aligned
and never renders the child. `bare={['Basic Info']}` is the whole implementation.

Unlike the Fellow and Family docks, **this dock does not change length with rarity**: the
`SSR` at Lv. 249 / 5★ and the `SSR` at Lv. 1 / 0★ show the same four entries, and Awaken's
own state (`0/20` red versus `100/20` green) is where the difference shows. Whether a
lower-rarity familiar loses a tab was **not captured** — every familiar opened was SSR — so do
not implement rarity gating here from this evidence.

## Compared with Everkai

Everkai's familiar detail (`app/familiar-panel.tsx:35–39`) is a `<section>` with a
`‹ Companions roster` button, a `framed-card` hero tile beside an `<h3>` and a
`{rarity} · {type}` line, a three-cell `family-stats` row (Attack / Health / Speed), then a
nested `PanelPages` with the **text labels** `Training | Fellow bond | Forms`, then a 183-word
`rules-note`.

It does not use `CharacterScreen` (`app/character-screen.tsx`) — the shell the Fellow and
Family rebuilds already built, which ships full-bleed art, a heading override, a nameplate,
rarity and type badges, `Hide/Show`, an `infoOnly` Info table dialog, `‹ ›` arrows, a stat
block slot, a rail slot and a `preview` greyscale mode. Every one of those is a row in this
spec.

| Difference | Kind |
| --- | --- |
| A three-entry **text pager** (`Training / Fellow bond / Forms`) inside a four-entry icon dock, against a four-entry icon dock with no pager. Both character rebuilds deleted exactly this control; it survives here one level down (audit D2) | **structural** — the headline change |
| No full-bleed art: the familiar appears as a `framed-card` thumbnail in a header row. The original *is* the art | **structural** |
| No rails at all — no Hide, no Info, no Appearance, no Combat Attribute | **structural** |
| No `‹ ›` paging. Changing familiar means going back to the roster | **structural** |
| No persistent stat readout: `Lv. n / cap · Stage n · n stars` is a sentence inside the Training page (`app/familiar-panel.tsx:36`), so it disappears when you open another page. The original keeps `Lv. n  n★` and the four-cell Power band under every section | **structural** |
| Everkai's stat row is Attack / Health / Speed **on the shell**; the original puts those inside the Combat Attribute modal and puts the *bond payout* on the shell. Everkai shows the numbers that matter in battle where the original shows the numbers that matter to your village | **structural** |
| No Combat Attribute modal, no `Familiar Attribute` glossary, and no skill list on the familiar at all (the only skill text is a `<details>` on the Tower page, audit P8) | **structural** |
| No click-dialog. `Pet.ClickDialog` (3 lines × 70 familiars) is unimported and unreferenced | **structural** — the cheapest piece of character on this surface |
| Binding is a `NativeSelect` of Fellow names plus `Bind Fellow · Free` (`app/familiar-node-panel.tsx:19`), against a `+` slot on the art opening an `Equip` picker with `POW old ➜ new` per row (audit D1, D3) | **structural** |
| `Forms` is a `<ul>` of three `<li>` plus a sentence about Spine skeletons; the original is a picker with form art, a `✓`/padlock state and a `Select`/`Selected` primary | **structural** |
| No `Obtained in:` timestamp, and no save field that could produce one | cosmetic |
| Everkai's header is the familiar's name; the original's is `Familiar Growth` | cosmetic |
| `Level 212 / 450 · Stage 5 · 3 stars` as prose; the original is `Lv. 212` on a plate and `3★` beside it, with the stage implied by the cap | cosmetic |

## What Everkai should render

```
Familiar Growth

[SSR]        ┌ Treeraffe ┐                        ◈ Hide
             └───────────┘                        ◈ Appearance
(◉) Cute                                          ◈ Info
 ◈  Attacker
 ‹                     art                      ›
             ┌ click-dialog caption ┐        ┌───┐
[Combat]     └──────────────────────┘        │ ✚ │   ← bind slot
╭ Lv. 249  5★ ◇                              └───┘
┌──────────────────────────────────────────────────┐
│ (POW) Final Power Bonus +n%                      │
│ Power+n            │ ✦ Aptitude+n                │
│ Power+n%           │ ✦ Aptitude+n%               │
└──────────────────────────────────────────────────┘
 «   Metamorphosis   Awaken   Level-Up   Basic Info    ← Basic Info is `bare`
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Full-bleed art, Hide, Info, `‹ ›`, rarity badge | `CharacterScreen` | **yes** — built, and unused on this surface |
| Group medallion + name, role badge + name | `Pet.Group` → `PetGroup` (4), `Pet.career` → `PetCareer` (3) | **partially** — types carried, icons and career not drawn |
| `Lv. n` and `n★` | `game.familiars[id]`, `familiarCap()` | **yes** |
| Final Power Bonus (4 cells + total) | `inherentFamiliarBonus(id)` / `familiarBonus()` in `lib/familiar-nodes.mjs` — flat, aptitude, percent, finalPercent | **yes** — the four fields already exist and are already printed as a sentence (`effectText`) |
| Attack / Health / Speed | `familiarStats(id, progress)` | **yes** |
| Crit, Crit Resistance, Block, Accuracy, Damage Increase, Damage Reduction | `PetAttr` rows 4–9 + `Pet.CRIT`/`Pet.Block` | **no** — six of the nine attributes are unimported |
| Combat skills: name + effect text | `Pet.ActiveSkill`/`PassiveSkill1-3` → `PetSkill` (192) + `PetBuff` (137) | **no** — 63 community-derived kits stand in |
| `Obtained in:` | a contract timestamp per familiar | **no** — a new save field |
| Click-dialog lines | `Pet.ClickDialog` (3 × 70) | **no** |
| Forms / Appearance tiles | `Pet.HalfPic`/`HeadIcon` keys (2 on 57, 3 on 13), `Spine`/`Spine2`/`Spine3`, `PetStar.IsEvolve` rows 15 and 50, `Pet.ItemSP` | **partially** — `EXPLORE.forms` already derives Child/Adult/Awakened and their star gates; there is no art and no picker |
| Bind slot + `Select Fellow` | `bindFamiliar`, `bondedPower` | **yes** — twice over, in two different UIs |
| Bind cost ladder / free attempts | `System.HeroPetSlotCost` `[0,0,50,…,500]`, `HeroPetSlotItem` `"4"`, `PetRecallDiscount` `0.1` | **no** — Everkai's binds are free and marked as a local choice |
| `Basic Info` as a close verb | `PanelPages` `bare` | **yes** |

### Numbers seen on this screen, and where the real ones live

| On screen | Do not copy | Take from |
| --- | --- | --- |
| `Lv. 249`, `5★` | one save | `PetLevel` (499 rows), `PetClass.LevelMax`, `PetStar` (100 rows) |
| `Final Power Bonus +2.5%`, `Power+1.75M`, `Aptitude+128`, `Power+80%` | a fully-grown SSR's payout | the node/bonus values Everkai already holds — noting `lib/familiar-node-data.json` is community-sourced and its Power ordering reconstructed (`docs/data-provenance.md:91`) |
| `Attack 8053 · Health 68801 · Speed 4046` | — | `Pet.ATK/HP/SPD` × `PetLevel` and `PetClass` coefficients and `PetStar` |
| `Crit 5% · Block 5%` in the glossary | a rendering of one familiar's row | `Pet.CRIT`/`Pet.Block` (0 on 15 rows, 500 on 55) with `PetAttr.CombatAdd` |
| the paw medallion's Power | — | computed from the attributes above; note the data inventory's §8 finding that the *enemy* `Power` column is authored and not reproducible from `PetAttr` weights — do not assume the same formula holds both ways |
| `Free Attempts: 2` | — | `System.HeroPetSlotCost`'s two leading zeroes |
| `[ATK*420%]` in a skill | a replacement server's skill text | `PetSkill.EffectNum` / `Combatcoef` / `BuffID` → `PetBuff` |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `About familiar progression` — 183 words (`app/familiar-panel.tsx:39`) | the hub `(i)` keeps the two player-facing rules (contracting makes a familiar; items raise level and stars); the provenance half is deleted outright — it exists verbatim in `docs/parity-catalog.csv` and the module headers |
| `About these rules` — 24 words (`app/familiar-node-panel.tsx:19`) | nothing. `docs/fellow-screen-specs/10-familiar-artifact.md` already ruled on this exact string and its replacement |
| `Base binding bonus applies while bound; activated nodes add to it. One Familiar per Fellow. Rebinding moves its activated bonuses with it.` (`app/familiar-node-panel.tsx:19`) — **already hidden by `app/globals.css:768`** | delete the element, not just its visibility. The `✚` slot and the `POW old ➜ new` preview say all three sentences |
| `Level 212 / 450 · Stage 5 · 3 stars` | `Lv. 212` on the left-edge plate, `3★` beside it |
| `Bind Fellow · Free` / `Unbind` / `Activate node · Free` / `Activate all 7 ready · Free` | `Equip` / `Unequip` in the `Select Fellow` dialog; `· Free` is a non-cost, and convention 2 puts real costs inside the button |
| the `<select>` of Fellow names and the `<select>` of node strings (`Level 150: +2,400,000 Power, +18 Aptitude` × 30) | the `Select Fellow` row list; the node track belongs to the Level-Up spec |
| `Child Form · unlocked by contract ✓` / `Adult Form · star 15 (3/15)` / `Awakened Form · star 50 (3/50)` | form tiles in the `Appearance` dialog: art, a `✓` or a padlock, and the unlock condition as the section's one caption line |
| `In the original each form is an animated portrait (a Spine skeleton: …). Everkai has not rendered familiar animations yet, so forms are listed but not shown.` | delete (provenance). A form with no art is a silhouette tile, which is what the original draws for a locked one anyway |
| the three-cell `Attack / Health / Speed` block on the shell | the Combat Attribute modal, behind the left-rail plinth; the shell carries the Final Power Bonus band instead |
| `Previous · n / 3 · Next` on the nested pager | the four-entry dock, with `Basic Info` marked `bare` |
