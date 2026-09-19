import {habitDay,habitEarnings} from './habits.mjs';
import activation from './stella-activation-policy.json' with {type:'json'};
import data from './stella-data.json' with {type:'json'};
import {FELLOWS,fellowById,REMOVED,ORIGINAL_FELLOWS} from './catalog.mjs';
import {CROSSOVER_STELLA,CROSSOVER_STELLA_ACTIVATION,crossoverStella,ownsCrossoverStella} from './crossover-stella.mjs';
import {SPIRIT_PROFILES,spiritProfile,spiritShard,ownsSpiritShard,SHIPPED_SPIRIT,SPIRIT_SHARD_ITEM} from './hero-spirit.mjs';
import {ADDITION_FELLOWS} from './everkai-additions.mjs';
import {heroAdvanceSpend} from './hero-advance.mjs';
/** The PER-OWNER profiles: one per original Fellow, `id` IS the owner's Fellow id, which is what every
 *  consumer that loops over this assumes (tests/stella.test.mjs, lib/helper.mjs, the ceiling fixtures).
 *
 *  REBUILT 2026-09-18. This used to be `data.profiles` -- four rows scraped from four community
 *  character pages. The original's own HeroSpirit.json has 126 tracks, and lib/hero-spirit.mjs imports
 *  every one of them (scripts/import-hero-spirit.py). `data.profiles` stays imported below purely as
 *  the four-row table lib/crossover-stella.mjs templates off, so the crossover ladder is unmoved.
 *
 *  The SHARED crossover profile still stands apart: it has many owners and one row set, so a loop that
 *  read its `id` as an owner id would try to activate a Fellow called 'crossover'. Everything here is
 *  per-owner even when several owners SPEND THE SAME ITEM -- that is the faucet decision
 *  (lib/hero-spirit.mjs LOCAL DECISION 1), not a profile-sharing one. */
export const STELLA_PROFILES=SPIRIT_PROFILES;
/** Every profile a save may hold a ledger for: what the validator and the idle mint iterate. Profiles
 *  no longer have distinct itemIds, so the mint DEDUPES BY ITEM -- see settleStella. */
export const ALL_STELLA_PROFILES=Object.freeze([...STELLA_PROFILES,CROSSOVER_STELLA]);
export {CROSSOVER_STELLA,crossoverStella,spiritShard,SPIRIT_SHARD_ITEM};
/** The activation a Fellow's track grants at rank 0. The VALUES now come from the original's own table
 *  (lib/hero-spirit.mjs), which settles what lib/stella-activation-policy.json called unverified: the
 *  +2% is the original's own rank-0 value, for all four owners including hero_190, whose Everkai
 *  activation granted 0. The POLICY IDS still come from that file, because validStella pins a stored
 *  level-0 row's `activationPolicy` against the current one and an old save must keep decoding. */
export const SPIRIT_ACTIVATION_POLICY='hero-spirit-activation-v1';
const policyOf=id=>activation.owners[id]?.activationPolicy||(SHIPPED_SPIRIT.includes(id)?undefined:SPIRIT_ACTIVATION_POLICY);
export const stellaActivation=id=>{const p=spiritProfile(id);
 if(!p)return crossoverStella(id)?CROSSOVER_STELLA_ACTIVATION:null;
 const policy=policyOf(id);return policy?{...p.activation,activationPolicy:policy}:p.activation;};
export const STELLA_ACTIVATION_POLICY=activation.id;
export const stellaRule=id=>spiritProfile(id)||(crossoverStella(id)?CROSSOVER_STELLA:undefined);
/** A profile's owners: itself for every per-owner row, every owned crossover Fellow for the shared
 *  crossover track. Only that one profile carries `type:null`, so that is the test for "shared". */
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
 // is created on demand, but ONLY for a village that owns a Stella-profile Fellow.
 //
 // CHANGED 2026-09-18, and it is the most visible consequence of "everyone has a Stella track": EVERY
 // village owns one now, because the shared village track's owners are every original Fellow without a
 // private ladder and every starter is one of those (hero_15 in fresh(), hero_1/hero_195 in
 // startingSave). So a village that has never opened Stella now grows the subtree on its first settle
 // that pays a whole shard -- 500/day x the habit multiplier, so ~2.9 minutes of play. It holds shards
 // and nothing else; no Power moves until the player activates and spends, and no save is repriced.
 // What did NOT change: decode() never settles, so every save written by an older build still decodes
 // byte-identically (CLAUDE.md rule 12, tests/save-compatibility.test.mjs).
 // The shared crossover track counts as owned when the village holds any crossover FELLOW, so a village
 // with none -- which is every flag-off village, every test, every sim -- still writes nothing for it.
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
 // DEDUPED BY ITEM, 2026-09-18. Profiles are per OWNER now and 107 of them spend one shared shard
 // (lib/hero-spirit.mjs LOCAL DECISION 1), so paying `earned` once per owned PROFILE would pay the
 // shared pool 107 times a day and make the whole roster affordable in a week. The pool is the item,
 // not the profile. This is a no-op for the four private fragment items, which still have exactly one
 // owner each, and for the crossover shard, which always had many owners and one item.
 const pools=new Set();
 for(const p of ALL_STELLA_PROFILES)if(owns(s,p))pools.add(p.itemId);
 for(const itemId of pools){
  const held=stock[itemId]||0,gain=Math.min(earned,1e6-held,1e6-(idle[itemId]||0));
  if(gain<=0)continue;
  stock[itemId]=held+gain;idle[itemId]=(idle[itemId]||0)+gain;moved=true;
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
 *  branch is taken on additionKind, not on the shape of the ledger.
 *
 *  A VILLAGE-track Fellow (2026-09-18) deliberately does NOT take that branch. She is an original Fellow
 *  and keeps the original rule exactly: her own flat from her own row, plus the sum of every activated
 *  percent of her TYPE -- which is what she already received before she had a track of her own, whether
 *  or not she ever opens it. Her own row can never join a type sum because VILLAGE_STELLA's `type` is
 *  null and no Fellow has a null type, so nothing needed a branch here; this note exists so that reading
 *  the crossover branch does not suggest one is missing. */
export function stellaBonus(s,id){const own=stellaEntry(s,id);
 if(crossoverStella(id))return {flat:own?.flat||0,percent:own?.percent||0,selfPercent:0,typedPercent:own?.percent||0};
 // THE OWN-POWER PERCENT JOINS THE SAME SUM (2026-09-18). `self | atk percent` and `country | atk
 // percent` are the same `percent` bucket of PropManager's Formula_ADD at two different scopes, and
 // calc_formual_part sums every contributing system into ONE (1 + S/10000) factor -- it never nests
 // them and never takes a max. So the owner's own percent is added here rather than applied as a
 // second multiplier. On a Fellow who has both (only hero_74 can, since the four country halos and the
 // 116 self halos are disjoint sets except through the re-point) the difference between summing and
 // nesting would be worth up to 2x, which is why the composition is stated rather than assumed.
 // `selfPowerBp` is read off the OWNER'S OWN row only -- it is scope `self`, so it never enters
 // another Fellow's sum, which is the whole difference between it and the typed column below.
 //
 // The two halves are RETURNED SEPARATELY as well as summed. `percent` is what the power model uses --
 // one bucket, one factor. `selfPercent` and `typedPercent` exist because they are the two things a
 // test or a panel needs to tell apart: the broadcast half is the one that can leak onto a Fellow who
 // never bought anything, and before this split every such check had to read the sum and hope.
 const type=fellowById(id)?.type;const selfPercent=(own?.selfPowerBp||0)/100;let typedPercent=0;
 for(const r of entries(s).values())if(r.type===type)typedPercent+=r.percent;
 return {flat:own?.flat||0,percent:selfPercent+typedPercent,selfPercent,typedPercent};}
/** The account-wide appointment-yield percent: `all | appoint percent`, 57 of the 126 tracks, +4% to
 *  +800% each. Scope `all` means EVERY Fellow receives it from EVERY owner who has levelled it, so this
 *  is a whole-save sum and takes no Fellow id -- the same shape the client gives it, and the reason it
 *  is much the largest of the three imported columns (2,721,600 hundredths = +27,216% across all 57).
 *  It multiplies the appointment term in lib/operations.mjs, NOT Power: the original's `appoint` is its
 *  own stat with its own buckets, and the Spirit halos that raise it carry skillType
 *  `Hero_Appoint_Base_1` -- the very skill the original's dispatchconversion reads
 *  (MainCityManager.lua:421-436). Read fresh from the ledger, never stored as a derived total. */
export function stellaAppointBp(s){let n=0;for(const r of entries(s).values())n+=r.appointYieldBp||0;return n;}
/** `self | talentLvLimit`, 57 of the 126 tracks: +50 at one rank and +100 at a later one, to the OWNER'S
 *  OWN talent level cap. Not a Power term at all -- a cap raise, consumed by lib/talents.mjs. Widening
 *  a cap is backward compatible by construction (a stored talentLevel that was legal stays legal), which
 *  is why this one costs no save migration. */
export const stellaTalentLimit=(s,id)=>stellaEntry(s,id)?.talentLimit||0;
/** applyStella, RETIRED 2026-09-18. It wrapped the whole of a Fellow's Power as
 *    floor(power x (1 + stellaPercent/100)) + stellaFlat
 *  -- the flat correctly outside the multiplier, but the percent as a SEPARATE outer factor over every
 *  other percent AND every other flat. The owner's live Power Details panel (docs/power-parity-audit.md
 *  1.4) settles it: the server sends Stella's percent as `percent/underlingskillpower`, one more part of
 *  the SAME additive `percent` bucket as stars, family and artifacts, applied to the ADH x Aptitude term
 *  only. lib/adventure.mjs powerParts now reads stellaBonus directly and puts `percent` there and `flat`
 *  in the flat bucket, so the percent half is counted once, in one place -- nothing here adds a second
 *  Stella percent, and selfPowerBp is already inside stellaBonus.percent. */
/** The history bound. It used to be `sum over profiles of levels+1` = 144, which assumes one owner per
 *  profile. Each SHARED track has one row set and many owners, so each contributes (levels+1) x owners:
 *  144 for the five per-owner ladders (hero_74 restores the 41 Angie's orphaned row still contributes),
 *  plus 41 x 133 for the crossover pool and 21 x |ORIGINAL_FELLOWS| for the village pool. WIDENING only,
 *  so every save that decodes today still decodes (CLAUDE.md saves rule); the bound exists to stop an
 *  unbounded ledger, not to pin a count, which is why the village term is not trimmed to the 107 Fellows
 *  that can actually hold a village row. */
export const STELLA_HISTORY_MAX=STELLA_PROFILES.reduce((n,p)=>n+p.levels.length+1,0)
 +(CROSSOVER_STELLA.levels.length+1)*ADDITION_FELLOWS.length;
/** The four original ladders deliberately do NOT reprice a stored row: a v86 save keeps the benefit it
 *  recorded, which is why tests/stella.test.mjs asserts "old receipt values not repriced". The shared
 *  crossover ladder has no such history -- it has never shipped, so no save can hold a row of it -- and
 *  it is the one whose percent now feeds the Fellow directly (stellaBonus above). So it IS repriced:
 *  every row must carry its own ladder's flat and percent, and the free activation must carry zeros.
 *  Strictly tighter, with no compatibility cost, because there is nothing older to break. */
/** The three columns imported on 2026-09-18. They are written to a receipt ONLY when non-zero, so the
 *  four shipped ladders, the crossover pool and the 23 default ladders -- which carry none of them --
 *  write exactly the row they wrote before, and no save grows a byte for a column it has no value in.
 *  Absent therefore means zero, which is also what a row written before the columns existed means, and
 *  the two cases genuinely are the same case: neither row grants anything. That is why `priced` accepts
 *  an absent field below. The allowance only ever works in the player's favour -- a stripped field
 *  grants 0 where the ladder would have granted more -- and a field carrying a value the ladder does
 *  NOT have is still refused, which is the direction that would matter. */
const SPIRIT_COLUMNS=Object.freeze(['selfPowerBp','appointYieldBp','talentLimit']);
const pricedRow=(r,want)=>r.flat===(want?.flat||0)&&r.percent===(want?.percent||0)
 &&SPIRIT_COLUMNS.every(k=>r[k]===undefined||r[k]===(want?.[k]||0));
const priced=(p,r)=>!p.reprice||pricedRow(r,r.level===0?p.activation:p.levels[r.level-1]);
/** What a receipt records for a row, omitting every column the ladder leaves at zero. */
const columns=row=>Object.fromEntries(SPIRIT_COLUMNS.filter(k=>row[k]).map(k=>[k,row[k]]));
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
 for(const r of t.history){const p=stellaRule(r?.owner);if(!r||!p||!(s.fellows?.[r.owner]||REMOVED.has(r.owner))||!int(r.id)||r.id>t.seq||ids.has(r.id)||r.policyVersion!==1||(r.activationPolicy!==undefined&&(r.level!==0||r.activationPolicy!==(stellaActivation(r.owner)?.activationPolicy||activation.id)))||!int(r.level,p.levels.length)||r.level!==(levels[r.owner]===undefined?0:levels[r.owner]+1)||r.itemId!==p.itemId||r.type!==p.type||!int(r.paid,1e6)||(r.level===0?r.paid!==0:r.paid===0)||!int(r.flat,1e12)||!int(r.percent,10000)||!SPIRIT_COLUMNS.every(k=>r[k]===undefined||int(r[k],1e6))||!priced(p,r)||!int(r.at,Number.MAX_SAFE_INTEGER)||r.at>s.lastAt)return false;ids.add(r.id);levels[r.owner]=r.level;balances[r.itemId]=(balances[r.itemId]||0)-r.paid;}
 // Stock must equal the ledger: what the grants and idle drops paid in, less what upgrades paid out, less
 // what Rarity Advance and Pledge levels paid from the shared shard pool (lib/hero-advance.mjs). That spend
 // is DERIVED from the stored levels; a save without `heroAdvance` subtracts nothing, so every older save
 // meets exactly the identity it always met.
 const spent=heroAdvanceSpend(s);
 return ALL_STELLA_PROFILES.every(p=>(balances[p.itemId]||0)+(t.idle?.[p.itemId]||0)-(spent[p.itemId]||0)===(t.stock[p.itemId]||0));
}
export function stellaPlan(s,id,count=/** @type {number|string} */ (1)){const p=stellaRule(id),entry=stellaEntry(s,id),t=stellaState(s);if(!p||!entry||![1,5,'max'].includes(count))return {rows:[],cost:0};const rows=[];let cost=0;for(const row of p.levels.slice(entry.level,entry.level+(count==='max'?40:count))){if(cost+row.cost>(t.stock[p.itemId]||0)||t.seq+rows.length+1>1e9)break;rows.push(row);cost+=row.cost;}return {rows,cost};}
export function stellaAction(s,action,target,value){if(!['stellaActivate','stellaUpgrade'].includes(action))return null;const old=stellaState(s),p=stellaRule(target),fail=error=>({state:s,error});if(!p||!s.fellows[target]||(!shared(p)&&fellowById(target)?.type!==p.type))return fail('Choose an owned Fellow with a supported Stella curve.');if(value?.seq!==old.seq||old.seq>=1e9)return fail('Stella changed. Use current controls.');const t={...old,seq:old.seq+1,stock:{...old.stock}},balance=t.stock[p.itemId]||0,entry=stellaEntry(s,target);
 // The `stellaSupply` button that stood here is RETIRED: fragments now accrue from idle play in
 // settleStella above, at a rate derived from what that button paid. Old saves keep their `grants`
 // ledger, which validStella still reconciles, so nothing a player already earned is lost.
 if(action==='stellaActivate'&&!stellaActivation(target))return fail('No private activation policy exists for this character.');if(action==='stellaActivate'&&entry)return fail('This Stella is already active.');const plan=action==='stellaActivate'?{rows:[{level:0,...stellaActivation(target)}],cost:0}:stellaPlan(s,target,value.count??1);if(!plan.rows.length)return fail('Activate first and prepare enough owner fragments; the documented cap is the supported limit.');t.stock[p.itemId]=balance-plan.cost;t.seq=old.seq+plan.rows.length;t.history=[...t.history,...plan.rows.map((row,i)=>({policyVersion:1,id:old.seq+i+1,owner:target,level:row.level,itemId:p.itemId,paid:row.cost,type:p.type,flat:row.flat,percent:row.percent,...columns(row),at:s.lastAt,...(row.level===0?{activationPolicy:stellaActivation(target)?.activationPolicy||activation.id}:{})}))];const row=plan.rows.at(-1);
 // EVERY clause is keyed on what the LADDER actually carries, never on what its owner happens to be.
 // Keying the typed clause on `p.type` was the 2026-09-18 defect (every imported per-owner profile
 // carries its owner's real type, so a flat-only track reported "Brave Power +0%", and the crossover
 // pool reported "null Power +0%"). The five ladder shapes that now exist -- flat only; flat + typed
 // percent; flat + own percent; flat + own percent + appointment + talent cap; and the crossover pool
 // -- all read off this one list, so no shape can acquire a clause it has not got, and none of the
 // three columns imported on 2026-09-18 can move a Fellow's Power or a village's income silently.
 const typed=p.type&&p.levels.at(-1).percent>0;
 const clauses=[`+${row.flat.toLocaleString()} own Power`];
 if(row.selfPowerBp)clauses.push(`own Power +${row.selfPowerBp/100}%`);
 if(typed)clauses.push(`${p.type} Power +${row.percent}%`);
 if(row.appointYieldBp)clauses.push(`every Fellow’s appointment yield +${row.appointYieldBp/100}%`);
 if(row.talentLimit)clauses.push(`talent cap +${row.talentLimit}`);
 return {state:{...s,stella:t},message:`${(typed?p.name:fellowById(target)?.name)||p.name} · Stella ${row.level} saved · ${clauses.join(' · ')}.`};
}
