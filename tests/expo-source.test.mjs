import test from 'node:test';import assert from 'node:assert/strict';
import apk from '../lib/expo-apk-data.json' with {type:'json'};
import data from '../lib/expo-data.json' with {type:'json'};
import {EXPO_STAGES,EXPO_STALLS} from '../lib/expo.mjs';
// lib/expo-data.json was read off a community reference. lib/expo-apk-data.json is
// TowerDefenseStage.json module "1". These tests hold the two against each other.

test('the shipped hundred stages are the original permanent ladder, number for number',()=>{
 // TowerDefenseStage holds 885 rows across ten modules; only module "1" is the permanent Expo.
 assert.equal(Object.values(apk.modules).reduce((a,b)=>a+b,0),885);
 assert.equal(apk.modules['1'],100);
 assert.equal(apk.permanentModule,'1');
 assert.equal(apk.stages.length,100);
 assert.equal(data.stages.length,100);
 for(let i=0;i<100;i++){
  const ours=data.stages[i],theirs=apk.stages[i];
  assert.equal(ours.id,i+1,`stage id ${i+1}`);
  assert.equal(ours.slots,theirs.slots,`stall slots on stage ${i+1}`);
  assert.equal(ours.power,theirs.power,`power requirement on stage ${i+1}`);
  assert.equal(ours.satisfaction,theirs.satisfaction,`satisfaction on stage ${i+1}`);
  // Everkai's "Verify, Confirm" flag is the original's own pair of columns, not our own doubt.
  const flags=[theirs.verify?'Verify':null,theirs.confirm?'Confirm':null].filter(Boolean);
  assert.equal(ours.flags,flags.length?flags.join(', '):'None',`flags on stage ${i+1}`);
 }
 assert.equal(apk.stages.filter(s=>s.verify).length,95);
 assert.equal(apk.stages.filter(s=>!s.verify).length,5);
 assert.equal(data.stalls.length,apk.stallCount);
 assert.equal(EXPO_STALLS.length,35);
});

test('only the first five stages are playable, and the save guard holds that line',()=>{
 // Not a data gap: all 100 rows ship. The gate is Everkai's, because the customer model is local
 // and the other 95 clear rewards have never been measured against the economy.
 assert.equal(EXPO_STAGES.length,5);
 assert.deepEqual(EXPO_STAGES.map(s=>s.id),[1,2,3,4,5]);
 // Positive control: the data behind the gate really is present and complete.
 assert.equal(data.stages[99].id,100);
 assert.ok(data.stages[99].power>data.stages[0].power);
});
