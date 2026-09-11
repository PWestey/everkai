# Isekai: Slow Life — event catalog for Everkai single-player adaptation

Research date 2026-09-11. Source: only the unprotected English translation TextAsset. No gameplay tables were read or decrypted, and nothing under Documents/Codex was touched. All numbers and mechanics below come from rule/help text or item names in that file. Its wording describes what the live service tells players; it is not verified server math.

## 1. Source and method

- File: `UnityDataAssetPack.apk` entry `assets/Android/config/logic/en/translate_v1_c9fd6a1e92f261ca0fa68d0f79049483.mmc` (4,479,585 bytes). The entry was not present in `isekai_inventory_output/`, so it was taken from the APK alone with `unzip -p`.
- Container: 32-byte `MOMCMX` zero-padded prefix, then a plain `UnityFS` bundle (format 8, LZ4 blocks, flags 0x243 = block-info-padding, **no** encryption header). It was opened with the existing `character-audit-venv` UnityPy 1.25.3 and `FALLBACK_UNITY_VERSION=2022.3.0f1`.
  - Note: a first attempt with fallback 2021.3.0f1 made UnityPy misread flag 0x200 as "encrypted" and suggest a key. That path was **not** pursued. With a correct post-2021.3.2 version the bundle opens with no key, which confirms it is unprotected.
- TextAsset `translate` → JSON `{"translate":[{"id","en"}...]}` with 239,580 records. **SHA-256 c884ee22dfd491ce0c700109f955465b34ef518f6e73d4132993e9d01f4d35bc**, identical to `localSha256` in `everkai/lib/business-data.json`. It is the same text already used for `family-rule-evidence.json`.
- Keys are `Namespace:field:id`, across 586 namespaces. The event-relevant ones used here:
  - `GeneralActivity` (505 ids / 197 distinct names: name, briefing, name_crossServer, rankDetail, exitNotice)
  - `MainUIGuideList` (main-screen entry buttons, 161 names)
  - `SystemUnlock:name` (153 feature/event unlock names)
  - `Rule:text:<Prefix>_<n>` (297 "Details" help pages)
  - `ExchangeactivityTyp` (event shop names)
  - `XServerRankType` (Ranking Rush types)
  - `ActivityBattlePass` (event passes)
  - `ActivityClassifiedSort` (Mega / Special / Regular / Ranking Event)
  - `Item:name` (currencies)
  - per-event namespaces (Gve*, ESC*, WaterFight*, Navigation*, PhotoGacha, CoopBoss, etc.)
- Everkai cross-reference: case-insensitive grep of `lib/*.mjs`, `app/*.tsx`, `SYSTEMS.md`, `README.md` plus panel headings. Hits inside `lib/original-content.mjs` that are only character biographies or item "source" strings are **not** counted as the event being present.

Status legend: **present** = playable local system; **partial** = related system or subset exists; **absent** = nothing beyond names in bios/item text.
MP legend (dependence on other players): none / low (mail, friends optional) / med (rankings) / high (teams, guilds, server boss, PvP, trading).

## 2. Completeness and confidence

- **Named-event coverage: high.** Every `GeneralActivity` name, every `MainUIGuideList` entry, every `SystemUnlock` name and every `Rule` prefix was enumerated and reconciled below. An event that has any player-facing name in this client build is almost certainly listed.
- **Limits:**
  1. Events added server-side after this APK build (text shipped later) cannot appear.
  2. A few entries are placeholders (`MOMOCA`/`Momoca`), for example `MonsterGirl_EN` "MomocaMusume", `LimitRankType`, `Embassy`, `Official`, `Kindred`, `PaintShop` (a paint event), `MetropolisEstate`, `GveCruiseCasino` sub-pages. Those are listed as unreleased/placeholder with low confidence.
  3. Mechanics are only as detailed as the rule text. Numeric rewards, drop tables (except Fountain of Wishes), and exact schedules come from text, not config.
  4. Region variants (_JP, _TW, _EN, _N1, _V2, _Rerun, _Day7) are folded into one entry.
- **"Special Event" is ambiguous.** It is both a category label (`ActivityClassifiedSort:2`) and the main-UI label of `ThirdPartyWeb` (an external web-store promotion). See 4.1.

## 3. Adaptation patterns (apply everywhere)

| Original dependence | Single-player adaptation |
|---|---|
| Personal/daily/cross-server ranking | Personal best + fixed reward tiers; "beat last run" ghost score |
| Team / guild co-op exploration, shared progress, marks for teammates | Your own 5-Fellow squad plus limited **Family assist** charges; guild progress → village milestones |
| Server-wide boss, last-hit rewards | Personal boss; finishing-blow bonus instead of last hit |
| Guild-vs-guild or PvP (Arena, Pirate Chess, Siege, top-floor PvP) | Deterministic NPC rival villages scaled from your own power history; or remove |
| Trading/swapping (stamp swap, bazaar stalls, Trade Fes pricing via others) | Duplicate conversion, NPC merchants with seeded price curves |
| Friends helping (Food Truck assist, chitchat joining, red envelopes) | Family/Fellow helpers with daily charges; remove envelopes |
| Paid bundles, passes, funds, crystal packs, recharge rebates | Remove; or convert into a free **Habit Pass** track fed by habit points |
| Gacha tickets from bundles | Tickets earned from habit completions and weekly life-area coverage; keep pity |
| Real-time stamina and scheduled windows (20:00–21:00) | Stamina granted by habits plus gentle regen; windows become "any time once per day" |

Habit tie-in principles consistent with Everkai's rule (multiplier 1.0–2.0×, never a penalty):
- Event currency accrual can scale with the current habit multiplier.
- Daily task completions grant stamina/tickets.
- Weekly life-area coverage unlocks zones/tiers.
- Weekly/Monthly reviews claim pass tiers.
- Missing habits never removes progress.

## 4. Catalog

### 4.1 Currently live events (flagged by user)

**Golemore Excavation** — ids `Coopboss`, rules `CoopBoss`, `HighwayBossNew_8-12`, namespace `CoopBoss` (2,000 "Golemore Giant" HP rows); unlock "Golemore Mines"
- Category: server-wide boss (daily scheduled).
- Mechanic: open daily 20:00–21:00. All server players deploy Fellows to "extract" the Golemore; each Fellow can be deployed once. The boss revives after a 30 s countdown and can be extracted again until the window ends. Rewards are Last Hit Rewards plus Rank Rewards, mailed after. Crystal Fragments synthesize the UR Artifact **Sapphire Crown** once; extras Awaken it. The push text promises a chance of UR Artifacts.
- Currencies/rewards: Golemore Gold Coin, Crystal Fragments, Sapphire Crown, rank rewards.
- MP: high (shared boss, last hit, rank).
- Adaptation: a personal nightly Golemore with a large HP pool. Deploy each Fellow once per day; the finishing blow grants the "last hit" chest; rank is replaced by personal-best damage tiers. Fragments → Sapphire Crown and awakening use Everkai's existing artifact upgrades.
- Habits: completing an evening routine or the daily review opens the dig. Each life area covered this week adds one extra deployment. Damage scales with the multiplier.
- Everkai: **absent** (Golemore appears only in Kuku's bio). Mine Clearance, its sibling, is present.

**Daily Wish** — `DailyWishGift_01`, unlock 163, shop `WishGift` "Wish Shop"
- Category: paid shop/bundle.
- Mechanic (item text only): Wish Coin is obtained by recharging in Daily Wish; it is spent to redeem chosen Family Members. A daily bundle also grants Wish Coin / Privilege Coin for shop rewards. No rules page exists.
- MP: none (paid).
- Adaptation: remove the paywall. One free "wish" per day when today's dailies hit a threshold, which grants Wish Coin; Wish Shop sells family fragments/acquaintance with pity. The Fountain of Wishes acquaintance flow could host it.
- Habits: all dailies done → 1 Wish Coin; weekly 8/8 areas → bonus.
- Everkai: **absent**.

**World Tree Cup** — `Navigation_01/02/N1/S1`, rules `Navigation`/`NavigationJP`, namespaces `Navigation*`; sibling **World Tree: Water Fight** (`WaterFight_01-04`, rules `WaterFight`)
- Category: team tower/floor climb exploration with events and top-floor PvP.
- Mechanic:
  - Team up during the teaming period (the first team is free, later ones cost Crystals).
  - Explore 5 areas: Flaming Jungle, Sandstorm Wastes, Mossy Wetland, Dark Forest, Top Floor. Stamina cost per step rises 1→5 by area; stamina regenerates 1/20 min; Energy Drink restores it.
  - Power = sum of Fellow Power. Encounters give rewards; hard enemies can be **marked** for teammates to assist, who earn score.
  - HP only drops when attacked by other players on the Top Floor; a defeated player returns to Dark Forest.
  - Pick Lunar/Solar Blossom Buds and open them with Lunar/Solar Essence.
  - Personal and Team Rankings.
  - Water Fight reskin: Beverage Gun weapons, Magic Spores/Bursting Pods, "PvP Courage" consumable, Personal Points.
- Currencies: Stamina, Energy Drink, Branch of the World Tree, World Tree Fellow Exchange Item, World Tree Cup Selectable Chest, World Tree Lottery / World Tree Souvenir lucky bag, World Tree Insignia; Monthly Event Card Bundle (paid).
- MP: high (teams, marks, top-floor PvP, team rank).
- Adaptation: a 5-Fellow squad climbs; "mark" spends a Family assist charge; Top Floor rivals are NPC squads seeded from your earlier runs; personal-best floor/score tiers; buds kept.
- Habits: each daily task = stamina; each new life area this week unlocks the next area; review completion = Essence.
- Everkai: **absent**. Familiar Tower and Frontier give related climb/combat code (**partial foundations**).

**Touno Island Story** — `ESCeremony_01/02` (v1) and `ESCReborn_01-05/N1-4/V2N1-4` (v2 "Sakura Festival"), rules `ESCeremony`, `ESCRebornMain`, `ESCRebornStamp`; namespaces `ESCeremony*`, `ESCReborn*`, `ECSReborn*`
- Category: festival exploration + collection (Mega Event) with rankings.
- Mechanic:
  - v1: stroll the festival (10:00–22:00) spending Stamina. Random chests, choices, fights and gifts; "chitchat" with NPCs gated by Power, yielding score, items and "intelligence". Unfinished chats can be joined by others after 5 min. Players drum together to raise Kagura Dance progress; the peak drummer gets an Amaterasu Fragment. Lucky Bag Coin draw; personal score ranking.
  - v2: stroll to stalls for stamps (Stamp Book, rare stamps). Festival Level gives Expansion Points to upgrade stalls; assign Fellows to stalls for Stamp Points, with rate by Power, which synthesize any stamp. Support Kagura's dance with Sakura Coins. Swap stamps with guildmates/friends. Total ranking by Sakura Coins (+ guild support value); daily ranking by Faith Value. Touno Island Insignia → character fragments in the exchange shop.
- Currencies: Touno Tickets, Sakura Coins, Sakuramochi, Touno Flower, Onigiri, Lucky Bag Coin, Touno Island Insignia, Heavenly Prayer: Touno Island Story Chest.
- MP: high (swaps, joinable chats, shared drum, guild support ranking).
- Adaptation: stamp duplicates convert to Stamp Points (no swap); personal Kagura progress; chitchat solo only; festival-level milestones replace rankings; Fellows staff stalls as in Everkai's Expo/Operations.
- Habits: one stroll per completed daily; stall types mapped to life areas (e.g., a Health habit boosts the sweets stall's rare-stamp odds); Weekly review = Kagura support.
- Everkai: **absent** (Touno appears in character bios and ten Touno family gifts only).

**Portrait Studio** (Sepia Portrait Studio) — `PhotoEvent_01-08/N1-8/rerun`, rules `PhotoEvent`, namespaces `PhotoGacha`, `PhotoLevel`, `PhotoTheme`, `PhotoGift`; unlock 83
- Category: gacha (no-replacement prize pool) + collection.
- Mechanic: spend Roll Film to shoot. The work runs in four stages: Character Selection → Scene Setting → Photo Taking → Boudoir Photo. Each shot removes its reward from the pool; drawing the grand prize grants all remaining rewards and advances the stage. The Photo stage gives a Family limited costume; the final stage gives a limited CG that raises that member's Intimacy and Blessing Power (viewable in Gallery). Themes rotate per run with per-theme progress; two-character themes need both; repeat shooting yields extra costume blueprints.
- Currencies: Roll Film, Exchange Voucher, Active Points; paid "Sepia Portrait Studio" shop.
- MP: none (paid packs only).
- Adaptation: already solo. Roll Film comes from habits; remove the paid pack; outputs join the Family gallery / wardrobe.
- Habits: 1 film per daily, bonus film for weekly review; a theme finishes in about one week of consistent play.
- Everkai: **absent**. Foundations exist in the family gallery and wardrobe panels (**partial**).

**Ranking Rush** (Time-Limited Ranking Rush) — main UI `TLTR2`, `TLRCross` "Cross-Server Ranking", `TLTR` "Time-Limited Task", unlock 39 "TLT&TLR", rules `Tlr*`, `XServerRankType TLR0101-1601`
- Category: ranking (growth sprints).
- Mechanic: over a window, rank by the **increase** of one metric versus the historical high: Stage Progress, Village Earnings, Guild EXP, Fellow Power, Family Intimacy, Pupil Earnings, Banquet Popularity, Crystal Consumption, Family Blessing Power, Inn Popularity, Trading Post Influence, Fellow Aptitude. Server and cross-server versions exist; tied bundles (e.g., "Trading Post Influence Bundle I–IV"). The companion Time-Limited Task (`TLTGroup`) has goals such as login days, collect Gold, hire employees, level Fellows, gift Family, educate Pupils.
- MP: med (pure leaderboard).
- Adaptation: a "Growth Sprint" with reward tiers at growth thresholds and a comparison against your own previous sprint of the same metric. Drop Crystal Consumption and Guild EXP; keep TLT goals as a checklist.
- Habits: each sprint is themed to a life area (Family Intimacy ↔ relationship habits, Pupil Earnings ↔ learning habits); habit completions during the sprint add sprint points on top.
- Everkai: **absent** (SYSTEMS.md explicitly omits rankings).

**Rissette Exclusive Fund** — `FirstRecharge03_1/3`, `ActivityBattlePass FirstRecharge03_Battlepass_01-04`; related `FirstRecharge02_1` "Rissette Ascension", `FirstRecharge_01/03` "Special Recruit", `FirstRecharge_02` "VIP Gift"/"Advanced Rebate"
- Category: paid fund/pass (first-recharge funnel).
- Mechanic: raise Rissette's Fellow level to claim fund rewards; the points track is "Fellow Level". The "Fund Rewards/Privilege Reward" tier is paid. First recharge of any amount grants gifts for 3 days.
- MP: none (paid).
- Adaptation: free milestone track "Rissette's Ascension": claim at level thresholds; no paid tier.
- Habits: fund "deposits" = completed habits, redeemable at each Rissette level gate.
- Everkai: **partial** (Rissette hero_308 exists in the roster; the fund is absent).

**Isekai Demon Hunter Arc** — `DemonSlayer` (crossover), rules `Explore_DemonSlayer`, `DemonSlayer_CG01`, `ThreeMatchBattleActivity/Stage/Enemy/Skill` "Demon Slaying Mission", `LinkageTaskPool`
- Category: crossover mega event (map exploration + match-3 battle + gacha + Power ranking).
- Mechanic: stamina exploration of an event map with story tasks. "Demon Slaying Mission" is turn-based match-3: a 5-character team, tile colors charge matching character skills, enemies act on countdowns. Featured Fellow Shinobu has Resonance and Origin Boost. Power Ranking; exclusive-character gacha with pity; event pass; exchange coupons; unobtainable after the event.
- Currencies: Demon Slayer Corps Gacha Ticket/Coupon, Pass Points, stamina items, Costume Blueprint Chest, emote stickers.
- MP: med (Power Ranking).
- Adaptation: **licensed IP — do not reuse characters or names.** Only the mechanic template is reusable: an original "hunter arc" with match-3 battles using owned Fellows.
- Habits: match-3 stamina from dailies; boss chapters gated by weekly areas.
- Everkai: **absent**.

**Special Event** — main UI `ThirdPartyWeb`, unlock 180 "Third Party Web Event", `GiftWeb isekaiweb_299…19999`, `ThirdPartyVoucher` "Recharge Rebate", chat frames sourced "Operation Event"
- Category: shop/bundle (external web-store promotion). Low confidence on the mechanic: the text only names price tiers and rebate items.
- MP: none.
- Adaptation: remove. Optionally reuse the "Special Event" slot as Everkai's rotating single-player event hub.
- Everkai: **absent**.

**Fountain of Wishes** — `BaseLottery`, rules `Lottery`, unlock 25
- Category: permanent gacha/wish.
- Mechanic: 1 Fairy Bottle per wish; 10 wishes cost 9. The rule text publishes the drop table (e.g., Acquaint Stone 0.1%, Basic Earnings Card x10 21.1%). One Fairy is released per wish, with 1 milestone reward per 500 Fairies; Acquaint Stone invites Fellows/Family.
- MP: none.
- Everkai: **present** (`app/fountain-panel.tsx`, `lib/fountain.mjs`: wishes, Fairy milestones, acquaintance).
- Habits (if extending): bottles from dailies are already the natural fit.

**Mine Clearance** — `Highway`, rules `HighwayBoss`, `HighwayBossNew(JP)`; currencies Mine Coin, Clearance Points; shops `highway_day/month` (paid)
- Category: daily boss gauntlet.
- Mechanic: originally 12:00–14:00, later all day. Defeat successive mine monsters for Clearance Points and items; each Fellow once/day; up to 5 guild Head Office Fellows usable; rare chests others can also open; exchange shop.
- MP: med (guild Fellows, shared chests).
- Everkai: **present** (v93: one owned Fellow/day, persistent daily damage, MineCoins → Magic Ore; guild parts removed).

### 4.2 Guild / team co-op "GvE" events (all high MP)

Common shape: a limited team or guild, a stamina map, a 5-Fellow roster locked at start with type-resonance buffs, in-event Power separate from normal Power, event pass (paid privilege), gacha with pity, insignia shop, personal + guild/team rankings, a Monthly Event Card Bundle. Unified adaptation: solo squad + Family assist charges, NPC rivals, personal-best tiers, habit stamina. Everkai status for all: **absent** unless noted.

| Event (ids) | Core mechanic (rule text) | Currencies / rewards | Notes for adaptation |
|---|---|---|---|
| **Cloud Kingdom Games** (`CloudKingdom_01-03`: Fifteen Trials of Heroes, Goddess Training, Snake in Home) | Team floor climb; pick 5 Fellows (locked); type count sets resonance; challenge "Star Player"; buffs/debuffs per floor; endless floors | Games Ticket, Event/Super Achv Points, Olive Branch, Dice Spirit, Divinity, Nut Bars, insignia | Pure climb → ideal solo tower season; habits unlock Divinity buffs |
| **Golden Realm Expedition** (`GveGoldenRealm_01-02`) | Same climb framework in a rainforest with Kuku the golemore pilot; patrons; altar | Golden Realm Trust Coin, Altar EXP, Selectable Dice, Boost Gems, Energy Corn | Kuku story ties to Golemore Excavation |
| **Purification of Frantic Forest I–IV** (`GveFranticForest_01-04`) | Guild explores; "heal" Infected/Frantic monsters (Healing Power = Fellow Power); guild boss, world boss (Masked Dryad), guild levels; ladder shop coins = 2.5% of personal score; Bells | Bell(s), Purify Points, Personal Points, Exploration Stamina, Dreamy Voucher gacha, Purification Insignia; Guild Recharge/Camp Investment (paid) | Healing theme fits habits well: healing power bonus from Health-area habits |
| **Penglai Immortal I–III** (`PLImmortal_01-03`) | Guild shared-progress exploration of levels; find Herb Spirits, cranes, caves, gourds; boss Ginseng Spirit; robots | Bamboo Ticket, Celestial Gourd, Immortal's Buns, buff cards (Double Damage/Points/Items, Free Explore), Penglai Insignia | Shared progress → village expedition log |
| **Aloha! Bubble Island** (`GveResortIsland_01-04`) | Guild dice board: spend dice to roam, trigger events, cards (Transformation, Guild Blessing, Like), laps, build resort; ranking by points | Dice/Super Dice/Selectable Dice Cards, Points, Like, Bubble Island Insignia, Lucky Bubble | Board game solo; "Like" from Family |
| **Savage! Inferno Rally** (`GveInfernoRally_01-02/N1`) | Team race through hell areas; boats/captains, weapons (temp +20% power), PvP courage, clear all areas | Hellfire/Soulfire, Demon Eggs, Double Voucher, Inferno Rally Insignia | PvP courage → NPC racers |
| **Casino on Yacht** (`GveCruiseCasino_01-03`) | Team explores yacht floors for treasure; cards (Wild, X-Ray), tools (Flashlight, Hammer), chips; endless casino | Chips, Roulette Ticket, Casino Insignia, Chicken Meal (stamina) | Gambling theme: keep deterministic/seeded |
| **Explore! Mines in Dungeon! I–IV** (`GveVeins_01-04`) | Team descends a dungeon mine; dynamite/acid weaken ores; endless veins; Beelsebub story | Pickaxe, Dynamite, Detonator, Acid, Lamps, Mining Voucher, insignia | Pairs naturally with Mine Clearance/Golemore as a "mine season" |
| **Time to Eat! Delicious Dungeon Quest** (`GveKingArthur_01-02`) | Separate exploration power; open equipment boxes for gear; stages; daily rank by boxes opened (personal and guild), overall by exploration power | Equipment Supply Box, Food, Stoneblade, gacha ticket | Gear boxes from habits |
| **Wealth from All Sides: Bazaar Mania** (`GveCoinFight_01`, unlock "Coin War") | Build/upgrade bazaar stalls producing Bazaar Gold Coins; Money Tree rank; slot-machine offerings to the Goddess of Wealth; Coin Thief/Hammer matches raid other players (victims lose nothing); daily rank by Offering Gems used | Bazaar Gold Coins, Offering Gems, Fortune Figurines, Money Tree Miniature | Idle stall layer suits Everkai earnings; raids → NPC bazaars |
| **Apothecary: Mentor & Apprentice** (`GveMedicine_01/02/RE01`) | Adventure Mode roguelite route choices; draw "magic shapes" (3-reel slot) for Power/EXP; Activity Mode after clear; Adventure Mode **remains permanently in the Apothecary**; overall + daily rankings | Magic Scrolls, Magic Elements/EXP, Verity's Textbook Fragment, Brewing Gacha | Everkai Apothecary exists (v107 recipe puzzles) → **partial** host |
| **Crimson Moon Fantasia** (`DemonCastle_01-02`) | Tile-flip floor exploration: tap tiles, fight monsters (tap = ATK, monsters hit back), traps, pickups, talents, seasons; overall + daily ranking | ATK EXP/HP EXP, Lost City parts/miniatures (museum exhibit), Bloodline Puppet, two gacha pools | Same engine as Northern Odyssey below |
| **March of the Northrealm** (`DJNorthrealm_01-02`) | Stamina stages reclaiming territory; reclaim buildings with Wage Attempts; Transcender Power multiplier formula; daily rank by Upgrade Silver Coins spent (personal and guild); overall by highest stage + stamina spent | Upgrade Silver/Gold Coin, Ascension/Boost Gold Coin, Energy Bowls, insignia | Building-reclaim map fits habit "territory" |
| **Dungeon Dev** (`RogueTD_01-03`) | Roguelike tower defense: place monsters in a backpack grid, repel adventurers, Main Quest (stamina) + Endless Dungeon (no stamina, points); monster den upgrades; guild exit lock | Dungeon Gacha Coins, Monster Fragments, Recruiting Tickets, Simulation Pack (paid BP) | Fully solo-capable; rank → endless best |
| **Guild Trade Festival** (`TradeFes_1-3/N1-3/S1`) | Travel between cities with Trade Permits, buy specialties, sell where short; guild bulletin board shares prices; guild rewards for sharing | Trade Permit, Gains from Festival, Trade Gifts, Trade Fes Lottery, insignia; Guild Recharge (paid) | NPC price curves; "bulletin" = Fellows scouting |
| **Let's Fish, Fishaholics!** (`TeamFishing_1`) | 4-player timed co-op fishing, two stage objectives, windows 10–14 / 19–22 | limited rewards via reward chances | Solo with 3 Family anglers; Everkai Fishing **partial** host |
| **Profiteer Card** (`BombCat_1/2`) | 4-player card game, 41-card deck (Profiteer = lose, Expel, Reverse, Skip, Shuffle, Divine…); first game vs NPCs; victories rank | achievement rewards → gift vouchers | Already has NPC mode → easy solo vs Family NPCs |
| **Pirate Chess** (`PirateChess_01/02/_2Hour`, rules `GvGChess`, `PirateChess2Hour`) | Guild-vs-guild board of up to 16 guilds; occupy Resource Points connected to flagship; Champion/Casual groups by guild Power; weekly grouping/prep/battle | Action Card, Pirate Chess Chest, titles, frames | GvG → remove, or solo territory puzzle vs NPC fleets |
| **Siege Warfare (~Showdown~)** (`SiegeWarfare_01/_Low`) | Guilds hold bases on a Drakenberg battlefield; points at daily settlement; 16-guild brackets | titles, frames, insignia | Remove or NPC map |
| **Sandtopia Pilgrimage** (`GuildWar_01-03_6d/7d`) | Guild war in 3 phases: explore oases for materials and upgrade sandships → race to Torches → final match; members locked in guild | Prisms, Hourglass, Compass, Glory | Remove; a solo sandship voyage is possible |
| **Magi Challenge** (`ResidentGBoss_Force`) | Mon–Fri guild boss with difficulty modes chosen by elite members; dispatch Fellows; schedule next week | Challenge Coins, Costume Blueprint Chest | Weekly personal boss tied to weekly review |
| **Adventurer's Guild systems** (rules `Guild`, `GuildBoss` Large Commissions, `GuildChamber` Head Office, `GuildGift` Activity/Luxury chests, `GuildIndustry` Random Quests, `GuildRecharge`, `CrossGuild`, `Guild's Sponsorship`) | Donations, guild coin, team-power commissions, pooled building-earnings bonuses, weekly activity chests, cross-server guild ranks | Guild Coin, Guild Wealth, chests | Replace with a "Village Council": pooled Fellow assignments = existing Operations; weekly chest from habit stamps |

### 4.3 PvP / competitive

| Event | Mechanic | Adaptation | Everkai |
|---|---|---|---|
| **Drakenberg Arena** (+ Familiar Theme) (`DrakenbergArena_01/03`, `DrakenbergArenaPet_01/03`) | Qualifiers with default lineup, points by rank gap, top 32 → bracket, 3 squads, best of 3; Support Shop; Figures "The Strongest Tamer"/"Will of Protection" | NPC ladder from seeded rosters | absent |
| **Drakenberg Challenge / Dungeon tower** (rules `Moving`, Dungeon Coin; unlock "Drakenberg Challenge PVP") | Climb floors by defeating players; swap floors with defeated opponents; daily progress reward; Dungeon Coins shop | NPC floor-holders; daily mail → daily claim | absent |
| **Trading Post Negotiations** (rules `CommercialWar`) | Up to 6 Fellows per negotiation, energy/cooldown, Motivate with Gold, Influence +2/−1 vs opponents, reports | NPC merchants | **partial** (`app/trading-post.tsx` "Private Trading Post") |
| **Archdemon Challenge** (`WeekBoss`, unlock 137) | Rotating Archdemons, one challenge each per day, two rounds/week, Fellow once per round, type bonus; daily leaderboard | Emblem chests (Brave/Diligent/Informed/Inspiring/Unfettered), Shelter Runes | absent; good fit: type emblems ↔ life areas |
| **Hall of Fame** (`RichManPalace`) | Celebrate top "Prominent" players daily for a blessing | Replace with celebrating your own past milestones | absent |

### 4.4 Crossover (collab IP) mega events — mechanics reusable, IP not reusable

All share the same frame: free or gacha featured SSR→SSR+→UR★/LR character with Resonance/Stella/Origin Boost, stamina map exploration or minigame, sparring or match-3 battles, Power Ranking, event pass, exclusive gacha with pity, coupon exchange shop, "will not return". MP: med (ranking). Everkai: **absent** for all.

| Event (id) | Gameplay core |
|---|---|
| Isekai Demon Hunter Arc (`DemonSlayer`) | see 4.1 |
| Encounter in Another World (`DanMachi`) | dungeon exploration helping lost adventurers; Expo tickets; Hestia family |
| Fight! Magic Academy Sports Day! (`FairyTail`) | game-board exploration, free Natsu, Sports Day ranking |
| God's Blessing on This Laid-Back Isekai! / KONONON! (`Konosuba`) | match-3 turn battles "Adventure", story + challenge stages, sweep |
| Mushoku Tensei and Magic Creativity Show (`Mushoku`) | exploration + **Sparring Challenge** (8 sequential opponents, daily HP carry-over, reset next day) |
| Camping with A Slime S1/S2 (`TenSura`, `TenSuraS2`) | exploration + Sparring Challenge; camping familiar lottery |
| Kawaiimush (`Sanrio`) | amusement park board exploration, costume gacha |
| Café LycoReco Crossing into Isekai (`LycoReco_01`) | Dessert Food Truck (friend assist) + power ranking of featured Fellow |
| Dragon Maid on Hiemspresent (`Maidragon_EN`) | clean up an abandoned park, gather materials, decorate a party venue |
| From Old Country Bumpkin to Master Swordsman (`Blademaster_JPTW_Day14`) | Action Power dispatch of all Fellows to commissions with 3-attribute scoring, Adventurer Team EXP |
| Hanamiya Rica Special (`HanamiyaRica_01`) | Streamer Stamina, assign Fellow teams to streaming tasks by attributes, fans/Stream Level |
| Super Star of Light and Shadow (`Hashimoto_*`) | stamina opera performances (match-3 "Gabrael's Tour"), Tour Points; likely a real-person collab, avoid |
| MomocaMusume (`MonsterGirl_EN`) | placeholder text only |
| Return to Isekai (`LinkageRecall`) | returning-player collab recall gacha and monthly card |

Reusable solo templates: the **Sparring Challenge** (8 opponents, daily HP carry-over; a great habit-day loop), **commission dispatch by attributes** (Blademaster/Rica map onto Everkai Operations), and **match-3 turn battle**.

### 4.5 Original story mega events (single-player-leaning)

| Event (ids) | Category | Mechanic | Currencies | MP | Adaptation / habits | Everkai |
|---|---|---|---|---|---|---|
| **Northern Odyssey** (`Dungeon_1-4/Endless`, rules `Dungeon`) | tile-flip dungeon | Supplies (1/60 min) explore Northrealm; tap tiles, fight (tap = ATK, monsters hit back), signposts to next level, seasons with buildings (Tavern), talents | Supply, Northrealm Token/Specialty, ATK/HP EXP, selectable chests | med (ranking) | supplies from dailies; endless best | **partial** (`app/northern-panel.tsx`: Northrealm route, ice beasts, signposts, supply caches) |
| **Raphael's Stage** (`RaphaelStage_01/N1-N4`, rules `RaphaelStage_readme/advantageRule`) | auto-battler/management minigame | Stamina (1/20 min) performances; place fans/support items to raise Support Value → Heat Levels; Performance Points; Lucky Star gacha; ranking | Stamina, Performance Points, Wish Coins (converted), Stage Voucher | med | best performance tiers | **present** (`app/raphael-panel.tsx`, SYSTEMS "Raphael's Stage", 27 fans, 8 support items) |
| **Mushroom Expo** (`TowerDefense`, unlock 99; embedded in CountrySide/Anniversary/DanMachi "Expo") | stall management | Assign Fellows to stalls; Sales Ability = Fellow Power × stall bonus; customer needs; expand Expo level; gacha machine for shop models | Expo Coins, Expo EXP/Popularity, Satisfaction Cards | none | habit customers | **partial** (v58–59: first 5 stages + named bonds) |
| **Evil Dragon's Wedding Service** (`HeroOathEvent_*`) + **Fafnyria's Garden** (`KeepAnimals_03`) | character event + flower-growing | featured Fellow Fafnyria (Resonance, Stella → Family), power ranking; flower growth/pollination shop feeds gacha tickets | True Love Keys, Love Gacha Ticket, Bouquet, Flower Coins | med | garden grows with habits | absent |
| **Wine Goddess and Fine Vintage** (`Anniversary2Half_EN`) | character event | Dionysia SSR+→UR★, Resonance, minigame score milestones → tickets, power ranking | Grape Wine, Wine Goddess Gacha Ticket, Pass Point | med | — | absent |
| **Dash! Familiar Track & Field** (`DIYURPlus3_01`, rules `DIYURPlus3`, `DiceStrategy01`) | dice training sim | train Hattie's Speed/Force over training weeks for 4 races; dice-value events | Race Signal, Track & Field Ticket | med | **habit-perfect**: training weeks = real weeks; each life area = stat | absent |
| **Love Spell ~Black Cat & Mocktail~** (`Emiru_01`, rules `Activity2048_Emiru`) | 2048 merge minigame + character | mixology merge levels, skills per level, Emiru SSR+→UR★ | Tavern Ticket/Coupon, Enhanced ingredients | med | — | absent |
| **Mushroom Holiday / Mushroom Adventure** (`WifeGacha_01/02`) | fog-of-war map + Family gacha | choose one Family member (locked); map, story and pool follow them; fog clears as you move | Holiday/Adventure Stamina, Coins, Tickets | none | walking/steps habit reveals fog | absent (Family systems exist) |
| **Legends from Land of Sand** (`RD_01`) | gacha + expo tasks | fragments draw; items carry to next event | gacha items | none | — | absent |
| **Moonlit Chill Work** (`MoonlitEvent_01/02`) | composite: Demiplane Supply Station (gacha), Emma's Trade Post, Another Story (dice board) | Demiplane Gift Card/Vouchers, trade chests | none | shop from habit vouchers | absent |
| **Build! A Leisurely Countryside Village!** (`CountrySide_01_EN`) | composite: Special Expo, Draw, Fluffy Ranch, crop harvest points | Farm Ticket/Points/Voucher | low | farm harvest ↔ Magic Farm | absent (Farm present) |
| **Village Ceremony (1st–3rd Anniversary)** (`Anniversary_01/EN_02/EN_03/JP_*`) | festival composite | Ceremony Expo stages + Ceremony Photograph; bonded characters visit with gifts; Food Truck; Shop Investment (share trading 08:00–22:00); guild ceremony tasks; server heat | Ceremony Tokens/Vouchers/Coupons, Investment Coins, cakes | med–high | birthday-style yearly habit retrospective | absent |

### 4.6 Minigame events (mostly solo; rankings removable)

| Event (ids) | Mechanic | Currency | MP | Everkai |
|---|---|---|---|---|
| **Elixir Workshop** (`Game2048_1`, `MiniGame2048`, rules `2048`) | 4×4 merge to level 11, 1 stamina/move (10 per 10 min, cap 500), VIP Rush Mode, points rank | Special Tea, Gummy Bear, Remove/Rearrange | med | absent |
| **Woof Woof Bakery** (`GameThreeMatch_1`, rules `ThreeMatch`) / **Christmas Kitchen** | 6×7 match-3 bread orders, VIP 16× mode, points rank | Bakery Voucher, Honey Black Tea | med | absent |
| **Fluffy Ranch** (`GameTurkSquare_1/2/New01`) | 8×10 sheep row-clearing puzzle, Level + Endless modes, 2 free tickets/day | Shepherd Ticket, Fluffy Ranch Token, Bells | med | absent |
| **Food Truck Management** (`KitchenGame_01/02/Single`) | buy ingredients, cook at timed stations, sell; friends assist −20 min | Food Truck/Dessert Coin, Speed-up | low | absent |
| **Koi Blessing** (`PictureGuess_01/02`) | flip tiles on 6×6 to complete pictures | Star Coin | none | absent (name only as a fish crown skill) |
| **Tomoe's Order** (`Parkour_01`) | tap when Tomoe's icon matches villager orders | Orders Ticket | none | absent |
| **Village Goods Preparation** (`WhackAMole_01`) | tap goods, avoid bombs | Goods Ticket | none | absent |
| **Celestial Blessing** (`LevelMatch_01`, `EnakoThreeMatch_1`) | match-3 levels (little rule text) | Blessing Ticket/Points | none | absent |
| **Gabrael's Tour** (Hashimoto match-3) | see 4.4 | Tour Points | med | absent |
| **Shop Investment** (`CryptoMarket_Anni_JP2EN3`) | buy/sell shop shares, prices refresh 10 min, start-up fund daily, investment ranking | Investment Coin, Promotion Card | med | absent |
| **Omikuji / New Year Omikuji** (`MijinLot_01/02`) | fortune slips | titles | none | absent |

Habit tie: minigame tickets are a clean "reward for a completed daily" sink, with no timers.

### 4.7 Board / travel / collection events

| Event (ids) | Mechanic | Currency | MP | Everkai |
|---|---|---|---|---|
| **Mushroom's Travels** (`MoonEvent_01-08/Rerun`) | spend Mushroom Pieces to travel a board, collect square rewards; 10 pieces = +1 travel; pity for limited characters/costumes; new board per run; story | Mushroom Piece, Refresh Item, stamp cards | none | absent |
| **Treasure Hunting Night / Adeline's "Treasure" / Festival Legend / Another Story** (`Monopoly_01-04`) | dice board; dice refill at 00:00 up to 5; square and lap rewards | Dice, candies/cakes (Blessing Power), Hiemspresent accessories | none | absent (item-source text only) |
| **Crow's Theatre** (`Jackpot01-10/FEVER/Rerun`) | Crow's Ticket draw for limited costumes, story fragments unlock chapters | Crow's Ticket/Pearl, Story Fragment | none | absent; storybook panel is a possible host |
| **Family Diary / Fellow Diary** (`MonthlyActivitiesBingo_01-36`) | daily-unlocking tasks give Glue; Glue fixes a random diary piece (duplicate → Super Glue); 10 Super Glue fixes a chosen piece; completed diary text | Glue, Super Glue | none | absent; **top habit fit** (monthly diary = habit journal; each daily = Glue) |
| **Paper Cuttings** (`Collection1`, `CollectionMain`) | random cuttings from tasks/login, submit sets | blind boxes | none | absent |
| **Admire the Moon** (`SmallEvent OSE01`), **Village Events / Special Village Event** (`CitySpecialEvent01-04`, `NewCitySpecialEvent`) | choice quizzes and villager problems with right/wrong outcomes | small rewards | none | partial (Village Stories/encounters exist) |
| **Hiemspresent Gathering** (`ChristmasEvent_1`) | Gift Tree gacha + Profiteer Card + Festival Legend board; Family letters (1 per member, mailbox cap 5) with gifts | Gift Vouchers, Event Points shop | low | absent |
| **Sweet Xocolate** (`ValentineChocolate_1-3`) + Love's Gift gacha | collaborative xocolate with invited Family (Intimacy); make chocolate with Cacao Butter (Blessing Power) → Love Tickets; Love's Day pass | Cacao Butter, Love Ticket/Voucher | none | absent; natural Family/relationship-habit tie |
| **Spring Festival / Golden Fair Parade** (`SpringFestival2025_TW`, rules `SpringFestival1`, `KeepAnimals01`) | login luck + Lion Dance gacha + New Year Flower growing/pollination + paper cuttings | Spring Festival Tickets, Pollination Potion | low | absent |
| **Blossoming Wealth** (`KeepAnimals_01/Single_02`) | flower growth/pollination idle | Flower Tickets/Coins | none | absent |
| **Fortune Awaits! Sunrise of New Year** (`NewYear2026`) | Check-In, Omikuji, New Year Visit (personal + guild tasks), New Year Gacha | New Year Visit Coin, New Year Ticket | med (guild tasks) | absent |
| **Magi's Artifact** (`SageEvent01-05`) | Ancient Gold draw → Magi Tokens summon/upgrade magi | Ancient Gold, Magi Token | none | absent |
| **Be My Family** (`Herovoting`) | vote daily tickets for a UR and SSR; top picks become Family versions | Voting Tickets | high (server vote) | absent; solo: pick one to "adopt" after N habit days |
| **Contract a Legendary Familiar** (`PetLottery_01-10`, `PetLottery2048` "Toy Table") | Fruit Gacha → Contract Fruits → feed Legendary Familiar in Familiar Hall; Toy Table merge minigame | Fruit Token, Contract Fruit | none | partial (Familiars present) |
| **Mole Diggers** (`RelicCommonLottery`) | paid gacha for UR exhibit components | Mole Coin | none | absent (Treasure Hunt present) |

### 4.8 Gacha / costume / wish events (paid-ticket heavy; MP none)

- **Limited Costume** gachas (all CG*/seasonal ids): The Gilded Ball (Ball2025), Ghost Day/Halloween, Hot Spring, Sakura, Summer, Summer Festival, Hell Hotel (DemonHotel2026), Fairy Tale Stage 2026, Penglai Spring 2026, Touno Island Holiday 2026, New Year 2025/2026, Fireworks (LimitClothes_CG09), Butterfly Net (CG06), Yacht (CG07), Group Photo (CG08), Gift Tree (CG01), Love's Gift (CG02/Valentine), Demiplane Supply Station (CG03). Shared mechanic: a ticket draw (from tasks/bundles) for limited costumes, duplicates level costumes, draw-count progress rewards; some have Otherworld Bond/Wish Costume pity selection.
- **Character gachas:** Hero Summon (CG04, Valiant Sigil), Archdemon Summon (CG05), Ceremonial Gacha, Lucky Bag / Souvenir (LuckyBag01/02/New), Touno Island Lucky Bag, World Tree Souvenir, Wheel of Fortune (FirstKuji, no-replacement A–D prizes), Golden Egg Smash (URPlusSmashEggs_01-04: 9 eggs, Lucky Star refreshes; stars redeem UR★), Celestial Maiden Wish Festival (URPlusGachaEvent_01: Ema wish draws + match-3 leaderboard), Prayer to the Heavens I–IV (UrGet_01-04: task Prayer Coins → fragments for Touno / Water Fight / Penglai / Sandtopia themes; coins persist across periods), Fruit/Familiar gachas, Dreamy Voucher, Bamboo, Mining, Roulette, Games, Stage Voucher, Lucky Star, Dungeon Recruitment.
- Adaptation: keep a small number as habit-ticket sinks (costumes → Everkai wardrobe); keep visible pity; remove bundles.
- Everkai: **partial** (wardrobe collection and Fountain of Wishes exist; no limited costume gacha).

### 4.9 Login / calendar / goals / tasks

| Event | Mechanic | Everkai / adaptation |
|---|---|---|
| Seven-Day Login, Seven-Day Goals (activity stamps shop) | onboarding streak/goals | partial (Journey milestones); map to the first 7 habit days |
| Chapter Goal, Billionaire Goals (MillionGoal), Destined Rendezvous (WifeTarget/Family Goal), Hall of Excellence / Congratulations to the Outstanding | milestone ladders | partial (Journey "Campaign milestones") |
| Check-in events: A Blessed Encounter, Poetry of Spring, Bijin at Home, Log-in Rewards, Encounter Chihaya, Wumeow Hops In, Touno Check-In, Anniversary Check-In, Challenge Check-In | daily login calendars | replace "login" with "completed ≥1 habit today" |
| **Rank Challenge** (Season_Journey_001-005) | 24-day season, daily/weekly/event tasks → points → 7 tiers Iron→…Platinum costume; check-in chest keys | **strong habit fit** (Habit Season pass); tiers personal |
| School Task / Inn Task / Familiar Task / Familiar Adventure / Familiar Awakening / Treasure Task (MasterText*) | repeatable system tasks → points, point rewards + ranking | drop ranking; system-specific weekly quests |
| Wrestling Championship, Camping Under the Stars, Sea Fishing, Picnic in the Forest, Muscle Hustle Gym (MiniPoster MP01-05) | use event items for random rewards/points; points shop; ranking | themed item-use weeks; the gym/picnic themes map to fitness/outdoors habits |
| Daily Task, Daily Watching (Viewing), Event Calendar, Event Preview, Features Notice | infrastructure | habit journal already covers daily tasks |
| Exchange Shop (insignias retained across reruns) | generic insignia shop | keep: persistent per-event insignia shop |

### 4.10 Shop / bundle / pass / fund (remove or convert)

First Recharge, Special Recruit, VIP Gift, Advanced Rebate, Rissette Ascension, Rissette Exclusive Fund, Daily Recharge, Limited Recharge, Recharge Rebate / Top-Up Rebate, 3-Day Check-in Bundle, Starter Bundle, Time-Limited Bundle (GiftTrigger), Exclusive Bundle, Costume Bundle / Monthly Costume Bundle, Siren and Knight Hime Costume Bundles, Custom (Anniversary) Bundle / Ceremony Special Offer, Black Friday (custom gacha bags), New Year Lucky Bag, Crystal Packs, Direct Purchase, Monthly Event Card Bundle, Event Card, Monthly/Season/Annual/Lifetime Pass Privileges, Fishing Weekly Pass, Familiar Weekly Pass, Little Helper (auto-claim/auto-respect), Funds (Growth, Earnings 1–4, Family 1–2, Familiar 1–3), Benefits Card, Voucher Shop, Gold/Crystal Shop, Guild Recharge, Guild's Sponsorship, Red Envelopes (VIP EXP → crystals split among guild), Daily Wish, Special Event (web store), all event Battle Passes (≈40 names, e.g., Games Pass, Rally Pass, Love's Day Pass).
- Adaptation: remove monetization. Where a pass structure is fun, use one **free Habit Pass** per event fed by habit points; Funds → free milestone ladders (Earnings Fund ↔ village earnings, Family Fund ↔ family size).
- MP: none/high (guild recharge, envelopes). Everkai: absent (intentionally).

### 4.11 Social / system activities with player dependence

Friends and Invite Codes, Comeback Wheel / Recall, Chat, Bazaar hosting/renting (`Project`: player-hosted bazaars with proficiency by host rank), Pupil Unions (`Marry`: unite graduates with other players' pupils, earnings sharing), Banquets attended by others (`Ceremony`), Field Trip ranking of Gold spent, Study Tour, Roaming, Hall of Fame, Server Migration.
- Adaptation: already largely done in Everkai. Private Banquets use simulated guests (**present**); School/graduation (**present**, unions local); Trading Post (**partial**). Remaining: Bazaar → NPC stalls; Field Trip/Study Tour → Family outings tied to real-life outings/relationship habits (absent).

### 4.12 Permanent systems with event wrappers (for reference; already in Everkai)

Inn (SimGame1, **present**), Workshop (SimGame2, **present**), Magic Farm (SimGame3, **present**), Fishing (SimGame4, **present**), Treasure Hunt (SimGame5/Relic, **present**), Museum (**present**), School/Pupils (**present**), Apothecary (**present**), Familiar Tower (**partial**, 12 authored floors vs 200 + endless), Familiars (**present**), Fountain of Wishes (**present**), Mine Clearance (**present**), Raphael's Stage (**present**), Mushroom Expo (**partial**), Statues/Shelter Runes (absent), Building Appearance (absent), Costume Album / Costume Shop (partial via wardrobe).

## 5. Everkai cross-reference summary (event-level)

| Status | Events |
|---|---|
| **Present** | Fountain of Wishes; Mine Clearance; Raphael's Stage; (systems) Banquet, Inn, Workshop, Magic Farm, Fishing, Treasure Hunt, Museum, School, Apothecary, Familiars |
| **Partial** | Mushroom Expo (5 stages); Northern Odyssey (local Northrealm expedition); Familiar Tower; Trading Post; Rissette (character only, no fund); Portrait Studio (gallery/wardrobe foundations only); World Tree Cup (tower/combat foundations only); Journey milestones ≈ Seven-Day/Chapter/Billionaire goals; Village Events ≈ Village Stories; Apothecary Mentor & Apprentice (apothecary host only); Contract a Legendary Familiar (familiars only); limited costume gachas (wardrobe only) |
| **Absent** | Golemore Excavation; Daily Wish; World Tree Cup / Water Fight; Touno Island Story; Sepia Portrait Studio; Ranking Rush / Time-Limited Task; Rissette Exclusive Fund; Isekai Demon Hunter Arc; Special Event; all GvE guild events (Cloud Kingdom, Golden Realm, Frantic Forest, Penglai, Bubble Island, Inferno Rally, Casino on Yacht, Mines in Dungeon, Delicious Dungeon Quest, Bazaar Mania, Crimson Moon Fantasia, March of the Northrealm, Dungeon Dev, Trade Festival, Fishaholics, Profiteer Card); GvG (Pirate Chess, Siege, Sandtopia); Drakenberg Arena/Challenge; Archdemon/Magi Challenges; all crossovers; minigames (Elixir Workshop, Woof Woof Bakery, Fluffy Ranch, Food Truck, Koi Blessing, Tomoe's Order, Goods Preparation, Celestial Blessing, Shop Investment); boards (Mushroom's Travels, Monopoly nights, Crow's Theatre); Family/Fellow Diary; seasonal festivals (Hiemspresent, Sweet Xocolate, Spring Festival, New Year, Anniversaries); Rank Challenge; Magi's Artifact; Be My Family; all paid shops/passes/funds |

## 6. Highest-value habit adaptations (suggested order)

1. **Family / Fellow Diary**: monthly bingo where each completed daily = Glue. Solo, no rules to drop, mirrors the habit journal.
2. **Rank Challenge → Habit Season**: 24-day tiered pass from daily/weekly habit tasks. Replaces every paid pass pattern.
3. **Golemore Excavation (personal)**: nightly boss, one deployment per Fellow; extra deployments from weekly life areas. Complements existing Mine Clearance.
4. **Growth Sprint (Ranking Rush)**: personal-best growth tiers themed per life area.
5. **Sepia Portrait Studio**: Roll Film from habits; outputs to gallery/wardrobe.
6. **World Tree Cup (solo climb)**: stamina from dailies, area unlocks by weekly coverage, Family assist charges, NPC top-floor rivals.
7. **Touno Island Story (Sakura Festival)**: stamp collection with Fellow-staffed stalls; life-area stalls.
8. **Dash! Familiar Track & Field** training weeks and **Sparring Challenge** (8 opponents with daily HP carry-over): both map directly to real days and weeks.
