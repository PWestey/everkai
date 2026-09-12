import test from 'node:test';import assert from 'node:assert/strict';
import {startingSave,act,valid,decode} from '../lib/game.mjs';
import {enterpriseBreakdown,enterpriseRate} from '../lib/businesses.mjs';
import {FARM_YIELD,farmYieldLevel,farmYieldBonus} from '../lib/farm.mjs';
const NOW=1767225600000;
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.ok(!r.error,String(r.error));return r.state};
/** An open business with staff, an open farm, and enough Knowledge for `steps` Magic Tree levels. */
function ready(steps=1){
 let s=startingSave(NOW);s={...s,gold:s.gold+1_000_000};
 s=run(s,'openEnterprise','Building_101');
 s=run(s,'hireEmployees','Building_101',200);
 s=run(s,'openFarm');
 const need=FARM_YIELD.slice(0,steps).reduce((n,l)=>n+(l.consume||0),0);
 return [{...s,farm:{...s.farm,knowledge:need}},need];
}

test('the ladder is the original: 201 levels, a flat +5% a step, terminal row unpurchasable',()=>{
 assert.equal(FARM_YIELD.length,201);
 assert.equal(FARM_YIELD[0].percent,0);assert.equal(FARM_YIELD.at(-1).percent,1000);
 assert.deepEqual([...new Set(FARM_YIELD.slice(1).map((l,i)=>l.percent-FARM_YIELD[i].percent))],[5]);
 assert.equal(FARM_YIELD.at(-1).consume,undefined);
 // The anomalous first row is the original's own: 20,000, then a restart at 10,000.
 assert.equal(FARM_YIELD[0].consume,20000);assert.equal(FARM_YIELD[1].consume,10000);
});

test('inert until grown, and it refuses clearly before that',()=>{
 let s=startingSave(NOW);
 assert.equal(farmYieldBonus(s),0);
 assert.match(act(s,'farmYieldUpgrade',s.lastAt).error,/Open Magic Farm first/);
 s=run(s,'openFarm');
 assert.equal(farmYieldLevel(s.farm),0);
 assert.match(act(s,'farmYieldUpgrade',s.lastAt).error,/20,000 Knowledge/);
});

test('growing spends exactly the listed Knowledge and adds exactly +5%',()=>{
 const [start,need]=ready(1);
 assert.equal(need,20000);
 const before=enterpriseBreakdown(start,'Building_101');
 const s=run(start,'farmYieldUpgrade');
 assert.equal(farmYieldLevel(s.farm),1);
 assert.equal(s.farm.knowledge,0);
 const after=enterpriseBreakdown(s,'Building_101');
 assert.equal(Number((after.bonus-before.bonus).toFixed(10)),0.05);
 assert.equal(after.farmBonus,0.05);
 assert.ok(after.total>before.total);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('the Magic Tree pays every business, unlike the type-scoped strands',()=>{
 let [s]=ready(1);
 s=run(s,'openEnterprise','Building_301');   // Brave, not the Inn's Diligent
 s=run(s,'hireEmployees','Building_301',200);
 s=run(s,'farmYieldUpgrade');
 assert.equal(enterpriseBreakdown(s,'Building_101').farmBonus,0.05);
 assert.equal(enterpriseBreakdown(s,'Building_301').farmBonus,0.05);
 // and the two income paths still agree once a third strand is in the stack
 assert.equal(enterpriseRate(s),Object.keys(s.enterprises).reduce((n,id)=>n+enterpriseBreakdown(s,id).total,0));
});

test('the breakdown surfaces every strand it charges for',()=>{
 const [s]=ready(1);
 const row=enterpriseBreakdown(s,'Building_101');
 for(const key of ['qualityBonus','familyBonus','farmBonus'])assert.ok(key in row,`breakdown is missing ${key}`);
 // The reported strands must account for the whole multiplier, or the panel shows an unexplained number.
 const named=row.qualityBonus+row.familyBonus+row.farmBonus;
 assert.ok(row.bonus>=named-1e-9);
});

test('a save cannot carry a Magic Tree it never grew',()=>{
 const [s]=ready(1);
 for(const level of [FARM_YIELD.length,999,-1,1.5]){
  const bad=structuredClone(s);bad.farm.yieldLevel=level;
  assert.equal(valid(bad),false);
  assert.throws(()=>decode(JSON.stringify(bad)));
 }
});

test('the tree stops at the top rather than overflowing',()=>{
 const [s]=ready(1);
 const maxed={...s,farm:{...s.farm,yieldLevel:FARM_YIELD.length-1,knowledge:1e9}};
 assert.ok(valid(maxed));
 assert.equal(farmYieldBonus(maxed),10);
 assert.match(act(maxed,'farmYieldUpgrade',maxed.lastAt).error,/fully grown/);
});
