import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';import {GEAR,STAGES,teamPower,ladderPower,stageCost,xpCost,fellowCap} from '../lib/adventure.mjs';import {supplied} from './gear-fixtures.mjs';
test('v4 migration preserves earned EXP, old levels, inventory and school income',()=>{const old={version:4,gold:9000,pending:43,lastAt:1000,earned:500,upgrades:19,fellows:{hero_15:{level:20},hero_1:{level:2}},family:{wife_2:{intimacy:30,blessingPower:15,points:77,skill:2,relationship:2}},inventory:{gift1:4,gift2:2,gift3:1,gift4:0,gift5:1},energy:2,claims:['earn500'],stats:{gifts:4,dates:5},buildings:{fish:{level:1,fellow:'hero_15'}},fellowXP:4321,school:{points:4,nextId:2,graduates:1,income:2.2,pupils:[],alumni:[{id:1,caretaker:'wife_2',income:2.2}]}};const s=decode(JSON.stringify(old));assert.equal(s.version,10);assert.equal(s.fellows.hero_15.level,20);assert.equal(s.fellowXP,4321);assert.equal(s.gold,9000);assert.deepEqual(s.school,old.school);assert.deepEqual(s.family,old.family);assert.equal(s.inventory.gift1,4);assert.equal(s.fellows.hero_15.aptitude,10);assert.equal(totalRate(s),30.5*1.02+2.2);assert.deepEqual(decode(JSON.stringify(s)),s)});
test('batch EXP training debits each completed level and respects the budget',()=>{const s=act({...fresh(0),fellowXP:xpCost(1)+xpCost(2)},'train',0,'hero_15',5).state;assert.equal(s.fellows.hero_15.level,3);assert.equal(s.fellowXP,0);assert.equal(s.gold,250);assert.equal(s.upgrades,2)});
test('limit breaks require level cap and materials; then unlock additional training',()=>{let s=supplied(fresh(0));s={...s,fellowXP:1e6};assert(act(s,'limitBreak',0,'hero_15').error);
 // act() hands back the UNCHANGED state on refusal, so an under-funded walk never advances and the
 // loop spins forever -- this one ran 28 minutes in CI after the cap moved from 60 to 100 (1->100
 // now costs 58,410 EXP). Fund it, guard it, and assert it actually arrived.
 let guard=0;while(s.fellows.hero_15.level<100&&guard++<500)s=act(s,'train',0,'hero_15',5).state;
 assert.equal(s.fellows.hero_15.level,100,'the walk must reach the zero-break cap');const xp=s.fellowXP;assert(act(s,'train',0,'hero_15',1).error);assert.equal(s.fellowXP,xp);s=act(s,'limitBreak',0,'hero_15').state;assert.equal(fellowCap(s.fellows.hero_15),150);assert.equal(s.inventory.local_limit_token,9);s=act(s,'train',0,'hero_15',1).state;assert.equal(s.fellows.hero_15.level,101);assert(valid(s))});
test('aptitude and skill materials are consumed independently and only affect future earnings',()=>{let s=supplied(fresh(0));const pending=s.pending;s=act(s,'aptitude',1000,'hero_15').state;assert.equal(s.pending,pending+2);assert.equal(s.inventory.Item_Talent_Hero_1,9);assert.equal(totalRate(s),2.2);s=act(s,'fellowSkill',1000,'hero_15').state;assert.equal(s.inventory.local_skill_scroll,9);assert.equal(s.fellows.hero_15.skill,1);assert(Math.abs(totalRate(s)-2.31)<.00001)});
test('equipment swap and unequip conserve item counts and prevent using missing items',()=>{let s=supplied(fresh(0));const [a,b]=GEAR;s=act(s,'equip',0,'hero_15',a.id).state;assert.equal(s.inventory[a.id],9);s=act(s,'equip',0,'hero_15',b.id).state;assert.equal(s.inventory[a.id],10);assert.equal(s.inventory[b.id],9);s=act(s,'equip',0,'hero_15',null).state;assert.equal(s.inventory[b.id],10);assert.equal(s.fellows.hero_15.gear,null);assert(act(fresh(0),'equip',0,'hero_15',a.id).error)});
// The campaign now runs on the original's own table, so a clear is a gold SINK paying the stage's own
// Fellow EXP -- no invented gold/crystal/material payout. Stage 1 is chapter 1-1: atk 1,350, base gold
// 1,228 across its four battles, item1 sum 106.
test('first clear charges the table price and pays the table EXP; repeat patrol awards EXP only',()=>{
 const start={...fresh(0),gold:100000};const power=ladderPower(start),cost=stageCost(STAGES[0],power);
 assert.equal(STAGES[0].xp,106);assert.equal(STAGES[0].bottles,0,'chapter 1-1 is not a boss, so no Fairy Bottle');
 let s=act(start,'battle',0,1).state;
 assert.equal(s.gold,100000-cost,'a stage takes gold and never returns more than it took');
 assert.equal(s.fellowXP,start.fellowXP+106);
 assert.equal(s.crystals,0,'the stage rows award no diamonds -- the old 10/30 crystals were invented');
 assert.equal(s.inventory.Item_Talent_Hero_1,0,'the per-stage Skill Pearl was invented and is gone');
 assert.equal(s.adventure.cleared,1);assert(act(s,'battle',0,1).error);
 const g=s.gold;s=act(s,'patrol',0,1).state;
 assert.equal(s.fellowXP,start.fellowXP+106+106,'a patrol repays the stage EXP');
 assert.equal(s.gold,g,'the patrol deposit returns on victory');
 assert.equal(s.adventure.patrols,1);assert(act(s,'battle',0,3).error)});
test('defeat and insufficient gold cannot grant rewards or advance the campaign',()=>{
 let s=act({...fresh(0),gold:100000},'battle',0,1).state;const before=s.gold;
 // A normal stage is refused on GOLD, never on Power: Power only sets the price.
 const broke=act({...s,gold:0},'battle',0,2);assert(broke.error);assert.match(broke.error,/costs .* gold at your Power/);
 assert.equal(broke.state.gold,0);assert.equal(broke.state.adventure.cleared,1);assert.equal(broke.state.adventure.lastBattle.won,false);
 assert.equal(s.gold,before);
 assert(act({...fresh(0),gold:0},'battle',0,1).error)});
test('party changes cannot duplicate Fellows, include unowned IDs or remove the last member',()=>{let s=fresh(0);assert(act(s,'party',0,'hero_15').error);assert(act(s,'party',0,'hero_1').error);s=act(s,'recruit',0).state;s=act(s,'party',0,'hero_1').state;assert.equal(teamPower(s),200);s=act(s,'party',0,'hero_1').state;assert.equal(teamPower(s),100);assert(!valid({...s,adventure:{...s.adventure,party:['hero_15','hero_15']}}))});
test('material shop spends gold and equipment shop spends crystals',()=>{let s={...fresh(0),gold:500,crystals:100};s=act(s,'buySupply',0,'Item_Talent_Hero_1').state;assert.equal(s.gold,300);assert.equal(s.crystals,100);s=act(s,'buySupply',0,GEAR[0].id).state;assert.equal(s.crystals,70);assert.equal(s.inventory[GEAR[0].id],1);assert(act({...s,crystals:0},'buySupply',0,GEAR[0].id).error)});
test('the campaign walks the original ladder in order and refuses to skip ahead',()=>{
 let s=supplied(fresh(0));s.fellows.hero_15.aptitude=1000;s.gold=1e9;
 // Ten stages is enough to cross a boss (stage 6) and start chapter 2; the full 36,000 are walked in
 // tests/adventure-ladder.test.mjs against the table.
 for(let i=1;i<=10;i++){const r=act(s,'battle',0,i);assert.equal(r.error,undefined,`stage ${i}: ${r.error}`);s=decode(JSON.stringify(r.state))}
 assert.equal(s.adventure.cleared,10);
 assert(act(s,'battle',0,10).error,'a cleared stage cannot be re-cleared');
 assert(act(s,'battle',0,12).error,'the ladder cannot be skipped');
 assert(valid(s))});
test('invalid resources, equipment and mismatched level caps fail save validation',()=>{const s=fresh(0);for(const bad of [{...s,crystals:-1},{...s,fellows:{hero_15:{...s.fellows.hero_15,gear:'fake'}}},{...s,fellows:{hero_15:{...s.fellows.hero_15,level:101}}},{...s,adventure:{...s.adventure,cleared:STAGES.length+1}},{...s,inventory:{...s.inventory,local_skill_scroll:-1}}])assert.throws(()=>decode(JSON.stringify(bad)))});
