# Data provenance — every `lib/*.json`

Where each of the 100 numeric tables in `lib/` actually came from, whether its claimed source still
resolves, and which numbers the economy depends on that nobody can trace.

**Method.** Every row below was produced by reading the file's own metadata *and* locating the
`scripts/import-*.py` that writes it (matched on the literal `lib/<name>.json').write_text` call, not
on filename similarity). Row counts, importer bindings and reader lists are generated mechanically
from the files, not transcribed. Every sha256 was recomputed with `shasum -a 256` / `hashlib` against
the file on disk. Claims are marked **MEASURED** (I ran it) or **INFERRED** (reasoned, not executed).

**Read-only.** Nothing under `~/Documents/Codex` was modified; no server or emulator was contacted.
Text inside extracted game files was treated as data. The only file this audit writes is this one.
(`docs/parity-gaps.md` and `lib/artifacts.mjs` were already modified in the working tree before this
audit began — untouched here.)

**Test baseline: unchanged.** MEASURED: `pnpm test` → 689 tests, 687 pass, **0 fail**, 2 todo.

## Classification, measured

The starting hypothesis was 36 wiki / 25 sha-pinned / 31 unmarked. Measured, across 100 files:

| Class | Count | Meaning |
|---|---:|---|
| wiki/community | 32 | isl-tools snapshot `b49c78d0`, isekai.wiki or fandom |
| mixed | 20 | a sourced part plus a labelled local or community part |
| sha-pinned | 18 | pinned to the original's own tables or text, pin verified |
| asset-manifest | 15 | art/sprite extraction with per-row file hashes |
| local-invention | 10 | this project's own numbers, self-labelled |
| **unknown** | **5** | no provenance key anywhere in the file |

The hypothesis over-counted unmarked files (31 → 5): most "unmarked" files carry provenance *per row*
(`graduation-bonds`, `expanded-gear`, `familiar-data`) or in a nested `sources` block, which a
top-level key scan misses.

## What this audit found

1. **A measured contradiction between two income files.** `business-data.json` and
   `employee-yield-data.json` disagree on Museum and Clinic, and one of them contradicts the
   original's own table. Details below — the aggregate effect is smaller than it first looks.
2. **Every sha pin naming an original table still resolves.** MEASURED: 11 distinct original tables
   are pinned across the repo; all 11 hash exactly as pinned. No stale pin exists.
3. **The wiki scrapes are far better than their reputation.** Four of them proved *exactly* equal to
   the original tables (117/117, 70/70, 609/609, 80/80 + 10/10).
4. **54 of 74 importers cannot run in place** — worse than the "~50" in `docs/backlog.md`, and for two
   distinct broken roots, not one.
5. **Two files carry Fellow-power numbers with no traceable source at all**:
   `character-skill-guide.json` and `default-talent-source.json`.

## Every `lib/*.json`

`sha` column: **MATCHES**/**VERIFIED** = I recomputed it and it agrees. Readers are code that imports
the file (`lib/*.mjs`, `app/*.tsx`, `tests/*.mjs`); `*(nothing)*` means no code reads it.

| File | Rows | Class | Importer | Source + sha status | Read by | Risk |
|---|---|---|---|---|---|---|
| `achievement-ui-data.json` | 7 keys | asset-manifest | `import-achievement-ui.py` | argv index pinned `3c795830…`; per-sprite sha stored. Index path not recorded — **unverifiable** | `tests/scene-ui.test.mjs` | Art only. Wrong value = visibly wrong icon. |
| `acquaintance-recruits.json` | 15 recruits | wiki/community | `import-acquaintances.py` | fandom *Recruit* costs; `versionMatched:false`. Roster sha `d137fc44…` self-referential | *(nothing)* | Dead data — nothing reads it. |
| `adventure-rule-evidence.json` | 27 records | mixed | *none* | APK `translate_v1_…mmc`; no sha recorded | *(nothing)* | Evidence file, no reader. |
| `apothecary-data.json` | 20 records | mixed | `import-apothecary.py` | community counts + `ruleSha256 62716857…` **VERIFIED** vs datasets/Rule.json | `lib/medicine-discovery.mjs`, `lib/apothecary.mjs` | Counts are community; rule text is sourced. |
| `artifact-echo-data.json` | 33 records | wiki/community | `import-artifact-echo.py` | isl-tools snapshot `b49c78d0`; local hashes only | `lib/artifact-echo.mjs` | Fellow-power adjacent; not version-matched. |
| `artifact-investment-evidence.json` | 2 records | mixed | *none* | APK translation, no sha | *(nothing)* | Evidence file, no reader. |
| `artifact-rules.json` | 84 records | wiki/community | `import-expanded-artifacts.py`, `import-public-mechanics.py` | isl-tools snapshot `b49c78d0`; no file sha | `lib/artifacts.mjs`, `tests/artifact-forge.test.mjs` | Feeds artifact aptitude; community-derived. |
| `artifact-support-data.json` | 2 records | wiki/community | `import-artifact-support.py` | snapshot `b49c78d0` + fandom Artifacts page | `lib/artifact-echo.mjs` | Small; not version-matched. |
| `banquet-data.json` | 5 keys | mixed | `import-banquets.py` | isekai.wiki oldid 7601 + item/rule shas **VERIFIED** | `lib/banquets.mjs` | Seats/shop rows hand-transcribed. |
| `business-data.json` | 17 records | mixed | `import-businesses.py` | `BuildingBase.json 147f9b73…` **MATCHES** (cost/order/type). `employeeRate` is a hand-typed dict in the importer | `lib/businesses.mjs`, `tests/village-map.test.mjs` | **HIGH — 2 of 17 rates contradict `BuildingBase.yield`. See prose.** |
| `character-idle-data.json` | 509 keys | asset-manifest | `import-character-idle.py` | per-row `sourceSha256`; argv-pinned manifest | `app/character-artwork.tsx`, `tests/offline-manifest.test.mjs`, `tests/character-idle.test.mjs` | Art only. |
| `character-skill-guide.json` | 281 profiles | **unknown** | `import-character-skills.py` | **No provenance key anywhere.** Importer scrapes isl-tools wiki (path broken) | `lib/talents.mjs`, `lib/character-skills.mjs`, `tests/default-advancement.test.mjs` | **HIGH — drives talent caps → Fellow Power. See prose.** |
| `character-skill-inventory.json` | 281 profiles | wiki/community | `import-character-skills.py` | snapshot `b49c78d0` | `tests/content-overrides.test.mjs` | Display inventory of the same scrape. |
| `content-overrides.json` | 8 keys | local-invention | *none* | Everkai content decisions; prose notes only | `lib/catalog.mjs`, `lib/original-catalog.mjs`, `tests/original-content.test.mjs` +1 | Deliberate local rewrites, correctly labelled. |
| `default-talent-source.json` | 176 heroes | **unknown** | `import-default-talent.py` | Claims `APK1.7702 recovered read-only`; **no sha, source file missing, never re-derivable** | `lib/talents.mjs`, `tests/default-talent-source.test.mjs` | **HIGH — sets aptitude cap 300/299 and per-talent cost. Unverified.** |
| `drakenberg-art-data.json` | 5 asset + 4 crop + 2 layers | asset-manifest | `import-drakenberg-art.py` | UnityFS payload extraction; layer/crop recorded | `tests/drakenberg.test.mjs` | Art only. |
| `drakenberg-layout.json` | 18 facilities | local-invention | *none* | Explicitly local plate placement | `app/drakenberg-town.tsx`, `app/facility-scene.tsx`, `tests/content-overrides.test.mjs` +4 | Layout only; correctly labelled. |
| `elixir-data.json` | 2 items | sha-pinned | `import-elixirs.py` | `datasets/Item.json 6b30d644…` **VERIFIED** | `lib/elixirs.mjs` | Item literals only. |
| `employee-yield-data.json` | 17 rates | sha-pinned | `import-employee-yields.py` | Claims `BuildingBase.yield.count`, no sha stored — I **VERIFIED 17/17** against the original | `lib/businesses.mjs` | Income-critical but measured correct. |
| `expanded-gear.json` | 44 (top-list) | wiki/community | `import-expanded-artifacts.py` | per-row isl-tools `source` URL; no sha | `lib/adventure.mjs`, `tests/artifact-expansion.test.mjs` | Aptitude values feed Fellow Power; community-sourced. |
| `expo-bond-data.json` | 12 records | mixed | `import-expo-bonds.py` | expo snapshot + `SkillBase 9c5c2d7a…`/`Hero 3c66ace4…` **VERIFIED** | `lib/expo.mjs`, `tests/expo-bonds.test.mjs` | Bond rows community-scoped. |
| `expo-data.json` | 100 stages | wiki/community | `import-expo.py` | isl-tools expo `eb767ee1…` **MATCHES** the snapshot on disk | `lib/expo.mjs` | Event content, not permanent income. |
| `facility-scene-data.json` | 18 scenes | asset-manifest | `import-facility-scenes.py` | UnityFS static Texture2D; matching is local | `app/facility-scene.tsx`, `tests/facility-scenes.test.mjs` | Art only. |
| `familiar-crit-data.json` | 8 skills | wiki/community | *none* | snapshot `b49c78d0`; importer is a verifier, not a generator | `lib/familiar-crit-combat.mjs`, `lib/familiar-tower.mjs`, `tests/familiar-crit.test.mjs` | Hand-curated; guarded by an assert. |
| `familiar-data.json` | 71 pets | wiki/community | `import-familiars.py` | isl-tools snapshot — I **VERIFIED 70/70 pets + 609 level/class/star rows exact** vs `Pet`/`PetLevel`/`PetClass`/`PetStar` | `lib/familiars.mjs` | Scrape proved exact; 1 extra pet (see prose). |
| `familiar-dot-data.json` | 5 skills | wiki/community | *none* | independent evidence packet; verifier-only importer | `lib/familiar-tower.mjs`, `tests/familiar-dot.test.mjs` | 5 skills; hand-curated. |
| `familiar-modifier-data.json` | 13 skills | wiki/community | `import-familiar-modifiers.py` | snapshot `b49c78d0` | `lib/familiar-tower.mjs`, `tests/familiar-modifier.test.mjs` | Combat modifiers, community-derived. |
| `familiar-node-data.json` | 71 records | wiki/community | `import-familiar-nodes.py` | snapshot + `tableSha256 472a83f9…` (community table, not an original) | `lib/familiar-nodes.mjs` | Power ordering explicitly *reconstructed*. |
| `familiar-passive-data.json` | 25 skills | mixed | `import-familiar-passives.py` | research notes packet; local v7 stage policy | `lib/familiar-passives.mjs` | Local policy layered on community data. |
| `familiar-skill-data.json` | 13 skills | wiki/community | `import-familiar-skills.py` | snapshot `b49c78d0` | `lib/familiar-tower.mjs` | Community classification. |
| `familiar-skill-inventory.json` | 71 profiles | wiki/community | `import-familiar-inventory.py` | snapshot `b49c78d0` | *(nothing)* | Dead data — nothing reads it. |
| `familiar-status-data.json` | 17 skills | wiki/community | `import-familiar-status.py` | snapshot `b49c78d0` | `lib/familiar-tower.mjs`, `tests/familiar-status.test.mjs` | Community-derived. |
| `familiar-support-data.json` | 7 skills | wiki/community | `import-familiar-support.py` | snapshot `b49c78d0` | `lib/familiar-tower.mjs`, `tests/familiar-support.test.mjs` | Community-derived. |
| `familiar-trigger-data.json` | scalar | mixed | *none* | APK Pet/PetSkill + community wording + local timing policy | `lib/familiar-trigger-combat.mjs` | No importer — cannot be regenerated. |
| `family-gallery-assets.json` | 178 images | asset-manifest | `import-family-gallery.py` | `sourceMapSha256 44cb9507…` + per-image sha | *(nothing)* | Art only; no reader. |
| `family-gallery-data.json` | 175 (top-list) | **unknown** | `import-family-gallery.py` | **No provenance key.** Importer reads a missing evidence map | `lib/family-gallery.mjs`, `tests/content-overrides.test.mjs` | Carries intimacy unlock gates; art/progression gating, not income. |
| `family-rule-evidence.json` | 19 records | mixed | *none* | APK `translate_…mmc`, method recorded, no sha | *(nothing)* | Evidence file, no reader. |
| `farm-data.json` | 39 plants | wiki/community | `import-farm.py` | magic-farm `f528f277…` **MATCHES** the snapshot on disk | `lib/farm.mjs` | `seconds`/`amount` are the level-1 upgrade values, **39/39 consistent** (see prose). |
| `farm-level-data.json` | 39 plants | wiki/community | `import-farm-levels.py` | magic-farm `f528f277…` **MATCHES** — and I **VERIFIED 117/117 rows exact** vs `SimGame3PlantUpgrade` | `lib/farm.mjs` | Scrape proved exact. Income-bearing but correct. |
| `farm-order-policy.json` | 39 offers | local-invention | *none* | `Local sandbox policy; original values absent` — self-labelled | `lib/farm-trade.mjs` | No importer. Honest local invention. |
| `farm-trade-data.json` | 5 essences + 3 dew | sha-pinned | `import-farm-trade.py` | APK text bin `c884ee22…` **VERIFIED** on disk | `lib/farm-trade.mjs` | Small trade table. |
| `farm-yield-data.json` | 201 levels | sha-pinned | `import-farm-yield.py` | `SimGame3Yield.json f8fe6310…` **MATCHES** — **201/201 rows exact**, 0 drift | `lib/farm.mjs` | Income multiplier, fully sourced. |
| `fathom-data.json` | 36 slots | sha-pinned | `import-fathoms.py` | `WifeQuenchingUnlock 361f81e2…` + `WifeQuenchingWight 014b5cfa…` both **MATCH** | `lib/fathoms.mjs` | Income multiplier, fully sourced. |
| `fishing-art-data.json` | 87 records | asset-manifest | `import-fishing-art.py` | exact prefab extraction, per-record sha | `app/fishing-panel.tsx` | Art only. |
| `fishing-combination-data.json` | 34 records | wiki/community | `import-fishing-combinations.py` | fishing `a6dbd32a…`; 34 rows = `FishCombination` 34 | `lib/fishing.mjs` | Row count corroborated. |
| `fishing-data.json` | 3 records | local-invention | *none* | Rule ids + explicit `localPolicy` block | *(nothing)* | No importer, no reader. |
| `fishing-inventory.json` | 87 records | wiki/community | `import-fishing.py` | snapshot `b49c78d0` | *(nothing)* | Dead data — nothing reads it. |
| `fishing-species.json` | 86 records | wiki/community | `import-fishing.py` | snapshot `b49c78d0`; **86 of 87** `Fish` rows, F3506 explicitly deferred | `lib/fishing.mjs` | Grants employee income bonus; scope gap is declared. |
| `forge-reward-data.json` | 2 milestones | sha-pinned | `import-forge-rewards.py` | `datasets/Item.json 6b30d644…` **VERIFIED**; milestones from raphael-progress | `lib/raphael-progress.mjs` | Small reward table. |
| `fountain-data.json` | 15 recruits | mixed | `import-fountain.py` | APK rule/item shas **VERIFIED** + community recruit/synthesis pages | `lib/fountain.mjs` | Mixed but each part labelled. |
| `graduation-bonds.json` | 38 keys | wiki/community | `import-graduation-bonds.py` | per-row isl-tools URL + page sha (community pages, not originals) | `lib/education.mjs` | Percent/increment feed earnings; community-sourced. |
| `hire-card-data.json` | 3 records | sha-pinned | *none* | `datasets/Item.json 6b30d644…` **VERIFIED** | `lib/hire-cards.mjs` | No importer — cannot be regenerated. |
| `humanized-static-data.json` | 259 (top-list) | asset-manifest | `import-humanized-bulk.py`, `import-humanized-pair.py` | per-row `sourceSha256`/`recipeSha256` | `lib/humanized-static.mjs`, `tests/family-scenes.test.mjs`, `tests/character-idle.test.mjs` +1 | Art only. |
| `inn-data.json` | 80 dishes | wiki/community | `import-inn.py` | inn `a2be0554…` **MATCHES** — dish and station **id sets exactly equal** `SimGame1Food`(80)/`SimGame1Kitchenware`(10) | `lib/inn.mjs` | Scope corroborated against the original. |
| `inn-gate-inventory.json` | 90 gates | wiki/community | `import-farm-levels.py` | inn `a2be0554…` **MATCHES** | *(nothing)* | Dead data — nothing reads it. |
| `inn-guest-data.json` | 7 rules | wiki/community | `import-inn-guests.py` | inn `a2be0554…` **MATCHES** | `lib/inn-guests.mjs` | Grants a +25% employee-rate gift; community-sourced. |
| `inn-progression-data.json` | 8 keys | wiki/community | *none* | isekai.wiki oldid 282; `Not APK-version-matched`, missing cells unknown | `lib/inn-progression.mjs` | No importer. Income-adjacent, self-declared incomplete. |
| `insight-data.json` | 5 rules + 4 sources | mixed | `import-insight-advancement.py` | `Item 6b30d644…`/`SkillBase 9c5c2d7a…` **VERIFIED** vs the datasets corpus + wiki Aptitude page | `lib/insight.mjs` | Pins name the translation corpus, not the config table. |
| `inventory-display-data.json` | 108 keys | asset-manifest | *none* | per-row `sourceSha256`; hand-maintained importer input | `app/storage-panel.tsx` | Display names/rarity only. |
| `inventory-icon-data.json` | 101 keys | asset-manifest | `import-inventory-icons.py` | per-row icon sha + `sourceIndexSha256` | `app/storage-panel.tsx`, `tests/scene-ui.test.mjs` | Art only. |
| `inventory-icon-exceptions.json` | 7 (top-list) | **unknown** | `import-inventory-icons.py` | **No provenance key**, but each row carries a `reason` | `tests/scene-ui.test.mjs`, `tests/content-overrides.test.mjs` | 7 icon fallbacks. Art only — harmless. |
| `item-art-evidence.json` | 10 keys | asset-manifest | *none* | per-item art evidence; no importer | `tests/consumables.test.mjs` | Art only. |
| `kohaku-crown-data.json` | 5 effect + 3 sourceKeys | mixed | *none* | Item source keys + wiki profile `68a1c538…`; explicit local claim policy | `app/fishing-panel.tsx`, `lib/fishing.mjs` | No importer. Single fish reward. |
| `medicine-recipe-data.json` | 10 recipes | mixed | *none* | Recovered APK Medicine tables + explicit local completion semantics | `lib/medicine-discovery.mjs` | Verifier-only importer; guarded by an assert. |
| `mine-clearance-data.json` | 8 rows | wiki/community | `import-mine-clearance.py` | isekai.wiki oldid 6634 | `lib/mine-clearance.mjs` | Community event rows; not version-matched. |
| `museum-data.json` | 31 records | mixed | `import-museum.py` | `datasets/Item.json 6b30d644…` **VERIFIED** + community hall manifest | `lib/museum.mjs`, `tests/fellow-power.test.mjs` | Feeds a Fellow-power test; mixed sourcing. |
| `museum-rule-evidence.json` | 5 records | mixed | `import-museum.py` | APK 1.7702 English translation, no sha | *(nothing)* | Evidence file, no reader. |
| `northern-data.json` | 18 localRules + 6 sourceRules + 5 exclusions | mixed | *none* | APK `Rule:text:Dungeon_02…18` + explicit `localRules` | `lib/northern.mjs` | No importer. Local rules clearly separated. |
| `opening-data.json` | 136 tasks | sha-pinned | `import-opening.py` | `packetSha256 4c6ebbeb…` **MATCHES** `campaign-opening-evidence.json` on disk | `lib/opening.mjs` | Campaign content, sourced. |
| `opening-presentation-data.json` | 18 scenes | sha-pinned | `import-opening-presentation.py` | `packetSha256 cfcdc642…` **MATCHES** `opening-presentation.json` on disk | `lib/opening-presentation.mjs` | Scene content; `noEconomy:true`. |
| `operation-data.json` | 175 records | sha-pinned | `import-operations.py` | `Hero 5219480b…` + `SkillBase a04ba18b…` both **MATCH** | `lib/operations.mjs`, `tests/fellow-power.test.mjs` | Fellow appoint bonuses — fully sourced. |
| `original-blessing-data.json` | 700 rows | sha-pinned | `import-original-blessings.py` | Only `policyVersion` in the file — I **VERIFIED 700/700 rows exact** vs `WifeSkill.json` | `lib/blessings.mjs`, `tests/original-blessings.test.mjs` | Unmarked but measured correct (see prose). |
| `original-progression-data.json` | 750 levels | sha-pinned | `import-original-progression.py` | `Hero`/`HeroQuality`/`HeroLevel` hashes all **MATCH** | `lib/original-progression.mjs` | Fellow progression — fully sourced. |
| `original-training-costs.json` | 59 costs + 6 source | sha-pinned | `import-training-costs.py` | `HeroLevel b5525d34…` **MATCHES**; records rows/bytes/container | `lib/training-costs.mjs` | Best-documented file in `lib/`. |
| `public-roster.json` | 281 records | wiki/community | `import-public-roster.py` | snapshot `b49c78d0`; states `Not verified against APK 1.7702` | `lib/summon.mjs`, `lib/public-reference.mjs`, `tests/content-overrides.test.mjs` +2 | 281 records feed summon pricing; honest disclaimer. |
| `pupil-rule-evidence.json` | 12 records | mixed | *none* | APK `translate_…mmc`, no sha | *(nothing)* | Evidence file, no reader. |
| `raphael-data.json` | 8 items | wiki/community | `import-public-mechanics.py` | isl-tools calculator page + snapshot | `lib/raphael.mjs` | Event calculator, community-derived. |
| `raphael-progress-data.json` | 56 milestones | wiki/community | `import-raphael-progress.py` | `bab193db…` pinned community rows, `not version matched` | `lib/raphael-progress.mjs` | Event track; labelled. |
| `roster-batch-evidence.json` | 266 (top-list) | asset-manifest | *none* | per-row portrait sha + render evidence | `tests/content-overrides.test.mjs`, `tests/roster-batch.test.mjs` | Render QA only. |
| `source-character-index.json` | 299 (top-list) | **unknown** | *none* | **No provenance key.** No importer | `tests/content-overrides.test.mjs` | Art-group catalog only — no numbers. |
| `special-blessing-data.json` | 700 rows | sha-pinned | `import-special-blessings.py` | `Wife 13ea743c…`, `WifeBless 1120b614…`, `WifeSkill 2840cf60…` all **MATCH**; **700/700 rows exact** | `lib/special-blessings.mjs`, `tests/special-blessings.test.mjs` | Fully sourced and re-verified. |
| `staffing-data.json` | 57 bands | sha-pinned | *none* | Prose provenance, **no sha** — I **VERIFIED 442/442 quality rows vs `BuildingQuality` and 57/57 bands vs `BuildingLevel`** | `lib/staffing.mjs`, `tests/staffing.test.mjs` | Income-critical; measured byte-exact (see prose). |
| `staffing-independent-data.json` | 92 discountComparisons + 23 quotes | local-invention | *none* | `Independent Decimal90 range scan; no original audit imports` | `tests/staffing.test.mjs` | Test fixture only. |
| `stage-scene-data.json` | 12 files + 6 chapters | asset-manifest | `import-scene-ui.py` | argv-pinned manifest; binding limits recorded | `app/stage-screen.tsx`, `tests/scene-ui.test.mjs` | Art only. |
| `starter-habits.json` | 78 tasks | local-invention | *none* | The owner's personal 78-task list; prose note only | `lib/habits.mjs` | **Private data — must stay out of any public repo.** |
| `stella-activation-policy.json` | 4 owners | local-invention | *none* | `originalValueVerified: false` — explicitly unverified | `lib/stella.mjs` | Honest local policy. |
| `stella-data.json` | 4 profiles | wiki/community | `import-stella.py` | `policyVersion` only in-file; importer reads wiki/fellows + datasets | `lib/stella.mjs` | 4 profiles; thin provenance. |
| `system-maturity.json` | 18 facilities | local-invention | *none* | Editorial status note; no importer | `app/drakenberg-town.tsx`, `app/facility-scene.tsx`, `tests/system-maturity.test.mjs` | UI labelling only. |
| `tonic-data.json` | 3 localPolicy | sha-pinned | `import-tonic.py` | `Item 6b30d644…` **VERIFIED** + explicit `localPolicy` | `lib/tonics.mjs` | Small; well-labelled. |
| `trading-post-data.json` | 4 keys | mixed | `import-trading-post.py` | rule/item shas **VERIFIED** + fandom page dated 2024-01-23, `not version-matched` | `lib/trading-post.mjs` | First shop tier only; declared. |
| `treasure-data.json` | 45 relics | wiki/community | `import-treasure-hunt.py` | `ccf374be…` community snapshot, `not version matched` | `lib/treasure.mjs` | 45 relics; rounding normalized locally. |
| `treasure-rule-evidence.json` | 14 records | sha-pinned | `import-treasure-hunt.py` | `Rule.json 62716857…` **VERIFIED** | *(nothing)* | Evidence file, no reader. |
| `ui-chrome-evidence.json` | 3 (top-list) | asset-manifest | `import-ui-sprites.py` | per-row src + sha + binding | *(nothing)* | Art only; no reader. |
| `ui-sprite-data.json` | 33 keys | asset-manifest | `import-ui-sprites.py` | per-sprite sha from a pinned index | `lib/ui-sprites.mjs`, `tests/ui-sprites.test.mjs` | Art only. |
| `village-layout.json` | 18 buildings | local-invention | *none* | `Local placement…as percentages of the ground image` | `app/village-map.tsx`, `tests/village-map.test.mjs` | No importer. Layout only. |
| `village-map-data.json` | 18 buildings | mixed | `import-village-map.py` | UnityFS tiles (sourced) + `building placement is a local layout` | `app/inn-business-scene.tsx`, `app/village-map.tsx`, `tests/village-map.test.mjs` | Art + local layout, separated. |
| `wardrobe-assets.json` | 257 (top-list) | asset-manifest | `import-wardrobe-art.py` | per-row `sourceSha256`/`recipeSha256` | `lib/wardrobe.mjs`, `tests/wardrobe.test.mjs` | Art only. |
| `wardrobe-data.json` | 258 costumes | mixed | `import-wardrobe.py` | `sourceSha256 658ab55c…` packet + `Local cosmetic ownership` policy | `lib/wardrobe.mjs`, `tests/character-idle.test.mjs` | Cosmetic only, no stats. |
| `workshop-data.json` | 50 records | sha-pinned | `import-workshop.py` | APK text bin `c884ee22…` **VERIFIED** on disk | `lib/workshop.mjs` | Sourced; local sandbox block separated. |
| `workshop-policy-data.json` | 1 versions | local-invention | *none* | `Sandbox theme inference, not recovered original` | `lib/workshop-policy.mjs` | No importer. Honest local invention. |

---

## Load-bearing on village income or Fellow power, with unknown provenance

Four files set numbers the economy multiplies, and cannot be traced to any source.

### `character-skill-guide.json` — the most dangerous file in `lib/`

MEASURED: 281 profiles, **no provenance key at any depth** — no `source`, no `sha256`, no snapshot,
no URL. Nothing in the file says where it came from. Its importer, `scripts/import-character-skills.py`,
scrapes `outputs/online-audit/public-reference/wiki`, so it is **INFERRED wiki/community**, and that
path does not resolve from this repo, so it cannot be regenerated here.

It is not a display file. `lib/talents.mjs:9-13` parses its prose into game rules:

```
const nodes=profile.skills.filter(n=>Object.hasOwn(RULES,n?.id||''));if(nodes.length!==1)return null;
… n.lines.includes('Base cap: 300')&&n.lines.includes(`+${r.amount} Aptitude per level`)?r:null;
```

A Fellow qualifies for talent training only if a scraped English string matches `Base cap: 300` and
`+N Aptitude per level` **exactly**. Aptitude drives Fellow Power, and Fellow Power is village income
via `rosterOperation` (`lib/businesses.mjs:49`).

**Would a wrong value be detectable?** Mostly **no**. A wrong *number* inside a line (a scraped
`+2` that should be `+1`) silently changes that Fellow's aptitude-per-level and is caught by nothing.
A wrong *string shape* fails safe — `resolveTalentProfile` returns `null`, the Fellow becomes
untrainable, and that is visible in play. So the file's failure mode is asymmetric: format damage is
loud, numeric drift is silent.

### `default-talent-source.json` — an unverifiable claim of APK provenance

MEASURED: `"source": "APK1.7702 recovered read-only"`, 176 heroes, `baseCap 300`, `paidCap 299`,
three talent costs. **No sha256 anywhere.** Its importer is a plain `shutil.copyfile` from
`isekai-research/notes/default-talent-source.json`, which resolves to
`/Users/westmanfamily/isekai-research/notes/…` — MEASURED: that directory **does not exist**.

So the file asserts APK provenance, records nothing to check it against, and its source is gone. It
sets the Aptitude ceiling (`talentCap`, `lib/talents.mjs:14`) and the Skill-Pearl cost of every
talent level. `matchedCommunityProfiles: 165` of 176 hints the numbers were reconciled against
community data rather than read from a table. I could not verify a single value in it. **This is an
admitted gap, not a claim that it is wrong.**

### `business-data.json` — marked, sourced, and wrong on two rows

This file is *well* marked, which is why the defect survived. Its `BuildingBase.json` pin
(`147f9b73…`) MEASURED **MATCHES**, and it correctly sources cost, order and type. But
`employeeRate` comes from neither — it is a hand-typed dict in `scripts/import-businesses.py:10`,
labelled "Curated numeric facts from Building_Operations, not downloaded code."

MEASURED, against the original `BuildingBase.yield.count` (the same pinned, matching file):

| Building | Original's own table | `business-data.json` | `employee-yield-data.json` |
|---|---:|---:|---:|
| `Building_901` **Museum** | 20 | **50** | 20 |
| `Building_1401` **Clinic** | 50 | **20** | 50 |

The other 15 agree everywhere. The name→id binding is not in doubt: MEASURED from the original's own
translation, `BuildingBase:name:Building_901` = `'Museum'` and `BuildingBase:name:Building_1401` =
`'Clinic'`. So the community-curated pair is **transposed** relative to the original, and
`employee-yield-data.json` (MEASURED 17/17 exact) is the correct one.

**The honest magnitude.** Both files contain the same multiset of rates, so the sum is 459 either
way: with equal staffing everywhere, **total village income is unchanged**. This is not an income
exploit. What it corrupts is the per-building split, and it does so *inside a single function* —
`lib/businesses.mjs:51` pays pre-existing employees at `retainedRate` (from `business-data`) and
later hires at `sourceEmployeeYield(id)` (from the correct file), so one Museum can pay two
contradictory rates at once. Museum over-pays 2.5× per retained employee; Clinic under-pays 2.5×.

**Would a wrong value be detectable?** **No, by construction.** `tests/businesses.test.mjs:8` asserts
`BUSINESSES.map(b=>b.employeeRate)` equals `[1,2,3,4,6,8,10,15,20,25,30,35,40,50,60,70,80]` — but
records are sorted *by* `employeeRate`, so transposing which building holds 20 and which holds 50
leaves that list byte-identical. The test cannot see this class of error. No test compares the two
files to each other.

### Wiki-sourced numbers that feed Fellow Power

Not unknown, but not version-matched either, and each multiplies power: `expanded-gear.json`
(44 aptitude values, per-row wiki URL, no sha), `public-roster.json` (281 records, self-declared
`"Not verified against APK 1.7702"`, feeds summon pricing), `graduation-bonds.json` (38 rows of
`percent`/`increment` from community pages), `artifact-rules.json` (84 records, snapshot only).

### Three files I expected to flag and cleared by measurement

Honesty requires reporting these as *retired* risks rather than leaving them on the list:

- **`staffing-data.json`** — prose provenance, **no sha**, and its importer is only a verifier whose
  source directory is missing. But MEASURED against the original: **442/442 quality rows** exact vs
  `BuildingQuality.json` (cap/yieldRise/cost) and **57/57 bands** byte-identical to
  `BuildingLevel.json`. Unmarked, but correct.
- **`original-blessing-data.json`** — carries only `policyVersion`. MEASURED: **700/700 rows** exact
  vs `WifeSkill.json` (`flat`=`atk`, `percent`=`riseADH`, `flatCost`=`skill1Exp`,
  `percentCost`=`skill2Exp`). Unmarked, but derived from the original.
- **`employee-yield-data.json`** — claims `BuildingBase.yield.count` with no sha. MEASURED **17/17**
  exact. It is the trustworthy half of the Museum/Clinic conflict.

All three should record the sha they can now be shown to match.

## Sha pins: every one still resolves

MEASURED. 11 distinct original tables are pinned across `lib/` and `scripts/`; **all 11 match**:

`SimGame3Yield` `f8fe6310…` · `WifeQuenchingUnlock` `361f81e2…` · `WifeQuenchingWight` `014b5cfa…` ·
`Hero` `5219480b…` · `SkillBase` `a04ba18b…` · `HeroLevel` `b5525d34…` · `HeroQuality` `c1641151…` ·
`BuildingBase` `147f9b73…` · `Wife` `13ea743c…` · `WifeBless` `1120b614…` · `WifeSkill` `2840cf60…`

Also verified: the APK text bin `c884ee22…`; the campaign packets `4c6ebbeb…` and `cfcdc642…`; the
`isekai-parallel-roaming` copy of `BuildingBase.json` (identical to the private-server copy); and the
three isl-tools HTML snapshots the scrapers pin — `magic-farm f528f277…`, `inn a2be0554…`,
`expo eb767ee1…`.

**One trap worth recording.** `lib/insight-data.json` pins `Item.json 6b30d644…` and
`SkillBase.json 9c5c2d7a…`. Those look stale against the private server (`c2ebdd64…`, `a04ba18b…`)
and my first pass flagged them as such — **wrongly**. They name the *translation* corpus at
`outputs/component-research/datasets/`, which holds different files with the same names. MEASURED
against that corpus, both **match exactly**. A provenance checker that matches on filename alone will
report false staleness here.

## Importer runnability — 54 of 74 cannot run

MEASURED by resolving every source path each importer actually opens:

| Verdict | Count |
|---|---:|
| **BROKEN** — no source resolves | 53 |
| **PARTIAL** — some sources missing | 1 |
| RUNS — all sources resolve | 12 |
| argv/self-contained (caller supplies a sha-pinned path) | 7 |
| no external source | 1 |

`docs/backlog.md:166` says "~50 importers cannot run outside the workspace." Measured it is **54**,
and there are **two** distinct broken roots, not one:

- `app.parent.parent` → `/Users`, so `outputs/component-research/...` and
  `outputs/online-audit/...` become `/Users/outputs/...` — MEASURED missing.
- `app.parent` → `/Users/westmanfamily`, so `isekai-research/notes/...` becomes
  `/Users/westmanfamily/isekai-research/...` — MEASURED missing.

Both resolve correctly only from the in-workspace copy at
`…/referenced-chatgpt-conversation-this-is-an/work/everkai`, which MEASURED **does exist** alongside
its own `isekai-research/notes`. The 12 that run here use absolute paths, and the private-server
readers (`import-farm-yield`, `import-fathoms`, `import-operations`, `import-businesses`) are
among them — the four most parity-critical importers are the four that still work.

**Consequence:** 54 importers cannot re-derive their output or re-check it against its source. Those
tables are effectively frozen, and their assertions never run.

## Scrapes that proved exact

The premise that a community scrape is second-class does not survive measurement. MEASURED:

| File | Checked against | Result |
|---|---|---|
| `farm-level-data.json` | `SimGame3PlantUpgrade` | **117/117** rows exact (time, output, risePercent) |
| `familiar-data.json` | `PetLevel`/`PetClass`/`PetStar` | **609/609** rows exact |
| `familiar-data.json` | `Pet` | **70/70** pets exact on ATK/HP/SPD/ClassMax |
| `inn-data.json` | `SimGame1Food`/`SimGame1Kitchenware` | dish and station **id sets exactly equal** (80, 10) |
| `fishing-combination-data.json` | `FishCombination` | 34 = 34 rows |

Two scope gaps, both already declared in the files themselves:

- `fishing-species.json` has **86 of 87** `Fish` rows; `F3506` is listed under `deferred` with the
  reason "Incomplete quantity, scope or effect". Honest.
- `familiar-data.json` has **71** pets where the original table has 70. The extra is
  `Pet_8041505` ("Phoenix", UR), sourced to an isl-tools page with a page sha but **absent from the
  private-server `Pet` table**. INFERRED: either a later-version familiar the dump predates, or a
  community page for unreleased content. It should not be treated as version-matched.

One field-naming subtlety, not drift: `farm-data.json`'s `seconds`/`amount` do **not** match
`SimGame3Plant`'s base `time`/`output` (MEASURED: 39/39 differ) — they match
`SimGame3PlantUpgrade` **level 1** exactly (MEASURED: 39/39 agree). The file is right; the field name
invites a false drift report.

## Files no importer writes (27) — unregenerable

MEASURED by resolving every `write_text`/`write_bytes`/`copyfile`/`json.dump` target in `scripts/`,
including variable paths. 27 of 100 files have no producing importer, in three kinds:

**Verifier-guarded (5)** — no script writes them, but a script *asserts* them against evidence and
fails loudly on drift. Hand-maintained source of truth, and the safest of the three:
`familiar-crit-data`, `familiar-dot-data`, `medicine-recipe-data`, `staffing-data`,
`staffing-independent-data`.

**Importer inputs (3)** — hand-maintained files that importers read:
`content-overrides`, `inventory-display-data`, `roster-batch-evidence`.

**True orphans (19)** — written by nothing, checked by nothing:
`adventure-rule-evidence`, `artifact-investment-evidence`, `drakenberg-layout`,
`familiar-trigger-data`, `family-rule-evidence`, `farm-order-policy`, `fishing-data`,
`hire-card-data`, `inn-progression-data`, `item-art-evidence`, `kohaku-crown-data`, `northern-data`,
`pupil-rule-evidence`, `source-character-index`, `starter-habits`, `stella-activation-policy`,
`system-maturity`, `village-layout`, `workshop-policy-data`.

Most orphans are honest local policy. Two deserve attention: `hire-card-data.json` carries a verified
Item sha but nothing can rebuild it, and `starter-habits.json` is the owner's private 78-task list,
which **must stay out of any public repo**.

*A correction worth recording:* detecting writers by the `.write_text` idiom alone under-reports
them. Five files look orphaned that way but are in fact written — `default-talent-source`,
`employee-yield-data`, `original-blessing-data` and `special-blessing-data` by `shutil.copyfile`, and
`insight-data` through a path held in a variable. `docs/data-index.md`'s "28 with no importer" counts
those. The measured number is 27, by a different split.

### Two importers mutate rather than generate

A provenance hazard distinct from the above: two scripts edit files **in place**, so the shipped
artifact is not what any single source produced.

- `scripts/import-insight-advancement.py:15-20` reads `lib/insight-data.json`, overwrites
  `sources[0]` and stamps `supportedLevels` into every rule, then writes it back. The file is its own
  input, so its provenance block describes an edit, not a derivation.
- `scripts/apply-content-overrides.py:128,152` rewrites **raw text inside other `lib/*.json`
  files** after import. Any file it touches no longer matches the output of its own importer, and no
  sha in `lib/` records that second pass.

## Dead data — 13 files nothing reads

MEASURED: `acquaintance-recruits`, `adventure-rule-evidence`, `artifact-investment-evidence`,
`familiar-skill-inventory`, `family-gallery-assets`, `family-rule-evidence`, `fishing-data`,
`fishing-inventory`, `inn-gate-inventory`, `museum-rule-evidence`, `pupil-rule-evidence`,
`treasure-rule-evidence`, `ui-chrome-evidence`. Several are deliberate evidence files; but
`fishing-inventory` (87 records) and `inn-gate-inventory` (90 gates) look like intended content that
was never wired up.

## Limits of this audit

- ~~The private-server dump is incomplete… `MovingShop`, `CommercialWarShop` and `GuildShop` are
  absent from all 216 tables.~~ **WRONG — corrected 2026-09-13.** They are not missing files: they are
  rows inside `data/ScoreExchange.json` (1.25 MB, 4,059 rows) keyed by a `shopId` field —
  `CommercialWarShop` 44 rows, `GuildShop` 41, `MovingShop` 26, `CeremonyShop` 31. MEASURED: **84 shop
  rows sell `Item_StarUp_Building_1_1`**, including `CommercialWarShop_02` (limit 10),
  `GuildShop_06` and `GoldShopNormal_04`. This error was mine, not this audit's — I swept for files
  *named* `*Shop*.json`, found none, and told three agents the tables were absent. It also caused me
  to record a correct Drakenberg finding ("the blueprint shop is the Trading Post, not the Challenge")
  as unsupportable. Lesson: read a row of the data before concluding a table does not exist.
- Files whose source is a *community web page* cannot be verified beyond "the pinned HTML snapshot on
  disk still hashes as recorded." Agreement with the original was only checkable for the five tables
  in the "proved exact" section.
- `default-talent-source.json` could not be verified at all; its source file is gone and the original
  tables carry no field I could match it to. Recorded as unknown rather than guessed.
- Row counts use each file's dominant collection; files wrapping rows under an unusual key are
  labelled with that key in the Rows column.
