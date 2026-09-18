# Crossover storylines, the unlock path, and character types

Planning only. Nothing here is implemented. 163 crossover Fellows (95 Marvel, 68 Star Wars) are
built and sitting in the scratchpad; two of them (`xover_msf_spiderman`, `xover_swgoh_vaderduelsend`)
already ship on the `crossover` branch behind `?crossover=1`. This document says how the other 161
arrive, what it costs in habit completions, what type each of the 163 gets, and what breaks if the
numbers are changed carelessly.

Every number below is either cited to `file:line` or labelled **LOCAL** — a balance choice stated
here so it can be argued with rather than discovered in the code, in the style of
`lib/event-data.json`'s `localNumbers` note.

---

## 1. What exists today, measured

### 1.1 The eight Isekai arcs

`lib/events.mjs:18-29` exposes `EVENTS` from `lib/event-data.json`. An arc is a flat list of stages;
a stage hands over exactly one cast member. Measured from the data file:

| Arc id | Stages | Name | Source franchise |
|---|---|---|---|
| `DemonSlayer` | 7 | Isekai Demon Hunter Arc | Demon Slayer |
| `Maidragon` | 5 | Dragon Maid on Hiemspresent | Miss Kobayashi's Dragon Maid |
| `Konosuba` | 5 | God's Blessing on This Laid-Back Isekai! | KonoSuba |
| `TenSura` | 4 | Camping with A Slime | That Time I Got Reincarnated as a Slime |
| `DanMachi` | 4 | Encounter in Another World | DanMachi |
| `FairyTail` | 4 | Fight! Magic Academy Sports Day! | Fairy Tail |
| `Mushoku` | 4 | Mushoku Tensei and Magic Creativity Show | Mushoku Tensei |
| `LycoReco` | 2 | Cafe LycoReco Crossing into Isekai | Lycoris Recoil |

**8 arcs, 35 stages, 2–7 characters each, one stage per cast member** — `tests/events.test.mjs`
pins `stages===35` and `e.stages.length===e.cast.length` for every arc. That 2–7 band is the
precedent this plan sizes new arcs against.

### 1.2 The stage cost and the spent ledger

- `COMPLETIONS_PER_STAGE=10` — `lib/events.mjs:19`. A **LOCAL** number, already declared as one in
  `lib/event-data.json`'s `localNumbers` field.
- `completionsEarned(s)` — `lib/events.mjs:26` — counts every `kind==='complete'` row in
  `s.habits.history` for the lifetime of the village. History is capped at 20,000 rows, so this can
  only ever under-report.
- `completionsAvailable(s)` — `lib/events.mjs:27` — `earned - events.spent`. `spent` is a **single
  running total across all arcs**, so an arc cannot be farmed by re-entering it, and the events
  ledger is the only sink for completions anywhere in the game (habit rewards in
  `lib/summon.mjs:10-13` mint separate currencies and do not touch `spent`).
- `eventAction` — `lib/events.mjs:49-70` — one action, `eventClaim`. It charges
  `COMPLETIONS_PER_STAGE`, increments `claimed[arcId]`, and grants the member with `newFellow()`
  (`lib/adventure.mjs:59`) or a fresh Family record. Already owning the character advances the arc
  without re-granting (`lib/events.mjs:61-62`).
- `validEvents` — `lib/events.mjs:31-47` — three checks: `claimed[id]` is within the arc's stage
  count; every member the arc says it handed over is actually in the village
  (`lib/events.mjs:43`); and **`spent === stages * COMPLETIONS_PER_STAGE`** (`lib/events.mjs:46`).
  That last line is the rule-12 landmine — see §6.
- `events` is already in `QUARANTINABLE` (`lib/game.mjs:210`) and in `VALIDATORS`
  (`lib/game.mjs:205`), and `eventAction` is wired at `lib/game.mjs:284`.

### 1.3 How the panel presents an arc

`app/event-panel.tsx` renders one `article.school-card` per arc: title, source, `done of total`, a
`<progress>`, the full cast inline as `·`-separated spans with `event-met`/`event-unmet` classes, and
one button. The banked-completions line sits above the grid. The tab is mounted at
`app/page.tsx:157` as `<TabsContent value="events">`. There is **no pagination** — every arc and
every cast name renders at once.

### 1.4 Story presentation precedent

- `lib/storybook.mjs` — `ALL_STORY_SCENES = [...SCENES, ...OPENING_SCENES]`, a `Map` by id,
  `storyBookmark(s,id) -> {line,read}`, `validStory` (bookmark keys must be known scene ids, `line`
  in range, `read` boolean), and `storyAction` with `storyOpen/Next/Previous/Finish/Restart`.
  `storyFinish` only succeeds on the final line and sets `read:true`.
- Counts are pinned: `tests/opening-presentation.test.mjs:3` asserts `STORY_SCENES===SCENES`,
  `length 36`, `411` lines, `ALL_STORY_SCENES.length 54`, `505` lines.
  `tests/storybook.test.mjs:3` asserts a full read of all 36 changes nothing but `s.story`.
- `lib/village-events.mjs` is the other presentation precedent: a weighted daily draw, one claim a
  day gated on a finished daily habit, `villageSpoken()` standing "Village Elder" in for
  `{playerName}`, and a strictly ordered `CSEM_1..CSEM_6` chain (`villageManageStep`) whose steps
  unlock on `PlayerLvUpNum` via `villageRank` (`lib/village-events.mjs:83-88`).
- `lib/achievements.mjs:39-48` is the ordered-chain precedent: `chainProgress` finds the first
  unclaimed step and a step is claimable only once every earlier one is claimed.

### 1.5 The measured earning rate

`lib/starter-habits.json` ships the owner's journal: **78 tasks — 56 daily, 15 weekly, 6 monthly,
1 quarterly.** Driving `habitComplete` for every due item for 35 consecutive days from a fresh save
(both halves of this ratio are Everkai's own: cost from `lib/events.mjs:19`, income from
`lib/habits.mjs` + `lib/starter-habits.json`):

- **56 completions on an ordinary day.**
- 71 on a week boundary, 78 on day 1, 63 on a month boundary.
- **2,064 completions in 35 days — 59.0/day averaged.**

So the existing 8 arcs (35 × 10 = **350 completions**) are a **6-day** purchase at the journal's
ceiling. That is the pace this plan has to sit beside.

### 1.6 What the recruit counter currently charges for a crossover Fellow

The owner's decision that every crossover character starts at rarity **N** has a measurable
consequence at the counter. `summonCost` (`lib/summon.mjs:63`) splits the rarity on `' ->'` and
takes the first token; `SUMMON_COSTS.N = {stoneFragments:3}` (`lib/summon.mjs:49`). Habits pay
`STONE_FRAGMENTS_PER_DAILY=2` up to `STONE_FRAGMENTS_DAILY_CAP=6`, plus `PERFECT_DAY_BONUS=4`
(`lib/summon.mjs:10`) — **up to 10 fragments a day**.

- At rarity N: 163 × 3 = **489 fragments ≈ 49 days**, and roughly **three crossover Fellows a day**.
- At SSR (2 stones = 20 fragments): 163 × 20 = 3,260 fragments ≈ 326 days.

That 49-day, three-a-day counter is exactly the "bought cheaply" the owner ruled out. **The counter
must not sell crossover Fellows at all** — see §4.4.

---

## 2. What a `type` is, and what it changes

There are five: **Diligent, Informed, Brave, Inspiring, Unfettered**. Measured distribution over the
159 original Fellows: Brave 33, Diligent 32, Informed 32, Unfettered 32, Inspiring 30.

Every business carries one (`lib/business-data.json`), and the families are uneven in both count and
per-worker rate:

| Type | Businesses (`employeeRate`) | Buildings | Best rate |
|---|---|---|---|
| Diligent | Inn (1), Patisserie (10), Tailor Shop (35), **Magic Academy (80)** | 4 | 80 |
| Inspiring | Scroll Shop (4), Central Station (8), Bank (30), **Airship (70)** | 4 | 70 |
| Unfettered | Spring Resort (6), Market Street (25), Theater (60) | 3 | 60 |
| Informed | Apothecary (2), Museum (20), Clinic (50) | 3 | 50 |
| Brave | Workshop (3), Archery Range (15), Sports Park (40) | 3 | 40 |

### 2.1 The one hard gate

`canOperate` — `lib/businesses.mjs:18` — **a business accepts only Fellows of its own type**, with
two named exceptions (`ANY_BUILDING_FELLOWS`, `lib/businesses.mjs:17`: `hero_193`, `hero_53`). `businessAction` refuses
otherwise at `lib/businesses.mjs:152`. So a Fellow's type decides which of the 18 buildings it can
ever stand in, and nothing else in the game can override it.

### 2.2 How that reaches earnings

`enterpriseRate` (`lib/businesses.mjs:114-118`) is
`Σ (employeeIncome + rosterOperation) × (1 + businessBonus.total)`, and
`businessBonus.total = assignedOperation + quality + family + farm` (`lib/businesses.mjs:100-104`).

- `assignedOperation` (`lib/operations.mjs:9-11`) sums `fellowOperation(...).percent` over the
  Fellows assigned to that business. `fellowOperation` (`lib/operations.mjs:3-8`) looks the Fellow up
  in `lib/operation-data.json` and keeps effects where `!e.type || e.type===business.type`.
- **Measured across the 175 rows in `lib/operation-data.json`: min 50%, median 150%, max 250% total;
  at level 50, min 20 / median 120 / max 220.** An operator slot is worth 0.5–2.5 added to a
  business's multiplier, so who stands where is a first-order earnings decision.
- `operationSlots` (`lib/businesses.mjs:47`) with `slotThresholds [0,50,200,800,5000]` gives at most
  **5 operator slots per business — 85 across the game.** Every type already has more original
  Fellows (30–33) than its family has slots (15 or 20), so crossover Fellows never fill an empty
  slot; they displace an original.

### 2.3 The measured defect this exposes

**`lib/operations.mjs:3` keys `byFellow` on the raw Fellow id and never calls `sourceId`.**
`lib/operation-data.json` has 175 rows, all `hero_*`, and **zero** rows for any `xover_*` id
(measured). So today:

> a crossover Fellow assigned to a business contributes **0%** operation, and occupies a slot that a
> median original would have filled at **+150%**.

Assigning a crossover Fellow is therefore actively worse than assigning nobody-in-particular. Every
other per-id table already routes through `sourceId` — `lib/talents.mjs:14`, `lib/insight.mjs:9`,
`lib/original-progression.mjs:10/26/33`. `operations.mjs` is the one that was missed. Fixing it is
a prerequisite for types meaning anything for these 163.

The fix is unusually clean, because the five per-type SSR template anchors are symmetric
(measured from `lib/operation-data.json`):

| Template | Type | Operation row |
|---|---|---|
| `hero_101` | Brave | 100% @ L1, +20% @ L50, +30% @ L200 = **150%** |
| `hero_102` | Diligent | identical shape, **150%** |
| `hero_103` | Unfettered | identical shape, **150%** |
| `hero_104` | Inspiring | identical shape, **150%** |
| `hero_105` | Informed | identical shape, **150%** |

Borrowing through `sourceId` therefore gives every crossover Fellow **+100% at level 1 rising to
+150% at level 200, to its own type's buildings** — exactly the median original, with no invented
value.

### 2.4 The other things type touches

| Reader | Line | What type does |
|---|---|---|
| `stellaBonus` | `lib/stella.mjs:58` | a Stella's `percent` raises Power for **every owned Fellow of that type** — so type decides who benefits from a Stella the crossover Fellow can never have (`stellaRule` returns nothing for an addition, `lib/everkai-additions.mjs:16`) |
| `insightRule` | `lib/insight.mjs:9` | borrows the template's rule via `sourceId`, then **requires `fellowById(id).type === rule.type`**. If an addition's type ever disagrees with its template's type, Insight silently disappears for it |
| `workshopAction` | `lib/workshop.mjs:63` | a product accepts only its own type's Fellow |
| `farm-trade` | `lib/farm-trade.mjs:22,37` | an Aptitude essence only feeds a matching-type Fellow |
| `frontierPower` | `lib/frontier.mjs:8` | **×1.25** when the Fellow's type matches the wave's |
| `fishingBonuses` | `lib/fishing.mjs:60` | display-slot effects gate on **type and rarity**. Measured in `lib/fishing-species.json`: 172 `rarities` fields, 66 non-empty — 8 gate on `["N"]`, 12 on `["R"]`, 12 on `["SR"]`, 22 on `["SSR","SSR+"]`, 12 on `["UR"]` |
| `fellowOperation` | `lib/operations.mjs:5` | see §2.3 |

Type does **not** touch `fishingEmployeeBonus`, `innGiftEmployeePercent` or `fathomBonus`
(`lib/businesses.mjs:93,102`) — those three read the **business's** type, not the Fellow's.

### 2.5 The type-independent earnings effect of the unlock itself

`rosterOperation` (`lib/businesses.mjs:92`) sums `bondedPower(s,f)/1000` over **every owned Fellow**,
regardless of type, and that term is added to every open business before its multiplier. Measured
(both halves from Everkai: `lib/businesses.mjs` and `lib/adventure.mjs`):

- a fresh Fellow is 100 Power → **+0.1 gold/s to every open business**;
- 163 fresh crossover Fellows → **+16.3 gold/s per business**, ×18 businesses = **+293 gold/s**
  before any multiplier;
- at level 100 a Fellow is 2,080 Power → 163 of them are **+339 gold/s per business**.

So simply *owning* the 163 is a real, type-blind income increase. That is the main balance
consequence of this whole slice, and it is why the stage price in §4.1 is not 10.

---

## 3. Arc structure for the two franchises

### 3.1 The grouping rule

**Arcs are blocks of five, cut straight down the owner's rank order.**
`crossover/selected-roster.json` carries `rank` per franchise (MSF 1–95, SWGOH 1–68; 163 rows, all
built — `crossover/full/batch-summary.json` reports `ok:true` for all 163, 6 flagged
`reviewRequired`). Arc *n* of a franchise holds ranks `5n-4 … 5n`.

Why blocks of five rather than thematic groupings:

- **Five is inside the proven band.** The eight Isekai arcs run 2–7 stages; five is the median and
  the modal size (`Maidragon` and `Konosuba` are both 5).
- **It is mechanical, so it cannot drift.** Any thematic grouping is taste, and taste would put the
  owner's rank-40 pick in arc 2 and their rank-3 pick in arc 9. Blocks of five guarantee the most
  wanted arrive first and make "which arc is this character in" a one-line calculation a test can
  re-derive.
- **95 divides exactly.** Marvel is 19 arcs of 5. Star Wars is 13 of 5 plus a final arc of 3 —
  still inside the 2–7 band (`LycoReco` ships 2).

**33 new arcs, 163 stages.** With the existing 8 that is **41 arcs, 198 stages**.

Arc names are village situations written for Everkai — a night watch, a cold kitchen, a toll ledger.
They are deliberately **not** descriptions of the cast, and no arc text may retell a Marvel or Star
Wars plot. Stage titles follow the same rule: `"<short village moment>"`, 2–4 words, written fresh
(e.g. `Rooftop Watch` stage titles: *A light on the eaves*, *Claws at the woodpile*, *The shield in
the shed*, *Sparks over the forge*, *The green in the field*). §7 task 6 owns writing the other 158.

### 3.2 The grouping

| Franchise | Arc id | Arc name | Stages | Completions/stage | Owner ranks | Characters, in owner rank order |
|---|---|---|---|---|---|---|
| Marvel | `XoverMsf01` | Rooftop Watch | 5 | 20 | 1–5 | Spider-Man, Wolverine, Captain America (WWII), Iron Man (Infinity War), Hulk |
| Marvel | `XoverMsf02` | The Storm Gate | 5 | 20 | 6–10 | Thor (Infinity War), Doctor Doom, Magneto, Thanos (Endgame), Doctor Strange |
| Marvel | `XoverMsf03` | Lanterns Out | 5 | 20 | 11–15 | Jean Grey, Phoenix, Loki, Scarlet Witch, Black Panther |
| Marvel | `XoverMsf04` | The Long Ward | 5 | 20 | 16–20 | Deadpool, Mister Fantastic (MCU), Professor Xavier, Silver Surfer, Cyclops |
| Marvel | `XoverMsf05` | Quiet Quarter | 5 | 40 | 21–25 | Storm, Daredevil (Modern), Invisible Woman (MCU), The Thing, Venom |
| Marvel | `XoverMsf06` | Kiln and Anvil | 5 | 40 | 26–30 | Captain Marvel, Human Torch, Nick Fury, Doctor Octopus, Green Goblin |
| Marvel | `XoverMsf07` | Night Market | 5 | 40 | 31–35 | Punisher, Black Widow, Namor, Star-Lord, Ant-Man |
| Marvel | `XoverMsf08` | The Seed Vault | 5 | 40 | 36–40 | Blade, Gamora, Rocket Raccoon, Rogue, Shang-Chi |
| Marvel | `XoverMsf09` | Bells at Dusk | 5 | 40 | 41–45 | Groot, Hawkeye, Moon Knight, Beast, Gambit |
| Marvel | `XoverMsf10` | The Mended Wall | 5 | 40 | 46–50 | Ghost Rider, Kingpin, Ms. Marvel (Hard Light), She-Hulk, Vision |
| Marvel | `XoverMsf11` | Frost on the Well | 5 | 60 | 51–55 | Adam Warlock, Emma Frost, Mystique, Nightcrawler, Winter Soldier |
| Marvel | `XoverMsf12` | Deep Shaft | 5 | 60 | 56–60 | Cable, Colossus, Juggernaut, Mister Sinister, Quicksilver |
| Marvel | `XoverMsf13` | The Signal Fire | 5 | 60 | 61–65 | Kitty Pryde, Spider-Man (Miles), Black Bolt, Hela, Luke Cage |
| Marvel | `XoverMsf14` | Salt Road | 5 | 60 | 66–70 | Nova, Psylocke, Jubilee, Sentry, Black Cat |
| Marvel | `XoverMsf15` | The Hollow Lane | 5 | 60 | 71–75 | Jessica Jones, Kraven the Hunter, Bishop, Agatha Harkness, Drax |
| Marvel | `XoverMsf16` | Paper Lanterns | 5 | 60 | 76–80 | Ghost-Spider, Morgan Le Fay, America Chavez, Kate Bishop, Medusa |
| Marvel | `XoverMsf17` | The Cold Kitchen | 5 | 60 | 81–85 | X-23, Agent Coulson, Electro, Magik, Mantis |
| Marvel | `XoverMsf18` | Watch Change | 5 | 60 | 86–90 | Nebula, Captain Carter, Yelena Belova, Maria Hill, Sharon Carter |
| Marvel | `XoverMsf19` | Last Light | 5 | 60 | 91–95 | Sersi, Dagger, Nico Minoru, Mockingbird, Thena |
| Star Wars | `XoverSwgoh01` | The Cracked Helm | 5 | 20 | 1–5 | Darth Vader (Duel's End), Leia Organa, Jedi Knight Anakin, Jedi Knight Luke Skywalker, Han Solo |
| Star Wars | `XoverSwgoh02` | Two Lanterns | 5 | 20 | 6–10 | Ahsoka Tano, Darth Sidious, Sith Eternal Emperor, Jedi Master Kenobi, R2-D2 |
| Star Wars | `XoverSwgoh03` | The Library Steps | 5 | 20 | 11–15 | Grand Master Yoda, Chewbacca, C-3PO, Padmé Amidala, Supreme Leader Kylo Ren |
| Star Wars | `XoverSwgoh04` | Old Debts | 5 | 20 | 16–20 | Rey, Darth Bane, Darth Maul, Grand Admiral Thrawn, Darth Revan |
| Star Wars | `XoverSwgoh05` | The Toll Ledger | 5 | 40 | 21–25 | Ben Solo, Boba Fett, Scion of Jango, Jabba the Hutt, Jedi Master Mace Windu, Master Qui-Gon |
| Star Wars | `XoverSwgoh06` | Dust and Gears | 5 | 40 | 26–30 | The Mandalorian (Beskar Armor), Count Dooku, General Grievous, Lando Calrissian, Darth Malgus |
| Star Wars | `XoverSwgoh07` | The Council Table | 5 | 40 | 31–35 | Grand Moff Tarkin, Mon Mothma, Bo-Katan (Mand'alor), Darth Malak, Darth Nihilus |
| Star Wars | `XoverSwgoh08` | Quiet Signals | 5 | 40 | 36–40 | Cassian Andor (Undercover), Darth Traya, Satele Shan, Admiral Ackbar, Bastila Shan |
| Star Wars | `XoverSwgoh09` | The Exile’s Bench | 5 | 40 | 41–45 | Jedi Knight Cal Kestis, Ezra Bridger (Exile), Resistance Hero Finn, Starkiller, Asajj Ventress |
| Star Wars | `XoverSwgoh10` | Workshop Sparks | 5 | 40 | 46–50 | General Syndulla, Sabine Wren, Jyn Erso, Kanan Jarrus, Mara Jade, The Emperor's Hand |
| Star Wars | `XoverSwgoh11` | The Hidden Landing | 5 | 60 | 51–55 | Resistance Hero Poe, Saw Gerrera, Luthen Rael, BB-8, Grand Inquisitor |
| Star Wars | `XoverSwgoh12` | Rust and Rain | 5 | 60 | 56–60 | HK-47, Cad Bane, Captain Rex, Darth Sion, Kyle Katarn |
| Star Wars | `XoverSwgoh13` | The Foundling Path | 5 | 60 | 61–65 | Director Krennic, Aayla Secura, Cara Dune, IG-12 & Grogu, Barriss Offee |
| Star Wars | `XoverSwgoh14` | Small Hands | 3 | 60 | 66–68 | Luminara Unduli, Grogu & Anzellans, Padawan Sabine Wren |

Cost per stage is set in §4.1.

### 3.3 One arc, in full, as the shape to copy

`XoverMsf01` — **Rooftop Watch**, 5 stages, 20 completions each, 100 total.

```
{ "id":"XoverMsf01", "name":"Rooftop Watch", "franchise":"Marvel", "flag":"crossover",
  "costPerStage":20, "prologue":"XoverMsf01Prologue",
  "cast":[ {"id":"xover_msf_spiderman","name":"Spider-Man","kind":"fellows","label":"Spider-Man"}, … ],
  "stages":[ {"step":1,"member":"xover_msf_spiderman","kind":"fellows","title":"A light on the eaves"}, … ] }
```

Three fields are new against `lib/event-data.json`: `costPerStage` (§4.1), `flag` (§4.5) and a
per-stage `kind` (§6.2). `prologue` is the read-gate (§4.2). `franchise` replaces `source`, because
these are not adaptations of a source event the way the eight Isekai arcs are.

---

## 4. Unlock and pacing

### 4.1 What a stage costs

`COMPLETIONS_PER_STAGE=10` stays exactly 10 for the eight Isekai arcs — changing it breaks saves
(§6.1). Crossover arcs carry their own `costPerStage`, rising by arc tier. **All three numbers are
LOCAL.**

| Tier | Arcs | Characters | Completions/stage | Subtotal |
|---|---|---|---|---|
| 1 | arcs 1–4 of each franchise | 40 | **20** | 800 |
| 2 | arcs 5–10 of each franchise | 60 | **40** | 2,400 |
| 3 | arcs 11+ of each franchise | 63 | **60** | 3,780 |
| | **33 arcs** | **163** | | **6,980** |

Marvel: 4,300. Star Wars: 2,680. Plus the existing 350 = **7,330 completions for the whole cast of
198.** `validEvents` caps `spent` at `1e7` (`lib/events.mjs:35`), so there is no ledger-width problem.

Why rising rather than flat: a flat price makes the 95th Marvel pick cost the same as the 1st, and
the owner's ranking says it should not. Why these three numbers: tier 1 is 2× the Isekai stage so
the top 40 picks stay fast; tier 3 is 6× so the tail is a genuine long haul rather than a chore
with no weight. Re-tune by editing three integers in one data file.

### 4.2 What "unlocked by playing its storyline" means mechanically

Two gates per arc, both already-existing machinery:

1. **A read prologue.** Each arc carries one new scene (4–6 lines, written for Everkai). Stage 1
   refuses until `storyBookmark(s, arc.prologue).read === true` — the exact flag
   `storyFinish` sets (`lib/storybook.mjs`), and `storyFinish` only fires on the scene's final line,
   so the player has actually read it. **33 new scenes.** No new save subtree: `s.story.bookmarks`
   already holds this.
2. **Stages in order, paid with completions.** `eventNextStage` (`lib/events.mjs:29`) already
   enforces strict order; each claim prints the stage's own written arrival line.

This is what replaces buying: the character is not for sale anywhere, and the only route in is the
arc. Prologue scenes are free to read, so they pace nothing — they are the *storyline* half; the
completions are the *pacing* half.

**Owner decision:** one prologue per arc (33 scenes) is the recommendation. A prologue **and** an
epilogue per arc is 66 scenes and gives the last stage a payoff; a scene per stage is 163 scenes and
is not worth the writing. Work proceeds on 33 unless the owner says otherwise.

### 4.3 When characters arrive — measured

Income side: §1.5, the **measured day-by-day** series from `lib/starter-habits.json` driven through
`lib/habits.mjs` (78, 56, 56, 56, 56, 71, 56 … — 2,064 in 35 days, 59.0/day). Cost side: §4.1. Both
halves are Everkai's own numbers. Day counts below walk that measured series and only extrapolate at
59.0/day past day 35 — they are not a single division.

| Milestone | Completions | Full journal | Half the journal (29.5/day) |
|---|---|---|---|
| **First crossover Fellow** (Spider-Man, `XoverMsf01` stage 1) | 20 | **day 1** | day 1 |
| First arc complete (5 Fellows) | 100 | **day 2** | day 4 |
| First 10 Fellows | 200 | day 4 | day 7 |
| Tier 1 done (40 Fellows) | 800 | day 14 | day 27 |
| Half the crossover cast (82 Fellows) | 3,520 | day 60 | day 120 |
| **All 163 crossover Fellows** | 6,980 | **day 119** | day 237 |
| All 198 (crossover + the 8 Isekai arcs) | 7,330 | day 125 | day 249 |

So: **the first crossover Fellow joins on day 1** — the 20th completed habit of the first day, after
reading a five-line prologue — **and the full 163 takes about four months of a completed journal, or
about eight at half pace.** Compare §1.6: the counter at rarity N would hand over all 163 in 49 days
for pocket change. The arc route is ~2.4× longer at full pace and, more importantly, ordered by what
the owner actually wants.

### 4.4 The counter must stop selling them

`recruitPrice` (`lib/summon.mjs:38`) → `summonCost(recruitRarity(id))`, and `recruitRarity`
(`lib/summon.mjs:22`) falls back to `additionById(id)?.rarity`. Today
`tests/everkai-additions.test.mjs` asserts additions **are** offered
(`assert.deepEqual(recruitOffers(...).map(o=>o.id), IDS)`).

**Change:** `recruitPrice` returns `null` for `isAddition(id)`, the same way it already does for the
22 `RANK_FELLOWS` who arrive through village encounters instead of the shop
(`lib/summon.mjs:37-38`). `recruitOffers` filters on `recruitPrice(p.id)` truthiness
(`lib/summon.mjs:43`), so they drop out with no other change.

**This is save-safe, verified by reading the validator:** `validSummon`
(`lib/summon.mjs:143-145`) checks a recruit receipt only for `typeof x.id==='string'`, a known
`kind`, `int(x.paid)`, `Object.hasOwn(CURRENCY_NAMES,x.currency)` and `!!s[x.kind]?.[x.id]`. It never
re-derives the price. A flag-on save that already bought Spider-Man for 2 Acquaint Stones keeps its
receipt and keeps validating after the price becomes `null`.

### 4.5 Can the existing machinery carry 33 more arcs?

Mostly yes. Measured against the code:

| Concern | Verdict |
|---|---|
| `EVENTS` array, `eventById` linear find (`lib/events.mjs:20`) | fine at 41 arcs |
| `eventState.claimed` object, `validEvents` loop (`lib/events.mjs:38`) | fine at 41 keys / 198 stages |
| `spent` ceiling `1e7` (`lib/events.mjs:35`) | 7,330 ≪ 1e7, fine |
| `CAST` / `EVENT_CAST` derived set (`lib/events.mjs:21,71`) | additive, fine |
| `newFellow()` grant path (`lib/events.mjs:66`) | fine |
| Offline precache | **already handled** — 163 stills + clips are **6.4 MB webp + 98.0 MB mp4 = 104.4 MB**, all under `assets/crossover/`, which `STREAMED` excludes from the precache (`scripts/offline-manifest.mjs:22`) |

**Four changes are required**, not optional:

1. **Per-arc stage cost.** `validEvents:46` asserts `spent === stages*COMPLETIONS_PER_STAGE`; with
   mixed prices this must become `spent === Σ claimed[id] × costPerStage(id)`, with the eight Isekai
   arcs pinned at 10. See §6.1 — this is a rule-12 issue, not a refactor.
2. **Stage `kind` must be data, not a prefix.** `lib/events.mjs:43` and `:58` both infer Fellow vs
   Family from `member.startsWith('hero_')`. An `xover_*` id fails that test and gets looked up in
   `s.family`, so `validEvents` would reject every claimed crossover stage. Each stage (and the
   existing `cast` rows, which already carry `kind`) must carry `kind:'fellows'|'family'`, and both
   lines must read it.
3. **Catalogue lookup must survive the flag being off.** `lib/events.mjs:59` resolves the person out
   of `FELLOWS`, which is flag-gated (`lib/catalog.mjs:18`). With the flag off an addition is not in
   `FELLOWS`, so a claim fails with *"That character is not in the catalogue."* Use `fellowById`
   (`lib/catalog.mjs:21`), which resolves additions either way — exactly the reason that function
   exists.
4. **Panel pagination.** `app/event-panel.tsx` renders every arc and every cast name in one grid;
   41 cards and 198 names is unusable on a phone. Wrap in `PanelPages` (already used at
   `app/page.tsx:157` for `villageEvents`, `museum`, `journey`) with one page per franchise, and
   filter the crossover arcs on `crossoverEnabled()`.

Change 4 is UI; 1–3 are correctness. **None of them require a `SAVE_VERSION` bump** — no new
required save field appears (§6).

### 4.6 Rarity N, and what "upgraded to the top" can honestly mean

Measured: **nothing in the codebase ever writes a Fellow's `rarity`.** It is a static catalogue
string. There is no rarity-upgrade mechanic to hook into. What *does* climb per-save is:

- **quality tiers 1→14**, `sourceQuality`/`sourceCap` (`lib/original-progression.mjs:7-9`), caps
  100→750 (`lib/adventure.mjs:60-64`); or `breaks` 0→13 in default mode;
- **stars 0→7**, `STAR_CAP=7`, `STAR_COSTS [10,20,30,50,70,100,140]`, +5% Aptitude each
  (`lib/adventure.mjs:100-106`).

Recommendation, in two parts, neither of which adds a save field:

1. **`rarity` stays the bare string `"N"`.** Not a ladder string — measured, a ladder string matches
   no entry in `fishingBonuses`' rarity lists (`lib/fishing.mjs:60`), so the addition would silently
   lose the 8 `["N"]`-gated fishing effects that a bare `"N"` picks up. `summonCost` and `cardRarity`
   both split on `'->'` and would cope either way (`lib/summon.mjs:63`, `lib/ui-sprites.mjs:16`), but
   fishing does not.
2. **Add a derived `displayRarity(s,id)`** that reads the ladder token for the Fellow's *stored*
   quality tier, so the card frame actually climbs as the owner upgrades. Ladder
   `N → R → SR → SSR → SSR+ → UR`; mapping **LOCAL**: tiers 1–2 → N, 3–4 → R, 5–6 → SR, 7–9 → SSR,
   10–11 → SSR+, 12–14 → UR. **SHIPPED 2026-09-17** with the progression plan's §3.3 mapping instead —
   the same idea two rungs longer (13 → `UR*`, 14 → `LR`, both of which have art once the two sprite
   defects are fixed), so the top of the ladder is the top of the original's, as the owner asked.
   Pure function of `s.originalProgression.quality[id]`, which
   `validOriginalProgression` already validates (`lib/original-progression.mjs:26`). No new state,
   no validator change.

**Template selection must be decoupled from rarity.** Measured: `templateCandidates('N', type)`
returns **nothing for all five types** — the only five rarity-N Fellows are `hero_1…hero_5`, which
the pick rule excludes because they are in `FREE_ROSTER` (`scripts/crossover/pick-template.mjs:16`).
Rarity R is empty too. Recommendation: pin the template to the **per-type SSR anchor** —
`hero_101` Brave, `hero_102` Diligent, `hero_103` Unfettered, `hero_104` Inspiring, `hero_105`
Informed — chosen by type alone.

Measured, this is save-safe and the blast radius is two Fellows:

- `sourceCap` depends only on the *stored quality tier*, never on the template
  (`lib/original-progression.mjs:9`), so retemplating cannot strand a Fellow above a cap.
- `talentRule(...).cap` is 20 for all ten candidate anchors (measured), so the talent cap is
  unchanged.
- `validOriginalProgression` only requires `data.heroes[sourceId(id)]` to *exist*
  (`lib/original-progression.mjs:26`).
- The one real effect: base aptitude is `data.heroes[template]`, **70 for the SSR anchors vs 120 for
  the UR anchors**. `xover_swgoh_vaderduelsend` currently borrows `hero_113` (120) and would move to
  `hero_101` (70) — a one-time −50 base aptitude for a Fellow that exists only in the owner's own
  flag-on test save. Flagged rather than hidden. **DONE 2026-09-17**, and measured at the two ends of
  the ladder: −46,250 power at quality 1 / level 100 (−41.7%) and **−775,000 at quality 14 / level 750
  (−27.0%)**. `talentRule` and `insightRule` are identical for the two anchors, so a save carrying his
  talent, insight and quality ledgers from the previous build decodes byte-identically.

---

## 5. Types for all 163

### 5.1 The rule

> **A crossover Fellow's type is the village trade it would take if it stayed:** *Brave* for
> front-line fighters, brawlers, marksmen and duelists; *Informed* for scholars, healers, engineers,
> spies and droids; *Inspiring* for commanders, envoys, pilots and figureheads; *Diligent* for
> teachers, builders, caretakers and the steadfast; *Unfettered* for rogues, outlaws, loners and
> performers.

Applied to all 163 it gives **Brave 44, Unfettered 35, Informed 34, Inspiring 27, Diligent 23**
(against the originals' near-even 30–33 per type). The two already-shipped rows are unchanged by it
— `xover_msf_spiderman` stays Unfettered and `xover_swgoh_vaderduelsend` stays Brave, matching
`lib/everkai-additions-data.json` — so no shipped data churns.

### 5.2 Where type materially changes village earnings

**No single character's type changes earnings differently from another of the same type.** Measured
reasons, in order:

- With `operations.mjs` fixed to use `sourceId` (§2.3), every crossover Fellow of a given type
  borrows the **same** per-type SSR anchor row: **+100% at L1 → +150% at L200**, to its own type's
  buildings. All five anchors are identical in shape, so type changes *which* buildings, never *how
  much*.
- Operator slots are already saturated: at most 5 per business, 85 game-wide
  (`lib/businesses.mjs:47`), against 30–33 original Fellows per type. A crossover Fellow never fills
  an empty slot.
- Owning them pays regardless of type: +0.1 gold/s per business per fresh Fellow via
  `rosterOperation` (§2.5).

What type **does** materially change is **which building a crossover Fellow can ever stand in**, and
the families are not equal:

| Type | Crossover Fellows | Top building (rate/worker) | An operator's +150% at 26,000 workers |
|---|---|---|---|
| Diligent | 23 | Magic Academy (80) | +3,120,000 gold/s |
| Inspiring | 27 | Airship (70) | +2,730,000 gold/s |
| Unfettered | 35 | Theater (60) | +2,340,000 gold/s |
| Informed | 34 | Clinic (50) | +1,950,000 gold/s |
| Brave | 44 | Sports Park (40) | +1,560,000 gold/s |

**The flag worth the owner's attention:** the rule puts the owner's *most wanted* picks in the
*weakest* operator family. Vader (SW rank 1), Wolverine (MSF 2), Hulk (5) and Thor (6) are all Brave,
whose best building pays half what the Magic Academy pays — while Diligent, the strongest family,
gets the fewest crossover Fellows (23) and they are mostly low-ranked. If the owner would rather
their top picks be able to work the Magic Academy and the Airship, the levers are:

- **(a)** re-type a handful of top-ranked picks to Diligent/Inspiring — the teachers are the natural
  candidates already (`Professor Xavier`, `Grand Master Yoda`, `Jedi Master Kenobi`, `Master
  Qui-Gon`, `Kanan Jarrus` are all Diligent in the table below); or
- **(b)** add high-ranked crossover Fellows to `ANY_BUILDING_FELLOWS` (`lib/businesses.mjs:17`),
  which today holds exactly two originals the wiki names as working anywhere. Adding crossover
  Fellows to it would be a departure from the original's rule and is **not** recommended without the
  owner asking for it.

Recommendation: leave the table as written and take lever (a) only on names the owner calls out.
This is taste, not measurement (rule 10).

Second flag: **`lib/insight.mjs:9` requires an addition's type to equal its template's type.** With
the per-type SSR anchors that holds by construction, but a later hand edit of one type without the
matching template silently removes Insight for that Fellow. §6.4 pins it with a test.

### 5.3 The assignment

| Franchise | Rank | Character | Fellow id | Arc | Type |
|---|---|---|---|---|---|
| Marvel | 1 | Spider-Man | `xover_msf_spiderman` | Rooftop Watch | Unfettered |
| Marvel | 2 | Wolverine | `xover_msf_wolverine` | Rooftop Watch | Brave |
| Marvel | 3 | Captain America (WWII) | `xover_msf_captainamericaww2` | Rooftop Watch | Inspiring |
| Marvel | 4 | Iron Man (Infinity War) | `xover_msf_ironmaninfinitywar` | Rooftop Watch | Informed |
| Marvel | 5 | Hulk | `xover_msf_hulk` | Rooftop Watch | Brave |
| Marvel | 6 | Thor (Infinity War) | `xover_msf_thorinfinitywar` | The Storm Gate | Brave |
| Marvel | 7 | Doctor Doom | `xover_msf_doom` | The Storm Gate | Informed |
| Marvel | 8 | Magneto | `xover_msf_magneto` | The Storm Gate | Inspiring |
| Marvel | 9 | Thanos (Endgame) | `xover_msf_thanosendgame` | The Storm Gate | Brave |
| Marvel | 10 | Doctor Strange | `xover_msf_doctorstrange` | The Storm Gate | Informed |
| Marvel | 11 | Jean Grey | `xover_msf_jeangrey` | Lanterns Out | Inspiring |
| Marvel | 12 | Phoenix | `xover_msf_phoenix` | Lanterns Out | Unfettered |
| Marvel | 13 | Loki | `xover_msf_loki` | Lanterns Out | Unfettered |
| Marvel | 14 | Scarlet Witch | `xover_msf_scarletwitch` | Lanterns Out | Informed |
| Marvel | 15 | Black Panther | `xover_msf_blackpanther` | Lanterns Out | Inspiring |
| Marvel | 16 | Deadpool | `xover_msf_deadpool` | The Long Ward | Unfettered |
| Marvel | 17 | Mister Fantastic (MCU) | `xover_msf_mrfantasticmcu` | The Long Ward | Informed |
| Marvel | 18 | Professor Xavier | `xover_msf_xavier` | The Long Ward | Diligent |
| Marvel | 19 | Silver Surfer | `xover_msf_silversurfer` | The Long Ward | Unfettered |
| Marvel | 20 | Cyclops | `xover_msf_cyclops` | The Long Ward | Inspiring |
| Marvel | 21 | Storm | `xover_msf_storm` | Quiet Quarter | Inspiring |
| Marvel | 22 | Daredevil (Modern) | `xover_msf_daredevilmodern` | Quiet Quarter | Brave |
| Marvel | 23 | Invisible Woman (MCU) | `xover_msf_invisiblewomanmcu` | Quiet Quarter | Informed |
| Marvel | 24 | The Thing | `xover_msf_thing` | Quiet Quarter | Diligent |
| Marvel | 25 | Venom | `xover_msf_venom` | Quiet Quarter | Unfettered |
| Marvel | 26 | Captain Marvel | `xover_msf_captainmarvel` | Kiln and Anvil | Inspiring |
| Marvel | 27 | Human Torch | `xover_msf_humantorch` | Kiln and Anvil | Unfettered |
| Marvel | 28 | Nick Fury | `xover_msf_nickfury` | Kiln and Anvil | Informed |
| Marvel | 29 | Doctor Octopus | `xover_msf_doctoroctopus` | Kiln and Anvil | Informed |
| Marvel | 30 | Green Goblin | `xover_msf_ultgreengoblin` | Kiln and Anvil | Unfettered |
| Marvel | 31 | Punisher | `xover_msf_punisher` | Night Market | Brave |
| Marvel | 32 | Black Widow | `xover_msf_blackwidow` | Night Market | Informed |
| Marvel | 33 | Namor | `xover_msf_namor` | Night Market | Inspiring |
| Marvel | 34 | Star-Lord | `xover_msf_starlord` | Night Market | Unfettered |
| Marvel | 35 | Ant-Man | `xover_msf_antman` | Night Market | Informed |
| Marvel | 36 | Blade | `xover_msf_blade` | The Seed Vault | Brave |
| Marvel | 37 | Gamora | `xover_msf_gamora` | The Seed Vault | Brave |
| Marvel | 38 | Rocket Raccoon | `xover_msf_rocketraccoon` | The Seed Vault | Informed |
| Marvel | 39 | Rogue | `xover_msf_rogue` | The Seed Vault | Brave |
| Marvel | 40 | Shang-Chi | `xover_msf_shangchi` | The Seed Vault | Brave |
| Marvel | 41 | Groot | `xover_msf_groot` | Bells at Dusk | Diligent |
| Marvel | 42 | Hawkeye | `xover_msf_hawkeye` | Bells at Dusk | Brave |
| Marvel | 43 | Moon Knight | `xover_msf_moonknight` | Bells at Dusk | Unfettered |
| Marvel | 44 | Beast | `xover_msf_beast` | Bells at Dusk | Informed |
| Marvel | 45 | Gambit | `xover_msf_gambit` | Bells at Dusk | Unfettered |
| Marvel | 46 | Ghost Rider | `xover_msf_ghostrider` | The Mended Wall | Unfettered |
| Marvel | 47 | Kingpin | `xover_msf_kingpin` | The Mended Wall | Unfettered |
| Marvel | 48 | Ms. Marvel (Hard Light) | `xover_msf_kamalakhan` | The Mended Wall | Diligent |
| Marvel | 49 | She-Hulk | `xover_msf_shehulk` | The Mended Wall | Brave |
| Marvel | 50 | Vision | `xover_msf_vision` | The Mended Wall | Informed |
| Marvel | 51 | Adam Warlock | `xover_msf_adamwarlock` | Frost on the Well | Inspiring |
| Marvel | 52 | Emma Frost | `xover_msf_emmafrost` | Frost on the Well | Informed |
| Marvel | 53 | Mystique | `xover_msf_mystique` | Frost on the Well | Unfettered |
| Marvel | 54 | Nightcrawler | `xover_msf_nightcrawler` | Frost on the Well | Unfettered |
| Marvel | 55 | Winter Soldier | `xover_msf_wintersoldier` | Frost on the Well | Brave |
| Marvel | 56 | Cable | `xover_msf_cable` | Deep Shaft | Brave |
| Marvel | 57 | Colossus | `xover_msf_colossus` | Deep Shaft | Diligent |
| Marvel | 58 | Juggernaut | `xover_msf_juggernaut` | Deep Shaft | Brave |
| Marvel | 59 | Mister Sinister | `xover_msf_mrsinister` | Deep Shaft | Informed |
| Marvel | 60 | Quicksilver | `xover_msf_quicksilver` | Deep Shaft | Unfettered |
| Marvel | 61 | Kitty Pryde | `xover_msf_kittypryde` | The Signal Fire | Diligent |
| Marvel | 62 | Spider-Man (Miles) | `xover_msf_ultspiderman` | The Signal Fire | Unfettered |
| Marvel | 63 | Black Bolt | `xover_msf_blackbolt` | The Signal Fire | Inspiring |
| Marvel | 64 | Hela | `xover_msf_hela` | The Signal Fire | Inspiring |
| Marvel | 65 | Luke Cage | `xover_msf_lukecage` | The Signal Fire | Diligent |
| Marvel | 66 | Nova | `xover_msf_nova` | Salt Road | Brave |
| Marvel | 67 | Psylocke | `xover_msf_psylocke` | Salt Road | Brave |
| Marvel | 68 | Jubilee | `xover_msf_jubilee` | Salt Road | Unfettered |
| Marvel | 69 | Sentry | `xover_msf_sentry` | Salt Road | Brave |
| Marvel | 70 | Black Cat | `xover_msf_blackcat` | Salt Road | Unfettered |
| Marvel | 71 | Jessica Jones | `xover_msf_jessicajones` | The Hollow Lane | Informed |
| Marvel | 72 | Kraven the Hunter | `xover_msf_kraventhehunter` | The Hollow Lane | Brave |
| Marvel | 73 | Bishop | `xover_msf_bishop` | The Hollow Lane | Brave |
| Marvel | 74 | Agatha Harkness | `xover_msf_agathaharkness` | The Hollow Lane | Informed |
| Marvel | 75 | Drax | `xover_msf_drax` | The Hollow Lane | Brave |
| Marvel | 76 | Ghost-Spider | `xover_msf_ghostspider` | Paper Lanterns | Unfettered |
| Marvel | 77 | Morgan Le Fay | `xover_msf_morganlefay` | Paper Lanterns | Informed |
| Marvel | 78 | America Chavez | `xover_msf_americachavez` | Paper Lanterns | Unfettered |
| Marvel | 79 | Kate Bishop | `xover_msf_katebishop` | Paper Lanterns | Brave |
| Marvel | 80 | Medusa | `xover_msf_medusa` | Paper Lanterns | Inspiring |
| Marvel | 81 | X-23 | `xover_msf_x23` | The Cold Kitchen | Brave |
| Marvel | 82 | Agent Coulson | `xover_msf_coulson` | The Cold Kitchen | Diligent |
| Marvel | 83 | Electro | `xover_msf_electro` | The Cold Kitchen | Unfettered |
| Marvel | 84 | Magik | `xover_msf_magik` | The Cold Kitchen | Brave |
| Marvel | 85 | Mantis | `xover_msf_mantis` | The Cold Kitchen | Diligent |
| Marvel | 86 | Nebula | `xover_msf_nebula` | Watch Change | Informed |
| Marvel | 87 | Captain Carter | `xover_msf_captaincarter` | Watch Change | Inspiring |
| Marvel | 88 | Yelena Belova | `xover_msf_yelena` | Watch Change | Informed |
| Marvel | 89 | Maria Hill | `xover_msf_mariahill` | Watch Change | Diligent |
| Marvel | 90 | Sharon Carter | `xover_msf_sharoncarter` | Watch Change | Informed |
| Marvel | 91 | Sersi | `xover_msf_sersi` | Last Light | Diligent |
| Marvel | 92 | Dagger | `xover_msf_dagger` | Last Light | Inspiring |
| Marvel | 93 | Nico Minoru | `xover_msf_nicominoru` | Last Light | Informed |
| Marvel | 94 | Mockingbird | `xover_msf_mockingbird` | Last Light | Informed |
| Marvel | 95 | Thena | `xover_msf_thena` | Last Light | Brave |
| Star Wars | 1 | Darth Vader (Duel's End) | `xover_swgoh_vaderduelsend` | The Cracked Helm | Brave |
| Star Wars | 2 | Leia Organa | `xover_swgoh_glleia` | The Cracked Helm | Inspiring |
| Star Wars | 3 | Jedi Knight Anakin | `xover_swgoh_anakinknight` | The Cracked Helm | Brave |
| Star Wars | 4 | Jedi Knight Luke Skywalker | `xover_swgoh_jediknightluke` | The Cracked Helm | Inspiring |
| Star Wars | 5 | Han Solo | `xover_swgoh_hansolo` | The Cracked Helm | Unfettered |
| Star Wars | 6 | Ahsoka Tano | `xover_swgoh_glahsokatano` | Two Lanterns | Brave |
| Star Wars | 7 | Darth Sidious | `xover_swgoh_darthsidious` | Two Lanterns | Inspiring |
| Star Wars | 8 | Sith Eternal Emperor | `xover_swgoh_sithpalpatine` | Two Lanterns | Inspiring |
| Star Wars | 9 | Jedi Master Kenobi | `xover_swgoh_jedimasterkenobi` | Two Lanterns | Diligent |
| Star Wars | 10 | R2-D2 | `xover_swgoh_r2d2legendary` | Two Lanterns | Informed |
| Star Wars | 11 | Grand Master Yoda | `xover_swgoh_grandmasteryoda` | The Library Steps | Diligent |
| Star Wars | 12 | Chewbacca | `xover_swgoh_chewbaccalegendary` | The Library Steps | Diligent |
| Star Wars | 13 | C-3PO | `xover_swgoh_c3polegendary` | The Library Steps | Informed |
| Star Wars | 14 | Padmé Amidala | `xover_swgoh_padmeamidala` | The Library Steps | Inspiring |
| Star Wars | 15 | Supreme Leader Kylo Ren | `xover_swgoh_supremeleaderkyloren` | The Library Steps | Brave |
| Star Wars | 16 | Rey | `xover_swgoh_glrey` | Old Debts | Brave |
| Star Wars | 17 | Darth Bane | `xover_swgoh_darthbane` | Old Debts | Unfettered |
| Star Wars | 18 | Darth Maul | `xover_swgoh_maul` | Old Debts | Brave |
| Star Wars | 19 | Grand Admiral Thrawn | `xover_swgoh_grandadmiralthrawn` | Old Debts | Informed |
| Star Wars | 20 | Darth Revan | `xover_swgoh_darthrevan` | Old Debts | Informed |
| Star Wars | 21 | Ben Solo | `xover_swgoh_bensolo` | The Toll Ledger | Brave |
| Star Wars | 22 | Boba Fett, Scion of Jango | `xover_swgoh_bobafettscion` | The Toll Ledger | Unfettered |
| Star Wars | 23 | Jabba the Hutt | `xover_swgoh_jabbathehutt` | The Toll Ledger | Unfettered |
| Star Wars | 24 | Jedi Master Mace Windu | `xover_swgoh_jedimastermacewindu` | The Toll Ledger | Brave |
| Star Wars | 25 | Master Qui-Gon | `xover_swgoh_masterquigon` | The Toll Ledger | Diligent |
| Star Wars | 26 | The Mandalorian (Beskar Armor) | `xover_swgoh_themandalorianbeskararmor` | Dust and Gears | Unfettered |
| Star Wars | 27 | Count Dooku | `xover_swgoh_countdooku` | Dust and Gears | Informed |
| Star Wars | 28 | General Grievous | `xover_swgoh_grievous` | Dust and Gears | Brave |
| Star Wars | 29 | Lando Calrissian | `xover_swgoh_administratorlando` | Dust and Gears | Unfettered |
| Star Wars | 30 | Darth Malgus | `xover_swgoh_darthmalgus` | Dust and Gears | Brave |
| Star Wars | 31 | Grand Moff Tarkin | `xover_swgoh_grandmofftarkin` | The Council Table | Informed |
| Star Wars | 32 | Mon Mothma | `xover_swgoh_monmothma` | The Council Table | Inspiring |
| Star Wars | 33 | Bo-Katan (Mand'alor) | `xover_swgoh_mandalorbokatan` | The Council Table | Inspiring |
| Star Wars | 34 | Darth Malak | `xover_swgoh_darthmalak` | The Council Table | Brave |
| Star Wars | 35 | Darth Nihilus | `xover_swgoh_darthnihilus` | The Council Table | Unfettered |
| Star Wars | 36 | Cassian Andor (Undercover) | `xover_swgoh_cassianundercover` | Quiet Signals | Informed |
| Star Wars | 37 | Darth Traya | `xover_swgoh_darthtraya` | Quiet Signals | Informed |
| Star Wars | 38 | Satele Shan | `xover_swgoh_sateleshan` | Quiet Signals | Inspiring |
| Star Wars | 39 | Admiral Ackbar | `xover_swgoh_admiralackbar` | Quiet Signals | Inspiring |
| Star Wars | 40 | Bastila Shan | `xover_swgoh_bastilashan` | Quiet Signals | Inspiring |
| Star Wars | 41 | Jedi Knight Cal Kestis | `xover_swgoh_jediknightcal` | The Exile’s Bench | Brave |
| Star Wars | 42 | Ezra Bridger (Exile) | `xover_swgoh_ezraexile` | The Exile’s Bench | Unfettered |
| Star Wars | 43 | Resistance Hero Finn | `xover_swgoh_epixfinn` | The Exile’s Bench | Diligent |
| Star Wars | 44 | Starkiller | `xover_swgoh_starkiller` | The Exile’s Bench | Brave |
| Star Wars | 45 | Asajj Ventress | `xover_swgoh_asajventress` | The Exile’s Bench | Unfettered |
| Star Wars | 46 | General Syndulla | `xover_swgoh_generalsyndulla` | Workshop Sparks | Inspiring |
| Star Wars | 47 | Sabine Wren | `xover_swgoh_sabinewrens3` | Workshop Sparks | Diligent |
| Star Wars | 48 | Jyn Erso | `xover_swgoh_jynerso` | Workshop Sparks | Unfettered |
| Star Wars | 49 | Kanan Jarrus | `xover_swgoh_kananjarruss3` | Workshop Sparks | Diligent |
| Star Wars | 50 | Mara Jade, The Emperor's Hand | `xover_swgoh_marajade` | Workshop Sparks | Unfettered |
| Star Wars | 51 | Resistance Hero Poe | `xover_swgoh_epixpoe` | The Hidden Landing | Inspiring |
| Star Wars | 52 | Saw Gerrera | `xover_swgoh_sawgerrera` | The Hidden Landing | Brave |
| Star Wars | 53 | Luthen Rael | `xover_swgoh_luthenrael` | The Hidden Landing | Informed |
| Star Wars | 54 | BB-8 | `xover_swgoh_bb8` | The Hidden Landing | Diligent |
| Star Wars | 55 | Grand Inquisitor | `xover_swgoh_grandinquisitor` | The Hidden Landing | Brave |
| Star Wars | 56 | HK-47 | `xover_swgoh_hk47` | Rust and Rain | Brave |
| Star Wars | 57 | Cad Bane | `xover_swgoh_cadbane` | Rust and Rain | Unfettered |
| Star Wars | 58 | Captain Rex | `xover_swgoh_captainrex` | Rust and Rain | Inspiring |
| Star Wars | 59 | Darth Sion | `xover_swgoh_darthsion` | Rust and Rain | Brave |
| Star Wars | 60 | Kyle Katarn | `xover_swgoh_kylekatarn` | Rust and Rain | Unfettered |
| Star Wars | 61 | Director Krennic | `xover_swgoh_directorkrennic` | The Foundling Path | Informed |
| Star Wars | 62 | Aayla Secura | `xover_swgoh_aaylasecura` | The Foundling Path | Brave |
| Star Wars | 63 | Cara Dune | `xover_swgoh_caradune` | The Foundling Path | Brave |
| Star Wars | 64 | IG-12 & Grogu | `xover_swgoh_ig12` | The Foundling Path | Diligent |
| Star Wars | 65 | Barriss Offee | `xover_swgoh_barrissoffee` | The Foundling Path | Informed |
| Star Wars | 66 | Luminara Unduli | `xover_swgoh_luminaraunduli` | Small Hands | Diligent |
| Star Wars | 67 | Grogu & Anzellans | `xover_swgoh_gopherants` | Small Hands | Diligent |
| Star Wars | 68 | Padawan Sabine Wren | `xover_swgoh_padawansabine` | Small Hands | Diligent |

---

## 6. Save compatibility and tests

### 6.1 The rule-12 check: `spent` is a DERIVED value

`validEvents` (`lib/events.mjs:46`) ends with:

```js
return t.spent===stages*COMPLETIONS_PER_STAGE;
```

`stages` is the sum of `claimed[]`. **`spent` is a stored value derived from a constant.** Change
`COMPLETIONS_PER_STAGE` from 10 to anything else and every real save that ever claimed a stage
fails `validEvents` — `decode()` then quarantines the `events` subtree (`lib/game.mjs:210`) and the
player silently loses their arc progress and their ledger. This is the mine-table failure of
2026-09-16 with a different table: the rows would be untouched and the saves would still break.

**Therefore:** `COMPLETIONS_PER_STAGE` stays 10 and keeps its meaning for the eight Isekai arcs.
The new check is

```js
const costOf=id=>eventById(id)?.costPerStage??COMPLETIONS_PER_STAGE;
// ...
return t.spent===Object.entries(t.claimed).reduce((n,[id,k])=>n+k*costOf(id),0);
```

with the eight existing arcs carrying no `costPerStage` (so they fall back to 10) or carrying an
explicit `10`. Either way the arithmetic for an existing save is **byte-identical**, which is the
whole point.

**Run the cheap check from CLAUDE.md** — generate a save with the pre-change build and decode it with
the new one — for: an untouched save, a save with one claimed `DemonSlayer` stage, and a save with
all 35 Isekai stages claimed (`spent` 350).

### 6.2 New state the arcs need

**None.** Measured, every piece of state already exists:

| What the arcs need | Where it already lives |
|---|---|
| per-arc stage progress | `s.events.claimed[arcId]` — an open-ended object, `lib/events.mjs:36` |
| the completions ledger | `s.events.spent` — cap `1e7`, `lib/events.mjs:35` |
| "the prologue has been read" | `s.story.bookmarks[sceneId].read` — `lib/storybook.mjs` |
| the granted Fellow | `s.fellows[xover_*]` — already valid with the flag off, `tests/everkai-additions.test.mjs` |
| the displayed rarity tier | derived from `s.originalProgression.quality[id]` (§4.6) |

So **`SAVE_VERSION` does not move** (`lib/game.mjs:60`, currently 10). `policyVersion` on
`s.events` stays `1`: no stored field changes shape, only the arithmetic that checks `spent`, and
that arithmetic is unchanged for every pre-existing key.

### 6.3 Validator and `QUARANTINABLE` changes

- `validEvents` — the `spent` sum (§6.1) and reading `kind` from the stage instead of the `hero_`
  prefix (`lib/events.mjs:43`). **Both must stay strictly no-weaker**: an unknown arc id, a
  `claimed` count above the arc's stage count, a member missing from the village, and a `spent` that
  does not add up must all still be refused.
- `validStory` — no change. It derives its scene set from `ALL_STORY_SCENES`, so adding the 33
  prologues widens it automatically. **`ALL_STORY_SCENES` must include the prologues unconditionally,
  not behind the flag** — otherwise a save that read one refuses to load with the flag off. The two
  pinned counts move: `tests/opening-presentation.test.mjs:3` (`54` → `87`, `505` → its new line
  total) and the read-count assertion in `tests/storybook.test.mjs:3`. `STORY_SCENES===SCENES` and
  `36`/`411` stay pinned — the original import is untouched.
- `QUARANTINABLE` — no change. `events` and `story` are both already in it (`lib/game.mjs:210`).
  Worth stating the consequence out loud: quarantining `events` drops the `spent` ledger while the
  granted Fellows stay owned, so a quarantined village keeps its crossover Fellows for free. That is
  pre-existing behaviour for the eight Isekai arcs and this plan does not change it.
- `validSummon` — no change, and pulling the additions off the counter is safe (§4.4, verified at
  `lib/summon.mjs:143-145`).
- `validOriginalProgression` — no change (§4.6, verified at `lib/original-progression.mjs:26`).
- `validBusinesses` — no change. It already requires `b.fellows.every(f=>Object.hasOwn(s.fellows,f))`
  (`lib/businesses.mjs:80`) and never consults the catalogue, so a business with a crossover operator
  validates with the flag off.

### 6.4 Tests

Extend `tests/events.test.mjs` (existing fixture `withCompletions(n)` earns completions the way a
player does — reuse it; note it needs ~125 simulated days for a tier-3 arc, and it already caps at
400 days).

**Coverage guards (rule 8):**

1. **Every one of the 163 is assigned to exactly one arc.** Build the set of `xover_*` ids from
   `lib/everkai-additions-data.json`, the set from every crossover arc's stages, and assert they are
   equal — not just equal in size. *Negative control:* delete one stage and confirm the test names
   the missing id.
2. **No duplicate assignment.** `new Set(allCrossoverStageMembers).size === 163`, and no crossover id
   appears in more than one arc. *Negative control:* add a duplicate stage and confirm it fails.
3. **Every crossover stage names a shipped, resolvable character** via `fellowById` (not `FELLOWS`),
   and every stage's `kind` matches where `fellowById`/`FAMILY` actually finds it.
4. **Arc shape.** 33 crossover arcs; 19 Marvel, 14 Star Wars; every arc 2–7 stages;
   `stages.length===cast.length`; stage `step` values are `1..n` in order; arc ids unique against
   the eight Isekai ids.
5. **Rank order is preserved.** Arc *n*'s members are exactly ranks `5n-4…5n` of that franchise in
   `selected-roster.json` — re-derived from the roster file, not hard-coded.
6. **Type coverage.** Every one of the 163 has a type in the five-member set; the type equals its
   template's type (the `lib/insight.mjs:9` requirement); and `templateCandidates` is **not** called
   with the display rarity (pin the five per-type anchors explicitly, since
   `templateCandidates('N',…)` is empty for all five types).

**Behaviour guards:**

7. **The ledger arithmetic, per tier.** Claim a tier-1 stage (20), a tier-2 stage (40) and a tier-3
   stage (60) and assert `spent` is 120 and `completionsAvailable` dropped by exactly 120.
   *Negative control:* set `spent` to `3*10` and confirm `valid()` is false.
8. **The prologue gate.** Stage 1 of an arc refuses before the prologue is read and succeeds after
   `storyFinish`. *Negative control:* set `bookmarks[prologue].read=false` on a fresh state and
   confirm the refusal message names the prologue.
9. **Save compatibility, both directions.** The §6.1 old-build/new-build decode for a save with
   Isekai stages claimed; and a flag-on save with crossover stages claimed must `decode()` and
   `valid()` **in a process with no flag** (extend `tests/crossover-flag-village.mjs`, which already
   does exactly this for recruiting).
10. **Unchanged with the flag off.** In the default (flagless) Node process: the eight Isekai arcs
    are the only arcs the panel would list; `eventAction` refuses a crossover arc id with a message
    that does not leak the arc's name; `recruitOffers` contains no `xover_*` id; the existing
    `tests/events.test.mjs` assertions (`EVENTS` filtered to unflagged = 8 arcs, 35 stages, 350
    completions) still pass verbatim.
11. **`operations.mjs` via `sourceId`.** A crossover Fellow assigned to a matching-type business
    contributes 150% at level 200 and 100% at level 1, and **0% to a business of another type**.
    *Negative control:* revert `sourceId` and confirm the test reports 0%.
12. **No precache growth.** `streamed('assets/crossover/…')` is true for every one of the 326 new
    files, and the precache manifest byte total does not move
    (`tests/offline-manifest.test.mjs:50-53` already has the shape).

---

## 7. Ordered task list for an implementing agent

1. **Fix `lib/operations.mjs:3` to key on `sourceId(fellow)`** and ship test 11 with its negative
   control. Do this first and alone: it is a one-line change to a live earnings path, it is
   independently verifiable, and every later step's earnings numbers depend on it.
2. **Make the stage `kind` and the catalogue lookup data-driven** (`lib/events.mjs:43`, `:58-59` →
   stage `kind` + `fellowById`), and add `kind` to the 35 existing stages from their `cast` rows.
   No behaviour change for the eight Isekai arcs; pin that with the untouched `tests/events.test.mjs`.
3. **Introduce per-arc `costPerStage`** with the §6.1 sum, the eight existing arcs at 10. Run the
   CLAUDE.md old-build/new-build decode check on all three save shapes in §6.1 before committing.
4. **Add the `flag` field and gate `eventAction`/the panel on `crossoverEnabled()`**, exporting both
   `EVENTS` (all arcs, so `validEvents` accepts old claims flagless) and a `visibleEvents()`.
   Ship test 10.
5. **Generate the 33 arcs into `lib/event-data.json`** from `selected-roster.json` by the §3.1 rule,
   with a script (not by hand) so test 5 can re-derive it. Ship tests 1, 2, 3, 4, 5.
6. **Write the 33 prologue scenes and the 163 stage titles.** Village situations only; no Marvel or
   Star Wars plot may be retold, and no franchise synopsis text may be copied. Add the prologues to
   `ALL_STORY_SCENES` unconditionally and move the two pinned counts (§6.3). Ship test 8.
7. **Add the type and `template` fields for the 161 unshipped rows** to
   `lib/everkai-additions-data.json` using §5.3 and the per-type SSR anchors, with
   `rarity:"N"`. Ship test 6.
8. **Set `recruitPrice` to `null` for additions** and update the two assertions in
   `tests/everkai-additions.test.mjs` that currently require them to be offered (§4.4).
9. **Add `displayRarity(s,id)`** (§4.6) and wire it into the roster/character cards through
   `cardStyle`. Derived only; no save field.
10. **Paginate `app/event-panel.tsx`** with `PanelPages`, one page per franchise, crossover arcs
    hidden without the flag. Verify by eye or by driving the browser — `app/` has no component tests.
11. **Ship tests 7, 9, 12**, then run the full gate: `pnpm test` (capture `$?` directly), `pnpm exec
    tsc --noEmit`, `pnpm build`.
12. **Negative-control every guard test** before calling the slice done: break the thing deliberately
    and confirm the intended message (CLAUDE.md, Testing).

---

## 8. Every number I could not measure

1. **The owner's real habit completion rate.** §1.5 is the *ceiling* of the shipped 78-task journal
   with everything due completed. Every day count in §4.3 scales inversely with it. Rule 11: one
   sentence from the owner — *"how many of the 56 dailies do you actually finish on a normal day?"* —
   makes the whole pacing table real. The 28/day column is a guess at half.
2. **Whether 20/40/60 per stage feels right.** Pacing is measurable; *desirable* pacing is not. The
   three integers live in one data file and can be re-tuned after a week of play.
3. **Whether blocks of five beat thematic arcs.** Taste. §3.1 argues for mechanical blocks; the owner
   may want, say, the five teachers in one arc even though it breaks rank order.
4. **The 33 arc names and 163 stage titles as *good* names.** I wrote 33 arc names and 5 stage titles
   as the pattern; whether they read well is the owner's call.
5. **The type of any individual character.** §5.1 is my reading of a village trade, not a measurement.
   The earnings *consequence* of each type is measured (§5.2); the assignment is not.
6. **Whether the owner's top picks should reach the Magic Academy and the Airship.** §5.2's flag. The
   measurement is done; the preference is not.
7. **The quality-tier → ladder-token mapping** in §4.6 (tiers 1–2 → N, etc.). Invented to spread six
   tokens over fourteen tiers. Marked LOCAL.
8. **Prologue vs prologue+epilogue vs per-stage scenes.** §4.2's owner decision. 33 / 66 / 163 scenes.
9. **How the 6 `reviewRequired:true` builds look.** `crossover/full/batch-summary.json` flags six
   characters as needing a look; I did not open the art. If any needs a re-render it does not change
   this plan, only which stage it sits in.
10. **`ALL_STORY_SCENES`' new line total.** §6.3 needs it to move the pinned `505`; it cannot be known
    until the 33 prologues are written.
11. **Whether a quarantined `events` subtree keeping free crossover Fellows matters to the owner.**
    §6.3 states the behaviour. It is pre-existing, so I did not change it, but with 163 Fellows at
    stake rather than 28 the stakes are larger.

---

## 9. What shipped, 2026-09-17, and what it measured

Tasks 5, 7, 8 and 10 of §7, plus the type decision of §5.2. Files:
`lib/crossover-roster-data.json` (the owner's rank order, `kind`, `roleType`, `type`, and the text),
`lib/crossover-arc-data.json` (generated), `scripts/crossover/build-arcs.mjs`,
`scripts/crossover/build-additions.mjs`, `tests/crossover-arcs.test.mjs`.

**Costs are the owner's halved ladder, not §4.1's.** Decision 2 of `docs/crossover-plan.md` halves
20/40/60 to **10/20/30**, so the table in §4.1 is superseded: tier 1 = 40 characters × 10 = 400,
tier 2 = 60 × 20 = 1,200, tier 3 = 63 × 30 = 1,890 — **3,490 completions** for the 163, 3,840 with the
eight Isekai arcs. Tier 1 landing on 10 is a coincidence of the halving, not a shared constant: every
arc carries its own `costPerStage`.

**Measured pace** (income from `lib/starter-habits.json` through `lib/habits.mjs`, cost from
`lib/crossover-arc-data.json`; the day-by-day series is walked, not divided — 78, 56, 56, 56, 56, 71,
56 …, 2,064 in 35 days, 8,194 in 140, **58.5/day**):

| Milestone | Completions | Full journal | Half the journal |
|---|---|---|---|
| **1st crossover character** | 10 | **day 1** | day 1 |
| First arc complete (5) | 50 | day 1 | day 1 |
| 10th | 100 | day 2 | day 3 |
| Tier 1 done (40) | 400 | day 7 | day 14 |
| Half the cast (82) | 1,240 | day 21 | day 42 |
| Tier 2 done (100) | 1,600 | day 27 | day 54 |
| **All 163** | 3,490 | **day 60** | day 120 |
| All 198, with the Isekai arcs | 3,840 | day 66 | day 132 |

That is the "about two months" the owner asked for, measured rather than estimated.

**Types.** §5.3's role assignment stands as `roleType` (Brave 44, Unfettered 35, Informed 34,
Inspiring 27, Diligent 23). Five rows then moved for decision 3, each still defensible under §5.1 and
each carrying its reason in the data: **Wolverine** Brave→Unfettered (a loner), **Hulk**
Brave→Diligent (the steadfast), **Thor (Infinity War)** Brave→Inspiring (a figurehead),
**Ahsoka Tano** Brave→Diligent (a training master), **Captain America (WWII)** Inspiring→Diligent (a
drill instructor). Shipped distribution: Brave 40, Unfettered 36, Informed 34, Inspiring 27,
Diligent 26. Of the top twenty by rank, Brave now holds 3 rather than 7 and Diligent 4 rather than 1,
worth +12.7% in best-building operator value. **Vader stays Brave** — §4.6's retemplating owns that.

**Answers to §8's open list.** (2) is now measurable at the shipped prices, above. (5) and (6) are
recorded as choices in the data, with `typeMoved` reasons. (1), (3), (4) and (7)–(11) stay open;
(8) and (10) are still open because the 33 prologue scenes were **not** built: they move
`tests/opening-presentation.test.mjs`'s pinned `54`/`505`, and the gate the owner asked for — a
character joins only by finishing its stage — does not depend on them. The 30 Family stages carry
`kind:"family"` and their ids from `docs/crossover-family-split.md`; they resolve when that layer
lands, which `tests/crossover-arcs.test.mjs` holds as a `{todo}` test.
