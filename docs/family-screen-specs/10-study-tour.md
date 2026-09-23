# 10 · Study Tour

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/study-tour.png`, `img/study-tour-deploy.png`

Roster footer, left-most of the three. **Everkai has no equivalent of this screen.**

## What it is

An idle-collection loop on top of the Family roster: assign members to a slot, and each one
brings back a `Souvenir` per day. It is the Family's counterpart to Fellow appointment — you
park a member somewhere and she earns while you are away.

Serves no numbered manifest heading; the `(i)` is its own.

## Layout

A full surface, not a sheet — it replaces the roster.

```
 0 ───────────────────────────────────────────────────  game bar
44 │ (i) Study Tour                                    │
   │▒▒▒▒▒▒▒▒▒▒▒▒ banner art (wagon scene) ▒▒▒▒▒▒▒▒▒▒▒▒│  y 92 – 280
   │┌─────────────────────────────────────────────────┐│
   ││ Send Family on a Study Tour. They'll bring a    ││  one sentence, over a scrim
   ││ souvenir every day.                             ││
   │└─────────────────────────────────────────────────┘│
   │ ┌───────────────────────────────────────┬───────┐ │
   │ │                                       │👥 0/1 │ │  slot counter, top-right
   │ │  ┌────────┐  ┌────────┐               └───────┘ │  slot tiles 190×260
   │ │  │        │  │        │                         │
   │ │  │   ＋   │  │   🔒   │                         │  empty / locked
   │ │  │        │  │        │                         │
   │ │  └────────┘  └────────┘                         │
   │ │                                                 │  large empty area below
   │ └─────────────────────────────────────────────────┘ │
   │              Souvenir 🎁 0                          │
   │            ┌──────────────┐                         │
   │            │  Claim All   │                         │  GREY — inert, not disabled-green
   │            └──────────────┘                         │
1185├────────────────────────────────────────────────────┤
   │  «                                                 │
1280└────────────────────────────────────────────────────┘
```

## Elements

**Banner** — a wide illustration of the departure scene with a one-sentence caption on a
scrim across its lower edge. The same "art is the card" treatment as Travel (spec 08).

**Slot counter** — `👥 0/1` on a small pill at the top-right **of the slot area**, not of the
screen. Deployed / capacity.

**Slot tiles** — tall rounded-arch plates in muted green, 190 × 260. Two states drawn:

| State | Content |
| --- | --- |
| Empty, available | a large gold `＋` centred |
| Locked | a grey padlock centred |

No text on either. No "tap to deploy", no "unlocks at…". The gate for the locked slot is not
shown on the tile — which is a *departure* from convention 8 and probably a weakness; when
building, prefer the Fathom-slot treatment (a padlock badge plus the gate as a pill).

**Footer** — `Souvenir 🎁 0` centred, then a **grey** `Claim All`. Note the colour: an
inert primary here is grey, not a greyed green. Convention 6's third state.

## The deploy picker

Tapping `＋` opens a parchment dialog, `Deploy Family`:

```
 ┌ Deploy Family                                     ✕ ┐
 │ ┌──────┐ ┌──────┐ ┌──────┐                          │  3-wide grid, same card
 │ │ art  │ │      │ │      │                          │  art as the roster but
 │ │♥110  │ │♥110  │ │♥110  │                          │  smaller (200×270)
 │ │ 💧130│ │ 💧130│ │ 💧130│                          │
 │ │[name]│ │[name]│ │[name]│                          │
 │ └──────┘ └──────┘ └──────┘                          │
 │              … scrolls …                             │
 │            ┌──────────────────┐                      │
 │            │      Deploy      │                      │  green, bottom-centre
 │            └──────────────────┘                      │
 └──────────────────────────────────────────────────────┘
```

Same card grammar as the roster: rarity-framed art, `♥`/`💧` over a scrim, a coloured
nameplate. **Sorted ascending by Intimacy** — weakest first, which is the opposite of the
roster and is a deliberate nudge: send the members you are not using.

One green `Deploy` at the bottom centre. (Not pressed — deploying removes a member from
roaming, a persistent save change.)

## Data behind it

`WifeTravel.json` is **20 rows**, `{_id, travelCount, costGold}` — a cost ladder indexed by
how many travels you have run. That is small, and it is the only table that obviously belongs
to this screen. Souvenir contents, slot count, slot unlock conditions and the daily cadence
are **not** in it; find them before building (rule 4: read a real row first).

## Compared with Everkai

Nothing to compare. Everkai has `app/family-trip-panel.tsx`, but that is the paid **Travel**
journeys (spec 08) — a one-shot that produces a child — not a parked idle earner.

## What Everkai should render, if it builds this

```
(i) Study Tour
▒▒▒ banner art ▒▒▒
 Send Family on a Study Tour. They'll bring a souvenir every day.

                                                    👥 0/1
   ┌───────┐ ┌───────┐
   │   ＋  │ │  🔒   │        ← locked tile should carry its gate as a pill
   │       │ │ Lv.? │
   └───────┘ └───────┘

                Souvenir 🎁 0
                [ Claim All ]      ← grey when zero
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Slot count and unlock gates | not in `WifeTravel` | **no** — must be found |
| Deployed members | a new per-account save field | **no** |
| Daily souvenir cadence and contents | — | **no** |
| Souvenir currency | — | **no** |
| Deploy picker | roster card component sorted ascending by intimacy | **yes** (`RosterLanding` can sort) |

## Recommendation

**Defer, with a stated reason** (rule 7). This is a second idle-collection loop with a new
save subtree, a new currency and at least three numbers that are not in the recovered data.
Everkai's permanent-systems priority (`docs/everkai-permanent-parity-gaps` equivalent in
`docs/permanent-systems.md`) puts buildings, stages and minigames ahead of it, and every other
section in this spec set is presentation over systems that already ship. Build the other
twelve first; bring this to the owner as a single question — *"the original parks family
members on a Study Tour for a daily souvenir; do you want it?"* — rather than inventing its
economy.
