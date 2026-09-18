import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {REMOVED,REMOVED_COSTUMES} from '../lib/catalog.mjs';
import {releaseRemoved,mentionsRemoved} from '../lib/release-removed.mjs';
import {skillCost,STAR_COSTS} from '../lib/adventure.mjs';
import {summonState} from '../lib/summon.mjs';
import {completionsAvailable} from '../lib/events.mjs';
import {MAX_FELLOW_XP} from '../lib/limits.mjs';
import {affinityIds} from '../lib/public-reference.mjs';
import {FAMILY} from '../lib/catalog.mjs';
import {funded,staffed} from './gear-fixtures.mjs';
const triangle=(n,cost)=>{let t=0;for(let k=0;k<n;k++)t+=cost(k);return t};
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),a);return r.state};

// Nothing is removed as shipped: the Demon Slayer crossover cast left on 2026-09-11 and came back on
// 2026-09-15, so REMOVED is empty and this pipeline is a no-op on every real save today. It is kept for
// the next cast change, and driven here with a SYNTHETIC removed set -- two ids no catalogue has ever
// shipped -- so the machinery is tested on its own terms rather than on whatever happens to be missing.
const GONE=new Set(['hero_90001','wife_90002']);

// A village built with real actions on Kaity and a Family member, then renamed to the synthetic ids:
// exactly the save a player holds after the characters they owned stop shipping.
function ownedBeforeRemoval(trading=false){
 let s=funded(fresh(T));
 s=run(run(s,'welcome','wife_2'),'welcome','wife_3');
 s=run(s,'enrollPupil','wife_2',{type:'diligent',grade:'D',name:'Ren'});
 s=run(s,'openEnterprise','Building_501');s=staffed(s,'Building_501',50);s=run(s,'assignOperator','Building_501','hero_15');
 s=run(s,'adoptFamiliar','Pet_1191');s=run(s,'bindFamiliar','Pet_1191','hero_15');
 s=run(s,'recruit','hero_1');
 if(trading)s=run(s,'tradeBegin','learner',{seq:0,team:['hero_15','hero_1']});
 assert.ok(valid(s));
 return JSON.parse(JSON.stringify(s).replaceAll('"hero_15"','"hero_90001"').replaceAll('"wife_2"','"wife_90002"'));
}

test('a save that owns removed characters is released, and everything else is kept',()=>{
 const old=ownedBeforeRemoval();
 assert.equal(valid(old),false,'as stored, a save naming an unshipped character is refused');
 const s=releaseRemoved(old,GONE);
 assert.ok(valid(s),'the released save loads');
 assert.equal(s.fellows.hero_90001,undefined);assert.equal(s.family.wife_90002,undefined);
 assert.ok(s.fellows.hero_1&&s.family.wife_3,'the characters the player still has are untouched');
 assert.ok(!s.enterprises.Building_501.fellows.includes('hero_90001'),'the business operator slot is freed');
 assert.equal(s.familiarBonds?.hero_90001,undefined,'the familiar bond is released');
 assert.ok(s.familiars.Pet_1191,'the familiar itself stays');
 assert.equal(s.school.pupils[0].caretaker,'wife_3','the pupil moves to a remaining Family member');
 assert.equal(s.school.pupils[0].name,'Ren');
 assert.equal(s.gold,old.gold);
 assert.deepEqual(decode(JSON.stringify(s)),s,'the released save is stable');});

test('release is inert on a save that owns none of them',()=>{
 const s=funded(fresh(T));
 assert.equal(mentionsRemoved(s,GONE),false);
 assert.equal(releaseRemoved(s,GONE),s,'same object back: nothing rewritten');
 // Positive control: the detector does see one of the ids when it is actually owned.
 assert.equal(mentionsRemoved({...s,note:'see hero_90001 later'},GONE),false,'text that merely contains an id is not a reference');
 assert.equal(mentionsRemoved({...s,fellows:{...s.fellows,hero_90001:{}}},GONE),true);});

test('the shipped removed set is the owner 2026-09-17 roster trim, and is inert on a village without one',()=>{
 assert.equal(REMOVED.size,48,'48 Fellows, no Family (lib/content-overrides.json `removed`)');
 assert.ok([...REMOVED].every(id=>id.startsWith('hero_')));
 const s=funded(fresh(T));
 assert.equal(releaseRemoved(s),s,'same object back: a village owning none of them is not rewritten');
 assert.equal(mentionsRemoved(ownedBeforeRemoval()),false,'the synthetic ids are not in the shipped set');});

test('the ledger whitelists must name the same set the release pipeline runs on',()=>{
 // Trading Post runs pin coins and wins to their team, so a release KEEPS a released Fellow in the run
 // record (lib/release-removed.mjs) and validRun (lib/trading-post.mjs:7) accepts an id that is either
 // still owned or in REMOVED. Mine Clearance history and APK progression receipts are whitelisted the
 // same way. That is one contract across four files: whatever leaves the catalogue must land in REMOVED,
 // or every ledger row naming it is refused and the village stops loading. Driving the pipeline with a
 // set REMOVED does not contain shows exactly that failure, which is why this is pinned rather than
 // worked around in the fixture above.
 const s=releaseRemoved(ownedBeforeRemoval(true),GONE);
 assert.deepEqual(s.tradingPost.run.team.map(p=>p.id),['hero_90001','hero_1'],'the run record keeps the released Fellow');
 assert.equal(valid(s),false,'because hero_90001 is not in REMOVED, which a real removal would have done');
 // Positive control: the same save with the in-progress run cleared is valid, so the run really is the
 // one thing refused here and not some other drift in the fixture.
 assert.ok(valid({...s,tradingPost:{...s.tradingPost,run:null}}));});


// ---------------------------------------------------------------------------------------------------
// RULE 12. tests/roster-trim-save-a0efe2b-invested.json was written by the build BEFORE the trim
// (scripts/generate-roster-trim-save.mjs), by a village that recruited five of the 48 while they were
// still in the catalogue and then really spent on them: APK training, a quality breakthrough each,
// skill scrolls, star shards, Skill Pearls, an Ore-upgraded artifact, five Stella levels, costumes,
// an Acquaint-Stone Fountain recruit, and four claimed stages of an Isekai arc whose first member is
// also one of the 48. This build cannot create that save; it has to be able to read it.
const INVESTED=JSON.parse(readFileSync(new URL('./roster-trim-save-a0efe2b-invested.json',import.meta.url),'utf8'));
const GONE_IN_FIXTURE=['hero_2','hero_13','hero_52','hero_102','hero_105','hero_167'];

test('RULE 12: a previous-build save that owns six of the 48 loads, and the refund is EXACT',()=>{
 const before=structuredClone(INVESTED);
 assert.ok(GONE_IN_FIXTURE.every(id=>before.fellows[id]),'positive control: the fixture really owns them');
 assert.ok(GONE_IN_FIXTURE.every(id=>REMOVED.has(id)),'and all six are in the shipped removed set');
 assert.equal(valid(before),false,'as stored, a save naming a character this build does not ship is refused');

 const s=decode(JSON.stringify(before));
 assert.ok(valid(s),'the released save loads');
 for(const id of GONE_IN_FIXTURE)assert.equal(s.fellows[id],undefined,id+' left');
 assert.deepEqual(Object.keys(s.fellows).sort(),['hero_104','hero_15','hero_165'],'and nobody else did');

 // What must come back, derived from the fixture's OWN records rather than from the code under test.
 const mine=id=>REMOVED.has(id);
 const xp=before.trainingCosts.receipts.filter(r=>mine(r.id)).reduce((n,r)=>n+r.cost,0);
 assert.ok(xp>0,'positive control: the fixture has training receipts on removed Fellows');
 assert.equal(s.fellowXP-before.fellowXP,xp,'every EXP the receipts say was paid, and not one more');
 assert.deepEqual(s.trainingCosts.receipts,before.trainingCosts.receipts.filter(r=>!mine(r.id)));

 const scrolls=Object.entries(before.fellows).filter(([id])=>mine(id)).reduce((n,[,f])=>n+triangle(f.skill,k=>skillCost({skill:k})),0);
 assert.ok(scrolls>0);
 assert.equal(s.inventory.local_skill_scroll-before.inventory.local_skill_scroll,scrolls,'skill scrolls');
 const shards=Object.entries(before.fellows).filter(([id])=>mine(id)).reduce((n,[,f])=>n+triangle(f.stars||0,k=>STAR_COSTS[k]),0);
 assert.ok(shards>0);
 assert.equal(summonState(s).starShards-summonState(before).starShards,shards,'star shards');

 const breach={};
 for(const r of before.originalProgression.receipts)if(mine(r.id))for(const c of r.cost)breach[c.id]=(breach[c.id]||0)+c.count;
 assert.ok(Object.keys(breach).length,'positive control: the fixture has quality receipts on removed Fellows');
 for(const [id,n] of Object.entries(breach))assert.equal(s.originalProgression.stock[id]-before.originalProgression.stock[id],n,'breakthrough material '+id);
 assert.ok(!Object.keys(s.originalProgression.quality).some(mine));

 const ore=Object.entries(before.fellows).filter(([id])=>mine(id)).reduce((n,[,f])=>n+(f.gearOreSpent||0),0);
 assert.ok(ore>0,'positive control: one of them had an Ore-upgraded artifact');
 assert.equal(s.artifacts.ore-before.artifacts.ore,ore,'Magic Ore');

 const fragments=before.stella.history.filter(r=>mine(r.owner)&&r.level>0).reduce((n,r)=>n+r.paid,0);
 assert.ok(fragments>0,'positive control: the fixture has paid Stella levels on a removed Fellow');
 const item=before.stella.history.find(r=>r.level>0).itemId;
 assert.equal(s.stella.stock[item]-before.stella.stock[item],fragments,'Stella fragments');
 assert.equal(s.stella.history.filter(r=>r.level>0).length,0,'the paid rows are gone with the fragments');

 const stones=before.fountain.recruited.filter(r=>mine(r.character)).reduce((n,r)=>n+r.paid,0);
 assert.ok(stones>0,'positive control: one of them was a Fountain acquaintance');
 assert.equal(s.fountain.ledger.Lottery_4-before.fountain.ledger.Lottery_4,stones,'Acquaint Stones');
 assert.deepEqual(s.fountain.recruited,before.fountain.recruited.filter(r=>!mine(r.character)),'the surviving receipt is untouched');

 // The arc: DanMachi was claimed to stage 4, and its stage 1 was hero_167. Three surviving stages had
 // step numbers within the first four, so the count drops to 3 and ten habit completions come back.
 assert.equal(before.events.claimed.DanMachi,4);assert.equal(before.events.spent,40);
 assert.equal(s.events.claimed.DanMachi,3);assert.equal(s.events.spent,30);
 assert.equal(completionsAvailable(s)-completionsAvailable(before),10,'the stage that no longer exists is refunded');

 // Costumes: the two on deleted Fellows and the one removed from a Family member who stays are dropped,
 // equips and all; the costume that survived the trim is untouched.
 assert.deepEqual(Object.keys(before.wardrobe.owned).sort(),['H105C1','H2C1','W1C1','W2C1']);
 assert.deepEqual(Object.keys(s.wardrobe.owned),['W2C1']);
 assert.deepEqual(s.wardrobe.equipped,{wife_2:'W2C1'});

 // Where they worked and walked.
 assert.equal(before.buildings.garden.fellow,'hero_105');assert.equal(s.buildings.garden.fellow,null);
 assert.deepEqual(before.adventure.party,['hero_15','hero_2','hero_13']);assert.deepEqual(s.adventure.party,['hero_15']);

 // And NOTHING ELSE moved.
 for(const k of ['version','gold','crystals','pending','earned','upgrades','energy','claims','stats','school','family','bonds','habits','opening'])
  assert.deepEqual(s[k],before[k],k+' was not touched by the release');
 assert.deepEqual(s.fellows.hero_15,before.fellows.hero_15,'a Fellow who stays keeps every point of training');
 assert.deepEqual(decode(JSON.stringify(s)),s,'the released save is stable: decoding it again changes nothing');
});

test('the refund never mints: a second pass gives nothing more, and a capped pool is refused outright',()=>{
 const once=decode(JSON.stringify(INVESTED));
 // Not the same OBJECT: hero_52's free Stella activation row keeps her id in the save forever, so
 // mentionsRemoved stays true and the pipeline keeps running. What matters is that it takes and gives
 // nothing on a second pass -- the arc migration is gated on still owning the members it undoes.
 assert.deepEqual(releaseRemoved(once),once,'a second pass changes nothing');
 assert.deepEqual(releaseRemoved(releaseRemoved(once)),once,'and neither does a third');
 // Caps-refuse: with EXP one short of the ceiling, the training refund cannot fit, so refundPlan refuses
 // and that Fellow's EXP stays spent. Nothing is truncated and the save still loads.
 const full={...structuredClone(INVESTED),fellowXP:MAX_FELLOW_XP-1};
 const s=decode(JSON.stringify(full));
 assert.ok(valid(s));
 assert.equal(s.fellowXP,MAX_FELLOW_XP-1,'not one EXP was minted past the cap, and none was destroyed');
 assert.equal(s.fellows.hero_2,undefined,'the Fellow still left');
 // Positive control: the same save WITHOUT the cap pressure does get its EXP back.
 assert.ok(decode(JSON.stringify(INVESTED)).fellowXP>INVESTED.fellowXP);
});

test('a removed costume on its own repairs a save, but an invented costume id still refuses it',()=>{
 // A player can hold a removed costume without owning any removed Fellow at all, so this repair has to
 // fire on the wardrobe alone -- and it has to fire ONLY on the recorded 173, or it would quietly
 // swallow a forged id that validWardrobe exists to refuse.
 const base=funded(fresh(T));
 const owned=id=>({...base,family:{...base.family,wife_1:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}},wardrobe:{policyVersion:1,owned:{[id]:{collectedAt:1}},equipped:{}}});
 const gone=owned('W1C1');
 assert.ok(REMOVED_COSTUMES.has('W1C1'),'positive control: W1C1 really is one of the 173');
 assert.equal(valid(gone),false,'as stored it is refused');
 const s=decode(JSON.stringify(gone));
 assert.ok(valid(s));assert.deepEqual(s.wardrobe.owned,{});
 assert.ok(s.family.wife_1,'the Family member it belonged to stays');
 assert.equal(mentionsRemoved(gone),false,'and no removed CHARACTER was involved');
 const forged=owned('W999C9');
 assert.equal(valid(forged),false);
 assert.throws(()=>decode(JSON.stringify(forged)),/wardrobe/i,'a costume id that never existed is still refused, not repaired');
});
test('a documented Family bond whose whole affinity list was deleted keeps its level and still loads',()=>{
 // CLAUDE.md rule 12, and the defect this rule was written for: a DERIVED value breaking a save while
 // every source row is untouched. validBonds accepts `original:true` only while affinityIds(id) is
 // non-empty, and affinityIds is COMPUTED from the public-reference blessedFellows list with removed
 // ids filtered out. Seven Family members' lists became empty in the 2026-09-17 trim without one of
 // their own rows changing, and `bonds` is guarded rather than quarantined, so a stored documented bond
 // on any of the seven refused the entire village. Found by decoding a sim save from the previous build.
 const EMPTIED=['wife_12','wife_166','wife_18','wife_19','wife_22','wife_251','wife_59'];
 assert.deepEqual(FAMILY.filter(f=>!affinityIds(f.id).length).map(f=>f.id).sort(),[...EMPTIED].sort(),
  'if this list moves, the numbers in the comment above are stale');
 let s=funded(fresh(T));
 s=run(s,'welcome','wife_12');s=run(s,'welcome','wife_2');
 const stored={...s,bonds:{wife_12:{fellow:null,level:7,original:true},wife_2:{fellow:null,level:4,original:true}}};
 assert.equal(valid(stored),false,'as stored, the emptied documented bond refuses the village');
 const back=decode(JSON.stringify(stored));
 assert.ok(valid(back));
 assert.deepEqual(back.bonds.wife_12,{fellow:null,level:7,original:false},'the level is kept; only the flag goes');
 assert.deepEqual(back.bonds.wife_2,{fellow:null,level:4,original:true},'a list that still has a Fellow on it is untouched');
 assert.deepEqual(decode(JSON.stringify(back)),back,'and the repair is stable');
 // Negative control: the repair is the ONLY thing standing between this save and a refusal. Without
 // wife_12's bond the same village is valid, so the bond really is what was being refused.
 assert.ok(valid({...stored,bonds:{wife_2:stored.bonds.wife_2}}));
});
