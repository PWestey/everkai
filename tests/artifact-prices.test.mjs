import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,valid} from '../lib/game.mjs';
import {GEAR,LEGACY_ITEMS,artifactPrice,ARTIFACT_PRICE_PER_ORE} from '../lib/adventure.mjs';
import {artifactRule} from '../lib/artifacts.mjs';
import rules from '../lib/artifact-rules.json' with {type:'json'};

// ECON-22. Measured before the fix: buySupply priced 3 of the 89 shipped artifacts. The other 86 carried
// price null, so the equipment shelf showed no Buy button at all and the only other door (forgeArtifact)
// is gated on Magic Ore. The three shipped prices were 30 / 60 / 90 crystals against ore 10 / 20 / 30 in
// those artifacts' OWN lib/artifact-rules.json rows -- exactly 3x ore in all three -- so the curve is read
// back out of the same table rather than invented. Both halves of the ratio come from artifact-rules.json.
const SHIPPED={Item_Weapon_Equipment_1_1:30,Item_Weapon_Equipment_2_1:60,Item_Weapon_Equipment_3_1:90};

test('the price rule reproduces every price that actually shipped',()=>{
 for(const [id,price] of Object.entries(SHIPPED)){
  assert.equal(artifactPrice(id),price,id);
  assert.equal(ARTIFACT_PRICE_PER_ORE*artifactRule(id).ore,price,`${id}: 3 x its own recorded ore`);}});

test('every shipped artifact is priced, and priced from its own rule row',()=>{
 // Positive control first: the rule table is really loaded and really keyed by artifact id.
 assert.equal(Object.keys(rules.records).length,89,'artifact-rules.json records is a DICT of 89, not a list');
 assert.equal(rules.records.Item_Weapon_Equipment_1_1.ore,10);
 assert.equal(GEAR.length,89);
 const unpriced=GEAR.filter(g=>g.price===null||g.price===undefined);
 assert.deepEqual(unpriced,[],`${unpriced.length} artifacts still have no crystal price`);
 for(const g of GEAR)assert.equal(g.price,ARTIFACT_PRICE_PER_ORE*artifactRule(g.id).ore,g.id);
 // Prices span the rarity bands the ore column does: N 10 ore -> 30, UR 70 ore -> 210.
 assert.equal(Math.min(...GEAR.map(g=>g.price)),30);
 assert.equal(Math.max(...GEAR.map(g=>g.price)),210);});

test('a newly priced artifact is actually buyable and debits exactly its price',()=>{
 const g=GEAR.find(g=>!Object.hasOwn(SHIPPED,g.id)&&g.price===210);
 assert.ok(g,'a UR artifact that used to be unbuyable');
 let s={...fresh(0),crystals:g.price};
 assert.ok(act({...s,crystals:g.price-1},'buySupply',0,g.id).error,'one crystal short is refused');
 const r=act(s,'buySupply',0,g.id);
 assert.equal(r.error,undefined,r.error);
 assert.equal(r.state.crystals,0);
 assert.equal(r.state.inventory[g.id],1);
 assert.ok(valid(r.state));});

test('LEGACY_ITEMS stays pinned to the three ids v5/v6 saves shipped with',()=>{
 // validFamily counts this list to decide the exact inventory key set a v5/v6 save may carry. It used to
 // be spelled `price!==null`, which would have silently widened from 3 items to 89 here and made every
 // real v5/v6 save fail to decode.
 assert.deepEqual(LEGACY_ITEMS.filter(i=>i.id.startsWith('Item_Weapon_')).map(i=>i.id),
  ['Item_Weapon_Equipment_1_1','Item_Weapon_Equipment_2_1','Item_Weapon_Equipment_3_1']);
 assert.equal(LEGACY_ITEMS.length,6,'three materials plus those three artifacts');});
