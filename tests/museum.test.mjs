import test from 'node:test';import {allKeepsakes} from './progression-helpers.mjs';
import assert from 'node:assert/strict';
import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';
import {bondedPower,fellowPower} from '../lib/adventure.mjs';
import {museumBonus,KEEPSAKES} from '../lib/museum.mjs';
const run=(s,a,t=null)=>act(s,a,s.lastAt,t);
test('existing saves have no Museum effects until keepsakes are accepted',()=>{
 const old=fresh(1000),before=bondedPower(old,'hero_15');
 assert.deepEqual(decode(JSON.stringify(old)),old);
 let s=allKeepsakes(old);
 assert.equal(KEEPSAKES.length,32);assert.equal(KEEPSAKES.filter(k=>k.effect).length,32,'E4-02: every shipped keepsake carries its Exhibit.levelUpSkill effect');
 assert.equal(bondedPower(s,'hero_15'),before);
 assert.deepEqual(s.fellows,old.fellows);assert.deepEqual(s.inventory,old.inventory);
 assert.ok(run(s,'claimMuseum').error,'a complete collection has nothing to give');assert.ok(run(s,'claimKeepsake','Collection_28').error);
 s=run(s,'acceptMuseum').state;s=run(s,'displayMuseum').state;assert.deepEqual(museumBonus(s),{aptitude:4,basicPowerPercent:60,powerPercent:0});
 assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(valid(s));
 s=run(s,'storeMuseum').state;assert.ok(bondedPower(s,'hero_15')>before);
 assert.equal(totalRate(s),totalRate(old));
});
test('Museum bonuses are derived and affect future recruits without changing training',()=>{
 let s=allKeepsakes(fresh(1000));s=run(s,'acceptMuseum').state;s=run(s,'displayMuseum').state;
 s=run(s,'recruit','hero_1').state;assert.ok(s.fellows.hero_1);
 for(const id of Object.keys(s.fellows)){
  const f=s.fellows[id];assert.equal(f.aptitude,10);
  assert.equal(bondedPower(s,id),Math.floor(fellowPower({...f,aptitude:14})*1.60));
 }
 assert.equal(totalRate(s),totalRate(fresh(1000)));
 const displayed=run(s,'displayMuseum').state;assert.deepEqual(displayed,s);
 s=run(s,'toggleKeepsake','Collection_28').state;assert.equal(museumBonus(s).aptitude,4);
 assert.ok(valid(s));
});
test('only known collected keepsakes may be displayed and malformed restores fail',()=>{
 const s=fresh(1000);
 assert.ok(run(s,'toggleKeepsake','Collection_28').error);
 assert.ok(run(s,'claimKeepsake','unknown').error);
 for(const museum of [null,[],true,{Collection_28:1},{unknown:true},{Collection_28:{level:1}}]){
  assert.equal(valid({...s,museum}),false);
  assert.throws(()=>decode(JSON.stringify({...s,museum})));
 }
 const collected={...s,museum:{...s.museum,Collection_24:false}};
 assert.equal(collected.crystals,s.crystals);assert.ok(run(collected,'claimKeepsake','Collection_24').error);assert.ok(valid(collected));
 assert.ok(run(collected,'toggleKeepsake','Collection_24').error);assert.equal(run(collected,'acceptKeepsake','Collection_24').state.crystals,s.crystals);
});

test('legacy displayed keepsakes retain accepted bonuses after storing; invalid acceptance is rejected',()=>{
 const legacy={...fresh(1000),museum:{Collection_28:true,Collection_29:false}};
 const power=bondedPower(legacy,'hero_15');let s=run(legacy,'storeMuseum').state;
 assert.deepEqual(s.museumAccepted,['Collection_28']);assert.equal(bondedPower(s,'hero_15'),power);
 assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(run(s,'acceptKeepsake','Collection_28').error);
 // E4-03: Collection_29 is atk/percent 200 in the original, i.e. basicPowerPercent, not powerPercent.
 s=run(s,'acceptKeepsake','Collection_29').state;assert.equal(museumBonus(s).basicPowerPercent,2);assert.equal(museumBonus(s).powerPercent,0);
 for(const museumAccepted of [null,{},['unknown'],['Collection_28','Collection_28']])assert.equal(valid({...s,museumAccepted}),false);
 assert.equal(valid({...fresh(1000),museumAccepted:[]}),false);
});

// -------------------------------------------------------------------------------------------------
// E4-02 / E4-03 / BUG-09 coverage guard. lib/museum-data.json is generated from the original's own
// tables; this pins what "generated" has to mean so a re-import cannot quietly drop effects again.
// E4-02: 26 of the 32 shipped keepsakes were inert. E4-03: three of the six that were modelled sat in
// the wrong bucket (Collection_43 is talent, not a power percent; Collection_29 and Collection_32 are
// atk/percent like 49 and GveKingArthur, so all four belong in basicPowerPercent).
// BUG-09: the count is 32, not the 31 the catalogue recorded.
// -------------------------------------------------------------------------------------------------
test('every keepsake carries its original effect, in the bucket the original names',()=>{
 assert.equal(KEEPSAKES.length,32,'BUG-09: 32 Hall1 keepsakes ship, not 31');
 assert.equal(new Set(KEEPSAKES.map(k=>k.id)).size,32,'no duplicate ids');
 assert.equal(KEEPSAKES.filter(k=>k.hall==='Hall1').length,32);
 const totals={aptitude:0,basicPowerPercent:0,powerPercent:0};
 for(const k of KEEPSAKES){
  assert.ok(k.effect,`${k.id} is inert; every shipped keepsake resolves to an Exhibit.levelUpSkill`);
  const src=k.effectSource;
  assert.equal(src.reference,k.id,'the effect must come from this keepsake\'s own Exhibit row');
  assert.ok(src.sourceKey&&src.prop,'the SkillBase row is recorded so the number can be re-derived');
  assert.deepEqual(src.condition,{conditionType:'all'},`${k.id} effect is scoped; Everkai applies it to every Fellow`);
  // The two shapes Hall1 actually uses, and the scale rule for each.
  if(src.prop==='talent'){assert.equal(src.propType,null);assert.deepEqual(k.effect,{stat:'aptitude',amount:src.initial})}
  else{assert.equal(src.prop,'atk');assert.equal(src.propType,'percent');assert.deepEqual(k.effect,{stat:'basicPowerPercent',amount:src.initial/100})}
  totals[k.effect.stat]+=k.effect.amount;
 }
 assert.deepEqual(totals,{aptitude:4,basicPowerPercent:60,powerPercent:0});
 // The three E4-03 corrections, named so a regression says which one moved.
 assert.deepEqual(KEEPSAKES.find(k=>k.id==='Collection_43').effect,{stat:'aptitude',amount:2});
 for(const id of ['Collection_29','Collection_32','Collection_49','Collection_GveKingArthur'])
  assert.deepEqual(KEEPSAKES.find(k=>k.id===id).effect,{stat:'basicPowerPercent',amount:2},id);
 // powerPercent is empty because Hall1 carries no atk/finalpercent row -- not because nothing was found.
 assert.equal(KEEPSAKES.filter(k=>k.effectSource.propType==='finalpercent').length,0);
});
