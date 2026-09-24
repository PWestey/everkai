# 08 · Familiar Dispatch

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/dispatch-result-modal.png`, `img/dispatch-main.png`,
`img/dispatch-expected-info.png`, `img/dispatch-area-select.png`,
`img/dispatch-areas-scrolled.png`, `img/dispatch-familiar-picker.png`, `img/hub.png`

Reached from the **Familiar hub scene** (`img/hub.png`): a labelled building at the top of the
scene, carrying a red `!` badge. It is not in the hub's own `(i)` manifest, which lists only
Contracts, Development and Tower — Dispatch was bolted on after the system shipped
(CAPTURE-INDEX, "The original's own manifest").

Tables: **`PetDispatch.json`** (9 rows), **`split_reward/reward_petdispatch.json`** (39 rows),
and four `System.json` keys (`PetDispatch_Crit`, `PetDispatch_Coefficient`,
`PetDispatch_QuickBuy`, `PetDispatch_QuickBuy_MaxTimes`).
Everkai: `lib/familiar-dispatch.mjs`, `app/familiar-dispatch-panel.tsx`.

Vocabulary: the original calls the team's summed stat **Attribute**, never "Power"
(`lang.json Pet_Dispatch_Text15`, `UI_Pet_Component_Tower_PetBattleSceneComp_n58`
"Current Attribute", `PetFettersTips4` "Attribute: +{val}%"). Everkai says "Team Power"
everywhere. Pick one and use it on both this screen and the Tower's.

---

## 1 · The state machine — the result modal fires *on entry*

This is the part worth specifying before the layout, because the screen you first see is not
the screen. Entering Dispatch with a finished run **auto-reports it**: the reward is already
granted, the run is already cleared, and a `Result` ribbon modal is drawn over a dispatch
screen that has already returned to its idle state. The capture agent did not trigger this and
could not photograph the screen behind it (CAPTURE-INDEX, "Things that happened and should be
on the record"). `OK` dismissed an already-granted reward.

```
                    ┌──────────────────────────────────────┐
   enter Dispatch → │ run == null ?                        │
                    └───┬──────────────────────────┬───────┘
                        │ no run                   │ run exists
                        ▼                          ▼
                   ┌─────────┐            ┌──────────────────┐
                   │  IDLE   │            │ now ≥ since+Time?│
                   └────┬────┘            └──┬────────────┬──┘
           Confirm ─────┘                    │ no         │ yes
                        ▼                    ▼            ▼
                   ┌─────────┐        ┌────────────┐  ┌──────────────────┐
                   │  AWAY   │───────▶│ IN PROGRESS│  │ GRANT, CLEAR RUN,│
                   └─────────┘        │ Time left: │  │ then RESULT modal│
                     Cancel│          │  {time}    │  │  over IDLE       │
                           ▼          │ Complete   │  └────────┬─────────┘
                    ┌──────────────┐  │ Now        │           │ OK
                    │ confirm text │  └────────────┘           ▼
                    │ Pet_Dispatch │                     ┌─────────┐
                    │ _Text14      │────────────────────▶│  IDLE   │
                    └──────────────┘                     └─────────┘
```

Four states, and the original's own strings name every one of them
(`lang.json`, English column):

| State | Strings the original uses |
| --- | --- |
| **LOCKED** (fewer than 5 contracted) | `Pet_Dispatch_Text9` — *"Contract 5 or more Familiars to unlock"* |
| **IDLE** | `ScenePetDispatch_btnDispatch` = **`Confirm`**; `Pet_Dispatch_Text2` *"Dispatch Duration: {time}"*; `Pet_Dispatch_Text1` *"Great Success: {num}%"*; under-filled team → `Pet_Dispatch_Text8` *"Not enough familiars. Assign more to continue."* |
| **AWAY / IN PROGRESS** | `LabelTextDoingAni_title` = **`In Progress`**; `Pet_Dispatch_Text3` *"Time left: {time}"*; `btnSkip` = **`Complete Now`**; `btnCancelDispatch` = **`Cancel`**; cancel confirm `Pet_Dispatch_Text14` *"Canceling the dispatch won't grant you any reward. Confirm?"* |
| **RESULT** | `PanelPetDispatchResult_twbg` = **`Result`**; title is one of two, and both carry their colour in the string: `Success` `[color=#24598B,#4AAFB2]` and `Great Success` `[color=#B4320F,#CA6420]` |

**The two result titles are the same modal with one word and one colour changed.** Blue for
`Success`, red-orange for `Great Success`. That is measured from `lang.json`, not read off the
screenshot, and it is the cleanest colour-semantics rule on this surface: the outcome *is* the
colour of one word.

### The result modal

`img/dispatch-result-modal.png`. A full-screen scrim, a red ribbon banner reading `Result`
overhanging the top of a parchment sheet, the outcome word centred beneath it in its own
colour, then the same `Basic` divider and item tray the screen behind uses, then one green
`OK`.

```
        ╭───────────╮
   ╾────┤  Result   ├────╼        red ribbon, overhangs the sheet's top edge
        ╰───────────╯
   ┌────────────────────────────────────────┐
   │              Success                   │  blue  #24598B→#4AAFB2
   │        (or Great Success)              │  red   #B4320F→#CA6420
   │ ──────────── Basic ────────────        │
   │  ┌──────┐                              │  same item tile as the screen behind
   │  │ item │                              │
   │  └──────┘                              │
   │            ┌────────┐                  │
   │            │   OK   │                  │  green
   │            └────────┘                  │
   └────────────────────────────────────────┘
```

On a `Great Success` the modal gains the `Extra` block as well — the same two-row shape the
idle screen previews. Not captured (the observed run rolled `Success`).

**Everkai has no equivalent of any of this.** `dispatchCollect` is a button the player presses,
and the outcome arrives as a one-line toast string built in `familiar-dispatch.mjs:110`:
`` `${great?'Great Success! ':''}Dispatch returned with …` ``. See §10, D-DISPATCH-1.

---

## 2 · The main screen

`img/dispatch-main.png`. Co-ordinates in the client's own 720 × 1280.

```
  0 ─────────────────────────────────────────────────────  game bar (Earnings / gold / crystals / +)
 75 │ (i) Familiar Dispatch                               │  header over the art, no plate
    │▒▒▒▒▒▒▒▒▒ area banner art (PetDispatch.Bg) ▒▒▒▒▒▒▒▒▒▒│  y 90 – 380, full bleed
    │            ╭──────────────────────╮                 │
320 │            │ ◈ Endless Desert 3 ◈ │                 │  area ribbon, centred on the art
    │            ╰──────────────────────╯                 │
384 ├─────────────────────────────────────────────────────┤  parchment sheet starts
448 │            ──◇─  Basic  ─◇──                        │  section divider
    │ ┌──────┐                                            │
480 │ │ item │                                            │  item tray, left-aligned, one row
576 │ └──────┘                                            │
619 │            ──◇─  Extra  ─◇──                        │
659 │      Great Success Dispatch grants extra rewards:    │  Pet_Dispatch_Text12, bold, centred
    │ ┌──────┐┌──────┐                                    │
693 │ │ item ││ item │                                    │  second tray
773 │ └──────┘└──────┘                                    │
827 │        ──◇─ Select your familiars ─◇──              │  divider = the picker's own title
    │ ┌─────────────────────────────────────────────────┐ │
853 │ │ (i) Expected Results  Great Success: 0.00%      │ │  tinted strip; % in RED
891 │ └─────────────────────────────────────────────────┘ │
    │   ( ◯ )  ( ◯ )  ( ◯ )  ( ◯ )  ( ◯ )                 │  5 CIRCULAR portraits, d ≈ 90
997 │                                                     │
1045│           Dispatch Duration: 20 hr(s)               │  Pet_Dispatch_Text2, brown, centred
    │          ┌────────────────────┐        ╔════════╗   │
1077│          │     Confirm     •  │        ║  map   ║   │  green + red dot badge
1141│          └────────────────────┘        ║  Ruin  ║   │  art tile, bottom-right
    │                                        ╚════════╝   │
1195├─────────────────────────────────────────────────────┤
    │  «                                                  │
1280└─────────────────────────────────────────────────────┘
```

### Element table

| # | Element | Drawn as | Notes |
| --- | --- | --- | --- |
| 1 | Header `(i)` + `Familiar Dispatch` | small `(i)` square + title, directly on the banner art, no plate behind it | `lang.json PetDispatchName` |
| 2 | Area banner | the selected area's `PetDispatch.Bg` illustration, full-bleed, ~23 % of the screen | the art **is** the area label's context |
| 3 | Area ribbon | centred gold-bordered plaque, `◈ name ◈` | a *label*, not a button — the switcher is the `Ruin` tile |
| 4 | `Basic` block | `──◇─ Basic ─◇──` divider, then a left-aligned item tray | `CompPetDispatchListMapItem_textHelp` = `Basic` |
| 5 | `Extra` block | same divider, then one bold sentence, then a wider tray | `Pet_Dispatch_Text12` |
| 6 | Item tile | dark inset square, art, count in the bottom-right corner (`9K`, `50`) | one component, reused in the Areas list, the Result modal and the Tower's reward ladder |
| 7 | `Select your familiars` divider | text inside the divider rule | doubles as the picker modal's title (`PanelPetDispatchSelect_bg`) |
| 8 | Expected Results strip | a tinted full-width bar: `(i)` glyph, `Expected Results` in brown, then `Great Success: n%` in **red** | `PanelPetDispatchSelect_textHelp` + `Pet_Dispatch_Text1` |
| 9 | Team slots | **five circles**, not cards — portrait only, no name, no level, no Attribute | the roster/picker uses rectangular cards; the committed team uses circles. Deliberate: the slot is a *seat*, the card is a *choice* |
| 10 | `Dispatch Duration: 20 hr(s)` | one brown line, centred, above the button | `Pet_Dispatch_Text2`; the `20` is `PetDispatch.Time` (§7) |
| 11 | `Confirm` | green primary with a **red dot badge** in its top-right | the badge is "you can act here", not an error |
| 12 | `Ruin` | a rolled-map art tile, bottom-right, label under the art | `ScenePetDispatch_btnMap` = `Ruin` — the area switcher |

**Note what is absent.** No team Attribute total is printed on this screen. No Power
requirement is printed. No "unlocks at floor" line. No rules disclosure. The whole screen is
two reward trays, five circles, one duration line and one button.

---

## 3 · The `(i)` — Expected Results

`img/dispatch-expected-info.png`. Tapping the `(i)` on the Expected Results strip opens a
dark tooltip anchored above it, one sentence:

> *"Higher Attribute of Familiar team leads to higher chance to achieve great success."*

That is `lang.json Pet_Dispatch_Text15`, verbatim, and it is the **entire** explanation the
original offers for how Great Success works. One sentence behind an `(i)`, for a mechanic
Everkai currently spends 130 words on (§13).

The tutorial string set says the same thing twice more, which is worth knowing because it
fixes the vocabulary: `PetDispatchUnlockGuideTips3` *"Every dispatch grants basic rewards, and
you have a chance to obtain Great Success rewards."*, `PetDispatchUnlockGuideTips4` *"Check the
Great Success rate. The higher the team's attribute, the greater the chance of a Great
Success."*

---

## 4 · `Ruin` → the Areas list

`img/dispatch-area-select.png` (top), `img/dispatch-areas-scrolled.png` (bottom).

A parchment dialog titled **`Areas`** (`PanelPetDispatchMap_bg`), a vertical list of nine cards,
one green `Save` at the foot.

```
 ┌ ✕ ────────────────── Areas ──────────────────────── ┐
 │ ┌─────────────────────────────────────────────────┐ │
 │ │▒▒▒▒▒▒▒▒▒ area art ▒▒▒ ╭─────────────╮ ▒▒▒▒▒▒▒▒▒▒│ │  ribbon centred ON the art
 │ │                      │◈ Verdant F.1│           │ │
 │ │ Basic        Extra   ╰─────────────╯           │ │  two labels over the art's lower edge
 │ ├─────────────────────┬───────────────────────────┤ │
 │ │ ┌────┐              │ ┌────┐                    │ │  a vertical rule splits the tray
 │ │ │ 1K │              │ │200 │                    │ │
 │ │ └────┘              │ └────┘                    │ │
 │ └─────────────────────┴───────────────────────────┘ │
 │   … eight more, scrolling …                         │
 │ ╭──────────╮                                        │
 │ │Current   │◈ Endless Desert 3 ◈                    │  RED ribbon, top-LEFT, overhanging
 │ │Area      │  … card drawn with a GOLD border …     │  the card's own frame
 │ ╰──────────╯                                        │
 │                ┌──────────────┐                     │
 │                │     Save     │                     │  green, bottom-centre
 │                └──────────────┘                     │
 └─────────────────────────────────────────────────────┘
```

| Element | Drawn as |
| --- | --- |
| Area card | full-width art plate ≈ 620 × 150 with the name ribbon centred on it, then a reward tray beneath split by a vertical rule into `Basic` and `Extra` |
| `Basic` / `Extra` labels | small brown captions sitting **on the art's lower edge**, above the tray they label |
| Reward tiles | the same item tile as the main screen, counts abbreviated (`1K`, `1.25K`, `1.75K`, `50`) |
| **`Current Area` ribbon** | a red banner clipped to the card's **top-left corner**, overhanging the frame, plus a gold border on the whole card (`CompPetDispatchListMapItem_text` = `Current Area`) |
| Locked area | **not captured** — all nine were open on this save. `Pet_Dispatch_Text7` gives the wording: *"Unlocks at floor {num} in Familiar Tower"* |
| `Save` | one green button, bottom-centre. Note: the original's own string set carries `Pet_Dispatch_Text13` *"Switch to {name}"*, so the confirm wording in the shipped client may differ from the `Save` this server renders. Treat `Save` as the replacement server's word, not the original's |

Convention 15 holds again, from the other direction: the selected area is the same card with
one ribbon and one border added. Nothing is hidden and nothing is explained.

---

## 5 · The familiar picker

`img/dispatch-familiar-picker.png`. Tapping any of the five circles opens a parchment modal
titled **`Select your familiars`**.

```
 ┌ ✕ ──────── Select your familiars ──────────────────┐
 │ ┌─────────────────────────────────────────────────┐ │
 │ │ (i) Expected Results  Great Success: 0.00%      │ │  the SAME strip as the screen behind
 │ │  ( ◯ ) ( ◯ ) ( ◯ ) ( ◯ ) ( ◯ )                  │ │  the SAME five circles
 │ └─────────────────────────────────────────────────┘ │  live: it updates as you pick
 │ ┌───────┐┌───────┐┌───────┐                         │
 │ │lv.249 ││lv.249 ││lv.249 │                         │  3-wide card grid, scrolls
 │ │  art  ││ art ✓ ││ art ✓ │                         │  ✓ = a large green tick over the art
 │ │ 5★    ││ 5★    ││ 5★    │                         │
 │ │ name  ││ name  ││ name  │                         │
 │ └───────┘└───────┘└───────┘                         │
 │   … scrolls …                                       │
 │     ⟨ (ALL) ( ) ( ) ( ) ( ) ⟩                        │  filter rail: ALL + FOUR groups
 │              ┌──────────┐                           │
 │              │    OK    │                           │  green
 │              └──────────┘                           │
 └─────────────────────────────────────────────────────┘
```

| Element | Drawn as | Notes |
| --- | --- | --- |
| Live header | the Expected Results strip and the five circles, repeated inside the modal | **the feedback loop is the point**: pick a familiar, watch the percentage move. Everkai's equivalent is a `<select>` that changes a `<dl>` row two elements away |
| Card | rarity-framed art tile, `lv.N` on a plaque at the top, `N★` bottom-left, name on a coloured nameplate | the same card component as the Growth roster |
| Selected | a **large green tick medallion centred over the art**, not a border, not a checkbox | unmistakable at thumbnail size |
| Filter rail | `ALL` + **four** class medallions between decorative `⟨ ⟩` end-caps | **four**, where the Growth roster and the Tower team picker show three. Resolved in CAPTURE-INDEX: the real set is `PetGroup.json`, 4 rows, used by all four values of `Pet.Group` (19/19/19/13 across 70 familiars). Build against four |
| `OK` | green, bottom-centre | commits the selection to the slots; the run still needs `Confirm` |

---

## 6 · Every magnitude on this surface, and where it comes from

Nothing below is read off a screenshot.

### `PetDispatch.json` — 9 rows

| `_id` | `TowerLv` | `Power` | `Time` | Basic (`Reward`) | Extra (`SPReward`) | Great-Success fragment pools |
| ---: | ---: | ---: | ---: | --- | --- | ---: |
| 1 | 20 | 100,000 | 20 | 1,000 `Item_PetLevelUP` | 200 | 1 |
| 2 | 30 | 200,000 | 20 | 2,000 | 400 | 2 |
| 3 | 50 | 400,000 | 20 | 3,000 | 600 | 2 |
| 4 | 80 | 800,000 | 20 | 4,000 | 800 | 3 |
| 5 | 120 | 1,600,000 | 20 | 5,000 | 1,000 | 3 |
| 6 | 160 | 3,000,000 | 20 | 6,000 | 1,250 + 5 `Item_PetClassUP` | 3 |
| 7 | 200 | 5,000,000 | 20 | 7,000 | 1,500 + 10 | 3 |
| 8 | 250 | 10,000,000 | 20 | 8,000 | 1,750 + 25 | 2 |
| 9 | 300 | 20,000,000 | 20 | 9,000 | 2,000 + 50 | 2 |

Reward counts from `split_reward/reward_petdispatch.json` (39 rows: 9 `Base_n`, 9 `Add_n`,
21 `Add_n_k` weighted fragment pools, every pool entry an `Item_Owner_PetPiece_*` at uniform
weight 100). The gate ladder is **200× across nine areas against a 15× floor ladder** — the
Attribute requirement outruns the floor requirement by more than an order of magnitude
(`docs/familiar-data-inventory.md` §3).

Area names are not in `PetDispatch.json` — the rows carry only `Bg_Pet_Explore_{n}_S`. The
capture shows them as the three `PetArea` exploration areas × 3: Verdant Forest 1–3,
Snowy Plains 1–3, Endless Desert 1–3, in `_id` order.

### `Time` is a constant, and its unit is not measured

**`PetDispatch.Time` is `20` on all nine rows** (`docs/familiar-data-inventory.md` §2, and
`scripts/import-familiar-dispatch.py` asserts it). CLAUDE.md rule 6 applies: *a placeholder
column is not a measurement*. Name the constancy; do not name the unit.

No other `Pet*` table and no `System` key carries a competing dispatch duration — the importer
proves that with a positive control. So `20` is the only duration there is, and **the table
does not say twenty of what**. Everkai reads it as hours on an economic argument recorded in
`lib/familiar-dispatch.mjs:19–29`, and that argument is sound as far as it goes, but it is an
argument, not a measurement. The screen prints `Dispatch Duration: 20 hr(s)` — that is the
replacement server's reading of the same ambiguous column, not independent evidence, and it
must not be cited as confirmation. **Keep the local-rule marking. Do not promote it.**

### The Great Success inputs — measured; the formula — not

| Key | Value | Source |
| --- | ---: | --- |
| `PetDispatch_Crit` | 3000 (basis points) | `System.json` |
| `PetDispatch_Coefficient` | 0.5 | `System.json` |
| area reference Attribute | `PetDispatch.Power` | `PetDispatch.json` |
| team Attribute | `PetAttr.CombatAdd` over the team's stats | `PetAttr.json` |

Four inputs, measured, in that order in the client's `GetBigSuccess`. **The expression that
combines them is in no table and in no readable client file** (`docs/familiar-data-inventory.md`
§8). `lib/familiar-dispatch.mjs:44` applies a local rule — 30 % at exactly the gate, plus half
the surplus ratio, clamped to 0–100.

One observation that is *not* evidence but is worth writing down: on this save the team's
Attribute is about 21 % of area 9's `Power`, and the screen prints `Great Success: 0.00%`.
Everkai's local curve would print **18.15 %** on the same two numbers. Both are unmeasured —
the server's 0.00 % is a number off a screenshot and carries no authority — but they disagree
in *shape*, not just in magnitude: one floors at zero below the reference, the other does not.
If the formula is ever measured, that is the first property to check.

### `Complete Now` — a monetised skip Everkai does not model

| Key | Value |
| --- | --- |
| `PetDispatch_QuickBuy` | `[200, 400, 600, 800, 1000]` |
| `PetDispatch_QuickBuy_MaxTimes` | 5 |

`lang.json` states the rules in the original's own words: `Pet_Dispatch_Text4` *"Dispatch ends
in: {time}. Spend {num1} [crystal icon] to skip?"*, `Pet_Dispatch_Text16` *"The number of
crystals required to skip a dispatch depends on the remaining dispatch time. The less time
remaining, the fewer crystals are required."*, and an unkeyed line *"Each time a dispatch is
skipped, the crystal cost for the next skip will increase."* `Pet_Dispatch_Text5`
*"Attempts: {num}"* is the remaining-skips counter; `Pet_Dispatch_Text11` *"Insufficient
attempts"* is its exhausted state.

So the escalation is **per skip within the day** (200 → 1,000, five a day) *and* scaled by
remaining time. Everkai has no skip and, under the single-player design rule, should not add a
crystal sink. Recommendation: **drop the purchase, keep the fact.** The existence of an
escalating paid skip is the strongest independent support for reading `Time` as a long
duration — nobody sells five skips a day against a twenty-minute timer — and it belongs in the
`lib/` header where that argument already lives, not on a screen.

---

## 7 · Is `Power` a gate at all? — the biggest structural question on this screen

Everkai treats `PetDispatch.Power` as a **hard gate**, in three places:

- `familiar-dispatch.mjs:104` refuses the action: `` `Needs ${area.power} team Power…` ``
- `familiar-dispatch-panel.tsx:29` disables the button when `power<picked.power`
- `validFamiliarDispatch` re-checks it on every save load

The capture says otherwise, and so does the string table:

1. **A run completed at an area whose `Power` the team does not meet.** The result modal fired
   on entry (`img/dispatch-result-modal.png`); the screen behind it has `Endless Desert 3`
   as the area and the Areas list marks that card `Current Area`
   (`img/dispatch-areas-scrolled.png`). Area 9's `Power` is 20,000,000; the same save's team
   Attribute is well under it (the Tower screen prints the same quantity as
   `Current Attribute`). A hard gate could not have produced that run.
2. **`Confirm` is drawn green, with a red "act here" dot** — not the grey inert treatment this
   game uses for an unavailable primary (Family README convention 6, Study Tour's grey
   `Claim All`).
3. **There is no string for a Power refusal.** The whole dispatch string set has exactly two
   blocking messages: `Pet_Dispatch_Text9` (fewer than 5 familiars contracted) and
   `Pet_Dispatch_Text8` (fewer than 5 assigned). The only *unlock* string is
   `Pet_Dispatch_Text7`, and it names the **tower floor**, not Attribute.
4. **`Power`'s stated job is the odds**: `Pet_Dispatch_Text15`, and its position beside
   `PetDispatch_Crit` / `PetDispatch_Coefficient` in the formula's input list.

**Reading: `TowerLv` unlocks an area; `Power` is the Great Success reference value, not a
gate.** An under-powered team dispatches to a rich area and reliably gets the Basic reward with
a poor (possibly zero) Great Success chance — which is a *choice*, and a better one than
Everkai's refusal.

This is capture-plus-string evidence, not proof. **The measurement that would settle it**:
press `Confirm` on an under-powered team and see whether the client refuses. That commits the
owner's five familiars for the full duration, so it was not done. It is a one-press capture for
anyone who is in the client anyway.

**Recommendation** (rule 9 — proceed on it unless the owner objects): keep `TowerLv` as the
unlock, demote `Power` to the Great Success input it is documented to be, and delete the gate
from all three places. The save check is safe in that direction — `validFamiliarDispatch` would
then accept strictly more saves than before, so no existing save can be invalidated (CLAUDE.md
rule 12's concern is the opposite direction).

---

## 8 · Team Attribute is understated, and fixing it is save-safe

From `docs/familiar-data-inventory.md` §4 and §7.2, measured:

**`PetAttr.json` has nine weight rows. Everkai imports three.**

| `Field` | `type` | `CombatAdd` | In Everkai's `familiarPower`? |
| --- | ---: | ---: | --- |
| ATK | 1 | 15 | yes |
| HP | 1 | 1 | yes |
| SPD | 1 | 30 | yes |
| **CRIT** | 2 | **5** | **no** |
| CRIT_RES | 2 | 5 | no — but `Pet.CRIT_RES` is constant 0 on all 70 rows, so it costs nothing |
| **Block** | 2 | **5** | **no** |
| ACC | 2 | 5 | no — `Pet.ACC` constant 0 |
| DI | 2 | 30 | no — `Pet.DI` constant 0 |
| DR | 2 | 30 | no — `Pet.DR` constant 0 |

`lib/familiars.mjs`'s `familiarStats` returns only `{ATK,HP,SPD}`, so `familiarPower`
(`familiar-dispatch.mjs:42`) cannot see `CRIT` or `Block` even though both are **500 on 55 of
the 70 familiars** (`Pet.json`, and `Block` is identical to `CRIT` on every row). At weight 5
each that is 5,000 Attribute per familiar unseen, so **a full five-familiar team is understated
by up to 25,000**.

Read that against the gate ladder in §6: 25,000 is **25 % of area 1's 100,000** and 0.125 % of
area 9's 20,000,000. Material at the first rung, noise at the last. Whichever way §7 resolves,
this is wrong and worth the three rows.

**It is save-safe to fix in this direction.** Adding weights only ever *raises* a team's
Attribute; `validFamiliarDispatch` re-checks the gate on load (`familiar-dispatch.mjs:72–75`)
and a run that was legal before stays legal when the number rises. The rule-12 trap is a
derived value that can *fall* or a bound that can *tighten*; neither happens here. Say so in
the commit message, and keep the generated-save decode check from CLAUDE.md anyway — it costs
one command.

Sequencing note: `familiarStats` is also the input to tower combat, so widening it to return
`CRIT`/`Block` touches `09-tower.md`'s engine too. Return the two new fields but apply them
only in `familiarPower` first; wiring `Pet.CRIT` into the combat engine is a separate change
with its own measurement (inventory §6.2).

---

## 9 · Compared with Everkai

`app/familiar-dispatch-panel.tsx` is 35 lines and renders: a ribbon heading, a `Team Power`
row, five slot cards, a `<select>` of familiars, a `<select>` of areas, a four-row `<dl>`, two
`tower-reward` sentences, up to four buttons and a 203-word `rules-note`.

| # | Difference | Kind |
| --- | --- | --- |
| **D-DISPATCH-1** | **No result modal, and no auto-report on entry.** The original grants and *presents*; Everkai makes the player press `Collect dispatch` and returns a toast sentence. The whole state machine in §1 is missing. | **structural** |
| **D-DISPATCH-2** | The area is a `<select>` whose `<option>` text carries the art's information as a string — `Area 7 · 5,000,000 Power · floor 200` (`:26`). The original is a scrolling list of nine art cards with their reward trays drawn and a `Current Area` ribbon. | **structural** |
| **D-DISPATCH-3** | The team picker is a second `<select>` plus an `Add to dispatch team` / `Remove from dispatch team` toggle button (`:20–21`). The original is a 3-wide card grid with a green tick over the chosen art, and **the Expected Results strip lives inside it and updates live**. | **structural** |
| **D-DISPATCH-4** | The gate is a `<dl>`: `Unlocks / Familiar Tower floor 200 · 175/200`, `Power needed / 5,000,000`, `Duration / 20 hours`, `Great Success / Fill the team` (`:27`). Family README convention 12 gives the pattern — a bar with `have/need` printed inside the fill, so the short bar is visibly short. Better still: per §7 only one of those four rows is a gate at all. | **structural** |
| **D-DISPATCH-5** | Rewards are a sentence — `Base 7,000 level-up items + 25 class-up · Great Success adds 1,400 + 25 and 3 fragment draws` (`:28`). The original is two labelled trays of item tiles with the count in the corner, and it shows them for **every** area in the list at once. | **structural** |
| **D-DISPATCH-6** | `Power` is a hard gate in Everkai and appears not to be one in the original (§7). | **structural** |
| **D-DISPATCH-7** | `CRIT` and `Block` never reach `familiarPower` (§8) — a measured under-count against a shipped gate. | **structural** |
| **D-DISPATCH-8** | Everkai prints `Team Power` on the panel; the original prints no team total on this screen at all and calls the quantity **Attribute** everywhere it does print it. | **cosmetic** (the word) + **structural** (the missing live feedback, already D-DISPATCH-3) |
| **D-DISPATCH-9** | Slots are rectangular `framed-card`s with a `<small>` caption under each reading the familiar's Power or the word `Empty` (`:19`). The original's committed slots are bare circular portraits; the card shape belongs to the *picker*. | cosmetic |
| **D-DISPATCH-10** | `Cancel dispatch · forfeits all rewards` puts the consequence in the button label (`:25`). The original's button is just `Cancel`; the consequence is the confirm dialog (`Pet_Dispatch_Text14`). | cosmetic |
| **D-DISPATCH-11** | `Dispatch to area 7` as the verb; the original's is `Confirm`. Areas are named in the original (`Endless Desert 3`), numbered in Everkai. | cosmetic |
| **D-DISPATCH-12** | The locked state is one sentence: `Contract 5 or more familiars to unlock. 2 contracted.` (`:17`). The original's wording is nearly identical (`Pet_Dispatch_Text9`) — but conventions 9 and 15 want five slot circles, three of them padlocked, with `2/5`. | cosmetic (the words are right; the drawing is missing) |
| **D-DISPATCH-13** | A 203-word `rules-note` provenance essay on the screen (`:31–33`). | **structural** — see `docs/familiar-implementation-audit.md` §3.1, finding D9 |
| **D-DISPATCH-14** | Items are printed as `level-up items` / `class-up items` — Everkai's own field names. The original's Tower Earning Rewards panel names them **Magical Fruit** and **Familiar Crystal** (`img/tower-earnings.png`; also `docs/permanent-systems.md:428`). | cosmetic but pervasive (audit §3.4) |

---

## 10 · What Everkai should render

```
(i) Familiar Dispatch
▒▒▒▒▒▒▒ area art ▒▒▒ ◈ Endless Desert 3 ◈ ▒▒▒▒▒▒▒

        ──◇─  Basic  ─◇──
   [🍏 9K]

        ──◇─  Extra  ─◇──
   Great Success Dispatch grants extra rewards:
   [🍏 2K] [💎 50]

     ──◇─ Select your familiars ─◇──
  ┌────────────────────────────────────────┐
  │ (i) Expected Results   Great Success: n% │   n% in red
  └────────────────────────────────────────┘
     ( ◯ )  ( ◯ )  ( ◯ )  ( ◯ )  ( ＋ )        ← empty seat is a circle with a +

           Dispatch Duration: 20 hr(s)
           [  Confirm  •]              [ Ruin ]

--- AWAY ------------------------------------------
           In Progress
           Time left: 6h 12m
           [ Complete Now ]   [ Cancel ]     ← drop Complete Now; single-player

--- RESULT (auto, on entry) -----------------------
        ╾──┤ Result ├──╼
             Success            ← blue;  Great Success in red-orange
        ──◇─ Basic ─◇──
        [🍏 9K]
             [ OK ]
```

Tap a seat → the picker modal, with the Expected Results strip and the five circles repeated
live at its top, a 3-wide card grid below, a four-group filter rail, one `OK`.
Tap `Ruin` → the Areas list, nine art cards with their two reward trays, a red `Current Area`
ribbon on the selected one, one confirm button.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Area art per area | `PetDispatch.Bg` (`Bg_Pet_Explore_{n}_S`) | **no** — 9 background images to source |
| Area names | not in `PetDispatch`; the three `PetArea` names × 3 | **derivable** — `EXPLORE_AREAS` already holds the three |
| Basic / Extra reward contents | `dispatchArea().base` / `.great` | **yes** |
| Item tiles (icon + corner count) | `Item.icon`: `Icon_Pet_LevelUP`, `Icon_Pet_ClassUP` | **no** — two sprites, and the rename (D-DISPATCH-14) |
| Abbreviated counts (`9K`, `1.25K`) | formatting only | **derivable** |
| Five seats, filled and empty | `dispatchState(s).team` | **yes** |
| Live Great Success % in the picker | `greatSuccessChance(game, area, provisionalTeam)` | **yes** — the function already takes a team argument |
| `(i)` tooltip text | `lang.json Pet_Dispatch_Text15` | **yes** (quote it) |
| Duration line | `dispatchArea().hours`, rendered `20 hr(s)` | **yes**, with the unit marked local |
| `Confirm` ready badge | team full + area chosen + no run out | **derivable** |
| `Current Area` ribbon | the selected area id | **derivable** — Everkai has no stored "current area"; the `<select>` value is component state, not save state. Storing it is a save change; a `null` default meaning "area 1" avoids a `SAVE_VERSION` bump |
| Areas list, locked rows | `dispatchUnlocked()` + `Pet_Dispatch_Text7` wording | **yes** |
| Result modal, two titles + colours | `lang.json` `#24598B,#4AAFB2` / `#B4320F,#CA6420` | **no** — a new modal and two CSS tokens |
| Auto-report on entry | settle the finished run when the panel mounts, not on a button | **no** — `dispatchCollect` is player-driven today |
| Fragment payout display | `dispatchFragments()` already returns `[id, n]` pairs | **yes** — show them as familiar-portrait tiles in the Great Success result, not as a sentence |
| Team Attribute total | `dispatchTeamPower()` | **yes** — but the original does not print it on this screen; keep it in the picker, as the thing the % responds to |

---

## 11 · Prose to delete, and what replaces it

Everkai's Dispatch panel carries roughly **290 words**. The original's carries **21** on the
screen (two labels, one sentence, one duration line, three button words) plus **17** behind the
`(i)`.

| Delete | Replace with |
| --- | --- |
| The whole `rules-note` — *"The nine areas, their Familiar Tower gate, the Power each needs, the 20 figure on every row and both reward bundles come from the original's PetDispatch table…"* (73 words) | nothing on screen. It is provenance, it is already in `lib/familiar-dispatch.mjs`'s header and in `docs/parity-catalog.csv` E10, and the original has no reason to explain its own sourcing to a player (audit §3.1, D9) |
| *"Two things are local and flagged. The duration table does not name its unit… reading it as minutes would pay 144 times the tower. And the original's Great Success formula is not in any table…"* (130 words) | nothing on screen. Keep every word of it in the module header, where it already is |
| `Base 7,000 level-up items + 25 class-up · Great Success adds 1,400 + 25 and 3 fragment draws` | the `Basic` and `Extra` trays: item tiles with corner counts, the fragment pools drawn as familiar portraits |
| `Team Power  4,294,000` as a standing row | move it into the picker, where changing the team moves it; on the main screen show only `Expected Results · Great Success: n%` |
| The `<dl>`: `Unlocks / Familiar Tower floor 200 · 175/200` | a single progress bar with `175/200` printed **inside the fill** (convention 12), shown on the Areas list card, not on the dispatch screen |
| The `<dl>` rows `Power needed / 5,000,000` and `Great Success / Fill the team` | the `(i)` sentence plus the live percentage. Per §7, `Power needed` is probably not a requirement at all |
| The `<dl>` row `Duration / 20 hours` | `Dispatch Duration: 20 hr(s)`, the original's own line, centred above the button |
| `Cancel dispatch · forfeits all rewards` | `Cancel`, and `Canceling the dispatch won't grant you any reward. Confirm?` in the dialog it opens |
| `Dispatch to area 7` | `Confirm` |
| `Contract 5 or more familiars to unlock. 2 contracted.` | keep the sentence (it is the original's own, `Pet_Dispatch_Text9`) but draw the five seats with three padlocks and `2/5` above it |
| `Empty` under each vacant slot | a `＋` inside the empty circle (convention 9) |
| `Still away. 7 hours left.` (error toast, `:105`) | the `In Progress` label and `Time left: {time}` on the screen itself — an away run should not need a refused button press to tell you it is away |
| `Great Success! Dispatch returned with 9,000 level-up and 50 class-up items and 3 Snowbear fragments.` (toast) | the Result modal: the coloured word, then the item tiles |

---

## 12 · What was not captured, and what stays open

| Thing | Why, and what it would take |
| --- | --- |
| **`Confirm` pressed** | Commits the owner's five familiars for the full duration (CAPTURE-INDEX). This is also the press that would settle §7. |
| **A `Great Success` result modal** | The observed run rolled `Success`. The modal's `Extra` block and the fragment presentation are unseen; `lang.json` gives the title and its colour. |
| **A locked area row** | All nine were open on this save. Wording is known (`Pet_Dispatch_Text7`); the drawing is not. |
| **The empty / partly filled seat** | The owner's five seats were always full. `Pet_Dispatch_Text8` gives the under-filled wording; the empty-circle treatment above is inferred from convention 9, not captured. |
| **`Complete Now` and its crystal dialog** | A purchase surface; not opened. Fully specified by `Pet_Dispatch_Text4/5/11/16` and the two `System` keys (§6). |
| **The per-area `Rewards` detail panel** | `Pet_Dispatch_Text6` *"{name} Rewards"* and `PanelPetDispatchPreview_n256` = `Rewards` show a **separate** per-area reward panel exists, reachable from somewhere in this flow. Not found during the capture. One more screen than this spec covers. |
| **Whether the area list scrolls to the current area on open** | It opened at the top (`img/dispatch-area-select.png`) and the current area was at the bottom, so: **no**, or at least not on this build. |
