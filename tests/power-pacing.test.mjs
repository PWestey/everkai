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
