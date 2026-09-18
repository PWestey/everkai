# Everkai against the Isekai power graph

System-by-system comparison of `docs/isekai-power-graph.md` against what Everkai ships today.
Measured 2026-09-18. Companion to `docs/power-parity-audit.md` (the term-by-term transcription of
the Power function) and the Spirit/Stella rank measurement; where those two disagree with a number
here, they were measuring the term directly and win.

## 0. The two anchors, and why they disagree

Both halves of every ratio below come from one source, named (rule 1).

| anchor | value | source |
|---|---|---|
| Owner's best hero, original, after a few weeks | **~300,000,000** | the owner (rule 11) |
| Owner's weakest hero, same account | **>5,000,000** | the owner |
| Owner's whole-roster total, same account | **3,497,276,469** | his live original save, recorded as `ORIGINAL_LIVE_SAVE = 3497276` in `tests/crossover-ceiling-fixture.mjs:133` (already divided by 1,000) |
| Everkai, Fellow at level 312, aptitude 1000, best artifact at level 200, nothing else | **1,556,616** | computed from `lib/adventure.mjs:107-109`: `floor((80+20×312) × (1000+70+1393)/10)` |
| the same Fellow, originalProgression mode, quality 14 | **9,050,508** | `floor(3566 × (1000 + 75 + 70 + 1393))`, `lib/adventure.mjs:109` with `sourceCoefficient(312)=3566` |
| Everkai's whole-roster ceiling, flag off | **4,655,637** (1.331×) | `tests/crossover-family.test.mjs:480` |
| Everkai's whole-roster ceiling, flag on | **11,696,717** (3.3445×) | `tests/crossover-family.test.mjs:535-539` |

**The apparent contradiction is real and it is the finding.** Everkai's *whole-roster* ceiling
already sits at 1.33×–3.34× the owner's real save, and yet a single realistically-progressed Fellow
is **193× short** in default mode and **33× short** in originalProgression mode. Both are true
because the two games distribute power completely differently:

- The original is **peaked**. 300,000,000 on the best hero, >5,000,000 on the worst — a **60:1**
  spread, and the top hero alone is ~8.6% of the roster total.
- Everkai is **flat**. Its ceiling is reached by pushing 111 Fellows to the same maxed record. The
  per-Fellow terms that could make one Fellow enormous (Stella) exist for **4 of 180 originals**;
  the crossover shard track gives a flat 35,300,000 to all **133** additions, which makes the
  *additions* the peak and leaves the original roster flat.

So the 150× the owner sees is not "Everkai is 150× too weak overall". It is **"Everkai has no
peak"** — no per-hero term worth nine figures, and no account-wide floor worth seven.

## 1. System by system

`P` = present and numerically comparable · `D` = present but different · `A` = absent.

| # | Original system | Everkai | state | worth at a few-weeks account | worth at cap |
|---|---|---|---|---|---|
| 1 | **Broadcast halos** — 5,230 of 6,780 `SkillBase` rows target `country`/`rare`/`all`/`bond`, summed into one `percent` (`PropManager.lua:551-571`) | nothing. Every Everkai bonus is per-Fellow or Family-recipient-scoped. `bondFactor` is `1 + Σ level×0.02` (`lib/bonds.mjs:6`), realistic 1.2–2.0 | **A** | **×5 to ×20** | **×765** (hero 113's `percent` ceiling 7,642,625) |
| 2 | **Spirit** `Hero###_Power_#` — 132 rows, `extradd`, `Hero113_Power_1` reaching **149,000,000** at level 20; granted by `HeroSpirit.json` | 4 Stella profiles, imported from the *other* family `Hero###_SelfPowerAdd_#` (4 rows, max 35,300,000), plus a crossover track for 133 additions | **A** for 122 of 126 spirit heroes | **+3M to +149M flat, per hero** | 13,740,750,000 across the roster |
| 3 | **Museum exhibits** — `Exhibit.json`, 25 `levelUpSkill` rows writing `atk/extradd`, scoped by `rare`/`country`, **2,379,600 at level 1 → 18,694,500 at level 120** | `museumBonus` returns `{aptitude ≤317, basicPowerPercent ≤60, powerPercent 0}` (`lib/museum.mjs:17`). `lib/treasure-data.json` says so itself, 7 times: *"Recovered but not modelled: flat attack (extradd); Everkai has no flat-power bucket on museumBonus"* | **A** | **+1M to +7M flat to EVERY hero** — this is the original's floor | +18,694,500 |
| 4 | **Stars** — `HeroStar` 7 rows: `riseADH` → 6,000, `extraAtk` → **7,500,000** flat, `starHaloSkillLevel` 1→7 driving 835 `Hero_Star_Halo_Nomal` atk rows (390 `percent`, **444 `finalpercent`**) | `STAR_CAP 7 × STAR_APTITUDE_PERCENT 5` = **+35% aptitude** only (`lib/adventure.mjs:100-106`) — a `coef` effect where the original's is `extradd` + `percent` + `totalpercent` | **D**, wrong bucket | +7.5M flat + ~+35% total | `finalpercent` 1,125,000 game-wide |
| 5 | **Talent stack** — `coef` reaches **219,033** for hero 113 from ~20 systems, each an independent sum | `f.aptitude` hard-capped at **1000** (`lib/adventure.mjs:137`), plus `heroRow-10+quality` (75), gear (70), artifact (1,393) = **2,538** | **D** | near parity (~2,500 both) | **86× short** |
| 6 | **Level curve** `HeroLevel.coefficientADH` 300→15,500 | exact import, `lib/original-progression-data.json` `levels[].coefficient`, 750 rows | **P** | parity | parity |
| 7 | **Breakthrough** `HeroQuality` 14 rows, `Talent` +65, `levelLimit` 100→750 | exact import, `qualityRule()` | **P** | parity | parity |
| 8 | **Artifacts** `Equipment` 99 rows, `initialTalent + riseTalent×coefADH(200)`, best 70+8×199 = 1,662 | `GEAR` best 70 + `perLevel 7 × 199 = 1,393` → **1,463** | **P** (−12%) | −199 talent | −199 talent |
| 9 | **Pets** — five buckets (`PetInfo.lua:848-852`): `extradd` 50k–1M/roll, `percent` 300–30,000, `coef` 2–250, `coefpercent` 951–1000, `totalpercent` | `familiarBonus` → flat 9,250,000 · aptitude 3,600 · percent 450 · finalPercent 115 (`lib/familiar-nodes.mjs:13`) | **D — Everkai is richer** | Everkai ahead | Everkai's `aptitude 3,600` exceeds the original's pet `coef` cap of ~250/slot |
| 10 | **Costumes** `HeroClothes` 178 rows → `coef` 116,200 + `coef` extra 72,900 + `percent` 848,000 + country halos | `lib/wardrobe.mjs` — cosmetic; costumes carry no power term in `bondedPower` | **A** | ×2–×5 missing | ×85 missing |
| 11 | **Wife blessings** `Wife_BlessSkill#_#` 34 rows → `coef` 6,600 + `percent` 1,305,000 | `blessingPower` (`lib/blessings.mjs:29`): APK ladder flat **16,151,000**, percent **3.5**, ≤8 supporters → flat 129,208,000 / percent 28.0 | **D — Everkai is richer on flat, poorer on percent** | Everkai ahead if the ladder is reached | original ×130 vs Everkai ×28 |
| 12 | **Character groups** `CharacterGroup` 38 albums → 799 rows × 300 `percent` = 496,400 account-wide | nothing | **A** | ×1.5–×3 | ×49.6 |
| 13 | **Fishing** `Fish`/`Fish_G_` → `coef`, `percent`, `extradd`, `FishCombination` `finalpercent` 5,000 ×2. **Uncapped** (`maxUpgradeLevel 99,999,999`) | `fishingBonuses` best profile: flat 3,195,000 · aptitude 176 · percent 132 (`lib/fishing.mjs:60`) | **D** | comparable | the original's is unbounded; not measurable from tables |
| 14 | **Activity skills** `Hero_Activity_Skill` 49 rows, `finalpercent` 2,000 each | nothing | **A** | +20% each | ×11.2 |
| 15 | **Tower Defense / Medicine / Farm / Relics** feeding `coef` via `heroskilltalent` | the systems exist (`lib/familiar-tower.mjs`, `lib/apothecary.mjs`, `lib/farm.mjs`) but none is a term in `bondedPower` | **A** (as power sources) | ×1.2–×2 | ~3,000 talent |
| 16 | **Village: `heroconversion`** — hero Power enters building yield as a **`base`** part (`MainCityManager.lua:392`) | `rosterOperation = Σ bondedPower/1000` (`lib/businesses.mjs:95`), added once per open business inside `enterpriseRate` (`:120-123`) | **D — structure differs** | see §3 | see §3 |
| 17 | **Village: assigned heroes** — `dispatchconversion` = the assigned hero's `Hero_Appoint_Base_1` **skill level** only, 5,000+500×299 = **+1,545%** each, 5 heroes ⇒ **+7,725%** (`MainCityManager.lua:421-436`) | `assignedOperation` (`lib/operations.mjs`) multiplies business income; not the original's curve | **D** | the original's staffing multiplier is far larger | ×78 on one bucket |
| 18 | **Village: quality + bank** — `BuildingQuality.yieldRise` 0→1,120,000 (**+11,200%**) and `CityBank.cityIncomeRate` 0→199,000 (**+1,990%**), both summed into the same `percent` | `businessBonus.total` = `assignedOperation + quality + fathomBonus + farm` (`lib/businesses.mjs:106`) | **D** | — | the original's `percent` bucket for yield reaches ×212 from these two alone |
| 19 | **Village: `Wife###_NewHalo_1`** — 89 rows writing `yield` percent, **1,604,500 (+16,045%)** account-wide | nothing equivalent | **A** | large | ×161 |
| 20 | **Cap-raising edges** — `talentLvLimit` (597 rows), `equipmentLvLimit`, `equipmentQualityLimit`, `maxLevel` | `ARTIFACT_CAP 200`, aptitude cap 1000, `STAR_CAP 7` — all fixed constants | **A** | none directly | they are what unlocks #5 |

## 2. Ranked gaps

Ranked by what each is worth to **one Fellow at a realistic few-weeks account**, which is the number
the owner is actually looking at.

| rank | gap | worth at a few weeks | worth at cap | why it ranks here |
|---|---|---|---|---|
| **1** | **No broadcast halo layer** (#1, #10, #12, #14) | **×5 – ×20** | **×765** | It is the single biggest multiplier *and* the structural difference. 77% of the original's skills broadcast; Everkai has none. It also makes roster completion quadratic instead of linear, which is the shape the owner will feel. |
| **2** | **Spirit `Hero###_Power_#` missing for 122 of 126 heroes** (#2) | **+3,000,000 – +149,000,000 flat** | 13.74e9 across the roster | This is what makes a *best* hero. Without it there is no peak, and the owner's "300M best" is unreachable for any original Fellow. |
| **3** | **No account-wide `extradd` floor** (#3, and the `rare`-scoped rows generally) | **+1,000,000 – +7,000,000 to every Fellow** | +18,694,500 | This is what makes the *weakest* hero >5,000,000. Everkai's weakest Fellow is near zero. Everkai's own data files already record this as recovered-but-unmodelled. |
| **4** | **Stars are in the wrong bucket** (#4) | +7,500,000 flat and ~+35% `totalpercent`, currently delivered as +35% aptitude | 444 `finalpercent` rows unrepresented | Cheap to fix — the table is 7 rows — and it moves both the peak and the floor. |
| **5** | **Talent cap of 1000** (#5) | ≈ parity today | **86×** | Harmless now, fatal later: it is a hard ceiling where the original has an open-ended sum. |
| **6** | **Costumes carry no power** (#10) | ×2 – ×5 | ×85 | 178 rows of `Hero_Clothes_Talent_#` (900 each) and 76 of `Hero_Clothes_ExtraSkill_#` (8,000 percent each) are already extracted and unused. |
| **7** | **Village staffing curve** (#17, #18, #19) | — | ×212 from quality+bank, ×161 from Wife yield halos | Affects earnings, not Power. See §3. |
| **8** | **The `/10` divisor in default mode** (`lib/adventure.mjs:107`) | **×5.81** | ×5.81 | Not a parity gap — it is the difference between Everkai's two modes. `originalProgression` already removes it. Worth naming because it is most of the visible "under 2,000,000". |

### The combination that explains the 150×

Take the owner's Fellow at level 312 in **default** mode, **1,556,616**, and the original's best at
**300,000,000**: a factor of **192.7**. It decomposes cleanly, and every factor below is measured:

| step | factor | running total | source |
|---|---|---|---|
| Everkai default mode, L312 | — | 1,556,616 | `lib/adventure.mjs:107-108` |
| drop the `/10` and use `coefficientADH(312)=3566` instead of `80+20×312` (i.e. turn on `originalProgression`) | **×5.81** | 9,050,508 | measured by the same expression |
| add the broadcast `percent` layer at a modest few-weeks value of **+300%** | **×4** | 36,202,032 | hero 113's `percent` ceiling is +76,426%; +300% is 0.4% of it |
| add the account-wide `extradd` floor (Museum exhibits at low level + rarity broadcasts) | **+~5,000,000** | 41,202,032 | `Exhibit` level-1 sum 2,379,600, scoped |
| add one Spirit `Hero###_Power_#` at roughly level 17 of 20 | **+129,000,000** | 170,202,032 | `SkillLevel` for `Hero113_Power_1` |
| add star `extraAtk` and the `finalpercent` tail (+35%) | **×1.35 on the extradd-inclusive total, +7.5M** | ~239,000,000 | `HeroStar`, `Hero_Star_Halo_Nomal` |
| the remainder is roster completion and costumes | ×1.25 | ~300,000,000 | — |

**Plainly: the 150× is `originalProgression` being off (×5.8), times a missing broadcast-percent
layer (×4–20), plus a missing Spirit flat-power track worth up to +149,000,000 on its own.** No
single one of those explains it; the product does. And nothing in the chain is near the original's
ceiling — see the next section.

### Is 300,000,000 reachable in the original's tables, and how?

**Yes, comfortably, by at least three independent routes**, none of which requires anything close to
a maxed account:

1. **Spirit alone.** `Hero###_Power_#` is `extradd` and is not multiplied by Talent. 132 rows,
   mean value at top level 112,600,000, max 149,000,000; several heroes own two to four such rows.
   A spirit-invested hero reaches 300,000,000 from `extradd` and nothing else. MEASURED.
2. **Multiplicatively, at level 312.** `3,566 (base) × 2,500 (a modest Talent) = 8,915,000`, then
   `× (1 + 330,000/10,000) = ×34` ⇒ 303,110,000. That `percent` of +3,300% is **0.43%** of the
   +76,426% available to a rarity-5, country-3 hero. MEASURED.
3. **At the level cap.** `15,500 × 2,500 = 38,750,000`, `× 8` ⇒ 310,000,000. A ×8 on the `percent`
   bucket is +700%. MEASURED.

For scale, hero 113's own ceiling is of order `15,500 × 765 × 219,033 + 9.0e8`, then `×36.2`, i.e.
**~9 × 10^13**. The owner's 300,000,000 is about **3 parts per million** of it. *The original's
tables are not the constraint; a few weeks of play is.*

And the >5,000,000 floor on the weakest hero is explained without any per-hero investment at all:
a level-100 hero with base 925 and a bare Talent of ~1,500 is 1,387,500, and the account-wide
`extradd` layer (Museum exhibits + `rare`/`all` broadcasts) adds 1–4 million on top of that
regardless of what that hero has done. **The floor is account-wide; the peak is per-hero. Everkai
has neither.**

## 3. Account-wide layer inventory

What is genuinely account-wide in the original (one purchase, every hero benefits), with Everkai's
status:

| layer | original scope | Everkai |
|---|---|---|
| Museum / `Exhibit` (137 rows) | `all` + `rare` + `country`; `extradd` and `percent` | aptitude + `basicPowerPercent` only; `powerPercent` is a **dead term** — no row in `museum-data.json` or `treasure-data.json` sets it |
| Character groups (`CharacterGroup`, 38) | `all`/`country`/`rare` `percent` | absent |
| Fishing (`Fish`, `FishCombination`) | `all`/`country`/`rare`/`sex`, all four buckets | present, per-Fellow filtered by type/rarity |
| Wife blessings (`WifeBless*`) | `bless`-gated, `coef` + `percent` | present as Family blessings, recipient-list scoped |
| Bonds (`HeroBond`, 23 × 5) | bond group, `coef` + `percent` | `lib/bonds.mjs`, per-Fellow, `1 + level×0.02` |
| Tower Defense, Medicine, Farm (SG3), Relics (SG5) | `all`/`country`/`rare` into `coef` | the systems exist; **none is a term in `bondedPower`** |
| Building appearance | `all` into `coef`, and building `yield` `percent` | absent |
| City Bank (`CityBank`, 200 rows) | building `yield` `percent`, +1,990% | absent |
| Building quality (`BuildingQuality`, 469 rows) | building `yield` `percent`, +11,200% | `businessBonus` quality term, different curve |
| `Wife###_NewHalo_1` (89 rows) | building `yield` `percent`, +16,045% | absent |
| Prosperity (`totalProsperityPower`) | the account-wide income rate; gates player level via `Level.prosperityNeed` 30 → 3.1e12 | no equivalent aggregate |
| Cap-raisers (`talentLvLimit` etc., 597+ rows) | raise other systems' caps account-wide | absent; Everkai's caps are constants |

## 4. What a faithful rebuild does to the pinned figures — and to saves

### The pinned ceilings

`tests/fellow-power.test.mjs` and `tests/crossover-family.test.mjs` pin Everkai's whole-roster
`rosterOperation` against **one denominator: 3,497,276**, the owner's live original save. Today:
1.331× flag off, 3.3445× flag on. The owner accepted ~2× and ~4× respectively.

**A faithful rebuild breaks both by one to two orders of magnitude, and it should.** Closing gap #1
alone (a ×5–×20 broadcast layer) takes the flag-off ceiling from 4,655,637 to roughly 23,000,000 –
93,000,000, i.e. **6.7× – 26.6×** the denominator. Closing gap #2 as well adds up to 149,000,000
*per Fellow*, which on 111 Fellows is another 16.5e9 of power = **+16,539,000** of conversion on its
own, i.e. ~4.7× the denominator from that one track.

**The denominator is the problem, not the ceiling.** 3,497,276 is one few-weeks save, and §2 shows
it is ~3 parts per million of what the original's tables allow. Pinning a *maxed* Everkai against a
*few-weeks* original was always comparing two different things, and the 2026-09-16 decision to
accept ~2× was reasonable only while Everkai had no peak and no floor. **Recommendation:** keep
`ORIGINAL_LIVE_SAVE = 3,497,276` as a *pacing* check — "does Everkai at a few weeks land near the
original at a few weeks" — and introduce a second, separate ceiling pin against the original's own
table maximum. Those are two different questions and one constant cannot answer both. Proceeding on
that recommendation unless the owner objects (rule 9).

The narrower consequence: `tests/fellow-power.test.mjs`'s ~1.99×/1.33× note and
`tests/crossover-family.test.mjs:480` / `:535-539` will all need rebaselining as a **deliberate,
announced move**, with before/after numbers in the commit message, not as drift.

### Saves (rule 12)

I checked what stores a value *derived* from `bondedPower`:

| stored value | derived from power? | does raising power invalidate it? |
|---|---|---|
| Mine receipts, `lib/mine-clearance.mjs:37-48` | `clampOk` compares `r.after === min(TOTAL, r.before + r.power)` against the receipt's **own stored** `r.power` | **No.** Power is stored, not recomputed. But `int(r.power, 1e15)` is a hard bound, and `TOTAL` is 41,678,127,000 — a Fellow at 1e9 bottoms the mine in ~42 digs; at 1e13 in one. Pacing breaks before validity does. |
| Trading-post runs, `lib/trading-post.mjs:7` | `validRun` checks `p.won === (p.power >= r.opponent.power)` using stored values | **No** — internally consistent. `int(p.power,1e15)` bound applies. |
| `northernStats`, `lib/northern.mjs:8` | **recomputed live**: `min(200, max(2, floor(sqrt(power)/5)))` | **No**, but it is already saturated: 111 Fellows × 1.5e6 gives `sqrt/5 ≈ 2,600`, clamped to 200. Any rebuild leaves it pinned at 200 — which means **the whole Northern power term is already dead** and a rebuild will not revive it. Worth a catalogue row. |
| `openingPower`, `lib/opening.mjs:76` | recomputed, `×100` in default mode | no validity issue |
| `STAGES[].power`, `lib/adventure.mjs:110` | thresholds `ceil(100 × 1.16^i)`, topping out at **~7,370** at stage 30 | already trivially beaten by a 1.5e6 Fellow. A rebuild makes the adventure ladder meaningless by a further 5 orders of magnitude. **This needs its own decision, not a rebaseline.** |
| `rosterOperation` → `enterpriseRate` → village gold | recomputed live every tick | **Gold inflation is the real save risk.** `MAX_GOLD = 1e15` (`lib/limits.mjs`) and `MAX_FELLOW_XP = 1e13`. A ×20 power rebuild is a ×20 income rebuild through `rosterOperation`, and existing saves will hit those ceilings in days rather than months. |

**The cheap check CLAUDE.md prescribes still applies and I have not run it:** generate a save on the
current build and decode it with the rebuilt one. No power change has been made in this branch —
these documents change no behaviour — so there is nothing to run it against yet. It must run before
any of the gaps above is closed.

## 5. What could not be measured, and the measurement that would settle it

1. **`heroconversion`** — the term by which hero Power enters building yield
   (`MainCityManager.lua:392`). Server-side; the client only reads the part. `docs/slice-buildings.md`
   records `totalFellowPower × 10/10000`, and `lib/businesses.mjs:95` implements exactly that, but
   the derivation is INFERRED. **Settled by:** one `SYNC` payload from the replacement server
   alongside a known roster total, or the server's own yield code. This is the most load-bearing
   unmeasured number in the project.
2. **Hero base ATK** — INFERRED as `initialATK + riseATK × coefficientADH(level)` by analogy with
   `EquipmentManager.lua:239`. **Settled by:** one hero's `base` part read off a live prop sync at
   two known levels.
3. **Fishing's real ceiling** — `maxUpgradeLevel = 99,999,999` is a sentinel. **Settled by:** the
   fish-count gate (how many of each species the game lets you hold), which is in `Fish.json`'s
   companion tables, not in `SkillBase`.
4. **Realistic few-weeks values for the `percent` bucket.** Everything in §2's decomposition marked
   "modest" is a model, not a measurement. **Settled by:** one screenshot of the original's hero
   detail panel — it itemises `AllTalents`, `AllFightPercent`, `AllFightExtAdd` and
   `TotalFightPercent` separately (`UnderlingData.lua:430-451`), which would pin all four buckets at
   once for a real account.

## 6. Questions only the owner can answer

Batched, with a recommendation, per rule 9.

1. **Re-anchor the ceiling tests?** Recommendation: yes — keep 3,497,276 as a *few-weeks pacing*
   check and add a separate pin against the original's table maximum. Proceeding on this unless
   told otherwise.
2. **Was your best hero's power mostly one big number, or lots of small ones?** The original's
   hero panel itemises four buckets. If you remember the panel showing a huge flat "Power" line, gap
   #2 is confirmed as rank 1; if it showed a huge percentage, gap #1 is. This is the one thing a
   screenshot or a memory settles instantly and measurement cannot.
3. **How many of your heroes had a Spirit/Stella rank at all after a few weeks — one, a handful, or
   most?** This decides whether the rebuild gives 122 Fellows a track (peaked but broad) or gates it
   hard (peaked and narrow).
4. **The adventure stage ladder tops out at power ~7,370 and is already meaningless.** Rebuild it to
   the original's curve, or retire it? Recommendation: rebuild it from `LevelNormal`/`LevelBoss`
   (which live in `split_*` companions) at the same time as the power rebuild, because rescaling it
   twice costs more than doing it once.
