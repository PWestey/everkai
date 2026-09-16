import data from './inn-economy-data.json' with {type:'json'};
/** The Inn's money, measured from the original config set (see inn-economy-data.json `provenance`).
 *
 *  BUG-31: Everkai paid a flat 50 gold for every guest, every dish, every level. The original pays
 *  SimGame1FoodLevel.coinEarnings, which is per dish AND per dish level -- 1,000 gold for the cheapest
 *  dish at level 1 up to 408,000,000 for the dearest at level 50.
 *
 *  A dish's level is bought with PROFICIENCY, which is the same quantity Everkai already banks per dish
 *  as `finesse`: lib/inn-progression-data.json finesseByLevel is SimGame1KitchenwareLevel.proficiencyCount
 *  verbatim (100 at station level 1 rising to 480 at 30, identical across all ten stations). So both
 *  halves of the ladder come from the same source -- proficiency earned per serving from
 *  SimGame1KitchenwareLevel, proficiency spent per dish level from SimGame1FoodLevel.consume.
 *
 *  `consume` is a per-step cost, not a running total: level 50 carries the terminator -1. Everkai's
 *  `finesse` is a lifetime counter that is never spent, so the level is read off the CUMULATIVE ladder
 *  below, which gives the same level a greedy spend-as-you-go player would hold, and leaves every
 *  existing save's finesse figure untouched.
 */
export const INN_DISH_LEVEL_CAP=data.dishLevelCap;
export const INN_BASE_STAMINA=data.baseStamina;
export const INN_ECONOMY=data;
/** cumulative[i] is the total proficiency a dish must have earned to stand at level i+2. */
const cumulative=data.ladders.map(l=>{const out=[];let n=0;for(const c of l){n+=c;out.push(n)}return out});
/** These throw rather than falling back. A `?? 0` here is the exact shape of BUG-21/BUG-22/C7-02: a
 *  missing row that reads at runtime as a legitimately tiny number. Every id reaching these functions
 *  has already been checked against INN_DISHES/INN_STATIONS by validInn or the panel, and
 *  tests/inn-economy.test.mjs asserts the tables cover all 80 dishes and all 10 stations. */
const lookup=(table,key,what)=>{const v=table[key];if(v===undefined)throw Error(`Inn ${what} has no entry for ${key}`);return v};
export function innDishLevel(finesse,dish){
 const cum=cumulative[lookup(data.dishLadder,dish,'proficiency ladder')];
 const n=Number.isFinite(finesse)&&finesse>0?finesse:0;
 let lo=0,hi=cum.length;while(lo<hi){const mid=(lo+hi)>>1;if(cum[mid]<=n)lo=mid+1;else hi=mid}
 return lo+1;
}
export function innDishEarnings(dish,level){
 const [base,step]=lookup(data.coin,dish,'earnings ladder');
 return base+step*(Math.min(Math.max(1,Math.trunc(level)||1),INN_DISH_LEVEL_CAP)-1);
}
/** The most a single guest can ever pay for this dish: level 50. Used as the admission and save-guard
 *  bound, because a queue's finesse (and so its level) rises while the queue is being served. */
export const innMaxDishEarnings=dish=>innDishEarnings(dish,INN_DISH_LEVEL_CAP);
/** Proficiency to take this dish from `level` to the next, or null at the cap. */
export const innDishUpgradeCost=(dish,level)=>level>=INN_DISH_LEVEL_CAP?null:data.ladders[lookup(data.dishLadder,dish,'proficiency ladder')][Math.max(1,level)-1];
/** Proficiency this dish still needs before its next level, or null at the cap. */
export function innDishToNextLevel(finesse,dish){
 const level=innDishLevel(finesse,dish);if(level>=INN_DISH_LEVEL_CAP)return null;
 return cumulative[lookup(data.dishLadder,dish,'proficiency ladder')][level-1]-(finesse>0?finesse:0);
}
/** SimGame1Food.unlockConsume -- gold (Item.json row 3) to develop the recipe. ECON-17. */
export const innRecipeGold=dish=>lookup(data.developGold,dish,'recipe price');
/** SimGame1Kitchenware.consume -- gold to build the station. BUG-30: 0 for stations 1-3, 5,000 for 4-10. */
export const innStationBuildGold=station=>lookup(data.stationBuildGold,station,'station price');
/** What `count` consecutive guests pay, each at the dish level its predecessors' proficiency has bought. */
export function innQueueEarnings(dish,finesse,perGuest,count){
 let f=finesse>0?finesse:0,gold=0;
 for(let n=0;n<count;n++){gold+=innDishEarnings(dish,innDishLevel(f,dish));f+=perGuest}
 return gold;
}
