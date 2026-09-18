import {recordStaff,staffingStatus,staffingAction,staffPrice,validStaffing,validStaffingReserve,
        defaultQualityBonus,defaultStaffCap,enterpriseQuality,FREE_CAP} from './staffing.mjs';
import sourceYield from './employee-yield-data.json' with {type:'json'};
import {originalProgression} from './original-progression.mjs';
import {innGiftEmployeePercent} from './inn-guests.mjs';
import {fishingEmployeeBonus} from './fishing.mjs';
import data from './business-data.json' with {type:'json'};
import {assignedOperation} from './operations.mjs';
import {fathomBonus} from './fathoms.mjs';
import {farmYieldBonus} from './farm.mjs';
import {bondedPower} from './adventure.mjs';
import {fellowById} from './catalog.mjs';
export const BUSINESSES=data.records;
// A business employs only Fellows of its own type (isekai.wiki/Village: 'Each building has a designated
// type ... that determines which Fellows can work there'), except the two the wiki names as working
// anywhere: Mammon (shown as Maren, hero_193) and Adeline (hero_53). Everkai allowed anyone anywhere.
// hero_193 was deleted in the owner's 2026-09-17 roster trim, so only Adeline is left with the
// privilege. Nothing else moves: every business already has 20+ eligible Fellows of its own type
// (tests/businesses.test.mjs pins that floor), so no building lost its workforce with her.
export const ANY_BUILDING_FELLOWS=new Set(['hero_53']);
export const canOperate=(fellowId,definition)=>ANY_BUILDING_FELLOWS.has(fellowId)||(!!definition?.type&&fellowById(fellowId)?.type===definition.type);
/** The FREE-grant ceiling, unchanged: hire cards (lib/hire-cards.mjs) and opening rewards
 *  (lib/opening.mjs) grant into it, and neither pays the original's price, so neither may pass it.
 *  It is NOT the original's hiring ceiling -- that is BuildingQuality.levelLimit, 1,000 to 26,000
 *  across the 26 quality tiers, which lib/staffing-data.json already matched row-for-row (BUG-35,
 *  re-verified 2026-09-15). Paid hiring now reads that ladder through defaultStaffCap. */
export const employeeCap=FREE_CAP;
// One quote shared by the action and every hire button. The two used to compute the ceiling apart, and
// they disagreed: once paid progression is open a [kind 1] event is only valid while
// n<=staffingRule(id,quality).cap, so bounding by employeeCap minted states validStaffing rejects
// (999 workers at quality 1 plus a batch of 50 => 1,049, valid:false).
export function hireQuote(s,id,n){
 const b=s.enterprises?.[id];if(!b)return {count:0,price:0,ceiling:employeeCap};
 const status=staffingStatus(id,b),ceiling=status?status.cap:defaultStaffCap(id,b);
 const count=Math.max(0,Math.min(n,ceiling-b.employees)),price=count?staffPrice(id,b.employees,count):0;
 return {count,price,ceiling,affordable:!!count&&Number.isSafeInteger(price)&&s.gold>=price};
}
export const sourceEmployeeYield=id=>sourceYield.rates[id];
export function addStaff(s,id,b,count,free=true){const retained=originalProgression(s)?{staffingYield:b.staffingYield||{policyVersion:1,retainedEmployees:b.employees,retainedRate:BUSINESSES.find(d=>d.id===id).employeeRate}}:{};const next={...b,...retained,employees:b.employees+count};return free?recordStaff(next,count):next;}
export function employeeCohorts(s,id){const b=s.enterprises?.[id],d=BUSINESSES.find(x=>x.id===id);if(!b||!d)return null;const h=b.staffingYield;return {retained:h?.retainedEmployees??b.employees,retainedRate:h?.retainedRate??d.employeeRate,source:h?b.employees-h.retainedEmployees:0,sourceRate:sourceEmployeeYield(id)};}

// Opening a business used to be free, which left the whole ladder open on a fresh save. The original
// prices every one of them: BuildingBase rows carry a `consume` entry, and item id 3 is Gold. These
// are its own numbers, not ours -- 50 for the Inn up to 75,000,000,000 for the last building -- so
// the ladder paces itself as village income grows. The original also gated buildings behind campaign
// land (cityLandId/order); that is deliberately not copied yet, because the campaign stops at
// chapter 6 and gating on it would strand buildings behind content that does not exist.
/** What the original charges in gold to open a business, or null when it records no price. */
export const businessCost=id=>{const row=BUSINESSES.find(b=>b.id===id);return Number.isInteger(row?.cost)?row.cost:null};
export const operationSlots=employees=>data.slotThresholds.filter(n=>employees>=n).length;
export const enterpriseState=s=>s.enterprises||{};
/** BUG-19 save migration. lib/business-data.json had the Museum and Clinic per-worker rates
 *  transposed against the original's BuildingBase.yield.count. addStaff stamps
 *  staffingYield.retainedRate from BUSINESSES[].employeeRate at hire time, and validBusinesses below
 *  pins the stamp against that same table forever after -- so correcting the data makes every save
 *  that hired at either building under original progression fail valid(), and decode() throws
 *  "Invalid business workforce" for a live player who did nothing wrong.
 *
 *  Only those two ids are touched, and only when the stored rate is EXACTLY the other building's
 *  rate: that pair is the transposition's fingerprint. Every other value is carried through
 *  untouched so a genuinely corrupt save is still refused, rather than laundered past valid() --
 *  the same rule reconcileInventory states in lib/game.mjs:71. */
const TRANSPOSED_RATES={Building_901:50,Building_1401:20};
export function reconcileStaffingRates(enterprises){
 if(!enterprises||typeof enterprises!=='object'||Array.isArray(enterprises))return enterprises;
 let changed=false;
 const next=Object.fromEntries(Object.entries(enterprises).map(([id,b])=>{
  const stale=TRANSPOSED_RATES[id],h=b?.staffingYield;
  if(stale===undefined||!h||h.retainedRate!==stale)return [id,b];
  const corrected=BUSINESSES.find(d=>d.id===id)?.employeeRate;
  if(corrected===undefined||corrected===stale)return [id,b];
  changed=true;
  return [id,{...b,staffingYield:{...h,retainedRate:corrected}}];
 }));
 return changed?next:enterprises;
}
export function validBusinesses(s){
 if(!validStaffingReserve(s))return false;
 if(s.enterprises===undefined)return true;
 const rows=s.enterprises;if(!rows||typeof rows!=='object'||Array.isArray(rows))return false;
 const assigned=Object.values(s.buildings).map(b=>b.fellow).filter(Boolean);
 for(const [id,b] of Object.entries(rows)){
  if(!BUSINESSES.some(x=>x.id===id)||!b||!Number.isInteger(b.employees)||b.employees<0||b.employees>26000||!validStaffing(s,id,b)||!Array.isArray(b.fellows)||b.fellows.length>operationSlots(b.employees)||!b.fellows.every(f=>Object.hasOwn(s.fellows,f)))return false;
  const h=b.staffingYield;if(h!==undefined&&(!originalProgression(s)||!h||h.policyVersion!==1||!Number.isInteger(h.retainedEmployees)||h.retainedEmployees<0||h.retainedEmployees>b.employees||h.retainedRate!==BUSINESSES.find(d=>d.id===id).employeeRate))return false;
  assigned.push(...b.fellows);
 }
 return new Set(assigned).size===assigned.length;
}
/** The power term of the original's income formula, not a local approximation of one.
 *  SL1-01 states the original as `totalFellowPower * HeroConversionRate/10000`. MEASURED 2026-09-15:
 *  BuildingBase.HeroConversionRate is 10 on all seventeen non-Bank buildings (0 on the Bank, which
 *  earns nothing), so the original's divisor is 10000/10 = 1000 -- byte-for-byte the divisor below.
 *  The comment this replaces called it a "local divisor ... supported by independent player reports";
 *  it is a recovered original constant, and the two halves of that ratio are named above. */
export const rosterOperation=s=>Object.keys(s.fellows).reduce((sum,f)=>sum+bondedPower(s,f)/1000,0);
export const employeeRateFor=(s,definition)=>(definition.employeeRate+fishingEmployeeBonus(s,definition.type))*(1+innGiftEmployeePercent(s,definition.type)/100);
export function employeeIncome(s,d,b){const h=b.staffingYield;if(!h)return b.employees*employeeRateFor(s,d);const base=h.retainedEmployees*h.retainedRate+(b.employees-h.retainedEmployees)*sourceEmployeeYield(d.id);return (base+b.employees*fishingEmployeeBonus(s,d.type))*(1+innGiftEmployeePercent(s,d.type)/100);}
/** Every additive strand of one business's multiplier, in a single place.
 *  enterpriseBreakdown and enterpriseRate both compute income and must never drift apart, so both
 *  read this rather than assembling the stack inline. The original sums twelve strands here
 *  (docs/slice-buildings.md 5d); Everkai currently has two, and each new one is added once, here. */
export function businessBonus(s,id,b,definition){
 // SL1-04: the quality strand used to be `staffingStatus(...)?.bonus||0`, which is 0 in any save that
 // has not opted into APK growth -- i.e. the ladder existed and no default player could ever reach it.
 const quality=staffingStatus(id,b)?.bonus??defaultQualityBonus(id,b),family=fathomBonus(s,definition.type),farm=farmYieldBonus(s);
 return {quality,family,farm,total:assignedOperation(s,definition)+quality+family+farm};
}
export function enterpriseBreakdown(s,id){
 const b=enterpriseState(s)[id],definition=BUSINESSES.find(b=>b.id===id);
 if(!b||!definition)return {employees:0,operation:0,bonus:0,total:0};
 const employees=employeeIncome(s,definition,b);
 // The original's own HeroConversionRate divisor -- see rosterOperation.
 // Only explicitly sourced assigned skill percentages are modeled.
 const operation=rosterOperation(s);
 // Every strand is surfaced, not just quality: the panel shows this breakdown to the player, and a
 // bonus they cannot account for is worse than no breakdown at all. docs/slice-buildings.md 5d.
 const {quality:qualityBonus,family:familyBonus,farm:farmBonus,total:bonus}=businessBonus(s,id,b,definition);
 return {employees,operation,bonus,qualityBonus,familyBonus,farmBonus,total:(employees+operation)*(1+bonus)};
}
export function enterpriseRate(s){
 const rows=Object.entries(enterpriseState(s));if(!rows.length)return 0;
 const operation=rosterOperation(s);
 return rows.reduce((sum,[id,b])=>{const definition=BUSINESSES.find(d=>d.id===id);return sum+(definition?(employeeIncome(s,definition,b)+operation)*(1+businessBonus(s,id,b,definition).total):0)},0);
}
export function businessAction(s,action,target,value){
 const paid=staffingAction(s,action,target,value,addStaff);if(paid)return paid;
 if(!['openEnterprise','hireEmployees','assignOperator','removeOperator'].includes(action))return null;
 const fail=error=>({state:s,error}),definition=BUSINESSES.find(b=>b.id===target);
 if(!definition)return fail('Choose a known business.');
 const enterprises=enterpriseState(s),b=enterprises[target];
 if(action==='openEnterprise'){
  if(b)return fail('This business is already open.');
  const cost=businessCost(target);
  if(cost===null)return fail('No opening price is recorded for this business.');
  if(s.gold<cost)return fail(`${definition.name} costs ${cost.toLocaleString()} gold to open.`);
  return {state:{...s,gold:s.gold-cost,enterprises:{...enterprises,[target]:{employees:0,fellows:[]}}},message:`${definition.name} opened for ${cost.toLocaleString()} gold.`};
 }
 if(!b)return fail('Open the business first.');
 if(action==='hireEmployees'){
  // Employees cost the original's own price. staffPrice is the recovered curve, verified against the
  // live client: worker #2,000 of the Inn is 408,406,219, which its panel shows as "408.4M".
  if(![1,10,50,200,800,5000].includes(value))return fail('Choose a staffing amount.');
  const {count,price}=hireQuote(s,target,value);
  if(!count)return fail(staffingStatus(target,b)?'Business quality limit reached. Upgrade quality to hire more.':'Current employee limit reached.');
  if(!Number.isSafeInteger(price))return fail('That batch is larger than the ledger can price. Hire a smaller group.');
  if(s.gold<price)return fail(`${count.toLocaleString()} employees cost ${price.toLocaleString()} gold.`);
  return {state:{...s,gold:s.gold-price,enterprises:{...enterprises,[target]:recordStaff(addStaff(s,target,b,count,false),count,price)}},message:`${count.toLocaleString()} employees joined ${definition.name} for ${price.toLocaleString()} gold.`};
 }
 if(!Object.hasOwn(s.fellows,value))return fail('Recruit this Fellow first.');
 if(action==='removeOperator'){
  if(!b.fellows.includes(value))return fail('This Fellow is not assigned here.');
  return {state:{...s,enterprises:{...enterprises,[target]:{...b,fellows:b.fellows.filter(f=>f!==value)}}},message:'Fellow assignment cleared.'};
 }
 if(b.fellows.includes(value))return fail('Already operating this business.');
 if(!canOperate(value,definition))return fail(`Only ${definition.type} Fellows can work at ${definition.name}.`);
 if(b.fellows.length>=operationSlots(b.employees))return fail('Hire more employees to open the next Fellow slot.');
 const next=Object.fromEntries(Object.entries(enterprises).map(([id,row])=>[id,{...row,fellows:id===target?[...row.fellows,value]:row.fellows.filter(f=>f!==value)}]));
 const buildings=Object.fromEntries(Object.entries(s.buildings).map(([id,row])=>[id,{...row,fellow:row.fellow===value?null:row.fellow}]));
 return {state:{...s,buildings,enterprises:next},message:'Fellow moved to this business.'};
}
