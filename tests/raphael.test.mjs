import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';
import {freshStage,stageScore,stageTargets,RAPHAEL_ITEMS} from '../lib/raphael.mjs';
const fan={kind:'fan',id:'1',level:1},run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
test('stage scoring uses documented directional additions and base-only item multipliers',()=>{
 const cells=freshStage().cells;assert.equal(stageScore(cells).total,1);
 cells[12]=fan;assert.equal(stageScore(cells).total,74);
 cells[13]=fan;assert.equal(stageScore(cells).total,178);
 cells[11]={kind:'item',id:'5',level:1};assert.equal(stageScore(cells).total,397);
 assert.deepEqual(stageTargets(0,'1'),[]);assert.deepEqual(stageTargets(12,'6'),[10,11,13,14]);assert.deepEqual(stageTargets(0,'4'),[1,6,11,16,21]);
});
test('placement, levels, swaps and performances persist without village rewards',()=>{
 let s=fresh(1000);s=run(s,'stagePlace',12,fan).state;s=run(s,'stageLevel',12,1).state;s=run(s,'stageMove',12,0).state;
 assert.equal(s.raphael.cells[0].level,2);assert.equal(s.raphael.cells[12],null);
 const before=structuredClone(s);s=run(s,'stagePerform').state;assert.equal(s.raphael.best,79);assert.equal(s.raphael.performances,1);assert.equal(s.gold,before.gold);assert.deepEqual(s.inventory,before.inventory);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('duplicate items, fifth items, bad IDs and corrupt saves are rejected',()=>{
 let s=fresh(1000);assert.ok(run(s,'stagePerform').error);
 for(let i=0;i<4;i++)s=run(s,'stagePlace',i,{kind:'item',id:RAPHAEL_ITEMS[i].id,level:1}).state;
 assert.ok(run(s,'stagePlace',4,{kind:'item',id:RAPHAEL_ITEMS[4].id,level:1}).error);assert.ok(run(s,'stagePlace',4,{kind:'item',id:RAPHAEL_ITEMS[0].id,level:1}).error);
 assert.ok(run(s,'stagePlace',4,{kind:'fan',id:'bad',level:1}).error);
 s.raphael.cells[0].level=999;assert.throws(()=>decode(JSON.stringify(s)));
});
