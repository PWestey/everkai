# Familiar data inventory — the 28 `Pet*` tables

**Measurement only.** Nothing outside this file was changed, and nothing was committed.

**Sources.** The original's config set,
`/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic`
(1,499 tables). Everkai's side: `lib/familiar-*.json`, `lib/familiars.mjs`,
`scripts/import-familiar*.py`. Usage evidence: the 3,829-file string-table corpus under
`.../apk-audit/lua-strings/` (see §9).

**Rule 2 positive control, run before every absence claim below:** the config set returns
`Wife 33, City 15, SimGame3 21`. It came back correct. **Four** searches in this session silently
returned zero — two because zsh ate an unquoted `--include=*.lua`, two because they searched for
quoted table names in a corpus that contains no quote characters. Every one was caught by its own
control, and §9 records the second pair because they would have produced a spectacular false
finding. Every "absent" here is a control-backed absence, not a failed grep.

**Rule 3, top-level shape.** All 28 tables are the ordinary one-key wrapper —
`{"<TableName>": [ ...rows... ]}`. **None is a bare list and none is an empty wrapper whose rows
live in `split_*` files.** The `split_reward/` directory holds 33 `*pet*` reward bundles, but those
are reward payloads keyed *by* these tables, not rows *of* them. `reward_petdispatch.json` and
`reward.json` are bare top-level lists, and the two importers that read them already assert that.

**Size of the subject:** 28 tables, **4,023 rows**.

---

## 1. The 28 at a glance

`Rows` is the measured row count of the wrapped list. `State` is Everkai's, defined as:
**carried** = every row and every gameplay column imported; **partial** = imported, but rows or
columns dropped; **absent** = no importer reads it and no `lib/` file holds its values.

| # | Table | Rows | State | What it drives |
|---|---|---:|---|---|
| 1 | `Pet` | 70 | **partial** | The roster: base ATK/HP/SPD, grade, Group (type), career (role), skill ids, SP odds, art |
| 2 | `PetArea` | 3 | carried | Exploration areas: tower-floor unlock, stamina cost, event weights, encounter list, scripted steps |
| 3 | `PetAttr` | 9 | **partial** | The nine attributes and their `CombatAdd` Power weights |
| 4 | `PetBookLevel` | 300 | **absent** | Compendium levels: exp per level, reward tier, per-country Fellow Power coefficient |
| 5 | `PetBuff` | 137 | **absent** | Every buff/debuff a familiar skill applies: effect type, attribute, magnitude, duration |
| 6 | `PetBuffShow` | 18 | **absent** | Buff icon / VFX / sound (cosmetic only) |
| 7 | `PetCareer` | 3 | carried | Role ids 1/2/3 (Attacker/Tank/Support) + icons |
| 8 | `PetCatchItem` | 3 | carried | Contract grades: alertness rise, success odds by rarity |
| 9 | `PetClass` | 10 | **partial** | Grade ascension: cost, level cap, ATK/HP/SPD coefficients, passive unlock |
| 10 | `PetDispatch` | 9 | carried | Dispatch areas: tower gate, power gate, duration, base + great-success rewards |
| 11 | `PetEndlessTower` | 23 | carried | Endless bands: stage range, career quotas, stat/level coefficients, hourly income |
| 12 | `PetEndlessTowerPool` | 705 | carried | The endless bot roster: 705 stat blocks by band |
| 13 | `PetExploreItem` | 15 | carried | Weighted "found item" / buff events, 5 per area |
| 14 | `PetExploreLottery` | 5 | carried | Luck Flower reward pool and weights |
| 15 | `PetExternalAdd` | 5 | **absent** | The five Metamorphosis bonus buckets and their grade thresholds |
| 16 | `PetExternalSkill` | 49 | **absent** | The Metamorphosis roll tables: weighted min/max per bucket, per item grade |
| 17 | `PetGroup` | 4 | **absent** | Type ids 1–4 + icons; also referenced by the story-lock components (§9) — `Pet.Group` itself *is* carried |
| 18 | `PetLevel` | 499 | **partial** | The level curve: cost per level, ATK/HP/SPD coefficients, milestone bonuses |
| 19 | `PetLotteryConfig` | 11 | **absent** | The 11 gacha banners: featured pet, PRD id, first-time dialog, 2048 minigame hook |
| 20 | `PetLotteryShop` | 21 | **absent** | Gacha exchange shop: core pet, exchange currency and cost, feed stages, intimacy |
| 21 | `PetMemoryStory` | 12 | **absent** | Join-story dialog chains for 4 familiars (3 beats each) |
| 22 | `PetRefreshItem` | 3 | **absent** | Metamorphixir grades: reroll cost, lock cost ladder, per-bucket roll ranges |
| 23 | `PetSkill` | 192 | **absent** | Every familiar skill: type, targeting, effect magnitude, combat coefficient, buff ids, triggers |
| 24 | `PetSpeEffect` | 1 | **absent** | One row, two fields — a special-effect type flag |
| 25 | `PetSpecPkg` | 36 | **absent** | Per-locale asset bundle routing for crossover art (no gameplay value) |
| 26 | `PetStar` | 100 | **partial** | The star ladder: cost, ATK/HP coefficients, bonus slots, compendium exp, evolve markers |
| 27 | `PetTower` | 300 | carried | Challenge floors: area, enemy line-up, one-time reward, hourly income, boss flag |
| 28 | `PetTowerArray` | 1,480 | carried | The 1,480 tower enemy stat blocks |

**Totals: 10 carried (2,546 rows), 5 partial (688 rows), 13 absent (789 rows).**

Only **four** of the twelve `scripts/import-familiar*.py` read the APK config set at all —
`-dispatch`, `-explore`, `-supplies`, `-tower`. The other eight
(`-inventory`, `-modifiers`, `-nodes`, `-passives`, `-skills`, `-status`, `-support`, and
`import-familiars.py` itself) read a community wiki mirror
(`Zik-Ascend/isl-tools`, snapshot `b49c78d0`). That is already recorded in
`docs/data-provenance.md:87–97`; it is repeated here because it is the single fact that explains
most of the gaps below.

---

## 2. Constant columns (rule 6) — placeholders, not curves

Measured by counting distinct values across every row of each table. Do not present any of these as
a measurement of the thing its name suggests.

| Table | Column | Constant value | Rows |
|---|---|---|---:|
| `Pet` | `ClassMax` | `10` | 70/70 |
| `Pet` | `CRIT_RES`, `ACC`, `DI`, `DR` | `0` | 70/70 each |
| `Pet` | `AlertMax` | `100` | 70/70 |
| `Pet` | `OutTime` | `0` | 70/70 |
| `Pet` | `ClickRatio` | `[300, 100]` | 70/70 |
| `PetArea` | `cost` | `1` | 3/3 |
| `PetArea` | `EventPool` | `PetCatch 4000 / PetExploreItem 5000 / PetExploreLottery 1000` | 3/3 |
| `PetBookLevel` | `exp` | `100` | 300/300 |
| `PetBookLevel` | `PowerCoef.value` | `500` | 300/300 (only `Country` varies) |
| `PetBuff` | `IsDispel` | `1` | 137/137 |
| `PetCatchItem` | `Alert` | `[30, 40]` | 3/3 |
| `PetDispatch` | `Time` | `20` | 9/9 |
| `PetEndlessTower` | `CareerMax` | `{1: 1–5, 2: 1–2, 3: 0–1}` | 23/23 |
| `PetEndlessTower` | `SPDcoef` `120`, `Powercoef` `275`, `Lvcoef` `1000`, `Reward` | — | 23/23 each |
| `PetEndlessTowerPool` | `Lv` | `200` | 705/705 |
| `PetLotteryConfig` | `logo`, `mg2048Id`, `SPRewardTask`, `rankEndType` | — | 11/11 each |
| `PetLotteryShop` | `feedStage` `[20, 80]`, `petIntimacy` `100` | — | 18/21 present, all identical |
| `PetRefreshItem` | `Cost` `1`, `Cost1` `2`, `Cost2` `3` | — | 3/3 each |
| `PetSkill` | `sound` | `Sound_PetSkill` | 56/56 present |
| `PetStar` | `BookEXP` | `{rare 1:1, 2:2, 3:5, 4:10, 5:40, 9:20}` | 100/100 |
| `PetTowerArray` | — | *(no constant column)* | — |

Two of these are load-bearing and already handled correctly in the repo:

- **`PetDispatch.Time = 20` on all nine rows.** `scripts/import-familiar-dispatch.py` asserts the
  constancy, proves no `System` key carries a competing dispatch duration, and states plainly that
  the **unit is not measured** — Everkai reads it as hours on an economic argument, not on evidence.
  That is the correct handling of a constant column.
- **`PetBookLevel` is constant in *both* numeric columns** (`exp` 100, `PowerCoef.value` 500). Only
  `PowerCoef.Country` varies, cycling 1→5 in blocks of 60 rows. So the Compendium is a **flat**
  ladder: 100 exp per level × 300 levels = **30,000 total**, granting a flat 500 coefficient to one
  country per level. Anyone importing this must not read the 300 rows as a growth curve.

`PetSpeEffect` deserves its own note: **1 row, 2 fields** (`{"_id": "1", "Type": 1}`), 39 bytes. It
is referenced from `Doc/Pet/PetData.lua` next to `SpeEffect` / `EffectType`, and 16 `PetBuff` rows
carry `SpeEffect: "1"` — the only value that exists. It is a degenerate lookup, not a missing system.

---

## 3. Growth curves, cost ladders and drop tables

First / middle / last rows quoted so the shape can be sanity-checked. All numbers are basis points
(÷10,000) where the column name ends in `coef` or `add`, which is how `lib/familiars.mjs` reads them.

### `PetLevel` — 499 rows, the level curve — **partial**

| Row | `Cost` | `ATKcoef` | `HPcoef` | `SPDadd` |
|---|---:|---:|---:|---:|
| 1 (first) | *(absent)* | 0 | 0 | 0 |
| 250 (mid) | 910 | 115,600 | 180,900 | 501,500 |
| 499 (last) | 3,400 | 364,600 | 554,400 | 1,373,000 |

Level 1 has **no `Cost` key at all** — 498 of 499 rows carry one (rule 4: read the row, don't assume
the field). Total cost 1→499 is **626,190** Magical Fruit. `Cost` takes only 50 distinct values
across 499 rows, i.e. it is a step ladder, not a per-level curve.
**Dropped by Everkai:** `ExternalAdd`, present on **99 rows** (every 5th level), which grants a
Metamorphosis bonus by rarity at each milestone.

### `PetClass` — 10 rows, grade ascension — **partial**

| Row | `Cost` | `LevelMax` | `ATKcoef` | `HPcoef` | `SPDadd` | `PassiveSkillUnlock` |
|---|---:|---:|---:|---:|---:|---|
| 1 | 0 | 49 | 0 | 0 | 0 | — |
| 6 | 3,000 | 299 | 19,000 | 25,000 | 125,000 | `PassiveSkill3` |
| 10 | 15,000 | 499 | 71,000 | 98,000 | 665,000 | — |

`LevelMax = 50 × class − 1` exactly, which is why `lib/familiars.mjs:11`'s local
`familiarStage = floor(level/50)+1` is consistent with the table rather than an invention.
**Dropped:** `PassiveSkillUnlock` (rows 2, 4, 6) — the three thresholds at which a familiar's
`PassiveSkill1/2/3` come online. Everkai's passive system uses a local v7 stage policy instead.

### `PetStar` — 100 rows, the star ladder — **partial**

| Row | `Cost` | `ATKcoef` | `HPcoef` |
|---|---:|---:|---:|
| 1 | 20 | 200 | 200 |
| 51 | 60 | 16,500 | 16,500 |
| 100 | 80 | 57,000 | 57,000 |

`Cost` is a 5-step ladder (20×15 rows, 30×20, 40×15, 60×25, 80×25); **5,000 total** for stars 1→100.
`ATKcoef` and `HPcoef` are identical on every row — one curve, used twice, not two measurements.
**Dropped:** `ExternalAdd1` (100 rows, the per-star Metamorphosis bonus), `BookEXP` (constant —
the Compendium exp a star grants), `ExternalSkillNum` (2 rows, the star at which a Metamorphosis
slot opens), `IsBig` (20 rows, milestone stars). `IsEvolve` (rows **15 and 50**) *is* read, by
`import-familiar-explore.py`, to derive Adult and Awakened forms.

### `PetTower` — 300 floors — **carried**

| Floor | `PetArea` | enemies | `Income` |
|---|---:|---:|---|
| 1 | 1 | 1 | `[100, 0]` |
| 151 | 2 | 5 | `[162, 7]` |
| 300 | 3 | 5 | `[187, 8]` (boss) |

All 300 floors, all 1,480 enemy rows, both income components, the boss flag and every reward bundle
are imported into `lib/familiar-tower-data.json`, with assertions that every enemy id is used by
exactly one floor. This is the most completely carried table of the 28.

### `PetEndlessTower` — 23 bands — **carried**

`Income` rises `[1,0]` → `[24,1]` → `[42,2]`; `ATKcoef`/`HPcoef` take only two values each
(120/150 and 175/200); `SPDcoef`, `Powercoef`, `Lvcoef` and `Reward` are constant. The bands tile
1→999,999 with no gap, which the importer asserts.

### `PetDispatch` — 9 areas — **carried**

`TowerLv` 20 → 120 → 300; `Power` 100,000 → 1,600,000 → **20,000,000**. A 200× power gate across
nine areas against a 15× floor gate.

### `PetCatchItem` — 3 contract grades — **carried, a real drop table**

| Grade | N | R | SR | SSR |
|---|---:|---:|---:|---:|
| 1 | 7,000 | 1,000 | 720 | 310 |
| 2 | 10,000 | 8,000 | 4,000 | 1,000 |
| 3 | 10,000 | 10,000 | 10,000 | 10,000 |

Basis points. Grade 3 is a guaranteed catch at every rarity.

### `PetExternalSkill` — 49 rows — **absent, and it is a drop table**

Each row is a 3-or-9-entry weighted pool of `{type, min, max}`. First row (`101`, ItemType 1):
weights 6000/3000/1000 on the common tier, then 60/30/10 and 12/6/2 on two rare tiers, with type 1
ranging 50,000–1,000,000 and type 3 300–6,000. Last row (`310`, ItemType 3): only three entries,
6500/2000/1500, type 2 238–250, type 3 28,501–30,000, type 4 951–1,000. `CostAdd` runs 0→300 across
40 distinct values — the per-roll cost escalation. `docs/isekai-power-graph.md:216` already records
the bucket mapping (`PetManager.lua:57–63`, type 1..5 → Power / Talent / Power% / Talent% /
AllPower%) — so the *meaning* is measured and only the *rows* are missing.

### `PetBookLevel` — 300 rows — **absent** — see §2; a flat ladder, not a curve.

---

## 4. Per-table detail on the five **partial** tables

### `Pet` (70 rows, 59 distinct columns across the union of all rows)

Three importers each take a different slice, and no single file holds the whole row.

| Taken by | Columns |
|---|---|
| `import-familiar-tower.py` | `Group`, `career` — for all 70, into `familiar-tower-data.json.pets` |
| `import-familiar-explore.py` | `grade`, `AlertMax`, `SPProb`, `RunReward`, fragment counts — for **47** of 70 (the union of the three areas' encounter lists plus the starters); plus `Spine`/`Spine2`/`Spine3` for all 70 to derive forms |
| `import-familiars.py` (wiki) | `ATK`, `HP`, `SPD`, `ClassMax` — for all 70 |

**Independently re-verified in this session:** all 70 of Everkai's shared ids match the config on
ATK, HP, SPD and ClassMax exactly, and `familiar-data.json` carries **71** pets — one extra,
`Pet_8041505`, which is not in the config `Pet` table. `docs/data-provenance.md:371` already flags
this.

**Never imported, per-row and non-constant:**
`CRIT` (0 on 15 pets, 500 on 55), `Block` (identical to `CRIT` on all 70), `NormalAttack`
(10 distinct), `ActiveSkill` (70 distinct), `PassiveSkill1/2/3` (55/35/22 rows),
`ExternalSkillNum` (0/1/2/3 — the Metamorphosis slot count), `ExternalAdd` (6 distinct),
`SPOutTime` (5/10/15), `SPProb` for the 23 pets outside the explore slice, `CommonPiece`,
`ExclusiveHero`/`ExclusiveAdd` (3 rows), `unlockKey` (23 rows).

`CRIT` is the important one — see §6.

### `PetAttr` (9 rows) — **3 of 9 rows imported**

The full table, measured:

| `Field` | `type` | `CombatAdd` |
|---|---:|---:|
| ATK | 1 | 15 |
| HP | 1 | 1 |
| SPD | 1 | 30 |
| CRIT | 2 | 5 |
| CRIT_RES | 2 | 5 |
| Block | 2 | 5 |
| ACC | 2 | 5 |
| DI | 2 | 30 |
| DR | 2 | 30 |

`import-familiar-dispatch.py` takes only ATK/HP/SPD and asserts `{15, 1, 30}`. The six `type: 2`
attributes and their weights are dropped. Four of the six (`CRIT_RES`, `ACC`, `DI`, `DR`) are
constant `0` on every `Pet` row, so dropping them costs nothing today; **`CRIT` and `Block` are
not** — they are 500 on 55 of 70 familiars, which at weight 5 is 5,000 Power per familiar that
Everkai's dispatch gate never counts.

### `PetClass`, `PetLevel`, `PetStar` — see §3.

---

## 5. The 13 **absent** tables: what each would control, and how big

Ranked in §7. Sizes are exact row counts.

| Table | Rows | What it would control | Already tracked? |
|---|---:|---|---|
| `PetSkill` | 192 | Every familiar skill's real numbers: `SkillType`, `EffectType`, `TargetCamp`/`TargetType`/`TargetNum`, `EffectAttr`, `EffectNum` (26 distinct), `Combatcoef` (7 distinct), `BuffID` (84 rows), `Trigger` (35 rows, 14 distinct), `TriggerLimitType`/`TriggerMax` | parity-catalog E6 |
| `PetBuff` | 137 | What those skills apply: `EffectType` (5), `EffectAttr` (9), `EffectNumType`, `EffectNum` (26 distinct), `round` (9 distinct), `BuffProb`, `TargetType`/`TargetNum`/`TargetCamp` (14 rows), `MaxAdd` | parity-catalog E6 |
| `PetBookLevel` | 300 | Familiar Compendium: 30,000 exp total, 2 reward tiers, flat 500 Power coefficient per level rotating across 5 countries | parity-catalog **E8, ABSENT, deferred 2026-09-16** |
| `PetExternalSkill` | 49 | Metamorphosis roll tables — weighted min/max pools per grade, `CostAdd` 0→300 | parity-catalog **E7, ABSENT** |
| `PetSpecPkg` | 36 | Per-locale asset bundle names for crossover art. **No gameplay value — measured, not inferred: the config registry is its only reference anywhere in the client (§9)** | no |
| `PetLotteryShop` | 21 | Gacha exchange shop: 18 core pets, `exchangeReward`, `exchangeItem` (3 currencies), `shineTime`, `rarity`, `order`, `showCondition` | no — multiplayer/monetised |
| `PetBuffShow` | 18 | Buff icon / VFX / sound per `Show` id. **Cosmetic** | no |
| `PetMemoryStory` | 12 | Join-story dialog chains for 4 familiars, 3 beats each (`nextDialogType` fixed/end, portrait, background) | no |
| `PetLotteryConfig` | 11 | The 11 gacha banners and their PRD ids, 2048-minigame hook, first-time dialogs | no — monetised |
| `PetExternalAdd` | 5 | The five Metamorphosis buckets and their `GradeSection` thresholds (bucket 1 up to 3,750,000) | partially, via `isekai-power-graph.md` |
| `PetGroup` | 4 | Type ids 1–4 and their icons — but §9 shows `CompPetLockStory.lua` / `CompPetDetailStory.lua` also read it, so it appears to gate story access. `Pet.Group` itself **is** carried, so no numeric cost today | no |
| `PetRefreshItem` | 3 | Metamorphixir grades: reroll cost ladder 1/2/3, per-bucket `Scope` min/max by prop 1–4 | parity-catalog **E7, ABSENT** |
| `PetSpeEffect` | 1 | A single special-effect type flag, referenced by 16 `PetBuff` rows | no — degenerate |

Of the 789 absent rows, **329 (42%) are `PetSkill` + `PetBuff`** — the combat numbers.
A further 300 are `PetBookLevel`. The remaining 160 are split across gacha (32), Metamorphosis (57),
and cosmetics/assets (71).

---

## 6. Values Everkai currently invents because the table was never imported

Everkai marks its invented values, and `docs/data-provenance.md` already documents most of these.
Listed here with the measurable alternative named, per the brief.

1. **Familiar combat skills.** Everkai models **63 skills** across six hand-curated community files
   (`familiar-crit-data` 8, `-dot-` 5, `-modifier-` 13, `-skill-` 13, `-status-` 17, `-support-` 7),
   plus `familiar-passive-data` 25 on mixed provenance. The original carries **192 `PetSkill` + 137 `PetBuff` = 329 rows** with real
   `EffectNum`, `Combatcoef`, `round` and `Trigger` values. Every one of the 63 is labelled
   wiki/community in `data-provenance.md:87–96`, and several carry an explicit local-policy boundary
   ("timing, stacking and unlock access are local combatVersion4 rules, not original formulas").
   The measurable replacement exists and has never been read.

2. **Enemy critical-hit rate.** `lib/familiar-crit-data.json` sets `guardians.critBP: 500` with
   provenance `"authored local enemy balance"`. But `Pet.CRIT` is a **measured per-familiar column**:
   `0` on 15 familiars (all grade 1–2), `500` on the other 55 (all grade ≥ 3). Tower enemies are
   `Pet` rows via `PetTowerArray.Pet`, so their crit is measurable per enemy rather than invented as
   a flat 500. The companion `resistanceBP: 0` happens to be right for a different reason:
   `Pet.CRIT_RES` is constant `0` on all 70 rows (rule 6 — a placeholder, and the placeholder value
   is what Everkai uses).

3. **Star cost currency.** `PetStar.Cost` names **no item in any table read**. Everkai charges
   class-up items and says so in the UI and in `import-familiar-supplies.py`'s header. Correctly
   marked; still an invention.

4. **Dispatch duration unit.** `PetDispatch.Time = 20` is constant on all nine rows and no `System`
   key carries a dispatch duration — the importer proves both. Everkai reads it as **hours** on an
   economic argument. Correctly marked as not measured.

5. **Endless-mode bot selection.** `lib/familiar-tower.mjs:159` uses a repeatable draw keyed on floor
   alone, because the server does the drawing and no table or client file says how. Correctly marked.

6. **Great Success probability.** `import-familiar-dispatch.py` measures the four inputs
   (`PetDispatch.Power`, team power, `PetDispatch_Crit` 3000bp, `PetDispatch_Coefficient` 0.5) and
   states that the formula combining them is not measured; `familiar-dispatch.mjs:47` applies a local
   rule. Correctly marked.

7. **Team power omits CRIT and Block.** Not flagged anywhere today. See §4 (`PetAttr`) — the gate is
   computed on 3 of the 9 weighted attributes.

8. **One familiar with no config row.** `Pet_8041505` exists in `familiar-data.json` and not in the
   config `Pet` table. Flagged at `data-provenance.md:371`.

---

## 7. Ranked: what is missing that would most affect numeric parity

1. **`PetSkill` (192) + `PetBuff` (137).** 329 measured rows against 63 community-derived skills
   whose own provenance says they are not APK-version-matched. This is the largest single block of
   familiar numbers in the original and the only absent block that changes every combat outcome.
   It is also the cheapest to fix in kind: both tables are ordinary wrappers with flat integer
   columns, already cross-referenced by `Pet.ActiveSkill` / `PassiveSkill1-3` / `PetSkill.BuffID`,
   and the ids resolve. **Caution (rule 12):** familiar power is derived from these, and
   `validFamiliars` bounds `level` and `stars` — check what a save stores that is computed from
   current combat output before widening.

2. **`PetAttr`'s six missing attribute weights, specifically `CRIT` and `Block` at weight 5.**
   Three rows to add. 55 of 70 familiars carry `CRIT` 500 and `Block` 500, so every dispatch power
   gate in Everkai currently understates a full team by up to 25,000 Power against gates that run to
   20,000,000. Smallest change on this list, and it touches a shipped gate.

3. **`Pet`'s unimported per-row columns**, chiefly `CRIT`/`Block` (per §6.2), `ActiveSkill` and
   `PassiveSkill1/2/3` (the join to item 1), and `ExternalSkillNum`. No new table needed — the rows
   are already being read by two importers.

4. **`PetClass.PassiveSkillUnlock`** (3 rows) with **`PetStar.ExternalSkillNum`** (2 rows). Five
   rows that replace Everkai's local v7 stage policy with the original's actual unlock thresholds.

5. **Metamorphosis: `PetRefreshItem` (3) + `PetExternalAdd` (5) + `PetExternalSkill` (49) +
   `PetLevel.ExternalAdd` (99 rows) + `PetStar.ExternalAdd1` (100 rows).** 256 rows for a system
   parity-catalog E7 already lists as ABSENT. It is a Fellow-Power faucet
   (`isekai-power-graph.md:216` puts bucket 1 at up to 3,750,000), so adding it moves the whole
   power economy — the rule-12 save check applies.

6. **`PetBookLevel` (300).** parity-catalog E8, deferred 2026-09-16 with the tables already
   measured. Flat and cheap: 30,000 exp, 500 per level, 5 countries. Deliberately deferred, not
   overlooked.

7. **`PetMemoryStory` (12).** Content, not numbers. Four familiars' join stories.

8. **`PetLotteryConfig` (11) + `PetLotteryShop` (21).** Gacha. Per the single-player design rule
   these get adapted or removed rather than imported at parity; the 21 `PetLotteryShop` rows are
   still the only place 18 crossover familiars' acquisition terms are stated.

9. **`PetBuffShow` (18), `PetGroup` (4), `PetSpecPkg` (36), `PetSpeEffect` (1).** 59 rows of icons,
   sounds, asset-bundle routing and one degenerate flag. No numeric parity impact. (`PetGroup` also
   carries a story-gating role — see §9 — but `Pet.Group` itself is already carried, so the numeric
   impact is still nil.)

---

## 8. What could not be measured, and why

- *(Resolved — see §9.)* Client-usage evidence for the absent tables was measured after all, once a
  working search pattern was found. The caveat that survives: `lua-strings` holds extracted *string
  tables*, one bare identifier per line, so this evidence is **identifier adjacency and file
  membership**, which names the readers and accessor functions but is not decompiled code. It shows
  *that* a table is read and *by which screen*; it does not show the arithmetic.
- **The `Power` column in `PetTowerArray` and `PetEndlessTowerPool`.** Tested against `PetAttr`'s own
  weights, both halves from the config set (rule 1): `ATK×15 + HP×1 + SPD×30` reproduces
  **6 of 1,480** `PetTowerArray` rows and **0 of 705** `PetEndlessTowerPool` rows; adding
  `Pet.CRIT×5 + Pet.Block×5` reproduces **the same 6 and 0**. So the enemy `Power` column is an
  authored value, not derivable from the attributes in these tables. Everkai imports it verbatim,
  which is the right call. **What the residual is composed of is not measured, and no plausible
  number is offered here.**
- **`PetDispatch.Time`'s unit** — constant 20, no competing key, unit genuinely undetermined
  (already documented in the importer).
- **The Great Success formula** — inputs measured, combination not present in any table or in the
  `Doc/Pet` strings.

---

## 9. Client-usage evidence (added after the first pass)

**A rule-2 story worth recording.** Three sweeps of the 3,829-file `lua-strings` corpus returned
**zero hits for all 28 tables**. Two of them were simply broken: they searched for `"PetSkill"`
*with quote characters*, and `lua-strings` files contain bare identifiers with no quotes anywhere.
Both scans carried a positive control, and both controls failed loudly — one printed
`CONTROL PetTower files: 0`, the other printed a control of 32 files beside 0 for every quoted name.
Without those controls this document would have claimed that the original's own client never reads
its familiar tables, which is absurd on its face and would have been filed as fact. **The zeros were
a broken pattern, not an absence.** The bare-name pattern, controlled against
`PetTower` → 14 files in `UI/Pet` and `PetTowerArray` → 5 files, works.

`Doc/Config/ConfigSheetNames.lua` is the config-sheet registry and names **all 28** tables, so every
one of them is a live registered sheet in the shipped client — none is dead config.

| Table | Read by | What this settles |
|---|---|---|
| `PetSkill` | `UI/Pet/Battle/PetBattleShow.lua`, `PetAvatarBattleComp.lua`, `PetBattleSceneComp.lua`, `CompPetSkill.lua`, `CompPetSkillDetail.lua`, 3 Drakenberg Arena panels | It is read by the **battle resolution stack**, not just a detail screen — confirms rank 1 |
| `PetBuff` | `PetBattleShow.lua`, `PetAvatarBattleComp.lua`, `DKAranaPetComp.lua`, `PanelDKArenaPetBuffDetail.lua`, `Doc/Game/DrakenbergArenaManager.lua` | Same battle stack; the 137 rows are applied in combat |
| `PetAttr` | `PanelPetAttribute.lua`, `CompPetBattleAttrGroup.lua`, `PanelPetUpgradeStage.lua`, `ScenePetUpgradeStar.lua`, `CompPetLockAttr.lua`, `PetBattleSceneComp.lua`, +3 | All **nine** rows feed the attribute panel *and* the battle scene — the 6 dropped rows are not display-only |
| `PetExternalAdd` | `CompPetDetailEvolve.lua`, `CompPetExternalAttr.lua`, `PanelPetExternalAttrTip.lua`, `CompPetLockAttr.lua`, `CompPetBasicAddAttr.lua`, `PanelPetEvolveSkillTip.lua`, `ScenePetDetail.lua` | Metamorphosis is called **"Evolve"** in the client; `CompPetLockAttr` is the attribute-lock feature that `PetRefreshItem`'s `Cost`/`Cost1`/`Cost2` ladder prices |
| `PetRefreshItem` | `CompPetDetailEvolve.lua`, `Doc/Pet/PetInfo.lua` (`GetEvolveCostItemType`, `GetEvolveAttrLockNum`, `GetEvolveAttrNum`) | The 3 rows drive reroll cost, lock count and roll count |
| `PetExternalSkill` | `CompPetExternalSkill.lua`, `CompPetDetailUpgrade.lua`, `CompPetDetailStar.lua` | Read from the **star** screen too — corroborates `PetStar.ExternalSkillNum` opening slots |
| `PetBookLevel` | `UI/Pet/Book/PanelPetBookLevelReward.lua`, `ScenePetBookList.lua`, `Doc/Pet/PetBookInfo.lua`, `PetHelper.lua` (`PowerCoef`, `GetLevel`, `GetLevelMax`, beside `zxCountryConfigs`/`zxRewardConfigs`) | A whole Book section; the country coefficient is real |
| `PetGroup` | `ScenePetList.lua`, `PetBattleAddBtnComp.lua`, **`CompPetLockStory.lua`**, **`CompPetDetailStory.lua`**, `PetInfo.lua`, `PetHelper.lua` | **Correction to §1/§5:** not icons-only. Group is referenced by the story *lock* components, so it appears to gate story access as well. `Pet.Group` itself is carried, so this costs Everkai nothing numerically today |
| `PetLotteryShop` | `ScenePetExchangeShop.lua`, `ScenePetLotteryExchangeShop.lua`, `ScenePetLotteryEntry.lua`, `Doc/Pet/PetManager.lua` | Gacha exchange, as classified |
| `PetLotteryConfig` | `Doc/Player/PetLotteryManager.lua`, both exchange-shop scenes | Gacha banners, as classified |
| `PetMemoryStory` | `UI/Pet/PetMain/PanelPetGetStory.lua` | Exactly one reader: the "familiar joined" story panel |
| `PetBuffShow` | `PetBattleShow.lua`, `PetAvatarBattleComp.lua`, `Doc/Pet/PetData.lua` | Cosmetic, as classified |
| `PetSpeEffect` | `Doc/Pet/PetData.lua` **and nothing else** | Degenerate, as classified |
| `PetSpecPkg` | **`ConfigSheetNames.lua` only — no UI or Doc reader anywhere** | Upgrades "no gameplay value" from inference to measurement: nothing but the registry mentions it |

Two classifications in §1 and §5 move on this evidence: **`PetGroup`** is not purely cosmetic (story
gating), and **`PetSpecPkg`**'s irrelevance is now measured rather than inferred. Neither changes the
§7 ranking.
