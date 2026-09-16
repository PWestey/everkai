import levels from './farm-level-data.json' with {type:'json'};
import {validFarmTrade,farmTradeAction} from './farm-trade.mjs';
import data from './farm-data.json' with {type:'json'};
import farmYieldData from './farm-yield-data.json' with {type:'json'};
import upgradeData from './farm-upgrade-data.json' with {type:'json'};
export const FARM_PLANTS=data.plants;
const plants=new Map(FARM_PLANTS.map(p=>[p.id,p]));
export const farmPlant=id=>plants.get(id);
const int=n=>Number.isInteger(n)&&n>=0&&n<=1e9;
export function farmHarvestPlan(id,level=1){const p=plants.get(id),r=levels.plants.find(p=>p.id===id)?.levels.find(r=>r.level===level);return p&&r&&r.seconds>0&&r.amount>0?{...p,seconds:r.seconds,amount:r.amount}:null;}
export const farmGrowthKnowledge=p=>Math.floor(p.seconds/60)*2;
/** The Magic Tree ladder: 201 levels, +5% village earnings each, from the original's SimGame3Yield. */
export const FARM_YIELD=farmYieldData.levels;
export const farmYieldLevel=f=>f?.yieldLevel||0;
/** What the Magic Tree adds to every business, as a fraction. One of the strands in businessBonus. */
export const farmYieldBonus=s=>FARM_YIELD[farmYieldLevel(s?.farm)].percent/100;
/** The original's per-plant harvest-level ladder: SimGame3PlantUpgrade, plus the affected business
 *  type (SimGame3Plant.country 1-5) and SimGame3Field's 12 plots. The level-N row states the step
 *  from N to N+1, so level 3 -- terminal -- carries none. */
export const FARM_UPGRADES=upgradeData.plants;
const upgrades=new Map(FARM_UPGRADES.map(p=>[p.id,p]));
/** SimGame3Field: 12 plots. Plot 1 is isDefaultUnlock; the other eleven cost Knowledge (consume).
 *  NOT SimGame3Farmland -- that 40-row, Diamond-priced table is a different system. The client's
 *  ReqOpenField updates knowledgeScore and logs gain_know from="reclamation". */
export const FARM_PLOTS=upgradeData.plots;
export const FARM_MAX_PLOTS=FARM_PLOTS.length;
export const FARM_BASE_PLOTS=FARM_PLOTS.filter(p=>p.baseUnlock).length;
/** Knowledge for the next plot once `count` are open, or null when all twelve are. */
export const farmPlotCost=count=>count>=FARM_MAX_PLOTS?null:FARM_PLOTS[count].knowledge;
/** A plant's permanently unlocked harvest level. Saves written before the ladder existed have no
 *  plantLevels at all, which reads as level 1 -- the original's starting level for every plant. */
export const farmPlantLevel=(f,id)=>f?.plantLevels?.[id]??1;
/** How many TIMES this plant has been grown to harvest -- the original's plants[id].recordCount.
 *  A count of growings, not of crop units: the original's own failure toast SG3PlantUpTips reads
 *  "accumulated number of times planted is insufficient" (cn 累积种植的次数不足, jp 植物を植えた回数
 *  が足りません), and its progress label SG3PlantRecord is cn 累计种出 / jp 累計成果. Saves written
 *  before this counter existed read as 0: crop units in store cannot be converted into a number of
 *  growings, and guessing would over-credit, so those players simply start the tally now. */
export const farmPlantRecord=(f,id)=>f?.records?.[id]??0;
/** How many growings of this plant its next level needs, or null at the terminal level 3. This is a
 *  REQUIREMENT, not a price: the original compares it against recordCount (the lifetime record)
 *  rather than count (the spendable stock), so reaching it spends nothing. */
export function farmUpgradeCost(f,id){const row=upgrades.get(id)?.levels[farmPlantLevel(f,id)-1];return row?.growthsRequired??null;}
/** The table's own effect for a plant at its current level: which business type it raises, and by
 *  how much (risePercent is hundredths of a percent, so 2500 is +25%). */
export function farmPlantRise(f,id){const p=upgrades.get(id);if(!p)return null;const level=farmPlantLevel(f,id);return {type:p.type,level,percent:p.levels[level-1].risePercent/100};}
/** What every obtained plant of one business type adds together, as a percent. The original sums it:
 *  GetAllPlantCityRise(country) loops every plant config of that country and adds GetPlantCityRise at
 *  each plant's CURRENT level, and GetPlantlevel returns 0 for a plant the player has never obtained
 *  (no PlantUpgrade row exists at level 0, so it contributes nothing). Everkai's stand-in for
 *  "obtained" is a harvest record. NOTHING READS THIS YET -- see C10-02: the one consumer would be
 *  businessBonus() in lib/businesses.mjs, which was outside this change's scope. */
export function farmTypeRise(f,type){return FARM_UPGRADES.reduce((sum,p)=>p.type!==type||farmPlantRecord(f,p.id)<=0?sum:sum+p.levels[farmPlantLevel(f,p.id)-1].risePercent/100,0);}
export function validFarm(s){
 const f=s.farm;if(f===undefined)return true;
 if(!f||!validFarmTrade(f)||typeof f!=='object'||Array.isArray(f)||!int(f.knowledge)||!f.harvests||typeof f.harvests!=='object'||Array.isArray(f.harvests)||!Array.isArray(f.plots)||f.plots.length<1||f.plots.length>FARM_MAX_PLOTS)return false;
 if(f.yieldLevel!==undefined&&!(Number.isInteger(f.yieldLevel)&&f.yieldLevel>=0&&f.yieldLevel<FARM_YIELD.length))return false;
 if(f.plantLevels!==undefined&&(!f.plantLevels||typeof f.plantLevels!=='object'||Array.isArray(f.plantLevels)||!Object.entries(f.plantLevels).every(([id,n])=>upgrades.has(id)&&[1,2,3].includes(n))))return false;
 if(f.records!==undefined&&(!f.records||typeof f.records!=='object'||Array.isArray(f.records)||!Object.entries(f.records).every(([id,n])=>plants.has(id)&&int(n))))return false;
 if(!Object.entries(f.harvests).every(([id,n])=>plants.has(id)&&int(n)))return false;
 return f.plots.every(p=>p===null||(p&&plants.has(p.plant)&&(p.harvestLevel===undefined||[1,2,3].includes(p.harvestLevel))&&!!farmHarvestPlan(p.plant,p.harvestLevel??1)&&Number.isSafeInteger(p.readyAt)&&p.readyAt>=0&&typeof p.watered==='boolean'));
}
export function farmAction(s,action,target,value){
 const trade=farmTradeAction(s,action,target,value);if(trade)return trade;
 if(!['openFarm','sowFarm','waterFarm','harvestFarm','expandFarm','farmYieldUpgrade','upgradePlant'].includes(action))return null;
 const fail=error=>({state:s,error}),f=s.farm;
 if(action==='openFarm'){
  // SimGame3Field marks only plot 1 isDefaultUnlock, so a new farm opens with one free plot.
  if(f)return fail('Magic Farm is already open.');return {state:{...s,farm:{knowledge:0,harvests:{},plots:Array(FARM_BASE_PLOTS).fill(null)}},message:'Magic Farm opened. Choose your first plant.'};
 }
 if(!f)return fail('Open Magic Farm first.');const result=(farm,message)=>({state:{...s,farm},message});
 if(action==='expandFarm'){
  // SimGame3Field: plot 1 free, then consume 100/300/600/3000/3000/3000/3000/4000/5000/5000/10000
  // Knowledge -- 37,000 for all twelve. The old rule (six plots at plots*100) had the right currency
  // but invented the ladder and the cap. Reclaiming pays 10 Knowledge back, which is the original's
  // own rule text, not local policy: "Reclaiming the land, sowing seeds, and watering can earn 10".
  const cost=farmPlotCost(f.plots.length);
  if(cost===null)return fail(`All ${FARM_MAX_PLOTS} plots are open.`);
  if(f.knowledge<cost)return fail(`Reclaiming this plot needs ${cost.toLocaleString()} Knowledge.`);
  return result({...f,knowledge:Math.min(1e9,f.knowledge-cost+10),plots:[...f.plots,null]},
   `Plot ${f.plots.length+1} reclaimed for ${cost.toLocaleString()} Knowledge. +10 Knowledge.`);
 }
 if(action==='upgradePlant'){
  // The harvest level was a free pick at sow time; the original earns it once per plant, and earns
  // rather than buys it. GetPlantUpNoticeById tests "upgradeCost <= GetPlantRecordCount(plantId)" --
  // the number of TIMES that plant has been grown, not the spendable stock and not a currency. So
  // nothing is deducted here: growing the plant enough times is itself the qualification.
  const id=typeof target==='string'?target:null,row=upgrades.get(id);
  if(!row)return fail('Choose a known plant.');
  const level=farmPlantLevel(f,id),need=farmUpgradeCost(f,id),name=plants.get(id)?.name??id;
  if(need===null)return fail(`${name} is already at harvest level ${level}, its highest.`);
  const record=farmPlantRecord(f,id);
  if(record<need)return fail(`Grow ${name} ${(need-record).toLocaleString()} more times to reach harvest level ${level+1}.`);
  const next=level+1,plan=farmHarvestPlan(id,next);
  return result({...f,plantLevels:{...f.plantLevels,[id]:next}},
   `${name} reaches harvest level ${next} · ${plan.amount} per harvest in ${Math.round(plan.seconds/60)} minutes.`);
 }
 if(action==='farmYieldUpgrade'){
  // The Magic Tree: the original's farm NPC5 level, which adds buildingYieldPercent to every
  // building. Deterministic -- +5% a level, no rolls. actCore settles income before dispatch, so the
  // new rate never applies retroactively.
  const level=farmYieldLevel(f),row=FARM_YIELD[level];
  if(!row||row.consume===undefined)return fail('The Magic Tree is fully grown.');
  if(f.knowledge<row.consume)return fail(`The Magic Tree needs ${row.consume.toLocaleString()} Knowledge.`);
  return result({...f,knowledge:f.knowledge-row.consume,yieldLevel:level+1},
   `Magic Tree grown to level ${level+1} · +${FARM_YIELD[level+1].percent}% village earnings.`);
 }
 if(!Number.isInteger(target)||target<0||target>=f.plots.length)return fail('Choose an open plot.');const current=f.plots[target],plots=[...f.plots];
 if(action==='sowFarm'){
  // Harvest level is no longer chosen at sow time -- a plant grows at the level it has earned.
  // An explicit level is still accepted (old call sites, old UI) but only up to that level.
  const id=typeof value==='string'?value:value?.plant,unlocked=farmPlantLevel(f,id),level=typeof value==='string'||value?.level===undefined?unlocked:value.level,p=farmHarvestPlan(id,level);
  if(![1,2,3].includes(level))return fail('Choose a supported harvest level.');if(current)return fail('Harvest the current plant first.');if(!p)return fail('Choose a known plant.');
  if(level>unlocked)return fail(`Reach harvest level ${level} for this plant first.`);
  if(f.knowledge+10>1e9)return fail('Spend Knowledge before sowing.');
  plots[target]={plant:id,harvestLevel:level,readyAt:s.lastAt+p.seconds*1000,watered:false};return result({...f,plots,knowledge:f.knowledge+10},'Seeds sown. +10 Knowledge.');
 }
 if(!current)return fail('Sow this plot first.');const p=farmHarvestPlan(current.plant,current.harvestLevel??1);
 if(action==='waterFarm'){
  if(current.watered||current.readyAt<=s.lastAt)return fail('This plant no longer needs watering.');if(f.knowledge+10>1e9)return fail('Spend Knowledge first.');
  plots[target]={...current,watered:true};return result({...f,plots,knowledge:f.knowledge+10},'Plant watered. +10 Knowledge.');
 }
 // finishFarm ("Mature now · Free") is retired: a plant grows for its stated time, like every other timer.
 if(current.readyAt>s.lastAt)return fail('This plant is still growing.');const knowledge=farmGrowthKnowledge(p);
 if(f.knowledge+knowledge>1e9||(f.harvests[p.id]||0)+p.amount>1e9)return fail('Make room for the full harvest first.');
 // records is the original's plants[id].recordCount: how many TIMES this plant has been grown, which
 // is what the harvest-level ladder is measured against. One completed growing counts once, whatever
 // the yield -- 累计种出 / 累計成果. harvests stays the spendable stock, in crop units.
 const record=Math.min(1e9,farmPlantRecord(f,p.id)+1);
 plots[target]=null;return result({...f,plots,knowledge:f.knowledge+knowledge,harvests:{...f.harvests,[p.id]:(f.harvests[p.id]||0)+p.amount},records:{...f.records,[p.id]:record}},`${p.amount} ${p.name} harvested. +${knowledge} Knowledge.`);
}
