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

// The "earned recruitment token" is Item_Token_Gacha_Universal, which the original names the Fairy
// Bottle: the Fountain of Wishes currency. It used to recruit the first unowned Fellow in catalog
// order, a local invention the owner could not find a use for. Using it now fills the Fountain.
test('a Fairy Bottle from the journey pours into the Fountain, one for one, and recruits nobody',()=>{
 const s=started();s.inventory.Item_Token_Gacha_Universal=7;
 const fellows=Object.keys(s.fellows).length,before=(s.fountain?.bottles)||0;
 const r=act(s,'openingUse',T,'Item_Token_Gacha_Universal');
 assert.equal(r.error,undefined,r.error);
 assert.equal(r.state.inventory.Item_Token_Gacha_Universal,0,'the whole stack moved');
 assert.equal(r.state.fountain.bottles,before+7,'exactly one bottle per token');
 assert.equal(Object.keys(r.state.fellows).length,fellows,'no Fellow was recruited');
 assert.ok(valid(r.state));assert.deepEqual(decode(JSON.stringify(r.state)),r.state);
 // Negative controls: an empty stack spends nothing, and a full Fountain keeps the tokens.
 const empty=act({...s,inventory:{...s.inventory,Item_Token_Gacha_Universal:0}},'openingUse',T,'Item_Token_Gacha_Universal');
 assert.ok(empty.error);
 const full={...s,fountain:{policyVersion:1,seq:0,seed:123456789,bottles:1e6-3,total:0,ledger:{},history:[],recruited:[]}};
 const capped=act(full,'openingUse',T,'Item_Token_Gacha_Universal');
 assert.equal(capped.error,undefined,capped.error);
 assert.equal(capped.state.fountain.bottles,1e6);
 assert.equal(capped.state.inventory.Item_Token_Gacha_Universal,4,'what did not fit stays in the Bag');
 const none=act(capped.state,'openingUse',T,'Item_Token_Gacha_Universal');
 assert.match(none.error,/Fountain is full/);
 assert.equal(none.state.inventory.Item_Token_Gacha_Universal,4,'a refused pour spends nothing');});
