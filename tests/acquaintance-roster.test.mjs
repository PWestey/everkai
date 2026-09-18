import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid} from '../lib/game.mjs';import {FELLOWS,FAMILY,REMOVED} from '../lib/catalog.mjs';import {WISH_RECRUITS,fountainState} from '../lib/fountain.mjs';import {originalCharacter} from '../lib/original-catalog.mjs';import {createPersistence} from '../lib/persistence.mjs';
const result=(s,id)=>act(s,'wishRecruit',s.lastAt,id,{seq:fountainState(s).seq});
const fixture=stones=>{let s={...fresh(1000),fountain:{policyVersion:1,seq:0,seed:123456789,bottles:900,total:0,ledger:{},history:[],recruited:[]}};s.fountain.ledger.Lottery_4=stones;return s;};
test('all16 referenced targets charge their exact community cost and join correct owned category',()=>{
 // The 15 community rows STAY in lib/fountain-data.json even though the owner deleted three of the
 // Fellows they name on 2026-09-17 (hero_52, hero_102, hero_105): validFountain looks a receipt up in
 // this list, so dropping a row would refuse every old save that had recruited them. What changes is
 // that the counter refuses them, because wishRecruit also requires the character to be in a roster.
 assert.equal(WISH_RECRUITS.length,15);assert.equal(WISH_RECRUITS.filter(r=>r.kind==='fellows').length,8);assert.equal(WISH_RECRUITS.filter(r=>r.cost===1).length,4);
 const gone=WISH_RECRUITS.filter(r=>REMOVED.has(r.id));
 assert.deepEqual(gone.map(r=>r.id).sort(),['hero_102','hero_105','hero_52']);
 for(const p of gone)assert.match(result(fixture(100),p.id).error,/supported acquaintance/,p.id+' is no longer offered');
 const OFFERED=WISH_RECRUITS.filter(r=>!REMOVED.has(r.id));
 assert.equal(OFFERED.length,12);assert.equal(OFFERED.filter(r=>r.kind==='fellows').length,5);
 for(const p of OFFERED){const roster=p.kind==='fellows'?FELLOWS:FAMILY;assert.ok(roster.find(x=>x.id===p.id));assert.equal(originalCharacter(p.id).fields.name,p.name);let s=fixture(p.cost-1);assert.ok(result(s,p.id).error);assert.equal(s[p.kind][p.id],undefined);s=fixture(p.cost);const r=result(s,p.id);assert.equal(r.error,undefined);assert.ok(valid(r.state));assert.equal(r.state.fountain.ledger.Lottery_4,0);assert.equal(r.state.fountain.recruited[0].paid,p.cost);assert.ok(r.state[p.kind][p.id]);assert.deepEqual(decode(JSON.stringify(r.state)),r.state);}
 assert.ok(WISH_RECRUITS.some(r=>r.id==='hero_104'&&r.name==='Loya'));assert.ok(!WISH_RECRUITS.some(r=>r.id==='wife_188'));assert.ok(result(fixture(100),'wife_188').error);
});
test('old three receipts and trained owners remain unchanged while welcoming the remaining nine',()=>{
 // hero_102 was the Fellow this used to open with and was deleted on 2026-09-17; hero_104 (Loya) is
 // the same row shape -- a 2-stone Fellow from the same Recruit category -- and still ships.
 let s=fixture(21);for(const id of ['hero_104','wife_103','wife_104'])s=result(s,id).state;s.fountain.recruited[0].paid=3;const receipts=structuredClone(s.fountain.recruited);s.fellows.hero_104.level=5;s.family.wife_103.intimacy=12;const fellow=structuredClone(s.fellows.hero_104),family=structuredClone(s.family.wife_103);
 for(const p of WISH_RECRUITS.filter(p=>!receipts.some(r=>r.character===p.id)&&!REMOVED.has(p.id))){const r=result(s,p.id);assert.equal(r.error,undefined);s=r.state;}
 assert.equal(s.fountain.ledger.Lottery_4,0);assert.equal(s.fountain.recruited.length,12,'the three removed acquaintances cannot be recruited');assert.deepEqual(s.fountain.recruited.slice(0,3),receipts);assert.deepEqual(s.fellows.hero_104,fellow);assert.deepEqual(s.family.wife_103,family);assert.ok(valid(decode(JSON.stringify(s))));for(const p of WISH_RECRUITS)assert.ok(result(s,p.id).error);
});
test('failed new Fellow/Family recruitment writes keep Stones and permit one explicit retry',()=>{
 for(const id of ['hero_54','wife_52']){let raw=JSON.stringify(fixture(1)),fail=false;const p=createPersistence(()=>({getItem:()=>raw,setItem:(_,v)=>{if(fail)throw Error('quota');raw=v}}));p.load(1000);const row=WISH_RECRUITS.find(r=>r.id===id),before=structuredClone(p.current.fountain);fail=true;assert.throws(()=>p.commit(result(p.current,id).state));assert.deepEqual(p.current.fountain,before);assert.equal(p.current[row.kind][id],undefined);fail=false;p.load(1000);p.commit(result(p.current,id).state);assert.ok(p.current[row.kind][id]);assert.equal(p.current.fountain.ledger.Lottery_4,0);assert.ok(result(p.current,id).error);assert.deepEqual(decode(raw).fountain,p.current.fountain);}
});
