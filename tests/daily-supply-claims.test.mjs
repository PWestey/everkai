import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {CONSUMABLES} from '../lib/adventure.mjs';
import {KEEPSAKES} from '../lib/museum.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {funded} from './gear-fixtures.mjs';
const T=new Date('2026-09-16T09:00:00').getTime(),H=3600e3;
const at=(s,a,now,t=null,v=null)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state};
const journal=()=>({...fresh(T),habits:starterHabits(T)});
const daily=(s,now=T)=>at(s,'habitComplete',now,s.habits.items.find(x=>x.freq==='daily').id);
const stone='Item_HeroEXP_Resources_4';

test('supplies are a daily habit claim, not an unlimited free grant (ECON-07, BUG-40)',()=>{
 let s=journal();
 assert.match(act(s,'claimConsumable',T,stone).error,/Complete a daily habit/);
 s=daily(s);
 const got=at(s,'claimConsumable',T,stone);
 assert.equal(got.inventory[stone],10,'one claim is ten');
 assert.match(act(got,'claimConsumable',T+H,CONSUMABLES[0].id).error,/already used/,'one claim a day, not one per item');
 assert.deepEqual(decode(JSON.stringify(got)),got);
 // Negative control: tomorrow's habit opens it again.
 const next=T+24*H;let t=daily(got,next);
 assert.equal(at(t,'claimConsumable',next,stone).inventory[stone],20);
 assert.equal(valid({...got,supplyDay:7}),false,'a malformed claim day is not a save');});

test('a keepsake is a daily habit reward, not the whole museum at once',()=>{
 let s=daily(journal());
 const one=at(s,'claimMuseum',T);
 assert.equal(Object.keys(one.museum).length,1,`one of ${KEEPSAKES.length} keepsakes`);
 assert.match(act(one,'claimMuseum',T+H).error,/already collected/);
 const next=T+24*H;const two=at(daily(one,next),'claimMuseum',next);
 assert.equal(Object.keys(two.museum).length,2);
 assert.deepEqual(decode(JSON.stringify(two)),two);
 assert.equal(valid({...one,museumDay:7}),false);
 // Picking a specific keepsake shares the same daily allowance.
 let pick=daily(journal());pick=at(pick,'claimKeepsake',T,KEEPSAKES[3].id);
 assert.deepEqual(Object.keys(pick.museum),[KEEPSAKES[3].id]);
 assert.match(act(pick,'claimKeepsake',T+H,KEEPSAKES[4].id).error,/already collected/);});

test('the Workshop supply delivery is daily (ECON-10)',()=>{
 let s=funded(journal());s=at(s,'openEnterprise',T,'Building_301');s=at(s,'openWorkshop',T);
 assert.match(act(s,'restockWorkshop',T).error,/Complete a daily habit/);
 s=daily(s);const before=s.workshop.supplies;
 s=at(s,'restockWorkshop',T);
 assert.equal(s.workshop.supplies,before+20);
 assert.match(act(s,'restockWorkshop',T+H).error,/already taken/);
 assert.equal(valid({...s,workshop:{...s.workshop,restockDay:7}}),false);});
