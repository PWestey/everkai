import {giftBatch} from './gift-batch.mjs';
import {validWardrobe,wardrobeAction} from './wardrobe.mjs';
import {validFamilyGallery,discoverDatePicture,familyGalleryAction} from './family-gallery.mjs';
import {validOpening,openingAction,observeOpening} from './opening.mjs';
import {specialBlessingAction} from './special-blessings.mjs';
import {originalProgression} from './original-progression.mjs';
import {mineAction,validMine} from './mine-clearance.mjs';
import {stellaAction,validStella} from './stella.mjs';
import {northernAction,validNorthern} from './northern.mjs';
import {tradingAction,validTradingPost} from './trading-post.mjs';
import {stageEventAction,validStageEvent} from './raphael-progress.mjs';
import {tonicAction,validTonics,availableDateEnergy,spendDateEnergy} from './tonics.mjs';
import {elixirAction,validElixirs} from './elixirs.mjs';
import {fountainAction,validFountain} from './fountain.mjs';
import {banquetAction,validBanquets} from './banquets.mjs';
import {validApothecary,settleApothecary,apothecaryAction} from './apothecary.mjs';
import {treasureAction,validTreasure,treasureIncome} from './treasure.mjs';
import {validStory,storyAction} from './storybook.mjs';
import {dateReward} from './dating.mjs';
import {validExpo,expoAction} from './expo.mjs';
import {parseSaveJSON} from './save-format.mjs';
import {fishingAction,validFishing} from './fishing.mjs';
import {insightAction,validInsight} from './insight.mjs';
import {validTower,towerAction} from './familiar-tower.mjs';
import {validFrontier,frontierAction} from './frontier.mjs';
import {validFarm,farmAction} from './farm.mjs';
import {validWorkshop,settleWorkshop,workshopAction} from './workshop.mjs';
import {validInn,settleInn,innAction} from './inn.mjs';
import {hireCardAction,validHireCards} from './hire-cards.mjs';
import {businessAction,validBusinesses,enterpriseRate} from './businesses.mjs';
import {museumAction,validMuseum} from './museum.mjs';
import {educationReward,educationAction,requiredLessons,schoolCapacity} from './education.mjs';
import {blessingAction,validBlessings} from './blessings.mjs';
import {familiarAction,validFamiliars} from './familiars.mjs';
import {stageAction,validStage} from './raphael.mjs';
import {talentAction} from './talents.mjs';
import {artifactAction} from './artifacts.mjs';
import {consumableAction} from './consumables.mjs';
import {bondFactor,validBonds,bondAction} from './bonds.mjs';
import {FELLOWS,BUILDINGS,FAMILY,GIFTS,fellowById} from './catalog.mjs';
import {MILESTONES,energyCap,ENERGY_RECOVERY_MS,blessingCost,familyBonus,playerRank} from './progression.mjs';
import {EDUCATION_RECOVERY_MS,EDUCATION_CAP,MAX_PUPILS,LESSONS_REQUIRED,PUPIL_TYPES,METHODS,relationRequired,pupilReward,validSchool,freshSchool} from './school.mjs';
import {EXTRA_ITEMS,LEGACY_ITEMS,V7_ITEMS,V8_ITEMS,V9_ITEMS,emptyMaterials,newFellow,freshAdventure,validAdventure,adventureAction,fellowFactor,xpCost} from './adventure.mjs';
export const SAVE_VERSION=10;
export const SAVE_KEY='isekai-private-village-v1'; // Keep the installed app's storage key.
export const MAX_LEVEL=60, MAX_BUILDING_LEVEL=10, MAX_AWAY_MS=8*60*60*1000;
export const rate=level=>2+(level-1)*1.5;
export const cost=xpCost;
export const buildingCost=level=>Math.ceil(200*Math.pow(1.7,level-1));
const number=n=>Number.isFinite(n)&&n>=0&&n<=Number.MAX_SAFE_INTEGER;
const level=(n,max)=>Number.isInteger(n)&&n>=1&&n<=max;
const common=s=>!!s&&['gold','pending','lastAt','earned','upgrades'].every(k=>number(s[k]))&&Number.isInteger(s.gold)&&Number.isInteger(s.upgrades);
/** @returns {{version:number,gold:number,pending:number,lastAt:number,earned:number,upgrades:number,fellows:Record<string,{level:number,aptitude:number,skill:number,breaks:number,gear:string|null}>,bonds:Record<string,{fellow:string|null,level:number}>,family:Record<string,{intimacy:number,blessingPower:number,points:number,skill:number,relationship:number}>,adventure:any,crystals:number,school:any,fellowXP:number,inventory:Record<string,number>,energy:number,claims:string[],stats:{gifts:number,dates:number},buildings:Record<string,{level:number,fellow:string|null}>}} */
export function fresh(now=Date.now()){return {version:10,bonds:{},adventure:freshAdventure(),crystals:0,school:freshSchool(),fellowXP:250,inventory:{...emptyMaterials(),gift1:5,gift2:0,gift3:5,gift4:0,gift5:0},energy:3,claims:[],stats:{gifts:0,dates:0},gold:250,pending:30,lastAt:now,earned:0,upgrades:0,fellows:{hero_15:newFellow()},family:{},buildings:{fish:{level:1,fellow:'hero_15'}}}}
function validVillage(s){
 if(!common(s)||![2,3,4,5,6,7,8,9,10].includes(s.version)||!s.fellows||typeof s.fellows!=='object'||Array.isArray(s.fellows)||!s.family||typeof s.family!=='object'||Array.isArray(s.family)||!s.buildings||typeof s.buildings!=='object'||Array.isArray(s.buildings))return false;
 if(!s.fellows.hero_15||!s.buildings.fish)return false;
 if(!Object.entries(s.fellows).every(([id,f])=>fellowById(id)&&f&&level(f.level,originalProgression(s)?750:s.version>=5?MAX_LEVEL:20)))return false;
 if(s.version===2&&Object.keys(s.family).length)return false;
 if(s.version>=3&&!Object.entries(s.family).every(([id,f])=>FAMILY.some(x=>x.id===id)&&f&&['intimacy','blessingPower','points','skill'].every(k=>Number.isInteger(f[k])&&f[k]>=0)&&f.intimacy<=1e6&&f.blessingPower>=1&&f.blessingPower<=1e6&&f.points<=1e9&&f.skill<=20))return false;
 const assigned=[];
 for(const [id,b] of Object.entries(s.buildings)){if(!BUILDINGS.some(x=>x.id===id)||!b||!level(b.level,MAX_BUILDING_LEVEL)||!(b.fellow===null||(Object.hasOwn(s.fellows,b.fellow)&&typeof b.fellow==='string')))return false;if(b.fellow)assigned.push(b.fellow)}
 return new Set(assigned).size===assigned.length;
}
function validFamily(s){return validVillage(s)&&[3,4,5,6,7,8,9,10].includes(s.version)&&s.inventory&&typeof s.inventory==='object'&&!Array.isArray(s.inventory)&&Object.keys(s.inventory).length===(s.version>=5?GIFTS.length+(s.version>=10?EXTRA_ITEMS:s.version===9?V9_ITEMS:s.version===8?V8_ITEMS:s.version===7?V7_ITEMS:LEGACY_ITEMS).length:GIFTS.length)&&[...GIFTS,...(s.version>=5?(s.version>=10?EXTRA_ITEMS:s.version===9?V9_ITEMS:s.version===8?V8_ITEMS:s.version===7?V7_ITEMS:LEGACY_ITEMS):[])].every(g=>Number.isInteger(s.inventory[g.id])&&s.inventory[g.id]>=0&&s.inventory[g.id]<=1e6)&&Array.isArray(s.claims)&&new Set(s.claims).size===s.claims.length&&s.claims.every(id=>MILESTONES.some(m=>m.id===id))&&number(s.energy)&&s.energy<=energyCap(s)&&s.stats&&['dates','gifts'].every(k=>Number.isInteger(s.stats[k])&&s.stats[k]>=0&&s.stats[k]<=1e9)}
function validV4(s){return validFamily(s)&&[4,5,6,7,8,9,10].includes(s.version)&&Object.values(s.family).every(f=>Number.isInteger(f.relationship)&&f.relationship>=1&&f.relationship<=5)&&validSchool(s)}
export function valid(s){return validWardrobe(s)&&validFamilyGallery(s)&&validOpening(s)&&validMine(s)&&validStella(s)&&validNorthern(s)&&validTradingPost(s)&&validStageEvent(s)&&validTonics(s)&&validElixirs(s)&&validFountain(s)&&validBanquets(s)&&validApothecary(s)&&validTreasure(s)&&validV4(s)&&validStory(s)&&validExpo(s)&&s.version===10&&validTower(s)&&validFrontier(s)&&validInn(s)&&validWorkshop(s)&&validFarm(s)&&validHireCards(s)&&validBusinesses(s)&&validMuseum(s)&&validBlessings(s)&&validFamiliars(s)&&validStage(s)&&validAdventure(s)&&validBonds(s)}
function upgradeSave(s){return {...s,version:10,bonds:{},adventure:freshAdventure(),crystals:0,inventory:{...emptyMaterials(),...s.inventory},fellows:Object.fromEntries(Object.entries(s.fellows).map(([id,f])=>[id,{...newFellow(f.level)}]))}}
export function decode(raw){const s=parseSaveJSON(raw);if(s&&!validWardrobe(s))throw Error("Invalid wardrobe collection.");if(s&&!validFamilyGallery(s))throw Error("Invalid Family picture collection.");if(s&&!validOpening(s))throw Error("Invalid opening journey.");if(s&&!validMine(s))throw Error("Invalid Mine Clearance.");if(s&&!validStella(s))throw Error('Invalid Stella progression.');if(s&&!validNorthern(s))throw Error('Invalid Northern expedition.');if(s&&!validTradingPost(s))throw Error('Invalid Trading Post.');if(s&&!validStageEvent(s))throw Error('Invalid Raphael support runs.');if(s&&!validTonics(s))throw Error('Invalid tonic reserve.');if(s&&!validElixirs(s))throw Error('Invalid elixir receipts.');if(s&&!validFountain(s))throw Error('Invalid Fountain of Wishes.');if(s&&!validBanquets(s))throw Error('Invalid private Banquets.');if(s&&!validApothecary(s))throw Error('Invalid Apothecary counter.');if(s&&!validTreasure(s))throw Error('Invalid Treasure Hunt.');if(s&&!validStory(s))throw Error('Invalid story bookmarks.');if(s&&!validExpo(s))throw Error('Invalid Mushroom Expo.');if(s&&!validFishing(s))throw Error('Invalid Fishing collection.');if(s&&!validInsight(s))throw Error('Invalid Insight progression.');if(s?.frontier!==undefined&&!validFrontier(s))throw Error('Invalid Frontier campaign.');if(s?.farm!==undefined&&!validFarm(s))throw Error('Invalid Magic Farm.');if(s?.workshop!==undefined&&!validWorkshop(s))throw Error('Invalid Workshop production.');if(s?.inn!==undefined&&!validInn(s))throw Error('Invalid Inn service.');if(s?.hireCards!==undefined&&!validHireCards(s))throw Error('Invalid Hire Cards.');if(s?.enterprises!==undefined&&!validBusinesses(s))throw Error('Invalid business workforce.');if(s&&!validMuseum(s))throw Error('Invalid Museum collection.');if(s?.version===1){if(!common(s)||!level(s.level,20))throw Error('This is not a compatible village save.');return {...fresh(s.lastAt),gold:s.gold,pending:s.pending,earned:s.earned,upgrades:s.upgrades,fellowXP:0,fellows:{hero_15:newFellow(s.level)}}}if(s?.version===2){if(!validVillage(s))throw Error('This is not a compatible village save.');return upgradeSave({...fresh(s.lastAt),...s,version:4,inventory:fresh().inventory,energy:3,claims:[],stats:{gifts:0,dates:0},school:freshSchool(),fellowXP:0})}if(s?.version===3){if(!validFamily(s))throw Error('This is not a compatible village save.');return upgradeSave({...s,version:4,family:Object.fromEntries(Object.entries(s.family).map(([id,f])=>[id,{...f,relationship:1}])),school:freshSchool(),fellowXP:0})}if(s?.version===4){if(!validV4(s))throw Error('This is not a compatible village save.');return upgradeSave(s)}if(s?.version===5){if(!validV4(s)||!validAdventure(s))throw Error('This is not a compatible village save.');return {...s,version:10,bonds:{},inventory:{...emptyMaterials(),...s.inventory}}}if(s?.version===6){if(!validV4(s)||!validAdventure(s)||!validBonds(s))throw Error('This is not a compatible village save.');return {...s,version:10,inventory:{...emptyMaterials(),...s.inventory}}}if(s?.version===7){if(!validV4(s)||!validAdventure(s)||!validBonds(s))throw Error('This is not a compatible village save.');return {...s,version:10,inventory:{...emptyMaterials(),...s.inventory}}}if(s?.version===8){if(!validV4(s)||!validAdventure(s)||!validBonds(s))throw Error('This is not a compatible village save.');return {...s,version:10,inventory:{...emptyMaterials(),...s.inventory}}}if(s?.version===9){if(!validV4(s)||!validBlessings(s)||!validFamiliars(s)||!validStage(s)||!validAdventure(s)||!validBonds(s))throw Error('This is not a compatible village save.');return {...s,version:10,inventory:{...emptyMaterials(),...s.inventory}}}if(!valid(s))throw Error('This is not a compatible village save.');return s}
export function buildingRate(s,id){const b=s.buildings[id];if(!b?.fellow)return 0;return rate(s.fellows[b.fellow].level)*(1+.2*(b.level-1))*(1+familyBonus(s))*fellowFactor(s.fellows[b.fellow])*bondFactor(s,b.fellow)}
export const totalRate=s=>Object.keys(s.buildings).reduce((n,id)=>n+buildingRate(s,id),0)+s.school.income+enterpriseRate(s)+treasureIncome(s);
export function settle(state,now){if(!valid(state)||!number(now))throw Error('Invalid village state');const elapsed=Math.min(MAX_AWAY_MS,Math.max(0,now-state.lastAt));return settleApothecary(settleWorkshop(settleInn({...state,school:{...state.school,points:Math.min(EDUCATION_CAP,state.school.points+elapsed/EDUCATION_RECOVERY_MS)},energy:Math.min(energyCap(state),state.energy+elapsed/ENERGY_RECOVERY_MS),pending:Math.min(1e9,state.pending+elapsed/1000*totalRate(state)),lastAt:Math.max(now,state.lastAt)},Math.max(now,state.lastAt)),Math.max(now,state.lastAt)),Math.max(now,state.lastAt))}
export function act(state,action,now=Date.now(),target=null,value=null){const result=observeOpening(state,actCore(state,action,now,target,value),action);return action==='date'?discoverDatePicture(result):result}
function actCore(state,action,now=Date.now(),target=null,value=null){
 const s=settle(state,now);const fail=error=>({state:s,error});
 const opening=openingAction(s,action,target,value,totalRate(s));if(opening){if(!opening.error&&!valid(opening.state))return fail("This opening action exceeds a village storage limit.");return opening;}
 const wardrobe=wardrobeAction(s,action,target,value);if(wardrobe)return wardrobe;
 const gallery=familyGalleryAction(s,action,target);if(gallery)return gallery;
 const story=storyAction(s,action,target,value);if(story)return story;
 const tower=towerAction(s,action,target);if(tower)return tower;
 const farm=farmAction(s,action,target,value);if(farm)return farm;
 const workshop=workshopAction(s,action,target,value);if(workshop)return workshop;
 const inn=innAction(s,action,target,value);if(inn)return inn;
 const hiring=hireCardAction(s,action,target,value);if(hiring)return hiring;
 const business=businessAction(s,action,target,value);if(business)return business;
 const stella=stellaAction(s,action,target,value);if(stella)return stella;
 const mine=mineAction(s,action,target,value);if(mine)return mine;
 const north=northernAction(s,action,target,value);if(north)return north;
 const trading=tradingAction(s,action,target,value);if(trading)return trading;
 const event=stageEventAction(s,action,target,value);if(event)return event;
 const tonic=tonicAction(s,action,target,value);if(tonic)return tonic;
 const elixir=elixirAction(s,action,target,value);if(elixir)return elixir;
 const fountain=fountainAction(s,action,target,value);if(fountain)return fountain;
 const banquet=banquetAction(s,action,target,value);if(banquet)return banquet;
 const apothecary=apothecaryAction(s,action,target,value,totalRate(s));if(apothecary)return apothecary;
 const treasure=treasureAction(s,action,target,value);if(treasure)return treasure;
 const museum=museumAction(s,action,target);if(museum)return museum;
 const consumable=consumableAction(s,action,target,value,totalRate(s));if(consumable)return consumable;
 if(action==='graduateAll'){
  const ids=s.school.pupils.filter(p=>p.progress>=requiredLessons(p)).map(p=>p.id);if(!ids.length)return fail('No pupils are ready to graduate.');
  let next=s;for(const id of ids){const result=act(next,'graduate',s.lastAt,id);if('error' in result)return fail(result.error);next=result.state;}
  return {state:next,message:`${ids.length} pupils graduated. Earnings and rewards saved.`};
 }
 const education=educationAction(s,action,target,value,playerRank(s));if(education)return education;
 const specialBlessing=specialBlessingAction(s,action,target,value);if(specialBlessing)return specialBlessing;
 const blessing=blessingAction(s,action,target,value);if(blessing)return blessing;
 const familiar=familiarAction(s,action,target,value);if(familiar)return familiar;
 const stage=stageAction(s,action,target,value);if(stage)return stage;
 const frontier=frontierAction(s,action,target,value);if(frontier)return frontier;
 const expo=expoAction(s,action,target,value);if(expo)return expo;
 const fishing=fishingAction(s,action,target,value);if(fishing)return fishing;
 const insight=insightAction(s,action,target,value);if(insight)return insight;
 const talent=talentAction(s,action,target,value);if(talent)return talent;
 const artifact=artifactAction(s,action,target,value);if(artifact)return artifact;
 const bond=bondAction(s,action,target,value);if(bond)return bond;
 const adventure=adventureAction(s,action==='upgrade'?'train':action,action==='upgrade'?(target||'hero_15'):target,action==='upgrade'?1:value);if(adventure)return adventure;
 if(action==='recruitAll'||action==='welcomeAll'){const isFellow=action==='recruitAll',key=isFellow?'fellows':'family',list=isFellow?FELLOWS:FAMILY,missing=list.filter(f=>!Object.hasOwn(s[key],f.id));if(!missing.length)return fail('Everyone available has already joined.');const added=Object.fromEntries(missing.map(f=>[f.id,isFellow?newFellow():{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}]));return {state:{...s,[key]:{...s[key],...added}},message:`Welcomed ${missing.length} ${isFellow?'Fellows':'family members'}. Existing progress preserved.`}}
 if(action==='relationship'){const f=s.family[target];if(!f)return fail('Welcome this family member first.');if(f.relationship>=5)return fail('Current relationship cap reached.');if(f.intimacy<relationRequired(f.relationship))return fail('Increase Intimacy with gifts first.');return {state:{...s,family:{...s.family,[target]:{...f,relationship:f.relationship+1}}},message:'Relationship improved. Future pupils will have higher Intellect.'}}
 if(action==='enroll'){if(!Object.hasOwn(s.family,target)||!PUPIL_TYPES.some(t=>t.id===value))return fail('Choose a caretaker and pupil type.');if(s.school.pupils.length>=schoolCapacity(s))return fail('Graduate a pupil to make room.');if(s.school.nextId>=1e9)return fail('Enrollment limit reached.');const p={id:s.school.nextId,caretaker:target,type:value,intellect:s.family[target].relationship*10,progress:0,education:0};return {state:{...s,school:{...s.school,nextId:s.school.nextId+1,pupils:[...s.school.pupils,p]}},message:`Pupil ${p.id} enrolled.`}}
 if(action==='educate'){const p=s.school.pupils.find(p=>p.id===target),method=METHODS.find(m=>m.id===value);if(!p||!method)return fail('Choose an enrolled pupil and lesson.');if(p.progress>=requiredLessons(p))return fail('This pupil is ready to graduate.');if(playerRank(s)<method.rank)return fail('Increase your rank to unlock this lesson.');if(s.school.points<1)return fail('Education Points are recovering.');const gain=Math.min(p.grade?1:method.progress,requiredLessons(p)-p.progress),reward=educationReward(s,p,playerRank(s));return {state:{...s,fellowXP:s.fellowXP+reward.credited,school:{...s.school,points:Math.max(0,s.school.points-1),pupils:s.school.pupils.map(x=>x.id===target?{...x,progress:x.progress+gain,education:x.education+gain*playerRank(s)}:x)}},message:`Class completed: +${gain} progress and +${reward.credited} Fellow EXP.`}}
 if(action==='graduate'){const p=s.school.pupils.find(p=>p.id===target);if(!p||p.progress<requiredLessons(p))return fail('Complete this pupil’s education first.');const income=pupilReward(s,p);return {state:{...s,inventory:{...s.inventory,gift1:Math.min(1e6,s.inventory.gift1+1)},school:{...s.school,graduates:s.school.graduates+1,income:Math.min(1e9,s.school.income+income),pupils:s.school.pupils.filter(x=>x.id!==target),alumni:[{id:p.id,caretaker:p.caretaker,income,...(p.name?{name:p.name}:{}),...(p.grade?{grade:p.grade,type:p.type}:{})},...s.school.alumni].slice(0,20)}},message:`Graduated! +${income.toFixed(2)} gold/s and 1 Gold Ring.`}}
 if(action==='refillEducation')return {state:{...s,school:{...s.school,points:EDUCATION_CAP}},message:'Sandbox: Education Points refilled.'};
 if(action==='welcome'){const f=target?FAMILY.find(f=>f.id===target&&!Object.hasOwn(s.family,f.id)):FAMILY.find(f=>!Object.hasOwn(s.family,f.id));if(!f)return fail('All current family members have arrived.');return {state:{...s,family:{...s.family,[f.id]:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}}},message:`${f.name} joined your family!`,welcomed:f.id}}
 if(action==='giftBatch')return giftBatch(s,target,value);
 if(action==='gift'){const f=s.family[target],gift=GIFTS.find(g=>g.id===value);if(!f||!gift)return fail('Choose a family member and a gift.');if(s.inventory[gift.id]<1)return fail('You do not have this gift.');if(f[gift.stat]+gift.amount>1e6)return fail('There is no room for this gift’s full effect.');return {state:{...s,inventory:{...s.inventory,[gift.id]:s.inventory[gift.id]-1},family:{...s.family,[target]:{...f,[gift.stat]:Math.min(1e6,f[gift.stat]+gift.amount)}},stats:{...s.stats,gifts:Math.min(1e9,s.stats.gifts+1)}},message:`Gift given: +${gift.amount} ${gift.stat==='intimacy'?'Intimacy':'Blessing Power'}.`}}
 if(action==='buyGift'){const gift=GIFTS.find(g=>g.id===target);if(!gift)return fail('Unknown gift.');if(s.gold<gift.price)return fail('Collect more gold to buy this gift.');if(s.inventory[gift.id]>=1e6)return fail('Gift storage is full.');return {state:{...s,gold:s.gold-gift.price,inventory:{...s.inventory,[gift.id]:s.inventory[gift.id]+1}},message:`${gift.name} added to your bag.`}}
 if(action==='autoDate'){
  const count=availableDateEnergy(s);if(!Object.keys(s.family).length)return fail('Welcome a family member first.');if(count<1)return fail('Energy is recovering.');
  const rolls=value??Array.from({length:count},()=>Math.random());
  if(!Array.isArray(rolls)||rolls.length!==count||!rolls.every(n=>Number.isFinite(n)&&n>=0&&n<1))return fail('Invalid auto-date selections.');
  const before=Object.values(s.family).reduce((sum,f)=>sum+f.points,0);let next=s;
  for(const roll of rolls){const result=act(next,'date',s.lastAt,null,roll);if('error' in result)return fail(result.error);next=result.state;}
  const gained=Object.values(next.family).reduce((sum,f)=>sum+f.points,0)-before;
  return {state:next,message:`${count} dates completed: +${gained.toLocaleString()} Blessing Points.`};
 }
 if(action==='date'){const ids=FAMILY.filter(f=>s.family[f.id]).map(f=>f.id);if(!ids.length)return fail('Welcome a family member first.');if(availableDateEnergy(s)<1)return fail('Energy is recovering.');const roll=value??Math.random();if(!Number.isFinite(roll)||roll<0||roll>=1)return fail('Invalid date selection.');const id=ids[Math.floor(roll*ids.length)],f=s.family[id],points=dateReward(s,id).credited;return {state:{...spendDateEnergy(s),family:{...s.family,[id]:{...f,points:Math.min(1e9,f.points+points)}},stats:{...s.stats,dates:Math.min(1e9,s.stats.dates+1)}},message:`Time with ${FAMILY.find(f=>f.id===id).name}: +${points} Blessing Points.`,welcomed:id}}
 if(action==='bless'){const f=s.family[target];if(!f)return fail('Welcome this family member first.');if(f.skill>=20)return fail('This skill is fully upgraded.');const price=blessingCost(f);if(f.points<price)return fail('Go on more dates to earn Blessing Points.');return {state:{...s,family:{...s.family,[target]:{...f,points:f.points-price,skill:f.skill+1}}},message:'Family skill improved: +1% village earnings.'}}
 if(action==='claim'){const m=MILESTONES.find(m=>m.id===target);if(!m||s.claims.includes(m.id))return fail('This reward is not available.');if(m.metric(s)<m.goal)return fail('Finish this milestone first.');const inventory={...s.inventory};for(const gift of GIFTS)inventory[gift.id]=Math.min(1e6,inventory[gift.id]+(m.reward[gift.id]||0));return {state:{...s,gold:Math.min(1e12,s.gold+m.reward.gold),inventory,claims:[...s.claims,m.id]},message:`Milestone complete: +${m.xp} Rank EXP and rewards.`}}
 if(action==='sandboxSupplies'){const inventory=Object.fromEntries(GIFTS.map(g=>[g.id,Math.min(1e6,s.inventory[g.id]+10)]));return {state:{...s,inventory:{...s.inventory,...inventory},energy:energyCap(s)},message:'Sandbox: added 10 of each gift and refilled Energy.'}}
 if(action==='collect'){const amount=Math.min(Math.floor(s.pending),Math.max(0,1e12-s.gold));return {state:{...s,gold:s.gold+amount,pending:s.pending-amount,earned:Math.min(Number.MAX_SAFE_INTEGER,s.earned+amount)},amount,message:`${amount} gold collected`}}
 if(action==='recruit'){const f=target?FELLOWS.find(f=>f.id===target&&!Object.hasOwn(s.fellows,f.id)):FELLOWS.find(f=>!Object.hasOwn(s.fellows,f.id));if(!f)return fail('All current Fellows have joined your village.');return {state:{...s,fellows:{...s.fellows,[f.id]:newFellow()}},message:`${f.name} joined your village!`,recruited:f.id}}
 if(action==='unlock'){const b=BUILDINGS.find(b=>b.id===target);if(!b)return fail('Unknown building.');if(s.buildings[target])return fail('This business is already open.');if(s.gold<b.price)return fail('Collect a little more gold first.');return {state:{...s,gold:s.gold-b.price,buildings:{...s.buildings,[target]:{level:1,fellow:null}}},message:`${b.name} is open. Assign a Fellow to start earning.`}}
 if(action==='buildingUpgrade'){const b=s.buildings[target];if(!b)return fail('Open this business first.');if(b.level>=MAX_BUILDING_LEVEL)return fail('This business is fully upgraded.');const price=buildingCost(b.level);if(s.gold<price)return fail('Collect a little more gold first.');return {state:{...s,gold:s.gold-price,buildings:{...s.buildings,[target]:{...b,level:b.level+1}}},message:'Business upgraded — earnings increased.'}}
 if(action==='assign'){if(!s.buildings[target])return fail('Open this business first.');if(value!==null&&!Object.hasOwn(s.fellows,value))return fail('Recruit this Fellow first.');const buildings=Object.fromEntries(Object.entries(s.buildings).map(([id,b])=>[id,{...b,fellow:id===target?value:value&&b.fellow===value?null:b.fellow}]));const enterprises=s.enterprises?Object.fromEntries(Object.entries(s.enterprises).map(([id,b])=>[id,{...b,fellows:b.fellows.filter(f=>f!==value)}])):undefined;return {state:{...s,buildings,...(enterprises?{enterprises}:{})},message:value?`${fellowById(value).name} assigned to this business.`:'Assignment cleared.'}}
 throw Error('Unknown action');
}
