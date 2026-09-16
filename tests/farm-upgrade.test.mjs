// Coverage guard for lib/farm-upgrade-data.json -- the original's SimGame3PlantUpgrade ladder and
// risePercent, SimGame3Plant.country (the affected business type), and SimGame3Field's 12 plots.
// MEASURED 2026-09-15 against the full 1,499-table config set, with the decompiled original client
// (private-server/readable) settling what each number MEANS:
//   upgradeCost present on 39 level-1 and 39 level-2 rows, absent on all 39 level-3 rows (terminal);
//     level 1->2 runs 30..110, level 2->3 runs 2,000..5,000. It is NOT a currency -- the client's
//     SimGame3Manager:GetPlantUpNoticeById tests "upgradeCost <= GetPlantRecordCount(plantId)", the
//     plant's LIFETIME recordCount, not the spendable count. Nothing is deducted.
//   risePercent 2500..20000 (hundredths of a percent), 117/117 equal to farm-level-data effectText;
//     country 1..5 -> Inspiring/Diligent/Brave/Informed/Unfettered, 39/39 equal to that effectText.
//   SimGame3Field: 12 plots, plot 1 isDefaultUnlock, the rest 100/300/600/3000 x4/4000/5000/5000/
//     10000 KNOWLEDGE -- 37,000 for all twelve. NOT SimGame3Farmland's 40 Diamond-priced rows: the
//     client's ReqOpenField updates knowledgeScore and logs gain_know from="reclamation", and
//     Rule:text:SimGame3Main_8 reads "With enough Knowledge, go ask Maxim to reclaim more land plots!"
import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {FARM_PLANTS,FARM_UPGRADES,FARM_PLOTS,FARM_MAX_PLOTS,FARM_BASE_PLOTS,farmPlotCost,farmPlantLevel,farmPlantRecord,farmUpgradeCost,farmPlantRise,farmTypeRise,farmHarvestPlan} from '../lib/farm.mjs';
import levels from '../lib/farm-level-data.json' with {type:'json'};
const run=(s,a,t=null,v=null,now=1000)=>{const r=act(s,a,now,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state;};
const TYPES=['Inspiring','Diligent','Brave','Informed','Unfettered'];

test('the ladder covers every plant at every level, and only terminal level 3 has no requirement',()=>{
 assert.equal(FARM_UPGRADES.length,39);
 assert.deepEqual(FARM_UPGRADES.map(p=>p.id),FARM_PLANTS.map(p=>p.id),'same 39 plants, same order, as farm-data');
 const need=l=>FARM_UPGRADES.map(p=>p.levels[l-1].harvestsRequired);
 assert.equal(need(1).filter(c=>c!==undefined).length,39);
 assert.equal(need(2).filter(c=>c!==undefined).length,39);
 assert.equal(need(3).filter(c=>c!==undefined).length,0,'level 3 is terminal: no SimGame3PlantUpgrade level-3 row carries upgradeCost');
 assert.equal(Math.min(...need(1)),30);assert.equal(Math.max(...need(1)),110);
 assert.equal(Math.min(...need(2)),2000);assert.equal(Math.max(...need(2)),5000);
 for(const p of FARM_UPGRADES){
  assert.ok(TYPES.includes(p.type),p.id);
  assert.deepEqual(p.levels.map(l=>l.level),[1,2,3]);
  assert.ok(p.levels[0].risePercent<p.levels[1].risePercent&&p.levels[1].risePercent<p.levels[2].risePercent,p.id);
  // Both halves of this comparison are the ORIGINAL's: risePercent from SimGame3PlantUpgrade, the
  // percent and type in effectText from the wiki scrape already verified 117/117 against it.
  const wiki=levels.plants.find(w=>w.id===p.id).levels;
  for(const l of p.levels){
   const m=/^All (.+) Building Earnings \+(\d+)%/.exec(wiki[l.level-1].effectText);
   assert.equal(m[1],p.type,p.id);assert.equal(Number(m[2])*100,l.risePercent,p.id+' L'+l.level);
  }
 }
});

test('the plot table is the original twelve, one free, in Knowledge',()=>{
 assert.equal(FARM_MAX_PLOTS,12);assert.equal(FARM_BASE_PLOTS,1);
 assert.deepEqual(FARM_PLOTS.map(p=>p.plot),Array.from({length:12},(_,n)=>n+1));
 assert.deepEqual(FARM_PLOTS.map(p=>p.knowledge),[0,100,300,600,3000,3000,3000,3000,4000,5000,5000,10000]);
 assert.ok(FARM_PLOTS[0].baseUnlock&&FARM_PLOTS.slice(1).every(p=>!p.baseUnlock));
 assert.equal(farmPlotCost(1),100,'the second plot');
 assert.equal(farmPlotCost(11),10000,'the twelfth');
 assert.equal(farmPlotCost(12),null,'no thirteenth plot');
 assert.equal(FARM_PLOTS.reduce((n,p)=>n+p.knowledge,0),37000);
 for(let n=1;n<12;n++)assert.ok(FARM_PLOTS[n].knowledge>=FARM_PLOTS[n-1].knowledge,'plot '+(n+1));
 // The Mole Family automations ride the same rows; carried for provenance, unimplemented.
 assert.deepEqual(FARM_PLOTS.map(p=>p.autoTakecare?1:0),[0,0,1,1,1,1,1,1,1,1,1,1]);
 assert.deepEqual(FARM_PLOTS.map(p=>p.oneclickSow?1:0),[0,0,0,0,0,0,0,0,1,1,1,1]);
});

test('reclaiming spends the table Knowledge and stops at twelve',()=>{
 let s=run(fresh(1000),'openFarm');assert.equal(s.farm.plots.length,1);
 assert.match(act(s,'expandFarm',1000).error,/100 Knowledge/);
 s={...s,farm:{...s.farm,knowledge:37000}};
 for(let n=1;n<12;n++){const before=s.farm.knowledge,cost=farmPlotCost(s.farm.plots.length);s=run(s,'expandFarm');assert.equal(s.farm.knowledge,before-cost+10,'plot '+(n+1));}
 assert.equal(s.farm.plots.length,12);
 assert.match(act(s,'expandFarm',1000).error,/All 12 plots are open/);
 assert.equal(s.farm.knowledge,37000-37000+110,'11 reclaims at +10 Knowledge each, and the ladder totals 37,000');
});

test('the ladder is earned from the harvest record, spends nothing, and terminates',()=>{
 let s=run(fresh(1000),'openFarm');
 assert.equal(farmPlantLevel(s.farm,'Plant1'),1,'every plant starts at level 1');
 assert.equal(farmUpgradeCost(s.farm,'Plant1'),30);
 assert.match(act(s,'upgradePlant',1000,'Plant1').error,/Harvest 30 more/,'the ladder is not free');
 assert.match(act(s,'upgradePlant',1000,'NoSuchPlant').error,/known plant/);
 // Knowledge is NOT the resource: a rich farm with no harvest record still cannot climb.
 assert.match(act({...s,farm:{...s.farm,knowledge:1e6}},'upgradePlant',1000,'Plant1').error,/Harvest 30 more/);
 s={...s,farm:{...s.farm,knowledge:500,records:{Plant1:5030}}};
 s=run(s,'upgradePlant','Plant1');assert.equal(s.farm.knowledge,500,'nothing is deducted');
 s=run(s,'upgradePlant','Plant1');assert.equal(s.farm.knowledge,500);
 assert.equal(farmPlantLevel(s.farm,'Plant1'),3);
 assert.match(act(s,'upgradePlant',1000,'Plant1').error,/highest/);
 assert.deepEqual([farmHarvestPlan('Plant1',1).seconds,farmHarvestPlan('Plant1',3).seconds],[180,7200]);
 s=run(s,'sowFarm',0,'Plant1');assert.equal(s.farm.plots[0].harvestLevel,3);assert.equal(s.farm.plots[0].readyAt,7201000);
 assert.equal(farmPlantLevel(s.farm,'Plant2'),1);
 assert.deepEqual(decode(JSON.stringify(s)),s,'plantLevels and records survive a save round trip');
});

test('the harvest record is a lifetime tally that spending the stock cannot undo',()=>{
 let s=run(fresh(1000),'openFarm');s=run(s,'sowFarm',0,'Plant1');
 s=run({...s,lastAt:181000},'harvestFarm',0,null,181000);
 assert.equal(s.farm.harvests.Plant1,10);assert.equal(s.farm.records.Plant1,10);
 // Emptying the sellable stock leaves the record standing -- that is the whole point of recordCount.
 const spent={...s,farm:{...s.farm,harvests:{Plant1:0}}};
 assert.ok(valid(spent));assert.equal(farmPlantRecord(spent.farm,'Plant1'),10);
 // A save written before the counter existed falls back to the stock on hand: a LOWER bound, so it
 // can only under-credit, never grant a level the player never earned.
 const legacy={...s,farm:{...s.farm,harvests:{Plant1:25}}};delete legacy.farm.records;
 assert.ok(valid(legacy));assert.equal(farmPlantRecord(legacy.farm,'Plant1'),25);
 assert.match(act(legacy,'upgradePlant',1000,'Plant1').error,/Harvest 5 more/);
});

test('a save cannot carry a plant level or record it never earned',()=>{
 const s=run(fresh(1000),'openFarm');
 for(const bad of [{Plant1:0},{Plant1:4},{Plant1:'3'},{Plant1:2.5},{NoSuchPlant:2}]){
  const broken={...s,farm:{...s.farm,plantLevels:bad}};
  assert.equal(valid(broken),false,JSON.stringify(bad));
  assert.throws(()=>decode(JSON.stringify(broken)),/Invalid Magic Farm/);
 }
 for(const bad of [{Plant1:-1},{Plant1:'10'},{Plant1:1.5},{NoSuchPlant:10}]){
  const broken={...s,farm:{...s.farm,records:bad}};
  assert.equal(valid(broken),false,'records '+JSON.stringify(bad));
  assert.throws(()=>decode(JSON.stringify(broken)),/Invalid Magic Farm/);
 }
 for(const bad of [[],'2',null]){
  assert.equal(valid({...s,farm:{...s.farm,plantLevels:bad}}),false,JSON.stringify(bad));
  assert.equal(valid({...s,farm:{...s.farm,records:bad}}),false,'records '+JSON.stringify(bad));
 }
 // Legitimate values pass, so the guards reject the value and not the field itself.
 assert.ok(valid({...s,farm:{...s.farm,plantLevels:{Plant1:2,[FARM_UPGRADES[38].id]:3},records:{Plant1:5030}}}));
 const legacy={...s,farm:{...s.farm}};delete legacy.farm.plantLevels;delete legacy.farm.records;
 assert.ok(valid(legacy));assert.equal(farmPlantLevel(legacy.farm,'Plant1'),1);assert.equal(farmPlantRecord(legacy.farm,'Plant1'),0);
});

test('the per-type rise sums obtained plants at their own level, and is not yet spent anywhere',()=>{
 // C10-02: the original's GetAllPlantCityRise(country) loops every plant config of that country and
 // ADDS GetPlantCityRise at each plant's current level; GetPlantlevel returns 0 for a plant never
 // obtained, which has no PlantUpgrade row and so contributes nothing. NOTHING READS farmTypeRise --
 // if a future change wires it into businessBonus, this test is what must be rewritten deliberately.
 let s=run(fresh(1000),'openFarm');
 assert.deepEqual(farmPlantRise(s.farm,'Plant1'),{type:'Inspiring',level:1,percent:25});
 assert.deepEqual(farmPlantRise(s.farm,'Plant2'),{type:'Unfettered',level:1,percent:50});
 assert.equal(farmPlantRise(s.farm,'NoSuchPlant'),null);
 for(const t of TYPES)assert.equal(farmTypeRise(s.farm,t),0,'a farm that has harvested nothing adds nothing');
 s={...s,farm:{...s.farm,records:{Plant1:30}}};
 assert.equal(farmTypeRise(s.farm,'Inspiring'),25,'one obtained Inspiring plant at level 1');
 assert.equal(farmTypeRise(s.farm,'Unfettered'),0,'an unobtained plant of another type adds nothing');
 s=run(s,'upgradePlant','Plant1');
 assert.equal(farmTypeRise(s.farm,'Inspiring'),50,'the same plant at level 2');
 // Plant5 is the next Inspiring plant (country 1); its level-1 risePercent is 5000, so +50%.
 s={...s,farm:{...s.farm,records:{...s.farm.records,Plant5:10}}};
 assert.equal(farmPlantRise(s.farm,'Plant5').type,'Inspiring');
 assert.equal(farmTypeRise(s.farm,'Inspiring'),100,'a second Inspiring plant ADDS, not replaces');
 assert.equal(farmTypeRise(s.farm,'Diligent'),0,'Plant4 is Diligent and was never obtained');
});
