import test from 'node:test';
import assert from 'node:assert/strict';
import {act,valid,startingSave} from '../lib/game.mjs';
import {vacateFellow,postsOf} from '../lib/work-posts.mjs';
import {EXPO_STALLS} from '../lib/expo.mjs';
import {openingAutoGate,openingChapter,AUTO_CHAPTER,AUTO_RANK} from '../lib/opening.mjs';

const NOW=1767225600000;
const F='hero_1';
const rich=()=>{const s=act(startingSave(NOW),'recruitAll',NOW).state;return {...s,gold:1e14};};
const run=(s,a,t,v)=>{const r=act(s,a,NOW,t,v);assert.ok(!r.error,`${a} ${t}: ${r.error}`);return r.state;};
const stallId=()=>EXPO_STALLS[0]?.id||EXPO_STALLS[0];

// ONE FELLOW, ONE POST. Reported by the owner 2026-09-29: "fellows should only be allowed to be put in
// one building. I think it allows multiple right now." `assign` and `assignOperator` already cleared each
// other; `assignExpo` deduped only WITHIN the Expo, so a Fellow could work a business and a stall at once.
test('a Fellow holds at most one post, whichever way they are seated',()=>{
 let s=rich();
 s=run(s,'unlock','inn');
 s=run(s,'assign','inn',F);
 assert.deepEqual(postsOf(s,F),[{kind:'building',id:'inn'}]);
 s=run(s,'claimExpoStall',stallId());
 s=run(s,'assignExpo',stallId(),F);
 assert.deepEqual(postsOf(s,F),[{kind:'stall',id:stallId()}],'the Expo stall must vacate the building');
 s=run(s,'assign','inn',F);
 assert.deepEqual(postsOf(s,F),[{kind:'building',id:'inn'}],'and the building must vacate the stall');
 s=run(s,'openEnterprise','Building_101');
 s=run(s,'hireEmployees','Building_101',50);
 s=run(s,'assignOperator','Building_101',F);
 assert.deepEqual(postsOf(s,F),[{kind:'enterprise',id:'Building_101'}],'and the business vacates both');
 assert.ok(valid(s));
});

test('vacateFellow keeps the post it is told to keep, and touches nobody else',()=>{
 let s=rich();
 s=run(s,'unlock','inn');
 s=run(s,'assign','inn',F);
 s=run(s,'assign','fish','hero_195');
 assert.deepEqual(vacateFellow(s,F,{building:'inn'}).buildings.inn.fellow,F,'the kept post survives');
 assert.equal(vacateFellow(s,F).buildings.inn.fellow,null,'and without a keep it is cleared');
 assert.equal(vacateFellow(s,F).buildings.fish.fellow,'hero_195','another Fellow is never disturbed');
 assert.equal(vacateFellow(s,null),s,'no id is a no-op');
 assert.deepEqual(postsOf(s,'hero_195'),[{kind:'building',id:'fish'}]);
});

// FULL AUTO. Reported the same day: "full auto on stages is greyed out right now. I am on stage 19-1-2."
// It is not broken -- the gate is the RANK, not the chapter -- but the button was disabled with the
// reason computed and thrown away, so the screen said nothing.
test('Full-Auto is gated on rank, not on how far the chapters have gone',()=>{
 const deep={opening:{cleared:21*18,rank:1,events:[]}};
 assert.equal(openingChapter(deep),19,'the fixture really is at the owner’s chapter');
 assert.ok(openingChapter(deep)>=AUTO_CHAPTER,'so the chapter gate is long past');
 assert.equal(openingAutoGate(deep),`Full-Auto opens at rank ${AUTO_RANK}.`);
 assert.equal(openingAutoGate({opening:{...deep.opening,rank:AUTO_RANK}}),'','and rank alone opens it');
 // The early gate still reads as the chapter, so the two reasons stay distinguishable.
 assert.equal(openingAutoGate({opening:{cleared:0,rank:9,events:[]}}),`Full-Auto opens in chapter ${AUTO_CHAPTER}.`);
 assert.equal(openingAutoGate({}),'Begin the opening journey first.');
});

test('the screen shows the reason rather than only greying the button',()=>{
 const src=readFileSync(new URL('../app/stage-screen.tsx',import.meta.url),'utf8');
 assert.ok(src.includes('auto-gate-note'),'the gate string must reach the screen');
 assert.ok(/\{autoGate&&<p/.test(src),'and be rendered when it is non-empty');
});
import {readFileSync} from 'node:fs';
