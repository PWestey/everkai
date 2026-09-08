import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,valid,decode,totalRate} from '../lib/game.mjs';import {CONSUMABLES,V8_ITEMS} from '../lib/adventure.mjs';import {usableCount,consumableAmount} from '../lib/consumables.mjs';
const basic='Item_Gcoin_YieldPack_1',advanced='Item_Gcoin_YieldPack_3',insight='Item_WifeBlessExp_extradd_01';
test('v8 migration preserves old bag, full roster and all progress; only new item keys are empty',()=>{
 const old=act(fresh(0),'welcome',0,'wife_2').state;old.version=8;old.inventory=Object.fromEntries(Object.entries(old.inventory).filter(([id])=>id.startsWith('gift')||V8_ITEMS.some(i=>i.id===id)));old.inventory.Item_HeroEXP_Resources_4=31;old.family.wife_2.points=271;
 const s=decode(JSON.stringify(old));assert.equal(s.version,10);for(const [id,n] of Object.entries(old.inventory))assert.equal(s.inventory[id],n);for(const id of [basic,advanced,insight,'Item_GetCE_10','Item_Weapon_Equipment_7_1','Item_Weapon_Equipment_7_5','Item_Weapon_Equipment_7_6'])assert.equal(s.inventory[id],0);for(const k of ['family','fellows','buildings','school','bonds','adventure','gold','fellowXP'])assert.deepEqual(s[k],old[k]);assert.ok(valid(s));
});
test('earnings cards use the current rate without collecting pending gold or granting earned milestones',()=>{
 const s=fresh(0);s.inventory[basic]=2;s.inventory[advanced]=1;s.pending=450;const initial=structuredClone(s);
 const first=act(s,'useConsumable',0,basic,{count:1}).state;assert.equal(first.gold,s.gold+120);assert.equal(first.pending,450);assert.equal(first.earned,s.earned);assert.deepEqual(s,initial);
 const stronger={...first,fellows:{hero_15:{...first.fellows.hero_15,level:2}}};const second=act(stronger,'useConsumable',0,advanced,{count:1}).state;assert.equal(second.gold,stronger.gold+12600);assert.equal(second.inventory[advanced],0);assert.deepEqual(decode(JSON.stringify(second)),second);
});
test('earnings cards preserve inventory with no income and cap bulk use at whole cards',()=>{
 const s=fresh(0);s.inventory[basic]=10;s.buildings.fish.fellow=null;const denied=act(s,'useConsumable',0,basic,{count:'all'});assert.ok(denied.error);assert.equal(denied.state.inventory[basic],10);
 s.buildings.fish.fellow='hero_15';s.gold=1e12-250;const r=act(s,'useConsumable',0,basic,{count:'all'});assert.equal(r.state.gold,1e12-10);assert.equal(r.state.inventory[basic],8);assert.ok(valid(r.state));
 const item=CONSUMABLES.find(i=>i.id===basic);assert.equal(consumableAmount(item,2.123),127);assert.equal(usableCount(r.state,item,null,totalRate(r.state)),0);
});
test('Blessing Point Insight supplies 10000 points without altering power, intimacy or gift counters',()=>{
 const s=act(fresh(0),'welcome',0,'wife_2').state;s.inventory[insight]=10;const r=act(s,'useConsumable',0,insight,{count:10,recipient:'wife_2'});assert.equal(r.state.family.wife_2.points,100000);assert.equal(r.state.family.wife_2.blessingPower,10);assert.equal(r.state.family.wife_2.intimacy,0);assert.equal(r.state.stats.gifts,0);assert.equal(r.state.inventory[insight],0);
 const trained=act(r.state,'bless',0,'wife_2').state;assert.equal(trained.family.wife_2.skill,1);assert.equal(trained.family.wife_2.points,99980);assert.ok(valid(trained));
 s.family.wife_2.points=1e9-15000;const capped=act(s,'useConsumable',0,insight,{count:'all',recipient:'wife_2'});assert.equal(capped.state.family.wife_2.points,1e9-5000);assert.equal(capped.state.inventory[insight],9);
});
test('recovered extensionless JSON characters recruit and integrate with work, gifts, bonds and reload',()=>{
 let s=fresh(0);for(const id of ['hero_13','hero_54'])s=act(s,'recruit',0,id).state;s=act(s,'welcome',0,'wife_56').state;s=act(s,'assign',0,'fish','hero_13').state;s=act(s,'bondAssign',0,'wife_56','hero_54').state;s=act(s,'gift',0,'wife_56','gift1').state;assert.equal(s.buildings.fish.fellow,'hero_13');assert.equal(s.bonds.wife_56.fellow,'hero_54');assert.equal(s.family.wife_56.intimacy,1);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('Focus Candy restores full Education Points without losing fractional recovery or spending at capacity',()=>{
 const id='Item_GetCE_10',s=fresh(0);s.inventory[id]=10;s.school.points=2.5;
 const r=act(s,'useConsumable',0,id,{count:'all'});assert.equal(r.state.school.points,5.5);assert.equal(r.state.inventory[id],7);assert.equal(r.state.family,s.family);assert.equal(r.state.stats.gifts,0);assert.ok(valid(r.state));
 const denied=act(r.state,'useConsumable',0,id,{count:1});assert.ok(denied.error);assert.equal(denied.state.inventory[id],7);assert.equal(denied.state.school.points,5.5);assert.deepEqual(decode(JSON.stringify(r.state)),r.state);
});
