# 13 · Not-yet-joined member ("Preview")

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/locked-preview.png`, `img/locked-source.png`,
`img/locked-blessed-fellows.png`, `img/locked-relationship-effect.png`
(`img/member-shell-r.png` for contrast).

## Layout

The header reads **`Preview`**, not `Family Training`. The art is **fully desaturated to
greyscale** — the strongest single signal on the screen.

```
 0 ───────────────────────────────────────────────────  game bar
44 │ (i) Preview                                       │
   │ ╔══╗      ╭─────────────────╮          ╭────────╮ │
   │ ║SSR║      │   (title)       │          │ Source │ │  Source, top-RIGHT
   │ ╚══╝      │   (name)        │          ╰────────╯ │  where Hide/Info would be
   │           ╰─────────────────╯                     │
   │ ╭─────╮                                           │
   │ │Bonds│              greyscale art                │  left rail, single item
   │ ╰─────╯                                           │
   │              (♥)300          (💧)300              │  two medallions, centred
   │            Intimacy        Blessing Power         │  the STARTING values
   │ ┌──────┬──────────┐                               │
   │ │ Info │ Blessing │                               │  two folder tabs
   │ ├──────┴──────────┴─────────────────────────────┐ │
   │ │  Name  │ …        │ Title │ …                 │ │
   │ │  Race  │ …                                     │ │
   │ │  Bio   │ …                                     │ │
   │ └───────────────────────────────────────────────┘ │
1280└───────────────────────────────────────────────────┘
```

**There is no dock.** No Stella, no Bonds tab, no Skills, no Blessing tab, no Interact. The
whole screen is two folder tabs plus one left-rail button.

## `Source`

Top-right, where `Hide` sits on a joined member. Tapping it opens a dark bar:

> **`How to Invite: Daily Wish Bundle`**

One line. `How to Invite:` in brown, the source in gold. Same pattern as the Fellow set's
locked `Source` tooltip. The source string is content — `Item.source` on the corresponding
item — not invented text.

## The two medallions

`♥ 300` and `💧 300`, centred, with their labels beneath. These are the member's **starting**
Intimacy and Blessing Power — the preview's promise. On a joined member the same two
medallions sit bottom-left; here they are the screen's centrepiece, because they are the only
numbers a preview can honestly show.

## Tab: `Info`

The same bordered table as the joined member's `Info` sheet (spec 02) — `Name`/`Title` on one
row, `Race`, `Bio` — but rendered **inline on the screen** rather than behind a rail button.
Scrolls.

## Tab: `Blessing`

Titled `Blessed Fellows`. A horizontal row of **circular Fellow portraits** — four on the
member captured — with no `POW` badges (nothing is trained yet).

This is genuinely useful and Everkai has no equivalent: **before you recruit a Family member
you can see which Fellows she will bless.** Given that three of the five Family sections pay
the blessed Fellows (spec 07), this is the single most decision-relevant fact about an
unjoined member, and the original puts it one tap away.

## Left rail: `Bonds`

A single diamond button at the left edge. Opens a panel titled **`Relationship Effect`**: the
full rung ladder as rows, each `RungName` + its pupil-earnings percentage.

Rungs observed, with their values:

```
Acquainted      Pupil earnings +10%
Affectionate    Pupil earnings +15%
Affectionate★★  Pupil earnings +20%
Loving★         Pupil earnings +25%
Forever         Pupil earnings +30%
Forever★★       Pupil earnings +35%
```

Six rows shown for a twelve-rung ladder — the panel lists only the rungs **at which the value
changes**, not every rung. (The `Family List` shows rungs the ladder actually has:
`Loving★★`, `Loving★`, `Loving`, `Affectionate★★`, …) When building, do not assume the six
listed rungs are the whole ladder; take the ladder from `WifeIntimacyDegree.json` and the
step points from wherever the pupil percentages live.

The values themselves are replacement-server numbers and must not be imported.

## Compared with Everkai

Everkai renders an unjoined member through the same `CharacterScreen` and the same eleven
pager pages, with per-panel empty states:

- `Welcome family members to begin gifts and dates.`
- `Invite {name} at the Recruit counter in Drakenberg.`
- `Welcome this family member to open her Latency.`
- `Welcome this family member to practise Fathoms.`
- `Welcome this family member to train blessings.`
- `Welcome this family member to create a bond.`

| Difference | Kind |
| --- | --- |
| Six near-identical "welcome this member to…" sentences across six panels, against **one screen with no dock** | **structural** — the biggest single prose deletion available in the Family surface |
| Everkai's header is the member's name; the original's is `Preview` | cosmetic |
| Art is full colour in Everkai; greyscale in the original | **cosmetic**, but it does the work of a sentence |
| `Invite {name} at the Recruit counter in Drakenberg.` as body text; the original is a `Source` button with a one-line tooltip | **cosmetic** |
| No blessed-Fellow preview in Everkai | **structural** |
| No relationship-effect ladder in Everkai | **structural** |
| Everkai shows starting stats nowhere; the original centres them | **cosmetic** |

## What Everkai should render

```
(i) Preview

[SSR]        ┌ (title) ┐                          [ Source ]
             │ (name)  │
             └─────────┘
[Bonds]
                   ▒▒ greyscale art ▒▒

              (♥) 300          (💧) 300
              Intimacy      Blessing Power

 ┌ Info ┐┌ Blessing ┐
─┴──────┴┴──────────┴──────────────────────────────
  Name  │ …          │ Title │ …
  Race  │ …
  Bio   │ …
```

`Source` → `How to Invite: {source string}`
`Bonds` → `Relationship Effect`: the rung ladder with its pupil-earnings values
`Blessing` tab → `Blessed Fellows`: circular portraits, no badges

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Greyscale art | a CSS filter on the existing art | **yes** |
| Starting Intimacy / Blessing Power | per-member starting values | **partially** — Everkai has starting stats as local balance |
| `Source` string | how this member is obtained | **partially** — Everkai writes `at the Recruit counter in Drakenberg`, which is Everkai's own faucet, not the original's. Keep Everkai's own answer; copy the *form* (a one-line tooltip behind a `Source` button). |
| Blessed Fellow list | `blessingRecipients` works before joining | **yes** |
| Rung ladder + pupil-earnings values | see spec 04 | **no** |
| Info table | catalog | **mostly** (no `Race`) |

## Prose to delete, and what replaces it

| Delete | Replace with |
| --- | --- |
| All six `Welcome this family member to…` empty states | one `Preview` screen with no dock. If a member is not joined, the dock does not render — the same rule that hides `Stella` below UR (spec 02). |
| `Invite {name} at the Recruit counter in Drakenberg.` | a `Source` button whose tooltip reads `How to Invite: {source}` |
| `Not joined` on the roster card | a desaturated card with no stat row, under the `◇ Not Yet Joined ◇` divider (spec 01) |
| `No original pairing for this character yet.` | an empty circular slot in `Blessed Fellows` |
