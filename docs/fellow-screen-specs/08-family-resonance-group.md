# 08 · Left rail — Family, Resonance, Form Switch, Group

> **Source caveat.** Captured from a replacement server's reimplementation. Screens,
> flows, controls, wording and layout are good evidence. Numbers, costs, drop rates and
> schedules are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/family.png`, `img/resonance-effect.png`, `img/resonance-skill.png`,
`img/form-switch.png`, `img/bond-detail.png`

The left rail is **relationship**, as opposed to the right rail's **equipment** and the
dock's **progression**. It appears only on fellows that have these relationships
unlocked: the LR fellow showed all four pills, the SSR+ showed `Group` only, the R fellow
showed none.

## Family

Half panel, `Family` + `(i)` in the header.

```
 ┌        Family (i)                    ✕ ┐
 │  ┌──┐        ╭──────╮         ┌──┐     │
 │  │👤│ ∿∿∿∿∿ │ 10/10│ ∿∿∿∿∿  │🎭│     │  player ← heartbeat → fellow
 │  └──┘        ╰──────╯         └──┘     │
 │  ┌ Shinobu Kocho Aptitude │  +200  ┐   │
 │  └───────────────────────────────────┘ │
 │   Shinobu Kocho has activated          │  green
 │        Family Member status            │
 │          [    Go    ]                  │  green
 └────────────────────────────────────────┘
```

- The bond is drawn as **two heart-framed portraits joined by a heartbeat line**, with a
  large gold heart between them carrying `10/10`. Pink gradient ground.
- One stat row: a label cell (`Shinobu Kocho Aptitude`, darker) and a value cell (`+200`).
  Same two-tone cell treatment as the Info table.
- One status line in green, stating the achieved state.
- One green `Go` button — a **navigation** action, sending the player to the Family
  screen, not an upgrade.

The entire panel is a *summary with a jump*. The actual family system lives elsewhere.
That is the pattern: cross-system relationships get a compact read-only card plus a `Go`.

## Resonance

Half panel with two folder tabs.

### Tab `Resonance Effect`

```
  Select Resonant Fellows to increase their Power (i)
  ┌──────────┐   🤝   ┌──────────┐
  │ Lv.600   │        │ Lv.597 ⇄│  ← swap button, top-right of the partner card
  │ [art]    │        │ [art]    │
  │ ★★★      │        │ ★★★      │
  │Shinobu K.│        │ Rissette │
  └──────────┘        └──────────┘
   ✦ +56               POW +214.3M
```

- Two **full fellow cards** side by side (level banner, art, stars, name plate — the same
  card component as the roster, at ~185 × 265), joined by a handshake/heart glyph.
- Each card has its gain on a pill **beneath** it, glyph + value in green. The two sides
  gain *different* stats — the subject gains Aptitude, the partner gains Power.
- Both cards glow gold when the pairing is active.
- The partner card carries a small swap button at its top-right corner.
- The one instruction line sits at the top with an `(i)` after it. It is the shortest
  possible statement of purpose: `Select Resonant Fellows to increase their Power`.

### Tab `Resonance Skill`

```
        ◇ Resonance Skills ◇
     ⬤      ⬤      🔒Lv.100
  ┌─────────────────────────────────────┐
  │ Resonance level 65/100              │  gold
  │ Shinobu and bonded Fellows'         │
  │ Aptitude +650                       │
  │ (Next Level +660)          [Level Up]│  green button, cost 0/10 beneath
  └─────────────────────────────────────┘
```

- Three ~112 px medallions. Unlocked ones are coloured (purple, gold); the locked one is
  grey with a padlock **and the gate printed on its face**: `Lv.100`. The gate is on the
  artwork, not in a sentence.
- Detail block in the house style: `Resonance level 65/100`, effect, `(Next Level +660)`.
- Button reads `Level Up` (not `Upgrade`) with `0/10` beneath, `0` in red.

Note the verb differences across the surface: `Upgrade` (Stella, Aptitude, Operation),
`Level Up` (Resonance Skill), `Limit Break` (cap), `Form Switch`, `Equip`/`Swap`,
`Change`/`Enhance`. The original uses a distinct verb per system rather than one generic
"Improve". Everkai should do the same — the verb is free information.

## Form Switch

**A full screen, not a panel.** Title `Form Switch` at top-left where `Cultivate` was.
The currency bar changes too (it shows Earnings / gold / crystals with a `+` button).

```
 Form Switch
 ┌────────────────────────────────────────┐
 │                                        │
 │           full-bleed art               │
 │        (the selected form)             │
 │                                        │
 │ ┌───┐┌───┐╔═══╗                        │
 │ │SSR││ UR│║ LR║      [  Form Switch  ] │  filmstrip bottom-left, button bottom-right
 │ └───┘└───┘╚═══╝                        │
 │ ◀◀                                     │
 └────────────────────────────────────────┘
```

- A filmstrip of ~92 px thumbnails, bottom-left, each stamped with the **rarity of that
  form** (`SSR`, `UR`, `LR`) across its lower edge. The active form is ringed gold with a
  caret above it.
- The big art updates to the highlighted thumbnail.
- The `Form Switch` button is **grey and inert** when the highlighted form is already
  active. No "this form is already selected" text.
- Back chevron bottom-left returns to Cultivate.

This is Everkai's `Wardrobe` page, and the original gives it the whole screen because the
point is to look at the art. Everkai's version is a panel occupying the bottom third
under a letterboxed image.

## Group

Tapping `Group 1/1` opens the **Bond Detail** dialog — the same dialog reachable from the
Power `(i)` → `Bond Detail` tab. See spec 11 for its full layout. Two entry points, one
screen; do the same.

## Comparison with Everkai

Everkai has `bond-panel.tsx`, `family-panel.tsx`, and a `Wardrobe` page in the fellow
pager.

| # | Difference | Kind |
| --- | --- | --- |
| L1 | Everkai has no left rail; Family/Bonds/Wardrobe are pages in the same 6-page pager as Level and Skills, so relationship and progression are undifferentiated. The original separates them onto rails vs dock. | **structural** |
| L2 | Everkai's Wardrobe is a panel; the original's Form Switch is a full-screen art viewer with a rarity-stamped filmstrip. | **structural** |
| L3 | Everkai has no Resonance system — no pairing of two fellows for mutual stat gain, and no resonance skill ladder. | **structural** |
| L4 | Everkai's bond panel carries a 60-word `About these rules` paragraph ("Pairings come from The Ascended community wiki snapshot of September 7, 2026…"). The original's equivalent screen has one instruction line and an `(i)`. | **structural** |
| L5 | Everkai's family integration is a full duplicate family UI inside the fellow screen; the original shows a summary card and a `Go`. | **structural** |
| L6 | Everkai uses one verb (`Train`, `Improve`) across systems; the original varies the verb per system. | cosmetic |

## What Everkai should render

**Left rail** of up to four pills, each present only if unlocked, each 130 × 78 with a
glyph, a caption and an inline counter where one applies.

**Family** → summary card: paired portraits + level, one stat row, one green status line,
one green `Go`. Delete the embedded family UI from the Fellow screen.

**Resonance** (new system) → two tabs as above.

**Form Switch** → promote Wardrobe to a full screen: full-bleed art, rarity-stamped
filmstrip bottom-left, inert-when-current button bottom-right, back chevron.

**Group** → the Bond Detail dialog from spec 11.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Family bond level | intimacy level / cap | yes (`family-panel.tsx`) |
| Family aptitude contribution | `+200` | yes — it is in the aptitude breakdown as `Family+365` |
| Resonance pairing | fellow ↔ fellow, plus each side's gain | **no** |
| Resonance skill ladder | level/cap, effect, gate levels | **no** |
| Form list per fellow | forms with their own rarity | yes — Everkai's wardrobe has costumes |
| Group membership | the fellow's bond group | yes (`bond-panel.tsx`) |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| `About these rules` on the bond panel (the wiki-snapshot paragraph) | the `(i)` beside the one instruction line |
| Everkai's in-fellow family detail (intimacy, blessing power, points, relationship tier, family skill, all with explanatory sentences) | the Family summary card + `Go` |
| `Blessing Power increases points earned on dates. Intimacy increases pupil graduation earnings.` | these belong on the Family screen, behind its own `(i)` — not on the Fellow screen at all |
| A `Wardrobe` panel heading and any "select a costume" copy | the filmstrip; the selected thumbnail is the statement |
| `Current tier cap reached` / `Fully upgraded` button labels | an inert grey button, or a distinct word (`Activated`) |
