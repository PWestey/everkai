import supply from './familiar-supply-data.json' with {type:'json'};
import tower from './familiar-tower-data.json' with {type:'json'};
import data from './familiar-data.json' with {type:'json'};
import benefit from './familiar-benefit-data.json' with {type:'json'};
// Familiar training is paid for with the original's two items (scripts/import-familiar-supplies.py):
// level-up items per PetLevel.Cost and class-up items per PetClass.Cost when a level crosses into the
// next stage. Both come from the Familiar Tower's hourly income, which holds 24 hours uncollected.
// The tower field is read directly rather than imported, because familiar-tower.mjs imports familiars.mjs.
export const FAMILIAR_ITEMS=supply.items,SUPPLY_HOLD_MS=supply.holdHours*3600e3;
// THE PASS BENEFITS, RE-GATED ONTO PLAY (docs/familiar-screen-specs/12-monetisation.md §5.2, approved
// by the owner 2026-09-24). Everkai has no Pass and cannot sell anything, but three of the four things
// the Pass sold are good progression rewards and the original already staged them -- Pass levels 1, 15
// and 30, from `System.PetBPRightShow`. The MAGNITUDES and the ORDER are the original's; the LADDERS
// they hang off are Everkai's and are marked as such in the imported `gates` block.
//
// The fourth (a Fellow at Pass Lv. 50) is skipped: a roster decision, not a familiar one.
//
// THE BASE VALUES REMAIN THE DEFAULT. `img/hub.png` reads 50/50 and `img/tower-earnings.png` reads
// 48:00:00 because that save carried the Pass; treating either as a base rule would make Everkai
// permanently generous against the original.
export const BENEFITS=benefit;
const compendiumLevel=s=>Math.floor((s.familiarHandbook?.exp||0)/100);
/** Which of the three benefits this village has earned. Reads the save directly rather than importing
 *  familiar-handbook.mjs, which imports familiars.mjs, which imports this module. */
export function familiarBenefits(s){
 // `towerReachOf`, not `towerFloorOf`: the HIGHEST floor this village has ever reached. The tower redo
 // resets `cleared` to 0 while keeping `redoFrom`, and every other floor-gated unlock on this surface
 // (dispatch areas, exploring areas) already stays open by reach. Reading `cleared` here would have
 // taken the benefit away from a redone save and, worse, flickered it on mid-migration -- caught by
 // tests/familiar-tower-redo.test.mjs against four real shipped saves.
 const g=benefit.gates,floor=towerReachOf(s),level=compendiumLevel(s);
 const met=x=>x.kind==='compendium'?level>=x.level:floor>=x.floor;
 return {stamina:met(g.stamina),income:met(g.income),mochi:met(g.mochi)};
}
/** Stamina's cap and its regeneration interval, base or boosted. */
export const staminaRule=s=>{const on=familiarBenefits(s).stamina;const b=on?benefit.boosted:benefit.base;
 return {max:b.staminaMax,seconds:b.staminaSeconds,ms:b.staminaSeconds*1000,boosted:on};};
/** How long uncollected tower income keeps accruing. */
export const supplyHoldMs=s=>(familiarBenefits(s).income?benefit.boosted:benefit.base).holdHours*3600e3;
// The original names these two items on its own Tower Earning Rewards panel (09-tower.md 7).
// "level-up items" / "class-up items" are Everkai's field names leaking into the UI (D-TOWER-14).
export const FAMILIAR_ITEM_NAMES={levelUp:'Magical Fruit',classUp:'Familiar Crystal',
 Item_PetLevelUP:'Magical Fruit',Item_PetClassUP:'Familiar Crystal',
 Item_PetCatch2:'Advanced Contract',Item_PetPacify1:'Ordinary Mochi'};
const H=3600e3;
export const familiarSupplies=s=>s.familiarSupplies||{levelUp:0,classUp:0,since:null};
/** The ORIGINAL floor a save has cleared. The 12-floor sandbox tower (policyVersion 1) paid original
 *  floor 25n's income at local floor n, so a legacy save reads as 25n here -- exactly the rate it was
 *  already earning, so no hour is paid differently. Policy 2 stores the original floor itself. */
export const towerFloorOf=s=>{const t=s.familiarTower;if(!t)return 0;return t.policyVersion===1?25*(t.cleared||0):t.cleared||0;};
/** PetTower.Income of a floor, per hour (lib/familiar-tower-data.json, all 300 rows). */
export const floorIncome=floor=>floor?{levelUp:tower.floors[floor-1].income[0],classUp:tower.floors[floor-1].income[1]}:{levelUp:0,classUp:0};
/** Highest floor ever REACHED, for unlocks only (dispatch areas, exploring areas). The 2026-09-16 redo resets a
 *  sandbox-migrated tower to floor 0 so its one-time rewards can be earned, and keeps the floor it had reached
 *  as `redoFrom`: nothing the player had opened is shut again, and a run or area already in use stays valid. */
export const towerReachOf=s=>Math.max(towerFloorOf(s),s.familiarTower?.policyVersion===3?(s.familiarTower.redoFrom||0):0);
/** Endless Mode: the band row whose StageRange holds a floor. */
export const endlessBand=floor=>tower.endless.bands.find(b=>floor>=b.from&&floor<=b.to)||null;
export const endlessFloorOf=s=>s.familiarTower?.policyVersion===3?(s.familiarTower.endless?.cleared||0):0;
/** PetManager.lua GetPetTowerIncome: the normal floor's Income PLUS the highest cleared endless band's Income. */
/** The hourly pair. `Item_PetBP_IncomeMax` adds PetTowerIncomeBPCoef (1000 bp = +10%) once earned;
 *  the earned coefficient is applied to the SUM, after the endless band, because that is the order
 *  PetManager.lua GetPetTowerIncome composes them in. */
export const towerIncome=s=>{
 const base=floorIncome(towerFloorOf(s)),e=endlessFloorOf(s),band=e?endlessBand(e):null;
 const raw=band?{levelUp:base.levelUp+band.income[0],classUp:base.classUp+band.income[1]}:base;
 return incomeBoost(s,raw);
};
/** The earned coefficient, applied to any hourly pair. Exported because a PREVIEW of a future floor's
 *  rate has to pass through the same multiplier -- comparing a boosted rate against a raw one made the
 *  Earnings modal print `163 » 150`, a rise rendered as a fall. */
export const incomeBoost=(s,raw)=>{
 const bp=familiarBenefits(s).income?benefit.boosted.incomeBP:benefit.base.incomeBP;
 return bp?{levelUp:Math.floor(raw.levelUp*(10000+bp)/10000),classUp:Math.floor(raw.classUp*(10000+bp)/10000)}:raw;
};
export function suppliesWaiting(s,now=s.lastAt){const f=familiarSupplies(s);if(f.since===null)return {levelUp:0,classUp:0,hours:0};const hours=Math.floor(Math.min(supplyHoldMs(s),Math.max(0,now-f.since))/H),r=towerIncome(s);return {levelUp:hours*r.levelUp,classUp:hours*r.classUp,hours};}
/** Credit the whole hours waiting and restart the clock; the partial hour carries over unless held full. */
export function settleSupplies(s,now=s.lastAt){const f=familiarSupplies(s);if(f.since===null)return s;const w=suppliesWaiting(s,now),held=now-f.since>=supplyHoldMs(s);return {...s,familiarSupplies:{levelUp:f.levelUp+w.levelUp,classUp:f.classUp+w.classUp,since:held?now:f.since+w.hours*H}};}
export const startSupplies=(s,now=s.lastAt)=>familiarSupplies(s).since===null?{...s,familiarSupplies:{...familiarSupplies(s),since:now}}:settleSupplies(s,now);
export const stageOf=level=>Math.floor(level/50)+1;
/** Items to raise a familiar from `from` to `to`, including each stage's class-up. */
export function trainingCost(from,to){let levelUp=0,classUp=0;for(let l=from+1;l<=to;l++){levelUp+=data.levels[l]?.Cost||0;if(stageOf(l)>stageOf(l-1))classUp+=data.classes[stageOf(l)].Cost;}return {levelUp,classUp};}
export const starCost=stars=>data.stars[stars+1]?.Cost??null;
export function validFamiliarSupplies(s){if(s.familiarSupplies===undefined)return true;const f=s.familiarSupplies,int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;return !!f&&typeof f==='object'&&!Array.isArray(f)&&Object.keys(f).length===3&&int(f.levelUp,1e12)&&int(f.classUp,1e12)&&(f.since===null||int(f.since,Number.MAX_SAFE_INTEGER)&&f.since<=s.lastAt);}
export function supplyAction(s,action){if(action!=='collectFamiliarSupplies')return null;const w=suppliesWaiting(s);if(!w.levelUp&&!w.classUp)return {state:s,error:familiarSupplies(s).since===null?'Clear Familiar Tower floor 1 to start its income.':'Nothing to collect yet. The tower pays each full hour.'};const next=settleSupplies(s),f=familiarSupplies(next);if(f.levelUp>1e12||f.classUp>1e12)return {state:s,error:'Familiar item storage is full. Train a familiar first.'};return {state:next,message:`Collected ${w.levelUp.toLocaleString()} level-up and ${w.classUp.toLocaleString()} class-up items.`};}
