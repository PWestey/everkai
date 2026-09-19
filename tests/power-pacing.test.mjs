import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';import {gunzipSync} from 'node:zlib';
import {decode,valid,refusedBy,lastQuarantine,effectiveRate} from '../lib/game.mjs';
import {bondedPower} from '../lib/adventure.mjs';
import {validMine} from '../lib/mine-clearance.mjs';
import {validTradingPost} from '../lib/trading-post.mjs';

// Fellow Power moved to the original's composition on 2026-09-18 (lib/adventure.mjs powerParts;
// docs/power-parity-audit.md 9). Power is DERIVED -- no save stores it as a truth -- so it may move. This
// file holds the two things that must not move with it.
const load=f=>gunzipSync(readFileSync(new URL('./'+f,import.meta.url))).toString('utf8');
const powers=s=>Object.keys(s.fellows).map(id=>bondedPower(s,id));

// ---------------------------------------------------------------------------------------------------
// CLAUDE.md RULE 12. A save written by the PREVIOUS build (3d47df4, the crossover merge before this change):
// 30 simulated days of APK-growth habit play (scratchpad sim-pins.mjs, `earned` policy, which also spends
// Stella shards). It holds 28 trained Fellows up to level 515, 491 paid Stella ranks, 29 Mine Clearance
// receipts and 446 Trading Post runs -- every ledger that stores a value measured from Fellow Power.
// ---------------------------------------------------------------------------------------------------
test('RULE 12: a 30-day save from the previous build decodes byte-identically and loads',()=>{
 const raw=load('power-save-3d47df4-day30.json.gz');
 const s=JSON.parse(raw);
 // Positive control: the fixture really carries what this test claims to protect.
 const f=Object.values(s.fellows);
 assert.equal(f.filter(x=>x.level>1).length,28,'trained Fellows');
 assert.equal(s.stella.history.filter(r=>r.level>0).length,491,'paid Stella ranks');
 assert.equal(s.mineClearance.history.length,29,'mine receipts');
 assert.equal(s.tradingPost.history.length,446,'trading-post receipts');
 const back=decode(raw);
 assert.equal(JSON.stringify(back),raw,'byte-identical round trip');
 assert.deepEqual(lastQuarantine,[],'nothing quarantined');
 assert.ok(valid(back),refusedBy(back));
});

test('RULE 12: the stored Power in those receipts is checked as STORED, never recomputed',()=>{
 const s=JSON.parse(load('power-save-3d47df4-day30.json.gz'));
 // The Power the previous build measured, against what this build derives for the same Fellow today.
 const r=s.mineClearance.history.at(-1);
 // 234,476,657 before the 2026-09-18 talent skills (level-1 skills + star skills + Stella talent halo);
 // 255,301,823 before the account floor (fish at their original scope, relic flats); 257,056,838 before the
 // Stella-unlocked blessing pairs.
 assert.deepEqual([r.owner,r.power,bondedPower(s,r.owner)],['hero_195',350926067,257057838]);
 const t=s.tradingPost.history.at(-1).team[0];
 assert.deepEqual([t.id,t.power,bondedPower(s,t.id)],['hero_122',74575030,57744962]);
 assert.equal(validMine(s),true);assert.equal(validTradingPost(s),true);
 // NEGATIVE CONTROL: the validators still bite. A receipt whose `after` overshoots its own stored power,
 // and a duel whose `won` contradicts its own stored power, are refused.
 const mine={...s,mineClearance:{...s.mineClearance,history:s.mineClearance.history.map((x,i,a)=>i===a.length-1?{...x,after:x.after+1}:x)}};
 assert.equal(validMine(mine),false);
 const h=s.tradingPost.history,last=h.at(-1);
 const trade={...s,tradingPost:{...s.tradingPost,history:[...h.slice(0,-1),{...last,team:[{...last.team[0],won:!last.team[0].won},...last.team.slice(1)]}]}};
 assert.equal(validTradingPost(trade),false);
});

// ---------------------------------------------------------------------------------------------------
// PACING PINS. Each fixture is 30 / 90 / 180 simulated days of normal habit play (scratchpad
// sim/sim-pins-pearl.mjs: APK growth, `earned` policy -- only costed, gated or time-recovering actions --
// spending Stella shards, training Aptitude with pearls up to the build's PEARL_APTITUDE_CAP and every
// other source up to APTITUDE_CAP), written by THIS build. Every number is exact, so any move is loud.
// Two references sit beside each pin, both the same policy:
//   uncapped -- 3854d3a, the Power rebuild with direct pearl training allowed to 31,122;
//   before   -- 3d47df4, the build before the Power rebuild (Aptitude cap 1,000 everywhere).
//
// What the pins say, read plainly (owner-delegated balancing, 2026-09-18, docs/power-parity-audit.md 9.10):
// capping direct Skill Pearl training at the old 1,000 takes the strongest Fellow from 2.1-3.9 billion
// (uncapped) back to 231-260 million, 0.57-0.63x the pre-rebuild build's (the additive composition is
// lower) and 0.07-0.11x the uncapped one's. Village gold/s is 0.58-0.78x the pre-rebuild build's and
// 0.47-0.81x the uncapped one's: the gold that bought pearls to 31,122 now buys recruits (25-30 Fellows
// against 16-17 uncapped). The day-30/90/180 figures equal, to the unit, the "composition only" run in
// 9.6, which held the sim's Aptitude policy at 1,000 -- the cap does exactly that and nothing else.
// ---------------------------------------------------------------------------------------------------
// POWER SOURCES (docs/power-sources-import-spec.md), step by step. The three fixtures below are still the saves
// c5b4477's sim wrote; `now` is what THIS build derives from them (Power is derived, so it moves with every
// source even on an unchanged save), and `c5b4477` is what that build derived from the same bytes -- the
// before of the power-sources work. The saves are re-simulated with this build's sources once they all land.
//   step 1, Skill Aptitude: every original's level-1 talent skills, star skills, Stella-unlocked skills and
//   the Stella self/bond talent halos. No saved Fellow had bought a talent-skill level, so this is the FREE part.
//   step 2, account floor: fish skills read at their original scope (+ Gold Crown at level 1 for Gold-band
//   catches), relic flats, scoped relic talent. Day 30 bottom 9,053,181 -> 9,426,818.
//   step 3, Family Stella + quenching: nobody in these saves holds either, so only the Stella-unlocked
//   blessing pairs move them (day 30 top 252,405,961 -> 252,408,561).
const PINS=[
 {day:30, file:'power-pacing-day30.json.gz', now:{goldPerSecond:2409265817,top:252408561,bottom:9426818,fellows:25},
  c5b4477:{goldPerSecond:2311764907,top:230796106,bottom:9050034,fellows:25},
  uncapped:{goldPerSecond:4923957499,top:2146877316,bottom:16210487,fellows:16},
  before:{goldPerSecond:3965436060,top:364195900,bottom:9519535,fellows:28}},
 {day:90, file:'power-pacing-day90.json.gz', now:{goldPerSecond:6073904802,top:378011467,bottom:27181682,fellows:30},
  c5b4477:{goldPerSecond:5404947644,top:257649411,bottom:26800807,fellows:30},
  uncapped:{goldPerSecond:6637997008,top:3701223720,bottom:17275670,fellows:17},
  before:{goldPerSecond:6913806855,top:443154590,bottom:20058869,fellows:31}},
 {day:180,file:'power-pacing-day180.json.gz',now:{goldPerSecond:6896786705,top:378650501,bottom:27342290,fellows:30},
  c5b4477:{goldPerSecond:6186448810,top:260261323,bottom:27183227,fellows:30},
  uncapped:{goldPerSecond:9285714088,top:3909900285,bottom:17618893,fellows:17},
  before:{goldPerSecond:8248950146,top:460219606,bottom:20331834,fellows:31}},
];
for(const p of PINS)test(`pacing, day ${p.day}: gold/s ${p.now.goldPerSecond.toLocaleString('en-US')}, top ${p.now.top.toLocaleString('en-US')}, bottom ${p.now.bottom.toLocaleString('en-US')}`,()=>{
 const raw=load(p.file),s=decode(raw);
 assert.equal(JSON.stringify(s),raw,'the fixture is a save this build wrote and reads back untouched');
 assert.ok(valid(s),refusedBy(s));
 const all=powers(s);
 const now={goldPerSecond:Math.round(effectiveRate(s,s.lastAt)),top:Math.max(...all),bottom:Math.min(...all),fellows:all.length};
 // A runaway is anything outside these bands against the pre-rebuild build's (3d47df4) own run. They are wide on
 // purpose: a re-balance may move a pin, but a factor of 3 on income or 20 on the top Fellow is a defect.
 const r=k=>now[k]/p.before[k];
 assert.ok(r('goldPerSecond')>0.5&&r('goldPerSecond')<2,`day ${p.day}: gold/s is ${r('goldPerSecond').toFixed(2)}x 3d47df4`);
 assert.ok(r('top')<20,`day ${p.day}: the top Fellow is ${r('top').toFixed(1)}x 3d47df4`);
 assert.ok(r('bottom')>0.25&&r('bottom')<4,`day ${p.day}: the bottom Fellow is ${r('bottom').toFixed(2)}x 3d47df4`);
 // The pearl cap's guard at RE-PIN time: fixtures are written by the sim, so a regenerated fixture whose top
 // Fellow is back near the uncapped figure means direct pearl training passed 1,000 again.
 assert.ok(now.top<p.uncapped.top/4,`day ${p.day}: the top Fellow is ${(now.top/p.uncapped.top).toFixed(2)}x the uncapped build -- is direct pearl training past 1,000 again?`);
 assert.deepEqual(now,p.now);
});
