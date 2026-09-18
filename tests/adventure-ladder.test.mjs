// The village campaign ladder, rebuilt from the original's own LevelNormal / BattleNormal / LevelBoss
// rows. Every assertion here compares Everkai's shipped ladder against the imported table, or against
// the two rules transcribed from the decompiled client -- never against a remembered number.
import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {STAGES,stageAt,stageCost,stageReady,stageBottles,ladderPower} from '../lib/adventure.mjs';
import {OPENING_STAGES,battleQuote} from '../lib/stage-ladder.mjs';
import {validFrontier} from '../lib/frontier.mjs';

test('the ladder is the original table row for row, at stage granularity',()=>{
 // Chapter.json gives every chapter levelNormal 1-5 plus one levelBoss, and each normal stage holds
 // four BattleNormal rows. 3,000 imported chapters x 6 stages = 18,000; 3,000 x 21 battles = 63,000.
 assert.equal(OPENING_STAGES.length,63000,'the imported battle rows');
 assert.equal(STAGES.length,18000,'six stages a chapter over 3,000 chapters');
 assert.equal(STAGES.filter(s=>s.boss).length,3000,'exactly one boss a chapter');
 assert.ok(STAGES.every(s=>s.boss===(s.id%6===0)),'the boss is the sixth stage of every chapter');
 assert.ok(STAGES.every(s=>s.chapter===Math.ceil(s.id/6)),'six stages a chapter, with no gaps');
 assert.ok(STAGES.every((s,i)=>s.id===i+1),'ids are 1..18,000 in ladder order');
 // Rebuild every stage straight from the battle rows and demand an exact match. This is the guard
 // that a future re-import cannot silently change the curve.
 const byStage=new Map();
 for(const b of OPENING_STAGES){const k=b._id.split('-').slice(0,2).join('-');if(!byStage.has(k))byStage.set(k,[]);byStage.get(k).push(b)}
 assert.equal(byStage.size,18000);
 for(const s of STAGES){
  const rows=byStage.get(`${s.chapter}-${s.section}`);
  assert.ok(rows,`no source rows for ${s.chapter}-${s.section}`);
  assert.equal(s.atk,Math.max(...rows.map(r=>r.atk)),`atk for ${s.chapter}-${s.section}`);
  const xp=rows.reduce((n,r)=>n+(r.boss?(r.items.find(i=>i.id==='1')?.count||0):r.item1),0);
  assert.equal(s.xp,xp,`Fellow EXP (item id 1) for ${s.chapter}-${s.section}`);
  const bottles=rows.reduce((n,r)=>n+(r.boss?(r.items.find(i=>i.id==='Item_Token_Gacha_Universal')?.count||0):0),0);
  assert.equal(s.bottles,bottles,`Fairy Bottles for ${s.chapter}-${s.section}`);
  assert.deepEqual(s.parts,rows.filter(r=>!r.boss).map(r=>[r.atk,r.consume[0].count]),`price parts for ${s.chapter}-${s.section}`);
 }
});

test('the curve actually goes somewhere -- the old one topped out at 7,401',()=>{
 assert.equal(STAGES[0].atk,1350,'chapter 1-1, the hardest of its four BattleNormal rows');
 assert.equal(STAGES[5].atk,3000,'chapter 1-6, the LevelBoss row');
 assert.equal(STAGES[29].atk,16850,'stage 30 -- where the whole previous ladder ENDED, at 7,401');
 assert.equal(STAGES[STAGES.length-1].atk,1191000000,'chapter 3,000 boss');
 assert.ok(STAGES[STAGES.length-1].atk/STAGES[29].atk>70000,'the rebuilt ladder runs four orders of magnitude past the old one');
 // MEASURED, not assumed: the boss curve never falls, but it is not strictly increasing either.
 // 119 of its 2,999 steps are flat, all of them past chapter ~2,690, where the table's four
 // significant figures round two neighbouring chapters to the same value (1,000,000,000 twice, then
 // 1,001,000,000 twice, and so on). No boss is ever easier than one before it.
 const bosses=STAGES.filter(s=>s.boss);
 assert.ok(bosses.every((b,i)=>i===0||b.atk>=bosses[i-1].atk),'no boss is easier than the one before it');
 assert.equal(bosses.filter((b,i)=>i>0&&b.atk===bosses[i-1].atk).length,119,'and the only flat steps are the table rounding ties');
 assert.equal(bosses.filter((b,i)=>i>0&&b.atk<bosses[i-1].atk).length,0,'the curve never falls');
 assert.ok(bosses.every((b,i)=>i<10||b.atk>bosses[i-10].atk),'and it always rises across a ten-chapter window');
});

test('a normal stage prices by the fourth root of enemy Power over yours (canNormalWin)',()=>{
 // SceneLevelNormalBattle.lua: loss = floor((atk/power)^0.25 * 10000); cost = floor(base * loss / 10000).
 // At power == atk the multiplier is exactly 1, so the stage charges its base price and nothing else.
 const [atk,base]=STAGES[0].parts[0];
 assert.equal(atk,1080);assert.equal(base,162);
 assert.equal(battleQuote(atk,base,atk),base,'at parity the price IS the table base');
 assert.ok(battleQuote(atk,base,atk*16)*2===base||battleQuote(atk,base,atk*16)===Math.floor(base/2),'16x Power halves the price (fourth root of 16 = 2)');
 assert.equal(battleQuote(atk,base,atk*16),Math.floor(base/2));
 assert.equal(battleQuote(atk,base,Math.floor(atk/16)),base*2,'a 16x Power deficit doubles it');
 // NEGATIVE CONTROL: the price must actually MOVE with Power, in the right direction.
 let prev=Infinity;for(const p of [100,1000,10000,100000,1000000]){const q=battleQuote(atk,base,p);assert.ok(q<prev,`price did not fall from ${prev} at power ${p}`);prev=q}
 // And a stage's price is the SUM of its four battles' own quotes, not one quote at the max atk.
 const s=STAGES[0],power=50000;
 assert.equal(stageCost(s,power),s.parts.reduce((n,[a,b])=>n+battleQuote(a,b,power),0));
 assert.notEqual(stageCost(s,power),battleQuote(s.atk,s.parts.reduce((n,[,b])=>n+b,0),power),'quoting once at the max atk would overcharge');
});

test('a boss is a hard, strictly-greater Power gate that a rich party cannot buy past (canWinLevelBoss)',()=>{
 const boss=STAGES[5];assert.equal(boss.atk,3000);
 // canWinLevelBoss returns `bossConf.atk < hero_power` -- strictly greater, so equal Power LOSES.
 assert.equal(stageReady(boss,2999,Infinity),false);
 assert.equal(stageReady(boss,3000,Infinity),false,'equal Power is a loss: the rule is strictly greater');
 assert.equal(stageReady(boss,3001,0),true,'and a boss costs nothing to attempt, so no gold is needed');
 // NEGATIVE CONTROL, and the thing the owner actually asked for: a party below a stage's Power cannot
 // clear it, no matter how much gold it brings. Unlimited gold does not buy a boss.
 let s={...fresh(0),gold:1e9,adventure:{...fresh(0).adventure,cleared:5}};
 assert.ok(ladderPower(s)>boss.atk,'a fresh roster does beat chapter 1s boss -- so use a later one for the wall');
 const wall=STAGES.filter(x=>x.boss&&x.atk>ladderPower(s))[0];
 assert.ok(wall,'some boss out-powers a fresh roster');
 const at={...s,adventure:{...s.adventure,cleared:wall.id-1}};
 const refused=act(at,'battle',0,wall.id);
 assert.ok(refused.error,'a boss above roster Power is refused');
 assert.match(refused.error,/strictly above/);
 assert.equal(refused.state.gold,1e9,'and refusing spent nothing');
 assert.equal(refused.state.adventure.cleared,wall.id-1,'and advanced nothing');
 assert.equal(refused.state.adventure.lastBattle.won,false);
});

test('rewards are the table, and the invented faucets are gone',()=>{
 const start={...fresh(0),gold:1e9};
 let s=start;
 for(let i=1;i<=6;i++){const r=act(s,'battle',0,i);assert.equal(r.error,undefined,r.error);s=r.state}
 const walked=STAGES.slice(0,6);
 assert.equal(s.fellowXP,start.fellowXP+walked.reduce((n,x)=>n+x.xp,0),'Fellow EXP is the sum of the stages own item1');
 assert.equal(s.crystals,0,'no diamonds: item id 4 appears in no row of the ladder');
 assert.equal(s.inventory.Item_Talent_Hero_1,0,'the per-stage Skill Pearl was invented');
 assert.equal(s.inventory.local_skill_scroll,0,'the every-third-stage Skill Scroll was invented');
 assert.equal(s.inventory.local_limit_token,0,'the every-fifth-stage Limit-Break Token was invented');
 assert.ok(s.gold<start.gold,'a stage is a sink: it never pays back more gold than it took');
 assert.equal(s.fountain.bottles,1,'one Fairy Bottle, from the single boss among the six');
 assert.equal(walked.filter(x=>x.bottles).length,1);
 assert.equal(stageBottles(STAGES[0]),0);assert.equal(stageBottles(STAGES[5]),1);
 assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});

test('MIGRATION: an old save keeps its exact progress, gains no free clears, and its Frontier still loads',()=>{
 // The previous ladder was 30 stages with `chapter: ceil(n/6)` and `boss: n%6===0`. That IS the
 // original's cadence -- Chapter.json gives every chapter 5 normal stages and one boss -- so old stage
 // N and new stage N are the same position on the same ladder and the migration is an identity.
 // There is no renumbering, which is exactly why nothing can be lost or handed out here.
 for(let n=1;n<=30;n++){
  const s=stageAt(n);
  assert.equal(s.chapter,Math.ceil(n/6),`old chapter formula still names stage ${n}s chapter`);
  assert.equal(s.boss,n%6===0,`old boss formula still names stage ${n}s boss flag`);
 }
 // A save written by the previous build, mid-ladder, at every boundary the old ladder had.
 for(const cleared of [0,1,5,6,15,29,30]){
  const base=fresh(0);
  const old={...base,gold:5000,adventure:{...base.adventure,cleared,patrols:3,lastBattle:{stage:Math.max(1,cleared),power:1234,won:true,kind:'battle'}}};
  const loaded=decode(JSON.stringify(old));
  assert.equal(loaded.adventure.cleared,cleared,`stage ${cleared} must survive the load unchanged`);
  assert.equal(loaded.adventure.patrols,3);
  // No free clears: the very next stage still has to be fought, and the one after it is still refused.
  if(cleared<30){
   assert.ok(act(loaded,'battle',0,cleared+2).error,'the ladder still cannot be skipped');
   const next=stageAt(cleared+1);
   assert.ok(next,'the next stage exists');
  }
  // And no progress is lost: a stage the player already cleared cannot be re-cleared for its loot.
  if(cleared>0)assert.ok(act(loaded,'battle',0,cleared).error,'a cleared stage stays cleared');
 }
 // Rule 12, the derived gate. A save at exactly 30 with a Frontier used to be the ONLY valid shape,
 // because validFrontier read `s.adventure.cleared!==30`. The ladder is now 18,000 long, so a player
 // who walks past 30 would have had a perfectly good save refused. Both must load.
 const base=fresh(0);
 const withFrontier=c=>({...base,adventure:{...base.adventure,cleared:c},frontier:{policyVersion:1,cleared:0,attempts:0,active:null}});
 assert.equal(validFrontier(withFrontier(30)),true,'the old exactly-30 save still loads');
 assert.equal(validFrontier(withFrontier(31)),true,'and so does one that walked past 30 -- this is the rule-12 regression');
 assert.equal(validFrontier(withFrontier(500)),true);
 // NEGATIVE CONTROL for that widening: it must still REFUSE a Frontier below the gate.
 assert.equal(validFrontier(withFrontier(29)),false,'a Frontier below 30 stages is still an illegal save');
 assert.throws(()=>decode(JSON.stringify(withFrontier(29))));
});

test('save bounds widened, and still bound',()=>{
 const base=fresh(0);
 const at=c=>({...base,adventure:{...base.adventure,cleared:c}});
 assert.ok(valid(at(18000)),'the top of the ladder is a legal save');
 assert.ok(!valid(at(18001)),'one past the end is not');
 assert.throws(()=>decode(JSON.stringify(at(18001))));
 assert.ok(!valid(at(-1)));
 const battle=p=>({...base,adventure:{...base.adventure,cleared:1,lastBattle:{stage:1,power:p,won:true,kind:'battle'}}});
 assert.ok(valid(battle(1e15)),'roster Power past 1e12 is legal -- the Stella/Spirit import will reach it');
 assert.ok(!valid(battle(1e19)));
});
