import test from 'node:test';import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {readFileSync,statSync} from 'node:fs';
import {createHash} from 'node:crypto';
import data from '../lib/everkai-additions-data.json' with {type:'json'};
import {ADDITION_FELLOWS,additionById,additionClip,crossoverEnabled,sourceId,isAddition} from '../lib/everkai-additions.mjs';
import {FELLOWS,ORIGINAL_FELLOWS,fellowById,fellowCatalogue} from '../lib/catalog.mjs';
import {originalCharacter} from '../lib/original-catalog.mjs';
import {recruitOffers,recruitPrice,SUMMON_COSTS} from '../lib/summon.mjs';
import {talentRule} from '../lib/talents.mjs';
import {insightRule} from '../lib/insight.mjs';
import {characterSkills} from '../lib/character-skills.mjs';
import {stellaRule} from '../lib/stella.mjs';
import {streamed} from '../scripts/offline-manifest.mjs';
import {templateCandidates} from '../scripts/crossover/pick-template.mjs';
import {decode,startingSave,valid} from '../lib/game.mjs';
import progression from '../lib/original-progression-data.json' with {type:'json'};
import talentSource from '../lib/default-talent-source.json' with {type:'json'};

const IDS=['xover_msf_spiderman','xover_swgoh_vaderduelsend'];
const asset=p=>new URL('../public/assets/'+p,import.meta.url);

test('the flag is ?crossover=1 exactly, and Node never has it',()=>{
 assert.equal(crossoverEnabled('?crossover=1'),true);
 for(const off of ['','?crossover=0','?crossover=true','?spine=1','?crossover'])assert.equal(crossoverEnabled(off),false,off);
 assert.equal(crossoverEnabled(),false);
});

test('flag off: the catalogue is exactly the original one',()=>{
 assert.equal(FELLOWS,ORIGINAL_FELLOWS,'the same array, not a filtered copy');
 assert.equal(FELLOWS.length,159);
 assert.ok(FELLOWS.every(f=>originalCharacter(f.id)&&!isAddition(f.id)));
 assert.deepEqual(recruitOffers(startingSave(0)).filter(o=>isAddition(o.id)),[],'nothing extra at the counter');
 assert.deepEqual(fellowCatalogue(true).slice(0,159),ORIGINAL_FELLOWS,'additions only append');
 assert.deepEqual(fellowCatalogue(true).slice(159).map(f=>f.id),IDS);
});

test('every addition is labelled as one and is not pretending to be an original character',()=>{
 assert.equal(ADDITION_FELLOWS.length,2);
 assert.deepEqual(ADDITION_FELLOWS.map(f=>f.id),IDS);
 for(const f of ADDITION_FELLOWS){
  assert.match(f.id,/^xover_(msf|swgoh)_[a-z0-9]+$/,f.id);
  assert.equal(originalCharacter(f.id),undefined,`${f.id} collides with an APK id`);
  assert.equal(f.addition,true);
  for(const k of ['name','title','occupation','race','description'])assert.ok(typeof f[k]==='string'&&f[k].trim().length>1,`${f.id}.${k}`);
  assert.ok(f.description.length<=260,`${f.id} description is a short original blurb`);
  assert.ok(['MSF','SWGOH'].includes(f.source.game)&&f.source.assetId&&/^[0-9a-f]{64}$/.test(f.source.bundleSha256)&&f.source.clip,`${f.id} provenance`);
  assert.equal(fellowById(f.id),f,'saves resolve it with the flag off');
 }
});

test('each addition borrows every per-id table from an original Fellow of the same rarity and type',()=>{
 for(const f of ADDITION_FELLOWS){
  const t=ORIGINAL_FELLOWS.find(x=>x.id===f.template);
  assert.ok(t,`${f.id} template ${f.template} is an original Fellow`);
  assert.equal(t.rarity,f.rarity);assert.equal(t.type,f.type);
  assert.equal(templateCandidates(f.rarity,f.type)[0].id,f.template,'the documented pick rule chose it');
  assert.equal(sourceId(f.id),f.template);
  assert.ok(SUMMON_COSTS[f.rarity],`${f.rarity} has a counter price`);
  assert.deepEqual(recruitPrice(f.id),SUMMON_COSTS[f.rarity]);
  assert.equal(talentRule(f.id),talentRule(f.template));assert.ok(talentRule(f.id));
  assert.equal(insightRule(f.id),insightRule(f.template));assert.ok(insightRule(f.id));
  assert.ok(progression.heroes[sourceId(f.id)]&&talentSource.heroes[sourceId(f.id)]);
  const guide=characterSkills(f.id);
  assert.equal(guide.name,f.name);
  assert.ok(guide.skills.length>0&&guide.skills.every(n=>!n.id.startsWith('Hero_Clothes_Talent_')),'no template costume talents');
  assert.equal(stellaRule(f.id),undefined,'character-specific Stella stays excluded');
 }
 assert.equal(sourceId('hero_103'),'hero_103','originals map to themselves');
});

test('art and idle clips exist, match their recorded bytes and hashes, and stream',()=>{
 let bytes=0;
 for(const r of data.fellows){
  const f=additionById(r.id),clip=additionClip(f);
  const art=readFileSync(asset(r.art)),mp4=readFileSync(asset(clip.src));
  assert.equal(art.length,r.artBytes);assert.equal(createHash('sha256').update(art).digest('hex'),r.artSha256);
  assert.equal(mp4.length,clip.bytes);assert.equal(createHash('sha256').update(mp4).digest('hex'),clip.sha256);
  assert.equal(art.subarray(8,12).toString(),'WEBP');
  assert.deepEqual([clip.width,clip.height,clip.fps],[1024,1536,12]);
  assert.ok(Math.abs(clip.frames/clip.fps-clip.encodedDuration)<0.05);
  assert.equal(clip.owner,r.id);assert.equal(additionClip({...f,costumeId:'C1'}),null);
  for(const p of [r.art,clip.src])assert.ok(streamed('assets/'+p),p+' would be precached');
  bytes+=art.length+mp4.length;
 }
 assert.ok(bytes<3*1024*1024,`two additions add ${bytes} bytes`);
});

test('flag on: listed, offered, recruited, trained and saved; flag off: that save still loads',()=>{
 const out=JSON.parse(execFileSync(process.execPath,[new URL('./crossover-flag-village.mjs',import.meta.url).pathname],{encoding:'utf8'}));
 assert.deepEqual(out.listed,IDS);
 assert.deepEqual(out.offered.map(o=>o.id),IDS);
 assert.deepEqual(out.log.filter(x=>x.error),[],'every action succeeded');
 assert.equal(out.valid,true,out.refusedBy);
 for(const id of IDS){assert.equal(out.fellows[id].level,6);assert.equal(out.fellows[id].talentLevel,5);assert.ok(Number.isFinite(out.power[id])&&out.power[id]>0)}
 // This process has no flag: the village loads, keeps both Fellows and their progress, and lists neither.
 const s=decode(out.save);
 assert.ok(valid(s));
 assert.deepEqual(IDS.map(id=>s.fellows[id]),IDS.map(id=>out.fellows[id]));
 assert.equal(s.summon.recruited.filter(x=>IDS.includes(x.id)).length,2);
 assert.ok(s.originalProgression,'original growth stayed on');
 assert.ok(!FELLOWS.some(f=>IDS.includes(f.id)));
});

test('an unknown xover id is still refused: resolution comes from the data, not the prefix',()=>{
 const s=startingSave(0);
 const bad={...s,fellows:{...s.fellows,xover_msf_nobody:s.fellows.hero_1}};
 assert.equal(valid(bad),false);
 assert.throws(()=>decode(JSON.stringify(bad)),/Refused by: validV4/);
});

test('the additions data file is only what the loader reads',()=>{
 const text=readFileSync(new URL('../lib/everkai-additions-data.json',import.meta.url),'utf8');
 assert.equal(JSON.parse(text).flag,'crossover');
 assert.ok(statSync(asset('crossover')).isDirectory());
 const KEYS=['art','artBytes','artSha256','clip','description','id','name','occupation','race','rank','rarity','source','template','title','type'];
 // `rank` is the owner's rank within its franchise (scratchpad selected-roster.json). It is in the
 // repo because the crossover Family blessing-recipient rule is derived FROM it, so a test can
 // re-derive the shipped lists instead of trusting them (tests/crossover-family.test.mjs).
 for(const r of data.fellows)assert.deepEqual(Object.keys(r).sort(),KEYS);
 for(const r of data.family||[])assert.deepEqual(Object.keys(r).sort(),[...KEYS,'recipients'].sort());
});
