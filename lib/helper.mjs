import {habitDay,habitEarnings} from './habits.mjs';
import {FARM_PLANTS,farmHarvestPlan,farmPlantLevel} from './farm.mjs';
import {FISH,FISHING_GROUNDS,groundLevel,fishingLevel,fishingState,castKey,fishingIndex} from './fishing.mjs';
import {INN_GUESTS,innGuestReady} from './inn-guests.mjs';
import {expoStepKey} from './expo.mjs';
import {ROAM_QUICK_MAX,roamStamina,roamingState} from './roaming.mjs';
import {TRADE_OPPONENTS,tradingPost,negotiationEnergy} from './trading-post.mjs';
import {FELLOWS} from './catalog.mjs';
import {bondedPower} from './adventure.mjs';
import {TREASURE_AREAS,treasureState,treasureLevel,tileGem,restorationLevel,RESTORATION_MAX} from './treasure.mjs';
import {NORTH,northern,northernStats,northernSupplies,activeRoom,tileKind} from './northern.mjs';
import {BANQUET_PARTIES,banquetState} from './banquets.mjs';
import {mineState,mineDay} from './mine-clearance.mjs';
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
// Tasks are listed in the original's own spirit: collect-only. Anything that spends is NOT here.
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
// The line that does NOT move: it never buys an upgrade, a level, a character or a building. Where a
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

export const HELPER_TASKS=[
 // `waiting` exists only where the underlying action SUCCEEDS on an empty claim: `collect` banks
 // zero gold and still returns a state, so without this the helper would report a chore it did not do.
 {id:'village',   action:'collect',                 label:'Collect village earnings', note:'Trusteeship_14 pickBuild / _34 cityHarvest', waiting:s=>Math.floor(s.pending)>=1},
 {id:'inn',       action:'collectInnDeposit',       label:'Collect the Inn takings',  note:'Trusteeship_32 simgameCollect'},
 {id:'workshop',  action:'collectWorkshop',         label:'Collect the Workshop',     note:'Trusteeship_28 sg3OrderCommitOneKey'},
 {id:'apothecary',action:'potionCollect',           label:'Collect the Apothecary',   note:'Trusteeship_35/36 hostedMedicineInfo'},
 {id:'museum',    action:'claimMuseum',             label:'Claim Museum revenue',     note:'Trusteeship_27 museumInfo'},
 {id:'familiars', action:'collectFamiliarSupplies', label:'Collect familiar supplies',note:'Trusteeship_30 petTowerData'},
 {id:'supplies',  action:'claimStaffingMaterials',  label:'Claim the daily materials',note:'Trusteeship_18 dailyPackage'},
 // Chores below RUN a loop instead of firing one action. `run` returns the state it reached and how many
 // steps it took; 0 steps means nothing was waiting and the task reports as skipped.
 {id:'farm',      label:'Work the Magic Farm',       note:'Trusteeship_10 harvestOneKey',      run:runFarm},
 {id:'fishing',   label:'Fish while bait lasts',     note:'Trusteeship_11 gainBait',           run:runFishing},
 // After the fishing chore, never before it: see the note in runFishing. A player who switches fishing
 // off still gets the refill from here.
 {id:'bait',      action:'baitRefill',              label:'Refill fishing bait',      note:'Trusteeship_11 gainBait'},
 {id:'innGuests', label:'Welcome the Inn guests',    note:'Trusteeship_31 simgameOneWelcome',  run:runInnGuests},
 {id:'expo',      label:'Serve the Expo stalls',     note:'Trusteeship_37 hostedTDHangupReward',run:runExpo},
 {id:'restock',   action:'restockWorkshop',          label:'Restock the Workshop',             note:'Trusteeship_28 sg3OrderCommitOneKey'},
 // Provenance for these two, measured rather than guessed: hosted_mapping.json has NO executor matching
 // roam/travel/trade/negotiation (positive control -- pickBuild, cityHarvest, gainBait, collectionTax and
 // harvestOneKey all come back from the same search). So neither chore claims a row it does not have. The
 // nearest original relatives are _11 gainBait, whose daily refill is the pattern the stamina refill
 // copies, and _40 hostedCommercialwarTax, the merchant-competition takings a single-player Trading Post
 // is the adaptation of.
 {id:'roaming',   label:'Roam while stamina lasts',  note:'Local chore; refill follows Trusteeship_11 gainBait', run:runRoaming},
 {id:'trading',   label:'Run the Trading Post',      note:'Local chore; nearest is Trusteeship_40 hostedCommercialwarTax', run:runTrading},
 // Appended after `restock` deliberately: the duplicates chore consumes what the chores above PRODUCE
 // (fishing's duplicate catches, the Treasure Hunt's duplicate relic materials), so it must run last.
 {id:'treasure',  label:'Run the Treasure Hunt',     note:'No Trusteeship executor covers the dig; same loop-playing spirit as harvestOneKey _10', run:runTreasure},
 {id:'duplicates',label:'Spend duplicates on their own items',note:'Local chore: every duplicate sink has exactly one destination', run:runDuplicates},
 {id:'banquets',  label:'Run the Private Banquets',   note:'Local chore: no banquet executor in hosted_mapping.json', run:runBanquets},
 {id:'northern',  label:'Explore the Northern Odyssey',note:'Local chore: no dungeon executor in hosted_mapping.json',run:runNorthern},
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
 return {state:s,steps};
}
function runExpo(s,act,now){
 let steps=0;
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
   const r=act(s,'tradeBegin',now,plan.opponent,{seq:tradingPost(s).seq,team:plan.team});
   if(r&&!r.error&&r.state){s=r.state;steps++}
  }
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
function runTreasure(s,act,now){
 let steps=0;
 // treasureState() derives the day from s.lastAt; a save without one is not a save, so do nothing.
 if(!Number.isSafeInteger(s?.lastAt))return {state:s,steps:0};
 const room=()=>steps<CHORE_STEP_CAP;
 const step=(action,target)=>{
  if(!room())return false;
  const r=act(s,action,now,target,treasureState(s).seq);
  if(r&&!r.error&&r.state){s=r.state;steps++;return true}
  return false;
 };
 // One cycle = finish the open expedition, or (with no expedition open) bank what is waiting and start
 // the next one. Looping over cycles keeps dig / appraise / donate interleaved, so the step cap can never
 // starve the appraisal stage the way a dig-everything-then-appraise ordering would.
 for(let cycle=0;cycle<CHORE_STEP_CAP&&room();cycle++){
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
 *  displayed fish. Because fishing.mjs caps the skill at level 3, enough points eventually max every
 *  displayed fish, so the only real decision is ORDER. AGREED POLICY: cheapest first -- always upgrade
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
  for(const id of g.displayed||[]){const level=g.skills?.[id]||1;if(level<3&&level<pickLevel){pickLevel=level;pick=id}}
  if(!pick||(g.points||0)<2*pickLevel)break;
  if(!fire('upgradeFish',pick,null))break;
 }
 return {state:s,steps};
}
const IDS=new Set(HELPER_TASKS.map(t=>t.id));
export const freshHelper=()=>({tasks:Object.fromEntries(HELPER_TASKS.map(t=>[t.id,1])),ranAt:0});
export const helperState=s=>s.helper&&typeof s.helper==='object'&&!Array.isArray(s.helper)?s.helper:freshHelper();
/** A task is on unless it was explicitly switched OFF. That matters for saves written before a chore
 *  existed: their stored `tasks` map has no key for it, and requiring ===1 would deliver every new
 *  chore switched off, where the original ships 36 of its 40 default-on. An explicit 0 still wins. */
export const helperEnabled=(s,id)=>helperState(s).tasks?.[id]!==0;
/** Armed by the same daily habit that refills bait. Returns '' when armed, or the reason it is not. */
export function helperBlocked(s){
 const {dailies}=habitEarnings(s.habits,s.lastAt);
 return dailies<1?'Complete a daily habit to send the Little Helper out.':'';
}

export function validHelper(s){
 const h=s.helper;
 if(h===undefined)return true;
 if(!h||typeof h!=='object'||Array.isArray(h))return false;
 if(!h.tasks||typeof h.tasks!=='object'||Array.isArray(h.tasks))return false;
 for(const [id,v] of Object.entries(h.tasks))if(!IDS.has(id)||(v!==0&&v!==1))return false;
 return Number.isSafeInteger(h.ranAt)&&h.ranAt>=0;
}

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
 if(action==='helperRun'){
  const blocked=helperBlocked(s);if(blocked)return fail(blocked);
  const h=helperState(s);
  const queue=HELPER_TASKS.filter(t=>h.tasks?.[t.id]!==0).slice(0,HELPER_RUN_CAP);
  if(!queue.length)return fail('Every helper task is switched off.');
  let state=s;const done=[],skipped=[];
  for(const t of queue){
   if(t.run){const out=t.run(state,act,now);if(out.steps>0){state=out.state;done.push(`${t.label} (${out.steps})`)}else skipped.push(t.label);continue}
   if(t.waiting&&!t.waiting(state)){skipped.push(t.label);continue}
   const r=act(state,t.action,now,null,null);
   if(r&&!r.error&&r.state){state=r.state;done.push(t.label)}else skipped.push(t.label);
  }
  if(!done.length)return fail('Nothing was waiting: '+skipped.length+' task'+(skipped.length===1?'':'s')+' had nothing to do.');
  const hh=helperState(state);
  return {state:{...state,helper:{...hh,ranAt:now}},
   message:`Little Helper did ${done.length} chore${done.length===1?'':'s'}: ${done.join(', ')}.`+(skipped.length?` ${skipped.length} had nothing waiting.`:'')};
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
