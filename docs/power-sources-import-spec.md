# Power sources: import spec

Measured 2026-09-18. **Measurement and spec only: no gameplay code changed.** This doc follows
`docs/power-parity-audit.md` §1.4 and §9. That work put Fellow Power on the original's composition:

```
Aptitude = floor(Σtalent × (1 + Σcoefpercent/1e4))
Power    = floor((floor(ADH(level) × Aptitude × (1 + Σpercent/1e4)) + Σflat) × (1 + Σfinal/1e4))
```

The formula is right. What Everkai lacks is the set of sources that fill its buckets. This doc covers
each missing source in priority order. For each one it gives the tables (with one real row quoted),
the bucket it feeds, its value on a few-weeks account and at cap, the currency that pays for it, what
Everkai pays today, the save implications (rule 12) and an implementation plan. §5 re-computes the
owner's two real panels one step at a time.

Original tables: `…/apk-audit/configs/config/logic/` (1,499 tables). Positive control (rule 2): the
directory returns `Wife 33, City 15, SimGame3 21`. Every table below is a dict wrapping one list of the
same name (rule 3, asserted by the measuring scripts). The owner's account is
`scratchpad/live-player.json`, a copy of today's private-server `state/player.json`. Per-hero parts come
from `scratchpad/decompose.py`, run read-only against the live `progression.py`. The measuring scripts
are in `scratchpad/psrc/` (`lib.py`, `s1.py`, `climb.mjs`, `ek30.mjs`, `ek-owner.mjs`).

**Values marked (INFERRED) are not read straight out of a table.** §6 lists all of them.

---

## 0. Results

**The two panels reproduce exactly from a list of named sources.** Summing the parts below, each
attributed to a table, gives **2,665,123,377** and **456,778,931**. That is to the unit, and the result
comes from `composePower` itself (`scratchpad/psrc/climb.mjs`, row S6). So the part list is complete, and
every step's worth below is a real share of the panel.

| Step | Source | Shinobu (L600) | × | Orivita (L550) | × |
|---|---|---|---|---|---|
| S0 | **Everkai today**, with the owner's own investment (Stella rank 20, his blessing levels, 3★, skill 20) mapped onto Everkai's systems | 649,089,376 (24.4%) | — | 260,690,340 (57.1%) | — |
| S1 | + **Skill Aptitude** (every talent skill, not just Base_N; Stella-unlocked talent skills; Stella `self\|talent`) | 1,450,794,280 (54.4%) | **×2.24** | 285,631,499 (62.5%) | ×1.10 |
| S2 | + **account-wide flat floor** (fishing at real levels, museum/relic `extradd`) | 1,454,124,360 (54.6%) | ×1.00 | 292,384,661 (64.0%) | ×1.02 |
| S3 | + **Family Stella and artifact quenching** | 1,825,655,000 (68.5%) | **×1.26** | 358,586,011 (78.5%) | **×1.23** |
| S4 | + **HeroStar, star halos, Rarity Advance, Origin Boost** | 2,544,756,456 (95.5%) | **×1.39** | 375,343,640 (82.2%) | ×1.05 |
| S5 | − Everkai-only Fellow-skill % and bonds (the original's panel shows "Skill +0%") | 2,414,590,056 (90.6%) | ×0.95 | 353,738,810 (77.4%) | ×0.94 |
| S6 | + residual: familiar, "item" flat, pledge transfer, unexplained bond talent | **2,665,123,377 (100.0%)** | ×1.10 | **456,778,931 (100.0%)** | ×1.29 |

What each step is worth to a single Fellow:

- **Skill Aptitude (S1) is the biggest step for a developed hero** (×2.24 on Shinobu), and almost
  nothing for anyone else. On the owner's account, 97% of all talent-skill Aptitude sits on three
  heroes, and the median hero holds **4**.
- **The account-wide floor (S2) is small at the top and matters at the bottom.** On the owner's real
  account it is almost entirely fishing: **0.7M–2.3M per hero**. Museum adds 14,200 and relic
  exhibits 0–205,000.
- **Family + artifacts (S3): ×1.23–1.26.** Two parts: Family Stella (`WifeSpirit`, catalogue row F19,
  deferred) and quenching (F12-03, deferred).
- **Stars/Rarity/Origin (S4): ×1.05–1.39.** On Shinobu, the Origin Boost and the hidden star-halo
  percent are most of it.

**Everkai's own day-30 Fellows** (the `pins2/pearl-30.json` save, current rules):

| | today | after S1–S4 | after S5 (no Everkai-only %) |
|---|---|---|---|
| strongest, Neptune hero_195 L500 | 230,796,106 | **812,953,535** (INFERRED S1 spend) | 719,492,248 |
| weakest, Cimitir hero_61 L150 | 9,050,034 | **10,562,980** | 8,733,252 |

The owner's account has a real floor too. The same decomposition over all 58 of his heroes gives:
weakest **1,021,886** (hero 24, level 1), median **3,668,392**, sum 4,938,591,041 (the panel's 4.938B).
**Everkai's day-30 weakest (9.05M) is already above his weakest and his median.** The gap is at the top,
not the bottom. §7 has the decisions that need the owner.

---

## 1. Skill Aptitude: the +7,155 (priority 1)

### 1.1 What the panel row is

The client builds the Aptitude rows in `CompHeroPropPower.lua` `refreshTalent` (decompiled copy at
`scratchpad/CompHeroPropPower.lua:83-320`). The props behind the rows are in
`private-server/readable/UnderlingData.lua:72-135`:

- "Skill" = `AllSkillTalents` = the `heroskilltalent` coef part, minus costume talents, fishing, medicine,
  SimGame3, TD, Stella (`SpiritTalent`), museum, character-group and building-appearance talent.
- "Rarity Advance" = `HeroMagicLevel[magicLevel].talentBonus`, read straight from **config**. It is not a part.
- "Base" = `herobasetalent` · "Limit Break" = `HeroQuality.Talent` · "Stella" = `SpiritTalent`.

**Retail attribution of Shinobu's talent.** Every skill level below is read from the owner's save,
and every value from `SkillBase`/`SkillLevel`. The script is inline in this session; its output is
reproduced here.

| Part | Source table / skill | Value |
|---|---|---|
| initial talent | `HeroRarityUpgradeStage` 264M2 `initialTalent` 240 (Hero.json's 100 + stage) | 240 |
| quality | `HeroQuality` 11 `Talent` | 50 |
| **talent skills** (the stage-M2 set of 10) | `Hero_Talent_Base_3` L400 = 1,200; `Hero264_Talent_extra3_2` L149 = 298; the 8 others at L2–3 = 44 | **1,542** |
| **Stella-unlocked talent skills** | `Hero264_Talent_Bonus1/2/3/5`, all L400 = 400 + 800 + 1,200 + 2,000 | **4,400** |
| intimacy talent | `Hero264_Talent_IntimacyDegree_1` L10 (20/level) | 200 |
| pledge talent skills | `Hero264_Talent_Pledge1/2` L1 | 7 |
| star talent skills | `Hero_Talent_StarSkill_1/2/3` L1 | 6 |
| Rarity Advance | `HeroMagicLevel` `264_200` `talentBonus` | 1,000 |
| Stella halo | `Hero264_NewHalo_1` L10 (`self\|talent`, growth type 2) | 2,050 |
| artifacts | `Equipment` Weapon_6_H301: 60 + 7 × `EquipmentLevel[104].coefficientADH` 103 | 781 |
| family | Family Stella talent (see §3) | 365 |
| fishing | fish `talent` rows (server value) | 50 |
| familiar | reconstruction's pet part | 316 |
| Origin Boost | `HeroLRSpSkill` 5 × 244 levels | 1,220 |
| resonance | pledge transfer (reconstruction) | 56 |
| **Σ raw talent** | | **12,283** ✔ (= the server's 12,283) |

The panel's rows sum to 11,697, but the parts sum to 11,967 (= 12,565 / 1.05). The difference is:
"Skill 7,155" = the 6,155 talent-skill total above + the 1,000 magic level. The reconstruction puts the
magic level inside `heroskilltalent`, and the client **also** prints it as "Rarity Advance" from
config. So 1,000 is shown twice. The Origin Boost row (1,220, off-screen in the screenshot) and fish
(50) make up the rest: 11,697 − 1,000 + 1,220 + 50 = **11,967** ✔. (INFERRED: the double display is
deduced from the arithmetic and the Lua. The reconstruction's `heroskilltalent` part is
5,948 + 3,397 − 140 = 9,205 = 6,155 + 2,050 + 1,000, and the client subtracts only the 2,050 as Stella.)

Orivita's retail total is **920**: `Hero_Talent_Base_3` L300 = 900, four skills at L1 = 8, three
`Talent_Bonus` at L1 = 6, star skills = 6. Her panel's "Skill 1,400" includes **480** of `bond:5` talent
that the reconstruction adds, and I could not reproduce it from the tables (INFERRED residual).

### 1.2 The tables

| Table | Rows | What it contributes |
|---|---|---|
| `Hero.json` `heroBaseSkill` | 181 | the hero's own talent skills (2–18 Aptitude/level, median 6 over Everkai's 111) |
| `HeroRarityUpgradeStage.json` `heroBaseSkill` | 54 | the talent-skill set after Rarity Advance. 264M2 has **10 skills = 25/level** against Hero.json's 6 |
| `HeroRarityUpgrade.json` type 1 `skill_1` | 326 | adds a talent skill at an advance (`264M1_1` → `Hero264_Talent_extra4_3`) |
| `Hero.json` `heroSpiritTalentSkill` + `HeroSpirit` `SkillUnlockTalentSkill` | 190 skills | Stella rank unlocks a talent skill: 264 at ranks 1/4/6/8 → +1/+2/+3/+5 per level (11/level) |
| `HeroStar.json` `skillUnlock` | 6 | `Hero_Talent_StarSkill_k`, +k per level, unlocked at ★k (21/level at ★6) |
| `HeroPledge.json` `skillUnlock` | 15 | pledge-level talent skills (+3/+4/+5 per level for 264) |
| `HeroIntimacyDegree.json` | 10 | fixed 20/level, 10 levels (+200) |
| `SkillLevel.json` `consume` | 64,813 | the price of every level |

Real rows (rule 4):

```
SkillBase  Hero_Talent_Base_3: maxUpgradeLevel 300, skillProp {id:"talent"}, targetCondition self,
           skillProp_Initial 3, skillProp_Level 3                     -> value = 3 × level
SkillBase  Hero264_Talent_Bonus5: maxUpgradeLevel 300, skillType Hero_Talent_Base_5, Initial 5, Level 5,
           spiritSkillUnlock {heroId:"264", unlockSpiritLevel:8}
HeroSpirit Hero_264_8: heroSpiritEffect [..., {typ:"SkillUnlockTalentSkill", id:"Hero264_Talent_Bonus5"}]
SkillLevel Hero_Talent_Base_3 level 1 … level 1999: upgradeType 1, consume [{Item_Talent_Hero_1, 3}]
SkillLevel Hero_Talent_Country4Base_1 level 1 … 1000: consume [{Item_Hero_Talent_Country_4, 100}]
```

**Price rule, measured across every talent skill type.** A Base_N-type skill costs N Skill Pearls per
level for +N Aptitude, flat from level 1 to 1,999. So **one Skill Pearl = one Aptitude, always.**
Country skills cost 100 × tier type-books per level for +tier, i.e. **100 books per Aptitude**. Costume
talents cost 1 pearl per level (cap 200). `Hero_Talent_SG3_CountryN` costs `SG3TalentCountryN` 1/level
(cap 300). `Hero_Talent_Project_CountryN` costs `Item_Project_HeroSkillExp_N` 15,000/level (cap 200).

**Level cap per skill:** `maxUpgradeLevel` 300 + every `talentLvLimit` that reaches the hero. This is
the rule `lib/aptitude-cap-data.json` already imports. The owner's Base_3 at L400 is 300 + Stella
`Hero264_NewHalo_4` L2 = 100.

### 1.3 Worth

**Few-weeks (the owner's account, 58 heroes).** Self talent skills total **10,996 Aptitude**.
Shinobu 6,155, hero 308 3,692 and Orivita 920 hold 97% of it. The median hero holds **4**. The implied
spend is **10,460 Skill Pearls** (+405 unspent in the bag) and 700 type-books. So in the original,
Skill Aptitude is **concentrated on favourites**, and a few weeks buys about ten thousand.

**At cap** (Everkai's 111 originals, per-skill level 300 + the hero's full `talentLvLimit` raise):

| Scope | min | median | max |
|---|---|---|---|
| Hero.json base skills only (= today's `APTITUDE_CAP` rule) | 720 | 2,460 | **31,122** (hero_253) |
| + best rarity stage + Stella talent skills + star skills + pledge + intimacy | 8,280 | 12,420 | **107,198** (hero_253/254) |
| Shinobu | 4,260 base | | **49,190** all sources |
| Orivita | 18,469 base | | **63,802** all sources |

(INFERRED: that `talentLvLimit` raises star, pledge and Stella-unlocked talent skills as well as
`heroBaseSkill`. `PropManager:GetHeroTalentLvLimit` returns one per-hero number, and the reconstruction
applies the Stella limit to every `self` talent skill.) **Consequence: the measured 31,122 cap
(audit §9.2) does not bound these sources.** Importing them means either widening `APTITUDE_CAP` or
keeping them out of the stored record (plan below).

### 1.4 What Everkai has today

- `lib/talents.mjs`: ONE talent skill per Fellow (`Hero_Talent_Base_N`, +N/level at N pearls/level).
  Cap is `paidCap` 299 + Stella `talentLimit` (≤100). The level is written into `f.aptitude` and a
  receipt ledger (`originalTalent`).
- `lib/insight.mjs`: Country tier I (+1/level, 100 books, cap 300; faucet 250 books per daily habit).
- Direct pearl → Aptitude (`aptitudeTrainingPlan`), stopped at 1,000 by ded0006 (`PEARL_APTITUDE_CAP`).
- `lib/character-skill-guide.json`: of 2,040 Fellow nodes, 316 are trainable and 1,724 are display-only
  (`lib/character-skills.mjs:9-14`). The display-only nodes are exactly the missing sources. By kind:
  StarSkill 714, `_Talent_extra` 213, `_Talent_Bonus` (Stella) 186, SG3 165, Project 165, costume talents
  158, Country Base_2/3 61, Pledge 45.
- **`lib/hero-spirit-data.json` does not import `SkillUnlockTalentSkill`** (0 occurrences). The Stella
  ranks Everkai already sells never unlock their talent skills. On Shinobu that is the 4,400.
- Everkai maximum for Shinobu or Orivita today: 3 × 399 + 300 + 1,000 = **2,497**.

**Faucet.** Everkai has Skill Pearls: shop at 200 gold, doubling every 2,500 bought
(`lib/adventure.mjs:94-95`). The day-30 sim bought **24,634** of them, against the owner's ~10,860 in a
few weeks. Both counts come from each game's own save (rule 1: a count against a count, no mixed ratio).
So pearls are not the brake in Everkai. The per-skill level caps are the only brake that exists in the
original's tables. The original's pearl income is not in config (`Item.json` rows carry no source).
See §7 question 2.

### 1.5 Saves (rule 12)

- **Do not route new skills through `f.aptitude`.** Everything that writes the stored record is bounded
  by `APTITUDE_CAP` in `validAdventure`. If new skills wrote into it, the bound would have to grow to
  ~107,198, and the talent/pearl ledgers would store Aptitude derived from a rule that could change.
  Instead, store **skill levels** and derive their Aptitude as a new `talent.skills` part in
  `powerParts`.
- Receipts `{skill, from, to, cost}` re-derive `cost` from `SkillLevel.consume` for the skill's
  `skillType`. That column is constant per type (1..1,999 rows identical), so a later re-import cannot
  move a stored cost unless the table itself changes. Pin its hash.
- Per-skill cap = 300 + limit, derived. Every limit source only **widens**, so no stored level becomes
  illegal.
- The existing `Hero_Talent_Base_N` ledger (`talentLevel`, `originalTalent`) stays exactly as it is and
  stays inside `f.aptitude`. The new module skips the Fellow's Base_N skill id so it is never counted
  twice (a test must assert this).
- Retiring direct pearl training for **new** purchases is a planner change. Old `aptitudeLedger`
  entries still validate (ded0006 already proved this for the 1,000 stop).
- Run the generate-and-decode check against the previous build's day-30 save.

### 1.6 Implementation plan

1. `scripts/import-talent-skills.py` → `lib/talent-skill-data.json`: per original hero, the talent
   skills from `heroBaseSkill`, each stage in `HeroRarityUpgradeStage`, type-1 `HeroRarityUpgrade`,
   `heroSpiritTalentSkill` with unlock rank, `StarSkill_1..6`, `HeroPledge.skillUnlock` and
   `HeroIntimacyDegree`; plus per skill {amount, maxUpgradeLevel, cost item, cost per level}. Census
   asserts: 2,212 `talent` rows; self-scope skillType families as measured.
2. `lib/talent-skills.mjs`: `talentSkills(s,id)` (unlocked set: stage from Rarity Advance §4, Stella
   rank, stars, pledge), `talentSkillCap`, `talentSkillPlan`, `talentSkillAction('trainTalentSkill')`,
   `validTalentSkills`. The currency is `Item_Talent_Hero_1` for pearl types, type-books for Country
   tiers, and `SG3TalentCountryN` for Alraune's Gift. **Project skills stay display-only** (no Everkai
   faucet for `Item_Project_HeroSkillExp_N`).
3. `lib/adventure.mjs` `powerParts`: `talent.skills = Σ amount × level`.
4. `lib/hero-spirit.mjs`: import the `self|talent` halo (the 2,050, PWR-04) as a `talent.stella` part,
   from `unmodelledMax` per rank.
5. UI: make the guide's display-only rows trainable when unlocked (`app/` has no component tests;
   verify by driving the browser).
6. Tests (`tests/talent-skills.test.mjs`): value = amount × L for three real rows; 1 pearl = 1 Aptitude
   for every pearl-type skill; cap = 300 + limit; the owner's Shinobu levels reproduce 6,155 and
   Orivita's 920; Base_N is not double-counted; the rule-12 decode. Negative-control each (break it and
   watch the intended assertion fail).

---

## 2. The account-wide flat floor (priority 2)

### 2.1 Tables, rows, scopes

**Fishing.** `Fish.json` (87 species) names two skills per fish (`skillA`, `skillB`) in
`SkillBase.json`. 58 of them are `atk/extradd` to heroes (26 `all`, 20 `country`, 12 `rare`), 54 are
`atk/percent` and 60 are `talent`.

```
Fish F1101: skillA "Fish_1101", skillB "Fish_G_1101" (the Gold Crown skill)
SkillBase Fish_1101: maxUpgradeLevel 99999999, skillType Fish_1, targetCondition {country:"1"},
          skillProp {atk, extradd}, Initial 15000, Level 5000
SkillUpgrade Fish_1: FishExp per level: 1 (L1-3), 2 (L4-6) … 30 (L91-250), 60 (L251-260) … 150 (L401+)
```

**A correction to the audit's §8 #2:** the fish-skill level is **bought with FishExp** on the
`SkillUpgrade` ladder. It is not a catch counter. It is uncapped, but priced.

**Museum / relic exhibits.** `Exhibit.json` (137) `levelUpSkill` → 25 `atk/extradd` rows (to
`levelUpMaxLevel` 120), 74 `atk/percent`, 43 `talent`.

```
Exhibit SimGame5_2401 (Hall5): levelUpSkill Skill_SimGame5_2401_1, rare:5, atk extradd,
        750,000 at L1 -> 6,700,000 at L120
```

**A correction to the brief's "2.38M → 18.69M".** That is the sum over all 25 rows, across all scopes.
No hero receives all of it. Per hero (all + its country + its rarity):

| Hero rarity | exhibits L1 | exhibits L120 | fish L1 | fish L5 | fish L10 |
|---|---|---|---|---|---|
| 1–2 | 279,600 | 2,017,000 | 921,000 | 2,109,000 | 3,594,000 |
| 3 (SR) | 339,600 | 2,434,000 | 981,000 | 2,289,000 | 3,924,000 |
| 4 | 639,600 | 5,114,000 | 1,091,000 | 2,599,000 | 4,484,000 |
| **5 (UR)** | **1,239,600** | **10,176,500** | **2,141,000** | **5,889,000** | **10,574,000** |
| 6–9 (incl. Shinobu, 9) | 239,600 | 1,739,000 | 741,000 | 1,689,000 | 2,874,000 |

(Country 1 shown; every country is symmetric.) Other `extradd` feeding `all/rare/country`:
`SGN_Collection_N` and `Skill_SimGameN` collections, `TowerCombination` (3), `GveCoinFight` plants (8,
event), `FirstRecharge` (1, purchase). The audit §2c covers percent-only systems (`CharacterGroup`,
`ShapeshiftClothes`, `ActivitySkill`). None of those appears on either owner panel.

### 2.2 The owner's account

- Fish-skill levels across 78 skills: **median 4, max 15**. From the tables at those levels, Shinobu's
  fish comes to **1,031,000 flat / 1,250 bp** and Orivita's to **2,251,000 / 3,250 bp**. Both match the
  server exactly. (Talent: the tables give 25 and 113, the server 50 and 138. The difference is
  INFERRED to be FishArtifact/combination rows.)
- Museum flat **14,200** on every hero; relic exhibits ("excavation") **0–205,000**.
- **The floor, measured.** The weakest heroes are 1.02M–2.57M. Of that, fish is 0.73–1.12M, museum
  14,200 and relics 0–205,000. Percent comes from fish 1,250–2,750 plus 3,000 of star-halo aura. So on
  this account **the flat floor is fishing**, and the "5M floor" of the owner's memory does not hold on
  it (§7 question 3).

### 2.3 What Everkai has today

- **Fishing**: 86 species with the original's per-level values (`Fish_1101` = +15K, +5K/level).
  - The skill level is capped at **3** (`validFishing`: `int(n,3)`), bought with research points at
    n(n−1).
  - Effects are scoped by **type AND rarity** per species record. The original scopes a skill by
    country OR rarity OR all.
  - Day-30 sim: Shinobu's type gets **195,000**, Orivita's 995,000, Cimitir 265,000.
- **Relics**: `lib/treasure-data.json` holds 19 of the 25 `extradd` rows, but `relicBonus` pays only
  aptitude and percent. The file says so seven times ("Recovered but not modelled: flat attack").
  - Everkai also pays the relic **aptitude** to every Fellow, where the original scopes it (e.g.
    `rare:5`). That is a separate scope drift, and it is the museum 24 in §5.
- **Missing entirely**: `Museum_Collection_0` (Hall1, 10,000) and Hall3 `Exhibit_1..5` (19,600 at
  L1, 200,000 at L120).
- **Faucets**: FishExp is Everkai's research points (exists). Relic levels come from treasure materials
  (exists). The systems are built; they just don't pay Power.

### 2.4 Worth

Shinobu +850,200 flat, 0.2%. Orivita +1.27M flat and +2,050 bp, ×1.02. Everkai's day-30 bottom Fellow
9.05M → 10.15M (**+12%**). **This step lifts the floor, not the peak.** At cap it is +10.2M flat for a
UR from relics alone, plus fishing, which is unbounded but priced.

### 2.5 Saves (rule 12)

- `validFishing` re-derives `points === researched.length − Σ n(n−1)`. That is a **derived** value.
  Changing the price of levels 2–3 to FishExp would invalidate every save that has upgraded a fish.
  **Keep n(n−1) for levels ≤3**, and price levels 4+ from `SkillUpgrade` in a new receipt ledger
  (catch `policyVersion` 5, or a separate `fishing.levels` subtree). Widening `int(n,3)` is safe.
- Catches store `effect` (type, rarities, initial, increment). Fixing the scope must read the effect
  **from the species table at power time** and leave the stored `effect` as a receipt. Check first
  whether `fishingIndex` reads stored effects (it iterates `effects` built from catches). If it does,
  the scope fix is a read-path change, and the validator must keep accepting the stored shape.
- Relic `extradd`: `relics` store level and materials only. Adding a flat part is derived and safe.

### 2.6 Plan

- `lib/treasure.mjs` `relicBonus` → add `flat`, scoped by the hero's rarity/country (and fix the
  aptitude scope the same way). `lib/museum.mjs` `museumBonus` → `flat`; add `Museum_Collection_0`
  and Hall3 rows to `lib/museum-data.json` with an importer.
- `lib/adventure.mjs` `powerParts`: `flat.museum`.
- `lib/fishing.mjs`: country/rare/all scope; levels above 3 on the FishExp ladder.
- Tests: the three scope pools above for a rarity-5 hero at L1/L120; the owner's fish levels
  reproduce 1,031,000 and 2,251,000; the rule-12 decode of a save with level-3 fish.

---

## 3. Family and artifact percent at real size (priority 3)

### 3.1 Family: +261.5% and +3.051M, decomposed

| Part | Table | Shinobu | Orivita |
|---|---|---|---|
| Fellow Blessing flat (skill 1 level) | `WifeSkill.atk` via `WifeBless` pairs | wives 105 L110 1,400,000 · 185 L1 1,000 · 186 L120 1,650,000 = **3,051,000** ✔ | 101 1,475,000 · 112 1,900,000 · **115 2,525,000** = 5,900,000 |
| Advanced Blessing percent (skill 2) | `WifeSkill.riseADH` | 4,300 + 50 + 6,300 = **10,650** | 4,600 + 5,300 + **6,800** = 16,700 |
| **Family Stella** percent | `WifeSpirit` → `WifeN_NewHalo_3` (`bless` scope) | Wife185 L6 **15,000** + Wife105 L2 500 = **15,500** | 115 3,300 + 112 2,700 + 101 1,400 = 7,400 |
| Family Stella talent | `WifeN_NewHalo_2` | 355 + 10 = **365** | 67 + 47 + 28 (+2 upgrades) = 144 |

```
WifeSkill 107: {skill1Exp 6350, skill2Exp 12100, atk 1325000, riseADH 5350, talent 214}
SkillBase Wife185_NewHalo_3: skillProp {atk, percent}, targetCondition {bless:"185"}, growth type 2, max 10
WifeSpirit Wife_185_2: wifeSpiritEffect [SkillAddHalo Wife185_NewHalo_3 L1, NewHalo_4 L1],
           wifeSpiritCost [{Item_RarityUpgrade_Hero_264, 300}]
```

**Everkai's own `lib/original-blessing-data.json` rows reproduce the ladder exactly.** Fed the owner's
levels, they give 3,051,000 and 10,650 for Shinobu. So the Fellow/Advanced Blessing ladder is already
at real size.

What is missing:

- **Family Stella (`WifeSpirit`, catalogue row F19, deferred)**: 58% of Shinobu's family percent.
- **Orivita's wife 115.** `WifeBless 115_114` carries `heroSpiriteUnlock: "114"` at level 4. It is a
  pairing that **Orivita's own Stella rank 4 unlocks** (the `AddWifeBless` effect, as `Hero_264_4` →
  `122_264`). Everkai's recipient list leaves these pairs out, and that is worth 6,800 bp + 2.525M flat
  on Orivita. (INFERRED: that the reconstruction's `conditional_bless` is this rule.)

**Fathoms are not a Power source.** They are the original's WifeQuenching (country `yield`), and
`lib/fathoms.mjs` already pays them to business earnings. No change.

### 3.2 Artifacts: +170% and +781

- **Aptitude.** 781 = `Equipment` Weapon_6_H301 `initialTalent` 60 + `riseTalent` 7 ×
  `EquipmentLevel[104].coefficientADH` 103. Orivita 260 = 50 + 7 × 30. Everkai's
  `GEAR.aptitude + perLevel × (gearLevel − 1)` has the same shape: **parity already** (±10).
- **Percent.** 17,000 = Σ of the weapon's 10 quench slots
  (1,700 + 1,500 + 1,600 + 1,700 + 1,600 + 2,300 + 1,800 + 1,600 + 1,700 + 1,500), all country-matched.
  Orivita 16,900 ✔.
- **Everkai: absent.** `docs/artifact-quenching.md` (F12-03) has the complete table set and prices:
  - Normal rolls cost gold on a per-slot escalating ladder.
  - High rolls cost 1 `Item_Quenching_Equipment_1` each, forever.
  - Expected rolls to a matched 2,500: 275 High.
- On the owner's account **only 9 of 58 heroes have any quench**. The max is 18,000 (hero 195). It is a
  favourites lever, like Skill Aptitude.

### 3.3 Worth

S3 is ×1.26 on Shinobu (Family Stella 15,500 + quench 17,000 bp) and ×1.23 on Orivita. At cap:

- Family Stella: up to 21 halo levels per member over 89 members (F19 row).
- Quenching: 15 slots × 2,500 = 37,500 bp per artifact.

### 3.4 Saves (rule 12)

- **Do not edit `source.recipients` to add `heroSpiriteUnlock` pairs.** `validBlessings` requires
  `JSON.stringify(h.recipients) === JSON.stringify(source.recipients[id])` exactly (`lib/blessings.mjs`,
  the `ids(...)` check). Adding one Fellow to one member's list would invalidate every save holding an
  `apkBlessings` record for that member.
  - Put the Stella-unlocked pairs in a **separate derived set** (`stellaBlessPairs(s)`, read from the
    owner Fellow's Stella rank).
  - Pay their ladder value in `blessingPower` from that set.
- Family Stella: new optional subtree with rank receipts. The cost comes from `WifeSpirit.wifeSpiritCost`
  (pin the hash).
- Quenching: new optional per-artifact `slots` array. Old saves have none, and the part is 0.

### 3.5 Plan

1. `scripts/import-wife-spirit.py` → `lib/family-stella-data.json` (`WifeSpirit` 2,109 rows,
   NewHalo_2/3/4 per rank, `AddWifeBless` and `AddCustomBless` effects). `lib/family-stella.mjs` feeds
   `percent.familyStella`, `talent.familyStella`, and a `talentLvLimit` into §1's cap.
2. `lib/blessings.mjs`: add the `stellaBlessPairs` read (above).
3. Quenching, in the deterministic single-player form `docs/artifact-quenching.md` recommends (spend
   stones to step one slot up the 25-row ladder; no country roll). Part `percent.quench`.
4. Tests: the owner's wife levels reproduce 3,051,000 / 10,650 (ladder) and 15,500 (Stella); the
   recipients-equality guard still holds after the change; decode an old save.

---

## 4. Stars, Rarity Advance, Origin Boost (priority 4)

### 4.1 HeroStar

```
HeroStar 3: riseADH 3000, extraAtk 1500000, needHeroLevel 550, needHeroStarCount {star:"3",count:15},
            starHaloSkillLevel 4, skillUnlock Hero_Talent_StarSkill_3, consume [{Item_Exchange_Hero_Universal,15}]
```

| ★ | percent (bp) | flat | unlocks | level gate to reach it (INFERRED reading) | cost to reach |
|---|---|---|---|---|---|
| 1 | 1,000 | 400,000 | StarSkill_1 | 300 | 3 |
| 2 | 2,000 | 800,000 | StarSkill_2 | 300 | 5 |
| 3 | **3,000** ✔ | **1,500,000** ✔ | StarSkill_3 | 400 | 10 |
| 4 | 4,000 | 3,000,000 | StarSkill_4 | 550 (+ `needHeroStarCount`, INFERRED meaning) | 15 |
| 5 | 5,000 | 5,000,000 | StarSkill_5 | 700 | 30 |
| 6 | 6,000 | 7,500,000 | StarSkill_6 | 750 | 50 |

Both owner heroes are ★3: +3,000 bp and +1,500,000 flat, exact.

`starHaloSkillLevel` also levels each hero's `HeroN_Star_Skill_*` halos. These are broadcast to
country/all/rare/bond: 835 rows of percent, finalpercent and talentpercent. **This is the reconstruction's
hidden "aura"** (Shinobu 11,500 bp, every weak hero 3,000).

**A divergence to flag.** Read from the tables at the owner's halo levels, these halos send Shinobu
3,000 bp `percent` (all) **plus 9,000 bp `finalpercent`** (6,000 country 4 + 3,000 all), and the bond-22
7,500 percent. The reconstruction keeps the percent rows and **drops every finalpercent row**. Its
panel reproduces, so Everkai's target (the panel) is the percent-only shape. At retail the same halos
would multiply the whole Power, flats included, by ×1.9. (§7 question 1.)

**Everkai today:** 7 stars at +500 bp each, bought with star shards (10…140, `STAR_COSTS`). No flat,
no level gates, no star skills, no halos.

### 4.2 Rarity Advance: `HeroMagicLevel` + `HeroRarityUpgradeStage` + `HeroRarityUpgrade`

```
HeroMagicLevel 264_200: costItem Item_RarityUpgrade_Hero_264, talentBonus 1000,
               rainyUpgradeStageId "264M2", heroRarityUpgradeId [264M2_1 … 264M2_7]
```

- 29 heroes have magic levels. 25 ship in Everkai. `talentBonus` rises 5/level to **1,000** (lv 200)
  or **1,200** (lv 240); 15 heroes stop at 400 (lv 80), 3 at 800 and one at 250. *(The audit's "up to 144,705" is not a
  per-hero figure; the per-hero maximum is 1,200.)*
- Cost: 10 of the hero's own `Item_RarityUpgrade_Hero_<id>` per level, 2,000 to lv 200.
- **That is the same item the original charges for Shinobu's Stella ranks** (`lib/hero-spirit-data.json`
  records `itemId Item_RarityUpgrade_Hero_264`) and for her family member's `WifeSpirit` (§3). One
  crystal pays for three ladders.
- The stages matter more than the +1,000. 264M2 raises `initialTalent` 100 → **240** (the panel's
  "Base 240") and the talent-skill set from 6 to **25 per level**. That lifts §1's ceiling from 4,260
  to 17,750 on the base set.
- Everkai today: rarity is a label (catalogue row F7 ABSENT). No magic level, no stages.

### 4.3 Origin Boost (LR): `HeroLRSpSkill`

```
HeroLRSpSkill 264_600: costItem Item_LRTalentSkill_Hero_264, talentBonus 5, addNewSkillId {talentpercent, 250}
```

- 3,005 rows, 5 heroes: 251, 260, 261, 263, 264. Everkai ships 251, 260, 263 and 264.
- Per level +5 talent (3,000 at lv 600). `atk percent` +2,000 at lv 50 and at lv 100 (4,000).
  `talentpercent` +250 every 50 levels from lv 150 (2,500 at lv 600, i.e. ×1.25 Aptitude).
- Shinobu's saved `LRSpSkill` at level 244 is `{atkPercent 4000, talentPercent 500, talentAdd 1220}`:
  table-exact.
- Cost: 10 per level (6,000 total) of a hero-own item. **Everkai has no faucet for it.**

### 4.4 Worth

S4 on Shinobu: ×1.39. That is stars +1,500 bp and +1.5M; halos +11,500 bp and +500 coefpercent (the
coefpercent is Origin); Rarity +1,140 talent; Origin +4,000 bp and +1,220 talent. On Orivita: ×1.05.
On Everkai's day-30 Fellows: Neptune ★2 at L500 (+2,000 bp, +800,000); **Cimitir ★1 at L150 would
pay nothing**, because ★1 is gated at level 300.

### 4.5 Saves (rule 12)

- Stars: keep the stored `stars` (0..7) and `STAR_COSTS`. `lib/fellow-reset.mjs` refunds from
  `STAR_COSTS[k]`, so re-pricing would change refunds of stars already bought. Map ★k → HeroStar row
  min(k, 6) **at power time**, and apply `needHeroLevel` as "inactive until level reached" (derived).
  Never refuse a stored star.
- Rarity Advance and Origin: new optional per-Fellow fields (`magicLevel`, `originLevel`) with
  receipts. Absence means 0. No `SAVE_VERSION` bump: nothing required.
- Every new part is derived. The Mine, Trading Post and Expo validators bound stored Power (audit §9.5).
  Re-measure the margins with the widened talent: 107,198 × the maxed fixture is about 3.4× the
  31,122 case. The 1e12 Expo bound had ~100× room.

### 4.6 Plan

- `lib/hero-stars.mjs` (HeroStar import: percent, flat, star skills, gates); replace `STAR_POWER_BP`
  in `powerParts`.
- `lib/star-halos.mjs` (835 `Hero_Star_Halo`/`HeroN_Star_Skill` rows): broadcast percent and
  talentpercent; finalpercent held pending §7 question 1.
- `lib/rarity-advance.mjs` (HeroMagicLevel, Stage, Upgrade): the currency is the shared Stella shard
  pool (the local decision already made in `lib/hero-spirit.mjs`), since the original's item is the
  same crystal. Stage switches `sourceAptitudeBonus` and §1's skill set.
- `lib/origin-boost.mjs` (HeroLRSpSkill, 4 shipped heroes): `percent.origin`, `talent.origin`,
  `coefpercent.origin`.
- Tests: each table's row count and the owner-panel values (3,000 / 1,500,000 / 1,000 / 240 /
  4,000 / 1,220 / 500); ★7 clamps; the level gate; the decode.

---

## 5. The climb, step by step

`composePower` from `lib/adventure.mjs` (APK mode), bucket sums as listed. Script:
`scratchpad/psrc/climb.mjs`.

### Shinobu (hero_264, L600, ADH 10,400). Target 2,665,123,377

| Step | Σtalent | coef% | Σpercent | Σflat | final | Power | of panel |
|---|---|---|---|---|---|---|---|
| S0 Everkai today | 3,164 | 0 | 118,350 | 226,746,000 | 0 | 649,089,376 | 24.4% |
| S1 + Skill Aptitude | 9,170 | 0 | 118,350 | 226,746,000 | 0 | 1,450,794,280 | 54.4% |
| S2 + floor | 9,185 | 0 | 118,400 | 227,596,200 | 0 | 1,454,124,360 | 54.6% |
| S3 + Family Stella, quench | 9,550 | 0 | 150,900 | 227,596,200 | 0 | 1,825,655,000 | 68.5% |
| S4 + stars/halos/rarity/origin | 11,920 | 500 | 167,900 | 229,096,200 | 0 | 2,544,756,456 | 95.5% |
| S5 − Everkai-only skill% | 11,920 | 500 | 157,900 | 229,096,200 | 0 | 2,414,590,056 | 90.6% |
| S6 + residual | 12,283 | 500 | 166,100 | 238,112,200 | 250 | **2,665,123,377** | 100.0% |

S0's parts, with where each comes from:

- **Talent.** `record` 2,199 (1,000 direct pearls + Base_3 399 levels × 3 + insight 2); `hero` 140
  (Everkai's `sourceAptitudeBonus`: 100 − 10 + quality 50); artifact 791; museum 24; fishing 10.
- **Percent.** Stars 1,500; Everkai skill 20 × 500 = 10,000; family ladder 10,650; fishing 1,200;
  Stella 95,000.
- **Flat.** Stella 223,500,000; family 3,051,000; fishing 195,000.

Stella's 95,000 bp and 223.5M are Everkai's own `hero-spirit-data.json` rank-20 row, identical to the
original's.

Residual (S6), not covered by S1–S4:

- familiar: 316 talent, 8,000 bp, 1,750,000 flat, 250 final. Everkai has a familiar system of its own
  magnitude; the day-30 sim had none bound.
- reconstruction "item" flat 7,266,000 (Everkai's analogue is fountain elixirs)
- pledge transfer 56
- Stella +200 bp
- fish talent +25 (INFERRED)
- artifact 781 vs Everkai 791; museum 0 vs 24

### Orivita (hero_114, L550, ADH 8,935). Target 456,778,931

| Step | Σtalent | coef% | Σpercent | Σflat | final | Power | of panel |
|---|---|---|---|---|---|---|---|
| S0 Everkai today | 1,463 | 0 | 72,100 | 153,370,000 | 0 | 260,690,340 | 57.1% |
| S1 + Skill Aptitude (Stella bond talent 340) | 1,803 | 0 | 72,100 | 153,370,000 | 0 | 285,631,499 | 62.5% |
| S2 + floor | 1,832 | 0 | 74,150 | 154,640,200 | 0 | 292,384,661 | 64.0% |
| S3 + Family Stella, wife-115 pair, quench | 1,956 | 0 | 105,250 | 157,165,200 | 0 | 358,586,011 | 78.5% |
| S4 + stars/halos | 1,966 | 250 | 110,350 | 158,665,200 | 0 | 375,343,640 | 82.2% |
| S5 − Everkai-only skill%/bonds | 1,966 | 250 | 98,350 | 158,665,200 | 0 | 353,738,810 | 77.4% |
| S6 + residual | 2,677 | 250 | 106,350 | 160,479,200 | 250 | **456,778,931** | 100.0% |

Orivita's residual is heavier:

- 480 `bond:5` talent (INFERRED, reconstruction)
- familiar: 128 talent, 8,000 bp, 1.75M flat, 250 final
- "advance road" growth: 100 talent, 64,000 flat

Her Skill Aptitude is small because the owner did not invest in it. **Orivita is S3's hero; Shinobu
is S1's.**

### Everkai's day-30 strongest and weakest

Neptune (hero_195, L500, ADH 7,590). Cimitir (hero_61, L150, ADH 1,374).

| Step | Neptune | Cimitir |
|---|---|---|
| S0 today (day-30 save, `valid` true) | 230,796,106 | 9,050,034 |
| S1: skills to their day-30 cap of 400 levels (base 12 + Stella 6 + star 3 per level = 8,400). **INFERRED spend**: the day-30 sim bought 24,634 pearls, and the uncapped run put 31,122 on this Fellow by day 30. Cimitir's cap (3 × 300) is below her stored 1,000. | 643,616,206 | 9,050,034 |
| S2: owner-account fish levels, museum 14,200 | 663,157,281 | 10,154,559 |
| S3: quench at the owner account's best, 18,000 (INFERRED: a favourite gets it) | 785,063,307 | 10,154,559 |
| S4: ★2 (L500 passes the gate) + aura 3,000; Cimitir's ★1 is gated at L300 | **812,953,535** | **10,562,980** |
| S5: without Everkai-only skill%/bonds | 719,492,248 | 8,733,252 |

---

## 6. Inferred values

1. The magic level (1,000) is shown twice on Shinobu's panel (inside "Skill" and as "Rarity Advance").
   Deduced from the Lua plus the arithmetic.
2. Orivita's 480 `bond:5` talent: reconstruction only, not reproduced from the tables.
3. `talentLvLimit` raises every self talent skill (star, pledge, Stella-unlocked), not only `heroBaseSkill`.
4. Fish talent 25 / 113 from tables against the server's 50 / 138. The extra is assumed to be
   FishArtifact/combination.
5. HeroStar row semantics: row k = the stats at ★k, and the requirement to reach ★k+1. The meaning of
   `needHeroStarCount` is unresolved.
6. The reconstruction drops the star halos' 9,000 bp `finalpercent` on Shinobu. The retail bucket is
   the table's; the owner's panel follows the reconstruction.
7. Wife 115 → Orivita is the `heroSpiriteUnlock` pairing; its value (6,800 bp, 2.525M) is the
   residual of the server's total.
8. The "item" flat 7,266,000 (Shinobu) is the reconstruction's `fellow_flat_power`. Not traced.
9. Everkai day-30 S1 assumes the sim's pearl budget reaches the 400-level cap on its top Fellow, and
   S3 assumes the top Fellow is quenched to the owner account's best.
10. Everkai S0 for Shinobu assumes she is owned at L600 with her Stella at rank 20, the owner's blessing
    levels, 3★ and skill 20. The Everkai-only parts are taken from the day-30 sim.

---

## 7. Decisions for the owner (rule 9: batched, each with a recommendation)

1. **Star halos: percent only, or also final?** The tables put 9,000 bp of Shinobu's star halos in
   `finalpercent` (×1.9 on her whole Power, flats included). Your private server leaves them out, and
   that is the version your panel shows. *Recommendation: import the percent rows (matches your panel)
   and hold the finalpercent rows, named, until you decide.* Question: "In the original, did levelling
   a Fellow's stars ever raise **every** Fellow's Power by tens of percent?"
2. **Skill Pearl income.** 1 pearl = 1 Aptitude in every talent skill, and the level caps are the
   original's only brake. Everkai's shop sold the day-30 sim 24,634 pearls. *Recommendation: route
   pearls into talent skills (retire direct pearl → Aptitude for new purchases, and keep old ledgers
   valid). Leave the price where it is until question 2 is answered.* Question: "Roughly how many
   Skill Pearls did a normal day give you: tens, hundreds, thousands?"
3. **Which floor?** Your current private-server account's weakest hero is 1.02M and its median 3.67M.
   Your memory of the original is "no one under 5M". Everkai's day-30 weakest is already 9.05M.
   *Recommendation: target the panel your server reproduces, and treat 5M as retail memory; do not add
   floor sources past §2.* Question: "How old is the account that has the 2.67B Shinobu?"
4. **Family Stella currency.** The original charges each member's own fragment (or, for Shinobu's
   member, Shinobu's crystal). *Recommendation: the shared Stella shard pool, as for hero Stella.*
5. **Stella-unlocked blessing pairs** (wife 115 → Orivita). *Recommendation: add them through a separate
   derived set, never by editing `recipients` (rule 12, §3.4).*
6. **Everkai-only Fellow-skill +5%/level and bonds.** Together they are 5–17% of Power (5% on Shinobu, 17% on Cimitir), and your panel
   shows "Skill +0%". *Recommendation: leave them until S1–S4 land, then decide with the pacing pins in
   front of you.*
7. **Star economy.** *Recommendation: keep Everkai's 7 stars and star-shard prices (refunds depend on
   them), and pay HeroStar's values with ★7 clamped to ★6 and the level gates applied at read time.*

---

## 8. Implementation log (what actually landed, measured after each step)

Owner answers received 2026-09-18 (they close §7 questions 1-3):

1. **Star halos: percent only — owner-confirmed, not inferred.** On his real phone account, levelling one
   Fellow's stars never raised the whole roster by anything like 50-90%. The ~9,000 bp `finalpercent`
   rows stay out. Any star term that broadcasts to other Fellows is measured for its roster-wide size
   before it ships (step 4 reports it).
2. **Skill Pearls were scarce; Power grew mostly without pearl-bought Aptitude.** So the pearl faucet was
   measured and tightened (below), and success is judged by how much of the climb comes from the
   percent and flat sources.
3. **The pacing target is his retail PHONE account: after a few weeks the top Fellow is ~300M and nobody
   is under ~5M.** The emulator panels (2,665,123,377 / 456,778,931) stay the ground truth for the formula
   and the bucket mapping only.

Method for the owner panels, every step: `scratchpad/psrc/climb-achieved.mjs` starts from the S0 bucket
sums of §5 (it reproduces 649,089,376 and 260,690,340 to the unit) and adds what the IMPLEMENTED `lib/`
derives for the owner's own investment (his skill levels from `live-player.json`, Rarity Advance 200,
Pledge 60, intimacy 10, Stella rank 20, 3★), fed through `composePower`.

### Step 1 — Skill Aptitude (lib/talent-skills.mjs, lib/hero-advance.mjs)

What landed:
- Every talent skill a Fellow owns in the original is trainable: Hero.json's extras, each Rarity Advance
  stage's set and type-1 upgrade skills, the Stella-unlocked skills, `Hero_Talent_StarSkill_1..6`, the
  pledge skills; plus the intimacy skill (level = the bond level with the family member
  `HeroIntimacyDegree` names) and the Stella `self|talent` and `bond:<n>|talent` halos per rank. An
  unlocked skill starts at level 1 free, as in the original. Cap 300 + the Stella talent limit.
  Pearl skills cost 1 pearl per Aptitude (the two exceptions, 251/260 `extra7_4`, are 3 for 4); Country
  skills cost 100 Insight books per Aptitude from the Fellow type's Insight balance.
- **Rarity Advance** (HeroMagicLevel, 25 shipped heroes, talentBonus to 1,000/1,200, stages switch the
  initial talent — Shinobu 100 → 240) and **Pledge** (HeroPledge, gated by `pledgeUpgradeOpen`), both
  paid from the shared Stella shard pool at 10 a level (the spec's §4.6 recommendation). Rarity Advance
  moved into step 1 from step 4 because the stage decides which talent skills exist.
- APTITUDE_CAP 31,122 → **107,198** (widening). The Skill Pearl → Aptitude shortcut still stops at 1,000.
- Deviation: the pledge skill's OWN talent (`Hero264Pledge`, condition `pledge`) is not paid — its target
  is the pledged partner (the §5 "pledge transfer" residual), not the Fellow.

**Pearl faucet (owner answer 2).** A census of every config table that pays `Item_Talent_Hero_1` finds no
permanent source at all: only event rank and battle-pass rewards, VIP, gift codes and event minigames.
The owner's paid-inclusive few-weeks account holds ~10,860. Everkai's day-30 sim bought **24,634** from the
gold shop (99.5% of its pearls). The shop's price now doubles every **1,000** pearls bought instead of
2,500; the sim buys to roughly the same marginal price either way, so day 30 should land near the owner's
own figure (measured below).

Owner panels after step 1 (Everkai-derived talent: Shinobu skills 4,753 + intimacy 200 + Stella 2,050 +
Rarity Advance 1,000 + stage 140; Orivita skills 19 + Stella bond 340):

| | Shinobu | of 2,665,123,377 | Orivita | of 456,778,931 |
|---|---|---|---|---|
| S0 | 649,089,376 | 24.4% | 260,690,340 | 57.1% |
| after step 1 | **1,736,049,588** | **65.1%** | **287,025,269** | **62.8%** |

The same numbers the spec predicted for S1 plus the Rarity Advance and stage talent it had filed under S4;
Shinobu's +6,006 skill/Stella talent reproduces the owner's "Skill 6,155" to the unit (tests/talent-skills.test.mjs).

Pacing pins, the c5b4477 fixtures re-read by this build (derived Power only — no Fellow in them had bought a
talent-skill level, so this is the FREE part: level-1 skills, star skills, Stella halos):

| day | gold/s c5b4477 → step 1 | top c5b4477 → step 1 | bottom c5b4477 → step 1 |
|---|---|---|---|
| 30 | 2,311,764,907 → 2,389,304,771 | 230,796,106 → 250,711,886 | 9,050,034 → 9,053,181 |
| 90 | 5,404,947,644 → 6,046,504,600 | 257,649,411 → 375,290,895 | 26,800,807 → 26,810,389 |
| 180 | 6,186,448,810 → 6,913,417,941 | 260,261,323 → 377,781,758 | 27,183,227 → 27,192,859 |

**Step 1 pacing, measured by the sim** (`scratchpad/sim/sim-pins-src.mjs`: the pins policy plus talent
skills, Rarity Advance and Pledge, feature-detected so it runs any build) at d8a7c7c, day 30: gold/s
3,440,491,910, top 613,934,015 (hero_195), bottom 4,206,118 (hero_305, a late SR recruit), 25 Fellows,
**32,695 pearls bought** and 8,974 talent-skill levels trained. The 1,000-pearl doubling did NOT bound
pearls: with talent skills to absorb them the sim bought MORE than the 24,634 it bought at 2,500 with
nowhere past Aptitude 1,000 to put them, because income compounds and the sim buys to a price measured in
minutes of income whatever the ladder. Corrected in step 2 (a daily limit). The top Fellow at 614M is 2x the
owner's retail "~300M after a few weeks"; that was on unbounded pearls.

### Step 2 — the account-wide flat floor (lib/fishing.mjs, lib/treasure.mjs, lib/hero-scope.mjs)

What landed:
- **Fish skills read the original's own skill at power time** (`scripts/import-fish-skills.py` →
  `lib/fish-skill-data.json`: Fish.json `skillA`/`skillB` → SkillBase, 13 SkillUpgrade ladders): stat,
  value at the stored level, and scope — `country` OR Hero.json numeric `rare` OR `all`
  (`lib/hero-scope.mjs`). The stored catch `effect` stays a receipt. The old wiki-derived {type, rarities}
  scoping never matched a rarity-scoped fish (33 of 86) to a Fellow with a compound rarity label.
- **Levels past 3** on the species' FishExp ladder, paid in research points (the FishExp analogue: the
  owner's F1101 at level 7 matches its 9 catches exactly at 1 FishExp a catch). Levels 2-3 keep n(n−1), so
  `validFishing`'s derived points identity is unchanged for every existing save. Bound 10,000.
- **Gold Crown**: a displayed species whose own catch landed in the Gold band pays its `skillB` at level 1
  (derived from stored catches; Kohaku's claim path unchanged).
- **Relics**: the 19 `atk/extradd` exhibit rows now pay their flat, and every hero row (talent too) is
  scoped by its own targetCondition; restorations to Exhibit.levelUpMaxLevel 120 (RESTORATION_MAX 20 → 119,
  a widening). A country-1 UR Fellow: 1,220,000 at level 1, 9,966,500 at level 120.
- **Deferred, stated**: `Museum_Collection_0` (10,000) and Hall3 `Exhibit_1..5` (19,600 → 200,000): Everkai
  ships neither exhibit and has no unlock for them; together at most 210,000 flat.
- **Pearl faucet corrected**: the shop sells at most **360 Skill Pearls a day** (the owner's paid-inclusive
  ~10,860 over 30 days, an upper bound; the original has no pearl shop at all).

Owner panels after step 2 (his 51 normal fish levels and his 27 Gold Crown species at Everkai's level 1,
replacing S0's day-30-sim fishing; his exhibits are none of Everkai's relics):

| | Shinobu | of target | Orivita | of target |
|---|---|---|---|---|
| after step 1 | 1,736,049,588 | 65.1% | 287,025,269 | 62.8% |
| after step 2 | **1,737,398,360** | **65.2%** | **290,725,159** | **63.6%** |

Fishing on the owner: Shinobu 719,000 flat / 1,100 bp / 25 talent, Orivita 1,969,000 / 2,100 / 101 (the
spec's 1,031,000 / 2,251,000 are at his Gold Crown LEVELS, which Everkai does not level). Normal skills alone
reproduce the tables to the unit: 481,000 / 800 / 25 and 1,731,000 / 800 / 86 (tests/account-floor.test.mjs).

Pacing fixtures re-read (derived only): day 30 bottom 9,053,181 → **9,426,818**, top 250,711,886 →
252,405,961; day 90 26,810,389 → 27,181,682; day 180 27,192,859 → 27,342,290.

### Step 3 — Family Stella and artifact quenching (lib/family-stella*.mjs, lib/quench.mjs)

What landed:
- **Family Stella** (`scripts/import-family-stella.py` → `lib/family-stella-data.json`: WifeSpirit, 89
  members, 21/41 ranks): each rank's cumulative NewHalo_2 talent, NewHalo_3 atk percent and NewHalo_4
  talent-level-cap raise reach the Fellows that member blesses. Paid from the shared Stella shard pool at the
  original's own count per rank (§7 question 4's recommendation); the spend is derived from stored ranks and
  `validStella` subtracts it. NewHalo_4 widens both the Base_N talent cap and every talent skill's cap.
- **Stella-unlocked blessing pairs** as a SEPARATE derived set (§3.4 / §7 question 5): the 58 WifeBless rows
  with `heroSpiriteUnlock` open once the Fellow's own Stella reaches the level, and pay the member's current
  ladder value less whatever `blessingPower` already pays that pair. `source.recipients` is untouched and the
  recipients-equality guard still holds (tested with a real APK blessing record).
- **Quenching, deterministic** (docs/artifact-quenching.md recommendation 3): a slot steps up the
  EquipmentQuenching ladder; reaching row r costs the gold of the expected Normal rolls to a country-matched
  rise ≥ r (ceil(5/P)), each at its own EquipmentQuenchingConsume price: 500 for 83 gold, 1,500 for 6.74e9,
  1,600 for 1.46e12; 1,700 would cost 2.3e19 > MAX_GOLD, so the gold track tops out at **1,600 a slot**
  (16,000 bp on a ten-slot artifact vs the owner's 17,000/18,000). Refund keeps it (gold is never refunded).
- **Not paid, stated**: WifeSpirit NewHalo_1 (`city | yield percent`, business income — its per-rank size is
  in the data file; importing it would compound village income), AddValue intimacy/charm and AddCustomBless
  (24 ids no table resolves). The High quench track (one stone a roll): Everkai's only stone faucet is three
  Journey rewards.

Owner panels after step 3 (Shinobu: member 185 rank 13 + 105 rank 4 = 365 talent / 15,500 bp, her quench
slots capped at 1,600 = 15,800 bp; Orivita: 115 r13 + 112 r10 + 101 r10 = 142 / 7,400, the wife-115 pair at his
ladder levels = 2,525,000 / 6,800 bp, quench 15,800):

| | Shinobu | of target | Orivita | of target |
|---|---|---|---|---|
| after step 2 | 1,737,398,360 | 65.2% | 290,725,159 | 63.6% |
| after step 3 | **2,166,517,284** | **81.3%** | **356,881,655** | **78.1%** |

Pacing fixtures re-read: no Fellow in them holds Family Stella or quench; only the unlocked pairs move them
(day-30 top 252,405,961 → 252,408,561).

**Step 2 pacing, measured by the sim** at 60079d7, day 30: gold/s 4,180,424,370, **top 717,254,458**
(hero_195), **bottom 6,251,001** (hero_68), 35 Fellows, **10,800 pearls** (the 360/day limit held exactly).
The top Fellow decomposes as ADH 8,627 × Aptitude 7,373 (5,202 of it pearl-trained talent skills) ×
(1 + 785%) + 154M flat, and the 785% is Stella 537% + **fishing 129%** + Everkai-only skill 100% + bonds 14%.
The fishing figure was the defect: 12,900 bp against the owner's 1,250-3,250, because pooled research
points let the sim pour every duplicate into the few percent fish. The owner's save keeps `normalExp` on each
fish record (his F1101 at level 7 is exactly its own 9 catches), so FishExp is PER SPECIES; fixed in step 4's
commit (below).

### Step 4 — stars, star halos, Origin Boost (lib/hero-stars.mjs)

What landed:
- **HeroStar at read time** (`scripts/import-hero-stars.py` → `lib/hero-star-data.json`): Everkai keeps its 7
  stars and STAR_COSTS (refunds depend on them, §7 question 7); a star pays HeroStar's row — star 7 clamps to
  6 — as percent AND flat (★3: +3,000 bp, +1,500,000), and **only once the Fellow's level reaches the
  original's gate** (300 / 300 / 400 / 550 / 700 / 750). A gated star is stored and legal, just inactive.
  Star skills unlock on the counted star too.
- **Star halos**: every owned hero broadcasts its `heroStarHaloSkill` rows at the halo level its own counted
  star gives (level 1 at no stars, 7 at six), scoped country / Hero.json rarity / HeroBond group / all /
  self; Rarity Advance stages add or swap halos. Shipped: `atk percent`, `talent`, `talentpercent`.
  **Held out, owner-confirmed: the 211 `atk finalpercent` rows.** A crossover Fellow receives only the `all`
  rows (a typed broadcast onto additions is the type lever the crossover slice removed; tested).
- **Roster-wide size of the broadcast (the owner's follow-up):** on the day-30 pacing save (25 Fellows) the
  halos a Fellow receives run 0-6,800 bp, mean 672 bp; raising any ONE hero from 0 to 6 stars lifts another
  Fellow's Power by at most **0.77%** (hero_195's halos), 0.06% on average. On the fully maxed 111-Fellow
  roster at seven stars each, a Fellow receives +4,500 bp (Kaity: country 5 + all + rarity). No tens-of-percent
  roster jump from one Fellow's stars.
- **Origin Boost** (HeroLRSpSkill, 251/260/263/264): +5 talent a level, +2,000 bp at 50 and 100, +250
  talentpercent every 50 from 150; 10 shared Stella shards a level (same local rule as Rarity Advance; the
  original's hero-own item has no Everkai faucet). Shinobu at 244 reproduces 1,220 / 4,000 / 500 exactly.
- Rarity Advance itself landed in step 1 (its stage decides the talent-skill set).
- **Correction folded in (measured by the step-2 sim): fish levels past 3 need the species' own FishExp** —
  its own researched duplicates, 1 each, on top of the pooled points. Old saves (levels ≤ 3) are unaffected.
- Not shipped, stated: `talentLvLimit` halos (7), city/appointment/education/date/tower halos (business or
  other systems), the `atk finalpercent` rows.

Owner panels after step 4 (his stars 3 on both, HeroStar ★3 in place of Everkai's old 1,500 bp; the halos his
58 Everkai-shipped heroes broadcast with the other 56 at no stars — a floor on his aura; Shinobu's Origin 244):

| | Shinobu | of 2,665,123,377 | Orivita | of 456,778,931 |
|---|---|---|---|---|
| S0 (Everkai before) | 649,089,376 | 24.4% | 260,690,340 | 57.1% |
| step 1 Skill Aptitude | 1,736,049,588 | 65.1% | 287,025,269 | 62.8% |
| step 2 floor | 1,737,398,360 | 65.2% | 290,725,159 | 63.6% |
| step 3 Family Stella + quench | 2,166,517,284 | 81.3% | 356,881,655 | 78.1% |
| **step 4 stars + halos + Origin** | **2,759,798,500** | **103.6%** | **363,160,718** | **79.5%** |
| what-if: without Everkai-only skill%/bonds (§7 q6, not shipped) | 2,618,202,500 | 98.2% | 341,920,436 | 74.9% |

Shinobu now reaches her panel (103.6%, 98.2% without Everkai's own skill percent). Orivita stays at ~80%: her
remaining gap is the §5 residual (familiar, `bond:5` talent, advance-road growth) and the aura the owner's
other heroes' stars would give her, which this floor counts at no stars.

Pacing fixtures re-read by step 4: day 30 top 252,408,561 → 263,817,560, bottom 9,426,818 → 9,410,416 (one
Fellow's star is now below its level gate).

### Pacing, re-simulated per step (the owner's range: after a few weeks, top ~300M, nobody under ~5M)

`scratchpad/sim/sim-pins-src.mjs` (the pins policy + every new sink, feature-detected), 180 days, APK growth,
`earned`, one run per step commit. The fixtures in `tests/power-pacing-day{30,90,180}.json.gz` are now the step-4
run. "Stage by Power" is the furthest stage whose boss gate the roster's summed Power clears; the sim's own
campaign policy stops battling at stage 30, so it is a Power measure, not a progress one.

| build | day | gold/s | top Fellow | bottom Fellow | Fellows | pearls bought | stage by Power |
|---|---|---|---|---|---|---|---|
| c5b4477 (before) | 30 | 2,311,764,907 | 230,796,106 | 9,050,034 | 25 | 24,634 | 18,365 |
| step 1 d8a7c7c | 30 | 3,440,491,910 | 613,934,015 | 4,206,118 | 25 | 32,695 | 23,207 |
| step 2 60079d7 | 30 | 4,180,424,370 | 717,254,458 | 6,251,001 | 35 | 10,800 | 22,931 |
| step 3 ef759c2 | 30 | 4,213,411,122 | 721,085,736 | 2,903,559 | 35 | 10,800 | 23,033 |
| **step 4 8b900cc** | 21 | 1,524,654,562 | 629,048,072 | 3,615,311 | 26 | 7,560 | 17,063 |
| **step 4 8b900cc** | **30** | **2,996,414,185** | **701,609,884** | **3,725,113** | 34 | 10,800 | 20,765 |
| c5b4477 (before) | 90 | 5,404,947,644 | 257,649,411 | 26,800,807 | 30 | 29,531 | 25,211 |
| step 1 | 90 | 11,118,689,028 | 1,047,643,885 | 16,163,671 | 30 | — | 26,501 |
| step 2 | 90 | 10,534,856,837 | 1,534,610,452 | 11,592,991 | 43 | — | 27,659 |
| step 3 | 90 | 10,956,421,593 | 1,572,019,307 | 6,658,146 | 43 | — | 27,821 |
| **step 4** | **90** | **8,025,807,147** | **1,349,526,440** | **5,622,934** | 47 | 32,204 | 26,537 |
| c5b4477 (before) | 180 | 6,186,448,810 | 260,261,323 | 27,183,227 | 30 | 29,531 | 25,241 |
| step 1 | 180 | 14,704,662,190 | 1,058,086,090 | 16,327,691 | 30 | — | 26,969 |
| step 2 | 180 | 27,646,101,390 | 1,549,840,229 | 16,867,386 | 43 | — | 28,133 |
| step 3 | 180 | 21,194,698,178 | 1,630,817,687 | 16,805,571 | 43 | — | 28,241 |
| **step 4** | **180** | **16,110,018,248** | **1,428,901,977** | **10,737,995** | 47 | 34,951 | 26,915 |

Against the owner's retail range, plainly: **the top Fellow now overshoots** — 629M at day 21 and 702M at day
30 against ~300M (2.1-2.3x). **The bottom Fellow undershoots** — 3.6-3.7M at days 21-30 against "nobody under
5M"; the bottom is always the newest recruit (level 100, no Stella), and the roster is larger (34 vs 25 at day
30) because pearls now cost a daily limit instead of gold. From day 90 the bottom is above 5M. The heroes are
no longer too weak; at the top they are too strong for the pacing target.

Where the top Fellow's Power comes from at day 30 (hero_195, 701,609,884): ADH 8,627 × Aptitude 6,986 × (1 +
812%) + 152M flat. Aptitude: 5,202 is pearl-trained talent skills (the sim concentrates ~half of its 10,800
pearls on one Fellow). Percent: Stella 537%, the Everkai-only Fellow skill 100%, star halos 93%, quench 32%,
fishing 24%, bonds 16%, stars 10%. Flat: Stella 149M. Without the talent skills it would be ~290M; without the
Everkai-only skill percent, ~640M.

Recommendations (rule 9 — proceeding on these unless the owner objects), and the one question worth his time:
1. **Pearls are the top-end lever.** 360 a day is the owner's paid-inclusive account rate, an upper bound.
   Recommendation: keep 360 until he answers — *"As a free player, how many Skill Pearls did a normal day
   bring: tens or hundreds?"* — then set the limit to it (a single constant, no save impact). At ~150/day
   (4,500 by day 30, about 2,200 of them on the top Fellow) the decomposition above puts the day-30 top near
   460M; reaching ~300M would also need the Everkai-only skill percent reconsidered.
2. **The Everkai-only Fellow skill (+5%/level, +100% at 20) and bonds (§7 question 6)**: still Everkai's own; the
   original's panel shows "Skill +0%". Recommendation unchanged: decide with this table in front of him.
3. **The floor**: late recruits start at level 100 with nothing; the retail floor of ~5M likely reflects
   starting Stella/levels on recruitment. Not changed here.
