import {habitDay,habitEarnings} from './habits.mjs';
import {FARM_PLANTS,farmHarvestPlan,farmPlantLevel} from './farm.mjs';
import {FISH_SKILL_MAX,fishLevelCost,fishExpReady,FISH,FISHING_GROUNDS,groundLevel,fishingLevel,fishingState,castKey,fishingIndex} from './fishing.mjs';
import {INN_GUESTS,innGuestReady} from './inn-guests.mjs';
import {expoStepKey} from './expo.mjs';
import {ROAM_QUICK_MAX,roamStamina,roamingState} from './roaming.mjs';
import {TRADE_OPPONENTS,tradingPost,negotiationEnergy,counter} from './trading-post.mjs';
import {FELLOWS,FAMILY} from './catalog.mjs';
import {bondedPower} from './adventure.mjs';
import {TREASURE_AREAS,treasureState,treasureLevel,tileGem,restorationLevel,RESTORATION_MAX} from './treasure.mjs';
import {NORTH,northern,northernStats,northernSupplies,activeRoom,tileKind} from './northern.mjs';
import {BANQUET_PARTIES,banquetState} from './banquets.mjs';
import {mineState,mineDay} from './mine-clearance.mjs';
import {MINE_ROWS,mineToday,mineUnlocked} from './mine-clearance.mjs';
import {farmOrder,farmTrade} from './farm-trade.mjs';
import {FISH_ARTIFACTS,fishArtifactOwned,fishArtifactLevel,fishArtifactUpgradeCost,fishArtifactPearl,pearls} from './fishing.mjs';
import {innGuestReady as guestReady,innGiftSchoolBonus} from './inn-guests.mjs';
import {innQueueEarnings} from './inn-economy.mjs';
import {innServingGains} from './inn-progression.mjs';
import {expoState,expoStartKey,expoLocker} from './expo.mjs';
import {TREASURE_STAMINA_LIMIT,TREASURE_RELICS} from './treasure.mjs';
import {fishingEducationBonus} from './fishing.mjs';
import {PUPIL_TYPES,METHODS} from './school.mjs';
import {SCHOOL_TYPES,schoolCapacity,requiredLessons,graduationBond,graduationBonus,STARTING_SEATS,EXPANDED_SEATS} from './education.mjs';
import {tripState} from './family-trips.mjs';
import {MILESTONES,playerRank} from './progression.mjs';
import {ACHIEVEMENT_CHAINS,chainProgress} from './achievements.mjs';
import {summonState,summonDay,weekStartDay,recruitOffers,STONE_FRAGMENTS_PER_STONE,WEEK_DAYS_FOR_BONUS} from './summon.mjs';
import {STELLA_PROFILES,stellaActivation,stellaEntry,stellaPlan,stellaState,crossoverStella} from './stella.mjs';
import {fellowById,ORIGINAL_FELLOWS} from './catalog.mjs';
import {ADDITION_FELLOWS,additionRank} from './everkai-additions.mjs';
import {fountainState,fairyAvailable,wishCost} from './fountain.mjs';
import {villageState,villageEventById,villageManageStep,villageManageLocked} from './village-events.mjs';
import {stageEvent,STAGE_MILESTONES,FORGE_REWARD_ITEM} from './raphael-progress.mjs';
import {stageState} from './raphael.mjs';
import {WORKSHOP_PRODUCTS,workshopMastery,workshopAvailableXP,workshopUnlocked} from './workshop.mjs';
import {stageAt,stageReady,ladderPower,patrolCharges} from './adventure.mjs';
import {FAMILIARS} from './familiars.mjs';
import {dispatchState,dispatchDone,familiarPower,dispatchTeamPower,DISPATCH_AREAS,DISPATCH_TEAM,dispatchUnlocked} from './familiar-dispatch.mjs';
import {towerState,towerKey,TOWER_FLOORS} from './familiar-tower.mjs';
import {OPENING,RANK_ENCOUNTERS,openingTask,openingRequirement,openingAutoGate,rankCost,MAX_RANK} from './opening.mjs';
// The Little Helper -- Everkai's equivalent of the original's Trusteeship system (QOL-01).
//
// WHAT THE ORIGINAL DOES, measured from configs/config/logic/Trusteeship.json (40 rows under a
// `Trusteeship` wrapper key) and the private-server executor map (outputs/private-server/
// hosted_mapping.json, which names every executor's result key):
//   - 40 tasks grouped into 20 categories by `superiors`, ordered by `order`.
//   - `isSelect` is the DEFAULT-ON flag: 36 of 40 rows carry it, 4 are default off.
//   - 14 of 40 carry an `unlockCondition` -- the task is hidden until its own system is open
//     (SimGame1_Level 7, UnlockFirstMedicine, fish_guide, MuseumGuide, PetTowerGuide, PlayerLevel...).
//   - zxSystemConstant.TrusteeshipOutMaxCount = 50 caps one run.
// The executor names settle what the feature is FOR: pickBuild, cityHarvest, harvestOneKey, gainBait,
// museumInfo, petTowerData, simgameOneWelcome, simgameCollect, hostedMedicineInfo, dailyPackage,
// collectionTax. It is a COLLECTION automator. Not one executor spends, upgrades or chooses.
//
// WHAT EVERKAI DOES WITH IT. Two deliberate differences, both stated rather than silent:
//  1. The original SELLS the helper (PanelTrusteeshipBuy.lua: btn_costItem/btn_voucher/btn_recharge,
//     CheckTrusteesshipIsFree). Everkai has no monetisation, so the gate is the game's own currency:
//     completing a daily habit arms the helper for that day. Same gate as the bait refill.
//  2. The helper REPLAYS THE PLAYER'S OWN ACTIONS through act(). It has no reward table and grants
//     nothing directly, so it cannot become a faucet -- every per-day gate (museumDay, supplyDay,
//     restockDay, refillDay) still refuses it exactly as it refuses a tap. That is the whole safety
//     argument, and tests/helper.test.mjs is the negative control for it.
// Tasks began in the original's own spirit (collect-only) and now cover every repeatable loop the engine
// has. Anything that spends GOLD is marked `defaultOff` and sits in the panel's spending group.
export const HELPER_RUN_CAP=50;
// The cap the original puts on one helper run. Chores that loop (casting, sowing) share it rather than
// running until a resource is exhausted, so a run is always bounded and always explainable.
export const CHORE_STEP_CAP=HELPER_RUN_CAP;

// ---------------------------------------------------------------------------------------------
// MINIGAME CHORES. The first version of this file automated collection only, on the reading that the
// original's Trusteeship executors all collect. That reading was too narrow: harvestOneKey (_10),
// simgameOneWelcome (_31) and sg3OrderCommitOneKey (_28) PLAY their minigame's repetitive loop, they
// do not merely bank its takings. So the helper does the chores too.
//
// The line that does NOT move for a default-on chore: it never spends gold or crystals. (It does buy an
// upgrade where the currency can buy nothing else -- a Fellow's own Stella fragments or Sales EXP.) Where a
// chore has to CHOOSE, the rule is written here as a local policy rather than left to look like the
// original's -- the original's helper has no such policy, because in the original the player has
// already chosen and the helper only repeats. These rules are mine, and are stated so they can be argued
// with. The invariant a test pins: a helper run never decreases gold or crystals.
// ---------------------------------------------------------------------------------------------

/** LOCAL POLICY: sow the plant with the best throughput -- most crop per hour at the level this farm
 *  has actually earned for it -- and break ties toward the shorter timer so a plot cycles sooner. */
export function bestPlant(s){
 const f=s.farm;if(!f)return null;
 let best=null;
 for(const plant of FARM_PLANTS){
  const level=farmPlantLevel(f,plant.id),plan=farmHarvestPlan(plant.id,level);
  if(!plan||!plan.seconds)continue;
  const rate=plan.amount/plan.seconds;
  if(!best||rate>best.rate||(rate===best.rate&&plan.seconds<best.seconds))best={id:plant.id,rate,seconds:plan.seconds};
 }
 return best&&best.id;
}
/** LOCAL POLICY: fish the unlocked ground holding the most species this collection is still MISSING,
 *  breaking ties toward the deeper ground.
 *
 *  This replaces "fish the deepest unlocked ground", whose comment claimed deeper grounds carry the
 *  species a collection is missing. MEASURED against lib/fishing-draw-data.json and fishing-species.json,
 *  that claim is false in both halves:
 *   - Ground sizes do not grow with depth. Village River(lv1) 10 species, Drakenberg River Bank(2) 19,
 *     Inner Lake(4) 20, Lake Center(5) 20, Island Beach(6) 17, Center of the Reef(8) 20, Island
 *     Coastline(10) 18, Crushed Ice(20) 17, Glacier Bay(25) 18, Unfrozen Sea Cave(30) 19. Past fishing
 *     level 5 the deepest unlocked ground is NEVER the largest -- at levels 10-19 it is Island Coastline
 *     (18) while three shallower grounds hold 20.
 *   - Grounds overlap heavily: only 1-4 species of any ground (Village River aside) are exclusive to it,
 *     so a shallower ground is not "fish already in the book".
 *  Simulated from a fresh save on the shipped draw (deterministic, castRoll is keyed on the catch number):
 *  after 400/800/1600 casts the deepest rule reaches 37/39/39 distinct species and this rule reaches
 *  43/51/59. The deepest rule stalls because it locks onto one 18-species ground for ten levels.
 *  When every unlocked ground is complete the two rules agree, because the tie-break is depth. */
export function bestGround(s){
 const f=s.fishing;if(!f)return null;
 const index=fishingIndex(f),have=index.first;
 const level=fishingLevel(index.exp).level;
 let best=null,bestMissing=-1,bestLevel=-1;
 for(const g of Object.keys(FISHING_GROUNDS)){
  const need=groundLevel(g);
  if(need===null||need>level)continue;
  let missing=0;
  for(const r of FISH)if(r.locations.includes(g)&&!have.has(r.id))missing++;
  if(missing>bestMissing||(missing===bestMissing&&need>bestLevel)){bestMissing=missing;bestLevel=need;best=g}
 }
 return best;
}

/** LOCAL POLICY for the Trading Post. Read the payout before reading the opponents: tradingAction sets
 *  coinPerWin:30 and influencePerWin:2 as CONSTANTS -- a win pays the same against the Apprentice as
 *  against the Veteran -- and every Fellow on the team pays one Negotiation Energy whether they win or
 *  lose (`paidEnergy:1`, and validRun pins `won === power >= opponent.power`). So Power above the win
 *  threshold buys nothing, and a Fellow who cannot clear it is pure loss. Two rules follow:
 *   - OPPONENT: the WEAKEST of TRADE_OPPONENTS. Because the test is a single `>=` against one number, a
 *     weaker opponent's winner set CONTAINS every stronger one's, so it can never yield fewer wins, and
 *     it yields them from the cheapest Fellows.
 *   - TEAM: up to six energised Fellows who beat it, taken from the WEAKEST up. A stronger Fellow wins
 *     everything a weaker one wins, so spending the weak ones first costs no reward today and leaves the
 *     strong ones' Energy for a harder opponent the player may pick by hand.
 *  If nobody with Energy clears even the weakest opponent, this returns null and the chore begins
 *  nothing: a losing run burns Energy for zero coins. Power is bondedPower(), the formula the module and
 *  the panel already use -- not one invented here. */
export function bestNegotiation(s){
 if(!s.fellows)return null;
 const opponent=TRADE_OPPONENTS.reduce((a,b)=>a&&a.power<=b.power?a:b,null);
 if(!opponent)return null;
 // Walk FELLOWS rather than the save's keys, exactly as the panel's roster does: tradeBegin looks the
 // name up in FELLOWS, so an id on the save that is not in the catalogue is not a fieldable Fellow.
 const ready=FELLOWS.filter(f=>s.fellows[f.id]&&negotiationEnergy(s,f.id).energy>=1&&bondedPower(s,f.id)>=opponent.power)
  .map(f=>({id:f.id,power:bondedPower(s,f.id)}))
  .sort((a,b)=>a.power-b.power||(a.id<b.id?-1:1));
 if(!ready.length)return null;
 return {opponent:opponent.id,team:ready.slice(0,6).map(p=>p.id)};// validRun caps a team at six.
}

/** Panel groups, in display order. `group` is presentation only: the RUN order is the array order below,
 *  which matters (producers before the chores that consume what they produce). */
export const HELPER_GROUPS=[
 {id:'collect',    label:'Collect & claim'},
 {id:'minigames',  label:'Play the minigames'},
 {id:'progression',label:'Progress with free resources'},
 {id:'spending',   label:'Spends gold · off until you switch it on'},
];
export const HELPER_TASKS=[
 // `waiting` exists only where the underlying action SUCCEEDS on an empty claim: `collect` banks
 // zero gold and still returns a state, so without this the helper would report a chore it did not do.
 {id:'village',   group:'collect', action:'collect',                 label:'Collect village earnings', note:'Trusteeship_14 pickBuild / _34 cityHarvest', waiting:s=>Math.floor(s.pending)>=1},
 {id:'inn',       group:'collect', action:'collectInnDeposit',       label:'Collect the Inn takings',  note:'Trusteeship_32 simgameCollect'},
 {id:'workshop',  group:'collect', action:'collectWorkshop',         label:'Collect the Workshop',     note:'Trusteeship_28 sg3OrderCommitOneKey'},
 {id:'apothecary',group:'collect', action:'potionCollect',           label:'Collect the Apothecary',   note:'Trusteeship_35/36 hostedMedicineInfo'},
 {id:'museum',    group:'collect', action:'claimMuseum',             label:'Claim Museum revenue',     note:'Trusteeship_27 museumInfo'},
 {id:'familiars', group:'collect', action:'collectFamiliarSupplies', label:'Collect familiar supplies',note:'Trusteeship_30 petTowerData'},
 {id:'supplies',  group:'collect', action:'claimStaffingMaterials',  label:'Claim the daily materials',note:'Trusteeship_18 dailyPackage'},
 {id:'breach',    group:'collect', action:'claimDailyBreach',        label:'Claim daily breakthrough materials',note:'Local: the habit-gated daily in lib/original-progression.mjs; same shape as Trusteeship_18 dailyPackage'},
 {id:'keepsakes', group:'collect', action:'acceptMuseum',            label:'Accept new Museum keepsakes',note:'Local: accepting only adds a bonus that stays even when stored, so no choice is taken away'},
 {id:'habitRewards',group:'collect',label:'Claim habit rewards and forge Acquaint Stones',note:'Local: summonClaimDay / summonClaimWeek, then summonForge stone', run:runHabitRewards},
 // Chores below RUN a loop instead of firing one action. `run` returns the state it reached and how many
 // steps it took; 0 steps means nothing was waiting and the task reports as skipped.
 {id:'farm',      group:'minigames', label:'Work the Magic Farm',       note:'Trusteeship_10 harvestOneKey',      run:runFarm},
 {id:'fishing',   group:'minigames', label:'Fish while bait lasts',     note:'Trusteeship_11 gainBait',           run:runFishing},
 // After the fishing chore, never before it: see the note in runFishing. A player who switches fishing
 // off still gets the refill from here.
 {id:'bait',      group:'minigames', action:'baitRefill',              label:'Refill fishing bait',      note:'Trusteeship_11 gainBait'},
 {id:'innGuests', group:'minigames', label:'Welcome the Inn guests',    note:'Trusteeship_31 simgameOneWelcome',  run:runInnGuests},
 {id:'innService',group:'minigames', label:'Serve Inn guests with stamina',note:'Trusteeship_31 simgameOneWelcome (the ordinary guest queue)', run:runInnService},
 {id:'expo',      group:'minigames', label:'Serve the Expo stalls',     note:'Trusteeship_37 hostedTDHangupReward',run:runExpo},
 {id:'restock',   group:'minigames', action:'restockWorkshop',          label:'Restock the Workshop',             note:'Trusteeship_28 sg3OrderCommitOneKey'},
 {id:'workshopCraft',group:'minigames',label:'Craft at the Workshop',   note:'Trusteeship_28 sg3OrderCommitOneKey (starting the batch)', run:runWorkshopCraft},
 // Provenance for these two, measured rather than guessed: hosted_mapping.json has NO executor matching
 // roam/travel/trade/negotiation (positive control -- pickBuild, cityHarvest, gainBait, collectionTax and
 // harvestOneKey all come back from the same search). So neither chore claims a row it does not have. The
 // nearest original relatives are _11 gainBait, whose daily refill is the pattern the stamina refill
 // copies, and _40 hostedCommercialwarTax, the merchant-competition takings a single-player Trading Post
 // is the adaptation of.
 {id:'roaming',   group:'minigames', label:'Roam while stamina lasts',  note:'Local chore; refill follows Trusteeship_11 gainBait', run:runRoaming},
 {id:'trading',   group:'minigames', label:'Run the Trading Post',      note:'Local chore; nearest is Trusteeship_40 hostedCommercialwarTax', run:runTrading},
 {id:'treasure',  group:'minigames', label:'Run the Treasure Hunt',     note:'No Trusteeship executor covers the dig; same loop-playing spirit as harvestOneKey _10', run:runTreasure},
 {id:'mine',      group:'minigames', label:'Deploy Fellows in the Mine',note:'Local chore: one deployment per Fellow per day, strongest first', run:runMine},
 // After the producers deliberately: the duplicates chore consumes what the chores above PRODUCE
 // (fishing's duplicate catches, the Treasure Hunt's duplicate relic materials, Mine Coins).
 {id:'duplicates',group:'progression', label:'Spend duplicates on their own items',note:'Local chore: every duplicate sink has exactly one destination', run:runDuplicates},
 {id:'banquets',  group:'minigames', label:'Run the Private Banquets',   note:'Local chore: no banquet executor in hosted_mapping.json', run:runBanquets},
 {id:'northern',  group:'minigames', label:'Explore the Northern Odyssey',note:'Local chore: no dungeon executor in hosted_mapping.json',run:runNorthern},
 {id:'fountain',  group:'minigames', label:'Make wishes at the Fountain',note:'Local chore: habit bottle refill, wishes in batches, fairy rewards', run:runFountain},
 {id:'villageEvents',group:'minigames',label:'Walk the village',        note:'Local chore: the daily village event and the adviser chain; quiz answers stay yours', run:runVillageEvents},
 {id:'raphael',   group:'minigames', label:'Run Raphael support runs',  note:'Local chore: daily event Stamina, support runs, milestone rewards', run:runRaphael},
 {id:'familiarTower',group:'minigames',label:'Climb the Familiar Tower',note:'Trusteeship_30 petTowerData; only fights a floor the battle replay says it wins', run:runFamiliarTower},
 {id:'dispatch',  group:'minigames', label:'Send familiars on dispatch',note:'Local chore: collect, then send the strongest five to the best open area', run:runDispatch},
 {id:'school',    group:'progression', label:'Run the School',          note:'Local chore: enroll, teach, graduate, open seats and bonds', run:runSchool},
 {id:'campaign',  group:'progression', label:'Patrol cleared campaign stages',note:'Local chore: a patrol refunds its deposit in the same action, so it cannot lower gold', run:runCampaign},
 {id:'stella',    group:'progression', label:'Upgrade Stella with earned fragments',note:'Local chore: spends the shared shard pools on your focus picks first, then your own order', run:runStella},
 {id:'freeRecruits',group:'progression',label:'Invite free characters',note:'Local chore: only characters the Recruit counter prices at zero', run:runFreeRecruits},
 // SPENDING, default OFF: they spend gold, so they run only once the player has switched them on.
 {id:'journeyAuto',group:'spending', defaultOff:true, label:'Full-Auto the journey stages (spends gold)',note:'openingAuto, with the Full-Auto button`s own stop rules', run:runJourneyAuto},
 {id:'campaignBattles',group:'spending', defaultOff:true, label:'Clear new campaign stages (spends gold)',note:'The original`s ladder charges its own table price per stage and pays no gold back', run:runCampaignBattles},
 {id:'journey',   group:'progression', label:'Claim journey quests, events and ranks',note:'Local chore: quest rewards, reward events, rank promotions, earned encounters', run:runJourney},
 // Last, so every chore above has already moved the metrics these claims read.
 {id:'achievements',group:'collect', label:'Claim achievements and milestones',note:'Local chore: every claim only pays', run:runAchievements},
];

// Each runner drives the SAME actions the player taps, through the same act(). None of them chooses an
// upgrade, and none spends gold or crystals -- sowing and watering actually PAY Knowledge rather than
// costing it, and a cast spends bait, which the daily refill replaces.
function runFarm(s,act,now){
 let steps=0;const f=()=>s.farm;
 if(!f())return {state:s,steps:0};
 const plots=()=>f().plots||[];
 // Harvest first, so the plot it frees can be re-sown in the same run.
 for(let i=0;i<plots().length&&steps<CHORE_STEP_CAP;i++){
  const r=act(s,'harvestFarm',now,i,null);if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 for(let i=0;i<plots().length&&steps<CHORE_STEP_CAP;i++){
  const r=act(s,'waterFarm',now,i,null);if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 const plant=bestPlant(s);
 if(plant)for(let i=0;i<plots().length&&steps<CHORE_STEP_CAP;i++){
  const r=act(s,'sowFarm',now,i,plant);if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 // Crop orders. Harvested crops have no other sink in the engine (farm.mjs only ever ADDS to harvests;
 // deliverFarmOrder is the one subtraction), and the three order slots advance through a fixed offer
 // sequence, so delivering whatever the stock already covers is not a choice. Target is the SLOT index,
 // value is that slot's current order key ("slot:serial"), re-read after every delivery.
 for(let slot=0;slot<3&&steps<CHORE_STEP_CAP;slot++){
  while(steps<CHORE_STEP_CAP&&s.farm){
   const order=farmOrder(s.farm,slot);
   if(!order||(s.farm.harvests?.[order.plant]||0)<order.quantity)break;
   const r=act(s,'deliverFarmOrder',now,slot,order.key);
   if(!r||r.error||!r.state)break;
   s=r.state;steps++;
  }
 }
 return {state:s,steps};
}
function runFishing(s,act,now){
 let steps=0;
 // NO `if(!s.fishing) return` GUARD HERE, deliberately: a village that has never fished has no fishing
 // subtree at all, and baitRefill is what creates it. Bailing early left a first-time player's chore
 // permanently idle once the refill moved after this one. bestGround returns null without a subtree, so
 // the first cast pass simply does nothing and the refill below opens the system.
 // SPEND BEFORE REFILLING, the same rule the roaming chore follows and for the same measured reason:
 // baitRefill clamps to BAIT_STORAGE - bait and stamps refillDay either way, so taking it at 45/50 hands
 // over 5 bait instead of 12 and burns the day's refill. Cast the stock down first, take the refill, then
 // cast what it gave. The bait task's own position in HELPER_TASKS is after this chore for the same reason.
 const cast=()=>{
  const ground=bestGround(s);
  if(!ground)return;
  while(steps<CHORE_STEP_CAP&&(fishingState(s).bait||0)>0){
   const r=act(s,'castFish',now,castKey(s),ground);
   if(!r||r.error||!r.state)break;
   s=r.state;steps++;
  }
 };
 cast();
 if(steps<CHORE_STEP_CAP){
  const r=act(s,'baitRefill',now,null,null);
  if(r&&!r.error&&r.state){s=r.state;steps++;cast()}
 }
 return {state:s,steps};
}
function runInnGuests(s,act,now){
 let steps=0;
 if(!s.inn)return {state:s,steps:0};
 // The guest list is the shipped rule set, not a queue on the save. innGuestReady is the same gate the
 // panel shows, so the helper offers exactly the visits the player could accept.
 for(const rule of INN_GUESTS){
  if(steps>=CHORE_STEP_CAP)break;
  if(!innGuestReady(s,rule))continue;
  const r=act(s,'serveInnSpecial',now,rule.id,null);
  if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 // A served special visit leaves a treasure with claimedAt:null. Claiming only pays (claimInnGift), so
 // every finished one is collected. Keyed by the GUEST id, the same key guestGifts is stored under.
 for(const [id,gift] of Object.entries(s.inn?.guestGifts||{})){
  if(steps>=CHORE_STEP_CAP)break;
  if(gift?.claimedAt!==null)continue;
  const r=act(s,'claimInnGift',now,id,null);
  if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 return {state:s,steps};
}
function runExpo(s,act,now){
 let steps=0;
 // Pearls won at the Expo sit in its locker until moved to the Bag, where they are the same Skill Pearls
 // every other source pays. takeExpoPearls is keyed `pearls:<n>:<transferred>` so a stale tap is refused.
 if(s.expo&&s.inventory){
  const n=expoLocker(s).Item_Talent_Hero_1||0;
  if(n>0){const r=act(s,'takeExpoPearls',now,`pearls:${n}:${expoState(s).transferredPearls}`,null);if(r&&!r.error&&r.state){s=r.state;steps++}}
 }
 // Open the next business day ONLY if the saved stall line-up wins it. The whole day is deterministic
 // (expoVisitors is arithmetic over fixed customers and fixed slot sales), so it is played out on a copy
 // through act() first and kept only if the copy cleared a stage. The line-up itself is the player's.
 if(s.expo&&!s.expo.active&&Object.keys(s.expo.assigned||{}).length){
  const cleared=expoState(s).clears.length;
  let trial=act(s,'startExpo',now,expoStartKey(s),null),n=0;
  while(trial&&!trial.error&&trial.state?.expo?.active&&n<5){
   const key=expoStepKey(trial.state);
   trial=act(trial.state,'serveExpo',now,key,null);n++;
  }
  if(trial&&!trial.error&&trial.state&&expoState(trial.state).clears.length>cleared){s=trial.state;steps+=1+n;return {state:s,steps}}
 }
 // serveExpo is keyed by the CURRENT STEP of the active business day, not by a stall id -- serving is
 // a sequence of five customers, so the key has to be re-read after every step.
 while(steps<CHORE_STEP_CAP&&s.expo?.active){
  const key=expoStepKey(s);
  if(!key)break;
  const r=act(s,'serveExpo',now,key,null);
  if(!r||r.error||!r.state)break;
  s=r.state;steps++;
 }
 return {state:s,steps};
}
/** LOCAL POLICY for Roaming: spend the stock down first, THEN take the habit refill, then spend what it
 *  gave. Two measured facts make that the optimal order, not a preference. (a) Stamina recovers 1 per
 *  ROAM_RECOVERY_MS up to roamCap and stops there -- recovery at the cap is capacity thrown away, so a
 *  full stock is the only stock that can waste. (b) roamRefill clamps to the cap (`Math.min(st.cap,
 *  st.stamina+...)`) and stamps refillDay either way, so refilling at 18/20 spends the one daily refill
 *  for 2 points instead of up to ROAM_REFILL_MAX. Every roam pays the same ROAM_FAME and the encounter is
 *  decided by a caller-supplied roll, so there is no better or worse moment to roam: the only thing there
 *  is to optimise is not wasting capacity. The refill is included for the same reason the bait refill is
 *  (Trusteeship_11 gainBait): it spends no gold or crystals, it is gated on the very daily habit that
 *  already armed the helper, and roamRefill refuses it a second time on its own. */
function runRoaming(s,act,now){
 let steps=0;
 // roamOnce reads s.family and s.inventory directly and roamStamina reads the rank; a save without them
 // has no Roaming to drive. `s.roaming` is NOT the test -- roamingState() defaults it, and a save that
 // has never roamed carries no such key, so gating on it would make this chore dead on every new save.
 if(!s.family||!s.inventory)return {state:s,steps:0};
 const spend=()=>{
  while(steps<CHORE_STEP_CAP){
   const st=roamStamina(s),seq=roamingState(s).seq;
   const n=Math.min(st.stamina,ROAM_QUICK_MAX,CHORE_STEP_CAP-steps);
   if(n<1)break;
   // The rolls come from the caller: roaming-panel.tsx taps Go with {seq,roll:Math.random()} for a single
   // point and Quick roam with {seq,rolls:[...Math.random()]} capped at ROAM_QUICK_MAX. Same shapes here,
   // and seq is re-read every dispatch because each roam increments it.
   const r=n===1?act(s,'roamGo',now,null,{seq,roll:Math.random()})
                :act(s,'roamQuick',now,null,{seq,rolls:Array.from({length:n},()=>Math.random())});
   if(!r||r.error||!r.state)break;
   steps+=Math.max(1,st.stamina-roamStamina(r.state).stamina);
   s=r.state;
  }
 };
 spend();
 if(steps<CHORE_STEP_CAP){
  const r=act(s,'roamRefill',now,null,{seq:roamingState(s).seq});
  if(r&&!r.error&&r.state){s=r.state;steps++;spend()}
 }
 return {state:s,steps};
}
function runTrading(s,act,now){
 let steps=0;
 // tradeBegin requires owned Fellows; without the roster there is nothing to field.
 if(!s.fellows)return {state:s,steps:0};
 // COMPLETE before BEGIN, in that order: a saved run makes tradeBegin fail outright ('Complete your saved
 // negotiation first'), and a finished run's rewards were fixed when it started, so banking it is free.
 // tradeComplete is keyed by the RUN's id -- a number on s.tradingPost.run -- not by an opponent id.
 const saved=tradingPost(s).run;
 if(saved&&s.lastAt>=saved.readyAt){
  const r=act(s,'tradeComplete',now,saved.id,{seq:tradingPost(s).seq});
  if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 if(steps<CHORE_STEP_CAP&&!tradingPost(s).run){
  const plan=bestNegotiation(s);
  if(plan){
   // NO MOTIVATE, deliberately. `trading` sits in the `minigames` group, and the SPENDING rule above
   // keeps every chore outside the `spending` group from spending gold. Motivate is priced in gold
   // (floor(cumulative consumeBase.count x village earnings per second)), so the chore always fields
   // the team at Courage 0 and leaves that choice to the player, who can see the price on the panel.
   const r=act(s,'tradeBegin',now,plan.opponent,{seq:tradingPost(s).seq,team:plan.team,courage:0});
   if(r&&!r.error&&r.state){s=r.state;steps++}
  }
 }
 // MY COUNTER (Trusteeship_40 hostedCommercialwarTax, which is what this chore's note already names).
 // Collecting only PAYS, and the store stops accruing once it is full, so leaving it uncollected is a
 // pure loss -- exactly the case the helper exists for. Levelling it spends Goodwill Vouchers, which
 // have exactly one destination (the Counter) and are not gold, so it is the same rule the duplicates
 // chore runs on. The loop stops on its own: each level raises the next level's voucher price.
 if(counter(s)&&steps<CHORE_STEP_CAP){
  const r=act(s,'tradeCollectCounter',now,null,{seq:tradingPost(s).seq});
  if(r&&!r.error&&r.state){s=r.state;steps++}
 }
 while(counter(s)&&steps<CHORE_STEP_CAP){
  const r=act(s,'tradeUpgradeCounter',now,null,{seq:tradingPost(s).seq});
  if(!r||r.error||!r.state)break;
  s=r.state;steps++;
 }
 return {state:s,steps};
}

// ---------------------------------------------------------------------------------------------
// TREASURE HUNT and DUPLICATE SPENDING.
//
// THE DISPATCH CONTRACTS, read out of lib/treasure.mjs, lib/fishing.mjs, lib/northern.mjs and
// lib/mine-clearance.mjs rather than assumed. Each of these refused my first guess:
//   treasureAction(s,action,target,value) opens with `if(value!==old.seq)` -- the VALUE is the
//     expedition sequence number, not null, and `seq` increments on EVERY treasure action, so it has to
//     be re-read before each dispatch. `treasureStart`/`treasureAppraise` take an AREA id ("Relic001"),
//     `treasureDig` a tile index 0-11, `treasureReturn` nothing, and Restore/Donate/Display a RELIC id.
//   northernAction reads `value?.seq`, so northExchange needs an OBJECT {seq}, not a bare number.
//   mineAction reads `value?.seq` AND `value?.day`, and refuses unless day===mineDay(s) (derived from
//     s.lastAt, not from `now`); the quantity rides along as value.count.
//   researchFish targets a CATCH id ("catch:12"), from fishingIndex(f).byId -- not a species id. A
//     species id silently matches nothing, which is exactly how two chores shipped dead.
// ---------------------------------------------------------------------------------------------

// Gemstone tiles first (treasure.mjs: tileGem = i%3===2), then the rest in order.
const TILE_ORDER=[...Array(12).keys()].sort((a,b)=>Number(tileGem(b))-Number(tileGem(a))||a-b);
const areaPool=a=>new Set(a.grades.flatMap(g=>g.pool.map(p=>p.id)));
/** How many relics in this region's appraisal pools the save has never seen. */
export const treasureUnseen=(t,area)=>[...areaPool(area)].filter(id=>!t.relics?.[id]).length;
/** LOCAL POLICY: dig the unlocked region whose appraisal pools hold the most relics this save has never
 *  seen, breaking ties toward the deeper region. Same spirit as the fishing rule above: prefer whatever
 *  advances an INCOMPLETE collection. Measured from lib/treasure-data.json: the four regions hold 12/23/
 *  24/24 distinct pool ids, and a region stays worth digging only while it can still show something new,
 *  so a completed shallow region steps aside on its own without a special case. */
export function bestTreasureArea(s){
 const t=treasureState(s),level=treasureLevel(t);
 let best=null,bestUnseen=-1,bestLevel=-1;
 for(const a of TREASURE_AREAS){
  if(level<a.level)continue;
  const unseen=treasureUnseen(t,a);
  if(unseen>bestUnseen||(unseen===bestUnseen&&a.level>bestLevel)){bestUnseen=unseen;bestLevel=a.level;best=a}
 }
 return best;
}
/** LOCAL POLICY for the rest of the hunt, all of it in that same "advance the incomplete collection" spirit:
 *   - Tiles: gemstone tiles first, because a gemstone is the only thing that becomes a relic. The
 *     remaining tiles are still dug, for the Steeltooth EXP that opens the deeper regions.
 *   - Appraisal: spend banked gemstones BEFORE opening a new expedition, region with the most unseen
 *     relics first, so a run that hits the step cap has already converted what the last run dug.
 *   - Donation and display: an appraised relic pays nothing until it is donated, a donated relic pays
 *     nothing while it is stored, and treasure.mjs has no display limit -- so donate everything and
 *     display everything donated. (This does re-display a relic a player deliberately stored. Stating it
 *     rather than hiding it: switch the chore off if you keep a relic in storage on purpose.)
 *  Restoration is NOT here. It spends a relic's own duplicate materials, so it belongs to the duplicates
 *  chore below and can be switched off independently. */
/** WHY THE TREASURE HUNT HAS ITS OWN BUDGET. Measured from a startingSave played by the helper four times
 *  a day: under the shared 50-dispatch cap one run spends ~36 Steeltooth stamina (one expedition is a
 *  start, twelve digs and a return, then four appraisals), while treasure.mjs refills 150 a day up to 300.
 *  So a player who sends the helper out once or twice a day watched stamina sit at the cap -- the chore
 *  ran, but most of every day's digging was thrown away, which reads exactly as "not automated". The
 *  budget below is DERIVED, not picked: enough dispatches to spend a FULL bar in one run -- every
 *  expedition's start + 12 digs + return + 4 appraisals -- plus one donation per relic that exists. */
export const TREASURE_STEP_CAP=Math.ceil(TREASURE_STAMINA_LIMIT/12)*(1+12+1+4)+TREASURE_RELICS.length;
function runTreasure(s,act,now){
 let steps=0;
 // treasureState() derives the day from s.lastAt; a save without one is not a save, so do nothing.
 if(!Number.isSafeInteger(s?.lastAt))return {state:s,steps:0};
 const room=()=>steps<TREASURE_STEP_CAP;
 const step=(action,target)=>{
  if(!room())return false;
  const r=act(s,action,now,target,treasureState(s).seq);
  if(r&&!r.error&&r.state){s=r.state;steps++;return true}
  return false;
 };
 // One cycle = finish the open expedition, or (with no expedition open) bank what is waiting and start
 // the next one. Looping over cycles keeps dig / appraise / donate interleaved, so the step cap can never
 // starve the appraisal stage the way a dig-everything-then-appraise ordering would.
 for(let cycle=0;cycle<TREASURE_STEP_CAP&&room();cycle++){
  const before=steps,t=treasureState(s);
  if(t.trip){
   const dug=new Set(t.trip.tiles);
   for(const tile of TILE_ORDER)if(!dug.has(tile)&&room()&&!step('treasureDig',tile))break;
   step('treasureReturn',null);
  }else{
   for(const a of [...TREASURE_AREAS].sort((x,y)=>treasureUnseen(t,y)-treasureUnseen(t,x)||y.level-x.level))
    while(room()&&treasureState(s).gems[a.id]>0&&step('treasureAppraise',a.id));
   for(const [id,r] of Object.entries(treasureState(s).relics)){
    if(!room())break;
    if(!r.donated)step('treasureDonate',id);
    else if(!r.displayed)step('treasureDisplay',id);
   }
   // Stamina is checked HERE and not left to the dig gate: treasureStart itself costs no stamina, so a
   // camp with an empty Steeltooth would otherwise start-and-return in a loop, burning the whole step cap
   // and reporting 50 chores done for nothing.
   const a=bestTreasureArea(s);
   if(a&&treasureState(s).stamina>0)step('treasureStart',a.id);
  }
  if(steps===before)break; // Nothing moved this cycle: stamina is out, or a gate refused. Stop.
 }
 return {state:s,steps};
}

/** LOCAL POLICY: a duplicate can only ever be spent on its own item, so there is no choice to automate
 *  away. Verified against each sink before writing a dispatch:
 *   - treasureRestore spends `r.materials`, which are that ONE relic's own duplicate materials, and the
 *     cost is restorationLevel+1. No menu.
 *   - researchFish consumes one duplicate CATCH of a specific fish. No menu.
 *   - northExchange is a fixed 30 expedition coins for one fixed item (NORTH.exchangeItem). No menu.
 *   - mineExchange is Magic Ore only, capped at 5 a day. No menu.
 *  THE ONE REAL CHOICE, and the one place this chore is a policy rather than a transcription:
 *  researchFish pays a GENERIC Research Point, and `upgradeFish` spends 2*level of them on a CHOSEN
 *  displayed fish. The skill is uncapped (the original's FishExp ladder), so the only real decision is ORDER. AGREED POLICY: cheapest first -- always upgrade
 *  the displayed fish with the LOWEST current level, so the points buy the most levels soonest.
 *  Nothing here touches gold or crystals. The currencies spent are item-specific duplicate materials,
 *  duplicate catches, expedition coins and Mine Coins, all of which have exactly one destination. */
function runDuplicates(s,act,now){
 let steps=0;
 const room=()=>steps<CHORE_STEP_CAP;
 const fire=(action,target,value)=>{
  if(!room())return false;
  const r=act(s,action,now,target,value);
  if(r&&!r.error&&r.state){s=r.state;steps++;return true}
  return false;
 };
 // 1. Research every unresearched duplicate catch. The target is the CATCH id.
 const f=s?.fishing;
 if(f&&Array.isArray(f.catches)){
  const already=new Set(Array.isArray(f.researched)?f.researched:[]);
  for(const c of f.catches){
   if(!room())break;
   if(c?.duplicate&&!c.crown&&!already.has(c.id))fire('researchFish',c.id,null);
  }
 }
 // 1b. Spend Pearls on the fishing antiques. A Pearl and a Black Pearl have exactly ONE destination --
 //     the artifact ladder -- and upgrading only ever adds a bonus, so this is the same rule as the
 //     research above rather than a spending choice. Cheapest next level first, so a run never strands
 //     Pearls on one expensive artifact while a cheap level goes unbought. Each purchase raises that
 //     artifact's next price, so the loop terminates.
 while(room()){
  const fs=s?.fishing;if(!fs)break;
  const options=FISH_ARTIFACTS
   .filter(r=>fishArtifactOwned(fs,r.id))
   .map(r=>({id:r.id,cost:fishArtifactUpgradeCost(r.id,fishArtifactLevel(fs,r.id)),kind:fishArtifactPearl(r.id)}))
   .filter(x=>x.cost!==null&&pearls(fs,x.kind)>=x.cost)
   .sort((a,b)=>a.cost-b.cost||(a.id<b.id?-1:1));
  if(!options.length||!fire('upgradeFishArtifact',options[0].id,null))break;
 }
 // 2. Restore every relic that already holds enough of its own materials, repeatedly -- each restoration
 //    raises the next one's cost, so the loop stops on its own.
 if(s?.treasure&&Number.isSafeInteger(s.lastAt))for(const id of Object.keys(s.treasure.relics||{})){
  while(room()){
   const t=treasureState(s),r=t.relics[id],level=restorationLevel(r);
   if(!r?.donated||level>=RESTORATION_MAX||r.materials<level+1)break;
   if(!fire('treasureRestore',id,t.seq))break;
  }
 }
 // 3. The two fixed exchanges. Both take an object as `value`, not a bare sequence number.
 if(s?.northern)while(room()&&northern(s).coins>=30&&fire('northExchange',null,{seq:northern(s).seq}));
 if(s?.mineClearance)fire('mineExchange',null,{seq:mineState(s).seq,day:mineDay(s),count:'max'});
 // 4. Research Points, cheapest displayed fish first.
 if(s?.fishing)while(room()){
  const g=fishingState(s);
  let pick=null,pickLevel=Infinity;
  // No level-3 stop since 2026-09-18 (the original's fish skill is uncapped on its FishExp ladder); the
  // lowest level still goes first, at that level's own price.
  for(const id of g.displayed||[]){const level=g.skills?.[id]||1;if(level<FISH_SKILL_MAX&&level<pickLevel&&fishExpReady(g,id,level)){pickLevel=level;pick=id}}
  if(!pick||(g.points||0)<fishLevelCost(pick,pickLevel))break;
  if(!fire('upgradeFish',pick,null))break;
 }
 return {state:s,steps};
}
const IDS=new Set(HELPER_TASKS.map(t=>t.id));
/** A task's switch when the save stores none: 1 (on) for every task except the few marked `defaultOff`. */
export const helperDefault=id=>HELPER_TASKS.find(t=>t.id===id)?.defaultOff?0:1;
export const freshHelper=()=>({tasks:Object.fromEntries(HELPER_TASKS.map(t=>[t.id,helperDefault(t.id)])),ranAt:0});
export const helperState=s=>s.helper&&typeof s.helper==='object'&&!Array.isArray(s.helper)?s.helper:freshHelper();
/** A task is on unless it was explicitly switched OFF. That matters for saves written before a chore
 *  existed: their stored `tasks` map has no key for it, and requiring ===1 would deliver every new
 *  chore switched off, where the original ships 36 of its 40 default-on. An explicit 0 still wins. */
//  THE EXCEPTION is a task marked `defaultOff` because it spends gold: for those ids alone absent means
//  OFF, so no save -- old or new -- wakes up to find the helper spending. A stored 1 or 0 always wins.
export const helperEnabled=(s,id)=>{const v=helperState(s).tasks?.[id];return v===undefined?helperDefault(id)===1:v!==0};
/** Armed by the same daily habit that refills bait. Returns '' when armed, or the reason it is not. */
export function helperBlocked(s){
 const {dailies}=habitEarnings(s.habits,s.lastAt);
 return dailies<1?'Complete a daily habit to send the Little Helper out.':'';
}

/** The focus list's bound. It exists to stop an unbounded array, NOT to pin the roster: see the
 *  validator below for why a focus entry is never checked against the catalogue. */
export const HELPER_FOCUS_MAX=ORIGINAL_FELLOWS.length+ADDITION_FELLOWS.length;
/** One run-record note's length. Long enough for three names, short enough that a corrupt record
 *  cannot grow the save. */
export const HELPER_NOTE_MAX=120;
export function validHelper(s){
 const h=s.helper;
 if(h===undefined)return true;
 if(!h||typeof h!=='object'||Array.isArray(h))return false;
 if(!h.tasks||typeof h.tasks!=='object'||Array.isArray(h.tasks))return false;
 for(const [id,v] of Object.entries(h.tasks))if(!IDS.has(id)||(v!==0&&v!==1))return false;
 // `focus` is the player's Stella pick order (helperFocus below). Absent on every save written before
 // 2026-09-19, so undefined must stay valid; present, it is an ordered list of distinct ids, bounded.
 //
 // DELIBERATELY NOT CHECKED AGAINST THE ROSTER. A stored id is validated for SHAPE only -- the
 // direction CLAUDE.md rule 12 cares about is a save that stops loading, and pinning these ids to the
 // catalogue would refuse one the moment a Fellow is released (lib/release-removed.mjs), renamed or
 // hidden by the crossover flag, which is off in Node. An id that no longer names an owned Fellow with
 // a ladder is simply skipped by stellaOrder, so junk costs nothing and can grant nothing. The action
 // below refuses an unknown id, so nothing the player does can put one here in the first place.
 if(h.focus!==undefined){
  const f=h.focus;
  if(!Array.isArray(f)||f.length>HELPER_FOCUS_MAX||new Set(f).size!==f.length)return false;
  if(!f.every(id=>typeof id==='string'&&id.length>0&&id.length<=64))return false;
 }
 // `did` is the run record the Today list reads. Absent on every save written before 2026-09-19, so
 // undefined must stay valid; present, it is one day key and a set of KNOWN chore ids, no duplicates.
 // `notes` (2026-09-19) is what each chore reported it did, so the player can see a policy working;
 // it is OPTIONAL within `did` for the same reason `did` is optional on the save.
 if(h.did!==undefined){
  const d=h.did;
  if(!d||typeof d!=='object'||Array.isArray(d))return false;
  if(Object.keys(d).length>3||typeof d.day!=='string'||d.day.length>10)return false;
  if(!Object.keys(d).every(k=>['day','ids','notes'].includes(k)))return false;
  if(!Array.isArray(d.ids)||d.ids.length>IDS.size||new Set(d.ids).size!==d.ids.length)return false;
  if(!d.ids.every(id=>IDS.has(id)))return false;
  if(d.notes!==undefined){
   const n=d.notes;
   if(!n||typeof n!=='object'||Array.isArray(n)||Object.keys(n).length>IDS.size)return false;
   if(!Object.entries(n).every(([id,v])=>IDS.has(id)&&typeof v==='string'&&v.length>0&&v.length<=HELPER_NOTE_MAX))return false;
  }
 }
 return Number.isSafeInteger(h.ranAt)&&h.ranAt>=0;
}
/** What a chore reported it did today, or '' -- the record carries its own day key, so a note left
 *  over from an earlier day reads as absent exactly as `did.ids` does (lib/today.mjs helperDidToday).
 *  `day` is passed in rather than imported from today.mjs, which imports this module. */
export const helperNote=(s,id,day=habitDay(s?.lastAt||0))=>{const d=helperState(s).did;
 return d&&d.day===day&&typeof d.notes?.[id]==='string'?d.notes[id]:''};
/** The player's Stella focus picks, in pick order, filtered to ones that can still take shards. */
export const helperFocusList=s=>(helperState(s).focus||[]).filter(id=>s.fellows?.[id]&&stellaTracked(id));
export const helperFocused=(s,id)=>helperFocusList(s).includes(id);

/** `act` is passed in rather than imported: game.mjs imports this module, so importing act here
 *  would close a cycle. It also keeps the runner honest -- there is no path to state that does not
 *  go through the same act() a tap goes through. */
export function helperAction(s,action,now,target,value,act){
 const fail=m=>({error:m});
 if(action==='helperToggle'){
  if(!IDS.has(target))return fail('Unknown helper task.');
  if(value!==true&&value!==false)return fail('Choose on or off.');
  const h=helperState(s);
  return {state:{...s,helper:{...h,tasks:{...h.tasks,[target]:value?1:0}}},message:`${HELPER_TASKS.find(t=>t.id===target).label}: helper ${value?'on':'off'}.`};
 }
 // THE FOCUS PICK (owner's decision 1, 2026-09-19). Player state, so it lives in the save -- in the
 // HELPER subtree rather than in `stella`, deliberately: `helper` and `stella` are both QUARANTINABLE
 // (lib/game.mjs), and a malformed list here must cost the player a preference, never the Stella
 // ledger that holds every rank he has bought. Nothing derived from the game's tables is stored, so no
 // table can move under it. The order of the array IS the pick order; picking again removes the pick.
 if(action==='helperFocus'){
  if(typeof target!=='string'||!s.fellows?.[target]||!stellaTracked(target))return fail('Choose an owned Fellow with a Stella track.');
  if(value!==undefined&&value!==null&&value!==true&&value!==false)return fail('Choose on or off.');
  const h=helperState(s),focus=(h.focus||[]).filter(id=>typeof id==='string');
  const at=focus.indexOf(target),want=value===undefined||value===null?at<0:value;
  if(want===(at>=0))return {state:s,message:`${fellowById(target)?.name||target} is ${want?'already':'not'} a Stella focus.`};
  if(want&&focus.length>=HELPER_FOCUS_MAX)return fail('That is as many focus picks as the helper can hold.');
  const next=want?[...focus,target]:focus.filter(id=>id!==target);
  const name=fellowById(target)?.name||target;
  return {state:{...s,helper:{...h,focus:next}},
   message:want?`${name} is Stella focus #${next.length}: the helper spends shards here before anyone else.`
    :`${name} is no longer a Stella focus.`};
 }
 if(action==='helperRun'){
  const blocked=helperBlocked(s);if(blocked)return fail(blocked);
  const h=helperState(s);
  const queue=HELPER_TASKS.filter(t=>helperEnabled(s,t.id)).slice(0,HELPER_RUN_CAP);
  if(!queue.length)return fail('Every helper task is switched off.');
  let state=s;const done=[],skipped=[],didIds=[],notes={};
  for(const t of queue){
   if(t.run){const out=t.run(state,act,now);if(out.steps>0){state=out.state;done.push(`${t.label} (${out.steps})`);didIds.push(t.id);if(out.note)notes[t.id]=String(out.note).slice(0,HELPER_NOTE_MAX)}else skipped.push(t.label);continue}
   if(t.waiting&&!t.waiting(state)){skipped.push(t.label);continue}
   const r=act(state,t.action,now,null,null);
   if(r&&!r.error&&r.state){state=r.state;done.push(t.label);didIds.push(t.id)}else skipped.push(t.label);
  }
  if(!done.length)return fail('Nothing was waiting: '+skipped.length+' task'+(skipped.length===1?'':'s')+' had nothing to do.');
  const hh=helperState(state);
  // Anyone who joined during the run -- a free invite, an earned encounter, a Fountain recruit -- is
  // named separately so the app can announce them instead of burying them in a 4-second notice.
  const arrivals=[...FELLOWS.filter(f=>!s.fellows?.[f.id]&&state.fellows?.[f.id]).map(f=>({id:f.id,name:f.name,kind:'fellows'})),
   ...FAMILY.filter(f=>!s.family?.[f.id]&&state.family?.[f.id]).map(f=>({id:f.id,name:f.name,kind:'family'}))];
  // WHAT THE HELPER ACTUALLY DID, for the Today list (lib/today.mjs). `ranAt` alone could only say the
  // helper went out, not which lines it finished, so a run records the ids of the chores that MOVED --
  // the same `done` list the message names, never the skipped ones. It accumulates across runs within
  // one day and is dropped whole at the day boundary, which is habitDay(state.lastAt), not UTC midnight.
  // OPTIONAL, and validated below: a save written before this existed has no `did` and stays valid, and
  // `helper` is already QUARANTINABLE, so a corrupt record costs the toggles, never the village.
  // The NOTES half (2026-09-19) is what a chore reported it actually did -- "3 ranks for Neptune" --
  // so the Today list and the helper panel can show WHERE the shards went instead of only that the
  // chore ran. Same day scope as the ids: a chore that reports again today overwrites its own line,
  // a chore that reported earlier today and did nothing this run keeps its line, and the whole record
  // is dropped at the day boundary. A chore that reports nothing never writes a key.
  const day=habitDay(state.lastAt);
  const kept=hh.did?.day===day?hh.did.ids:[];
  const keptNotes=hh.did?.day===day?hh.did.notes||{}:{};
  const merged={...keptNotes,...notes};
  const did={day,ids:[...new Set([...kept,...didIds])].filter(id=>IDS.has(id))};
  if(Object.keys(merged).length)did.notes=merged;
  return {state:{...state,helper:{...hh,ranAt:now,did}},arrivals,
   message:(arrivals.length?`New arrival${arrivals.length===1?'':'s'}: ${arrivals.map(a=>a.name).join(', ')} joined the village! `:'')+
    `Little Helper did ${done.length} chore${done.length===1?'':'s'}: ${done.join(', ')}.`+(skipped.length?` ${skipped.length} had nothing waiting.`:'')};
 }
 return null;
}

// ---------------------------------------------------------------------------------------------
// BANQUETS and NORTHERN ODYSSEY. Appended whole, imports included -- ESM hoists them, and keeping
// them here keeps this block readable as one unit.
//
// PROVENANCE, measured rather than assumed. outputs/private-server/hosted_mapping.json names the
// executor behind each of the 40 Trusteeship rows; scanned for ceremony, banquet, dungeon and north
// it returns nothing. Positive control for that claim of absence (CLAUDE.md rule 2): the same scan
// over the same file returns hostedMedicineInfo and hostedTDHangupReward, two names the task table
// above already cites. So neither of these chores has an original counterpart, and every policy
// below is OURS. They are written out so they can be argued with rather than inferred from code.
// ---------------------------------------------------------------------------------------------

/** LOCAL POLICY (banquets): the PANTRY is the scarce input, not the clock. banquetPrepare is
 *  habit-gated and stamps refillDay, so it stocks at most PANTRY_REFILL_MAX sets once a day, while
 *  banquetHost spends exactly one of each of the chosen party's two materials -- the same two-item
 *  cost for every shipped party. The payout is coinsPerGuest x seats and banquetHost fixes
 *  coinsPerGuest at 100 for every party, so coins per material set is 100 x seats: the Fine Wine
 *  Party (8 seats) pays 800 where the Wine Party (4 seats) pays 400, for an identical cost.
 *  The clock does NOT break that tie and is not the reason for the rule -- both parties seat one
 *  guest every intervalMs, so both earn 100/intervalMs, twenty coins a second. Per SECOND they are
 *  equal; per material SET the larger party is worth double, and material sets are what runs out.
 *  So: prepare for, and host, the largest party available. With `affordable`, the largest party the
 *  pantry can already pay for -- the material test is banquetHost's own guard, copied not restated. */
export function bestBanquetParty(s,affordable){
 const {pantry}=banquetState(s);
 let best=null;
 for(const p of BANQUET_PARTIES){
  if(affordable&&p.materials.some(id=>!(pantry[id]>0)))continue;
  if(!best||p.seats>best.seats)best=p;
 }
 return best&&best.id;
}

// TARGETS, read off banquetAction rather than guessed -- the three do not agree with each other:
// banquetPrepare and banquetHost take a PARTY id (`partyById.get(target)`), banquetClaim takes the
// RUN id (`r.id!==target`), and all three refuse unless `value.seq` equals the banquet subtree's
// current seq, which is the same envelope app/banquet-panel.tsx sends. Nothing here dispatches
// banquetBuy: that exchange is a menu of items with different uses, and choosing is the player's.
function runBanquets(s,act,now){
 let steps=0,prepared=false;
 // Both subtrees are created lazily, so absence is not "system closed". But with neither a banquet
 // record nor a habit record there is provably nothing any of the three actions could do.
 if(!s.banquets&&!s.habits)return {state:s,steps:0};
 const dispatch=(action,target)=>{
  const r=act(s,action,now,target,{seq:banquetState(s).seq});
  if(r&&!r.error&&r.state){s=r.state;steps++;return true}
  return false;
 };
 while(steps<CHORE_STEP_CAP){
  const b=banquetState(s);
  // Claim is ATTEMPTED, never predicted: seatedGuests is a function of the settled clock and that
  // gate belongs to the action. A banquet still seating simply refuses, exactly as the button does.
  if(b.run&&dispatch('banquetClaim',b.run.id))continue;
  // One prepare per run at most: it is day-gated, so a second attempt could only ever be refused.
  if(s.habits&&!prepared){prepared=true;const party=bestBanquetParty(s,false);if(party&&dispatch('banquetPrepare',party))continue}
  if(banquetState(s).run)break; // a banquet still seating blocks hosting; nothing further this run
  const party=bestBanquetParty(s,true);
  if(party&&dispatch('banquetHost',party))continue;
  break;
 }
 return {state:s,steps};
}

// The map is a pure function of the tile index, so derive the groups from tileKind rather than
// transcribing them -- a change to the map then cannot silently desync this chore from the game.
const NORTH_MAP=Array.from({length:9},(_,i)=>tileKind(i));
const NORTH_FREE=NORTH_MAP.flatMap((k,i)=>k==='camp'||k==='cache'?[i]:[]);
const NORTH_SPRINGS=NORTH_MAP.flatMap((k,i)=>k==='heal'?[i]:[]);
const NORTH_BEAST=NORTH_MAP.indexOf('monster'),NORTH_EXIT=NORTH_MAP.indexOf('exit');

/** The northern expedition has NO randomness anywhere: tileKind is fixed, a floor's beast holds
 *  NORTH.monsterHP[floor-1], northAttack always removes exactly r.atk, retaliation is always
 *  NORTH.retaliation[floor-1] and lands even on the killing blow (NORTH.retaliationOnKillingBlow),
 *  and a warm spring restores NORTH.healing capped at maxHP. So "is this beast safe to fight?" is
 *  arithmetic, not judgement, and the helper settles it BEFORE every swing instead of hoping.
 *
 *  northSurvive replays that arithmetic for one beast and returns the HP left once it falls, or null
 *  if the expedition would reach 0 first -- which forfeits every unbanked coin. Springs are spent as
 *  LATE as possible, only when the next blow would otherwise end the run, because a spring drunk at
 *  full HP is thrown away against the maxHP cap; latest use buys the most HP. */
export function northSurvive(hp,maxHP,atk,monsterHP,springs,retaliation){
 for(let hits=Math.ceil(monsterHP/atk);hits>0;hits--){
  if(hp<=retaliation&&springs>0){hp=Math.min(maxHP,hp+NORTH.healing);springs--}
  if(hp<=retaliation)return null;
  hp-=retaliation;
 }
 return hp;
}

/** LOCAL POLICY (Northern Odyssey) -- what the helper will and will not do, and why:
 *  - It NEVER dispatches northTrain. Training buys a permanent ATK or HP level, and the helper does
 *    not buy upgrades. That it is also the one genuine judgement call in the system (ATK or HP, with
 *    no data settling which) is a second reason to leave it: it is the decision worth keeping.
 *  - It only STARTS an expedition whose first beast it can already kill, and only takes northNext
 *    into a floor whose beast it can kill. Entering a dead-end floor would still collect that floor's
 *    three caches, but a Supply has exactly one use, and a floor that is cleared is worth more per
 *    Supply than one that is not: three floors pay 3x15 plus the 20 clear bonus, 21.6 a Supply,
 *    against 15 for a dead end. So those Supplies are left for the player to spend after training.
 *  - Free tiles first. The camps and caches cost no HP, so they are revealed before the first swing;
 *    a beast that then proves unkillable still leaves this floor's coins banked by northFinish
 *    rather than lost. Springs are deliberately NOT part of that sweep -- they are the HP reserve.
 *  - It DOES spend banked expedition coins on northExchange: one fixed item, a fixed 30 coins, no
 *    menu and so no choice; expedition coins have no other sink; and the card sits in the Bag until
 *    the player uses it, so converting early costs nothing. Gold and crystals are never touched.
 *  A note on Supplies: at the cap of NORTH.supplyCap they stop regenerating altogether (recoverAt is
 *  null), so a Supply held at the cap is a pure loss. A player who would rather bank Supplies until
 *  they have trained can switch this one chore off, which is what the per-task toggle is for. */
function runNorthern(s,act,now){
 let steps=0;
 // northStart reaches northernStats, which walks s.fellows, and northExchange indexes s.inventory.
 // Without those two core save fields there is no expedition to run, so the chore does nothing.
 if(!s.fellows||!s.inventory)return {state:s,steps:0};
 const dispatch=(action,target)=>{
  // Every run-scoped action checks value.runId against the CURRENT run, so re-read it every time.
  const n=northern(s);
  const r=act(s,action,now,target,{seq:n.seq,runId:n.run?.id});
  if(r&&!r.error&&r.state){s=r.state;steps++;return true}
  return false;
 };
 const clearable=(floor,hp,maxHP,atk)=>
  northSurvive(hp,maxHP,atk,NORTH.monsterHP[floor-1],NORTH_SPRINGS.length,NORTH.retaliation[floor-1])!==null;
 // Banking comes BEFORE playing, and for a measured reason: a three-floor crawl costs about 35
 // dispatches, so with Supplies in hand the map alone reaches CHORE_STEP_CAP and an exchange placed
 // after it would be starved for as long as Supplies lasted. One sink, one price, no menu -- so
 // convert every full 30 coins already banked, then spend what is left of the cap on the map.
 while(steps<CHORE_STEP_CAP&&northern(s).coins>=30&&dispatch('northExchange',null));
 while(steps<CHORE_STEP_CAP){
  const r=northern(s).run;
  if(!r){
   const stats=northernStats(s);
   if(northernSupplies(s).supplies<1)break;
   if(!clearable(1,stats.maxHP,stats.maxHP,stats.atk))break;
   if(!dispatch('northStart',null))break;
   continue;
  }
  if(r.status!=='exploring'){
   // 'gate' is the only status carrying a decision; 'lost' and 'cleared' can only be banked.
   if(r.status==='gate'&&r.rooms.length<NORTH.floors&&northernSupplies(s).supplies>=1
    &&clearable(r.rooms.length+1,r.hp,r.maxHP,r.atk)&&dispatch('northNext',null))continue;
   if(!dispatch('northFinish',null))break;
   continue;
  }
  const q=activeRoom(r),springs=NORTH_SPRINGS.filter(i=>!q.tiles[i]),hurt=NORTH.retaliation[q.floor-1];
  const free=NORTH_FREE.find(i=>!q.tiles[i]);
  if(free!==undefined){if(!dispatch('northTile',free))break;continue}
  if(!q.tiles[NORTH_BEAST]){
   // q.monsterHP is read off the run, not recomputed, so a part-fought beast is measured as it is.
   if(northSurvive(r.hp,r.maxHP,r.atk,q.monsterHP,springs.length,hurt)===null){
    if(!dispatch('northFinish',null))break; // unkillable from here: bank this floor's caches instead
    continue;
   }
   if(r.hp<=hurt){if(!dispatch('northTile',springs[0]))break;continue}
   if(!dispatch('northAttack',NORTH_BEAST))break;
   continue;
  }
  // Beast down. The signpost refuses until all eight other tiles are resolved, springs included.
  if(springs.length){if(!dispatch('northTile',springs[0]))break;continue}
  if(!dispatch('northTile',NORTH_EXIT))break;
 }
 return {state:s,steps};
}

// ---------------------------------------------------------------------------------------------
// EVERYTHING ELSE THAT REPEATS. Added on the owner's request ("everything should be an option to be
// automated") after a sweep of every `[...].includes(action)` list in lib/*.mjs.
//
// THE RULES THESE CHORES KEEP, written once so each runner below need not restate them:
//  - They go through the same act() a tap does, with the envelope the panel sends (seq guards, keys).
//    Nothing is predicted where the action can simply be ATTEMPTED and refused.
//  - Where a result is deterministic and a bad outcome is possible (Expo day, Familiar Tower floor), the
//    action is played on a copy first and kept only if the copy won. act() is pure, so a discarded trial
//    changes nothing.
//  - Default-on chores never spend gold or crystals. They DO spend single-destination currencies: Education
//    Points, Stella fragments, Workshop supplies and Sales EXP, Fairy Bottles, event Stamina, Fame, Acquaint
//    Stone Fragments. Each of those has exactly one thing it can buy, so spending it is not a choice.
//  - Choices stay the player's: which insignia to forge, quiz answers, which character to buy with stones,
//    which Fellow trains, which branch of the journey to take.
// ---------------------------------------------------------------------------------------------

/** A small dispatcher shared by the chores below: attempt, keep on success, count the step. */
function driver(state,act,now,cap=CHORE_STEP_CAP){
 const d={s:state,steps:0,room:()=>d.steps<cap,
  fire(action,target=null,value=null){
   if(!d.room())return false;
   const r=act(d.s,action,now,target,value);
   if(r&&!r.error&&r.state){d.s=r.state;d.steps++;return true}
   return false;
  }};
 return d;
}
const clockOf=(s,now)=>Math.max(Number.isFinite(now)?now:0,Number.isFinite(s?.lastAt)?s.lastAt:0);

/** HABIT REWARDS -- the only source of Acquaint Stone Fragments, insignia fragments and star shards, and
 *  until now reachable only by finding the Claim button on the Recruit panel.
 *  LOCAL POLICY:
 *   - summonClaimDay ONCE the day is PERFECT (summonDay(...).perfect). The claim is once per day and pays
 *     for the dailies done AT CLAIM TIME, and a perfect day adds PERFECT_DAY_BONUS fragments, the insignia
 *     fragment and the star shards -- so claiming early forfeits all of that.
 *   - FALLBACK: from 21:00 local time a non-perfect day is claimed as it stands. Without it a player who
 *     never finishes every daily would never be paid at all, and the claim cannot be made for yesterday.
 *     The cost is stated: finishing the last daily between a 21:00 helper run and midnight no longer
 *     upgrades that day to perfect.
 *   - summonClaimWeek whenever this week already holds WEEK_DAYS_FOR_BONUS perfect claims (the action
 *     checks the life-area half itself).
 *   - summonForge 'stone' while ten fragments are banked: a fragment buys nothing except a stone or an
 *     N/R character, and the counter accepts either currency, so whole stones lose nothing.
 *   - NEVER summonForge valiant/archangel. Which insignia a fragment becomes is a real choice. */
export const HABIT_CLAIM_FALLBACK_HOUR=21;
function runHabitRewards(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.habits)return {state:d.s,steps:0};
 const t=clockOf(d.s,now),seq=()=>({seq:summonState(d.s).seq});
 const today=summonDay(d.s,t),r=summonState(d.s);
 if(today.done>0&&!r.days.some(x=>x.startsWith(today.day))&&(today.perfect||new Date(t).getHours()>=HABIT_CLAIM_FALLBACK_HOUR))
  d.fire('summonClaimDay',null,seq());
 const week=weekStartDay(t),w=summonState(d.s);
 if(!w.weeks.includes(week)&&w.days.filter(x=>x.endsWith('!')&&x.slice(0,10)>=week).length>=WEEK_DAYS_FOR_BONUS)
  d.fire('summonClaimWeek',null,seq());
 while(d.room()&&summonState(d.s).stoneFragments>=STONE_FRAGMENTS_PER_STONE&&d.fire('summonForge','stone',seq()));
 return {state:d.s,steps:d.steps};
}

/** FREE RECRUITS: the characters the Recruit counter prices at zero (FREE_ROSTER, the original's own
 *  player-level and town-event giveaways). Nothing is spent, so there is nothing to choose. */
function runFreeRecruits(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.fellows||!d.s.family)return {state:d.s,steps:0};
 for(const offer of recruitOffers(d.s)){
  if(!d.room())break;
  if(Object.values(offer.cost).some(n=>n!==0))continue;
  d.fire('summonRecruit',offer.id,{seq:summonState(d.s).seq});
 }
 return {state:d.s,steps:d.steps};
}

// SCHOOL ----------------------------------------------------------------------------------------
// MEASURED from lib/school.mjs and lib/education.mjs before choosing anything:
//  pupilReward = (1+intimacy/100) * (intellect/10) * (1+education/10) * typeMultiplier * (1+bond%/100)
//  and each lesson adds `rank` education (graded pupils) and pays one educationReward of Fellow EXP.
//  So graduation income is AFFINE in lessons: a constant "1+" part per graduation plus a part per lesson.
//  Per Education Point, the constant part is diluted by the lessons a grade demands (D 100 ... B+ 280),
//  while the per-lesson part and the EXP per lesson do not depend on the grade at all. Grade D therefore
//  pays the most per point, and also graduates soonest (opening the two extra seats, and a Gold Ring each).
//  A trip child enrolls as a LEGACY pupil: 6 lessons, and `educate` with the best unlocked method moves up
//  to 3 lessons for one point -- far more income per point than any grade, so children go in first.
//  NEVER finishSchool: it is the sandbox button that completes lessons without spending points.

/** LOCAL POLICY: the caretaker whose pupil earns most -- intellect is relationship*10 at enrollment and
 *  intimacy multiplies at graduation, so maximise relationship*(1+intimacy/100). Ties: family order. */
export function bestCaretaker(s){
 let best=null,score=-1;
 for(const [id,f] of Object.entries(s.family||{})){const v=f.relationship*(1+f.intimacy/100);if(v>score){score=v;best=id}}
 return best;
}
/** LOCAL POLICY: the pupil type with the largest graduation multiplier (type multiplier times the active
 *  family bond bonus for that type); ties broken by the Fishing EXP bonus for that type, then list order. */
export function bestPupilType(s,types){
 let best=null,key=null;
 for(const type of types){
  const mult=(PUPIL_TYPES.find(t=>t.id===type)?.multiplier||1)*(1+graduationBonus(s,{type})/100),fish=fishingEducationBonus(s,type);
  if(!best||mult>key[0]||(mult===key[0]&&fish>key[1])){best=type;key=[mult,fish]}
 }
 return best;
}
const bestMethod=s=>METHODS.filter(m=>playerRank(s)>=m.rank).reduce((a,b)=>b.progress>a.progress?b:a,METHODS[0]);
const pointsToGraduate=(s,p)=>{const left=requiredLessons(p)-p.progress;return p.grade?left:Math.ceil(left/bestMethod(s).progress)};
function runSchool(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.school||!d.s.family)return {state:d.s,steps:0};
 const sc=()=>d.s.school;
 // Bonds first: activating one is free and raises the income of every matching pupil graduated after it.
 if(Object.entries(d.s.family).some(([id,f])=>graduationBond(id)&&!f.graduationBond))d.fire('activateGraduationBonds');
 for(let pass=0;pass<3&&d.room();pass++){
  const before=d.steps;
  if(sc().pupils.some(p=>p.progress>=requiredLessons(p)))d.fire('graduateAll');
  if(schoolCapacity(d.s)<EXPANDED_SEATS&&sc().graduates>=STARTING_SEATS)d.fire('expandSchool');
  // Fill open seats: waiting trip children first (legacy pupils, see above), then grade-D pupils.
  for(const child of [...tripState(d.s).children]){
   if(!d.room()||sc().pupils.length>=schoolCapacity(d.s))break;
   if(!d.s.family[child.caretaker])continue;
   d.fire('enrollTripChild',child.id,bestPupilType(d.s,PUPIL_TYPES.map(t=>t.id)));
  }
  while(d.room()&&sc().pupils.length<schoolCapacity(d.s)){
   const caretaker=bestCaretaker(d.s);if(!caretaker)break;
   if(!d.fire('enrollPupil',caretaker,{type:bestPupilType(d.s,SCHOOL_TYPES),grade:'D',name:`Pupil ${sc().nextId}`}))break;
  }
  // Teach. A whole-class round pays Hunter's Hat's teachAllXP once on top of the same per-pupil EXP, so
  // it is the better use of points when that bonus exists -- unless a legacy pupil could take a 2-3
  // lesson method for one point, which a round would waste. Otherwise the pupil closest to graduating.
  while(d.room()&&sc().points>=1){
   const open=sc().pupils.filter(p=>p.progress<requiredLessons(p));if(!open.length)break;
   const legacyGain=bestMethod(d.s).progress>1&&open.some(p=>!p.grade);
   if(innGiftSchoolBonus(d.s,'teachAllXP')>0&&!legacyGain&&sc().points>=open.length&&d.fire('educateAllRound'))continue;
   const p=[...open].sort((a,b)=>pointsToGraduate(d.s,a)-pointsToGraduate(d.s,b)||a.id-b.id)[0];
   const ok=p.grade?d.fire('educateBatch',p.id):d.fire('educate',p.id,bestMethod(d.s).id);
   if(!ok)break;
  }
  if(sc().pupils.some(p=>p.progress>=requiredLessons(p)))d.fire('graduateAll');
  if(d.steps===before)break;
 }
 return {state:d.s,steps:d.steps};
}

// INN SERVICE -------------------------------------------------------------------------------------
/** LOCAL POLICY: stamina is the scarce input and every guest costs one, so serve the developed dish that
 *  pays the most gold for this queue -- innQueueEarnings, the same function settleInn pays out with. */
export function bestInnDish(s,count){
 const i=s.inn;if(!i)return null;
 let best=null,gold=-1;
 for(const dish of i.menu||[]){const g=innQueueEarnings(dish,i.finesse?.[dish]||0,innServingGains(i,dish).finesse,count);if(g>gold){gold=g;best=dish}}
 return best;
}
/** One queue at a time (the Inn refuses a second until the first is served), the largest group stamina
 *  covers, then the habit refill -- AFTER spending, because refillInnStamina fills to the cap and a refill
 *  taken at a high stock is mostly thrown away. It is taken only once stamina cannot seat a full group
 *  of ten, which is the point at which it can pay the most. */
function runInnService(state,act,now){
 const d=driver(state,act,now);const i=()=>d.s.inn;
 if(!i())return {state:d.s,steps:0};
 if(!i().queue){
  const count=[10,5,1].find(n=>i().stamina>=n);
  const dish=count&&bestInnDish(d.s,count);
  if(dish)d.fire('receiveInnGuests',dish,count);
 }
 if(i().stamina<10&&d.s.habits)d.fire('refillInnStamina');
 return {state:d.s,steps:d.steps};
}

// WORKSHOP CRAFTING --------------------------------------------------------------------------------
/** LOCAL POLICY: supplies are the scarce input (20 a day) and a product's coins are paid per unit, so craft
 *  the unlocked product paying the most coins per unit with the matching Fellow of highest mastery tier.
 *  Ties go to the later product, which is also the one whose crafting unlocks the next. */
export function bestWorkshopJob(s){
 const w=s.workshop;if(!w)return null;
 let best=null,score=-1;
 for(const p of WORKSHOP_PRODUCTS){
  if(!workshopUnlocked(w,p.id))continue;
  for(const id of Object.keys(s.fellows||{})){
   if(fellowById(id)?.type!==p.type)continue;
   const v=p.coins*(10+workshopMastery(w,id));
   if(v>score||(v===score&&Number(p.id)>Number(best.product))){score=v;best={product:p.id,fellow:id}}
  }
 }
 return best;
}
function runWorkshopCraft(state,act,now){
 const d=driver(state,act,now);const w=()=>d.s.workshop;
 if(!w())return {state:d.s,steps:0};
 // Mastery is bought with the Fellow's OWN Sales EXP, which buys nothing else: one destination, no menu.
 for(const id of Object.keys(w().salesXP||{})){
  while(d.room()&&workshopMastery(w(),id)<10&&workshopAvailableXP(w(),id)>=100*(workshopMastery(w(),id)+1)&&d.fire('upgradeWorkshopMastery',id));
 }
 // Wallet coins have exactly one sink in the engine (buyWorkshopPearl), so they are converted as they land.
 while(d.room()&&w().wallet>=2000&&d.fire('buyWorkshopPearl'));
 if(!w().job){
  const job=bestWorkshopJob(d.s),count=[10,5,1].find(n=>w().supplies>=n);
  if(job&&count)d.fire('startWorkshop',job.product,{fellow:job.fellow,count});
 }
 return {state:d.s,steps:d.steps};
}

// MINE CLEARANCE -----------------------------------------------------------------------------------
/** Damage pools across the day: each Fellow deploys once, and kills land when the cumulative damage
 *  crosses a row. LOCAL POLICY: strongest first, and stop as soon as every unused Fellow together could no
 *  longer reach the next kill -- a deployment that kills nothing still writes a receipt, and validMine
 *  caps the receipt history at 10,000, so pointless receipts are a real cost. */
function runMine(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.fellows||!d.s.opening||!mineUnlocked(d.s))return {state:d.s,steps:0};
 while(d.room()){
  const today=mineToday(d.s),next=MINE_ROWS.find(r=>r.cumulativePower>today.progress);if(!next)break;
  const pool=FELLOWS.filter(f=>d.s.fellows[f.id]&&!today.used.includes(f.id)).map(f=>({id:f.id,power:bondedPower(d.s,f.id)})).filter(p=>p.power>0).sort((a,b)=>b.power-a.power);
  if(!pool.length||today.progress+pool.reduce((n,p)=>n+p.power,0)<next.cumulativePower)break;
  if(!d.fire('mineDeploy',pool[0].id,{seq:mineState(d.s).seq,day:mineDay(d.s)}))break;
 }
 return {state:d.s,steps:d.steps};
}

// FOUNTAIN -------------------------------------------------------------------------------------------
/** Bottles buy wishes and nothing else. A ten-wish costs 9 bottles and a hundred costs 90 (System.json via
 *  WISH_COSTS) -- the same 0.9 per wish -- while a single wish costs 1, so singles are never drawn: the
 *  leftover waits for the next ten. Hundreds are used where affordable only to keep the 10,000-row wish
 *  history from filling ten times faster. Fairy milestone rewards and fragment-to-stone synthesis only pay.
 *  NOT automated: wishTransfer (some ledger rows are consumed in place by the tonic and elixir panels) and
 *  wishRecruit (which acquaintance to buy with stones is the player's). */
function runFountain(state,act,now){
 const d=driver(state,act,now);const f=()=>fountainState(d.s),seq=extra=>({seq:f().seq,...extra});
 if(!d.s.fountain&&!d.s.habits)return {state:d.s,steps:0};
 if(d.s.habits)d.fire('bottleRefill',null,seq());
 for(const count of [100,10]){const cost=wishCost(count);while(d.room()&&cost!==null&&f().bottles>=cost&&d.fire('wishDraw',null,seq({count})));}
 if(fairyAvailable(d.s)>0)d.fire('wishFairyClaim',null,seq({count:'all'}));
 while(d.room()&&(f().ledger.Lottery_8||0)>=20&&d.fire('wishSynthesize',null,seq()));
 return {state:d.s,steps:d.steps};
}

// VILLAGE EVENTS ---------------------------------------------------------------------------------------
/** The daily walk and the adviser chain are fixed sequences with nothing to pick. A `choice` event is a
 *  quiz whose right answer the data knows; answering it for the player would be cheating them out of the
 *  only decision in the system, so it is left pending for them (villageChoose is never dispatched). */
function runVillageEvents(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.habits||!d.s.inventory)return {state:d.s,steps:0};
 if(!villageState(d.s)?.pending)d.fire('villageEvent');
 const pending=villageState(d.s)?.pending;
 if(pending&&villageEventById(pending)?.kind==='daily')d.fire('villageResolve',pending);
 for(let i=0;i<4&&d.room()&&villageManageStep(d.s)&&!villageManageLocked(d.s);i++){
  if(!villageState(d.s)?.manage.accepted){if(!d.fire('villageManageAccept'))break}
  else if(!d.fire('villageManageFinish'))break;
 }
 return {state:d.s,steps:d.steps};
}

// RAPHAEL SUPPORT RUNS -------------------------------------------------------------------------------------
/** Event Stamina has one use (support runs), a run's score is fixed by the formation the PLAYER placed, and
 *  milestones pay by Stamina consumed -- so the loop is: finish a ready run, claim reached milestones, move
 *  claimed items to the Bag, take the daily Stamina, start the next run (ten at a time; one only to spend
 *  a remainder). NOT automated: stageForgeTransfer. The engine allows TWO Magic Ore transfers per save,
 *  ever, so when to use them is a real decision. Nothing runs until the player has placed a fan. */
function runRaphael(state,act,now){
 const d=driver(state,act,now);const e=()=>stageEvent(d.s),seq=extra=>({seq:e().seq,...extra});
 if(!d.s.raphael&&!d.s.raphaelEvent)return {state:d.s,steps:0};
 if(e().run)d.fire('stageComplete',e().run.id,seq());
 for(const m of STAGE_MILESTONES){
  if(!d.room())break;
  if(m.threshold<=e().consumed&&!e().claims.some(c=>c.threshold===m.threshold))d.fire('stageClaim',m.threshold,seq());
 }
 for(const [id,n] of Object.entries(e().locker)){
  if(!d.room())break;
  // The forge reward item is excluded: it is the Magic Ore whose two lifetime transfers are the player's.
  if(n>0&&id!==FORGE_REWARD_ITEM&&d.s.inventory&&Object.hasOwn(d.s.inventory,id))d.fire('stageTransfer',id,seq());
 }
 if(d.s.habits)d.fire('stageSupply',null,seq());
 if(!e().run&&stageState(d.s).cells?.some(c=>c?.kind==='fan')){
  const count=e().stamina>=10?10:e().stamina>=1?1:0;
  if(count)d.fire('stageBegin',null,seq({count}));
 }
 return {state:d.s,steps:d.steps};
}

// FAMILIARS -----------------------------------------------------------------------------------------------
/** The tower battle is a deterministic replay (towerBattle has no randomness), so each next floor is fought
 *  on a copy first and kept only if the copy cleared it. A loss would cost nothing in the engine either,
 *  but it would still write an attempt the player did not ask for. The saved party is the player's
 *  formation and is used as it is; only an EMPTY party is filled, with the five highest-Power familiars. */
const strongestFamiliars=s=>FAMILIARS.filter(p=>s.familiars?.[p.id]).map(p=>({id:p.id,power:familiarPower(p.id,s.familiars[p.id])})).sort((a,b)=>b.power-a.power||(a.id<b.id?-1:1)).slice(0,DISPATCH_TEAM).map(p=>p.id);
function runFamiliarTower(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.familiars||!Object.keys(d.s.familiars).length)return {state:d.s,steps:0};
 if(!towerState(d.s).party.length)for(const id of strongestFamiliars(d.s))d.fire('towerParty',id);
 while(d.room()&&towerState(d.s).cleared<TOWER_FLOORS&&towerState(d.s).party.length){
  const cleared=towerState(d.s).cleared,trial=act(d.s,'towerFight',now,towerKey(d.s),null);
  if(!trial||trial.error||!trial.state||towerState(trial.state).cleared<=cleared)break;
  d.s=trial.state;d.steps++;
 }
 return {state:d.s,steps:d.steps};
}
/** LOCAL POLICY for Dispatch: every area takes the same 20 hours and later areas pay strictly more, and the
 *  Great Success chance rises with team Power. So: collect a finished run, then send the five strongest
 *  familiars to the highest area that is unlocked and whose Power gate they meet. Dispatched familiars are
 *  not withheld from the tower, so the team costs nothing elsewhere. */
function runDispatch(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.familiars||Object.keys(d.s.familiars).length<DISPATCH_TEAM)return {state:d.s,steps:0};
 if(dispatchState(d.s).run&&dispatchDone(d.s))d.fire('dispatchCollect');
 if(dispatchState(d.s).run)return {state:d.s,steps:d.steps};
 const team=strongestFamiliars(d.s),power=dispatchTeamPower(d.s,team);
 const area=[...DISPATCH_AREAS].sort((a,b)=>b.id-a.id).find(a=>dispatchUnlocked(d.s,a.id)&&power>=a.power);
 if(!area)return {state:d.s,steps:d.steps};
 // dispatchTeam TOGGLES membership, so drop the non-members first, then add the missing ones.
 for(const id of dispatchState(d.s).team.filter(id=>!team.includes(id)))d.fire('dispatchTeam',id);
 for(const id of team.filter(id=>!dispatchState(d.s).team.includes(id)))d.fire('dispatchTeam',id);
 d.fire('dispatchStart',area.id);
 return {state:d.s,steps:d.steps};
}

// STELLA ----------------------------------------------------------------------------------------------------
/** Every original ladder spends the village shard pool and every crossover ladder the crossover pool (since
 *  2026-09-19 no Fellow earns private fragments; a formerly private ladder spends its leftover own fragments
 *  first -- lib/stella.mjs stellaPlan). Activation is free. So activate every owned profile and buy every level
 *  the stock covers ('max'), in the order below. The chore never converts private fragments: that is one-way,
 *  so it is the player's call (stellaConvert). */
/** Does this Fellow have a Stella ladder the chore can climb? The type test is the one stellaAction
 *  itself applies, so the chore never queues a Fellow the action would refuse. */
export const stellaTracked=id=>crossoverStella(id)||STELLA_PROFILES.some(p=>p.id===id&&fellowById(id)?.type===p.type);
/** Catalogue order as a TOTAL order that does not depend on the crossover flag. `FELLOWS` is built from
 *  crossoverEnabled(), which is false in Node, so indexing into it would collapse every crossover Fellow
 *  to the same position in tests and sims and leave the tie-break to save-key order. */
const CATALOGUE_ORDER=new Map([...ORIGINAL_FELLOWS,...ADDITION_FELLOWS].map((f,i)=>[f.id,i]));
const catalogueIndex=id=>CATALOGUE_ORDER.has(id)?CATALOGUE_ORDER.get(id):Number.MAX_SAFE_INTEGER;
/** The owner's own rank for a crossover Fellow (1 = his first pick), or null for an original.
 *  lib/everkai-additions-data.json is GENERATED from lib/crossover-roster-data.json by
 *  scripts/crossover/build-additions.mjs and `--check` fails if the two disagree, so this IS the rank
 *  order in that file -- read from the table lib already imports rather than importing a second copy.
 *  Ranks are per FRANCHISE (Marvel 1-93, Star Wars 1-68, 82 distinct values over 133 Fellows), so equal
 *  ranks are common and the two rosters interleave, which is the point: the old order ran the whole
 *  Marvel block before the first Star Wars Fellow. */
export const crossoverRank=id=>crossoverStella(id)?additionRank(id):null;
/** THE ORDER THE SHARDS ARE SPENT IN. Owner's decision, 2026-09-19 (option 1 with 3 as the fallback):
 *   1. the player's FOCUS picks, in the order the player picked them (helperFocus below);
 *   2. then everyone else: a crossover Fellow by the owner's own rank, an original by highest level,
 *      then current Power. Catalogue position is the last resort only.
 *  WHY THE FALLBACK CHANGED. Sorting on level then Power fixed the original-Fellow case and did nothing
 *  for the crossovers: every one of the 133 is level 1 with 100 Power at equal investment, so they all
 *  tie and the tie broke on catalogue position -- which lists all 75 Marvel before all 58 Star Wars.
 *  That is exactly what the owner saw. Rank order is his own list and interleaves the two rosters.
 *  Originals sort before crossovers, which decides nothing: the two spend DIFFERENT pools (village
 *  shard / crossover shard), so no original can take a shard a crossover could have spent.
 *  ONE LADDER AT A TIME, and it matters: each Fellow is bought at 'max' before the next is looked at,
 *  so the shards finish one ladder rather than buying a rank each for forty. */
export function stellaOrder(s){
 const focus=(helperState(s).focus||[]).filter(id=>s.fellows?.[id]&&stellaTracked(id));
 const picked=new Map(focus.map((id,i)=>[id,i]));
 const level=id=>s.fellows[id]?.level||0;
 return Object.keys(s.fellows||{}).filter(stellaTracked).sort((a,b)=>{
  const pa=picked.has(a),pb=picked.has(b);
  if(pa!==pb)return pa?-1:1;
  if(pa&&pb)return picked.get(a)-picked.get(b);
  const ra=crossoverRank(a),rb=crossoverRank(b);
  if((ra===null)!==(rb===null))return ra===null?-1:1;
  if(ra!==null&&rb!==null)return ra-rb||catalogueIndex(a)-catalogueIndex(b);
  return level(b)-level(a)||bondedPower(s,b)-bondedPower(s,a)||catalogueIndex(a)-catalogueIndex(b);
 });
}
/** What the run record says about this chore: the ranks bought and who got them, longest first, so the
 *  player can see the policy working ("3 ranks for Neptune"). Bounded to fit HELPER_NOTE_MAX. */
const stellaNote=(gained,activated)=>{
 const parts=gained.filter(g=>g.ranks>0).sort((a,b)=>b.ranks-a.ranks).map(g=>`${g.ranks} rank${g.ranks===1?'':'s'} for ${g.name}`);
 const head=parts.slice(0,3).join(' · ')+(parts.length>3?` · +${parts.length-3} more`:'');
 const note=parts.length?head:activated?`${activated} Stella${activated===1?'':'s'} activated`:'';
 return note.slice(0,HELPER_NOTE_MAX);
};
function runStella(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.fellows)return {state:d.s,steps:0};
 // WHO GETS THE SHARDS. Stella's flat bonus is added after every multiplier, so it lands in full on
 // whoever holds the rank -- level 1 or level 600. Everkai pays every track from one shared pool, and this
 // chore used to spend it in fixed list order: the owner found an untouched level-1 Elise at 25M and a
 // level-1 Spider-Man at 5.4M while his level-319 UR sat at 2.4M (2026-09-19). In the original each hero's
 // Stella costs that hero's own shards, so it can only follow the player's own investment. Here it follows
 // the player's own FOCUS picks first and his own order after them -- see stellaOrder above.
 const gained=[];let activated=0;
 for(const id of stellaOrder(d.s)){
  if(!d.room())break;
  const before=stellaEntry(d.s,id)?.level||0;
  if(!stellaEntry(d.s,id)&&stellaActivation(id)&&d.fire('stellaActivate',id,{seq:stellaState(d.s).seq}))activated++;
  if(stellaEntry(d.s,id)&&stellaPlan(d.s,id,'max').rows.length)d.fire('stellaUpgrade',id,{seq:stellaState(d.s).seq,count:'max'});
  const ranks=(stellaEntry(d.s,id)?.level||0)-before;
  if(ranks>0)gained.push({ranks,name:fellowById(id)?.name||id});
 }
 return {state:d.s,steps:d.steps,note:stellaNote(gained,activated)};
}

// CAMPAIGN ----------------------------------------------------------------------------------------------------
/** The village campaign (lib/adventure.mjs), on the original's own ladder.
 *  A stage is no longer a gold source: it charges its table price and pays Fellow EXP, so a battle CAN
 *  lower gold and the helper only fires one when the stage is actually clearable (stageReady: a boss on
 *  Power strictly above its atk, a normal stage on being able to afford its Power-scaled price).
 *  A patrol still refunds its deposit in the same action, so it can never lower gold. It goes to the
 *  highest cleared stage the roster can still afford, because patrol EXP is that stage's own item1 sum
 *  and therefore rises with depth. The party itself is the player's. */
function runCampaign(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.adventure||!d.s.fellows)return {state:d.s,steps:0};
 while(d.room()&&patrolCharges(d.s)>=1){
  // Walk DOWN from the deepest cleared stage rather than copying and reversing an 18,000-row array
  // on every iteration. In practice this lands within six steps: a boss costs nothing to enter, so the
  // nearest cleared boss is always affordable.
  const power=ladderPower(d.s);let stage=null;
  for(let id=d.s.adventure.cleared;id>=1;id--){const x=stageAt(id);if(stageReady(x,power,d.s.gold)){stage=x;break}}
  if(!stage||!d.fire('patrol',stage.id))break;
 }
 return {state:d.s,steps:d.steps};
}
/** Clearing NEW stages, default OFF, for the same reason journeyAuto is: it spends gold.
 *  On the old invented ladder a stage charged 50n and paid back 100n, so clearing could not lower gold
 *  and the chore was safe to leave on. On the original's ladder a stage is only ever a sink -- it pays
 *  Fellow EXP, never gold -- so advancing the campaign is now a spending decision and the player makes
 *  it. runCampaign above keeps the default-on contract by patrolling only, which refunds its deposit in
 *  the same action. */
function runCampaignBattles(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.adventure||!d.s.fellows)return {state:d.s,steps:0};
 while(d.room()){
  const next=stageAt(d.s.adventure.cleared+1);
  if(!next||!stageReady(next,ladderPower(d.s),d.s.gold)||!d.fire('battle',next.id))break;
 }
 return {state:d.s,steps:d.steps};
}

// JOURNEY -------------------------------------------------------------------------------------------------------
/** The opening journey's free steps. Quest rewards and `reward` events only pay; an `appoint` event has
 *  exactly one valid answer (Fifi, hero_1); rank promotion spends Fame, whose only sink is promotion, and
 *  the engine checks the prosperity gate itself; an earned encounter hands over its Fellow. NOT automated:
 *  `choose` events and the Family branch (openingFamily), which are the player's choices. */
function runJourney(state,act,now){
 const d=driver(state,act,now);const o=()=>d.s.opening;
 if(!o())return {state:d.s,steps:0};
 while(d.room()){const t=openingTask(d.s);if(!t||!openingRequirement(d.s,t).ready||!d.fire('openingClaim',t._id))break}
 for(const id of [...o().events]){
  if(!d.room())break;
  const e=OPENING.stageEvents.find(x=>x._id===id);if(!e)continue;
  if(e.eventType==='reward')d.fire('openingEvent',id);
  else if(e.eventType==='appoint'&&d.s.fellows.hero_1)d.fire('openingEvent',id,'hero_1');
 }
 while(d.room()&&o().rank<MAX_RANK&&o().fame>=rankCost(o().rank)&&d.fire('openingPromote'));
 for(const e of RANK_ENCOUNTERS){
  if(!d.room())break;
  if(o().rank>=e.rank&&!o().city.includes(e.id)&&FELLOWS.some(f=>f.id===e.fellow))d.fire('openingRecruit',e.id);
 }
 return {state:d.s,steps:d.steps};
}
/** SPENDING, default OFF. Full-Auto clears journey stages for gold, stopping on its own rules (an unready
 *  boss, the roadside-event queue, the gold running out). It is the one gold-spending loop whose policy is
 *  obvious -- the next stage is the only stage -- and the one players most want run for them. */
function runJourneyAuto(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.opening||openingAutoGate(d.s))return {state:d.s,steps:0};
 d.fire('openingAuto');
 return {state:d.s,steps:d.steps};
}

// ACHIEVEMENTS AND MILESTONES ----------------------------------------------------------------------------------
function runAchievements(state,act,now){
 const d=driver(state,act,now);
 if(!d.s.claims)return {state:d.s,steps:0};
 for(const m of MILESTONES){
  if(!d.room())break;
  if(!d.s.claims.includes(m.id)&&m.metric(d.s)>=m.goal)d.fire('claim',m.id);
 }
 for(const c of ACHIEVEMENT_CHAINS){
  while(d.room()&&chainProgress(d.s,c).ready&&d.fire('achievementClaim',c.id));
 }
 return {state:d.s,steps:d.steps};
}
