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
import {buildRows,buildFamilyRows,dataFileText} from '../scripts/crossover/build-additions.mjs';
import {decode,startingSave,valid} from '../lib/game.mjs';
import progression from '../lib/original-progression-data.json' with {type:'json'};
import talentSource from '../lib/default-talent-source.json' with {type:'json'};

/** The two prototypes: the only rows with an installed idle clip, and the only two whose rarity is not
 *  N. Everything else is asserted over the whole file, so 131 more rows cannot arrive unchecked. */
const SHIPPED=['xover_msf_spiderman','xover_swgoh_vaderduelsend'];
const IDS=data.fellows.map(r=>r.id);
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
 assert.equal(IDS.length,133,'the 133 Fellows of docs/crossover-family-split.md; the 30 Family are a separate layer');
 assert.deepEqual(IDS.filter(id=>SHIPPED.includes(id)),SHIPPED);
});

test('every addition is labelled as one and is not pretending to be an original character',()=>{
 assert.equal(ADDITION_FELLOWS.length,133);
 assert.deepEqual(ADDITION_FELLOWS.map(f=>f.id),IDS);
 assert.equal(new Set(IDS).size,IDS.length,'no id twice');
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
  // Rarity is deliberately NOT matched to the template's: every new addition is rarity N, and
  // templateCandidates('N',type) is pinned to the per-type SSR anchor because rarity N has no
  // template of its own (scripts/crossover/pick-template.mjs). The TYPE must still match, or
  // lib/insight.mjs:9 silently drops Insight for the Fellow.
  assert.equal(t.type,f.type,`${f.id} type must equal its template's`);
  assert.equal(templateCandidates(f.rarity,f.type)[0].id,f.template,'the documented pick rule chose it');
  assert.equal(sourceId(f.id),f.template);
  assert.ok(SUMMON_COSTS[f.rarity],`${f.rarity} has a counter price`);
  // ...which the counter nonetheless refuses to quote: an addition joins through its storyline arc.
  assert.equal(recruitPrice(f.id),null,`${f.id} must not be for sale`);
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
 let bytes=0,clips=0;
 for(const r of data.fellows){
  const f=additionById(r.id),clip=additionClip(f);
  const art=readFileSync(asset(r.art));
  assert.equal(art.length,r.artBytes,r.id);assert.equal(createHash('sha256').update(art).digest('hex'),r.artSha256,r.id);
  assert.equal(art.subarray(8,12).toString(),'WEBP',r.id);
  assert.ok(streamed('assets/'+r.art),r.art+' would be precached');
  bytes+=art.length;
  // The 131 rows added with the arcs carry clip:null: the idle mp4s are 98 MB and are installed with
  // the shipping step, and app/character-artwork.tsx already falls back to the still when there is no
  // clip. A row that DOES declare one must have the file, byte for byte.
  if(!r.clip){assert.equal(clip,null,`${r.id} declares no clip`);continue}
  clips++;
  const mp4=readFileSync(asset(clip.src));
  assert.equal(mp4.length,clip.bytes);assert.equal(createHash('sha256').update(mp4).digest('hex'),clip.sha256);
  assert.deepEqual([clip.width,clip.height,clip.fps],[1024,1536,12]);
  assert.ok(Math.abs(clip.frames/clip.fps-clip.encodedDuration)<0.05);
  assert.equal(clip.owner,r.id);assert.equal(additionClip({...f,costumeId:'C1'}),null);
  assert.ok(streamed('assets/'+clip.src),clip.src+' would be precached');
  bytes+=mp4.length;
 }
 assert.deepEqual(data.fellows.filter(r=>r.clip).map(r=>r.id),SHIPPED,'only the two prototypes have clips yet');
 assert.equal(clips,2);
 // None of this is in the precache (STREAMED excludes assets/crossover/), so the budget guard in
 // tests/offline-manifest.test.mjs cannot move. This is the download-on-demand total.
 assert.ok(bytes<16*1024*1024,`${data.fellows.length} additions carry ${bytes} bytes of media`);
});

const flagOn=(()=>{let v;return ()=>v??=JSON.parse(execFileSync(process.execPath,
 [new URL('./crossover-flag-village.mjs',import.meta.url).pathname],{encoding:'utf8',maxBuffer:1<<28}))})();

// THE FLAG-ON CENSUS over all 163. Measured in the child process, because the catalogue reads the flag
// once at import and this one has no flag. Everything here was previously checked for the two
// prototypes only; with 163 rows in the data it is the whole roster or nothing.
test('flag ON: all 163 are listed, each in exactly one arc, and the counter sells none of them',()=>{
 const {census:c}=flagOn();
 assert.equal(c.rosterSize,163);
 assert.deepEqual(c.fellows,{roster:133,listed:133,same:true,sameOrder:true},'133 crossover Fellows, in the roster\'s rank order');
 assert.deepEqual(c.family,{roster:30,listed:30,same:true,sameOrder:false},'30 crossover Family; their rows are grouped by franchise, not ranked');
 assert.deepEqual(c.originals,{fellows:159,family:107},'and the originals are untouched');
 assert.deepEqual(c.totals,{fellows:292,family:137},'159+133 and 107+30');
 // THE UNLOCK GATE, over the whole roster rather than over the two ids this village recruited.
 assert.deepEqual(c.offeredAdditions,[],'the counter offers none of the 163');
 assert.deepEqual(c.pricedAdditions,[],'and prices none of them');
 assert.ok(c.offerCount>0,`positive control: the counter offered ${c.offerCount} originals in the same state`);
 // ARCS: 163 stages, one per character, and the stage's `kind` is the roster's own split.
 assert.equal(c.stageCount,163);
 assert.deepEqual(c.inNoArc,[]);
 assert.deepEqual(c.inTwoArcs,[]);
 assert.deepEqual(c.kindDisagrees,[]);
 // TYPES, flag on: a Fellow's catalogue type equals the roster's; the 30 Family carry null, as all 107
 // original Family do (tests/crossover-arcs.test.mjs states both halves of that).
 assert.deepEqual(c.typeDisagrees,[]);
});

test('flag on: listed, unlocked by its arc, trained and saved; flag off: that save still loads',()=>{
 const out=flagOn();
 assert.deepEqual(out.listed,SHIPPED,'both are in FELLOWS with the flag on');
 // THE UNLOCK GATE. The counter offers neither, prices neither, and refuses each by pointing at the
 // arc -- so "playing its storyline" is the only route in, which is what the owner asked for.
 assert.deepEqual(out.offered,[],'the counter does not sell additions');
 for(const r of out.counterRefusals){
  assert.equal(r.price,null,`${r.id} still has a price`);
  assert.match(r.error,/joins by playing .+, not at the counter\./,r.id);
 }
 assert.deepEqual(out.arcs,['XoverMsf01','XoverSwgoh01'],'stage 1 of each prototype\'s own arc');
 assert.equal(out.need,20,'two tier-1 stages at 10 completions each');
 assert.equal(out.spent,20,'and exactly that was spent');
 assert.equal(out.available,out.earnedBeforeClaims-20,'the ledger moved by the price, nothing else');
 assert.equal(out.visibleArcs,41,'the panel lists all 41 arcs with the flag on');
 assert.deepEqual(out.log.filter(x=>x.error),[],'every action succeeded');
 assert.equal(out.valid,true,out.refusedBy);
 for(const id of SHIPPED){assert.equal(out.fellows[id].level,6);assert.equal(out.fellows[id].talentLevel,5);assert.ok(Number.isFinite(out.power[id])&&out.power[id]>0)}
 // This process has no flag: the village loads, keeps both Fellows and their progress, and lists neither.
 const s=decode(out.save);
 assert.ok(valid(s));
 assert.deepEqual(SHIPPED.map(id=>s.fellows[id]),SHIPPED.map(id=>out.fellows[id]));
 assert.equal(JSON.stringify(s),out.save,'byte-identical with the flag off');
 assert.deepEqual(s.events,{policyVersion:1,spent:20,claimed:{XoverMsf01:1,XoverSwgoh01:1}},'the crossover ledger survived');
 assert.ok(s.originalProgression,'original growth stayed on');
 assert.ok(!FELLOWS.some(f=>SHIPPED.includes(f.id)));
});

test('a recruit receipt written before additions left the counter still validates',()=>{
 // Section 4.4 of docs/crossover-storyline-plan.md, verified rather than argued: validSummon checks a
 // receipt for a string id, a known kind, an integer `paid`, a known currency and that the character
 // is owned -- it never re-derives the price. So a flag-on save that BOUGHT Spider-Man for 2 Acquaint
 // Stones before this change keeps its receipt after recruitPrice went null.
 const base=startingSave(0),id=SHIPPED[0];
 const s={...base,fellows:{...base.fellows,[id]:base.fellows.hero_1},
  summon:{policyVersion:1,seq:1,stoneFragments:0,stones:0,insigniaFragments:0,valiant:0,archangel:0,starShards:0,
   days:[],weeks:[],recruited:[{id,kind:'fellows',paid:2,currency:'stones'}]}};
 assert.equal(recruitPrice(id),null,'and it really is unpriced now');
 assert.equal(valid(s),true,'the old receipt is still accepted');
 // NEGATIVE CONTROL: the same receipt for a character the village does not own must still be refused,
 // so the pass above is a fact about validSummon and not about it ignoring receipts.
 const notOwned={...s,fellows:base.fellows};
 assert.equal(valid(notOwned),false);
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
 // `rank` is the owner's rank within its franchise (scratchpad selected-roster.json, mirrored into
 // lib/crossover-roster-data.json). It is in the repo because the crossover Family blessing-recipient
 // rule is derived FROM it, so a test can re-derive the shipped lists instead of trusting them
 // (tests/crossover-family.test.mjs). The 131 rows generated with the arcs slice arrived WITHOUT it,
 // which silently turned "nearest in rank" into "alphabetical" for every recipient list; they were
 // re-emitted with their ranks, and the generator check below is what stops that recurring.
 for(const r of data.fellows)assert.deepEqual(Object.keys(r).sort(),KEYS);
 for(const r of data.family||[])assert.deepEqual(Object.keys(r).sort(),[...KEYS,'recipients'].sort());
});

test('the whole data file is what scripts/crossover/build-additions.mjs emits, both arrays',()=>{
 // The two arrays are COUPLED: familyRecipients() derives a Family member's recipients from the Fellow
 // rows, so a Fellow row landing changes the Family half of the file. They were written by two agents
 // in parallel and drifted exactly there -- 133 Fellow rows against recipient lists still derived from
 // 2 of them. Re-deriving the whole file here, the way tests/crossover-arcs.test.mjs re-derives the
 // arcs, is what makes that drift a red test instead of a stale number.
 const text=readFileSync(new URL('../lib/everkai-additions-data.json',import.meta.url),'utf8');
 const rows=buildRows();
 const familyRows=buildFamilyRows(rows);
 assert.equal(rows.length,133);assert.equal(familyRows.length,30);
 assert.equal(text,dataFileText(rows,familyRows),'run scripts/crossover/build-additions.mjs');
 // NEGATIVE CONTROL: drop one Fellow row and the Family half must move with it, or "coupled" is a
 // claim about nothing. Wolverine is rank 2 Marvel, so he is inside several ten-wide windows.
 const short=rows.filter(r=>r.id!=='xover_msf_wolverine');
 const regrown=buildFamilyRows(short);
 assert.notDeepEqual(regrown.map(r=>r.recipients),familyRows.map(r=>r.recipients),
  'removing a Fellow row left every recipient list unchanged');
 assert.equal(regrown.some(r=>r.recipients.includes('xover_msf_wolverine')),false,'and he is gone from them');
 assert.equal(familyRows.some(r=>r.recipients.includes('xover_msf_wolverine')),true,'positive control: he was in them');
});
