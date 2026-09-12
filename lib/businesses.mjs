import {recordStaff,staffingStatus,staffingAction,validStaffing,validStaffingReserve} from './staffing.mjs';
import sourceYield from './employee-yield-data.json' with {type:'json'};
import {originalProgression} from './original-progression.mjs';
import {innGiftEmployeePercent} from './inn-guests.mjs';
import {fishingEmployeeBonus} from './fishing.mjs';
import data from './business-data.json' with {type:'json'};
import {assignedOperation} from './operations.mjs';
import {fathomBonus} from './fathoms.mjs';
import {farmYieldBonus} from './farm.mjs';
import {bondedPower} from './adventure.mjs';
export const BUSINESSES=data.records;
export const employeeCap=5000;
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
export const rosterOperation=s=>Object.keys(s.fellows).reduce((sum,f)=>sum+bondedPower(s,f)/1000,0);
export const employeeRateFor=(s,definition)=>(definition.employeeRate+fishingEmployeeBonus(s,definition.type))*(1+innGiftEmployeePercent(s,definition.type)/100);
export function employeeIncome(s,d,b){const h=b.staffingYield;if(!h)return b.employees*employeeRateFor(s,d);const base=h.retainedEmployees*h.retainedRate+(b.employees-h.retainedEmployees)*sourceEmployeeYield(d.id);return (base+b.employees*fishingEmployeeBonus(s,d.type))*(1+innGiftEmployeePercent(s,d.type)/100);}
/** Every additive strand of one business's multiplier, in a single place.
 *  enterpriseBreakdown and enterpriseRate both compute income and must never drift apart, so both
 *  read this rather than assembling the stack inline. The original sums twelve strands here
 *  (docs/slice-buildings.md 5d); Everkai currently has two, and each new one is added once, here. */
export function businessBonus(s,id,b,definition){
 const quality=staffingStatus(id,b)?.bonus||0,family=fathomBonus(s,definition.type),farm=farmYieldBonus(s);
 return {quality,family,farm,total:assignedOperation(s,definition)+quality+family+farm};
}
export function enterpriseBreakdown(s,id){
 const b=enterpriseState(s)[id],definition=BUSINESSES.find(b=>b.id===id);
 if(!b||!definition)return {employees:0,operation:0,bonus:0,total:0};
 const employees=employeeIncome(s,definition,b);
 // Local divisor and independent player reports support total roster Power.
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
  if(![1,10,50,200,800,5000].includes(value))return fail('Choose a staffing amount.');
  const count=Math.max(0,Math.min(value,employeeCap-b.employees));if(!count)return fail('Current employee limit reached.');
  return {state:{...s,enterprises:{...enterprises,[target]:addStaff(s,target,b,count)}},message:`Sandbox: ${count} employees joined ${definition.name}.`};
 }
 if(!Object.hasOwn(s.fellows,value))return fail('Recruit this Fellow first.');
 if(action==='removeOperator'){
  if(!b.fellows.includes(value))return fail('This Fellow is not assigned here.');
  return {state:{...s,enterprises:{...enterprises,[target]:{...b,fellows:b.fellows.filter(f=>f!==value)}}},message:'Fellow assignment cleared.'};
 }
 if(b.fellows.includes(value))return fail('Already operating this business.');
 if(b.fellows.length>=operationSlots(b.employees))return fail('Hire more employees to open the next Fellow slot.');
 const next=Object.fromEntries(Object.entries(enterprises).map(([id,row])=>[id,{...row,fellows:id===target?[...row.fellows,value]:row.fellows.filter(f=>f!==value)}]));
 const buildings=Object.fromEntries(Object.entries(s.buildings).map(([id,row])=>[id,{...row,fellow:row.fellow===value?null:row.fellow}]));
 return {state:{...s,buildings,enterprises:next},message:'Fellow moved to this business.'};
}
