import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {OPENING_STAGES,CAMPAIGN,LAST_CHAPTER,OPENING} from '../lib/opening.mjs';
import {openingChapterName} from '../lib/opening-presentation.mjs';

test('the stage ladder runs chapters 1-50: 1,050 stages, 21 a chapter, stageIds without gaps',()=>{
 assert.equal(LAST_CHAPTER,50);
 assert.equal(OPENING_STAGES.length,50*21,'126 opening stages + 924 imported');
 assert.deepEqual(OPENING_STAGES.map(s=>s.stageId),Array.from({length:1050},(_,i)=>i+1));
 for(let c=1;c<=50;c++){const rows=OPENING_STAGES.filter(s=>Number(s._id.split('-')[0])===c);
  assert.equal(rows.length,21,'chapter '+c);assert.equal(rows.filter(s=>s.boss).length,1);assert.equal(rows.at(-1)._id,c+'-6-0');}});

test('imported rows are the original values, continuing the opening curve',()=>{
 const at=id=>OPENING_STAGES.find(s=>s._id===id);
 // Measured from BattleNormal/LevelBoss: chapter 6 boss 23,100; chapter 7's first stage is 10,000 and its boss is
 // 27,850; chapter 20's boss is 254,250, the neighbour of Mine Clearance's first guardian (225,000).
 assert.equal(at('6-6-0').atk,23_100);assert.equal(at('7-1-1').atk,10_000);assert.equal(at('7-6-0').atk,27_850);assert.equal(at('20-6-0').atk,254_250);
 const items=new Set(OPENING.items.map(i=>i._id));
 for(const b of CAMPAIGN.bosses)for(const i of b.items)assert.ok(items.has(i.id),`${b._id} rewards ${i.id}, which has no item definition`);
 assert.ok(CAMPAIGN.battles.every(b=>!b.stageEventId),'imported stages carry no roadside events (deferred; see the import script)');});

test('clearing chapter 6 opens chapter 7, and a save past stage 126 is valid',()=>{
 let s=act(fresh(0),'openingStart',0).state;
 s.opening.cleared=125;s.fellows.hero_15.aptitude=1000;s.gold=1e9;
 let r=act(s,'openingBattle',0,'6-6-0');assert.equal(r.error,undefined,r.error);s=r.state;
 assert.equal(OPENING_STAGES[s.opening.cleared]._id,'7-1-1');
 r=act(s,'openingBattle',0,'7-1-1');assert.equal(r.error,undefined,r.error);s=r.state;
 assert.equal(s.opening.cleared,127);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
 assert.equal(openingChapterName(7),'Chapter 7');
 s.opening.cleared=OPENING_STAGES.length+1;assert.equal(valid(s),false,'cannot clear past the last stage');});
