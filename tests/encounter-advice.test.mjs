import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,decode,valid} from '../lib/game.mjs';import {encounterAdvice} from '../lib/encounter-advice.mjs';import {FRONTIER} from '../lib/frontier.mjs';
test('fresh ready encounters do not recommend spending; blocked stage offers valid affordable gain',()=>{
 const s=fresh(1000);assert.equal(encounterAdvice(s).ready,true);const b=act(s,'battle',1000,1).state,a=encounterAdvice(b);assert.equal(a.ready,false);assert.ok(a.options.length);for(const o of a.options){const r=act(b,o.action,1000,o.target,o.value);assert.ok(!r.error,r.error);assert.ok(valid(r.state));if(o.action!=='buySupply')assert.ok(o.after>a.power);}assert.deepEqual(encounterAdvice(decode(JSON.stringify(b))),a);
});
test('gold gate recommends only collectible gold and capped ready saves recommend nothing',()=>{
 let s=fresh(1000);s.gold=0;let a=encounterAdvice(s);assert.equal(a.blockedOnGold,true);assert.equal(a.options[0].action,'collect');assert.ok(!act(s,'collect',1000).error);s.pending=0;assert.equal(encounterAdvice(s).options.length,0);
 s.gold=10000;s.fellows.hero_15={...s.fellows.hero_15,level:60,breaks:4,aptitude:1000,skill:20};assert.equal(encounterAdvice(s).options.length,0);
});
test('Frontier advice respects saved party, used leaders and future-only cap projection',()=>{
 let s=fresh(1000);s.adventure.cleared=30;s.gold=10000;s.fellowXP=10000;for(const id of ['hero_1','hero_105'])s=act(s,'recruit',1000,id).state;s.adventure.party=['hero_15','hero_1','hero_105'];s.frontier={policyVersion:1,cleared:4,attempts:1,active:{encounter:5,attempt:1,wave:1,party:[...s.adventure.party],used:['hero_15']}};
 s.fellows.hero_15.aptitude=1000;s.inventory.Item_Talent_Hero_1=20;const a=encounterAdvice(s,true);assert.equal(a.required,FRONTIER[4].waves[1].power);assert.ok(!a.options.some(o=>o.target==='hero_15'));for(const o of a.options)assert.ok(!act(s,o.action,1000,o.target,o.value).error);
 for(const id of ['hero_1','hero_105'])s.fellows[id].level=20;s.inventory.local_limit_token=1;s.inventory.Item_Talent_Hero_1=0;const cap=encounterAdvice(s,true).options.find(o=>o.action==='limitBreak');assert.ok(cap);const r=act(s,cap.action,1000,cap.target,cap.value);assert.equal(r.state.fellows[cap.target].level,20);assert.equal(r.state.fellowXP,s.fellowXP);assert.match(cap.detail,/button only raises the cap/);
});
