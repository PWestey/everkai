import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';import {execFileSync} from 'node:child_process';
import {decode,valid,refusedBy,lastQuarantine} from '../lib/game.mjs';
import {PEARL_APTITUDE_CAP} from '../lib/aptitude-cap.mjs';

// CLAUDE.md RULE 12, against the build players actually run. `main`@45828d3 is the pushed, live build:
// its sim (scratchpad sim/sim-v2.mjs 30 apk earned) wrote this save -- 30 days of APK-growth habit play,
// crossover on by default. This build changes three things a save could trip on: Fellow Power's
// composition (derived, never stored as a truth), direct Skill Pearl training stopping at 1,000 (a planner
// limit), and the stage ladder growing to 6,000 chapters with 3,001-6,000 loaded lazily in the browser.
const raw=gunzipSync(readFileSync(new URL('./live-save-45828d3-day30.json.gz',import.meta.url))).toString('utf8');

test('RULE 12: a 30-day save from the live build (main@45828d3) decodes byte-identically and loads',()=>{
 const s=JSON.parse(raw);
 // Positive controls: the fixture carries what this test claims to protect.
 assert.equal(Object.values(s.fellows).filter(f=>f.level>1).length>=20,true,'trained Fellows');
 assert.ok(s.mineClearance.history.length>0&&s.tradingPost.history.length>0,'Power-derived receipts');
 const pearls=Math.max(...Object.values(s.fellows).map(f=>f.aptitudeLedger?.entries?.['item:Item_Talent_Hero_1']?.gain||0));
 assert.ok(pearls>0&&pearls<=PEARL_APTITUDE_CAP,`the live build's pearl training (max ${pearls}) never exceeded 1,000, so the pearl cap cannot bite`);
 const back=decode(raw);
 assert.equal(JSON.stringify(back),raw,'byte-identical round trip');
 assert.deepEqual(lastQuarantine,[],'nothing quarantined');
 assert.ok(valid(back),refusedBy(back));
});

test('RULE 12: the same save on a browser boot, before the late chapters load',()=>{
 const out=execFileSync(process.execPath,['--input-type=module','-e',`
  import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
  const G=await import('./lib/game.mjs'),L=await import('./lib/stage-ladder.mjs');
  const raw=gunzipSync(readFileSync('./tests/live-save-45828d3-day30.json.gz')).toString('utf8');
  const back=G.decode(raw);
  console.log(JSON.stringify({lazy:!L.lateChaptersLoaded(),identical:JSON.stringify(back)===raw,valid:G.valid(back),quarantined:G.lastQuarantine}));`],
  {cwd:new URL('..',import.meta.url),env:{...process.env,EVERKAI_LAZY_CHAPTERS:'1'},encoding:'utf8'});
 assert.deepEqual(JSON.parse(out.trim().split('\n').at(-1)),{lazy:true,identical:true,valid:true,quarantined:[]});
});
