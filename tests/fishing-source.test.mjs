import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {FISH,castKey,fishingState,rollLength,fishLengths,lengthRecords,formatLength,LENGTH_BANDS} from '../lib/fishing.mjs';
import apk from '../lib/fishing-apk-data.json' with {type:'json'};
// lib/fishing-species.json was read off a community wiki; lib/fishing-apk-data.json is Fish.json ->
// SkillBase.json. These tests hold the two against each other so neither can drift on its own.
const run=(s,a,t=null,g=null)=>{const r=act(s,a,s.lastAt,t,g);assert.equal(r.error,undefined,r.error);assert.ok(valid(r.state));return decode(JSON.stringify(r.state))};
// The wiki words each line its own way ("All Fellow", "UR and above quality Fellows"), so the prose
// check compares the two NUMBERS it quotes, rebuilt from the APK payload, not the sentence around them.
const short=n=>n>=1e6?`${+(n/1e6).toFixed(2)}M`:n>=1000?`${+(n/1000).toFixed(2)}K`:`${n}`;
const amounts=e=>e.kind==='percent'?[`${+e.initial.toFixed(2)}%`,`${+e.increment.toFixed(2)}%`]:[short(e.initial),short(e.increment)];
const quoted=text=>{const m=text.match(/\+([\d.]+[KM]?%?)\s*\(\+([\d.]+[KM]?%?)\)/);assert.ok(m,`no amounts in "${text}"`);return [m[1],m[2]];};

test('all 86 shipped species carry the original normal AND crown numbers, and the prose agrees',()=>{
 assert.equal(Object.keys(apk.records).length,87);
 assert.equal(FISH.length,86);
 // The 87th is F3506, whose SkillBase row has no prop at all — which is why it is deferred, not missing.
 const extra=Object.keys(apk.records).filter(id=>!FISH.some(f=>f.id===id));
 assert.deepEqual(extra,['F3506']);
 assert.equal(apk.records.F3506.crown,null);
 assert.equal(apk.records.F3506.normal.kind,null);
 let crowned=0;
 for(const f of FISH){
  const a=apk.records[f.id];
  assert.ok(a,`${f.id} missing from the config export`);
  for(const [ours,theirs,label] of [[f.effect,a.normal,'normal'],[f.crownEffect,a.crown,'crown']]){
   assert.ok(ours,`${f.id} has no ${label} effect`);
   assert.equal(ours.kind,theirs.kind,`${label} kind ${f.id}`);
   assert.equal(ours.type,theirs.type,`${label} type ${f.id}`);
   assert.deepEqual([...ours.rarities].sort(),[...theirs.rarities].sort(),`${label} rarities ${f.id}`);
   assert.equal(ours.initial,theirs.initial,`${label} initial ${f.id}`);
   assert.equal(ours.increment,theirs.increment,`${label} increment ${f.id}`);
  }
  assert.deepEqual(quoted(f.skills['Normal Skill'][0]),amounts(f.effect),`normal prose ${f.id}`);
  assert.deepEqual(quoted(f.skills['Crown Skill'][0]),amounts(f.crownEffect),`crown prose ${f.id}`);
  crowned++;
 }
 assert.equal(crowned,86);
});

test('every species has four contiguous length bands on the original 50/25/15/10 weights',()=>{
 assert.deepEqual(apk.bandWeights.pro1&&[apk.bandWeights.pro1,apk.bandWeights.pro2,apk.bandWeights.pro3,apk.bandWeights.proG],[5000,2500,1500,1000]);
 for(const f of FISH){
  const a=apk.records[f.id];
  assert.equal(a.bands.length,LENGTH_BANDS,`band count ${f.id}`);
  assert.deepEqual(a.weights,[5000,2500,1500,1000],`band weights ${f.id}`);
  for(let i=0;i<LENGTH_BANDS;i++)assert.ok(a.bands[i][0]<=a.bands[i][1],`band ${i} of ${f.id}`);
  for(let i=1;i<LENGTH_BANDS;i++)assert.equal(a.bands[i][0],a.bands[i-1][1]+1,`band ${i} follows ${i-1} in ${f.id}`);
  assert.deepEqual(a.rewardTargets,[a.bands[0][1],a.bands[1][1],a.bands[2][1]],`reward targets ${f.id}`);
  assert.deepEqual(f.lengthBands,a.bands,`shipped bands ${f.id}`);
 }
 // Every catch number lands inside its rolled band, and the gold band is reached at roughly a tenth.
 let gold=0;const seen=new Set();
 for(let n=1;n<=4000;n++){
  const r=rollLength(n,'F1101');
  const [lo,hi]=fishLengths('F1101').bands[r.band-1];
  assert.ok(r.length>=lo&&r.length<=hi,`roll ${n} out of band`);
  if(r.band===4)gold++;seen.add(r.band);
 }
 assert.deepEqual([...seen].sort(),[1,2,3,4]);
 assert.ok(gold>300&&gold<500,`gold band came up ${gold} times in 4000, expected near 400`);
 assert.equal(formatLength(1625),'16.25 cm');
});

test('a cast records its length, the record keeps the longest, and old catches stay valid',()=>{
 let s=run(fresh(1000),'castFish',castKey(fresh(1000)),'Village River');
 const c=fishingState(s).catches.at(-1);
 assert.equal(c.policyVersion,4);
 assert.ok(Number.isInteger(c.length)&&[1,2,3,4].includes(c.band));
 assert.equal(lengthRecords(fishingState(s)).get(c.fish),c.length);
 // Negative controls: a length outside its band, a band that does not match, and a length on a
 // policy-2 catch must all be refused by the save guard.
 for(const edit of [f=>f.catches[0].length=fishLengths(f.catches[0].fish).bands[f.catches[0].band-1][1]+1,
                    f=>f.catches[0].band=f.catches[0].band===1?2:1,
                    f=>{f.catches[0].policyVersion=2},
                    f=>{f.catches[0].length=-1}]){
  const b=structuredClone(s);edit(b.fishing);
  assert.equal(valid(b),false,'a tampered length must not validate');
  assert.throws(()=>decode(JSON.stringify(b)));
 }
 // Positive control: a pre-length catch is still a valid save.
 const old=structuredClone(s);delete old.fishing.catches[0].length;delete old.fishing.catches[0].band;
 old.fishing.catches[0].policyVersion=2;
 assert.equal(valid(old),true);
 assert.equal(lengthRecords(old.fishing).size,0);
});
