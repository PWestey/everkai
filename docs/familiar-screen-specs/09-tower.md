# 09 · Familiar Tower — Challenge and Endless

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/tower-challenge-exhausted.png`, `img/tower-floors-locked.png`,
`img/tower-info.png`, `img/tower-info-2.png`, `img/tower-team.png`,
`img/tower-team-bond.png`, `img/tower-earnings.png`, `img/tower-rewards-ladder.png`,
`img/tower-leaderboard.png`

Reached from the **Familiar hub scene** (`img/hub.png`): the lower of the three labelled
buildings, red `!` badge. It is heading 3 of the hub's own three-item `(i)` manifest — one of
the three systems the game considers core.

Tables: **`PetTower.json`** (300 floors), **`PetTowerArray.json`** (1,480 enemy stat blocks),
**`PetEndlessTower.json`** (23 bands), **`PetEndlessTowerPool.json`** (705 bots),
`split_reward/reward.json` (`Reward_PetTower_*`, `Reward_PetEndlessTower_1`), and seven
`System.json` keys (`PetEndlessTowerOpen`, `PetTowerIncome`, `PetTowerIncomeTime`,
`PetTowerIncomeBPTimeMax`, `PetTowerIncomeBPCoef`, `PetTowerAutoUnlock`, `PetArrayAdd`).
Everkai: `lib/familiar-tower.mjs`, `lib/familiar-supplies.mjs`,
`app/familiar-tower-panel.tsx`, plus the seven combat modules.

---

## 1 · The two modes are sequential, not parallel

The capture agent read these two screens backwards on the first pass and corrected against the
`(i)`. Getting this right is the precondition for everything below.

The tower `(i)` (`img/tower-info.png`), under **`- Challenge Rules -`**, in the game's own
words:

> *"The Familiar Tower has two challenge modes: Challenge Mode and Endless Mode."*
> *"The Challenge Mode consists of several floor stages. You must complete a floor stage to
> advance to the next one. Each time you pass a floor, you receive rewards. Cleared floors
> cannot be challenged again."*
> *"The Endless Mode unlocks after clearing 200 floors in the Challenge Mode. It consists of
> several floor stages like the Challenge Mode, following the same rules."*
> *"After clearing a specified number of floors in the Challenge Mode, new exploration areas
> unlock, where you can find new monsters."*

**Endless unlocks after 200 Challenge floors.** Measured independently of the screenshot:
`System.PetEndlessTowerOpen` = `"200"`, and `lang.json PetEndlessTowerTip1` =
*"Endless Mode requires completing Challenge Mode Floor {val}"*. Everkai's `ENDLESS_OPEN`
already reads 200 from the same key.

The save the capture came from therefore sits in a specific and useful place:

| Mode | State captured | Why that matters |
| --- | --- | --- |
| **Challenge** | **exhausted** — cleared to the table's last floor, top of the stack reads `Please stay tuned.`, the reward badge reads `All Claimed` | the only capture of the *content-exhausted* end state |
| **Endless** | **mid-climb**, floors above the current one chained and padlocked | the only capture of the *locked floor* state |

Both states are on the same screen, in the same scroll position, differing only by which
segment of the mode pill is lit. **One screen, one state machine, two data sources.**

The floor ceiling is `PetTower.json`'s row count — **300 rows**, the last of which carries no
`nextlevel` key (299 of 300 do). That is where the ceiling comes from; `Floor 300` on the
screenshot is not the evidence.

---

## 2 · The tower screen

`img/tower-challenge-exhausted.png` (Challenge), `img/tower-floors-locked.png` (Endless).
Co-ordinates in the client's own 720 × 1280.

```
  0 ──────────────────────────────────────────────────────  game bar
 75 │ (i) Familiar Tower                                   │  header on the art, no plate
    │                                                      │
    │        ▲ the stack scrolls UP into unbuilt floors     │
    │                                             ╭─────╮  │
160 │                                             │ art │  │  reward-ladder badge:
256 │            Please stay tuned.               │ All │  │  `Claimable` / `All Claimed`
    │              ↑ PetTowerUnlockDesc3          │Claim│  │  (the word is the caption)
    │         ▒▒▒▒ isometric floor platform ▒▒▒▒  ╰─────╯  │
460 │ ◈ Floor 300 ◈                                        │  floor plaque, LEFT edge
    │         ▒▒▒▒ floor platform ▒▒▒▒                     │
    │                 Completed                            │  watermark, centred, low-contrast
    │                                             ╔═════╗  │
549 │                                             ║ ▣   ║  │  MODE PILL — vertical, 2 segments
    │                                             ║Chal.║  │  lit segment = current mode
    │                                             ╟─────╢  │
    │                                             ║ ▥   ║  │
747 │                                             ║Endl.║  │
    │                                             ╚═════╝  │
763 │                                             ┌─────┐  │
843 │ ◈ Floor 299 ◈                               │ (A) │  │  Auto
    │                                             │Auto │  │
    │                                             └─────┘  │
987 │        Current Attribute  ◎ 4.294M                   │  banner across the stack
1024│                                                      │  value in ORANGE
    │ ╔═══╗    ┌──────────────────────┐    ╔═══╗           │
1056│ ║art║    │      Challenge       │    ║art║ •         │  gold plaque primary
1141│ ║   ║    └──────────────────────┘    ║   ║           │  red dot on Earnings
1088│ Team ────────────────────────────────── Earnings     │  a "wing" bar behind both
1173├──────────────────────────────────────────────────────┤
    │  «                                      ★ Leaderboard│  bottom bar
1280└──────────────────────────────────────────────────────┘
```

### Element table

| # | Element | Drawn as | State evidence |
| --- | --- | --- | --- |
| 1 | The stack | an isometric ruined tower, one platform per floor, scrolling vertically. **The screen is the progress bar** | — |
| 2 | Floor plaque | `◈ Floor N ◈` on a small stone tablet clipped to the **left** edge of each platform | `lang PetTowerNametxt` = `Floor {val}` |
| 3 | Cleared floor | the platform, empty, with `Completed` watermarked across it in low-contrast type | `PetTowerFinishtxt` / `PetTowerStoreyComp_txtUnLock` = `Completed` |
| 4 | Locked floor | the same platform with a **padlock-and-chain barrier** strung between two posts across its front edge | `PetTowerUnlockDesc1` *"Unlocks after completing the previous floor."*; for Endless below its gate, `PetTowerUnlockDesc2` *"Unlocks after completing Challenge Mode Floor {val}"* |
| 5 | Exhausted top | a bare platform reading `Please stay tuned.` | `PetTowerUnlockDesc3`, verbatim |
| 6 | Current floor | **not captured** — lost to a naming error, and the list then auto-anchored to the next locked floor (CAPTURE-INDEX). `lang PetTowerStoreyComp_n26` = `Recommended`, and the capture notes a reward chest sat on it | the one real gap in this screen |
| 7 | Reward badge | a diamond art tile top-right, caption underneath | two states: `Claimable` / `All Claimed` (`BtnText_Middle_Pet_title_state_default` / `_state_2`), plus `PetTowerRewardPreviewBtn` *"{val} floors left"* |
| 8 | **Mode pill** | a single vertical capsule split into two segments, each an icon + caption; the active one filled gold, the inactive dark brown | the captions are ~7 px tall at capture resolution and are **not legible**; the index reads them as Challenge / Endless and `PetEndlessTower` = `Endless` in `lang.json` supports the lower one. Confirm the upper caption before shipping a label |
| 9 | `Auto` | a separate square button below the pill | `PetTowerAutoUnlock` = **30**. `ScenePetTower_StartAutoTips`: *"Activate Auto to auto-challenge levels. Rewards will be distributed upon successful challenge. You can leave current interface while challenging."* — **no cost is named anywhere**; `PetTowerAutoLoadTime` = 3 is the pacing |
| 10 | `Current Attribute ◎ 4.294M` | a banner strip across the stack, label brown, value orange, with a coin-like glyph | `PetBattleSceneComp_n58`. The battle screen also has `n62` = `Enemy Attribute` — the same quantity for both sides |
| 11 | `Challenge` | a wide gold plaque, centred | the primary is **gold** here, not the green used elsewhere on this surface |
| 12 | `Team` / `Earnings` | art tiles sitting on a thin "wing" bar that runs off both edges, captions outboard | `PetTowerTeam` = `Team`, `ScenePetTower_btn_Income` = `Earnings`; red dot on `Earnings` when something is waiting |
| 13 | `Leaderboard` | a trophy statue, bottom-right of the **bottom bar**, not the wing bar | Endless only in practice — see §7 |

**The reward badge appears in Challenge and not in Endless.** At the identical screen position
in `img/tower-floors-locked.png` there is only tower art. That matches the tables:
`PetTower.json` gives each of its 300 floors a distinct `Reward`, while all 23
`PetEndlessTower` rows share **one** constant `Reward_PetEndlessTower_1` — there is no ladder
in Endless to show.

---

## 3 · `Team`

`img/tower-team.png`. A full surface, not a sheet: the top half is a live isometric formation,
the bottom half a roster picker.

```
  0 ─────────────────────────────────────────────────────
    │ Team                                               │
    │        Hold and drag to swap position              │  PetDeployTips, centred, on the art
    │   ╱▔▔╲                              ╱▔▔╲           │
    │  │ 3  │        ╱▔▔╲                │ 4  │          │  FIVE tiles on an isometric grid,
    │   ╲__╱        │ 1  │                ╲__╱           │  staggered — not two rows
    │   Lv. 249      ╲__╱      Lv. 249                   │  each: art, ◉ type medallion,
    │  ◉ Umbranther  Lv. 249  ◉ Grandstag                │  `Lv. N`, name
    │   ╱▔▔╲        ◉ Shibataro       ╱▔▔╲               │
    │  │ 5  │                        │ 2  │      ╭───╮   │
    │   ╲__╱                          ╲__╱       │ ? │   │  the Bond disclosure, bottom-right
    │  ◉ Snowbear                   ◉ Treeraffe  ╰───╯   │  of the formation, NOT of the screen
    │        Current Attribute  ◎ 4.294M                 │  same banner as the tower screen
    ├────────────────────────────────────────────────────┤
    │ ┌──────┐┌──────┐┌──────┐┌──────┐                   │  4-wide card grid, scrolls
    │ │lv.249││lv.249││lv.249││lv.249│                   │  deployed cards carry the big
    │ │ art ✓││ art ✓││ art ✓││ art ✓│                   │  green tick (same as dispatch)
    │ │ name ││ name ││ name ││ name │                   │
    │ └──────┘└──────┘└──────┘└──────┘                   │
    │      ⟨ (ALL) ( ) ( ) ( ) ⟩                          │  ← THREE groups + ALL here
    │            ┌──────────────┐                        │
    │            │ Quick Deploy │                        │  green
    │            └──────────────┘                        │
    └────────────────────────────────────────────────────┘
```

| Element | Notes |
| --- | --- |
| Formation | five positions on an isometric grid, **not** a 2-front / 3-back row split. Positions are meaningful — `PetDeployTips` = *"Hold and drag to swap position"* — and the drag is the only way to set them. Everkai has a `Move to first front slot` button instead (`familiar-tower-panel.tsx:36`) |
| Unit label | type medallion + `Lv. N` + name under each figure. No stats, no Attribute per unit |
| `Current Attribute` | the team total, the same banner and the same quantity as the tower screen and as Dispatch's Expected Results |
| Picker grid | **4 columns** here against the dispatch picker's 3; same card, same green tick |
| Filter rail | `ALL` + **three** groups, against the dispatch picker's four. CAPTURE-INDEX resolves this: `PetGroup.json` has 4 rows and `Pet.Group` uses all four (19/19/19/13 of 70). The three-icon rail is short by one; build against four |
| `Quick Deploy` | one green button — auto-fills the strongest team. Not pressed (it rewrites the owner's saved team). Everkai has no equivalent |
| `?` | opens the Bond ladder. Note the placement: bottom-right **of the formation area**, the same relative position the Study Tour spec records for its slot counter. A disclosure about the thing it sits on |

### The Bond ladder

`img/tower-team-bond.png`. A dark modal, title `Bond`, three identical rows:

```
 ┌──────────────── Bond ────────────────┐
 │ ┌───┐  The team contains 3 familiars │
 │ │ ? │  of the same type.             │
 │ │(◌)│  HP: +10%                      │   each value on its own line
 │ └───┘  ATK: +10%                     │
 │        Attribute: +10%               │
 ├───────────────────────────────────────┤
 │ ┌───┐  … 4 familiars … +13% ×3        │
 │ ┌───┐  … 5 familiars … +15% ×3        │
 └───────────────────────────────────────┘
```

Every string is in `lang.json`, and the internal name for Bond is **Fetters**:

| Key | English |
| --- | --- |
| `PetFettersTipsTitle` | `Bond` |
| `PetFettersTips1` | `The team contains {val} familiars of the same type.` |
| `PetFettersTips2` | `HP: +{val}%` |
| `PetFettersTips3` | `ATK: +{val}%` |
| `PetFettersTips4` | **`Attribute: +{val}%`** |

And the magnitudes are measured, from `System.PetArrayAdd`:

| Same-type count | key | ATK | HP | **POWER** |
| ---: | --- | ---: | ---: | ---: |
| 3 | `Group3` | 1000 bp | 1000 bp | **1000 bp** |
| 4 | `Group4` | 1300 bp | 1300 bp | **1300 bp** |
| 5 | `Group5` | 1500 bp | 1500 bp | **1500 bp** |

**Three components, not two.** `lib/familiar-tower-data.json`'s `bond` block carries only
`{ATK, HP}` for each rung, and `teamBond()` (`familiar-tower.mjs:133`) applies only those two;
`docs/familiar-implementation-audit.md` §5.2 records `PetArrayAdd`'s `POWER` field as
deliberately not applied. The capture shows the third line on screen, in the player's face,
with its own label. `Attribute` is the quantity the tower banner prints, the Team screen prints
and Dispatch's Great Success reads — so **a 5-of-a-type team's Attribute is 15 % higher than
Everkai computes it**, which lands on both this screen and `08-dispatch.md`'s Expected Results.
Import the third column.

The `?` icons in the three rows are placeholder art on this build (a grey `?` medallion where
a type icon belongs). Do not copy that; draw the type medallion, or nothing.

---

## 4 · The skill disclosure

The original has **no per-familiar skill panel on the tower screen at all.** A familiar's
skills live on its detail shell, behind `Combat Attribute`
(`img/detail-combat-attribute.png`, spec 03's territory) — a big modal listing Attack, Health,
Speed and named Combat Skills with their descriptions, with its own `(i)` opening the shared
`Familiar Attribute` glossary.

Everkai puts a `<details className="rules-note tower-skill">` on the tower page
(`familiar-tower-panel.tsx:34`), summarised `Skill · <name>`, containing the selected
familiar's active-skill text, its stage passive, and its base critical chance and resistance.
`docs/familiar-implementation-audit.md` calls this P8 and rules it *"the one disclosure that
belongs"* — it is game data about a unit, which is what an `(i)` is for.

Against the capture, that judgement narrows: **the content is right, the location is wrong.**
It belongs on the familiar, reachable from the team slot, not as a collapsed text block on the
tower page underneath the roster `<select>`. Two fixes, both cheap:

- Tapping a formation tile opens that familiar's `Combat Attribute` modal (one component,
  shared with the detail shell).
- The fallback sentence — *"This familiar uses a local double-damage Rage strike; its original
  skill is not implemented."* (8 of 71 familiars) — is an apology to the reader of this repo.
  Show the familiar's real name for its attack and nothing else; the gap is recorded in
  `docs/parity-catalog.csv` E6 and in `docs/familiar-data-inventory.md` §6.1, which measures
  the replacement: **192 `PetSkill` + 137 `PetBuff` rows, absent, ranked #1**.

---

## 5 · The floor card — and the battle, which was not captured

There is no "floor card" in the original. The floor **is** the platform in the stack: its
plaque, its state (Completed / Recommended / chained), and, on the current floor, a reward
chest. Tapping `Challenge` starts the battle for whichever floor is current.

**The battle screen and its result modal were deliberately not captured**, because pressing
`Challenge` advances the owner's real floor (CAPTURE-INDEX, "Not reached, and why"). That is a
genuine gap in this spec and it is written here rather than guessed at. What is known about it
comes from strings and from the tower `(i)`, not from a screenshot:

| Evidence | What it says |
| --- | --- |
| `PetBattleSceneComp_n58` / `n62` | the battle screen prints `Current Attribute` and `Enemy Attribute` — both sides' totals, side by side |
| `PetBattleSceneComp_txtScene` | `Floor {val}` |
| `PetBattleSceneComp_n75` / `n76` | `Dark Elves' Blessing (Effective)` / `Deployed Familiar Power +15%` — an **external buff from another system lands on tower battles**. Everkai models nothing of this |
| `PetTowerChallengeTip1` | `Please set the team first.` |
| `PetTowerChallengeTip2` | `Familiars available for the team. Go to team setup?` |
| `PetTowerChallengeTip3` | **`There are stronger familiars not in the team. Go to team setup?`** |
| `PetTowerChallengeTip4` | `Retain at least one familiar.` |
| `PetTowerChallengeTipsBtnL` / `BtnR` | `Continue` / `Adjust Team` |
| `PetTowerSkipTips` + `System.PetTowerSkip` = 5 | the battle **animation skip** unlocks after clearing Challenge floor 5 |

Two things to take from that list. First, **the original coaches the team before the fight**:
three distinct pre-battle prompts, one of which actively tells you that you have stronger
familiars sitting on the bench, each offering `Continue` / `Adjust Team`. Everkai silently
disables `Challenge` on an empty party and says nothing otherwise. Second, the combat rules
themselves are **not** as local as Everkai's disclosure claims — see §6.

Until the battle is captured, do not spec it. Anyone with client access can capture it with one
press on a *cleared* floor if the client allows re-entry, or on the first floor of a fresh
account; `PetTowerUnlockDesc1` says cleared floors cannot be re-challenged, so it may have to
be the next uncleared floor on a save the owner is willing to advance.

---

## 6 · What the `(i)` settles about combat, and what stays local

`img/tower-info-2.png`, under **`- Combat Rule -`**, in the game's own words:

> *"Transcender can form a team with 1 to 5 familiars to engage in the combat."*
> *"At the start of each round, the action order is determined by the Speed of familiars."*
> *"Each familiar begins combat with initial Rage. Basic attack and receiving damage increase
> Rage. When Rage is full, the Familiar will release active skill on their next move."*
> *"Combat ends when all Familiars on either side are defeated (HP depleted)."*
> *"Combat ends after 15 rounds. If the round limit is reached, victory is determined by
> remaining HP of both sides - the side with higher HP wins."*

`app/familiar-tower-panel.tsx:51` currently tells the player:

> *"Local and flagged: battles use Everkai's combat engine (Speed order, up to 15 rounds, Rage
> fills by 25 when attacking or hit, higher remaining Health wins, ties lose)."*

**Four of those five clauses are the original's own published rules, quoted almost word for
word.** Speed order per round, the 15-round limit, Rage rising on attacking and on being hit,
higher remaining HP winning at the limit — all four are in the `(i)`, and a team of 1–5 is too.
What remains genuinely local is much smaller:

| Clause | Status after this capture |
| --- | --- |
| Speed determines action order each round | **the original's stated rule** — stop flagging it |
| Combat ends after 15 rounds | **the original's stated rule** |
| Higher remaining HP wins at the limit | **the original's stated rule** |
| Rage rises on attacking and on taking damage; full Rage fires the active skill on the *next* move | **the original's stated rule** — note the "next move" timing, which is a specific claim worth checking `lib/familiar-crit-combat.mjs` against |
| **Rage fills by 25** | still local — no magnitude is published |
| **Initial Rage** | still local, and the `(i)` says there *is* one ("begins combat with initial Rage") — Everkai starts every unit at `rage: 0` (`familiar-tower.mjs:146`). **A measurable divergence, not a stylistic one** |
| **Ties lose** | still local — the `(i)` says "higher HP wins" and is silent on equality |
| Enemy skills, enemy criticals, passives | still local / community-sourced (inventory §6.1) |

That is a real reduction in Everkai's invented surface, and it should be reflected in
`docs/parity-catalog.csv` E9 as well as in the prose deletion below.

### Enemy `Power` is authored — do not compose it

From `docs/familiar-data-inventory.md` §8, measured with both halves from the config set
(CLAUDE.md rule 1):

> `ATK×15 + HP×1 + SPD×30` — the weights from `PetAttr`'s own rows — reproduces **6 of 1,480**
> `PetTowerArray` rows and **0 of 705** `PetEndlessTowerPool` rows. Adding `Pet.CRIT×5 +
> Pet.Block×5` reproduces **the same 6 and the same 0**.

So the enemy `Power` column is an **authored value**, not derivable from the attributes in
these tables. Everkai imports it verbatim, which is the right call.
**What the residual is composed of is not measured, and this spec proposes nothing.** If the
`Enemy Attribute` banner is ever built, it reads the stored column; it does not compute one.
(Note the asymmetry this creates and keep it: the *player's* Attribute is computed from
`PetAttr` weights; the *enemy's* is read from the table. Two different provenances behind one
label.)

---

## 7 · `Earnings` — the idle accrual

`img/tower-earnings.png`. A parchment modal, `Familiar Tower Earning Rewards`
(`PanelPetTowerRevenueReward_bg`), captured at its **cap**.

```
 ┌ ✕ ──── Familiar Tower Earning Rewards ─────┐
 │      ──◇─ Earning Efficiency ─◇──          │
 │  The more stages cleared in Challenge Mode │  the panel's own desc string
 │  and Endless Mode, the higher the earning  │
 │  efficiency.                               │
 │ ┌────┬──────────────────┬────────────────┐ │
 │ │ 🍏 │ Magical Fruit    │  217.8 /hour   │ │  value GREEN, `/hour` brown
 │ ├────┼──────────────────┼────────────────┤ │
 │ │ 💎 │ Familiar Crystal │    8.8 /hour   │ │
 │ └────┴──────────────────┴────────────────┘ │
 │    ──◇─ Current Earning Reward ─◇──        │
 │      Idle Time: 48:00:00/48:00:00          │  current in green, HH:MM:SS
 │ ┌───────────────────────────────────────┐  │
 │ │  [🍏 10.45K]   [💎 423]                │  │  item tiles, corner counts
 │ └───────────────────────────────────────┘  │
 │ ┌───────────────────────────────────────┐  │
 │      Earnings +10% (Activated)            │  the % and `(Activated)` in green
 │ └───────────────────────────────────────┘  │
 │            ┌──────────┐ •                  │
 │            │  Claim   │                    │  ORANGE, with a red dot
 │            └──────────┘                    │
 └────────────────────────────────────────────┘
```

The `(i)`'s **`- Earnings -`** block states the mechanic (`img/tower-info.png`):

> *"After clearing certain floors of any mode in the Familiar Tower, the efficiency of earnings
> will be improved."*
> *"Earnings accumulate over time. By the time of collection, the accumulated hourly earnings
> are calculated according to the current earnings efficiency."*
> *"There is a time limit for storing accumulated earnings. Once this limit is exceeded,
> earnings will no longer continue to accumulate."*

Three things that confirm Everkai's model and one that corrects the reading of the capture:

1. **"any mode"** — Challenge floors and Endless floors both raise the rate. Everkai's
   `towerIncome()` (`familiar-supplies.mjs`) adds the highest cleared Endless band's `Income`
   to the Challenge floor's `Income`, sourced to `PetManager.lua GetPetTowerIncome`. Confirmed.
2. **"calculated according to the current earnings efficiency"** — settlement multiplies the
   whole waiting period by the rate *at collection*, not hour-by-hour at historical rates.
   `suppliesWaiting()` does exactly that. Confirmed.
3. **"earnings will no longer continue to accumulate"** — the cap stalls the clock; it does not
   void what is banked. `settleSupplies()` matches.
4. **The `48:00:00` is not the base cap.** Measured:

| Key | Value | What it is |
| --- | ---: | --- |
| `System.PetTowerIncomeTime` | **24** | the storage limit, in hours |
| `System.PetTowerIncomeBPTimeMax` | **48** | the storage limit **with the Familiar Pass** |
| `System.PetTowerIncomeBPCoef` | **1000** bp | the Pass's earnings bonus = **+10 %** |
| `System.PetBPRightShow` | `Item_PetBP_IncomeMax` at `Lv: 15` | the Pass level that grants the raised cap |

`lang.json` carries both states of that line: `BPTowerRevenueBPCoef` =
*"Earnings +{value}% [color=#4B7902](Activated)[/color]"* and `BPTowerRevenueBPCoef1` =
*"Earnings + {value}% [color=#4B7902] (Not Activated) [/color]"*. **`BP` is the battle pass.**

So the captured screen shows a **Pass-holder's** tower: 48-hour cap, +10 % rate, both green.
The base game's cap is 24 hours and its bonus line reads `(Not Activated)`. Everkai's
`holdHours: 24` is correct and comes from the same key. Do **not** widen it to 48 on the
strength of this screenshot — that is precisely the number-off-a-screenshot the caveat forbids,
and it would be importing a monetisation perk as a base rule.

Recommendation for the `Earnings +n% (Not Activated)` row under the single-player design rule:
**keep the row, drop the Pass.** Everkai's habit multiplier is the natural occupant of that
slot — it is already the project's answer to "what makes the idle rate go up"
(`docs/everkai-single-player-design` equivalent). One row, two states, a number that the
player's own behaviour moves.

Other details worth copying: `PetTowerRevenueRewardDesc` renders the rate as
`[color=#47DA55]{value}[/color]/hour` — **the number is green and the unit is not**, and the
rate is shown to one decimal (`217.8`, `8.8`), because the Pass coefficient makes it
fractional. `PetTowerIncomeTip` = *"Earning unlocks after completing Floor 1."* — which is
already Everkai's string, verbatim, at `familiar-tower-panel.tsx:28`.

And the colour: **`Claim` is orange here**, where `Confirm`, `OK`, `Save` and `Quick Deploy`
are all green. A claim is a different verb from a commit, and the original colours it
differently. Worth copying.

`Claim` was not pressed — it would have destroyed the maxed state this capture exists to
record.

---

## 8 · The Floor Rewards ladder

`img/tower-rewards-ladder.png`. Opened from the `All Claimed` badge. A parchment modal titled
simply **`Rewards`**, a vertical list:

```
 ┌ ✕ ──────────── Rewards ────────────┐
 │ ╭────────╮                          │  floor tab: a RED banner clipped to the
 │ │Floor 10│                          │  card's top-left, overhanging its frame —
 │ ├────────┴─────────────────────────┐│  the same device as Dispatch's `Current Area`
 │ │ [🥚 1] [🍏 200]      Completed   ││  items left, status right
 │ └──────────────────────────────────┘│
 │ ╭────────╮                          │
 │ │Floor 20│  [🥚 1] [🍏 200]  Completed
 │ │Floor 30│  [💎 50] [🍏 200] Completed
 │ │Floor 40│  [◎ 1]  [🍏 200]  Completed
 │ │Floor 50│  …                       │
 └──────────────────────────────────────┘
```

Captured in the `All Claimed` state, so **every row reads `Completed`** and the unclaimed
states are unseen. What is known: the badge has two states (`Claimable` / `All Claimed`) and
the not-yet state is counted (`PetTowerRewardPreviewBtn` = *"{val} floors left"*). The
Handbook's parallel ladder uses `Completed` against `Not Achieved` (CAPTURE-INDEX,
`handbook-book-level.png`), which is the likeliest pair here too — but it is a guess and is
marked as one.

**The rows in the capture are floors 10, 20, 30, 40, 50 — decade spacing. Do not import that.**
A ladder's length and spacing is a table length, which the caveat rules out. `PetTower.json`
gives **all 300 floors their own `Reward` id**, and all 300 resolve in
`split_reward/reward.json`; floor 25, for instance, pays `Item_PetClassUP ×50 + Item_PetLevelUP
×200`, which a decade ladder would never show. Build the ladder from the table.

What the config does say, and what the capture cross-checks exactly:

| Floor | `Reward_PetTower_*` contents | Matches the capture? |
| ---: | --- | --- |
| 1 | 20 `Item_PetLevelUP` | — |
| 10 | 1 `Item_PetPacify1` + 200 `Item_PetLevelUP` | yes (eggs ×1 + fruit ×200) |
| 20 | 1 `Item_PetPacify1` + 200 | yes |
| 30 | 50 `Item_PetClassUP` + 200 | yes (crystal ×50) |
| 40 | 1 `Item_PetCatch2` + 200 | yes (the purple ring ×1) |
| 60, 130, 160 | a familiar (`Item_Owner_Pet_*`) + 200 | — |
| 100, 200, 300 | a familiar + 200 + 50 `Item_PetClassUP`; `IfKey: 1` (boss) | — |

**Six floors reward a familiar: 60, 100, 130, 160, 200, 300.** Three floors are bosses:
100, 200, 300 (`IfKey`). Hourly `Income` runs `[100, 0]` at floor 1 to `[187, 8]` at floor 300.
Everkai carries all of this already — `PetTower` is the most completely imported of the 28
tables (inventory §3).

Endless has no such ladder: all 23 `PetEndlessTower` rows share
`Reward_PetEndlessTower_1` = `Item_PetFeedBox ×1`, which Everkai does not model
(audit S7, catalogue E9).

---

## 9 · The Endless leaderboard — a multiplayer surface in a single-player game

`img/tower-leaderboard.png`. Reached from the trophy in the bottom bar.

```
  Endless Mode Ranking
 ┌──────────┬──────────────────────┬───────────────┐
 │   Rank   │     Player Info      │ Highest Floor │
 ├──────────┼──────────────────────┼───────────────┤
 │    🏆    │ [av] [gs0] Private   │      58       │  the row is tinted + gold-bordered
 │  (wreath)│      Village    ╭──╮ │   (green)     │  because it is yours
 │          │ [5 portraits]   │Me│ │               │  `Me` = a red tab, top-right
 │          │ lv.249 ×5       ╰──╯ │               │
 └──────────┴──────────────────────┴───────────────┘
              (the rest of the board is empty)
 ─────────────────────────────────────────────────
  My Rank: 1                      Total Floors: 58
  Real-time Leaderboard Updates      ☐ Hide our lineup
```

Every label is in `lang.json`: `ScenePetRank_mainUITop` = `Endless Mode Ranking`,
`ScenePetRank_n26` = `Highest Floor`, `ScenePetRank_n110` = `Total Floors:`,
`ScenePetRank_n113` = `Real-time Leaderboard Updates`, `ScenePetRank_n117` =
`Hide our lineup`, `UI_Pet_PanelShowItemPet_txtName` = `Player Info`.

The capture shows **one row, labelled `Me`, at rank 1, on an otherwise empty board** — the
private server has one player. In the original this is a populated, real-time, cross-player
ranking, with each entrant's five-familiar lineup on display and an opt-out for hiding yours.

**This is a design decision Everkai has to make deliberately rather than inherit.** The project
rule is explicit (`docs/everkai-single-player-design` equivalent, and the owner's standing
instruction): multiplayer features get *adapted or removed*, not ported. A leaderboard with one
row is not a leaderboard; shipping it would be inheriting the shape of a system whose content
cannot exist.

Three options, with a recommendation:

| Option | What it costs | Verdict |
| --- | --- | --- |
| **Drop the screen** | the trophy button and one dock position | loses the only place Endless progress is summarised |
| **Adapt to a personal record** — keep `Highest Floor` and `Total Floors`, keep the lineup strip (it shows *which team* set the record), drop `Rank`, `Player Info`, `Me` and `Hide our lineup` | one small panel, all data already in the save (`endlessState(s).cleared`) | **recommended.** It keeps the useful half — "this team reached floor 58" is a real record — and deletes exactly the half that requires other players |
| **Simulate rivals** | a fabricated population | no. The project does not invent opponents, and a fake board is worse than none |

Ship the adapted version under a truthful title — `Endless Record`, not `Ranking` — and note
the decision in `docs/parity-catalog.csv` E9 so it is revisitable, per CLAUDE.md rule 7.

One detail worth keeping regardless of the choice: `Total Floors: 58` and `Highest Floor 58`
are the same number on this save, so the capture does not disambiguate them. In a mode where
floors are cleared strictly in order they would always agree. Do not assume they are two
different quantities without evidence.

---

## 10 · Compared with Everkai

`app/familiar-tower-panel.tsx` is 52 dense lines rendering both modes, the income card, the
team, the skill disclosure, the floor card, the battle result and three disclosures, all on one
scrolling page.

| # | Difference | Kind |
| --- | --- | --- |
| **D-TOWER-1** | **There is no tower.** The original's entire screen is a navigable vertical stack of floors, each drawing its own state (`Completed` watermark / `Recommended` + chest / padlock-and-chain / `Please stay tuned.`). Everkai renders a `<progress>` bar labelled `175/300` and one `<article className="tower-floor">` for the next floor. Progress, history, the reward ladder's anchor and the next-floor context are all one object in the original and four unrelated widgets in Everkai. | **structural** |
| **D-TOWER-2** | Mode switching is two side-by-side `<Button>`s in a `business-actions` nav, one of which is labelled `Endless · floor 200` when locked (`:27`). The original is a single two-segment vertical pill on the right rail, and the locked mode's gate is stated on the *floors* (`PetTowerUnlockDesc2`), not in the switch's label. | **structural** |
| **D-TOWER-3** | **The Bond's third component is unimplemented.** `PetArrayAdd.Group{3,4,5}.POWER` (1000/1300/1500 bp) is on screen as `Attribute: +{val}%` and absent from `teamBond()`. It changes the tower banner, the Team screen total and Dispatch's Great Success input. | **structural**, and measured |
| **D-TOWER-4** | Enemies are a `<ul>` of sentences (`:39`, `:44`) — `Snowbear Tank · Lv. 200 · ATK 41,220 · HP 1,140,000 · SPD 380 · Frost Guard` × 5 — while the player's own team three lines above is drawn as art cards. The original never lists enemy stats as text anywhere; the pre-battle screen shows `Enemy Attribute`, one number. | **structural** (audit D4) |
| **D-TOWER-5** | The team is five `framed-card`s in a `front`/`back` `<ol>` with `<small>Front</small>` captions, plus a `<select>`, plus an `Add to tower team` button, plus a `Move to first front slot` button. The original is a draggable isometric formation with a 4-wide card picker and one `Quick Deploy`. | **structural** |
| **D-TOWER-6** | **No `Earnings` modal.** Everkai's income is an inline `tower-floor` card with two sentences and a `Collect tower items` button (`:28–30`) — and the same control is duplicated on the Training page (audit D7). The original has one modal with a rate table, a labelled idle clock, the pending items as tiles, the bonus row and one orange `Claim`. | **structural** |
| **D-TOWER-7** | **No Floor Rewards ladder.** Everkai shows only the next floor's reward, as a sentence (`:45`). The original has a scrollable ladder across the whole table with a per-row claim state and a `{n} floors left` badge on the tower screen. | **structural** |
| **D-TOWER-8** | **No Endless record / leaderboard surface of any kind** (§9). Endless progress appears only as a number inside a button label. | **structural** — and the one that needs an owner-visible decision |
| **D-TOWER-9** | `Auto mode unlocks after floor 30` is the button's own label (`:47`). Convention 8: the verb stays `Auto` and the gate becomes a padlock badge with `30` on it. The number is right (`System.PetTowerAutoUnlock`). | cosmetic |
| **D-TOWER-10** | No pre-battle coaching. The original has `Please set the team first.`, `Familiars available for the team. Go to team setup?` and `There are stronger familiars not in the team. Go to team setup?`, each with `Continue` / `Adjust Team`. Everkai disables the button and says nothing. | **structural** |
| **D-TOWER-11** | The battle result is a `<details open>` (`:49`) — a combat log expanded by default after every fight, one `<li>` per hit, dozens of lines for a 5v5 over 15 rounds. The original's battle presentation is unknown (§5), but it is certainly not this. At minimum: not `open`. | cosmetic → revisit after the battle capture |
| **D-TOWER-12** | The skill disclosure sits on the tower page instead of on the familiar (`:34`). Content correct, location wrong. | **structural** (§4) |
| **D-TOWER-13** | Three `rules-note` blocks totalling 249 words of provenance on the page (`:51`), four clauses of which the `(i)` shows are the original's published rules, not Everkai's inventions (§6). | **structural** (audit D9) |
| **D-TOWER-14** | `level-up items` / `class-up items` printed 10 times on this panel alone. The original's own Earning Rewards modal names them **Magical Fruit** and **Familiar Crystal** (`img/tower-earnings.png`). | cosmetic but pervasive (audit §3.4, Q10 — **answered by this capture**) |
| **D-TOWER-15** | The tower-redo notice is a permanent paragraph on the page (`:50`). It is a one-time migration message and belongs in a dismissible notice. | cosmetic |
| **D-TOWER-16** | Everkai says `Team Power`; the original says `Attribute` throughout — `Current Attribute`, `Enemy Attribute`, `Attribute: +{val}%`. | cosmetic (but pick one word for this and Dispatch together) |
| **D-TOWER-17** | Units in Everkai start combat at `rage: 0`; the `(i)` says *"Each familiar begins combat with initial Rage."* | **structural** in effect — it changes when every skill first fires. No magnitude is published, so this is a flagged gap, not a fix |

---

## 11 · What Everkai should render

```
(i) Familiar Tower
 ╔═══════════════════════════════════════════════╗
 ║          Please stay tuned.        ┌────────┐ ║   ← only past the last floor
 ║ ◈ Floor 300 ◈                      │Rewards │ ║
 ║            Completed               │Claimable│║   ← `All Claimed` when none left
 ║ ◈ Floor 299 ◈                      └────────┘ ║      `{n} floors left` as the sub-caption
 ║            Completed                          ║
 ║ ◈ Floor 176 ◈  [chest]  ◈ Recommended ◈       ║   ← the current floor, anchored on open
 ║ ◈ Floor 177 ◈  ⛓───🔒───⛓                     ║   ← locked: chain across the platform
 ║                                    ╔════════╗ ║
 ║                                    ║Challeng║ ║   ← mode pill, one lit segment
 ║                                    ╟────────╢ ║
 ║                                    ║Endless ║ ║
 ║                                    ╚════════╝ ║
 ║                                    [ Auto 🔒30]║
 ║        Current Attribute  ◎ 4.294M            ║
 ║  [Team]      [  Challenge  ]      [Earnings •]║
 ╚═══════════════════════════════════════════════╝
      «                            ★ Endless Record
```

Team → isometric formation, drag to reorder, `?` → the three-rung Bond ladder with **three**
lines per rung, 4-wide picker, `Quick Deploy`.
Earnings → the modal in §7, with `Earnings +n%` sourced to the habit multiplier.
Rewards → the ladder in §8, **built from all 300 `PetTower` rows**.
Endless Record → §9's adapted panel.

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Floor stack, per-floor state | `towerState(s).cleared`, `TOWER_FLOORS` | **yes** (the data); **no** (the rendering) |
| Floor art / platform | `PetTower.UIBG` (`Bg_Pet_Tower_1/2/3`, `_Boss_1/2/3`) | **no** — 6 backgrounds |
| `Completed` / `Recommended` / chain / `Please stay tuned.` | the four strings are in `lang.json` | **derivable** |
| Reward badge state + count | `{n} floors left` = unclaimed rows below `cleared` | **derivable** — but Everkai pays floor rewards on clear and stores no per-floor claim flag beyond `prepaid`. A ladder with a claim state is a **save change**; a read-only "what each floor paid" ladder is not. Prefer read-only |
| Mode pill | `endlessOpen = t.cleared >= ENDLESS_OPEN` | **yes** |
| `Auto` gate badge | `TOWER_AUTO_UNLOCK` = 30 | **yes** |
| `Current Attribute` | the same function `08-dispatch.md` calls team Attribute | **yes** (`dispatchTeamPower` generalised) — and it must pick up the Bond's `POWER` (D-TOWER-3) and `PetAttr`'s `CRIT`/`Block` (`08-dispatch.md` §8) |
| Formation positions + drag | 5 ordered slots | **partly** — `towerParty` is an ordered array; drag-to-reorder is new UI |
| Bond ladder, 3 rungs × 3 lines | `PetArrayAdd` Group3/4/5 `{ATK, HP, POWER}` | **partly** — `ATK`/`HP` only; add `POWER` |
| Type medallion per slot | `PetGroup` (4 rows) + icons | **no** — `countryIcon()` returns null for the four familiar types (audit D5) |
| Earnings rate rows, one decimal | `towerIncome(s)` | **yes** |
| Idle clock `HH:MM:SS` / cap | `familiarSupplies(s).since`, `holdHours` = 24 | **yes** |
| Pending items as tiles | `suppliesWaiting()` | **yes** |
| `Earnings +n%` row, two states | habit multiplier (Everkai's own) | **derivable** |
| Floor rewards ladder | `TOWER_DATA.floors[*].reward`, all 300 | **yes** |
| Endless record | `endlessState(s).cleared`, `t.party` snapshot | **yes** |
| Battle presentation | — | **not captured** (§5). Do not build against a guess |
| Enemy `Power` / `Enemy Attribute` | `PetTowerArray.Power`, `PetEndlessTowerPool.Power` — **authored, read verbatim** | **yes**, imported; never composed (§6) |

---

## 12 · Prose to delete, and what replaces it

Everkai's tower panel carries roughly **420 words** of running prose plus two list-rendered
text walls. The original's tower screen carries **zero** — every word is behind the `(i)`, and
the `(i)`'s three sections come to about 230 words for the *whole system*, Endless and combat
included.

| Delete | Replace with |
| --- | --- |
| `rules-note` ¶1 — *"All 300 floors come from the original tower table: each floor's enemy familiars with their own level, Attack, Health and Speed, its one-time Challenge reward…"* (~95 words) | the floor stack itself (every claim in that paragraph is a thing the stack and the reward ladder *show*), plus the `(i)`'s `- Challenge Rules -` block in the original's own four sentences |
| `rules-note` ¶2 — *"Local and flagged: battles use Everkai's combat engine (Speed order, up to 15 rounds, Rage fills by 25 when attacking or hit, higher remaining Health wins, ties lose)…"* (~90 words) | the `(i)`'s `- Combat Rule -` block, verbatim — **because four of those five clauses are the original's own published rules** (§6). What is genuinely local (Rage +25, initial Rage, the tie rule) is a module-header note, not player copy |
| `rules-note` ¶3 — *"Endless Mode opens after floor 200. Its bands, enemy pool, level rule and hourly income … are Everkai's own repeatable rule, because the original chose them on its server."* (~65 words) | `PetTowerUnlockDesc2` on the locked Endless floors (*"Unlocks after completing Challenge Mode Floor 200"*); the bot-draw provenance stays in `lib/familiar-tower.mjs:159` where it already is |
| `187 level-up + 8 class-up items an hour, held up to 24 hours.` | the Earnings modal's rate table: two icon rows, `217.8 /hour` with the number in green |
| `Floor 214 raises it to 188 + 8.` | `187 » 188` in gold (Family convention 13 — `»` is the future tense) |
| `18,400 level-up · 260 class-up in store · 4,400 + 180 waiting` | `Idle Time: 12:31:07/24:00:00` plus the two pending item tiles |
| `Earning unlocks after completing Floor 1.` | **keep** — it is `PetTowerIncomeTip`, the original's own string, already exact |
| The enemy `<ul>` — `Snowbear Tank · Lv. 200 · ATK 41,220 · HP 1,140,000 · SPD 380 · Frost Guard` × 5 | nothing on this screen. The original shows `Enemy Attribute`, one number, and only on the battle screen |
| `First clear: 120 level-up + 5 class-up + 1 Advanced Contract` | reward item tiles with corner counts, in the ladder and on the current floor's chest |
| `Auto mode unlocks after floor 30` (as the verb) | `Auto` with a padlock badge reading `30` |
| `Floor 200 opens Endless Desert for exploring. Floor 300 rewards Eldwyrm.` | milestone markers on the floor stack — the stack is where a future floor belongs |
| `Bond: 3 Cool · +10% ATK and HP` as an `item-status` line | lit type medallions on the formation tiles, and the three-line `Bond` modal behind the `?` — **with the `Attribute: +10%` line the current text omits** |
| `Contract a familiar first: choose a starter on the Familiars page.` | empty formation tiles (convention 9) |
| `This familiar uses a local double-damage Rage strike; its original skill is not implemented.` | the familiar's own attack name and nothing else; the 192 `PetSkill` rows are the fix, and the gap is already recorded in the catalogue |
| `Tower redo: your village had reached floor 175 before the full tower existed…` (47 words, permanent) | a one-time dismissible notice |
| `<details open>` battle log, one `<li>` per hit | pending the battle capture (§5): at minimum closed by default, and summarised as an HP bar per unit |
| `Endless · floor 200` as a button label | the mode pill, with the gate stated on the locked floors |

---

## 13 · What was not captured, and what stays open

| Thing | Why, and what it would take |
| --- | --- |
| **The battle screen and its result modal** | `Challenge` advances the owner's real floor. This is the largest single hole in this spec (§5). One press on a save whose floor may advance. |
| **The current-floor view** (`Recommended` ribbon + reward chest) | Seen on first entry and lost to a naming error; the list then auto-anchored to the next locked floor and would not scroll back (CAPTURE-INDEX). Re-capturable in seconds on a fresh entry. |
| **Challenge mid-climb** | The save is exhausted at the ceiling, so the *normal* Challenge screen — a current floor with floors above it locked — was never seen in Challenge mode. `img/tower-floors-locked.png` shows the equivalent in Endless, and the `(i)` says the modes follow the same rules. |
| **Endless at its gate** | The save is past 200, so the pre-unlock Endless screen (`PetTowerUnlockDesc2` on every floor) was not seen. |
| **`Auto` running** | Not pressed. No cost is named in any string or `System` key; `PetTowerAutoLoadTime` = 3 is its pacing. Treat "Auto is a spend" (CAPTURE-INDEX) as unconfirmed — the evidence points to free-after-floor-30. |
| **`Claim` pressed** | Would have destroyed the capped 48:00:00 state the modal was captured for. |
| **`Quick Deploy`, dragging the formation** | Both rewrite the owner's saved team. |
| **The unclaimed states of the Rewards ladder** | Captured at `All Claimed`. `Claimable` and `{n} floors left` are known as strings; the row treatment is not. |
| **A populated leaderboard** | Impossible on a one-player server, and irrelevant — §9 removes the surface rather than reproducing it. |
| **The upper mode-pill caption** | Illegible at 270 × 480. Read it off the device before labelling the control. |
