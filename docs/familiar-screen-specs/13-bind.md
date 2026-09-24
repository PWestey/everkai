# 13 · Bind — the familiar side (`✚` slot → Select Fellow)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/detail-bindslot.png` (the `Select Fellow` dialog),
`img/detail-shell-ssr.png` (the `✚` slot and the bind readout under the art),
`img/detail-metamorphosis.png` (the second entrance — the red `Unequipped by Fellows`
ribbon)

Companion to `docs/fellow-screen-specs/10-familiar-artifact.md`, which specced the **Fellow
side** of the same action. This is the mirror.

## The original binds from both sides, and it is one action

Measured in the client's own string tables (positive control: `PetTower` returns 32 files;
the bare-identifier pattern from `docs/familiar-data-inventory.md` §9 is the one used):

| Panel | Side | What its identifiers carry |
| --- | --- | --- |
| `UI/Pet/Detail/PanelHeroChoosePet.lua` | Fellow → picks a familiar | `GetPetList`, `SortPetList`, `CompHeroChoosePet`, `CompHeroPetHeadItem`, `CompPetStar`, `GetAddHeroPower`, `power1`/`power2`, `Equip` |
| `UI/Pet/Detail/PanelPetChooseHero.lua` | Familiar → picks a Fellow | `SortHeroList`, `CompPetChooseHero`, `CompPetHeroHeadItem`, `GetHeroPowerWithPet`, `GetHeroPowerWithoutPet`, `GetExclusiveHero`, `Equip` |

Both issue **the same request, `RqPetSelectHero`**, and both draw their button caption from
**the same text key, `PetChooseHeroPanelBtnTxt`**. So the answer to the implementation
audit's capture question 4 — *"Is binding reached from the familiar, from the Fellow, or
from both?"* — is **from both, as two views of one action**. D1 does not resolve by
deletion. It resolves by making the two views consistent.

## Entry points on the familiar side

| Entry | Rendering |
| --- | --- |
| The `✚` slot | A ~64 px square tile at the **lower right of the art**, on the shell, level with the `Lv. N  N★` plate at the lower left. Grey ground, a faint **bust silhouette of a Fellow**, a gold `✚` over it. No caption, no red dot. |
| The `Unequipped by Fellows` ribbon | A red parallelogram at the right end of the Metamorphosis tab's `Before Metamorphosis` band, carrying a gold `✚` medallion. It is a control: `CompPetDetailEvolve.lua` carries `btnBindHero`. Red because the slot is empty. |

The `✚` tile is the mirror of the Fellow rail's tile in spec 10, with one deliberate
difference: **the Fellow-side empty tile is a bare `✚` with a red dot; the familiar-side
empty tile draws a Fellow's silhouette behind the `✚`.** Each side draws the *thing you
would put in the slot*. Neither writes the word "none".

## The bind readout, under the art

The shell prints the bind's whole effect in a fixed block directly beneath the art, above
the dock:

```
 ┌────────────────────────────────────────────────┐
 │   (POW) ✦ Final Power Bonus +2.5%  ✦           │  gold banner, full width
 ├───────────────────────┬────────────────────────┤
 │ (POW) Power+1.75M     │ ( ✦ ) Aptitude+128     │
 ├───────────────────────┼────────────────────────┤
 │ ( % ) Power+80%       │ ( ✦ ) Aptitude+0%      │
 └───────────────────────┴────────────────────────┘
```

Five cells for **the five `PetExternalAdd` buckets** — flat Power, Aptitude, Power %,
Aptitude %, and All-Power % promoted out of the grid onto its own gold banner. The `Select
Fellow` dialog reuses the last two of them as a strip behind itself
(`Power+80% | Aptitude+0%`), so the numbers stay on screen while you choose.

This is the union of what the growth tabs pay: the Level-Up capsule's three pills and the
Awaken capsule's two (specs 05, 06), plus the familiar's own base from `Pet.ExternalAdd`.
Measured against the tables, both halves named (rule 1): the base for a grade-4 familiar is
flat 500,000 + All-Power 2 %, and the Lv. 1 / 0★ capture prints exactly `+500K` and `+2%`
before a single milestone is reached.

## `Select Fellow` (a centred dialog)

```
 ┌                Select Fellow                  ✕ ┐
 │ ┌─────────────────────────────────────────────┐ │
 │ │ [portrait] lv.300  Iori          [ Equip ]  │ │
 │ │            POW 61.36M » 61.36M              │ │
 │ └─────────────────────────────────────────────┘ │
 │ ┌─────────────────────────────────────────────┐ │
 │ │ [portrait] lv.300  Tigirl        [ Equip ]  │ │
 │ │            POW 60.04M » 60.04M              │ │
 │ └─────────────────────────────────────────────┘ │
 │ ┌ … Lux · Acedia · Zenitsu Agatsuma … ────────┐ │
 │                                                 │
 │              Free Attempts: 2                   │  red, centred, dialog foot
 └─────────────────────────────────────────────────┘
   Power+80%          │          Aptitude+0%          ← the shell's strip, behind
```

| Element | Rendering |
| --- | --- |
| Title | `Select Fellow`, centred, over a hairline flourish; red `✕` tab clipped to the top-right corner |
| Row | A full-width cream card: **square portrait tile with a gold rarity frame** on the left, then `lv.NNN` and the Fellow's name on one line, then the Power pill beneath, then a green `Equip` at the right |
| Power pill | `POW` medallion + `old » new`, with a **green double chevron `»`** between and both halves in the same brown | The old » new pair is the whole justification for the dialog: it prices the choice in the only unit that matters. |
| `Equip` | Green, rounded, one word | All five visible rows read `Equip`. No `Swap` was observed **on this side**; since both panels share one caption key, treat the verb pair as shared until a contested row is captured. |
| `Free Attempts: 2` | **Red, centred, once, at the dialog's foot** | Spec 10's Fellow-side dialog puts the same counter **per row**. Two placements of one counter. |
| Sort | `SortHeroList` in the client; the captured order is descending by Power (61.36M, 60.04M, 58.54M, 50.65M, 23.44M) and **ignores level** — a Lv. 1 Fellow sits fourth | |

**Not shown on this side:** which familiar each Fellow currently holds. The Fellow-side
dialog overlays the current holder's portrait on each candidate (spec 10, difference E3);
the familiar-side rows carry no such overlay. That asymmetry is in the original, and it is
the original being less helpful — Everkai's rebuilt Fellow-side is better and should keep
its overlay.

`Equip` was **not pressed**. Rebinding is a persistent change to the owner's save.

## `Free Attempts` is a daily allowance, and it has a cost ladder

`10-familiar-artifact.md` flagged `Free Attempts: N` as *"a gacha/reroll counter from the
original's monetised loop"* and deliberately did not port it. That reading is measurably
wrong in kind:

- Both panels read **`GetSelectHeroFreeTimes`**, keyed
  **`PetDetailSelectHeroFreeTimesToday`** — a *per-day* counter of free binds.
- `System.json` carries **`HeroPetSlotCost`: `[0, 0, 50, 100, 150, 200, 250, 300, 350, 400,
  450, 500]`** and **`HeroPetSlotItem`: `"4"`**. Twelve entries, **the first two zero** —
  which is exactly the `Free Attempts: 2` the dialog prints.
- `System.HeroPetSlot` is `[{hero_lv: 1}]` — **one familiar slot per Fellow, from level 1**.
  Everkai's "One Familiar per Fellow" rule is correct and measured.

So the original gives two free rebinds a day and charges an escalating price for the rest.
That is a **friction** mechanic, not a monetisation one, and under the single-player design
rule it should be *adapted or removed* deliberately rather than dropped as monetised. The
recommendation is to drop the charge and keep neither counter nor `· Free` label: with no
cost there is nothing to count, and a label that says "Free" is the label convention 2
exists to delete.

One state neither capture reached: `Pet.ExclusiveHero` is set on **3** of 70 familiars, each
with an `ExclusiveAdd` bonus, and both panels read `GetExclusiveHero`. The picker presumably
marks that Fellow. Treeraffe has no exclusive Fellow, so nothing in these captures shows how.

---

## The ruling: Everkai binds twice, and `fellow-shell.tsx` is the correct one

`docs/familiar-implementation-audit.md` D1 found `bindFamiliar` / `unbindFamiliar` driven
from two different UIs. Both still ship.

| | `app/fellow-shell.tsx:148–171` (`SelectFamiliar`) | `app/familiar-node-panel.tsx:19` |
| --- | --- | --- |
| Reached from | the Fellow rail's `✚` tile (`:172–189`) | the `Fellow bond` page of a text pager inside the Familiar Hall |
| Shape | bound item on a raised band with an orange `Unbind`, a rule, then candidates as art cards | a `NativeSelect` of Fellow names |
| Candidate art | rarity frame, `N★` badge, **current holder's portrait overlaid** | none |
| Verb | `Equip` / `Swap` | `Bind Fellow · Free` |
| Prose | none | a CSS-hidden `small-note` **and** a 24-word `rules-note` |
| Built to | `docs/fellow-screen-specs/10-familiar-artifact.md` | the pre-rebuild design |

**`app/fellow-shell.tsx` is correct.** It matches the original's Fellow-side panel
(`PanelHeroChoosePet`) in shape, in the holder overlay, and in the `Equip`/`Swap` verb pair,
and it was built to a spec the owner already accepted. Keep it as it is.

**`app/familiar-node-panel.tsx` must stop being a binding UI, and in fact must stop
existing.** It is doing two jobs, and the capture reassigns both:

1. **Its node `<select>` belongs on the growth tabs.** The 99 level nodes and 100 star nodes
   it lists as `<option>` strings are `PetLevel.ExternalAdd` and `PetStar.ExternalAdd1` —
   verified exact against the config set in spec 06 — and the original renders them as the
   Level-Up tab's two rails and the Awaken tab's star ladder, each with its own
   `Quick Activate`. Specs 05 and 06 own them.
2. **Its binding half becomes a mirror dialog**, `Select Fellow`, reached from a `✚` slot at
   the lower right of the familiar's art, built as the mirror of `SelectFamiliar`: one row
   per recruited Fellow, portrait + `lv.N` + name, a `POW old » new` pill using
   `bondedPower` with and without this familiar, a green `Equip`, and the bound Fellow on a
   raised band at the top with an orange `Unbind`.

When both moves land, `app/familiar-node-panel.tsx` has nothing left in it. Delete the file,
and with it: the `NativeSelect` of Fellow names, `Bind Fellow · Free`, `Activate node ·
Free`, `Activate all N ready · Free`, the `small-note` that `app/globals.css:768` already
hides, and the `rules-note`. That is audit findings **D1**, **D3** (one of four `<select>`s),
**P2** and the `§2.3` CSS-hidden element, closed in one change.

### Everkai's per-stage share is contradicted by the capture

`lib/familiar-nodes.mjs:16–19` pays a bound Fellow **a ninth of the familiar's inherent
bonus per stage**: nothing at stage 1, everything at stage 10. Its own comment says *"The
per-stage share is a local rule; the original scales its hero bonus by star
(`PetStar.ExternalAdd1`), not yet imported."*

Both halves of that comment are now measurable:

- `PetStar.ExternalAdd1` **is** imported — it is the 100 `star` nodes in
  `lib/familiar-node-data.json`, verified exact. The star scaling the comment defers to is
  already in the data, as nodes.
- The Lv. 1 / 0★ capture prints the familiar's **full** base bonus (`+500K`, `+2%`) with
  zero milestones reached. Everkai's rule would render that familiar at `+0` and `+0%`,
  because stage 1 pays a share of zero.

So the ninth-per-stage rule is a local invention stacked on top of a scaling mechanism the
original already expresses as nodes, and the one screen that shows the base at stage 1
disagrees with it. **The caveat that survives:** the captured readout is the *familiar's*
bonus block, and nothing in these captures proves the bound Fellow receives all of it.
The measurement that would settle it is `GetHeroPowerWithPet` − `GetHeroPowerWithoutPet` on
a bound Fellow at stage 1 — one bind, on the emulator, on a Lv. 1 familiar. That is a spend
(`Equip`), so it was not run. Until it is, treat this as **the one open question on the bind
path**, and do not delete the per-stage rule silently.

## What Everkai should render

**On the familiar's detail shell:** a `✚` tile at the lower right of the art, drawing a
Fellow silhouette behind the plus when empty and the bound Fellow's portrait with `lv.N`
when filled. No caption.

**Under the art:** the five-bucket readout — a gold `Final Power Bonus +x%` banner over a
2×2 grid of flat Power, Aptitude, Power %, Aptitude %. `lib/familiar-nodes.mjs` already
computes four of these fields (`flat`, `aptitude`, `percent`, `finalPercent`); the fifth
(Aptitude %) is `PetExternalAdd` row 4 and arrives with Metamorphosis (spec 04).

**`Select Fellow` dialog:** bound Fellow on a raised band with an orange `Unbind`; a rule;
then one card per recruited Fellow with portrait, `lv.N`, name, a `POW old » new` pill and a
green `Equip`. Sort by Power descending. No `Free Attempts` footer and no `· Free` suffix.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| One familiar per Fellow | `System.HeroPetSlot` (`hero_lv: 1`) | **yes**, as a hard-coded rule — now measured |
| Bound familiar and its level | `game.familiarBonds`, `game.familiars` | **yes** |
| `POW old » new` per Fellow | `bondedPower` with and without the familiar | **yes** — `familiarBonus` already returns the delta; nothing new is needed |
| The five bucket totals | `Pet.ExternalAdd` + `PetLevel.ExternalAdd` + `PetStar.ExternalAdd1` (+ Metamorphosis) | **four of five** — Aptitude % arrives with spec 04 |
| Rebind allowance and cost | `PetDetailSelectHeroFreeTimesToday`, `System.HeroPetSlotCost`, `HeroPetSlotItem` | **no** — and the recommendation is to drop it, not port it |
| Exclusive Fellow marker | `Pet.ExclusiveHero` / `ExclusiveAdd` (3 rows) | **no** |
| Current holder overlay (Fellow side) | `familiarBonds` inverted | **yes** — already shipping in `SelectFamiliar`; keep it |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| The `NativeSelect` of Fellow names (`app/familiar-node-panel.tsx:19`) | the `Select Fellow` card list |
| `Bind Fellow · Free` | `Equip`, in a row card, with no cost suffix |
| `Unbind` as a peer outline button | `Unbind` in **orange** on the bound Fellow's raised band, as `SelectFamiliar` already does |
| `Base binding bonus applies while bound; activated nodes add to it. One Familiar per Fellow. Rebinding moves its activated bonuses with it.` | the `✚` tile (capacity), the five-bucket readout (effect) and the `POW old » new` pill (consequence). Delete the element, do not let `app/globals.css:768` keep hiding it. |
| `About these rules` → *"Level and star nodes use public reference values. Activation and rebinding are free sandbox choices. Power ordering is reconstructed; original activation costs are unresolved."* (`app/familiar-node-panel.tsx:19`) | nothing on screen. Two of its three claims are now false: the node values are **exact** against `PetLevel.ExternalAdd` / `PetStar.ExternalAdd1`, and the activation request is `RqActiveLevelExternalAttr` / `RqActiveStarExternalAttrOneKey` with no cost pair on the control. Correct `docs/data-provenance.md:91` and `docs/parity-catalog.csv` instead. |
| `Activate node · Free` / `Activate all N ready · Free` | `Quick Activate` on the Awaken and Level-Up tabs (specs 05, 06) |
| `Level 150: +2,400,000 Power, +18 Aptitude` (`:15`) | the milestone rails (spec 06) and the star rail (spec 05) |
| `Current bond` / `Bound Fellow` / `Unbound` / `None` captions (`:19`) | the tile and the portrait; convention 9 — empty slots are drawn, not described |
