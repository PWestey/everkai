import farmTradeData from './farm-trade-data.json' with {type:'json'};
// PER-SOURCE APTITUDE LEDGER. Several actions add straight to `fellow.aptitude` -- Skill Pearl Aptitude
// training, Alraune essences, opening reforges, and opening talent items -- and that number keeps no record
// of where its points came from, so Refund all could not return them. From this build on, each of those
// actions also writes what it gained and exactly what it consumed into `fellow.aptitudeLedger`, keyed by
// the thing paid:
//   item:<id>     one bag item (or, for an opening item held outside the bag, the Journey locker)
//   essence:<id>  one Alraune essence held in farm.trade.essences
// Entries aggregate by key, so the record stays small no matter how often a Fellow trains.
//
// OPTIONAL STATE. Saves written before this have no ledger and load unchanged; their existing Aptitude is
// simply "from before tracking" and Refund all keeps it. The validator deliberately does NOT pin gain/paid
// to today's per-unit tables (1 pearl = 1 Aptitude, FARM_TRADE_POLICY.aptitudePerEssence, an item row's
// addAtk count): a stored ledger would then be a value derived from those tables, and changing one would
// make every ledgered save unloadable (CLAUDE.md rule 12). It checks shape, bounds and that the ledger
// never claims more Aptitude than the Fellow holds above its base 10.
export const APTITUDE_LEDGER_KEYS=64,APTITUDE_BASE=10;
const ESSENCES=new Set(farmTradeData.essences.map(e=>e.id));
const ITEM=/^[A-Za-z0-9_]{1,80}$/;
export const aptitudeLedgerKey=key=>typeof key==='string'&&(key.startsWith('item:')?ITEM.test(key.slice(5)):key.startsWith('essence:')&&ESSENCES.has(key.slice(8)));
export const aptitudeEntries=f=>f?.aptitudeLedger?.entries||{};
export const ledgeredAptitude=f=>Object.values(aptitudeEntries(f)).reduce((n,e)=>n+e.gain,0);

/** The Fellow after an Aptitude gain paid with `paid` units of `key`. The caller has already added `gain`. */
export function recordAptitude(f,key,paid,gain){
 if(!(paid>0)||!(gain>0))return f;
 const entries=aptitudeEntries(f),old=entries[key]||{paid:0,gain:0};
 return {...f,aptitudeLedger:{policyVersion:1,entries:{...entries,[key]:{paid:old.paid+paid,gain:old.gain+gain}}}};
}

export function validAptitudeLedger(s){
 return Object.values(s.fellows).every(f=>{
  const l=f.aptitudeLedger;if(l===undefined)return true;
  if(!l||typeof l!=='object'||Array.isArray(l)||l.policyVersion!==1||!l.entries||typeof l.entries!=='object'||Array.isArray(l.entries))return false;
  const list=Object.entries(l.entries);if(!list.length||list.length>APTITUDE_LEDGER_KEYS)return false;
  let gain=0;
  for(const [key,e] of list){
   if(!aptitudeLedgerKey(key)||!e||typeof e!=='object'||Object.keys(e).length!==2||!Number.isSafeInteger(e.paid)||e.paid<1||e.paid>1e12||!Number.isInteger(e.gain)||e.gain<1||e.gain>1000)return false;
   gain+=e.gain;
  }
  return gain<=f.aptitude-APTITUDE_BASE;
 });
}
