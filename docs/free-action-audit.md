# Everkai free-action audit — measured, not inferred

Read-only audit. No file in `/Users/westmanfamily/everkai` was modified; no git write commands were run.
Date: 2026-09-12. Repo state: working tree as found (another agent is active in it).

## Method — what was actually executed

Everything below marked **observed** was produced by importing `lib/game.mjs` in node and calling
`act()` on real states, then deep-diffing the state before/after. Scripts live in the scratchpad
(`harness.mjs`, `probe2.mjs`, `focus.mjs`, `focus3.mjs`, `focus4.mjs`, `focus5.mjs`, `focus6.mjs`).

1. **Action enumeration** — parsed all 57 `lib/*.mjs` for `action==='x'`, `[...].includes(action)`,
   `switch(action){case 'x'}` and `action!=='x'`. **229 distinct action strings.** The naive
   `action==='` grep alone returns 178, so 51 actions ride in `includes()` guards or the
   `opening.mjs` switch — including `banquetPrepare`, `potionStock`, `useConsumable`,
   `trainBlessingsMax`, `starFamiliar`, `northTile`, `wishRecruit`, `toggleKeepsake`,
   `educateBatch`, `frontierWave`, `towerFight`, `activateFamiliarNode`, `summonForge`,
   `tradeBuy`, `storyOpen`, `galleryView`, `upgradeFish`, `useFarmEssence`, `useHireCards`,
   `useFountainTonic`, `useFountainElixir`, `originalQuality`, `stageTransfer`, `mineDeploy`,
   `harvestFarm`, `startExpo`, `startWorkshop`, `receiveInnGuests`, `wardrobeEquip`.
2. **Dispatch probe** — every one of the 229 actions dispatched against two real states (fresh
   save; and a prepared save with all Fellows/Family, 1e12 gold, stocked inventory, original
   progression on, four enterprises open), each with a module-aware grid of targets and values
   (including `seq` tokens harvested from the live state, in both `{seq}` and bare-number shapes).
   ~700 argument combinations per action.
3. **Facility pass** — farm, workshop, inn, expo, treasure, north, trade, roaming, stella,
   staffing, museum, apothecary, wardrobe, familiars opened first, then their sub-actions probed,
   because most probe refusals were "open this system first", not real economy gates.
4. **Paid-counterpart runs** — `summonRecruit`, `paidStaffHire`, `forgeArtifact`, `openingBuild`,
   `openEnterprise`, `buyGift`, `unlock`, `buildingUpgrade`, `buySupply`, `useConsumable`,
   `wishDraw` each executed to confirm they really debit.

Probe classification over the 229: **52 GRANTS, 10 CHARGES(+GRANTS), 1 NEUTRAL, 166 refused** on
the two base states; the facility pass then resolved ~60 of the refusals. Actions never observed
succeeding are listed under "Not verified by running" at the end and are marked *read, not run*.

---

## Ranked findings — free actions that most undermine an earned economy

### 1. `hireEmployees` — businesses.mjs — CRITICAL. A free door beside a complete paid one.

**Observed.** On a fresh save: `openEnterprise('Building_101')` charged 50 gold (gold 250→200),
then `hireEmployees('Building_101', 10)` → *"Sandbox: 10 employees joined Inn."*, **gold 200→200
(delta 0)**, employees 0→10. Then `hireEmployees(...,5000)` → employees 10→5000, **gold delta still
0**. Accepted batch sizes are `[1,10,50,200,800,5000]` up to `employeeCap=5000` per business, and
there are 17 businesses.

**Paid counterpart: yes, in the same dispatch function.** `businessAction` calls
`staffingAction(...)` on its first line, so `paidStaffHire` is literally the branch above the free
one. Observed on the paid path: `startPaidStaffing` → `paidStaffHire('Building_101', 10)` → *"Employees
hired with gold."*, **gold 1e9 → 999,999,753 (−247)**. The same 10 employees: 0 gold vs 247 gold.
At the 5000 cap the gap is **0 vs 17,947,744,076,849 gold** (`staffPrice('Building_101',10,4990)`).

Worse: the free door is **not closed by opting into the paid path**. After `startPaidStaffing` on
Building_101, `hireEmployees(...,50)` still succeeded for 0 gold (employees 10→60). *(Read, not run:
in `staffingStatus`, free hires are recorded as `kind 0` events and raise quality coverage via
`q=Math.max(q,coverage(employees))`, which lifts the employee cap without consuming materials; the
yield bonus itself is only added by `kind 2` upgrades.)*

Employee income is the dominant income term — `enterpriseRate` is `(employeeIncome + rosterOperation) × (1+bonus)`
summed over businesses — so this single action is the biggest economy bypass in the game.

**Original data to price it: yes, already parsed and implemented.**
`lib/staffing-data.json` → `businesses.<id>.addStaffCost` (Building_101 = 100000) and `bands[]`
(`consumeCoefficient` / `consumeCoefficientTotal`), copied from the original's `BuildingLevel.json`
(verified identical: row 1 `staffCount [0,5]`, `consumeCoefficient "25000000"`,
`consumeCoefficientTotal "24414"`). `staffPrice()` already computes the exact curve.

**Recommendation.** Delete `hireEmployees` and point the Employees tab (`app/business-panel.tsx`,
`app/paid-staffing.tsx`) at `paidStaffHire`; or, if the batch sizes must stay, charge
`staffPrice(target, b.employees, count)` inside `hireEmployees`. Confidence: **high** (both sides run).

### 2. `claimStaffingMaterials` — staffing.mjs — HIGH. Free currency for a priced sink.

**Observed.** `claimStaffingMaterials` → *"Sandbox: 100 building upgrade materials added."*,
`staffingMaterials.stock 0→100`, `claims 0→1`, no debit anywhere. Repeatable to `claims` 1e6 /
`stock` ~1e6 — i.e. ~100 million materials.

**Paid counterpart: yes.** `upgradeStaffQuality` consumes `staffingRule(id,q).cost` of exactly this
material (Building_101 quality costs 5, 10, 25, 50, 75 … across 26 tiers) — *read, not run* for the
debit itself (my probe passed a bad target), but the consumption is unconditional in code and
`validStaffingReserve` enforces `stock === claims*100 − spent`.

**Original data: yes.** `BuildingQuality.json` → `consume` = `Item_StarUp_Building_1_1` ×5/10/25/50/75…
per quality tier (already mirrored in `staffing-data.json` `qualities[].cost`). Acquisition side:
the material appears in **3,631 rows of `Rewards.json`**, notably `Reward_DailyTaskReward_03`
(count 1, daily task), `Reward_CityExchanger_01` (count 50, exchange), `Reward_GoldShopNormal_04`,
`Reward_SimGame1Task_01` (count 2). So the original's rate is ~1/day plus shop/exchange bundles —
not 100 per click.

**Recommendation.** Replace with a habit-gated daily grant of 1–2 (mirroring `Reward_DailyTaskReward_03`)
plus a 50-per-purchase exchange (mirroring `Reward_CityExchanger_01`) in the banquet/trading shop.
Confidence: **high**.

### 3. `recruit` / `recruitAll` / `welcome` / `welcomeAll` — game.mjs — HIGH. Already-known shape, still open.

**Observed.** `recruit` (no target) → *"Fifi joined your village!"*, gold 250→250. `recruitAll` →
*"Welcomed 153 Fellows"*; `welcomeAll` → *"Welcomed 105 family members"*; all with zero debit of
gold, crystals or any item.

**Paid counterpart: yes, covering the same ids and both rosters.** With summon currency stocked,
`summonRecruit` charged for every id I tried: `hero_1` → *"joined for 3 Acquaint Stone Fragments"*
(fragments 999→996), `hero_52` → *"1 Acquaint Stones"*, and — importantly — **family too**:
`wife_2` → *"Charlotte joined for 3 Acquaint Stone Fragments"*, `wife_1` likewise. So `welcome`
is a free door beside a charged one, not an unpriced system.

**Original data: yes.** `SUMMON_COSTS` in `lib/summon.mjs` (N 3 frag / R 5 frag / SR 1 stone /
SSR 2 / SSR+ 3 / UR 2 insignias) — the faucet-map already records these as matching the original.
Original-side acquisition of the equivalents: `HeroSpirit.json` → `heroSpiritCost` =
`Item_Owner_HeroPiece_<id>`, and 1,377 `Rewards.json` rows grant hero pieces (mostly
`ESCReborn_ExchangeShop_HeroPiece_*`).

**Recommendation.** Delete `recruitAll`/`welcomeAll` (0 UI dispatch sites — they are test/CLI only),
and make `recruit`/`welcome` fall through to `summonRecruit`'s cost table. Caveat on cost of change:
`recruit` appears in **40 test files** and `welcome` in **29**, so they are load-bearing fixtures;
a shim (`recruitFree` for tests, or seeding rosters directly) is needed before removal.
Confidence: **high** on the finding, **high** on the fixture cost.

### 4. `claimOriginalSupplies` — original-progression.mjs — HIGH.

**Observed.** → *"Sandbox supplies: up to 10M EXP and 100 of each breakthrough material."*
`fellowXP +10,000,000`, and `originalProgression.stock.Item_Breach_Hero_*` each 0→100 (nine
materials). No debit. Repeatable to `claims` 10,000.

**Paid counterpart: partial.** The sinks are priced — `train` debits fellowXP (observed:
*"Trained 1 levels for 100 EXP"*, fellowXP −100) and `originalQuality` consumes the breach
materials — but there is no charged *source* door beside this one.

**Original data: yes.** `HeroQuality.json` → `consume` (`Item_Breach_Hero_1_1/1_2/1_3` ×1, then ×3,
×5 … over 14 tiers) sizes the material grant; `HeroLevel.json` → `consume` = item `"1"` (Hero EXP)
100, 110, … over 1000 levels sizes the EXP grant — 10M EXP is worth roughly the whole level curve.
Acquisition in the original: `Item_Breach_Hero_1_1` appears in **18,371 `Rewards.json` rows**, i.e.
it is a broad drop, never a self-serve button.

**Recommendation.** Convert to a per-stage-clear / habit-gated trickle sized against
`HeroQuality.consume`; cap EXP per claim at something near `HeroLevel.consume` for the player's
current level rather than a flat 10M. Confidence: **high**.

### 5. `specialBlessingSupply` — special-blessings.mjs — HIGH. Deletes the dating loop.

**Observed.** `specialBlessingSupply('wife_2')` → *"Blessing Points filled to 1 billion."*,
`family.wife_2.points 0 → 1,000,000,000`, nothing spent.

**Paid counterpart: yes — the entire dating economy.** Observed: `date` grants **+10 Blessing
Points** and consumes date energy (energy is the gate); `bless` spends `blessingCost(f)` points;
`trainSpecialBlessing` spends points too. One click therefore replaces ~100 million dates.

**Original data: partial.** The original's analogue sinks are `WifeSpirit.json` → `wifeSpiritCost`
(`Item_Owner_WifePiece_<id>`) and `WifeQuenchingConsume.json` → `consume` `{id:"3" (Gold), count:10/20/…}`,
plus `WifeLevel.json` intimacy/charm thresholds. There is no original table that hands out a
points balance, which is itself the finding.

**Recommendation.** Delete outright — the earned path (dates, energy-gated) already exists and is
the single-player design's intended loop. Confidence: **high**.

### 6. `stellaSupply` — stella.mjs — MEDIUM-HIGH.

**Observed.** `stellaSupply('hero_52')` → *"Prepared 1,000 Angie fragments · free sandbox."*,
`stella.stock.Item_Owner_HeroPiece_52 0→1000`. Repeatable per Fellow to 1e6 balance / 10,000 grants.

**Paid counterpart: yes.** `stellaUpgrade` consumes the fragments (*read, not run* — my probe could
not satisfy its Fellow/curve precondition; `stellaActivate` did run and consumed the stock down to 0
in the observed diff).

**Original data: yes.** `HeroSpirit.json` → `heroSpiritCost` = `Item_Owner_HeroPiece_<heroId>` with
per-rank counts; 1,377 `Rewards.json` rows grant those pieces, dominated by
`ESCReborn_ExchangeShop_HeroPiece_*` (an exchange shop, i.e. a priced door).

**Recommendation.** Move fragments behind an exchange purchase mirroring the ESCReborn shop, or a
habit-gated daily. Confidence: **high** on the grant, **medium** on the sink (read, not run).

### 7. `claimConsumable` — consumables.mjs — MEDIUM-HIGH.

**Observed.** `claimConsumable('Item_HeroEXP_Resources_1')` → *"Sandbox: added 10 Exp Stone."*,
inventory +10, nothing spent. Works for **any** id in `CONSUMABLES`, including
`Item_HeroEXP_Resources_4` (Ancient Exp Stone, 250,000 Fellow EXP each) and the intimacy/charm items.
Cap 1e6 per item.

**Paid counterpart: yes on both sides.** `useConsumable` debits the item (observed: *"Used 1 Exp
Stone: +2,500 Fellow EXP"*, inventory −1, fellowXP +2500) and `buySupply` charges gold for supply
items (observed: *"1 supplies purchased for 200 gold"*, gold −200) — but `buySupply` prices only a
handful of ids, which `docs/faucet-map.md` already records ("3 of 84 artifacts carry a price").

**Original data: yes, as drops.** `Item_HeroEXP_Resources_1` appears in **537 `Rewards.json` rows**
(`Reward_CityDailyEvent_14`, `Reward_SevenDaysGoalReward_*`, `Reward_SimGame1Task_01`). The original
never sells them from a claim button; they fall out of daily events and sim-game tasks.

**Recommendation.** Route through `buySupply` with a gold price, or make the grant a
daily-event reward tied to systems Everkai already has (inn tasks, roaming). Confidence: **high**.

### 8. `stageSupply` — raphael-progress.mjs — MEDIUM. Free stamina, no alternative source.

**Observed.** → *"100 event Stamina prepared · free sandbox."*, `raphaelEvent.stamina 0→100`,
repeatable to 1e6. `docs/faucet-map.md` already flags this as the event's only stamina source.

**Paid counterpart:** none. **Original data: none found.** `StageEvent.json` carries only
`{_id, icon, eventType, reward}` — no stamina field. The nearest original precedents are
`System.json` recovery constants for other modes (`minigame1_InitStamina 100`,
`minigame1_RecoverTime 300`, `navigation_maxStamina 60`, `navigation_staminaRecover 1200`).

**Recommendation.** Give it timed daily recovery, copying the pattern `treasureState`/`northern`
already use (both of which were converted this way); rate has no original number, so choose locally
and document that. Confidence: **high** on behaviour, **low** on any parity number.

### 9. `refillInnStamina` — inn.mjs — MEDIUM. Free refill *and* no natural recovery.

**Observed.** With inn stamina forced to 0: `refillInnStamina` → *"Sandbox stamina refilled."*,
stamina 0→20, gold delta 0. And the confirming half: **`settle()` over 8 hours left stamina at 0** —
so the faucet-map's claim that inn stamina has no other source is correct and still true.

**Original data: yes, for both cap and source.** `SimGame1Level.json` → `energyLimit` (10 at level 1,
rising per level) and `System.json` → `ItemItemSimGame1EnergyLimit 60`; the item
`Item_GetSimGame1_Energy` appears in **355 `Rewards.json` rows** including `Reward_DailyTaskReward_16`
(daily task) — i.e. the original tops inn energy up through daily tasks, plus `Item_SimGame1_Energy`
as the consumable.

**Recommendation.** Add timed recovery to `settleInn` (cap from `SimGame1Level.energyLimit`), then
make the button a habit-gated daily top-up mirroring `Reward_DailyTaskReward_16`, and delete the
free refill. Confidence: **high**.

### 10. `restockWorkshop` — workshop.mjs — MEDIUM. Not in the faucet map at all.

**Observed.** → *"20 local Workshop Supplies added."*, `workshop.supplies 20→40`, gold delta 0.
Repeatable to 1e9.

**Paid counterpart: yes, adjacent.** `buyWorkshopPearl` in the same module refuses until *"Collect
2,000 Workshop coins"* — so the module already knows how to charge. **Original data:** no direct
table in the private-server set; `SimGame3Yield.json` / `System.json SimGame3_*` cover the farm
sim, not this local workshop.

**Recommendation.** Charge workshop coins or gold per restock. Confidence: **high** on behaviour,
**low** on a parity price.

### 11. `adoptFamiliar` / `adoptFamiliars` — familiars.mjs — MEDIUM.

**Observed.** `adoptFamiliar('Pet_1191')` → *"Familiar welcomed for sandbox play."*; `adoptFamiliars`
→ *"All familiars welcomed"*, adding every familiar at level 1 / 0 stars. No debit.

**Paid counterpart:** none in Everkai (`trainFamiliar`/`starFamiliar` are the sinks).
**Original data: yes.** `Pet.json` → `Item` (`Item_Owner_Pet_<id>`), `ItemSP`, `Piece`
(`Item_Owner_PetPiece_<id>`); `PetCatchItem.json` → `Item` (`Item_PetCatch1/2/3`) with per-rarity
catch probabilities (N 7000 / R 1000 / SR 720 / SSR 310 at grade 1); `PetStar.json` → `Cost`.

**Recommendation.** Adopt by spending a catch item / pet piece; keep `adoptFamiliars` for tests only
(8 and 6 test files depend on them respectively). Confidence: **high**.

### 12. `claimMuseum` / `claimKeepsake` — museum.mjs — MEDIUM (they carry stat bonuses).

**Observed.** `claimMuseum` → *"Sandbox: 31 keepsakes collected."* — the whole collection in one
click; `claimKeepsake('Collection_24')` grants one. `museumBonus()` turns accepted keepsakes into
`aptitude` / `basicPowerPercent` / `powerPercent`, so this is not purely cosmetic.

**Original data: partial but usable.** `Exhibit.json` → `connectType`: 11 of 137 exhibits are
`VIPGuestGift` (earned from VIP guests), the other 126 `None`; `Collection_24` itself appears in 4
`Rewards.json` rows (`Reward_Maidragon_MainTaskProgress_*`, i.e. event task progress).

**Recommendation.** Tie keepsakes to the inn's VIP-guest path — `claimInnGift` already exists and is
properly gated (observed refusal: *"Serve this special visit and collect its treasure once"*) — and
delete `claimMuseum`. Confidence: **high** on behaviour, **medium** on the mapping.

### 13. `claimExpoStall` — expo.mjs — MEDIUM-LOW.

**Observed.** → *"Stall received · free sandbox claim."*, `expo.stalls.<id>=1`. `assignExpo` then
assigns a Fellow free. **Original data: yes.** `ESCRebornBoothLevel.json` → `upgradeCost` per booth
level, `ESCRebornLevel.json` → `buildCoin`, `ESCRebornEvent_BoothNormal.json` → `unlockLevel`.
**Recommendation.** Charge `buildCoin` / gate on `unlockLevel`. Confidence: **high**.

### 14. `finishFarm` (and `finishWorkshop`) — farm.mjs / workshop.mjs — MEDIUM-LOW. Free time-skip.

**Observed.** After sowing, the plot's `readyAt − lastAt` was 180,000 ms; `finishFarm(0)` →
*"Sandbox: plant matured. Harvest when ready."* set it to **0** with gold delta 0, and
`harvestFarm(0)` immediately succeeded (*"10 Rattle Grapes harvested. +6 Knowledge."*). So the timer
is fully bypassable for free, repeatedly.
`finishWorkshop` is the same shape in code but is **read, not run** — I could not start a workshop
job (refused: *"Choose an owned Fellow matching this product's sandbox type"*).

**Original data: none found.** The private-server set has no speed-up/diamond-skip table for
SimGame3; plant durations live in `SimGame3Plant.json` (`time`, `FinalTime`).
**Recommendation.** Delete, or charge crystals per skipped minute (local number, not parity).
Confidence: **high** for farm, **medium** for workshop.

### 15. Lower impact, still free (all observed unless noted)

| Action | Module | Observed | Paid counterpart | Original data |
|---|---|---|---|---|
| `sandboxSupplies` | game.mjs | +10 of each gift, energy to cap | yes — `buyGift` charges 100 gold (observed gold −100) | gifts priced locally; faucet-map already covers |
| `expandSchool` | education.mjs | `school.seats=5`, free | none | none found in private-server set (`HeroEducateLevel.json` exists only in apk-audit configs) |
| `developInnRecipe` | inn.mjs | adds a menu recipe free | `openingRecipe` is the gated twin (staff count + `preFood`) | opening-data inn recipes (`unlockCondition.count`) |
| `wardrobeCollect` | wardrobe.mjs | costume collected free; module states "grants no stat bonuses" | none | `WifeClothes.json` → `consume` = `Item_ClothesChip_<id>` ×1 + `unlockIntimacy` 300/500; 783 reward rows grant chips |
| `claimCrownKohaku` | fishing.mjs | one-time Gold Crown Kohaku + aptitude effect | none | Fish tables (not chased) |
| `activateGraduationBond(s)`, `bondAffinity`, `bondAssign` | education/bonds | flags/bonds enabled free | none | not chased |
| `openFarm`, `openWorkshop`, `openInnService`, `apothecaryOpen`, `treasureStart`, `northStart`, `tradeBegin`, `openingStart` | various | systems open for free (apothecary also gifts 1 starter potion) | — | the original gates systems by condition, not price: `SystemUnlock.json` → `unlockCondition` (`PlayerLevel`, `WifeCount`, `Stage`). Note `openWorkshop`/`openInnService` already require the *paid* `Building_301`/`Building_101` |

### Confirmed CHARGES (the contrast is real, all observed)

`unlock` (−200 gold), `buildingUpgrade` (−200), `buyGift` (−100), `openEnterprise` (−`BuildingBase.consume`,
Inn 50), `openingBuild` (−50 via the opening ledger), `paidStaffHire` (−`staffPrice`),
`buySupply` (−200), `train` (−fellowXP), `aptitude` / `trainTalent` / `fellowSkill` (−items),
`useConsumable` (−item), `recycleArtifact` (−copy, +5 ore), `forgeArtifact` (−10 Magic Ore),
`summonRecruit` (−stones/fragments), `wishDraw` (−9 bottles for 10 wishes), `buildInnStation`
(−100×id gold), `expandFarm` (−knowledge), `collect`/`date`/`autoDate` (energy-gated).
*Read, not run:* `upgradeStaffQuality` (−materials), `upgradeInnStation` (−blueprints).

### Confirmed GATED (refusal text is the evidence)

`baitRefill` — *"Complete a daily habit to refill bait."*; `bottleRefill`, `insightRefill`,
`banquetPrepare`, `roamRefill`, `summonClaimDay/Week` — same habit gate (probe refusals plus
`tests/earned-*.test.mjs` assertions). `claim` (milestone metric), `graduate` (education complete),
`frontierWave`/`startFrontier` (*"Clear the first 30 stages"*), `claimInnGift` (serve the visit
first), `serveInnSpecial`, `upgradeInnStation`, `expandFarm`, `startWorkshop` (preceding product),
`buyWorkshopPearl` (2,000 coins), `crownKohaku`, `acceptKeepsake`, `originalQuality` (level cap).

### Deleted faucets — verified gone

`claimOre`, `claimBait`, `wishSupply`, `claimInsight`, `claimHireCards`, `claimAllGear`, `claimGear`,
`sandboxAdventure`, `refillEducation`, `treasureRefill`, `northSupply` all **throw `Unknown action`**
when dispatched. The faucet-map's conversion table is accurate on these.

---

## Where `docs/faucet-map.md` is now stale

It is accurate on everything it covers, but it only classified *grant-shaped* names, so it misses
the whole "should charge and doesn't" class:

1. **`hireEmployees` is absent entirely** — the single largest bypass, and its paid twin
   (`paidStaffHire`) lives in the same function. The doc's own "Method" warning about naive scans
   applies to itself here.
2. **`recruit` / `recruitAll` / `welcome` / `welcomeAll` are absent**, even though the doc records
   `SUMMON_COSTS` as matching the original in its "Rates, for calibration" section — the priced
   door is documented, the free door next to it is not.
3. **`restockWorkshop`, `expandSchool`, `developInnRecipe`, `adoptFamiliar(s)`, `wardrobeCollect`,
   `finishFarm` / `finishWorkshop`, `treasureStart`, `northStart`, `tradeBegin`, `apothecaryOpen`,
   `activateGraduationBond(s)` are absent.** `finishFarm`/`finishWorkshop` are free time-skips,
   which is a distinct faucet shape the doc never considers.
4. **"Still free (13, none tractable)" understates it.** Measured free-and-unpriced actions number
   ~30 once opens, time-skips and the acquisition actions are counted, and at least four of them
   (`hireEmployees`, `claimStaffingMaterials`, `recruit`/`welcome`, `claimConsumable`) *are*
   tractable because a priced counterpart or an original table already exists in-repo.
5. **`claimStaffingMaterials` is listed as "Blocked — building materials have no other source."**
   That is true inside Everkai today, but the original does state a source: `Item_StarUp_Building_1_1`
   in 3,631 `Rewards.json` rows, including a 1/day daily task and a 50-per-exchange shop row. The
   "no other source" verdict should be re-opened.
6. Header says "Measured 2026-09-19" — a date in the future relative to today (2026-09-12); worth
   correcting so the freshness of the file can be judged.

---

## Not verified by running (read, not run)

These never returned a success in any probe, so their classification below is from source only:
all `banquet*` (seq-token gate), `wishSynthesize`/`wishTransfer`/`wishFairyClaim`/`wishRecruit`,
`summonClaimDay`/`ClaimWeek`/`Forge`/`Star`, all `treasure*` sub-actions after `treasureStart`,
all `north*` after `northStart`, `mineDeploy`/`mineExchange`, `stageBegin`/`Complete`/`Claim`/
`ForgeTransfer`/`Transfer`, `tradeBuy`/`tradeComplete`, `roamQuick`/`roamRefill`, all `opening*`
except `openingStart`/`openingBuild`, `frontierWave`/`retreatFrontier`, `towerFight`/`towerFront`/
`towerParty`, `activateFamiliarNode(s)`/`bindFamiliar`/`unbindFamiliar`, `potionStock`/`potionCollect`/
`potionDiscover`, `upgradeArtifact`/`upgradeArtifactMax`/`enableArtifactEcho`/`recycleTrackedArtifact`,
`limitBreak`, `trainInsight`, `castFish`/`researchFish`/`upgradeFish`/`displayFish`/`removeFish`/
`activateFishCombination`, `startExpo`/`serveExpo`/`upgradeExpo`/`takeExpoPearls`, `educateBatch`/
`educateAllRound`/`educateToMilestone`/`enrollPupil`/`finishSchool`, `useHireCards`, `useFountainTonic`/
`useFountainElixir`, `trainBlessing`/`trainBlessingsMax`/`activateSpecialBlessing`/`trainSpecialBlessing`,
`upgradeStaffQuality`, `finishWorkshop`, most `habit*` variants. Their refusal messages (quoted in
the GATED section above where relevant) are consistent with real preconditions rather than hidden
faucets, but I did not prove that by execution.

## Suggested fix order

1. `hireEmployees` → `paidStaffHire` (largest impact; the fix is a deletion plus a UI re-point, and
   the pricing function already exists and is tested).
2. `claimStaffingMaterials` → daily + exchange, sized from `Rewards.json`.
3. `recruit`/`welcome` → `SUMMON_COSTS`; delete `recruitAll`/`welcomeAll` (mind the 40/29 test files).
4. `claimOriginalSupplies` and `specialBlessingSupply` → gate or delete.
5. `claimConsumable`, `stellaSupply`, `restockWorkshop`, `finishFarm` → price or gate.
6. `refillInnStamina` → build the recovery first (nothing regenerates inn stamina today), then gate.
