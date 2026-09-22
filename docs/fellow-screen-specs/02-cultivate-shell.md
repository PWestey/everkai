# 02 · The Cultivate shell

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/upgrade-lr-atcap.png` (LR, everything present),
`img/upgrade-ssr-atcap.png` (SSR+, rails reduced),
`img/upgrade-below-cap.png` (R, dock reduced), `img/hide-mode.png`

This is the frame every Fellow section lives inside. Get it right once and specs 03–11
are mostly content.

## Structure

The screen is **full-bleed character art** with floating chrome. There is no page
background, no card, no scroll container. Art is the layout.

```
 y=0    ┌──────────────────────────────────────┐
        │ POW 4.938B  🏠 12.24B/s  🪙 3.986aa  │  currency bar (persistent)
 y=58   │ Cultivate                            │  screen title, x=20, no back chevron here
 y=130  │ ⬡LR          ╱ Insect Hashira ╲   ◈ │  rarity badge (L) · title+name banner (C)
 y=225  │ ◉Informed                        ◈ │  class badge (L) · Hide/Info/Favorite (R)
        │                                    ◈ │
 y=478  │ ◀                                  ▶ │  fellow paging chevrons, vertically centred
        │                                      │
 y=600  │ ⬭ Family 10/10                       │  left rail begins
 y=700  │ ⬭ Resonance              🪶 Blessing │  right rail lower group
 y=820  │ ⬭ Form Switch            ▣ familiar  │
 y=925  │ ⬭ Group 1/1              ▣ artifact  │
 y=985  │ POW 2,665,126,452 (i)                │  stat block
 y=1035 │ Lv. 600 ★★★☆☆                        │
 y=1090 │ ✦ Aptitude 12,565     [ Limit Break ]│  primary action, bottom-right
 y=1140 │ 🏠 Earnings +6.652B/s                │
 y=1190 │ ◀◀  Stella Awaken Aptitude Op Upgrade│  section dock
        └──────────────────────────────────────┘
```

## Chrome pieces

**Rarity badge** — top-left, ~75 px, an ornate glyph not a pill. Observed values
`R` (blue diamond), `SSR+` (gold starburst with a `+`), `LR` (pink/violet). It is
artwork, sized and coloured per tier, not text in a box.

**Class badge** — directly beneath, 60 px circle with the class glyph and the class
*name* in a small caption under it (`Informed`, `Diligent`). This is the only place the
class is spelled out.

**Title / name banner** — centred, a horizontally-stretched hexagon. Title on top in the
larger weight (`Insect Hashira`), given name beneath, smaller and lighter
(`Shinobu Kocho`). Title above name — Everkai has this order right already.

**Paging chevrons** — gold double-chevrons at x = 40 and x = 680, y = 478, i.e. at ~37%
height, clear of both rails. They page through the *filtered, sorted* roster.

**Right rail, upper group** — Hide / Info / Favorite. Diamond-shaped 56 px buttons with
the label underneath in a 13 px caption. Vertical pitch 90 px.

**Right rail, lower group** — Blessing (a feather glyph, labelled), then two 76 px square
equipment tiles: familiar, then artifact. Each tile shows the equipped thing's art with
`Lv.249` on a strip at its foot. An **empty** tile is a large `+` on a brown ground with a
small red dot badge at its top-right corner.

**Left rail** — 130 × 78 pill buttons flush to the left edge, glyph above a caption,
with a counter baked into the glyph where one applies (`10/10` on Family, `1/1` on Group).

**Stat block** — bottom-left, over the art, no panel behind it; each row is a glyph then
a label then a value.

| Row | Formatting |
| --- | --- |
| Power | POW shield glyph, then the number **in full with thousands separators**, large orange serif, then a 26 px `(i)` |
| Level | `Lv.` then the number on a level bar; the bar is **blue and partially filled** below cap, **gold and full** at cap. Awaken stars sit on the bar's right half. |
| Aptitude | 4-point star glyph, `Aptitude 12,565` |
| Earnings | house glyph, `Earnings + 6.652B/s` — abbreviated, with a space after the `+` |

**Primary action** — bottom-right, ~200 × 50. Never more than one.

**Dock** — 6 slots: a back chevron then the five sections. Icons ~62 px with a caption
below. The active section's icon gets a warm glow and its caption brightens. The back
chevron returns to the roster.

## The shell is conditional

This is the most important structural finding, and Everkai does not do it.

| Fellow | Rarity | Dock | Left rail |
| --- | --- | --- | --- |
| Shinobu Kocho | LR | Stella · Awaken · Aptitude · Operation · Upgrade | Family · Resonance · Form Switch · Group |
| Zenitsu Agatsuma | SSR+ | Stella · Awaken · Aptitude · Operation · Upgrade | Group only |
| Arake | R | **Aptitude · Operation · Upgrade** | none |

Sections a fellow cannot have are **removed, not disabled and not shown locked**. The
dock re-centres around whatever remains. Likewise the awaken stars: the R fellow's level
bar has no star cluster at all, where the SSR+ shows five empty stars.

The rule as observed: awakening and Stella appear from SSR+ upward; the Family /
Resonance / Form Switch rail appears only on fellows that actually have those
relationships unlocked. **Confirm the exact rarity thresholds against the config tables
before implementing** — this is a mechanic, not a layout, and the caveat applies.

## Hide mode

Tapping **Hide** removes every piece of chrome including the currency bar, the dock and
the stat block, leaving the art edge to edge. A single diamond button remains at the
top-right, now labelled **Show**. Tapping it restores everything.

This is a full-screen art viewer reached in one tap from the main screen, and it is worth
copying exactly — it is how the game rewards the art it spent money on.

## Info panel

A half-height cream panel, titled **Info**, containing a table:

| | | | |
| --- | --- | --- | --- |
| **Name** | Shinobu Kocho | **Title** | Insect Hashira |
| **Race** | Human | **Occupation** | Demon-Slayer Swordsmen |
| **Bio** | *(spans all remaining columns)* | | |

Label cells are a darker cream than value cells, giving a 2×2 grid plus a full-width bio
row. No headings, no prose framing.

## Panel taxonomy

Everything that opens from this shell is one of three shapes. Use exactly these.

| Shape | Top edge | Used by |
| --- | --- | --- |
| **Half panel** | y ≈ 660–840 (varies with content), bottom flush to the dock | Stella, Aptitude, Operation, Family, Resonance, Blessing, Info |
| **Full panel** | y ≈ 210, bottom flush to the dock | Awaken |
| **Centred dialog** | inset ~24 px all round, floats over a dimmed screen | Power Details, Bond Detail, Limit Break, Select Familiar, Artifact, Stella Attributes, roster Information |

Half and full panels keep the dock live, so you can move between sections without
closing. Centred dialogs dim the background and must be closed.

Panel close button: a red shield-shaped X, ~56 px, **overlapping the panel's top-right
corner**, half outside the panel. Consistent everywhere.

Panels that have sub-tabs put them as **file-folder tabs riding the panel's top edge**,
left-aligned, the active tab raised and lighter (see Aptitude, Resonance, Blessing).
They are not a segmented control and not inside the panel.

## Comparison with Everkai

Everkai (`02_fellow_overview_rissette.png`): a browser-chrome header
`🎭 Fellows ✕`, art in a **letterboxed box** occupying y ≈ 110–810 with visible
background either side, then a titled panel `• Overview •` with its own ✕, then a
footer `Previous · 1 / 6 · Next`. Right rail is Hide / Info / Art / Pause as rounded
rectangles.

| # | Difference | Kind |
| --- | --- | --- |
| C1 | Everkai boxes the art; the original is full-bleed and puts chrome *on* it. Everkai loses roughly 40% of the art area and gains nothing. | **structural** |
| C2 | Everkai navigates sections with a `Previous / 1 of 6 / Next` pager. The original uses a 5-icon dock with the section always visible and reachable in one tap. A pager forces players to remember what page 4 was. | **structural** |
| C3 | Everkai's sections are fixed for every fellow; the original removes sections a fellow cannot use. | **structural** |
| C4 | Everkai has no persistent stat block — Power/Aptitude/Level appear as tiles inside the Overview page only. The original keeps Power, Level, Aptitude and Earnings visible under *every* section. | **structural** |
| C5 | Everkai has no primary-action slot; each page grows its own buttons wherever. The original reserves bottom-right. | **structural** |
| C6 | Everkai's rarity is text (`SR -> SSR+ -> UR` stacked over the class medallion) — three states printed at once. The original shows the current tier as one piece of artwork. | cosmetic |
| C7 | Everkai's panel headers repeat the section name in a `• Name •` bar *and* the page is already selected in the pager. Doubled. | cosmetic |
| C8 | Everkai's `Pause` button (animation control) has no original equivalent; `Art` roughly maps to the original's Hide. Keep Hide's naming and behaviour: one button, toggling to `Show`. | cosmetic |
| C9 | The original's Favorite has no Everkai equivalent, and it feeds the Default sort. | **structural** |

## What Everkai should render

Replace `PanelPages` on the Fellow screen with:

1. **Full-bleed art** behind everything, from under the currency bar to the top of the dock.
2. **A 5-slot section dock** pinned to the bottom, built from the *available* sections for
   that fellow, plus a leading back chevron.
3. **A persistent stat block** bottom-left: Power (full digits + `(i)`), Level bar with
   stars, Aptitude, Earnings.
4. **A reserved primary-action slot** bottom-right.
5. **Left and right rails** of icon buttons, present only when their feature is unlocked.
6. The three panel shapes above, with the shield-X and folder tabs.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Rarity badge art | `fellow.rarity` | yes, as text |
| Class badge + caption | `fellow.type` | yes |
| Title / name | both strings | yes |
| Power (full digits) | `bondedPower(game,id)` | yes |
| Level bar fill | level / cap | yes |
| Awaken stars | star count | **no** — spec 05 |
| Aptitude | total aptitude | yes |
| Earnings | per-fellow earnings/s | yes |
| Favorite | a boolean per fellow | **no** — new save field |
| Which sections exist | rarity → section set | **no** — needs a table-backed rule |
| Familiar / artifact tiles | equipped item + level | yes (`familiar-panel.tsx`, `equipment-shelf.tsx`) |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `Previous · 1 / 6 · Next` footer | the 5-icon dock |
| `• Overview •` panel title bar | nothing — the lit dock icon names the section |
| `Training Rules` link and the `Quick setup` paragraph ("Auto-optimize spends the EXP and materials you hold on Rissette, best Power first. It never spends gold or crystals, and Refund all can always undo it.") | move verbatim into the roster `(i)` Information panel under a `Fellow Level` heading; the screen keeps only the buttons |
| `From level & Aptitude 3,785 · Fixed 0` footnote | the `(i)` beside Power → full breakdown dialog (spec 11) |
| Three separate `Power / Aptitude / Level limit` tiles inside Overview | the persistent stat block, visible under every section |
| `SR -> SSR+ -> UR` stacked text | one rarity badge for the current tier |
