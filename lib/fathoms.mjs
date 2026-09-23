import data from './fathom-data.json' with {type:'json'};
import {habitDay,habitEarnings,HABIT_DOMAINS} from './habits.mjs';
import {isAddition} from './everkai-additions.mjs';
import {MAX_GOLD} from './limits.mjs';
import {luckStones,FATHOM_STONE,FATHOM_PREMIUM_STONE} from './luck-stones.mjs';

// Family Fathoms: the original's Family quenching, adapted. docs/slice-buildings.md 5c and 5d.
//
// Kept from the original: 36 slots in its own order, each slot's country fixed by index (the cycle
// is 2,4,3,1,5,0), the +1%..+25% tier range, its intimacy gates, and the rule that a slot never
// goes down. Country is this project's business `type`; a null type is the original's '0', meaning
// every business.
//
// THE ROLL IS BACK, BESIDE THE DRIP, NOT INSTEAD OF IT (2026-09-22; docs/character-systems-gap.md 3.3
// and 7.4). The original rolls a slot against a weighted table and keeps the draw only if it is
// STRICTLY BETTER than the tier already held, which is why a months-old save shows 673 rolls and 673
// replaces. That reading is MEASURED, not assumed: the table's stored `successRate*` columns are not
// a probability the client rolls against -- they are exactly P(draw > current tier) under
// keep-if-better, and they fall out of the weight columns only under that rule. The strongest single
// result is tier 21: 585/181,545 = 0.322% on gold against the panel's "0.32%", and 17,500/49,500 =
// 35.35% on advanced against its "35%". scripts/import-fathoms.py reproduces both.
//
// WHAT IS NOT CHANGED, AND WHY (rule 12). `fathomAdvance` -- the free, certain, habit-paced +1 tier --
// stays exactly as it was, and the 25 tier VALUES are untouched. `s.fathoms.tiers` is a stored value
// that fathomBonus turns into business income, so re-pricing the ladder or replacing the drip would
// make every existing save's tiers worth something different from what they were earned for. The two
// paid rolls are an OPTIONAL fast path on top: a gold roll on the original's own 1,180-row price
// ladder, and an advanced roll on Luck Stones. A roll can only ever raise a tier, never lower it.
//
// Unlocks need BOTH the original's intimacy gate and cumulative habit activity. Intimacy alone would
// not pace anything: it is bought with gifts at roughly 100 gold per point, buyGift has no daily gate
// or rate limit, and giftBatch applies up to a million at once, so all 36 gates would open in two
// actions. Habit totals cannot be bought and are never reset.
export const FATHOM_SLOTS=data.slots;
export const FATHOM_STEPS=data.steps;
export const MAX_TIER=FATHOM_STEPS.length;
/** Cumulative habit actions needed per slot. Slot 1 at 30, slot 36 at 1,080 -- roughly a year of
 *  steady practice at a few actions a day to open the last one. */
export const ACTIONS_PER_SLOT=30;
/** Advances available in one day, capped by how many dailies were actually completed. 36 slots of 24
 *  steps is 864 advances, so a consistent day-to-day player finishes in under a year. */
export const FATHOM_DAILY_MAX=3;

const int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const record=x=>x&&typeof x==='object'&&!Array.isArray(x);
const slotAt=n=>FATHOM_SLOTS[n-1];
/** THE TWO WEIGHT COLUMNS the original draws from, and its own gold price ladder. `gold` is indexed
 *  by how many times THAT SLOT has been rolled and is carried as decimal strings, because it reaches
 *  1e21 and Number would lose the low digits long before that. */
export const FATHOM_GOLD_LADDER=data.gold;
export const FATHOM_ROLL=data.roll;
/** Where the gold route stalls in Everkai, measured rather than asserted: MAX_GOLD is 1e15
 *  (lib/limits.mjs), and the original's ladder passes it partway up. Past this attempt a gold roll
 *  simply cannot be afforded -- which is fine, and is what the original intends too: the gold route
 *  is meant to stall and leave the top tiers to advanced rolls. */
export const FATHOM_GOLD_REACH=data.gold.findIndex(n=>Number(n)>MAX_GOLD);
const goldPrice=(slot,rolls)=>{
 const row=data.gold[Math.min(rolls,data.gold.length-1)];
 const price=Number(row)*(slotAt(slot)?.premium?FATHOM_ROLL.premiumGoldRatio:1);
 return Number.isSafeInteger(price)?price:Infinity;
};
const stonePrice=slot=>slotAt(slot)?.premium?FATHOM_PREMIUM_STONE:FATHOM_STONE;

/** Lifetime habit actions across every domain. Monotonic: habits.mjs increments these on completion
 *  and on responsibility checks and never resets them. */
export const habitActions=s=>HABIT_DOMAINS.reduce((n,k)=>n+(s?.habits?.totals?.[k]?.actions||0),0);

export const fathomState=s=>s?.fathoms||{policyVersion:1,day:'',used:0,tiers:{}};

/** Do Fathoms apply to this family member at all? Crossover Family are EXCLUDED, and the reason is
 *  faithfulness rather than balance: Fathoms ARE the original's Wife Quenching -- 36 slots from
 *  WifeQuenchingUnlock.json in the original's own country cycle and 25 tiers from
 *  WifeQuenchingWight.json, both hashes pinned at tests/family-data-coverage.test.mjs -- so a
 *  character who is not in that table has no quenching record to port. The measured price of
 *  including them was +30 members taking fathomBonus 321.0 -> 411.0 per type, i.e. x1.28 on all 17
 *  businesses and x1.268 on the starter buildings, for nothing earned: `openSlots` has no per-member
 *  gate that scales with roster size, so past 1,080 lifetime habit actions every member with enough
 *  intimacy holds all 36 slots at once (docs/crossover-family-plan.md 2.3, owner decision F1). */
export const fathomsApply=id=>!isAddition(id);
/** How many slots a given family member has open, by the stricter of the two gates. Zero for an
 *  addition, which is the single point the exclusion is enforced from: fathomBonus skips her, slotTier
 *  is 0, validFathoms can never accept a stored tier for her, and fathomAction refuses. */
export function openSlots(s,id){
 const member=s?.family?.[id];
 if(!member||!fathomsApply(id))return 0;
 const actions=habitActions(s);
 let open=0;
 for(const slot of FATHOM_SLOTS){
  if(member.intimacy<slot.intimacy||actions<slot.slot*ACTIONS_PER_SLOT)break;
  open=slot.slot;
 }
 return open;
}

/** A slot's current tier: 1 once open, rising to MAX_TIER. Zero means not open. */
export const slotTier=(s,id,slot)=>slot<=openSlots(s,id)?(fathomState(s).tiers[id]?.[slot]||1):0;

/** ONE MEMBER'S additive percentage for one business type, as a fraction. A slot with a null type is
 *  the original's all-country slot and applies everywhere.
 *
 *  Split out of fathomBonus on 2026-09-23 for the Skill tab's totals strip
 *  (docs/family-screen-specs/05-skills-fathoms.md): the original prints the FIVE CLASS TOTALS FOR
 *  THIS MEMBER above the rail, and the account-wide version is a separate roster overlay. This is a
 *  pure read over state the save already holds -- no new field, no new rule -- and fathomBonus is
 *  now its sum, so the per-member strip and the business multiplier cannot drift apart. */
function memberFathomPercent(s,id,type){
 const open=openSlots(s,id);
 if(!open)return 0;
 const tiers=fathomState(s).tiers[id]||{};
 let total=0;
 for(let n=1;n<=open;n++){
  const slot=slotAt(n);
  if(slot.type!==null&&slot.type!==type)continue;
  total+=FATHOM_STEPS[(tiers[n]||1)-1].percent;
 }
 return total;
}
export const memberFathomBonus=(s,id,type)=>memberFathomPercent(s,id,type)/100;

/** The additive percentage this family contributes to one business type, as a fraction.
 *  The INTEGER percents are summed and divided ONCE, exactly as before the split: dividing per
 *  member and summing the fractions is a different floating-point expression, and this number feeds
 *  businessBonus, so it must stay bit-identical for every save. */
export function fathomBonus(s,type){
 let total=0;
 for(const id of Object.keys(s?.family||{}))total+=memberFathomPercent(s,id,type);
 return total/100;
}

/** How many times a slot has been rolled, and by which route. Absent on every save written before
 *  2026-09-22, and absent means zero -- so no existing save changes and none is refused. */
export const slotRolls=(s,id,slot)=>{
 const row=fathomState(s).rolls?.[id]?.[slot];
 return {gold:row?.gold||0,advanced:row?.advanced||0};
};
export const slotRollCount=(s,id,slot)=>{const r=slotRolls(s,id,slot);return r.gold+r.advanced;};
/** What the next roll of this slot costs by each route, and whether it can be paid. */
export function fathomRollQuote(s,id,slot){
 const rolls=slotRollCount(s,id,slot);
 const gold=goldPrice(slot,rolls),stones=stonePrice(slot);
 return {rolls,gold,stones,goldAffordable:s.gold>=gold,stoneAffordable:luckStones(s)>=stones,
         premium:!!slotAt(slot)?.premium};
}
/** ONE DRAW from a weight column, keep-if-better. Pure and seeded: given the seed, the column and the
 *  tier held, the outcome is fixed -- which is what stops a reload re-rolling it, because the result
 *  is written into `tiers` and the seed moves on. The LCG is lib/fountain.mjs's, so both random
 *  systems in this build advance a seed the same way.
 *
 *  A column whose weights are all zero at or below the held tier can still be drawn from -- the draw
 *  simply lands somewhere and is kept only if it beats what is held, which is the original's rule
 *  and the reason its own success rates are what they are. */
export function fathomRoll(seed,column,tier){
 const next=(Math.imul(seed,1664525)+1013904223)>>>0;
 const total=FATHOM_STEPS.reduce((n,s)=>n+s[column],0);
 let pick=next%total,drawn=FATHOM_STEPS.at(-1).tier;
 for(const step of FATHOM_STEPS){if(pick<step[column]){drawn=step.tier;break;}pick-=step[column];}
 return {seed:next,drawn,tier:Math.max(tier,drawn),kept:drawn>tier};
}
export function validFathoms(s){
 const f=s?.fathoms;
 if(f===undefined)return true;
 if(!record(f)||f.policyVersion!==1||typeof f.day!=='string'||f.day.length>10||!int(f.used,FATHOM_DAILY_MAX)||!record(f.tiers))return false;
 // The roll state is OPTIONAL and absent-means-zero, so every save written before it existed stays
 // legal and unchanged. A recorded roll must belong to a slot this member has actually opened, the
 // same rule the tiers themselves carry.
 if(f.seed!==undefined&&!int(f.seed,4294967295))return false;
 if(f.rolls!==undefined){
  if(!record(f.rolls))return false;
  for(const [id,slots] of Object.entries(f.rolls)){
   if(!Object.hasOwn(s.family||{},id)||!record(slots))return false;
   for(const [slot,row] of Object.entries(slots)){
    const n=Number(slot);
    if(!int(n,FATHOM_SLOTS.length)||n<1||n>openSlots(s,id)||!record(row))return false;
    if(!int(row.gold,1e9)||!int(row.advanced,1e9))return false;
   }
  }
 }
 return Object.entries(f.tiers).every(([id,slots])=>{
  if(!Object.hasOwn(s.family||{},id)||!record(slots))return false;
  return Object.entries(slots).every(([slot,tier])=>{
   const n=Number(slot);
   // A recorded tier must be a slot this member has actually opened, so a save cannot carry
   // progress it never earned.
   return int(n,FATHOM_SLOTS.length)&&n>=1&&n<=openSlots(s,id)&&Number.isInteger(tier)&&tier>=1&&tier<=MAX_TIER;
  });
 });
}

export function fathomAction(s,action,target,value){
 if(!['fathomAdvance','fathomRollGold','fathomRollAdvanced'].includes(action))return null;
 const fail=error=>({state:s,error});
 if(action!=='fathomAdvance')return rollAction(s,action,target,value);
 const member=s.family?.[target];
 if(!member)return fail('Welcome this family member first.');
 // Named, not left to fall through the intimacy gate below, which would have reported
 // "Raise Intimacy to 100" for a member no amount of intimacy can ever open a slot for.
 if(!fathomsApply(target))return fail('Fathoms are the village’s own quenching tradition and are not open to this companion.');
 const slot=Number(value);
 if(!Number.isInteger(slot)||slot<1||slot>FATHOM_SLOTS.length)return fail('Choose a Fathom slot.');
 const open=openSlots(s,target);
 if(slot>open){
  const need=slotAt(slot);
  return fail(member.intimacy<need.intimacy
   ?`Raise Intimacy to ${need.intimacy} to open this Fathom.`
   :`Complete ${need.slot*ACTIONS_PER_SLOT-habitActions(s)} more habit actions to open this Fathom.`);
 }
 const f=fathomState(s),today=habitDay(s.lastAt),{dailies}=habitEarnings(s.habits,s.lastAt);
 const used=f.day===today?f.used:0;
 const allowance=Math.min(FATHOM_DAILY_MAX,dailies);
 if(!allowance)return fail('Complete a daily habit to practise Fathoms.');
 if(used>=allowance)return fail('Today’s Fathom practice is already used.');
 const tier=slotTier(s,target,slot);
 if(tier>=MAX_TIER)return fail('This Fathom is fully practised.');
 const tiers={...f.tiers,[target]:{...(f.tiers[target]||{}),[slot]:tier+1}};
 const percent=FATHOM_STEPS[tier].percent;
 const scope=slotAt(slot).type||'every business';
 // `...f` first, so the roll seed and the per-slot attempt counters survive a free advance. They
 // are what luckStonesSpent prices, so dropping them here would silently refund every advanced
 // Fathom a player had paid for -- and leave the balance disagreeing with its own validator.
 return {state:{...s,fathoms:{...f,policyVersion:1,day:today,used:used+1,tiers}},
         message:`Fathom ${slot} practised · +${percent}% ${scope} earnings.`};
}

/** THE PAID ROLLS. Both are the original's own mechanic -- draw the weight column, keep if strictly
 *  better -- and both sit BESIDE the free habit drip rather than replacing it. Neither can lower a
 *  tier, so a save's stored Fathoms are worth exactly what they were worth before this existed.
 *
 *  The gold route reads `WeightNormal` and the original's 1,180-row gold ladder, indexed by how many
 *  times THIS SLOT has been rolled. The advanced route reads `WeightHigh` and costs one Luck Stone,
 *  three on an all-buildings slot -- the same stone Family Latency spends, which is exactly the
 *  competition the original sets up between them.
 *
 *  A LOST ROLL IS STILL A ROLL: the attempt counter rises, the price rises with it, and the seed
 *  advances. Otherwise a failed draw would be a free retry of the same draw, and the whole weight
 *  table would mean nothing. */
function rollAction(s,action,target,value){
 const fail=error=>({state:s,error});
 const member=s.family?.[target];
 if(!member)return fail('Welcome this family member first.');
 if(!fathomsApply(target))return fail('Fathoms are the village\u2019s own quenching tradition and are not open to this companion.');
 const slot=Number(value);
 if(!Number.isInteger(slot)||slot<1||slot>FATHOM_SLOTS.length)return fail('Choose a Fathom slot.');
 const open=openSlots(s,target);
 if(slot>open){
  const need=slotAt(slot);
  return fail(member.intimacy<need.intimacy
   ?`Raise Intimacy to ${need.intimacy} to open this Fathom.`
   :`Complete ${need.slot*ACTIONS_PER_SLOT-habitActions(s)} more habit actions to open this Fathom.`);
 }
 const tier=slotTier(s,target,slot);
 if(tier>=MAX_TIER)return fail('This Fathom is already at the original\u2019s top tier.');
 const gold=action==='fathomRollGold';
 const quote=fathomRollQuote(s,target,slot);
 if(gold){
  if(!Number.isFinite(quote.gold))return fail('This slot has been rolled past what the ledger can price. Use an advanced Fathom.');
  if(s.gold<quote.gold)return fail(`A gold Fathom on this slot costs ${quote.gold.toLocaleString()} gold.`);
 }else if(luckStones(s)<quote.stones){
  return fail(`An advanced Fathom costs ${quote.stones} Luck Stone${quote.stones===1?'':'s'}; ${luckStones(s).toLocaleString()} held.`);
 }
 const f=fathomState(s);
 const result=fathomRoll(f.seed===undefined?2024103100:f.seed,gold?'normal':'high',tier);
 const rolls=f.rolls||{},row=slotRolls(s,target,slot);
 const next={policyVersion:1,day:f.day,used:f.used,seed:result.seed,
  tiers:{...f.tiers,[target]:{...(f.tiers[target]||{}),[slot]:result.tier}},
  rolls:{...rolls,[target]:{...(rolls[target]||{}),[slot]:{gold:row.gold+(gold?1:0),advanced:row.advanced+(gold?0:1)}}}};
 const state={...s,fathoms:next,...(gold?{gold:s.gold-quote.gold}:{})};
 const scope=slotAt(slot).type||'every business';
 const price=gold?`${quote.gold.toLocaleString()} gold`:`${quote.stones} Luck Stone${quote.stones===1?'':'s'}`;
 return {state,message:result.kept
  ?`Fathom ${slot} rolled +${FATHOM_STEPS[result.drawn-1].percent}% \u00b7 kept \u00b7 ${scope} earnings, for ${price}.`
  :`Fathom ${slot} rolled +${FATHOM_STEPS[result.drawn-1].percent}% \u00b7 not better than the +${FATHOM_STEPS[tier-1].percent}% held \u00b7 ${price} spent.`};
}
