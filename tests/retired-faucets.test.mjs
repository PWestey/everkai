import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
import {fresh,act} from '../lib/game.mjs';
// Free grants retired from the game, each with the catalogue row and what replaced it.
const RETIRED=[
 ['claimOriginalSupplies','ECON-04: 10M EXP + 100 of each breakthrough material per press; replaced by claimDailyBreach'],
 ['specialBlessingSupply','ECON-05: Blessing Points to 1,000,000,000 in one tap; dates earn them'],
 ['finishWorkshop','BUG-28: instant free finish made crafting untimed; batches take their duration'],
];
const APP=new URL('../app/',import.meta.url);
const app=readdirSync(APP).filter(f=>/\.tsx?$/.test(f)).map(f=>readFileSync(new URL(f,APP),'utf8')).join('\n');

test('retired faucets are unknown to the engine and absent from the UI',()=>{
 const s=fresh(1000);
 // Positive control: a live action is dispatched normally and appears in the UI, so "Unknown action" below is meaningful.
 assert.doesNotThrow(()=>act(s,'refillInnStamina',1000));assert.ok(app.includes("'refillInnStamina'"));
 for(const [name,why] of RETIRED){
  assert.throws(()=>act(s,name,1000,'wife_1'),/Unknown action/,`${name} is dispatchable again (${why})`);
  assert.ok(!app.includes(`'${name}'`),`${name} is referenced from app/ (${why})`);}});
