import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';import {FELLOWS,FAMILY} from '../lib/catalog.mjs';import {WISH_RECRUITS,fountainState} from '../lib/fountain.mjs';import {createPersistence} from '../lib/persistence.mjs';
const result=(s,id)=>act(s,'wishRecruit',s.lastAt,id,{seq:fountainState(s).seq});
const fixture=stones=>{let s=act(fresh(1000),'wishSupply',1000,null,{seq:0}).state;s.fountain.ledger.Lottery_4=stones;return s;};
test('all16 referenced targets charge their exact community cost and join correct owned category',()=>{
 assert.equal(WISH_RECRUITS.length,15);assert.equal(WISH_RECRUITS.filter(r=>r.kind==='fellows').length,8);assert.equal(WISH_RECRUITS.filter(r=>r.cost===1).length,4);
 for(const p of WISH_RECRUITS){const roster=p.kind==='fellows'?FELLOWS:FAMILY;assert.equal(roster.find(x=>x.id===p.id).name,p.name);let s=fixture(p.cost-1);assert.ok(result(s,p.id).error);assert.equal(s[p.kind][p.id],undefined);s=fixture(p.cost);const r=result(s,p.id);assert.equal(r.error,undefined);assert.ok(valid(r.state));assert.equal(r.state.fountain.ledger.Lottery_4,0);assert.equal(r.state.fountain.recruited[0].paid,p.cost);assert.ok(r.state[p.kind][p.id]);assert.deepEqual(decode(JSON.stringify(r.state)),r.state);}
 assert.ok(WISH_RECRUITS.some(r=>r.id==='hero_104'&&r.name==='Loya'));assert.ok(!WISH_RECRUITS.some(r=>r.id==='wife_188'));assert.ok(result(fixture(100),'wife_188').error);
});
test('old three receipts and trained owners remain unchanged while welcoming remaining13',()=>{
 let s=fixture(26);for(const id of ['hero_102','wife_103','wife_104'])s=result(s,id).state;s.fountain.recruited[0].paid=3;const receipts=structuredClone(s.fountain.recruited);s.fellows.hero_102.level=5;s.family.wife_103.intimacy=12;const fellow=structuredClone(s.fellows.hero_102),family=structuredClone(s.family.wife_103);
 for(const p of WISH_RECRUITS.filter(p=>!receipts.some(r=>r.character===p.id))){const r=result(s,p.id);assert.equal(r.error,undefined);s=r.state;}
 assert.equal(s.fountain.ledger.Lottery_4,0);assert.equal(s.fountain.recruited.length,15);assert.deepEqual(s.fountain.recruited.slice(0,3),receipts);assert.deepEqual(s.fellows.hero_102,fellow);assert.deepEqual(s.family.wife_103,family);assert.ok(valid(decode(JSON.stringify(s))));for(const p of WISH_RECRUITS)assert.ok(result(s,p.id).error);
});
test('failed new Fellow/Family recruitment writes keep Stones and permit one explicit retry',()=>{
 for(const id of ['hero_54','wife_52']){let raw=JSON.stringify(fixture(1)),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);const row=WISH_RECRUITS.find(r=>r.id===id),before=structuredClone(p.current.fountain);fail=true;assert.throws(()=>p.commit(result(p.current,id).state));assert.deepEqual(p.current.fountain,before);assert.equal(p.current[row.kind][id],undefined);fail=false;p.load(1000);p.commit(result(p.current,id).state);assert.ok(p.current[row.kind][id]);assert.equal(p.current.fountain.ledger.Lottery_4,0);assert.ok(result(p.current,id).error);assert.deepEqual(decode(raw).fountain,p.current.fountain);}
});
