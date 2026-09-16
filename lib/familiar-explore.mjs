import data from './familiar-explore-data.json' with {type:'json'};
import {familiarById} from './familiars.mjs';
import {familiarSupplies,towerReachOf} from './familiar-supplies.mjs';
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
//  4. Leaving a monster without a contract. The original screen has no such button that we could read;
//     Everkai offers it so a player without contracts is never stuck. It pays nothing.
//  5. Luck Flower OutTime/Level columns are not used (their meaning is not in any table).
// NOT MODELLED: Incense/Attract (Item_PetAssign*, no bundle in reach grants it), the Familiar Shop that
// spends Familiar Tears and crystals (ScoreExchange PetShop_*), Energy Drinks, auto-explore, the
// SSR wish. Metamorphixirs are held for E7 and fragments for a future star-cost fix (E6).
export const EXPLORE=data,EXPLORE_AREAS=data.areas,CATCH_ITEMS=data.catch,STARTERS=data.starters;
const ENERGY_MS=data.energy.seconds*1000,ITEM_MAX=1e6,SUPPLY_MAX=1e12;
export const HELD_ITEMS=['Item_PetCatch2','Item_PetCatch3','Item_PetPacify1','Item_PetExploreRunCoin','Item_PetRefresh1','Item_PetRefresh2','Item_PetExploreBuff_01','Item_PetExploreBuff_02','Item_PetExploreBuff_03','Item_PetExploreBuff_04'];
/** @type {Record<number,string>} */
export const RARITY_NAMES={1:'N',2:'R',3:'SR',4:'SSR'};
export const INITIAL_SEED=20260916;
export const exploreArea=id=>EXPLORE_AREAS.find(a=>a.id===Number(id));
export const explorePet=id=>data.pets[id];
export function exploreState(s){
 return s.familiarExplore||{policyVersion:1,seed:INITIAL_SEED,seq:0,stamina:data.energy.initial,staminaAt:null,area:1,steps:{1:0,2:0,3:0},encounter:null,items:Object.fromEntries(HELD_ITEMS.map(i=>[i,0])),pieces:{},sp:[],starter:null,last:null};
}
/** Stamina now, and when the next point lands. A full tank does not bank time. */
export function staminaAt(e,now){
 if(e.stamina>=data.energy.max||e.staminaAt===null)return {stamina:e.stamina,since:now,next:null};
 const gained=Math.max(0,Math.floor((now-e.staminaAt)/ENERGY_MS)),stamina=Math.min(data.energy.max,e.stamina+gained);
 if(stamina>=data.energy.max)return {stamina,since:now,next:null};
 const since=e.staminaAt+gained*ENERGY_MS;return {stamina,since,next:since+ENERGY_MS};
}
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
export function cloneExplore(s){const e=exploreState(s);return {...e,steps:{...e.steps},items:{...e.items},pieces:{...e.pieces},sp:[...e.sp],encounter:e.encounter&&{...e.encounter}};}

export function validFamiliarExplore(s){
 if(s.familiarExplore===undefined)return true;
 const e=s.familiarExplore,owned=s.familiars||{};
 if(!record(e)||e.policyVersion!==1||!int(e.seed,4294967295)||!int(e.seq,1e12))return false;
 if(!int(e.stamina,data.energy.max)||e.stamina<data.energy.max&&e.staminaAt===null||!(e.staminaAt===null||int(e.staminaAt,Number.MAX_SAFE_INTEGER)&&e.staminaAt<=s.lastAt))return false;
 if(!exploreArea(e.area)||!areaUnlocked(s,e.area))return false;
 if(!record(e.steps)||Object.keys(e.steps).length!==EXPLORE_AREAS.length||!EXPLORE_AREAS.every(a=>int(e.steps[a.id],1e12)))return false;
 if(!record(e.items)||Object.keys(e.items).length!==HELD_ITEMS.length||!HELD_ITEMS.every(i=>int(e.items[i],ITEM_MAX)))return false;
 // Fragments may be held for a familiar not yet owned: the Dispatch Great Success pools pay any familiar's (2026-09-16).
 if(!record(e.pieces)||!Object.entries(e.pieces).every(([id,n])=>!!familiarById(id)&&int(n,ITEM_MAX)&&n>0))return false;
 if(!Array.isArray(e.sp)||new Set(e.sp).size!==e.sp.length||!e.sp.every(id=>Object.hasOwn(owned,id)))return false;
 if(!(e.starter===null||STARTERS.includes(e.starter)&&Object.hasOwn(owned,e.starter)))return false;
 if(!(e.last===null||record(e.last)&&typeof e.last.kind==='string'&&e.last.kind.length<=20&&typeof e.last.text==='string'&&e.last.text.length<=300))return false;
 if(e.encounter!==null){
  const c=e.encounter,pet=record(c)&&explorePet(c.pet),area=exploreArea(e.area);
  if(!pet||!area.pets.includes(c.pet)||typeof c.sp!=='boolean'||!int(c.alert,pet.alertMax-1)||!int(c.attempts,1e6)||!int(c.soothed,data.soothe.useMax)||!int(c.mustCatch,3))return false;
  if(Object.keys(c).length!==6)return false;
  if(c.mustCatch&&c.attempts>=c.mustCatch)return false;
 }
 return true;
}

export function exploreAction(s,action,target,value){
 if(!['familiarStarter','exploreArea','exploreStep','exploreCatch','exploreSoothe','exploreLeave'].includes(action))return null;
 const fail=error=>({state:s,error}),e=cloneExplore(s),now=s.lastAt;
 const tank=staminaAt(e,now);e.stamina=tank.stamina;e.staminaAt=tank.next===null?null:tank.since;
 const done=(state,text,kind)=>{e.seq++;e.last={kind,text};return {state:{...state,familiarExplore:e},message:text};};
 if(action==='familiarStarter'){
  // System.PetGosanke: the three starters; lang PanelPetGosanke "Choose a familiar to join your adventure.
  // Unselected familiars will appear in subsequent explorations." Offered only to a village with none.
  if(e.starter!==null||Object.keys(s.familiars||{}).length)return fail('Your first familiar has already joined.');
  if(!STARTERS.includes(target))return fail('Choose one of the three starter familiars.');
  const g=grantFamiliar(s,e,target);e.starter=target;
  return done(g.state,`${familiarById(target).name} joins your adventure!`,'starter');
 }
 if(action==='exploreArea'){
  const area=exploreArea(target);if(!area)return fail('Choose an area.');
  if(!areaUnlocked(s,area.id))return fail(`Unlocks at Familiar Tower floor ${area.unlock}.`);
  if(e.encounter)return fail('Finish with the monster in front of you first.');
  if(e.area===area.id)return fail('You are already exploring here.');
  e.area=area.id;return done(s,`Now exploring ${area.name}.`,'area');
 }
 const area=exploreArea(e.area);
 if(action==='exploreStep'){
  if(e.encounter)return fail('A monster is in front of you. Contract, soothe or leave first.');
  const free=e.items.Item_PetExploreBuff_04>0;
  if(!free&&e.stamina<area.cost)return fail(tank.next?`Out of stamina. The next point returns in ${Math.ceil((tank.next-now)/60000)} minutes.`:'Out of stamina.');
  if(e.steps[area.id]>=1e12)return fail('Exploration record is full.');
  if(free)e.items.Item_PetExploreBuff_04--;else{if(e.stamina===data.energy.max)e.staminaAt=now;e.stamina-=area.cost;}
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
   if(row.type==='buff'){const next=grantItems(s,e,[[row.buff,row.count]]);if(!next)return fail('Familiar item storage is full.');return done(next,`Found ${data.itemNames[row.buff]} x${row.count}. ${data.itemText[row.buff]}`,'buff');}
   const [,item,count]=weighted(e,row.pool,r=>r[0]),double=e.items.Item_PetExploreBuff_03>0;if(double)e.items.Item_PetExploreBuff_03--;
   const n=count*(double?2:1),next=grantItems(s,e,[[item,n]]);if(!next)return fail('Familiar item storage is full.');
   return done(next,`Found a lost item: ${n.toLocaleString()} ${item==='Item_PetLevelUP'?'level-up':'class-up'} items${double?' (doubled)':''}.`,'item');
  }
  const prize=weighted(e,data.lottery,r=>r.weight),double=e.items.Item_PetExploreBuff_02>0;if(double)e.items.Item_PetExploreBuff_02--;
  const n=prize.count*(double?2:1),next=grantItems(s,e,[[prize.item,n]]);if(!next)return fail('Familiar item storage is full.');
  const label=prize.item==='Item_PetLevelUP'?'level-up items':prize.item==='Item_PetClassUP'?'class-up items':data.itemNames[prize.item];
  return done(next,`A Luck Flower blooms: ${n.toLocaleString()} ${label}${double?' (doubled)':''}.`,'lottery');
 }
 const c=e.encounter;if(!c)return fail('No monster is in front of you. Explore first.');
 const pet=explorePet(c.pet),name=familiarById(c.pet).name;
 if(action==='exploreLeave'){e.encounter=null;return done(s,`You leave ${name} be.`,'leave');}
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
