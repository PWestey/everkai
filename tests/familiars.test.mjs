import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,decode,valid,totalRate} from '../lib/game.mjs';
import {FAMILIARS,familiarStats,familiarStage,familiarCap} from '../lib/familiars.mjs';
const run=(s,a,t=null,v=null)=>act(s,a,s.lastAt,t,v);
test('familiar stats match hand-calculated base, level and star examples',()=>{
 assert.deepEqual(familiarStats('Pet_1191',{level:1,stars:0}),{ATK:480,HP:3400,SPD:80});
 assert.deepEqual(familiarStats('Pet_1191',{level:2,stars:1}),{ATK:499,HP:3572,SPD:88});
 assert.equal(familiarStage(49),1);assert.equal(familiarStage(50),2);assert.equal(familiarStage(499),10);
 for(const p of FAMILIARS){const stats=familiarStats(p.id,{level:familiarCap(p.id),stars:100});assert.ok(Object.values(stats).every(n=>Number.isSafeInteger(n)&&n>0));}
});
test('welcome all preserves individual training and saves without granting village rewards',()=>{
 let s=fresh(1000),rate=totalRate(s);s=run(s,'adoptFamiliar','Pet_1191').state;s=run(s,'trainFamiliar','Pet_1191',10).state;s=run(s,'starFamiliar','Pet_1191').state;
 s=run(s,'adoptFamiliars').state;assert.equal(Object.keys(s.familiars).length,71);assert.deepEqual(s.familiars.Pet_1191,{level:11,stars:1});assert.equal(totalRate(s),rate);assert.equal(s.gold,250);assert.ok(valid(s));assert.deepEqual(decode(JSON.stringify(s)),s);
});
test('bad identities, levels and duplicate welcome cannot grant progression',()=>{
 let s=fresh(1000);assert.ok(run(s,'trainFamiliar','Pet_1191',1).error);assert.ok(run(s,'adoptFamiliar','bad').error);
 s=run(s,'adoptFamiliar','Pet_1191').state;assert.ok(run(s,'adoptFamiliar','Pet_1191').error);s.familiars.Pet_1191.level=498;s=run(s,'trainFamiliar','Pet_1191',10).state;assert.equal(s.familiars.Pet_1191.level,499);assert.ok(run(s,'trainFamiliar','Pet_1191',1).error);
 for(const patch of [{level:500,stars:0},{level:1,stars:101},{level:1.5,stars:0}]){const x=structuredClone(s);x.familiars.Pet_1191=patch;assert.throws(()=>decode(JSON.stringify(x)));}
});
