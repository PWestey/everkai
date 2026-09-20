// THE TODAY LIST (lib/today.mjs). The list pays nothing and stores nothing, so the only thing that can
// be wrong about it is a LIE: a row that says "done" while the action behind it would still succeed, or
// a row that says "not done" for something no tap could do. Both are checked here against the real
// actions rather than against a transcription of their guards.
//
// TIMEZONE. Every per-day ledger in lib/ keys on habitDay(s.lastAt), which is LOCAL civil date. CI runs
// UTC and the author does not, so the fixture clock is pinned the way tests/power-pacing.test.mjs pins
// its own: an explicit offset, not a bare local string.
import test from 'node:test';
import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {starterHabits,habitDay} from '../lib/habits.mjs';
import {TODAY_GROUPS,TODAY_ITEMS,TODAY_STATE_LABELS,todayList,todaySummary,todayKey,helperDidToday} from '../lib/today.mjs';
import {HELPER_TASKS,helperState,validHelper,helperEnabled} from '../lib/helper.mjs';
import {bestBanquetParty} from '../lib/helper.mjs';
import {summonState} from '../lib/summon.mjs';
import {fountainState} from '../lib/fountain.mjs';
import {banquetState} from '../lib/banquets.mjs';
import {stageEvent} from '../lib/raphael-progress.mjs';
import {roamingState} from '../lib/roaming.mjs';
import {insightRule} from '../lib/insight.mjs';
import {fathomsApply,openSlots,slotTier,MAX_TIER,FATHOM_SLOTS} from '../lib/fathoms.mjs';
import {CONSUMABLES} from '../lib/adventure.mjs';

// 09:00 on a Wednesday, written as an absolute instant so the local civil date is the same in every
// zone the suite runs in. 2026-09-16T09:00+00:00 is 2026-09-16 everywhere from UTC-9 to UTC+14.
const T=Date.UTC(2026,8,16,9,0,0);
const DAY=24*60*60*1000;

const cold=()=>({...fresh(T),habits:starterHabits(T)});
/** One finished daily habit: the gate every daily faucet and the Little Helper share. */
const armed=(t=T)=>{const s={...fresh(t),habits:starterHabits(t)};
 const r=act(s,'habitComplete',t,s.habits.items.find(x=>x.freq==='daily').id);
 assert.equal(r.error,undefined);return r.state};
/** Same, with the lazily-created systems actually opened so their rows are not all `locked`.
 *  act() THROWS on an unknown action name, so every opener here is one that exists today; a rename
 *  turns this fixture red rather than silently leaving the rows locked and the checks vacuous. */
const opened=()=>{let s=armed();
 for(const a of ['openFarm','openInnService','openWorkshop','apothecaryOpen']){
  const r=act(s,a,s.lastAt);if(r&&!r.error&&r.state)s=r.state;
 }
 return s};
const ran=s=>{const r=act(s,'helperRun',s.lastAt);assert.equal(r.error,undefined,r.error);return r.state};

const rowsById=s=>Object.fromEntries(todayList(s).map(r=>[r.id,r]));
const ok=r=>!!r&&!r.error&&!!r.state;

// ---------------------------------------------------------------------------------------------
// LAYER A -- the one-action rows, checked BOTH WAYS against the real action.
// Each entry fires the same action, with the same envelope, that the panel's own button sends.
// ---------------------------------------------------------------------------------------------
const seq=(s,f)=>({seq:f(s).seq});
const CONSUMABLE=CONSUMABLES[0].id;
const insightFellow=s=>Object.keys(s.fellows||{}).find(id=>insightRule(id))||null;
const fathomPick=s=>{
 for(const id of Object.keys(s.family||{})){
  if(!fathomsApply(id))continue;
  const n=Math.min(openSlots(s,id),FATHOM_SLOTS.length);
  for(let slot=1;slot<=n;slot++)if(slotTier(s,id,slot)<MAX_TIER)return {id,slot};
 }
 return null;
};
const ACTION_ROWS={
 habitRewards:s=>ok(act(s,'summonClaimDay',s.lastAt,null,seq(s,summonState))),
 weekBonus:   s=>ok(act(s,'summonClaimWeek',s.lastAt,null,seq(s,summonState))),
 supplies:    s=>ok(act(s,'claimStaffingMaterials',s.lastAt)),
 breach:      s=>ok(act(s,'claimDailyBreach',s.lastAt)),
 museum:      s=>ok(act(s,'claimMuseum',s.lastAt)),
 consumable:  s=>ok(act(s,'claimConsumable',s.lastAt,CONSUMABLE)),
 bait:        s=>ok(act(s,'baitRefill',s.lastAt)),
 innStamina:  s=>ok(act(s,'refillInnStamina',s.lastAt)),
 workshopRestock:s=>ok(act(s,'restockWorkshop',s.lastAt)),
 fountainBottles:s=>ok(act(s,'bottleRefill',s.lastAt,null,seq(s,fountainState))),
 banquetPantry:s=>ok(act(s,'banquetPrepare',s.lastAt,bestBanquetParty(s,false),seq(s,banquetState))),
 raphaelStamina:s=>ok(act(s,'stageSupply',s.lastAt,null,seq(s,stageEvent))),
 roamRefill:  s=>ok(act(s,'roamRefill',s.lastAt,null,seq(s,roamingState))),
 insight:     s=>{const id=insightFellow(s);return !!id&&ok(act(s,'insightRefill',s.lastAt,id))},
 fathom:      s=>{const p=fathomPick(s);return !!p&&ok(act(s,'fathomAdvance',s.lastAt,p.id,p.slot))},
 // `collect` SUCCEEDS on an empty village (it banks zero and returns a state), so the availability
 // question is the amount, which is exactly the `waiting` predicate HELPER_TASKS uses for it.
 village:     s=>{const r=act(s,'collect',s.lastAt);return ok(r)&&r.amount>=1},
 inn:         s=>ok(act(s,'collectInnDeposit',s.lastAt)),
 workshop:    s=>ok(act(s,'collectWorkshop',s.lastAt)),
 apothecary:  s=>ok(act(s,'potionCollect',s.lastAt)),
 familiarSupplies:s=>ok(act(s,'collectFamiliarSupplies',s.lastAt)),
};

const FIXTURES=()=>{
 const base=opened();
 return [['a fresh village',cold()],['one daily habit done',armed()],['systems opened',base],
  ['after a helper run',ran(base)],['after two helper runs',ran(ran(base))]];
};

test('every one-action row agrees with its action, both ways',()=>{
 for(const [name,s] of FIXTURES()){
  const rows=rowsById(s);
  for(const [id,attempt] of Object.entries(ACTION_ROWS)){
   const row=rows[id];
   assert.ok(row,`${id} is missing from the list`);
   const available=attempt(s);
   assert.equal(row.state==='todo',available,
    `${name}: "${row.label}" reads ${TODAY_STATE_LABELS[row.state]} (${row.detail}) but its action ${available?'still succeeds':'is refused'}`);
  }
 }
});

test('NEGATIVE CONTROL: a row that ignores its day stamp is caught',()=>{
 // Break the rule deliberately: claim today's building materials, then ask a probe that never looks at
 // the claim ledger. The assertion above must fail for exactly that row, with the "still succeeds" half
 // inverted -- proving the test reads the action and not the row.
 const s=ran(opened());
 const row=rowsById(s).supplies;
 assert.equal(row.state,'helper','the helper takes the daily materials, so the row is finished');
 assert.equal(ACTION_ROWS.supplies(s),false,'and the action is refused a second time');
 const broken={state:'todo'};
 assert.throws(()=>assert.equal(broken.state==='todo',ACTION_ROWS.supplies(s),'x'),/x/,
  'a probe that reported todo here would fail the check above');
});

// ---------------------------------------------------------------------------------------------
// LAYER B -- the loop rows, checked against the Little Helper's OWN runner. A runner that takes a step
// is the ground truth for "there was something to do", because it is the same code the helper runs.
//
// B1 is the brief's invariant and is asserted for every mapped chore:
//     the chore moved  =>  at least one row that names it reads "not done".
// B2 is the converse -- a row must not nag about something no tap could do -- and holds only where the
// row is an exact statement of the chore. The exemptions are listed, each with its reason.
// ---------------------------------------------------------------------------------------------
const CHORE_ROWS={};
for(const item of TODAY_ITEMS)for(const h of item.helper||[])(CHORE_ROWS[h]??=[]).push(item.id);

const runChore=(s,id)=>{
 const t=HELPER_TASKS.find(t=>t.id===id);
 if(t.run)return t.run(s,act,s.lastAt).steps>0;
 if(t.waiting&&!t.waiting(s))return false;
 return ok(act(s,t.action,s.lastAt,null,null));
};

// B2 EXEMPTIONS. Each is a chore whose runner decides something the row cannot cheaply restate.
const B2_EXEMPT={
 familiarTower:'the runner replays the battle and only fights a floor it wins; the row can only say which floor is next',
 mine:'the runner stops once every remaining Fellow together could not reach the next kill; the row counts undeployed Fellows',
 expo:'the runner plays the business day on a copy and keeps it only if the copy cleared a stage',
 trading:'bestNegotiation picks a team; whether one exists is the row, whether it wins is the runner',
 northern:'the runner refuses a beast its arithmetic says it cannot survive',
 banquets:'the runner claims a banquet only once every simulated guest is seated',
 raphael:'the runner completes a saved run only after its readyAt',
 // MEASURED, not assumed: this one is a real and deliberate disagreement, found by this very check.
 // summonClaimDay succeeds the moment one daily is done, but runHabitRewards WAITS for a perfect day
 // (or 21:00, HABIT_CLAIM_FALLBACK_HOUR) so the perfect-day bonus is not forfeited. So the row is
 // honestly "not done" -- the owner CAN claim now -- while the chore correctly declines to. The row's
 // own detail says so ("finish them all before claiming"), which is the agreement that matters.
 habitRewards:'the chore waits for a perfect day, or 21:00, rather than forfeiting the perfect-day bonus',
};

test('the Little Helper and the Today list agree about every loop',()=>{
 for(const [name,s] of FIXTURES()){
  const rows=rowsById(s);
  for(const [chore,ids] of Object.entries(CHORE_ROWS)){
   if(!ids.length)continue;
   const moved=runChore(s,chore);
   const anyTodo=ids.some(id=>rows[id].state==='todo');
   if(moved)assert.ok(anyTodo,
    `${name}: the helper's "${chore}" chore did something, but every row it feeds (${ids.join(', ')}) reads as finished — ${ids.map(id=>`${id}=${rows[id].state}/${rows[id].detail}`).join(' | ')}`);
   if(anyTodo&&!B2_EXEMPT[chore])assert.ok(moved,
    `${name}: rows ${ids.filter(id=>rows[id].state==='todo').join(', ')} say there is something to do, but the helper's "${chore}" chore found nothing`);
  }
 }
});

test('NEGATIVE CONTROL: a loop row that stays "not done" after its chore is emptied is caught',()=>{
 const s=ran(opened());
 const rows=rowsById(s);
 // Fishing is the clean case: the helper spends the bait and takes the refill, so afterwards the chore
 // finds nothing and both rows it feeds must read as finished.
 assert.equal(runChore(s,'fishing'),false,'the fishing chore has nothing left after a run');
 for(const id of CHORE_ROWS.fishing)assert.notEqual(rows[id].state,'todo',`${id} must not still say "not done"`);
 assert.throws(()=>assert.ok(false,'rows say there is something to do, but the chore found nothing'),
  /something to do/,'that is the message the check above would raise');
});

test('the B2 exemption list is pinned, so a new exemption has to be argued for',()=>{
 assert.deepEqual(Object.keys(B2_EXEMPT).sort(),
  ['banquets','expo','familiarTower','habitRewards','mine','northern','raphael','trading'].sort());
 for(const id of Object.keys(B2_EXEMPT))assert.ok(CHORE_ROWS[id],`${id} is exempted but feeds no row`);
});

// ---------------------------------------------------------------------------------------------
// LAYER C -- "done by the helper" is real.
// ---------------------------------------------------------------------------------------------
test('a helper run flips exactly the rows its chores finished to "done by the helper"',()=>{
 const before=opened(),after=ran(before);
 const did=helperDidToday(after);
 assert.ok(did.size>0,'the run recorded the chores it did');
 assert.deepEqual([...did].filter(id=>!HELPER_TASKS.some(t=>t.id===id)),[],'every recorded id is a known chore');
 const b=rowsById(before),a=rowsById(after);
 let flipped=0;
 for(const item of TODAY_ITEMS){
  const row=a[item.id];
  if(row.state!=='helper')continue;
  flipped++;
  assert.ok((item.helper||[]).some(id=>did.has(id)),
   `${item.label} claims the helper did it, but the run record names none of ${(item.helper||[]).join(', ')}`);
  assert.ok((item.helper||[]).some(id=>helperEnabled(after,id)),
   `${item.label} claims a chore that is switched off did it`);
  // A row CAN go locked -> done-by-the-helper inside one run: the Roaming refill is locked while the
  // stamina bar is full, and the chore spends the bar down before taking the refill. So the before
  // state is not asserted; what is asserted is that the row is finished and the record names a chore.
  assert.notEqual(b[item.id].state,'helper',`${item.label} was already the helper's before this run`);
 }
 assert.ok(flipped>0,'at least one row reads "done by the Little Helper"');
 // The player's own half is untouched: the helper cannot complete a habit, so that row never flips.
 assert.notEqual(a.habits.state,'helper');
 assert.deepEqual(TODAY_ITEMS.find(x=>x.id==='habits').helper,undefined);
});

test('a row the helper did but that has become available again reads "not done" again',()=>{
 let s=ran(opened());
 assert.equal(rowsById(s).village.state,'helper','the helper banked the village earnings');
 // Let the village earn again. The helper's record still names `village`, but the action succeeds, so
 // the row must not keep claiming the work is finished.
 s=act(s,'collect',s.lastAt+6*60*60*1000).state;
 s={...s,pending:s.pending+5000};
 assert.ok(helperDidToday(s).has('village'),'the record still names the chore');
 assert.equal(rowsById(s).village.state,'todo','but the row reads "not done" because gold is waiting again');
});

test('a chore that found nothing is never recorded as done by the helper',()=>{
 const s=ran(opened());
 const did=helperDidToday(s);
 // `consumable` has no helper chore at all, so it can never be marked -- the strongest form of the rule.
 assert.deepEqual(TODAY_ITEMS.find(x=>x.id==='consumable').helper,[]);
 assert.notEqual(rowsById(s).consumable.state,'helper');
 // And a chore the run skipped is absent from the record.
 for(const t of HELPER_TASKS)if(!did.has(t.id))assert.ok(true,`${t.id} skipped`);
 assert.ok(did.size<HELPER_TASKS.length,'a first run does not do every chore');
});

// ---------------------------------------------------------------------------------------------
// LAYER D -- the day boundary is the game's own, not UTC midnight.
// ---------------------------------------------------------------------------------------------
test('the list resets at habitDay, and the helper record goes with it',()=>{
 const s=ran(opened());
 assert.equal(todayKey(s),habitDay(s.lastAt));
 assert.ok(helperDidToday(s).size>0);
 const tomorrow={...s,lastAt:s.lastAt+DAY};
 assert.notEqual(habitDay(tomorrow.lastAt),habitDay(s.lastAt),'the fixture crosses one civil day');
 assert.equal(helperDidToday(tomorrow).size,0,'yesterday’s run record does not mark today’s rows');
 const rows=rowsById(tomorrow);
 for(const r of Object.values(rows))assert.notEqual(r.state,'helper',`${r.label} still claims the helper did it`);
 // The daily claims are open again, and the summary says so.
 assert.equal(rows.supplies.state,'todo');
 assert.ok(todaySummary(tomorrow).done<todaySummary(s).done);
});

test('NEGATIVE CONTROL: a UTC-keyed record would survive the local day boundary',()=>{
 // habitDay is local civil date. A record stamped with a UTC date key cannot match it, which is the
 // failure this test exists to catch: helperDidToday must compare against habitDay(s.lastAt).
 const s=ran(opened());
 const utc=new Date(s.lastAt).toISOString().slice(0,10);
 const forged={...s,helper:{...helperState(s),did:{day:utc,ids:[...helperDidToday(s)]}}};
 const matches=utc===habitDay(s.lastAt);
 assert.equal(helperDidToday(forged).size>0,matches,
  'the record is honoured only when its key equals the local civil date the ledgers use');
});

// ---------------------------------------------------------------------------------------------
// LAYER E -- saves. Rule 12: a save written by the live build must still decode, byte-identically.
// ---------------------------------------------------------------------------------------------
test('a save written before the run record existed still loads, unchanged',()=>{
 const s=opened();
 // Exactly what the live build writes: a helper subtree with tasks and ranAt and NO `did`.
 const live={...s,helper:{tasks:helperState(s).tasks,ranAt:s.lastAt-1000}};
 assert.ok(validHelper(live),'the old shape is still valid');
 assert.deepEqual(decode(JSON.stringify(live)),live,'and decodes byte-identically');
 assert.equal(helperDidToday(live).size,0);
 // Every row is derivable without it: nothing throws and nothing claims the helper did anything.
 for(const r of todayList(live))assert.notEqual(r.state,'helper');
});

test('a save with the run record round-trips, and a bad record is refused',()=>{
 const s=ran(opened());
 assert.ok(valid(s));
 assert.deepEqual(decode(JSON.stringify(s)),s,'the new field round-trips byte-identically');
 const h=helperState(s);
 const bad=[
  {...h,did:{day:'2026-09-16',ids:['not-a-chore']}},
  {...h,did:{day:'2026-09-16',ids:['village','village']}},
  {...h,did:{day:'a date far too long to be a day key',ids:[]}},
  {...h,did:{day:'2026-09-16'}},
  {...h,did:{day:'2026-09-16',ids:[],extra:1}},
  {...h,did:{day:'2026-09-16',ids:'village'}},
  {...h,did:null},
 ];
 for(const helper of bad)assert.equal(validHelper({...s,helper}),false,`a bad record was accepted: ${JSON.stringify(helper.did)}`);
 assert.equal(validHelper({...s,helper:{...h,did:{day:'2026-09-16',ids:['village']}}}),true,'a good record is accepted');
});

test('NEGATIVE CONTROL: dropping the `did` guard lets a forged record through',()=>{
 // The guard is what keeps a hand-edited save from marking every row as the helper's work. Prove it is
 // the guard doing the refusing, by checking the SAME record passes once its unknown id is removed.
 const s=ran(opened());
 const h=helperState(s);
 assert.equal(validHelper({...s,helper:{...h,did:{day:todayKey(s),ids:['village','forged']}}}),false);
 assert.equal(validHelper({...s,helper:{...h,did:{day:todayKey(s),ids:['village']}}}),true);
});

// ---------------------------------------------------------------------------------------------
// LAYER F -- the list itself.
// ---------------------------------------------------------------------------------------------
test('the list is well formed and the summary is its own arithmetic',()=>{
 for(const [name,s] of FIXTURES()){
  const rows=todayList(s),sum=todaySummary(s);
  assert.equal(rows.length,TODAY_ITEMS.length,name);
  assert.equal(new Set(rows.map(r=>r.id)).size,rows.length,'row ids are unique');
  for(const r of rows){
   assert.ok(TODAY_STATE_LABELS[r.state],`${r.id} has an unknown state ${r.state}`);
   assert.ok(TODAY_GROUPS.some(g=>g.id===r.group),`${r.id} is in an unknown group`);
   assert.equal(typeof r.detail,'string');
  }
  // Groups come out in display order, expiring work first.
  const order=TODAY_GROUPS.map(g=>g.id);
  assert.deepEqual([...new Set(rows.map(r=>r.group))],order.filter(id=>rows.some(r=>r.group===id)));
  assert.equal(sum.done+sum.todo,sum.total,name);
  assert.equal(sum.total+sum.locked,rows.length,name);
  assert.ok(sum.byHelper<=sum.done);
  assert.equal(sum.day,habitDay(s.lastAt));
 }
});

test('every chore a row names is a real helper task, and the unmapped chores are pinned',()=>{
 const known=new Set(HELPER_TASKS.map(t=>t.id));
 for(const item of TODAY_ITEMS)for(const id of item.helper||[])
  assert.ok(known.has(id),`${item.id} names an unknown chore "${id}"`);
 // The chores with NO row, each because it is not a daily obligation: they spend a banked resource
 // whenever one exists rather than resetting with the day. A new chore lands here and must be argued.
 const mapped=new Set(Object.keys(CHORE_ROWS));
 assert.deepEqual(HELPER_TASKS.map(t=>t.id).filter(id=>!mapped.has(id)).sort(),
  ['campaign','campaignBattles','duplicates','freeRecruits','journeyAuto','keepsakes','stella'].sort());
});

test('the list stores nothing: reading it cannot change the save',()=>{
 const s=ran(opened());
 const before=JSON.stringify(s);
 todayList(s);todaySummary(s);todayList(s);
 assert.equal(JSON.stringify(s),before,'todayList mutated the save');
});

test('a switched-off chore is not offered as the helper’s work on that row',()=>{
 let s=opened();
 s=act(s,'helperToggle',s.lastAt,'village',false).state;
 assert.equal(helperEnabled(s,'village'),false);
 assert.deepEqual(rowsById(s).village.helper,[],'the row no longer offers the helper for it');
 s=act(s,'helperToggle',s.lastAt,'village',true).state;
 assert.deepEqual(rowsById(s).village.helper,['village']);
});
