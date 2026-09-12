import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,totalRate,settle} from '../lib/game.mjs';
import {OPENING,OPENING_STAGES,openingTask,openingRequirement,openingPower,openingQuote,openingItemCount,openingReward,openingBossReady} from '../lib/opening.mjs';
import {recipeKnown} from '../lib/medicine-discovery.mjs';
import {assignedOperation} from '../lib/operations.mjs';import {BUSINESSES} from '../lib/businesses.mjs';
import {staffPrice} from '../lib/staffing.mjs';
export function runOpening(){
 let s=fresh(0),now=0,actions=0;const log=[];
 const go=(a,t=null,v=null,wait=0)=>{now+=wait;const r=act(s,a,now,t,v);assert.equal(r.error,undefined,`${a} ${t}: ${r.error}; quest ${openingTask(s)?._id}`);assert.ok(valid(r.state),a+' invalid');s=decode(JSON.stringify(r.state));actions++;return r;};
 const bank=()=>go('collect',null,null,60000);
 const money=()=>bank();
 const train=(id)=>{if(s.fellowXP<1000) { // EXP is earned by the campaign; existing patrol supplies later reserve if necessary.
  if(s.opening.cleared<126)battle();
 }go('openingTrain',id);};
 const battle=()=>{const st=OPENING_STAGES[s.opening.cleared];if(!st)return;if(st.boss&&openingPower(s)<=st.atk)train('hero_15');while(s.gold<(openingQuote(st,openingPower(s))||0))money();go('openingBattle',st._id);};
 go('openingStart');
 for(let z=0;z<136;z++){
  const t=openingTask(s),r=t.taskReq;let attempts=0;
  while(!openingRequirement(s).ready){assert.ok(++attempts<150,`Quest stalled ${t._id}`);const h=Object.keys(s.fellows),f=Object.keys(s.family)[0];
   switch(r.type){
   case 'CollectBuildingMoneyCount':bank();break;
   case 'BuildingUnlock':if(s.gold<1000)money();go('openingBuild',r.id);break;
   // Hiring charges the original's curve now, so it needs the same gold guard every other paid step
   // in this script already uses.
   case 'BuildingLvup':{const n=(r.count-(s.enterprises[r.id]?.employees||0))>=10?10:1;while(s.gold<staffPrice(r.id,s.enterprises[r.id]?.employees||0,n))money();go('hireEmployees',r.id,n);break;}
   case 'BuildingLvupCount':if(s.gold<10000)money();go('buildingUpgrade','fish');break;
   case 'BuildingStar':case 'BuildingTotalStar':go('openingStar','Building_101');break;
   case 'BuildingDispatch':{const assigned=new Set([...Object.values(s.enterprises).flatMap(x=>x.fellows),...Object.values(s.buildings).map(x=>x.fellow).filter(Boolean)]),id=h.find(x=>!assigned.has(x));assert.ok(id,'earned Fellow needed');const b=Object.keys(s.enterprises).find(x=>s.enterprises[x].fellows.length===0);go('assignOperator',b,id);break;}
   case 'AppointLvupCount':go('openingOperation',h.find(id=>(s.opening.operations[id]||0)<1)||h[0]);break;
   case 'HeroLvupMulti':train(h.find(id=>s.fellows[id].level<r.count));break;
   case 'HeroTotalLv':train(h.sort((a,b)=>s.fellows[a].level-s.fellows[b].level)[0]);break;
   case 'PlayerLvUpNum':while(s.opening.fame<OPENING.ranks[s.opening.rank-1].expNeed)battle();while(totalRate(s)+100*Object.values(s.opening.stars).reduce((a,b)=>a+b,0)<OPENING.ranks[s.opening.rank-1].prosperityNeed){while(s.gold<staffPrice('Building_101',s.enterprises.Building_101?.employees||0,10))money();go('hireEmployees','Building_101',10);}go('openingPromote');{const e=OPENING.cityEncounters.find(e=>e.condition.type==='PlayerLvUpNum'&&e.condition.count===s.opening.rank);go('openingRecruit',e._id);}break;
   case 'StageClear':battle();break;
   case 'SimGame1RecipeUnlockSpecify':go('openingRecipe',r.id);break;
   case 'MedicineUnlock':if(!s.apothecary)go('apothecaryOpen');else {const shelf=s.apothecary.shelves[0];if(shelf.units)go('collect',null,null,400000);if(s.apothecary.deposit)go('potionCollect',null,{seq:s.apothecary.seq});if(!recipeKnown(s,r.id))go('potionStock','1001',{seq:s.apothecary.seq,quantity:20});}break;
   case 'WifeCount':go('openingFamily','B3');break;
   case 'WifeGift':go('gift',f,'gift1');break;
   case 'WifeDate':go('date',null,0,60000);break;
   case 'WifeQuench':if(s.family[f].points<10)go('date',null,0,60000);go('openingFathoms',f);break;
   case 'ChildGain':go('enroll',f,'curious');break;
   case 'ChildEducation':if(!s.school.pupils.length)go('enroll',f,'curious');{const p=s.school.pupils[0];if(p.progress>=6)go('graduate',p.id);else go('educate',p.id,'class',3600000);}break;
   case 'EquipCount':assert.fail('Chapter5 weapon missing');break;
   case 'EquipHeroMulti':go('equip',h[0],'Item_Weapon_Equipment_1_1');break;
   case 'EquipLvup':go('openingArtifactUpgrade',h.find(id=>s.fellows[id].gear));break;
   case 'EquipQuench':go('openingReforge',h.find(id=>s.fellows[id].gear));break;
   default:assert.fail(r.type);
   }
  }
  go('openingClaim',t._id);log.push(t._id);
 }
 while(s.opening.cleared<126)battle();while(s.opening.rank<5){while(s.opening.fame<OPENING.ranks[s.opening.rank-1].expNeed)assert.fail('Fame insufficient at final rank');while(totalRate(s)+100*Object.values(s.opening.stars).reduce((a,b)=>a+b,0)<1500){while(s.gold<staffPrice('Building_101',s.enterprises.Building_101?.employees||0,10))money();go('hireEmployees','Building_101',10);}go('openingPromote');go('openingRecruit','B5');}
 for(const id of [...s.opening.events]){const e=OPENING.stageEvents.find(x=>x._id===id);go('openingEvent',id,e.eventType==='choose'?1:e.eventType==='appoint'?'hero_1':null);}
 assert.ok(openingItemCount(s,'Item_Building_Recruit_Increase_1')>0);go('openingUse','Item_Building_Recruit_Increase_1','Building_101');assert.ok(openingItemCount(s,'Item_LvUp_Bank')>0);go('openingUse','Item_LvUp_Bank');return {state:s,actions,log};
}
test('fresh village completes all136 connected quests,126 encounters,rank5 and four earned Fellows using actual actions and elapsed time',()=>{const {state:s,log,actions}=runOpening();assert.equal(log.length,136);assert.equal(s.opening.cleared,126);assert.equal(s.opening.rank,5);assert.equal(s.opening.city.length,4);assert.equal(s.opening.eventClaims.length,12);assert.ok(s.school.graduates>0);assert.ok(s.opening.reforges);assert.ok(actions>300);assert.equal(openingTask(s),null);});
test('opt-in retains legacy rank, roster, campaign and non-opening actions',()=>{let s=fresh(0);s=act(s,'recruitAll',0).state;s=act(s,'welcomeAll',0).state;const old=structuredClone(s),n=act(s,'openingStart',0).state;delete n.opening;assert.deepEqual(n,old);assert.ok(valid(old));assert.deepEqual(decode(JSON.stringify(old)),old);});
test('positive collection alone counts; passive settlement and zero collection do not',()=>{let s=act(fresh(0),'openingStart',0).state;s=act(s,'collect',0).state;assert.equal(s.opening.collections,1);s=act(s,'collect',0).state;assert.equal(s.opening.collections,1);assert.equal(settle(s,10000).opening.collections,1);});
test('cost floors and pre-reward funds are atomic, stale challenge cannot repeat',()=>{let s=act(fresh(0),'openingStart',0).state;const st=OPENING_STAGES[0],cost=openingQuote(st,openingPower(s));assert.equal(openingQuote(st,1080),162);s.gold=cost-1;const failed=act(s,'openingBattle',0,st._id);assert.ok(failed.error);assert.deepEqual(failed.state,s);s.gold=cost;const n=act(s,'openingBattle',0,st._id).state;assert.equal(n.gold,0);assert.equal(n.opening.fame,2);assert.ok(act(n,'openingBattle',0,st._id).error);});
test('boss strict boundary and reward capacity reject whole transaction',()=>{let s=act(fresh(0),'openingStart',0).state;s.opening.cleared=20;s.fellows.hero_15.aptitude=10;const st=OPENING_STAGES[20];assert.equal(st.atk,3000);assert.equal(openingBossReady(st,3000),false);assert.equal(openingBossReady(st,3001),true);s.fellowXP=1e9;const r=act(s,'openingBattle',0,st._id);assert.ok(r.error);assert.deepEqual(r.state,s);assert.equal(openingQuote(st,st.atk),0);});
test('rank encounters preserve already owned identity and first Family branch is exclusive',()=>{let s=act(fresh(0),'openingStart',0).state;s=act(s,'recruitAll',0).state;s.opening.rank=5;s.fellows.hero_1.level=7;const n=act(s,'openingRecruit',0,'B2').state;assert.equal(n.fellows.hero_1.level,7);assert.equal(Object.keys(n.fellows).length,Object.keys(s.fellows).length);assert.ok(act(n,'openingRecruit',0,'B2').error);n.opening.cleared=42;const f=act(n,'openingFamily',0,'B3').state;assert.ok(f.family.wife_1);assert.ok(act(f,'openingFamily',0,'C1').error);});
test('literal choice1 reward retained even when correctOption2; duplicate refused',()=>{let s=act(fresh(0),'openingStart',0).state;s.opening.cleared=42;s.opening.events=['A202'];const before=s.gold,r=act(s,'openingEvent',0,'A202',1);assert.equal(r.error,undefined);assert.equal(r.state.gold-before,openingReward('Reward_StageEvent_A202').filter(x=>x.id==='3').reduce((n,x)=>n+x.count,0));assert.ok(act(r.state,'openingEvent',0,'A202',1).error);});
test('operation payments affect actual assignment income; paid steps bounded',()=>{let s=act(fresh(0),'openingStart',0).state;s=act(s,'openEnterprise',0,'Building_101').state;s=act(s,'hireEmployees',0,'Building_101',10).state;s=act(s,'assignOperator',0,'Building_101','hero_15').state;s.opening.locker.Item_HeroManagerment_Building=4;const before=totalRate(s);for(let i=0;i<3;i++)s=act(s,'openingOperation',0,'hero_15').state;assert.ok(totalRate(s)>before);assert.equal(openingItemCount(s,'Item_HeroManagerment_Building'),0);assert.ok(act(s,'openingOperation',0,'hero_15').error);});
test('earned staff card uses exact balance, adds one staff and refuses cap without loss',()=>{let s=act(fresh(0),'openingStart',0).state;s=act(s,'openEnterprise',0,'Building_101').state;const id='Item_Building_Recruit_Increase_1';if(Object.hasOwn(s.inventory,id))s.inventory[id]=2;else s.opening.locker[id]=2;const n=act(s,'openingUse',0,id,'Building_101');assert.equal(n.error,undefined);assert.equal(n.state.enterprises.Building_101.employees,1);assert.equal(openingItemCount(n.state,id),1);s=n.state;s.enterprises.Building_101.employees=5000;const r=act(s,'openingUse',0,id,'Building_101');assert.ok(r.error);assert.deepEqual(r.state,s);});
test('Bank material stops at full-save level10 cap and retains item',()=>{let s=act(fresh(0),'openingStart',0).state;s.buildings.fish.level=10;const id='Item_LvUp_Bank';if(Object.hasOwn(s.inventory,id))s.inventory[id]=1;else s.opening.locker[id]=1;assert.ok(valid(s));const r=act(s,'openingUse',0,id);assert.ok(r.error);assert.deepEqual(r.state,s);assert.ok(valid(r.state));});
test('malformed opening state is refused on decode and duplicate enrollment is safe',()=>{const s=act(fresh(0),'openingStart',0).state;assert.ok(act(s,'openingStart',0).error);for(const change of [o=>o.rank=0,o=>o.claimed=137,o=>o.events=['A101'],o=>o.locker.unknown=1,o=>o.operations.missing=1]){const n=structuredClone(s);change(n.opening);assert.throws(()=>decode(JSON.stringify(n)));}});

test('actual APK growth boss rejects equal Power then admits greater Power',()=>{let s=act(fresh(0),'activateOriginalProgression',0).state;s=act(s,'openingStart',0).state;s.opening.cleared=125;s.fellows.hero_15.aptitude=52;assert.equal(openingPower(s),23100);const r=act(s,'openingBattle',0,'6-6-0');assert.ok(r.error);assert.deepEqual(r.state,s);s.fellows.hero_15.aptitude=53;assert.ok(openingPower(s)>23100);const n=act(s,'openingBattle',0,'6-6-0');assert.equal(n.error,undefined);assert.equal(n.state.opening.cleared,126);});
test('primary Teach all and every direct lesson route credit opening quests exactly once',()=>{let s=act(fresh(0),'openingStart',0).state;s=act(s,'welcome',0,'wife_1').state;s=act(s,'enroll',0,'wife_1','curious').state;s=act(s,'enroll',0,'wife_1','creative').state;let r=act(s,'educateAllRound',0);assert.equal(r.state.opening.education,2);assert.deepEqual(r.state.school.pupils.map(p=>p.progress),[1,1]);s=r.state;r=act(s,'educateBatch',0,1);assert.equal(r.state.opening.education,6);assert.equal(r.state.school.pupils[0].progress,5);s=r.state;r=act(s,'educateAllRound',0);assert.ok(r.error);assert.equal(r.state.opening.education,6);r=act(s,'finishSchool',0,1);assert.equal(r.state.opening.education,7);assert.equal(r.state.school.pupils[0].progress,6);s=r.state;r=act(s,'finishSchool',0,2);assert.equal(r.state.opening.education,12);s=r.state;assert.ok(act(s,'educateAllRound',0).error);assert.equal(act(s,'graduateAll',0).state.opening.education,12);assert.deepEqual(decode(JSON.stringify(s)).opening,s.opening);});
test('milestone lessons count admitted progress while no-opening legacy behavior is retained',()=>{let s=fresh(0);s=act(s,'welcome',0,'wife_1').state;s=act(s,'enroll',0,'wife_1','curious').state;const old=act(s,'educateToMilestone',0,1);assert.equal(old.state.opening,undefined);s=act(s,'openingStart',0).state;const n=act(s,'educateToMilestone',0,1);assert.equal(n.error,undefined);assert.equal(n.state.opening.education,n.state.school.pupils[0].progress);const cmp=structuredClone(n.state);delete cmp.opening;assert.deepEqual(cmp,old.state);});
