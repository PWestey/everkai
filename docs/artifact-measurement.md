# F12 · What the original's artifacts actually are

**Measurement only.** Nothing was built from this. It exists because catalogue row **F12** cannot be
sized from its own title: it reads *"Artifacts: type/skills, reforge, awaken, Materia, combos"*, and
that row's own 2026-09-15 correction records that **"Materia", "Reforge" and "Awaken" are
Everkai-local names with no such table in the config set.** So nobody knew what F12's remainder was.

**Rule 2 positive control, run before every absence claim below:** the config directory returns
`Wife 33` files. It came back correct.

## The tables

| Table | Rows | What it holds |
| --- | ---: | --- |
| `Equipment` | **99** | the artifacts themselves |
| `EquipmentQuality` | 202 | the quality ladder, 101 rungs each for `Normal` and `CoopBoss` |
| `EquipmentSkillLink` | 59 | links an artifact's hero skill to a second, linked skill — **this is "combos"** |
| `EquipmentSkill` | 20 | the skill-slot ladder: `riseADH`, `maxLevel`, `consume` |
| `EquipmentQuenching` | 25 | quenching weights — already measured in full as **F12-03** |
| `EquipmentSmelt` | 5 | smelt rewards |
| `EquipmentBond` | 1 | a single artifact bond group |
| `Equipment_EX` | 2 | per-region upgrade stages |

## What Everkai has, and what it does not

Everkai's `lib/artifact-rules.json` carries **89 wiki-sourced records** with exactly seven fields:
`initial`, `perLevel`, `ore`, `recycle`, `rarity`, plus two provenance fields. That is the **Aptitude
ladder and nothing else** — and it is not from the original's table at all.

Measured against `Equipment`'s 99 rows, sparse-column aware:

| In the original | Rows carrying it | In Everkai |
| --- | ---: | --- |
| `initialTalent` / `riseTalent` (the Aptitude ladder) | 99 | **yes**, as `initial` / `perLevel` — but wiki-sourced, not imported |
| `heroSkill` — an artifact that grants its wearer a Fellow skill | **53** | **no** |
| `EquipmentSkillLink` — that skill's linked partner | 59 links | **no** — this is what "combos" means |
| `haloSkill` — an artifact that broadcasts | 7 | **no** |
| `equipmentBondSkill` | 4 | **no** |
| `isMythic` + `mythicId` / `mythicItem` / `removeReward` | 4 | **no** |
| `qualityUpTyp` + `consume` + `emblem` — the quality ladder | 78 | **no** |
| `quenchingSlotSetInitial` / `…Quality` | 99 / 85 | **no** — F12-03, measured, blocked on a balance call |
| `levelMax` | 99, **all 200** | Everkai caps elsewhere |
| `levelupConsume`, `smeltReward` | 99 | partially — `ore` / `recycle` are local values |

**`initialATK` / `initialDEF` / `initialHP` and their `rise*` partners exist as columns on all 99 rows
and are ZERO on every one.** An artifact grants Aptitude and skills, never flat combat stats — which
means Everkai's Aptitude-only model is the right *shape*, and what it is missing is the skill half.

## What F12 actually is, restated

Three separate pieces, in the order they are worth doing:

1. **`heroSkill` on 53 artifacts, plus the 59 `EquipmentSkillLink` partners.** This is both "type/
   skills" and "combos" in the row's title, and it is the whole decision-relevant layer: which
   artifact you equip changes what your Fellow can *do*, not just their Aptitude. It needs
   `SkillBase` resolution, which four Everkai importers already do.
2. **The quality ladder** — `EquipmentQuality`'s 101 `Normal` rungs with `qualityUpTyp`, `consume`
   and `emblem` on 78 artifacts. A second upgrade axis beside level.
3. **Mythic (4 rows) and halo (7 rows)** — small, and probably last.

"Reforge", "Awaken" and "Materia" correspond to **nothing** in the config set and should be struck
from the row's title; the closest real mechanics are the quality ladder and quenching.

**Re-importing the Aptitude ladder from `Equipment` rather than the wiki is a fourth, independent
win** — 89 community records replaced by 99 measured ones, with the 10 Everkai lacks named.

## Rule 12, for whoever builds it

`artifactBonus` is a `talent` contributor in `powerParts`, and `validArtifacts` bounds what a save
stores. Adding a skill layer raises Power, which is the safe direction for every gate that compares
`>=`. Re-importing `initial`/`perLevel` from the original may move values in **either** direction,
because the current ones are wiki figures — that half needs the old-save decode check before it ships.
