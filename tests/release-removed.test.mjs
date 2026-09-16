import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {REMOVED} from '../lib/catalog.mjs';
import {releaseRemoved,mentionsRemoved} from '../lib/release-removed.mjs';
import {funded,staffed} from './gear-fixtures.mjs';
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

test('nothing is removed as shipped, so the default pipeline touches no save',()=>{
 assert.equal(REMOVED.size,0,'if this fails, the catalogue removed characters and the note above is stale');
 const s=funded(fresh(T));
 assert.equal(releaseRemoved(s),s);
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
