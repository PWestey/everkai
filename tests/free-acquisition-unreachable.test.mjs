import test from 'node:test';import assert from 'node:assert/strict';
import {readdirSync,readFileSync} from 'node:fs';
// ECON-03: recruit, welcome, recruitAll and welcomeAll grant characters with no cost. They remain engine
// actions because a large part of the test suite builds fixtures with them, but the game must never offer
// them: every character a player gets comes through summonRecruit (priced), openingRecruit (rank-up) or
// an earned route. This scans app/ for any dispatch of the free four.
const APP=new URL('../app/',import.meta.url);
const source=readdirSync(APP).filter(f=>/\.tsx?$/.test(f)).map(f=>[f,readFileSync(new URL(f,APP),'utf8')]);
const dispatches=name=>source.filter(([,t])=>new RegExp(`\\b(?:action|run|act)\\(\\s*(['"])${name}\\1`).test(t)).map(([f])=>f);

test('the UI dispatches no free character-acquisition action',()=>{
 // Positive control: the scan finds the priced door, so an empty result below means something.
 assert.ok(dispatches('summonRecruit').length>0,'the scan cannot see summonRecruit; the pattern has drifted');
 for(const name of ['recruit','welcome','recruitAll','welcomeAll'])assert.deepEqual(dispatches(name),[],`${name} is dispatched from the UI`);});
