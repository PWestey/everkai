# 05 · Awaken (the star ladder)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/detail-awaken.png` (SSR, 5★, gate **unmet** — red `0/20`),
`img/detail-awaken-lv1.png` (SSR, 0★, gate **met** — green `100/20`),
`img/awaken-info.png` (the shared `Familiar Attribute` glossary),
`img/awaken-newappearance.png` (the 15★ preview, full screen)

Dock position **2** of 4. Serves the hub manifest's heading 2, *Familiar Development*.

## Which table this is — a correction worth making up front

`CAPTURE-INDEX.md` resolved the roster's class-filter question by noting that
**`PetClass.json` is not a class or type table and nothing filters on it** — which is
right, and stays right. It then attached those 10 rows to *this* screen's star ladder,
because `Pet.ClassMax` is 10. That attachment is wrong, and four independent measurements
say so:

1. **Row count and milestone spacing.** `PetStar.json` has **100** rows and `IsBig` is set
   on exactly 20 of them — stars 5, 10, 15 … 100. The captured rail draws every fifth card
   **wider and lighter with decorative sparkles**: the visible run 5·6·7…10 highlights the
   10★ card, and the run 1·2·3…5 highlights the 5★ card. `PetClass`'s 10 rows have no such
   column.
2. **The 15★ preview.** `PetStar.IsEvolve` is present on exactly **two** rows — **15 and
   50** — and the captured preview medallion reads `15★` and opens onto a page captioned
   `Adult Form`. A ladder capped at 10 cannot have a 15th node.
3. **The reward pills.** `PetStar.ExternalAdd1` carries `addtype 2` on every non-`IsBig`
   star and `addtype 5` on the `IsBig` ones for the upper rarities. The rail draws an
   **aptitude star medallion** on ordinary cards and a **Power-% medallion** on the fifth
   ones. `PetClass` has no `ExternalAdd` column at all.
4. **The client.** `UI/Pet/Detail/ScenePetUpgradeStar.lua` and
   `UI/Pet/Detail/CompPetDetailStar.lua` are this screen; their identifiers include
   `RqUpgradeStar`, `GetCostByStar`, `GetStarMax`, `IsStarImportant`, `GetEvolveStar`,
   `CompPetStarBig`. `PetClass` is read by `PanelPetUpgradeStage.lua` (`zxPetClassConfigs`),
   which is the **Level-Up** tab's `Advance` panel — spec 06.

**Awaken is `PetStar.json` (100 rows: `Cost`, `ATKcoef`, `HPcoef`, `ExternalAdd1`,
`BookEXP`, `IsBig`, `IsEvolve`, `ExternalSkillNum`).** `PetClass.json` belongs to spec 06.
`Pet.ClassMax: 10` is the *stage* cap, not the star cap — and it is constant on all 70 rows
(rule 6: a constant column is not a measurement of the thing its name suggests; here it is
simply "every familiar has ten stages").

Rule-2 positive control for every absence and count above: the config set returns
`Wife 33, City 15, SimGame3 21`; the string corpus returns `PetTower` in 32 files.

## Layout

A half panel, top edge ≈ y 535 of 1280, flush to the dock. Four stacked bands.

```
 ┌ ◇  Awaken  ◇                                       ✕ ┐
 │ ┌ 🗡 8053 ┬ ❤ 68801 ┬ 🪶 4046 ┐            [ i ]      │  3-cell attribute strip
 │ ╭ (%) +2.5%   ( ✦ ) +128 ╮            [Quick Activate]│  cumulative pills · outline btn
 │ ┌──────────────────────────────────────────────────┐ │
 │ │ ╭ 5★ ─╮›╭ 6★ ─╮›╭ 7★ ─╮›╭ ╔ 10★ ╗ ─╮             │ │  horizontal rail, scrolls
 │ │ │(POW)│ │(✦)🔒│ │(✦)🔒│ │ ║(POW)🔒║ │             │ │
 │ │ │+0.5%│ │ +12 │ │ +12 │ │ ║ +0.5% ║ │             │ │  every 5th card is taller/lighter
 │ │ ╰─────╯ ╰─────╯ ╰─────╯ ╰─╚══════╝─╯             │ │
 │ └──────────────────────────────────────────────────┘ │
 │        ╭───  5★  ───╮  ➡  ╭───  6★  ───╮             │  brown plates, green arrow
 │ ╭New Appearance!╮                                     │
 │ ( portrait )      ╭── Awaken ──╮   ☐ Use Universal    │
 │   15★  Unlock     │ 🌼  0 / 20  │       Insignia      │
 │                   ╰────────────╯   ╭ 💎    0 ╮        │
 └───────────────────────────────────────────────────────┘
        [Metamorphosis] [Awaken] [Level-Up] [Basic-Info]
```

| Element | Rendering | Notes |
| --- | --- | --- |
| Attribute strip | Three equal cells — sword/ATK, heart/HP, feather/SPD — then a square `(i)` outside the strip at its right | Shared verbatim with Level-Up. Values only; no labels. |
| Cumulative pills | One rounded cream capsule holding **two** pills on this tab: a Power-% medallion and an aptitude star | These are the two `addtype`s `PetStar.ExternalAdd1` pays (2 and 5). Level-Up's capsule holds three, for the three `addtype`s `PetLevel.ExternalAdd` pays. **The capsule is a per-ladder subtotal, not a global one.** |
| `Quick Activate` | Small outlined button, right-aligned on the pill row | `RqActiveStarExternalAttrOneKey`. It is the bulk form of tapping a reached node, **not** a currency spend: it carries **no `have/cost` pair**, and every genuine spend on these panels does. Not pressed, so not settled. |
| Star rail | Horizontal scroller of cards, `›` chevrons between them | Anchors on the current star. Does not wrap. |
| Ordinary card | Header `N★` on a grey strip · a round medallion · a reward pill | Reached: medallion in full colour, pill dark-green with the value. Unreached: medallion **desaturated with a padlock corner badge**, pill brown with `lv`-style gate text. Same card, two fills (convention 15). |
| Milestone card | Every fifth star: **taller, lighter, framed, with sparkle ornaments** | `PetStar.IsBig`, 20 rows. The art is the milestone; no word says "milestone". |
| Before → after plates | Two brown hexagonal plates, `5★` and `6★`, with a **green `➡`** between | This is the `→` register (the next step), not the gold `»` (a whole-tier change). Family README convention 13 holds. |
| `New Appearance!` | Orange ribbon over a **circular portrait medallion** showing the evolved art, `15★` on its foot, caption `Unlock` beneath | Tapping it opens the full-screen preview. Present on both captures, including the 0★ familiar — the promise is shown from the start. |
| `Awaken` | **Orange** hexagonal button, centred, item icon + `have / need` | Orange, not green. Compare Level-Up's and Advance's green, and the Fellow spec's `Enhance` (orange) vs `Change` (green): **orange is the progression verb.** |
| `Use Universal Insignia` | A checkbox tile + label, right of the button, with the insignia's **balance pill** beneath it | Both greyed at a zero balance. The checkbox state is remembered per player (`SetPlayerPrefs#CompPetDetailStar_omn_checkBox`). |

## The two gate states, both captured

| Capture | Star | `have / need` | Colour | Rail |
| --- | --- | --- | --- | --- |
| `detail-awaken.png` | 5★, SSR | `0 / 20` | **have red** | 5★ reached and gold; 6★, 7★, 10★ padlocked |
| `detail-awaken-lv1.png` | 0★, SSR | `100 / 20` | **have green** | every card padlocked, including 1★ |

Two things the pair settles, neither of them a magnitude:

- **The button never greys and never changes word.** Only the `have` number recolours. That
  is the same rule the Metamorphosis tabs follow (spec 04) and the opposite of Everkai's
  convention, which disables the control.
- **A padlock means "not yet reached", not "blocked".** At 0★ the *next* star is padlocked
  too, while the button is green and affordable. The padlock is a progress marker on the
  art; affordability lives in the button. Everkai conflates the two.

`Awaken` was **not pressed** — a spend. `Quick Activate` was **not pressed** — a bulk
action. Neither outcome is described anywhere in this spec.

## The 15★ preview (`awaken-newappearance.png`)

Not a modal: a **full-screen `Preview` page** with its own breadcrumb, keeping the rarity
badge and the attribute/role rail from the shell, showing the evolved art at full bleed,
with a small framed thumbnail of the current form at the lower left captioned **`Adult
Form`** in gold, and the shell's back chevron at the foot.

`PetStar.IsEvolve` marks stars **15 and 50**; `lib/familiar-explore-data.json`'s
`forms.adultStar: 15` / `awakenedStar: 50` already read exactly those two rows, so Everkai
has the gates and lacks only the page.

## `(i)` Information — and what it settles about `PetAttr`

The `(i)` opens the shared **`Familiar Attribute`** glossary — the same modal the Level-Up
tab's `(i)` opens and the same one that stacks on top of the Combat Attribute modal. Two
sections:

| Section | Rows |
| --- | --- |
| `Basic Attribute` | Attack · Health · Speed |
| `Special Attribute` | Crit · Crit Resistance · Block · Accuracy · Damage Increase · Damage Reduction |

That is **`PetAttr.json`'s nine rows, in order, split exactly on its `type` column** (three
rows `type 1`, six rows `type 2`). The data inventory records that Everkai imports three of
the nine and that `CRIT` and `Block` are 500 on 55 of 70 familiars at weight 5 — so the
original shows a player six attributes Everkai's Power maths does not count. The glossary
is one modal; wiring the six is three rows of import.

No other prose exists anywhere on this tab.

## Compared with Everkai

Everkai's equivalent is a single button on the `Training` page
(`app/familiar-panel.tsx:36`):

> `Add star · 20 class-up`

with the star count printed in a sentence above it — `Level 212 / 450 · Stage 5 · 3 stars` —
and the per-star bonuses hidden in a `<select>` on a different page
(`app/familiar-node-panel.tsx:15`, options reading `Star 8: +12 Aptitude`).

| # | Difference | Kind |
| --- | --- | --- |
| A1 | **There is no ladder.** 100 stars, each with its own reward, collapse to one button and the word "stars". A player cannot see what the next star gives, which is the only question this screen answers. | **structural** |
| A2 | **The star rewards are on the wrong screen.** Everkai renders `PetStar.ExternalAdd1` as node `<option>` strings inside the *bind* panel. The original renders them as the rail, on the star tab, where they are earned. Binding is a separate one-action dialog (spec 13). | **structural** |
| A3 | **The milestone tier is not modelled.** `PetStar.IsBig` (20 rows) draws a different card. Everkai has no visual difference between star 4 and star 5. | **structural** |
| A4 | **`IsEvolve` has a gate but no page.** Everkai prints `Adult Form · star 15 (3/15)` as an `<li>` (`app/familiar-panel.tsx:37`) and then apologises that the art is not rendered. The original hands you a portrait medallion from 0★ and a full-screen preview of the art you are working towards. | **structural** |
| A5 | **The star currency is invented, and the capture says so.** Everkai charges class-up items (`lib/familiar-supplies.mjs`, `starCost = PetStar.Cost` in `Item_PetClassUP`), marked as a local choice because "24 of the 71 familiars have no fragment source in Everkai". The captured `Awaken` button's cost icon is a **third item**, distinct from both Level-Up's fruit and Advance's blue crystal. See the resolution below. | **structural** |
| A6 | **`Universal Insignia` has no counterpart at all** — neither the toggle, the balance, nor the item. | **structural** |
| A7 | Everkai disables the button when short and uses the same greyed treatment at max (`starCost` returns `null` past star 100). The original recolours the number and keeps the word. | cosmetic but pervasive (audit D13) |
| A8 | Everkai puts the cost after a `·` in the verb; the original puts it inside the button on a second line. | cosmetic (audit D11) |
| A9 | Everkai has no `Quick Activate` equivalent on the star ladder; it has `Activate all N ready · Free` on the bind panel instead. Right idea, wrong screen and a non-cost in the label. | **structural** |

### A5, resolved: the star currency is named after all

`docs/familiar-data-inventory.md` §6.3 records *"`PetStar.Cost` names no item in any table
read"*. It is named, one join away, and the capture points straight at it:

- **Every one of the 70 familiars has its own piece item.** `Item_Owner_PetPiece_<petId>`
  exists in `Item.json` for all 70 ids (checked by id, not by pattern).
- **31 of them additionally carry a `CommonPiece`** — `Pet.CommonPiece` is
  `Item_PetStarup_Grade9` on 20 familiars (grades 4 and 9) and `Item_PetStarup_Grade5` on 11
  (grade 5). Both items exist in `Item.json` with `Icon_Pet_StarUp_01/02`, and there is a
  third, `Item_PetStarup_OptionalBox`.
- **The star component reads both.** `CompPetDetailStar.lua` carries `StarPiece`,
  `hasPiece`, `GetCommonPiece`, `GetCommonPieceCostNum`, `BtnCommonUseItem`,
  `UpgradeCostType`, `costTyp`, `GetCostIDByStar` — and the checkbox
  (`CompPetDetailStar_CheckBox`, `_OnClickCheckBox`, `omn_checkBox`).

**Reading: `PetStar.Cost` is paid in the familiar's own `Item_Owner_PetPiece_<id>`, and the
`Use Universal Insignia` checkbox substitutes the grade-wide `Pet.CommonPiece` token**,
which is why it only exists for SSR / SSR+ / UR familiars — the exact set Everkai flags as
having no fragment source. This is identifier adjacency plus a config join, not decompiled
arithmetic (the `lua-strings` caveat in the data inventory §8 applies): it names the
currency and the substitution, not the substitution *rate*. `GetCommonPieceCostNum` is the
function that would carry that rate.

**Consequence for E6.** Everkai's class-up-item star cost is a workaround for a *faucet*
gap, not a table gap. The fix is a fragment source for the 24 starved familiars — which is
what `Pet.CommonPiece` is for — not a different currency.

## What Everkai should render

A dedicated `Awaken` tab in the familiar's icon dock:

- **The attribute strip and the `(i)`**, shared with Level-Up, showing all nine `PetAttr`
  rows in the glossary.
- **A cumulative capsule** with one pill per `addtype` this ladder pays (2 and 5), and a
  `Quick Activate` beside it that activates every reached-but-inactive star node.
- **A horizontal star rail.** Minimum viable: one card per star, the reached ones coloured
  with their `ExternalAdd1` value on a dark-green pill, the unreached greyed with a padlock
  and the star number in the pill's place; every `IsBig` card drawn larger. The rail anchors
  on the current star. This is the single highest-value visual on the tab and it is a list
  render over data Everkai already ships (`lib/familiar-node-data.json` holds all 100 star
  rows per rarity — see spec 06's verification).
- **A `N★ ➡ N+1★` plate pair** under the rail.
- **A `New Appearance!` medallion** at the lower left from 0★ onward, opening a full-screen
  preview page; the two unlock stars come from `PetStar.IsEvolve`.
- **`Awaken`** in orange, centred, with the item icon and `have/need` inside it, the `have`
  red when short, the button never greying.
- **`Use Universal Insignia`** as a checkbox with its balance beneath — only once Everkai
  has an insignia to spend. Until then, leave it out rather than ship a dead toggle.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| 100 star rows, cost and stat coefficients | `PetStar.Cost`, `ATKcoef`, `HPcoef` | **yes** — `lib/familiar-data.json`, verified exact (609 ladder rows) |
| Per-star reward, by rarity | `PetStar.ExternalAdd1` | **yes**, via `lib/familiar-node-data.json`'s 100 `star` nodes per rarity group — verified against the table in spec 06 |
| Milestone stars | `PetStar.IsBig` (20 rows) | **no** — dropped |
| Appearance unlock stars | `PetStar.IsEvolve` (15, 50) | **yes** — `familiar-explore-data.json.forms` |
| Metamorphosis slot unlocks | `PetStar.ExternalSkillNum` (5, 10) | **no** — spec 04 |
| Star currency | `Item_Owner_PetPiece_<id>`, `Pet.CommonPiece` | **partially** — fragments are collected (`familiarExplore.pieces`) but unspendable; `CommonPiece` is not imported |
| Insignia balance and substitution rate | `Pet.CommonPiece` + `GetCommonPieceCostNum` | **no**, and the rate is not in a table this pass found |
| Compendium exp per star | `PetStar.BookEXP` (constant per rarity — rule 6: a lookup, not a curve) | **no** — belongs to the Handbook (E8) |
| Nine attributes for the glossary | `PetAttr` 9 rows | **partially** — 3 of 9 imported |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Level 212 / 450 · Stage 5 · 3 stars` (`app/familiar-panel.tsx:36`) — the "3 stars" half | the rail, anchored on star 3, with star 4's card showing what star 4 gives |
| `Add star · 20 class-up` | `Awaken` in orange with the item icon and `have/need` on a second line |
| `Star 8: +12 Aptitude` and its 99 `<option>` siblings (`app/familiar-node-panel.tsx:15`) | the rail card's reward pill — the same value, on the screen where it is earned |
| `Activate all 7 ready · Free` | `Quick Activate`, on this tab, with no `· Free` suffix |
| `Adult Form · star 15 (3/15)` / `Awakened Form · star 50 (3/50)` (`app/familiar-panel.tsx:37`) | the `New Appearance!` medallion with `15★ Unlock`, opening the preview page |
| *"In the original each form is an animated portrait (a Spine skeleton: …). Everkai has not rendered familiar animations yet, so forms are listed but not shown."* | nothing on screen. A still of the evolved art is a preview; the absence of animation is not a sentence a player needs. |
| the star half of *"Stars cost class-up items, a local choice: the original spends each familiar's own fragments…"* (`app/familiar-panel.tsx:39`) | the `(i)`, once the currency is fixed per A5; until then the sentence belongs in `docs/parity-catalog.csv` row E6 and nowhere else |
