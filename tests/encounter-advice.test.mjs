import test from 'node:test';import assert from 'node:assert/strict';import {fresh,act,decode,valid} from '../lib/game.mjs';import {encounterAdvice} from '../lib/encounter-advice.mjs';import {FRONTIER} from '../lib/frontier.mjs';
test('a funded ready stage recommends nothing; a boss above your Power offers valid affordable gain',()=>{
 // A normal stage can no longer block on Power -- Power only sets its price -- so the blocked case is
 // a BOSS. Stage 24 is chapter 4-6, atk 12,300 from the original's LevelBoss row, against a fresh
 // roster's 10,000 ladder Power.
 const s={...fresh(1000),gold:1e9};assert.equal(encounterAdvice(s).ready,true);
 const b={...s,adventure:{...s.adventure,cleared:23}},a=encounterAdvice(b);
 assert.equal(a.required,12300);assert.equal(a.ready,false);assert.ok(a.options.length);
 for(const o of a.options){const r=act(b,o.action,1000,o.target,o.value);assert.ok(!r.error,r.error);assert.ok(valid(r.state));if(o.action!=='buySupply')assert.ok(o.after>a.power);}
 assert.deepEqual(encounterAdvice(decode(JSON.stringify(b))),a);
});
test('gold gate recommends only collectible gold and capped ready saves recommend nothing',()=>{
 let s=fresh(1000);s.gold=0;let a=encounterAdvice(s);assert.equal(a.blockedOnGold,true);assert.equal(a.options[0].action,'collect');assert.ok(!act(s,'collect',1000).error);s.pending=0;assert.equal(encounterAdvice(s).options.length,0);
 s.gold=10000;s.fellows.hero_15={...s.fellows.hero_15,level:300,breaks:4,aptitude:1000,skill:20};assert.equal(encounterAdvice(s).options.length,0);
});
test('Frontier advice respects saved party, used leaders and future-only cap projection',()=>{
 let s=fresh(1000);s.adventure.cleared=30;s.gold=10000;s.fellowXP=10000;for(const id of ['hero_1','hero_101'])s=act(s,'recruit',1000,id).state;s.adventure.party=['hero_15','hero_1','hero_101'];s.frontier={policyVersion:1,cleared:4,attempts:1,active:{encounter:5,attempt:1,wave:1,party:[...s.adventure.party],used:['hero_15']}};
 s.fellows.hero_15.aptitude=1000;s.inventory.Item_Talent_Hero_1=20;const a=encounterAdvice(s,true);assert.equal(a.required,FRONTIER[4].waves[1].power);assert.ok(!a.options.some(o=>o.target==='hero_15'));for(const o of a.options)assert.ok(!act(s,o.action,1000,o.target,o.value).error);
 // A limitBreak option only exists when the Fellow is AT its cap, which the quality ladder puts at
 // 100 for zero breaks (it was 30 under the old 20+breaks*10 rule). At level 20 no option is built
 // and this read `undefined`.
 for(const id of ['hero_1','hero_101'])s.fellows[id].level=100;s.inventory.local_limit_token=1;s.inventory.Item_Talent_Hero_1=0;const cap=encounterAdvice(s,true).options.find(o=>o.action==='limitBreak');assert.ok(cap);const r=act(s,cap.action,1000,cap.target,cap.value);assert.equal(r.state.fellows[cap.target].level,100);assert.equal(r.state.fellowXP,s.fellowXP);assert.match(cap.detail,/button only raises the cap/);
});
