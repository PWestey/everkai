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
 assert.deepEqual([r.owner,r.power,bondedPower(s,r.owner)],['hero_195',350926067,234476657]);
 const t=s.tradingPost.history.at(-1).team[0];
 assert.deepEqual([t.id,t.power,bondedPower(s,t.id)],['hero_122',74575030,57557802]);
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
// PACING PINS -- the owner's call: keep the appointment-yield column faithful and guard with pacing, not a
// cap. Each fixture is 30 / 90 / 180 simulated days of normal habit play (scratchpad sim/sim-pins-cap.mjs:
// APK growth, `earned` policy -- only costed, gated or time-recovering actions -- spending Stella shards and
// training Aptitude up to the build's own cap), written by THIS build. `before` is the same policy run
// on the previous build (3d47df4), where the cap was 1,000. Every number is exact, so any move is loud;
// the ratio bands underneath say which moves count as a runaway rather than a re-baseline.
//
// What the pins say, read plainly: village gold/s stays within 0.96x-1.24x of the old build at every
// checkpoint. The strongest Fellow is 5.9x-8.5x the old one, because the Aptitude cap is now the original's
// 31,122 and direct Skill Pearl training reaches it by day 30 -- that is the lever to watch (owner decision
// 6 in docs/power-parity-audit.md 9.8). The weakest Fellow stays within 0.86x-1.70x. The roster is SMALLER (16-17
// Fellows against 28-31): the gold went into pearls instead of recruits.
// ---------------------------------------------------------------------------------------------------
const PINS=[
 {day:30, file:'power-pacing-day30.json.gz', now:{goldPerSecond:4923957499,top:2146877316,bottom:16210487,fellows:16},
  before:{goldPerSecond:3965436060,top:364195900,bottom:9519535,fellows:28}},
 {day:90, file:'power-pacing-day90.json.gz', now:{goldPerSecond:6637997008,top:3701223720,bottom:17275670,fellows:17},
  before:{goldPerSecond:6913806855,top:443154590,bottom:20058869,fellows:31}},
 {day:180,file:'power-pacing-day180.json.gz',now:{goldPerSecond:9285714088,top:3909900285,bottom:17618893,fellows:17},
  before:{goldPerSecond:8248950146,top:460219606,bottom:20331834,fellows:31}},
];
for(const p of PINS)test(`pacing, day ${p.day}: gold/s ${p.now.goldPerSecond.toLocaleString('en-US')}, top ${p.now.top.toLocaleString('en-US')}, bottom ${p.now.bottom.toLocaleString('en-US')}`,()=>{
 const raw=load(p.file),s=decode(raw);
 assert.equal(JSON.stringify(s),raw,'the fixture is a save this build wrote and reads back untouched');
 assert.ok(valid(s),refusedBy(s));
 const all=powers(s);
 const now={goldPerSecond:Math.round(effectiveRate(s,s.lastAt)),top:Math.max(...all),bottom:Math.min(...all),fellows:all.length};
 // A runaway is anything outside these bands against the previous build's own run. They are wide on
 // purpose: a re-balance may move a pin, but a factor of 3 on income or 20 on the top Fellow is a defect.
 const r=k=>now[k]/p.before[k];
 assert.ok(r('goldPerSecond')>0.5&&r('goldPerSecond')<2,`day ${p.day}: gold/s is ${r('goldPerSecond').toFixed(2)}x the previous build`);
 assert.ok(r('top')<20,`day ${p.day}: the top Fellow is ${r('top').toFixed(1)}x the previous build`);
 assert.ok(r('bottom')>0.25&&r('bottom')<4,`day ${p.day}: the bottom Fellow is ${r('bottom').toFixed(2)}x the previous build`);
 assert.deepEqual(now,p.now);
});
