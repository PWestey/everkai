# 12 · The not-yet-joined fellow

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/locked-detail.png`, `img/locked-source.png`, `img/locked-skills-1.png`,
`img/locked-skills-2.png`, `img/locked-skills-3.png`

Tapping a card under `Not Yet Joined` opens a **different screen** from Cultivate — a
preview. It shares the shell's geometry but swaps every control.

## Layout

```
 ┌──────────────────────────────────────────────┐
 │ Cultivate                                    │
 │ ⬡UR        ╱ Golden Touch ╲        [Source]  │  Source button where Hide/Info sat
 │ ◉Informed      Aegle                         │
 │                                              │
 │ ◀        (greyscale art)                  ▶  │
 │                                              │
 │  ✦ Initial Aptitude ✦ 120                    │  single stat band, centred
 │ ┌ Info │ Skills ───────────────────────────┐ │  two folder tabs
 │ │ Name  Aegle      │ Title  Golden Touch   │ │
 │ │ Race  Human      │ Occupation  Merchant  │ │
 │ │ Bio   …                                  │ │
 │ └──────────────────────────────────────────┘ │
 │ ◀◀                                           │  back chevron only — no dock
 └──────────────────────────────────────────────┘
```

Differences from the owned shell:

| | Owned | Not yet joined |
| --- | --- | --- |
| Art | full colour | **greyscale**, full-bleed |
| Right rail | Hide / Info / Favorite + Blessing + 2 slots | a single **`Source`** button |
| Left rail | up to 4 pills | none |
| Stat block | Power / Level / Aptitude / Earnings | one band: `✦ Initial Aptitude ✦ 120` |
| Primary action | Upgrade / Limit Break | none |
| Dock | 5 sections | none — only a back chevron |
| Tabs | none | `Info` \| `Skills` |
| Paging chevrons | yes | yes |

The rarity badge, class badge and title/name banner stay exactly as on the owned screen,
so the two screens read as the same character in two states rather than two designs.

## `Source`

A small dark translucent tooltip anchored under the button, one line:

> `How to Invite: Treasure Hunt`

That is the entire acquisition UI. A label and a destination name. No route button, no
odds, no "collect N fragments" progress.

## Tab `Info`

Identical to the owned fellow's Info panel: a 2×2 label/value table (Name/Title,
Race/Occupation) plus a full-width Bio row.

## Tab `Skills` — the preview

A scrolling list of five banded sections. This is the "what would I be getting" view, and
it names the systems in the game's own vocabulary:

| Order | Band | Contents observed |
| --- | --- | --- |
| 1 | *(the aura's name, e.g.* `Empyrean Sound`*)* | a row of circular member portraits — this fellow greyed, others in colour with rarity rings. The fellow's **aura group** and who else is in it. |
| 2 | `Blessing` | the family members who would bless this fellow |
| 3 | `Operation Skill` | e.g. `Operation Faculty V` — the fellow's starting operation tier |
| 4 | `Talent` | the fellow's talents |
| 5 | `Skill` | a row of five skill medallions |

Two points worth carrying over:

- The aura band is **titled with the aura's own name**, not the word "Aura". The group
  identity is the heading.
- The fellow's own portrait in the aura row is **greyed while the others are colour**, so
  the missing piece is visually obvious. That single treatment does the work of a
  sentence like "you have 3 of 4 members of this aura".

## Comparison with Everkai

Everkai's not-joined cards (`00_fellow_roster.png`, bottom) render as near-black
portraits with a red frame under a `Not joined` divider. Opening one reaches the same
pager as an owned fellow.

| # | Difference | Kind |
| --- | --- | --- |
| P1 | Everkai uses the **same screen** for owned and unowned fellows, so a preview shows live upgrade controls for a fellow you do not have. The original ships a distinct, stripped preview screen. | **structural** |
| P2 | Everkai has **no acquisition hint**. The original's one-line `How to Invite: <place>` is the whole feature and costs nothing. | **structural** |
| P3 | Everkai has no `Skills` preview — no way to see what a fellow would bring before recruiting. | **structural** |
| P4 | Everkai's unowned art is near-black with a red frame; the original is greyscale at full brightness. Greyscale reads as "not yet"; near-black reads as "broken". | cosmetic |
| P5 | Everkai has no `Initial Aptitude` figure; the original's single stat band is the one comparable number across unowned fellows. | cosmetic |
| P6 | The original's aura row greys only the missing member; Everkai has no aura membership display at all. | **structural** |

## What Everkai should render

A **separate preview screen**, not the Cultivate screen with things disabled:

1. greyscale full-bleed art, same badges and name banner
2. a single `Source` button top-right → tooltip `How to Invite: <source>`
3. one stat band `✦ Initial Aptitude ✦ N`
4. two folder tabs `Info` | `Skills`
5. paging chevrons, back chevron, **no dock and no primary action**

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Greyscale art | the same art asset, CSS-filtered | yes |
| Rarity / class / title / name | as owned | yes |
| Initial Aptitude | a base-aptitude column | **probably** — the Power Details dialog lists `Base+240` for an owned fellow, so a base value exists per fellow; confirm the column in the tables |
| `How to Invite` source | acquisition source per fellow | **no** — needs a source column; the values are place names (`Treasure Hunt`), matching Everkai's existing activities |
| Aura group + members | group id, member list | **partially** — `bond-panel.tsx` models groups |
| Blessing preview | which family members bless this fellow | yes |
| Operation starting tier | e.g. `Operation Faculty V` | **no** — spec 07 |
| Talent / skill preview | the fellow's skill list | yes — `character-skill-guide.tsx` already renders these for unowned fellows |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Invite {name} at the Recruit counter in Drakenberg.` (`family-panel.tsx` pattern) | a `Source` button → `How to Invite: Drakenberg Recruit` |
| `No skill entries were published in this character's pinned source page. This does not mean the original character has no skills.` | an empty `Skill` band with no medallions — or omit the band |
| `Preview only · this skill can't be trained yet.` | the absence of any button on the preview screen |
| Live upgrade controls rendered disabled for unowned fellows | the stripped preview screen: no dock, no action |
| Any "you have 3 of 4 aura members" sentence | the aura row with the missing member greyed |

---

## Resolution (2026-09-25)

| # | Outcome |
| --- | --- |
| **P1** | **Fixed.** `app/fellow-preview.tsx`, reached by its own branch in the fellows route *before* the Cultivate shell. An unowned Fellow used to reach that shell with live upgrade controls, a Power/Level block over an absent record, and a five-section dock where nothing worked. Fellow was the last of the three rosters still doing this; Family and Familiar got their previews earlier this month. |
| **P2** | **Fixed.** `How to Invite`, one line, behind a `Source` button. `lib/fellow-source.mjs` answers with **Everkai's** route rather than the original's place name, per the Family set's spec 13 ruling. Measured across the 111-Fellow roster: 97 the Recruit counter with its price, 9 Wayfarer rank rewards (which is *why* `recruitPrice` returns null for them — they are not for sale), 5 the Fountain's wish. **Nothing falls through**, so the fallback line is a fallback and not the common answer. |
| **P3** | **Fixed.** A `Skills` tab, which is the "what would I be getting" view Everkai had no equivalent of. |
| **P4** | **Fixed.** `CharacterScreen`'s `preview` mode — greyscale at full brightness, reused unchanged from the Family locked member. Everkai's near-black-with-a-red-frame read as *broken*; desaturation reads as *not yet*. |
| **P5** | **Fixed.** One band, `✦ Initial Aptitude ✦ N`, from `heroRow` — the same base-Aptitude column the Power Details dialog shows as `Base+N` for an owned Fellow. Every Fellow has one, and it varies (20 / 35 / 70), so the band compares something. |
| **P6** | **Not built, and measured rather than assumed.** The original's Skills tab opens with a row of member portraits, only the missing one greyed — which says "you have 3 of 4 of this aura" without a sentence. Everkai cannot draw it: **every one of the 128 halos belongs to exactly one Fellow.** There is no group membership in the data at all. That row needs the `HeroBond` groups, which are catalogue **F8**, and **F6**'s group auras read the same table — they are one slice, and this screen should get its row when that lands. `tests/fellow-preview.test.mjs` pins the singleton property, so the day a shared halo appears the test fails and points here. |

The aura band itself **is** built, titled with the aura's own name rather than the word "Aura" — one
of the two treatments the spec says to carry over wholesale.

Two bands are absent for their own reasons and neither is faked with a placeholder: `Operation Skill`
needs spec 07's starting tier, which Everkai does not model, and `Blessing` needs a per-Fellow map of
which family members bless them — `blessingRecipients` answers the opposite question.

A layout note, now the third time it has cost an hour: `.character-screen-controls` is a **flex**
container, so a bare block child is a flex *item* and collapses to its min-content. The preview body
needs the same `width:100%; min-width:0` wrapper `.familiar-growth-wrap` and `.familiar-preview-wrap`
already carry.
