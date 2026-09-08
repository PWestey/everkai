import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,decode} from '../lib/game.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
test('auto-date matches repeated dates and preserves fractional Energy',()=>{
 let s=run(fresh(1000),'welcome','wife_2').state;s=run(s,'welcome','wife_3').state;s.energy=2.5;
 let manual=run(s,'date',null,0).state;manual=run(manual,'date',null,.99).state;
 const batch=run(s,'autoDate',null,[0,.99]);assert.deepEqual(batch.state,manual);assert.equal(batch.state.energy,.5);assert.deepEqual(decode(JSON.stringify(batch.state)),batch.state);assert.equal(s.energy,2.5);
});
test('auto-date validates the whole batch before spending Energy and reports capped gains',()=>{
 let s=run(fresh(1000),'welcome','wife_2').state;assert.ok(run(s,'autoDate',null,[0,0,1]).error);assert.equal(s.energy,3);
 s.family.wife_2.points=1e9;const r=run(s,'autoDate',null,[0,0,0]);assert.match(r.message,/\+0 Blessing Points/);assert.equal(r.state.stats.dates,3);assert.equal(r.state.family.wife_2.points,1e9);
 assert.ok(run(r.state,'autoDate').error);
});
