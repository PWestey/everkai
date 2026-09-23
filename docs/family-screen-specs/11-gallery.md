# 11 · Gallery (Date Record)

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/gallery.png`, `img/gallery-locked.png`

Roster footer, middle of the three. Everkai's counterpart is the `Pictures` pager page
(`app/family-gallery-panel.tsx`).

## Layout

A full surface with its own header and its own scrolling grid.

```
 0 ───────────────────────────────────────────────────  game bar
44 │ (i) Date Record                                   │
   │ ┌──────────────────────────┐                      │
   │ │ Collected:  12/139       │                      │  count pill, left
   │ └──────────────────────────┘                      │
   │ ┌───────┐  ┌───────┐  ┌───────┐                   │  3 columns, 208×250
   │ │◣NEW   │  │       │  │       │                   │  red NEW ribbon, top-left
   │ │  CG   │  │  CG   │  │  CG   │                   │  polaroid-framed art
   │ │       │  │       │  │    🎁 │                   │  chest badge, bottom-right
   │ │ Name  │  │ Name  │  │ Name  │                   │  name plate + episode title
   │ │ Title │  │ Title │  │ Title │                   │
   │ └───────┘  └───────┘  └───────┘                   │
   │              … scrolls …                          │
   │ ┌───────┐  ┌───────┐  ┌───────┐                   │
   │ │       │  │       │  │       │                   │
   │ │   🔒  │  │   🔒  │  │   🔒  │                   │  locked: blank + padlock
   │ │       │  │       │  │       │                   │  NO name, NO title
   │ └───────┘  └───────┘  └───────┘                   │
1185├───────────────────────────────────────────────────┤
   │  «                                                │
1280└───────────────────────────────────────────────────┘
```

## The card

A **polaroid**: a white/cream mat with the CG cropped into its upper portion and a caption
block beneath, on a slight card shadow. Caption is two lines — member name, then the
episode/CG title.

Badges:
- **`NEW`** — a red diagonal ribbon clipped to the top-left corner.
- **Treasure chest** — a small gold chest at the bottom-right of the *art*, meaning "there is
  a collection reward here to claim". **It is inside the card's tap target**: tapping the
  chest claims the reward, tapping elsewhere on the art opens the CG. That overlap is a flaw,
  and it caught this capture out (see README). When building, give the chest its own
  separated hit area or move it outside the art.

## Locked entries

A blank polaroid — the mat, no art, no caption, a grey padlock centred in the art area. **No
name, no title, no hint.** Convention 9 taken to its limit: an empty slot is drawn, not
described, and it does not even say what would fill it.

## The viewer

Tapping a collected card opens the CG **full-bleed with no chrome at all** — no title, no
close button, no frame. Any tap exits. (Not committed as a reference image.)

## Collection rewards

`Collected: 12/139` is the only counter. Chest badges appear on individual cards, so the
reward ladder is per-entry rather than per-milestone, or both. The reward popup is a standard
`CG Collection Rewards` item grid with a `Tap to continue`.

## Compared with Everkai

`app/family-gallery-panel.tsx` is 9 lines — the thinnest panel in the Family set.

| Difference | Kind |
| --- | --- |
| The original is a roster-level surface with its own header and count; Everkai's is a per-member pager page | **structural** — the original's gallery spans the whole family (139 entries), Everkai's is scoped to the selected member |
| Polaroid framing with a two-line caption; Everkai renders plain thumbnails | **cosmetic** |
| `NEW` ribbon and chest badge; Everkai has neither | **structural** for the chest (a reward ladder), cosmetic for `NEW` |
| Locked entries are blank polaroids with a padlock; Everkai lists them by name | **cosmetic**, but it is convention 9 |
| `Collected: 12/139` pill; Everkai has no count | **cosmetic** |
| Full-bleed chrome-free viewer | **cosmetic** |

## What Everkai should render

```
(i) Date Record
 Collected: 12/139

 [◣NEW  polaroid ]  [ polaroid    ]  [ polaroid  🎁 ]
 [ Bullety        ]  [ Clarice     ]  [ Merry        ]
 [ Sweet Morning  ]  [ White Trap  ]  [ …            ]

 [   🔒 blank    ]  [   🔒 blank  ]  [   🔒 blank   ]
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| CG list, per member, with titles | gallery data | **yes** |
| Unlocked flag | save | **yes** |
| Total count across the family | sum | **derivable** |
| `NEW` flag | seen/unseen per entry | **no** |
| Collection reward per entry | — | **no** |
| Full-bleed viewer | — | **partially** |

## Prose to delete, and what replaces it

Everkai's gallery is already close to wordless. The changes are additive rather than
subtractive:

| Do not write | Write instead |
| --- | --- |
| `Locked — unlock by dating Bullety` under a greyed thumbnail | a blank polaroid with a padlock, no caption |
| `You have unlocked 12 of this member's pictures.` | `Collected: 12/139` on a pill, at the roster level |
| A `rules-note` on how CGs unlock | the header `(i)` |
