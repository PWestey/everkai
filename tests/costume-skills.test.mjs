import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {act} from '../lib/game.mjs';
import {powerParts} from '../lib/adventure.mjs';
import {COSTUMES,costumeById} from '../lib/wardrobe.mjs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {TYPE_COUNTRY} from '../lib/hero-scope.mjs';
import {costumeSelfTalent,costumeHaloTalent,costumeHaloTotals,costumeSkillSummary,
        costumeSkillRow,COSTUME_SKILL_LEVEL,DEFERRED_PERCENT_HALOS} from '../lib/costume-skills.mjs';
import {legacyStart} from './progression-helpers.mjs';

const NOW=1767225600000;
const data=JSON.parse(readFileSync(new URL('../lib/costume-skill-data.json',import.meta.url),'utf8'));
// A costume can only be collected for a character you already have, so the roster comes first --
// otherwise wardrobeCollect refuses almost everything and the halos look absent.
const full=()=>{let s=legacyStart(NOW);
 for(const a of ['recruitAll','welcomeAll']){const r=act(s,a,NOW);if(!r.error)s=r.state;}
 return s;};
const collectAll=s=>{let missed=0;
 for(const c of COSTUMES){const r=act(s,'wardrobeCollect',s.lastAt,c.id);if(r.error)missed++;else s=r.state;}
 assert.equal(missed,0,`${missed} costumes could not be collected by a full roster`);
 return s;};

test('the table covers every shipped costume, at the level owning one buys',()=>{
 assert.equal(COSTUME_SKILL_LEVEL,1,'level 1 is the unlock, and the only level this slice models');
 assert.equal(Object.keys(data.costumes).length,COSTUMES.length,'85 shipped costumes, 85 rows');
 for(const c of COSTUMES)assert.ok(costumeSkillRow(c.id),`${c.id} has no skill row`);
 assert.equal(data.bucket,'talent','slice A is talent only -- the percent halves need costume level 2');
 // Rule 6: the halo level is read off a LADDER, so the two kinds must NOT agree. If both returned the
 // same skill level the ladder would not be being read.
 const levels=new Set(Object.values(data.costumes).filter(r=>r.halo).map(r=>`${r.kind}:${r.halo.level}`));
 assert.deepEqual([...levels].sort(),['family:40','hero:30'],'hero ladder starts at 30, family at 40');
});

test('a costume pays its own owner, and only once collected',()=>{
 let s=full();
 const mine=COSTUMES.find(c=>s.fellows[c.ownerId]&&costumeSkillRow(c.id)?.self);
 assert.ok(mine,'the fixture must own a Fellow with a wearer-skill costume');
 assert.equal(costumeSelfTalent(s,mine.ownerId),0,'uncollected pays nothing');
 const r=act(s,'wardrobeCollect',NOW,mine.id);
 assert.ok(!r.error,r.error);s=r.state;
 const paid=costumeSkillRow(mine.id).self.talent;
 assert.ok(paid>0);
 assert.equal(costumeSelfTalent(s,mine.ownerId),paid);
 // and nobody else's wearer total moved
 const other=FELLOWS.find(f=>f.id!==mine.ownerId&&s.fellows[f.id]);
 if(other)assert.equal(costumeSelfTalent(s,other.id),0,'the wearer skill is scoped `self`');
});

test('the halo reaches every Fellow of the country, owning nothing',()=>{
 let s=collectAll(full());
 const totals=costumeHaloTotals(s);
 assert.ok(Object.keys(totals).length>=4,`only ${Object.keys(totals).length} countries broadcast`);
 for(const f of FELLOWS){
  const want=totals[TYPE_COUNTRY[f.type]]||0;
  assert.equal(costumeHaloTalent(s,f.id),want,`${f.id} (${f.type}) should receive its country's whole halo`);
 }
 // The point of the slice: a Fellow who owns NO costume still receives it.
 const bare=FELLOWS.find(f=>!COSTUMES.some(c=>c.ownerId===f.id)&&totals[TYPE_COUNTRY[f.type]]);
 assert.ok(bare,'there must be a costume-less Fellow to check');
 assert.equal(costumeSelfTalent(s,bare.id),0);
 assert.ok(costumeHaloTalent(s,bare.id)>0,'and they still get the broadcast');
});

test('the owner the skill table carries agrees with the wardrobe catalogue',()=>{
 // costume-skills.mjs reads `owner` from its own table rather than importing wardrobe.mjs, which would
 // be circular now that wardrobe prints what a costume pays. This is what keeps the two honest.
 for(const c of COSTUMES)assert.equal(costumeSkillRow(c.id).owner,c.ownerId,`${c.id} owner disagrees`);
});

test('a Family member’s costume lifts FELLOWS, which is why the Family half is in this slice',()=>{
 const familyHalos=Object.entries(data.costumes).filter(([id,r])=>r.kind==='family'&&r.halo);
 assert.ok(familyHalos.length>0,'Family costumes must carry country halos');
 for(const [id,r] of familyHalos){
  assert.ok(FAMILY.some(f=>f.id===costumeById(id).ownerId),`${id} should belong to a Family member`);
  assert.ok(r.halo.talent>0);
 }
});

test('it reaches the crossover Fellows too, through TYPE_COUNTRY',()=>{
 const s=collectAll(full());
 const totals=costumeHaloTotals(s);
 const country=TYPE_COUNTRY['Brave'];
 if(totals[country])assert.equal(costumeHaloTalent(s,'xover_msf_captainamericaww2')>=0,true);
 // A crossover Fellow has no Hero.json row, so only its TYPE can place it. Assert the join directly.
 for(const type of Object.keys(TYPE_COUNTRY)){
  const f=FELLOWS.find(x=>x.type===type);
  if(f)assert.equal(costumeHaloTalent(s,f.id),totals[TYPE_COUNTRY[type]]||0);
 }
});

test('both parts land in the talent bucket and move Power',()=>{
 let s=full();
 const before=powerParts(s,'hero_1');
 assert.equal(before.talent.costumeSelf,0);
 assert.equal(before.talent.costumeHalo,0);
 s=collectAll(s);
 const after=powerParts(s,'hero_1');
 assert.ok(after.talent.costumeSelf+after.talent.costumeHalo>0,'collecting must pay something');
 assert.ok(after.power>before.power,'and Power must rise');
});

test('the percent halves are recorded as deferred, not silently dropped',()=>{
 assert.equal(DEFERRED_PERCENT_HALOS.length,33);
 for(const d of DEFERRED_PERCENT_HALOS){
  assert.equal(d.prop,'percent');
  assert.ok(d.unlockLevel>COSTUME_SKILL_LEVEL,'they unlock above the level this slice models');
 }
 assert.equal(costumeSkillSummary('nope'),null);
});
