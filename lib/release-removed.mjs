import {REMOVED} from './catalog.mjs';
// Releases the characters Everkai no longer ships (content-overrides.json `removed`) from an old save.
// Since e70a8e6 the catalog has no entry for them, so a save that owned one failed validation and would
// not load at all. The owner chose release: the character leaves, everything else stays. Each rule below
// removes a reference the validators tie to an owned Fellow or Family member; anything a player spent on
// the character stays spent. Inert when no removed id appears anywhere in the save.
const gone=id=>REMOVED.has(id);
const obj=x=>!!x&&typeof x==='object'&&!Array.isArray(x);
const dropKeys=o=>obj(o)&&Object.keys(o).some(gone)?Object.fromEntries(Object.entries(o).filter(([k])=>!gone(k))):o;

export function mentionsRemoved(s){const text=JSON.stringify(s);for(const id of REMOVED)if(text.includes(`"${id}"`))return true;return false;}

export function releaseRemoved(s){
 if(!obj(s)||!mentionsRemoved(s))return s;
 const n={...s};
 n.fellows=dropKeys(s.fellows);n.family=dropKeys(s.family);
 const familyIds=Object.keys(n.family||{});
 // Where a Fellow works or travels.
 if(obj(s.enterprises))n.enterprises=Object.fromEntries(Object.entries(s.enterprises).map(([id,b])=>[id,obj(b)&&Array.isArray(b.fellows)&&b.fellows.some(gone)?{...b,fellows:b.fellows.filter(f=>!gone(f))}:b]));
 if(obj(s.buildings))n.buildings=Object.fromEntries(Object.entries(s.buildings).map(([id,b])=>[id,obj(b)&&gone(b.fellow)?{...b,fellow:null}:b]));
 // A village needs at least one Fellow and a party of at least one. If only removed characters were owned,
 // the starter Fellow (Fifi) joins untrained; an emptied party takes the first remaining Fellow.
 if(obj(n.fellows)&&!Object.keys(n.fellows).length)n.fellows={hero_1:{level:1,aptitude:10,skill:0,breaks:0,gear:null}};
 if(obj(s.adventure)&&Array.isArray(s.adventure.party)){const party=s.adventure.party.filter(f=>!gone(f));n.adventure={...s.adventure,party:party.length?party:Object.keys(n.fellows||{}).slice(0,1)};}
 n.familiarBonds=dropKeys(s.familiarBonds);
 if(obj(s.opening))n.opening={...s.opening,operations:dropKeys(s.opening.operations)};
 // Family-keyed records.
 n.bonds=dropKeys(s.bonds);
 if(obj(s.fathoms))n.fathoms={...s.fathoms,tiers:dropKeys(s.fathoms.tiers)};
 if(obj(s.roaming))n.roaming={...s.roaming,bonds:dropKeys(s.roaming.bonds),history:Array.isArray(s.roaming.history)?s.roaming.history.filter(h=>!gone(h?.target)):s.roaming.history};
 // A pupil in the care of a released Family member moves to another Family member; with none left they stay
 // unassigned is not valid, so the first remaining member takes over. Alumni keep their record the same way.
 if(obj(s.school)&&familyIds.length){const re=p=>obj(p)&&gone(p.caretaker)?{...p,caretaker:familyIds[0]}:p;n.school={...s.school,pupils:Array.isArray(s.school.pupils)?s.school.pupils.map(re):s.school.pupils,alumni:Array.isArray(s.school.alumni)?s.school.alumni.map(re):s.school.alumni};}
 // Per-Fellow ledgers: the released Fellow's own rows go with them.
 if(obj(s.trainingCosts))n.trainingCosts={...s.trainingCosts,baselineLevels:dropKeys(s.trainingCosts.baselineLevels),receipts:Array.isArray(s.trainingCosts.receipts)?s.trainingCosts.receipts.filter(r=>!gone(r?.id)):s.trainingCosts.receipts};
 if(obj(s.originalProgression))n.originalProgression={...s.originalProgression,quality:dropKeys(s.originalProgression.quality)};
 if(obj(s.elixirs)&&Array.isArray(s.elixirs.receipts))n.elixirs={...s.elixirs,receipts:s.elixirs.receipts.filter(r=>!gone(r?.fellow)).map((r,i)=>({...r,ordinal:i+1}))};
 // Trading Post runs pin coins and wins to their team, so past and in-progress runs keep a released
 // member (validRun accepts removed ids); only the per-Fellow energy record goes.
 if(obj(s.tradingPost))n.tradingPost={...s.tradingPost,energy:dropKeys(s.tradingPost.energy)};
 if(obj(s.summon)&&Array.isArray(s.summon.recruited))n.summon={...s.summon,recruited:s.summon.recruited.filter(r=>!gone(r?.id))};
 // Never add a field the save did not have (an absent subtree stays absent).
 for(const k of Object.keys(n))if(n[k]===undefined&&!Object.hasOwn(s,k))delete n[k];
 return n;
}
