import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import tower from '../lib/familiar-tower-data.json' with {type:'json'};
import {familiarById} from '../lib/familiars.mjs';

// Coverage guard for the imported Familiar Tower (scripts/import-familiar-tower.py): every PetTower row
// and every PetTowerArray enemy is present, and every value indexes something real.
test('all 300 PetTower floors and all 1,480 PetTowerArray enemies are imported and resolve',()=>{
 assert.equal(tower.floors.length,300);
 assert.deepEqual(tower.floors.map(f=>f.floor),Array.from({length:300},(_,i)=>i+1));
 assert.equal(tower.floors.reduce((n,f)=>n+f.enemies.length,0),1480);
 assert.deepEqual([...new Set(tower.floors.map(f=>f.area))],[1,2,3]);
 assert.deepEqual(tower.floors.filter(f=>f.boss).map(f=>f.floor),[100,200,300]);
 assert.deepEqual(tower.floors.filter(f=>f.reward.familiar).map(f=>[f.floor,f.reward.familiar]),[[60,'Pet_21131'],[100,'Pet_11141'],[130,'Pet_32331'],[160,'Pet_33231'],[200,'Pet_31241'],[300,'Pet_41141']]);
 let last=[0,0];
 for(const f of tower.floors){
  assert.ok(f.enemies.length>=1&&f.enemies.length<=5,`floor ${f.floor} line-up size`);
  for(const [pet,...nums] of f.enemies){assert.ok(familiarById(pet),`floor ${f.floor} enemy ${pet}`);for(const n of nums)assert.ok(Number.isInteger(n)&&n>0,`floor ${f.floor} ${pet}`);}
  for(const k of Object.keys(f.reward))assert.ok(['levelUp','classUp','Item_PetCatch2','Item_PetPacify1','familiar'].includes(k),`floor ${f.floor} reward ${k}`);
  assert.ok(f.reward.levelUp>0,`floor ${f.floor} pays level-up items`);
  // Income never falls as floors rise, which is what makes "highest cleared floor" the whole rule.
  assert.ok(f.income[0]>=last[0]&&f.income[1]>=last[1],`floor ${f.floor} income ${f.income}`);last=f.income;
 }
 assert.deepEqual(tower.floors[0].enemies,[['Pet_12111',1,80,300,14,1920]],'floor 1 is one level-1 Pet_12111, read from the row');
 assert.equal(tower.endlessOpen,200);assert.deepEqual(tower.endlessMeasured,{bands:23,pool:705});
});

// The owner could not find the Tower or Dispatch: they were pages inside one selected familiar. This pins
// the fix at the source level (app/ has no component tests).
//
// REBUILT 2026-09-24 to docs/familiar-screen-specs/01-hub.md. The fix used to be an icon dock with a
// `Previous · n / 4 · Next` footer -- a pager, for four items, of the kind both character rebuilds
// deleted. The original's Familiar opens onto a SCENE whose buildings are the destinations, so the
// guard now pins the destinations rather than the dock's label array. The INTENT is unchanged and is
// what this test has always been for: none of these systems may hide inside one selected familiar.
test('Familiars is a village destination whose top-level places are the collection, Tower, Exploring, Dispatch and the Handbook',()=>{
 const read=f=>readFileSync(new URL('../app/'+f,import.meta.url),'utf8');
 const hall=read('familiar-hall.tsx'),page=read('page.tsx'),panel=read('familiar-panel.tsx');
 assert.doesNotMatch(hall,/PanelPages/,'the scene is the navigation; there is no pager');
 for(const id of ['growth','tower','explore','dispatch','handbook'])
  assert.match(hall,new RegExp(`id:'${id}'`),`${id} is a destination on the hub`);
 for(const c of ['FamiliarPanel','FamiliarTowerPanel','FamiliarExplorePanel','FamiliarDispatchPanel','FamiliarHandbook'])assert.match(hall,new RegExp(c),c);
 assert.match(page,/\['familiars','Familiars'\]/,'modules[] row');
 assert.match(page,/<TabsContent value="familiars"><FamiliarHall /,'the pane');
 const side=page.slice(page.indexOf('village-side-buttons'),page.indexOf('objective={'));
 assert.match(side,/openModule\('familiars'\)/,'a village side button opens it');
 assert.doesNotMatch(panel,/FamiliarTowerPanel|FamiliarDispatchPanel/,'the tower and dispatch no longer hide inside one familiar');
 assert.doesNotMatch(panel,/'adoptFamiliars?'/,'no free adoption button');
});
