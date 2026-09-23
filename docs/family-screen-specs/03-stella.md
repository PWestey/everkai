# 03 · Family Stella

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/stella.png`, `img/stella-attributes.png`, `img/stella-info.png`

Dock position **1**, and present **only on UR members**. Table: `WifeSpirit.json`
(2,109 rows). Everkai: `lib/family-stella.mjs`, `app/family-stella-panel.tsx`.

## Layout

Half sheet, top edge y ≈ 500, bottom flush to the dock, `✕` tab at the top-right corner.

```
 ┌ ◇  (i)   Stella   ◇                                ✕ ┐
 │ Stella Level:  Lv. 13                       🔍       │
 │                                          Attributes  │
 │  ┌─────────┬──────────────────────────────────────┐  │
 │  │  ★ Lv.13│            Lv. 13→Lv. 14             │  │
 │  │    ╲    │ ┌──────────────────────────────────┐ │  │
 │  │ ◇Lv10 ╲ │ │ Attribute Boost                  │ │  │  grey section bar
 │  │      ◈  │ │  ♥ Intimacy       +12200→ +13200 │ │  │  new value green
 │  │ ◇Lv20 Lv│ │  💧 Blessing Power +12200→ +13200 │ │  │
 │  │      .14│ ├──────────────────────────────────┤ │  │
 │  │     ╱   │ │ Stella Boost                     │ │  │
 │  │   ★     │ │ ┌───┐ Building Earnings          │ │  │
 │  │  Lv.15  │ │ │art│ Lv. 5→Lv. 6                │ │  │
 │  └─────────┴─┤ └───┘ All Building Earnings      │ │  │
 │   35% width  │       +120%→ +150%               │ │  │
 │              └──────────────────────────────────┘ │  │
 │                    ┌──────────────────┐              │
 │                    │     Upgrade      │              │  green, bottom-centre-right
 │                    │  ◈ 1100/1200     │              │  have RED, need white
 │                    └──────────────────┘              │
 └──────────────────────────────────────────────────────┘
```

## The track (left column, ≈ 35 % width)

A dark-maroon **curved ribbon** running top to bottom, bowed to the right, with small gold
chevrons along it marking direction of travel. Three node types:

| Node | Drawing | Meaning |
| --- | --- | --- |
| Owned | filled **gold** four-point star, on the ribbon | a level already bought (`Lv. 13`) |
| Next | dark four-point star inside a **dotted gold focus ring** | the level the detail card describes (`Lv. 14`) |
| Future | dark four-point star, no ring | not yet reached (`Lv. 15`) |

Each carries a small brown pill label `Lv. N` offset below/right of the node.

Off the ribbon, flush left, sit **milestone badges** — pale-cream `Lv. 10` (passed) and
bright-gold `Lv. 20` (not reached), drawn as eight-lobed diamonds rather than stars. These
are the cosmetic milestones the `(i)` describes (titles, title frames, dynamic avatars), not
stat levels. They are **not tappable**; neither are the path nodes. The track is a *gauge*,
not a picker — the detail card always describes `current → current+1`.

That is the one real difference from Fellow Stella, whose nodes are selectable and whose
panel shows per-node rewards. Do not carry the Fellow's node-picking over.

## The detail card (right column, ≈ 60 % width)

- Centred header `Lv. 13→Lv. 14`. Note the arrow is `→` (next step), not `»` (tier change) —
  convention 13.
- **`Attribute Boost`** section bar (flat grey), then one row per attribute: icon, name,
  `old→ new` with **the new value in green**. Two rows observed: Intimacy, Blessing Power.
  These come from the `AddValue` row of `WifeSpirit`.
- **`Stella Boost`** section bar, then one card per halo: a circular art icon at left; the
  halo's **name** in brown bold; its **level** `Lv. 5→Lv. 6` with the new level green; its
  **effect** `All Building Earnings +120%→ +150%` with the new value green. One card shown at
  a time — the one that changes at this level.
- The card scrolls if a level changes more than one halo.

## The primary action

Green `Upgrade`, bottom, roughly centred with a rightward bias. **The cost is inside the
button, under the verb**: a crystal-fragment icon, then `1100/1200`, with the **have number
in red** because it is short. There is no separate cost line, no "you need 100 more", no
disabled-state wording. Convention 2 and 3, textbook.

There is **no quantity selector** on Family Stella. One level at a time.

## `Attributes` — the cumulative summary

The magnifier at the top-right of the level bar, labelled `Attributes`, opens a dialog titled
**`Stella Upgraded`** (present perfect — "what your Stella has already bought"):

```
┌ Stella Upgraded                                   ✕ ┐
│ Stella Boost                                        │
│ ┌────┐ Aptitude Blessing Lv. 8                      │
│ │art │ ──────────────────────────────────────       │
│ └────┘ Aptitude of Blessed Fellow +355              │
│ ┌────┐ Building Earnings Lv. 5                      │
│ └────┘ All Building Earnings +120%                  │
│ ┌────┐ Power Blessing Lv. 6                         │
│ └────┘ Power of Blessed Fellow +150%                │
│ ┌────┐ Aptitude Break Blessing Lv. 3                │
│ └────┘ Base Aptitude Skill level cap for the        │
│        Blessed Fellow +50                           │
│ Attribute Boost                                     │
│ ♥ Intimacy +12200        💧 Blessing Power +12200   │
└─────────────────────────────────────────────────────┘
```

Rows: circular art icon, name + `Lv. N` in bold brown, a hairline rule, then the effect in
ochre. The `Attribute Boost` footer puts its two values **side by side on one line** rather
than stacked — a summary register, not a preview register.

Note the register change (convention 5): the node card writes `+150%` and `+13200`; the
summary writes the same values with no `→`. Both spell out `+355` and `+50` in full.

**This settles `docs/character-systems-gap.md` §3.2.** Family Stella has **four** halos, not
one, and they are named:

| Halo | Effect wording | Scope |
| --- | --- | --- |
| `Aptitude Blessing` | `Aptitude of Blessed Fellow +n` | the Fellows this member blesses |
| `Building Earnings` | `All Building Earnings +n%` | **account-wide village earnings** |
| `Power Blessing` | `Power of Blessed Fellow +n%` | the blessed Fellows |
| `Aptitude Break Blessing` | `Base Aptitude Skill level cap for the Blessed Fellow +n` | the blessed Fellows |

That is exactly the four columns `lib/family-stella.mjs` already carries
(`[cost, talent, percentBp, talentLimit, yieldBp]`). The capture confirms the fifth column
`yieldBp` is the `All Building Earnings` halo and that the original shows it plainly on the
same list as the other three — it is not a hidden or special-cased term. Everkai's decision
to start paying it on 2026-09-22 is consistent with the original.

## The `(i)` Information

Verbatim, six `◆` bullets under `- Family Stella -`:

- *Some rare Family members have a Stella.*
- *After inviting a family member, you can activate their Stella to strengthen them.*
- *Family member fragments can be used to upgrade Stella, further boosting their Blessing Power.*
- *Before enhancing a Stella, you can view the effects of each upgrade.*
- *When a family member's Stella reaches certain levels, you can obtain exclusive prefix and suffix titles for the family member.*
- *For some family members, reaching certain Stella levels will grant exclusive title frames and dynamic avatars.*

Bullet 1 is the rarity gate. Bullets 5 and 6 are the milestone badges on the track.

## Compared with Everkai

`app/family-stella-panel.tsx` is 24 lines and renders as a `training-option`: one `<strong>`
line, three `<p>` lines and a row of three buttons (`+1 · rank 14 · 1,200 shards`,
`+5 · …`, `Max · …`), plus a two-paragraph `rules-note`.

| Difference | Kind |
| --- | --- |
| No track, no node graphic | **structural** — this is the whole visual identity of the section |
| No next-level preview card; Everkai prints the current values and a parenthetical `(next rank +150%)` inline | **structural** |
| No cumulative `Attributes` summary dialog | **structural** — and it is the cheapest one to build, being read-only over data already computed |
| Three quantity buttons (`+1 / +5 / Max`) instead of one `Upgrade` with the cost inside | **cosmetic**, but see convention 2 — the cost belongs in the button, and Family Stella has no multi-buy in the original at all |
| Everkai puts Family Stella between `Bonds` and `Blessings`; the original puts it **first** | **structural**, trivial to fix |
| Everkai shows it for every member; the original shows it only where `familyStellaRule(id)` exists — which Everkai already computes and uses to return `null` | **structural**, already half-done: hide the *tab*, not just the panel body |
| Everkai's cost is `1,200 shards` as text in the button label; the original is an icon plus `1100/1200` with the have in red | **cosmetic** |
| Everkai names the halos in prose (`+n Aptitude · +n% Power · talent cap +n`); the original names each one and gives it its own level and row | **structural** |

## What Everkai should render

```
◇ (i)  Stella  ◇                                    ✕
Stella Level: Lv. 13                       🔍 Attributes

  ★ Lv.13          Lv. 13 → Lv. 14
   ╲              ┌ Attribute Boost ─────────────────┐
 ◇Lv.10 ◈Lv.14    │ ♥ Intimacy        +12200 → +13200│
 ◇Lv.20  │        │ 💧 Blessing Power +12200 → +13200│
   ╱     │        ├ Stella Boost ────────────────────┤
  ★ Lv.15         │ [art] Building Earnings          │
                  │       Lv. 5 → Lv. 6              │
                  │       All Building Earnings      │
                  │       +120% → +150%              │
                  └──────────────────────────────────┘
                        [ Upgrade · ◈ 1100/1200 ]
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Current rank, cap | `familyStellaRank`, `rule.ranks.length` | **yes** |
| Next rank's four halo values | `rule.ranks[rank+1]` | **yes** |
| Halo names and effect templates | `Aptitude Blessing` / `Building Earnings` / `Power Blessing` / `Aptitude Break Blessing` | **no** — Everkai prints values without names. Add four constants. |
| Per-halo level (`Lv. 5`) | the halo's own level, distinct from the Stella rank | **no** — Everkai has the *value* per rank but not the halo's level. Derivable: count the ranks at which that column changed. |
| Attribute Boost (Intimacy / Blessing Power) | the `AddValue` row | **not modelled** — Everkai's Family Stella pays Fellows, not the member's own two stats. Check `WifeSpirit`'s `AddValue` rows before building the preview. |
| Cost + have | `familyStellaPlan`, shard stock | **yes** |
| Milestone levels (titles, frames, avatars) | which ranks are cosmetic milestones | **no** — cosmetic only; render the badges from a list or omit them |
| Rarity gate | `familyStellaRule(id) != null` | **yes** |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Blessed Fellows: +355 Aptitude · +150% Power · talent cap +50 · 1,100 Stella shards held` — one run-on line | four named `Stella Boost` rows, each `name Lv. n` over `effect +value`, in the `Attributes` dialog |
| `All Building Earnings +120% (next rank +150%) — this one is account-wide, not hers alone.` | `All Building Earnings  +120%→ +150%` on the node card. The scope note goes in the `(i)`, or nowhere — the roster's `Skill Bonus`-style total already shows it is account-wide. |
| `Across the whole family: +12.4% to every business's earnings.` | keep, but as a number in the account-wide overlay (spec 12), not on the member's panel |
| The two-paragraph `rules-note` (145 words on WifeSpirit columns, the `city yield percent` halo and the shard-pool substitution) | the six-bullet `(i)`, whose text the original supplies verbatim above. The shard-pool substitution is an Everkai deviation and belongs in `docs/`, not on screen. |
| `Activate to bless this member's Fellows with Stella.` + `Activate Family Stella` button | an inactive track with every node dark and one `Activate` where `Upgrade` goes |
