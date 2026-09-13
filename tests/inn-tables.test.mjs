import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import prog from '../lib/inn-progression-data.json' with {type:'json'};
import inn from '../lib/inn-data.json' with {type:'json'};

// THE INVARIANTS WHOSE ABSENCE LET THREE DEFECTS SHIP AT ONCE. All three were the same shape -- a
// lookup table SHORTER than the range that indexes it, silently absorbed by a `?? 1` / `?? 0`:
//
//   BUG-21  recipeStations mapped 9 of 80 dishes, so 71 paid the fallback at EVERY level.
//   BUG-22  popularity had stations 1-9 at levels {1,2,5,6}; station 10 was missing outright, so
//           upgrading past level 6 stopped earning popularity and froze the rating forever.
//   C7-02   finesseByLevel had 15 entries against a cap of 20, so level 16 DROPPED finesse 240 -> 1.
//
// Every one of them passed the whole suite. A fallback that quietly answers 1 cannot be distinguished
// from a real value at runtime, so the only way to catch this class is to assert table COVERAGE
// against the range that reads it -- which is what this file does.

const DISHES=inn.dishes??inn.records;
const STATIONS=inn.stations;
const CAP=inn.sandbox.stationCap;

test('every dish is either station-mapped or explicitly guest-gated — never silently unmapped',()=>{
 assert.equal(DISHES.length,80);
 const mapped=[],guest=[],orphan=[];
 for(const d of DISHES){
  const id=String(d.id);
  if(Object.hasOwn(prog.recipeStations,id))mapped.push(id);
  else if(String(d.station)==='__guest__')guest.push(id);
  else orphan.push(id);
 }
 // An orphan is the BUG-21 shape: it resolves to station undefined -> finesseByLevel[NaN] -> `?? 1`,
 // which looks like a legitimately tiny gain rather than a missing mapping.
 assert.deepEqual(orphan,[],
  'These dishes have no recipeStations entry and are not marked __guest__, so they will silently earn '
  +'finesse 1 and popularity 0 at every station level: '+JSON.stringify(orphan));
 assert.equal(mapped.length,75);
 assert.deepEqual(guest.sort((a,b)=>a-b),['30','45','54','56','57'],
  'the guest-gated set changed; these are the only dishes allowed to have no station');
 // ...and a mapped dish must point at a station that exists.
 const ids=new Set(STATIONS.map(s=>String(s.id)));
 for(const [dish,station] of Object.entries(prog.recipeStations))
  assert.ok(ids.has(String(station)),`dish ${dish} maps to station ${station}, which does not exist`);
});

test('finesse and popularity tables cover the whole station-level range that indexes them',()=>{
 assert.equal(STATIONS.length,10);
 assert.equal(CAP,30,'the station cap moved; the tables below must move with it');
 // C7-02: the ladder is read as finesseByLevel[level-1], so it needs exactly CAP entries.
 assert.equal(prog.finesseByLevel.length,CAP,
  `finesseByLevel has ${prog.finesseByLevel.length} entries against a station cap of ${CAP}. Levels past `
  +'the end fall back to 1, which makes upgrading a station a DOWNGRADE (C7-02).');
 assert.ok(prog.finesseByLevel.every(n=>Number.isInteger(n)&&n>0));
 // It must also be monotonic, which is the property that made the cliff a downgrade rather than a plateau.
 for(let i=1;i<prog.finesseByLevel.length;i++)
  assert.ok(prog.finesseByLevel[i]>=prog.finesseByLevel[i-1],`finesseByLevel drops at level ${i+1}`);
 // BUG-22: popularity is read as popularity[station][level], so it needs every station AND every level.
 assert.deepEqual(Object.keys(prog.popularity).map(Number).sort((a,b)=>a-b),
  STATIONS.map(s=>Number(s.id)).sort((a,b)=>a-b),'popularity is missing a station entirely');
 for(const s of STATIONS){
  const levels=prog.popularity[String(s.id)];
  const missing=[];
  for(let l=1;l<=CAP;l++)if(!Number.isInteger(levels?.[String(l)]))missing.push(l);
  assert.deepEqual(missing,[],
   `station ${s.id} has no popularity value at levels ${JSON.stringify(missing)}; those levels earn 0 `
   +'and the Inn rating stops advancing (BUG-22).');
 }
});

// -----------------------------------------------------------------------------------------------
// The ceilings in validInn are written as literals, so growing a table without growing its bound
// makes legitimately-earned gains fail valid() -- a save the game itself produced and then refuses.
// Read as text, so the guard below has to prove its own pattern still matches.
// -----------------------------------------------------------------------------------------------

const SRC=readFileSync(new URL('../lib/inn.mjs',import.meta.url),'utf8');
const bound=name=>{const m=SRC.match(new RegExp(`int\\(q\\.gains\\.${name},(\\d+)\\)`));return m?Number(m[1]):null};

test('validInn ceilings are not below the tables they police (and the extractor still works)',()=>{
 // Extractor guard first: a drifted pattern would return null and the checks below would be vacuous.
 assert.ok(SRC.includes('export function validInn('),'validInn has moved out of lib/inn.mjs');
 for(const name of ['finesse','popularity'])
  assert.ok(Number.isInteger(bound(name)),
   `no int(q.gains.${name},N) bound found in lib/inn.mjs; the pattern has drifted and this test proves nothing`);
 const maxFinesse=Math.max(...prog.finesseByLevel);
 const maxPopularity=Math.max(...Object.values(prog.popularity).flatMap(l=>Object.values(l)));
 assert.ok(bound('finesse')>=maxFinesse,
  `validInn bounds queued finesse at ${bound('finesse')} but the ladder pays up to ${maxFinesse}; a save `
  +'that legitimately earned the top of the table would be rejected as invalid.');
 assert.ok(bound('popularity')>=maxPopularity,
  `validInn bounds queued popularity at ${bound('popularity')} but stations pay up to ${maxPopularity}.`);
});
