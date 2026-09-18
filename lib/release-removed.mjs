import {REMOVED,REMOVED_COSTUMES} from './catalog.mjs';
import {refundPlan,refundWallet} from './fellow-reset.mjs';
import {costumeById} from './wardrobe.mjs';
import {EVENTS,costPerStage} from './events.mjs';
import {WISH_RECRUITS} from './fountain.mjs';
import {affinityIds} from './public-reference.mjs';
// Releases characters Everkai no longer ships from an old save. When a character leaves the catalogue the
// validators have no entry for them, so a save that owned one fails validation and will not load at all.
// The owner chose release: the character leaves, everything else stays.
//
// REFUND FIRST, THEN RELEASE. The owner's 2026-09-17 trim deleted 48 Fellows a player may have poured
// months of materials into, so before a Fellow is dropped, everything provably spent on them is handed
// back through the SAME machinery Refund all uses (lib/fellow-reset.mjs refundPlan): training receipts,
// quality breakthroughs, limit tokens, skill scrolls, star shards, talent pearls, Insight, Stella
// fragments, recorded artifact Ore, and the ledgered Aptitude materials. That function's promise is the
// one that matters here -- it returns EXACTLY what a record proves was paid and nothing else -- so this
// pipeline inherits it, including the caps-refuse rule: a refund that would overflow a pool is refused
// outright rather than truncated, and that Fellow's investment simply stays spent, as it does today for
// levels bought before APK training costs existed. A refund is checked against refundWallet() before it
// is accepted, so a release can never mint or destroy a resource.
//
// Two more things are returned here that refundPlan knows nothing about because they are not per-Fellow
// investments: the Acquaint Stones a Fountain acquaintance cost, and the habit completions an Isekai arc
// stage cost. Both carry their own receipt with the price on it, so both are exact.
//
// Everything below is inert when no removed id appears anywhere in the save.
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);

export function mentionsRemoved(s,removed=REMOVED){const text=JSON.stringify(s);for(const id of removed)if(text.includes(`"${id}"`))return true;return false;}

/** A refund must leave every pool in the village at least as full as it was and still an integer. The
 *  round trip is priced by records, so this can only fail if a save's arithmetic was already broken --
 *  in which case the Fellow is released without a refund rather than the save being corrupted. */
function conserves(before,after){
 try{
  const a=refundWallet(before),b=refundWallet(after);
  return Object.keys(b).every(k=>Number.isSafeInteger(b[k])&&b[k]>=(Number.isSafeInteger(a[k])?a[k]:0))&&Object.keys(a).every(k=>Number.isSafeInteger(a[k]));
 }catch{return false}
}

/** Hand back everything provably spent on each removed Fellow the village still owns. */
export function refundReleased(s,removed=REMOVED){
 if(!obj(s)||!obj(s.fellows))return s;
 let n=s;
 for(const id of Object.keys(s.fellows)){
  if(!removed.has(id))continue;
  let plan;
  try{plan=refundPlan(n,id)}catch{continue}
  if(!plan?.state||!conserves(n,plan.state))continue;
  n=plan.state;
 }
 return n;
}

/** The Acquaint Stones a released acquaintance cost, back into the Fountain ledger. The receipt records
 *  `paid`, so this is exact; if the ledger has no room the stones stay spent rather than being clamped
 *  away. The receipt itself must go either way -- validFountain requires the character to still be
 *  owned -- and the 15 WISH_RECRUITS rows are LEFT in the data so an untouched save still validates. */
function releaseFountain(s,gone){
 const f=s.fountain;
 if(!obj(f)||!Array.isArray(f.recruited)||!f.recruited.some(r=>gone(r?.character)))return s;
 const kept=f.recruited.filter(r=>!gone(r?.character));
 let ledger=f.ledger;
 if(obj(ledger)){
  const back=f.recruited.filter(r=>gone(r?.character)).reduce((n,r)=>n+(Number.isSafeInteger(r?.paid)?r.paid:0),0);
  const held=Number.isSafeInteger(ledger.Lottery_4)?ledger.Lottery_4:0;
  if(back>0&&held+back<=1e6)ledger={...ledger,Lottery_4:held+back};
 }
 return {...s,fountain:{...f,recruited:kept,ledger}};
}

/** An Isekai arc whose cast lost a member carries `removedStages`: the ORIGINAL step numbers the trim
 *  deleted and who was on them (lib/event-data.json). A stored `claimed` count of N was written against
 *  the arc as it WAS, so the new count is N less the removed steps that fall inside it, and the habit
 *  completions those stages cost come back by lowering `spent` -- the only place they were ever recorded
 *  (validEvents requires spent to equal the sum of claimed * cost).
 *
 *  The gate is what makes this idempotent, and it has to be: hero_52's free Stella ACTIVATION row stays
 *  in the history after release (it paid nothing, so there is nothing to refund and nothing to unwind),
 *  which means `mentionsRemoved` keeps returning true and this pipeline keeps running on every load. An
 *  arc is migrated only while the save still OWNS one of the members those stages handed over -- and
 *  validEvents guarantees a claimed stage's member IS owned, so the first pass is the only pass. */
function releaseEvents(s){
 const t=s.events;
 if(!obj(t)||!obj(t.claimed)||!Number.isSafeInteger(t.spent))return s;
 const owned=id=>!!(s.fellows?.[id]||s.family?.[id]);
 // An arc id or count this build cannot price is left entirely alone: `spent` is recomputed as a sum
 // below, so a row it cannot add up would be rewritten into a number the save never paid.
 if(!Object.entries(t.claimed).every(([id,n])=>EVENTS.some(x=>x.id===id)&&Number.isSafeInteger(n)&&n>=0))return s;
 const claimed={};let spent=0,changed=false;
 for(const [id,n] of Object.entries(t.claimed)){
  const e=EVENTS.find(x=>x.id===id);
  claimed[id]=n;
  if(n>0&&Array.isArray(e.removedStages)&&e.removedStages.some(r=>owned(r.member))){
   const lost=e.removedStages.filter(r=>Number.isSafeInteger(r?.step)&&r.step<=n).length;
   claimed[id]=Math.max(0,n-lost);
  }
  spent+=claimed[id]*costPerStage(id);
  if(claimed[id]!==n)changed=true;
 }
 return changed?{...s,events:{...t,claimed,spent}}:s;
}

/** A costume whose row left lib/wardrobe-data.json (173 of the 258 went in the 2026-09-17 trim) is
 *  dropped from what the player owns and wears. Keyed on the RECORDED list, not on "any id the wardrobe
 *  cannot resolve": a save naming a costume that never existed must still be REFUSED, which is the guard
 *  tests/wardrobe.test.mjs negative-controls, and a repair that swallowed every unknown id would quietly
 *  remove it. Wardrobe is cosmetic only -- no stat bonus and no collection reward, lib/wardrobe-data.json
 *  policy -- so a removed costume costs the player nothing but the skin and there is nothing to refund.
 *  (`wardrobeScore` sums only costumes still in COSTUMES, so no score moves either.) */
export function releaseCostumes(s){
 const w=s?.wardrobe;
 if(!obj(w)||!obj(w.owned))return s;
 const unknown=id=>REMOVED_COSTUMES.has(id)&&!costumeById(id);
 const equipped=obj(w.equipped)?w.equipped:{};
 if(!Object.keys(w.owned).some(unknown)&&!Object.values(equipped).some(unknown))return s;
 return {...s,wardrobe:{...w,
  owned:Object.fromEntries(Object.entries(w.owned).filter(([id])=>!unknown(id))),
  equipped:Object.fromEntries(Object.entries(equipped).filter(([,id])=>!unknown(id)))}};
}

/** A documented Family bond whose whole affinity list was deleted becomes an ordinary unassigned one.
 *
 *  CLAUDE.md rule 12, and the defect that rule was written for: a DERIVED value breaking a save while
 *  every source row is untouched. validBonds accepts `original:true` only while affinityIds(id) is
 *  non-empty -- `!b.original||b.fellow===null&&affinityIds(id).length>0` -- and affinityIds is COMPUTED
 *  from the public-reference blessedFellows list with removed ids filtered out. Seven Family members'
 *  lists became empty in the 2026-09-17 trim without one of their own rows changing, and `bonds` is a
 *  subtree decode() GUARDS rather than quarantines, so a stored documented bond on any of the seven
 *  refused the whole village. Found by decoding a sim save written by the previous build.
 *
 *  The trained `level` is kept exactly. Nothing is lost by the flag going: bondFactor pays a documented
 *  bond only through hasAffinity(), which is already false for every Fellow when the list is empty, so
 *  such a bond was paying nothing before this ran. The player can point it at a Fellow again.
 *
 *  Runs on EVERY save, not only one that owns a removed character: a village can hold one of these
 *  bonds and own none of the 48. */
export function releaseOrphanedBonds(s){
 const bonds=s?.bonds;
 if(!obj(bonds))return s;
 const orphan=([id,b])=>obj(b)&&b.original&&!affinityIds(id).length;
 if(!Object.entries(bonds).some(orphan))return s;
 return {...s,bonds:Object.fromEntries(Object.entries(bonds).map(e=>orphan(e)?[e[0],{...e[1],original:false,fellow:null}]:e))};
}

export function releaseRemoved(s,removed=REMOVED){
 if(!obj(s))return s;
 const trimmed=releaseOrphanedBonds(releaseCostumes(s));
 if(!mentionsRemoved(trimmed,removed))return trimmed===s?s:trimmed;
 const paid=refundReleased(trimmed,removed);
 const gone=id=>removed.has(id);
 const dropKeys=o=>obj(o)&&Object.keys(o).some(gone)?Object.fromEntries(Object.entries(o).filter(([k])=>!gone(k))):o;
 const prev=releaseEvents(releaseFountain(paid,gone));
 const n={...prev};
 n.fellows=dropKeys(prev.fellows);n.family=dropKeys(prev.family);
 const familyIds=Object.keys(n.family||{});
 // Where a Fellow works or travels.
 if(obj(prev.enterprises))n.enterprises=Object.fromEntries(Object.entries(prev.enterprises).map(([id,b])=>[id,obj(b)&&Array.isArray(b.fellows)&&b.fellows.some(gone)?{...b,fellows:b.fellows.filter(f=>!gone(f))}:b]));
 if(obj(prev.buildings))n.buildings=Object.fromEntries(Object.entries(prev.buildings).map(([id,b])=>[id,obj(b)&&gone(b.fellow)?{...b,fellow:null}:b]));
 // A village needs at least one Fellow and a party of at least one. If only removed characters were owned,
 // the starter Fellow (Fifi) joins untrained; an emptied party takes the first remaining Fellow.
 if(obj(n.fellows)&&!Object.keys(n.fellows).length)n.fellows={hero_1:{level:1,aptitude:10,skill:0,breaks:0,gear:null}};
 if(obj(prev.adventure)&&Array.isArray(prev.adventure.party)){const party=prev.adventure.party.filter(f=>!gone(f));n.adventure={...prev.adventure,party:party.length?party:Object.keys(n.fellows||{}).slice(0,1)};}
 n.familiarBonds=dropKeys(prev.familiarBonds);
 if(obj(prev.opening))n.opening={...prev.opening,operations:dropKeys(prev.opening.operations)};
 // Family-keyed records.
 n.bonds=dropKeys(prev.bonds);
 // ...and the Fellow a Family bond points AT: validBonds requires b.fellow to be owned, so a bond aimed
 // at a released Fellow is returned to unassigned rather than taking the whole village down with it.
 if(obj(n.bonds))n.bonds=Object.fromEntries(Object.entries(n.bonds).map(([id,b])=>[id,obj(b)&&gone(b.fellow)?{...b,fellow:null}:b]));
 if(obj(prev.fathoms))n.fathoms={...prev.fathoms,tiers:dropKeys(prev.fathoms.tiers)};
 if(obj(prev.roaming))n.roaming={...prev.roaming,bonds:dropKeys(prev.roaming.bonds),history:Array.isArray(prev.roaming.history)?prev.roaming.history.filter(h=>!gone(h?.target)):prev.roaming.history};
 // A pupil in the care of a released Family member moves to another Family member; with none left they stay
 // unassigned is not valid, so the first remaining member takes over. Alumni keep their record the same way.
 if(obj(prev.school)&&familyIds.length){const re=p=>obj(p)&&gone(p.caretaker)?{...p,caretaker:familyIds[0]}:p;n.school={...prev.school,pupils:Array.isArray(prev.school.pupils)?prev.school.pupils.map(re):prev.school.pupils,alumni:Array.isArray(prev.school.alumni)?prev.school.alumni.map(re):prev.school.alumni};}
 // Per-Fellow ledgers: the released Fellow's own rows go with them.
 if(obj(prev.trainingCosts))n.trainingCosts={...prev.trainingCosts,baselineLevels:dropKeys(prev.trainingCosts.baselineLevels),receipts:Array.isArray(prev.trainingCosts.receipts)?prev.trainingCosts.receipts.filter(r=>!gone(r?.id)):prev.trainingCosts.receipts};
 if(obj(prev.originalProgression))n.originalProgression={...prev.originalProgression,quality:dropKeys(prev.originalProgression.quality)};
 if(obj(prev.elixirs)&&Array.isArray(prev.elixirs.receipts))n.elixirs={...prev.elixirs,receipts:prev.elixirs.receipts.filter(r=>!gone(r?.fellow)).map((r,i)=>({...r,ordinal:i+1}))};
 // Insight levels are keyed by Fellow and validInsight requires the owner. The materials were returned by
 // the refund above when it could be exact; when it could not, they stay spent and only the row goes.
 if(obj(prev.insight))n.insight={...prev.insight,levels:dropKeys(prev.insight.levels)};
 // Workshop sales XP, mastery and an in-progress job all name a Fellow the validator requires to be owned.
 // XP is not a resource the player can spend anywhere else, so it goes with them; a job in progress is
 // cancelled, which is what already happens to every other assignment above.
 if(obj(prev.workshop)){n.workshop={...prev.workshop,salesXP:dropKeys(prev.workshop.salesXP),job:obj(prev.workshop.job)&&gone(prev.workshop.job.fellow)?null:prev.workshop.job};
  if(obj(prev.workshop.mastery))n.workshop.mastery=dropKeys(prev.workshop.mastery);}
 // Expo stall assignments, and any saved business day whose operator has left. A finished run is a
 // reward record, but validExpo re-checks every slot's Fellow, so a run naming one cannot be kept.
 if(obj(prev.expo)){const live=r=>!(obj(r)&&Array.isArray(r.slots)&&r.slots.some(x=>gone(x?.fellow)));
  n.expo={...prev.expo,assigned:obj(prev.expo.assigned)?Object.fromEntries(Object.entries(prev.expo.assigned).filter(([,f])=>!gone(f))):prev.expo.assigned,
   clears:Array.isArray(prev.expo.clears)?prev.expo.clears.filter(live).map((r,i)=>({...r,stage:i+1})):prev.expo.clears,
   active:live(prev.expo.active)?prev.expo.active:null,last:live(prev.expo.last)?prev.expo.last:null};}
 // A Frontier attempt in progress needs a party of exactly three owned Fellows, so one that named a
 // released Fellow is abandoned: `cleared` and `attempts` are untouched, only the live attempt goes.
 if(obj(prev.frontier)&&obj(prev.frontier.active)&&Array.isArray(prev.frontier.active.party)&&prev.frontier.active.party.some(gone))n.frontier={...prev.frontier,active:null};
 // Trading Post runs pin coins and wins to their team, so past and in-progress runs keep a released
 // member (validRun accepts removed ids); only the per-Fellow energy record goes.
 if(obj(prev.tradingPost))n.tradingPost={...prev.tradingPost,energy:dropKeys(prev.tradingPost.energy)};
 if(obj(prev.summon)&&Array.isArray(prev.summon.recruited))n.summon={...prev.summon,recruited:prev.summon.recruited.filter(r=>!gone(r?.id))};
 // Never add a field the save did not have (an absent subtree stays absent).
 for(const k of Object.keys(n))if(n[k]===undefined&&!Object.hasOwn(s,k))delete n[k];
 return n;
}
