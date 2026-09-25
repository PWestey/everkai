# 09 · Blessing

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/blessing.png`, `img/blessing-custom-empty.png`

A half panel opened from the right rail's feather glyph, with two folder tabs:
`Blessing` and `Custom Blessings`.

## Tab `Blessing`

```
 ┌ Blessing │ Custom Blessings                  ✕ ┐
 │        ◇ Blessing from Family ◇                │
 │   ⬤     ⬤     ◌     ◌                          │  4 circular slots
 │ ┌────────────────────────────────────────────┐ │
 │ │ Shinobu Kocho's Blessing for Shinobu Kocho │ │
 │ │  POW +296M                            [»]  │ │
 │ └────────────────────────────────────────────┘ │
 └────────────────────────────────────────────────┘
```

- **Slot row** — four ~108 px circular slots. Filled slots hold a family member's
  portrait in a gold-or-pink ring; the **selected** slot has a bright gold ring. Empty
  slots are a flat grey-brown cat-ear silhouette in a plain ring — drawn, not labelled.
- **Detail card** — the selected blessing: a title line naming both parties
  (`<Blesser>'s Blessing for <Fellow>`), then a stat pill `POW +296M`, then a `»`
  jump button at the right edge that navigates to the blessing's source.

Note the title is generated from two names, so it reads naturally without a label
("Blesser:" / "Target:").

## Tab `Custom Blessings` — the empty state

```
 ┌ Blessing │ Custom Blessings                  ✕ ┐
 │        ◇ Blessing from Family ◇                │
 │  ┌ ✚ ┐   🔒     🔒     🔒     🔒                │
 │  │Tap to│                                      │
 │  │unlock│                                      │
 │ ┌────────────────────────────────────────────┐ │
 │ │                  None                      │ │
 │ └────────────────────────────────────────────┘ │
 └────────────────────────────────────────────────┘
```

This is the original's canonical empty/locked state and it is worth copying exactly:

- the **first** slot is actionable: a gold-ringed circle containing a large `✚` with the
  caption **`Tap to unlock`** wrapped inside the circle;
- every **subsequent** slot is a flat grey circle with a padlock glyph, no caption, no
  level gate;
- the detail area shows the single word **`None`**, centred, in a plain band.

Three states, three renderings, zero sentences. Compare with the usual Everkai empty
state, which is a paragraph explaining what would go here and how to get it.

The section header `Blessing from Family` is reused on both tabs even though the second
is custom — an original inconsistency; use a correct heading in Everkai.

## Comparison with Everkai

Everkai has `blessing-panel.tsx` and a `Blessings` page in the family pager
(`13_family_blessings_charlotte.png`), reached from Family rather than from the Fellow.

| # | Difference | Kind |
| --- | --- | --- |
| B1 | In the original, Blessing is reachable **from the Fellow** — it is a property of the fellow receiving it. Everkai reaches it only from the family member giving it. Both directions should exist; the fellow-side entry is the missing one. | **structural** |
| B2 | The original has **two kinds** — family blessings (automatic, from bonded family) and custom blessings (slots you unlock). Everkai has one. | **structural** |
| B3 | The original shows a fixed 4-slot row; Everkai lists blessings as rows of text. The slot row communicates capacity — "you have two more to fill" — which a list cannot. | **structural** |
| B4 | Empty state: the original draws `✚ Tap to unlock` + padlocks + `None`. Everkai writes a sentence. | **structural** |
| B5 | The original names the blessing by generating `X's Blessing for Y`; Everkai labels fields. | cosmetic |
| B6 | The original's `»` jump button is a glyph; Everkai uses labelled navigation buttons. | cosmetic |

## What Everkai should render

On the Fellow's right rail, a Blessing button opening a half panel with two tabs.

**Tab 1 `Blessing`** — a row of 4 circular slots (filled = blesser portrait, empty =
silhouette), then the selected blessing's card: generated title, stat pill, `»`.

**Tab 2 `Custom Blessings`** — the same row; first unfilled slot renders
`✚ Tap to unlock`, the rest padlocked; detail area shows `None` when nothing is set.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Family blessings on this fellow | list of (blesser, stat, value) | yes — `blessing-panel.tsx` computes blessing power |
| Slot capacity | max 4 | **no** — Everkai has no capacity concept |
| Custom blessing slots | unlocked count, contents | **no** |
| Blesser portrait | family member art | yes |
| Jump target for `»` | route to the blesser | yes |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| Any "no blessings yet — bond with a family member to…" copy | the silhouette slots and the word `None` |
| Row labels such as `Blesser` / `Target` / `Bonus` | the generated title `X's Blessing for Y` + a stat pill |
| Explanatory text about how many blessings a fellow can hold | the fixed 4-slot row |
| A labelled `View family member` button | the `»` glyph |

---

## Resolution (2026-09-25)

| # | Outcome |
| --- | --- |
| **B1** | **Fixed**, and it is the structural point of this spec. Blessing is now reachable **from the Fellow**, because it is a property of the fellow *receiving* it. `blessingRecipients(s, familyId)` answered the forward question and nothing anywhere asked the reverse; `lib/fellow-blessers.mjs` asks it, and the test asserts the inverse is *exactly* the forward map so the rail can never show a blessing nobody gives. |
| **B3** | **Fixed.** A fixed four-slot row, filled or silhouetted, because the row communicates capacity — "you have two more to fill" — which a list of however-many cannot. The four is the **original's shape**; Everkai enforces no cap, and a Fellow with five blessers still shows five. The panel says so rather than implying a rule. |
| **B4** | **Fixed.** Empty slots are drawn, not described. |
| **B2** | **Deferred.** The second kind — custom blessings in unlockable slots — needs an unlocked-slot concept Everkai has no data for at all. |
| **B5, B6** | **Deferred**, cosmetic, and they belong with B2's tab. |
