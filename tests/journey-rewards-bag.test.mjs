import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid,decode} from '../lib/game.mjs';
import {JOURNEY_ITEMS} from '../lib/adventure.mjs';
import {openingItemCount} from '../lib/opening.mjs';
const T=1000;
const started=()=>act(fresh(T),'openingStart',T).state;

test('journey rewards are ordinary Bag items, and an old locker moves into the Bag on load',()=>{
 const ids=JOURNEY_ITEMS.map(i=>i.id);
 assert.ok(ids.includes('Item_Token_Gacha_Universal'),'the recruitment token is a Bag item');
 assert.ok(!ids.includes('Item_Building_Recruit_Increase_1'),'hire cards stay in Staffing');
 const s=started();
 assert.equal(s.inventory.Item_Token_Gacha_Universal,0,'a new save carries the slot at zero');
 // A save written before the move: 91 tokens in the locker, no Bag slot for them.
 const old={...s,opening:{...s.opening,locker:{Item_Token_Gacha_Universal:91}}};
 delete old.inventory.Item_Token_Gacha_Universal;
 assert.equal(valid(old),false,'as stored it is not a current save');
 const moved=decode(JSON.stringify(old));
 assert.equal(moved.inventory.Item_Token_Gacha_Universal,91,'the count carries over exactly');
 assert.deepEqual(moved.opening.locker,{},'the locker is emptied');
 assert.equal(openingItemCount(moved,'Item_Token_Gacha_Universal'),91,'the Journey page reads the same count');
 assert.ok(valid(moved));assert.deepEqual(decode(JSON.stringify(moved)),moved,'the migration is inert once applied');});

test('a boss reward lands in the Bag, where it can be spent',()=>{
 let s=started();s.inventory.Item_HeroManagerment_Building=2;
 assert.ok(valid(s));
 assert.equal(openingItemCount(s,'Item_HeroManagerment_Building'),2);
 // Negative control: the locker may no longer hold a Bag item, or counts would exist twice.
 assert.equal(valid({...s,opening:{...s.opening,locker:{Item_HeroManagerment_Building:1}}}),false);});
