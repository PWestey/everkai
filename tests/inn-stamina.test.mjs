import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode,settle} from '../lib/game.mjs';
import {INN_STAMINA_RECOVER_MS} from '../lib/inn.mjs';
import {innStaminaCap} from '../lib/inn-progression.mjs';
import {starterHabits} from '../lib/habits.mjs';
import {funded} from './gear-fixtures.mjs';
const T=new Date('2026-09-16T09:00:00').getTime(),H=3600e3;
const at=(s,a,now,t=null,v=null)=>{const r=act(s,a,now,t,v);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state),a);return r.state};
const inn=()=>{let s=funded({...fresh(T),habits:starterHabits(T)});s=at(s,'openEnterprise',T,'Building_101');s=at(s,'openInnService',T);return s;};

test('Inn stamina recovers one point every 20 minutes up to the cap, as the original energy item does',()=>{
 assert.equal(INN_STAMINA_RECOVER_MS,1200e3);
 let s=inn();s={...s,inn:{...s.inn,stamina:0}};const cap=innStaminaCap(s.inn);
 assert.equal(settle(s,T+19*60e3).inn.stamina,0,'less than one boundary pays nothing');
 const hour=settle(s,T+H);assert.equal(hour.inn.stamina,3,'three 20-minute boundaries in an hour from 09:00');
 let often=s;for(let t=T+60e3;t<=T+H;t+=60e3)often=settle(often,t);
 assert.equal(often.inn.stamina,3,'settling every minute pays the same');
 assert.equal(settle(s,T+48*H).inn.stamina,cap,'recovery stops at the cap');
 assert.deepEqual(decode(JSON.stringify(hour)),hour);});

test('the stamina refill is a once-a-day habit reward, not a free button',()=>{
 let s=inn();s={...s,inn:{...s.inn,stamina:0}};
 assert.match(act(s,'refillInnStamina',T).error,/Complete a daily habit/);
 s=at(s,'habitComplete',T,s.habits.items.find(x=>x.freq==='daily').id);
 s=at(s,'refillInnStamina',T);assert.equal(s.inn.stamina,innStaminaCap(s.inn));
 s={...s,inn:{...s.inn,stamina:0}};
 assert.match(act(s,'refillInnStamina',T+H).error,/already used/,'a second refill the same day is refused');
 // Negative control: the next day, with that day's habit, it works again.
 const next=T+24*H;let t=at(s,'habitComplete',next,s.habits.items.find(x=>x.freq==='daily').id);
 t={...t,inn:{...t.inn,stamina:0}};t=at(t,'refillInnStamina',next);assert.equal(t.inn.stamina,innStaminaCap(t.inn));
 assert.equal(valid({...t,inn:{...t.inn,refillDay:42}}),false,'a malformed refill day is not a save');});
