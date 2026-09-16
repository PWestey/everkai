import data from './staffing-data.json' with {type:'json'};
import {originalProgression} from './original-progression.mjs';
import {habitDay} from './habits.mjs';
// ECON-02. The faucet granted a flat 100 per press with no clock of any kind: 969,191 materials --
// the quality ladder of all seventeen businesses -- was 9,692 presses in a single instant, well
// inside its own 1,000,000-claim ceiling. It is now one claim per calendar day.
//
// The grant rose 100 -> 1,000 because a gate without a rate makes a reachable system unreachable:
// at 100/day the full ladder is 9,692 days (26.6 years) and the Inn alone 259. At 1,000 the Inn is
// 26 days and all seventeen 970 (2.7 years) -- an idle arc rather than a button or a wall. One
// constant, deliberately easy to retune.
//
// NOT habit-gated, though the machinery was there to copy from summonClaimDay. Requiring a completed
// daily would couple the building economy to the habit journal, which is a design decision rather
// than a faucet fix, and would refuse on every fixture that has no habits at all.
export const MATERIALS_PER_DAY=1000,MATERIAL_CLAIM_DAYS=40;
/** The reserve in its current shape, with pre-ECON-02 saves read forward. `granted` is the running
 *  total the identity is checked against; before this change the total was implicit in claims*100,
 *  so that is exactly what an older save is worth. Used by BOTH writers so they cannot disagree. */
export const reserve=s=>{const r=s.staffingMaterials||{stock:0,claims:0};
 return {stock:r.stock,claims:r.claims,granted:r.granted??r.claims*100,days:r.days??[]};};
export const STAFFING=data.businesses;
export const staffingRule=(id,q)=>STAFFING[id]?.qualities[q-1];
const integer=(n,max)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const coverage=n=>Math.max(1,Math.ceil(n/1000));

// SL1-03 / SL1-04. Quality is now a FIELD, not a function of headcount.
//
// The original's three ladders are quality (BuildingQuality.Quality, 1..26), staff count
// (BuildingQuality.levelLimit) and Service Level (BuildingBusiness). Everkai had quality only inside
// `apkStaffing`, where it was DERIVED from headcount by coverage() -- literally the conflation SL1-03
// describes -- and `apkStaffing` itself needs originalProgression(s), so in a default save the whole
// ladder was unreachable and qualityBonus was permanently 0.
//
// MEASURED 2026-09-15 against the original BuildingQuality.json (469 rows, dict-wrapped):
//   levelLimit === 1000*Quality on all 468 non-Bank rows, with ZERO exceptions.
// That identity is what makes coverage(n)=ceil(n/1000) sound as the legacy derivation: it is exactly
// the minimum quality whose levelLimit admits n staff, so no existing save is invalidated and none is
// given a tier it did not already need. It is a migration rule, not the mechanic.
//
// lib/staffing-data.json was verified row-for-row against the original in the same pass: cap,
// yieldRise AND cost all match on every one of the 26 tiers of all 17 businesses. The data was
// already right; only its reachability was wrong.
export const QUALITY_MAX=26;
/** The free-grant ceiling. NOT a quality tier -- it is the pre-paid-progression floor that hire
 *  cards and opening rewards grant into, and it stays exactly where it was so nothing regresses. */
export const FREE_CAP=5000;
/** Current quality of a default-mode row. An explicit field wins; otherwise the minimum tier that
 *  admits the staff already present, which is what every pre-SL1-03 save implicitly was. */
export const enterpriseQuality=(id,b)=>Number.isInteger(b?.quality)?b.quality:coverage(b?.employees||0);
/** The tier this row's earnings bonus is measured FROM. Stamped alongside `quality` on the first
 *  upgrade, so a save grandfathered to quality 5 by its 5,000 existing staff gains no income it did
 *  not pay materials for -- the policy app/paid-staffing.tsx already states for the apkStaffing path
 *  ("They grant any capacity needed to keep those employees, with no extra quality income"). */
export const qualityBaseOf=(id,b)=>Number.isInteger(b?.qualityBase)?b.qualityBase:enterpriseQuality(id,b);
/** yieldRise is ten-thousandths, so /10000 is the additive multiplier strand: tier 26 is +11,200%. */
export function defaultQualityBonus(id,b){
 const now=staffingRule(id,enterpriseQuality(id,b)),base=staffingRule(id,qualityBaseOf(id,b));
 return now&&base?(now.yieldRise-base.yieldRise)/10000:0;
}
/** The paid hiring ceiling for a row with no apkStaffing. FREE_CAP is kept as a floor rather than
 *  replaced, so a fresh save still reaches 5,000 as before and quality only ever raises it -- toward
 *  the original's own 26,000 at tier 26. */
export const defaultStaffCap=(id,b)=>Math.max(FREE_CAP,staffingRule(id,enterpriseQuality(id,b))?.cap??FREE_CAP);
/** Materials this row has spent climbing from its base tier, so the reserve identity can police it.
 *  Without this a hand-edited `quality:26` would mint +11,200% for free; with it the same edit needs
 *  25,915 materials to exist in `granted`, which only claimStaffingMaterials can put there. */
export function qualityMaterialSpend(id,b){
 if(b?.apkStaffing||!Number.isInteger(b?.quality))return 0;
 let sum=0;for(let q=qualityBaseOf(id,b);q<b.quality;q++)sum+=staffingRule(id,q)?.cost??0;return sum;
}
/** A default-mode row's quality fields. Both absent is every legacy save, and stays exactly as
 *  strict as the `employees<=5000` rule it replaces. */
export function validDefaultQuality(id,b){
 if(b.quality===undefined)return b.qualityBase===undefined&&b.employees<=FREE_CAP;
 if(!STAFFING[id]||!Number.isInteger(b.quality)||b.quality<1||b.quality>QUALITY_MAX)return false;
 if(!Number.isInteger(b.qualityBase)||b.qualityBase<1||b.qualityBase>b.quality)return false;
 return b.employees<=defaultStaffCap(id,b);
}
export function staffCoefficient(n){const i=data.bands.findIndex(b=>n>=b.staffCount[0]&&(b.staffCount[1]===-1||n<=b.staffCount[1]));if(i<0)return Infinity;const b=data.bands[i],factor=1+Number(b.consumeCoefficient)/1e8;return i===0?factor**(n-1):factor**(n-data.bands[i-1].staffCount[1])*Number(data.bands[i-1].consumeCoefficientTotal)/10000;}
// Two source floors. Unimplemented skill discounts remain zero; unsafe quotes cannot spend.
const sumPrice=(id,sum)=>{const n=Math.floor(Math.floor(STAFFING[id].addStaffCost/10000*sum));return Number.isSafeInteger(n)?n:Infinity;};
export function staffPrice(id,start,count){if(!STAFFING[id]||!integer(start,26000)||!integer(count,26000)||start+count>26000)return Infinity;let sum=0;for(let i=0;i<count;i++)sum+=staffCoefficient(start+i);return sumPrice(id,sum);}
const cache=new WeakMap();
export function staffingStatus(id,b){const p=b?.apkStaffing;if(!p)return null;if(cache.has(p))return cache.get(p);let employees=p.baselineEmployees,q=p.baselineQuality,bonus=0,spent=0,gold=0,free=0,paid=0;
 for(const [kind,count,cost] of p.events){if(kind===2){bonus+=(staffingRule(id,q+1).yieldRise-staffingRule(id,q).yieldRise)/10000;spent+=cost;q++;}else{employees+=count;if(kind===0){free+=count;q=Math.max(q,coverage(employees));}else{paid+=count;gold+=cost;}}}
 const status={employees,quality:q,cap:staffingRule(id,q).cap,bonus,spent,gold,free,paid};cache.set(p,status);return status;}
export function staffingPlan(s,id,requested){const b=s.enterprises?.[id],p=staffingStatus(id,b);if(!p)return {count:0,cost:0};const limit=Math.max(0,p.cap-b.employees);if(requested!=='max'){const count=Math.min(requested,limit);return {count,cost:staffPrice(id,b.employees,count)};}let sum=0,count=0,cost=0;for(let i=0;i<limit;i++){sum+=staffCoefficient(b.employees+i);const next=sumPrice(id,sum);if(next>s.gold)break;count=i+1;cost=next;}return {count,cost};}
export function recordStaff(b,count,paidCost=null){if(!b.apkStaffing)return b;return {...b,apkStaffing:{...b.apkStaffing,events:[...b.apkStaffing.events,[paidCost===null?0:1,count,paidCost??0]]}};}
export function validStaffing(s,id,b){const p=b.apkStaffing;if(p===undefined)return validDefaultQuality(id,b);if(b.quality!==undefined||b.qualityBase!==undefined)return false;if(!STAFFING[id]||!originalProgression(s)||!p||p.policyVersion!==1||!integer(p.baselineEmployees,5000)||p.baselineQuality!==coverage(p.baselineEmployees)||!Array.isArray(p.events)||p.events.length>31025)return false;let n=p.baselineEmployees,q=p.baselineQuality;
 for(const e of p.events){if(!Array.isArray(e)||e.length!==3)return false;const [kind,count,cost]=e;if(![0,1,2].includes(kind)||!integer(count,26000)||!count||!integer(cost,Number.MAX_SAFE_INTEGER))return false;if(kind===2){if(count!==1||q>=26||cost!==staffingRule(id,q).cost)return false;q++;}else{if(kind===0){if(n+count>5000||cost!==0)return false;n+=count;q=Math.max(q,coverage(n));}else{if(n+count>staffingRule(id,q).cap||cost!==staffPrice(id,n,count))return false;n+=count;}}}
 return n===b.employees&&n<=staffingRule(id,q).cap;}
export function validStaffingReserve(s){const r=s.staffingMaterials;let spent=0;for(const [id,b] of Object.entries(s.enterprises||{})){if(b?.apkStaffing){if(!validStaffing(s,id,b))return false;spent+=b.apkStaffing.events.reduce((sum,e)=>sum+(e[0]===2?e[2]:0),0);}else spent+=qualityMaterialSpend(id,b);}if(r===undefined)return spent===0;// The identity was `stock === claims*100 - spent`, which pinned the grant size forever: any rate
// other than 100 invalidated every live save. It is now `stock === granted - spent`, with `granted`
// carrying the running total, so the rate can move without a save becoming unloadable. Saves written
// before this carry no `granted` and are migrated to claims*100 by reconcileStaffingRates.
 // originalProgression is NO LONGER required to hold a reserve: the quality ladder it used to gate is
 // now reachable in a default save (SL1-04), so a default save legitimately owns materials.
 if(!r||!integer(r.claims,1000000)||!integer(r.stock,1000000))return false;
 if(r.granted!==undefined&&!integer(r.granted,1000000000))return false;
 if(r.days!==undefined&&(!Array.isArray(r.days)||r.days.length>MATERIAL_CLAIM_DAYS
  ||new Set(r.days).size!==r.days.length||!r.days.every(d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d))))return false;
 return (r.granted??r.claims*100)===r.stock+spent;}
export function staffingAction(s,action,id,value,addStaff){if(!['startPaidStaffing','paidStaffHire','upgradeStaffQuality','claimStaffingMaterials'].includes(action))return null;const fail=error=>({state:s,error});
 if(action==='claimStaffingMaterials'){const r=reserve(s);const day=habitDay(s.lastAt);
  if(r.days.includes(day))return fail('Today’s building materials are already claimed.');
  if(r.stock>1000000-MATERIALS_PER_DAY||r.claims>=1000000)return fail('Building material reserve is full.');
  return {state:{...s,staffingMaterials:{stock:r.stock+MATERIALS_PER_DAY,claims:r.claims+1,granted:r.granted+MATERIALS_PER_DAY,days:[...r.days,day].slice(-MATERIAL_CLAIM_DAYS)}},
   message:`Daily building materials: +${MATERIALS_PER_DAY}.`};}
 const b=s.enterprises?.[id];if(!b||!STAFFING[id])return fail('Open a known business first.');let next;
 // The default-mode quality ladder: the same table, the same materials, no APK-growth opt-in.
 if(action==='upgradeStaffQuality'&&!b.apkStaffing){
  const q=enterpriseQuality(id,b);
  if(q>=QUALITY_MAX)return fail('Final business quality reached.');
  const cost=staffingRule(id,q).cost,r=reserve(s);
  if(r.stock<cost)return fail('More building upgrade materials needed.');
  return {state:{...s,staffingMaterials:{...r,stock:r.stock-cost},
   enterprises:{...s.enterprises,[id]:{...b,quality:q+1,qualityBase:qualityBaseOf(id,b)}}},message:'Business quality upgraded.'};
 }
 if(!originalProgression(s))return fail('Choose APK growth in Fellow Training Rules first.');
 if(action==='startPaidStaffing'){if(b.apkStaffing)return fail('Paid progression is already available.');next={...b,apkStaffing:{policyVersion:1,baselineEmployees:b.employees,baselineQuality:coverage(b.employees),events:[]}};}
 else{const p=staffingStatus(id,b);if(!p)return fail('Start paid progression for this business first.');if(action==='paidStaffHire'){if(![1,10,'max'].includes(value))return fail('Choose one, ten or budget max.');const plan=staffingPlan(s,id,value);if(!plan.count)return fail('No affordable space. Upgrade quality or collect gold.');if(!Number.isSafeInteger(plan.cost)||plan.cost>s.gold)return fail('Not enough gold for this batch.');next=recordStaff(addStaff(s,id,b,plan.count,false),plan.count,plan.cost);s={...s,gold:s.gold-plan.cost};}
 else{if(p.quality>=26)return fail('Final business quality reached.');const cost=staffingRule(id,p.quality).cost,r=reserve(s);if(r.stock<cost)return fail('More building upgrade materials needed.');next={...b,apkStaffing:{...b.apkStaffing,events:[...b.apkStaffing.events,[2,1,cost]]}};s={...s,staffingMaterials:{...r,stock:r.stock-cost}};}}
 return {state:{...s,enterprises:{...s.enterprises,[id]:next}},message:action==='startPaidStaffing'?'Paid progression opened. Existing employees and income kept.':action==='paidStaffHire'?'Employees hired with gold.':'Business quality upgraded.'};}
