# Isekai research extraction — data index

Read-only survey. Nothing under `~/Documents/Codex` or `~/everkai` was modified.

**Validation:** every row count below was checked twice, by two independently written scanners. A full parse of all 7371 files (no size cap) agrees with this index on **216 of 216** private-server tables. The single disagreement was `Rewards.json`, where a wrapper-assuming streaming counter returned 0 for an 85634-row bare list; the correct value is recorded here. See trap F (bare list vs wrapper) for that bug, and trap G for intermittent read failures in this tree.

Roots surveyed (all under `~/Documents/Codex/2026-09-07/`, written below as `~`):

| Group | Location | Dirs | Files |
|---|---|---|---|
| A | `~/isekai-parallel-*/data/` (direct batch dirs) | 17 | 396 (95 distinct names) |
| B | `~/referenced-chatgpt-conversation-this-is-an/outputs/component-research/datasets/` | 1 | 18 |
| C | other `*/data/` dirs — snapshot/, server-snapshot/, **private-server**, isekai-research | 45 | 3083 (328 distinct names) |
| D | `~/your/work/apk-audit/configs/config/**` (raw APK config dump) | 14 | 3874 |

The two richest single collections sit inside groups C and D and are indexed as **PS** and **LOGIC** below:
`~/your/outputs/private-server/data/` (216 tables, 119MB) and
`~/your/work/apk-audit/configs/config/logic/` (1488 tables + 2361 `split_*` shards).

Two distinct kinds of table live here and they must not be confused:

- **Game config tables** (groups A, C, D) — the original game's own tables, `PascalCase.json`, almost always `{"TableName": [ …rows… ]}` with `_id` as the row key.
- **Translation/extraction datasets** (group B) — flat lists of `{id, en}` rows where the id encodes table+field+row, e.g. `Item:name:3` = item 3 is named Gold.

---

## (a) Quick lookup

### The four collections — which one has what

This is the most important section. The collections are **complementary, not nested**.

| Short name | Path | Files | What it is |
|---|---|---|---|
| **PS** | `~/your/outputs/private-server/data/` | 216 | private server's working copy; the fullest copy of the *runtime* tables |
| **LOGIC** | `~/your/work/apk-audit/configs/config/logic/` | 1488 (+2361 shards) | the original recovered config set; by far the most table *names* |
| **BATCH** | `~/isekai-parallel-*/data/` (17 dirs) | 95 distinct | working subsets copied per task branch |
| **DATASETS** | `…/component-research/datasets/` | 18 | English translation rows, a different kind of file entirely |

1508 distinct table names across all four. Presence patterns:

| Count | PS | LOGIC | BATCH | DATASETS |
|---:|---|---|---|---|
| 1243 | absent | **full** | absent | absent |
| 115 | full | full | absent | absent |
| 81 | full | full | full | absent |
| 35 | absent | *stub* | absent | absent |
| 8 | **full** | absent | absent | absent |
| 8 | absent | absent | absent | **full** |
| 5 | full | full | full | full |
| 3 | absent | full | absent | full |
| 3 | full | absent | full | absent |
| 2 | full | *stub* | full | absent |
| 1 each | (LOGIC+BATCH) · (BATCH only) · (stub+DATASETS) · (PS+BATCH+DATASETS, LOGIC stub) · (stub everywhere: `NavigationScore`) |

**PS vs LOGIC:** 202 tables are byte-identical (same sha256). Only **3** differ — and in all three LOGIC is the empty one.

#### Tables where one collection has the data and another looks empty

Read this before concluding a table is missing.

| Table | PS | LOGIC | Note |
|---|---|---|---|
| `BattleNormal.json` | **240000 rows** (45.9MB) | `{"BattleNormal":{}}` 19B | sharded into `split/` in LOGIC |
| `LevelNormal.json` | **60000 rows** (4.8MB) | `{"LevelNormal":{}}` 18B | sharded into `split/` |
| `LevelBoss.json` | **12000 rows** (5.0MB) | `{"LevelBoss":{}}` 16B | sharded into `split_levelboss/` (60 files) |
| `Rewards.json` | **85634 rows** (37.7MB) | *absent* | sharded into `split_reward/` (540 files) |
| `Dialog.json` | *absent* | `{"Dialog":{}}` 13B | sharded into `split_dialog/` (1691 files) |
| `DemonShop` · `CupLuckyBagLottery` · `PhotoShop` · `TounoLuckyBagLottery` | 24 / 15 / 15 / 15 rows | *absent* | PS-only shop tables |
| `NormalItemShop` · `CupShop` · `TounoShop` | 11 / 4 / 4 rows | *absent* | PS-only |
| `CupLuckyBag` · `DemonShopGrades` · `TounoLuckyBag` | 1 row each | *absent* | PS-only |

14 tables total are full in PS and stub/absent in LOGIC. **The empty `{}` stubs in LOGIC are not data loss** — those tables were split into the `split_*` subdirectories. Use PS for the whole table, or reassemble the shards.

Conversely, **1247 tables exist only in LOGIC**, including `Rule.json` (4357 rows). Largest: `SupplementaryText` 9996, `TowerDefenseCustomerLevel` 9263, `ServerList` 6004, `TowerDefenseStallLevel` 5801, `ExploreMapItemIndex` 5393, `StatueStrengthen` 5005, `DungeonEndlessMap` 4940, `Rule` 4357, `SimGame1DiseaseLevel` 4000, `Npc` 2350.

#### Specific answers to the two questions that cost time

- **`Rule.json`** — absent from PS **and from all 17 BATCH dirs**. It exists only in LOGIC (165847B, 4357 rows, `{"Rule":[…]}`) and in DATASETS (686351B, 4307 `{id,en}` translation rows). These are two different files with the same name.
- **`Wife.json`** — present and **identical (373759B, same sha)** in PS, LOGIC, and 6 of the 17 BATCH dirs. It is **not** empty anywhere. DATASETS has a different, smaller `Wife.json` (80517B, 707 translation rows).
- **No zero-byte JSON exists in any of the four collections.** The "empty" files are stubs with real JSON in them (`{"X":[]}` or `{"X":{}}`), so a size check alone will mislead.

#### Same filename, completely different schema

Six names appear in both DATASETS and PS and mean entirely different things:

| Name | In DATASETS | In PS / LOGIC |
|---|---|---|
| `Item.json` | 13231 rows of `{id, en}` — `Item:name:3` = Gold | 4705 rows of `{_id, rarity, isCurrency, icon, …}` |
| `Hero.json` | 984 `{id, en}` | 388K config table |
| `Wife.json` | 707 `{id, en}` | 373759B config table |
| `SkillBase.json` | 11190 `{id, en}` | 6780 rows `{_id, icon, stars, skillType, …}` |
| `Chapter.json` | 12146 `{id, en}` | 12000 rows `{_id, background, levelNormal, …}` |
| `LevelBoss.json` | 24000 `{id, en}` | 12000 rows `{_id, background, battleType, atk, …}` |

Never assume which one you loaded — check for `id`+`en` (translation) vs `_id` (config table).

### PS — `~/your/outputs/private-server/data/` (216 tables, 119MB)

212 of 216 are `{"TableName": [rows]}` wrappers; **4 are bare top-level lists**; 1 is a stub. No parse errors.

Largest tables:

| Table | Shape | Rows | Row fields |
|---|---|---|---|
| `BattleNormal.json` | wrap `BattleNormal` | 240000 | `_id`, `timelineNameType`, `mushRoomType`, `atk`, `consume`, `stageId` |
| `Rewards.json` | **bare list** | 85634 | `_id`, `randomType`, `content` |
| `SkillLevel.json` | wrap `SkillLevel` | 64813 | `_id`, `skillType`, `level`, `upgradeType`, `consume` |
| `LevelNormal.json` | wrap `LevelNormal` | 60000 | `_id`, `dialogue`, `battle`, `headPortrait` |
| `TaskGeneral.json` | wrap `TaskGeneral` | 25593 | `_id`, `moduleId`, `taskReq`, `taskReward`, `order` |
| `Chapter.json` | wrap `Chapter` | 12000 | `_id`, `background`, `levelNormal`, `levelBoss` |
| `LevelBoss.json` | wrap `LevelBoss` | 12000 | `_id`, `background`, `battleType`, `icon`, `atk` |
| `BPLevel.json` | wrap `BPLevel` | 7050 | `_id`, `BP`, `Level`, `LevelExp`, `Reward_Normal` |
| `SkillBase.json` | wrap `SkillBase` | 6780 | `_id`, `icon`, `iconBg`, `stars`, `skillType` |
| `Item.json` | wrap `Item` | 4705 | `_id`, `rarity`, `isCurrency`, `icon`, `miniIcon` |
| `System.json` | wrap `System` | 2430 | `_id`, `stringValue` |
| `BuildingBusiness.json` | wrap `BuildingBusiness` | 3000 | `_id`, `Cost`, `Power`, `StaffNum` |
| `BuildingBase.json` | wrap `BuildingBase` | 18 | `_id`, `buildingType`, `order`, `cityLandId`, `consume` |
| `Vip.json` | wrap `Vip` | 13 | `_id`, `pointsNeed`, `DateFertility`, `twins` |

The 4 bare lists (no wrapper — `json.load()` returns a list): `Rewards.json` (85634), `PhotoShop.json` (15), `TounoLuckyBagLottery.json` (15), `NormalItemShop.json` (11), plus `TounoLuckyBag.json` (1). Stub: `NavigationScore.json` = `{"NavigationScore":[]}`.

### A — the 17 batch dirs `~/isekai-parallel-*/data/` (396 files, 95 distinct tables)

**Every one of the 95 tables is byte-identical across all dirs that carry it** (0 of 95 have more than one sha256). **93 of the 95 are also byte-identical to the private-server copy**, so their shape, row count and fields are exactly as listed in the PS section — a batch dir is a *subset* of PS, never a different version. Only 2 tables are not in PS:

| Table | Shape | Rows | Fields |
|---|---|---|---|
| `CeremonyGift.json` | wrap `CeremonyGift` | 8 | `_id`, `basicReward`, `basicEnrages`, `npcGift` |
| `CeremonyGuestRewards.json` | **bare list** | 8 | `_id`, `randomType`, `content` |

Files per dir: photo-event 55 · roaming 51 · roaming-prefix 51 · twin-school 51 · inn-batch 36 · world-tree 21 · outfit-passive 18 · touno 14 · artifacts-batch 13 · demonslayer-combat 13 · fountain 12 · photo-shop 12 · progression-batch 11 · adventure-completion 10 · banquet-batch 10 · photo-batch-review 10 · destined 8.

Table -> how many of the 17 dirs carry it -> rows:

| Table | Dirs | Rows | Table | Dirs | Rows |
|---|---|---|---|---|---|
| `Hero` | 17/17 | 181 | `LevelNormal` | 7/17 | 60000 |
| `HeroLevel` | 17/17 | 1000 | `StageEvent` | 7/17 | 143 |
| `HeroQuality` | 17/17 | 14 | `Equipment` | 6/17 | 99 |
| `Item` | 17/17 | 4705 | `EquipmentLevel` | 6/17 | 1000 |
| `Rewards` | 17/17 | **85634** | `EquipmentQuenching` | 6/17 | 25 |
| `System` | 10/17 | 2430 | `EquipmentQuenchingConsume` | 6/17 | 2000 |
| `SkillBase` | 8/17 | 6780 | `Level` | 6/17 | 70 |
| `SkillLevel` | 8/17 | 64813 | `SystemUnlock` | 6/17 | 201 |
| `TaskGeneral` | 8/17 | 25593 | `Wife` | 6/17 | 151 |
| `BattleNormal` | 7/17 | 240000 | `WifeBless` | 6/17 | 798 |
| `Chapter` | 7/17 | 12000 | `WifeQuenchingConsume` | 6/17 | 1180 |
| `LevelBoss` | 7/17 | 12000 | `WifeQuenchingWight` | 6/17 | 25 |
| `BuildingBase` | 5/17 | 18 | `WifeSkill` | 6/17 | 700 |
| `BuildingLevel` | 5/17 | 57 | `BuildingBusiness` | 4/17 | 3000 |
| `BuildingQuality` | 5/17 | 469 | `FactionPlace` | 4/17 | 5 |
| `CityAssignEvent` | 5/17 | 32 | `FindWifeBar` | 4/17 | 6 |
| `CityBank` | 5/17 | 200 | `WifeQuenchingUnlock` | 4/17 | 36 |
| `CityLand` | 5/17 | 21 | `SimGame1Collection` | 4/17 | 12 |
| `Country` | 5/17 | 5 | `SimGame1CollectionLevel` | 4/17 | 3 |
| `Faction` | 5/17 | 11 | `PhotoEvent` | 3/17 | 17 |
| `FactionProfession` | 5/17 | 80 | `PhotoGacha` | 3/17 | 2664 |
| `Medicine` | 5/17 | 20 | `PhotoGachaPool` | 3/17 | 136 |
| `MedicineTask` | 5/17 | 40 | `PhotoTheme` | 3/17 | 16 |
| `NormalItemShop` | 5/17 | 11 | `Vip` | 5/17 | 13 |
| `SimGame1Food` | 5/17 | 80 | `SimGame1FoodLevel` | 5/17 | 4000 |
| `SimGame1Guest` | 5/17 | 44 | `SimGame1Kitchenware` | 5/17 | 10 |
| `SimGame1KitchenwareLevel` | 5/17 | 300 | `SimGame1Level` | 5/17 | 21 |
| `SimGame1NewTask` | 5/17 | 583 | | | |

Carried by exactly one dir (task-specific): `BaseLottery` 12 · `BaseLotteryExchange` 16 · `BreachLevel` 381 · `CGImage` 11 · `Ceremony` 6 · `CeremonyGift` 8 · `CeremonyGuestRewards` 8 · `DrakenbergLevel` 2320 · `ECSRebornStampGroup` 10 · `ESCRebornBoothLevel` 208 · `ESCRebornConfig` 13 · `ESCRebornEvent_BoothNormal` 52 · `ESCRebornEvent_BoothSpecial` 39 · `ESCRebornLevel` 195 · `ESCRebornStamp` 20 · `PhotoShop` 15 · `WifeClothes` 111 · `WifeTarget` 10 · the 13 `Navigation*` tables (`NavigationScore` is an empty stub, 0 rows) · the 7 `ThreeMatchBattle*`/`ThreeMatchMember` tables.

### C — the 45 nested `*/data/` dirs (328 distinct names)

Snapshot copies (`snapshot/`, `server-snapshot/`, `qa/*/`) of the same table set, plus the two richest collections. File counts:

`your/outputs/private-server/data` **216** · legendary-composed 121 · pet-puzzle 121 · pet-tasks 121 · ranking-rush 101 · shinobu-emblems 101 · rissette-funds 99 · demonslayer-gifts 95 · shinobu-advanced 95 · shinobu-forms 92 · hosted 90 · demonslayer-acquisition 83 · demonslayer-kernel 77 · funds 71 · free-purchases 68 · photo-tasks 64 · ceremony-mail 62 · optional-boxes 62 · qa/photo-rewards-snapshot 62 · medicine-batch 58 · photo-cameras 56 · photo-event/server-snapshot 55 · photo-event/activation-server-snapshot 55 · qa/photo-snapshot 55 · `isekai-research/data` **96** · thirteen 51-file snapshots (n7, qa/{childgain,current-main,cycle,date-fixed,fame,n7,prefix,snapshot,twins}, roaming-cycle, roaming/server-snapshot, roaming-prefix/server-snapshot, twin-school/server-snapshot) · demon-pass 21 · demon-commerce 18 · qa/demon-commerce-snapshot 18 · benefits 12 · startup/backup-audit-snapshot 5.

For any table in these dirs, use the PS entry for shape and row count — the snapshots are copies, and the sha check across the batch dirs found zero divergence.

### B — `outputs/component-research/datasets/` (18 files)

The English-translation and character datasets the repo importers actually read.

| Table | Shape | Rows | Representative row fields |
|---|---|---|---|
| `Item.json` | list | 13231 | `id`, `en` — e.g. `Item:description:1` |
| `Dialog.json` | list | 91159 | `id`, `en` |
| `LevelBoss.json` | list | 24000 | `id`, `en` |
| `Chapter.json` | list | 12146 | `id`, `en` |
| `SkillBase.json` | list | 11190 | `id`, `en` |
| `Rule.json` | list | 4307 | `id`, `en` |
| `TaskName.json` | list | 1247 | `id`, `en` |
| `Hero.json` | list | 984 | `id`, `en` |
| `Wife.json` | list | 707 | `id`, `en` |
| `HeroTalent.json` | list | 12 | `id`, `en` |
| `core-rules.json` | list | 67 | `id`, `en` (subset of Rule) |
| `characters.json` | list | 324 | `source_id`, `fields{…}` — nested, not flat |
| `asset-readability-index.json` | list | 15252 | `apk`, `path`, `size`, `format` |
| `formula-candidates.json` | list | 122 | `source`, `key`, `text` |
| `verified-formula-specs.json` | list | 4 | `id`, `expression`, `source`, `missing` |
| `category-index.json` | **dict** | 586 | name -> int count. No rows at all. |
| `earnings-and-familiar-ui.json` | **dict-keyed** | 31 | UI key -> `{ui, cn, en, …}` (13-15 locale keys) |
| `extraction-results.json` | **dict** | 10 | scalar counters only (`translation_rows`: 239580) |

Sha256 (first 16) for the load-bearing ones:
`Item.json` 6b30d6444e4eaaa7 · `Rule.json` 62716857e5cf0f36 · `Hero.json` 3c66ace4184f87aa ·
`Wife.json` 0608147f0f63d22a · `SkillBase.json` 9c5c2d7a3b0355a7 · `Dialog.json` 49f8cd9c5468ea1c ·
`characters.json` 5800c516a1b127be · `core-rules.json` 2f713be7cc994337

### D — `~/your/work/apk-audit/configs/config/` (3874 files, 3858 distinct names)

The complete raw config dump: 1491 top-level tables plus 2361 pre-split shards.

| Subdir | Files | Notes |
|---|---|---|
| `config/` | 3 | incl. `lang.json` |
| `config/guide/` | 16 | |
| `config/logic/` | 1488 | the main table set |
| `config/logic/{de,en,es,fr,pt,ru}/` | 1 each | `translate.json` per language |
| `config/logic/split_dialog/` | 1691 | dialog shards |
| `config/logic/split_reward/` | 540 | reward shards |
| `config/logic/split/` | 60 | |
| `config/logic/split_levelboss/` | 60 | |
| `config/logic/split_systemdays/` | 10 | |

Shape census: 2378 plain lists, 1478 single-key wrappers, 8 plain dicts, 10 too large to parse in one pass (row-counted by streaming instead).

Largest tables (streamed row counts):

| File | Rows | Wrap key | Row fields |
|---|---|---|---|
| `logic/en/translate.json` | 239580 | `translate` | `id`, `en` |
| `logic/ru/translate.json` | 232735 | `translate` | `id`, `ru` |
| `logic/fr/translate.json` | 232489 | `translate` | `id`, `fr` |
| `logic/de/translate.json` | 232457 | `translate` | `id`, `de` |
| `logic/es/translate.json` | 232444 | `translate` | `id`, `es` |
| `logic/pt/translate.json` | 232407 | `translate` | `id`, `pt` |
| `logic/SkillLevel.json` | 64813 | `SkillLevel` | `_id`, `skillType`, `level`, `upgradeType`, `consume` |
| `logic/TaskGeneral.json` | 25593 | `TaskGeneral` | `_id`, `moduleId`, `taskReq`, `taskReward`, `order` |
| `lang.json` | 19623 | *(none — keyed dict)* | UI key -> locale dict |
| `logic/RSHeatLevel.json` | 1800 | `RSHeatLevel` | `_id`, `generalActivityId`, `heatLevel`, `heatGauge` |

`logic/en/translate.json` (239580 rows) is the superset the group-B `datasets/*.json` files were cut from — `extraction-results.json` reports exactly `translation_rows: 239580`.

Other notable `config/logic/` tables by size: `Chapter` 12000, `SupplementaryText` 9996, `TowerDefenseCustomerLevel` 9263, `BPLevel` 7050, `SkillBase` 6780, `CommonGachaCeilingReward` 5836, `ExploreMapItemIndex` 5393, `Item` 4705, `Rule` 4357, `BuildingBusiness` 3000, `HeroSpirit` 3266, `WifeSpirit` 2109, `PetTowerArray` 1480.

`allConfNames.json` (list, 1445 entries) is the manifest of table names in this dump — the fastest way to check whether a table exists before searching.

---

## (b) Repo cross-reference (`~/everkai`, read-only)

98 files in `lib/`, 70 importers in `scripts/`. **70 of 98 lib tables have a producing importer; 28 do not.**

### Importers and the extraction files they read

Source roots referenced by the importers:

- **WS** = `~/referenced-chatgpt-conversation-this-is-an/` — reached as `parents[1].parent.parent`
- **WSW** = `WS/work/` — reached as `parents[1].parent`
- absolute paths to `~/Desktop/ISEKAI/*.apk` and `~/Documents/Codex/2026-09-08/isekai-source-research/`

| Importer | Produces `lib/` | Reads |
|---|---|---|
| import-acquaintances | acquaintance-recruits | WS datasets `Hero.json`,`Wife.json` + wiki; lib/character-skill-guide |
| import-apothecary | apothecary-data | WS `datasets/Rule.json`, wiki/apothecary |
| import-artifact-echo | artifact-echo-data | WS datasets `SkillBase.json`,`Hero.json`; lib/artifact-rules |
| import-artifact-support | artifact-support-data | WS datasets `SkillBase.json`,`Wife.json`; wiki/artifacts |
| import-banquets | banquet-data | WS `datasets/Rule.json`,`datasets/Item.json` |
| import-businesses | business-data | `text/c884ee22dfd491ce.bin` + **`~/isekai-parallel-roaming/data/BuildingBase.json`** (absolute) |
| import-elixirs / import-tonic | elixir-data / tonic-data | WS `datasets/Item.json` |
| import-expanded-artifacts | artifact-rules, expanded-gear | WS `datasets/Item.json`, online-audit wiki |
| import-expo / import-expo-bonds | expo-data / expo-bond-data | wiki/expo; WS datasets `SkillBase.json`,`Hero.json` |
| import-farm / import-farm-trade / import-workshop | farm-data / farm-trade-data / workshop-data | `outputs/component-research/text/c884ee22dfd491ce.bin` |
| import-farm-levels | farm-level-data, inn-gate-inventory | online-audit wiki |
| import-fishing / -combinations / -art | fishing-inventory, fishing-species / fishing-combination-data / fishing-art-data | wiki; `~/Desktop/ISEKAI/*.apk` |
| import-inn / import-inn-guests | inn-data / inn-guest-data | wiki/inn; WS `datasets/Rule.json`,`Hero.json` |
| import-museum | museum-data, museum-rule-evidence | WS `datasets/Item.json`,`Rule.json`, wiki manifest |
| import-raphael-progress / import-public-mechanics | raphael-progress-data / raphael-data, artifact-rules | wiki; WS `datasets/Item.json` |
| import-stella | stella-data | WS datasets `Item.json`,`Hero.json`; wiki/fellows |
| import-trading-post | trading-post-data | WS `datasets/Rule.json`,`Item.json` |
| import-treasure-hunt | treasure-data, treasure-rule-evidence | wiki/treasure-hunt; WS `datasets/Rule.json` |
| import-familiars/-skills/-status/-modifiers/-nodes/-inventory/-support | familiar-*.json | online-audit wiki + `wiki_manifest.json` |
| import-character-skills | character-skill-guide, character-skill-inventory | online-audit wiki |
| import-graduation-bonds, import-public-roster | graduation-bonds, public-roster | online-audit wiki |
| import-fountain | fountain-data | WS `datasets/Rule.json`,`Item.json`; lib/acquaintance-recruits |
| import-forge-rewards | forge-reward-data | WS `datasets/Item.json`; lib/artifact-rules, lib/raphael-progress-data |
| import-default-talent, -employee-yields, -original-blessings, -special-blessings | *(plain `shutil.copyfile`)* | `WSW/isekai-research/notes/*.json` |
| import-original-progression, -training-costs, -mine-clearance, -insight-advancement, -familiar-passives, -wardrobe | original-progression-data, original-training-costs, mine-clearance-data, insight-data, familiar-passive-data, wardrobe-data | `WSW/isekai-research/notes|independent/*.json` |
| import-humanized-bulk / -pair | humanized-static-data | `WSW/isekai-research/...`; `Codex/2026-09-08/isekai-source-research/` |
| import-opening / -opening-presentation | opening-data / opening-presentation-data | `Codex/2026-09-08/isekai-source-research/outputs/*.json` |
| import-drakenberg-art, -facility-scenes, -village-map | drakenberg-art-data, facility-scene-data, village-map-data | `~/Desktop/ISEKAI/UnityDataAssetPack.apk` |
| import-achievement-ui, -ui-sprites, -inventory-icons, -scene-ui, -wardrobe-art, -character-idle | achievement-ui-data, ui-sprite-data + ui-chrome-evidence, inventory-icon-data + -exceptions, stage-scene-data, wardrobe-assets, character-idle-data | **argv** — an index/manifest path passed on the command line, pinned by `--sha256` |
| import-original-content, import-original-scenes | *(`.mjs`, not JSON)* | WS `datasets/` |

### Flag 1 — every workspace-relative source path is broken at the repo's current location

The importers compute their source root as `Path(__file__).resolve().parents[1]` then `.parent.parent`. With the repo at `/Users/westmanfamily/everkai`, that resolves to **`/Users/`**, so every `outputs/component-research/...` and `outputs/online-audit/...` path resolves to `/Users/outputs/...`, which does not exist. Same for `.parent` -> `/Users/westmanfamily/isekai-research/...`.

These paths only resolve if the repo sits at `~/Documents/Codex/2026-09-07/referenced-chatgpt-conversation-this-is-an/work/everkai` — and that directory does exist, with its own `lib/` (85 json). So the importers are written for the in-workspace copy, not for `~/everkai`. Roughly 50 of the 70 importers cannot run in place as written.

Paths that *do* resolve today: the three `~/Desktop/ISEKAI/*.apk` importers, the two `Codex/2026-09-08/isekai-source-research` importers, and `import-businesses`' absolute `isekai-parallel-roaming/data/BuildingBase.json`.

### Flag 2 — `lib/*.json` with no producing importer (28)

Never written by any `import-*.py`:

`adventure-rule-evidence`, `artifact-investment-evidence`, `content-overrides`, `drakenberg-layout`, `familiar-trigger-data`, `family-rule-evidence`, `farm-order-policy`, `fishing-data`, `hire-card-data`, `inn-progression-data`, `item-art-evidence`, `kohaku-crown-data`, `northern-data`, `operation-data`, `pupil-rule-evidence`, `source-character-index`, `starter-habits`, `stella-activation-policy`, `system-maturity`, `village-layout`, `workshop-policy-data`

Read or asserted by an importer but still not produced by one:

| File | Importer that touches it |
|---|---|
| `familiar-crit-data.json` | import-critical-actives (reads + asserts only) |
| `familiar-dot-data.json` | import-five-actives (reads + asserts only) |
| `medicine-recipe-data.json` | import-medicine-recipes (verifier: `assert json.loads(...)==data`) |
| `staffing-data.json` | import-staffing (verifier: `assert read_text()==expected`) |
| `staffing-independent-data.json` | import-staffing (verifier: byte-compare against notes) |
| `inventory-display-data.json` | import-inventory-icons (input, hand-maintained) |
| `roster-batch-evidence.json` | import-family-scenes (input) |

The four `*-actives` / `medicine` / `staffing` scripts are **verifiers, not generators** — they re-check a hand-curated `lib/` file against evidence and fail loudly on drift. Treat those five tables as source-of-truth-by-hand.

### Flag 3 — importer writing a file that is not in `lib/`

`import-family-scenes.py` writes `lib/family-scene-data.json`, which does not exist on disk. Its handoff source `Documents/Codex/2026-09-07/files-pasted-by-the-user-paste/outputs/roster-humanization` is referenced via `Path.home()/...` and its `backgrounds/manifest.json` and `backgrounds/provenance/loaders.json` do not resolve. This importer has never successfully run, or its output was removed.

`starter-habits.json` (78 rows, `tasks` wrapper) is the private personal-task data — no importer, and it should stay out of any public repo.

---

## (c) Traps — files whose shape is surprising

Verified by loading each file; do not infer shape from a filename.

**Confirmed from the prompt, plus the exact detail:**

1. `datasets/Item.json` — a **flat list of 13231 `{id, en}` translation rows**, not an item table. The id encodes the field: `Item:name:3` -> item 3 is named Gold, `Item:description:1` -> its description. To look an item up you build `{r['id']: r['en']}` and query by composed key. Same for `Rule`, `Hero`, `Wife`, `SkillBase`, `Dialog`, `Chapter`, `LevelBoss`, `TaskName`, `HeroTalent`.
2. `BuildingBase.json` — `{"BuildingBase": [18 rows]}`. Rows keyed `_id` (`Building_Bank`), costs under `consume: [{id, count}]` where item id `3` is Gold.
3. `Vip.json` — `{"Vip": [13 rows]}`. A single-key dict whose one value is the row list; rows have `_id`, `pointsNeed`, `DateFertility`, `twins`.
4. `artifact-rules.json` (repo `lib/`) — wraps under `records`, but **`records` is a dict of 84 keyed by id, not a list.** `len(d['records'])` works; `d['records'][0]` raises.
5. `public-roster.json` (repo `lib/`) — keyed, not listed: `records` is a **dict of 281** keyed by character id. Top level is `{snapshot, generatedAt, versionMatch, records}`.

**Additional traps found in the datasets folder:**

6. `category-index.json` — a plain dict of 586 `name -> int`. No rows; it is a census of the config dump.
7. `earnings-and-familiar-ui.json` — dict of 31 UI keys, each mapping to a 13-15 key locale dict (`ui`, `cn`, `en`, …). Values are localized strings, not rows.
8. `extraction-results.json` — 10 scalar counters only. Useful as a checksum (`translation_rows: 239580`), useless as a table.
9. `characters.json` — list of 324, but each row nests its real content under `fields{}` (`source_id` + `fields.cv`, `fields.introduce`, …). Not flat like the other list files.

**Cross-collection traps (the expensive ones):**

A. **A short table is usually a shard stub, not missing data.** `config/logic/BattleNormal.json` is 19 bytes of `{"BattleNormal":{}}`; the real table is 240000 rows in `private-server/data/`, and LOGIC's copy was split into `split/`. Same for `LevelNormal` (60000), `LevelBoss` (12000, `split_levelboss/`), `Dialog` (`split_dialog/`, 1691 shards), `Reward` (`split_reward/`, 540 shards), `SystemDays` (`split_systemdays/`). Always check the other collection *and* the `split_*` dirs before concluding a table is empty.

B. **The documented example of this failure:** `lib/opening-data.json` carries 4 `BuildingBase` rows because its source packet is scoped to the opening chapter. The real `BuildingBase` table has **18** rows and lives in `private-server/data/`, `config/logic/`, and the batch dirs (all byte-identical, 12437B). `import-businesses.py` is aware of this and reads the 18-row table by absolute path, noting the campaign packet "carries only the four opening-chapter buildings."

C. **Same filename, different schema across collections.** `Item.json`, `Hero.json`, `Wife.json`, `SkillBase.json`, `Chapter.json`, `LevelBoss.json` exist in both DATASETS (flat `{id, en}` translation rows) and PS/LOGIC (real config tables keyed `_id`). Detect by field name: `id`+`en` = translation, `_id` = config.

D. **Empty never means zero bytes here.** No zero-byte JSON exists in any of the four collections; "empty" tables are `{"X":[]}` or `{"X":{}}` (13-30 bytes). A `size == 0` check finds nothing; use a row count.

E. **`Rule.json` is not in private-server or in any of the 17 batch dirs** — only LOGIC (4357 config rows) and DATASETS (4307 translation rows). Several repo importers depend on the DATASETS one.

F. **Bare list vs wrapper is not predictable from size or location.** In private-server, 212 of 216 files are `{"Name":[…]}` but `Rewards.json` (37MB), `PhotoShop`, `NormalItemShop`, `TounoLuckyBagLottery` and `TounoLuckyBag` are bare top-level lists. A row counter that assumes the wrapper returns **0** for `Rewards.json` — during this survey that exact bug reported "0 rows" for an 85634-row table.

**Traps in the APK config dump (group D):**

10. The dominant shape is the **single-key wrapper**: `{"TableName": [ …rows… ]}` — 1478 of 3874 files. The wrap key always equals the filename stem. Rows use `_id`, not `id`.
11. But 2378 files are **plain lists with no wrapper** — mostly the `split_*` shards. Check before unwrapping.
12. `lang.json` (15MB) is a **keyed dict of 19623 UI keys**, not a wrapper and not a list.
13. Ten files exceed 6MB and will blow up a naive whole-file parse in a loop; the six `translate.json` files are 21-29MB / ~232k rows each. Stream them or parse one per process. *(A whole-directory scan that `json.loads`-ed these died silently mid-run during this survey.)*

**Operational note — reads are slow, not broken:**

G. **Reads here fail intermittently under load.** A full-tree scan of all 7371 files hit exactly one failure: `isekai-parallel-legendary/snapshot/data/EquipmentQuality.json` -> `[Errno 89] Operation canceled`. That same file reads fine on a later unhurried attempt (29376 bytes, 3.3s), so it is **not corrupt** — ECANCELED here means the storage layer cancelled a read while several scans competed for I/O. Retry once before believing any read error from this tree.

H. Files under `~/Documents/Codex` can take **1.5-3.5 seconds for a first read** even when small (measured: `EquipmentQuality.json` 29KB in 3.3s, `Title.json` 364KB in 2.4s) — consistent with cloud-backed/cold storage. A whole-tree scan that parses every copy appears to hang: during this survey one stalled for 5+ minutes at 0% CPU inside `isekai-parallel-legendary/snapshot/data/`. With a 30-second-per-file budget, **all 119 files in that directory read fine and 0 were genuinely blocked** — nothing is corrupt. Two consequences: don't set short I/O timeouts (a 2s limit falsely flagged 33 of 119 files), and hash first / parse once per unique sha rather than parsing every duplicate.

**Traps in the repo's own `lib/` (relevant when diffing extraction against shipped data):**

14. Top-level keyed dicts — ids are keys, there is no row list: `achievement-ui-data` (7), `character-idle-data` (509), `graduation-bonds` (38), `inventory-display-data` (108), `inventory-icon-data` (101), `item-art-evidence` (10), `ui-sprite-data` (18).
15. Wrapper key present but its value is a **dict**, not a list: `artifact-rules.records` (84), `familiar-node-data.records` (71), `public-roster.records` (281), `original-blessing-data.rows` (700), `special-blessing-data.rows` (700).
16. Several `lib/` files wrap rows under a name other than `records`: `skills` (familiar-*), `profiles` (character-skill-*, familiar-skill-inventory, stella-data), `plants` (farm-*), `pets` (familiar-data), `costumes` (wardrobe-data), `relics` (treasure-data), `recipes` (medicine-recipe-data), `gates` (inn-gate-inventory), `milestones` (raphael-progress-data), `tasks` (starter-habits), `bands` (staffing-data), `stages` (expo-data).
17. Plain top-level lists (no wrapper at all): `expanded-gear` (44), `family-gallery-data` (175), `humanized-static-data` (259), `inventory-icon-exceptions` (7), `roster-batch-evidence` (266), `source-character-index` (299), `ui-chrome-evidence` (3), `wardrobe-assets` (257).
