# Power parity audit — why a level-312 Fellow shows 1.79M and the original's showed 300M

Measured 2026-09-18. **§§1–8 changed no gameplay code; §9 records the implementation that followed.** Every number below is either read
out of a table whose path is given, or produced by running the repo's own `lib/`.

The trigger, from the owner:

> "It seemed odd that my highest power hero at rank 312 was under 2 million power. My top power in my
> game after a few weeks was 300 million. No one was under 5 million power with all the account wide
> power upgrades."

Both halves of his report reproduce exactly from the original's own tables, and his 1.79M reproduces
exactly from Everkai's. §1.4 adds the owner's live "Power Details" panel for two heroes and reproduces
both displayed totals to the unit (2,665,123,377 and 456,778,931). The conclusion is **not** "Everkai is missing most of the original's power
sources" — Everkai's per-Fellow ceiling is *higher* than the original's few-weeks hero. The defect is
**the shape of the curve**: the original pays a large FLAT term per hero from the first rank of every
system, and Everkai pays almost nothing until a handful of endgame systems are maxed.

---

## 1. The original's power function, transcribed

### 1.1 Displayed Power

`…/private-server/readable/PropManager.lua:404-406` — what the hero panel reads:

```lua
function PropManager:GetHeroFight(hero_id)
	return self:CalcProp("underling", hero_id, "totalPower")
end
```

`…/private-server/readable/UnderlingData.lua:427-429` — the displayed field:

```lua
DEF_PROP(UnderlingData, "Fight", function (cur)
	return math.floor(zzPropMgr:GetHeroFight(cur.id))
end)
```

`totalPower` is composed from the four battle props by coefficients held in
`…/apk-audit/configs/config/logic/System.json`, applied by
`…/private-server/readable/UnderlingManager.lua:1454-1516`:

```lua
function UnderlingManager:HeroPowerConversionAtk(atk)
	local sysConf = zxSystemConfigs:GetConfig("HeroPowerAtkCoef")
	local power = sysConf.numberValue * atk
	return power
end
-- …Def / …Hp / …Bom are the same shape against HeroPowerDefCoef / HeroPowerHPCoef / HeroPowerBomCoef
```

| System.json row | `numberValue` |
|---|---|
| `HeroPowerAtkCoef` | **1** |
| `HeroPowerDefCoef` | **0** |
| `HeroPowerHPCoef` | **0.1666** |
| `HeroPowerBomCoef` | **1** |

> **`totalPower` = ATK, and nothing else.** `Hero.json` (181 rows) has `initialDEF = initialHP =
> riseDEF = riseHP = 0` for **all 181 heroes** (min == max == 0), and `SkillBase.json` (6,780 rows)
> contains **zero** rows whose `skillProp.id` is `hp`, `def` or `bom`. `UnderlingData.lua:421-423`
> agrees: `DEF_PROP(UnderlingData,"Def",function(cur) return 0 end)`. The HP and BOM coefficients are
> dead weight in the shipped config. Everything below is ATK.

### 1.2 The prop formula — the part that matters

`…/private-server/readable/PropManager.lua:99-117`, verbatim:

```lua
local function Formula_ADD(inst, replace, keyMap)
	local base         = calc_formual_part(inst.base,         replace.base,         keyMap)
	local percent      = calc_formual_part(inst.percent,      replace.percent,      keyMap)
	local extrapercent = calc_formual_part(inst.extrapercent, replace.extrapercent, keyMap)
	local extradd      = calc_formual_part(inst.extradd,      replace.extradd,      keyMap)
	local coef         = (inst.coef or replace.coef) and calc_formual_part(inst.coef, replace.coef, keyMap) or 1
	local coefpercent  = calc_formual_part(inst.coefpercent,  replace.coefpercent,  keyMap)
	local totalpercent = calc_formual_part(inst.totalpercent, replace.totalpercent, keyMap)
	local fightBase = base * (1 + percent / 10000) * (1 + extrapercent / 10000) * coef * (1 + coefpercent / 10000) + extradd
	local fight = fightBase * (1 + totalpercent / 10000)
	return math.floor(fight)
end
```

and `calc_formual_part` (lines 76-97) is a plain **sum over every named contributing system**.

So, written out:

```
Power = floor(
          ( ADH(level) × (1 + Σpercent/10⁴) × (1 + Σextrapercent/10⁴) × Talent × (1 + Σcoefpercent/10⁴)
            + Σextradd )
          × (1 + Σtotalpercent/10⁴)
        )
```

The client names the buckets, which is how each system is attributed
(`…/readable/UnderlingData.lua:56-68`):

```lua
DEF_PROP(UnderlingData, "AllTalentsExtAdd", function (cur) return cur:CalcProp(PropManager.ATK, PropManager.FORMULA_COEF)         end)
DEF_PROP(UnderlingData, "AllTalentsPercent",function (cur) return cur:CalcProp(PropManager.ATK, PropManager.FORMULA_COEF_PERCENT) end)
DEF_PROP(UnderlingData, "AllTalents",       function (cur) return cur.AllTalentsExtAdd * (1 + cur.AllTalentsPercent / 10000)     end)
```

i.e. **"Talent" is the `coef` bucket — a raw multiplier on base ATK, not a percentage.** And
(`UnderlingData.lua:430-436`):

```lua
DEF_PROP(UnderlingData, "FightBase", function (cur)
	local base = cur:CalcProp(PropManager.ATK, PropManager.FORMULA_BASE)
	local extrapercent = cur.AllTalents
	extrapercent = math.max(extrapercent, 1)
	return math.floor(base * extrapercent)
end)
```

`base` is the level coefficient: `HeroLevel.json` (1,000 rows) `coefficientADH` — 300 at level 1,
**3,566 at level 312**, 15,500 at level 750, 26,390 at level 1000. (`Hero.json riseATK = 1` for all
181 heroes, so the hero's own innate ATK contributes nothing beyond this.)

### 1.3 Encoding of every contributor

One row of `SkillBase.json` = one effect. `skillProp.{id,propType}` picks the bucket; the value is

- `skillProp_Growth_Type` 1 or absent → `Initial + (L−1)·Level`
- `skillProp_Growth_Type == 2` → absolute lookup in `SkillLevel.json` (64,813 rows),
  `skillProp_Level_Uneven_Growth`

`targetCondition.conditionType` is the scope: `self` (1,550), `country` (1,852), `rare` (1,755),
`all` (555), `bless` (341), `bond` (323), `equipment` (116). **`all`, `rare` and `country` are all
"account-wide" in the owner's sense** — you buy them once and every matching hero gets them without
being touched.

| `propType` | rows | bucket |
|---|---|---|
| `percent` | 2,781 | `percent` (basis points, 10,000 = ×2) |
| `finalpercent` | 495 | `totalpercent` |
| `extradd` | 467 | `extradd` (flat, added AFTER the multiplicative stack) |
| *(id `talent`, no propType)* | 2,212 | `coef` — the Talent multiplier |

### 1.4 Ground truth: the owner's "Power Details" panel, reconciled exactly (added 2026-09-18)

Screenshots from the owner's emulator (`scratchpad/emu/shinobu-power-{1,2}.png`,
`orivita-{1,2,3}.png`). Account: roster 4.938B over 58 heroes, 12.24B/s. **Both displayed totals now
reproduce exactly — 2,665,123,377 and 456,778,931 — to the unit.**

**First, what produces the number on that panel.** The panel is `UI/Hero/CompHeroPropPower.lua`
(decompiled from `apk-audit/lua/main_game/UI/Hero/CompHeroPropPower.lua` with the LJD tool; it is not
in `private-server/readable/`). Its headline is

```lua
self.txt_Fight.text = StringUtil.PropertyNumberBySplitter(data.Fight)   -- = server's "totalPower" prop
```

so **the client does not compute the displayed Power; the server sends it.** The rows beneath are
individual *parts* the server also sends, each read with `CalcPropSubPart` — and they do not have to
sum to the headline. On this account the server is the owner's **private replacement server**, and
the function that produces `totalPower` is
`~/Library/Application Support/IsekaiPrivate/game/outputs/private-server/progression.py`
`_without_pledge` / `power` (the live copy; the one under `Documents/Codex/.../outputs` is older and
lacks the `star_commercial` aura term). Run read-only against a copy of today's `state/player.json`
(script `scratchpad/decompose.py`), it returns exactly the panel's Power for both heroes.

**The composition — one additive percent bucket, flats after, one small final multiplier:**

```
Aptitude = floor( Σ talent sources × (10000 + Σ coefpercent) / 10000 )
Power    = floor( ( floor(ADH(level) × Aptitude × (10000 + Σ percent) / 10000) + Σ flat )
                  × (10000 + petFinal) / 10000 )            [× (10000 + pledgeFinal)/10000 if pledged]
```

This is the client `Formula_ADD` shape with `extrapercent` = 0, `coef×(1+coefpercent)` = Aptitude, and
`totalpercent` = the familiar final bonus. **Every "Power Percentage Bonus" row is a part of the same
`percent` bucket** — `CompHeroPropPower.lua` reads Stars as `FORMULA_PERCENT/"herostar"`, Family as
`FORMULA_PERCENT/"beautyskillII"`, Artifacts as `FORMULA_PERCENT/"equipmentquenching"` — so they
**add**, they do not multiply. The coordinator's multiplicative fit (2.546B / 433.3M) landed near by
coincidence; the additive fit (~1.01B) was the right structure but was missing hidden parts.

| | Shinobu (264, Lv 600) | Orivita (114, Lv 550) |
|---|---|---|
| ADH(level) `HeroLevel.coefficientADH` | 10,400 | 8,935 |
| Σ talent sources (raw) | 12,283 | 2,677 |
| Σ coefpercent (origin 500 / aura 250) | ×1.05 | ×1.025 |
| **Aptitude used by the server** | **12,897** | **2,743** |
| Σ percent (bp) | **166,100** → ×17.61 | **106,350** → ×11.635 |
| base term `ADH × Apt × (1+Σpct)` | 2,362,008,168 | 285,158,782 |
| Σ flat | 238,112,200 | 160,479,200 |
| × familiar final (250 bp) | ×1.025 | ×1.025 |
| **Power** | **2,665,123,377** ✔ | **456,778,931** ✔ |

Percent parts (bp): Shinobu — Family 26,150 · Artifacts 17,000 · **Stella 95,200** · Stars 3,000 ·
Fish 1,250 · Familiar 8,000 · **aura 11,500** · Origin Boost 4,000. Orivita — Family 24,100 ·
Artifacts 16,900 · **Stella 47,500** · Stars 3,000 · Fish 3,250 · Familiar 8,000 · aura 3,600.
Flat parts: Shinobu — Stella 223,500,000 · item/fellow flat 7,266,000 · Family 3,051,000 · Familiar
1,750,000 · Stars 1,500,000 · Fish 1,031,000 · museum 14,200. Orivita — Stella 149,000,000 · Family
5,900,000 · Fish 2,251,000 · Familiar 1,750,000 · Stars 1,500,000 · growth ("Skill") 64,000 · museum 14,200.

**Why the panel's rows don't add up — the hidden parts, and which bucket each panel row maps to:**

| Panel row | Server part / bucket | Shown correctly? |
|---|---|---|
| Base "(Determined by Aptitude)" | `base` × `AllTalents` (`coef`×`coefpercent`) | **omits familiar talent** (316 / 128) — see below |
| Stars +30% | `percent/herostar` | yes |
| Family +261.5% / +241% | `percent/beautyskillII` | yes |
| Artifacts +170% / +169% | `percent/equipmentquenching` | yes |
| Origin Boost +40% | client field `LRSpSkill.atkPercent`; server adds it to `percent` | yes (value), LR heroes only |
| Skill +0% | `percent/skillpercent` | **Stella's 95,200 / 47,500 bp is sent as `percent/underlingskillpower`, which no panel row reads — the largest term on the page is invisible** |
| Familiar +0% | reads pet parts the server never sends | **hides 8,000 bp percent, 1.75M flat and the 250 bp final** |
| Fish +0% / +0 | reads the `Fish_to_*` system props, not the hero's parts | **hides 1,250–3,250 bp and 1.0–2.3M flat** |
| *(no row)* | star-commercial aura, folded into `percent` | **hides 11,500 / 3,600 bp** |
| Stars fixed +0 | panel reads `extradd/herostar_val`; server sends `extradd/herostar` | **hides 1.5M** |
| Item +0 | server's `item` part is net of the others; the 7.266M fellow flat is inside it but the panel shows 0 | **hides 7.266M (Shinobu)** |
| Stella +223.5M / +149M, Family +3.051M / +5.9M | `extradd` | yes |

**"Base (Determined by Aptitude)" is exactly `HeroLevel.coefficientADH(level) × displayed Aptitude`:**
10,400 × 12,565 = **130,676,000** ("130.6M") and 8,935 × 2,612 = **23,338,220** ("23.34M"). That
pins **talent-as-coef**: Aptitude is a straight multiplier on the level coefficient, not a
percentage. The displayed Aptitude is
`floor((Σ talent − familiar talent) × (1 + coefpercent))` = (12,283 − 316) × 1.05 = **12,565** and
(2,677 − 128) × 1.025 = **2,612**; the server multiplies by the full 12,897 / 2,743.

**Caveat, stated once and meant:** the *formula shape* (additive `percent` bucket, flats outside it,
talent as a multiplier on ADH) is the client's own `Formula_ADD`. The *assignment of each system to a
bucket* and the familiar/aura/fish magnitudes are the **replacement server's reconstruction** of a
private save — a previous agent's code, not retail. Stella's 223.5M flat and 95,000 bp percent,
however, match `HeroSpirit.json` rank 20 for hero 264 row for row (§6), so the dominant term is sourced.

**What this changes in the rest of this document:**

1. **Stella is ~58% of both heroes, and more of it arrives through the percent than the flat.**
   Shinobu: flat 223.5M + percent 95,200 bp on a 134.1M base term ≈ 1.54B of 2.665B = **57.7%**.
   Orivita: 149M + 47,500 bp on 24.5M ≈ 272M of 456.8M = **59.6%**. §3b's "70–90% of it is the flat"
   is wrong for developed heroes: at high aptitude the Spirit *percent* outgrows the Spirit flat.
2. **Aptitude is the second lever, and Everkai caps it.** Shinobu's 12,897 is 12.9× Everkai's
   `aptitude ≤ 1000`; 5,948 of it is one source (the aptitude/talent-level skills) and 3,397 is a
   form/costume system. Step 5 of the plan (§7) is worth more than its table row implies.
3. **The target Everkai should mirror is this formula**, not the four-bucket product in §1.2:
   `(ADH × Aptitude × (1 + Σpercent) + Σflat) × (1 + final)`. Everkai's `bondedPower` already has
   this shape in its APK branch (`sourceCoefficient × aptitude × … + flats`); what it lacks is the
   per-Fellow Spirit percent, aptitude above 1,000, and the aura term.

---

## 2. Term table — original vs Everkai

All original paths are relative to
`/Users/westmanfamily/Documents/Codex/2026-09-07/your/work/apk-audit/configs/config/logic/`.
All Everkai paths are relative to `/Users/westmanfamily/everkai/`.

### 2a. The base chain (small in both)

| Term | Original table | Original range | Everkai equivalent | Everkai range | Gap |
|---|---|---|---|---|---|
| Level coefficient | `HeroLevel.json` 1,000 rows `coefficientADH` | 300 → 3,566 @312 → 15,500 @750 | `lib/original-progression-data.json` `levels` (750) / `(80+20·level)` in default mode | 300 → 15,500 (APK); 100 → 6,320 @312 → 15,080 @750 (default) | **present, matches** |
| Max level | `HeroQuality.json` `levelLimit` 100→**750** (14 tiers) | 750 | `lib/game.mjs:66 MAX_LEVEL=750`, `fellowCap` via 13 breaks | 750 | **present, matches** |
| Talent multiplier | `coef` bucket: `Hero.initialTalent` 20–200, `HeroQuality.Talent` 0–65, talent-slot skills 300/600/900 @L300, `HeroMagicLevel.json` (3,877 rows / 29 heroes, up to **144,705**), `Equipment.initialTalent+riseTalent` (1,662/weapon), `HeroPledge` 3,600, `HeroIntimacyDegree` 2,000, `Country` 2,500 — **≈164,000 at max** | ×20 → ×164,000 | `fellowFactor`: `(aptitude+gear+artifact)/10 × (1+skill·.05)` | ×1 → **×1,535** (apt 1000 + 70 gear + 1,393 artifact @ cap 200, skill 20) | **≈107× short at the ceiling.** Everkai's aptitude is hard-capped at 1,000; the original's talent is not capped anywhere |
| ADH percent | `HeroStar.riseADH` 0→6,000 bp; `EquipmentQuenching.riseADH` 100→2,500 × up to 12 slots; `EquipmentLevel.coefficientADH` 0→999 | up to ≈+360% from gear alone | folded into aptitude (`artifactBonus` = `perLevel×(gearLevel−1)`, cap 200) | +1,393 aptitude | **present but as aptitude, not percent** |

### 2b. The per-hero flat term — this is where the 300M lives

| Term | Original table | Value | Everkai | Gap |
|---|---|---|---|---|
| **Spirit / Stella flat** (`HeroN_Power_M`, `atk`/`extradd`, growth type 2) | `HeroSpirit.json` 3,266 rows / **126 heroes**; skills in `SkillBase.json` + `SkillLevel.json` | **4,500,000 at rank 1** → **223,500,000 at rank 20** for the best (heroes 142, 251, 253–264). Median max **105,500,000**. **Sum over all 126 heroes = 13,861,950,000** | `lib/stella-data.json` — **4 profiles**, max flat 35,300,000 each, **sum 121,200,000** | **0.87% of the term is imported.** See §6 |
| Spirit percent (`HeroN_NewHalo_*`) | same | up to **95,000 bp (+950%)** on the base term; hero 194 reaches 135,000 bp | `stellaBonus` type-percent: +184% Inspiring, +122% Diligent/Informed | ~1/5 |
| Spirit talent | same | up to **2,050** | none | absent |
| Star flat | `HeroStar.json` 7 rows `extraAtk` | 400,000 (★1) → **7,500,000** (★6) | `STAR_APTITUDE_PERCENT=5`, `STAR_CAP=7` → aptitude ×1.35 | **absent as a flat**; worth ~+35% of a small number instead of +7.5M |
| Back / accessory flat | `HeroBack.json` | 6,000,000 → **269,000,000** (2 skills) | none | **absent** |

### 2c. Account-wide ("all the account wide power upgrades")

Sums are over the skills a hero of the matching rarity/country actually receives. `@lv1` means the
**first** level of each source — what a player has within days of unlocking it.

| System | Original table | Bucket | @ first level | @ level 5 each | Max | Everkai equivalent | Gap |
|---|---|---|---|---|---|---|---|
| **Fishing** | `Fish.json` 87 + `FishArtifact.json` 17 + `FishSkillLink.json` + `FishCombination.json` 34 | extradd | **1.4M–3.8M flat per hero** (rarity/country dependent) | **3.5M–9.4M** | uncapped (`maxUpgradeLevel` 99,999,999 — the level is a catch counter) | `lib/fishing-species.json` 86 records | flat **3,195,000** but **only for UR + type match**; most Fellows get 0 |
| " | " | percent | 3,500 bp | ~13,000 bp | uncapped (+2,050 bp/level) | `fishing.mjs` percent | +60% for SSR only |
| **Museum / collections** | `Exhibit.json` 137 (91 `levelUpSkill`, 84 `awakenSkill`, `levelUpMaxLevel` 120) | percent | 13,100 bp (+131%) | — | **151,390 bp (+1,513.9%)** | `lib/museum-data.json` 32 records | `basicPowerPercent` **+60**, `powerPercent` **0** — Hall 1 ships no `finalpercent` rows |
| " | " | extradd | 99,600 | — | **766,000** | — | absent |
| **Fashion / avatar** | `ShapeshiftClothes.json` 50 (`MaxLevel` 20) | percent | 20,000 bp | 92,000 bp | **172,000 bp (+1,720%)** | none | **absent** |
| **Activity / event skills** | `ActivitySkill.json` 143 + `ActivitySkillLevel.json` 879 | finalpercent | 95,500 bp | — | **95,500 bp (+955%)** | none | **absent** |
| SimGame collections | `SimGame1Collection.json`, `Skill_SimGame*` | extradd | 80,000 (all) + 3,005,000 (rare) | 4.7M | up to 500,650,000/skill nominal | none | **absent** |
| Character group | `CharacterGroup.json` | percent | 116,000 bp (rare) + 75,800 bp (country) | fixed (`maxUpgradeLevel` 1) | same | none | **absent** |
| Tower-defence combos | `TowerCombination.json` 13 | percent + extradd | 60 bp / 52,000 | — | 6,030 bp / 2,010,000 | none | **absent** |
| Medicine / plants | `Medicine.json` 20, `SimGame3Plant.json` 39 | percent + extradd | 1,600 bp / 1,600,000 | 16M (country) | uncapped | `farmYieldBonus` (economy only) | **absent from power** |
| Family / wife blessings | `WifeSpirit.json` 2,109 / 89 wives; `WifeBless.json` 798; `WifeSkill.json` 700 | percent (scope `bless`) + talent | 20,700 bp | — | **36,500 bp + 885 talent per wife**; `WifeSkill` `atk` to 16,151,000 | `lib/blessings.mjs` default ladder: **flat 159,000 + 12%** per supporting member | present, ~1/10 of the percent and none of the wife `atk` |
| Familiars / pets | `Pet*.json` — `PetLevel.ATKcoef` 0→364,600 and `PetStar.ATKcoef` 200→57,000 feed the **pet's own** battle entity; only one `PetFightPower` row touches a hero | ≈nil | | | `lib/familiar-node-data.json` 71 pets × 6 node groups × 199 nodes | **flat 9,250,000 · aptitude 3,600 · percent 450 · finalPercent 115** | **Everkai is far ABOVE the original here.** This is a local invention, not an import |
| VIP / guild / statues / bank | `Vip.json` 13, `GuildLevel.json` 12, `StatueLevel.json` 1,000 | — | — | — | — | — | **ruled out** — VIP rows are date/fertility only, guild rows are member limits, statue ATK skills carry `effectSystemName:["WeekBoss"]` and are mode-scoped |

**Account-wide multiplier available in the original, capped sources only:** `percent`
**385,685 bp = ×39.57**; `finalpercent` **129,000 bp = ×13.90**; `extradd` **+766,100**;
`talent` **+1,725**. Combined ≈ **×550** on the base term before any per-hero, rarity, country, bond
or equipment scope — and before the uncapped fishing/collection terms.

**Everkai's account-wide multiplier:** museum `basicPowerPercent` **+60% (×1.6)**, `powerPercent`
**0 (×1.0)**. That is the whole of it.

---

## 3. Reproducing the owner's two numbers from the original's tables

### 3a. "No one was under 5 million power"

Take a hero at level 100, talent barely touched, **zero personal investment**, on an account where
each account-wide source sits at its **first** level:

```
base   = HeroLevel.json coefficientADH(100)                                =        925
Talent = Hero.json initialTalent (rarity 5) 100 + base talent skill @L100 ~300     =        400
percent= account-wide (Exhibit 13,100 + fishing 3,500 + CharacterGroup ~116,000 bp) = ×13.3
                                              ---------------------------------------------
base term          = 925 × 400 × 13.3                                     =  4,921,000
extradd (account-wide, rarity 5 / country 2, first level of each source)   =  3,790,600
                                              ---------------------------------------------
Power                                                                     ≈  8,711,600
```

The `extradd` half alone is **3,790,600** at the first level of each source and **9,447,000** at
level 5 of each, *for a hero nobody has touched*. Measured per pool:

| scope | skills | Σ extradd @ lv 1 | Σ extradd @ lv 5 |
|---|---|---|---|
| `all` | 35 | 670,600 | 1,409,000 |
| `rare:5` | 5 | 2,400,000 | 5,450,000 |
| `country:2` | 8 | 720,000 | 2,588,000 |

**"No one under 5 million" is the account-wide `extradd` floor. It is not about the heroes at all.**
A single Spirit rank adds another **4,500,000** on top.

### 3b. "My top power was 300 million" — one character, end to end

Hero 264 (rarity 9, country 4, `heroSpirit: "264"`) at the owner's own reported rank, **level 312**.
Every input is read from the table named; assumptions are marked `≈` and stated.

```
BASE                HeroLevel.json coefficientADH(312)                              =       3,566

TALENT  (coef bucket -- a raw multiplier, summed)
  Hero.json initialTalent, hero 264                                                 =         100
  HeroQuality.json Talent, tier 6 (level cap 350, i.e. what holds a level-312 hero)  =          25
  Hero_Talent_Base_3          @ talent level 150   (3 + 3x149)                       =         450
  Hero264_Talent_extra2_2     @ talent level 150   (2 + 2x149)                       =         300
  Hero_Talent_Country4Base_1  @ talent level 150   (1 + 1x149)                       =         150
  HeroSpirit Hero264_NewHalo_1 @ rank 20                                             =       2,050
  account-wide talent, few weeks (Exhibit + fishing + SimGame)                      ~         400
                                                                        Talent      =       3,475

PERCENT  (basis points, summed; multiplies the base term only)
  HeroSpirit Hero264_NewHalo_3 @ rank 20                                             =      95,000
  HeroStar.json riseADH, star 1 (needHeroLevel 300 -- just reached)                  =       1,000
  Exhibit / museum at a few weeks' progress                                         ~      20,000
  CharacterGroup (rare 9 + country 4), all maxUpgradeLevel 1                        ~      40,000
  EquipmentQuenching riseADH across owned slots                                     ~       4,000
                                                            (1 + Sigma/10^4)        =       x17.0

EXTRADD  (flat -- added AFTER every multiplier above)
  HeroSpirit Hero264_Power_1 @ rank 20   (SkillLevel.json, uneven growth)            = 223,500,000
  HeroStar.json extraAtk, star 1                                                     =     400,000
  account-wide floor (fishing + SimGame + Exhibit + SG collection), ~lv 2 each      ~   4,500,000
                                                                        Sigma       = 228,400,000

TOTALPERCENT  (finalpercent)
  none assumed                                                (1 + Sigma/10^4)      =        x1.0

Power = ( 3,566 x 3,475 x 17.0 + 228,400,000 ) x 1.0
      = (       210,661,450    + 228,400,000 )
      =   439,061,450                                    <-- overshoots 300M
```

The sum **overshoots**, and that is the useful result: 300 million is not a stretch in the original's
tables, it is comfortably inside them. Two ways to land exactly on the owner's figure, both plausible:

```
(i)  same hero, Spirit at rank 13 instead of 20 (118,500,000 extradd, 59,000 bp percent):
     ( 3,566 x 3,475 x 7.0 + 118,500,000 + 4,900,000 )                      = 210,142,950
     ...still short, so his hero was nearer the top of the ladder than the middle.

(ii) same hero, Spirit rank 20, talent level ~100 rather than 150 and museum untouched:
     Talent 2,600, percent (1 + 96,000/10^4) = x10.6
     ( 3,566 x 2,600 x 10.6 + 228,400,000 )                                 = 326,678,960
```

**300 million is reachable in the original's own tables, and most of it is one system: the hero's own
`HeroSpirit` ladder.** *(Corrected by §1.4: on the owner's real Shinobu and Orivita, Spirit is ~58% of
Power, and at high aptitude more of it arrives through the Spirit **percent** than the flat.)* The base term — level, talent, stars, equipment, everything Everkai
currently models — contributes the remaining 10–30%.

For scale at the true ceiling: the same hero at level 500 (`coefficientADH` 7,590) with talent 5,990
(talent slots at level 300, `HeroMagicLevel` untouched) and the account-wide percent stack at
×24.9 gives a base term of **1,132,056,090** before any flat. The original's own maximum is in the
**billions per hero**, not the hundreds of millions.

### 3c. Cross-check against the private server's live save

The live save total was **3,497,276,469** power across the roster
(`tests/fellow-power.test.mjs:22-24`). Over ~150 owned heroes that is **≈23M average**, with a top of
300M and a floor of 5M. **The live save and the owner's memory describe the same account.** The live
save is *not* an early or unrepresentative outlier — it is exactly a few-weeks account, and it
independently confirms his numbers.

---

## 4. Everkai, term by term

### 4.1 `bondedPower` verbatim

`lib/adventure.mjs:104-109`:

```js
export const starredAptitude=f=>f.aptitude*(1+fellowStars(f)*STAR_APTITUDE_PERCENT/100);
export const fellowFactor=f=>(starredAptitude(f)+(GEAR.find(g=>g.id===f.gear)?.aptitude||0)+artifactBonus(f))/10*(1+f.skill*.05);
export const fellowPower=f=>Math.floor((80+20*f.level)*fellowFactor(f));
export const bondedPower=(s,id)=>{ … }
```

Structurally:

```
adjusted.aptitude = f.aptitude + special + museum.apt + pet.apt + fish.apt + echo.apt
base   = [ default: (80+20·level) · fellowFactor(adjusted)
         | APK:    coefficient(level) · (starredApt + sourceApt + gearApt + artifactBonus) · (1+skill·.05) ]
         × (1 + museum.basicPowerPercent/100)
inner  = floor( (base × Σpercent + blessFlat + petFlat + fishFlat)
                × (1 + museum.powerPercent/100) × (1 + pet.finalPercent/100) )
Power  = applyStella( inner + elixirPower )        // = floor((x + stellaFlat) × (1 + stellaPct/100))
```

It is displayed as "Power" on the character screen (`app/page.tsx:161` →
`app/character-screen.tsx:23`) and in training (`app/fellow-training.tsx:20`). *(One unrelated screen,
`app/wayfarer-profile.tsx:20`, shows `openingPower` = `floor(Σ bondedPower × 100)` in default mode —
a different quantity.)*

### 4.2 Mapping onto the original's buckets

| Original bucket | Original max | Everkai analogue | Everkai max | Verdict |
|---|---|---|---|---|
| `base` (level ADH) | 15,500 @750 | `(80+20·level)` = 15,080 @750 / `sourceCoefficient` 15,500 | 15,080–15,500 | **present-but-different** (default mode is 2.7% low; APK mode matches exactly) |
| `coef` (Talent) | ≈164,000 | `fellowFactor` | **1,535.68** | **present-but-different, ≈107× short.** `aptitude` capped at 1,000 |
| `percent` | 385,685 bp account-wide + 95,000 bp Spirit | `Σpercent` = `bondFactor + bless% + pet%/100 + fish%/100 + echo%/100` | ≈**5.82** (×5.8) | **present-but-different**, and mostly supplied by the locally-invented familiar (+450%) |
| `extradd` | 223,500,000 (Spirit) + 766,100 (museum) + 1.4–3.8M (account-wide floor) + 7.5M (stars) | `blessFlat 159,000 + petFlat 9,250,000 + fishFlat 3,195,000` | **12,604,000** | **present-but-different**, 18× short of Spirit alone, and *zero* until the familiar is maxed |
| `totalpercent` | 129,000 bp account-wide | `museum.powerPercent` (**0**) × `pet.finalPercent` (+115) × `stella%` (+122) | ×2.15 × 2.22 | **present-but-different** |

### 4.3 The level-312-under-2M case, exactly

Measured by running the repo's `lib/` (script:
`…/scratchpad/ek312.mjs`):

| Fellow record at level 312 | `bondedPower` |
|---|---|
| fresh (aptitude 10, skill 0, no gear) | **6,320** |
| aptitude 300, skill 10, ★3, best gear | **393,420** |
| **aptitude 1000, skill 20, ★7, best gear, `gearLevel` 1** | **1,794,880** |
| same + `gearLevel` 200 (`ARTIFACT_CAP`) | **3,555,632** |
| aptitude 1000, skill 20, ★7, best gear, `gearLevel` 1, at level 750 | **4,282,720** |
| same + `gearLevel` 200, at level 750 | **8,484,008** |

The third row is the owner's Fellow: **1,794,880 — "under 2 million".** The arithmetic:

```
starredAptitude = 1000 × (1 + 7×5/100)                                   = 1,350
fellowFactor    = (1,350 + 70 best gear + 0 artifact) / 10 × (1 + 20×.05) = 284.0
fellowPower     = floor((80 + 20×312) × 284)  = floor(6,320 × 284)        = 1,794,880
bondedPower     = 1,794,880 × bondFactor 1.0 + 0 flats                    = 1,794,880
```

**Why it is that small, in one line:** every additive source in Everkai lands inside a bracket that is
then **divided by 10**, and the whole bracket is capped by `aptitude ≤ 1000`. The original puts its
largest sources in `extradd`, *outside* every multiplier, where a single Spirit rank is worth
**4,500,000** on its own.

The ceiling is not the problem. With every Everkai system maxed, the same level-312 Fellow reaches
**476,281,384** — measured, `valid(s) === true` — which is *above* the original's 300M hero. Staged:

| Stage (hero_1, level 312 throughout) | `bondedPower` |
|---|---|
| records only (apt 1000, skill 20, ★7, gear @200) | 3,555,632 |
| + museum (32 keepsakes) | 5,699,931 |
| + familiar (Pet_4151, 199 nodes, L499/★100) | **203,515,503** |
| + stella (+122% Diligent) | 451,804,416 |
| + blessings (107 Family) | 461,457,596 |
| + bonds (×1.2) | **476,281,384** |

**Read that table next to the original's.** 97% of Everkai's per-Fellow power comes from **one**
system (the familiar node grid) that no ordinary player reaches, and which is a **local invention** —
the original's `PetLevel`/`PetStar` ATK coefficients feed the pet's own battle entity, not the hero.
Meanwhile the original's own biggest term, `HeroSpirit` `extradd`, is imported at **0.87%**.

---

## 5. The 3,497,276 figure and the 1.99× ceiling

### Where it came from

`tests/fellow-power.test.mjs:22-24`:

> `// The measured reference point on the original's live save is 3,497,276,469 total power`
> `// => 3,497,276 conversion.`

Exported as a named constant at `tests/crossover-ceiling-fixture.mjs:133`
(`export const ORIGINAL_LIVE_SAVE=3497276;`) and asserted at `tests/crossover-family.test.mjs:539`.

The `/1000` is the original's own divisor, not a local choice: `docs/slice-buildings.md:18` records the
income model as
`income = (staff×yieldRate + totalFellowPower × HeroConversionRate/10000) × (10000+bonus)/10000`, and
`BuildingBase.HeroConversionRate` is **10** on all seventeen non-Bank buildings, so 10000/10 = 1000.
`lib/businesses.mjs:95` is the same shape:
`rosterOperation = Σ bondedPower/1000`.

### Is it a valid target?

**Three separate answers.**

1. **As a units comparison, yes.** `3,497,276` is `totalFellowPower/1000` and `rosterOperation` is
   `Σ bondedPower/1000`. Both halves are whole-roster power conversions, both from their own source.
   Rule 1 is satisfied. **The contradiction in the brief dissolves here: 3,497,276 was never a single
   hero's power.** It is a roster total of **3.497 billion**, which at ~150 heroes averages 23M — fully
   consistent with a 300M top and a 5M floor. The live save is representative, and Everkai's Power is
   measuring the same thing the original displays.

2. **As a parity target, no — it compares an Everkai ceiling to a non-ceiling original.** The
   numerator is Everkai's *fully assembled maximum*; the denominator is one real player's state after a
   few weeks. That is the error the test header itself flags at :60-65 ("3,497,276 is what ONE REAL
   SAVE had reached, not the original's own maximum"). The original's own ceiling, from §3b, is over a
   **billion for a single hero** — three orders above this denominator. Everkai is not "1.33× over the
   original"; it is roughly **1/300th of the original's ceiling, arranged so that its own ceiling
   coincidentally lands near one early original save.**

3. **The live figure is 1.33×, not 1.99×.** `tests/fellow-power.test.mjs:36-38` records that the
   2026-09-17 roster trim (159 → 111 Fellows) moved the ceiling from 6,965,719 to **4,655,637**, i.e.
   **1.33×**, purely because `rosterOperation` is linear in Fellow count. **No per-Fellow number
   changed.** 1.99× is stale and still quoted in `docs/parity-catalog.csv` rows F11, F19, SL1-14,
   F12-03 and `docs/crossover-progression-plan.md:403-411` — those should be corrected.

**Recommended replacement target.** Stop targeting a roster total against one save. Target the two
numbers the owner actually reported, because they are the two the player sees:

- **a Fellow's displayed Power at a given level**, against the original's at the same level; and
- **the roster floor** — the weakest owned Fellow — against the original's account-wide `extradd` floor.

---

## 6. Is the Stella/Spirit import the biggest single term?

**It is the biggest by a wide margin — and what is shipped today is 0.87% of it.**

Confirmed on the owner's own heroes (§1.4): Spirit is **57.7%** of Shinobu's 2,665,123,377 and
**59.6%** of Orivita's 456,778,931 — flat (223.5M / 149M) plus percent (95,200 / 47,500 bp) together.
Note the percent half is sent as `percent/underlingskillpower`, which the Power Details panel never
displays, so the owner has never seen the largest term on his own heroes.

The original has **two** families of per-hero Spirit flat ladders in `SkillBase.json`/`SkillLevel.json`,
both indexed from `HeroSpirit.json`:

| family | skills | heroes | rank-1 flat | max flat | median max |
|---|---|---|---|---|---|
| `HeroN_SelfPowerAdd_M` | 4 | **52, 54, 56, 190** | 500,000 | 35,300,000 (40 ranks) | 35,300,000 |
| `HeroN_Power_M` | **122** | 101–106, 111–145, … 264 | 1,000,000–4,500,000 | **223,500,000** (20 ranks) | **105,500,000** |

`lib/stella-data.json` holds **exactly the four `SelfPowerAdd` heroes** — Angie (hero_52), Rani
(hero_54), Liz (hero_56), Elise (hero_190) — with max flats 35.3M / 35.3M / 35.3M / 15.3M, summing to
**121,200,000**, sourced from a fan wiki (`isl-tools`), not from the APK config.

The **122 `Power` heroes are entirely absent**, and they are the larger ladder in every respect:
3× the median max, and up to 4.5M *at rank 1* against the `SelfPowerAdd` 500,000.

| | flat available | share |
|---|---|---|
| Original, all 126 spirit heroes | **13,861,950,000** | 100% |
| Everkai `lib/stella-data.json` | 121,200,000 | **0.87%** |

Two further gaps in the same import: the wiki values are **~6.3× low** even for the four heroes it
covers versus the best real ladder, and Everkai's `stellaBonus` pays the flat only to the **profile
owner** while spreading a percent to same-*type* Fellows — whereas the original pays `Hero264_Power_1`
to hero 264 and nobody else (`targetCondition: {conditionType:"self"}`). The shape is different, not
just the magnitude.

> **Note for the agent measuring "what a Stella/Spirit rank does":** the answer for the real system is
> `SkillLevel.json` rows keyed on `skillType = HeroN_Power_M`, not the four wiki ladders. Rank 1 of
> hero 264 is **+4,500,000 flat ATK**; the full 20-rank ladder is in §3b.

---

## 7. Ranked plan to close the gap

Ordered by worth per unit of work. "Worth" is the change to one Fellow's displayed Power.

| # | Step | Import | Worth | Earnings effect | Save-affecting? |
|---|---|---|---|---|---|
| **1** | **Per-Fellow Spirit flat, all 126 ladders** | `HeroSpirit.json` (3,266 rows) → the `HeroN_Power_M` / `HeroN_SelfPowerAdd_M` `SkillLevel` rows; costs are in each row's `heroSpiritCost` (400 → 2,000 shards/rank, ≈24,200 for rank 20) | **+4.5M at rank 1, +223.5M at rank 20**, per Fellow. Replaces the whole gap on its own | `rosterOperation` is linear: 111 Fellows at rank 1 alone = **+499,500** operation, i.e. **~1.1× the entire current ceiling**, from one day of shards | **YES.** Widens `lib/stella-data.json` from 4 profiles to 126 and changes `STELLA_HISTORY_MAX`. Rule 12: nothing recomputes a stored stella row (`stella.mjs` deliberately does not reprice history), and `validMine`/`validSlot` check stored `power`, never a recomputed one — **but generate-and-decode must still be run** |
| **2** | **Account-wide `extradd` floor** | `Fish.json` 87 + `FishArtifact.json` 17 + `SimGame1Collection.json` + `Exhibit.json` 137 `extradd` rows, scoped `all`/`rare`/`country` | **+1.4M–3.8M to EVERY Fellow at the first level of each source**; 3.5M–9.4M at level 5. This is the single term that produces the owner's 5M floor | 111 Fellows × 3.8M / 1000 = **+421,800** operation | **YES** — widens `lib/fishing-species.json` scope from UR/type-matched to rarity+country pools |
| **3** | **Account-wide `percent` stack** | `Exhibit.json` `levelUpSkill`/`awakenSkill` (**151,390 bp**, cap 120), `ShapeshiftClothes.json` (**172,000 bp**, `MaxLevel` 20), `CharacterGroup.json`, `ActivitySkill.json` `finalpercent` (**95,500 bp**) | **×39.6 on the base term and ×13.9 final**, against Everkai's ×1.6 and ×1.0 | multiplies whatever steps 1–2 produce — **this is the step that must be paced, not the flats** | **YES** — `museum.powerPercent` is currently 0; giving it a real value changes every Fellow |
| **4** | **Star flats** | `HeroStar.json` 7 rows: `extraAtk` 400,000 → 7,500,000 and `riseADH` 0 → 6,000 bp, gated on `needHeroLevel` 300/400/550/700/750 | +400K at ★1 → +7.5M at ★6, and the level gates are already the right pacing lever | small next to 1–2 | **NO** if added as a new derived term; `f.stars` already exists and is already bounded at `STAR_CAP` |
| **5** | **Talent as a multiplier** | `HeroMagicLevel.json` (3,877 rows / 29 heroes, up to **144,705** talent), `HeroPledge.json` 15, `HeroIntimacyDegree.json` 10, `Country.json` 10, `Equipment.initialTalent/riseTalent` | lifts `fellowFactor`'s ceiling from **1,535** toward the original's **164,000** | multiplicative on everything — highest blow-up risk | **YES** — requires raising or removing the `aptitude ≤ 1000` cap, which `validAdventure` enforces (`int(f.aptitude,1000)`). Widening a bound is backward compatible; **measure it** |
| **6** | Rebalance or remove the familiar node grid | — | **−203M** per Fellow (it is currently 97% of the maxed stack and is a local invention with no original counterpart) | large reduction | **YES** — this *removes* value from existing saves. Owner decision, not a fix |
| **7** | Correct the stale 1.99× references | `docs/parity-catalog.csv` F11/F19/SL1-14/F12-03, `docs/crossover-progression-plan.md:403-411` | 0 | 0 | no |

### What this does to village earnings — and what "~4×" now means

`lib/businesses.mjs:95,120-124`:

```
enterprise income = (employeeIncome + rosterOperation) × (1 + quality + family + farm + assignedOperation)
rosterOperation   = Σ bondedPower / 1000                        (linear, no exponent)
```

Power enters **linearly**. So multiplying every Fellow's Power by *K* multiplies the operation term by
*K* exactly. The starter buildings are **not** affected (`lib/game.mjs:252` `buildingRate` reads
`fellowFactor` and `bondFactor` directly, never `bondedPower`), and `lib/northern.mjs:8`
(`clamp(floor(√power/5),2,200)`) already saturates above power 1,000,000, so a rebase is a no-op
there. `lib/expo.mjs`, `lib/mine-clearance.mjs`, `lib/frontier.mjs`, `lib/trading-post.mjs` and
`lib/helper.mjs` are all linear or threshold consumers.

**The owner's accepted "~4× on the CURRENT model" does not survive a Power rebase, and must be
restated.** The reason is arithmetic:

- Today's *reachable* `rosterOperation` for a real player is in the **hundreds** (11.1 untrained,
  203.52 at level 60; `tests/fellow-power.test.mjs:218-265`). 4× of that is still hundreds.
- Step 1 alone, at **Spirit rank 1 on 111 Fellows**, puts `rosterOperation` at **≈500,000** — about
  **2,500× today's realistic value**, and above the entire current *ceiling*.
- The original's own few-weeks save sat at **3,497,276** operation. So importing the real tables does
  not overshoot the original — it lands *on* it. What it overshoots is **Everkai's current earnings
  expectation**, by roughly 10⁴.

Two honest ways out, and they are an owner decision, not a measurement:

- **(A) Import the power tables AND the original's faucet pacing.** Shard income (`heroSpiritCost`
  400 → 2,000/rank, ≈24,200 shards for one Fellow's rank 20) is the real brake in the original. Power
  reads correctly at every level and earnings follow the original's own curve. This is true parity and
  it means the owner's village income will look nothing like today's.
- **(B) Import the power tables for display and re-base the divisor.** Keep earnings inside the
  accepted band by raising the `1000` in `rosterOperation`. But **rule 1: that divisor is the
  original's own `HeroConversionRate/10000`** — changing it breaks the one clean sourced ratio in the
  building model, and the same Power would then buy different income than it does in the original.

Recommendation: **(A), staged in the order above, with step 3 (the percent stack) held back until
steps 1–2 have been observed in a real save.** Steps 1, 2 and 4 are additive and paced by their own
cost tables; step 3 is the multiplicative one and step 5 removes a cap — those two are where an
unpaced import turns into a 10⁴ blow-up.

---

## 8. Numbers I could not measure, and the question that settles each

| # | Unmeasured | Why measuring failed | Question for the owner |
|---|---|---|---|
| 1 | **The composition of `base` from `talent` and the several `coefficientADH`/`riseADH` sources.** The client's `Formula_ADD` receives these already summed by the *server*; the buckets are named but the server-side attribution of `HeroStar.riseADH` vs `EquipmentQuenching.riseADH` vs `HeroTalentConversionADHRate=100` into `percent` vs `coef` is inferred, not read | The computation is server-side; `PropManager` only consumes the response. Best positive control available is §3c (the live-save total reproduces to the right order) | — measurable with one more emulator session: read one hero's panel breakdown (the panel *does* show the split — `UnderlingData.lua:854-861` surfaces `equipmentquenching` separately). **Ask instead: can you screenshot one Fellow's power-breakdown panel from the original?** |
| 2 | **Cap on the fishing / collection skill levels.** 52+ account-wide ATK skills carry `maxUpgradeLevel = 99,999,999`; the level is a catch/collection counter | The counter's bound is not in config. `FishLevel.json` (500 rows) is the *angler's* level, not the per-fish skill level (rule 6 — do not read a placeholder as a measurement) | **"Roughly how many of one kind of fish did you end up with after a few weeks — single digits, dozens, hundreds?"** That one answer sets the whole account-wide floor |
| 3 | **What Spirit rank the owner's 300M hero was at.** §3b reaches 300M at rank 20 with a modest base term, or at rank 12 with a larger one | Needs his save | **"Was your 300M hero's Stella/Spirit track finished, or about halfway?"** |
| 4 | **What lifts the hero level cap from 750 to the 1,000 rows in `HeroLevel.json`.** `System.HeroLevelInitialLimit = 750` and `HeroQuality.levelLimit` also stop at 750 | No table found that grants it; the `maxLevel` skill prop (76 rows) is `conditionType:"skill"` — it raises another *skill's* cap | **"Did any of your heroes go above level 750?"** |
| 5 | Per-level value of `BuildingAppearance_Set_1/2` (the `BuildingAppearance_to_all` set bonus, `target:"hero"`, `maxUpgradeLevel 4`) | `skillProp` grants `talent` but the value did not resolve through `SkillLevel` | low value; defer |
| 6 | Whether `HeroQuality.Talent` is per-tier absolute (65) or cumulative (455) | Both readings are consistent with the table | measurable from the same breakdown panel as #1 |
| 7 | `DAStar.json` (100 rows, `starValue` 30 → 4,000) — **referenced by no other logic table.** Likely dead | positive control passed (the reverse index finds real references for every other table checked), so the absence is real | **"Do you remember a second star system with up to 100 stars?"** |
| 8 | `HeroBack.json` — 2 skills, `extradd` 6,000,000 → **269,000,000**. Larger than Spirit per skill | the unlock/pacing table behind it was not traced | **"Was there an accessory or 'back' slot on a Fellow?"** |

### The batched decision this raises (rule 9)

Three questions, one recommendation each, and work proceeds on the recommendation unless the owner
objects:

1. **Earnings.** Importing the real power tables raises reachable village income by roughly 10⁴, not
   4×. *Recommendation: option (A) — import the power tables with the original's own shard/collection
   pacing, and accept that income looks different, because that is what parity means.*
2. **The familiar node grid** is currently 97% of a maxed Fellow's Power and has no counterpart in the
   original. *Recommendation: leave it alone until steps 1–3 land, then re-price it downward rather
   than delete it, so no existing save loses value it already banked.*
3. **The parity target.** *Recommendation: retire "1.99× / 1.33× of the live save" as the headline and
   replace it with two per-Fellow targets — displayed Power at a given level, and the weakest owned
   Fellow's Power — both taken against the original's own tables at the same level.*

---

## 9. Implemented 2026-09-18: Fellow Power on the original's composition

**Gameplay code changed by this section.** `lib/adventure.mjs` `powerParts` / `composePower` /
`bondedPower`, `lib/aptitude-cap.mjs` (+ `lib/aptitude-cap-data.json`, `scripts/import-aptitude-cap.py`),
and every call site that hard-coded the old 1,000 Aptitude cap. Guarded by
`tests/power-composition.test.mjs` (the two panels to the unit, the bucket table, Stella-once, the
Everkai-only familiar, both modes, the cap, the stored-value bounds) and `tests/power-pacing.test.mjs`
(pacing pins and the rule-12 decode).

```
Aptitude = floor( Σ talent × (1 + Σ coefpercent/1e4) )
Power    = floor( ( floor(ADH(level) × Aptitude × (1 + Σ percent/1e4)) + Σ flat ) × (1 + Σ final/1e4) )
```

`composePower` fed the §1.4 bucket sums returns **2,665,123,377** and **456,778,931** — the owner's two
displayed totals — and ADH × displayed Aptitude returns the panel's "Base" rows (130,676,000 and
23,338,220). Nesting the percent parts, or wrapping the flats in Stella's percent (the old spine's two
shapes), does not (negative-control test).

### 9.1 The bucket mapping

| Everkai source | lib | Original system (panel row / server part) | Bucket | Before 2026-09-18 |
|---|---|---|---|---|
| Level | `levelADH` | `HeroLevel.coefficientADH` | **ADH** | APK: same. Default: `(80+20·L)` with a `/10` on Aptitude — now folded into the column as `(80+20·L)/10`, identical arithmetic |
| Trained Aptitude (`fellow.aptitude`: talent levels, pearls, items, essences, insight) | record | talent-level skills `Hero_Talent_Base_N` etc. | **talent** | talent |
| Hero row `initialTalent` + quality talent (APK only) | `sourceAptitudeBonus` | `Hero.initialTalent`, `HeroQuality.Talent` | **talent** | talent |
| Equipped artifact base + level | `GEAR.aptitude`, `artifactBonus` | `Equipment.initialTalent + riseTalent` | **talent** | talent |
| Family special blessing | `specialAptitude` | Wife bless talent | **talent** | talent |
| Museum keepsake / relic Aptitude | `museumBonus.aptitude` | Exhibit `talent` rows | **talent** | talent |
| Fishing Aptitude | `fishingBonuses.aptitude` | Fish `talent` | **talent** | talent |
| Artifact Echo Aptitude | `artifactEchoBonus.aptitude` | EquipmentSkill talent | **talent** | talent |
| — (no Everkai source) | | pet type 4, star-commercial aura | **coefpercent** | — |
| Stars, +5% each (Everkai magnitude) | `fellowStars × 500` | `percent/herostar` | **percent** | ×(1+5%·stars) **on Aptitude only** |
| Fellow skill, +5% a level (Everkai magnitude) | `skill × 500` | `percent/skillpercent` ("Skill") | **percent** | separate ×(1+0.05·skill) |
| Family bonds, +2% a level | `bondFactor−1` | family/intimacy percent | **percent** | percent (unchanged) |
| Family Advanced Blessing | `blessingPower.percent` | `percent/beautyskillII` | **percent** | percent (unchanged) |
| Museum `atk/percent` (basicPowerPercent) | `museumBonus` | Exhibit `percent` | **percent** | separate ×(1+m%) on the base |
| Fishing percent | `fishingBonuses.percent` | Fish `percent` | **percent** | percent (unchanged) |
| Artifact Echo percent | `artifactEchoBonus.percent` | EquipmentSkill percent | **percent** | percent (unchanged) |
| **Stella percent** (typed + own `selfPowerBp`) | `stellaBonus.percent` | `percent/underlingskillpower` (hidden on the panel) | **percent** | **outer wrapper over everything, flats included** (`applyStella`, retired) |
| Family Fellow Blessing flat | `blessingPower.flat` | Family `extradd` | **flat** | flat |
| Fishing flat | `fishingBonuses.flat` | Fish `extradd` | **flat** | flat |
| **Stella flat** (`HeroN_Power_M`) | `stellaBonus.flat` | `extradd` | **flat** | flat, added last (unchanged position) |
| Fountain elixirs | `elixirPower` | "Item" flat | **flat** | added after museum/familiar finals but INSIDE Stella's percent wrapper; now a plain flat part (receipts still say `scope:'final-flat'` — a stored label, not re-written) |
| Museum `atk/finalpercent` (powerPercent) | `museumBonus` | `totalpercent` | **final** | separate multiplier |
| **Familiar** flat / Aptitude / percent / finalPercent | `familiarBonus` | pet types 1/2/3/5 | flat / talent / percent / **final** — every part named `familiar` (`EVERKAI_ONLY_PARTS`) | same buckets; final multiplied museum's instead of adding |

**Stella is counted once.** The Stella import already put the whole percent half — the type-wide
column and the owner's own `selfPowerBp` — into `stellaBonus.percent`. Nothing new was added from
`HeroSpirit`; the change is *where* it goes: one part of the additive bucket, on ADH × Aptitude only,
exactly as the server sends it. `applyStella` is retired. Tested: on a Fellow with only a Stella track,
`percent.stella` is the whole of `stellaBonus.percent`, `flat.stella` its flat, every other part zero,
and `bondedPower === powerParts().power` (a re-introduced outer factor fails the test).

**Stella talent (`self | talent`, 17 heroes, up to +2,050) is still not modelled.** Its blocker was the
1,000 Aptitude cap; that is gone, so it is now a pure import step (per-rank talent is not in
`lib/hero-spirit-data.json`, only `unmodelledMax`). Deferred with that reason.

**The familiar node grid** is left in place: nothing stored is removed or re-priced (every activated node
and bond stays), its parts sit in the buckets the original's pets write (PetInfo.lua:848-852), and each
is named `familiar` (`EVERKAI_ONLY_PARTS`) so a later re-price can find all of it. A test binds a
trained familiar and asserts no non-`familiar` part moves. Its *derived* Power does move, because
Stella's percent no longer multiplies its flat and its final now adds to the museum's. See 9.7.

### 9.2 The Aptitude cap: 31,122, measured

`scripts/import-aptitude-cap.py` → `lib/aptitude-cap-data.json` → `lib/aptitude-cap.mjs`. For each of the
181 heroes: its `heroBaseSkill` talent skills at `maxUpgradeLevel` (300), plus their summed per-level
amount × every `talentLvLimit` that reaches it (`self` Aura/Spirit rows by id prefix, `rare` by rarity,
`all`, and `bless` via the blessing recipients; 597 rows, census asserted). The maximum is **hero_253:
5,400 + 18 × 1,429 = 31,122**, and hero_253 ships, so the maximum over Everkai's 111 originals is the same
number (tested). Shinobu's measured 12,897 sits inside it. One cap for every Fellow, both modes: per-hero
caps run 720 → 31,122 and would refuse saves that legally hold 1,000 today. Every hard-coded 1,000 now
reads `APTITUDE_CAP` (validAdventure, the pearl/talent/insight/essence/opening-item planners and guards,
encounter advice, and the aptitude ledger's per-key bound). Widening only; CAP+1 is still refused.
What paces Aptitude is unchanged: talent levels stop at `talentCap`, pearls double every 2,500 bought.

### 9.3 Before → after, per Fellow

| Fellow | mode | before | after |
|---|---|---|---|
| fresh (level 1, Aptitude 10) | default | 100 | **100** |
| fresh | APK | 6,000 | **6,000** |
| L312, Aptitude 1,000, skill 20, ★7, best gear L1 (the owner's "under 2M" record) | default | 1,794,880 | **1,589,164** |
| same | APK | 10,662,340 | **9,595,214** |
| L750, Aptitude 1,000, skill 20, ★7, best gear L200 | APK | 89,528,000 | **92,446,650** |
| same + museum, familiar, every Stella track maxed, blessings, bonds (hero_1) | default | 59,424,908 | **34,489,373** |
| same | APK | 455,347,316 | **201,104,269** |
| same, Aptitude at the new cap (31,122) | APK | 455,347,316 (cap 1,000) | **2,381,298,483** |
| strongest Fellow of the fully-maxed ceiling fixture | default | 623,250,916 | **285,273,823** (0.95× the owner's 300M) |
| weakest Fellow of that fixture | default | 28,900,470 | **26,274,696** |

Records-only Fellows move little (stars now also reach gear and artifact Aptitude; stars and skill add
instead of multiplying). The large drop is the Stella percent: it used to multiply the museum, familiar,
blessing and Stella flats and every other percent; it now adds to the percent bucket on ADH × Aptitude,
where the owner's panel puts it. The large rise is the cap.

### 9.4 The two modes

One composition (`composePower`) in both. APK growth: ADH = `HeroLevel.coefficientADH`, plus the hero
row's talent as a talent part. Default: ADH = `(80+20·level)/10` — the old default arithmetic, with the
`/10` that sat on `fellowFactor` folded into the column, so a fresh default Fellow is still exactly 100 and
`ladderPower`'s pre-existing ×100 adapter is untouched. Everything in this section applies to **both**
modes: the buckets, the Stella re-bucketing and the cap (`validAdventure` is mode-agnostic). The starter
buildings (`buildingRate`, `fellowFactor`) are Everkai's own income model, not Power, and are unchanged.

### 9.5 Downstream of Power, re-measured

| Consumer | How Power enters | Effect |
|---|---|---|
| Village earnings, `rosterOperation` | Σ Power/1000 per business = `Power × HeroConversionRate/1e4`; `BuildingBase.HeroConversionRate` is **10 on all 17 buildings Everkai ships**, including `Building_1101` "Bank" — the rate-0 row is the separate `Building_Bank` id, so the audit gap #16c ("the Bank is excluded") does not apply | linear in Power; see the pacing pins (9.6) |
| Stage ladder | `ladderPower` = roster Σ (×100 default); normal stages priced by (atk/Power)^¼, bosses need Power > atk | lower Power → slightly dearer stages (day-30 save: next stage 2,976 → 3,197 gold); bosses gate later |
| Mine Clearance | one deployment per Fellow per day, `after = min(TOTAL, before + power)`; receipt stores `power` ≤ 1e15 | fewer kills per day (day-30 save: 55 → 51 guardians from a full day's deployments); receipts checked as stored (9.7) |
| Trading Post | duel won iff Fellow Power ≥ opponent (50 / 250 / 1,000); run stores `power` ≤ 1e15 | no change: every trained Fellow clears all three either way |
| Northern Odyssey | `atk = clamp(floor(√rosterPower/5), 2, 200)`; run stores `power` ≤ 1e15 | saturated at 200 either way (roster Power ≫ 1e6) |
| Frontier | wave Power 2,000–14,800 vs one Fellow or the party | no change: cleared either way |
| Expo | `sales = floor(power × …)`; slot stores `power` ≤ **1e12** | no change in play; bound checked below |
| Familiar Tower / explore / dispatch | no Fellow Power input (measured: none imports adventure/businesses power) | none |
| Achievements `rosterPower` | `floor(rosterOperation × 1000)` as progress; the validator stores only claimed ids | progress moves; claimed steps stay valid |
| Crossover ceilings | `tests/crossover-family.test.mjs` | flag-off 26,956,296 → 14,537,869; flag-on 33,997,375 → 20,874,032; gold/s 136.3B → 73.6B (flag-off) and 171.9B → 105.6B (flag-on); a maxed crossover Fellow vs a maxed Diligent original **0.295× → 0.621×** |

**Stored-value validators.** The worst reachable case — every Fellow at Aptitude 31,122 on top of the whole
maxed ceiling fixture — measures one Fellow at 1,166,117,215 (default) / 10,060,013,132 (APK), a roster at
56,556,832,299 / 480,946,676,241 and `ladderPower` at 5,655,683,229,900 / 480,946,676,241. Every bound that
stores a Power holds with room: Expo slot 1e12 (~100×), mine / trading-post / Northern 1e15 (~2,000×),
`lastBattle` 1e18. So **no validator needed widening**; the test pins the margins. `MAX_GOLD` 1e15 and
`MAX_FELLOW_XP` 1e13 are clamps on wallets (collect uses `min`), not validators a save can fail.

### 9.6 Pacing pins

`tests/power-pacing.test.mjs`. Scratchpad `sim/sim-pins-cap.mjs` (sim-v2 plus two policy changes: it
spends idle Stella shards one rank at a time on the best income gain per shard — the stock sim never
spent them, so no Stella term ever reached a pacing number — and it trains Aptitude up to the build's own
cap instead of a hard-coded 1,000), APK growth, `earned` policy. The three saves this build wrote are the
fixtures; `before` is the same policy on 3d47df4. Exact pins, plus runaway bands (gold/s 0.5–2×, top
< 20×, bottom 0.25–4× of before).

| day | gold/s before → after | top Fellow before → after | bottom Fellow before → after | Fellows owned |
|---|---|---|---|---|
| 30 | 3,965,436,060 → **4,923,957,499** (1.24×) | 364,195,900 → **2,146,877,316** (5.9×) | 9,519,535 → **16,210,487** | 28 → 16 |
| 90 | 6,913,806,855 → **6,637,997,008** (0.96×) | 443,154,590 → **3,701,223,720** (8.4×) | 20,058,869 → **17,275,670** | 31 → 17 |
| 180 | 8,248,950,146 → **9,285,714,088** (1.13×) | 460,219,606 → **3,909,900,285** (8.5×) | 20,331,834 → **17,618,893** | 31 → 17 |

Decomposed, because the two changes pull opposite ways — the same run with the Aptitude policy held at
1,000 (composition only): day 30 2,311,764,907 / 230,796,106 / 9,050,034; day 90 5,404,947,644 /
257,649,411 / 26,800,807; day 180 6,186,448,810 / 260,261,323 / 27,183,227. **The composition alone takes
income down 22–42% and the top Fellow down 37–43%; the cap then takes the top Fellow up 9–15×.** Direct Skill
Pearl training reaches 31,122 on hero_195 by day 30 (pearls double every 2,500, which is ~4e9 gold for one
Fellow's 31,000 — cheap at billions a second), so the top of the roster is now paced by nothing but the
cap. Village income stays within 0.96–1.24× because the player buys pearls instead of recruits.

Downstream in the same runs: Mine Clearance clears 49–60 guardians a day against 31–36 before (the top
Fellow alone goes deeper); the next stage's price falls (2,976 → 2,523 gold at day 30); the opening
journey still finishes all 63,000 battles by day 180; Northern Odyssey stays saturated at ATK 200;
Trading Post and Frontier are won either way. All three rule-12 decodes of the previous build's 30-, 90-
and 180-day saves are byte-identical and valid (the 30-day one is the committed fixture).

### 9.7 Saves (rule 12)

Power is derived and nothing recomputes a stored Power, so it moves without breaking a save — proven,
not assumed. `tests/power-pacing.test.mjs` decodes a save written by the previous build (3d47df4): 30
simulated days of APK-growth habit play with 28 trained Fellows (to level 515), 491 paid Stella ranks,
29 Mine Clearance receipts and 446 Trading Post runs. It round-trips **byte-identically**, is valid, and
nothing is quarantined. Its last mine receipt stores the Power the old build measured (350,926,067 for
hero_195) against 234,476,657 today, and its last duel 74,575,030 against 57,557,802 — both validators
check the stored value and still accept it; a receipt tampered to overshoot its own stored Power, or a
duel whose `won` contradicts its stored Power, is still refused. The earlier rule-12 fixtures
(`crossover-stella-save-31c3b32-mine.json`, `roster-trim-save-a0efe2b-invested.json` and the familiar
saves) all still pass. No `SAVE_VERSION` bump: nothing required was added; the only bounds that moved
(the Aptitude cap and the ledger's per-key bound) widened.

### 9.8 Owner decisions (rule 9 — batched, each with the recommendation work proceeds on)

1. **The familiar node grid** (PWR-03). Still Everkai-only magnitude, now isolated in parts named
   `familiar`. *Recommendation: re-price its node effects downward in a later slice; never remove an
   activated node or bond.* Nothing was re-priced here.
2. **Star and skill magnitudes stay Everkai's (+5% each).** Only their bucket moved. The original's
   `HeroStar.riseADH` (to 6,000 bp) and `extraAtk` flats (400,000 → 7,500,000) are measured and not
   imported. *Recommendation: import them with their `needHeroLevel` gates as the next Power slice.*
3. **One global Aptitude cap (31,122)** rather than per-hero caps (720–31,122, shipped in the data file).
   *Recommendation: keep one cap; per-hero caps would refuse real saves holding 1,000.*
4. **Default mode keeps its `(80+20·level)/10` column** rather than `HeroLevel.coefficientADH`. It is a
   scale adapter that `ladderPower`'s ×100 already assumes. *Recommendation: leave it; APK growth is the
   parity mode.*
5. **Stella `self | talent`** (PWR-04) is unblocked by the cap and still unimported. *Recommendation:
   import per rank as a `stella` talent part.*
6. **Direct Skill Pearl training now paces the top of the roster by the cap alone** (9.6: the top Fellow
   hits 31,122 Aptitude by day 30 and is 5.9–8.5× the old build's; gold/s moves only 0.96–1.24×). It is an
   Everkai-only faucet — the original has no pearl → Aptitude trade; its talent comes from talent LEVELS,
   each capped. *Recommendation: route pearl training through talent levels (the original's rule), i.e.
   retire direct `aptitude` training or cap it at the old 1,000, and keep the measured 31,122 as the bound
   for everything else. Not done here: it is a faucet decision, and the pacing pins will show it move.*
   **Decided 2026-09-18 (balancing delegated by the owner): capped at the old 1,000. See 9.10.**

### 9.9 Negative controls

Every new guard was broken on purpose and seen to fail on the intended test (scratchpad
`power-rebuild/negctl.py`, restores the file after each): nesting the percent bucket; flats inside the
percent factor; stars back onto Aptitude; Stella's percent as an outer factor again; Stella's percent part
dropped; a familiar flat leaking into a non-familiar part; the default level column drifting; the cap back
to 1,000; the validator's cap bound removed; the ledger bound left at 1,000; a ×1,000 Power scale (the
stored-value bounds test); a new contributor slipping into `powerParts` (the extractor); the mine and
trading-post validators bounding stored Power below what the old build wrote (the rule-12 decode); a
×10 Power runaway and a halved `rosterOperation` divisor (the pacing pins). 16/16 fired.

### 9.10 Decided 2026-09-18: direct Skill Pearl training stops at the old 1,000

The owner delegated balancing; decision 9.8.6 was taken on its recommendation. `PEARL_APTITUDE_CAP` (=
`LEGACY_APTITUDE_CAP`, 1,000) in `lib/aptitude-cap.mjs`: `aptitudeTrainingPlan` fills a Fellow only while it is
below 1,000 -- the rule `main` ships. Every source the original has (talent levels, artifacts, Family, museum,
fishing, Artifact Echo, insight, essences, opening items; Stella talent when imported) keeps the 31,122 bound.
The Fellow panel and the refusal say pearls stop at 1,000 and name where more Aptitude comes from.

**Saves.** A planner limit, not a validator: `validAdventure` and the aptitude ledger still bound at 31,122, so
no stored value is checked against 1,000 and nothing can be refused by it. Measured: a 30-day save from the
live build (`main`@45828d3, now `tests/live-save-45828d3-day30.json.gz`) holds at most 990 pearl Aptitude
(main's cap was 1,000 for every source) and decodes byte-identically, valid, nothing quarantined -- also on the
lazy browser-boot path (9.11); so does a 30-day save from `crossover`@3854d3a. The uncapped build's own saves,
whose pearl ledger holds 31,112 on one Fellow, still decode byte-identically and validate (tested
synthetically in `tests/power-composition.test.mjs`).

**Pacing** (`tests/power-pacing.test.mjs`, re-pinned; scratchpad `sim/sim-pins-pearl.mjs` = sim-pins-cap with
pearls reading the build's `PEARL_APTITUDE_CAP`; APK growth, `earned`):

| day | gold/s: 3d47df4 / uncapped 3854d3a / **now** | top Fellow: 3d47df4 / uncapped / **now** | bottom: 3d47df4 / uncapped / **now** | Fellows |
|---|---|---|---|---|
| 30 | 3,965,436,060 / 4,923,957,499 / **2,311,764,907** | 364,195,900 / 2,146,877,316 / **230,796,106** | 9,519,535 / 16,210,487 / **9,050,034** | 28 / 16 / **25** |
| 90 | 6,913,806,855 / 6,637,997,008 / **5,404,947,644** | 443,154,590 / 3,701,223,720 / **257,649,411** | 20,058,869 / 17,275,670 / **26,800,807** | 31 / 17 / **30** |
| 180 | 8,248,950,146 / 9,285,714,088 / **6,186,448,810** | 460,219,606 / 3,909,900,285 / **260,261,323** | 20,331,834 / 17,618,893 / **27,183,227** | 31 / 17 / **30** |

Every figure equals, to the unit, 9.6's "composition only" run (the sim's Aptitude policy held at 1,000): the
cap does that and nothing else. Against the uncapped build the top Fellow is 0.07-0.11x and gold/s 0.47-0.81x;
against the pre-rebuild build the top is 0.57-0.63x (the additive composition) and gold/s 0.58-0.78x.

**Stage ladder under this Power (with the 6,000-chapter merge).** Opening-journey position, roster Power and
the first boss that Power cannot beat (boss rule: Power > atk), from the same saves under this build:

| day | roster Power | cleared (chapter) | Power wall | chapter 3,000 costs | chapter 4,322 costs | chapter 6,000 costs |
|---|---|---|---|---|---|---|
| 30 | 1,232,035,652 | 14,376 (685) | chapter 3,061 (1,233,000,000) | 9.41e13 gold = 11.3 h of income | 2.98e14 = 35.8 h | 1.24e15 = 149 h |
| 90 | 2,614,510,130 | 41,633 (1,983) | chapter 4,202 (2,619,000,000) | 7.80e13 = 4.0 h | 2.47e14 = 12.7 h | 1.02e15 = 52.7 h |
| 180 | 2,646,564,781 | 61,611 (2,934) | chapter 4,207 (2,650,000,000) | 7.78e13 = 3.5 h | 2.46e14 = 11.0 h | 1.02e15 = 45.9 h |

**Where the sim stalls.** It does not hit a Power wall: roster Power plateaus at ~2.6e9 from day ~75 (every
Fellow at its level cap, Aptitude 1,000), which clears bosses to chapter 4,206. Gold paces it: 480 battles a
day early, ~150 a day by day 180, reaching chapter 2,934 -- it never enters chapters 3,001+ inside 180 days
(the uncapped build reached the old end, 63,000, by day ~160). Walking on to the Power wall at 4,207 costs
2.7e7 seconds of income (~317 days) at day-180 income. Chapter 6,000's boss (5.262e10) is ~20x the plateau.
Pricing formula unchanged (`floor((atk/Power)^0.25 x 10000)` per battle, from `SceneLevelNormalBattle.lua`).

### 9.11 Stage chapters 3,001-6,000 load lazily (iPhone memory)

Measured on the built client in headless Chrome over CDP with iPhone emulation (390x844 @3x, mobile, touch,
iOS Safari UA), JS heap after two forced GCs, 3 runs each: 3,000 chapters bundled 38.9 MB (fresh) / 44.0 MB
(90-day save); 6,000 bundled 70.1 / 74.7 MB (peak before GC 133 / ~165 MB). The 6,000 extension raised every
player's boot heap by ~31 MB (+80%), and no save today is past chapter 3,000. So `lib/campaign-chapters-late-
data.json` (3,001-6,000) is a separate chunk, fetched when a save comes within 100 chapters of 3,000 and
streamed, never precached; the engine stays synchronous (validators bound by `STAGE_COUNT` / `OPENING_COUNT`
from a small index; `STAGES` / `OPENING_STAGES` / `CAMPAIGN` grow in place; an unloaded next stage says "still
loading"). After: 38.9 MB fresh, 44.2 MB with the 90-day save, 72.1 MB once the late chapters are installed.
Main chunk 8,382,274 -> 6,337,076 bytes; precache 82.73 MiB, zero crossover assets. By 9.10's pacing a sim
player first fetches the chunk around day 175. Offline caveat: a player who crosses chapter 2,900 while
offline sees "Loading chapter ..." until one connection (the worker does not runtime-cache streamed files).

