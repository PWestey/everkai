import test from 'node:test';
import assert from 'node:assert/strict';
import {startingSave,newJourney,fresh,decode,valid} from '../lib/game.mjs';
import {originalProgression} from '../lib/original-progression.mjs';
import {ladderPower} from '../lib/adventure.mjs';
import {STAGES} from '../lib/stage-ladder.mjs';
import {legacyStart} from './progression-helpers.mjs';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';

// ONE MODE, pinned 2026-09-28.
//
// Everkai has two Power modes, and on 2026-09-28 that cost the owner two wrong answers in a row: a
// maxed Fellow measured in the retired mode reads 401,355,307 and the same Fellow in the mode every
// real save runs reads 2,629,729,283 -- 6.55x, reported as a parity gap before the mode was noticed.
//
// The retired mode was then measured properly and it is not a gentler scale, it is a broken ladder.
// Read in default, the three pinned day-30 saves clear bosses to chapter 4,816 / 6,000 / 6,000 against
// APK's 1,458 / 3,460 / 3,510 -- two of them finish the entire 6,000-chapter campaign on day 30 -- while
// earning about a fifth of the income the original's own HeroConversionRate gives.
//
// Removing the flag outright was attempted and reverted: 13 modules branch on it, and the two modes use
// different LEVEL-CAP ECONOMIES (default spends limit-break tokens; APK refuses `limitBreak` and sells
// quality tiers for crystals), so it is a progression migration, not a rescale. What this file does
// instead is pin the thing that actually matters -- that no player can reach the retired mode -- so the
// dead branches stay dead and can be cleaned up whenever it is cheap.
const NOW=1767225600000;

test('every save a player can actually get is in APK growth',()=>{
 assert.equal(originalProgression(startingSave(NOW)),true,'a new village');
 assert.equal(originalProgression(newJourney(startingSave(NOW),NOW)),true,'and Start over');
 // These two are the only ways app/page.tsx ever creates a save (`newJourney` for Start over,
 // `startingSave` inside it). If either stops running withOriginalProgression, default mode is
 // reachable again and every number measured against the original's tables is silently wrong.
});

test('fresh() is the pre-load placeholder, and is never what gets saved',()=>{
 // fresh() is deliberately NOT APK: it is React's initial state before the save loads, and
 // `startingSave` wraps it. Pinned so that if it ever becomes a persisted shape, this fails loudly.
 assert.equal(originalProgression(fresh(NOW)),false);
 assert.notEqual(JSON.stringify(fresh(NOW)),JSON.stringify(startingSave(NOW)),
  'if these converge, fresh() has become a real save shape and needs the APK keys');
});

test('a legacy default save still loads, and is still the retired mode',()=>{
 // Nothing migrates it today. It loads, it plays, and it is the ONE shape that can still be in the
 // retired mode -- which is why the branches are not deleted.
 const s=legacyStart(NOW);
 assert.equal(originalProgression(s),false);
 const back=decode(JSON.stringify(s));
 assert.ok(valid(back),'a legacy save must never be refused');
 assert.equal(originalProgression(back),false,'and it is NOT silently converted');
});

test('the retired mode is the one that breaks the stage ladder, not APK',()=>{
 // The measurement that settled which mode is correct, kept executable so it cannot rot.
 //
 // It has to be taken on a DEVELOPED roster. On a fresh village the relationship inverts -- APK's
 // aptitude bonus outweighs the adh ratio at level 1, so default reads LOWER -- which is exactly the
 // kind of thing that makes a one-point comparison worthless. These are the shipped day-30 saves.
 //
 // Rule 1: the atk side comes from the original's table, so the Power side must be in the original's
 // unit, which is APK. Default's inflated reading is `ladderPower`'s x100 adapter.
 const bosses=STAGES.filter(r=>r.boss);
 assert.ok(bosses.length>=6000,'the boss ladder must be loaded to measure this');
 const reach=P=>{const last=bosses.filter(b=>Number(b.atk)<P).pop();return last?last.chapter:0;};
 const files=['live-save-45828d3-day30.json.gz','live-save-4de2a38-day30.json.gz','power-save-3d47df4-day30.json.gz'];
 for(const f of files){
  const apk=decode(gunzipSync(readFileSync(new URL(f,import.meta.url))).toString('utf8'));
  assert.equal(originalProgression(apk),true,`${f} should be a real APK save`);
  const legacy={...apk};delete legacy.originalProgression;          // the same Fellows, retired mode
  const a=reach(ladderPower(apk)),d=reach(ladderPower(legacy));
  assert.ok(d>a,`${f}: the retired mode should reach FURTHER up the ladder (${d} vs ${a})`);
  assert.ok(a<6000,`${f}: APK should not already finish the 6,000-chapter campaign on day 30`);
 }
 // The headline: read in the retired mode, at least one day-30 save finishes the whole campaign.
 const finished=files.filter(f=>{
  const apk=decode(gunzipSync(readFileSync(new URL(f,import.meta.url))).toString('utf8'));
  const legacy={...apk};delete legacy.originalProgression;
  return reach(ladderPower(legacy))>=6000;});
 assert.ok(finished.length>=2,
  `${finished.length} of 3 day-30 saves clear the entire ladder in the retired mode; that is why it is retired`);
});
