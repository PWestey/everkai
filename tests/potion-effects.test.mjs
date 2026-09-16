import test from 'node:test';import assert from 'node:assert/strict';
import {fresh,act,settle,valid,buildingRate} from '../lib/game.mjs';
import {POTIONS,POTION_EFFECTS,POTION_YIELD_PERCENT,potionEffect,potionYield,potionRecipes} from '../lib/apothecary.mjs';
import classic from '../lib/apothecary-data.json' with {type:'json'};
// lib/apothecary-data.json came from the community wiki; lib/apothecary-effect-data.json came from
// the original's own Medicine.json -> SkillBase.json. These tests hold the two sources against each
// other, so neither can drift silently and neither is trusted alone.
const run=(s,a,id=null,q=null)=>{const r=act(s,a,s.lastAt,id,{seq:s.apothecary?.seq,quantity:q});assert.ok(!r.error,r.error);assert.ok(valid(r.state));return r.state};
const pct=n=>`${+(n/100).toFixed(2)}%`;
const amount=e=>e.kind==='percent'?pct(e.initial):`${e.initial}`;
const renderSkill=r=>`${r.faction} Fellow ${r.upgrade.prop==='atk'?'Power':'Aptitude'} +${amount(r.upgrade)} (+${r.upgrade.kind==='percent'?pct(r.upgrade.increment):r.upgrade.increment})`;

test('every potion effect is the original config, and the two sources agree on all twenty',()=>{
 assert.equal(POTION_EFFECTS.length,20);
 assert.equal(POTION_EFFECTS.filter(r=>r.permanent).length,10);
 assert.equal(POTIONS.length,10);
 const wiki=new Map(classic.records.map(r=>[r.id,r]));
 assert.equal(wiki.size,20);
 for(const r of POTION_EFFECTS){
  // Medicine.effect resolves to the same payload in every row: +5% yield to every building in every
  // country, with skillProp_Level absent, so it never scales with the potion's level.
  assert.deepEqual({...r.completion,skill:null},{skill:null,target:'city',condition:'all',conditionId:null,prop:'yield',kind:'percent',initial:POTION_YIELD_PERCENT,increment:0},`completion ${r.id}`);
  assert.equal(r.completion.skill,`${r.permanent?'Medicine':'GveMedicine'}_${r.id}`);
  // Medicine.levelUpSkill is per-country and does scale; initial equals per-level in all twenty rows.
  assert.equal(r.upgrade.target,'hero');
  assert.equal(r.upgrade.condition,'country');
  assert.equal(r.upgrade.conditionId,String(r.country));
  assert.equal(r.upgrade.initial,r.upgrade.increment,`upgrade step ${r.id}`);
  assert.ok(['atk','talent'].includes(r.upgrade.prop),`upgrade prop ${r.id}`);
  // The APK numbers must rebuild the wiki's prose character for character.
  assert.equal(renderSkill(r),wiki.get(r.id).skillText,`skillText ${r.id}`);
  // And the APK's unlock gate must match the wiki's sold gate for the ten permanent potions.
  assert.equal(wiki.get(r.id).soldGate,r.permanent?r.unlock:null,`soldGate ${r.id}`);
 }
 // The ten unshipped potions are event content (Medicine.ActivityID), not missing permanent potions.
 assert.deepEqual([...new Set(POTION_EFFECTS.filter(r=>!r.permanent).map(r=>r.activity))].sort(),['GveMedicine_01','GveMedicine_02']);
 assert.equal(POTION_EFFECTS.filter(r=>r.permanent).every(r=>r.activity===null),true);
 assert.equal(potionEffect('1001').completion.initial,500);
 assert.equal(potionEffect('no-such-potion'),null);
});

test('unlocked potions multiply building yield by five percent each, and nothing else',()=>{
 let s=fresh(1000);
 assert.equal(potionYield(s),0);
 const base=buildingRate(s,'fish');
 assert.ok(base>0,'positive control: the starter building earns before any potion is unlocked');
 s=run(s,'apothecaryOpen');s=settle(s,21000);
 assert.equal(potionRecipes(s).length,1);
 assert.equal(potionYield(s),0.05);
 assert.equal(buildingRate(s,'fish'),base*1.05);
 s.apothecary.sold=600;
 assert.equal(potionRecipes(s).length,10);
 assert.equal(potionYield(s),0.5);
 assert.equal(buildingRate(s,'fish'),base*1.5);
 // Negative control: an unstaffed building earns nothing however many potions are unlocked.
 assert.equal(buildingRate({...s,buildings:{...s.buildings,fish:{...s.buildings.fish,fellow:null}}},'fish'),0);
});
