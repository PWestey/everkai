import test from 'node:test';import assert from 'node:assert/strict';
import maturity from '../lib/system-maturity.json' with {type:'json'};
import layout from '../lib/drakenberg-layout.json' with {type:'json'};

const ids=layout.facilities.map(f=>f.id);

test('every Drakenberg facility carries a maturity label',()=>{
 // A new facility must not reach the town unlabelled: an unlabelled plate reads as finished.
 assert.deepEqual(Object.keys(maturity.facilities).sort(),[...ids].sort());
});

test('labels use the declared statuses and stay short enough to render on a plate',()=>{
 const allowed=Object.keys(maturity.statuses);
 assert.deepEqual(allowed,['ready','limited','early']);
 for(const [id,row] of Object.entries(maturity.facilities)){
  assert.ok(allowed.includes(row.status),`${id} has status ${row.status}`);
  assert.ok(row.note.trim().length>0,id+' has an empty note');
  assert.ok(row.note.length<=64,`${id} note is ${row.note.length} chars, too long for a plate`);
  assert.ok(!/\.$/.test(row.note),id+' note should not end in a full stop');
 }
});

test('every status is actually used, so the scale means something',()=>{
 const used=new Set(Object.values(maturity.facilities).map(r=>r.status));
 for(const status of Object.keys(maturity.statuses))assert.ok(used.has(status),status+' is declared but unused');
});

test('the systems finished this cycle are the ones marked ready',()=>{
 // Habits is the game's premise and Recruit was completed with its own facility, pricing and tests.
 assert.equal(maturity.facilities.habits.status,'ready');
 assert.equal(maturity.facilities.recruit.status,'ready');
 // Anything still counted in "N of M" terms must not claim to be ready.
 for(const [id,row] of Object.entries(maturity.facilities))
  if(/\bof\s+\d/.test(row.note))assert.notEqual(row.status,'ready',id+' advertises missing content but claims ready');
});
