import test from 'node:test';import assert from 'node:assert/strict';
import data from '../lib/fishing-data.json' with {type:'json'};
import crown from '../lib/kohaku-crown-data.json' with {type:'json'};
import {FISH_COMBINATIONS,FISH_GROUNDS,FISHING_LEVELS,castOdds,fishingState} from '../lib/fishing.mjs';

// BUG-10. lib/fishing-data.json is the policy-1 fishing record and nothing imports it, so its
// `unimplemented` list drifted silently for five releases: it still named catch probabilities,
// other grounds, fishing level curves, combinations and crowns long after lib/fishing.mjs shipped
// all five. A list of what is missing is only useful if something fails when it stops being true.
//
// Each row below asserts the capability is live FIRST (the positive control -- if the capability is
// ever removed, that assertion fails and the record is allowed to name it again), then asserts the
// record does not still call it missing.
const SHIPPED=[
 ['catch probabilit',()=>{
   const odds=castOdds(fishingState({}),FISH_GROUNDS[0]);
   assert.ok(odds.length&&odds.some(o=>o.chance>0),'castOdds returns no weighted rarity');
 }],
 ['other grounds',()=>assert.ok(FISH_GROUNDS.length>1,`only ${FISH_GROUNDS.length} fishing ground`)],
 ['fishing level curve',()=>assert.ok(FISHING_LEVELS.length>1,'no fishing level curve')],
 ['combinations',()=>assert.ok(FISH_COMBINATIONS.length>0,'no fish combinations')],
 ['crowns',()=>assert.ok(crown.fishId&&crown.effect,'no crown data')],
];

test('the fishing record does not list a capability the code already ships',()=>{
 const listed=data.unimplemented.map(s=>s.toLowerCase());
 for(const [phrase,control] of SHIPPED){
  control();
  const stale=listed.filter(s=>s.includes(phrase));
  assert.deepEqual(stale,[],
   `lib/fishing-data.json still calls "${phrase}" unimplemented, but lib/fishing.mjs ships it:\n`
   +stale.map(s=>`  ${s}`).join('\n')
   +`\nRe-derive the list against the code, or delete the record.`);
 }
});

test('the fishing record still names the capabilities that genuinely are missing',()=>{
 // The opposite failure: an empty or emptied list reads as "fishing is finished", which it is not.
 assert.ok(data.unimplemented.length>=2,'the unimplemented list has been emptied, not re-derived');
 const joined=data.unimplemented.join(' ').toLowerCase();
 for(const phrase of ['length','antique'])
  assert.ok(joined.includes(phrase),`"${phrase}" dropped off the list without being implemented`);
 assert.ok(data.unimplementedRederivedAt,'the list carries no re-derivation date');
});
