# Fellow screen specs — index and coverage

Captured from the running original client on the replacement private server
(`emulator-5582`, `com.iskslowtest.mislen`, 720x1280), 2026-09-22.

## Read this first — what this evidence is and is not

**These captures are a replacement server's reimplementation of the original.**

| Good evidence (use it) | Not evidence (do not use it) |
| --- | --- |
| Which screens exist and how they nest | Costs, prices, drop rates |
| Control layout, proportions, tap targets | Level caps, table lengths, schedules |
| Wording of labels, gates, empty states | Any specific number shown on screen |
| State machines (locked / empty / affordable / maxed) | Which fellows exist, their rarity or roster order |
| Colour semantics, number *formatting* | Growth curves |

Every magnitude must come from the original's own config tables
(`.../apk-audit/configs/config/logic`, 1,499 tables) or the decompiled client
(`.../private-server/readable/*.lua`). This caveat is repeated at the top of every
section spec; do not delete it when implementing.

The owner's save on this server is heavily progressed (Lv. 600 LR fellows, 58 joined).
Numbers in the screenshots are therefore end-game, not onboarding. Layout still holds.

## The original's own manifest

The Fellow list's `(i)` button opens an Information panel that enumerates the
sub-systems in the game's own words (`img/roster-info-1.png`, `img/roster-info-2.png`):

1. Fellow Level
2. Fellow Types — Inspiring, Diligent, Brave, Informed, Unfettered
3. Fellow Aptitude
4. Fellow Skills
5. Fellow Blessings
6. Fellow Talents
7. Fellow's Aura
8. Fellow Limit Break
9. Fellow Awakening

That is the design's own decomposition. The **UI** groups them differently — into a
5-icon dock plus two rails — and the specs below follow the UI, noting which of the nine
each screen serves.

## Screen tree as captured

```
Fellow (dock tab 3)
└── Roster  ................................ 01-roster.md
    ├── (i) Information panel
    ├── Sort by ▾  (Default / Power / Aptitude / Awakening)
    ├── Class filter bar (ALL + 5 types)
    ├── "Not Yet Joined" divider + locked cards
    └── card tap →
        ├── Cultivate (owned)  ............. 02-cultivate-shell.md
        │   ├── dock: Stella ............... 04-stella.md
        │   ├── dock: Awaken ............... 05-awaken.md
        │   ├── dock: Aptitude ............. 06-aptitude.md
        │   │       ├── tab Aptitude Skill
        │   │       └── tab Origin Boost
        │   ├── dock: Operation ............ 07-operation.md
        │   ├── dock: Upgrade (default) .... 03-upgrade.md
        │   │       └── Limit Break dialog
        │   ├── left rail ................. 08-family-resonance-group.md
        │   │       ├── Family
        │   │       ├── Resonance (Effect / Skill tabs)
        │   │       ├── Form Switch (full screen)
        │   │       └── Group  → Bond Detail
        │   ├── right rail
        │   │       ├── Hide → full-art mode
        │   │       ├── Info → name/title/race/occupation/bio
        │   │       ├── Favorite (toggle)
        │   │       ├── Blessing ........... 09-blessing.md
        │   │       │       ├── tab Blessing
        │   │       │       └── tab Custom Blessings
        │   │       ├── Familiar slot ...... 10-familiar-artifact.md
        │   │       └── Artifact slot ...... 10-familiar-artifact.md
        │   └── POW (i) → Power Details / Bond Detail .. 11-number-transparency.md
        └── Cultivate (not yet joined)  .... 12-locked-fellow.md
            ├── Source tooltip
            ├── tab Info
            └── tab Skills (Aura / Blessing / Operation / Talent / Skill)
```

## Coverage checklist

| # | Screen / state | Captured | Spec |
| --- | --- | --- | --- |
| 1 | Roster, default sort, ALL filter | yes | 01 |
| 2 | Roster `(i)` Information, both scroll positions | yes | 01 |
| 3 | Sort dropdown, all 4 options | yes | 01 |
| 4 | Class filter applied (count 58 → 12) | yes | 01 |
| 5 | "Not Yet Joined" divider + locked cards | yes | 01, 12 |
| 6 | Cultivate shell, LR fellow, all rails present | yes | 02 |
| 7 | Cultivate shell, SSR+ fellow, rails reduced | yes | 02 |
| 8 | Cultivate shell, R fellow, dock reduced to 3 | yes | 02 |
| 9 | Hide → full-art mode, Show toggle | yes | 02 |
| 10 | Info panel (name/title/race/occupation/bio) | yes | 02 |
| 11 | Upgrade, below cap (EXP bar, x1/x10/x100/Quick) | yes | 03 |
| 12 | Upgrade, at cap (Limit Break primary) | yes | 03 |
| 13 | Limit Break confirm dialog, unaffordable | yes | 03 |
| 14 | Stella, Lv. 20 (partially filled path) | yes | 04 |
| 15 | Stella, Lv. 0 (empty path, Upgrade button) | yes | 04 |
| 16 | Stella node selected (per-node reward panel) | yes | 04 |
| 17 | Stella `(i)` Information | yes | 04 |
| 18 | Stella "Attributes" cumulative summary, scrolled | yes | 04 |
| 19 | Awaken, 4 of 5 stars, unlocked medals | yes | 05 |
| 20 | Awaken, 0 stars, all medals locked | yes | 05 |
| 21 | Awaken talent-tier `(i)` tooltip (7 tiers) | yes | 05 |
| 22 | Aptitude → Aptitude Skill tab | yes | 06 |
| 23 | Aptitude → Origin Boost tab (milestone track) | yes | 06 |
| 24 | Total Aptitude breakdown dialog (16 sources) | yes | 06, 11 |
| 25 | Operation Skill + Operation Effect | yes | 07 |
| 26 | Family panel (bonded, 10/10) | yes | 08 |
| 27 | Resonance → Effect tab (paired cards) | yes | 08 |
| 28 | Resonance → Skill tab (3 medals, 1 locked) | yes | 08 |
| 29 | Form Switch full screen (SSR/UR/LR strip) | yes | 08 |
| 30 | Group → Bond Detail | yes | 08, 11 |
| 31 | Blessing tab (2 filled, 2 empty slots) | yes | 09 |
| 32 | Custom Blessings tab, fully empty/locked | yes | 09 |
| 33 | Select Familiar dialog (bound + candidates) | yes | 10 |
| 34 | Artifact dialog (Unequip / Change / Enhance) | yes | 10 |
| 35 | Empty familiar + artifact slots (R fellow) | yes | 10 |
| 36 | Power Details dialog, both scroll positions | yes | 11 |
| 37 | Bond Detail dialog | yes | 11 |
| 38 | Locked fellow detail + Source tooltip | yes | 12 |
| 39 | Locked fellow Skills tab, all 5 sections | yes | 12 |

### Not reached, and why

| Thing | Why |
| --- | --- |
| Awaken **confirm** dialog | The medal row is not interactive and the star-up button was gated on both accounts tested (11/15 fragments on the LR, Lv. 300 gate on the SSR+). No tap path reaches a confirm without first spending. Not attempted. |
| Limit Break **success** state | Required items were 0/1. Confirm dialog captured; the button was not pressed, per the no-spend rule. |
| Aptitude skill **locked** medal detail | Every aptitude medal on the tested fellows was already unlocked. A fresh fellow would show the locked state; the only R fellow available (Arake) has no Aptitude medals at Lv. 1 to compare. |
| Custom Blessing **unlock** flow | "Tap to unlock" was not tapped — it is a spend. Empty state captured. |
| Form Switch **applied** | The active form was already selected, so the button was inert. Switching forms is a persistent save change to the owner's account; not attempted. |
| Favorite **toggled on** | Deliberately not toggled — it reorders the owner's roster under the Default sort and is not needed to spec the control. |
| Resonance partner **picker** | Reached only through the swap button on an occupied slot, which would rebind the owner's existing resonance pair. Not attempted. |

## Global conventions the original uses everywhere

These are the load-bearing rules. Most of Everkai's "word heavy" problem dissolves once
these are adopted, because each one replaces a sentence with a glyph or a colour.

1. **Before → after, never a sentence.** Any upgrade preview is `old → new` on one line,
   with the new value in **green**. `Power +208.5M → +223.5M`. `Level Cap 600 » 650`.
   Everkai currently writes "20 upgrade levels · 18,000 village shards for the whole
   ladder · at the top: +149,000,000 own flat Power…" — that is the same information as
   six `old → new` rows.
2. **The cost lives inside the button, under the verb.** `Upgrade x99` with
   `EXP 24.43M/71.16K` in a smaller line beneath. Never a separate "this costs…" line.
3. **Have/cost colour encodes affordability.** The *have* number is green when
   sufficient, red when not (`11/3` green, `11/15` red, `0/20` red). No "you cannot
   afford this" text exists anywhere in the original.
4. **Quantity is a 4-segment selector, always `Quick | x1 | x10 | x100`**, right-aligned
   directly above the primary button, selected segment on a gold fill. The button's verb
   then reads the *actual* count it will perform, clamped to what you can afford —
   x100 selected but only 23 affordable renders `Upgrade x23`.
5. **Numbers are abbreviated in-flow, spelled out in detail dialogs.** `+223.5M` on the
   Stella node panel; `Power +223500000` in the Stella Attributes summary;
   `2,665,126,452` with thousands separators on the Cultivate stat block. Three
   registers, used consistently.
6. **One primary action per screen, bottom-right or bottom-centre.** Green = do it,
   gold/orange = a gated or higher-tier action (Limit Break, Enhance), grey = inert.
7. **A disabled state is a *different word*, not a greyed button.** Stella at max shows
   `Activated` in a red-outlined inert pill, not a greyed `Upgrade`.
8. **Locked things show their gate as a number on the artwork** — a padlock badge plus
   `Lv.100` printed on the medal — not a sentence underneath.
9. **Empty slots are drawn, not described.** A `+` tile with a red dot badge; a grey
   silhouette in a circular frame. The word "None" appears only in the detail area when
   nothing at all is configured.
10. **`(i)` is the only place prose is allowed.** Every explanatory paragraph in the
    original is behind an `(i)` or a magnifier. The screen itself carries no rules text.
11. **Every aggregate number has a breakdown.** Tapping the `(i)` beside Power or Total
    Aptitude opens a two-column source list. This is what Everkai's "From level &
    Aptitude 3,785 · Fixed 0" footnotes are trying to be, and it is strictly better.

## Everkai's current Fellow screens, for comparison

Live-build captures at
`…/scratchpad/audit/screenshots/current-app/` (`00_fellow_roster.png`,
`01_fellow_profile_rissette.png` … `07_fellow_wardrobe_rissette.png`).

Everkai's structure today: a `PanelPages` pager with the text labels
**Overview / Level / Skills / Equipment / Stella / Wardrobe**, `Previous · 3 / 6 · Next`
at the foot, and a `<details className="rules-note">About these rules</details>`
disclosure in most of them. The original has no pager, no text tab labels and no
rules disclosure on any Fellow screen.

Implementation touches `app/character-screen.tsx`, `app/panel-pages.tsx`,
`app/globals.css`, `app/blessing-panel.tsx`, `app/familiar-panel.tsx`,
`app/fellow-training.tsx`, `app/character-skill-guide.tsx`.

## Recommended implementation order

1. **02 + 03 (shell and Upgrade)** — the shell change is what makes every other section
   cheaper, and Upgrade is the screen players touch most.
2. **11 (number transparency)** — the Power/Aptitude breakdown dialogs delete more prose
   than anything else on the list and need no new game data.
3. **06 (Aptitude)** — Everkai's Skills page is the single wordiest screen.
4. **01 (roster)** — cheap, high visibility.
5. **04 (Stella)** — biggest structural rebuild; do it once the conventions are in place.
6. **05 (Awaken)**, **07 (Operation)** — systems Everkai lacks; gated on
   `docs/character-systems-gap.md` landing.
7. **08, 09, 10, 12** — rails and locked states.
