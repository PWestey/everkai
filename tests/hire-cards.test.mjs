import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';
import {HIRE_CARDS} from '../lib/hire-cards.mjs';
const inn='Building_101',workshop='Building_301',run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
function prepared(card){let s=run(fresh(1000),'openEnterprise',inn).state;s=run(s,'openEnterprise',workshop).state;return run(s,'claimHireCards',card.id).state;}
test('all three local Hire Cards apply their whole effect to a random eligible business',()=>{
 assert.deepEqual(HIRE_CARDS.map(c=>c.amount),[1,3,5]);
 for(const card of HIRE_CARDS){let s=prepared(card),old=structuredClone(s);s=run(s,'useHireCards',card.id,{count:1,rolls:[.99]}).state;
  assert.equal(s.enterprises[workshop].employees,card.amount);assert.equal(s.enterprises[inn].employees,0);assert.equal(s.hireCards[card.id],9);
  assert.deepEqual(old.inventory,s.inventory);assert.deepEqual(decode(JSON.stringify(s)),s);assert.ok(valid(s));
 }
});
test('batch reevaluates capacity and preserves unused cards without truncating their effect',()=>{
 const card=HIRE_CARDS[2];let s=prepared(card);s.enterprises[inn].employees=4996;s.enterprises[workshop].employees=4990;
 s=run(s,'useHireCards',card.id,{count:10,rolls:Array(10).fill(0)}).state;
 assert.equal(s.enterprises[workshop].employees,5000);assert.equal(s.enterprises[inn].employees,4996);assert.equal(s.hireCards[card.id],8);
 assert.ok(run(s,'useHireCards',card.id,{count:1,rolls:[0]}).error);assert.ok(valid(s));
});
test('invalid rolls and unopened villages cannot consume cards, and grants are bounded',()=>{
 const card=HIRE_CARDS[0];let s=run(fresh(1000),'claimHireCards',card.id).state;
 assert.ok(run(s,'useHireCards',card.id,{count:1,rolls:[0]}).error);
 s=run(s,'openEnterprise',inn).state;
 for(const value of [{count:2},{count:1,rolls:[1]},{count:1,rolls:[-1]},{count:1,rolls:[NaN]},{count:10,rolls:[0]}]){const result=run(s,'useHireCards',card.id,value);assert.ok(result.error);assert.deepEqual(result.state,s);}
 s.hireCards[card.id]=999999;s=run(s,'claimHireCards',card.id).state;assert.equal(s.hireCards[card.id],1e6);assert.ok(run(s,'claimHireCards',card.id).error);
 for(const hireCards of [null,[],{unknown:1},{[card.id]:1.5},{[card.id]:1000001}]){const bad={...s,hireCards};assert.equal(valid(bad),false);assert.throws(()=>decode(JSON.stringify(bad)));}
});
test('hiring settles elapsed income before employees are added and matches sequential draws',()=>{
 const card=HIRE_CARDS[1],s=prepared(card),draws=Array.from({length:10},(_,i)=>i%2?.99:0);
 let manual=s;for(const roll of draws)manual=run(manual,'useHireCards',card.id,{count:1,rolls:[roll]}).state;
 assert.deepEqual(run(s,'useHireCards',card.id,{count:10,rolls:draws}).state,manual);
 const after=act(s,'useHireCards',11000,card.id,{count:1,rolls:[0]}).state;assert.equal(after.pending,s.pending+10*totalRate(s));assert.ok(totalRate(after)>totalRate(s));
});
