# 12 · The monetisation shell — Shop, Pass, Daily Offer, Benefits Card

> **Source caveat.** Captured from a replacement server's reimplementation. Screens, flows,
> controls, wording and layout are good evidence. Numbers, costs, drop rates and schedules
> are **not** — take those from `.../apk-audit/configs/config/logic` and
> `.../private-server/readable/*.lua`.

Images: `img/shop-main.png`, `img/shop-scrolled.png`, `img/shop-switched.png`,
`img/pass-getexp.png`, `img/bundle-realmoney.png`, `img/benefits-card.png`, `img/hub.png`,
`img/hub-info-1.png`, `img/hub-info-2.png`, `img/tower-earnings.png`

Tables: `ExchangeShop` (177 shop headers), `ScoreExchange` (4,059 rows, the shared stock table),
`Item`, `System.PetBPID`, `System.PetBPRightShow`, `System.PetExploreEnergyMax{,BP}`,
`System.PetExploreEnergyTime{,BP}`, `System.PetTowerIncomeBPCoef`,
`System.PetTowerIncomeBPTimeMax`, `PetLotteryConfig`, `PetLotteryShop`.
Everkai: **none of it**, deliberately — and this spec's main job is to keep it that way while
salvaging the two pieces that are worth having.

---

## 0 · This spec's job is to say what not to build

Everkai is an offline single-player PWA with no accounts, no server and no real-money anything.
Four of the Familiar hub's nine destinations are commerce surfaces, and two of them are not even
familiar-specific. A parity project's default instinct — *it is in the original, so spec it* —
produces four screens here that would each be actively wrong to ship.

So this spec is organised backwards from the others: **§2 is the do-not-build list**, and §5 is
the short list of mechanics inside these surfaces that are worth keeping, detached from the
commerce they were attached to.

One capture on this page is a **real-money purchase screen** at $0.99 / $2.99
(`img/bundle-realmoney.png`). It was opened and **nothing inside it was touched**. It is recorded
here as evidence of the *shape* of the surface — what it occupies, what it interrupts, how it is
badged — and explicitly **not** as something to reproduce.

---

## 1 · The structural fact: three of nine

The hub's own `(i)` (`img/hub-info-1.png`, `img/hub-info-2.png`) is the design's self-description,
and it lists **three** headings:

1. Making Contracts with Monsters
2. Familiar Development
3. Familiar Tower

Nine top-level destinations hang off the hub scene. The manifest names three of them. The other
six — Dispatch, Handbook, Pass, Shop, Familiar Daily Offer, Benefits Card — are absent from the
game's own account of what the Familiar system *is*.

```
Familiar hub (img/hub.png)
├── Familiar Dispatch   ┐
├── Familiar Growth     ├─ three labelled BUILDINGS on the scene
├── Familiar Tower      ┘     (2 of 3 in the manifest)
├── Explore             ─ large circular button, bottom-right, red !     (manifest 1)
├── Pass                ┐
├── Familiar Daily Offer├─ three small circular buttons, bottom-LEFT action row
├── Benefits Card       ┘     ← COMMERCE, and the row is a strip of
│                              sparkle-badged art with names under it
├── Handbook            ┐
└── Shop                ┘  bottom BAR, two items, right-aligned   ← one of these is commerce
```

Read the layout as the design's own priority ordering and it is unambiguous: the three manifest
systems are *architecture* (buildings you walk to), Explore is the single largest control on the
screen, and the commerce sits in a **row of small circular buttons at the bottom-left, squeezed
under a Pass-progress plaque that overlaps them.** They are not part of the place; they are
stapled to its edge.

**That ordering is the one thing on this whole page Everkai should copy**, by simply not having
the bottom-left row.

### The Pass plaque, and why it is on the scene at all

`img/hub.png` carries, hovering over the action row:

```
 ┌──────────────────────────────────────────┐
 │ ▣  Complete Familiar Tower in            │  portrait cap, left
 │    Challenge Mode 10 times.              │  the task, two lines
 │         301/10        ✓                  │  progress, green, with a tick
 └──────────────────────────────────────────┘
```

A Pass task, its progress and its completion tick, rendered **on the hub scene**, partially
occluding the three commerce buttons beneath it. The owner's count is 301 against a target of 10.
This is the Pass advertising itself inside the room, which is the standard pattern and the reason
the action row is where it is.

---

## 2 · The four surfaces, and the disposition of each

### 2.1 Familiar Shop — **one tab of a shared shell**

`img/shop-main.png`, `img/shop-scrolled.png`, `img/shop-switched.png`.

A parchment panel titled `Familiar Shop`, `✕` tab, with a **single currency chip** top-left and a
3-wide grid of stock tiles. Each tile: item name as a header strip, framed art, `Limit: n`, and a
green price button carrying the currency's gem glyph and the number. Discounted rows wear a red
starburst badge over the art's top-left corner. Sold-out rows grey their price button.

```
 ┌         Familiar Shop                    ✕ ┐
 │ ◈ 1T                                       │  currency, top-left
 │ ┌──────────┐┌──────────┐┌──────────┐      │
 │ │Advanced  ││Advanced  ││Advanced  │      │  name strip
 │ │Contract  ││Contract  ││Contract  │      │
 │ │ ✸  art   ││ ✸  art   ││    art   │      │  ✸ = discount starburst
 │ │ Limit: 1 ││ Limit: 2 ││ Limit: 5 │      │
 │ │[◈  500 ] ││[◈ 2500 ] ││[◈ 5000 ] │      │  price INSIDE the button
 │ └──────────┘└──────────┘└──────────┘      │
 │  … Ordinary Mochi ×2 · Basic Incense …    │
 │  … Basic Metamorphixir · Advanced Contract │
 │                            ╭────────────╮  │
 │                            │Switch Shop │  │  a paper TAB, bottom-right,
 └────────────────────────────╰────────────╯──┘  clipped to the panel edge
```

**`Switch Shop` is the finding.** `img/shop-switched.png` shows what it opens — a plain dark list
of the game's other shops:

```
 ┌   Switch Shop   ┐
 │ Drakenberg Challenge Shop │
 │ Golemore Mine Shop        │
 │ Trading Post Shop         │
 │ Banquet Shop              │
 │ Wish Shop                 │
 │ Alraune's Shop            │
 └───────────────────────────┘
```

Six sibling shops, none of them familiar-related. **The Familiar Shop is not familiar UI.** It is
one instance of a generic shop shell parameterised by a shop id, and the config confirms it
exactly: `ExchangeShop.json` is a registry of **177 shop headers**, of which one is

```
{ "_id": "PetShop", "currencyId": "4", "iconPkg": "Shop", "sort": 11, "isRoutine": 1 }
```

and the stock lives in the shared `ScoreExchange.json` (4,059 rows) filtered by `shopId`.

**Disposition: do not spec this as a familiar screen.** If Everkai ever builds a shop, it builds
*a* shop shell and the Familiar Shop is a tab of it — which is also what capture observation 9
concluded. See §5.1 for the one thing inside it that is worth having now.

### 2.2 Familiar Pass — **a subscription ladder; only the Get EXP screen was captured**

Reached from the leftmost circular button on the hub action row. **The Pass ladder itself is not
among the captures** — the index lists exactly one Pass image, `img/pass-getexp.png`, the
`Get EXP` → `Periodic Tasks` list. Do not write the ladder from the tree diagram's one-line
description of it; it was not photographed.

`img/pass-getexp.png` is a parchment sheet, `Periodic Tasks`, `✕` tab, five rows:

| Element | Treatment |
| --- | --- |
| Row | Framed task icon with a small level number on it, task text in bold, `Got n Exp` beneath with **n in orange** |
| Action | A gold `»` chevron button, right-aligned — navigates to the task, it is not a claim |
| Footer | One gold italic line: *"\*When tasks are completed, Battle Pass EXP will be automatically added."* |

The five tasks, verbatim: `Explore 1 times to find Familiars.` · `Obtain 1 N quality Familiars.`
· `Obtain 1 R quality Familiars.` · `Obtain 1 SR quality Familiars.` ·
`Obtain 1 SSR quality Familiars.`

Note what those five tasks are: **the Explore loop, five times over, graded by outcome rarity.**
The Pass is not a parallel system; it is a meter attached to the thing the player was already
doing, which is why it advertises itself on the hub scene.

**The Pass's actual benefits are measurable, and they are the important part.**
`System.PetBPRightShow` lists what it unlocks and at which Pass level:

| Pass Lv. | Item | `Item:description:`, verbatim |
| ---: | --- | --- |
| 1 | `Item_PetBP_EnergyMax` — **Super Stamina** | *"In the Familiars game, increases the max stamina from 20 to 50 and shortens the stamina recovery time per point from 1.5 hours to 1 hour."* |
| 15 | `Item_PetBP_IncomeMax` — **Super Earnings** | *"In the Familiar Tower game, permanently increases earnings by 10% and extends the max earnings storage time from 24 hours to 48 hours."* |
| 30 | `Item_PetBP_PetPacifyDaliy` — **Daily Reward** | *"Allows you to claim an Ordinary Mochi daily from the Familiars game's main menu."* |
| 50 | `Item_Owner_Hero_161` | a Fellow |

Corroborated by the `System` keys themselves, both halves from the config set (rule 1):

```
PetExploreEnergyMax      20     →  PetExploreEnergyMaxBP      50
PetExploreEnergyTime   5400 s   →  PetExploreEnergyTimeBP   3600 s
PetTowerIncomeTime       24 h   →  PetTowerIncomeBPTimeMax    48 h
                                   PetTowerIncomeBPCoef     1000  (+10 %)
```

**So the Familiar Pass sells a 2.5× stamina cap, a 1.5× regeneration rate, +10 % tower income and
a 2× idle-storage window.** Every one of those is a direct multiplier on the two loops spec 10 and
the Tower spec describe.

**This has a consequence Everkai must not get wrong.** The owner's captures show `⚡ 50/50` on the
Explore screen (`img/explore-after.png`) and `Idle Time 48:00:00/48:00:00` with
`Earnings +10% (Activated)` on the Tower (`img/tower-earnings.png`). **Those are Pass-boosted
values, not the original's base values.** The base is 20 stamina at 90 minutes a point and 24
hours of tower storage. Everkai's `lib/familiar-explore.mjs` already uses the base numbers (20,
5,400 s) and is correct as it stands — do not "fix" it to match a screenshot.

**Disposition: do not build the Pass.** See §5.2 for what to do with the four benefits instead.

### 2.3 Familiar Daily Offer — **real money, recorded not reproduced**

`img/bundle-realmoney.png`. Reached from the centre circular button on the hub action row.

A full-panel sheet headed by a banner illustration of two familiar-adjacent characters, titled
`Familiar Bundle`, `✕` tab. Beneath it, a vertical stack of offer rows:

```
 ┌  [ Familiar Bundle  banner art ]           ✕ ┐
 │ ┌──────────────────────────────────────────┐ │
 │ │ Advanced Contract Special Offer  Value ▸ │ │  name strip + a "Value n%"
 │ │                                  Limit: 1│ │  badge on a gold tab
 │ │ [art][art][art]        ┌──────────┐      │ │  contents as item tiles
 │ │                        │  $0.99   │      │ │  GREEN button, PRICE IN USD
 │ │                        └──────────┘      │ │
 │ │                          VIP EXP +99     │ │  a second currency, orange
 │ └──────────────────────────────────────────┘ │
 │ ┌ Familiar Material Chest …  $2.99 · +299 ┐ │
 │ ┌ Advanced Contract Special Offer II …     ┐ │
 │        Purchase limit resets every day.      │  red, centred
 └──────────────────────────────────────────────┘
```

Three structural notes, which are the only reason this screen is in the spec at all:

1. **The green primary button holds a real currency amount.** Everywhere else on this surface the
   green button holds a soft-currency cost with an icon (`◈ 500`, `Advance 6878/3000`). Here the
   same component holds `$0.99`. The visual grammar is deliberately identical.
2. **`Value 8750%`** — a per-row badge asserting the bundle's worth as a percentage. It is the
   only number on the Familiar surface that is a *claim* rather than a state.
3. **`VIP EXP +99`** — a purchase pays into a second progression track that is not the Pass and
   not the Benefits Card. A third meter.

**Disposition: build nothing. There is no adaptation of this surface.** A real-money bundle in an
offline single-player game with no payment rail is not a mechanic that can be reinterpreted; it is
a mechanic whose entire content is the transaction. Its *contents* (Advanced Contracts, material
chests) are items Everkai already grants from play.

### 2.4 Benefits Card — **global, not familiar, and it merely mentions the familiars**

`img/benefits-card.png`. Reached from the right circular button on the hub action row — and it
**leaves the Familiar surface entirely.** The screen has its own bottom bar of four:
`Benefits · Benefits Card · Recharge Rebate · Pass`. None of those four is familiar-specific.

```
 ┌ [Monthly Pass][Yearly Pass]            ( Shop )┐  top tabs + a Shop button
 │ ┌ Monthly Pass (Free) ─────────────────────┐   │
 │ │ ◆ Claim 1-hour Global Earnings for free  │   │  ┌───────┐
 │ │ ◆ Get a Privilege Coin for free daily    │   │  │ Claim │
 │ └──────────────────────────────────────────┘   │  └───────┘
 │ ┌ Monthly Pass ────────────────────────────┐   │
 │ │ ⏱ 74 day(s) 18 hr(s)                     │   │  a running subscription
 │ │ ◆ Monthly Pass Exclusive 6 Benefits      │   │
 │ │ ◆ 2 extra hours of Global Earnings       │   │
 │ │   ◇ Apothecary Idle Earnings             │   │
 │ │   ◇ Familiar Tower Idle Earnings   ◄─────┼───┼── the ONLY familiar line
 │ │   ◇ Fishing Baits                        │   │
 │ │   ◇ Museum Operation Rewards             │   │
 │ │   ◇ Expo Idle Rewards                    │   │
 │ │ ┌ Obtain Now ┐ ┌ Daily Claim ──────────┐ │   │
 │ │ │ [✓][✓]     │ │ [item][item][item]    │ │   │
 │ │ └────────────┘ └───────────────────────┘ │   │
 │ │     ( Renew )          ( Claim )         │   │  two primaries
 │ └──────────────────────────────────────────┘   │
 └────────────────────────────────────────────────┘
   Benefits · Benefits Card · Recharge Rebate · Pass   ← a whole commerce dock
```

`Familiar Tower Idle Earnings` is **one bullet in a six-item list** of idle systems the monthly
subscription touches. The Familiar hub links to it because the subscription happens to boost one
familiar system, not because it is a familiar feature.

**Disposition: build nothing, and note the hub link as a mis-attribution.** If Everkai's hub ever
gets an action row, this is not on it.

---

## 3 · The gacha, which was not reached and should not be

Two tables sit behind surfaces this capture never opened, and both are worth naming so nobody
"discovers" them later and specs them by accident:

| Table | Rows | What it is | Reader |
| --- | ---: | --- | --- |
| `PetLotteryConfig` | 11 | Eleven gacha **banners**: featured pet, PRD id, first-time dialog, a 2048-minigame hook, `rankEndType` | `Doc/Player/PetLotteryManager.lua`, both exchange-shop scenes |
| `PetLotteryShop` | 21 | The gacha **exchange shop**: 18 core pets, `exchangeReward`, three `exchangeItem` currencies, `shineTime`, `rarity`, `showCondition` | `ScenePetExchangeShop.lua`, `ScenePetLotteryExchangeShop.lua`, `ScenePetLotteryEntry.lua` |

**`PetLotteryShop` is not the Luck Flower.** The familiar lottery a player actually meets is
`PetExploreLottery`, an exploration encounter (spec 10 §4.2) that charges nothing. `PetLotteryShop`
is the crossover-acquisition gacha, with its own token currencies
(`Item_PetLottery_Token`, `Item_PetLottery_FairyTail_Token`, `Item_PetLottery_TenSuraS2_Token`,
and the matching `*_FoodCoin` rows in `Item.json`). Anyone searching "the familiar lottery" will
find this one first; it is the wrong one.

**Disposition: do not build.** Per the single-player design rule, multiplayer and monetised
features get adapted or removed. There is nothing in a banner-and-pity gacha to adapt: its entire
mechanic is a paid random draw against a ceiling the config set does not even contain (the `Pet*`
tables carry no ceiling table — control: the same `ls` pattern returns 19 ceiling/PRD tables for
other systems).

**The one thing `PetLotteryShop`'s 21 rows are still good for** is documentary: they are the only
place in the config set that states the acquisition terms of 18 crossover familiars. If Everkai
needs to decide how a crossover familiar is obtained offline, that table is the evidence of what
it replaced — read it, do not implement it. This is already noted in
`docs/familiar-data-inventory.md` §7 item 8.

---

## 4 · Compared with Everkai

Everkai has no shop, no pass, no bundle, no subscription and no premium currency. There is
nothing to diff, so this table is a list of *pressures* — places where the absence of these
surfaces has left a loose end in the shipped game.

| # | Difference | Kind |
| --- | --- | --- |
| M1 | **Familiar Tears have no sink.** `Item_PetExploreRunCoin` is collected from three sources and spendable nowhere (audit **S4**, **S5**). The item's own description says where it is meant to go: *"Dropped when a familiar runs away. Collect enough to exchange for rewards in the Familiar Shop."* Everkai prints that sentence and then appends `· the Familiar Shop is not built yet`. | **structural** — see §5.1 |
| M2 | Everkai has **no premium currency**, so every gem-priced row in `ScoreExchange`'s `PetShop` block is unbuildable as written, and so is the reward half of the Compendium ladder (spec 11 §1). | **structural**, and correct as-is |
| M3 | Everkai's Explore uses the **base** stamina numbers (20 cap, 5,400 s). The captures show the Pass-boosted 50/3,600. Nothing is wrong today; the risk is a future "parity fix" against a screenshot. | not a defect — **a trap, flagged** |
| M4 | Everkai's Tower holds income for **24 hours** (`System.PetTowerIncomeTime` = 24) and pays no `+10%`. The captures show 48 h and `Earnings +10% (Activated)`. Same trap as M3, on the other loop. | not a defect — **a trap, flagged** |
| M5 | Two "not built yet" apologies ship on a player's screen (`app/familiar-explore-panel.tsx:28`), one of them pointing at a shop that, per §5.1, Everkai could partly have. | cosmetic (audit **D9**), and the prose goes either way |
| M6 | The hub's commerce row has no Everkai equivalent, and should not get one. Everkai's Familiar Hall dock is four entries; the original's nine destinations include four commerce surfaces. **Everkai's smaller surface is the better one here** — record that as a deliberate divergence, not a gap. | **not a gap** |

---

## 5 · What is worth keeping

Two things, and they are both *mechanics detached from the commerce they were bolted to*.

### 5.1 The Familiar Shop's one soft-currency row — a real sink, fully tabled

The Familiar Shop's stock is measurable. From `ScoreExchange.json`, filtered to
`shopId: "PetShop"` and `"PetRefreshShop"`, with each `reward` resolved through
`split_reward/reward.json`:

| Row | Price | `Limit` | Grants |
| --- | --- | ---: | --- |
| `PetShop_1` | `4` × 500 | 1 | `Item_PetCatch2` (Advanced Contract) |
| `PetShop_2` | `4` × 2,500 | 2 | `Item_PetCatch2` |
| `PetShop_3` | `4` × 5,000 | 5 | `Item_PetCatch2` |
| `PetShop_4` | `4` × 150 | 3 | `Item_PetPacify1` (Ordinary Mochi) |
| `PetShop_5` | `4` × 750 | 10 | `Item_PetPacify1` |
| `PetShop_6` | `4` × 1,250 | 1 | `Item_PetAssign1` (Basic Incense) |
| `PetShop_7` | `4` × 500 | 10 | `Item_PetRefresh1` (Basic Metamorphixir) |
| **`PetShop_8`** | **`Item_PetExploreRunCoin` × 100** | **1** | **`Item_PetCatch2`** |
| `PetShop_9` | `4` × 100 | 3 | `Item_PetRefresh1` *(shop id `PetRefreshShop`)* |
| `PetShop_10` | `4` × 500 | 10 | `Item_PetRefresh1` *(shop id `PetRefreshShop`)* |

Item `4` is **Crystal** — `Icon_Diamond_Big`, *"An extremely valuable and precious ore that can be
used to purchase all sorts of items."* The premium currency. Nine of the ten rows are priced in
it and are therefore out of scope.

**`PetShop_8` is not.** It is priced in **Familiar Tears**, the currency a player earns by having
a monster flee — and it buys an Advanced Contract, the item that would have stopped the monster
fleeing. That is a complete, self-contained, table-backed loop:

> fail at catching things → accumulate Tears → convert Tears into a better chance of not failing.

It needs no shop shell, no premium currency, no `Switch Shop` and no grid. It is **one exchange**,
and it closes audit finding **S4/M1** — the dangling currency — with a price that comes from the
original's own table rather than from anyone's judgement.

**Recommendation: build `PetShop_8` and nothing else from this screen.** Put it where the Tears
are earned, not behind a shop button: the encounter's flee outcome already tells the player they
got Tears; an exchange affordance on the contract carousel (or in the Explore item stack) is the
natural home. If the owner later wants a shop, it is a shop *shell* across Drakenberg, Golemore,
Trading Post, Banquet, Wish and Alraune — a separate slice, and not this one.

Note the `Limit: n` column, which is per-row and real. In the original it resets on a schedule the
config set does not state; offline, the honest reading is "per reset period" and the period is an
owner/pacing decision, not a measurement. Flag it rather than inventing a timer.

### 5.2 The Pass's four benefits — as progression, not as a subscription

The Pass sells four multipliers (§2.2). Everkai cannot sell them and should not simply grant them
— granting all four would silently 2.5× the stamina cap and +10 % the tower's income, and per
CLAUDE.md rule 12 the tower income figure is exactly the kind of derived value a save may already
encode.

But three of the four are good *progression* rewards, and the original has already told us the
shape: they arrive at Pass levels 1, 15 and 30, i.e. **staged, not all at once**, and the Pass's
own tasks (§2.2) are the Explore loop graded by rarity. Re-attach the same four benefits to the
thing the player was already doing:

| Benefit | Config keys | Suggested Everkai gate |
| --- | --- | --- |
| Stamina cap 20 → 50, regen 90 → 60 min | `PetExploreEnergyMax{,BP}`, `PetExploreEnergyTime{,BP}` | a Compendium-level or contracted-count milestone — the Handbook (spec 11) is the collection meter this surface lacks |
| Tower income +10 %, storage 24 h → 48 h | `PetTowerIncomeBPCoef`, `PetTowerIncomeTime`, `PetTowerIncomeBPTimeMax` | a Tower floor milestone; the Tower already gates `Auto` at floor 30 and Endless at 200 |
| A daily Ordinary Mochi | `Item_PetBP_PetPacifyDaliy` | Everkai's existing daily/habit loop — it already has one, which is the single-player design rule's whole premise |
| A Fellow at Pass Lv. 50 | `Item_Owner_Hero_161` | **skip.** A Fellow grant is a roster decision, not a familiar one |

**This is a recommendation, not a measurement**, and it is flagged as such: the *magnitudes* are
the original's and must be used verbatim, but the *gates* are Everkai's and will need the
marking discipline §5.2 of the implementation audit already applies everywhere else on this
surface. Per rule 9 it goes to the owner batched with a recommendation, and work proceeds on it
unless they object.

**Do not implement these before the owner has seen M3/M4.** The base-vs-boosted distinction is
the load-bearing fact, and getting it backwards would make Everkai's Explore and Tower
permanently generous against the original.

---

## 6 · What Everkai should render

Nothing on this page, with one exception.

```
  ✗  Familiar Shop panel + grid + Switch Shop
  ✗  Familiar Pass ladder, Periodic Tasks, Get EXP
  ✗  Familiar Daily Offer / Familiar Bundle
  ✗  Benefits Card, Monthly/Yearly Pass, Recharge Rebate
  ✗  PetLotteryConfig banners, PetLotteryShop gacha exchange
  ✗  a hub action row to hold any of the above
  ✗  VIP EXP, Privilege Coins, "Value n%" badges, any USD anywhere

  ✓  ONE exchange: Familiar Tears ×100 → 1 Advanced Contract   (ScoreExchange PetShop_8)
  ~  The Pass's four benefits, re-gated onto play milestones   (owner decision, §5.2)
```

### Data each element needs

| Element | Data | Everkai has it? |
| --- | --- | --- |
| Tears → Advanced Contract exchange | `ScoreExchange` `PetShop_8`: 100 × `Item_PetExploreRunCoin` → 1 × `Item_PetCatch2` | **yes, both sides** — both items are already in `HELD_ITEMS` (`lib/familiar-explore.mjs`); only the exchange is missing |
| `Limit: n` on that exchange | `ScoreExchange.limit` = 1 | **yes**; the *reset period* is not in the config set — flag it, do not invent it |
| Stamina cap / regen, base | `System.PetExploreEnergyMax` 20, `…Time` 5,400 s | **yes, and already correct** |
| Stamina cap / regen, boosted | `System.PetExploreEnergyMaxBP` 50, `…TimeBP` 3,600 s | **no** — and only if §5.2 is approved |
| Tower storage / income, base | `System.PetTowerIncomeTime` 24 | **yes** |
| Tower storage / income, boosted | `System.PetTowerIncomeBPTimeMax` 48, `…BPCoef` 1000 | **no** — and only if §5.2 is approved |
| Crystal-priced stock | item `4` | **no, and should stay no** |
| Gacha banners and exchange | `PetLotteryConfig`, `PetLotteryShop` | **no, and should stay no** — keep the 21 rows as documentation of crossover acquisition terms |

---

## 7 · Prose to delete, and what replaces it

The commerce surfaces contribute no prose to Everkai because Everkai has no commerce surfaces.
What they contribute is **two apologies for their own absence**, both shipping today.

| Delete | Replace with |
| --- | --- |
| `app/familiar-explore-panel.tsx:28` — `Familiar Tears ×14 · Dropped when a familiar runs away. Collect enough to exchange for rewards in the Familiar Shop. · the Familiar Shop is not built yet` | the item's chip with its count in the Explore counter stack (spec 10 §1.1), plus the §5.1 exchange affordance. Once the exchange exists the sentence has nothing left to apologise for; until it does, the chip alone is more honest than a sentence pointing at a screen that will never exist |
| `app/familiar-explore-panel.tsx:28` — `Basic Metamorphixir ×3 · kept for Metamorphosis, not built yet` | the item's chip with its count. "Not built yet" is a repo fact and belongs in `docs/parity-catalog.csv` E7, where it already is (audit **D9**) |
| Any future sentence explaining why Everkai has no shop, pass or bundle | **nothing on any screen.** This file is that explanation. A single-player game does not tell the player what it chose not to sell them |
| `lib/familiar-explore.mjs`'s `NOT MODELLED:` header line, for the shop half only | keep the header, but once §5.1 lands, amend it: the shop is not unmodelled, it is **deliberately reduced to one exchange**, and the reason is this spec |
