import data from './fathom-data.json' with {type:'json'};
import {habitDay,habitEarnings,HABIT_DOMAINS} from './habits.mjs';
import {isAddition} from './everkai-additions.mjs';

// Family Fathoms: the original's Family quenching, adapted. docs/slice-buildings.md 5c and 5d.
//
// Kept from the original: 36 slots in its own order, each slot's country fixed by index (the cycle
// is 2,4,3,1,5,0), the +1%..+25% tier range, its intimacy gates, and the rule that a slot never
// goes down. Country is this project's business `type`; a null type is the original's '0', meaning
// every business.
//
// Replaced: the original rolls a slot against weighted tables and keeps the result only if it beats
// the current one, which is why a months-old save shows 673 rolls and 673 replaces. Everkai advances
// one tier at a time from habits, so progress is monotonic and legible, with no frustration RNG.
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

/** The additive percentage this family contributes to one business type, as a fraction.
 *  A slot with a null type is the original's all-country slot and applies everywhere. */
export function fathomBonus(s,type){
 let total=0;
 for(const id of Object.keys(s?.family||{})){
  const open=openSlots(s,id);
  if(!open)continue;
  const tiers=fathomState(s).tiers[id]||{};
  for(let n=1;n<=open;n++){
   const slot=slotAt(n);
   if(slot.type!==null&&slot.type!==type)continue;
   total+=FATHOM_STEPS[(tiers[n]||1)-1].percent;
  }
 }
 return total/100;
}

export function validFathoms(s){
 const f=s?.fathoms;
 if(f===undefined)return true;
 if(!record(f)||f.policyVersion!==1||typeof f.day!=='string'||f.day.length>10||!int(f.used,FATHOM_DAILY_MAX)||!record(f.tiers))return false;
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
 if(action!=='fathomAdvance')return null;
 const fail=error=>({state:s,error});
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
 return {state:{...s,fathoms:{policyVersion:1,day:today,used:used+1,tiers}},
         message:`Fathom ${slot} practised · +${percent}% ${scope} earnings.`};
}
