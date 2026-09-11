## Roaming — September 2026

Roaming is the original Drakenberg building where Family members are met and invited (`lib/roaming.mjs`, `lib/roaming-data.mjs`, `app/roaming-panel.tsx`). Its backdrop is the original shop-street story background, and in the town it sits at the canal boathouse the original labels Roaming.

**From the original.**
- Rules text: each roam costs 1 stamina; stamina recovers 1 point every 30 minutes up to a limit that rises with rank; roams give Fame and random rewards. Meeting an uninvited Family member raises your bond with them; meeting an invited one raises Intimacy; Fellow events give rewards.
- Content: 11 locations, 44 Fellow encounter lines (four event titles excluded) and 10 roaming Family members with their own encounter lines.
- Observed on the original client: 24 Fame per roam, +1 bond per meeting, Kaka's bond goal of 35 and Ena's of 50, and six members' locations.
- Two further locations come from the members' own encounter text: Catherine at the Coffee Shop, Merry at the Art Gallery.

**Local rules.**
- Stamina cap: 20, plus 2 per player rank above 1, up to 60.
- Assigned locations: Chihaya at Maze Park, Lulu at the Casino.
- Bond goals for the other members follow the two observed goals by rarity: N 20, R 35, SR 50.
- Encounter odds: 45% an uninvited roaming Family member (while any remain), 25% an invited Family member, otherwise a Fellow event.
- Intimacy +5 per meeting with an invited member.
- Fellow-event items: Gold Ring, Gemstone Ring, Flower Necklace, Jewel Necklace or Focus Candy.
- Quick Roaming makes up to 10 roams at once.
- Habit refill: once a day, +1 stamina per daily habit completed today (up to 6), never above the cap.

**Joining and saves.** A member whose bond reaches the goal joins with the same starting values as a free welcome. The save gains an optional `roaming` subtree (sequence-guarded and fully validated), so existing saves load unchanged.

**Encounter stories.** Each roaming member's original numbered meeting stories (104 in all, about 190 KB of text loaded separately from the main bundle) play as you roam. The original text doesn't give the bond level for each meeting, so as a local rule the meetings are spread evenly across the bond goal and the joining meeting plays the last one. The after-joining line plays when an invited roaming member is met. Result cards show one-line meetings inline and offer longer ones to watch, and Encounters replays every story already reached (all of them for members who joined some other way).

**Not yet implemented.**
- Per-location backdrops.
- Fame counting toward player rank; Everkai's rank still comes from milestones.
- Stamina Potions.
- Free Family welcome remains available alongside Roaming.

## Drakenberg town, facility scenes and the full village map — September 2026

Drakenberg is the original town painting (the readable `Scene_DragonCity` sky and town layers, composited and cropped; `scripts/import-drakenberg-art.py`). It pans like the game, with a parchment plate over a building for each of the 16 facilities and a List view for accessibility. The facility-to-building placement in `lib/drakenberg-layout.json` is local.

Each facility opens on its own original backdrop (`scripts/import-facility-scenes.py`, `lib/facility-scene-data.json`): guild hall, market street, academy hall, story village, crystal mine, snowy north, trade festival street, magic spring, banquet hall, alchemy shop, museum case, desert ruins, beach, forest glade, mountain road and Raphael's stage. Together they are 1.7 MB. Crossover-event art and backdrops with painted characters were not used, and the backdrop-to-facility matching is local. Facilities with activity pages show the backdrop full-screen with their activities as plates and open pages on tap. Others show it as a header.

The village is one continuous map that pans left and right. It uses the four original main-city ground tiles, ordered by matching tile edges, at 0.75 scale (4980×1536, 1.5 MB). All 17 business buildings use their built-state textures at the same scale (0.92 MB) (`scripts/import-village-map.py`, `lib/village-map-data.json`). Placement in `lib/village-layout.json` is local. Tapping a building opens that business directly. The map stays at least 540 px tall so the signs never crowd, and short landscape screens pan vertically too. It replaces the two-district, five-building map, so `import-village-art.py`, `village-art-data.json`, `village.webp` and the five old building textures were retired.

## Habits drive village earnings — September 2026

Everkai is single-player, and the habit journal is its engine. Passive village Gold accrues at `totalRate × multiplier`, where multiplier = `1 + 0.5 × (life areas with a completion this week) / 8 + min(0.5, 0.07 × daily tasks completed today)`. It ranges from 1.0× (no habits, never a penalty) to 2.0×. The eight life areas are every journal domain except Uncategorized; Uncategorized dailies still count toward the daily term. Weeks start Monday 00:00 local time.

The multiplier is applied during accrual in `settle` (`lib/game.mjs`, `habitEarnings` in `lib/habits.mjs`), never retroactively. Away time is split at each local midnight, so today's dailies stop counting at 00:00 and the life areas reset at Monday midnight. A completion only boosts Gold earned after it, because every action settles before it applies. The per-completion Gold reward and its daily cap are unchanged. Item values that scale with income (consumables, apothecary prices, opening requirements) use the base rate, so habits cannot inflate them. The HUD shows the boosted rate and multiplier, and the journal shows the multiplier with this week's areas and today's dailies. Tests: `tests/habit-earnings.test.mjs`.

## Character art, idle clips and habit journal layout — September 2026

Every character asset is now one shape. Base portraits (278) and costume portraits (257) are 1280×1920 WebP; idle clips (516) are 1024×1536 H.264 at 12 fps with each clip's original frame count (16–384). All share 2:3 framing rendered with the Spine player's default 10% viewport padding. Earlier commit messages describe a 4% padding; that setting was never applied, because padding only takes effect when the viewport is recomputed.

Clips are rendered by freezing the player and stepping `trackTime` per frame, drawing and copying each frame within one task because the WebGL buffer clears on composite. Scenes painted as a CSS background on the viewer (Family) are composited into each frame; without that, 203 Family clips had encoded black backgrounds. Encoding uses AVFoundation (VideoToolbox) at 2200 kbps with a 3× one-second peak ceiling, 1.399 bits per pixel per second against 1.334 for the original 344–552×512 clips. On the busiest clip, raising the rate to 5000 kbps reduced the measured blocking only slightly, and CABAC, a longer GOP or B-frames changed it by less; none justified the size. At native resolution the clip centres show no visible blocking.

The portrait character screen fills its frame (`object-fit: cover`, 7.6% horizontal crop, no vertical crop). Phone landscape keeps `contain`, because the art column is wider than 2:3, and fills the side bars with a blurred copy of the still.

Framing fix (resolved): 258 renders (mostly costumes) drew their art inside a flat viewer surround, because the camera fitted the animation's sampled bounds rather than the visible art. They were re-rendered with an explicit viewport fitted to the visible art measured across 24 frames (3% padding, no transition), using the same still and clip pipeline. Measured on the installed stills, median art height went from 81% to 93% of the frame, and the smallest from 34% to 43%. Renders with a flat border of at least 10% on any side fell from 258 to 164; most of those are narrow standing poses that leave side margin in a 2:3 frame. Four renders stay under 60% height because of wide poses or large motion (wife_173 43%, hero_193c2 55%, wife_159 56%, hero_111c1 60%). hero_119c2, already full-bleed, lost 3% of width to the padding. Clip total fell from 757.5 MB to 537.6 MB at the same 2200 kbps setting, since less flat surround left the encoder less to spend. The costume stills total 39.0 MB against their 40 MB cap.

Retired assets: `public/assets/roster` (8.4 MB) and `public/assets/family-scenes` (1.6 MB) with `lib/family-scene-data.json`. No playable character referenced the roster cutouts after the base renders shipped, which left the Family-scene fallback unreachable. Roster paths in story data still resolve to current art through the static-art aliases.

Habit journal: task tabs render one list grouped under sticky headers (time of day for Daily, schedule for the other tabs), with no pagination. Daily, Weekly, Monthly, One-off and Reviews all support multi-select. Weekly and Monthly also list their review tasks under separate "· Review" headers.

Offline updates: the service worker keeps one shared cache (`isekai-village-files`) plus a ledger of every file's 32-hex SHA-256 fingerprint from the build manifest. An update leaves unchanged files alone, downloads only new or changed files, and stages files whose content changed at an existing URL until activation, so the running version keeps working and storage never holds two copies of the bundle. On its first run over a pre-ledger versioned cache it verifies each file by content and moves it across. Installs resume after interruption and retry a failed download twice. Verified in a real browser over an 832 MB copy of the deployed version: updating to this build downloaded only the three changed files, finished in under 3 seconds, peaked at 834 MB of storage and worked offline afterwards. A first design that copied files into a new versioned cache failed in the same browser with QuotaExceededError.

## v109 — eight complete critical-system actives

Fenrir,Heartcoon,Scarfmink,Icyowl,Meteostrich,Cactora,Charcozard,Rhinocryst join futurecombat10 (63/71catalog activehandlers). New deterministic direct-hit critical policy uses explicit declared71basepairs and authoredguardian5%/0res; final signed-BPclamp,1.5damagefactor and version-salted per-hitroll. Initialization/probability/RNG/order are local, not original-engine parity. All11buffs retained; Icyowl source3turns and Rhinocryst2targetcap override ambiguous community wording; selfbuffsonce aftercast. No newpassives/block/dispel. Old1–9evaluators preserved.451tests/typecheck/build pass,96independentv9hashes unchanged plusolderhistoricaltests. Bothfreshphone layouts showall8descriptions andFenrir/Heartcoonbattle with2criticalhits, rewardonce,offline identicalreplay; other6kits syntheticengine-only. Independent exactcandidate QA pending beforepublish.

## v108 — five complete damage-over-time active kits

Rainbel, Wumeow, Snowbear, Treeraffe and Umbradrake join future combat9 (55/71 catalog active handlers). Recovered owner/active/buff joins and pinned community descriptions inform complete kits. Maximum-HP snapshots for ambiguous targetHP, outgoing scaling, DR-to-vulnerability mapping, targeting fallback, timing and stacking remain explicit local policy. Snowbear preserves recovered Bleed2/Speed3 despite community prose2. Earlier1–8 evaluators/replays stay fixed; no passive/training/binding/Power changes. Six new scoped tests,444 total tests/typecheck/build pass;120independent historicalv8hashes unchanged plus existing historical tests. Fresh portrait/landscape UI selects allfive, exercises duoDOT battle/reward once and offline reopen without seeds/time overrides. Independent exactcandidate review pending before private publish.

## v107 — staff-qualified recipe visitors in the existing Apothecary

Recipe visitors add the ten recovered target-specific five-color puzzles under APK growth. Each requires its own Building_201 employee threshold and the first not-yet-known normal recipe. Existing sales-derived availability and new immutable discovery proofs feed one availability function. No automatic staffing unlock, event recipe, ingredient charge, free bottle, potion skill or stock/deposit capacity change. Successful puzzle completion is an explicit local ownership policy; original intermediate server states are not reproduced.

Existing sales/stock/prices remain intact; future local bottle quotes can use the new recipe count. Transient colors reset on mismatch or target/sequence changes. Final action rechecks sequence/current target/current staffing and exact canonical counts after normal settlement.438tests/typecheck/build and both fresh phone flows passed: max-three color bound, reset/wrong guess,1001/1002discovery at50employees, separate5Gold bottle, offline persistence. No injected browser state/clocks. Independent exact-candidate QA tracked in research.

## v106 — Dream Eater Stage 4 healing in future battles

New combat8 includes only Dream Eater P2: level150 under the existing free stage policy, own ordinary basic attack heals up to5living allies/self for75%effective Attack, rounded down and capped at missing health. Active/Rage attacks, ally attacks and DOT do not trigger it; no revival. Effect finishes after a final-enemy basic hit. These timing/floor/self choices are explicit local policy around recovered skill8043502_3 and corroborating pinned community wording. P1 stays once; P3 and other P2 are excluded. Training, bindings, Fellow Power and old1–7 battles unchanged.

432tests/typecheck/build and actual149→150 phone unlock/combat/offline flows in both orientations passed.56pre-edit frozen1–7report hashes preserved. Solo floor1 shows P2heals0/480/420 and one first-clear reward, persists combat8. Physical Safari untested. Independent review tracked in shared research.

## v105 — optional source-priced hiring and business quality

Businesses → Paid growth, after Fellows → Training Rules → APK growth. Each business explicitly enrolls, preserving staff and income. Separate1/10/budget-max gold hires, source current-row building-material quality costs, quality26/cap26000, earned forward-only quality yield. Free grants/Hire Cards retain5000 ceiling and only supply compatibility capacity. Shared +100 material sandbox supply; conserved material reserve and replayed receipts. Gold discounts and complete original prosperity composition remain unverified. Some late hiring exceeds local gold capacity; no invented reduction.

426 tests/typecheck/build and fresh portrait/landscape offline flow passed.1,971 independent decimal boundary comparisons expose8 one-gold float differences, recorded in research rather than claiming exact server invoices. Old earnings, event snapshots and failed-write admission preserved. See research notes/paid-staffing-contract.md.

# Recreation coverage and dependencies

The objective is the original game's layered single-player systems, not only its appearance. Existing formulas are replaceable scaffolding. This ledger distinguishes direct local evidence, inferred relationships and provisional implementation. Do not label a whole system reproduced merely because one button exists.

## Implemented family slice

Source: the unprotected English translation TextAsset at `assets/Android/config/logic/en/translate_v1_c9fd6a1e92f261ca0fa68d0f79049483.mmc` in the user's UnityDataAssetPack.apk. Selected records are retained in `lib/family-rule-evidence.json`. The numeric wife/item gameplay tables did not expose an ordinary UnityFS payload at the checked offsets; no attempt was made to bypass their container or protection. Translation text proves the listed meanings, not the underlying formulas.

| Layer | Directly supported by local text | Current implementation / remaining gap |
|---|---|---|
| Family ownership | Stable Wife IDs, names, character art | Charlotte and Epona; free sequential welcome is a sandbox choice; roaming encounters and original unlock requirements pending |
| Intimacy | Wife_2: influences pupil earnings | Saved separately; increased by gifts; pupil effect awaits pupil system |
| Blessing Power | Wife_4: increases date Blessing Points | Separate stat; point reward equals current power as provisional formula |
| Gifts | gift1 +1 Intimacy; gift2 +2; gift3 +1 Blessing Power; gift4 +2; gift5 +5 Intimacy | Exact named effects; ownership and consumption implemented; gold shop prices and starter quantities provisional |
| Random dates | Wife_18/19: random owned family, consumes Energy, awards points based on power | Local random selection and points balance; no original date scenes or child chance recreated |
| Energy | Wife_20: recovers over time; cap rises with protagonist rank | One per minute, cap rank+2 are local settings; persistent fractional recovery |
| Family skills | Wife_12: building earnings and Fellow attributes | Spend points for an earnings bonus: 20×next skill level, +1 percentage point per skill level, cap 20, all provisional. Original affinity mappings, specific skills, unlocks and Fellow attributes pending |
| Family relationships | Wife_14: improves pupil intellect and relationship effects | Not implemented; do not substitute the earnings skill for relationship progression |
| Trips | Wife_16: Sailing costs Crystals, grants points and one child; Airship costs Perfume and grants twins | Pending inventory resources, trip flow and pupil subsystem |
| Protagonist rank / tasks | Energy cap relationship confirmed; task modules and tables locally inventoried | Seven one-time local milestones; +50 EXP each, rank every 100 EXP. Original task sequence, rank thresholds and unlocks pending |

The term `family.skill` currently means only the provisional earnings skill. It must expand into skills keyed by original IDs after verified definitions are available. `intimacy`, `blessingPower`, `points`, ownership and inventory remain independent so formulas can be replaced without discarding progress.

## Full-system integration order (original plan, now historical)

This table records the plan written when the sandbox had three Fellows. Pupils, School, Fellow training, Adventure, stages and many activities have since shipped; see the entries above it and **Remaining original-fidelity dependencies** for what is still missing.


| System | Present | Remaining work and dependency |
|---|---|---|
| Offline client and save | Local app, migrations, backups, cache | Maintain content-version compatibility and storage durability as assets grow |
| Fellows | Three IDs, levels, business jobs | Full roster; separate Power, Aptitude, talents, rarity, level resources, breakthroughs, awakening/Stella, costumes; verify schemas and costs before claiming parity |
| Family | Two IDs and the slice above | Roster, roaming bonds, affinity-specific skills, relationship tiers, trips, scenes, costumes/Stella |
| Pupils | No gameplay yet | Caretaker assignment; Intimacy-derived earnings, relationship-derived intellect; education resources, graduation and offline replacement for unions |
| Village businesses | Three jobs and upgrade levels | Original buildings, hiring/workforce, unlock requirements, earnings modifiers and decorations |
| Inventory and economy | Gold, five gift types, persistent quantities | Crystals, resources, currencies, reward tables, item use and sources; retain optional sandbox grants alongside progression |
| Journey / tasks | Seven local milestones | Original main/daily/achievement chains, rank thresholds and system unlock graph |
| Stages and combat | Not implemented | Depends on Fellow Power and resources; reproduce progression, enemy/reward tables and local resolution |
| Recruitment / gacha | Free duplicate-free starter roster | Original pools, unlocks, pity, fragments and duplicates; local currency and free sandbox mode |
| Shops / rewards / timers | Gift gold shop, milestones, earnings, Energy | Full exchanges, item/reward pipelines, daily cycles and local scheduled progression |
| Events / expeditions / minigames | Not implemented | Add individually after shared combat, inventory and rewards; no production event service |
| VIP / recharge | No purchases | Recreate relevant progression benefits as play unlocks or sandbox options; no payment validation |
| Social-dependent systems | Not implemented | Omit production chat/PvP/rankings; design local equivalents only where needed for single-player progression |

Original next step (since completed): pupil caretaker → education → graduation, followed by separate Fellow Power/Aptitude and stage progression. First verify additional readable rule texts and table schemas; do not invent original formulas from labels. Large art batches should be optional offline packs, not one ever-growing mandatory download. The authoring index has 311 character records; availability and fidelity must be checked per batch.

## Pupil implementation update (save version 4)

`pupil-rule-evidence.json` preserves direct readable FosterChild rules 1–12. The previous table's pending pupil row is superseded by this slice: caretaker selection, local enrollment, a separate relationship tier, Intellect at enrollment, pupil type, rank-gated lesson methods, Education Points, Fellow EXP accumulation, education completion, one-time graduation earnings/items and a graduate archive.

Verified: Intellect depends on caretaker relationship; Intimacy affects graduation earnings; classes consume Education Points and grant rank-dependent Fellow EXP; points recover one per five minutes; completed education enables graduation; graduate earnings depend on Intimacy, education, Intellect and type. These are semantic rules, not exact numeric formulas.

Local choices: three active places; a shared six-point pool; free enrollment instead of original trip acquisition; six progress per pupil; lesson progress 1/2/3 unlocked at ranks 1/2/3; Fellow EXP 10×rank per class; rank-weighted education accumulates progress×rank. Types Curious/Creative with multipliers 1/1.1 are local types. Relationship tiers 1–5 require 20×current tier Intimacy without consuming it. Intellect is fixed to tier×10 at enrollment. Graduation adds permanent gold/s equal to `(1+caretakerIntimacy/100) × (intellect/10) × (1+rankWeightedEducation/10) × typeMultiplier`, rounded to two decimals, and one Gold Ring. Intimacy is read on graduation; completed graduate income is frozen thereafter. This earnings interpretation is provisional. Family relationships are separate from the existing earnings skill.

Only the latest 20 alumni records are retained for display; lifetime graduate count and earnings remain. Active and archived IDs are unique, monotonic, and never reusable through normal actions. Graduation removes the active pupil, so repeated reward requests cannot issue a second reward. Schema-four migrations preserve all earlier systems and back up the raw pre-migration save.

Still missing: original pupil acquisition/trips, original type mapping, pupil artwork/story, per-pupil vs shared Education resource confirmation, detailed relationship skills, Fellow talent bonuses, unions and original reward curves. Fellow EXP is accumulated, exportable and saved but not yet spendable. Next priority is Fellow Power/Aptitude/resource costs and stage progression, with a migration that preserves all existing Fellow levels.

## Integrated Fellow / adventure batch (save version 5)

This release supersedes the earlier gold-only Fellow leveling scaffold. Levels now spend Fellow EXP, preserving every old level and all previously accumulated EXP. Base Aptitude, a material-based Fellow skill, limit-break count, equipment, derived Power, adventure party, stage progress, crystals and material inventory are separate fields. Fresh saves start with 250 EXP; migrated saves receive no replacement or deduction of stored EXP.

Direct local evidence is retained in `adventure-rule-evidence.json`: Hero_2 states that levels spend EXP; Hero_6 defines Aptitude as training potential; Hero_8 describes material-based skills; Hero_16 confirms limit breaks raise caps; AutoBattle_4 names Gold and Fellow Power as exploration requirements. The Goblin Club, Felling Axe and Nocturnal Lantern have explicit +2/+4/+6 Aptitude descriptions. Skill Pearl is a named Aptitude-skill item, but its deterministic +1 effect here is provisional.

Local formulas: initial Aptitude 10 for all three Fellows; Power = floor((80+20×level) × (base Aptitude + gear Aptitude)/10 × (1+0.05×skill)). The same Aptitude/skill factor multiplies preexisting business earnings, preserving the old baseline at migration. Level EXP is ceil(50×1.14^(level−1)); up-to-five-level training pays only for completed levels. Level cap starts at 20, with four breaks of +10 each to 60. Breaks cost next break count in local tokens and require reaching the current cap. Skill levels cost next level in scrolls, capped at 20. One item can be equipped per Fellow; swapping returns the old item. Original rarity, type, affinity, awakening, talent, aura and detailed equipment systems are not thereby considered complete.

The 30-stage, five-chapter campaign is generated local content, not recovered original stages. Stage Power is ceil(100×1.16^(n−1)); parties have one to three owned Fellows. Stage n costs 50n gold and rewards 100n gold, 125n EXP, 10 crystals (30 for chapter bosses), one Skill Pearl, a scroll every third stage and a local limit token every fifth. A failed Power check costs nothing. First clears advance monotonically and cannot be replayed for first-clear loot. Cleared-stage patrols require a 25n gold deposit, return that deposit and grant 40n EXP; they award no crystals or materials. Combat is a transparent deterministic Power comparison; original enemy abilities, attrition and event branches are pending.

Materials are bought with gold; the three equipment items cost crystals. All prices are local. Optional sandbox supplies add resources without clearing stages or claiming milestones. Four additional milestones cover stages 5/15, Aptitude 15 and one graduate. Existing claims remain; unclaimed new milestones increase the current rank ceiling to 6. Education validation allows the resulting rank-weighted pupil values.

Validation covers migrations v1–v4, EXP debit and caps, independent resources, equipment conservation, party membership, stage sequencing, duplicate loot, shop currencies, 30-stage completion and state round trips. A separate normal-progression simulation cleared all 30 stages without sandbox grants in 312 actions (using recruitment, training, earned pearls and gold shop supplies). It proves reachability under the current local economy, not fidelity to original difficulty or balance.

Next larger batch should prioritize verified original Fellow/family definitions and affinities, expanded roster/content packs, then original acquisition, stage/event structure and rarer progression layers. Keep this ledger honest: modeled relationships are not proof that original coefficients or entire systems have been reproduced.

## Village navigation (UI update, save v5 unchanged)

The home view uses a fixed dynamic viewport: village scene, four original MainUI buttons in the bottom dock, and three scene shortcuts. Fellows, Family, Adventure, Bag/shop, Businesses, School and Journey open accessible dialog panels. Long systems use local page selectors; only dialog bodies scroll. Saving, import/export, offline download and every gameplay action remain available. No game-state schema or formulas changed.

Nine interface images are cropped from the unprotected Base FairyGUI package and Unity texture atlases in the supplied asset packs. `public/assets/ui/provenance.json` records original resource names and atlas rectangles. The School shortcut currently reuses the original Capital building icon. These are the original images, with new local labels and layout; this does not reproduce the original client navigation code. The FairyGUI binary index was read using the documented open-source package structure, without decryption: https://github.com/fairygui/FairyGUI-unity/blob/master/Assets/Scripts/UI/UIPackage.cs.

## Family support bonds (save version 6)

Family → Bonds provides a freely chosen supported Fellow, ten bond levels and a Blessing Point upgrade cost of 20×next level. Each level adds two percentage points to that Fellow's Power and business earnings. Bonuses from multiple family members add together before multiplying existing training. The existing village-wide family skill remains separate and spends the same point pool. Pairings, costs and coefficients are local sandbox choices, not recovered original affinities. Assignment can change for free without losing the bond level; unassigning disables its effect. Earnings settle under the old assignment before a change.

Saves v1–v5 migrate with no trained bonds and preserve their progression. Targeted free recruitment now welcomes the selected unowned Fellow. The three-Fellow roster remains unchanged. Fixed sandbox gift refill to merge gifts into inventory instead of dropping equipment/materials. Regression coverage includes migration, bonus transfer, point spending, invalid targets, inventory preservation, save round trips and recruitment uniqueness.

## Original content integration (save schema remains 6)

`original-content.mjs` is generated by `scripts/import-original-content.py` from the prior read-only extraction. It contains 324 source-keyed named character records (176 Hero, 148 Wife), 67 core rule records, five gifts and three equipment items. SHA-256 hashes identify the input datasets. Gift effects, equipment Aptitude and the Education recovery duration are parsed from explicit original descriptions; the importer fails rather than guessing if their expected structure is absent. Existing playable names/titles/occupations/races/biographies now come from this content layer. Authored duplicate biographies were removed. Shop prices and unverified progression formulas remain separately marked local values.

Fellows and Family each have a modal album with search, six-entry pagination, character details, original rule pages and links to the five already playable characters. Other entries are clearly marked not playable; text presence does not prove availability or exact stats. All album content is cached offline with the app. Player saves store ownership/progression separately and need no migration for this change.

No recovered earnings equation was inserted into the live economy without its missing base-value/bonus dependencies. The album does not claim to implement original rarity, affinity, unlock or progression data. Future playable characters should reference these stable records instead of duplicating metadata or inventing original attributes.

## Ten-character playable batch (save schema remains 6)

Added original base appearances for Fellows Maxim (hero_2), Reir (hero_3), Knivi (hero_4), Pump (hero_5), and Björnson (hero_11); family Gina (wife_1), Nene (wife_4), Susie (wife_5), Will (wife_6), and Ookami (wife_11). The playable roster is now eight Fellows and seven family members. Names and biographies reference the imported original catalog. Artwork is converted from existing locally rendered PNGs in Desktop/ISEKAI/local-everstead/portraits; original model IDs, prior render verification and portrait hashes are retained in `roster-batch-evidence.json`. All ten images were visually inspected as a contact sheet. They are static renders, not new animations.

The new characters use the existing explicitly provisional common progression. No rarities, affinities, bespoke talents, canonical unlock costs or original initial statistics have been invented. Free local recruitment/welcome is a sandbox option. Family welcome now accepts a selected ID, preserving sequential welcome for existing calls. Existing ownership and progression are not changed or automatically expanded.

Fellow and family selectors page through three and two portraits respectively. Selecting a character from the album or welcoming one moves the selector to its page. All existing integration points accept the expanded stable IDs: workplace assignments, training, equipment, party selection, dates, gifts, bonds, pupil caretaker selection and saved state. Added integration coverage checks source-art identity, recruitment uniqueness, persistence and cross-system use. Ten additional WebP images total about 200 KB and are included in the offline bundle.

## Twenty-character expansion and roster search (save schema remains 6)

Playable totals: 18 Fellows and 17 family members. Added Fellows Belle, Woolf, Geast, Meaden, Dr.Dotor, Prim, Guarg, Mirac, Hawker and Rogile (hero_12,14,16–23); added family Rachel, Joyce, Sofia, Chihaya, Kaka, Freyja, Catherine, Otherin, Mater and Dia (wife_12–21). Original text remains imported; only explicit original base-model IDs with successful prior render evidence were selected. Twenty additional static WebP renders were visually checked in a local contact sheet. The cumulative portrait evidence now contains 30 additions, including hashes and original model IDs.

Search matches original name, title, race and occupation. Joined/Not joined filters use save ownership; portrait pagination remains three Fellows or two family members. Selecting an album entry or newly recruited character resets filters and shows that character's page. Search/filter operations never change ownership or progress. No new numeric balance, rarity, affinity, unlock or talent rules were introduced. New characters use the previously documented common sandbox progression.

Validation covers all 35 playable characters joining once, persisted state, preservation of existing levels and balances, missing/duplicate recruitment handling, source art and identity checks, and combined search/ownership filtering. Existing save schema and storage key remain unchanged; new content is not automatically granted.

## Verified base-roster completion (save schema remains 6)

Imported all 275 named records with a matching successful base-render verification and an existing local portrait: 157 Fellows and 118 family members. The previous 35 remain available. All original IDs/profiles are retained; existing Kaity/Fifi/Augustine/Charlotte/Epona artwork mappings remain unchanged. Additional roster order follows the generated stable-ID manifest; this may change page positions, never saved ownership or stats.

`roster-availability.mjs` records all 324 named records: 275 verified-base, four variant-only (hero_13, hero_54, hero_143, wife_56), and 45 without a verified render. The 49 remaining records remain album-only with their asset gap shown. No fallback costume was substituted for missing base art. Hattie (wife_183) has no recovered biography; the UI says so rather than inventing one. Portrait provenance, dimensions, nonempty alpha bounds, hashes and prior base-render evidence are stored in the cumulative evidence file. All exports were programmatically checked; representative contact sheets were visually reviewed. Full current-site browser testing was not performed.

Added optional bulk welcome actions that only add missing characters, preserving existing progression, inventory, assignments and bonds. Nothing is granted automatically on update. Adventure party and workplace selection now use a searchable four-entry paged chooser. Parties still allow one to three members. Family caretaker/bond selection continues using native dropdowns.

The full roster uses the prior explicitly provisional common progression; this is original presentation/content reuse, not verified original rarity, affinity, talent, unlock or numeric balance. All static portraits are bundled for offline use. Saves remain well below the existing 2 MB import limit. Validation includes full-roster individual/bulk acquisition, repeated-grant protection, existing-state preservation, artwork presence, original identity, filtering, migrations, round trips and existing gameplay tests.

## Imported equipment expansion (save schema 7)

The original-content importer now selects all 37 equipment descriptions with an explicit leading `Aptitude +N.` effect. The remaining equipment descriptions are not guessed. Names, descriptions and fixed bonuses are imported unchanged; no rarity, enhanced skill or unknown effect is inferred. The original three local shop prices remain 30/60/90 crystals by stable ID. The additional 34 items have no assigned price and are available through an explicitly labeled free sandbox grant; direct shop purchase rejects them.

Bag/shop → Equipment is searchable and paged three items at a time. All 37 equipment items can use the existing slot, swap conservation, Aptitude calculation and persistence. Save version 7 adds inventory keys at zero while preserving v5/v6 resources, equipped items, bonds, ownership and progression. Older schema inventory validation uses the legacy item set before migration. The raw save is backed up by the existing migration flow. Tests cover v6 migration, all 37 equip/unequip round trips and free-grant currency preservation alongside all prior checks.

The hourly continuation schedule was removed at the user's request. Continue in the current session; do not create a schedule.

## Imported consumables and gift art (save schema 8)

Imported four Fellow EXP stones with exact rewards of 2,500 / 10,000 / 50,000 / 250,000 EXP, plus ten fixed family gifts from Touno and Monopoly01–03. Each effect is parsed from its original readable English description; IDs, names, descriptions and source keys are retained. Gifts affect Intimacy or Blessing Power by 5 or 10. Random gachapon ranges, event-specific Succubus Energy, unbound Fame, and Monopoly04 entries with placeholder `momoca` names were excluded. Neither original acquisition rules nor event reward pools are inferred.

Bag → Supplies has search and two-item pages, recipient selection, Use 1 / Use 10 / Use all, and explicitly free sandbox grants. Family → More gifts targets the selected member. Whole-item use stops before the local stat cap and retains all unused items, including for the previous five ordinary gifts. New items start at zero on migration; no user progress is automatically granted. Schema 8 preserves v1–v7 saves and backs up the previous raw save through the existing loader. v7 inventory validation remains frozen at the prior item set. Tests exercise every effect, bulk caps, invalid targets/counts, exact item conservation, migrations and persistence.

Ten matching original gift icons were cropped from the unprotected Icons FairyGUI atlases. The 2,966-sprite index and fourteen atlas sources remain in `work/item-icons` outside the app; app evidence records original sprite identifiers/rectangles, source archive entry hashes, and final image hashes. Matching uses identical item/icon identifier suffixes. EXP-stone and equipment image mappings are not assumed from approximate numbers or visual resemblance. The ten crops were reviewed together for visible content and bundled for offline use.

## Remaining original-fidelity dependencies

This is a working offline sandbox, not complete original-game parity. The next original progression integrations require readable values or an authorized unprotected export: Fellow base Power and level/EXP curves; individual talents/rarities/affinities; family unlocks and pupil coefficients; building business tables; event stages, rewards and gacha pools. Existing recovered descriptions and module names identify concepts but do not resolve those numeric rules. The 49 album-only characters still lack verified base portrait renders. Preserve these boundaries rather than claiming the original systems have all been reproduced or adding speculative replacements. No background schedule is active.

## Original city encounter replays (save schema stays 8)

Imported all 36 named-character `CityEventH/W` scenes with contiguous numeric line IDs and no choice-text entries: 411 original lines. Leading zero IDs normalize to their existing stable character IDs. The importer rejects missing line numbers, choice-bearing groups, MOMOCA placeholders and unresolved variables other than `{playerName}`. Original line text, source keys and explicit speaker overrides are retained. No unnamed speaker is inferred from a character ID. This is a text replay in numeric source order, not a reconstruction of protected event flow, triggers, portrait changes, rewards or ownership conditions.

Fellow and Family profiles, plus album details, now open a dedicated scene modal where recovered text exists. One line at a time, Previous/Next/Finish; reopening starts at the beginning. Existing portrait art identifies the featured character, not necessarily the current speaker. The original player-name variable displays as “Village Elder.” Replays grant nothing and do not modify the save. No generic conversations are invented for characters without a recovered scene. Source import and tests cover all 411 lines, IDs, ordering, placeholders, known speaker overrides and unchanged source/save data. This extends original narrative content without changing combat or economy.

## Extensionless Spine JSON recovery and earnings supplies (save schema 9)

A second pass over incomplete exported character groups discovered six readable Spine JSON skeletons whose TextAsset names have no file extension. Three are missing base characters: Lincale (hero_13), Rani (hero_54), and Maynard (wife_56). The others are a home scene, an NPC pre-appearance, and a small variant; they are not treated as new characters. The three base JSON skeletons use Spine 4.1, have paired atlases, and rendered locally with finite bone transforms, no WebGL context loss, and no remote requests or page errors. Their three transparent portraits were visually reviewed and added with original profile IDs. The roster now contains 159 Fellows and 119 family members (278 total), with 46 album-only records remaining. The recovery and render scripts are in the outer workspace's `work/json-roster` workflow; the original user extracts were not modified.

The original-content importer also supports the explicit `Aptitude N.` and `N Aptitude.` description forms, recovering Golden Apple (50) and two 70-Aptitude artifacts. Forty equipment items now have a fixed recovered Aptitude value. No extra skill or rarity is assigned. New equipment uses the existing explicitly free sandbox grant and normal equip/unequip conservation.

Added Basic Earnings Card (1 minute of Gold Earnings), Advanced Earnings Card (1 hour), and Blessing Point Insight (10,000 family Blessing Points), with literal source descriptions retained. Cards use the current sandbox total rate, including existing worker/family/pupil effects. Whole gold per card is rounded down as an explicit local convention; the original rounding policy was not recovered. Cards do not collect pending earnings or advance earned-gold milestones, and cannot be consumed when income is zero. Whole-card capacity prevents overflow waste. Insight changes points only, not Intimacy, Power or the gifts-given counter, and immediately supports existing family skill/bond purchases.

Save version 9 adds seven inventory keys at zero and preserves v1–v8 progress, balances, equipment and ownership. v7 and v8 inventories use frozen old item sets during validation before migration. Checks include dynamic earning rates, zero income, gold/point caps, single and bulk use, original save migration and all three recovered characters across work, gifts, bonds and reload.

Focus Candy restores the original one Education Point into the existing single school pool. It can be used from Bag/Supplies or directly in School. Whole-point checks preserve fractional recovery and prevent use when a full point cannot fit. The original per-classroom architecture is not inferred beyond the sandbox’s single classroom.

## Public roster integration — September 7, 2026

Imported the pinned Ascended wiki character manifest and explicit Blessed Fellows links from 128 family pages. Source snapshot: b49c78d0c06d535f6e1c62bdc9d5d666cd96e954. `scripts/import-public-roster.py` is a repeatable static importer; `lib/public-roster.json` retains provenance and family-page hashes. There are 293 reference characters, 287 matching local IDs; online-only IDs never enter the playable catalog. Local names/artwork remain authoritative. Rarity and Fellow type appear in roster tiles and can be searched. This newer reference is not certified as version 1.7702 data.

New family bonds default to documented pairings when available, supporting all recruited matching Fellows. Existing saved custom bonds remain unchanged. Players can explicitly switch either way while preserving training level. The +2% bonus, costs and cap remain labeled sandbox balance, not recovered original blessing math. No save-schema bump is needed: optional boolean `original` is validated; absence retains legacy meaning. Album-only/unowned Fellows receive no active bonus.

Validation: 79 tests, including simultaneous pair support, unrelated-Fellow exclusion, later recruitment, round-trip persistence, legacy switching and corrupt-mode rejection. Artifact progression, original blessing curves, familiars and events are not part of this first integration pass.

## Artifact upgrades, talents and Raphael's Stage — September 7, 2026

Forty existing artifacts match both stable public IDs and local initial Aptitude. Imported published Aptitude growth and Magic Ore level costs, with page hashes and pinned source. Artifacts now upgrade while equipped. Sparse per-level bag counts track upgraded copies individually; moving equipment selects the highest available copy and preserves levels. Normal copies remain stackable and no existing inventory counts change. Ore is an optional local save field, acquired through an explicit free sandbox grant. Current level 20 cap is provisional; artifact skills, materia, awakening and recycling remain deferred. Production endgame upgrade curves are not certified.

Separate Ordinary/Outstanding/Supreme Talent actions consume the published 1/2/3 pearls and add 1/2/3 Aptitude, respectively. Only the first 12 ordinary and first 20 SR/SSR levels are enabled, avoiding missing or misnumbered rows in the older community table. Existing Aptitude remains intact; the previous action is labeled Sandbox Aptitude. Higher rarities are not assigned guessed talent rules.

Raphael's Stage is available through a village button and modal. It includes all 27 fans, eight unique support items (four placed maximum), documented numeric level tables and directional scoring. Implementation is independently written from the published mathematical rules; no third-party JS is executed or embedded. Arrangement, individual levels, best score and performance count save with the village. All placements and levels are free sandbox actions. No event drop rates, heat loop, shops, currency grants or production rewards are invented. Text tiles are functional formation controls, not substituted character art.

Optional artifact, talent and stage fields are validated on v9 saves; absent fields retain prior behavior. Importer: scripts/import-public-mechanics.py. Source: public snapshot b49c78d0c06d535f6e1c62bdc9d5d666cd96e954, plus https://isekai.wiki/Fellow_Improvements for bounded talent cost rows. Validation: 87 tests pass, including hand-calculated Raphael examples, duplicate-item and fifth-item rejection, invalid-save cases, equipment copy transfer and ore accounting, old-save preservation and talent boundaries. Type checking and offline production build pass.

## Familiar progression — September 7, 2026

Added Journey → Familiars with 71 public-reference familiar profiles. Each profile retains its stable Pet ID, base Attack/Health/Speed, rarity, type, stage ceiling, source URL and page hash. Imported 499 level rows, 10 stages and 100 stars from the published simulator table, stripping unused descriptions, image URLs and combat payloads. Independently implemented the displayed stat equations: Attack/Health scale by summed stage-plus-level coefficients and then star coefficients; Speed uses stage-plus-level scaling. Passive combat damage is not folded into visible base stats.

Recruitment, training and stars are explicit free sandbox actions. Stage advances with level according to the reference calculator. Existing familiar progress survives welcome-all. Optional validated save fields preserve older villages. Original costs, combat, skills, pet collection bonuses and links to village earnings remain deferred; no arbitrary combat loop or village bonus was added. These newer public profiles may not match APK 1.7702. No third-party artwork or scripts are loaded by the app.

Validation: 90 tests pass, including base/level/star hand calculations, stage boundaries, every familiar's maximum-level finite stats, persistence, inventory/economy isolation, invalid identities and out-of-range saves. Type checking and offline build pass. Importer: scripts/import-familiars.py.

## Fellow blessings and auto-date — September 7, 2026

Family → Blessings now provides the first ten published rows of Fellow Blessing and Advanced Blessing from https://isekai.wiki/Family (checked 2026-09-07). Values are cumulative level totals. Costs are used as target-level upgrade costs; this community table is not a verified complete production formula. No rows after level ten are extrapolated. Optional per-family levels preserve older saves and existing sandbox bonds. Only documented family–Fellow relationships receive the new bonuses, including Fellows recruited after blessing training. Advanced percentages add to existing local percentage bonuses before flat Power; the surrounding combat formula remains local. Village earnings are unaffected, and original unlock gates are waived.

Auto-date consumes all available whole Energy by applying the existing date action with independently sampled selections. Fractional Energy remains, rewards respect existing storage caps, and the message reports actual points gained. The original rank/VIP unlock is waived. Existing local date rewards/recovery remain explicitly labeled.

Validation: 95 tests pass, including cumulative blessing totals, point spending, exact pairing isolation, percentage-before-flat order, save round trips, invalid levels, batch equivalence to manual dates, fractional Energy and capped gains. Type checking and offline build pass. No browser QA was requested or performed.

## Extended blessing rows and batch upgrades — September 7, 2026

Extended Fellow Blessing through level 36 (+159,000 total Power) and Advanced Blessing through level 24 (+12%). These are transcribed public community rows, not newly recovered exact production formulas; displayed values may be rounded. Stop before flat level 37's questionable cost and level 38's missing unit, and before advanced level 25's missing cost. No interpolation or corrections are applied. The prior ten levels remain unchanged.

Added an affordable-upgrades preview and batch action for each blessing. It spends the exact sum of enabled target-level costs, stops at the user's available points or last enabled row, and preserves all unused points. Save fields and schema remain unchanged. Validation: 97 tests pass, including equivalence with sequential upgrades, old level-ten saves, exact budget exhaustion and stopping at published caps; type checking and offline build pass.

## School and family graduation integration — September 7, 2026

Replaced new-enrollment controls with named pupils and all five documented types (Inspiring, Diligent, Brave, Informed, Unfettered). Added selectable D/C/B-/B/B+ curricula requiring 100/125/155/200/280 Education Points from the public School reference. Type/grade selection is explicitly free sandbox selection, not a reconstructed acquisition probability or Intellect formula. Old pupils retain six-step curricula, previous types, earnings and progression. Optional seat expansion opens five seats, waiving original rank gates.

Imported 43 exact base graduation-bonus descriptions from pinned public family pages. The importer matches only an explicit type-specific graduation pattern and records URL/hash; other bond effects are excluded. Supported owned family members can activate those base bonuses individually or together, with original gates waived. Bonuses add for matching pupil types at graduation under the local surrounding earnings formula. Previously saved alumni income never changes retroactively. Bond upgrades remain disabled; no unknown costs are invented.

Added point-bounded batch education, explicit free finish-lessons sandbox action, and graduate-all-ready. Batch education equals repeated basic classes, preserving fractional points; graduate-all equals sequential graduation and cannot award twice. New pupils earn one curriculum progress per point. Existing local rank-dependent EXP and income formulas remain labeled. Five-minute recovery remains unchanged. Names/grades survive graduation and save export/restore. Classroom uses a pupil selector instead of stacking every pupil's controls.

Validation: 102 tests pass, including all 25 new grade/type combinations through graduation and persistence, legacy pupils, five-seat capacity, malformed grade/name/bond fields, capped energy spending, matching bonus behavior, frozen graduate income and duplicate-reward prevention. Type checking and offline build pass. Sources: https://isekai.wiki/School and public family snapshot b49c78d0c06d535f6e1c62bdc9d5d666cd96e954. Exact earnings, grade A, original pupil acquisition, unions and workaholic rolls remain pending.

## Expanded artifact collection and workshop — September 7, 2026

Expanded equipment from 40 to 89 artifacts by matching public stable IDs against local item-name keys. Added 49 local identities with public numeric base/growth/cost fields; ten public records without local name matches remain excluded. The original 40 Aptitude values still cross-check exactly. New descriptions explicitly distinguish the implemented base Aptitude from unimplemented special effects. Importer scripts/import-expanded-artifacts.py records page hashes, source URLs, rarity and exclusions; the general mechanics importer invokes it to avoid overwriting the expanded rules.

Added rarity filtering, full-collection free sandbox grants, budget-bounded batch equipment upgrades and level-one recycling. Recycling uses only documented base Magic Ore rewards and refuses upgraded/equipped copies, unknown rewards and ore overflow. Upgraded-copy metadata is conserved. All 89 can be equipped/upgraded with the existing level-20 sandbox cap. Personal/special effects, skills, materia, awakening, equip restrictions and upgraded refunds remain unverified/unimplemented; this is base-stat coverage, not complete original artifact behavior.

Save schema 10 adds zero-count stacks for new artifacts while preserving every existing count, equipment level, family blessing, pupil, familiar, formation and currency. Historical v7/v8/v9 item lists stay frozen for validation/migration. The installed app retains the same storage key and its existing automatic pre-migration backup behavior. Validation: 106 tests pass, including all artifact equip/unequip flows, every new artifact's upgrade and transfer, v9 migration, unchanged prior fields, recycling protections, unknown rewards, ore caps and batch/manual equivalence. Type checking and offline production build pass.

## Museum collection update (v23, optional schema-10 state)

32 named keepsakes imported from readable local Item descriptions by `scripts/import-museum.py`; `lib/museum-data.json` retains source keys and dataset hash. Six numeric bonuses are literal: one +2 all-Fellow Aptitude, two +2% Power, three +2% basic Power. Other records are collectibles with no inferred bonus. This covers the locally named Collection-prefixed subset, not the whole game's Museum.

Journey → Museum provides two-entry pages, search, collection/bonus filters, free individual or full collection, and individual/all display or store controls. Optional `museum` maps known IDs to boolean displayed state. Strict validation rejects unknown IDs, non-boolean values and malformed collections. Claiming is once-only; no duplicates or Crystal conversion. Existing saves need no rewrite. Displayed Aptitude remains derived and affects newly recruited Fellows automatically.

Sandbox choices: free unlock/acquisition and display switches; additive stacking within categories; basic Power applied before family percentages/flat blessings, general Power after them. Museum Aptitude affects Power only in this slice; business earnings remain unchanged. Original stacking, effect ordering, unlocks, acquisition, upgrades and duplicate rewards are not verified. No protected content accessed.

Validation: 109 tests pass, including save round trips, invalid restores, idempotent grants, disabled bonuses until display, future recruits, restoration of old Power after storage and no income mutation. Typecheck passed.

## Durable actions and original business expansion (v24)

Save admission now precedes UI state adoption. `lib/persistence.mjs` blocks gameplay after write failures, preserves trusted saved state, provides explicit reload/retry, and backs up old raw state before restore. All actions write immediately; clock previews render every second while idle storage checkpoints run every 30 seconds plus visibility/pagehide. Failed actions and restores do not report success or get replayed. Five storage-failure tests and isolated Chromium actual-reload checks passed; no physical iPhone test claimed.

17 original BuildingBase identities/descriptions imported with community employee rates (1–80 gold/s per employee), plus Fellow slots at employee thresholds 0/50/200/800/5000. `lib/business-data.json` retains source keys, local hash and public URLs/date. Optional `enterprises` preserves all three starter businesses, workforce, savings and previous assignments. Original businesses are available through Businesses → Original businesses; one selected business at a time, with Employees/Fellows/Earnings pages. Staffing, moving Fellows and employee income feed total/away earnings. A Fellow has one workplace across both old/new systems; capacity checks happen before moves.

Source-supported: employee count × per-employee earnings; earnings = base × (1 + bonuses); local text mentions Fellow Power /1000 and service improving matching-type Fellow Power. Sandbox: free opening/staffing, 5000 employee cap, unrestricted assignment; Power/1000 placed as additive base gold/s contribution, not proven original units. Missing operation/upgrade/service/Inn/Farmstead/Guild bonuses are not fabricated. Type labels are public reference metadata, not enforced gates. Full service costs, hiring curve, bonus tables and rounding remain missing. Public employee values are not verified against APK 1.7702 numeric config.

Validation: all 118 tests pass; covers 17 rates/identities, legacy save identity, progressive slots, capped grants, unique cross-system workplace moves, invalid saves, old-rate settlement before staffing and new-rate offline earnings. Preserve deployment/offline cache flow.

## Museum acceptance and roster earnings correction (v25)

All 32 local keepsakes map by stable ID to Hall1 in the pinned public manifest. Local MuseumHall1_3 and _5 explicitly distinguish acceptance benefits from display and retain benefits after removing exhibits. Optional `museumAccepted` now stores acceptance separately; accepted bonuses persist while display/storage is cosmetic. Older displayed booleans imply accepted status to preserve active bonuses. Old false booleans cannot prove past acceptance and require explicit acceptance; no historical acceptance guessed. Duplicate acceptance cannot stack. Existing six numeric effects remain unchanged; later public bonuses not imported by this correction. `museum-rule-evidence.json` retains direct source text and per-record hall URLs/snapshot hashes.

Two independent player reports clarify roster-wide Power/1000 for every building, with assigned operation-skill percentages a separate layer (see business-data.json operationScope). This supersedes v24's assigned-only contribution. All owned Fellows now contribute to each opened original business regardless of assignment. Roster Power itself remains reconstructed; operation-skill percentages, service and costs remain missing. Existing three starter businesses retain prior formulas. Museum Power now flows through the new original-business roster contribution; the earlier Museum statement about no income effect applies only to starter businesses.

Validation: 120 tests, typecheck and production build. Tests include old-display acceptance preservation, stored exhibits retaining bonuses, invalid acceptance restores, duplicate guards, and the same roster contribution for staffed/unstaffed original buildings.

## Full-roster earnings performance (v26)

Static original identity, public reference and affinity data are indexed and frozen. Blessing/bond membership uses immutable affinity sets, preserving the prior family/bond summation order. enterpriseRate computes the common roster contribution once per evaluation rather than once per business. No cache is keyed to mutable game state; training, roster and bond changes are read on every evaluation. Formula, rounding, settlement and save admission are unchanged.

Validation:123 tests pass, including independent pre-optimization arithmetic, changed-state freshness and index immutability. Typecheck/build pass. Trained synthetic159-Fellow119-Family17-business cold Node sample changed from totalRate4108.6ms / settle3803.1ms to11.0ms /5.0ms, with exact same numeric outputs; timings vary with concurrent tasks. Isolated Chromium loaded-roster check passed: business modal opened, assignment saved, actual reload preserved it. Observed197ms modal interaction and9.4ms maximum animation-frame gap during1.5s sample. These are desktop/headless measurements, not physical iPhone results.

## Recorded artifact investment recovery (v27)

Local Equipment_17/_18 establishes returning upgrade materials when recycling. New complete investments are tracked as `fellow.gearOreSpent`; optional `artifacts.paidBag[item][level][spent]` counts recorded copies within existing upgraded bag counts. Level-one copies begin with no prior upgrade spending; each successful upgrade adds its actual debit. Transfers preserve the ledger, selecting a tracked copy first within an equal highest level. Legacy upgraded copies lack complete historical spending and remain untracked even after more upgrades; no past costs are reconstructed.

The bag offers explicit per-level/investment copy selection. Recycling removes exactly one unequipped recorded copy, returning spent Ore plus documented base Ore. Unknown base reward (Sapphire Crown), equipped copies, unknown legacy investments and insufficient room for the full refund are rejected. Ascension/non-Ore refunds remain pending. Existing saves and inventory counts preserved. Source text retained in artifact-investment-evidence.json.

Operations/service pass: public Faculty IV table contains8 complete rows but applicability is expressly uncertain; I only2, II/III blank. Service costs/thresholds missing. No universal curve inferred. Local Hire Cards1/3/5 employee effects are a next bounded source-backed loop; targeting/cap handling must stay explicit.

Validation:128 tests, including mixed tracked/unknown same-level copies, exact recorded spending independent of current price, all89 artifacts, transfers/reloads, repeat-refund prevention, caps/malformed ledger and storage failure refusing admission. Full-roster trained benchmark rate9.9ms/settle5.0ms with previous outputs unchanged on desktop Node. Typecheck/build passed.

## Original Hire Cards (v28)

Readable local Item descriptions specify1/3/5 employees for a random building. Three source-keyed cards now feed original-business employees, slot thresholds and earnings through Businesses → Hire cards. Optional bounded `hireCards` storage leaves old general inventory untouched. Use1 or up to10 consumes one card per complete effect; eligible pool is recalculated after each draw. Open original businesses with full capacity are selected uniformly as an explicit local policy. Unopened/full businesses cannot waste cards, and unused cards remain if no target fits. Free grants remain marked sandbox. Source does not establish original weights or acquisition.

Validation:132 tests/typecheck/build pass; tests cover three quantities, deterministic draw selection, partial batch capacity, zero waste, malformed inputs/saves, grant caps, sequential equivalence and old-rate elapsed settlement before hiring. Full-roster benchmark numeric outputs unchanged; cold desktop timings vary with concurrent tasks. Save admission and v26 immutable lookup/per-rate sum remain intact.

## Assigned Operations progression (v29)

Fifi hero_1 adds30% on Diligent businesses and another20% at level50 on Inn; her documented level200 bonus remains beyond the current level60 cap. Amaterasu hero_117 adds150% on Inspiring businesses. Her additional effects have unknown unlock levels and are excluded. Community source revisions and stable identities are recorded in operation-data.json. No name-only variant matching or universal rarity curve.

Assignment-derived percentages multiply employee earnings plus whole-roster contribution. Additive stacking is a bounded reconstruction using the local base*(1+bonus) rule. Existing action settlement, durable-save admission and one roster calculation per evaluation are retained. Modal shows selected Fellow's current effect/known future unlocks and assigned totals. No new saved fields or starter-business formula changes.

Validation:135 tests/typecheck/build pass. Covers type matching, Fifi49→50, unknown/variant exclusion, Amaterasu unknown unlock exclusion, assignment movement/removal, exact income composition, old-rate settlement and save roundtrip. Full-roster cold desktop Node sample16.0ms rate/8.9ms settle; exact prior unassigned outputs2476996.41/2477026.41 retained. No physical iPhone performance claim.

## Familiar bound-node progression (v30)

Recovered previously unimported ExternalAdd/ExternalAdd1 numeric facts from the pinned public familiar tables. Six rarity groups contain199 level/star nodes each, mapped to71 actual page rarity keys. Local PetDevelop17/19 establishes activation separately from unlocks. Optional familiarNodes stores explicit activations; familiarBonds maps Fellows to unique owned Familiars. No old node auto-activation. Free single/all-ready activation and reversible one-to-one binding are declared sandbox policies.

Bound activated flat Power, Aptitude and percentage bonuses join the existing reconstructed Power ordering, feeding combat and whole-roster business earnings. Original activation prices, binding restrictions, base inherent effects, metamorphosis and exact production stacking remain excluded/unverified. Existing training/stage costs remain sandbox. Modal separates Training and Fellow bond. No external implementation code copied.

Validation:138 tests, typecheck/build pass. Source examples UR level5 flat125000, level10 aptitude10, star1 aptitude40; explicit unlock/activation, ownership, uniqueness, repeated activation, malformed/null saves, rebind persistence and old-rate settlement covered. Cold desktop full159-Fellow119-Family17-business71-bound-Familiar/14129-active-node sample11.7ms rate/14.1ms settle. Baseline unbound numeric outputs unchanged. Save schema10 and durable admission preserved; no physical iPhone claim.

## Familiar inherent binding bonuses (v31)

All71 pinned profile pages provide inherent ExternalAdd facts. Import per-profile values separately from progression nodes; no rarity-derived guesses. While bound, these flat/Aptitude/percentage/final-percentage effects participate in the reconstructed Power pipeline alongside activated nodes. Unbinding removes their contribution without changing stored Fellow stats or activated nodes. UI distinguishes base binding bonus from manual level/star activation. Existing unbound saves unchanged. This completes available calculator external fields, not the original Familiar system: acquisition, combat, metamorphosis, original activation costs and exact Power ordering remain unresolved.

Validation:140 tests/typecheck/build pass. Fenrir source example3M flat and15% final bonus verified with zero active nodes; unbinding/reload restores baseline. Full bound/trained desktop cold sample14.7ms rate/23.2ms settle; unbound numeric baseline unchanged. Existing assignment settlement and durable save checks remain passing.

## Inn service loop (v32)

Bounded comparison selected Inn over Expo/fishing: local SimGame1 rules establish gold station construction, blueprint upgrades, recipe development, stamina-based serial service, offline completion, finesse and manual deposit collection. Pinned public reference provides10 station guest gates and80 recipe station/guest gates. Recipe task entitlement is waived; actual listed gates retained. Station cap20 covers all imported recipe requirements.

New optional inn state stores stations/menu, stamina, blueprints, served/finesse counters, deposit and one bounded serial queue. Receive1/5/10 guests reserves stamina;10-second meals complete through ordinary settlement, including after reopening, and give50 deposit gold/1 blueprint/1 finesse each. All numeric service prices/rewards/durations are explicitly local sandbox balance. Build100*stationID gold, upgrade current-level blueprints, free stamina refill20. Full reward capacity is checked before admission; deposit collected atomically. No fabricated dish building modifiers, rating thresholds, special-guest rewards or probability table. Existing business income remains separate.

UI: Businesses → Inn service, paged Reception/Kitchen/Recipes/Rules.144 tests/typecheck/build pass: source gates, service boundaries, partial/reloaded queues, resource conservation, blueprint progression, invalid saves, duplicate collection and actual storage-refusal recovery. Full bound roster cold Node11.0ms rate/12.3ms settle, numeric baseline unchanged. No physical iPhone claim. Schema10 saves without Inn remain unchanged.

## Inn station gains and ratings (v33)

Community Inn_Restaurant revision282 supplies rating popularity thresholds/stamina caps and partial station gain tables. Explicit cooking-station mappings for recipes1–9 enable known finesse/popularity gains; unlock stations are not generalized into ingredient mappings. Missing popularity0 and missing finesse1 remain declared fallback, no interpolated original values. Queues snapshot gains at reception; older queues retain1 finesse/0 popularity, preserving prior rewards. Popularity tracks separately from served count and unlocks documented stamina capacities20–60. No retroactive popularity, guest/gift/medal grants or unverified dish-level bonus mapping.

Normal play shows useful reward/capacity values; detailed source and sandbox limitations live on Rules.146 unit tests/typecheck/build pass, including gain snapshots through upgrades, rating boundaries, malformed reward snapshots, safe capacity and legacy queues. Full bound roster cold Node19.5ms rate/17.2ms settle with previous numeric outputs unchanged. Small-phone browser validation recorded separately after completion.

Small-phone validation completed: isolated built-app Chromium375×667, actual UI service start, close all game pages11seconds, disable network, reopen from service-worker cache, finish exactly1 meal, collect50 deposit gold and reload offline without duplicate rewards. Screenshot inspection confirms modal layout and no horizontal page overflow; vertical modal content remains scrollable. Test uncovered Vary: Origin cache misses for precached JS/CSS; dedicated same-origin static cache lookup now ignores Vary. Re-run passed. Not a physical iPhone/Safari test.

## Workshop manufacturing (v34)

All50 products have readable APK Sales EXP, coin/second and duration. SimGame2 rules support material-consuming one-Fellow batches, continuous earnings, completion EXP,20% hot bonus and manual deposit/store. Optional workshop state stores supplies, deposit/wallet, per-product crafted counts, per-Fellow Sales EXP and one bounded noncancelable serial job. Whole elapsed seconds credit coins; each completed unit grants snapshotted EXP exactly once. Optional free finish accelerates only Workshop, not village time. Store connects collected coins to Skill Pearls.

Explicit sandbox policies: themed product-type mapping (original type field absent), one local supply per unit/free20restock, previous-product-one-craft unlock, deterministic UTC hot rotation,2000coins/Skill Pearl. Product effects/levels and evaluation odds remain unimplemented rather than invented. Local counters capped safely; full rewards admitted before spending. Unknown Inn popularity now reads 'not documented'; fallback finesse marked sandbox, preserving raw missing cells.

Validation:152 tests/typecheck/build pass, including matching policy, ownership, time/EXP conservation, hot snapshot boundary, batch/sequential equivalence, capacity, malformed completed jobs and actual storage refusal/reload.375×667 built Chromium Workshop UI passed start/free finish/collect/store/reload with isolated seeded setup and no horizontal overflow. Full bound roster cold Node23.9ms rate/27.9ms settle, numeric baseline unchanged. Not physical iPhone verification.

Cache regression retained: actual built-app375×667 offline page-close11s/reopen/deposit/reload Inn fixture passed again on this batch.

## Workshop policy isolation and Magic Farm (v35)

Workshop's theme-inferred type mapping is isolated in versioned workshop-policy-data.json. New jobs pin policyVersion/assignedType; existing v34 jobs implicitly use version1. Historical Sales EXP and crafted counts are independent of mapping and not rewritten. No supported Sales EXP spend/level table recovered; UI states it currently accumulates only. Source product records retain numeric evidence separately from local type policy.

Gap triage selected Magic Farm after comparing facility/core/navigation evidence.39 pinned public level1 growth times/yields now support sow→water→timed/manual harvest→Knowledge→plot expansion. APK gives10 Knowledge for sow/water/reclaim and2 per growth minute. Local policy: free seeds, optional maturation, once-per-crop watering, Knowledge credited at harvest using whole source minutes,100*plot-count expansion cost,6plot cap. Optional farm state stores crops/timestamps/watering/Knowledge/harvest counts. No guessed order payouts, Alraune exchange, plant Power/building effects or upgrade costs. Harvest inventory remains available for later verified orders.

157 tests/typecheck/build pass: known yield/time/Knowledge, timing boundary, watering once, expansion, no double harvest, invalid saves/caps, durable harvest refusal/reload, legacy Workshop jobs and unchanged earned counters. Broad performance benchmark not repeated because no new Power/rate loop changed; state validation stays bounded to6 plots. Phone/offline checks recorded after completion.

Built375×667 Chromium checks passed: Farm UI sow/water/explicit free maturation/harvest then network-off reload retained crops and Knowledge; Inn actual close11s/offline reopen/deposit/reload regression also passed. No horizontal overflow. Isolated browser data; not physical iPhone/Safari.

## Farm harvest reward use (v36)

Bounded source audit found original order→Morning Dew→typed Alraune essence→Fellow Aptitude semantics, but no order item/quantity/reward joins or numeric essence price/effect. New farm-order-policy.json explicitly defines LOCAL three-slot offers (one source harvest each),5 Dew/order,5 Dew/essence,+1 Aptitude within existing cap. Source essence names/types exported separately; no original order ID or formula claim. Saved optional farm.trade pins policy1, per-slot completion counts, Dew and essence ownership. Submission keys reject stale offers; crop debit/Dew credit and essence purchase/use admitted atomically. This closes stored harvest use and connects Farm to Power/combat/earnings. Knowledge retains finite local plot expansion; Workshop Sales EXP still only accumulates, with that limit explicit.

161 tests/typecheck/build pass: full crop→Dew→essence→Aptitude chain, matching types, cap preservation, stale submissions, malformed policy/counters, old-rate settlement and actual storage refusal preventing duplicate crops/Aptitude. PARITY.md in shared research is the single current coverage matrix, distinguishing complete sandbox loops from original-game fidelity. No broad unchanged benchmark repeated.

375×667 built Chromium full Farm UI sow/water/free maturity/harvest/order/Dew/essence/Aptitude/offline reload passed; type-mismatched essence correctly disabled. Original Inn actual offline page-close11s/return/collect/reload regression passed. No horizontal overflow; not physical iPhone.

## Local Workshop mastery
Optional per-Fellow version-1 mastery spends a separate Sales EXP ledger: next tier costs 100 × tier, capped10; +10% base Workshop coins per tier for new jobs only. Earned EXP remains unchanged. Legacy jobs retain base payouts. This is deliberately reconstructed balance, not recovered original Sales EXP progression.

## Exact-budget Fellow advancement
Level and supported talent upgrades offer one/five/max batches with live total costs and resulting level/Aptitude. Same existing curves and caps; no automatic limit breaks or spending. Batches stop before insufficient resources or missing source rows. Local core numeric curves remain reconstructed.

## Frontier campaign (local policy1)
After unchanged30 stages,12 encounters across chapters6–8 offer party/scout, distinct solo relay, and mixed siege waves. Type-matched leaders gain25% effective Power. Entry pins three Fellows; each wave saves, stale attempt/wave keys reject repeats. Final clear and all rewards admit atomically with capacity checks. Chapter finales feed limit breaks; repeatable legacy patrols unchanged. All new encounters/numbers reconstructed.

## Opening pacing and supply batches
Local training supplies offer1/5/25 exact-cost purchases; sandbox Aptitude offers1/5/max from owned pearls. No prices/effects changed. Resource/cap-aware previews and explicit spending reduce repetition. An unseeded deterministic earned-resource trace clears30 stages in111 actions and Frontier in191 total without elapsed-time advances or grants; this is not actual play duration or fun validation.

## Encounter preparation guidance
Blocked stage/wave details show affordable relevant training actions with projected effective Power, actual costs and resource sources. Ready encounters show no upgrade prompts. Frontier advice uses its snapshotted party/type/unused leaders; cap raises disclose separate subsequent training. Gold entry gates suggest actual collectible income. No balance/state fields changed; not a global optimizer.

## Character-first navigation
Fellow/Family collection opens in a separate six-portrait searchable dialog, joined-first with faded unjoined artwork and Family aggregate stats. Selection closes collection into full-art character detail; enlarged static-art view optional. Family Dates has its own subpage. Existing art IDs, recruitment, gifts, training and saves unchanged. This is a local layout adaptation, not animation or complete original village-map parity.

## Spatial village navigation
Five readable source building textures form two locally authored districts. Each landmark selects its corresponding business; Village menu retains all 17 businesses and facility routes. District and business selection survive modal navigation. Map coordinates and art-to-business matching are authored, not recovered original geometry. Save schema and economy unchanged. Portrait/landscape route, touch-target, overflow and offline image checks passed.

## Familiar sandbox Tower
Twelve authored floors:1–5 owned Familiars, Speed order, Rage strikes,15-round HP resolution. Existing public calculator stats reused. Enemy stats, Rage/damage, targeting/ties and first-clear Skill Pearl/Fellow EXP rewards explicitly local. Optional policy1 state stores team, cleared count, attempt counter and last fight level/star snapshot. Stale attempt keys and full reward capacity checked; save admission keeps rewards/clear atomic. Training/free recruitment remain available. No original200-floor, idle reward, unique skill or synergy claim.

Tower combat policy2 adds three pinned community active effects: Scruffpuppy300%ATK lowest-HP ally heal, Umbranther400%ATK two lowest-HP targets, Meerbaws320%ATK lowest-HP target. Existing policy1 reports without combatVersion replay unchanged. Original passive kits/unlock timing and local tie/rounding are distinguished. Other Rage strikes remain generic.

Tower policy3 expands to13 complete instantaneous source active effects with front/back and reproducible random targeting. Local row shape is first2/front + remaining3/back; empty rows fall back to living opponents. Saved formation can move a member to first slot. Policies1/2 retain previous skill availability and reports. Full pinned inventory now tracks71 profiles/186 skill nodes, simulator/display fields and effect groups; timed/stacking behavior remains unresolved.

## Farm source harvest schedules
All39 plants expose3 complete source time/yield rows. Free per-sowing harvest-level selection is local access policy, not verified permanent upgrading. New crops pin harvestLevel; legacy crops default to1. Harvest stock keeps existing plant IDs/order joins. Upgrade costs/passive bonuses remain unimplemented. Inn full90-row gate inventory found no nonempty character requirement and introduces no new locks.

## Character source skill guide
Pinned inventory293 source profiles/2,158 rendered nodes keyed by internalID; guide deduplicates exact ID+effect entries. Fellow Skills/Family Profile open a modal guide. Only matched default base talents route to existing bounded trainTalent costs; other nodes remain reference-only. Source basecaps do not widen supported caps or grant costumes. Farm schedule comparison shows all3 yields/time/rates, disclosing free maturity tradeoff. No new progression formula or save schema.

### Alraune batch exchange and use
One, five or maximum essence actions retain local 5 Dew per essence and +1 Aptitude per matching essence. Plans stop at available balance, storage and Aptitude 1000; old one-item calls and saves remain supported. Original material types/+1 descriptions are known; explicit material quantities/full skill curves remain unresolved. Batch storage failure leaves the entire action uncommitted.

### Type Insight I progression
Exact default skill IDs join five typed APK materials with community cost/effect rows1–30 (100 matching Insight→+1 Aptitude per level). Per-Fellow levels and shared typed balances persist in optional Insight state; existing Aptitude is preserved. Free1000 typed supply is local acquisition. Only default tierI is enabled; higher tiers, costumes and post30 costs remain outside scope. UI in Fellow Skills and matching skill-guide entry. No original version-matched numeric table is claimed.

### Expanded assigned Operations
Reir Inspiring30% and Pump Unfettered30% now apply when assigned to matching businesses. At Fellow50 they gain20% specifically at Scroll Shop/Spring Resort. Their typed30% at200 is recorded but unreachable under local level60 cap. Existing Fifi/Amaterasu unchanged; summed scopes are local additive policy. No Study Notes spending added. Exact semantic SkillBase joins and ambiguous Extra suffixes are documented in shared research.

### Fishing sandbox first loop
Village menu→Fishing opens Cast/Tank/Research/Rules. Three source Village River species (Aquafrog F1101,Snakehead F1102,Carp F1103) rotate under explicit local policy. Free20bait,1bait/cast; immutable catch snapshots, first discovery and duplicate identity; display enables source normal Power base/step, duplicate research funds local level3 upgrades. Return to collection pauses bonuses as local removal semantics; skill/discovery persist. First catches never consumed. Stale casts/research blocked; normal persistence admits entire action only after save. Source catch odds/lengths/crowns/antiques/combinations and full87-profile coverage remain unavailable. Local1000catch archive cap.

### Fishing expansion and retained history (v55)
86/87 pinned profiles now have playable complete normal effects:35 flat Power,15 percent Power,36 Aptitude. One daily-crystal quantity is missing. Casts rotate through freely chosen source-listed grounds using explicit local policy2. Crown/length/odds/removal evidence unchanged. Old policy1 catch snapshots remain intact. New policy2 snapshots include full scope and effect values, never recomputed from updated catalog. No1000catch cutoff or2MB import cutoff; device save failure retains old durable state. A single cached index per immutable Fishing state supplies collection, research and bonus aggregation. All research receipts retained; validation is linear in history. Power composition and removal remain disclosed local choices.

### Fishing source art and save admission (v56)
All87 fish prefab IDs resolved through readable CAB/material references to local textures, rendering baked static poses;86playable species use these in latest-catch and tank views. No guessed Spine ordinal or animation claim. Save JSON admission checks32MiB transport size before file reading,64-level structure depth before parsing,then village validation. Existing10kcatch2.41MBhistory still imports; no catch count ceiling or truncation. V1/v2 snapshot authority tested with distinct fixture values through display/research upgrade/removal/redisplay. Storage failure/retry remains covered by retained-history tests.

### Guaranteed Kohaku crown connection (v57)
Readable Item_Fish_F9402_Crown explicitly grants Gold Crown Kohaku; source Koi Blessing. One free local acquisition records policy3 catch/source-item/normal+crown effect snapshots. Placement then crowning activates the pinned base All Fellow Power+2% crown skill; normal All Aptitude+3 remains separate. No random crown odds or length inference. Crown skill upgrade costs/Crown Points absent, so no upgrade or ordinary duplicate-research conversion for this grant. Old v1/v2 catches stay normal and preserved. Crown removal/redisplay follows existing local display-only bonus policy.


## Mushroom Expo — v58
35 pinned community stall identities/normal bonus curves and100 stage rows imported with source hash. First five unflagged stages playable: free stall claim → unique Fellow staffing → five local customer visits → correlated clear/reward save → next stage, Expo Coin stall improvements and Skill Pearl Bag transfers. Customer waves/rounds/mismatch/initial rating, free sequential access and100-coin upgrade cost/local level10 cap are reconstructed, not production formulas. Source typed thresholds seed local picky visitors. Other reward identities remain in a dedicated locker. Stage6+ flags, special buffs, duplicate costs, gacha, timed income and Expo-level curves deferred. Optional save state; immutable run inputs and stale keys; no Fishing receipt/import-limit changes.

## Expo named bonds — v59
Twelve explicit named-Fellow stall bonds (eleven Fellows) join local Towerskill descriptions and Hero:name IDs to pinned community10%/25% amounts. Sixteen faction bonds remain deferred. Future policy2 runs snapshot skill/Fellow/percent or null; policy1 ongoing runs/clears retain old no-bond sales. Final multiplicative bond stacking is local. Staffing selectors and deployed/current-run views show actual Sales Ability and matched bonus. Same2500Power Pirate Pub operators produce2690 vs2959 Sales; five-round14000 visitor funds fail vs satisfy. Stronger nonbonded operators and goods mismatches remain meaningful. No new stages, flags, stock or Apothecary recipes/rates inferred.

## Fishing combinations — v60
Pinned hub34 explicit member lists/effects; five complete normal All Fellow Aptitude/Power sets implemented: +25/+5 Aptitude and +25/+40/+5%Power. Free explicit activation requires all member catches; permanent independent activation after tank removal is a local eligibility/permanence choice. No upgrades or crown combinations. Snapshot members/name/effect/time, preserve existing receipts and normal/crown/research balances; no automatic old-save bonuses. Effects use existing local Fishing stacking/order and settle prior income first. Ongoing Expo inputs unaffected.29 other normal combination effects deferred until destination/units support is verified. Expo faction, stock and later flags remain unjoined; five-stage scope unchanged.

## Fishing dating bonuses — v61
Two explicit normal combination effects connect to family[datedID].points (the currency spent on blessings), not Intimacy/Blessing Power or Everstead ledgers. Each10%; local additive20% stacking, floor after applying percentage to current blessingPower. Existing1e9 cap retained; actual credited points reported. Single date and auto-date share dateReward; auto-date remains one persisted transaction with fractional Energy preserved. At cap, zero-credit dates still use Energy/count as before. Activation policy2/datePoints snapshot only affects future dates; five normal stat combinations remain policy1. No direct gift/item multiplier or global Fellow Power change; all catch/Expo history preserved. Seven supported normal sets of34; crown and27 other effects deferred.

## Fishing employee bonuses — v62
Five typed normal+5 employee combinations now use employees × (source per-employee base + matching fish bonus), plus unchanged roster Power/1000, then existing assigned Operations once. Local UI multiplication and independently reported12497×(1+15+2)≈225k support per-worker units before outer bonuses; community evidence, not version-matched server math. Scope comes from source business.type, never assigned Fellow identity. Unknown Airship/Magic Academy types and three legacy businesses excluded. All Building Earnings+1 stays deferred. Policy3 employee activation snapshots type/value; old earnings settle before activation/hiring/assignment.12 normal sets supported of34; crown/22other effects deferred. Breakdown shows base+fish per worker and workforce total; no date/Fellow Power leakage.

## v63 School education connections
Ten normal Fishing combinations add five typed10% and five all-pupil15% modifiers to future shared Fellow EXP education awards. Policy4 activations pin scope and quantity. Local additive stacking, rank×10 base, floor per award then batch count, cap1e9. Manual legacy faster methods retain one award per action; batch/finish pay per completed lesson. No change to pupil progress, graduation income, item EXP or current balances. Sex/crown effects and ambiguous All Building Earnings+1 remain deferred. Evidence and gap comparison: research notes/school-fishing.md/.json.

## v64 Named artifact Echo progression
33 exact local item→HeroSkill→Hero name joins,32 available in current roster. Matching equipped artifact enables optional policy1 saved Echo quantities; inventory/wrong Fellow gives zero. Source fixed aptitude/Power amounts, local additive Power stacking and explicit migration opt-in. Existing70 Ore/+7 level rows, level20 cap, per-copy investment transfers/refunds unchanged. Family support artifacts, auras, Materia and ascension remain deferred. Exact eight opaque config candidates recorded in research; none decoded. See notes/artifact-echo.md and artifact-chain-local.json.

## v65 Family-supported equipment
Diablo/W145,Shuna/W144,Rica/W252 exact skill prerequisite IDs. Any wearer receives corresponding item bonus only while required Family owned and policy2 activation saved. Named Echo policy1 unchanged. No aura or guessed name matching;252M1 not252. Equipment shelf wording updated. v64 portrait/landscape actual equip→enable→wrong-owner upgrade→offline→correct-owner refund UI path verified before this extension.

## v66 Village Stories
Village menu and character shortcuts open a paged storybook for36 complete original encounters/411 lines. Source text/speaker overrides unchanged, static owner art; no original chronology/voice/branch/reward claim. Optional policy1 story bookmarks and persistent read markers, stale-step refusal, replay without economic rewards. Earlier protected/runtime licensing and incomplete Opening graph boundaries documented in notes/storybook.md.

Family scenes v67: exact current art/model joins admit116 of119 current Family portraits (109 external,7 embedded). Source shared profile/date backgrounds, static fallback for unknown/standalone paths; no original dynamic scene assignment inferred. Date rewards, story/save state unchanged.

Inn special guests v69: five source-gated one-time meals (rating, developed dish, optional Maxim)→ready treasure→explicit collection→typed employee bonus. Existing service queue/timer/rewards retained; optional receipts and specialGift marker preserve offline completion and duplicate protection. Local arrival/daily-limit waiver and cross-source rating adapter; no Gratitude upgrades. Claimed percentages snapshot, no retroactive income.

Inn/School v70: Noble Lamp and Hunter’s Hat extend exact source guest gates to7 treasures. Policy2 kind/amount receipts preserve policy1 employee effects. Lamp adds500 after local future graduation formula; Hat adds100 once to a nonempty one-lesson Teach all round after individual Fishing awards. Point cost per unfinished pupil, require whole-group budget, shared XP cap. Existing single-pupil rewards and alumni snapshots unchanged; Gratitude upgrades remain unknown.

## v92 Insight advancement
158 mapped Fellows can explicitly study default Insight I through45 using complete community rows (revision5788). One/five/max affordable buttons share typed stock and apply per-Fellow Aptitude, preserving legacy progress. Stops at45 or sandbox1000Aptitude. Kamakura type unresolved; higher-tier costs/effects excluded.367tests, typecheck/build and fresh portrait/landscape offline close/reopen pass.

## v93 Mine Clearance
Eight community encounter rows with exact per-encounterPower/Gold/EXP/MineCoins. One owned Fellow/day, persistent daily damage and overflow, UTC reset are explicitly local combat policy. Daily defeated encounter pays once; no replay/firstclear duplication. Optional mineClearance state retains participation/damage/reward/exchange receipts; fixedpolicy1thresholds, historic prices/rewards retained, sequence+day staleguard. Source300MineCoins→1MagicOre/5daily goes into existingEquipment. No duplicate mine module found. Other energies/snapshots unchanged. Unit tests cover fresh freeRani/Stella earned route4days→14Ore→10Oreupgrade, weak damage, repeats/midnight, shop/cap, failedfinalsave/retry, malformedreceipts and independentenergies.374tests pass; phone validation described in shared research.

## v94 — Default Fellow advancement

Default Insight I supports level 300 at 100 matching books / +1 Aptitude per level (30,000 total from level zero), using the separate explicit community mastery statement in Aptitude revision 3892. All 158 exact default-skill joins remain; Kamakura is unresolved. Talent eligibility now uses exact unambiguous default skill IDs instead of rarity: 158 Fellows (20 Ordinary, 28 Outstanding, 110 Supreme), adding 62. Paid talent caps remain 12/20/20. Higher Insight tiers are excluded.

Preserves the local 1,000 Aptitude ceiling, free supply, legacy levels/Aptitude, old-rate settlement and immutable encounter/reward records. Capped effects spend nothing; failed persistence does not admit a batch. 380 tests, typecheck and build passed; strengthened settlement test also passed. Fresh portrait/landscape Chromium earned two Banquet Pearls, trained Liona, saved Insight 45, reopened offline, trained to 300 and reloaded identical state; no seeded saves, clock overrides, console errors or overflow. Physical iPhone/Safari not tested.

## v95 — Elise Stella
Elise hero_190 has20 exact community paid rows,1500fragments total, own flatPower500K→15.3M and all-Inspiring5%→62%. Separate `private-elise-stella-activation-v1` is authored free zero-bonus activation; no unverified2% propagation. Existing three40-level owners and old receipts remain. Latest typed percentages sum once under existing local Power order. Owner-specific save caps20/40 and144combined receipt capacity. Full383tests/typecheck pass, including full four-owner mastery, all159type scopes, legacy and failed persistence, old-rate and pending encounters.
Fresh375×667 and667×375 Chromium: recruit Elise→activate zero-bonus→S5→offline close/reopen→S15→S20→reload;1500spent/500remaining from2000free supplies. Screenshots reviewed, no errors/overflow. Physical iPhone/Safari unverified.

## v96 — Familiar support combat
Seven whole community active kits add regeneration, targetMaxHP healing, selfMaxHP shielding and lowest-HP% targeting: Forestme,Nestsparrow,Furcrab,RollingBeetle,Ness,Slumberbear,Happy.50/71active coverage, not complete Familiar parity. New isolated combatVersion6: damage-over-time→regeneration→expiry, no cast-round tick or resurrection; ATK amounts snapshot caster, MaxHP uses specified recipient/self; heal capped to missingHP; same-source refresh; lowest-HP%ties use slot. Timing, stacking, rounding and unlock access are authored. Versions1–5retain identical replay fingerprints and receipt behavior.389tests/typecheck/build pass, including wholekit targets, numeric bases, full-health/dead-target cases, shields/refresh and failedwrite recovery.
Fresh375×667 and667×375 mobile Chromium: free welcome/train Forestme,DreamEater,Slumberbear→6round victory with positive regeneration/shield absorption→4Pearls/500EXP→offline page close/reopen identical report/rewards. No seeded saves/errors/horizontal overflow; screenshots reviewed. PhysicaliPhone/Safari unverified.

School maturation: community School oldid811 adult thresholds C36/B-45/B60/B+84 use saved lesson progress. Text stages and point-consuming next-milestone teaching preserve current grades/rewards; D/legacy have no inferred adult stage. No original art mapping or save migration.

Tower combat v7: 25 complete P1 self ATK/HP/SPD passives at source stage2 (existing local level50 stage policy). Battle initialization only, floor once before existing temporary modifiers; P2/P3 excluded. Display, binding and historical combatv1–6 unchanged.

Optional trainingCosts.policyVersion2 uses recovered APK1.7702 current-row HeroLevel EXP costs for future levels1–60, preserving baseline levels and immutable training receipts. Existing curve remains before explicit activation. Original quality/cap/Power migration is separate.

Original growth policy1: single Training Rules opt-in upgrades EXP-only mode to source starting Aptitude/coefficientADH and quality caps100–750. Existing gains/bonuses compose under retained local pipeline. Current-row crystal costs, quality Talent as total, conserved optional supply stock and quality receipts. Legacy levels/tokens/EXP receipts preserved; no original full-server equation claim. Free10MEXP/100eachcrystal and Quality1entry are local.

v101: unified APK growth expands exact matched default Talents to299 paid upgrades (compatibility source positions1–300), with recovered1/2/3 Pearl costs and incremental Aptitude. Old paid counts/gains remain, future purchases carry checked receipts; source initial skill effect is not granted again. Quality/Family/other extra cap properties are not inferred; saved Aptitude1000 remains. Legacy mode retains12/20caps. Generic skill and other Power stages unchanged.

v102: unified APK growth uses recovered current-level Family blessing costs/effect increments through700 for flat/advanced tracks. Each first new purchase freezes earlier levels, values and recipients; future gains use snapshotted default ungated APK recipients. Initial0→1 retains the existing private purchase policy. No Skill3, spirit gates, regional/custom targets, date-income changes or global Power rerouting. Intimacy/BlessingPower/spendable points remain distinct.

v103: Special Blessing requires both earlier tracks700 and explicit free sandbox activation (original activation price unresolved). Recovered skill3 current-row costs1–699 and total2×level Aptitude feed only the external Family coefficient, not saved Fellow Aptitude or flat Power. Exact ungated source recipient snapshot; no spirit activation. Separate sandbox button fills selected Family points to1B, leaving Intimacy/BlessingPower intact. Sequential receipts/frozen encounters preserved.

v104: future staffing additions in APK growth retain a snapshot of existing employee count/base rate; only added employees use literal BuildingBase yields. This resolves90120/local50 and140150/local20 without reducing past cohort income. Direct free hires and Hire Cards share the rule. Fishing additive per-worker and Inn percentage apply once across both cohorts.5000cap/free hiring/slots unchanged; independently verified paid quotes and source quality progression are not yet enabled.

## Optional cosmetic wardrobe policy 1

Readable ClothesManager separates ownership from curOutfit; full unlock/upgrade debit, effect stacking, base-reset sentinel and acquisition transactions are unresolved. The sandbox stores optional wardrobe {policyVersion:1, owned:{costumeId:{collectedAt}}, equipped:{ownerId:costumeId}}. Explicit free collection requires the exact owned actor. Equip requires collected exact-owner costume and an admitted render; reset removes that owner's equip entry without deleting ownership. No stats, currencies, tokens or collection rewards change. Score is derived once per unique owned costume from collectionScore. ClothesCodex reward joins remain unresolved; no grants are inferred.

Date pictures retain their separate discovery ledger and successful-date admission. Explicit type2 and exact matching costume/Family ownership plus Intimacy admit 57 additional source-linked routes. Current equip is irrelevant by local policy. Missing type on Wife111C2_DateDialogue1 is not inferred, and no item/alias/special gates are weakened. The existing ordered one-picture-per-date selector, seen/replay and write-before-admit persistence remain in force.
