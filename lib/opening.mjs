import {MAX_FELLOW_XP,MAX_GOLD} from './limits.mjs';
import {addStaff,employeeCap} from './businesses.mjs';
import {artifactAction,artifactRule,artifactState} from './artifacts.mjs';
import {sourceTraining} from './training-costs.mjs';
import data from './opening-data.json' with {type:'json'};
import ladder from './rank-ladder-data.json' with {type:'json'};
import campaign from './campaign-chapters-data.json' with {type:'json'};
import {bondedPower,newFellow,fellowCap,adventureAction,FRESH_FOUNTAIN} from './adventure.mjs';
import {originalProgression} from './original-progression.mjs';
import {freshInn} from './inn.mjs';
import {recipeKnown} from './medicine-discovery.mjs';
import {FELLOWS,FAMILY} from './catalog.mjs';
export const OPENING=data;
// Chapters 1-6 are the opening journey; chapters 7-150 continue the original's own stage ladder
// (scripts/import-campaign-chapters.py). Their roadside events are deferred -- see that script.
// The data file is compact (format 2: tuples in stage order, with _id, stageId and the gold item id
// derived from position); this rebuilds the exact row objects, keys in the same order, that the
// script round-trips and that lib/opening-data.json rows use.
export function decodeCampaign(d){
 if(d.format!==2)throw Error('Unknown campaign data format '+d.format);
 const battles=[],bosses=[],backgrounds={},place=(c,i)=>d.firstStageId+(c-d.firstChapter)*21+i;
 for(let c=d.firstChapter;c<=d.lastChapter;c++){const k=c-d.firstChapter;
  d.battles.slice(k*20,(k+1)*20).forEach((t,i)=>{const r={_id:`${c}-${(i>>2)+1}-${i%4+1}`,timelineNameType:t[0],mushRoomType:t[1],atk:t[2],consume:[{id:'3',count:t[3]}],stageId:place(c,i),item1:t[4],item5:t[5]};if(t.length>6)r.sourceEventId=t[6];battles.push(r)});
  const b=d.bosses[k],items=[];for(let j=0;j<b[2].length;j+=2)items.push({id:d.itemIds[b[2][j]],count:b[2][j+1]});
  bosses.push({_id:`${c}-6-0`,atk:b[0],inspireConsumeBase:[{id:'3',count:b[1]}],stageId:place(c,20),items});
  const source=d.backgrounds[k];backgrounds[String(c)]={source,shown:d.backgroundArt[source]};}
 return {firstChapter:d.firstChapter,lastChapter:d.lastChapter,battles,bosses,backgrounds,provenance:d.provenance};
}
export const CAMPAIGN=decodeCampaign(campaign);
/** Local rule. Stage clears pay 3x their source Fellow EXP (normal BattleNormal item1 and boss item '1').
 *  Measured in the 21-day earned simulation with 3,000 chapters and 10 breakthrough materials a day:
 *  x1 APK 710M/s, default 58M/s; x3 719M / 72M; x10 796M. The player reaches about stage 10,056
 *  (chapter ~480) by day 21, so the campaign is not exhausted. It replaced an idle per-minute EXP rate
 *  the owner preferred to keep manual. The original's EXP tuning for this economy is not in the tables. */
export const STAGE_EXP_MULTIPLIER=3;
export const OPENING_STAGES=[...data.battles,...CAMPAIGN.battles].map(x=>({...x,boss:false})).concat([...data.bosses,...CAMPAIGN.bosses].map(x=>({...x,boss:true}))).sort((a,b)=>a.stageId-b.stageId);
export const LAST_CHAPTER=CAMPAIGN.lastChapter;
// The player-rank ladder, ranks 1-28, is the original's Level.json (scripts/import-rank-ladder.py):
// promoting out of rank r costs ranks[r-1].fameToNext Fame once village earnings reach
// ranks[r-1].earningsToNext per second. Rank 28 is where the last rank-up Fellow arrives.
// Rank 5 used to carry a local 108-Fame override because the 126 opening encounters supply only ~294
// Fame. Roaming and completed habits now pay Fame too (lib/rank-fame.mjs), so every cost is the
// original's again.
export const RANK_LADDER=ladder;
export const MAX_RANK=ladder.maxRank;
/** The rank-up Fellows: encounter id, the rank that unlocks it, and the Fellow it brings. */
export const RANK_ENCOUNTERS=ladder.encounters;
/** Fame charged to promote OUT of `rank`, or undefined at the top of the ladder. */
export const rankCost=rank=>ladder.ranks[rank-1]?.fameToNext;
/** Village earnings per second required to promote out of `rank`. */
export const rankEarnings=rank=>ladder.ranks[rank-1]?.earningsToNext;
const tasks=new Map(data.tasks.map(x=>[x._id,x])),rewards=new Map(data.rewards.map(x=>[x._id,x])),items=new Map(data.items.map(x=>[x._id,x]));
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),int=(x,max=1e9)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const unique=(x,allowed)=>Array.isArray(x)&&new Set(x).size===x.length&&x.every(v=>allowed.includes(v));
export const freshOpening=()=>({version:1,cleared:0,rank:1,fame:0,claimed:0,collections:0,education:0,fathoms:0,reforges:0,upgrades:0,locker:{},events:[],eventClaims:[],city:[],familyBranch:null,operations:{},stars:{}});
export function validOpening(s){
 if(s?.opening===undefined)return true;const o=s.opening;if(!obj(o)||o.version!==1||!int(o.cleared,OPENING_STAGES.length)||!int(o.rank,MAX_RANK)||o.rank<1||!int(o.claimed,136)||!['fame','collections','education','fathoms','reforges','upgrades'].every(k=>int(o[k])))return false;
 if(!obj(o.locker)||!Object.entries(o.locker).every(([k,v])=>items.has(k)&&!Object.hasOwn(s.inventory||{},k)&&!['1','3','4','5'].includes(k)&&int(v,1e6)))return false;
 const e=data.stageEvents.map(x=>x._id);if(!unique(o.events,e)||!unique(o.eventClaims,e)||o.events.some(x=>o.eventClaims.includes(x))||[...o.events,...o.eventClaims].some(id=>!OPENING_STAGES.some(t=>t.stageEventId===id&&t.stageId<=o.cleared)))return false;
 if(!unique(o.city,RANK_ENCOUNTERS.map(e=>e.id))||o.city.some(id=>RANK_ENCOUNTERS.find(e=>e.id===id).rank>o.rank)||![null,'B3','C1'].includes(o.familyBranch)||(o.familyBranch!==null&&o.cleared<42))return false;
 return obj(o.operations)&&Object.entries(o.operations).every(([id,n])=>Object.hasOwn(s.fellows,id)&&int(n,3))&&obj(o.stars)&&Object.entries(o.stars).every(([id,n])=>Object.hasOwn(s.enterprises||{},id)&&int(n,20));
}
export const openingPower=s=>Math.floor(Object.keys(s.fellows).reduce((n,id)=>n+bondedPower(s,id),0)*(originalProgression(s)?1:100));
export const openingProsperity=(s,income)=>Math.floor(income+100*Object.values(s.opening?.stars||{}).reduce((a,b)=>a+b,0));
export const openingTask=s=>data.tasks[s.opening?.claimed||0]||null;
export const openingItemCount=(s,id)=>Object.hasOwn(s.inventory,id)?s.inventory[id]:(s.opening?.locker[id]||0);
export const openingBossReady=(stage,power)=>!!stage&&Number.isFinite(power)&&power>stage.atk;
export function openingQuote(stage,power){if(!stage||!Number.isFinite(power)||power<=0)return null;if(stage.boss)return 0;const a=BigInt(stage.atk)*10000n**4n,p=BigInt(Math.floor(power));let lo=0n,hi=1n;while(hi**4n*p<=a)hi*=2n;while(hi-lo>1n){const mid=(lo+hi)/2n;if(mid**4n*p<=a)lo=mid;else hi=mid;}return Number(lo*BigInt(stage.consume[0].count)/10000n);}
export function openingRequirement(s,t=openingTask(s)){
 if(!t)return {current:0,goal:0,ready:false,destination:'adventure',label:'Six-chapter quest prefix complete'};
 const r=t.taskReq,o=s.opening||freshOpening(),fs=Object.values(s.fellows),es=Object.values(s.enterprises||{});let current=0,goal=r.count||1,destination='adventure',label=r.type;
 switch(r.type){
 case 'CollectBuildingMoneyCount':current=o.collections;label='Collect village Gold';destination='village';break;
 case 'BuildingUnlock':current=+(!!s.enterprises?.[r.id]);label=`Open ${r.id}`;destination='businesses';break;
 case 'BuildingLvup':current=s.enterprises?.[r.id]?.employees||0;label=`Staff ${r.id}`;destination='businesses';break;
 case 'BuildingLvupCount':current=s.buildings.fish?.level||1;label='Bank tier (Fish Stall level)';destination='businesses';break;
 case 'BuildingStar':case 'BuildingTotalStar':current=Object.values(o.stars).reduce((a,b)=>a+b,0);label='Opening business stars';destination='opening-workshop';break;
 case 'BuildingDispatch':current=new Set([...es.flatMap(b=>b.fellows),...Object.values(s.buildings).map(b=>b.fellow).filter(Boolean)]).size;label='Assign Fellows to businesses';destination='businesses';break;
 case 'AppointLvupCount':current=Object.values(o.operations).reduce((a,b)=>a+b,0);label='Paid operation training';destination='opening-workshop';break;
 case 'HeroLvupMulti':current=fs.filter(f=>f.level>=r.count).length;goal=r.num;label=`Fellows at level ${r.count}`;destination='fellows';break;
 case 'HeroTotalLv':current=fs.reduce((n,f)=>n+f.level,0);label='Combined Fellow levels';destination='fellows';break;
 case 'PlayerLvUpNum':current=o.rank;label='Opening rank';destination='opening-rank';break;
 case 'StageClear':current=o.cleared;goal=OPENING_STAGES.find(x=>x._id===r.id)?.stageId||127;label=`Clear encounter ${r.id}`;break;
 case 'SimGame1RecipeUnlockSpecify':current=+(!!s.inn?.menu.includes(r.id));label=`Learn Inn recipe ${r.id}`;destination='opening-workshop';break;
 case 'MedicineUnlock':current=+recipeKnown(s,r.id);label=`Discover Medicine ${r.id} (local recipe access)`;destination='apothecary';break;
 case 'WifeCount':current=Object.keys(s.family).length;label='Welcome Family';destination='opening-rank';break;
 case 'WifeGift':current=s.stats.gifts;label='Give Family gifts';destination='family';break;
 case 'WifeDate':current=s.stats.dates;label='Go on dates';destination='family';break;
 case 'WifeQuench':current=o.fathoms;label='Fathoms practice (local)';destination='opening-workshop';break;
 case 'ChildGain':current=s.school.nextId-1;label='Adopt / enroll a pupil';destination='school';break;
 case 'ChildEducation':current=o.education;label='Lesson progress since opening enrollment';destination='school';break;
 case 'EquipCount':current=(s.inventory.Item_Weapon_Equipment_1_1||0)+fs.filter(f=>f.gear).length;label='Own an artifact';destination='fellows';break;
 case 'EquipHeroMulti':current=fs.filter(f=>f.gear).length;label='Equip a Fellow';destination='fellows';break;
 case 'EquipLvup':current=Math.max(o.upgrades,fs.reduce((n,f)=>n+Math.max(0,(f.gearLevel||1)-1),0));label='Upgrade an artifact';destination='opening-workshop';break;
 case 'EquipQuench':current=o.reforges;label='Reforge an equipped artifact (local)';destination='opening-workshop';break;
 default:return {current:0,goal:1,ready:false,destination:'adventure',label:'Unmapped requirement: '+r.type};
 }return {current,goal,ready:current>=goal,destination,label};
}
export const openingReward=id=>rewards.get(id)?.content||[];
// D2 Explore / Full-Auto / Auto Handle. Every number here is read from configs/config/logic/System.json;
// none is invented. The parity row used to say "Auto Handle unlocks at chapter 50 or with a monthly
// pass", which conflated THREE separate gates that the table keeps apart:
//   StageBattleAutoLimitChapter 2 + StageBattleAutoLimitPlayerLevel 4   -- Full-Auto (this feature)
//   StageBattleOneKeyLimitChapter 20 + StageBattleOneKeyLimitVIP 5      -- stage Auto Handle
//   StageBattleEventOneKeyLimitChapter 50 + ...Level 30                 -- ROADSIDE-EVENT Auto Handle
// Chapter 50 is the event one-key gate, not Full-Auto's. StageBattleAutoSpeed is 1.7 seconds a stage.
export const AUTO_CHAPTER=2,AUTO_RANK=4,AUTO_SPEED_S=1.7;
export const ONEKEY_CHAPTER=20,ONEKEY_VIP=5,EVENT_ONEKEY_CHAPTER=50,EVENT_ONEKEY_RANK=30;
/** StageBattleEventLimit: the roadside-encounter queue holds 25, rising to 100 at player level 35.
 *  This is the original's own "the event list is full" stop condition. It is applied as an auto STOP,
 *  never as a save bound -- an existing save that already holds more than 25 queued events stays
 *  valid and is simply not topped up, so no real save is invalidated. */
export const EVENT_LIMIT=[{rank:1,count:25},{rank:35,count:100}];
export const eventLimit=rank=>EVENT_LIMIT.reduce((n,x)=>rank>=x.rank?x.count:n,EVENT_LIMIT[0].count);
export const openingChapter=s=>{const st=OPENING_STAGES[s.opening?.cleared||0];return st?Number(st._id.split('-')[0]):LAST_CHAPTER};
/** '' when Full-Auto is available, otherwise the reason it is not. */
export function openingAutoGate(s){
 if(!s.opening)return 'Begin the opening journey first.';
 if(openingChapter(s)<AUTO_CHAPTER)return `Full-Auto opens in chapter ${AUTO_CHAPTER}.`;
 if(s.opening.rank<AUTO_RANK)return `Full-Auto opens at rank ${AUTO_RANK}.`;
 return '';
}
function changeItem(s,id,amount){
 const o=s.opening;let owner,key,max;
 if(id==='1'){owner=s;key='fellowXP';max=MAX_FELLOW_XP}else if(id==='3'){owner=s;key='gold';max=MAX_GOLD}else if(id==='4'){owner=s;key='crystals';max=1e9}else if(id==='5'){owner=o;key='fame';max=1e9}else {owner=Object.hasOwn(s.inventory,id)?s.inventory:o.locker;key=id;max=1e6;}
 const n=(owner[key]||0)+amount;if(!int(n,max))throw Error(amount<0?'Not enough '+openingItemName(id)+'.':'Make room for '+openingItemName(id)+' before claiming.');owner[key]=n;
}
function give(s,list){for(const x of list){if(!items.has(x.id)||!int(x.count)||x.count<1)throw Error('This reward needs a supported item definition.');changeItem(s,x.id,x.count)}}
/** One stage clear, applied to `n` in place. Shared by openingBattle and openingAuto so Full-Auto can
 *  never pay differently from a tap -- the same reason the Little Helper replays act() (lib/helper.mjs).
 *  Power is passed in because battles bank Fellow EXP rather than levelling, so it is constant across
 *  a run; recomputing it per stage would be the same number at 63,000x the cost. */
function stageStep(n,st,power){
 const cost=openingQuote(st,power);
 if(cost===null)throw Error('Train a Fellow first.');
 if(st.boss&&!openingBossReady(st,power))throw Error('Boss requires Power strictly above '+st.atk+'.');
 changeItem(n,'3',-cost);
 give(n,st.boss?st.items.map(x=>x.id==='1'?{...x,count:x.count*STAGE_EXP_MULTIPLIER}:x):[{id:'1',count:st.item1*STAGE_EXP_MULTIPLIER},{id:'5',count:st.item5}]);
 n.opening.cleared++;if(st.stageEventId)n.opening.events.push(st.stageEventId);
}
export function openingItemName(id){return ({'1':'Fellow EXP','3':'Gold','4':'Crystals','5':'Fame','Item_Token_Gacha_Universal':'Fairy Bottle','Item_HeroManagerment_Building':'Operation manual','Item_StarUp_Building_1_1':'Business star material','Item_LvUp_Bank':'Bank upgrade material','Item_Strengthen_Equipment_1':'Artifact upgrade material','Item_Quenching_Equipment_1':'Artifact reforge material','Item_Weapon_Equipment_1_1':'Goblin Club'})[id]||id.replace(/^Item_/,'').replaceAll('_',' ')}
export function openingAction(s,action,target,value,income){
 if(!action.startsWith('opening'))return null;const fail=error=>({state:s,error});
 if(action==='openingStart'){if(s.opening)return fail('The opening journey is already underway.');return {state:{...s,opening:freshOpening()},message:'Opening journey begun. Existing progress retained; no wallet or roster grant.'}}
 if(!s.opening)return fail('Begin the opening journey first.');const n=structuredClone(s),o=n.opening;
 try{
 switch(action){
 case 'openingBattle':{const st=OPENING_STAGES[o.cleared];if(!st||st._id!==target)throw Error('Choose the next encounter.');stageStep(n,st,openingPower(s));break;}
 // Full-Auto. The original's auto is a 1.7s-per-stage timer; offline single-player has no server tick
 // to run it against, so it is adapted as one batch whose length is the original's OWN stop condition,
 // the StageBattleEventLimit queue size (25, or 100 from rank 35). It grants nothing a tap would not:
 // every stage goes through the same stageStep, so it cannot become a faucet.
 case 'openingAuto':{
  const gate=openingAutoGate(s);if(gate)throw Error(gate);
  const power=openingPower(s),cap=eventLimit(o.rank);let run=n,ran=0,stop='Auto run complete.';
  while(ran<cap){
   const st=OPENING_STAGES[run.opening.cleared];
   if(!st){stop='Every chapter is cleared.';break}
   if(run.opening.events.length>=cap){stop=`Roadside encounter list is full (${cap}). Resolve them in Explore.`;break}
   // Each stage is applied to a copy and kept only if it completes, so a run that stops halfway can
   // never leave a stage half-paid -- the gold is spent before the rewards are granted.
   const next=structuredClone(run);
   try{stageStep(next,st,power)}catch(e){stop=e.message;break}
   run=next;ran++;
  }
  if(!ran)return fail(stop);
  if(!validOpening(run))return fail('Opening storage limit reached.');
  return {state:run,ran,stop,message:`Full-Auto cleared ${ran} stage${ran===1?'':'s'}. ${stop}`};
 }
 case 'openingClaim':{const t=openingTask(s);if(!t||t._id!==target||!openingRequirement(s,t).ready)throw Error('Complete the current quest first.');give(n,openingReward(t.taskReward));o.claimed++;break;}
 case 'openingPromote':{if(o.rank>=MAX_RANK)throw Error('The rank ladder is complete.');if(openingProsperity(s,income)<rankEarnings(o.rank))throw Error('Grow village earnings first.');changeItem(n,'5',-rankCost(o.rank));o.rank++;break;}
 case 'openingRecruit':{const e=RANK_ENCOUNTERS.find(x=>x.id===target);if(!e||o.rank<e.rank||o.city.includes(target))throw Error('That earned encounter is not available.');const id=e.fellow;if(!FELLOWS.some(x=>x.id===id))throw Error('Missing Fellow identity.');n.fellows[id]??=newFellow();o.city.push(target);return {state:n,message:'Earned encounter completed. Existing Fellow training preserved.',recruited:id};}
 // C1's reward is Item_Owner_Wife_6 (Will), who Everkai does not ship; Epona (wife_3) stands in for the
 // alternate branch. B3 is Gina (wife_1), as in the original.
 case 'openingFamily':{if(o.cleared<42||o.familyBranch||!['B3','C1'].includes(target))throw Error('Choose the first Family encounter after Chapter 2.');const already=['wife_1','wife_3'].find(id=>n.family[id]);const id=already||('wife_'+(target==='B3'?'1':'3'));if(!FAMILY.some(x=>x.id===id))throw Error('Missing Family identity.');n.family[id]??={intimacy:0,blessingPower:10,points:0,skill:0,relationship:1};o.familyBranch=already?(already==='wife_1'?'B3':'C1'):target;return {state:n,message:'Family encounter completed; the alternate branch is closed.',welcomed:id};}
 case 'openingEvent':{const e=data.stageEvents.find(x=>x._id===target);if(!e||!o.events.includes(target))throw Error('That event has already been resolved or is not queued.');if(e.eventType==='appoint'&&(!n.fellows.hero_1||value!=='hero_1'))throw Error('Assign Fifi to this encounter.');if(e.eventType==='choose'&&![1,2].includes(value))throw Error('Choose option 1 or 2.');give(n,openingReward(e.eventType==='choose'?e['choose'+value+'Reward']:e.reward));o.events=o.events.filter(x=>x!==target);o.eventClaims.push(target);break;}
 case 'openingBuild':{const row=data.buildingBases.find(x=>x._id===target);if(!row||n.enterprises?.[target])throw Error('Choose an unopened opening business.');if((target==='Building_301'&&o.cleared<21)||(target==='Building_401'&&o.cleared<126))throw Error('Clear the chapter land gate first.');for(const c of row.consume)changeItem(n,c.id,-c.count);n.enterprises??={};n.enterprises[target]={employees:0,fellows:[]};break;}
 case 'openingTrain':{if(sourceTraining(s))return adventureAction(s,'train',target,1);const f=n.fellows[target];if(!f)throw Error('Choose an owned Fellow.');const row=data.heroTrainingLevels.find(x=>+x._id===f.level);if(!row||f.level>=Math.min(80,fellowCap(f,s,target)))throw Error('Use the existing training destination beyond this opening limit.');for(const c of row.consume)changeItem(n,c.id,-c.count);f.level++;break;}
 case 'openingOperation':{if(!n.fellows[target])throw Error('Choose an owned Fellow.');const level=o.operations[target]||0,row=data.firstOperationSkillLevels[level];if(!row)throw Error('The three recovered opening operation steps are complete.');for(const c of row.consume)changeItem(n,c.id,-c.count);o.operations[target]=level+1;break;}
 case 'openingStar':{if(!n.enterprises?.[target]||(o.stars[target]||0)>=20)throw Error('Choose a business below20 opening stars.');changeItem(n,'Item_StarUp_Building_1_1',-1);o.stars[target]=(o.stars[target]||0)+1;break;}
 case 'openingRecipe':{const row=data.innRecipes.find(x=>x._id===target);if(!row||!n.enterprises?.Building_101||(n.enterprises.Building_101.employees<row.unlockCondition.count)||(row.preFood&&!n.inn?.menu.includes(row.preFood))||n.inn?.menu.includes(target))throw Error('Meet the Inn staff and previous recipe requirements first.');n.inn??=freshInn();n.inn.menu.push(target);break;}
 case 'openingFathoms':{const f=n.family[target];if(!f||f.points<10||f.intimacy>=1e6)throw Error('Choose Family with10 Blessing Points and room for Intimacy.');f.points-=10;f.intimacy++;o.fathoms++;break;}
 case 'openingArtifactUpgrade':{const f=n.fellows[target],rule=artifactRule(f?.gear);if(!rule||(f.gearLevel||1)>=20)throw Error('Equip a supported artifact below level20 first.');changeItem(n,'Item_Strengthen_Equipment_1',-1);const a=artifactState(n),r=artifactAction({...n,artifacts:{...a,ore:a.ore+rule.ore}},'upgradeArtifact',target);if(r.error)throw Error(r.error);r.state.opening.upgrades++;return r;}
 case 'openingReforge':{const f=n.fellows[target];if(!f?.gear||f.aptitude>=1000)throw Error('Choose an equipped Fellow below the Aptitude cap.');changeItem(n,'Item_Quenching_Equipment_1',-1);f.aptitude++;o.reforges++;break;}
 case 'openingUse':{const row=items.get(target);if(!row)throw Error('Choose an opening item.');changeItem(n,target,-1);
 if(target==='Item_LvUp_Bank'){if(n.buildings.fish.level>=10)throw Error('Bank tier is capped.');n.buildings.fish.level++;n.upgrades++;}
 else if(target==='Item_Gcoin_YieldPack_1')changeItem(n,'3',Math.floor(income*60));
 else if(target==='Item_Building_Recruit_Increase_1'){const b=n.enterprises?.[value];if(!b||b.employees>=employeeCap)throw Error(`Choose an open business with room below ${employeeCap} staff.`);n.enterprises[value]=addStaff(n,value,b,1);}
 // Item_Token_Gacha_Universal IS the Fairy Bottle (lib/fountain-apk-data.json currency.bottle), the
 // Fountain of Wishes currency. It was once spent here as "the next unowned Fellow in catalog order",
 // which is not what the item does in the original. Using it pours the WHOLE stack into the Fountain
 // one for one; the -1 above is part of that stack, so it is added back before the move.
 else if(target==='Item_Token_Gacha_Universal'){const stack=(n.inventory[target]??n.opening.locker[target]??0)+1,f=n.fountain||FRESH_FOUNTAIN,moved=Math.min(stack,1e6-f.bottles);if(moved<1)throw Error('The Fountain is full of Fairy Bottles. Make a wish first.');changeItem(n,target,1-moved);n.fountain={...f,bottles:f.bottles+moved};return {state:n,message:`${moved.toLocaleString()} Fairy Bottle${moved===1?'':'s'} taken to the Fountain of Wishes.`};}
 else if(row.useEffect==='addAtk'){if(!n.fellows[value])throw Error('Choose a Fellow.');const f=n.fellows[value];const gain=row.useParam.count/100; if(f.aptitude+gain>1000)throw Error('Aptitude cap reached.');f.aptitude+=gain;}
 else if(target==='Item_HeroEXP_Resources_1')changeItem(n,'1',1000);
 else if(target==='Item_GetDE_10'){const f=n.family[value];if(!f||f.points+100>1e9)throw Error('Choose Family with room for Blessing Points.');f.points+=100;}
 else if(target==='Item_Box_Talent_1'||target.startsWith('Item_Hero_Talent_Country_')){const f=n.fellows[value];if(!f||f.aptitude>=1000)throw Error('Choose a Fellow below the Aptitude cap.');f.aptitude++;}
 else throw Error('This item is safely retained; its use is not available in this opening slice.');break;}
 default:return fail('Unknown opening action.');
 }
 if(!validOpening(n))throw Error('Opening storage limit reached.');return {state:n,message:'Opening progress saved.'};
 }catch(e){return fail(e.message)}
}
// Track actual admitted actions, not passive settlement. Nested batch actions already carry their counters.
export function observeOpening(before,result,action){
 if(!before.opening||result.error||!result.state.opening)return result;const s=result.state,o=s.opening;let collections=o.collections,education=o.education;
 if(action==='collect'&&result.amount>0)collections=Math.min(1e9,collections+1);
 if(['educate','educateAllRound','educateBatch','educateToMilestone','finishSchool'].includes(action)&&o.education===before.opening.education){const delta=s.school.pupils.reduce((n,p)=>n+Math.max(0,p.progress-(before.school.pupils.find(q=>q.id===p.id)?.progress||0)),0);education=Math.min(1e9,education+delta);}
 return collections===o.collections&&education===o.education?result:{...result,state:{...s,opening:{...o,collections,education}}};
}
