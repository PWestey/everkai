import {REMOVED} from './catalog.mjs';
import {hasCrossoverAbilities,crossoverBaseAptitude} from './crossover-abilities.mjs';
import {habitDay,habitEarnings} from './habits.mjs';
import data from './original-progression-data.json' with {type:'json'};
export const originalProgression=s=>s?.originalProgression?.policyVersion===1;
export const originalCost=level=>level<750?data.levels[level]?.cost??null:null;
/** What CRYSTALS have bought, alone. This is exactly what `originalProgression.quality` stores and what
 *  the receipt chain in validOriginalProgression reconciles, so the ledger is untouched by the grant below. */
export const paidQuality=(s,id)=>s.originalProgression?.quality[id]??1;
export const qualityRule=q=>data.quality[q]||null;
/** The quality tier a Fellow's LOCAL limit breaks already grant. Default mode reads exactly this ladder
 *  (adventure.mjs fellowCap: breaks 0-13 -> tiers 1-14, caps 100..750), so carrying it into APK growth
 *  leaves every save the cap it already had.
 *
 *  WHY THIS EXISTS. Before 2026-09-22 `sourceCap` read the EARNED quality alone, so activation put every
 *  Fellow back at tier 1 / level limit 100. Measured on tests/crossover-stella-save-31c3b32-mine.json (a
 *  real default-mode save, 160 Fellows, one at level 750 with 13 breaks): `activateOriginalProgression`
 *  returned no error and produced a state `valid()` refused and `decode()` threw on -- "Refused by:
 *  validAdventure". Pressing "Use APK growth" bricked the village. The owner's own save has Neptune at
 *  450, so it was one press from the same. */
export const localTier=f=>Math.min(14,(f?.breaks||0)+1);
/** THE TIER A FELLOW HOLDS -- never below the one his limit breaks already bought.
 *
 *  THE OWNER'S REPORT (2026-09-22): "I just spent one crystal of each to get him to 150 max when he's at
 *  300 already." Until now the grant was CAP-ONLY: `sourceCap` took max(earned, localTier) while
 *  `sourceAptitudeBonus` and the crossover badge read the earned quality alone. On a Fellow at level 300
 *  with four limit breaks that made tiers 2,3,4,5 purchasable and worthless -- each cost crystals and moved
 *  the level limit NOT AT ALL, because the breaks already held it at 300. He was re-buying ground he had
 *  already paid limit tokens for, and the only thing he got back was the tier's Aptitude.
 *
 *  So the floor now applies to the WHOLE tier, not just its cap: cap, quality talent and the crossover
 *  rarity badge all read this. A Fellow enters APK growth holding exactly the tier his breaks bought, pays
 *  nothing for it, and the next crystal breakthrough is the first one that actually raises his limit.
 *  What this hands out free is measured in tests/original-progression.test.mjs ("the break-granted tier is
 *  free, and this is what it is worth"): +5 Aptitude per break, to +65 at breaks 13. */
export const sourceQuality=(s,id,f=s?.fellows?.[id])=>Math.max(paidQuality(s,id),localTier(f));
/** Older name for the same number, kept because adventure.mjs and fellow-reset.mjs comments cite it. */
export const sourceTier=sourceQuality;
export const sourceCap=(s,id,f=s?.fellows?.[id])=>qualityRule(sourceQuality(s,id,f)).cap;
/** The base-Aptitude row. An ORIGINAL reads its own row out of the imported table; a CROSSOVER Fellow
 *  reads its rarity ladder at the badge it has climbed to (lib/crossover-abilities.mjs). It used to
 *  borrow its template original's row through sourceId(), which gave a rarity-N crossover Fellow an SSR
 *  anchor's 70-120 where an N original has 20. Not a stored value anywhere: it is read live by
 *  bondedPower, and the only save that records anything derived from Fellow power records the power it
 *  measured at the time (lib/mine-clearance.mjs clampOk), so moving it cannot refuse a save. */
export const heroRow=(s,id)=>hasCrossoverAbilities(id)?crossoverBaseAptitude(id,sourceQuality(s,id)):data.heroes[id];
/** Does a per-id growth record EXIST for this Fellow? This is what the validator and the activation
 *  gate ask -- never the value -- so a crossover Fellow answers yes at every badge. */
export const hasHeroRow=(s,id)=>!!heroRow(s,id);
export const sourceAptitudeBonus=(s,id)=>originalProgression(s)?heroRow(s,id)-10+qualityRule(sourceQuality(s,id)).talent:0;
export const sourceCoefficient=level=>data.levels[level]?.coefficient;
export const SOURCE_MATERIALS=data.materials;
// Local rule. Breakthrough materials (Item_Breach_Hero_*) come from event rewards in the original (19,885
// Rewards rows, mostly Cloud Kingdom, Northrealm and boss dailies), none of which Everkai has. A finished
// daily habit now collects 10 of each of the nine, once a day. Measured with idle Fellow EXP (21 days, APK
// growth): 0/day 444M/s with every Fellow stuck at level 100; 10/day 747M; 25/day 949M; 100/day 1,141M.
export const DAILY_BREACH=10;
/** The ONE place APK growth is switched on. A converted save (activateOriginalProgression) and a NEW
 *  VILLAGE (game.mjs startingSave) go through this, so they are the same shape and the same rules. */
export const withOriginalProgression=s=>({...s,
 trainingCosts:s.trainingCosts||{policyVersion:2,baselineLevels:Object.fromEntries(Object.entries(s.fellows).map(([id,f])=>[id,f.level])),receipts:[]},
 originalProgression:{policyVersion:1,claims:0,quality:{},stock:Object.fromEntries(Object.keys(SOURCE_MATERIALS).map(id=>[id,0])),receipts:[]}});
export function validOriginalProgression(s){
 const p=s.originalProgression;if(p===undefined)return true;
 const int=(n,max)=>Number.isInteger(n)&&n>=0&&n<=max;
 if(!p||p.policyVersion!==1||s.trainingCosts?.policyVersion!==2||!int(p.claims,10000)||!p.quality||Array.isArray(p.quality)||typeof p.quality!=='object'||!p.stock||Array.isArray(p.stock)||typeof p.stock!=='object'||!Array.isArray(p.receipts)||p.receipts.length>3000)return false;
 const qualities={},spent=Object.fromEntries(Object.keys(SOURCE_MATERIALS).map(id=>[id,0]));
 // A released character's receipts stay: the materials they spent are part of the stock ledger.
 for(const r of p.receipts){
  if(!r||!(Object.hasOwn(s.fellows,r.id)||REMOVED.has(r.id))||!int(r.from,13)||r.from<1||r.to!==r.from+1||!int(r.level,750)||r.level<qualityRule(r.from).cap||JSON.stringify(r.cost)!==JSON.stringify(qualityRule(r.from).consume))return false;
  // THE CHAIN, and the ONE place it may jump. Receipts are consecutive over the PAID ladder from tier 1,
  // which is what stops a save reaching quality 14 by paying tier 13's price once. A receipt may start
  // ABOVE the chain only across tiers `localTier` already grants -- those were bought with limit tokens,
  // so nothing is skipped for free. A RELEASED Fellow has no `breaks` left to read and nothing reads his
  // chain value either (releaseRemoved drops his `quality` entry and keeps only the receipts, for `spent`),
  // so his chain is required to move forward and no further.
  const owned=Object.hasOwn(s.fellows,r.id),cur=qualities[r.id]??1,ceiling=owned?localTier(s.fellows[r.id]):14;
  if(!(r.from===cur||(r.from>cur&&r.from<=ceiling)))return false;
  for(const c of r.cost)spent[c.id]+=c.count;qualities[r.id]=r.to;
 }
 if(Object.entries(p.quality).some(([id,q])=>!Object.hasOwn(s.fellows,id)||!int(q,14)||q<1||q!==(qualities[id]??1)))return false;
 if(Object.entries(s.fellows).some(([id,f])=>!hasHeroRow(s,id)||sourceQuality(s,id,f)!==Math.max(qualities[id]??1,localTier(f))||f.level>sourceCap(s,id,f)))return false;
 return Object.keys(p.stock).length===9&&Object.entries(SOURCE_MATERIALS).every(([id])=>int(p.stock[id],1e6)&&p.stock[id]===p.claims*100+(p.dailyClaims||0)*DAILY_BREACH-spent[id])&&(p.dailyClaims===undefined||int(p.dailyClaims,100000))&&(p.dailyDay===undefined||typeof p.dailyDay==='string'&&p.dailyDay.length<=10);
}
export const BREACH_STOCK_CAP=1e6;
/** THE REFUND, and the only thing about this change that rewrites a stored save.
 *
 *  A village ALREADY in APK growth can hold receipts for tiers its Fellow's limit breaks already granted:
 *  every one of those cost crystals and moved the level limit by nothing. The owner has exactly one --
 *  1 Bravery/Wisdom/Hope Crystal Ore for tier 2 on a Fellow whose four breaks already held tier 5 -- and he
 *  is owed it back. Each such receipt is dropped and its cost returned to `stock`, EXACTLY as recorded:
 *  the stock ledger is `claims*100 + dailyClaims*DAILY_BREACH - sum(receipt costs)`, so removing a receipt
 *  and crediting its cost is the same identity, not a mint. Nothing is destroyed either -- a tier removed
 *  here is one `localTier` grants for free, so no cap and no Aptitude moves with it (proven by the diff in
 *  tests/original-progression.test.mjs).
 *
 *  WHY IT IS A DECODE REPAIR AND NOT AN ACTION. There is no press that would run it: the owner's save is
 *  already switched on, so `activateOriginalProgression` refuses it ("Original growth is already active"),
 *  and a refund he has to find a button for is a refund most players never get. decode() is the one path
 *  every save takes. It goes in repairSave's ORDERED pipeline (CLAUDE.md:80) because validAdventure ->
 *  validOriginalProgression is a GUARD, not a quarantine -- a repair after it could never fire.
 *
 *  It is inert on every save with nothing to give back: the default-mode saves (no `originalProgression`),
 *  every save whose Fellows have no limit breaks, and any save it has already run on. If a refund would
 *  push a material past its 1e6 ceiling, nothing is touched at all -- clamping would destroy the overflow,
 *  and the receipts stay as proof the materials were spent. */
export function repairOriginalProgression(s){
 if(!originalProgression(s))return s;
 const p=s.originalProgression,fellows=s?.fellows;
 const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
 if(!obj(fellows)||!obj(p.quality)||!obj(p.stock)||!Array.isArray(p.receipts))return s;
 // A receipt is WASTED when the tier it bought is one this Fellow's limit breaks already grant.
 const wasted=r=>obj(r)&&Object.hasOwn(fellows,r.id)&&Number.isInteger(r.to)&&r.to<=localTier(fellows[r.id])
  &&Array.isArray(r.cost)&&r.cost.every(c=>obj(c)&&Number.isInteger(c.count)&&c.count>=0&&Number.isInteger(p.stock[c.id]));
 const drop=new Set(p.receipts.filter(wasted));
 if(!drop.size)return s;
 const stock={...p.stock};
 for(const r of drop)for(const c of r.cost)stock[c.id]+=c.count;
 if(Object.values(stock).some(n=>n>BREACH_STOCK_CAP))return s;
 const receipts=p.receipts.filter(r=>!drop.has(r)),chain={};
 for(const r of receipts)if(obj(r))chain[r.id]=r.to;
 // Only the Fellows whose receipts moved are rewritten; every other entry is left byte-identical, so a
 // ledger that was tampered with elsewhere is still refused rather than repaired into validity.
 const quality={...p.quality};
 for(const r of drop){const c=chain[r.id]??1;if(c>1)quality[r.id]=c;else delete quality[r.id];}
 return {...s,originalProgression:{...p,stock,receipts,quality}};
}
export function originalProgressionAction(s,action,id){
 const fail=error=>({state:s,error}),p=s.originalProgression;
 if(action==='activateOriginalProgression'){
  if(originalProgression(s))return fail('Original growth is already active.');
  if(Object.keys(s.fellows).some(id=>!hasHeroRow(s,id)))return fail('An owned Fellow has no verified original growth record.');
  return {state:withOriginalProgression(s),message:'APK growth enabled. Levels, level limits, Aptitude, materials and receipts are all preserved; EXP prices are unchanged.'};
 }
 // claimOriginalSupplies (10M EXP + 100 of each material per press, unlimited) is retired. Saves that used it
 // keep their `claims` count, which the stock ledger still credits at 100 each.
 if(!['originalQuality','claimDailyBreach'].includes(action))return null;
 if(!originalProgression(s))return fail('Enable original growth in Training Rules first.');
 if(action==='claimDailyBreach'){
  const today=habitDay(s.lastAt);if(p.dailyDay===today)return fail('Today’s breakthrough materials are already collected.');
  if(habitEarnings(s.habits,s.lastAt).dailies<1)return fail('Complete a daily habit to collect breakthrough materials.');
  if(Object.values(p.stock).some(n=>n>1e6-DAILY_BREACH)||(p.dailyClaims||0)>=100000)return fail('Breakthrough supply storage is full.');
  return {state:{...s,originalProgression:{...p,dailyClaims:(p.dailyClaims||0)+1,dailyDay:today,stock:Object.fromEntries(Object.entries(p.stock).map(([k,n])=>[k,n+DAILY_BREACH]))}},message:`Daily habit reward: ${DAILY_BREACH} of each breakthrough material.`};
 }
 const f=s.fellows[id],q=sourceQuality(s,id),rule=qualityRule(q);if(!f||q>=14)return fail('Choose a Fellow below final quality.');
 if(f.level<rule.cap)return fail(`Reach level ${rule.cap} first.`);if(p.receipts.length>=3000)return fail('Breakthrough receipt storage is full.');
 if(rule.consume.some(c=>p.stock[c.id]<c.count))return fail('Collect the required breakthrough materials.');
 const stock={...p.stock};for(const c of rule.consume)stock[c.id]-=c.count;
 return {state:{...s,originalProgression:{...p,stock,quality:{...p.quality,[id]:q+1},receipts:[...p.receipts,{id,from:q,to:q+1,level:f.level,cost:rule.consume.map(c=>({...c}))}]}},message:`Quality ${q+1} · level limit ${qualityRule(q+1).cap} · original Aptitude bonus +${qualityRule(q+1).talent}.`};
}
