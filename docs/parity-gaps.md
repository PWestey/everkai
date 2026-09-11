# Everkai permanent-system parity audit

Audit of the repository at `e9ef386` (2026-09-11). Read-only; nothing was edited.
Sources read: `SYSTEMS.md` (519 lines), `README.md`, `docs/DEVELOPMENT_HISTORY.md`, `docs/event-catalog.md`, every gameplay `lib/*.mjs` module, the `lib/*.json` provenance/limits/sandbox blocks, the user-facing disclosure text in `app/*.tsx`, and the test file list plus test titles.

Rating scale: **FULL** = original loop and content · **PARTIAL** = core loop, missing sub-features or content · **SHELL** = screen exists, few mechanics · **ABSENT**.

House caveat from the ledger itself: "Do not label a whole system reproduced merely because one button exists" (SYSTEMS.md:59). No permanent system reaches FULL. Nearly every loop mixes recovered APK/community data with free "sandbox" grants and local numbers.

---

## 0. Cross-cutting findings (these affect every system)

1. **Acquisition mostly comes from free sandbox grants, not an earned economy.** Examples: bait (`claimBait` +20), Fairy Bottles (`wishSupply` +100), Magic Ore (`claimOre` +1000), Stella fragments (+1000), Insight (+1000), Blessing Points (fill to 1B, `specialBlessingSupply`), building materials (+100), breakthrough supplies (10M EXP, `claimOriginalSupplies`), keepsakes (`claimMuseum`), Expo stalls (`claimExpoStall`), familiars (`adoptFamiliars`), costumes (`wardrobeCollect`), banquet materials (`banquetPrepare`), Inn stamina refill, Workshop restock and finish, Farm "Mature now", Treasure refill, Northern supplies, Raphael stamina, Hire Cards, artifacts (`claimAllGear`), consumables (`claimConsumable`), and the free Fellow/Family recruit-all buttons. Earned routes exist in places (opening journey, Mine Clearance → Ore, Banquet/Trading Post/Northern shops → cards/pearls/ore, Workshop → pearls, Raphael milestones), but they are thin. Most original daily and reward loops that feed these systems are missing.
2. **Two parallel growth modes.** "Classic sandbox growth" and opt-in "APK growth" (Training Rules; `lib/original-progression.mjs`, `training-costs.mjs`). Some features only work in APK mode: paid staffing, recipe visitors, blessing rows 37–700, Special Blessing, 299 talents.
3. **Power is reconstructed.** `bondedPower` in `lib/adventure.mjs` builds a local ordering of Aptitude × coefficient × bonds/blessings/museum/familiar/fishing/echo/Stella/elixir. SYSTEMS.md:297 says "Roster Power itself remains reconstructed". Every Power gate and business roster contribution inherits this.
4. **Offline accrual cap.** `MAX_AWAY_MS = 8h` in `lib/game.mjs`, the original prototype value. DEVELOPMENT_HISTORY.md:5 says "Away earnings stop at eight hours". Parity with the original cap is not documented.
5. **Multiplayer is removed or simulated by design** (event-catalog.md §3; memory rule). Banquet guests, Trading Post opponents and Mine guild help are simulated or dropped.

---

## 1. Village businesses (17 buildings)

### 1a. Core business layer: employees, staffing, Fellows operating, earnings
- **Implemented**
  - `lib/businesses.mjs`: 17 original `BuildingBase` identities with source descriptions and types.
  - Open a business (free sandbox). Hire 1/10/50/200/800/5000 employees for free, capped at 5000.
  - Fellow operator slots open at employee thresholds 0/50/200/800/5000.
  - Earnings = (employees × rate + roster Power/1000) × (1 + assigned operation % + quality bonus).
  - Fishing per-employee and Inn-gift % modifiers apply.
  - APK growth snapshots employee cohorts (v104).
  - `lib/staffing.mjs` (Paid growth, v105): recovered hiring cost bands, gold hires of 1/10/budget-max, quality 1→26 using building materials, cap up to 26000.
  - `lib/hire-cards.mjs`: 1/3/5-employee cards, uniform random target.
  - `lib/operations.mjs`: assigned operation % for only **4 Fellows** (Fifi hero_1, Amaterasu hero_117, Reir hero_3, Pump hero_5).
  - UI: `app/business-panel.tsx`, `paid-staffing.tsx`, `hire-card-panel.tsx`, `village-map.tsx` (17 building textures).
  - Legacy starter businesses (Fish Stall, Village Inn, Flower Shop; level 1–10) remain in `lib/game.mjs`/`catalog.mjs`. These are Everkai's own prototype, not original.
- **Missing or local (docs)**
  - SYSTEMS.md:289: "Missing operation/upgrade/service/Inn/Farmstead/Guild bonuses are not fabricated… Full service costs, hiring curve, bonus tables and rounding remain missing."
  - SYSTEMS.md:297: "operation-skill percentages, service and costs remain missing."
  - SYSTEMS.md:313: "Service costs/thresholds missing. No universal curve inferred."
  - SYSTEMS.md:53: "Gold discounts and complete original prosperity composition remain unverified. Some late hiring exceeds local gold capacity."
  - SYSTEMS.md:325: Fifi's level-200 bonus is "beyond the current level60 cap". SYSTEMS.md:430: "No Study Notes spending added."
  - SYSTEMS.md:458: "Unknown Airship/Magic Academy types … excluded."
  - `app/business-panel.tsx`: "Service levels and operation upgrade costs remain pending"; "Type restrictions are waived"; "Selected Fellow: operation bonus not yet verified."
  - `app/paid-staffing.tsx`: "Hiring discounts and remaining original earnings modifiers are not yet modeled."
  - Business "stars" exist only as an opening-journey adapter: `lib/opening.mjs` `openingStar`, with "Opening stars are a local quest adapter" in `app/opening-panel.tsx`.
  - No building appearance or decorations (event-catalog.md:309 "Building Appearance (absent)").
  - Study Notes (`Item_HeroManagerment_Building`) come from the Fountain but cannot be used.
- **Depth: PARTIAL.** The workforce and earnings core is solid. Service levels, operation-skill training, per-Fellow operation data for about 155 other Fellows, prosperity, decorations and building-specific bonus tables are missing.
- **Tests:** `businesses`, `staffing`, `employee-yields`, `hire-cards`, `operations`, `earnings-items`, `economy-performance`, `village`, `game`.

### 1b. Inn (Building_101 / SimGame1)
- **Implemented** (`lib/inn.mjs`, `inn-progression.mjs`, `inn-guests.mjs`; `app/inn-panel.tsx`, `inn-guests-panel.tsx`, `inn-business-scene.tsx`)
  - 10 stations and 80 dishes with public guest/station gates. Build with gold, upgrade with blueprints (cap 20).
  - Develop recipes. Receive 1/5/10 guests using stamina, served in an offline serial queue of 10-second meals.
  - Each guest gives deposit gold, a blueprint and finesse.
  - Popularity rating with 20 thresholds unlocks stamina caps 20–60.
  - 7 special guests: 5 typed employee % gifts, Noble Lamp, Hunter's Hat.
- **Missing or local**
  - SYSTEMS.md:349: "All numeric service prices/rewards/durations are explicitly local sandbox balance… No fabricated dish building modifiers, rating thresholds, special-guest rewards or probability table."
  - SYSTEMS.md:355: "Missing popularity0 and missing finesse1 remain declared fallback."
  - SYSTEMS.md:474: "Local arrival/daily-limit waiver … no Gratitude upgrades."
  - `inn-data.json` sandbox block: recipe tasks waived; 50 gold/guest, free stamina refill.
- **Depth: PARTIAL.** The loop is complete, but prices, timings, dish effects, random guest arrivals and Gratitude are local or absent.
- **Tests:** `inn`, `inn-progression`, `inn-guests`, `inn-school-treasures`.

### 1c. Workshop (Building_301 / SimGame2)
- **Implemented** (`lib/workshop.mjs`, `workshop-policy.mjs`; `app/workshop-panel.tsx`)
  - 50 products with APK Sales EXP, coins/s and duration. One Fellow runs a batch of 1/5/10 using supplies.
  - Coins accrue continuously; EXP is granted per unit; daily "hot" product gives +20%.
  - Deposit → wallet → Skill Pearl store at 2000 coins.
  - Local mastery tiers 1–10.
- **Missing or local**
  - SYSTEMS.md:363–365: "themed product-type mapping (original type field absent), one local supply per unit/free20restock, previous-product-one-craft unlock, deterministic UTC hot rotation, 2000coins/Skill Pearl. Product effects/levels and evaluation odds remain unimplemented."
  - SYSTEMS.md:390: mastery "is deliberately reconstructed balance."
  - `app/workshop-panel.tsx`: "Actual recipe materials, evaluation odds and product-level P[ower]…" are not modeled.
- **Depth: PARTIAL.** The production timer loop exists. Materials, product effects/levels, evaluation and the real type mapping are missing.
- **Tests:** `workshop`.

### 1d. Magic Farm (SimGame3) and Farmstead
- **Implemented** (`lib/farm.mjs`, `farm-trade.mjs`; `app/farm-panel.tsx`, `farm-trade-panel.tsx`)
  - 39 plants, each with 3 source harvest levels. Sow → water → timed harvest → Knowledge → plot expansion (6 plots).
  - Local orders (3 slots) → Morning Dew → 5 typed Alraune essences → +1 Aptitude.
- **Missing or local**
  - SYSTEMS.md:375: "No guessed order payouts, Alraune exchange, plant Power/building effects or upgrade costs."
  - SYSTEMS.md:383: orders are "LOCAL three-slot offers".
  - SYSTEMS.md:418: "Free per-sowing harvest-level selection is local access policy… Upgrade costs/passive bonuses remain unimplemented."
  - `app/farm-panel.tsx`: "Soil, Money Tree and plant Power/bu[ilding effects]…" are not implemented.
  - `farm-level-data.json` unknown: "level-up costs", "level versus star/production gate joins", "effect activation and stacking".
  - **Farmstead:** the Fountain reward "Farmstead Upgrade Blueprint" (`Item_LvUp_Bank`) is mapped only to the legacy Fish Stall level ("Bank tier (Fish Stall level)", `lib/opening.mjs`). There is no Farmstead system.
- **Depth:** Magic Farm **PARTIAL**; Farmstead **SHELL** (opening adapter only).
- **Tests:** `farm`, `farm-levels`, `farm-trade`.

### 1e. Apothecary (Building_201 / Medicine)
- **Implemented** (`lib/apothecary.mjs`, `medicine-discovery.mjs`; `app/apothecary-panel.tsx`, `medicine-lab.tsx`)
  - Counter with 3 shelves; brew 1/5/20 for 5 gold each.
  - Customers every 20 s, offline sales, and a deposit cap of 500 × shelves.
  - 10 of the 20 potion records are sellable, unlocked by sales count.
  - v107 adds 10 staff-gated five-colour recipe puzzles (APK growth only).
- **Missing or local**
  - SYSTEMS.md:41: "No automatic staffing unlock, event recipe, ingredient charge, free bottle, potion skill or stock/deposit capacity change."
  - `app/apothecary-panel.tsx`: "three shelves, 20-second customers, prices and deposit capacity are local rules… Event formulas, potion skill bonuses and nurturing are not implemented."
  - Potion `skillText` (for example "Inspiring Fellow Power +0.5%") is **not applied** anywhere in `bondedPower`.
  - The permanent "Adventure Mode" left by the Mentor & Apprentice event is absent (event-catalog.md:175).
- **Depth: PARTIAL**, toward SHELL on effects: selling works, but potion skills, nurturing and the other 10 potions do not.
- **Tests:** `apothecary`, `medicine-discovery`.

### 1f. Other named businesses with special mechanics
- Spring Resort (501) and Scroll Shop (401) appear only in operation-bonus scopes (Reir/Pump +20% at level 50, SYSTEMS.md:430). Scroll Shop also appears as an opening land gate.
- Museum (901), Bank (1101), Airship (1601) and Magic Academy (1701) have **no special-mechanic links** in lib or app, beyond generic employees. Airship/Academy types are unknown (SYSTEMS.md:458).
- The original Airship family trip (twins) and Sailing are **ABSENT** (SYSTEMS.md:75 "Pending inventory resources, trip flow and pupil subsystem").
- **Depth: ABSENT** for building-specific mechanics outside Inn, Workshop, Farm and Apothecary.

---

## 2. Stage / Adventure / opening journey / battles

- **Implemented**
  - **Opening journey** (`lib/opening.mjs`, `opening-presentation.mjs`; `app/opening-panel.tsx`, `stage-screen.tsx`, `adventure-panel.tsx`):
    - 136 recovered main tasks and 126 encounters (120 battles plus 6 chapter bosses at stages 21/42/63/84/105/126), across 6 chapters.
    - 12 roadside stage events (reward / choose / appoint Fifi).
    - Fame → rank 1–5 promotions using prosperity. 4 rank-gated Fellow city encounters. An exclusive first-Family branch (Gina or Will).
    - Land gates for opening businesses, 3 operation-skill steps, and an opening item locker.
    - Chapter excerpts (19 scenes/114 lines). An **auto** toggle exists in `stage-screen.tsx`.
  - **Legacy campaign:** 30 generated stages across 5 chapters, with patrols (`lib/adventure.mjs` STAGES).
  - **Frontier:** 12 reconstructed multi-wave encounters, chapters 6–8 (`lib/frontier.mjs`).
  - **Encounter advice** (`lib/encounter-advice.mjs`).
- **Missing or local**
  - `app/opening-panel.tsx`: "The next source quest asks for two artifacts; further chapters and quests remain in the development backlog."
  - `opening-data.json` `nextDeferredTask` Main_task_001490 is at order 157, so the recovered quest chain stops there.
  - Normal fights "use the recovered Gold quote. Bosses use a local Power gate… Full-roster Power is locally scaled ×100 for legacy growth"; "original right/wrong semantics are unresolved"; "reforge… original reforge rolls are not reproduced"; some items "Reserved with its source identity; this use is not implemented yet."
  - SYSTEMS.md:123: "The 30-stage, five-chapter campaign is generated local content… Combat is a transparent deterministic Power comparison; original enemy abilities, attrition and event branches are pending."
  - SYSTEMS.md:396: Frontier "All new encounters/numbers reconstructed."
  - Battles are Power ≥ requirement checks. No battle simulation exists for Fellows; only familiars have one.
  - Rank rewards such as `Reward_Appearance_Avatar_1` and daily rank rewards in `opening-data.json` ranks are not implemented.
- **Depth: PARTIAL.** Chapters 1–6 are recovered. Later chapters, real enemy and reward tables, combat and rank rewards are missing, and the generated 30-stage and Frontier content is not original.
- **Tests:** `opening`, `opening-presentation`, `adventure`, `frontier`, `encounter-advice`, `training-batches`, `supply-batches`, `scene-ui`.

---

## 3. Fellows: recruit, training, skills, equipment, Stella, bonds

- **Implemented**
  - **Roster:** 159 Fellows are playable (SYSTEMS.md:205). 46 album-only records remain across Fellows and Family. `original-album.tsx` shows the pending art.
  - **Recruitment:**
    - Free sandbox `recruit` / `recruitAll` (`lib/game.mjs`).
    - 16 Acquaint Stone recruits via the Fountain (`acquaintance-recruits.json`, community costs).
    - 4 earned opening city encounters, plus an opening "earned recruitment token" in catalog order ("no random odds").
  - **Training:**
    - EXP levels on a local curve, or APK EXP costs for levels 1–60 (`original-training-costs.json`), or APK growth up to 750 with quality 1–14 breakthroughs (`original-progression-data.json`).
    - Local limit breaks in classic mode.
    - Talents: 158 Fellows, 299 paid levels in APK mode (`lib/talents.mjs`).
    - Type Insight I up to level 300 for 158 Fellows (`lib/insight.mjs`).
    - Local "skill" 0–20 using scrolls; sandbox Aptitude via Skill Pearls.
  - **Stella** (`lib/stella.mjs`): **4 owners only** (Angie 40, Liz 40, Rani 40, Elise 20 levels).
  - **Equipment / artifacts** (`lib/artifacts.mjs`, `artifact-echo.mjs`):
    - 89 artifacts with base Aptitude and growth. Level cap 20.
    - Recycling with investment refunds. 33 named Echo bonuses and 3 Family-supported bonuses.
  - **Elixirs:** Basic/Advanced flat Power from Fountain rewards (`lib/elixirs.mjs`).
  - **Skill guide:** 293 profiles and 2,158 nodes, reference only (`character-skill-guide.json`).
  - **Wardrobe:** 157 Fellow costumes, cosmetic only.
  - **Family bonds:** see §4.
- **Missing or local**
  - SYSTEMS.md:121: "Original rarity, type, affinity, awakening, talent, aura and detailed equipment systems are not thereby considered complete."
  - SYSTEMS.md:269: "Personal/special effects, skills, materia, awakening, equip restrictions and upgraded refunds remain unverified/unimplemented; this is base-stat coverage."
  - SYSTEMS.md:225: "Current level 20 cap is provisional."
  - SYSTEMS.md:464: "Family support artifacts, auras, Materia and ascension remain deferred" (27 echo records deferred).
  - SYSTEMS.md:427/479: "Only default tier I is enabled; higher tiers, costumes and post30 costs remain outside scope" / "higher-tier costs/effects excluded"; "Kamakura type unresolved" (SYSTEMS.md:486).
  - SYSTEMS.md:95: gacha "Original pools, unlocks, pity, fragments and duplicates" are pending.
  - `app/character-skill-guide.tsx`: "Reference only. This skill's complete costs, unlocks or effects are not implemented."
  - `app/fellow-training.tsx`: "Other talents and awakening remain pending"; "random skills, ascension and materia are pending."
  - Local Aptitude ceiling of 1000 (`adventure.mjs` validation). Stella activation is "authored" (`stella-activation-policy.json` `originalValueVerified:false`).
  - Fellow Sales EXP from the Workshop has no original spend.
- **Depth: PARTIAL.** Base growth numbers are strong in APK mode. The recruit/summon system, Stella beyond 4 owners, Insight II+, artifact skills/materia/awakening/ascension, auras, non-default skills and operation skills for most Fellows are missing.
- **Tests:** `default-advancement`, `default-talent-source`, `talents`, `insight`, `insight-batches`, `stella`, `original-progression`, `original-training-costs`, `artifacts`, `artifact-expansion`, `artifact-investment`, `artifact-echo`, `artifact-support`, `imported-equipment`, `earned-forge`, `elixirs`, `character-skills`, `character-idle`, `acquaintance-roster`, `acquisition-recovery`, `roster-batch`, `roster-expansion`, `public-reference`, `original-content`.

---

## 4. Family: bonds, intimacy, dates, gifts, pictures, wardrobe, children, blessings

- **Implemented**
  - 119 Family members. Welcome is free (`welcome` / `welcomeAll`); the opening first-Family branch is earned.
  - **Intimacy and Blessing Power** via 5 original gifts plus 10 fixed gifts (`catalog.mjs`, `consumables.mjs`, `gift-batch.mjs`). Gifts are bought with gold at local prices.
  - **Random dates and auto-date** using Energy (1/min, cap rank+2) and Succubus Tonic reserve. Points = Blessing Power × fishing date %.
  - **Blessings** (`lib/blessings.mjs`): Fellow Blessing and Advanced Blessing. Community rows 36/24 in classic mode; APK rows to 700 in APK growth. Special Blessing (`special-blessings.mjs`).
  - **Local bonds** (+2%/level, 10 levels) using documented pairings (`lib/bonds.mjs`).
  - **Relationship tiers 1–5**, local (`game.mjs relationship`).
  - Provisional family "skill": +1% village earnings.
  - **Date pictures** (`lib/family-gallery.mjs`): 195 records. 118 base-gated, 58 costume-gated (57 routes), 17 without image, 2 item-gated and locked.
  - **Wardrobe** (`lib/wardrobe.mjs`): 268 costumes (111 Family), free cosmetic collection.
  - 43 graduation bonds (see §5). Family portraits and idle clips.
- **Missing or local**
  - SYSTEMS.md:67: "free sequential welcome is a sandbox choice; roaming encounters and original unlock requirements pending."
  - SYSTEMS.md:71: "no original date scenes or child chance recreated."
  - SYSTEMS.md:73: family skills are "all provisional. Original affinity mappings, specific skills, unlocks and Fellow attributes pending."
  - SYSTEMS.md:74: "Family relationships | Not implemented."
  - SYSTEMS.md:75: "Trips | Sailing costs Crystals, grants points and one child; Airship … twins | Pending."
  - SYSTEMS.md:139: bond "Pairings, costs and coefficients are local sandbox choices."
  - SYSTEMS.md:510: Special Blessing "original activation price unresolved"; spirit-gated recipients excluded (`blessing-panel.tsx`).
  - SYSTEMS.md:516: wardrobe "full unlock/upgrade debit, effect stacking … ClothesCodex reward joins remain unresolved."
  - `README.md:55`: "This cosmetic policy changes no stats or collection rewards"; 11 art exceptions.
  - `app/family-gallery-panel.tsx`: "Special-item and unresolved routes stay locked."
  - `app/family-panel.tsx`: auto-date "original rank/VIP unlock is waived. Starting stats, welcome method, date rewards, one-minute Energy recovery, shop prices and the +1% skill are local balance."
- **Depth: PARTIAL.** Blessings and gifts are strong. Roaming acquisition, trips/children, relationship skills, date scenes, costume stats/upgrades and a costume shop/codex are missing.
- **Tests:** `family`, `bonds`, `blessings`, `original-blessings`, `special-blessings`, `auto-date`, `gift-batch`, `family-gallery`, `family-scenes`, `wardrobe`, `tonics`, `consumables`, `fishing-dating`.

---

## 5. School (enroll / classroom / graduates / bonuses)

- **Implemented** (`lib/school.mjs`, `education.mjs`, `school-maturation.mjs`; `app/school-panel.tsx` pages Enroll/Classroom/Graduates/Bonuses)
  - Named pupils with a caretaker. 5 original types; grades D/C/B-/B/B+ requiring 100–280 Education Points.
  - Education Points recover 1 per 5 minutes (verified), shared pool cap 6.
  - Class / Teach all / batch / to-milestone lessons give rank × 10 Fellow EXP.
  - Adult-stage milestones. Graduation grants permanent gold/s plus a Gold Ring.
  - 43 graduation bonds. Fishing education % and Inn treasures apply. 3 seats, or 5 via free expansion.
- **Missing or local**
  - SYSTEMS.md:109: "Local choices: three active places; a shared six-point pool; free enrollment instead of original trip acquisition…"; the income formula is "provisional".
  - SYSTEMS.md:113: "Still missing: original pupil acquisition/trips, original type mapping, pupil artwork/story, … unions and original reward curves."
  - SYSTEMS.md:263: "Exact earnings, grade A, original pupil acquisition, unions and workaholic rolls remain pending."
  - SYSTEMS.md:213: "The original per-classroom architecture is not inferred."
  - `app/school-panel.tsx`: "Type and grade selection, seat unlocks and bond activation are free sandbox choices. Grades do not yet reproduce original Intellect or earnings f[ormulas]… pupil acquisition, unions and workaholic probabilities remain pending."
  - Bond upgrades are disabled (SYSTEMS.md:259).
- **Depth: PARTIAL.**
- **Tests:** `school`, `education`, `school-maturation`, `fishing-education`, `inn-school-treasures`.

---

## 6. Fishing (SimGame4)

- **Implemented** (`lib/fishing.mjs`; `app/fishing-panel.tsx`, `fishing-combinations.tsx`)
  - Cast with bait (1 per cast), choosing among 11 grounds.
  - Immutable catch snapshots. Tank display activates each species' normal effect: 86/87 species (35 flat Power, 15 % Power, 36 Aptitude).
  - Duplicate research points upgrade skill to level 3.
  - One guaranteed Gold Crown Kohaku with its crown skill.
  - 22 of 34 combinations: 5 stat, 2 date, 5 employee, 10 education.
  - Baked static art for all 87 fish.
- **Missing or local**
  - SYSTEMS.md:433: "Source catch odds/lengths/crowns/antiques/combinations and full87-profile coverage remain unavailable" (combinations since partly added).
  - `fishing-data.json` `unimplemented`: "catch probabilities", "length ranges/crowns/length rewards", "antiques", "bait regeneration", "fishing level curves".
  - SYSTEMS.md:436: casts rotate "using explicit local policy2". One species (F3506 "Earn Crystals Daily") is deferred.
  - SYSTEMS.md:442: "Crown skill upgrade costs/Crown Points absent."
  - `fishing-combination-data.json`: "Crown and 12 other normal effects deferred"; "All Building Earnings+1 remains deferred" (SYSTEMS.md:458).
  - `app/fishing-panel.tsx`: "Original catch odds and fish lengths are not available yet"; "Crown skill upgrades and random crown catches are not available yet."
  - The skill cap of 3 and removal semantics are local.
- **Depth: PARTIAL.** Collection and effects are strong. The actual fishing minigame (odds, lengths, crowns, antiques, levels, bait economy) is missing, since casts are deterministic round-robin.
- **Tests:** `fishing`, `fishing-combinations`, `fishing-dating`, `fishing-employees`, `fishing-education`, `kohaku-crown`.

---

## 7. Familiars and Familiar Tower

- **Implemented**
  - `lib/familiars.mjs`: 71 profiles, 499 level rows, 10 stages, 100 stars, all trained for free.
  - `lib/familiar-nodes.mjs`: 199 level/star nodes per rarity group, free activation, one-to-one Fellow binding, inherent bonuses feeding Power.
  - `lib/familiar-tower.mjs` plus 6 combat modules: 12 floors, up to 5 familiars, front/back rows. Combat versions 1–10 with 63 of 71 active kits, 25 P1 passives and Dream Eater P2. Rewards are pearls and EXP.
  - Frozen replay fixtures (`tests/frozen-battles-v105/107/108.json`).
- **Missing or local**
  - SYSTEMS.md:237: "Original costs, combat, skills, pet collection bonuses and links to village earnings remain deferred."
  - SYSTEMS.md:341: "acquisition, combat, metamorphosis, original activation costs and exact Power ordering remain unresolved."
  - SYSTEMS.md:411: Tower "Enemy stats, Rage/damage, targeting/ties and first-clear … rewards explicitly local… No original200-floor, idle reward, unique skill or synergy claim."
  - event-catalog.md:309: "Familiar Tower (**partial**, 12 authored floors vs 200 + endless)."
  - SYSTEMS.md:33: "No new passives/block/dispel … Initialization/probability/RNG/order are local."
  - `app/familiar-tower-panel.tsx`: "its original skill is not implemented" for unkitted familiars.
  - "Familiar Adventure" and "Familiar Awakening" appear only as task names (event-catalog.md:291). Familiar Track & Field is an event and is absent.
- **Depth:** Familiars **PARTIAL** (no acquisition/costs/metamorphosis/awakening); Tower **PARTIAL** (12/200 floors, local enemies, 8 kits and P2/P3 passives missing).
- **Tests:** `familiars`, `familiar-nodes`, `familiar-passives`, `familiar-tower`, `familiar-crit`, `familiar-dot`, `familiar-modifier`, `familiar-status`, `familiar-support`, `familiar-trigger`.

---

## 8. Treasure Hunt and Museum

### Treasure Hunt (SimGame5/Relic)
- **Implemented** (`lib/treasure.mjs`; `app/treasure-panel.tsx`)
  - 4 areas and 45 relics with community appraisal weights.
  - Steeltooth level gates. 12 stamina per UTC day (free refill). 12-tile dig board where every third tile holds a gem.
  - Return to camp for gems and EXP. Appraisal → relic; duplicates become that relic's materials.
  - Donate/display. Optional local restoration adds +1 gold/s per level, up to 20.
- **Missing or local**
  - `treasure-data.json`: "community snapshot; not version matched… normal pools only."
  - `app/treasure-panel.tsx`: "Digging layout, costs, EXP, level gates and free refill are sandbox rules… Original relic upgrade costs and Power effects remain unverified."
  - Radar, board randomness and tools are absent. The paid Mole Diggers exhibit gacha is an event.
- **Depth: PARTIAL**, bordering SHELL: the dig board is a fixed pattern.
- **Tests:** `treasure`, `relic-restoration`.

### Museum
- **Implemented** (`lib/museum.mjs`; `app/museum-panel.tsx`): 32 Hall1 keepsakes, 6 with numeric bonuses (Aptitude or Power %). Accept (bonus persists) is separate from display (cosmetic). Collection is free.
- **Missing or local**
  - SYSTEMS.md:275: "This covers the locally named Collection-prefixed subset, not the whole game's Museum."
  - SYSTEMS.md:279: "Original stacking, effect ordering, unlocks, acquisition, upgrades and duplicate rewards are not verified."
  - SYSTEMS.md:295: "later public bonuses not imported."
  - Duplicate → 1000 Crystals conversion (in item text) is not implemented. Other halls are absent. The relic collection lives separately in Treasure.
- **Depth: SHELL/PARTIAL.** A collect-and-accept list with free acquisition, covering Hall1 only.
- **Tests:** `museum`.

---

## 9. Drakenberg facilities

The 16 plates are in `lib/drakenberg-layout.json`. Its provenance says the original buildings are Recruit, Ranking, Challenge, Banquet, Hall of Fame, Trading Post, Roaming, Bazaar, Guild, Costume Shop, Golemore Mine and Archdemon's Temple Challenge, and that "the facility-to-building matching here is ours."

| Facility | Implemented | Missing / local (quote) | Depth | Tests |
|---|---|---|---|---|
| **Mine Clearance** (`lib/mine-clearance.mjs`, `app/mine-clearance-panel.tsx`) | 8 community encounters (Rock Baby…). One owned Fellow per UTC day deals its Power as damage with carry-over. Kills pay gold/EXP/Mine Coins. Shop: 300 coins → Magic Ore, 5 per day. | SYSTEMS.md:482: "persistent daily damage and overflow, UTC reset are explicitly local combat policy." `mine-clearance-data.json`: "no guild hire, rerolls or extra-deploy character skills." Rare shared chests and the Clearance Points shop are absent. | PARTIAL | `mine-clearance` |
| **Northern Odyssey** (`lib/northern.mjs`, `app/northern-panel.tsx`) | Supplies 1 per hour, cap 12. 3 authored floors of 3×3 tiles (camp/cache/heal/monster/signpost). ATK/HP XP training. Coins → Basic Earnings Card. | `northern-data.json` exclusions: "Original map and encounter odds", "Original HP/ATK scaling and costs", "Ranking payouts", "Original milestone or lottery rewards". Only 6 source rules. The panel says "authored maps, a 12-Supply cap, local Power scaling, monster values, training…". Seasons, buildings (Tavern), talents and endless mode are absent. The event catalog classes it as a story event (event-catalog.md:225). | SHELL | `northern` |
| **Trading Post** (`lib/trading-post.mjs`, `app/trading-post.tsx`) | Up to 6 Fellows. Energy 1 plus 3 hourly refills per day. 3 simulated NPC merchants (Power 50/250/1000). 30 coins and 2 Influence per win. Shop has one item (Basic Earnings Card). | `app/trading-post.tsx`: "Original motivation, counter, bounties and quick dispatch are not implemented." Shop is "first shop tier only" (`trading-post-data.json`). Prestige List, designated negotiations and Influence tiers are absent. | SHELL | `trading-post` |
| **Fountain of Wishes** (`lib/fountain.mjs`, `tonics.mjs`, `elixirs.mjs`, `app/fountain-panel.tsx`) | Exact 12-entry APK drop table. 1 wish or 10 for 9 bottles. Fairy milestone (1 stone per 500 wishes, community). 20 fragments → 1 stone. 16 Acquaint-Stone recruits. Tonic/Elixir/Focus Candy/Earnings Card rewards transfer to Bag. | Bottles come only from "Prepare 100 bottles · Free sandbox". Five rewards say "This item's original use is not yet implemented" (Advanced Artifact Chest, Farmstead Upgrade Blueprint, Refining Oil, Study Notes, Building Upgrade Blueprint), since `transferable` needs an EXTRA_ITEMS id. | PARTIAL (closest to FULL) | `fountain`, `tonics`, `elixirs`, `acquaintance-roster` |
| **Banquets** (`lib/banquets.mjs`, `app/banquet-panel.tsx`) | Wine Party (4 seats) and Fine Wine Party (8). Free material prep → host → simulated guests every 5 s → 100 coins and 100 Popularity per guest. 6-item daily shop, including Ore to the forge. | `app/banquet-panel.tsx`: "hosting cost, five-second arrivals and 100 coins/Popularity per guest are local sandbox rules… [ceremonies], expiry, attendance gifts, full-capacity prizes and character bonuses are not implemented." Materials and invitation cards have no earned source. | SHELL | `banquets`, `banquet-equipment` |
| **Mushroom Expo** (`lib/expo.mjs`, `app/expo-panel.tsx`) | 35 stalls (free claim). Only stages 1–5 of 100. Up to 3 staffed stalls, 5 customers × 5 rounds, rating. 12 named-Fellow bonds. 100 Expo Coins per stall upgrade (cap 10). Pearls to Bag. | SYSTEMS.md:446: "First five unflagged stages playable… Customer waves/rounds/mismatch/initial rating, free sequential access and 100-coin upgrade cost/local level10 cap are reconstructed… Stage6+ flags, special buffs, duplicate costs, gacha, timed income and Expo-level curves deferred." 16 faction bonds deferred (SYSTEMS.md:448). All 95 remaining stages are flagged "Verify, Confirm". | PARTIAL (5%) | `expo`, `expo-bonds` |
| **Raphael's Stage** (`lib/raphael.mjs`, `raphael-progress.mjs`, `app/raphael-panel.tsx`, `raphael-progress.tsx`) | 5×5 grid with 27 fans and 8 support items (max 4). Exact directional scoring from public math. Stamina runs of 1/10 (free stamina). 56 milestone rows → locker → Bag/forge. | SYSTEMS.md:229: "All placements and levels are free sandbox actions. No event drop rates, heat loop, shops, currency grants or production rewards are invented." Heat levels, Lucky Star gacha, fan acquisition/levelling costs and ranking are absent. The event catalog classes it as an event (event-catalog.md:226). | PARTIAL | `raphael`, `raphael-progress`, `earned-forge` |
| **Village stories** (`lib/storybook.mjs`, `scenes.mjs`, `app/storybook-panel.tsx`) | 36 original city encounters (411 lines) plus opening scenes. Paged reader with bookmarks and read markers. | SYSTEMS.md:199: "a text replay in numeric source order, not a reconstruction of protected event flow, triggers, portrait changes, rewards or ownership conditions." SYSTEMS.md:470: "no original chronology/voice/branch/reward claim." `storybook-panel.tsx`: "Original scene timing, backgrounds, voices and animations are not reproduced." | SHELL (reader) | `storybook`, `scenes` |
| **Journey** (host) | Familiars, Museum, milestones, opening — covered in the relevant sections. | — | — | — |
| **Habit journal** | Everkai-specific engine: 1.0–2.0× earnings multiplier (SYSTEMS.md:9–13). Not an original system. | n/a | n/a | `habits`, `habit-earnings` |

---

## 10. Storage, inventory, consumables, Journey milestones

- **Bag / inventory** (`app/storage-panel.tsx` categories Item/Events/Fragment/Combine; `supplies-panel.tsx` Materials/Equipment/Supplies/Gifts/Sandbox; `lib/consumables.mjs`)
  - 4 EXP stones, 15 gifts, Basic/Advanced Earnings Cards, Blessing Point Insight, Focus Candy, materials at local gold prices, and equipment for crystals (3 priced) or free.
  - `storage-panel.tsx`: "No combination recipes are available in this sandbox yet."
  - SYSTEMS.md:187: "Random gachapon ranges, event-specific Succubus Energy, unbound Fame … were excluded."
  - `supplies-panel.tsx`: "Shop prices and supply grants are local sandbox settings."
  - Many recovered items are locked with their use unimplemented (Fountain chests and blueprints, opening locker items, Expo locker rewards).
  - **Depth: PARTIAL.** Tests: `consumables`, `supply-batches`, `earnings-items`, `imported-equipment`.
- **Journey milestones** (`lib/progression.mjs`)
  - **11** one-time local milestones; rank = 1 + floor(EXP/100); Energy cap depends on rank. The file says "Milestone rewards and rank thresholds are local balance, not recovered original values."
  - SYSTEMS.md:76: "Original task sequence, rank thresholds and unlocks pending."
  - SYSTEMS.md:93: "Original main/daily/achievement chains, rank thresholds and system unlock graph."
  - `achievement-ui-data.json` holds only 5 achievement category icons. There are no achievements, daily tasks or system task tracks (School Task, Inn Task, Treasure Task…; event-catalog.md:291).
  - The opening journey's 5 ranks with prosperity are a separate track.
  - **Depth: SHELL.** Tests: `family` (v3 milestones), `game`, `opening`.
- **Habit journal:** Everkai-specific; the "Daily Task" infrastructure is replaced by habits (event-catalog.md:293).

---

## 11. Other permanent systems

Grep across `app/*.tsx`, `lib/*.mjs` (excluding biography text) and SYSTEMS.md.

| System | Status | Evidence |
|---|---|---|
| **Roaming / strolling town encounters** (Family acquisition, drink events, item drops) | **PARTIAL** | Built September 2026: stamina (1/30 min, rank cap), Fame, bond-to-join for 10 Family members, Intimacy, 44 Fellow events (`lib/roaming.mjs`). Missing: illustrated encounter stories, per-location backdrops, Fame → player rank. |
| **Recruit building / summon pools** (Hero Summon, fragments, duplicates, pity) | **SHELL** | Free recruit buttons plus 16 Acquaint-Stone recruits in the Fountain. The opening token is "Local catalog-order recruitment, no random odds" (`lib/opening.mjs`). No duplicate or fragment conversion. |
| **Golemore Mine** (Drakenberg building; Golemore Excavation live event) | **ABSENT** | event-catalog.md:69 "Everkai: absent". Memory: personal escalating boss adaptation. |
| **Archdemon's Temple Challenge** (WeekBoss, type emblems, Shelter Runes) | **ABSENT** | event-catalog.md:195. |
| **Drakenberg Challenge tower** (PvP floors, Dungeon Coins shop) | **ABSENT** | event-catalog.md:193. Needs an NPC adaptation. |
| **Drakenberg Arena** | **ABSENT** | event-catalog.md:192. |
| **Ranking** (building) | **ABSENT by design** | event-catalog.md:121 "SYSTEMS.md explicitly omits rankings"; SYSTEMS.md:99. |
| **Hall of Fame** | **ABSENT** | event-catalog.md:196 (adapt to personal milestones). |
| **Guild / Head Office / commissions / guild shop** | **ABSENT** | event-catalog.md:186 ("Village Council" adaptation). SYSTEMS.md:289 Guild bonuses not fabricated. |
| **Bazaar** (host/join stalls, permits, Proficiency → talent skills) | **ABSENT** | memory parity findings; event-catalog.md:305. |
| **Costume Shop / Costume Album upgrades / ClothesCodex rewards** | **SHELL** (wardrobe only) | SYSTEMS.md:516; event-catalog.md:309 "Costume Album / Costume Shop (partial via wardrobe)". |
| **Statues / Shelter Runes** | **ABSENT** | event-catalog.md:309. |
| **Building appearance / decorations** | **ABSENT** | event-catalog.md:309. |
| **Avatar / head frames / titles** | **ABSENT** | Rank rewards `Reward_Appearance_Avatar_1` exist in `opening-data.json` but are not used. |
| **Mail** | **ABSENT** (acceptable for single player) | No hits. |
| **Daily tasks / achievements / system task tracks** | **ABSENT** (habits substitute) | §10. |
| **Little Helper / daily chores** | **ABSENT** | memory parity findings (candidate free adaptation). |
| **Pupil unions** | **ABSENT** | SYSTEMS.md:263. |
| **Family trips (Sailing, Airship)** | **ABSENT** | SYSTEMS.md:75. |
| **Fellow auras, artifact materia/awakening/ascension** | **ABSENT** | SYSTEMS.md:464, 269. |
| **VIP / recharge** | Removed by design | SYSTEMS.md:98. |
| **Artifacts** | PARTIAL | §3. |
| **Drakenberg town / village map** | Presentation done | 16 plates and 17 buildings. Placement is local (SYSTEMS.md:3, 7). Tests: `drakenberg`, `village-map`, `facility-scenes`. |

---

## 12. Summary table (sorted by largest gap first)

| # | System | Depth | Biggest gaps | Key files |
|---|---|---|---|---|
| 1 | Roaming / strolling encounters | PARTIAL | Core loop built; encounter stories and Fame→rank missing | lib/roaming.mjs |
| 2 | Guild, Bazaar, Hall of Fame, Challenge tower, Arena | ABSENT | Need single-player adaptations or explicit removal | drakenberg-layout.json |
| 3 | Archdemon's Temple, Golemore Mine | ABSENT | Weekly and daily bosses | event-catalog.md:195, :62 |
| 4 | Statues/Runes, building appearance, avatars, Little Helper | ABSENT | Cosmetic and QoL layers | event-catalog.md:309 |
| 5 | Family trips/children, unions, relationship skills | ABSENT | Pupil acquisition via trips; relationship tiers only | SYSTEMS.md:74–75, :263 |
| 6 | Tasks / achievements / Journey milestones | SHELL | 11 local milestones; no main/daily/achievement chains or rank rewards | lib/progression.mjs |
| 7 | Recruit / summon | SHELL | Free roster; 16 stone recruits; no pools, fragments, duplicates or pity | lib/game.mjs, lib/fountain.mjs |
| 8 | Northern Odyssey | SHELL | 3 authored floors; original map, scaling, seasons, buildings, talents | lib/northern.mjs |
| 9 | Trading Post | SHELL | 3 NPCs, Power compare; no motivate/counter/bounty/prestige; 1 shop item | lib/trading-post.mjs |
| 10 | Banquets | SHELL | Simulated guests, fixed rewards, free materials; no invitations or character bonuses | lib/banquets.mjs |
| 11 | Costume shop / codex | SHELL | Free cosmetic collection; no stats, upgrades or codex rewards | lib/wardrobe.mjs |
| 12 | Village stories | SHELL | Text replay only; no triggers or rewards | lib/storybook.mjs |
| 13 | Farmstead | SHELL | Mapped to Fish Stall level via opening items | lib/opening.mjs |
| 14 | Museum | SHELL/PARTIAL | Hall1 only (32); free acquisition; no upgrades or duplicates | lib/museum.mjs |
| 15 | Mushroom Expo | PARTIAL | 5 of 100 stages; faction bonds, gacha, Expo level, stock | lib/expo.mjs |
| 16 | Stage / Adventure / opening | PARTIAL | Stops after chapter 6 (126 encounters); Power-compare battles; generated 30-stage and Frontier content; rank rewards | lib/opening.mjs, adventure.mjs, frontier.mjs |
| 17 | Familiar Tower | PARTIAL | 12 of 200+ floors; local enemies/rewards; 8 kits; P2/P3 passives | lib/familiar-tower.mjs |
| 18 | Village businesses core | PARTIAL | Service levels, operation-skill upgrades (Study Notes), operation data for 4 Fellows only, prosperity, decorations, discounts, building-specific mechanics (Museum, Bank, Airship, Academy, Resort) | lib/businesses.mjs, staffing.mjs, operations.mjs |
| 19 | Apothecary | PARTIAL | Potion skills unapplied; 10/20 potions; nurturing; local prices | lib/apothecary.mjs, medicine-discovery.mjs |
| 20 | Fishing | PARTIAL | No odds, lengths, crowns, antiques or fishing level; round-robin casts; 12/34 combos deferred | lib/fishing.mjs |
| 21 | Treasure Hunt | PARTIAL | Fixed dig pattern; relic Power effects and upgrade costs | lib/treasure.mjs |
| 22 | Fellows progression | PARTIAL | Stella 4 owners; Insight II+; artifact skills/materia/awakening/ascension; auras; non-default skills | lib/adventure.mjs, stella.mjs, insight.mjs, artifacts.mjs |
| 23 | Familiars | PARTIAL | Acquisition, costs, metamorphosis, awakening | lib/familiars.mjs, familiar-nodes.mjs |
| 24 | Workshop | PARTIAL | Materials, product effects/levels, evaluation odds, real type mapping | lib/workshop.mjs |
| 25 | Magic Farm | PARTIAL | Order/essence joins local; soil, Money Tree, plant effects, upgrade costs | lib/farm.mjs, farm-trade.mjs |
| 26 | Inn | PARTIAL | Local prices/timings; Gratitude; dish modifiers; random guests | lib/inn*.mjs |
| 27 | School | PARTIAL | Acquisition, grade A, original Intellect/earnings, unions, workaholic | lib/school.mjs, education.mjs |
| 28 | Family core | PARTIAL | Date scenes, family skills, costume effects (blessings strong) | lib/blessings.mjs, bonds.mjs, family-gallery.mjs |
| 29 | Storage / consumables | PARTIAL | Combine empty; many recovered items unusable | lib/consumables.mjs, app/storage-panel.tsx |
| 30 | Mine Clearance | PARTIAL | Local combat and daily policy; rare chests; Clearance Points | lib/mine-clearance.mjs |
| 31 | Raphael's Stage | PARTIAL | Heat levels, Lucky Star, fan acquisition/cost | lib/raphael*.mjs |
| 32 | Fountain of Wishes | PARTIAL (near full) | Bottle source is free sandbox; 5 rewards unusable | lib/fountain.mjs |
| — | Habit journal | Everkai-specific | — | lib/habits.mjs |

## 13. Top 10 gaps by player impact

1. **Campaign spine ends at chapter 6.** The opening has 136 tasks and 126 encounters, then only generated or reconstructed stages (30 plus 12 Frontier). Battles are Power ≥ requirement with no enemy or reward tables.
2. **No earned economy for most systems.** Bait, bottles, ore, fragments, Insight, blessing points, materials, stalls, keepsakes and familiars mostly come from free sandbox grants. The daily reward loops that tie systems together are missing.
3. **Recruitment has no summon system.** There are no pools, fragments, duplicate conversion or pity; the full roster is free.
4. **No task, achievement, daily or rank-reward structure.** Journey is 11 local milestones, and the opening rank rewards (avatars, daily rewards) are unused.
5. **Family acquisition and lineage are missing.** Roaming, trips/children, relationship skills and unions are absent; pupils enroll for free.
6. **Business depth.** Service levels, operation-skill training (Study Notes), per-Fellow operation data (4 of 159), prosperity, decorations and building-specific mechanics beyond Inn, Workshop, Farm and Apothecary are missing.
7. **Seven original Drakenberg buildings have no Everkai equivalent:** Archdemon's Temple, Golemore Mine, Challenge tower, Guild, Bazaar, Hall of Fame and Costume Shop. Each needs a single-player design or an explicit removal.
8. **Familiar Tower** has 12 of 200+ floors with local enemies. Familiar acquisition, costs, metamorphosis and awakening are missing.
9. **Minigames are shallow:**
   - Fishing has no odds, lengths, crowns or antiques.
   - Expo has 5 of 100 stages.
   - Northern Odyssey has 3 authored floors.
   - Trading Post, Banquets and Treasure digging use simplified local rules.
10. **Late-game Fellow layers are missing:**
    - Stella covers only 4 owners, and Insight has tier I only.
    - Artifact skills, materia, awakening and ascension are absent.
    - Apothecary potion skills and Museum halls beyond Hall1 are not implemented.

### Notes for planning
- Northern Odyssey, Raphael's Stage and Mushroom Expo sit in Drakenberg as permanent facilities, but `docs/event-catalog.md` §4.5 classes them as original story/mega events. Decide whether they count as "permanent" before scheduling parity work.
- `SYSTEMS.md:80–101` (integration-order table) is explicitly historical. Current gaps are in :193–195 and the per-version notes.
- `lib/fishing-data.json` `unimplemented` still lists "combinations" and "other grounds", which later versions added. That file is a stale policy-1 record.
