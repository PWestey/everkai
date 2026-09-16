// Coverage guard for lib/farm-upgrade-data.json -- the original's SimGame3PlantUpgrade upgradeCost
// and risePercent, SimGame3Plant.country (the affected business type) and SimGame3Farmland's plots.
// MEASURED 2026-09-15 against the full 1,499-table config set:
//   upgradeCost present on 39 level-1 and 39 level-2 rows, absent on all 39 level-3 rows (terminal)
//   level 1->2 costs 30..110, level 2->3 costs 2,000..5,000
//   risePercent 2500..20000 (hundredths of a percent), 117/117 equal to farm-level-data effectText
//   country 1..5 -> Inspiring/Diligent/Brave/Informed/Unfettered, 39/39 equal to that effectText
//   SimGame3Farmland: 40 plots, 3 free, then 500 rising by 500 to 10,000 then flat -- 275,000 total
import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {FARM_PLANTS,FARM_UPGRADES,FARM_PLOTS,FARM_MAX_PLOTS,FARM_BASE_PLOTS,farmPlotCost,farmPlantLevel,farmUpgradeCost,farmPlantRise,farmHarvestPlan} from '../lib/farm.mjs';
import levels from '../lib/farm-level-data.json' with {type:'json'};
const run=(s,a,t=null,v=null,now=1000)=>{const r=act(s,a,now,t,v);assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state;};
const TYPES=['Inspiring','Diligent','Brave','Informed','Unfettered'];

test('the upgrade table covers every plant at every level, and only level 3 is free of a cost',()=>{
 assert.equal(FARM_UPGRADES.length,39);
 assert.deepEqual(FARM_UPGRADES.map(p=>p.id),FARM_PLANTS.map(p=>p.id),'same 39 plants, same order, as farm-data');
 const cost=l=>FARM_UPGRADES.map(p=>p.levels[l-1].upgradeCost);
 assert.equal(cost(1).filter(c=>c!==undefined).length,39);
 assert.equal(cost(2).filter(c=>c!==undefined).length,39);
 assert.equal(cost(3).filter(c=>c!==undefined).length,0,'level 3 is terminal: SimGame3PlantUpgrade carries no upgradeCost on any level-3 row');
 assert.equal(Math.min(...cost(1)),30);assert.equal(Math.max(...cost(1)),110);
 assert.equal(Math.min(...cost(2)),2000);assert.equal(Math.max(...cost(2)),5000);
 for(const p of FARM_UPGRADES){
  assert.ok(TYPES.includes(p.type),p.id);
  assert.deepEqual(p.levels.map(l=>l.level),[1,2,3]);
  // risePercent is hundredths of a percent and rises with the level, never flat or falling.
  assert.ok(p.levels[0].risePercent<p.levels[1].risePercent&&p.levels[1].risePercent<p.levels[2].risePercent,p.id);
  // Both halves of this comparison are the ORIGINAL's: risePercent from SimGame3PlantUpgrade,
  // the percent and type in effectText from the wiki scrape already verified 117/117 against it.
  const wiki=levels.plants.find(w=>w.id===p.id).levels;
  for(const l of p.levels){
   const m=/^All (.+) Building Earnings \+(\d+)%/.exec(wiki[l.level-1].effectText);
   assert.equal(m[1],p.type,p.id);assert.equal(Number(m[2])*100,l.risePercent,p.id+' L'+l.level);
  }
 }
});

test('the plot table is the original 40, three free, in crystals',()=>{
 assert.equal(FARM_MAX_PLOTS,40);assert.equal(FARM_BASE_PLOTS,3);
 assert.deepEqual(FARM_PLOTS.map(p=>p.plot),Array.from({length:40},(_,n)=>n+1));
 assert.deepEqual(FARM_PLOTS.slice(0,3).map(p=>p.crystals),[0,0,0]);
 assert.ok(FARM_PLOTS.slice(0,3).every(p=>p.baseUnlock)&&FARM_PLOTS.slice(3).every(p=>!p.baseUnlock));
 assert.equal(farmPlotCost(3),500,'the fourth plot');
 assert.equal(farmPlotCost(22),10000,'the ladder tops out at plot 23');
 assert.equal(farmPlotCost(39),10000,'and stays flat to plot 40');
 assert.equal(farmPlotCost(40),null,'no forty-first plot');
 assert.equal(FARM_PLOTS.reduce((n,p)=>n+p.crystals,0),275000);
 // Monotonic, never a cheaper plot later on.
 for(let n=1;n<40;n++)assert.ok(FARM_PLOTS[n].crystals>=FARM_PLOTS[n-1].crystals,'plot '+(n+1));
});

test('the ladder is charged, terminates, and moves the crop schedule it sells',()=>{
 let s=run(fresh(1000),'openFarm');
 assert.equal(farmPlantLevel(s.farm,'Plant1'),1,'every plant starts at level 1');
 assert.equal(farmUpgradeCost(s.farm,'Plant1'),30);
 assert.match(act(s,'upgradePlant',1000,'Plant1').error,/30 Knowledge/,'the ladder is not free');
 assert.match(act(s,'upgradePlant',1000,'NoSuchPlant').error,/known plant/);
 s={...s,farm:{...s.farm,knowledge:5030}};
 s=run(s,'upgradePlant','Plant1');assert.equal(s.farm.knowledge,5000);
 s=run(s,'upgradePlant','Plant1');assert.equal(s.farm.knowledge,0);
 assert.equal(farmPlantLevel(s.farm,'Plant1'),3);
 assert.match(act(s,'upgradePlant',1000,'Plant1').error,/highest/);
 // The bought level is what the plot actually grows on -- Plant1 L1 is 180s/10, L3 is 7200s/100.
 assert.deepEqual([farmHarvestPlan('Plant1',1).seconds,farmHarvestPlan('Plant1',3).seconds],[180,7200]);
 s=run(s,'sowFarm',0,'Plant1');assert.equal(s.farm.plots[0].harvestLevel,3);assert.equal(s.farm.plots[0].readyAt,7201000);
 // A plant nobody bought is still level 1, and cannot be sown above it.
 assert.equal(farmPlantLevel(s.farm,'Plant2'),1);
 assert.match(act(s,'sowFarm',1000,1,{plant:'Plant2',level:2}).error,/Upgrade this plant/);
 assert.deepEqual(decode(JSON.stringify(s)),s,'plantLevels survives a save round trip');
});

test('a save cannot carry a plant level it never bought a row for',()=>{
 const s=run(fresh(1000),'openFarm');
 for(const bad of [{Plant1:0},{Plant1:4},{Plant1:'3'},{Plant1:2.5},{NoSuchPlant:2}]){
  const broken={...s,farm:{...s.farm,plantLevels:bad}};
  assert.equal(valid(broken),false,JSON.stringify(bad));
  assert.throws(()=>decode(JSON.stringify(broken)),/Invalid Magic Farm/);
 }
 for(const bad of [[],'2',null]){
  const broken={...s,farm:{...s.farm,plantLevels:bad}};
  assert.equal(valid(broken),false,JSON.stringify(bad));
 }
 // A legitimate value passes, so the guard above is rejecting the level and not the field itself.
 assert.ok(valid({...s,farm:{...s.farm,plantLevels:{Plant1:2,[FARM_UPGRADES[38].id]:3}}}));
 // And a save with no plantLevels at all -- every save written before the ladder was charged.
 const legacy={...s,farm:{...s.farm}};delete legacy.farm.plantLevels;
 assert.ok(valid(legacy));assert.equal(farmPlantLevel(legacy.farm,'Plant1'),1);
});

test('the per-type rise is reported from the table and is not yet spent anywhere',()=>{
 // C10-02: risePercent is measured and surfaced, but NOTHING adds it to income. If a future change
 // wires it into businessBonus, this assertion is the one that must be rewritten deliberately.
 let s=run(fresh(1000),'openFarm');
 assert.deepEqual(farmPlantRise(s.farm,'Plant1'),{type:'Inspiring',level:1,percent:25});
 s={...s,farm:{...s.farm,knowledge:30}};s=run(s,'upgradePlant','Plant1');
 assert.deepEqual(farmPlantRise(s.farm,'Plant1'),{type:'Inspiring',level:2,percent:50});
 assert.equal(farmPlantRise(s.farm,'NoSuchPlant'),null);
 assert.deepEqual(farmPlantRise(s.farm,'Plant2'),{type:'Unfettered',level:1,percent:50});
});
