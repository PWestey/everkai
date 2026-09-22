import data from './latency-data.json' with {type:'json'};
import {habitActions,fathomsApply} from './fathoms.mjs';
/** FAMILY LATENCY -- the original's WifePotential (docs/character-systems-gap.md 3.1, ranked 4).
 *
 *  THE ONE SYSTEM OF THE SIX THAT WAS WHOLLY ABSENT. Not "folded into another screen", not "shipped
 *  without a panel" -- no identifier, no table, no action, no save field. The doc's positive control
 *  for that claim: the same sweep returns 40+ files for `fathom` and 20+ for `stella`, and zero for
 *  `latency`.
 *
 *  WHAT IT IS. Per Family member: a CAP raised in 41 discrete steps gated by Intimacy, and a FILL
 *  raised by a paid random action the original calls Stimulate. The fill, summed over every member,
 *  is a flat percentage added to EVERY building's earnings -- the same additive bucket as Fathoms and
 *  building quality (MainCityManager.lua:388-436, `beautyquenching` and its neighbours).
 *
 *  UNITS, once, because everything here is in them: `count` and `cap` are HUNDREDTHS OF A PERCENT.
 *  13,200 is +132%, which is the owner's own Shinobu in reference screenshot 14_family_latency. Fill
 *  ratio is ten-thousandths of the cap, which is what the weight table is keyed on: 13,200 of a
 *  40,000 cap is 3,300, landing in row 2 (2,501-5,000), `weightSuccess` 5,000 -- and the panel in
 *  that screenshot reads "Success Rate: 50%". That is the cross-check that validates the whole roll.
 *
 *  THE ACCOUNT-WIDE SUM IS THE ORIGINAL'S OWN, AND IT IS NOT CAPPED HERE.
 *  `BeautyManager:GetAllWifeBuildingPotential()` sums `potentialCount` over EVERY family member, and
 *  that is the reading implemented: `latencyBonus` is a whole-roster sum. docs/character-systems-gap.md
 *  7.1 recommends capping it and asking the owner first; the owner's standing instruction of
 *  2026-09-22 overrides that -- "implement what the original's tables and client say, faithfully,
 *  without inventing caps or brakes... where the original's value looks extreme, ship it and REPORT
 *  the measured consequence rather than softening it." So there is no cap, and the consequence is
 *  measured in tests/latency.test.mjs rather than hidden.
 *
 *  THE OTHER READING, stated because doc 6 question 3 says the screenshot cannot tell them apart: if
 *  the panel's "+132%" were already the ACCOUNT TOTAL rather than one member's own, then the term
 *  would be `max` or a single shared bar instead of a sum, and a hundred members at +132% each would
 *  be worth +132% rather than +13,200% -- a factor of the roster size, ~100x. `latencyTotalAlternate`
 *  below computes that reading too, so the difference is a number a reader can see rather than a
 *  paragraph. Only the SUM is paid; the alternate is reported, never applied.
 *
 *  THE CURRENCY IS LOCAL AND SAYS SO. The original charges Luck Stones (`Item_Quenching_Wife_1`),
 *  whose `Item:source` names the Drakenberg Challenge shop. Everkai has a Drakenberg but no challenge
 *  shop, and the shop's stock table is not in the config dump -- positive control: the sweep reads
 *  highwayShop (the Drakenberg Challenge's own shop, 20 rows), guildShop, ResourceShop and RandomShop
 *  rows, and none of them stocks this item. So the FAUCET is Everkai's, and it is the one doc 7.2
 *  recommends: the habit counter Fathoms already gates on. `habitActions` is monotonic, unbuyable and
 *  never reset, so the balance needs no storage at all -- earned minus spent, both derived.
 *
 *  SAVES (rule 12). One optional QUARANTINABLE subtree, `s.latency`. It is NOT stored on the family
 *  member: `family` is not in QUARANTINABLE (lib/game.mjs), so a bad guard there loses the village
 *  rather than degrading it -- the comment already sitting above that check. The rule-12 exposure is
 *  the DERIVED one the doc names: a new earnings term changes business income, and
 *  `s.enterprises[*].staffingYield` stores a cohort split. Checked: that split pins `retainedRate`
 *  against BUSINESSES and `retainedEmployees` against the employee count, neither of which is a
 *  function of income, and business income is recomputed from live rates every settle. A save without
 *  the subtree is unchanged in every respect.
 *
 *  THE ROLL IS SEEDED, so a reload cannot re-roll it: the outcome is written into `count` and the
 *  seed advances, exactly the discipline lib/fountain.mjs uses for wishes. */
export const LATENCY_LEVELS=data.levels;
export const LATENCY_WEIGHTS=data.weights;
export const LATENCY_CAP_LEVEL=data.levels.length-1;
export const LUCK_STONE=data.stimulate.item;
export const STIMULATE_COST=data.stimulate.count;
export const STIMULATE_TEN_X=data.stimulate.tenX;
export const LATENCY_UNMODELLED=data.unmodelled;
/** LOCAL, and the only invented rate in this system: Luck Stones per lifetime habit action.
 *
 *  Anchored rather than guessed. Its sibling is Fathoms -- in the ORIGINAL the two compete for this
 *  same Luck Stone, and in Everkai Fathoms is paced at 3 advances a day, 864 advances, about 288 days
 *  for one member's whole ladder (lib/fathoms.mjs). The tables price one member's +800% cap at ~2,300
 *  Stimulates, i.e. ~11,500 stones. At the ~3 habit actions a day the Fathom gates are paced against,
 *  10 stones an action is ~30 a day, which puts that same full ladder at about 380 days -- the same
 *  order as its sibling. Both halves of that ratio are named: the stone count is the original's
 *  table, the action rate is Everkai's own Fathom pacing. */
export const STONES_PER_ACTION=10;
const int=(n,max=Number.MAX_SAFE_INTEGER)=>Number.isSafeInteger(n)&&n>=0&&n<=max;
const record=x=>x&&typeof x==='object'&&!Array.isArray(x);
export const latencyState=s=>s?.latency||{policyVersion:1,seq:0,seed:987654321,members:{}};
const memberOf=(s,id)=>latencyState(s).members?.[id]||{level:0,count:0,attempts:0};
/** Does Latency apply to this Family member at all? Crossover Family are excluded, for the same
 *  measured reason lib/fathoms.mjs excludes them and stated there: they are not in the original's
 *  table, so there is no record to port -- and this term is summed account-wide, which is precisely
 *  the axis the crossover slice refused to widen. Reusing `fathomsApply` keeps the two siblings from
 *  drifting apart. */
export const latencyApply=id=>fathomsApply(id);
export const latencyLevel=(s,id)=>{const n=memberOf(s,id).level;return Number.isInteger(n)&&n>=0&&n<=LATENCY_CAP_LEVEL?n:0;};
export const latencyCap=(s,id)=>LATENCY_LEVELS[latencyLevel(s,id)].cap;
export const latencyCount=(s,id)=>Math.min(memberOf(s,id).count||0,latencyCap(s,id));
/** Ten-thousandths of the cap that are already filled -- what the weight table is keyed on. */
export const latencyFill=(s,id)=>{const cap=latencyCap(s,id);return cap?Math.min(10000,Math.floor(latencyCount(s,id)*10000/cap)):10000;};
export const latencyWeightRow=fill=>LATENCY_WEIGHTS.find(w=>fill>=w.min&&fill<=w.max)||LATENCY_WEIGHTS.at(-1);
/** Luck Stones this save has earned and spent. Both derived, so no balance is stored and none can
 *  drift: earned from the monotonic habit counter, spent from the stored levels and attempt counts. */
export const luckStonesEarned=s=>habitActions(s)*STONES_PER_ACTION;
export function luckStonesSpent(s){
 let n=0;
 for(const m of Object.values(latencyState(s).members||{})){
  for(let k=0;k<(m.level||0);k++)n+=LATENCY_LEVELS[k].stones||0;
  n+=(m.attempts||0)*STIMULATE_COST;
 }
 return n;
}
export const luckStones=s=>luckStonesEarned(s)-luckStonesSpent(s);
/** What it takes to raise this member's cap by one: the Intimacy on her CURRENT row and its price.
 *  Null at the top of the ladder. */
export function latencyNextLevel(s,id){
 const level=latencyLevel(s,id),row=LATENCY_LEVELS[level];
 if(row.intimacy===null)return null;
 const member=s?.family?.[id];
 return {level:level+1,cap:LATENCY_LEVELS[level+1].cap,intimacy:row.intimacy,stones:row.stones||0,
         have:member?.intimacy||0,met:(member?.intimacy||0)>=row.intimacy};
}
/** THE ACCOUNT-WIDE TERM, as a fraction, ready to add to a business multiplier. This is the client's
 *  own GetAllWifeBuildingPotential: a sum over every member, with no cap. */
export function latencyBonus(s){
 let total=0;
 for(const id of Object.keys(s?.family||{}))if(latencyApply(id))total+=latencyCount(s,id);
 return total/10000;
}
/** The OTHER reading of the same screenshot (doc 6 question 3): the largest single member's fill
 *  rather than the sum of all of them. Reported, never paid -- nothing in the earnings model calls
 *  this. It exists so "which reading did you implement, and what would the other give" is answerable
 *  with two numbers from one save. */
export function latencyTotalAlternate(s){
 let best=0;
 for(const id of Object.keys(s?.family||{}))if(latencyApply(id))best=Math.max(best,latencyCount(s,id));
 return best/10000;
}
/** The LCG lib/fountain.mjs uses, so both random systems advance a seed the same way and a save can
 *  be reasoned about once rather than twice. */
const advance=seed=>(Math.imul(seed,1664525)+1013904223)>>>0;
/** One Stimulate against a seed. Pure: given the seed, the cap and the fill, the outcome is fixed --
 *  which is what stops a reload re-rolling it, because the result is written into `count` and the
 *  seed moves on. */
export function stimulateRoll(seed,cap,count){
 const fill=cap?Math.min(10000,Math.floor(count*10000/cap)):10000;
 const row=latencyWeightRow(fill);
 let next=advance(seed);
 if(next%10000>=row.success)return {seed:next,gain:0,success:false,chance:row.success};
 next=advance(next);
 const totalWeight=row.results.reduce((n,r)=>n+r[1],0);
 let roll=next%totalWeight,gain=row.results.at(-1)[0];
 for(const [up,weight] of row.results){if(roll<weight){gain=up;break;}roll-=weight;}
 return {seed:next,gain:Math.min(gain,cap-count),success:true,chance:row.success};
}
export function validLatency(s){
 const t=s?.latency;
 if(t===undefined)return true;
 if(!record(t)||t.policyVersion!==1||!int(t.seq,1e9)||!int(t.seed,4294967295)||!record(t.members)||Object.keys(t).length!==4)return false;
 for(const [id,m] of Object.entries(t.members)){
  if(!record(m)||!Object.hasOwn(s.family||{},id)||!latencyApply(id))return false;
  if(!int(m.level,LATENCY_CAP_LEVEL)||!int(m.count,1e9)||!int(m.attempts,1e9))return false;
  // A level is only legal if the member's Intimacy actually reached every gate below it, and a fill
  // can never exceed the cap that level allows. Both are re-derived from the pinned table, never
  // trusted from the save.
  for(let k=0;k<m.level;k++)if((s.family[id].intimacy||0)<LATENCY_LEVELS[k].intimacy)return false;
  if(m.count>LATENCY_LEVELS[m.level].cap)return false;
  // The fill cannot be larger than the most generous run of attempts could have produced: every
  // attempt succeeding at the best result on the table. This is the bound that stops a save minting
  // Latency out of nothing, and it is the same shape as the Study Notes and Goodwill Voucher
  // identities -- a stored value checked against what the receipts could have paid for.
  if(m.count>m.attempts*LATENCY_WEIGHTS[0].results.at(-1)[0])return false;
 }
 // Rule 12's own exposure, and the reason the faucet is derived: a re-rated stone or a re-priced
 // ladder would refuse a legal save. Both are pinned by tests/latency.test.mjs.
 return luckStonesSpent(s)<=luckStonesEarned(s);
}
export function latencyAction(s,action,target,value){
 if(action!=='latencyLevel'&&action!=='latencyStimulate')return null;
 const fail=error=>({state:s,error});
 const member=s.family?.[target];
 if(!member)return fail('Welcome this family member first.');
 if(!latencyApply(target))return fail('Latency is the village’s own tradition and is not open to this companion.');
 const old=latencyState(s),held=luckStones(s);
 const current=memberOf(s,target),level=latencyLevel(s,target);
 const write=(row,extra)=>({...s,latency:{policyVersion:1,seq:old.seq+1,seed:extra?.seed??old.seed,
   members:{...old.members,[target]:row}}});
 if(action==='latencyLevel'){
  const next=latencyNextLevel(s,target);
  if(!next)return fail(`Latency cap is at the original’s top of +${LATENCY_LEVELS[LATENCY_CAP_LEVEL].cap/100}%.`);
  if(!next.met)return fail(`Raise Intimacy to ${next.intimacy.toLocaleString()} to widen this Latency (now ${next.have.toLocaleString()}).`);
  if(held<next.stones)return fail(`Needs ${next.stones} Luck Stone${next.stones===1?'':'s'}; ${held.toLocaleString()} held.`);
  return {state:write({...current,level:next.level}),
          message:`Latency cap +${next.cap/100}%${next.stones?` for ${next.stones} Luck Stone${next.stones===1?'':'s'}`:' · free'}.`};
 }
 const times=value===undefined||value===null?1:value;
 if(![1,10].includes(times))return fail('Choose one or ten Stimulates.');
 if(times===10&&level<STIMULATE_TEN_X)return fail(`The original opens x10 Stimulate at Latency level ${STIMULATE_TEN_X}.`);
 const cap=latencyCap(s,target);
 if(!cap)return fail('Widen this Latency once before stimulating it.');
 if(latencyCount(s,target)>=cap)return fail('This Latency is full. Widen the cap to keep going.');
 const price=times*STIMULATE_COST;
 if(held<price)return fail(`Needs ${price} Luck Stones; ${held.toLocaleString()} held.`);
 let seed=old.seed,count=latencyCount(s,target),gained=0,wins=0,used=0;
 for(let i=0;i<times&&count<cap;i++){
  const roll=stimulateRoll(seed,cap,count);
  seed=roll.seed;used++;
  if(roll.success){count+=roll.gain;gained+=roll.gain;wins++;}
 }
 return {state:write({...current,count,attempts:(current.attempts||0)+used},{seed}),
         message:`${wins}/${used} Stimulates landed · Latency +${gained/100}% → +${count/100}% for ${used*STIMULATE_COST} Luck Stones.`};
}
