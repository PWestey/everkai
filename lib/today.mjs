// THE TODAY LIST (QOL-02). The owner's request, 2026-09-19: "Can you create a daily list like there is
// in Isekai that tells me everything that should be done? And make sure if auto helper does it, it gets
// marked."
//
// WHAT THE ORIGINAL HAS, measured from configs/config/logic before writing a line of this.
// `Achievement.json` (18 bytes) and `MainTask.json` (15 bytes) are EMPTY WRAPPERS -- CLAUDE.md rule 3 --
// and every task row in the game lives in `TaskGeneral.json` (25,593 rows under a `TaskGeneral` key),
// partitioned by `moduleId`. The daily list is `moduleId == "DailyTask"`: 29 rows, 26 tasks plus 3
// milestone rows. `TaskModule.json` carries the cycle: {"_id":"DailyTask","refreshType":"Daily"}. One
// real row, quoted:
//   {"_id":"Task_Daily_03","moduleId":"DailyTask",
//    "taskReq":{"type":"CollectBuildingMoneyCount_Add","id":"Building_Bank","count":1},
//    "taskReward":"Reward_DailyTaskReward_03","order":3}
// So a row is TRIGGER TYPE + TARGET COUNT -> REWARD BUNDLE. The `_Add` suffix is the per-day delta
// counter (`TaskName.json` countTyp "add"), against `_Total` for the lifetime achievement counters.
// Every one of the 26 pays 2 or 3 of item "6" -- `Item.json` {"_id":"6","isCurrency":true,
// "icon":"Icon_Activity"}, the activity/liveness point -- on top of its gameplay item, and three
// milestone rows (`taskReq.type` "ActivityCount", counts 10 / 20 / 30) pay a gacha token for the day's
// accumulated activity. The board can pay 56 activity a day against a 30-point ladder, so the ladder is
// a "do about half of it" target, not a completionist gate.
// The RESET: there is no client-side reset hour. The client wipes daily progress only when the server
// pushes it (Player.lua registers RequestNames.SYNC_NEW_DAY = "new_day_sync"; StatManager
// :UpdateDailyTask clears dailyTaskMap on isFull). Positive control for that absence -- the same search
// does find the game's day-boundary helper zzTimer.GetPointTime(<hour>) at 20+ call sites, but every
// one passes an EVENT's own hour from System.json, never a global daily-task reset. Everkai is offline
// and has no server to push a new day, so this list resets on habitDay(), the local civil date every
// per-day ledger in lib/ already keys on.
//
// WHAT THIS IS INSTEAD, and why the difference is deliberate. The original's daily list is a REWARD
// TABLE: a second faucet bolted onto the actions, paying you again for doing them. Everkai already has
// one habit-gated faucet per loop and the habit multiplier is the game's spine, so adding a parallel
// activity-point currency would be a new faucet nobody measured. This list therefore PAYS NOTHING. It
// is a VIEW: every row is derived from state the save already holds, and opening it changes no state.
// That is also what makes "done by the helper" trustworthy -- there is no separate ledger to drift.
//
// THE ONE INVARIANT, and the reason every probe below reads the same field the action reads:
//   A row never says "done" while its underlying action would still succeed.
// tests/today.test.mjs is the negative control: for every row it runs the real action (or the helper's
// own runner for a loop) against the same save and asserts todo <=> the action succeeds.
import {habitDay,habitEarnings} from './habits.mjs';
import {HELPER_TASKS,helperState,helperBlocked,helperEnabled,bestPlant,bestGround,bestNegotiation,bestTreasureArea,bestInnDish,bestWorkshopJob,bestBanquetParty} from './helper.mjs';
import {summonDay,summonState,weekStartDay,STONE_FRAGMENTS_PER_STONE,WEEK_DAYS_FOR_BONUS} from './summon.mjs';
import {reserve,MATERIALS_PER_DAY} from './staffing.mjs';
import {originalProgression,DAILY_BREACH} from './original-progression.mjs';
import {KEEPSAKES,museumState} from './museum.mjs';
import {BAIT_STORAGE,BAIT_REFILL_MAX,fishingState} from './fishing.mjs';
import {innStaminaCap} from './inn-progression.mjs';
import {INN_GUESTS,innGuestReady} from './inn-guests.mjs';
import {fountainState,fairyAvailable,wishCost} from './fountain.mjs';
import {banquetState,BANQUET_PARTIES} from './banquets.mjs';
import {stageEvent,STAGE_MILESTONES} from './raphael-progress.mjs';
import {stageState} from './raphael.mjs';
import {roamStamina} from './roaming.mjs';
import {insightState,insightRule} from './insight.mjs';
import {FATHOM_DAILY_MAX,fathomState,fathomsApply,openSlots,slotTier,MAX_TIER} from './fathoms.mjs';
import {expoState,expoLocker} from './expo.mjs';
import {treasureState} from './treasure.mjs';
import {MINE_ROWS,mineToday,mineUnlocked} from './mine-clearance.mjs';
import {tradingPost} from './trading-post.mjs';
import {northern,northernSupplies} from './northern.mjs';
import {villageState,villageEventById,villageManageStep,villageManageLocked} from './village-events.mjs';
import {towerState,TOWER_FLOORS} from './familiar-tower.mjs';
import {dispatchState,dispatchDone,DISPATCH_TEAM} from './familiar-dispatch.mjs';
import {requiredLessons,schoolCapacity} from './education.mjs';
import {waitingChildren} from './family-trips.mjs';
import {suppliesWaiting} from './familiar-supplies.mjs';
import {MILESTONES} from './progression.mjs';
import {ACHIEVEMENT_CHAINS,chainProgress} from './achievements.mjs';
import {OPENING,RANK_ENCOUNTERS,openingTask,openingRequirement,openingProsperity,rankCost,rankEarnings,MAX_RANK} from './opening.mjs';
// openingPromote weighs Fame against village PROSPERITY, which is earnings per second plus star value.
// game.mjs is the only place totalRate lives, and it does NOT import this module, so there is no cycle.
import {totalRate} from './game.mjs';
import {FELLOWS} from './catalog.mjs';

/** Display order. The first two groups are the ones that EXPIRE at the day boundary, so they lead. */
export const TODAY_GROUPS=[
 {id:'habits', label:'Your habits',                 note:'The multiplier every other line is paid through.'},
 {id:'claims', label:'Claim before the day turns',  note:'These reset at midnight. Missing one loses it.'},
 {id:'collect',label:'Collect what is waiting',     note:'Nothing expires here; it just sits there.'},
 {id:'play',   label:'Today’s loops',               note:'Each has a daily allowance of its own.'},
 {id:'earned', label:'Claim what you have earned',  note:'Rewards already unlocked, waiting to be taken.'},
];

const TODO='todo',DONE='done',HELPER='helper',LOCKED='locked';
/** The day key EVERY per-day ledger in lib/ compares against: habitDay(s.lastAt), never UTC midnight. */
export const todayKey=s=>habitDay(s?.lastAt||0);
const armed=s=>habitEarnings(s?.habits,s?.lastAt).dailies>=1;
const GATE='Complete a daily habit first';
/** roaming.mjs keeps its refill stamp on the subtree, which is created lazily. */
const roamingRefillDay=s=>s?.roaming?.refillDay;
const todo=(detail='')=>({state:TODO,detail});
const done=(detail='')=>({state:DONE,detail});
const lock=reason=>({state:LOCKED,detail:reason});
/** A habit-gated once-a-day claim: the stamp decides `done`, the gate and any "already full" test
 *  decide `locked`, and everything else is `todo`. Order matters and mirrors the actions' own order:
 *  the stamp is checked FIRST, exactly as every action in lib/ checks its day key before its gate. */
const daily=(stamped,full,gated=true)=>s=>stamped(s)?done('Taken today'):full&&full(s)?lock(full(s)):gated&&!armed(s)?lock(GATE):todo();

/** Which helper chores actually did something today. Empty for a save the helper has never run, and
 *  for a record left over from an earlier day -- the record carries its own day key. */
export function helperDidToday(s){
 const d=helperState(s).did;
 return new Set(d&&d.day===todayKey(s)?d.ids:[]);
}

/** THE LIST. `helper` names the HELPER_TASKS ids that perform this row, and is what turns a finished
 *  row into "Done by the Little Helper". A row with no `helper` entry is one only the player can do. */
export const TODAY_ITEMS=[
 // -- HABITS ---------------------------------------------------------------------------------------
 {id:'habits',group:'habits',label:'Today’s habits',pays:'Gold, Fame and the earnings multiplier',
  probe(s){const {due,done:n}=summonDay(s,s.lastAt);
   if(!due)return lock('No daily habits are scheduled for today');
   return n>=due?done(`${n} of ${due} · perfect day`):todo(`${n} of ${due} done`)}},

 // -- CLAIMS THAT EXPIRE ---------------------------------------------------------------------------
 {id:'habitRewards',group:'claims',label:'Claim today’s habit rewards',helper:['habitRewards'],
  pays:'Acquaint Stone Fragments and Magic Ore; a perfect day adds an insignia fragment and star shards',
  probe(s){const {day,due,done:n,perfect}=summonDay(s,s.lastAt);
   if(summonState(s).days.some(d=>d.startsWith(day)))return done('Claimed today');
   if(!n)return lock(GATE);
   return todo(perfect?`Perfect day ready (${n}/${due})`:`${n}/${due} dailies — finish them all before claiming`)}},
 {id:'weekBonus',group:'claims',label:'Claim the weekly habit bonus',helper:['habitRewards'],
  pays:'The week’s Acquaint Stone bonus',
  probe(s){const w=summonState(s),week=weekStartDay(s.lastAt);
   if(w.weeks.includes(week))return done('Claimed this week');
   const perfect=w.days.filter(x=>x.endsWith('!')&&x.slice(0,10)>=week).length;
   return perfect>=WEEK_DAYS_FOR_BONUS?todo(`${perfect} perfect days this week`):lock(`${WEEK_DAYS_FOR_BONUS-perfect} more perfect days this week`)}},
 {id:'supplies',group:'claims',label:'Claim the daily building materials',helper:['supplies'],
  pays:`${MATERIALS_PER_DAY} building materials`,
  probe:daily(s=>reserve(s).days.includes(todayKey(s)),s=>{const r=reserve(s);return r.stock>1000000-MATERIALS_PER_DAY||r.claims>=1000000?'The material reserve is full':''},false)},
 {id:'breach',group:'claims',label:'Claim the daily breakthrough materials',helper:['breach'],
  pays:`${DAILY_BREACH} of each of the nine breakthrough materials`,
  probe(s){if(!originalProgression(s))return lock('Enable original growth in Training Rules');
   const p=s.originalProgression;
   if(p.dailyDay===todayKey(s))return done('Taken today');
   if(!armed(s))return lock(GATE);
   if(Object.values(p.stock).some(n=>n>1e6-DAILY_BREACH)||(p.dailyClaims||0)>=100000)return lock('Breakthrough storage is full');
   return todo()}},
 // NOT the `keepsakes` chore as well: that one ACCEPTS a keepsake already collected, which is a
 // different question from whether today's keepsake has been taken. Listing it here would mark this
 // row as the helper's work on a day the helper only accepted yesterday's.
 {id:'museum',group:'claims',label:'Collect today’s Museum keepsake',helper:['museum'],
  pays:'One keepsake and its permanent bonus',
  probe(s){const have=museumState(s);
   if(!KEEPSAKES.some(k=>!Object.hasOwn(have,k.id)))return done('Your collection is complete');
   if(s.museumDay===todayKey(s))return done('Taken today');
   return armed(s)?todo():lock(GATE)}},
 {id:'consumable',group:'claims',label:'Claim the daily supply',helper:[],
  pays:'Up to 10 of the supply you choose',
  probe:daily(s=>s.supplyDay===todayKey(s))},
 {id:'bait',group:'claims',label:'Refill the fishing bait',helper:['bait','fishing'],
  pays:`Up to ${BAIT_REFILL_MAX} bait, one per daily habit`,
  probe:daily(s=>fishingState(s).refillDay===todayKey(s),s=>fishingState(s).bait>=BAIT_STORAGE?'Bait storage is full':'')},
 {id:'innStamina',group:'claims',label:'Refill the Inn stamina',helper:['innService'],
  pays:'Inn stamina back to its cap',
  probe(s){if(!s.inn)return lock('Open the Inn first');
   if(s.inn.refillDay===todayKey(s))return done('Taken today');
   if(!armed(s))return lock(GATE);
   return s.inn.stamina>=innStaminaCap(s.inn)?lock('Inn stamina is already full'):todo()}},
 {id:'workshopRestock',group:'claims',label:'Take the Workshop supply delivery',helper:['restock'],
  pays:'20 Workshop Supplies',
  probe(s){if(!s.workshop)return lock('Open the Workshop first');
   if(s.workshop.restockDay===todayKey(s))return done('Taken today');
   if(s.workshop.supplies>=1e9)return lock('Workshop Supplies are full');
   return armed(s)?todo():lock(GATE)}},
 {id:'fountainBottles',group:'claims',label:'Prepare the Fairy Bottles',helper:['fountain'],
  pays:'Fairy Bottles, one wish each',
  probe:daily(s=>fountainState(s).refillDay===todayKey(s),s=>fountainState(s).bottles>=1e6?'Fairy Bottle storage is full':'')},
 {id:'banquetPantry',group:'claims',label:'Stock the banquet pantry',helper:['banquets'],
  pays:'Material sets for the largest banquet you can host',
  // banquetPrepare targets a PARTY and refuses when THAT party's two materials are both at 1e6, so the
  // "full" test is the helper's own choice of party -- the largest one -- not the pantry as a whole.
  probe(s){const b=banquetState(s);
   if(b.refillDay===todayKey(s))return done('Taken today');
   if(!armed(s))return lock(GATE);
   const id=bestBanquetParty(s,false),party=BANQUET_PARTIES.find(p=>p.id===id);
   if(!party)return lock('No banquet is available yet');
   return party.materials.some(m=>(b.pantry[m]||0)>=1e6)?lock('The pantry is full'):todo(`Stocks the ${party.name}`)}},
 {id:'raphaelStamina',group:'claims',label:'Prepare Raphael’s event Stamina',helper:['raphael'],
  pays:'100 event Stamina',
  probe:daily(s=>stageEvent(s).supplyDay===todayKey(s),s=>stageEvent(s).stamina+100>1e6?'Event Stamina storage is full':'')},
 {id:'roamRefill',group:'claims',label:'Refill the Roaming stamina',helper:['roaming'],
  pays:'Roaming stamina, one per daily habit',
  probe(s){if(roamingRefillDay(s)===todayKey(s))return done('Taken today');
   if(!armed(s))return lock(GATE);
   const st=roamStamina(s);
   return st.stamina>=st.cap?lock('Roaming stamina is already full'):todo()}},
 {id:'insight',group:'claims',label:'Study Insight',helper:[],
  pays:'Unidentified Insight for one Fellow type',
  probe(s){if(!Object.keys(s.fellows||{}).some(id=>insightRule(id)))return lock('No Fellow with a documented Insight ladder');
   if(insightState(s).refillDay===todayKey(s))return done('Taken today');
   return armed(s)?todo():lock(GATE)}},
 // NOT the daily allowance alone: fathomAdvance also refuses a slot that is not OPEN (intimacy and
 // lifetime habit actions) or already at MAX_TIER, so a save with the allowance but no practisable
 // slot would otherwise read "not done" for something no tap could do. Same test, same order.
 {id:'fathom',group:'claims',label:'Practise a Family Fathom',helper:[],
  pays:'A permanent business earnings percentage',
  probe(s){const ids=Object.keys(s.family||{}).filter(id=>fathomsApply(id));
   if(!ids.length)return lock('Welcome a family member first');
   const open=ids.some(id=>{const n=openSlots(s,id);for(let slot=1;slot<=n;slot++)if(slotTier(s,id,slot)<MAX_TIER)return true;return false});
   if(!open)return lock('No Fathom slot is open and unfinished yet');
   const f=fathomState(s),{dailies}=habitEarnings(s.habits,s.lastAt),allowance=Math.min(FATHOM_DAILY_MAX,dailies);
   if(!allowance)return lock(GATE);
   const used=f.day===todayKey(s)?f.used:0;
   return used>=allowance?done(`${used} of ${allowance} used today`):todo(`${allowance-used} of ${allowance} left today`)}},
 // A family TRIP is deliberately not a row here. It is a crystal purchase with a daily cap, not a
 // chore: listing it as "not done" would nag the owner to spend money every day. lib/family-trips.mjs
 // tripsLeft() is where that allowance lives if it is ever wanted.

 // -- COLLECT --------------------------------------------------------------------------------------
 {id:'village',group:'collect',label:'Collect the village earnings',helper:['village'],pays:'Gold',
  probe:s=>Math.floor(s.pending||0)>=1?todo(`${Math.floor(s.pending).toLocaleString()} gold waiting`):done('Nothing banked yet')},
 {id:'inn',group:'collect',label:'Collect the Inn takings',helper:['inn'],pays:'Gold',
  probe:s=>!s.inn?lock('Open the Inn first'):s.inn.deposit>0?todo(`${s.inn.deposit.toLocaleString()} gold waiting`):done('Nothing waiting')},
 {id:'workshop',group:'collect',label:'Collect the Workshop coins',helper:['workshop'],pays:'Workshop coins',
  probe:s=>!s.workshop?lock('Open the Workshop first'):s.workshop.deposit>0?todo(`${s.workshop.deposit.toLocaleString()} coins waiting`):done('Nothing waiting')},
 {id:'apothecary',group:'collect',label:'Collect the Apothecary gold',helper:['apothecary'],pays:'Gold',
  probe:s=>!s.apothecary?lock('Open the Apothecary first'):s.apothecary.deposit>0?todo(`${s.apothecary.deposit.toLocaleString()} gold waiting`):done('Nothing waiting')},
 {id:'familiarSupplies',group:'collect',label:'Collect the familiar supplies',helper:['familiars'],pays:'Level-up and class-up items',
  probe(s){const w=suppliesWaiting(s);
   if(!w.levelUp&&!w.classUp)return s.familiarSupplies?.since==null?lock('Clear Familiar Tower floor 1 to start its income'):done('The tower pays each full hour');
   return todo(`${w.hours} hour${w.hours===1?'':'s'} banked`)}},

 // -- THE LOOPS ------------------------------------------------------------------------------------
 {id:'farm',group:'play',label:'Work the Magic Farm',helper:['farm'],pays:'Crops and Knowledge',
  probe(s){const f=s.farm;if(!f)return lock('Open the Magic Farm first');
   const plots=f.plots||[],ripe=plots.filter(p=>p&&p.readyAt<=s.lastAt).length;
   const dry=plots.filter(p=>p&&!p.watered&&p.readyAt>s.lastAt).length,empty=plots.filter(p=>p===null).length;
   if(ripe||dry||(empty&&bestPlant(s)))return todo([ripe&&`${ripe} ready`,dry&&`${dry} to water`,empty&&`${empty} empty`].filter(Boolean).join(' · '));
   return done('Every plot is growing')}},
 {id:'fishing',group:'play',label:'Fish while the bait lasts',helper:['fishing'],pays:'Catches, Fishing EXP and Research Points',
  probe(s){const g=fishingState(s);
   if(!bestGround(s))return lock('Open Fishing first');
   return g.bait>0?todo(`${g.bait} bait left`):done('Out of bait until the refill')}},
 {id:'innGuests',group:'play',label:'Welcome the Inn’s special guests',helper:['innGuests'],pays:'Guest gifts',
  probe(s){if(!s.inn)return lock('Open the Inn first');
   const ready=INN_GUESTS.filter(r=>innGuestReady(s,r)).length;
   const gifts=Object.values(s.inn.guestGifts||{}).filter(g=>g?.claimedAt===null).length;
   return ready||gifts?todo([ready&&`${ready} waiting`,gifts&&`${gifts} gift${gifts===1?'':'s'} to claim`].filter(Boolean).join(' · ')):done('No guest is due')}},
 {id:'innService',group:'play',label:'Serve the Inn queue',helper:['innService'],pays:'Gold and Inn popularity',
  probe(s){if(!s.inn)return lock('Open the Inn first');
   if(s.inn.queue)return todo('A queue is already seated');
   return s.inn.stamina>=1&&bestInnDish(s,1)?todo(`${s.inn.stamina} stamina`):done('Out of Inn stamina')}},
 {id:'expo',group:'play',label:'Run the Mushroom Expo',helper:['expo'],pays:'Skill Pearls and Expo rating',
  probe(s){if(!s.expo)return lock('Open the Mushroom Expo first');
   const e=expoState(s),pearls=expoLocker(s).Item_Talent_Hero_1||0;
   if(e.active)return todo('A business day is open');
   if(pearls>0)return todo(`${pearls} Skill Pearls in the locker`);
   return Object.keys(s.expo.assigned||{}).length?todo('A business day is ready to open'):lock('Assign your stalls first')}},
 {id:'workshopCraft',group:'play',label:'Craft at the Workshop',helper:['workshopCraft'],pays:'Workshop coins and Sales EXP',
  probe(s){const w=s.workshop;if(!w)return lock('Open the Workshop first');
   if(w.job)return done('A batch is already crafting');
   if(!bestWorkshopJob(s))return lock('No unlocked product has a matching Fellow');
   return w.supplies>=1?todo(`${w.supplies} supplies`):done('Out of Workshop Supplies')}},
 {id:'treasure',group:'play',label:'Dig the Treasure Hunt',helper:['treasure'],pays:'Gemstones, relics and Steeltooth EXP',
  probe(s){const t=treasureState(s);
   if(t.trip)return todo('An expedition is open');
   if(Object.values(t.gems||{}).some(n=>n>0))return todo('Gemstones are waiting to be appraised');
   if(Object.values(t.relics||{}).some(r=>!r.donated||!r.displayed))return todo('Relics to donate or display');
   return t.stamina>0&&bestTreasureArea(s)?todo(`${t.stamina} Steeltooth stamina`):done('Out of Steeltooth stamina')}},
 {id:'mine',group:'play',label:'Deploy Fellows in the Mine',helper:['mine'],pays:'Gold, Fellow EXP and Mine Coins',
  probe(s){if(!mineUnlocked(s))return lock('The Mine is not open yet');
   const t=mineToday(s),next=MINE_ROWS.find(r=>r.cumulativePower>t.progress);
   if(!next)return done('The Mine is cleared out');
   const left=FELLOWS.filter(f=>s.fellows?.[f.id]&&!t.used.includes(f.id)).length;
   return left?todo(`${left} Fellow${left===1?'':'s'} still to deploy`):done('Every Fellow has deployed today')}},
 {id:'roaming',group:'play',label:'Roam the world',helper:['roaming'],pays:'Fame, gold and encounter items',
  probe(s){const st=roamStamina(s);
   return st.stamina>=1?todo(`${st.stamina} of ${st.cap} stamina`):done('Out of Roaming stamina')}},
 {id:'trading',group:'play',label:'Run the Trading Post',helper:['trading'],pays:'Trading rewards',
  probe(s){const t=tradingPost(s);
   if(t.run)return s.lastAt>=t.run.readyAt?todo('A negotiation is finished'):done('A negotiation is running');
   return bestNegotiation(s)?todo('A negotiation can be opened'):done('No opponent is affordable right now')}},
 {id:'banquets',group:'play',label:'Host a private banquet',helper:['banquets'],pays:'Banquet Coins and Popularity',
  probe(s){const b=banquetState(s);
   if(b.run)return todo('A banquet is seating — claim it when it fills');
   return bestBanquetParty(s,true)?todo('The pantry can pay for a banquet'):done('The pantry is empty')}},
 {id:'northern',group:'play',label:'Descend the Northern Odyssey',helper:['northern'],pays:'Expedition coins and clear bonuses',
  probe(s){const n=northern(s);
   if(n.run)return todo('An expedition is open');
   if(n.coins>=30)return todo(`${n.coins} expedition coins to exchange`);
   const sup=northernSupplies(s).supplies;
   return sup>=1?todo(`${sup} Suppl${sup===1?'y':'ies'}`):done('Out of Supplies')}},
 {id:'villageWalk',group:'play',label:'Walk the village',helper:['villageEvents'],pays:'The daily event reward and the adviser chain',
  // THE WALK IS NOT THE PENDING EVENT. villageEvent DRAWS today's encounter and stamps `day`; only
  // after that is there a `pending` to settle. A probe that looked at `pending` alone reported the
  // walk finished on a day it had never been taken -- caught by the helper-agreement check, which saw
  // the chore draw an event the row said was not there.
  probe(s){const v=villageState(s);
   if(v?.pending)return todo(villageEventById(v.pending)?.kind==='choice'?'A question is waiting for your answer':'An event is waiting');
   if(villageManageStep(s)&&!villageManageLocked(s))return todo('The adviser has a step ready');
   if(v?.day===todayKey(s))return done('Today’s walk is finished');
   return armed(s)?todo('Today’s walk has not been taken'):lock(GATE)}},
 {id:'raphael',group:'play',label:'Run Raphael’s support stage',helper:['raphael'],pays:'Encouragement and milestone rewards',
  probe(s){const e=stageEvent(s);
   if(e.run)return s.lastAt>=e.run.readyAt?todo('A support run is finished'):done('A support run is in progress');
   if(!stageState(s).cells?.some(c=>c?.kind==='fan'))return lock('Place a fan on the stage first');
   return e.stamina>=1?todo(`${e.stamina} event Stamina`):done('Out of event Stamina')}},
 {id:'familiarTower',group:'play',label:'Climb the Familiar Tower',helper:['familiarTower'],pays:'Tower income and familiar items',
  probe(s){if(!Object.keys(s.familiars||{}).length)return lock('Welcome a familiar first');
   const t=towerState(s);
   return t.cleared>=TOWER_FLOORS?done('Every floor is cleared'):todo(`Floor ${t.cleared+1} of ${TOWER_FLOORS}`)}},
 {id:'dispatch',group:'play',label:'Send the familiars on dispatch',helper:['dispatch'],pays:'Dispatch rewards',
  probe(s){if(Object.keys(s.familiars||{}).length<DISPATCH_TEAM)return lock(`Welcome ${DISPATCH_TEAM} familiars first`);
   const d=dispatchState(s);
   if(d.run)return dispatchDone(s)?todo('A dispatch is finished'):done('A dispatch is away');
   return todo('No team is out')}},
 {id:'school',group:'play',label:'Run the School',helper:['school'],pays:'Gold, Fellow EXP and graduation bonds',
  // Education Points alone are NOT work to do: a save with no family has nobody to enrol and nobody
  // to teach, and the row nagged about six unspendable points until this test caught it. The budget
  // only counts once there is a pupil in a seat, or a caretaker who could fill one.
  probe(s){const sc=s.school;if(!sc)return lock('Open the School first');
   if(sc.pupils?.some(p=>p.progress>=requiredLessons(p)))return todo('A pupil is ready to graduate');
   if(waitingChildren(s).length)return todo(`${waitingChildren(s).length} child${waitingChildren(s).length===1?'':'ren'} waiting to enrol`);
   const seats=Math.max(0,schoolCapacity(s)-(sc.pupils?.length||0));
   const canFill=seats>0&&Object.keys(s.family||{}).length>0;
   if(!sc.pupils?.length&&!canFill)return lock('Welcome a family member to take a pupil in');
   return sc.points>=1?todo(`${sc.points} Education Points`):done('Out of Education Points')}},

 // -- EARNED ---------------------------------------------------------------------------------------
 {id:'achievements',group:'earned',label:'Claim achievements and milestones',helper:['achievements'],pays:'Milestone and achievement rewards',
  probe(s){if(!s.claims)return lock('Not open yet');
   const m=MILESTONES.filter(x=>!s.claims.includes(x.id)&&x.metric(s)>=x.goal).length;
   const c=ACHIEVEMENT_CHAINS.filter(x=>chainProgress(s,x).ready).length;
   return m+c?todo(`${m+c} ready to claim`):done('Nothing is ready')}},
 {id:'journey',group:'earned',label:'Advance the journey',helper:['journey'],pays:'Quest rewards, rank promotions and earned encounters',
  probe(s){const o=s.opening;if(!o)return lock('Start your journey first');
   const t=openingTask(s);
   if(t&&openingRequirement(s,t).ready)return todo('A journey quest is ready to claim');
   if(o.events.some(id=>['reward','appoint'].includes(OPENING.stageEvents.find(x=>x._id===id)?.eventType)))return todo('A journey event is waiting');
   // Fame alone does not buy a rank: openingPromote also checks village PROSPERITY against
   // rankEarnings. Reading only the Fame side told the owner to promote on a village that could not.
   if(o.rank<MAX_RANK&&o.fame>=rankCost(o.rank)&&openingProsperity(s,totalRate(s))>=rankEarnings(o.rank))return todo('A rank promotion is affordable');
   if(RANK_ENCOUNTERS.some(e=>o.rank>=e.rank&&!o.city.includes(e.id)&&FELLOWS.some(f=>f.id===e.fellow)))return todo('An earned encounter is waiting');
   return done('Nothing is ready')}},
 {id:'forge',group:'earned',label:'Forge Acquaint Stones',helper:['habitRewards'],pays:'One Acquaint Stone per ten fragments',
  probe(s){const n=summonState(s).stoneFragments;
   return n>=STONE_FRAGMENTS_PER_STONE?todo(`${n} fragments banked`):done(`${n} of ${STONE_FRAGMENTS_PER_STONE} fragments`)}},
 {id:'fairy',group:'earned',label:'Claim the Fountain’s Fairy rewards',helper:['fountain'],pays:'Acquaint Stones',
  probe(s){const n=fairyAvailable(s);
   return n>0?todo(`${n} ready`):done('None ready')}},
 {id:'wishes',group:'earned',label:'Make the Fountain wishes',helper:['fountain'],pays:'Fountain rewards',
  probe(s){const b=fountainState(s).bottles,ten=wishCost(10);
   return ten!==null&&b>=ten?todo(`${b} Fairy Bottles`):done(`${b} bottles — a ten-wish costs ${ten}`)}},
 {id:'raphaelMilestones',group:'earned',label:'Claim Raphael’s milestones',helper:['raphael'],pays:'Milestone items',
  probe(s){const e=stageEvent(s);
   const ready=STAGE_MILESTONES.filter(m=>m.threshold<=e.consumed&&!e.claims.some(c=>c.threshold===m.threshold)).length;
   const locker=Object.values(e.locker||{}).filter(n=>n>0).length;
   return ready||locker?todo([ready&&`${ready} milestone${ready===1?'':'s'}`,locker&&'items in the locker'].filter(Boolean).join(' · ')):done('Nothing is ready')}},
];

const BY_ID=new Map(TODAY_ITEMS.map(x=>[x.id,x]));
export const todayItem=id=>BY_ID.get(id);

/** Every row, in group order, with its state resolved.
 *  DONE becomes DONE-BY-THE-HELPER only when (a) the row is finished AND (b) the helper's own run
 *  record for TODAY names a chore that performs it. A row the helper did and that has since become
 *  available again reports `todo`, because the underlying action would still succeed. */
export function todayList(s){
 const did=helperDidToday(s);
 const rows=[];
 for(const g of TODAY_GROUPS)for(const item of TODAY_ITEMS){
  if(item.group!==g.id)continue;
  let r;
  try{r=item.probe(s)}catch{r=lock('Not available on this save')}
  const byHelper=r.state===DONE&&(item.helper||[]).some(id=>did.has(id));
  rows.push({id:item.id,group:g.id,groupLabel:g.label,label:item.label,pays:item.pays||'',
   state:byHelper?HELPER:r.state,detail:r.detail||'',
   helper:(item.helper||[]).filter(id=>helperEnabled(s,id))});
 }
 return rows;
}

/** The count the panel heads with, and the same arithmetic the Little Helper's panel shows. `total`
 *  excludes locked rows: a system that is not open yet is not something the owner can do today. */
export function todaySummary(s){
 const rows=todayList(s);
 const live=rows.filter(r=>r.state!==LOCKED);
 return {
  total:live.length,
  done:live.filter(r=>r.state===DONE||r.state===HELPER).length,
  byHelper:live.filter(r=>r.state===HELPER).length,
  todo:live.filter(r=>r.state===TODO).length,
  locked:rows.length-live.length,
  day:todayKey(s),
  helperBlocked:helperBlocked(s),
  helperReady:rows.some(r=>r.state===TODO&&r.helper.length>0),
 };
}

export const TODAY_STATE_LABELS={todo:'Not done',done:'Done',helper:'Done by the Little Helper',locked:'Not available yet'};
/** Pinned so a new HELPER_TASKS id cannot silently be referenced by a row that never matches. */
export const todayHelperIds=()=>new Set(TODAY_ITEMS.flatMap(x=>x.helper||[]));
export const HELPER_TASK_IDS=new Set(HELPER_TASKS.map(t=>t.id));
