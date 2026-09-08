# Isekai — Private Village

First independent single-player slice for an iPhone Safari Home Screen app. Original extracted scenery and a rendered Kaity idle loop accompany newly written game rules. This is not the original client or a full recreation.

Collect fish-stall gold, upgrade Kaity to level 20, and return to saved progress. Away earnings stop at eight hours. No gameplay requests leave the device. The private hosting service requires online access/sign-in for initial delivery. The service worker precaches the complete build; the app confirms cache completeness before declaring offline readiness.

On iPhone: open the private URL in Safari, Share → Add to Home Screen, open the installed app online, then wait for “Ready for offline play” in save settings. Close, enable airplane mode and reopen to validate on the actual phone. Safari and standalone storage may differ; use export/restore to move saves. Clearing website data removes saves and cached files.

Development: pnpm install; pnpm dev. Validation: pnpm test; pnpm build. Static output is dist/client. No external fonts, CDN scripts or game APIs. Tests cover upgrade serialization, clock changes, reward duplication, malformed saves and service-worker offline cache behavior using a simulated network. Physical iPhone installation has not been tested.

## Art provenance

Assets come from the user's local Isekai files in Desktop/ISEKAI. Scene_MainCity_Backround_1_New and Scene_MainCity_Building_2_1 were read from unprotected Unity asset bundles. Kaity is hero_15 from the existing character_asset_exports catalog; the Idle track was rendered to 48 frames over approximately three seconds in the local evaluation viewer. The published build contains rendered WebP art, not the Spine runtime. Icons use a frame of that render. No protected Lua/protobuf contents were decrypted or used. Character name/title are from the user's local character metadata. Building purpose, economy and progression are new prototype choices.

Keep the project private. Further gameplay, characters and original-system fidelity remain future work.

## Village expansion (save version 2)

Three recruitable Fellows: Kaity, Fifi and Augustine. Recruitment is free, deterministic and duplicate-free. Three businesses can be opened, assigned one Fellow each, and improved up to level 10. Moving a Fellow vacates their old job. Every Fellow starts with the same level-based earning rate; each business level above one adds 20% of base earnings. This is the sandbox's own balance, not recovered production rules.

The original save key stays unchanged. Version-one saves migrate their gold, Kaity level, pending income, statistics and last collection time; Kaity remains assigned to the fish stall. Before the first migration the app retains the original raw save under the same key plus `-backup-before-v2`. Exported version-one backups can also be restored. The offline build updates on reopening online; after its new worker activates, close and reopen once if the old screen remains.

`catalog.mjs` defines currently playable content. `source-character-index.json` inventories 311 local character records (including source IDs, category and art groups); it is an authoring index, not a promise that every record has validated art or gameplay. Character IDs are stable and separate from costume IDs. Ownership and levels use dictionaries keyed by those IDs, so adding the next verified batch does not reorder or overwrite existing progression. Before extending the roster, update validation and test a previously exported save against the enlarged catalog.

Family progression is reserved separately from Fellow jobs. The planned first family loop is welcoming residents, visits and bond levels, followed by household bonuses. Families will not consume business job slots. Future relationship definitions should reference IDs, with missing references checked during content validation. Large animation libraries should use optional, explicitly downloaded content packs with per-pack offline readiness; the small initial roster remains fully precached. Do not load all future artwork eagerly on a phone.

Fifi and Augustine portraits are static renders from unprotected local skeletons hero_01 and hero_105 in the existing evaluation viewer. Kaity retains her rendered animation. No Spine runtime is shipped.

## Family and Journey expansion (save version 3)

Charlotte and Epona have independent Intimacy, Blessing Power, Blessing Points and a provisional earnings skill. Five original named gifts use verified +1/+2/+5 effects. The gift bag supports consumption and gold purchases. Random dates consume recovering Energy and award points to the selected family member. Seven one-time milestones award items, gold and Rank EXP; rank raises the Energy cap. Settings offers an explicit repeatable sandbox gift/energy grant. Numeric settings beyond verified gift effects are local balance, displayed in the Family panel and documented in SYSTEMS.md.

Previous versions migrate without losing gold, Fellows, jobs or building levels. Migration stores the previous raw save under `-backup-before-v3` before replacing the main save. Source version-three validation rejects invalid inventory quantities, duplicate claims and malformed family stats. New tests cover migration, consumption, random selection, recovery, point spending, rank rewards and save round trips.

Family portraits are static local renders from wife_02 and wife_03. No family animation runtime, production connection, protected script or protected protocol is included. Family relationships, pupil education and original affinity skills remain separate missing layers; current Intimacy does not yet produce pupil rewards.

## School expansion (save version 4)

School enrollment, caretaker relationships, classes, Fellow EXP and graduation now run offline. Education recovery follows the verified five-minute rule; the School panel clearly identifies the local formulas and includes an optional sandbox refill. Graduation adds earnings and one Gold Ring exactly once. Family Intimacy now affects pupil rewards; a distinct relationship tier affects future pupils' Intellect. Fellow EXP is stored for the upcoming Fellow progression layer and is not yet spendable.

All prior save versions migrate, with an automatic `-backup-before-v4` copy. Export/import preserves school resources, active pupils, recent alumni, graduate count and lifetime graduate income. The latest 20 alumni are shown while lifetime earnings remain saved. Read SYSTEMS.md for verified rules versus local substitutes.

## Fellow training and Adventure (save version 5)

Levels now spend the Fellow EXP earned from school and stages. Independent Aptitude, skills, limit breaks and equipment feed Power and business earnings. Three named equipment bonuses follow readable item descriptions. Adventure adds a local 30-stage campaign, party selection, single-claim first-clear loot, crystals and repeatable EXP patrols. Bag & shop covers materials, equipment, gift counts and explicit sandbox grants. Four more Journey milestones integrate the new systems.

Schema-five migration retains all previous levels, EXP, currencies, school/family progress and claims. No previous levels are charged again. The automatic backup uses `-backup-before-v5`. The built app contains no remote game calls. See SYSTEMS.md and adventure-rule-evidence.json for original rules versus local formulas. Power-comparison battles are a first local resolver, not original combat fidelity.
