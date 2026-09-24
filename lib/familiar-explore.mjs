import data from './familiar-explore-data.json' with {type:'json'};
import exchange from './familiar-exchange-data.json' with {type:'json'};
import {familiarById} from './familiars.mjs';
import {familiarSupplies,towerReachOf,staminaRule,BENEFITS,familiarBenefits} from './familiar-supplies.mjs';
// Familiar Exploration and contracts (parity rows E5 and ECON-11), imported by
// scripts/import-familiar-explore.py from configs/config/logic. This is the ACQUISITION path: a wild
// monster met while exploring becomes a familiar when a contract succeeds.
//
// MEASURED (see the importer for the table of each):
//  * 3 areas, opened by the Familiar Tower floor (PetArea.unlock 0/100/200), 1 stamina per explore.
//  * Events by weight: PetCatch 4000, PetExploreItem 5000, PetExploreLottery 1000 (every area).
//  * Scripted early encounters (PetArea.unspokenRules), keyed by the explore count IN THAT AREA.
//  * Encounter rarity by System.ExplorePetCatchWeight (N 3350, R 4700, SR 1500, SSR 450), then one of
//    the area's pets of that rarity. IsOwnedPet pets are left out until owned (PanelPetExploreCatchProb.lua).
//  * SP (shiny) chance per pet from Pet.SPProb.
//  * Contracts: success basis points by grade and rarity (PetCatchItem). Basic Contract is unlimited
//    (ScenePetExplore.lua shows "∞" for ball id 1 and skips its item check).
//  * A failed contract raises Alertness by a whole number in PetCatchItem.Alert [30,40]; at
//    Pet.AlertMax (100) the monster flees (lang PetExploreCatchFail2) and leaves Familiar Tears
//    (Pet.RunReward, lang PetExploreCatchFailWithReward).
//  * Ordinary Mochi lowers Alertness by 30, at most 3 per monster (System.PetAssistItem, PetAssistItemUseMax),
//    and not at 0 Alertness (lang PetExploreLowerAlertTips1).
//  * Stamina: starts at 20, holds 20, one point every 5,400 s (System.PetExploreEnergy*).
//  * A contract on a familiar already owned pays its fragments instead (Item.useParam.rewardId ->
//    Reward_Item_Owner_Pet_<id>): 10 for N and R, 40 for SR, 100 for SSR.
//  * Lost items and buffs (PetExploreItem) and the Luck Flower (PetExploreLottery) bundles.
//
// LOCAL, and marked in the UI as well:
//  1. The RNG. One LCG (the fountain's constants) whose seed is stored in the save, so reloading cannot
//     re-roll an outcome. The original rolls server-side.
//  2. MustCatch. unspokenRules carries MustCatch 1/2/3; Everkai reads it as "this scripted monster's
//     contract succeeds by that attempt at the latest". Two failures reach at most 80 Alertness, so a
//     3 never flees first -- consistent with the reading, but the table does not say it.
//  3. The four buffs' arithmetic. Their item texts are measured (Track Identification raises the next
//     SSR chance, Valuable Experience doubles the next Luck Flower, Fruitful Guidance doubles the next
//     lost item, Special Potion makes the next explore free); System.PetExploreBuff_01 = 500 is read as
//     +500 on the SSR encounter weight. Each buff is used up by the next event it applies to.
//  4. RETIRED 2026-09-24. Everkai had a `Leave it` button, marked local because the original's screen
//     could not be read. `img/encounter.png` settles it (10-explore.md X10): the encounter carries
//     `Use`, `Soothe`, `Skip`, `Ruin` and a back arrow, and no such button. `Ruin` is on all four
//     Explore screens, so it is the exit -- `exploreArea` now walks away from whatever is in front of
//     you, for nothing, and the extra action is gone. Nobody is stranded: grade 1 is unlimited.
//  5. Luck Flower OutTime/Level columns are not used (their meaning is not in any table).
//
// THE ROLL IS A FIRST-CLASS VALUE (docs/familiar-screen-specs/10-explore.md 0 and 9). `Explore` is one
// button with FOUR screens behind it, chosen by a weighted roll, and three of those screens carry
// their own primary verb -- `Use`, `Draw`, `Investigate`. Everkai used to roll the branch and pay it
// in the same press, so the player read a sentence where the original reads a screen. `exploreStep`
// now stops at the branch: it stores `pending = {kind, row}` and grants nothing. `exploreResolve`
// (the verb behind `Draw` and `Investigate`) pays it. The monster branch is unchanged -- its screen
// already existed as `encounter`, and its verb is a contract.
//
// The prize inside a branch is rolled at RESOLVE, not at step: `pending` pins WHICH screen you are
// on, never what it pays, so a stored pending is two bounded fields and cannot smuggle a reward.
// NOT MODELLED: Incense/Attract (Item_PetAssign*, no bundle in reach grants it), Energy Drinks,
// auto-explore, the SSR wish. Metamorphixirs are held for E7 and fragments for a future star-cost
// fix (E6).
//
// THE FAMILIAR SHOP IS NOT BUILT, AND SHOULD NOT BE (docs/familiar-screen-specs/12-monetisation.md).
// Its ten `ScoreExchange` rows are nine Crystal prices -- the premium currency Everkai does not have
// and should not add -- and ONE row priced in something a player earns by playing. That row is built,
// here, and nothing else from that surface is:
//
//   PetShop_8:  100 x Item_PetExploreRunCoin  ->  1 x Item_PetCatch2
//
// Familiar Tears are earned by having a monster FLEE; an Advanced Contract is the item that would have
// stopped it fleeing. Fail at catching things, accumulate Tears, convert Tears into a better chance of
// not failing -- a closed loop, entirely inside the original's own tables, and it closes audit finding
// S4/M1: Tears accumulated with no sink at all.
//
// THE RESET PERIOD IS EVERKAI'S, and it is marked as such because no table states it -- in the original
// `limit` resets on a server schedule. DAILY, and the choice is nearly free at this accrual rate.
// Measured from the original's tables, both halves (rule 1): with the unlimited Basic Contract and no
// Mochi, a flee needs three consecutive failures, which at System.ExplorePetCatchWeight's rarity mix
// and PetCatchItem row 1's odds happens on 51.2% of monster encounters for an average of 1.58 Tears.
// Monsters are 40% of PetArea.EventPool, so a press is worth 0.63 Tears and 100 Tears is ~158 presses
// -- about ten days of a full stamina bar (16 presses a day at PetExploreEnergyTime). A daily cap of
// one therefore never binds; a lifetime cap of one would make the loop pointless.
export const EXPLORE=data,EXPLORE_AREAS=data.areas,CATCH_ITEMS=data.catch,STARTERS=data.starters;
export const EXCHANGE=exchange;
const ENERGY_MS=data.energy.seconds*1000,ITEM_MAX=1e6,SUPPLY_MAX=1e12;
const BASE_STAMINA={max:data.energy.max,seconds:data.energy.seconds,ms:ENERGY_MS};
export const HELD_ITEMS=['Item_PetCatch2','Item_PetCatch3','Item_PetPacify1','Item_PetExploreRunCoin','Item_PetRefresh1','Item_PetRefresh2','Item_PetExploreBuff_01','Item_PetExploreBuff_02','Item_PetExploreBuff_03','Item_PetExploreBuff_04'];
/** @type {Record<number,string>} */
export const RARITY_NAMES={1:'N',2:'R',3:'SR',4:'SSR'};
export const INITIAL_SEED=20260916;
const dayKey=now=>{const d=new Date(now),p=n=>String(n).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`;};
/** The Pass's third benefit, re-gated (12-monetisation.md §5.2): one Ordinary Mochi a day, from
 *  `RewardPetPacifyDaliy`, once the Compendium gate is met. No cost, no cooldown beyond the day. */
export function familiarDailyState(s,now=s.lastAt){
 const e=exploreState(s),day=dayKey(now),d=BENEFITS.daily;
 const used=e.daily?.day===day?e.daily.count:0;
 return {day,used,left:Math.max(0,d.limit-used),open:familiarBenefits(s).mochi,item:d.item,count:d.count};
}
/** The Tears exchange today: how many of the day's `limit` are gone, and whether it can be pressed. */
export function exploreExchangeState(s,now=s.lastAt){
 const e=exploreState(s),day=dayKey(now);
 const used=e.exchange?.day===day?e.exchange.count:0;
 const held=e.items[exchange.price.item]||0;
 return {day,used,left:Math.max(0,exchange.limit-used),held,
  price:exchange.price.count,affordable:held>=exchange.price.count,
  grants:exchange.grants};
}
export const exploreArea=id=>EXPLORE_AREAS.find(a=>a.id===Number(id));
export const explorePet=id=>data.pets[id];
export function exploreState(s){
 return s.familiarExplore||{policyVersion:1,seed:INITIAL_SEED,seq:0,stamina:data.energy.initial,staminaAt:null,area:1,steps:{1:0,2:0,3:0},encounter:null,items:Object.fromEntries(HELD_ITEMS.map(i=>[i,0])),pieces:{},sp:[],starter:null,last:null,pending:null};
}
/** Stamina now, and when the next point lands. A full tank does not bank time. */
export function staminaAt(e,now,rule=BASE_STAMINA){
 const {max,ms}=rule;
 if(e.stamina>=max||e.staminaAt===null)return {stamina:e.stamina,since:now,next:null,max};
 const gained=Math.max(0,Math.floor((now-e.staminaAt)/ms)),stamina=Math.min(max,e.stamina+gained);
 if(stamina>=max)return {stamina,since:now,next:null,max};
 const since=e.staminaAt+gained*ms;return {stamina,since,next:since+ms,max};
}
/** The same reading, with this village's own earned cap and interval applied (12-monetisation.md §5.2). */
export const staminaNow=(s,now=s.lastAt)=>staminaAt(exploreState(s),now,staminaRule(s));
export const areaUnlocked=(s,id)=>{const a=exploreArea(id);return !!a&&towerReachOf(s)>=a.unlock;};
/** Pets that can appear for a rarity in an area right now. */
export const encounterPool=(s,area,grade)=>area.pets.filter(id=>explorePet(id).grade===grade&&(!area.ownedOnly.includes(id)||Object.hasOwn(s.familiars||{},id)));
/** Contract success chance in basis points; a scripted MustCatch is the only override. */
export const catchChance=(pet,grade)=>CATCH_ITEMS.find(c=>c.grade===grade).prob[String(explorePet(pet).grade)];
const next=seed=>(Math.imul(seed,1664525)+1013904223)>>>0;
/** Draw a whole number in [0,n) and advance the stored seed. */
function draw(e,n){e.seed=next(e.seed);return Math.floor(e.seed/4294967296*n);}
function weighted(e,rows,w){const total=rows.reduce((n,r)=>n+w(r),0);let roll=draw(e,total);for(const r of rows){roll-=w(r);if(roll<0)return r;}return rows.at(-1);}
const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
const record=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
/** `last` grew a structured payload for the reward ribbon (10-explore.md 4.5): the ITEMS a branch
 *  actually paid, so the ribbon can draw tiles instead of the panel parsing a sentence. Saves written
 *  before the ribbon carry `{kind,text}` only, which stays valid -- every added slot is optional. */
function validLastReward(l){
 const keys=new Set(Object.keys(l));
 for(const k of keys)if(!['kind','text','reward','subtitle','name','effect','remaining'].includes(k))return false;
 if(l.reward!==undefined){
  if(!Array.isArray(l.reward)||l.reward.length>6)return false;
  for(const row of l.reward){if(!Array.isArray(row)||row.length!==2||typeof row[0]!=='string'||row[0].length>40||!int(row[1],SUPPLY_MAX))return false;}
 }
 for(const k of ['subtitle','name','effect'])if(l[k]!==undefined&&!(typeof l[k]==='string'&&l[k].length<=200))return false;
 if(l.remaining!==undefined&&!int(l.remaining,ITEM_MAX))return false;
 return true;
}

/** Credit items to where they live: level-up/class-up go to the familiar supply store, the rest are held here. */
export function grantItems(s,e,items){
 let f=null;
 for(const [id,count] of items){
  if(id==='Item_PetLevelUP'||id==='Item_PetClassUP'){f=f||{...familiarSupplies(s)};const k=id==='Item_PetLevelUP'?'levelUp':'classUp';if(f[k]+count>SUPPLY_MAX)return null;f[k]+=count;}
  else{if(!HELD_ITEMS.includes(id))throw Error('Unmodelled familiar item '+id);if(e.items[id]+count>ITEM_MAX)return null;e.items[id]+=count;}
 }
 return f?{...s,familiarSupplies:f}:s;
}
/** Credit fragments of any familiar (the dispatch pools pay unowned ones too). Returns false when storage is full. */
export function grantPieces(e,id,count){if(!familiarById(id))throw Error('Unknown familiar '+id);if((e.pieces[id]||0)+count>ITEM_MAX)return false;e.pieces={...e.pieces,[id]:(e.pieces[id]||0)+count};return true;}
/** A familiar joins, or -- when already owned -- pays its fragments (Reward_Item_Owner_Pet_<id>). */
export function grantFamiliar(s,e,id){
 if(!familiarById(id))throw Error('Unknown familiar '+id);
 if(!Object.hasOwn(s.familiars||{},id))return {state:{...s,familiars:{...(s.familiars||{}),[id]:{level:1,stars:0}}},joined:true};
 const pieces=explorePet(id)?.pieces??0;if((e.pieces[id]||0)+pieces>ITEM_MAX)return {state:s,joined:false,pieces:0};
 if(pieces)e.pieces={...e.pieces,[id]:(e.pieces[id]||0)+pieces};
 return {state:s,joined:false,pieces};
}
export function cloneExplore(s){
 const e=exploreState(s);
 const out={...e,steps:{...e.steps},items:{...e.items},pieces:{...e.pieces},sp:[...e.sp],
  encounter:e.encounter&&{...e.encounter},pending:e.pending?{...e.pending}:null};
 // Only when it EXISTS. `exchange:undefined` is an own key that JSON.stringify drops, so a save that
 // had never exchanged compared unequal to itself after a reload -- caught by the determinism pin.
 if(e.exchange)out.exchange={...e.exchange};
 if(e.daily)out.daily={...e.daily};
 return out;
}

export function validFamiliarExplore(s){
 if(s.familiarExplore===undefined)return true;
 const e=s.familiarExplore,owned=s.familiars||{};
 if(!record(e)||e.policyVersion!==1||!int(e.seed,4294967295)||!int(e.seq,1e12))return false;
 // RULE 12, and the trap this nearly walked into. The cap is no longer a constant: it is 20, or 50
 // once `Item_PetBP_EnergyMax`'s gate is met. A save written by the old build can sit at 20 with
 // `staminaAt: null` -- a full tank then, a PARTIAL tank the moment the cap rises -- and the old
 // "a partial tank must have a clock" rule would have refused it on load. The rule is therefore
 // stated against the BASE cap, which accepts strictly more saves than before and still refuses the
 // hand-edit it was written for. The first press starts the clock again.
 if(!int(e.stamina,staminaRule(s).max)||e.stamina<data.energy.max&&e.staminaAt===null||!(e.staminaAt===null||int(e.staminaAt,Number.MAX_SAFE_INTEGER)&&e.staminaAt<=s.lastAt))return false;
 if(!exploreArea(e.area)||!areaUnlocked(s,e.area))return false;
 if(!record(e.steps)||Object.keys(e.steps).length!==EXPLORE_AREAS.length||!EXPLORE_AREAS.every(a=>int(e.steps[a.id],1e12)))return false;
 if(!record(e.items)||Object.keys(e.items).length!==HELD_ITEMS.length||!HELD_ITEMS.every(i=>int(e.items[i],ITEM_MAX)))return false;
 // Fragments may be held for a familiar not yet owned: the Dispatch Great Success pools pay any familiar's (2026-09-16).
 if(!record(e.pieces)||!Object.entries(e.pieces).every(([id,n])=>!!familiarById(id)&&int(n,ITEM_MAX)&&n>0))return false;
 if(!Array.isArray(e.sp)||new Set(e.sp).size!==e.sp.length||!e.sp.every(id=>Object.hasOwn(owned,id)))return false;
 if(!(e.starter===null||STARTERS.includes(e.starter)&&Object.hasOwn(owned,e.starter)))return false;
 if(!(e.last===null||record(e.last)&&typeof e.last.kind==='string'&&e.last.kind.length<=20&&typeof e.last.text==='string'&&e.last.text.length<=300&&validLastReward(e.last)))return false;
 // `pending` is the ROLLED BRANCH, not its prize: which of the three non-monster screens is open, and
 // for the two PetExploreItem screens which row of THIS AREA it came from. A save from before the
 // branch screens existed has no key at all, which reads as "no screen open" -- the state it was in.
 // The Tears exchange's daily ledger, the same shape lib/adventure.mjs validates for shopPearlDay.
 // A save from before this row existed has no key, which reads as "nothing exchanged" -- the state
 // it was in, and the only thing a hand-edit could want from it is a reset, which the day string
 // already gives away.
 for(const [key,limit] of [['exchange',exchange.limit],['daily',BENEFITS.daily.limit]]){
  const x=e[key];if(x===undefined)continue;
  if(!record(x)||Object.keys(x).length!==2||typeof x.day!=='string'||x.day.length>10||!int(x.count,limit))return false;
 }
 if(e.pending!==undefined&&e.pending!==null){
  const q=e.pending;
  if(!record(q)||Object.keys(q).length!==2||!['lostItem','blessing','luckFlower'].includes(q.kind))return false;
  if(q.kind==='luckFlower'){if(q.row!==null)return false;}
  else{const row=data.exploreItems.find(r=>r.area===e.area&&r.id===q.row);
   if(!row||(row.type==='buff')!==(q.kind==='blessing'))return false;}
  if(e.encounter!==null)return false;// one screen at a time: the roll picks exactly one branch
 }
 if(e.encounter!==null){
  const c=e.encounter,pet=record(c)&&explorePet(c.pet),area=exploreArea(e.area);
  if(!pet||!area.pets.includes(c.pet)||typeof c.sp!=='boolean'||!int(c.alert,pet.alertMax-1)||!int(c.attempts,1e6)||!int(c.soothed,data.soothe.useMax)||!int(c.mustCatch,3))return false;
  if(Object.keys(c).length!==6)return false;
  if(c.mustCatch&&c.attempts>=c.mustCatch)return false;
 }
 return true;
}

export function exploreAction(s,action,target,value){
 if(!['familiarStarter','exploreArea','exploreStep','exploreResolve','exploreCatch','exploreSoothe','exploreExchange','familiarDaily'].includes(action))return null;
 const fail=error=>({state:s,error}),e=cloneExplore(s),now=s.lastAt;
 const rule=staminaRule(s),tank=staminaAt(e,now,rule);e.stamina=tank.stamina;e.staminaAt=tank.next===null?null:tank.since;
 const done=(state,text,kind,payload)=>{e.seq++;e.last={kind,text,...payload};return {state:{...state,familiarExplore:e},message:text};};
 // A branch that has been ROLLED but not yet resolved: the screen opens, nothing is paid, and the
 // ribbon stays dark until its verb is pressed.
 const opens=(kind,row,text)=>{e.seq++;e.pending={kind,row};e.last=null;return {state:{...s,familiarExplore:e},message:text};};
 if(action==='familiarStarter'){
  // System.PetGosanke: the three starters; lang PanelPetGosanke "Choose a familiar to join your adventure.
  // Unselected familiars will appear in subsequent explorations." Offered only to a village with none.
  if(e.starter!==null||Object.keys(s.familiars||{}).length)return fail('Your first familiar has already joined.');
  if(!STARTERS.includes(target))return fail('Choose one of the three starter familiars.');
  const g=grantFamiliar(s,e,target);e.starter=target;
  return done(g.state,`${familiarById(target).name} joins your adventure!`,'starter');
 }
 if(action==='familiarDaily'){
  const d=familiarDailyState(s,now);
  if(!d.open)return fail(`Unlocks at Compendium Lv. ${BENEFITS.gates.mochi.level}.`);
  if(!d.left)return fail('Already collected today.');
  const next=grantItems(s,e,[[d.item,d.count]]);
  if(!next)return fail('Familiar item storage is full.');
  e.daily={day:d.day,count:d.used+1};
  return done(next,`Daily ${data.itemNames[d.item]} x${d.count}.`,'daily');
 }
 // ScoreExchange PetShop_8, and nothing else from the shop surface. See the header.
 if(action==='exploreExchange'){
  const x=exploreExchangeState(s,now);
  if(!x.left)return fail(`Already exchanged today. One a day.`);
  if(!x.affordable)return fail(`${data.itemNames[exchange.price.item]} ${x.held}/${x.price}.`);
  e.items[exchange.price.item]-=exchange.price.count;
  const next=grantItems(s,e,[[exchange.grants.item,exchange.grants.count]]);
  if(!next)return fail('Familiar item storage is full.');
  e.exchange={day:x.day,count:x.used+1};
  return done(next,`Exchanged ${exchange.price.count} ${data.itemNames[exchange.price.item]} for ${exchange.grants.count} ${data.itemNames[exchange.grants.item]}.`,'exchange');
 }
 if(action==='exploreArea'){
  const area=exploreArea(target);if(!area)return fail('Choose an area.');
  if(!areaUnlocked(s,area.id))return fail(`Unlocks at Familiar Tower floor ${area.unlock}.`);
  if(e.area===area.id)return fail('You are already exploring here.');
  // X10: the capture settles audit question 8 -- `img/encounter.png` has no `Leave it`. `Ruin` is on
  // every Explore screen and is the exit, so leaving the area walks away from the monster or the find.
  // Nothing is paid either way, which is exactly what Everkai's own `Leave it` did.
  e.encounter=null;e.pending=null;
  e.area=area.id;return done(s,`Now exploring ${area.name}.`,'area');
 }
 const area=exploreArea(e.area);
 if(action==='exploreStep'){
  if(e.encounter)return fail('A monster is in front of you. Contract, soothe or leave first.');
  if(e.pending)return fail('Finish what you found first.');
  const free=e.items.Item_PetExploreBuff_04>0;
  if(!free&&e.stamina<area.cost)return fail(tank.next?`Out of stamina. The next point returns in ${Math.ceil((tank.next-now)/60000)} minutes.`:'Out of stamina.');
  if(e.steps[area.id]>=1e12)return fail('Exploration record is full.');
  if(free)e.items.Item_PetExploreBuff_04--;else{if(e.staminaAt===null)e.staminaAt=now;e.stamina-=area.cost;}
  const step=++e.steps[area.id],scripted=area.scripted[String(step)];
  const kind=scripted?scripted.type:weighted(e,Object.entries(area.events),([,w])=>w)[0];
  if(kind==='PetCatch'){
   let pet;
   if(scripted)pet=scripted.id;
   else{
    const boost=e.items.Item_PetExploreBuff_01>0;
    const grades=Object.entries(data.gradeWeights).map(([g,w])=>[Number(g),w+(boost&&g==='4'?data.ssrBuffWeight:0)]).filter(([g])=>encounterPool(s,area,g).length);
    if(boost)e.items.Item_PetExploreBuff_01--;
    const [grade]=weighted(e,grades,([,w])=>w),pool=encounterPool(s,area,grade);
    pet=pool[draw(e,pool.length)];
   }
   const p=explorePet(pet),sp=draw(e,p.sp+p.common)<p.sp;
   e.encounter={pet,sp,alert:0,attempts:0,soothed:0,mustCatch:scripted?.mustCatch||0};
   return done(s,`A wild ${sp?'shining ':''}${RARITY_NAMES[p.grade]} ${familiarById(pet).name} appears!`,'encounter');
  }
  if(kind==='PetExploreItem'){
   const rows=data.exploreItems.filter(r=>r.area===area.id),row=scripted?rows.find(r=>r.id===scripted.id):weighted(e,rows,r=>r.weight);
   return row.type==='buff'
    ?opens('blessing',row.id,'Someone on the path has something for you.')
    :opens('lostItem',row.id,'Pleasant Surprise.');
  }
  return opens('luckFlower',null,'A Luck Flower blooms.');
 }
 // `Draw` and `Investigate` -- one action behind two of the original's verbs, because the three
 // non-monster branches differ only in which table pays and which ribbon variant announces it.
 if(action==='exploreResolve'){
  const q=e.pending;if(!q)return fail('Nothing to investigate. Explore first.');
  if(q.kind==='luckFlower'){
   const prize=weighted(e,data.lottery,r=>r.weight),double=e.items.Item_PetExploreBuff_02>0;
   const n=prize.count*(double?2:1),next=grantItems(s,e,[[prize.item,n]]);
   if(!next)return fail('Familiar item storage is full.');
   if(double)e.items.Item_PetExploreBuff_02--;
   e.pending=null;
   const label=prize.item==='Item_PetLevelUP'?'level-up items':prize.item==='Item_PetClassUP'?'class-up items':data.itemNames[prize.item];
   return done(next,`A Luck Flower blooms: ${n.toLocaleString()} ${label}${double?' (doubled)':''}.`,'lottery',{reward:[[prize.item,n]]});
  }
  const row=data.exploreItems.find(r=>r.area===e.area&&r.id===q.row);
  if(!row)return fail('That find is no longer here.');
  if(q.kind==='blessing'){
   const next=grantItems(s,e,[[row.buff,row.count]]);if(!next)return fail('Familiar item storage is full.');
   e.pending=null;
   return done(next,`Found ${data.itemNames[row.buff]} x${row.count}. ${data.itemText[row.buff]}`,'buff',
    {reward:[[row.buff,row.count]],name:data.itemNames[row.buff],effect:data.itemText[row.buff],remaining:e.items[row.buff]});
  }
  const [,item,count]=weighted(e,row.pool,r=>r[0]),double=e.items.Item_PetExploreBuff_03>0;
  const n=count*(double?2:1),next=grantItems(s,e,[[item,n]]);
  if(!next)return fail('Familiar item storage is full.');
  if(double)e.items.Item_PetExploreBuff_03--;
  e.pending=null;
  return done(next,`Found a lost item: ${n.toLocaleString()} ${item==='Item_PetLevelUP'?'level-up':'class-up'} items${double?' (doubled)':''}.`,'item',
   {reward:[[item,n]],subtitle:"You've found lost supplies."});
 }
 const c=e.encounter;if(!c)return fail('No monster is in front of you. Explore first.');
 const pet=explorePet(c.pet),name=familiarById(c.pet).name;
 if(action==='exploreSoothe'){
  if(c.alert<=0)return fail('0 alertness. No items needed.');
  if(c.soothed>=data.soothe.useMax)return fail(`Soothed ${data.soothe.useMax} times already.`);
  if(e.items[data.soothe.item]<1)return fail('No Ordinary Mochi left.');
  e.items[data.soothe.item]--;c.soothed++;c.alert=Math.max(0,c.alert-data.soothe.alert);
  return done(s,`${name} eats the Ordinary Mochi. Alertness ${c.alert}.`,'soothe');
 }
 const grade=Number(value),item=CATCH_ITEMS.find(x=>x.grade===grade);
 if(!item)return fail('Choose a contract.');
 if(grade>1&&e.items[item.item]<1)return fail(`No ${item.name} left.`);
 if(grade>1)e.items[item.item]--;
 c.attempts++;
 const roll=draw(e,10000),success=c.mustCatch&&c.attempts>=c.mustCatch||roll<catchChance(c.pet,grade);
 if(success){
  e.encounter=null;const g=grantFamiliar(s,e,c.pet);
  if(c.sp&&!e.sp.includes(c.pet))e.sp.push(c.pet);
  return done(g.state,g.joined?`Contract success! ${name} joins as a familiar${c.sp?' (shining form)':''}.`:`Contract success! ${name} is already with you: +${g.pieces} fragments.`,'caught');
 }
 const rise=item.alert[0]+draw(e,item.alert[1]-item.alert[0]+1);c.alert+=rise;
 if(c.alert>=pet.alertMax){
  e.encounter=null;const next=pet.tears?grantItems(s,e,[['Item_PetExploreRunCoin',pet.tears]])||s:s;
  return done(next,pet.tears?`${name} escaped but left ${pet.tears} Familiar Tears behind.`:`${name} fled.`,'fled');
 }
 return done(s,`Contract failed. ${name}'s alertness rises by ${rise} to ${c.alert}.`,'failed');
}
