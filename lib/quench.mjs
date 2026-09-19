import data from './family-stella-data.json' with {type:'json'};
import {MAX_GOLD} from './limits.mjs';
/** ARTIFACT QUENCHING, deterministic (docs/artifact-quenching.md recommendation 3; power-sources spec 3.2).
 *
 *  The original rolls each quench slot on EquipmentQuenching (100 x row, rows 5-25 live) with a 1-in-5 country
 *  gate, and prices Normal rolls in gold on a per-slot escalating ladder (EquipmentQuenchingConsume). The
 *  single-player shape drops the gacha, not the price: a slot steps up the same riseADH ladder, and reaching row
 *  r costs the gold of the EXPECTED number of Normal rolls to land a country-matched rise >= 100 x r
 *  (scripts/import-family-stella.py: ceil(5 / P(row >= r)) rolls, each at its own table price). So 500 costs 83
 *  gold, 1,500 costs 6.7e9 and 1,600 costs 1.46e12 a slot; 1,700 would cost 2.3e19, past MAX_GOLD, so the gold
 *  track tops out at 1,600 -- 16,000 bp on a ten-slot artifact, against the owner's own 17,000 on Shinobu's
 *  weapon and 18,000 best. Slots: Equipment.quenchingSlotSetInitial (2..12). The High track (one
 *  Item_Quenching_Equipment_1 a roll) is not modelled: Everkai's only stone faucet is three Journey rewards,
 *  which stay with openingReforge.
 *
 *  Part: `percent.quench`, the sum of the EQUIPPED artifact's slot rises in basis points -- the original sums
 *  matched slots straight into gear_percent (equipment.py:62).
 *
 *  SAVES (rule 12): optional `f.quench = {artifactId: [row, ...]}` per Fellow, a slot being 0 or 5..16. Gold is
 *  a wallet, so nothing about the price is stored; the rows are validated against the ladder and the artifact's
 *  slot count only. Quench is gold-priced, so Refund all keeps it (lib/fellow-reset.mjs refunds no gold). */
export const QUENCH_LADDER=data.quench.ladder;
export const QUENCH_SLOTS=data.quench.slots;
export const quenchSlots=gear=>QUENCH_SLOTS[gear]||0;
const rowAt=new Map(QUENCH_LADDER.map((r,i)=>[r[0],i]));
export const QUENCH_TOP=QUENCH_LADDER.at(-1)[0];
/** The next row after `row`, or null at the top. */
export const nextRow=row=>{const i=rowAt.get(row);return i===undefined||i+1>=QUENCH_LADDER.length?null:QUENCH_LADDER[i+1][0];};
/** Gold to step one slot from `row` to the next row. */
export const quenchStepCost=row=>{const i=rowAt.get(row);return i===undefined||i+1>=QUENCH_LADDER.length?null:QUENCH_LADDER[i+1][2]-QUENCH_LADDER[i][2];};
export const fellowQuench=(f,gear=f?.gear)=>{const n=quenchSlots(gear);const a=f?.quench?.[gear]||[];return Array.from({length:n},(_,i)=>a[i]||0);};
export const quenchPercent=f=>f?.gear?fellowQuench(f).reduce((t,r)=>t+100*r,0):0;
export function validQuench(s){
 for(const f of Object.values(s.fellows||{})){const q=f.quench;if(q===undefined)continue;
  if(!q||typeof q!=='object'||Array.isArray(q))return false;
  for(const [gear,rows] of Object.entries(q)){const n=quenchSlots(gear);if(!n||!Array.isArray(rows)||rows.length>n||!rows.every(r=>Number.isInteger(r)&&rowAt.has(r)))return false;}}
 return true;
}
/** Raise the equipped artifact's weakest slots, cheapest step first, as far as `budget` gold (and `steps`) allow. */
export function quenchPlan(s,id,steps=1,budget=s.gold){
 const f=s.fellows[id];if(!f?.gear||!quenchSlots(f.gear))return {count:0,cost:0,rows:[]};
 const rows=fellowQuench(f);let cost=0,count=0;
 while(count<steps){let best=-1;for(let i=0;i<rows.length;i++){const c=quenchStepCost(rows[i]);if(c!==null&&(best<0||c<quenchStepCost(rows[best])))best=i;}
  if(best<0)break;const c=quenchStepCost(rows[best]);if(cost+c>budget)break;cost+=c;rows[best]=nextRow(rows[best]);count++;}
 return {count,cost,rows};
}
export function quenchAction(s,action,target,value){
 if(action!=='quenchArtifact')return null;
 const fail=error=>({state:s,error}),f=s.fellows[target],steps=value==='max'?1000:value??1;
 if(!f?.gear)return fail('Equip an artifact first.');
 if(!quenchSlots(f.gear))return fail('This artifact has no quenching slots.');
 if(![1,10,1000].includes(steps))return fail('Choose a quench amount.');
 const p=quenchPlan(s,target,steps);
 if(!p.count)return fail(fellowQuench(f).every(r=>nextRow(r)===null)?'Every slot is at the top of the gold ladder.':'Collect more gold to quench.');
 return {state:{...s,gold:Math.min(MAX_GOLD,s.gold-p.cost),fellows:{...s.fellows,[target]:{...f,quench:{...(f.quench||{}),[f.gear]:p.rows}}}},
  message:`Quenched ${p.count} step${p.count===1?'':'s'} for ${p.cost.toLocaleString()} gold · artifact Power +${(p.rows.reduce((t,r)=>t+r,0))}%.`};
}
