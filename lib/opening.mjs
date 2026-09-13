import {addStaff,employeeCap} from './businesses.mjs';
import {artifactAction,artifactRule,artifactState} from './artifacts.mjs';
import {sourceTraining} from './training-costs.mjs';
import data from './opening-data.json' with {type:'json'};
import {bondedPower,newFellow,fellowCap,adventureAction} from './adventure.mjs';
import {originalProgression} from './original-progression.mjs';
import {freshInn} from './inn.mjs';
import {recipeKnown} from './medicine-discovery.mjs';
import {FELLOWS,FAMILY} from './catalog.mjs';
export const OPENING=data;
export const OPENING_STAGES=[...data.battles.map(x=>({...x,boss:false})),...data.bosses.map(x=>({...x,boss:true}))].sort((a,b)=>a.stageId-b.stageId);
const tasks=new Map(data.tasks.map(x=>[x._id,x])),rewards=new Map(data.rewards.map(x=>[x._id,x])),items=new Map(data.items.map(x=>[x._id,x]));
const obj=x=>x&&typeof x==='object'&&!Array.isArray(x),int=(x,max=1e9)=>Number.isSafeInteger(x)&&x>=0&&x<=max;
const unique=(x,allowed)=>Array.isArray(x)&&new Set(x).size===x.length&&x.every(v=>allowed.includes(v));
export const freshOpening=()=>({version:1,cleared:0,rank:1,fame:0,claimed:0,collections:0,education:0,fathoms:0,reforges:0,upgrades:0,locker:{},events:[],eventClaims:[],city:[],familyBranch:null,operations:{},stars:{}});
export function validOpening(s){
 if(s?.opening===undefined)return true;const o=s.opening;if(!obj(o)||o.version!==1||!int(o.cleared,126)||!int(o.rank,5)||o.rank<1||!int(o.claimed,136)||!['fame','collections','education','fathoms','reforges','upgrades'].every(k=>int(o[k])))return false;
 if(!obj(o.locker)||!Object.entries(o.locker).every(([k,v])=>items.has(k)&&!Object.hasOwn(s.inventory||{},k)&&!['1','3','4','5'].includes(k)&&int(v,1e6)))return false;
 const e=data.stageEvents.map(x=>x._id);if(!unique(o.events,e)||!unique(o.eventClaims,e)||o.events.some(x=>o.eventClaims.includes(x))||[...o.events,...o.eventClaims].some(id=>!OPENING_STAGES.some(t=>t.stageEventId===id&&t.stageId<=o.cleared)))return false;
 if(!unique(o.city,['B2','B4','A2','B5'])||o.city.some(id=>data.cityEncounters.find(e=>e._id===id).condition.count>o.rank)||![null,'B3','C1'].includes(o.familyBranch)||(o.familyBranch!==null&&o.cleared<42))return false;
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
function changeItem(s,id,amount){
 const o=s.opening;let owner,key,max;
 if(id==='1'){owner=s;key='fellowXP';max=1e9}else if(id==='3'){owner=s;key='gold';max=1e12}else if(id==='4'){owner=s;key='crystals';max=1e9}else if(id==='5'){owner=o;key='fame';max=1e9}else {owner=Object.hasOwn(s.inventory,id)?s.inventory:o.locker;key=id;max=1e6;}
 const n=(owner[key]||0)+amount;if(!int(n,max))throw Error(amount<0?'Not enough '+openingItemName(id)+'.':'Make room for '+openingItemName(id)+' before claiming.');owner[key]=n;
}
function give(s,list){for(const x of list){if(!items.has(x.id)||!int(x.count)||x.count<1)throw Error('This reward needs a supported item definition.');changeItem(s,x.id,x.count)}}
export function openingItemName(id){return ({'1':'Fellow EXP','3':'Gold','4':'Crystals','5':'Fame','Item_Token_Gacha_Universal':'Earned recruitment token','Item_HeroManagerment_Building':'Operation manual','Item_StarUp_Building_1_1':'Business star material','Item_LvUp_Bank':'Bank upgrade material','Item_Strengthen_Equipment_1':'Artifact upgrade material','Item_Quenching_Equipment_1':'Artifact reforge material','Item_Weapon_Equipment_1_1':'Goblin Club'})[id]||id.replace(/^Item_/,'').replaceAll('_',' ')}
export function openingAction(s,action,target,value,income){
 if(!action.startsWith('opening'))return null;const fail=error=>({state:s,error});
 if(action==='openingStart'){if(s.opening)return fail('The opening journey is already underway.');return {state:{...s,opening:freshOpening()},message:'Opening journey begun. Existing progress retained; no wallet or roster grant.'}}
 if(!s.opening)return fail('Begin the opening journey first.');const n=structuredClone(s),o=n.opening;
 try{
 switch(action){
 case 'openingBattle':{const st=OPENING_STAGES[o.cleared];if(!st||st._id!==target)throw Error('Choose the next encounter.');const power=openingPower(s),cost=openingQuote(st,power);if(cost===null)throw Error('Train a Fellow first.');if(st.boss&&!openingBossReady(st,power))throw Error('Boss requires Power strictly above '+st.atk+'.');changeItem(n,'3',-cost);give(n,st.boss?st.items:[{id:'1',count:st.item1},{id:'5',count:st.item5}]);o.cleared++;if(st.stageEventId)o.events.push(st.stageEventId);break;}
 case 'openingClaim':{const t=openingTask(s);if(!t||t._id!==target||!openingRequirement(s,t).ready)throw Error('Complete the current quest first.');give(n,openingReward(t.taskReward));o.claimed++;break;}
 case 'openingPromote':{const r=data.ranks[o.rank-1];if(o.rank>=5)throw Error('The opening rank journey is complete.');if(openingProsperity(s,income)<r.prosperityNeed)throw Error('Build more prosperity first.');changeItem(n,'5',-r.expNeed);o.rank++;break;}
 case 'openingRecruit':{const e=data.cityEncounters.find(x=>x._id===target&&x.condition.type==='PlayerLvUpNum');if(!e||o.rank<e.condition.count||o.city.includes(target))throw Error('That earned encounter is not available.');const heroItem=openingReward(e.reward).find(x=>items.get(x.id)?.useEffect==='hero');const id='hero_'+items.get(heroItem?.id)?.useParam.id;if(!FELLOWS.some(x=>x.id===id))throw Error('Missing Fellow identity.');n.fellows[id]??=newFellow();o.city.push(target);return {state:n,message:'Earned encounter completed. Existing Fellow training preserved.',recruited:id};}
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
 else if(target==='Item_Token_Gacha_Universal'){const next=FELLOWS.find(x=>!n.fellows[x.id]);if(!next)throw Error('All Fellows are owned; keep this token for a future duplicate policy.');n.fellows[next.id]=newFellow();return {state:n,message:'Earned draw: '+next.name+'. Local catalog-order recruitment, no random odds.',recruited:next.id};}
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
