# Family screen specs — index and coverage

Captured from the running original client on the replacement private server
(`emulator-5582`, `com.iskslowtest.mislen`, 720x1280), 2026-09-23. Companion set to
`docs/fellow-screen-specs/`, same method, same depth.

`Family` is the English UI name. The tables call it `Wife*`; the client calls it `Beauty*`.
See `docs/character-systems-gap.md` §0 for the full vocabulary map.

## Read this first — what this evidence is and is not

**These captures are a replacement server's reimplementation of the original.**

| Good evidence (use it) | Not evidence (do not use it) |
| --- | --- |
| Which screens exist and how they nest | Costs, prices, drop rates |
| Control layout, proportions, tap targets | Level caps, table lengths, schedules |
| Wording of labels, gates, empty states | Any specific number shown on screen |
| State machines (locked / empty / affordable / maxed) | Which members exist, their rarity or roster order |
| Colour semantics, number *formatting* | Growth curves |

Every magnitude must come from the original's own config tables
(`.../apk-audit/configs/config/logic`, 1,499 tables; rule-2 positive control re-run for this
document and passed: `Wife 33, City 15, SimGame3 21`) or the decompiled client
(`.../private-server/readable/*.lua`). This caveat is repeated at the top of every section
spec; do not delete it when implementing.

The owner's save on this server is heavily progressed (42 joined, one member at Intimacy
13,710 and Stella Lv. 13, 967 Fathom slots unlocked account-wide). Numbers in the
screenshots are therefore end-game. Layout still holds.

## Where Family lives

Family is **not a dock tab**. The bottom dock is `Home · Village · Fellow · Stage ·
Drakenberg · Storage`; Family is a labelled hotspot on the **Home** room scene, beside
`Familiar`, `Appearance` and `Artifacts`. That is a structural difference from Everkai,
which reaches Family from its own navigation, and it is *not* worth copying — but it
explains why the Family surface carries its own full-width header and its own bottom bar
rather than inheriting the dock's.

## The original's own manifest

The Family header's `(i)` opens an Information panel that enumerates the sub-systems in the
game's own words (`img/roster-info-1.png`, `img/roster-info-2.png`). Ten headings, in order:

1. Family Intimacy
2. Family Blessing Power
3. Family Type
4. Family Relationship
5. Family Gifts
6. Family Skills
7. Improving relationships
8. Family Trips
9. Family Dates
10. Family List

That is the design's own decomposition. The **UI** groups them into a 5-icon per-member
dock, a 3+3 right rail, and a 3-button roster footer; the specs below follow the UI and note
which of the ten each screen serves.

## Screen tree as captured

```
Home → Family  ............................. 01-roster.md
├── (i) Information panel (10 headings)
├── Total strip: ♥ Intimacy · 💧 Blessing Power · 👥 count
├── Skill Bonus  (account-wide Fathom totals)  .. 12-family-list.md
├── card grid (3 wide) + "Not Yet Joined" divider
├── footer: date-item tiles · Auto Date ☑ · (i) · DP n/n · +
│   └── Auto Date wagon → results → VN reader  .. 09-auto-date.md
├── Study-Tour  ............................. 10-study-tour.md
├── Gallery (Date Record)  .................. 11-gallery.md
├── Family List (grouped by rung)  .......... 12-family-list.md
└── card tap →
    ├── joined member ("Family Training")  ... 02-member-shell.md
    │   ├── rarity badge · name/title banner · ‹ › member paging
    │   ├── right rail: Hide / Info / Favorite
    │   ├── right rail: Story / Travel / Gift  .. 08-interact.md
    │   ├── relationship ribbon + ♥/💧 medallions (tooltips)
    │   └── dock (5 on UR, 4 below UR)
    │       ├── Stella  ..................... 03-stella.md
    │       │      └── (i) · Attributes summary
    │       ├── Bonds  ...................... 04-bonds.md
    │       │      └── two (i) ladders (blessing, pupil)
    │       ├── Skills  ..................... 05-skills-fathoms.md
    │       │      ├── tab Skill  (the Fathom rail)
    │       │      └── tab Latency  ......... 06-latency.md
    │       │             └── Increase Latency Cap dialog
    │       ├── Blessing  ................... 07-blessing.md
    │       └── Interact (default)  ......... 08-interact.md
    └── not-yet-joined member ("Preview")  ... 13-locked-member.md
        ├── Source tooltip
        ├── Bonds (relationship-effect ladder)
        ├── tab Info
        └── tab Blessing (Blessed Fellows)
```

## Coverage checklist

| # | Screen / state | Captured | Spec |
| --- | --- | --- | --- |
| 1 | Family roster, top of list | yes | 01 |
| 2 | Family roster `(i)` Information, both scroll positions | yes | 01 |
| 3 | Roster scrolled — rarity nameplate colours | yes | 01 |
| 4 | "Not Yet Joined" divider + desaturated cards | yes | 01, 13 |
| 5 | Roster footer: Auto Date bar, DP counter, DP timer | yes | 01, 09 |
| 6 | Auto Date `(i)` "Advanced Function" popover | yes | 01 |
| 7 | Date-item tooltips (Flowering Fate, Divination of Fate) | yes | 01, 09 |
| 8 | Member shell, UR (5-tab dock, Stella present) | yes | 02 |
| 9 | Member shell, SSR (4-tab dock, no Stella) | yes | 02 |
| 10 | Member shell, R (4-tab dock, green rung) | yes | 02 |
| 11 | Hide → full-art mode, Show toggle | yes | 02 |
| 12 | Info panel (Name/Title/Race/Bio/CV) | yes | 02 |
| 13 | Intimacy medallion tooltip | yes | 02 |
| 14 | Blessing Power medallion tooltip | yes | 02 |
| 15 | `‹ ›` member paging from inside the shell | yes | 02 |
| 16 | Stella, Lv. 13 (path + next-node preview + cost) | yes | 03 |
| 17 | Stella `(i)` Information | yes | 03 |
| 18 | Stella "Stella Upgraded" cumulative summary | yes | 03 |
| 19 | Stella track detail (current / next / future / milestone) | yes | 03 |
| 20 | Bonds, high rung (Loving★★), gates unmet | yes | 04 |
| 21 | Bonds, lowest rung (Acquainted), gates met, Lv.0 greyed effect | yes | 04 |
| 22 | Bonds → Family Blessing `(i)` rung ladder | yes | 04 |
| 23 | Bonds → Adopted Children Intellect `(i)` old » new preview | yes | 04 |
| 24 | Skills → Skill tab, all 36 slots unlocked | yes | 05 |
| 25 | Skills → Skill tab, horizontal rail scrolled | yes | 05 |
| 26 | Skills → Skill tab, locked slots with ♥ gate pills | yes | 05 |
| 27 | Skills → Skill `(i)` gold-vs-Luck-Stone rules | yes | 05 |
| 28 | Latency, unlocked (cap bar, drop medallion, Stimulate) | yes | 06 |
| 29 | Latency `(i)` "Possible Results" + rate colour key | yes | 06 |
| 30 | Increase Latency Cap dialog (old » new, develop chances) | yes | 06 |
| 31 | Latency, locked (Intimacy gate) | yes | 06 |
| 32 | Blessing, affordable (green have) | yes | 07 |
| 33 | Blessing, unaffordable (red have), two blessed Fellows | yes | 07 |
| 34 | Interact → Gift (item strip, Gift / Batch Gift) | yes | 08 |
| 35 | Interact → Travel (two journey cards, discount badge) | yes | 08 |
| 36 | Travel `(i)` Instruction (weekly discount schedule) | yes | 08 |
| 37 | Interact → Story (Date Story / Become Family sections) | yes | 08 |
| 38 | Auto Date results list | yes | 09 |
| 39 | Date VN reader + "New CG Unlocked" | yes | 09 |
| 40 | Study Tour (empty slot, locked slot, Claim All) | yes | 10 |
| 41 | Study Tour → Deploy Family picker | yes | 10 |
| 42 | Gallery (Date Record) collected entries | yes | 11 |
| 43 | Gallery locked entries (blank polaroid + padlock) | yes | 11 |
| 44 | Family List grouped by rung, bottom rung | yes | 12 |
| 45 | Family List group `(i)` Pupil Effect Bonus | yes | 12 |
| 46 | Skill Bonus Overview (account-wide Fathom totals) | yes | 12 |
| 47 | Locked member Preview + Source tooltip | yes | 13 |
| 48 | Locked member Bonds → Relationship Effect ladder | yes | 13 |
| 49 | Locked member Info tab | yes | 13 |
| 50 | Locked member Blessing tab (Blessed Fellows) | yes | 13 |

### Not reached, and why

| Thing | Why |
| --- | --- |
| **Wardrobe / costumes** | `WifeClothes.json` has 111 rows with `unlockIntimacy`, `unlockCharm`, `levelUpIntimacy`, `levelUpCharm` and `MaxLevel`, so the system exists — but **no control on the Family surface reaches it**. The rarity badge, the name/title banner and the `Favorite` icon are all inert; there is no Form-Switch equivalent on the left. It is presumably entered from `Appearance` on the Home scene, which is outside this brief. Everkai has a Wardrobe tab; nothing here contradicts it, and nothing here justifies where it sits. |
| **Family rarity upgrade** | `WifeRarityUpgrade.json` (1,536 rows, `costItem: Item_RarityUpgrade_Wife_{id}`) has no control anywhere on the member screen. Same conclusion as Wardrobe. |
| **Custom Blessings** | The Fellow screen has a `Custom Blessings` tab. The Family Blessing panel has **no tabs at all** on any of the three members tested. `WifeCustomBless.json` gates on `wifeSpiriteUnlockLevel` and `wifeRarityCondiction: 6` — no member on this save clears it, so the tab is presumably rarity-gated rather than absent. Do not build it from this evidence. |
| **`Improve` on Bonds** | Pressed on neither member. On the UR it was gated (Intimacy 13,710/20,000); on the R every gate was met and the button carried its ready badge, but pressing it permanently advances the owner's relationship rung. Not attempted. |
| **`Improve` on Increase Latency Cap** | `Current Develop Chances: 0`, so it would have errored; pressing it was still a spend path. Dialog captured, button not pressed. |
| **`Stimulate`, `Fathom`, `Advanced`, blessing `Upgrade`, Stella `Upgrade`** | All spends. Every affordable/unaffordable pair was captured instead. |
| **`Auto Fathom` toggle** | A spend *automation*. Not touched; its icon and position are specced from the capture. |
| **`Favorite` toggle** | Deliberately not toggled — it reorders the owner's roster. |
| **Study Tour `Deploy`** | Deploying removes a member from roaming, a persistent save change. Picker captured, `Deploy` not pressed. |
| **`+` beside `DP`** | A purchase surface. Not opened. |
| **`Trip` / `Journey`** | Paid dates (crystals / tickets). Not pressed. |

### Things that happened and should be on the record

- Tapping a Gallery card's treasure-chest badge **claimed a CG collection reward**. That is a
  gain, not a spend, and it is re-earnable content the owner had already unlocked, but it was
  not intended. Chest badges sit inside the card's tap target; avoid them.
- `Auto Date` was pressed once, deliberately, to capture the results screen. It spent the
  day's 11 Date Points, which regenerate on a visible timer (`DP: 11/11` became `29:55`), and
  it unlocked several date CGs. Nothing unrecoverable was consumed.

## Global conventions — what carries over, and what is new

The eleven conventions in `docs/fellow-screen-specs/README.md` all hold on the Family
screens too. Four **additions or corrections** this capture establishes:

12. **A gate is a bar with the number inside it, three bars stacked.** The Bonds panel's
    requirement block is `label:` + a coloured progress bar with `have/need` printed *inside*
    the fill. Three rows, three colours (pink Intimacy, blue Blessing Power, green Total
    Family), the met one rendered full. No sentence says which one is short — the short bar
    is short. Everkai writes `requires 2,000 Intimacy` in the button label instead.
13. **`»` is the future tense, `→` is the next step.** The Stella node card uses
    `+12200→ +13200` for *the level you are about to buy*. The Bonds and Latency-cap previews
    use a gold `»` — `A+ » S-`, `400% » 420%`, `175% » 200%` — for *what a whole tier change
    would bring*. Two glyphs, consistently different scopes. Copy both.
14. **The medallion's colour is the number.** Latency's success rate is not only printed
    (`Success Rate: 50%`) — the central drop medallion is *drawn* in the matching colour, and
    the `(i)` gives the key: `Green 80% · Blue 50% · Purple 25% · Multicolor 10%`. Likewise a
    Fathom slot at +1% is drawn desaturated and at +23% in full colour. The art is the gauge.
15. **A locked thing keeps its shape and swaps its badge.** A locked Fathom slot is the same
    medallion with a padlock corner badge and a `♥ 150` pill where the `+N%` pill was. A
    locked Latency is the same drop, greyed, with `♥ Intimacy reaches 2000 to unlock` under
    it. Nothing is hidden, nothing is explained, one element changes.

One convention the Family screens **break**, and Everkai should not copy the break: the
quantity selector. Blessing uses the standard 4-segment `Quick | x1 | x10 | x100`, per row.
Latency uses a lone `☑ ×10` checkbox. Fathoms have no selector at all. Use the 4-segment
selector everywhere; the checkbox is the original being inconsistent, and the gap doc's
measurement (`System.WifePotentialHighConsume` × 10) shows it is the same mechanic.

## Everkai's current Family screens, for comparison

Live-build captures at `…/scratchpad/audit/screenshots/current-app/`
(`00_family_roster.png`, `08_family_profile_charlotte.png` … `16_family_wardrobe_charlotte.png`).

Everkai today composes `app/family-panel.tsx` as a `RosterLanding`, then a `CharacterScreen`
shell (shared with Fellow since the Fellow rebuild — Hide, Info, `‹ ›`, stat row, rail all
already exist), then a **`PanelPages` pager with eleven text labels**:

> Profile · Dates · Gifts · More gifts · Bonds · Stella · Blessings · Fathoms · Latency ·
> Pictures · Wardrobe

with `Previous · n / 11 · Next` at the foot and a `<details className="rules-note">About
these rules</details>` disclosure on almost every page.

The original has **five icon tabs**, no pager, no text labels, and no rules disclosure on any
Family screen.

| Original | Everkai today | Spec |
| --- | --- | --- |
| Stella (dock 1, UR only) | `Stella` page | 03 |
| Bonds (dock 2) | `Bonds` page — but Everkai's Bonds is *Fellow pairing*, not the relationship rung; the rung lives on `Profile` | 04 |
| Skills → Skill (dock 3a) | `Fathoms` page | 05 |
| Skills → Latency (dock 3b) | `Latency` page | 06 |
| Blessing (dock 4) | `Blessings` page | 07 |
| Interact (dock 5) + Story / Travel / Gift rail | `Profile` + `Dates` + `Gifts` + `More gifts` pages | 08 |
| roster Auto Date footer | inside `Dates` | 09 |
| roster Study-Tour | *absent* | 10 |
| roster Gallery | `Pictures` page | 11 |
| roster Family List + Skill Bonus | *absent* | 12 |
| — | `Wardrobe` page | (no original surface found) |

The good news: the systems are all there. `lib/latency.mjs`, `lib/fathoms.mjs`,
`lib/family-stella.mjs`, `lib/blessings.mjs`, `lib/bonds.mjs`, `lib/family-trips.mjs` all
ship, with the original's own tables behind them. **This is almost entirely a presentation
job.** The exceptions are listed per section and totalled below.

Implementation touches `app/family-panel.tsx`, `app/latency-panel.tsx`,
`app/fathom-panel.tsx`, `app/blessing-panel.tsx`, `app/family-stella-panel.tsx`,
`app/bond-panel.tsx`, `app/gift-panel.tsx`, `app/family-trip-panel.tsx`,
`app/family-gallery-panel.tsx`, `app/panel-pages.tsx`, `app/globals.css`.

## What this capture settles for `docs/character-systems-gap.md`

- **Latency (§3.1) is confirmed in every detail Everkai implemented.** The panel shows
  `Latency Cap: 400%`, `All Building Earnings: +132%`, `Success Rate: 50%`, `Stimulate ·
  134/50` with a `×10` multiplier, and a cap dialog reading `400% » 420%` /
  `Village Earnings+4 %` / `Increase ♥290 to obtain develop chances`. The member's Intimacy
  is 13,710 and the next cap row needs 14,000 — 13,710 + 290 = 14,000 exactly. The `(i)`
  states the four rates (80/50/25/10) and the three gains (+1/+2/+4) verbatim. Nothing in
  `lib/latency.mjs` is contradicted.
- **Fathoms (§3.3) are confirmed.** 36 slots on a rail, the six-type cycle, keep-if-better,
  `Success Rate: 0.32%` on gold against `35%` on advanced at the same slot, the gold ladder
  rising with repeat use, Luck Stone flat. The `(i)` says it in the original's words: *"the
  higher the bonus is, the lower the success rate"*, and *"When using Luck Stone … you can
  get at least a +20% bonus and above. The cost of Luck Stones remains the same every time."*
  That last clause is new information: **Advanced Fathoms floor at +20%**, they do not merely
  roll a better distribution. Check `lib/fathoms.mjs` against it (spec 05).
- **Family Stella (§3.2) has four halos, not one.** The `Attributes` summary names them:
  `Aptitude Blessing`, `Building Earnings`, `Power Blessing`, `Aptitude Break Blessing` —
  three of which target *the Blessed Fellow* and one of which is the account-wide
  `All Building Earnings`. `lib/family-stella.mjs` already pays all four columns. The screen
  also confirms Stella is **rarity-gated**: the UR member has the tab, the SSR and R members
  do not.
- **Everkai's Latency prose is 4× the original's.** The original's Latency panel carries one
  sentence. `app/latency-panel.tsx` carries nine paragraphs plus a three-paragraph disclosure.
  Section 06 lists exactly what to delete.

### The operation/appointment question, settled

The brief asks whether operation levels are **shared across a character's skills or
per-skill**, because a three-skill Fellow would otherwise multiply again. Settled by capture
plus config, both:

- **By capture.** `img/fellow-operation-lv101.png` (Orivita, UR, Lv. 550) shows
  `Operation Faculty V: Lv. 101/300` with `Upgrade x23 · 1.101K/1.094K`.
  `img/fellow-operation-lv1.png` (Tanjiro, SSR+, Lv. 300) shows
  `Operation Faculty IV: Lv. 1/300` with `Upgrade x70 · 1.101K/1.075K`. Same account, same
  shared currency balance (1.101K), **different levels and different costs**. So the level is
  **per-Fellow**, not account-wide.
- **By config.** `Hero.json` has 181 rows; 180 of them carry `operationSkill` with **exactly
  three** entries — one `Hero_Appoint_Country{N}Base_{tier}`, one
  `Hero_Appoint_Building{N}Extra_1` unlocked at Fellow level 50, one
  `Hero_Appoint_Country{N}Extra_2` unlocked at level 200. Across the 76 `Hero_Appoint_*`
  `SkillBase` rows the split is: **43 rows `skillType Hero_Appoint_Base_1`,
  `maxUpgradeLevel 300`, `skillProp_Level 500`** (the levelled one) and **32 rows
  `skillType Hero_Appoint_Extra_1`, `maxUpgradeLevel 1`, `skillProp_Level 0`** (the two
  fixed unlocks), plus one `Hero_Appoint_SimGame_1`.

**Answer: a Fellow has three operation skills but only one of them is levellable, and it is
levelled once, on that Fellow.** The other two are `maxUpgradeLevel 1` unlock-once effects
with no growth. There is nothing to share and nothing to multiply — the "three-skill Fellow
multiplies again" risk does not exist. The UI matches exactly: one `Operation Skill` card
with `Lv. N/300` and one selector, then an `Operation Effect` list of star-bulleted lines
with no level, no cost and no button. Implement `skillProp_Initial + skillProp_Level ×
(level − 1)` for the Base skill only, cap 300, one stored integer per Fellow, and add the two
Extras as flat unlocks at Fellow level 50 and 200.

## Recommended implementation order

1. **02 (member shell) + the dock.** Eleven text-labelled pager pages become five icon tabs
   with a sub-tab pair. This is the change that makes every other section cheaper, and it
   reuses the `CharacterScreen` shell the Fellow rebuild already built. It also moves
   `Latency` under `Skills` where the original puts it, which removes a top-level label.
2. **06 (Latency) and 05 (Fathoms).** The two wordiest Family screens in Everkai and the two
   that already have complete, measured data behind them. Between them they delete more prose
   than everything else on this list combined.
3. **04 (Bonds).** The three-bar gate block and the `A+ » S-` preview are the single best
   prose-to-visual swap in the whole Family surface, and Everkai's relationship UI
   (`Improve relationship · requires 2,000 Intimacy`) is exactly the sentence they replace.
4. **07 (Blessing).** Cheap: add the blessed-Fellow portrait row with its `POW +n` badge and
   move the cost into the button.
5. **03 (Stella).** The node track is the biggest single visual build; do it after the
   conventions are in place, mirroring the Fellow Stella work already landed.
6. **01 (roster) + 12 (Family List, Skill Bonus).** Cheap, high visibility, and `Skill Bonus`
   is a read-only view over `fathomBonus()` that Everkai can build today.
7. **08, 09, 11 (Interact rail, Auto Date, Gallery).** Presentation over shipped systems.
8. **10 (Study Tour).** The one genuinely missing system. Gate on an owner decision — it is a
   second idle-collection loop and `WifeTravel.json` is only 20 rows.
