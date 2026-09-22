import test from 'node:test';import assert from 'node:assert/strict';
import {legacyStart} from './progression-helpers.mjs';
import {execFileSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import data from '../lib/everkai-additions-data.json' with {type:'json'};
import {ADDITION_FAMILY,ADDITION_FELLOWS,ADDITION_FAMILY_ROWS,additionById,additionFamilyById,additionFellowById,additionKind,additionClip,additionRecipients,isAddition,sourceId} from '../lib/everkai-additions.mjs';
import {FAMILY,ORIGINAL_FAMILY,familyById,familyCatalogue,fellowById,FELLOWS} from '../lib/catalog.mjs';
import {familyRecipients,familyRecipientMap,RECIPIENTS_PER_FAMILY} from '../lib/crossover-recipients.mjs';
import {affinityIds} from '../lib/public-reference.mjs';
import {originalCharacter,originalProfile} from '../lib/original-catalog.mjs';
import {decode,valid,refusedBy,act,fresh,lastQuarantine} from '../lib/game.mjs';
import {blessingRecipients,blessingPower,blessingPlan,blessingRecipientId,BLESSINGS} from '../lib/blessings.mjs';
import {fathomBonus,fathomsApply,openSlots} from '../lib/fathoms.mjs';
import {characterSkills} from '../lib/character-skills.mjs';
import {familyPictures} from '../lib/family-gallery.mjs';
import {costumesFor} from '../lib/wardrobe.mjs';
import {familyScene} from '../lib/family-scenes.mjs';
import {stagePerson,stageKind} from '../lib/events.mjs';
import {dateIds} from '../lib/dating.mjs';
import {streamed} from '../scripts/offline-manifest.mjs';
import {installedCrossoverAssets,installedAsset,pendingCrossoverRows} from '../scripts/crossover/installed-assets.mjs';
import {buildCeiling,ORIGINAL_LIVE_SAVE_PACING,ORIGINAL_SPIRIT_TABLE_MAX,ORIGINAL_BEST_SPIRIT_FLAT,ORIGINAL_OWNER_BEST_HERO} from './crossover-ceiling-fixture.mjs';
import blessingSource from '../lib/original-blessing-data.json' with {type:'json'};

const asset=p=>new URL('../public/assets/'+p,import.meta.url);
/** APK growth through its own action, not by minting the subtree: minting leaves the Fellow records
 *  in a shape validAdventure refuses, which would make every assertion below vacuous. */
const apkMode=s=>{const r=act(s,'activateOriginalProgression',s.lastAt);assert.ok(!r.error,r.error);return r.state};
const ONE='xover_msf_jeangrey';
/** The flag-on child, run once and shared: it builds two whole ceiling fixtures. */
const flagOn=(()=>{let v;return ()=>v??=JSON.parse(execFileSync(process.execPath,
 [new URL('./crossover-family-village.mjs',import.meta.url).pathname],{encoding:'utf8',maxBuffer:1<<28}))})();

// ---------------------------------------------------------------------------------------------
// THE BLOCKING SAVE BUG. lib/game.mjs validated Family with `FAMILY.some(x=>x.id===id)` while Fellows
// went through fellowById, so a save holding a crossover Family id was refused by validV4 -- and
// `family` is deliberately NOT in QUARANTINABLE, so the village was lost rather than degraded.
// ---------------------------------------------------------------------------------------------

test('a save that welcomed a crossover Family member loads with the flag OFF, id resolution and all',()=>{
 const s=legacyStart(0);
 const owned={...s,family:{...s.family,[ONE]:{intimacy:12,blessingPower:34,points:56,skill:2,relationship:3}}};
 assert.ok(!FAMILY.some(f=>f.id===ONE),'she is deliberately NOT listed with the flag off');
 assert.ok(familyById(ONE),'but she still resolves: owned, unlisted');
 assert.equal(valid(owned),true,refusedBy(owned));
 const back=decode(JSON.stringify(owned));
 assert.deepEqual(back.family[ONE],owned.family[ONE],'her five integers survive the round trip');
 // Everything mechanical keeps applying to an unlisted member.
 assert.deepEqual(dateIds(owned).includes(ONE),true,'she can still be dated with the flag off');
});

test('NEGATIVE CONTROL: an unknown xover family id is still refused, and family is never quarantined',()=>{
 const s=legacyStart(0);
 const bad={...s,family:{...s.family,xover_msf_nobody:{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}}};
 assert.equal(valid(bad),false,'resolution comes from the DATA, not the xover_ prefix');
 assert.equal(refusedBy(bad),'validV4');
 assert.throws(()=>decode(JSON.stringify(bad)),/Refused by: validV4/);
 // And a Fellow id in the family map is refused too: the two lookups must stay separate, or a save
 // could seat a Fellow as Family (and vice versa).
 for(const [key,other] of [['family','xover_msf_spiderman'],['fellows',ONE]]){
  const crossed={...s,[key]:{...s[key],[other]:key==='family'?{intimacy:0,blessingPower:10,points:0,skill:0,relationship:1}:s.fellows.hero_1}};
  assert.equal(valid(crossed),false,`${other} must not be accepted in s.${key}`);
 }
 assert.equal(additionFellowById(ONE),null,'familyById and fellowById do not overlap');
 assert.equal(additionFamilyById('xover_msf_spiderman'),null);
});

// ---------------------------------------------------------------------------------------------
// THE ADDITIONS LAYER AND ITS 30 RECORDS.
// ---------------------------------------------------------------------------------------------

test('the Family catalogue is built exactly like the Fellow one: originals, then additions appended',()=>{
 assert.equal(FAMILY,ORIGINAL_FAMILY,'the same array with the flag off, not a filtered copy');
 assert.equal(ORIGINAL_FAMILY.length,107);
 assert.ok(ORIGINAL_FAMILY.every(f=>originalCharacter(f.id)&&!isAddition(f.id)));
 assert.deepEqual(familyCatalogue(true).slice(0,107),ORIGINAL_FAMILY,'additions only ever append');
 assert.deepEqual(familyCatalogue(true).slice(107).map(f=>f.id),ADDITION_FAMILY.map(f=>f.id));
 assert.equal(familyCatalogue(true).length,137);
});

test('30 Family rows, none dropped, none pretending to be an APK character',()=>{
 // lib/everkai-additions.mjs drops a row with no `art` or no `template` -- silently removing a
 // character. Asserted against the RAW row count so that can never happen unnoticed.
 assert.equal(ADDITION_FAMILY.length,30);
 assert.equal(ADDITION_FAMILY.length,data.family.length,'a family row was dropped by the loader');
 assert.equal(ADDITION_FAMILY_ROWS.length,30);
 // Both sides of the one data file, asserted together. This line read `2` while the Fellow layer was
 // still two prototypes; the arcs slice landed the other 131, so it is 133 now and the Family count
 // above must be unaffected by that -- which is the only thing this assertion was ever for.
 assert.equal(ADDITION_FELLOWS.length,133,'the 133 Fellows of docs/crossover-family-split.md');
 assert.equal(ADDITION_FELLOWS.length,data.fellows.length,'a Fellow row was dropped by the loader');
 assert.equal(ADDITION_FELLOWS.length+ADDITION_FAMILY.length,163,'the whole crossover roster');
 assert.equal(new Set([...ADDITION_FELLOWS,...ADDITION_FAMILY].map(f=>f.id)).size,163,'no id on both sides');
 const byGame=id=>additionById(id).source.game;
 assert.equal(ADDITION_FAMILY.filter(f=>byGame(f.id)==='MSF').length,20);
 assert.equal(ADDITION_FAMILY.filter(f=>byGame(f.id)==='SWGOH').length,10);
 for(const f of ADDITION_FAMILY){
  assert.match(f.id,/^xover_(msf|swgoh)_[a-z0-9]+$/,f.id);
  assert.equal(originalCharacter(f.id),undefined,`${f.id} collides with an APK id`);
  assert.throws(()=>originalProfile(f.id),/Missing original character/,'additions never reach the APK profile source');
  assert.equal(f.addition,true);
  assert.equal(additionKind(f.id),'family');
  assert.equal(familyById(f.id),f,'saves resolve her with the flag off');
  assert.equal(f.type,null,'every one of the 107 original Family carries type null; so do these');
  assert.equal(f.rarity,'N','docs/crossover-plan.md: rarity N for every crossover');
  for(const k of ['name','title','occupation','race','description'])assert.ok(typeof f[k]==='string'&&f[k].trim().length>1,`${f.id}.${k}`);
  assert.ok(f.description.length<=260,`${f.id} description is a short original blurb`);
  // The infernal-wording sweep (tests/content-overrides.test.mjs) covers this file; checked here too
  // so a failure names the character.
  assert.doesNotMatch(`${f.name} ${f.title} ${f.occupation} ${f.description}`,/demon|devil|succub|incub|\bhell\b|hellish|abyss|infernal/i,f.id);
  assert.ok(['MSF','SWGOH'].includes(f.source.game)&&f.source.assetId&&/^[0-9a-f]{64}$/.test(f.source.bundleSha256)&&f.source.clip,`${f.id} provenance`);
 }
 assert.equal(new Set(ADDITION_FAMILY.map(f=>f.name)).size,30,'30 distinct people');
});

test('a Family addition borrows one template, and it is an original Family member with no skills',()=>{
 for(const f of ADDITION_FAMILY){
  const t=ORIGINAL_FAMILY.find(x=>x.id===f.template);
  assert.ok(t,`${f.id} template ${f.template} is an original Family member`);
  assert.equal(t.rarity,f.rarity);assert.equal(t.type,f.type);
  assert.equal(sourceId(f.id),f.template);
  // The guide must show HER name, and must NOT borrow another character's skills.
  const guide=characterSkills(f.id);
  assert.equal(guide.name,f.name);
  assert.deepEqual(guide.skills,[],`${f.id} borrowed ${f.template}'s skills`);
  assert.equal(guide.category,'family');
  // Systems with no generic row degrade, they do not throw.
  assert.deepEqual(familyPictures(f.id),[],'the gallery stays empty: the 177 rows are the APK Illust package');
  assert.deepEqual(costumesFor(f.id),[],'the owner decided no crossover costumes');
  for(const context of ['profile','date'])assert.equal(familyScene({...f},context),null,'scene-fallback does the work');
 }
 assert.equal(characterSkills('wife_2').skills.length,0,'positive control: the shared template really has none');
});

test('the installed media matches its recorded bytes and hashes, and streams rather than precaching',()=>{
 const installed=ADDITION_FAMILY_ROWS.filter(r=>installedAsset(r.art));
 // ALL 30 now. This read "exactly three of the 30 ship their media in this step" while the Family
 // layer was being built and only three samples were in the tree; the village build of 2026-09-17 is
 // the bulk install step of docs/crossover-plan.md, so the sample is the whole list.
 assert.equal(installed.length,30,'all 30 Family ship their media');
 assert.deepEqual(installed.map(r=>r.id).sort(),ADDITION_FAMILY_ROWS.map(r=>r.id).sort());
 let bytes=0;
 for(const r of installed){
  const f=additionById(r.id),clip=additionClip(f);
  const art=readFileSync(asset(r.art)),mp4=readFileSync(asset(clip.src));
  assert.equal(art.length,r.artBytes);assert.equal(createHash('sha256').update(art).digest('hex'),r.artSha256);
  assert.equal(mp4.length,clip.bytes);assert.equal(createHash('sha256').update(mp4).digest('hex'),clip.sha256);
  assert.equal(art.subarray(8,12).toString(),'WEBP');
  assert.deepEqual([clip.width,clip.height,clip.fps],[1024,1536,12]);
  assert.equal(clip.owner,r.id);assert.equal(additionClip({...f,costumeId:'C1'}),null,'no costume clip for an addition');
  for(const p of [r.art,clip.src])assert.ok(streamed('assets/'+p),p+' would be precached');
  bytes+=art.length+mp4.length;
 }
 // MEASURED from the installed files: 8,374,846 bytes of stills + 33,135,387 bytes of idle clips.
 assert.equal(bytes,41510233,`the 30 Family add ${bytes} bytes`);
 // Every row records both hashes, so what is on disk can always be checked against what was measured.
 for(const r of ADDITION_FAMILY_ROWS)assert.ok(/^[0-9a-f]{64}$/.test(r.artSha256)&&/^[0-9a-f]{64}$/.test(r.clip.sha256),r.id);
 // RE-MEASURED 2026-09-17 after the village install, the last of three times this line moved: it read
 // 10 ("5 stills + 5 clips") when the Family layer was the only crossover media in the tree, then 141
 // when the arcs slice installed the 131 remaining Fellow stills. Counted from the files on disk:
 //   163 stills = 133 crossover Fellows + 30 crossover Family
 //   163 clips  = one idle mp4 each, for the same 163
 // Nothing is pending any more, so `pendingCrossoverRows()` reports the empty list. That claim is only
 // worth making with a POSITIVE CONTROL beneath it, because an empty list is also what a broken
 // predicate returns (CLAUDE.md rule 2).
 const installedAll=installedCrossoverAssets();
 assert.equal(installedAll.filter(p=>p.endsWith('.webp')).length,163,'133 Fellow stills + 30 Family stills');
 assert.equal(installedAll.filter(p=>p.endsWith('.mp4')).length,163,'one idle clip each');
 assert.equal(installedAll.length,326);
 assert.deepEqual(pendingCrossoverRows(),[],'every crossover row has its media installed');
 // POSITIVE CONTROL for that empty list: the predicate behind it can still answer no.
 assert.equal(installedAsset('crossover/xover_msf_nobody.webp'),false,'the predicate really can say no');
 assert.equal(installedAsset(ADDITION_FAMILY_ROWS[0].art),true,'and really can say yes');
 assert.equal(installedAsset(''),false,'an absent path is not an installed file');
 assert.equal(installedAsset('crossover/'),false,'and neither is a directory that happens to exist');
 assert.equal(installedAsset('crossover/xover_msf_jeangrey.webp'),true,'positive control');
});

// ---------------------------------------------------------------------------------------------
// BLESSINGS: the shipped 36/24 ladder, recipients drawn only from crossover Fellows, no APK record.
// ---------------------------------------------------------------------------------------------

test('recipient lists are re-derived from the rank rule, not trusted, and live outside the APK table',()=>{
 const derived=familyRecipientMap(data.family,data.fellows);
 for(const r of data.family){
  assert.deepEqual(r.recipients,derived[r.id],`${r.id} recipients drifted from the rule`);
  assert.deepEqual(additionRecipients(r.id),r.recipients);
  assert.ok(r.recipients.length<=RECIPIENTS_PER_FAMILY,'ten is the original table\'s own maximum');
  assert.equal(new Set(r.recipients).size,r.recipients.length);
  for(const x of r.recipients){
   assert.equal(additionKind(x),'fellows',`${x} must be a crossover FELLOW`);
   assert.ok(fellowById(x),`${x} must resolve, or validBlessings refuses the save`);
   assert.equal(additionById(x).source.game,additionById(r.id).source.game,'within her own franchise');
  }
 }
 // The plan's measured constraints on the ORIGINAL table, which must not gain crossover keys:
 // tests/family-data-coverage.test.mjs pins 107 keys / 593 pairings and asserts each key is in FAMILY.
 assert.equal(Object.keys(blessingSource.recipients).length,107);
 for(const f of ADDITION_FAMILY)assert.equal(blessingSource.recipients[f.id],undefined,'no crossover key in the APK blessing table');
 assert.equal(Object.values(blessingSource.recipients).reduce((n,a)=>n+a.length,0),593);
 assert.equal(Math.max(...Object.values(blessingSource.recipients).map(a=>a.length)),10,'positive control for "ten is the maximum"');
 // RE-DERIVED 2026-09-17. This read 30 -- "30 Family x 1 reachable Fellow each" -- because only 2 of
 // the 133 crossover Fellow rows existed when the rule was written and a list can only name Fellows
 // that resolve. The arcs slice landed the other 131, so the rule now yields its full ten each and the
 // shipped lists were regrown by scripts/crossover/build-additions.mjs (300 = 30 x 10, the structural
 // cap docs/crossover-family-plan.md 2.4 states). Nothing stored in a save is derived from these lists
 // -- an addition never gains an apkBlessings record -- so regrowing them cannot refuse an older save
 // (CLAUDE.md rule 12), which is why they were allowed to be short in the first place.
 assert.equal(data.family.reduce((n,r)=>n+r.recipients.length,0),300,'30 Family x 10 = the structural cap');
 for(const r of data.family)assert.equal(r.recipients.length,RECIPIENTS_PER_FAMILY,`${r.id} is short`);
 // COVERAGE, RE-CUT 2026-09-17. The rule used to start each window at the first Fellow ranked at or
 // above the Family member's own rank, and the 20 MSF Family hold ranks 11..95 -- so their ten-wide
 // windows piled up: 300 pairings reached only 106 of the 133 Fellows, 27 were blessed by NOBODY and
 // one (Spider-Man) was blessed by 8. The bands are dealt now (lib/crossover-recipients.mjs), which is
 // as even as a franchise-respecting rule can be. Measured, all of it, from the shipped file:
 const count=Object.fromEntries(data.fellows.map(r=>[r.id,0]));
 for(const r of data.family)for(const id of r.recipients)count[id]++;
 const blessed=Object.values(count).filter(n=>n>0).length;
 assert.equal(blessed,133,'every crossover Fellow is blessed by at least one crossover Family member');
 assert.equal(Object.values(count).filter(n=>!n).length,0,'none is blessed by nobody');
 assert.equal(Math.min(...Object.values(count)),1);
 assert.equal(Math.max(...Object.values(count)),3,'and none is blessed by many more than the rest');
 // Inside a franchise the spread is exact -- +-1 -- and the two franchises differ only because the
 // owner's roster splits 20 Family : 75 Fellows against 10 : 58, which the rule cannot change.
 const perGame=g=>{const ids=data.fellows.filter(r=>r.source.game===g).map(r=>r.id).map(id=>count[id]);
  return {fellows:ids.length,family:data.family.filter(r=>r.source.game===g).length,
   pairings:ids.reduce((a,b)=>a+b,0),min:Math.min(...ids),max:Math.max(...ids)}};
 assert.deepEqual(perGame('MSF'),{fellows:75,family:20,pairings:200,min:2,max:3});
 assert.deepEqual(perGame('SWGOH'),{fellows:58,family:10,pairings:100,min:1,max:2});
 // And `rank` is load-bearing, not decoration: every Fellow row must carry the roster's own rank, or
 // the rule sorts the whole pool as Infinity and "nearest in rank" silently becomes alphabetical.
 // This is exactly what the 131 generated rows did before they were re-emitted with their rank.
 for(const r of data.fellows)assert.ok(Number.isSafeInteger(r.rank)&&r.rank>=1,`${r.id} has no rank`);
 for(const r of data.family)assert.ok(Number.isSafeInteger(r.rank)&&r.rank>=1,`${r.id} has no rank`);
 assert.notDeepEqual(familyRecipientMap(data.family,data.fellows.map(({rank,...r})=>r)),derived,
  'NEGATIVE CONTROL: strip the ranks and the rule gives a different answer, so it really reads them');
 // THE RULE ITSELF, on a synthetic pool, because the shipped assertions above cannot tell one
 // arrangement of it from another. Twelve MSF Fellows ranked 1..12 and three MSF Family: each takes her
 // own ten-wide BAND of the rank order in Family rank order, wrapping, so the bands tile instead of
 // overlapping.
 const pool=Array.from({length:12},(_,i)=>({id:'syn_'+(i+1),rank:i+1,source:{game:'MSF'}}));
 const sisters=[{id:'syn_a',rank:5,source:{game:'MSF'}},{id:'syn_b',rank:7,source:{game:'MSF'}},{id:'syn_c',rank:40,source:{game:'MSF'}}];
 const map=familyRecipientMap(sisters,pool);
 assert.deepEqual(map.syn_a,['syn_1','syn_2','syn_3','syn_4','syn_5','syn_6','syn_7','syn_8','syn_9','syn_10'],'band 0');
 assert.deepEqual(map.syn_b,['syn_11','syn_12','syn_1','syn_2','syn_3','syn_4','syn_5','syn_6','syn_7','syn_8'],'band 1, wrapping');
 assert.deepEqual(map.syn_c,['syn_9','syn_10','syn_11','syn_12','syn_1','syn_2','syn_3','syn_4','syn_5','syn_6'],'band 2');
 // Every Fellow in the pool is covered, and by at most one more blesser than any other: 30 pairings
 // over 12 Fellows is 2 or 3 each. That is the property the shipped lists inherit.
 const synCount=pool.map(f=>Object.values(map).filter(l=>l.includes(f.id)).length);
 assert.deepEqual([Math.min(...synCount),Math.max(...synCount),synCount.reduce((a,b)=>a+b,0)],[2,3,30]);
 // NEGATIVE CONTROL for the band: the OLD rule gave her the ten nearest her own rank, so the rank-5
 // member started at syn_5 and the rank-7 member at syn_7 -- overlapping by eight. A band cannot.
 assert.notDeepEqual(map.syn_b.slice(0,1),['syn_7'],'a band is not "the ten nearest her own rank"');
 // Twelve Fellows cannot hold three disjoint bands of ten, so they overlap where they wrap -- which is
 // exactly how 30 pairings spread 2-3 apiece over 12. The shipped pools are 75 and 58 wide.
 assert.equal(map.syn_a.filter(x=>map.syn_b.includes(x)).length,8,'bands overlap only by the wrap');
 assert.equal(familyRecipients(sisters[0],pool,sisters).length,RECIPIENTS_PER_FAMILY);
 assert.deepEqual(familyRecipients(sisters[0],[...pool,{id:'syn_sw',rank:1,source:{game:'SWGOH'}}],sisters).includes('syn_sw'),false,'never across franchises');
 // A short pool yields only what exists -- a band may not name the same Fellow twice.
 assert.deepEqual(familyRecipients(sisters[0],pool.slice(0,3),sisters),['syn_1','syn_2','syn_3']);
 assert.deepEqual(familyRecipients(sisters[0],[],sisters),[],'and nothing when her franchise has none');
});

test('a crossover Family member is capped at the shipped 36/24 ladder and blesses only her own list',()=>{
 const s=legacyStart(0);
 // wife_191 is funded too: she is the positive control for the same action in the same mode.
 const owned={...s,family:{...s.family,wife_191:{...s.family.wife_191,points:1e9},[ONE]:{intimacy:0,blessingPower:10,points:1e9,skill:0,relationship:1}}};
 assert.deepEqual(blessingRecipients(owned,ONE),additionRecipients(ONE),'her own authored list, in default mode');
 const apk=apkMode(owned);
 assert.deepEqual(blessingRecipients(apk,ONE),additionRecipients(ONE),'and the SAME list in APK mode');
 assert.equal(blessingPlan(owned.family[ONE],'flatBlessing',owned,700,ONE).level,36);
 assert.equal(blessingPlan(owned.family[ONE],'flatBlessing',apk,700,ONE).level,36,'APK mode does not raise her cap');
 assert.ok(blessingPlan({...owned.family.wife_191,points:1e9},'flatBlessing',apk,700,'wife_191').level>36,
  'positive control: an ORIGINAL Family member does climb the APK ladder');
 // Trained to the cap, she supports her recipient and nobody else. Done in BOTH modes, because
 // blessingAction's addition branch only fires in APK mode -- in default mode it is unreachable, so a
 // default-mode-only test would pass with the branch deleted.
 for(const [mode,from] of [['default',owned],['APK',apk]]){
  let t=from;
  for(const key of ['flatBlessing','advancedBlessing']){const r=act(t,'trainBlessingsMax',t.lastAt,ONE,key);assert.ok(!r.error,`${mode}: ${r.error}`);t=r.state}
  assert.equal(t.family[ONE].flatBlessing,36,mode);assert.equal(t.family[ONE].advancedBlessing,24,mode);
  assert.equal(t.family[ONE].apkBlessings,undefined,`${mode}: no APK blessing history record for an addition`);
  assert.ok(valid(t),`${mode}: ${refusedBy(t)}`);
  // Positive control on the same call in the same mode: an ORIGINAL member DOES gain the record.
  const o=act(t,'trainBlessingsMax',t.lastAt,'wife_191','flatBlessing');
  if(mode==='APK'){assert.ok(!o.error,o.error);assert.ok(o.state.family.wife_191.apkBlessings?.flatBlessing,'APK mode must still write a record for an original');}
 }
 let t=owned;
 for(const key of ['flatBlessing','advancedBlessing']){const r=act(t,'trainBlessingsMax',t.lastAt,ONE,key);assert.ok(!r.error,r.error);t=r.state}
 assert.deepEqual(blessingPower(t,additionRecipients(ONE)[0]),{flat:159000,percent:.12},'the full default cap');
 assert.deepEqual(blessingPower(t,'hero_15'),{flat:0,percent:0},'an original Fellow gains nothing from her');
 assert.ok(valid(t),refusedBy(t));
});

test('NEGATIVE CONTROL: the blessing guards each refuse what they are there to refuse',()=>{
 const s=legacyStart(0);
 const base={...s,family:{...s.family,[ONE]:{intimacy:0,blessingPower:10,points:1e9,skill:0,flatBlessing:36,advancedBlessing:24,relationship:1}}};
 assert.ok(valid(base));
 // 1. Past the classic ladder, with no APK record to authorise it.
 assert.equal(valid({...base,family:{...base.family,[ONE]:{...base.family[ONE],flatBlessing:37}}}),false,'level 37 must be refused');
 // 2. An apkBlessings record on an addition at all -- the only way she could climb past 36.
 const record={policyVersion:1,level:0,value:0,legacyRecipients:[],recipients:[...additionRecipients(ONE)],receipts:[{from:0,to:1,cost:100}]};
 const inApk=apkMode(base);
 const withApk={...inApk,family:{...inApk.family,[ONE]:{...inApk.family[ONE],flatBlessing:1,apkBlessings:{flatBlessing:record}}}};
 assert.equal(valid(withApk),false,'an addition may never hold an apkBlessings record');
 // HONEST NOTE, from negative-controlling this file: deleting `isAddition(id)` from validBlessings'
 // apkBlessings guard does NOT make this assertion pass, because the snapshot-equality check at the
 // same site already refuses it -- `source.recipients[<an addition>]` is undefined, and an APK record
 // must match the shipped list byte for byte. So that clause is defence-in-depth and states intent;
 // it is not independently observable, and this comment exists so nobody removes it believing a test
 // is watching it. The guard that IS load-bearing here is the `level < r.values.length` cap, broken
 // deliberately on the line above.
 // 3. Positive control for the same guard shape on an ORIGINAL member: the identical record, pointed
 // at the shipped table, IS accepted -- so #2 fails for being an addition, not for being malformed.
 const ok={...inApk,
  family:{...inApk.family,wife_191:{...inApk.family.wife_191,points:1e9,flatBlessing:1,
   apkBlessings:{flatBlessing:{...record,recipients:[...blessingSource.recipients.wife_191]}}}}};
 assert.equal(valid(ok),true,refusedBy(ok));
 // 4. A recipient that resolves to nothing is still refused.
 const ghost={...ok,family:{...ok.family,wife_191:{...ok.family.wife_191,apkBlessings:{flatBlessing:{...record,recipients:['xover_msf_nobody']}}}}};
 assert.equal(valid(ghost),false,'an unresolvable recipient must be refused');
});

// ---------------------------------------------------------------------------------------------
// D5: reconcileRecipients must PRESERVE a crossover recipient, not heal it away.
// ---------------------------------------------------------------------------------------------

test('reconcileRecipients keeps a crossover recipient and still re-pins genuinely removed content',()=>{
 const s=legacyStart(0);
 const apkBase=apkMode(s);
 const record=extra=>({policyVersion:1,level:0,value:0,legacyRecipients:[],receipts:[{from:0,to:1,cost:100}],...extra});
 const pinned=[...blessingSource.recipients.wife_191];
 const withRecipients=r=>({...apkBase,family:{...apkBase.family,wife_191:{...apkBase.family.wife_191,points:1e9,flatBlessing:1,
  apkBlessings:{flatBlessing:record({recipients:r})}}}});
 // A snapshot naming a CROSSOVER Fellow the shipped table does not list is TAMPERING, not removed
 // content: it is preserved untouched and therefore still refused, rather than silently healed.
 const crossover=withRecipients([...pinned,'xover_msf_spiderman']);
 const healedCrossover=decodeOrNull(crossover);
 assert.equal(healedCrossover,null,'a snapshot naming a crossover Fellow must not be healed into validity');
 // The repair it must still do: a snapshot naming an id NOTHING knows is treated as removed content.
 const removed=withRecipients([...pinned,'hero_99999']);
 const back=decode(JSON.stringify(removed));
 assert.deepEqual(back.family.wife_191.apkBlessings.flatBlessing.recipients,pinned,'removed content is re-pinned');
 // NEGATIVE CONTROL for the repair's whole purpose: a real original the table never listed is
 // tampering and must NOT be healed.
 const tampered=withRecipients([...pinned,FELLOWS.find(f=>!pinned.includes(f.id)).id]);
 assert.equal(decodeOrNull(tampered),null,'a real Fellow the table never listed must stay refused');
 function decodeOrNull(state){try{return decode(JSON.stringify(state))}catch{return null}}
});

// ---------------------------------------------------------------------------------------------
// FATHOMS, EVENTS, welcomeAll and the flag-on village. All measured in the child process.
// ---------------------------------------------------------------------------------------------

test('flag OFF: an event stage resolves a crossover member from the DATA, not the flag-gated array',()=>{
 // D9. The flag-on harness cannot see this: with ?crossover=1 the FAMILY array contains her, so the
 // old `FAMILY.find(...)` worked there. The failure was flag-OFF -- "That character is not in the
 // catalogue.", after which validEvents refused every save that had claimed the stage. No crossover
 // arc ships yet (step 8), so the stage resolver is tested directly.
 for(const [member,kind,name] of [[ONE,'family','Jean Grey'],['xover_msf_spiderman','fellows','Spider-Man'],
                                  ['wife_2','family','Charlotte'],['hero_1','fellows','Fifi']]){
  assert.equal(stageKind({member,kind}),kind,'kind is data, not a prefix');
  assert.equal(stagePerson({member,kind})?.name,name,`${member} must resolve with the flag off`);
 }
 assert.ok(!FAMILY.some(f=>f.id===ONE),'and she is genuinely absent from the flag-off array');
 assert.equal(stagePerson({member:'xover_msf_nobody',kind:'family'}),null,'NEGATIVE CONTROL: an unknown id resolves to nothing');
 // A stage with no declared `kind` still falls back to the old prefix rule, so existing arcs cannot shift.
 assert.equal(stageKind({member:'hero_1'}),'fellows');assert.equal(stageKind({member:'wife_2'}),'family');
});

test('the blessing recipient rule accepts crossover FELLOWS and nothing else new',()=>{
 // D6, tested as a rule because no shipped recipient list names a crossover Fellow yet. The old rule
 // was the first clause alone, which made a crossover Fellow impossible to bless in APK mode.
 for(const x of ['hero_1','hero_15','hero_60','xover_msf_spiderman','xover_swgoh_vaderduelsend'])
  assert.equal(blessingRecipientId(x),true,x+' must be blessable');
 for(const x of ['wife_2','wife_191',ONE,'xover_msf_nobody','hero_99999','',null,undefined,7])
  assert.equal(blessingRecipientId(x),false,String(x)+' must not be blessable');
 // The widening is strictly a widening: every id the ORIGINAL lists still passes.
 for(const list of Object.values(blessingSource.recipients))for(const x of list)
  assert.equal(blessingRecipientId(x),true,x+' is in the shipped APK table and must stay acceptable');
 // POSITIVE CONTROL that the first clause is still doing work, and that this rule must NOT be
 // `fellowById`: the public snapshot's blessedFellows lists -- which become an APK record's
 // `legacyRecipients` -- name hero ids the APK index knows but the 159-Fellow catalogue does not.
 // Narrowing the rule to fellowById refuses every one of them, which is how this was caught:
 // tests/original-blessings.test.mjs went red on a save that had been legal for weeks.
 const fromSnapshot=[...new Set([...ORIGINAL_FAMILY.map(f=>f.id)].flatMap(id=>[...affinityIds(id)]))];
 assert.ok(fromSnapshot.length>100,`only ${fromSnapshot.length} snapshot pairings; this control is vacuous`);
 for(const x of fromSnapshot)assert.equal(blessingRecipientId(x),true,x+' is a shipped affinity pairing and must stay acceptable');
 const offCatalogue=fromSnapshot.filter(x=>!fellowById(x));
 assert.ok(offCatalogue.length>0,'no off-catalogue hero id anywhere; the fellowById warning is stale');
});

test('flag OFF: Fathoms are closed to a crossover member and she cannot store a tier',()=>{
 const s=legacyStart(0);
 const owned={...s,family:{...s.family,[ONE]:{intimacy:1e6,blessingPower:10,points:0,skill:0,relationship:1}},
  habits:{...s.habits,totals:Object.fromEntries(Object.keys(s.habits.totals||{}).map(k=>[k,{...s.habits.totals[k],actions:1000}]))}};
 assert.equal(fathomsApply(ONE),false);
 assert.equal(openSlots(owned,ONE),0,'no amount of intimacy or habit activity opens one');
 assert.ok(fathomsApply('wife_191'),'positive control: an original member is unaffected');
 assert.equal(fathomBonus(owned,'Diligent'),0);
 assert.equal(valid({...owned,fathoms:{policyVersion:1,day:'',used:0,tiers:{[ONE]:{1:1}}}}),false,
  'NEGATIVE CONTROL: a stored crossover Fathom tier must be refused');
 const fathomRefusal=act(owned,'fathomAdvance',owned.lastAt,ONE,1);
 assert.match(fathomRefusal.error,/quenching tradition/,'and the refusal says why, rather than naming an intimacy gate');
});

test('flag ON: the whole Family loop works for a crossover member, and the save loads flag OFF',()=>{
 const out=flagOn();
 assert.deepEqual(out.errors,[],'every action in the Family loop succeeded');
 assert.equal(out.listedFamily,137);assert.equal(out.originalFamily,107);assert.ok(out.appendOnly);
 assert.equal(out.listed,true,'she is listed with the flag on');
 // The storyline is the unlock, and only the storyline.
 assert.equal(out.stageResolves,'Jean Grey','a kind:"family" stage naming an addition resolves');
 assert.deepEqual(out.welcomeAll.granted,[],'welcomeAll must not grant a crossover member free');
 assert.equal(out.welcomeAll.count,107,'it still seats the whole original catalogue');
 assert.match(out.welcomeTargeted,/storyline/,'and a targeted welcome says why it refuses');
 assert.equal(out.owned,true);assert.equal(out.inFellows,false,'kind routes her to s.family, not s.fellows');
 assert.equal(out.spent,out.costPerStage,'validEvents ledger balances at the arc\'s own per-stage cost');
 // Every Family system accepted her id.
 assert.ok(out.member.intimacy>=50&&out.member.blessingPower>10&&out.member.skill>=1&&out.member.relationship>=2,JSON.stringify(out.member));
 assert.equal(out.member.flatBlessing,36);assert.equal(out.member.advancedBlessing,24);
 assert.equal(out.apkBlessings,null);
 assert.deepEqual(out.pupils,['xover_msf_jeangrey'],'she is a school caretaker');
 assert.deepEqual(out.blessingPowerToRecipient,{flat:159000,percent:.12});
 assert.deepEqual(out.blessingPowerToOriginal,{flat:0,percent:0});
 assert.match(out.fathomRefusal,/quenching tradition/);
 assert.equal(out.fathomsApply,false);assert.equal(out.openSlots,0);
 assert.deepEqual(out.ladderCap,{classic:36,planDefault:36,planApkMode:36,planApkModeOriginal:597},
  'the last number is the positive control: an original member really does climb further in APK mode');
 assert.equal(out.apkOnAdditionRefused,true);
 assert.equal(out.valid,true,out.refusedBy);
 // THE RULE-12 CHECK, in the direction that matters: the flag-off parent loads the flag-on save.
 // This used to have a caveat -- the child pushed a SYNTHETIC arc onto EVENTS, which this process
 // cannot resolve, so the claim had to be made against a save with the `events` subtree stripped. The
 // 33 real arcs ship now, so the child claims her OWN shipped arc (XoverMsf03 stage 1) and the whole
 // save, ledger included, must round-trip byte identically with NOTHING quarantined.
 assert.equal(out.arc,'XoverMsf03','her shipped arc, not a fixture');
 const s=decode(out.save);
 assert.deepEqual([...lastQuarantine],[],'nothing may be dropped to make her save load');
 assert.ok(valid(s),refusedBy(s));
 assert.equal(JSON.stringify(s),out.save,'byte-identical decode with the flag off');
 assert.deepEqual(s.family[ONE],out.member,'her progress is intact, byte for byte');
 assert.deepEqual(s.bonds[ONE],{fellow:'hero_15',level:0,original:false});
 assert.equal(s.familyTrips.children[0].caretaker,ONE);
 assert.equal(s.school.pupils[0].caretaker,ONE);
 assert.deepEqual(s.events,{policyVersion:1,spent:10,claimed:{XoverMsf03:1}},'and the crossover ledger survived');
 assert.ok(!FAMILY.some(f=>f.id===ONE),'and she is still not listed here');
 // NEGATIVE CONTROL for "nothing was quarantined": the SAME save whose ledger names an arc nothing
 // ships loses `events` and only `events` -- so the clean round trip above is a fact about her data
 // and not about decode() never quarantining anything.
 const unknown=decode(out.saveUnknownArc);
 assert.deepEqual([...lastQuarantine],['events'],'an unknown arc is dropped, and nothing else is');
 assert.deepEqual(unknown.family[ONE],out.member,'and she survives that too');
 assert.ok(unknown.bonds[ONE]&&unknown.familyTrips&&unknown.school.pupils.length);
});

test('flag ON: Fathoms stay at 321.0 with 137 members -- the 321 -> 411 inflation cannot return',()=>{
 const {fathom}=flagOn();
 assert.equal(fathom.members,137);
 assert.equal(fathom.diligent,321,'MEASURED: 107 original Family at MAX_TIER. +30 crossover would be 411');
 assert.equal(fathom.additionsOpen,0,'not one crossover slot is open, at any intimacy');
 assert.equal(fathom.storedCrossoverTierRefused,true);
});

// ---------------------------------------------------------------------------------------------
// THE CEILING. Positive control first (CLAUDE.md rule 2), then the flag-on figure.
// ---------------------------------------------------------------------------------------------

test('the ceiling fixture reproduces tests/fellow-power.test.mjs exactly -- the positive control',()=>{
 const c=buildCeiling();
 // REBASELINED 2026-09-18 (the Stella tracks slice). Stage 0 is untouched -- nothing about records,
 // museum or familiars moved -- and stage 1 carries the whole move, for two reasons measured before
 // they were built:
 //   + lib/hero-spirit.mjs imports the original's OWN 126 Stella tracks in place of the four scraped
 //     community pages, so every Fellow has an own-flat ladder instead of three of them having one;
 //   - lib/stella.mjs applyStella now uses the original's stacking order (the owner's flat is an
 //     `extradd`, added after the typed multiplier, not inside it), which pulls the same import down
 //     from 24,932,927 to this.
 // Stages 2 and 3 carry stage 1 forward; the shape of the blessing and echo stages is unchanged.
 // REBASELINED AGAIN 2026-09-18 (the deferred-columns slice). Stage 0 is untouched again; stage 1
 // carries the whole move again, and this time it is ONE column: the owner's own-Power percent
 // (`self | atk percent`, 116 of the 126 tracks, +153% to +1350%) now joins the same `percent` bucket
 // the type-wide column already used, as PropManager.lua:99-117 composes it.
 //   13,656,809 -> 19,597,345  stage 1, +43.5%
 //   15,642,961 -> 26,956,296  ceiling, +72.3%
 // REBASELINED 2026-09-18 (Power on the original's composition, lib/adventure.mjs powerParts): every
 // stage moved; it was [1,616,486, 19,597,345, 25,877,947, 26,956,296]. Stella's percent no longer wraps
 // the whole Fellow, and stars/skill/museum/Stella percents now ADD in one bucket.
 // REBASELINED 2026-09-18 (Skill Aptitude, lib/talent-skills.mjs): every original now owns its talent skills
 // at level 1 (stage 0 moves by that, +11,918) and every Stella rank pays its self/bond talent halo -- the
 // bond column reaches every member of a HeroBond group from every owner, which is most of stage 1's move.
 // It was [1,317,357, 14,143,031, 14,461,838, 14,537,869].
 assert.deepEqual([c.stage0,c.stage1,c.stage2,c.stage3],[2844776,20082540,20713775,20816140],
  'if this drifts, nothing measured on top of it means anything');
 assert.equal(c.notes.stellaTracks,111,'every shipped original Fellow maxed a ladder of its own');
 // Stage 4 -- the shared crossover shard track -- is still a no-op with no crossover Fellow in the
 // roster, which is what lets the same fixture be the control for the flag-on measurement below.
 assert.equal(c.ceiling,c.stage3,'the crossover shard stage must not touch a village with no crossover Fellow');
 assert.equal(c.crossoverWorth,0);
 assert.deepEqual(c.notes,{stellaTracks:111,originalFamily:107,funded:107,trained:200,echoes:27});
 assert.equal(c.notes.shardTracksMaxed,undefined,'and the CROSSOVER track must not even record a note');
 assert.ok(c.valid,c.refusedBy);
 assert.equal(c.ceiling,20816140,'26,956,296, then 14,537,869, before the 2026-09-18 talent skills');

 // *** THE TWO PINS, RE-ANCHORED 2026-09-18. Read the comments on both constants before using either.
 //
 // PIN 1 -- PACING, NOT PARITY. 3,497,276 is ONE real player's few-weeks save. The old reading of this
 // ratio as a parity budget rested on a misread constant (docs/power-parity-audit.md 5): 3,497,276 was
 // taken for a single hero's power and it is a ROSTER TOTAL of 3.497 billion. It is kept because a
 // maxed village against a real account is a useful, dated, stable comparison -- not because 7.7x is
 // an overshoot of anything.
 assert.equal(+(c.ceiling/ORIGINAL_LIVE_SAVE_PACING).toFixed(3),5.952,'4.157 before the 2026-09-18 talent skills');
 // 7.708 before the 2026-09-18 additive composition;
 // 1.331 before the 2026-09-18 Stella tracks; 4.473 after them; 1.992 before the roster trim.

 // PIN 2 -- THE ORIGINAL'S OWN TABLE MAXIMUM, which is what the old anchor was never able to be.
 // Everkai's whole maxed roster against the original's own Spirit column at its top, under the
 // original's own HeroConversionRate divisor. 1.945x -- and that denominator counts ONE bucket of ONE
 // system for the 126 heroes of 181 that have it, so it is a FLOOR on the original's ceiling and 1.945
 // is an UPPER bound on the overshoot.
 assert.equal(ORIGINAL_SPIRIT_TABLE_MAX,13861950);
 assert.equal(+(c.ceiling/ORIGINAL_SPIRIT_TABLE_MAX).toFixed(3),1.502,'1.945 before the 2026-09-18 additive composition, 1.049 before its talent skills');
 // PIN 2, per FELLOW -- the number the owner actually reported, and what the audit recommends as the
 // replacement target. His best original hero after a few weeks was ~300,000,000 and 70-90% of it was
 // one term: that hero's Spirit `extradd`, whose table maximum is 223,500,000.
 assert.equal(ORIGINAL_BEST_SPIRIT_FLAT,223500000);
 assert.equal(c.fellow.top,401355307,'623,250,916 before the 2026-09-18 additive composition, 285,273,823 before its talent skills');
 assert.equal(+(c.fellow.top/ORIGINAL_OWNER_BEST_HERO).toFixed(3),1.338,
  'a fully maxed Everkai Fellow against the owner’s remembered best original hero');
 assert.equal(c.fellow.weakest,36505458,'and the floor, which is the other number he reported (>5M); 28,900,470, then 26,274,696, before 2026-09-18');

 // *** THE COMPOUND, which neither pin above shows. `ceiling` is rosterOperation -- one factor of
 // village income. The imported appointment column lifts the OTHER factor, and the two multiply.
 assert.equal(c.village.appointBp,2321200,'+232.12x on the appointment strand, summed over every owner');
 assert.equal(c.village.bonusMax,932,'the biggest business multiplier reached: x933.5, from x5.0');
 assert.equal(c.village.goldPerSecond,105281363751,'136,303,836,126 before the 2026-09-18 additive composition, 73,561,078,749 before its talent skills');
 assert.ok(c.village.valid,c.village.refusedBy);
 // Stated as a ratio so it cannot be read off the rosterOperation move alone: 604,518,962 gold/s before
 // this slice, 136,303,836,126 after. rosterOperation moved x1.72; village income moved x225.
 assert.equal(Math.round(c.village.goldPerSecond/604518962),174,'225 before the 2026-09-18 additive composition, 122 before its talent skills');
});

// *** THE MEASURED FLAG-ON CEILING, RE-MEASURED 2026-09-17 AFTER THE STELLA TYPE FIX AND THE SHARD
// *** TRACK (docs/crossover-plan.md order of work 6 and 8).
//
// History of this number, because each move had a cause: 7,046,651 (2.015x) with four crossover
// characters, 10,914,679 (3.121x) once the other 131 Fellow rows landed, 10,872,947 (3.109x) after the
// recipient re-cut, and 14,006,798 (4.005x) now. This last move is two changes with opposite signs, and
// they are pinned SEPARATELY below so neither can hide the other:
//
//    6,965,719  flag off (the positive control above)                          1.993x
//    9,311,898  + the 133 crossover Fellows and 30 crossover Family, maxed     2.663x   (+2,346,179)
//   14,006,798  + their shared Stella shard track at level 40                  4.005x   (+4,694,900)
//
// 1. THE STELLA TYPE FIX took the middle row DOWN from 10,872,947 to 9,311,898, i.e. -1,561,049.
//    `stellaBonus` summed the percent of every activated Stella of the SAME TYPE, and a crossover
//    Fellow has no entry of its own, so its TYPE alone multiplied its whole power: Inspiring +184%,
//    Diligent/Informed +122%, Brave/Unfettered +0%. On identical maxed records an Inspiring crossover
//    Fellow was worth 2.84x a Brave one -- type choice was silently the largest power lever in the
//    slice, an order above the operator-slot value it was chosen for (tests/crossover-arcs.test.mjs:
//    +1,560,006 to +3,120,006 gold/s), and it was free. Additions now read their OWN Stella row only
//    (lib/stella.mjs). MEASURED CONSEQUENCE, pinned below: maxedPowerByType is now ONE number for all
//    five types, so the ratio is 1.00 instead of 2.84 and type is no longer a power term at all. The
//    159 original Fellows are untouched -- the flag-off control above is byte-identical.
//
// 2. THE SHARED SHARD TRACK took it UP by exactly 133 x 35,300 = +4,694,900. That is not a coincidence
//    and it is worth knowing why: `applyStella` adds the own `flat` AFTER every multiplier, and the
//    crossover ladder's percent column is zero, so the level-40 flat of 35,300,000 converts 1:1 through
//    rosterOperation's /1000. One pool, 4,500 shards per Fellow, 733,500 for all 163 at 500-1,000/day.
//
// THE EQUIVALENT BONUS TRACK IS THAT SHARD TRACK, and the measurement is what decided it (order of
// work 6 asked for a track that closes the gap, balanced against decision 1's accepted ~4x):
//   * before this slice a maxed crossover Fellow reached 18,973,639 (Brave/Unfettered) to 53,885,134
//     (Inspiring); docs/crossover-abilities-plan.md 1.8 put that at ~0.33 of a maxed original;
//   * it now reaches 54,273,639 for every type, against a maxed ORIGINAL of the roster's own middle
//     type (Diligent/Informed) at 54,049,915 -- 1.004x, measured on the same finished state with the
//     same bondedPower (CLAUDE.md rule 1). The gap is closed, not overshot.
//   * A FURTHER percent ladder was designed, built and priced against this fixture before being
//     DROPPED (CLAUDE.md rule 7: dropped with the reason, not filed). `crossoverWorth` is what the 133
//     are worth in the finished state, so a uniform own-power +1% costs crossoverWorth/100 = +70,411
//     conversion. Angie's percent column starts at +5%, which is +352,054 -> 14,358,852 = 4.106x and a
//     maxed crossover at 1.054x its original counterpart; her full +122% is 22,596,915 = 6.461x and
//     2.27x. So the shortest row that exists already breaks both the accepted ceiling and the
//     non-dominance claim, and nothing fits. If the owner wants crossovers stronger, this is the price
//     list and it is one sentence to act on.
//
// The 300 pairings are the blessing rule's own ceiling, not a shortfall: ten recipients each is the
// original blessing table's measured maximum, so 30 x 10 is as far as that route can ever reach.
// REBASELINED 2026-09-17 with the owner's roster trim: 48 of the 159 originals left, and every figure
// in this block is a VILLAGE-WIDE sum, so the flag-off denominator fell with the flag-on total. The
// crossover half is untouched -- all 163 still ship, their rarity ladder re-measured to the same
// numbers (scripts/crossover/build-abilities.mjs) -- so the ratio RISES as a pure arithmetic effect
// of a smaller original roster, not because anything about a crossover Fellow changed.
test('flag ON: the ceiling is 80,007,548 -- and rosterOperation is only HALF of what moved',()=>{
 const {ceiling}=flagOn();
 // REBASELINED 2026-09-18 TWICE: 11,696,717 before the Stella tracks, 22,684,041 after them, and
 // 33,997,375 once the three deferred columns were imported. The move is the same one as the flag-off
 // control and it still does not touch a crossover Fellow: it is the originals' own-Power percent.
 //
 // *** THE OLD "~4x BUDGET" IS RETIRED, NOT BUSTED. *** It was anchored to `original` below, which is
 // ONE REAL PLAYER'S few-weeks save and was additionally misread as a single hero's power
 // (docs/power-parity-audit.md 5). The owner accepted the real numbers on 2026-09-18 and asked for a
 // second pin against the original's own table maximum, which is `vsTableMax`.
 // REBASELINED 2026-09-18 (Power on the original's composition): 33,997,375 / 9.7211 / 2.453 before.
 // 20,874,032 / 5.9687 / 1.506 before the 2026-09-18 talent skills (the originals' half moved; see above).
 // REBASELINED 2026-09-19 (crossover parity: the shared shard track's flat x3 and own percent x70 of Angie's columns,
 // lib/crossover-stella.mjs): 28,362,563 /
 // 8.1099 / 2.046 before. Only the crossover half moved -- stage3 below, the roster before that track, is unchanged.
 assert.equal(ceiling.ceiling,80007548);
 assert.equal(ceiling.ratio,22.8771,'PACING against one real save -- not a parity budget');
 assert.equal(ceiling.vsTableMax,5.772,'against the original own Spirit table at its top (a FLOOR on its ceiling)');
 assert.equal(ceiling.original,3497276,'the same denominator the flag-off control uses');
 assert.equal(ceiling.tableMax,13861950,'and the same table maximum');
 // *** AND THE COMPOUND, which the ceiling number cannot show. The imported appointment column lifts
 // the OTHER factor of village income, so the two multiply: rosterOperation moved x1.50 flag-on while
 // gold/s moved from 876,304,628 to 171,878,129,494, i.e. x196.
 assert.equal(ceiling.village.appointBp,2321200);
 assert.equal(ceiling.village.goldPerSecond,404339559322,'143,408,852,632 before the 2026-09-19 crossover re-scale; 171,878,129,494, then 105,573,858,091, before 2026-09-18');
 assert.equal(Math.round(ceiling.village.goldPerSecond/876304628),461,'x164 before 2026-09-19; x196, then x120, before 2026-09-18');
 // The top Fellow of THIS state is now a crossover one (445,498,837; 401,355,307, an original, before): the originals
 // here have maxed their records but not their 2026-09-18 sinks, which the `fullyMaxed` state below adds.
 assert.equal(ceiling.fellow.top,445498837,'one maxed Fellow, against the owner’s remembered 300,000,000');
 assert.equal(ceiling.stage3,23667663,'the roster before the crossover shard track (29,302,475, then 16,179,132, before 2026-09-18)');
 assert.equal(ceiling.ceiling-ceiling.stage3,56339885,'what the crossover track is worth now (133 x 35,300 = 4,694,900 before 2026-09-19, when it was a flat alone)');
 assert.equal(ceiling.notes.shardTracksMaxed,133,'every crossover Fellow reached level 40');
 assert.equal(ceiling.notes.stellaTracks,111,'and every original Fellow maxed an imported ladder');
 assert.equal(ceiling.crossoverWorth,59191408,'what the 133 are worth (7,546,423 before the 2026-09-19 re-scale; 7,041,079 before 2026-09-18)');
 assert.equal(ceiling.fellowsOnly.ceiling,79825920,'the 133 crossover Fellows without the 30 Family (28,180,935 before 2026-09-19)');
 assert.equal(ceiling.familyBlessingWorth,181628,'what the 30 crossover Family are worth');
 assert.equal(ceiling.ceiling-ceiling.fellowsOnly.ceiling,ceiling.familyBlessingWorth,'and it is a subtraction, not a quote');
 assert.deepEqual([ceiling.stage0,ceiling.stage1,ceiling.stage2],[5514671,22752435,23565298],'[3,425,348, 21,406,207, 28,224,127], then [2,776,992, 15,602,666, 16,103,101], before 2026-09-18');
 // UNMOVED by either the roster trim or the Stella tracks, and worth saying so: the crossover shard
 // track is still worth exactly 133 x 35,300. The 133 crossover Fellows were worth 7,041,079 between them
 // until the 2026-09-18 additive composition, which re-buckets their stars and skill too: 6,336,163.
 assert.equal(ceiling.crossoverWorth,59191408);assert.equal(ceiling.ceiling-ceiling.stage3,56339885);
 // The two states differ in the crossover FAMILY and nothing else, or the difference above is not the
 // Family side's worth (CLAUDE.md rule 1).
 assert.deepEqual([ceiling.stage0,ceiling.stage1],[ceiling.fellowsOnly.stage0,ceiling.fellowsOnly.stage1],
  'both states are identical until the blessing stage');
 assert.equal(ceiling.notes.crossoverFamily,30);assert.equal(ceiling.notes.crossoverFellows,133);
 assert.equal(ceiling.fellowsOnly.notes.crossoverFamily,undefined,'the isolating state seats no crossover Family');
 assert.equal(ceiling.fellowsOnly.notes.crossoverFellows,133,'and the same 133 Fellows');
 assert.equal(ceiling.notes.funded,137);assert.equal(ceiling.notes.trained,260,'30 more members x 2 ladders');
 assert.equal(ceiling.fellowsOnly.notes.funded,107);assert.equal(ceiling.fellowsOnly.notes.trained,200);
 assert.equal(ceiling.fellowsOnly.notes.stellaTracks,111,'the imported tracks do not depend on the crossover Family');
 assert.equal(ceiling.crossoverFellowsInRoster,133,'all 133 are in the roster being measured');
 assert.equal(ceiling.pairings,300,'30 x 10 -- the structural cap the rule can never exceed');
 assert.equal(ceiling.familyLadderMax,36,'and not one of them passed the classic ladder');
 assert.equal(ceiling.blessedCrossoverFellows,133,'every one of the 133 is blessed by somebody now');
 // The whole blessing distribution, so a change to the rule shows up as a shape change rather than as
 // one Fellow's number moving. Each bucket is n x (159,000 flat, +12%), the 36/24 cap per blesser.
 assert.deepEqual(ceiling.blessingBuckets,{
  '{"flat":159000,"percent":0.12}':16,          // 1 blesser  -- 16 SWGOH Fellows
  '{"flat":318000,"percent":0.24}':67,          // 2
  '{"flat":477000,"percent":0.36}':50,          // 3 -- the most any Fellow draws
 });
 assert.equal(Object.values(ceiling.blessingBuckets).reduce((a,b)=>a+b,0),133,'every Fellow is in exactly one bucket');
 assert.deepEqual(ceiling.blessingCounts,{1:16,2:67,3:50},'and the same shape counted as blessers');
 assert.deepEqual(ceiling.perCrossoverFellowBlessing,{
  xover_msf_spiderman:{flat:477000,percent:0.36},         // 3 MSF blessers x the 36/24 cap
  xover_swgoh_vaderduelsend:{flat:318000,percent:0.24},   // 2 SWGOH blessers
 });
});

// THE TYPE MULTIPLIER, before and after, as its own test: it is the finding this slice exists to fix
// and it must not be able to come back quietly.
test('flag ON: a crossover Fellow’s TYPE is no longer a power term -- 2.84x became 1.00x',()=>{
 const {ceiling}=flagOn();
 // An addition reads its OWN row only. Until 2026-09-19 that row's percent was 0; the parity lever gives it +8,540%
 // at level 40 (lib/crossover-stella.mjs), and it is still the SAME number for every type -- the property this
 // test protects -- because the one shared ladder has no type and no typed sum includes it.
 assert.deepEqual(ceiling.stellaPercentByType,{Unfettered:8540,Brave:8540,Diligent:8540,Informed:8540,Inspiring:8540});
 // MEASURED BEFORE THE FIX: {Unfettered:18973639, Brave:18973639, Diligent:42121478,
 // Informed:42121478, Inspiring:53885134}, i.e. Inspiring/Brave = 2.84.
 // 54,273,639 for every type before the 2026-09-18 additive composition; still one number for all five.
 assert.deepEqual(ceiling.maxedPowerByType,
  {Unfettered:445498837,Brave:445498837,Diligent:445498837,Informed:445498837,Inspiring:445498837}); // 57,190,682 before the 2026-09-19 re-scale; 48,090,981 before step 4
 assert.equal(+(ceiling.maxedPowerByType.Inspiring/ceiling.maxedPowerByType.Brave).toFixed(2),1.00,
  'on identical records every type must now max at the same Power');
 assert.equal(new Set(Object.values(ceiling.maxedPowerByType)).size,1,'one number, not five');
});

// THE POINT OF THE WHOLE SLICE, in one ratio: is a maxed crossover Fellow an EQUIVALENT of a maxed
// original, or better than one? Both halves are bondedPower over the same finished flag-on state.
//
// *** RE-MEASURED AND CLOSED 2026-09-19 (owner decision: parity again once the Power scale settled). ***
// History: 0.987x (the crossover slice's own target), 0.523x when the originals' Stella tracks landed, 0.295x
// when their own-Power percent did, 0.621x on the additive composition, 0.577x after the four 2026-09-18 power
// sources -- every move on the ORIGINAL side. But those were measured on the ceiling state above, which maxes
// the RECORDS and not the six sinks an original gained on 2026-09-18 (talent skills, Rarity Advance, Pledge,
// Origin, Family Stella, quench). `fullyMaxed` buys every one of them. MEASURED THERE, BEFORE THE FIX: a maxed
// crossover 67,942,164 against a maxed Diligent original's 462,211,046 = 0.147x in default growth, and 0.18x
// or less in APK growth. The crossover cannot reach any of those sinks, so the ONE crossover-only track carries
// the difference: Angie's flat column x3 and her percent column x70, own Fellow only (lib/crossover-stella.mjs).
// A flat alone was tried first (x12): 0.987x default but 0.179x APK -- the originals' lead multiplies the level
// column and a flat does not. Her COST column is unchanged: the same pool, the same 4,500 shards per Fellow.
test('flag ON, fully maxed: a maxed crossover Fellow is ~1.0x a maxed original of the middle type, in both growth modes',()=>{
 const {fullyMaxed:m}=flagOn();
 assert.ok(m.valid,m.refusedBy);
 // Positive control: the sinks really were bought, or "fully maxed" is the records-only state again.
 assert.deepEqual(m.counts,{familyStella:146,advance:41,skills:1088,quench:244});
 // AND NO TYPE LEVER: one number for all five crossover types in this state too.
 assert.equal(new Set(Object.values(m.crossoverByType)).size,1,'one number, not five');
 assert.deepEqual(Object.keys(m.crossoverByType).sort(),['Brave','Diligent','Informed','Inspiring','Unfettered']);
 // Equivalent, not dominant, in BOTH modes: inside 5% of the middle type, below the two stronger types and the
 // strongest original.
 for(const [mode,r] of [['default',m],['APK',m.apk]]){
  assert.ok(Math.abs(r.crossover.max/r.originalByType.Diligent-1)<0.05,`${mode}: a maxed crossover must stand level with the middle type`);
  assert.ok(r.crossover.max<r.originalByType.Brave&&r.crossover.max<r.originalByType.Informed,`${mode}: and below the two stronger types`);
  assert.ok(r.crossover.max<r.original.max,`${mode}: no crossover Fellow may pass the strongest original`);
  const mid=Object.values(r.originalByType).sort((a,b)=>a-b)[2];
  assert.equal(mid,r.originalByType.Diligent,`${mode}: Diligent is the middle of the five type medians`);
 }
 assert.deepEqual(m.crossover,{min:455039462,median:455644890,max:456250319},'the 133 (66,731,308 / 67,336,736 / 67,942,164 before 2026-09-19)');
 assert.deepEqual(m.original,{min:113388150,q25:237131054,median:475295010,q75:1545935567,max:4454896209},'the 111, untouched');
 assert.deepEqual(m.originalByType,{Unfettered:323169140,Diligent:462211046,Brave:540528507,Inspiring:437939947,Informed:939480407});
 assert.equal(+(m.crossover.max/m.originalByType.Diligent).toFixed(3),0.987,'default growth vs the middle type (0.147 before)');
 assert.equal(+(m.crossover.max/m.original.median).toFixed(3),0.96,'vs the median original of any type (0.143 before)');
 assert.equal(+(m.crossover.max/m.original.max).toFixed(3),0.102,'vs the strongest original there is (0.015 before)');
 // APK growth, the parity mode (0.179 under the flat-only x12 that was tried first).
 assert.deepEqual(m.apk.crossover,{min:3986270890,median:3991492810,max:3996714730});
 assert.deepEqual(m.apk.originalByType,{Unfettered:2840544490,Diligent:3976182402,Brave:4725287747,Inspiring:3813449616,Informed:8202484721});
 assert.equal(+(m.apk.crossover.max/m.apk.originalByType.Diligent).toFixed(3),1.005,'APK growth vs the middle type');
 assert.equal(+(m.apk.crossover.max/m.apk.original.median).toFixed(3),0.975);
 assert.equal(+(m.apk.crossover.max/m.apk.original.max).toFixed(3),0.091);
 // The fully-maxed flag-on ceiling, pinned beside the records-only one above (80,007,548).
 assert.equal(m.ceiling,172968437,'rosterOperation, every Fellow and every sink maxed');
 assert.equal(m.crossoverWorth,60621355,'of which the 133 crossover Fellows');
});

// The records-only state, still pinned so a move on either side is loud. Here the ORIGINALS have not bought
// their 2026-09-18 sinks, so a crossover with its one track at the top stands above them -- which is why the
// parity claim is made on `fullyMaxed` above, not here.
test('flag ON, records only: the same comparison before the 2026-09-18 sinks are bought',()=>{
 const {ceiling}=flagOn();
 const x=ceiling.maxedCrossover,o=ceiling.maxedOriginal;
 assert.deepEqual(x,{min:444287980,median:444893408,max:445498837},'the 133, sorted (55,979,826 / 56,585,254 / 57,190,682 before 2026-09-19)');
 assert.deepEqual(o,{min:36505458,q25:68385912,median:135096948,q75:337005581,max:401355307},'the 111, sorted (step 4: HeroStar rows and every halo scope)');
 assert.deepEqual(ceiling.maxedOriginalByType,
  {Unfettered:83799636,Diligent:99087566,Brave:154860786,Inspiring:162515420,Informed:220198748});
 assert.equal(+(x.max/ceiling.maxedOriginalByType.Diligent).toFixed(3),4.496,'0.577 before 2026-09-19');
 assert.equal(+(x.max/o.max).toFixed(3),1.11,'0.142 before 2026-09-19');
});

// ---------------------------------------------------------------------------------------------
// The id-prefix sites. `app/` has no component tests (CLAUDE.md), so these three are guarded the way
// tests/fellow-power.test.mjs guards bondedPower: by reading the source. The extractor carries its own
// positive control, so a drifted pattern fails here rather than asserting nothing at all.
// ---------------------------------------------------------------------------------------------

test('nothing routes Family by an id prefix any more -- wardrobe, character art and trip children',()=>{
 const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
 const SITES=[
  ['lib/wardrobe.mjs','ownedActor','a crossover Family id was looked up in s.fellows'],
  ['app/character-artwork.tsx','FamilyArtStage','a crossover Family member lost the art stage on clip failure'],
  ['app/family-trip-panel.tsx','const name=','the raw xover_ id was shown as a trip child’s caretaker'],
 ];
 for(const [path,anchor,why] of SITES){
  const text=read(path);
  assert.ok(text.includes(anchor),`${path}: the anchor "${anchor}" is gone; this guard has drifted`);
  assert.ok(text.includes('familyById'),`${path} no longer resolves Family through familyById (${why})`);
  assert.doesNotMatch(text,/startsWith\('wife_'\)|replace\('wife_'/,`${path} still routes Family by prefix (${why})`);
 }
 // POSITIVE CONTROL for the pattern: the one place the `wife_` test is deliberately KEPT still trips
 // it. lib/family-scenes.mjs returns null for an addition on purpose -- a crossover render has no
 // baked setting, so app/globals.css's scene-fallback meadow is the correct backdrop for her
 // (docs/crossover-family-plan.md 3.1). If this stops matching, the sweep above proves nothing.
 assert.match(read('lib/family-scenes.mjs'),/startsWith\('wife_'\)/,'the prefix pattern no longer matches anything');
});
