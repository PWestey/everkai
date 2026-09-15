import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {REMOVED} from '../lib/catalog.mjs';
import {releaseRemoved,mentionsRemoved} from '../lib/release-removed.mjs';
import {funded,staffed} from './gear-fixtures.mjs';
const T=new Date('2026-09-16T09:00:00').getTime();
const run=(s,a,t=null,v=null)=>{const r=act(s,a,s.lastAt,t,v);assert.equal(r.error,undefined,`${a}: ${r.error}`);assert.ok(valid(r.state),a);return r.state};

// A village from before e70a8e6 could own a Demon Slayer crossover character. Built here with real actions on
// Kaity and a Family member, then renamed to removed ids, which is exactly the save such a player holds:
// the catalog no longer has the character, so the village failed to load at all.
function ownedBeforeRemoval(){
 let s=funded(fresh(T));
 s=run(run(s,'welcome','wife_2'),'welcome','wife_3');
 s=run(s,'enrollPupil','wife_2',{type:'diligent',grade:'D',name:'Ren'});
 s=run(s,'openEnterprise','Building_501');s=staffed(s,'Building_501',50);s=run(s,'assignOperator','Building_501','hero_15');
 s=run(s,'adoptFamiliar','Pet_1191');s=run(s,'bindFamiliar','Pet_1191','hero_15');
 s=run(s,'recruit','hero_1');
 s=run(s,'tradeBegin','learner',{seq:0,team:['hero_15','hero_1']});
 assert.ok(valid(s));
 return JSON.parse(JSON.stringify(s).replaceAll('"hero_15"','"hero_302"').replaceAll('"wife_2"','"wife_186"'));
}

test('a save that owns removed characters loads with them released and everything else kept',()=>{
 const old=ownedBeforeRemoval();
 assert.ok(REMOVED.has('hero_302')&&REMOVED.has('wife_186'));
 assert.equal(valid(old),false,'as stored, the save is refused');
 const s=decode(JSON.stringify(old));
 assert.ok(valid(s));
 assert.equal(s.fellows.hero_302,undefined);assert.equal(s.family.wife_186,undefined);
 assert.ok(s.fellows.hero_1&&s.family.wife_3,'the characters the player still has are untouched');
 assert.ok(!s.enterprises.Building_501.fellows.includes('hero_302'),'the business operator slot is freed');
 assert.equal(s.familiarBonds?.hero_302,undefined,'the familiar bond is released');
 assert.ok(s.familiars.Pet_1191,'the familiar itself stays');
 assert.equal(s.school.pupils[0].caretaker,'wife_3','the pupil moves to a remaining Family member');
 assert.equal(s.school.pupils[0].name,'Ren');
 assert.deepEqual(s.tradingPost.run.team.map(p=>p.id),['hero_302','hero_1'],'an in-progress Trading Post run pays out as recorded');
 assert.equal(s.gold,old.gold);
 assert.deepEqual(decode(JSON.stringify(s)),s,'the released save is stable');});

test('release is inert on a save without removed characters',()=>{
 const s=funded(fresh(T));
 assert.equal(mentionsRemoved(s),false);
 assert.equal(releaseRemoved(s),s,'same object back: nothing rewritten');
 // Positive control: the detector does see a removed id when one is present.
 assert.equal(mentionsRemoved({...s,note:'see hero_304 later'}),false,'text that merely contains an id is not a reference');
 assert.equal(mentionsRemoved({...s,fellows:{...s.fellows,hero_304:{}}}),true);});
