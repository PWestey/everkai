import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,decode,valid,settle} from '../lib/game.mjs';
import {EXTRA_ITEMS} from '../lib/adventure.mjs';
import {GIFTS} from '../lib/catalog.mjs';

// The five Nichirin Swords left GEAR with the demon-to-angel rewrite. Every save written before that
// still carries their inventory keys, and validFamily counts inventory keys exactly -- so those saves
// stopped loading entirely. decode threw its final generic error, settle threw "Invalid village
// state", and the player saw "Saving is unavailable" with no way back in.
const RETIRED=['Item_Weapon_Equipment_6_H264','Item_Weapon_Equipment_6_H301','Item_Weapon_Equipment_6_H302','Item_Weapon_Equipment_6_H303','Item_Weapon_Equipment_6_H304'];
const EXPECTED=GIFTS.length+EXTRA_ITEMS.length;

test('none of the retired ids are still in the game',()=>{
 for(const id of RETIRED)assert.ok(!EXTRA_ITEMS.some(i=>i.id===id),id+' is back in EXTRA_ITEMS');
});

test('a save holding items the game has since removed still loads',()=>{
 const s=fresh(1000);
 const stale={...s,inventory:{...s.inventory,...Object.fromEntries(RETIRED.map(id=>[id,0]))}};
 assert.equal(Object.keys(stale.inventory).length,EXPECTED+RETIRED.length);
 assert.equal(valid(stale),false,'this is the shape that used to be unloadable');
 const loaded=decode(JSON.stringify(stale));
 assert.ok(valid(loaded));
 for(const id of RETIRED)assert.equal(loaded.inventory[id],undefined,id+' should be dropped');
 assert.equal(Object.keys(loaded.inventory).length,EXPECTED);
});

test('the rest of the village survives the repair untouched',()=>{
 const s={...fresh(1000),gold:9876,pending:42,earned:1234,upgrades:7};
 const stale={...s,inventory:{...s.inventory,[RETIRED[0]]:0}};
 const loaded=decode(JSON.stringify(stale));
 for(const key of ['gold','pending','earned','upgrades','fellowXP','crystals'])assert.equal(loaded[key],s[key],key);
 assert.deepEqual(loaded.fellows,s.fellows);
 assert.deepEqual(loaded.buildings,s.buildings);
 assert.deepEqual(loaded.school,s.school);
});

test('counts of items that still exist are preserved, not reset',()=>{
 const s=fresh(1000),id=EXTRA_ITEMS[0].id;
 const stale={...s,inventory:{...s.inventory,[id]:7,gift1:3,[RETIRED[1]]:0}};
 const loaded=decode(JSON.stringify(stale));
 assert.equal(loaded.inventory[id],7);
 assert.equal(loaded.inventory.gift1,3);
 assert.ok(valid(loaded));
});

test('a save written before newer items existed is filled in, not rejected',()=>{
 const s=fresh(1000),dropped=EXTRA_ITEMS.at(-1).id;
 const inventory={...s.inventory};delete inventory[dropped];
 const loaded=decode(JSON.stringify({...s,inventory}));
 assert.ok(valid(loaded));
 assert.equal(loaded.inventory[dropped],0,'missing ids come back at zero');
 assert.equal(Object.keys(loaded.inventory).length,EXPECTED);
});

test('settle no longer throws on a repaired save, so play can resume',()=>{
 const s=fresh(1000);
 const stale={...s,inventory:{...s.inventory,...Object.fromEntries(RETIRED.map(id=>[id,0]))}};
 const loaded=decode(JSON.stringify(stale));
 assert.doesNotThrow(()=>settle(loaded,loaded.lastAt+60000));
 assert.deepEqual(decode(JSON.stringify(loaded)),loaded,'and it round-trips cleanly afterwards');
});

test('an unknown id is dropped even when it holds a count, deliberately',()=>{
 // Decode cannot tell a retired item from a typo: both are ids the game no longer has. Refusing the
 // save is what caused this bug, and a count of an item that does not exist cannot be shown, spent
 // or used, so it is discarded rather than preserved. Pinned here so it reads as a decision.
 const s=fresh(1000);
 const loaded=decode(JSON.stringify({...s,inventory:{...s.inventory,[RETIRED[0]]:4,unknown_item:99}}));
 assert.ok(valid(loaded));
 assert.equal(loaded.inventory[RETIRED[0]],undefined);
 assert.equal(loaded.inventory.unknown_item,undefined);
 assert.equal(Object.keys(loaded.inventory).length,EXPECTED);
});

test('a genuinely corrupt save is still refused',()=>{
 const s=fresh(1000);
 // Repairing the inventory must not become a way to smuggle an invalid village through decode.
 for(const bad of [{...s,gold:-1},{...s,fellows:{}},{...s,inventory:{...s.inventory,gift1:-5}}])
  assert.throws(()=>decode(JSON.stringify(bad)));
});
