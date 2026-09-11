# Isekai: Slow Life — authoritative list of PERMANENT systems (for Everkai parity)

## 0. Source, method, confidence

- **Only source:** the game's English translation table (one id→English map; ids are `Namespace:field:key`). 
- **How systems were found:**
  - `SystemUnlock` (the 197-row system/function unlock list, with unlock-condition text)
  - `DragonCityViewPos` / `SpecBuildingViewPos` / `CityLand` (Drakenberg and village building names)
  - `BuildingBase` (18 village buildings)
  - `Rule:text:*`: 300 rule/"Details" pages. Permanent ones were read in full
  - `ItemSource`, `Item` descriptions, `TaskName` (917 distinct task templates), `ErrorMsg`
  - `Superiors` (Little-Helper automation list), `XServerRankType` (ranking types), `ExhibitionHall`, `Fish*`, `Pet*`, `SimGame1-5`, `Hero*`, `Wife*`, `Title`, `HeadType`, `Ceremony`, `Project` and others.
- **Rule of thumb for "permanent":** the feature has a `SystemUnlock` row or a Drakenberg/village building, and its rule page does not describe an event period or end. Rotating event minigames that also have unlock rows are listed separately in §7 and excluded from the parity count.
- **Confidence:**
  - **High** for systems with full rule pages: Roaming, Bazaar, Banquet, Trading Post, Guild and its sub-pages, Drakenberg Challenge, Arena, Hall of Fame, Mine Clearance, Golemore Excavation, Archdemon, Magi, Demon's Blessing statues, Inn, Workshop, Apothecary, Magic Farm, Fishing, Treasure Hunt, Museum, Familiars, Pupils, Union, Field Trip, Study Tour, Fellows, Family, Artifacts, Stella, Figures, Costume Shop/Album.
  - **Medium** for systems known only from names, tasks and item text: the Recruit building's internals, Ranking board contents, Home tab contents, Farmstead tap/level loop, Village Events, building upgrade points, titles, avatar frames, achievements and daily tasks.
  - Many rows in `MainTaskInfo`, `DailyTask`, `PlayerSkill`, `Checklist`, `Library`, `Official`, `Qualifications` and `Embassy` hold only the placeholder "Momoca". Those texts are unreadable, so their details could not be recovered.
- MP = dependence on other players (none / partial / high). SP = one-line single-player adaptation.
- Everkai status (right column) was checked against `lib/*.mjs`, `app/*.tsx`, `SYSTEMS.md` and `README.md`, counting logic/UI only (not biographies or `original-content.mjs` text).

---

## 1. Main tabs (bottom dock)

The unlock list names Home (15), Drakenberg (16), Fellow & Fellow Assignment (13), Level-Clearing Battle (Stage) (14), Bag (35) and Shop (38). The village is the default scene. Everkai's dock already uses the same six labels (`app/page.tsx`: Home, Village, Fellow, Stage, Drakenberg, Storage).

| # | Tab | Contents in original (summarized) | MP | Everkai |
|---|---|---|---|---|
| A1 | **Home** | The protagonist's residence and Family. Eight room themes (`Home:name` Warm Hearth…Cloudside Haven) unlock by reaching Drakenberg Challenge chapters (Tranquil Forest, Sunken Ship, Desert Oasis, Gem Vein, Alpine Lair, Volcanic Spring, Cloudsea Corridor). Family list/dates/gifts are reached from here (inferred). | none | **PARTIAL**: dock "Home" opens Family; no home themes |
| A2 | **Village** | Map of the 17 business buildings plus the Farmstead, special village buildings (School, Union Hall, Trading Post land in `CityLand`), village events, hiring and upgrades. | none | **PRESENT**: full village map, 17 businesses |
| A3 | **Fellow** | Fellow roster: level, aptitude, skills, talents, aura, limit break, awakening, Stella, artifacts, costumes, operation assignment. | none | **PRESENT** (sub-features vary, see §6) |
| A4 | **Stage** | Story stages/chapters, bosses, auto-explore. | none | **PARTIAL** (see D1) |
| A5 | **Drakenberg** | City map with 12 facility buildings (§2). | – | **PRESENT** as a shell; facilities are local plates, many original facilities absent |
| A6 | **Storage / Bag** | Items and fragments; combining fragments/blueprints ("Bag [Combine Items]"); select-chests; item use. | none | **PRESENT** (Supplies/Equipment); combine-fragments flow not verified |

---

## 2. Drakenberg buildings (`DragonCityViewPos`: Banquet, Merchant War/Trading Post, Costume Shop, Roaming, Adventurer's Guild, Recruit, Golemore Mine, Drakenberg Challenge, Bazaar, Ranking, Hall of the Great/Hall of Fame, Archdemon Challenge)

### B1 Recruit (`herobond`)
- **Purpose:** acquiring Fellows and Family, plus a collection bonus.
- **Rules:**
  - Acquaint Stones (and their fragments) invite Fellows or Family.
  - Recruit pools appear as item sources: "Recruit [Bonds Between Elites]", "Recruit [Fated Acquaintance]", "Special Recruit", "Recruit 3", "Summoning [Hero Summon]", "Summoning [Offer of Archdemons]".
  - Duplicates convert to character fragments.
  - **Bond Compendium** (`CharacterGroup` rule; 64 `HeroBond` groups such as Archdemon, Otherworld Valiants, Ancient Magi, Diligent Dynamo): inviting members raises collection progress, and activating a complete group grants attribute bonuses.
- **Currencies:** Acquaint Stone, character fragments.
- **Unlock:** not stated. **MP:** none.
- **SP:** earned recruit tickets and pity pools; compendium bonuses.
- **Everkai: PARTIAL.** Free welcome/recruit-all, and Fountain Acquaint-Stone recruits (`fountain.mjs` WISH_RECRUITS). No pools, fragments/duplicates or compendium.

### B2 Ranking (`rank`)
- **Rules:**
  - Server leaderboards; players "Respect" the top players once per day for a crystal reward (a `Miracles` bonus exists for Respect).
  - Board types (from `XServerRankType`/`Exhibit` medals): Village Earnings, Fellow Power, Family Intimacy, Blessing Power, Banquet Popularity, Stage Progress, Pupil Earnings, Trading Post Influence, Fellow Talent, Inn Popularity, Guild EXP.
  - Ranking medals go to the Museum Honor Room; rank avatar frames exist (`HeadFream` RankHeadfream).
- **Unlock:** SystemUnlock 56. **MP:** high.
- **SP:** personal-best ladders against seeded NPC villages; daily Respect becomes a daily claim.
- **Everkai: ABSENT.**

### B3 Drakenberg Challenge (`moving`; rule `Moving`)
- **Rules:**
  - Raise Fellow Power to beat dungeon guards floor by floor.
  - Beating a higher-floor opponent swaps floors with them; losing keeps your floor.
  - Progress reward when the highest floor resets; daily Dungeon Coins mailed by the day's progress.
  - **Higher progress raises village earnings.**
  - Players present in Gem Vein, Alpine Lair or Ancient Ruins can be visited once per day for random rewards.
  - Dungeon Coin exchange shop.
- **Structure:** eight chapters (`DrakenbergChapter`: Base Camp…Cloudsea Corridor; 2,320 `DrakenbergLevel` rows). Progress unlocks Home themes and the "Celebration Feast" banquet. A separate PvP mode exists (SystemUnlock 165).
- **Unlock:** player level (SystemUnlock 3). **MP:** partial/high (floors held by players).
- **SP:** floors held by NPC rival villages, with a daily coin tick and an earnings bonus by floor.
- **Everkai: ABSENT.**

### B4 Drakenberg Arena (rule `DrakenbergArena`, SystemUnlock 133)
- **Qualifiers:**
  - Default lineup; wins add points and losses deduct them.
  - Extra points for beating higher-ranked opponents (capped).
  - One attempt per hour, capped at 25; crystal refills.
- **Championship:** top 32 play a Round of 16 → final, three squads each, best of three.
- **Rewards:** champion skins/themes, Figure fragments.
- **MP:** high. **SP:** periodic NPC bracket using three squads.
- **Everkai: ABSENT.**

### B5 Banquet (`ceremony`; rule `Ceremony`, SystemUnlock 22)
- **Hosting:**
  - Host with banquet materials or an expiring Invitation Card.
  - Types (`Ceremony`): Family Dinner (when a new Family member joins), Celebration Feast (Drakenberg Challenge progress), Wine / Fine Wine Party, Festival / Luxury Festival Party.
  - Hosting yields Banquet Coins and Popularity; specific characters raise Popularity; dinner parties give +20%.
- **Attending:** attend others' banquets with a gift (Ordinary/Premium/Deluxe/Gift Money). Better gifts give more; rank and owned characters boost results; a random full-capacity gift is mailed.
- **Shop:** Banquet Shop.
- **Unlock:** rank. **MP:** partial.
- **Everkai: PRESENT** (`banquets.mjs`: party kinds, pantry, coins, popularity, shop, simulated guests). Attending real players is adapted away.

### B6 Hall of Fame / Hall of the Great (`richman`; rule `RichManPalace`; SystemUnlock 33 "Hall of Excellence")
- **Rules:**
  - Holders of a Prominent Title are promoted into the hall.
  - Others "Celebrate" once per day for a capped earnings blessing.
  - The "Glorious Road" logs promotions; every new Prominent Player grants everyone a claimable reward.
  - "Congratulate" at most once every two days per title.
  - Hall of Excellence exchange shop.
- **MP:** high. **SP:** your own title milestones promote you; daily Celebrate claims a capped buff.
- **Everkai: ABSENT.**

### B7 Trading Post (`commercialWar` "Merchant War"; rule `CommercialWar`; SystemUnlock 5)
- **Negotiation:**
  - Teams of up to 6 Fellows; each spends 1 Negotiation Energy.
  - An empty Fellow refills after a 60-minute cooldown, up to 3 times per day.
  - Gold "Motivate" gives temporary Power.
  - Wins: Influence +2 for you, −1 for the opponent; Influence is ranked.
- **My Counter:** idle gold accumulator with a capacity; Goodwill Vouchers level its speed and cap.
- **Prestige List:** strong results are published for others' Designated Negotiations (notices, 20 per day).
- **Reports:** incoming challenges are logged; counter-attack with notices.
- **Bounties:** post a bounty on a leaderboard player.
- **Exchange shop:** Trading Post Coins; the shop sells Study Notes, which upgrade Fellow management/operation skills.
- **Quick Negotiation:** gated by rank or VIP.
- **Unlock:** rank. **MP:** high.
- **SP:** NPC merchants plus My Counter and an NPC prestige list/bounties.
- **Everkai: PARTIAL** (`trading-post.mjs`: simulated opponents, energy, team, rewards, shop tier). No My Counter, prestige list, reports, bounties or Study Notes.

### B8 Roaming (`find`; rule `Find`; SystemUnlock 1)
- **Rules:**
  - Stamina recovers 1 per 30 minutes; the cap rises with rank.
  - Each roam triggers an event at a location (`FindBuilding`: Maze Park, Coffee Shop, Art Gallery, Jewelry Shop, Fortune Tell, Bazaar, Casino, Bar, Wharf…) with NPC gifts (`FindNPC`, 48).
  - Rewards: Fame (player rank EXP) and random items (Gold/Gemstone Rings, Focus Candy, Secret Realm Horn).
  - Meeting an uninvited Family character builds a bond toward inviting them; meeting an invited one raises Intimacy.
  - Related sources: "Roaming Tavern", "Old Friend Gift"; Stamina Potion item.
- **Unlock:** clear a stage. **MP:** none.
- **SP:** as-is; a natural habit-stamina sink and the original Family acquisition route.
- **Everkai: PARTIAL** (September 2026: stamina, Fame, bond-to-join, Intimacy and Fellow events are built; the illustrated encounter stories, per-location backdrops and Fame toward player rank are not. Free welcome still exists).

### B9 Bazaar (`project`; rule `Project`; SystemUnlock 19)
- **Hosting:** use a permit for one of five bazaars. Cuisine/Handicraft/Weaponry/Grimoire/Travel yield Inspiring/Diligent/Brave/Informed/Unfettered Proficiency per minute, and Proficiency upgrades Fellow **Aptitude Skills**. Host rank and title raise output.
- **Stalls:** join others' bazaars as renters. Stall fights resolve by title, then level, then Fame; there are cooldowns, a 30-minute protection and 5 challenges per target per day. Hosting and renting run in fixed daily hours.
- **Rankings:** weekly per-type ranking with Respect rewards.
- **Unlock:** rank plus server age. **MP:** high.
- **SP:** NPC stall contests; permits from habits; proficiency by duration.
- **Everkai: ABSENT.** Everkai raises Aptitude via Insight books instead.

### B10 Adventurer's Guild core (rules `Guild`, `GuildGift`, `GuildRecharge`, `CrossGuild`; SystemUnlock 10/69)
- **Rules:**
  - Create a guild with crystals.
  - Four daily donation tiers (`GuildBuild`) give Guild Coin, Wealth, EXP and daily progress chests.
  - Guild Coin shop.
  - Weekly Activity Chests at 40/80/120 stamps, plus a Luxury Guild Chest.
  - Presidency auto-transfer, notices, auto-disband.
  - Cross-server identity ranks (Legend…Rising Star); guild tags.
- **MP:** high. **SP:** a personal guild of NPC members; donations as daily habit rewards.
- **Everkai: ABSENT.**

### B11 Guild Large Commissions (rule `GuildBoss`; 29 commissions)
- **Rules:**
  - Leaders open commissions with Wealth or recommendation letters.
  - Members send Fellows (each once per day, Power snapshotted) until the team meets the Power requirement.
  - Rewards split by Power share; excess contributors get only the "Adventure" chance.
- **MP:** high. **SP:** timed dispatch of your own Fellows against Power thresholds.
- **Everkai: ABSENT.**

### B12 Guild Head Office (rule `GuildChamber`)
- **Rules:**
  - Each member assigns one Fellow, up to 8 per type.
  - The Fellow's type picks the building type and its Assign Skill picks the bonus; bonuses sum across members.
  - Head Office Fellows can also join Mine Clearance.
- **MP:** high. **SP:** Head Office slots filled from your own roster for building-type earnings bonuses.
- **Everkai: ABSENT.**

### B13 Guild Random Requests (rule `GuildIndustry`; 25 quests, e.g. Artistic Performance, Promotion Event, Guard the Farmstead, Herb Gathering)
- **Rules:** quality tiers; quest count regenerates; gold scaled by the guild's total earnings; rewards mailed to all members.
- **MP:** high. **SP:** request board scaled by your own earnings.
- **Everkai: ABSENT.**

### B14 Magi Challenge (rule `ResidentGBoss_Force`; SystemUnlock 142)
- **Rules:**
  - Weekly guild boss, Monday–Friday.
  - Difficulties Easy/Normal/Hard/Extreme, each with 5 levels of one Magus plus 5 allies.
  - Damage rewards scale with the share of target HP dealt.
  - Daily Challenge Attempts; per-Fellow attack chances (+1 when the guild clears a level); Power snapshotted at first daily login.
  - Challenge Coin gacha machine; guild ranking by clear time.
- **Unlock:** guild level plus server age. **MP:** high.
- **SP:** weekly solo boss ladder using per-Fellow attack chances.
- **Everkai: ABSENT.**

### B15 Costume Shop + Costume Album (rules `FashionShop`, `FashionGuide`; SystemUnlock 105)
- **Shop:** opens on the 1st and 16th for 7 days, after server day 180. Costume Vouchers from daily tasks during an opening redeem reproduction costumes and blueprints.
- **Costumes:** 100 blueprints make a costume; duplicates upgrade costume skill level and cap (`Item` costume text).
- **Album:** Family and Fellow costumes plus Figures; unlocks and upgrades give collection points toward milestone rewards.
- **MP:** none. **SP:** as-is; vouchers from habits.
- **Everkai: PARTIAL** (`wardrobe.mjs`: free cosmetic collection, equip, collection score). No shop, vouchers, blueprints, costume skills/upgrades or album rewards.

### B16 Golemore Mine → Mine Clearance (rules `HighwayBoss`/`HighwayBossNew`)
- **Rules:**
  - Available all day in the newer version (12:00–14:00 in the old one).
  - Defeat mine monsters continuously for Clearance Points and items; each Fellow once per day; up to 5 Head Office Fellows usable.
  - Clearance Point exchange shop.
  - Rare chests after kills can be opened by others.
- **MP:** partial. **SP:** as-is.
- **Everkai: PRESENT** (`mine-clearance.mjs`: daily encounters, damage carry-over, Mine Coins → Magic Ore).

### B17 Golemore Mine → Golemore Excavation (rule `CoopBoss`; 2,000 `CoopBoss` rows; SystemUnlock 8)
- **Rules:**
  - Server-wide boss from 20:00–21:00; every Fellow may be deployed once.
  - Boss respawns after 30 seconds; last-hit and rank rewards.
  - Crystal Fragments synthesize the UR artifact **Sapphire Crown** (once), and extra fragments awaken it.
  - Probably the same system as "Valiant Ancient Dragon [Ancient Dragon Hunt]" / "Ancient Dragon Gameplay" (SystemUnlock 9), which also sources Crystal Fragments (medium confidence).
- **Unlock:** rank plus server age. **MP:** high.
- **SP:** a daily solo boss window with damage-tier rewards replacing last-hit.
- **Everkai: ABSENT.** Sapphire Crown exists only as an artifact with an unknown recycle reward.

### B18 Archdemon Challenge / "Archdemon's Temple" (`weekBoss`; rule `WeekBoss`; SystemUnlock 137)
- **Rules:**
  - Archdemons rotate by date; each can be challenged once per day, closing at 23:55.
  - Two rounds per week (Mon–Fri, Sat–Sun); each Fellow once per round.
  - Recommended-type Fellows gain Power.
  - Leaderboard settles daily.
- **Unlock:** level plus server age. **MP:** partial (leaderboard only).
- **SP:** as-is, minus the leaderboard.
- **Everkai: ABSENT.**

### B19 Demon's Blessing — type statues (rules `Statue`, `StatueResonance`; SystemUnlock 138)
- **Level:** Shelter Runes level a type's statue, raising that type's Fellow Power. Levels must stay roughly even across types.
- **Advance:** Type Emblems advance a statue (emblem chests rotate by weekday).
- **Shelter:** deploy 2–6 same-type Fellows per statue. Shelter Value uses an explicit formula:
  - +4 per 10 levels (max 300)
  - +1 per 20 Aptitude (max 500)
  - Stella level adds +10% per level (max +200%)
  - multiplied by quality: N 20% / R 40% / SR 60% / SSR 80% / SSR+ 100% / UR 200% / UR★ 300%
- **Bonuses:** Shelter Value thresholds unlock attribute bonuses you activate manually; lowering Shelter Value later does not re-lock them.
- **MP:** none. **SP:** as-is; highly portable because the formula is fully stated.
- **Everkai: ABSENT.**

### B20 Exchange Merchant / Crystal Merchant (SystemUnlock 27/28; `CityExchanger`)
- **Rules:** a travelling merchant sells goods (engineer goods, potions, ores, reforge oils…) and returns rewards ("Trade with Merchant N times").
- **MP:** none. **SP:** keep as a periodic reward NPC.
- **Everkai: ABSENT** (low value).

### B21 Union Hall — pupil unions (rule `Marry`; `SpecBuildingViewPos` hall)
- **Rules:**
  - Graduated pupils unite with other players' graduates, automatically or by request.
  - Each side gains the other's pupil earnings, capped at 5× your pupil's earnings; the union reward is a Fellow-skill item.
  - "Workaholic" graduates cannot unite but earn big graduation rewards.
  - Max 20 unions; per-pupil earnings requirements.
- **MP:** high. **SP:** unite with NPC-family graduates that pass an earnings threshold.
- **Everkai: ABSENT** (the school rules note mentions unions as pending).

---

## 3. Village businesses and business sub-systems

### C1 Business buildings (`BuildingBase`)
- **Buildings:**
  - Inn 101, Apothecary 201, Workshop 301, Scroll Shop 401, Spring Resort 501, Central Station 601, Patisserie 701, Archery Range 801, Museum 901
  - Market Street 1001, Bank 1101, Tailor Shop 1201, Sports Park 1301, Clinic 1401, Theater 1501, Airship 1601, Magic Academy 1701
  - plus **Farmstead** (`Building_Bank`)
- **Rules:** employees (hire with gold or items), earnings, Fellow slots, "Collect Gold", automation, total building level tasks.
- **Special mechanics:** no rule pages exist for Spring Resort, Theater, Airship, Magic Academy, Central Station, Scroll Shop etc. beyond earnings, employees and operation-skill bonuses (`SkillBase` Hero_Appoint_Building06Extra…). The Airship name also appears in Family trips.
- **MP:** none.
- **Everkai: PRESENT** (`businesses.mjs`, `staffing.mjs`, `hire-cards.mjs`: 17 businesses, employees, slots, source yields).

### C2 Fellow assignment & operation/management skills
- **Rules:** assigned Fellows add operation-skill % to matching building types; Study Notes (Trading Post shop) upgrade the skill ("Upgrade Fellow Operation skills N times").
- **Everkai: PARTIAL** (`operations.mjs`: 4 Fellows' documented operation effects). No Study Notes skill leveling.

### C3 Building upgrades
- **Rules:** Building Upgrade Blueprints (Fountain, Crystal Shop, Trading Post Shop); "Upgrade N buildings to Lv.X"; `BuildingAddPoint` names "Operations" and "Marketing" (a point allocation; semantics unknown).
- **Everkai: PARTIAL** (paid-staffing source quality tiers). No blueprint building levels or Operations/Marketing points.

### C4 Farmstead
- **Rules:** tap harvest ("Farmstead [Tap]", "Harvest at the Farmstead N times"); Farmstead management; level-up with Farmstead Upgrade Blueprints (fragments combine in the Bag; Drakenberg Challenge shop); Little Helper auto-harvest.
- **Unlock:** SystemUnlock 30. **MP:** none.
- **Everkai: ABSENT.** Not among the 17 imported businesses (`Building_Bank` = Farmstead is distinct from Bank 1101); Magic Farm is a separate system.

### C5 Village Events / Special Village Events (SystemUnlock 6/60)
- **Special events (`CitySpecialEvent01`–`03`):** multiple-choice shop incidents with a correct option, a monster raid (repel or process corpses), treasure hunting.
- **Management suggestions (`CitySpecialEventManage`):** hire staff, expand, upgrade staff.
- **Village events (`CityAssignEvent`):** stranger/NPC events. Some Family CGs come from Village Events.
- **MP:** none. **SP:** as-is; good daily-habit prompts.
- **Everkai: ABSENT.** Village Stories are text replays, not events.

### C6 Building Appearance (SystemUnlock 144; `BuildingAppearance`)
- **Rules:** alternate skins for Inn (Food Truck), Apothecary (Beverage Shop), Scroll Shop (Balloon Stall) and Farmstead (Flower Field).
- **MP:** none.
- **Everkai: ABSENT.**

### C7 Inn (rule `SimGame1`; SystemUnlock 11/52)
- **Kitchen and menu:**
  - 10 kitchen stations built with gold and upgraded with blueprints; upgrades raise Popularity and Finesse gains.
  - Recipes come from management-target tasks and are developed at qualifying stations.
  - **Dishes boost the matching building's earnings**, more at higher dish level.
- **Service:** Stamina serves a guest queue that keeps running offline.
- **Special guests:** up to 3 per day, each served once, giving Inn treasures (`SimGame1Collection`). Treasures upgrade with Gratitude; Meowchelin Medals upgrade with rating (21 ratings, `SimGame1Level`).
- **Earnings:** manual deposit box with no cap; Popularity drives the rating.
- **Everkai: PARTIAL** (`inn.mjs`, `inn-guests.mjs`, `inn-progression.mjs`: stations, recipes, serial service, ratings, 7 special-guest treasures). Missing: dish→building-earnings effect, Gratitude/medal upgrades, management-task recipe acquisition.

### C8 Workshop (rule `SimGame2`; SystemUnlock 17/53)
- **Manufacturing:** one Fellow per non-cancelable batch; the Fellow's type must match the product. Materials are consumed; tokens scale with quality.
- **Daily hot products:** +20% Sales EXP.
- **Products:** some raise Fellow Power, and products level up with repeats.
- **Evaluation earnings:** a better evaluation gives extra earnings.
- **Storage:** deposit box and Workshop Store.
- **Everkai: PARTIAL** (`workshop.mjs`: 50 products, jobs, hot rotation, Sales EXP, store, local mastery). Missing: product effects and levels, evaluation earnings, original type gating.

### C9 Apothecary (rules `Medicine`, `MedicineGame`; SystemUnlock 49/146/147/181)
- **Rules:**
  - Stock shelves; customers buy automatically, including offline.
  - Special customers unlock new potions.
  - Earnings scale with earning speed and the number of unlocked potions.
  - Deposit cap scales with potions on the shelf.
  - Herb-mixing minigame aligns green and red zones.
- **Everkai: PRESENT** (`apothecary.mjs`, `medicine-discovery.mjs`, `medicine-lab.tsx`).

### C10 Magic Farm (rules `SimGame3Main`, `SimGame3Order`, `SimGame3Convenience`, `SimGame3Festival`, `SimGame3NPC4`; SystemUnlock 63/87/189)
- **Core loop:**
  - Deliver orders; Augustine trades soils for new magic plants.
  - Knowledge (10 per reclaim, sow or water; 2 per growth minute) pays Maxim to reclaim plots.
  - Pump brings occasional 3★ rare orders.
- **Mole family helpers:** earn their help with Knowledge; they water, quick-harvest, run plant agency / quick sow and plant to order.
- **Alraune's Shop:** Morning Dew from orders buys essences that raise Fellow Aptitude.
- **Money Tree:** grows with farm popularity and boosts village prosperity.
- **Harvest Festival:** daily; growth potions give participating Fellows Aptitude EXP.
- **Other:** random farm events and mutated plants (`SimGame3Event`); 30 farm levels; Lincale plant research (NPC4).
- **Everkai: PARTIAL** (`farm.mjs`, `farm-trade.mjs`: sow/water/harvest, Knowledge, plots, local orders, Alraune essences). Missing: mole family, Money Tree, Harvest Festival, soil→new-plant exchange, rare orders, events/mutations, farm levels.

### C11 School / Pupils (rule `FosterChild`; SystemUnlock 45/46)
- **Rules:**
  - Intellect comes from the caretaker relationship; pupil type.
  - Rank-gated education methods.
  - Education Points recover 1 per 5 minutes; lessons grant Fellow EXP.
  - Graduation earnings depend on caretaker Intimacy, education, Intellect and type; Fellow talents and Family relationship skills boost them.
  - Pupils arrive from Family trips (see F18).
- **Everkai: PRESENT** (`school.mjs`, `education.mjs`, `school-maturation.mjs`). Acquisition is free enrollment.

### C12 Field Trip (rule `FieldTrip`; SystemUnlock 108)
- **Rules:**
  - Children visit a random destination; the gold cost escalates per trip and resets daily.
  - A random Family member (not one on Study Tour) goes along and gains Blessing Power.
  - Random item plus a chance of a special event.
  - Each destination has a practical course that levels with repetitions ("Field Trip Skills").
  - Gold-spent ranking.
- **MP:** ranking only. **SP:** drop the ranking.
- **Everkai: ABSENT.**

---

## 4. Stage / adventure / challenge

### D1 Story stages
- **Content:** `Chapter` 12,000 stage names and 146 chapter descriptions; `LevelBoss` 12,000 bosses (every X-6-0 stage); `Area` (Kemonomimi Village, Evil Forest, Drakenberg, Elven Forest, Dragon/Vampire/Devil, Dungeon I–II).
- **Rules (`Level`, `AutoBattle`):**
  - Adventuring **consumes Gold**, less with higher Power.
  - Random stage events with two-choice outcomes and appointed-Fellow results (`StageEvent`, 143).
  - Bosses: temporary Power boost with gold or a Secret Realm Horn; big Fellow EXP.
  - "Stage Bonus" multiplier events.
  - Clearing gives Fame (player rank).
- **Unlock:** SystemUnlock 14. **MP:** none.
- **Everkai: PARTIAL** (`adventure.mjs` 30 local stages with bosses every 6, patrols; `frontier.mjs` 12 encounters; `opening.mjs` 126 encounters). Not the original stage table, gold-cost exploration, stage events or boss horn.

### D2 Explore / Full-Auto / Auto Handle (rule `AutoBattle`)
- **Rules:** automated exploration keeps running until gold runs out, Power is too low or the event list is full; Auto Handle unlocks at chapter 50 (or with a monthly pass).
- **Everkai: PARTIAL** (repeatable patrols and batch actions only; no idle auto-explore).

### D3 Goals
- **Systems:** Chapter Goal (per-chapter objectives), Seven-Day Goals (18), Billionaire Goals (50; village-earnings targets), Family Goal (32).
- **Everkai: PARTIAL** (`progression.mjs` milestones plus the 136-task opening; not the original chains).

### D4 Player Rank
- **Rules:** Fame (from stages, roaming, Fame Cards) raises rank; rank gates systems, energy and stamina caps, and education methods; rank rewards ("Claim Rank Rewards"). `Level` holds 70 rank names (Newborn Monster → Monster S III …).
- **Everkai: PARTIAL** (rank = milestone XP/100; not Fame or original thresholds).

### D5 Main story / story missions
- **Rules:** story missions gate the Inn (SystemUnlock 11); plot recaps; Family/Fellow city encounter scenes.
- **Everkai: PARTIAL** (Village Stories replay 36 encounters; opening tasks).

Other challenge modes live under Drakenberg (B3, B4, B14, B16–B18) and Familiars (E9).

---

## 5. Minigames / permanent activities

### E1 Fishing — core (rule `SimGame4Main`; SystemUnlock 78/82)
- **Rules:**
  - Bait: Kaity produces it continuously up to a storage cap; you claim it. Bait's Shop also sells it.
  - Fishing EXP raises Fishing Level, which improves technique and unlocks grounds.
  - Areas: Village, Drakenberg, Ocean, Northrealm; `FishSpot` has 11 spots.
  - Besides fish you can catch **antiques** (`FishArtifact`, 17). A treasure-map-fragment chain leads to the Crystal Shell quest.
  - 5 fish tanks (Kaity's, Turtle's, Freshwater, Marine, Ice) with fixed positions; placing a fish or antique grants its bonus.
  - Duplicates go to the basket for research.
  - Titles for completing spots.
- **Everkai: PARTIAL** (`fishing.mjs`: casts by ground, tank display bonuses, research). Missing: Fishing Level, bait production, antiques/Crystal Shell, per-tank slots, length records.

### E2 Fishing — Encyclopedia, skills, crowns, combinations, Aquarium (rules `SimGame4Book`, `MuseumHall4`, `FishBP`)
- **Rules:**
  - Encyclopedia records first catch and **max length**, with length rewards.
  - Gold Crown fish can be crowned for Crown Skills.
  - Chihaya's research of duplicates gives Research Points and Gold Crown Points to upgrade normal and crown skills.
  - Antique skills upgrade with Pearls / Black Pearls.
  - 34 combinations (and crown combinations) cannot be upgraded.
  - The Museum Aquarium hall shows fishing progress.
- **Everkai: PARTIAL** (research, 12 of 34 normal combos, one crown grant). Missing: crown odds, Crown Points, length system, antique skills, crown combinations.

### E3 Treasure Hunt (rules `SimGame5`, `RelicBP`, `RelicLottery`; SystemUnlock 115)
- **Rules:**
  - Ruin sites (Original Ruins, Memory Cave, Frozen Abyss, Ice Shipwreck; areas Drakenberg and Northrealm).
  - Steeltooth digs using its own Stamina (150 per day, cap 300).
  - Stones become Steeltooth EXP, which raises max hardness, fullness, attack method (bombs) and ATK (`RelicSkill`).
  - Gemstone appraisal reveals Museum exhibits; duplicates become upgrade material.
  - Also: Treasure Cave, ruin guards, treasure-hunter encounters.
- **Unlock:** server age, Museum rating Lv1 and one operation claim.
- **Everkai: PRESENT** (`treasure.mjs`: stamina, dig, return, appraise, donate/display, relic restoration income). Steeltooth skill tree fidelity is not verified.

### E4 Museum (rules `Museum`, `MuseumBook`, `MuseumHall1-7`; SystemUnlock 101/103/118)
- **Halls:** donate exhibits to 7 halls: Private Hall (gifts), Honor Room (achievement and ranking trophies/medals), Main Hall, Aquarium, Antiquities (component-assembled exhibits), Naturalism (oversized platforms), Hall of Memories (event component exhibits).
- **Exhibits:** skills with level and/or star upgrades; awakening; bonuses persist even when removed from display.
- **Score and operation:** Museum Score → Rating → tasks and operation efficiency. **Museum Operation** earns Informed Coins hourly into a capped Coin Box; Museum Earning Cards grant them instantly.
- **Other:** catalog; Honor Record (top-3 per ranking); other players can visit.
- **Everkai: PARTIAL** (`museum.mjs`: 32 Hall-1 keepsakes, acceptance and display bonuses; treasure relics). Missing: other halls, exhibit skills/stars/awakening, score/rating, operation coins, components.

### E5 Familiar exploration & contracts (rules `Pet`, `PetExplore`; SystemUnlock 129)
- **Rules:**
  - Explore areas (Verdant Forest, Snowy Plains, Endless Desert…) for 1 Stamina each; Energy Drinks refill.
  - Events and explore items (`PetExploreItem`, e.g. free exploration, double rewards).
  - Wild monsters: contract items with grade-based success; each attempt raises Alertness until the monster flees; Ordinary Mochi lowers Alertness.
  - Tower floors unlock new areas.
- **MP:** none.
- **Everkai: ABSENT.** Familiars are granted freely.

### E6 Familiar development & binding (rule `PetDevelop`)
- **Types and roles:** Cool/Cute/Playful/Legendary; Attacker/Tank/Support; 9 attributes (CRIT 150%, block reduces damage by 1/3, etc.).
- **Growth:**
  - Level with Magical Fruit, unlocking bonus nodes.
  - Grade ascension with Familiar Crystal raises the level cap and unlocks skills.
  - Stars from fragments unlock nodes and, at high stars, an awakened appearance.
  - Activated nodes buff the bound Fellow.
- **Progress Reversion:** refunds materials for crystals.
- **Everkai: PARTIAL** (`familiars.mjs`, `familiar-nodes.mjs`: levels, stages, stars, node activation, binding, inherent bonuses; free sandbox). Missing: material costs, ascension items, reversion.

### E7 Familiar Metamorphosis (rule `PetRefresh`)
- **Rules:**
  - Three Metamorphixir grades roll bonus attributes (Power, Aptitude, Power %, Aptitude %) in N–UR grades.
  - Slots: SSR 1, SSR+ 2, UR 3, unlocked by stars.
  - Slots can be locked, and each lock raises the cost.
- **Everkai: ABSENT.**

### E8 Familiar Compendium (rule `PetBook`)
- **Rules:** new familiars, awakenings, stars and SP versions give Compendium EXP; each level grants rewards plus type-based Fellow Power bonuses.
- **Everkai: ABSENT.**

### E9 Familiar Tower (rule `PetTower`)
- **Modes:** Challenge Mode floors give one-time rewards; Endless Mode unlocks after 200 floors.
- **Idle earnings:** floor milestones raise an hourly earnings efficiency that accrues up to a storage time limit.
- **Combat:** 1–5 familiars; Speed order; Rage fills from attacks and damage and triggers the active skill; 15-round limit, then higher remaining HP wins.
- **Everkai: PARTIAL** (`familiar-tower.mjs`: 12 authored floors, deterministic combat v1–v10 with many active kits). Missing: 200 floors, Endless Mode, idle tower earnings, area unlocks.

### E10 Familiar Dispatch (rule `PetDispatch`)
- **Rules:**
  - Teams of 5 familiars go to areas unlocked by tower floors on timed runs.
  - Base Magical Fruit reward plus an attribute-scaled Great Success chance.
  - Cancelling forfeits the run.
- **Everkai: ABSENT.**

### E11 Fountain of Wishes (rule `Lottery`; SystemUnlock 25)
- **Rules:**
  - Fairy Bottle wishes: 10 wishes cost 9.
  - Explicit 12-item probability table (Acquaint Stone 0.1% … Basic Earnings Card ×10 21.1%).
  - Every 500 fairies released gives a claimable reward.
- **Everkai: PRESENT** (`fountain.mjs`).

### E12 Northern Odyssey (rule `Dungeon`; `DungeonSeason` 32; SystemUnlock 75)
- **Status:** seasonal but a standing system.
- **Exploration:** Supplies recover 1 per 60 minutes; tile-flip exploration; tap monsters and trade HP for damage; signpost to the next floor costs 1 supply.
- **Stats:** ATK starts from partner strength, HP is fixed; both train with ATK/HP EXP earned in runs.
- **Rewards:** progress rewards, stage-clear rewards, Northrealm Token lottery, encyclopedia, endless mode, rankings.
- **Everkai: PARTIAL** (`northern.mjs`: local maps, supplies, ATK/HP training, coins exchange). Missing: encyclopedia, endless mode, token lottery, seasons.

### E13 Mushroom Expo (rule `TowerDefense`; SystemUnlock 99)
- **Stalls and customers:**
  - Stalls staffed by Fellows; Sales Ability = Fellow Power × stall bonus.
  - Customers carry funds and leave satisfied only if they spend them all.
  - Picky typed customers; same-type Fellow bonus.
- **Stage unlocks:** 10 on day 1, then 5 per day through day 7, then 3 per day.
- **Passive income:** daily villager visits give passive Expo EXP and Satisfaction Coins up to a cap.
- **Hype:** Hype Advertising brings Rich Patrons.
- **Gacha machines:** two machines level up with use; duplicate shops level up; shop combos unlock Shop Skills.
- **Expo level:** unlocks more stalls.
- **Everkai: PARTIAL** (`expo.mjs`: 5 of 100 stages, stall claim, staffing, named bonds). Missing: passive villagers, Hype, gacha, combos/shop skills, Expo level.

### E14 Raphael's Stage (rules `RaphaelStage_readme`, `_advantageRule`; SystemUnlock 102)
- **Status:** recurring event-period system.
- **Performance:** Stamina recovers 1 per 20 minutes; Heat Levels are reached through Support Value.
- **Board:** 5×5 seat grid unlocked with Performance Points; fans with base support and range bonus; support items (range bonus only); remove or upgrade fans with refunds.
- **Extras:** flowers attract fairies for temporary buffs; Wish Coins feed the Thalia gacha; rankings.
- **Everkai: PARTIAL** (`raphael.mjs`, `raphael-progress.mjs`: fans, support items, level tables, scoring, stamina runs, milestones). Missing: fairies/flowers, Thalia gacha, Performance Point economy.

### E15 Daily Tasks / activity points (SystemUnlock 40)
- **Rules:** daily task list with activity stamps and chests; sources for Fame Cards, Focus Candy, Museum Earning Card, Costume Vouchers, etc.
- **Everkai: PARTIAL.** The habit journal replaces it (deliberate adaptation).

### E16 Achievements
- **Rules:** five categories (`AchievementTaskType`: Village, Family, Progress, Treasure, Lifestyle); "Super Achievement" points; achievement medals feed the Museum Honor Room.
- **Everkai: PARTIAL** (`journey-panel.tsx` milestone categories reuse these names; local milestones only).

### E17 Check-in
- **Rules:** Seven-Day Login (1001) and daily sign-in cards (`SignInCard` fortunes Normal…Good luck).
- **Everkai: ABSENT** (habit dailies cover the intent).

### E18 Titles (`Title`, 3,113 rows)
- **Rules:**
  - Prefix and suffix titles, plus combined titles such as "Invite 12 Family members".
  - Labels Combo / Fixed / Ltd-Time.
  - Sources: fishing-spot completion, Stella levels, rankings, events.
  - Titles gate Bazaar and Hall of Fame standing.
- **Everkai: ABSENT.**

### E19 Avatars / frames / chat frames
- **Rules:** avatar types Default, Basic, Family, Fellow, Appearance, Transform, Dynamic Avatar, Familiar (`HeadType`); 51 avatar frames, 50 chat frames; dynamic avatars at Stella 10.
- **Everkai: ABSENT.**

### E20 Figures — protagonist transformation (rule `Shapeshift`; 51 `ShapeshiftClothes`)
- **Rules:** activate one Figure to change the protagonist's look; each owned Figure grants **attribute bonuses to Fellows or Family that stay active even when not worn**; star levels.
- **Everkai: ABSENT.**

---

## 6. Character systems

### Fellows (rules `Hero`, `HeroSpirit`; tables `HeroStar`, `AwakenName`, `HeroRarityUpgradeStage`, `HeroBond`, `Aura`/`EHeroEvents`)

| # | Sub-system | Original rule summary | Everkai |
|---|---|---|---|
| F1 | Level / Fellow EXP | Levels spend Fellow EXP (from stages, lessons, EXP stones) | **PRESENT** (APK HeroLevel costs policy) |
| F2 | Limit Break | Raises the level cap | **PRESENT** |
| F3 | Types, Aptitude, Aptitude Skills, Talents | 5 types. Aptitude = training potential. Aptitude Skills upgraded with Skill Pearls / Bazaar Proficiency / type books. Talents are natural abilities improved by Awakening. | **PRESENT** (`talents.mjs`, `insight.mjs`; free supplies) |
| F4 | Stella | Activate after invite; fragments upgrade Power; titles and dynamic avatars at milestones | **PARTIAL** (`stella.mjs`: 4 owners only) |
| F5 | Awakening (★×1–20; star names Novice→Ascendent) | Main Power route for rare Fellows; raises talent levels | **ABSENT** |
| F6 | Aura | Rare Fellows' % Power auras; group auras (Hero Five-Man Team, Four Heavenly Kings) scale with members owned; "Upgrade aura skills" | **ABSENT** |
| F7 | Rarity Advancement | N…SSR→SSR+→UR→UR★ (LR for some), unlocking skills and caps | **ABSENT** |
| F8 | Bond Compendium | 64 `HeroBond` groups; activation grants attributes | **ABSENT** |
| F9 | Costume skills | Costumes carry skills; duplicates raise skill level and cap | **ABSENT** (wardrobe is cosmetic, F21) |
| F10 | Vow / True Love | A True Love Key on a Fellow gives them Family identity plus an exclusive costume; keys persist after the event | **ABSENT** |
| F11 | Artifacts: level, aptitude, recycle | Magic Ore levels (talent growth); Aptitude when equipped; recycle refunds upgrade materials | **PRESENT** (`artifacts.mjs`, `artifact-echo.mjs`) |
| F12 | Artifacts: type/skills, reforge, awaken, Materia, combos | Artifacts take the wearer's type. Same-type skill gives % Power. Reforge with enchanting materials, max 25% per skill; Quick Reforge with oil/gold. Awaken SSR+ for new skills. UR Materia: free activation, Ore upgrades, Breakthrough, Refine. Legendary artifact combos from fragments. "Artifact Handbooks". | **ABSENT** |

### Family (rules `Wife`, `WifeSpirit`, `WifeSkillLevelUp`, `WorkingWife`, `FieldTrip`; tables `WifeLevel`, `WifeRarityUpgrade`, `WifeDateEvent`, `CGImage`)

| # | Sub-system | Original rule summary | Everkai |
|---|---|---|---|
| F13 | Intimacy, Blessing Power, gifts | Intimacy drives pupil earnings; Blessing Power drives date points; gifts raise both | **PRESENT** |
| F14 | Dates / Energy / scenes / pictures | Energy dates a random member; recovery cap rises with rank; 416 date scenes, CG gallery | **PRESENT** (`dating.mjs`, `family-gallery.mjs`, auto-date) |
| F15 | Relationship levels | Acquainted→Friendly→Affectionate(★★)→Loving(★★)→Forever(★★); upgrading raises pupil Intellect and relationship skill effects | **PARTIAL** (local 1–5 tiers) |
| F16 | Family skills | Building-earnings and Fellow-attribute skills; "Fathom" upgrades with Lucky Stones or gold; Auto Fathom | **PARTIAL** (single provisional earnings skill) |
| F17 | Blessing skills | Fellow / advanced / special blessings on affinity Fellows | **PRESENT** (APK costs to 700, special blessing) |
| F18 | Family trips | Sailing Trip (crystals, guarantees 1 child) and Airship Journey (Perfume, guarantees twins); the source of pupils | **ABSENT** |
| F19 | Family Stella & rarity upgrade | Fragments raise Blessing Power, titles and dynamic avatars; rarity upgrade boosts bond skills (e.g. blessing applies to all Fellows) | **ABSENT** |
| F20 | Study Tour | Send a member away; daily chance of a souvenir (Gold Ring / Gemstone Ring / random potion); absent from roaming and dates until recalled | **ABSENT** |
| F21 | Wardrobe (costumes) | Family and Fellow costumes | **PRESENT** (cosmetic only; see B15/F9) |

Familiar companions: see E5–E10.

---

## 7. Excluded from the permanent count (listed for completeness)

- **Social / monetization shell.** Adapt or remove; don't port:
  - Mail (12), Friends (7, stamina gifts), Chat (51), Recall (91), Invite codes
  - VIP (34), Recharge/Crystal Shop/Voucher Shop, Benefits Cards (Monthly/Annual/Lifetime: +5% earnings, +20 classroom EP, daily gold)
  - Little Helper / Trusteeship (97; `Superiors`/`Trusteeship` list auto Celebrate, Respect, Roam, harvest, bait, donate, negotiate, museum, inn, expo, apothecary, school)
  - Funds, Battle Pass / Fishing / Familiar / Treasure passes, Privilege shops, First Recharge, Daily Watching (88)
  - Event Calendar/Preview (68/79), Features Notice (47), Exchange Mission (57)
  - SP idea: Little Helper automation could be unlocked by habit streaks instead of payment.
- **Rotating event minigames that also have SystemUnlock rows:** Woof Woof Bakery (ThreeMatch), Fluffy Ranch (TurkSquare), Elixir Workshop 2048, Profiteer Card (4-player), Omikuji, Sepia Portrait Studio, Crow's Theatre, Monopoly, Mushroom's Travels, Magi's Artifact, Hero/Archdemon Summon, Golden Egg Smash, Food Truck Management, Rank Challenge (no rerun), TLT/TLR Ranking Rush, Daily Wish, Village Ceremony, all GvE/guild events, Sandtopia Pilgrimage, Guild Trade Festival, Team Fishing, World Tree Cup. Covered by `events/event-catalog.md`.

---

## 8. Everkai cross-reference summary

**Counts (85 permanent systems/sub-systems):** PRESENT 19 · PARTIAL 28 · ABSENT 38.
- **PRESENT:** A2, A3, A5, A6, B5, B16, C1, C9, C11, E3, E11, F1, F2, F3, F11, F13, F14, F17, F21.
- **PARTIAL:** A1, A4, B1, B7, B15, C2, C3, C7, C8, C10, D1–D5, E1, E2, E4, E6, E9, E12–E16, F4, F15, F16.
- **ABSENT:** B2, B3, B4, B6, B8–B14, B17–B21, C4, C5, C6, C12, E5, E7, E8, E10, E17–E20, F5–F10, F12, F18–F20.

**Highest-leverage ABSENT systems with MP = none (portable as-is):** Demon's Blessing statues (B19, fully specified formula), Archdemon Challenge (B18), Drakenberg Challenge with NPC floors (B3), Family trips → pupils (F18), Farmstead (C4), Village Events (C5), Field Trip (C12), Study Tour (F20), Familiar exploration/contracts/dispatch/metamorphosis/compendium (E5, E7, E8, E10), Fellow Awakening/Rarity/Aura/Bond Compendium (F5–F8), Artifact skills/reforge/Materia (F12), Figures (E20), Titles (E18).

**ABSENT with high MP (need NPC substitutes):** Ranking, Hall of Fame, Arena, Bazaar, Guild (core/commissions/Head Office/requests), Magi Challenge, Golemore Excavation, Union Hall.

