import {habitDay,habitEarnings} from './habits.mjs';
import activation from './stella-activation-policy.json' with {type:'json'};
import data from './stella-data.json' with {type:'json'};
import {FELLOWS,fellowById,REMOVED} from './catalog.mjs';
import {CROSSOVER_STELLA,CROSSOVER_STELLA_ACTIVATION,crossoverStella,ownsCrossoverStella} from './crossover-stella.mjs';
import {ADDITION_FELLOWS} from './everkai-additions.mjs';
/** The four ORIGINAL profiles, and only those: every consumer that means "the Isekai Stella table"
 *  keeps reading this. The shared crossover track is a fifth profile with MANY owners, so it is kept
 *  out of this array -- a loop that treats a profile's `id` as its owner's id (tests/stella.test.mjs,
 *  lib/helper.mjs) would otherwise try to activate a Fellow called 'crossover'. */
export const STELLA_PROFILES=data.profiles;
/** Every profile a save may hold a ledger for: what the validator and the idle mint iterate. */
export const ALL_STELLA_PROFILES=Object.freeze([...data.profiles,CROSSOVER_STELLA]);
export {CROSSOVER_STELLA,crossoverStella};
export const stellaActivation=id=>activation.owners[id]||(crossoverStella(id)?CROSSOVER_STELLA_ACTIVATION:null);
export const STELLA_ACTIVATION_POLICY=activation.id;
export const stellaRule=id=>STELLA_PROFILES.find(p=>p.id===id)||(crossoverStella(id)?CROSSOVER_STELLA:undefined);
/** A profile's owners: itself for the four, every owned crossover Fellow for the shared track. Only the
 *  crossover profile carries `type:null`, so that is the test rather than an id comparison. */
const shared=p=>p.type===null;
const owns=(s,p)=>shared(p)?ownsCrossoverStella(s):!!s.fellows?.[p.id];
export const stellaState=s=>s.stella||{policyVersion:1,seq:0,stock:{},grants:[],history:[]};
// EVT-22. The original drops Stella shards from pulls; Everkai has no pulls, so they drop from idle
// play the way gold does, with the same habit multiplier attached (the owner's own proposal).
//
// THE RATE IS DERIVED, NOT PICKED. What shipped before this was a button: 1,000 fragments a day per
// profile, gated on a finished daily habit (the `stellaSupply` action, retired here). earningsMultiplier
// runs 1.0 to 2.0 (lib/habits.mjs:104 -- 1 + 0.5*areas/LIFE_AREAS + min(0.5, 0.07*dailies)). So a base
// of 500/day carried by that multiplier lands on exactly 1,000/day for a player who keeps their habits,
// which is the rate that was already measured and balanced, and 500/day for one who does not, where the
// button gave them nothing at all. Both halves of that come from the same place: the shipped grant.
// The ceiling therefore CANNOT rise above what the button already allowed -- that is the whole point of
// choosing 500 rather than a number that felt right.
export const STELLA_IDLE_PER_DAY=500;
const DAY_MS=86400000;
/** Fragments accrue only for profiles whose Fellow the player actually owns: the original ties a shard
 *  to its character, and an unowned character stockpiling shards is a faucet with nothing to spend on. */
export function settleStella(s,from,to){
 if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)return s;
 // A village that has never opened Stella carries no `s.stella` subtree. This used to return here, so
 // such a village accrued NOTHING -- although idle drops are the only source of fragments. So the subtree
 // is created on demand, but ONLY for a village that owns a Stella-profile Fellow: nothing is written for
 // anyone else, which keeps a save without one byte-identical through settle (no starter Fellow --
 // hero_15 in fresh(), hero_1/hero_195 in startingSave -- has a profile; the four are hero_52/54/56/190).
 // The shared crossover track counts as owned when the village holds any crossover FELLOW, so a village
 // with none -- which is every flag-off village, every test, every sim -- still writes nothing here.
 // The new subtree stamps `since` at `from`, the settle window's start, IMMEDIATELY -- even when this
 // window pays less than one fragment. Otherwise a player acting every minute would re-anchor the clock
 // at every settle and never cross a whole fragment. Nothing is back-paid from before the window.
 const created=!s.stella&&ALL_STELLA_PROFILES.some(p=>owns(s,p));
 const old=created?{...stellaState(s),since:from}:s.stella;if(!old)return s;
 // The same holds for an older subtree written before `since` existed: stamp it rather than re-anchor.
 const since=Number.isSafeInteger(old.since)?old.since:from;
 const unchanged=created||old.since!==since?{...s,stella:{...old,since}}:s;
 const mult=habitEarnings(s.habits,to).multiplier,perMs=STELLA_IDLE_PER_DAY/DAY_MS*mult;
 if(perMs<=0||to<=since)return unchanged;
 const earned=Math.floor((to-since)*perMs);
 if(earned<=0)return unchanged;
 const stock={...old.stock},idle={...(old.idle||{})};let moved=false;
 for(const p of ALL_STELLA_PROFILES){
  if(!owns(s,p))continue;
  const held=stock[p.itemId]||0,gain=Math.min(earned,1e6-held,1e6-(idle[p.itemId]||0));
  if(gain<=0)continue;
  stock[p.itemId]=held+gain;idle[p.itemId]=(idle[p.itemId]||0)+gain;moved=true;
 }
 // `since` advances by the time actually paid out, so a partial fragment is never silently dropped.
 const spent=Math.floor(earned/perMs);
 return {...s,stella:{...old,stock,idle,since:Math.min(to,since+spent)}};
}
const cache=new WeakMap();
function entries(s){const h=stellaState(s).history;if(!cache.has(h)){const m=new Map();for(const r of h)m.set(r.owner,r);cache.set(h,m);}return cache.get(h);}
export const stellaEntry=(s,id)=>entries(s).get(id)||null;
/** An ADDITION never receives the type-summed percent. MEASURED before the change: `stellaBonus` sums
 *  the percent of every activated Stella whose profile type matches the Fellow's, and a crossover Fellow
 *  has no entry of its own -- so its TYPE alone multiplied its whole power by Inspiring +184%,
 *  Diligent/Informed +122%, Brave/Unfettered +0%. On identical maxed records that made an Inspiring
 *  crossover Fellow worth 2.84x a Brave one for nothing, i.e. type choice was silently the largest power
 *  lever in the slice, an order above the operator-slot value it was chosen for
 *  (tests/crossover-arcs.test.mjs: +1,560,006 to +3,120,006 gold/s). Additions now read their OWN row's
 *  percent -- zero on the shared shard track -- and earn the percent half through lib/crossover-accord.mjs
 *  instead. The four original profiles and all 159 original Fellows keep today's behaviour exactly: the
 *  branch is taken on additionKind, not on the shape of the ledger. */
export function stellaBonus(s,id){const own=stellaEntry(s,id);
 if(crossoverStella(id))return {flat:own?.flat||0,percent:own?.percent||0};
 const type=fellowById(id)?.type;let percent=0;for(const r of entries(s).values())if(r.type===type)percent+=r.percent;return {flat:own?.flat||0,percent};}
export function applyStella(s,id,power){const b=stellaBonus(s,id);return Math.floor((power+b.flat)*(1+b.percent/100));}
/** The history bound. It used to be `sum over profiles of levels+1` = 144, which assumes one owner per
 *  profile. The shared crossover track has one row set and up to ADDITION_FELLOWS.length owners, so the
 *  bound is 144 + 41 x 133 = 5,597. WIDENING only, so every save that decodes today still decodes
 *  (CLAUDE.md saves rule); the bound exists to stop an unbounded ledger, not to pin a count. */
export const STELLA_HISTORY_MAX=STELLA_PROFILES.reduce((n,p)=>n+p.levels.length+1,0)+(CROSSOVER_STELLA.levels.length+1)*ADDITION_FELLOWS.length;
/** The four original ladders deliberately do NOT reprice a stored row: a v86 save keeps the benefit it
 *  recorded, which is why tests/stella.test.mjs asserts "old receipt values not repriced". The shared
 *  crossover ladder has no such history -- it has never shipped, so no save can hold a row of it -- and
 *  it is the one whose percent now feeds the Fellow directly (stellaBonus above). So it IS repriced:
 *  every row must carry its own ladder's flat and percent, and the free activation must carry zeros.
 *  Strictly tighter, with no compatibility cost, because there is nothing older to break. */
const priced=(p,r)=>!shared(p)||(r.level===0?r.flat===0&&r.percent===0:r.flat===p.levels[r.level-1].flat&&r.percent===p.levels[r.level-1].percent);
export function validStella(s){if(s?.stella===undefined)return true;const t=s.stella,int=(n,max=1e9)=>Number.isSafeInteger(n)&&n>=0&&n<=max;if(!t||t.policyVersion!==1||!int(t.seq)||!t.stock||Array.isArray(t.stock)||!Object.entries(t.stock).every(([id,n])=>ALL_STELLA_PROFILES.some(p=>p.itemId===id)&&int(n,1e6))||!Array.isArray(t.grants)||t.grants.length>10000||!Array.isArray(t.history)||t.history.length>STELLA_HISTORY_MAX)return false;
 if(t.since!==undefined&&(!int(t.since,Number.MAX_SAFE_INTEGER)||t.since>s.lastAt))return false;
 if(t.idle!==undefined&&(!t.idle||Array.isArray(t.idle)||typeof t.idle!=='object'||!Object.entries(t.idle).every(([id,n])=>ALL_STELLA_PROFILES.some(p=>p.itemId===id)&&int(n,1e6))))return false;
 const balances={},ids=new Set(),levels={};for(const r of t.grants){if(!r||!int(r.id)||r.id>t.seq||ids.has(r.id)||!ALL_STELLA_PROFILES.some(p=>p.itemId===r.itemId)||!int(r.count,1e6)||!r.count||!int(r.at,Number.MAX_SAFE_INTEGER)||r.at>s.lastAt)return false;ids.add(r.id);balances[r.itemId]=(balances[r.itemId]||0)+r.count;}
 // `||REMOVED.has(r.owner)`: the same whitelist trading post runs, Mine Clearance history and APK
 // progression receipts already carry. A released Fellow's Stella fragments are normally handed back by
 // lib/release-removed.mjs, which deletes these rows with them; but a refund that would overflow the
 // fragment cap is REFUSED rather than truncated, and a history row cannot simply be dropped either --
 // stock must equal the ledger below, so dropping one without returning its `paid` breaks that identity.
 // So the row stays, the fragments stay spent, and the save still loads.
 for(const r of t.history){const p=stellaRule(r?.owner);if(!r||!p||!(s.fellows?.[r.owner]||REMOVED.has(r.owner))||!int(r.id)||r.id>t.seq||ids.has(r.id)||r.policyVersion!==1||(r.activationPolicy!==undefined&&(r.level!==0||r.activationPolicy!==(stellaActivation(r.owner)?.activationPolicy||activation.id)))||!int(r.level,p.levels.length)||r.level!==(levels[r.owner]===undefined?0:levels[r.owner]+1)||r.itemId!==p.itemId||r.type!==p.type||!int(r.paid,1e6)||(r.level===0?r.paid!==0:r.paid===0)||!int(r.flat,1e12)||!int(r.percent,10000)||!priced(p,r)||!int(r.at,Number.MAX_SAFE_INTEGER)||r.at>s.lastAt)return false;ids.add(r.id);levels[r.owner]=r.level;balances[r.itemId]=(balances[r.itemId]||0)-r.paid;}
 // Stock must equal the ledger: what the grants and idle drops paid in, less what upgrades paid out.
 return ALL_STELLA_PROFILES.every(p=>(balances[p.itemId]||0)+(t.idle?.[p.itemId]||0)===(t.stock[p.itemId]||0));
}
export function stellaPlan(s,id,count=/** @type {number|string} */ (1)){const p=stellaRule(id),entry=stellaEntry(s,id),t=stellaState(s);if(!p||!entry||![1,5,'max'].includes(count))return {rows:[],cost:0};const rows=[];let cost=0;for(const row of p.levels.slice(entry.level,entry.level+(count==='max'?40:count))){if(cost+row.cost>(t.stock[p.itemId]||0)||t.seq+rows.length+1>1e9)break;rows.push(row);cost+=row.cost;}return {rows,cost};}
export function stellaAction(s,action,target,value){if(!['stellaActivate','stellaUpgrade'].includes(action))return null;const old=stellaState(s),p=stellaRule(target),fail=error=>({state:s,error});if(!p||!s.fellows[target]||(!shared(p)&&fellowById(target)?.type!==p.type))return fail('Choose an owned Fellow with a supported Stella curve.');if(value?.seq!==old.seq||old.seq>=1e9)return fail('Stella changed. Use current controls.');const t={...old,seq:old.seq+1,stock:{...old.stock}},balance=t.stock[p.itemId]||0,entry=stellaEntry(s,target);
 // The `stellaSupply` button that stood here is RETIRED: fragments now accrue from idle play in
 // settleStella above, at a rate derived from what that button paid. Old saves keep their `grants`
 // ledger, which validStella still reconciles, so nothing a player already earned is lost.
 if(action==='stellaActivate'&&!stellaActivation(target))return fail('No private activation policy exists for this character.');if(action==='stellaActivate'&&entry)return fail('This Stella is already active.');const plan=action==='stellaActivate'?{rows:[{level:0,...stellaActivation(target)}],cost:0}:stellaPlan(s,target,value.count??1);if(!plan.rows.length)return fail('Activate first and prepare enough owner fragments; the documented cap is the supported limit.');t.stock[p.itemId]=balance-plan.cost;t.seq=old.seq+plan.rows.length;t.history=[...t.history,...plan.rows.map((row,i)=>({policyVersion:1,id:old.seq+i+1,owner:target,level:row.level,itemId:p.itemId,paid:row.cost,type:p.type,flat:row.flat,percent:row.percent,at:s.lastAt,...(row.level===0?{activationPolicy:stellaActivation(target)?.activationPolicy||activation.id}:{})}))];const row=plan.rows.at(-1);return {state:{...s,stella:t},message:`${p.name} Stella ${row.level} saved · +${row.flat.toLocaleString()} own Power · ${p.type} Power +${row.percent}%.`};
}
