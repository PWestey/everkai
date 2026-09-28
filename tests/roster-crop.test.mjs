import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync} from 'node:fs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {COSTUMES} from '../lib/wardrobe.mjs';
import {rosterCrop,hasRosterCrop,rosterCropViews,rosterCropPlacement,CARD_ASPECT} from '../lib/roster-crop.mjs';

const ASSETS=new URL('../public/assets/',import.meta.url);
const views=()=>[...FELLOWS.map(f=>f.id),...FAMILY.map(f=>f.id),...COSTUMES.map(c=>c.id)];
// The four the import could not find in either APK. They are named here rather than counted so that a
// fifth going missing, or one of these quietly coming back, both show up as a failure.
const NO_CROP=['H251C1','hero_180','hero_183','wife_168'];

test('every crop the table names is on disk at the size it claims',()=>{
 const ids=rosterCropViews();
 assert.equal(ids.length,299,'the import found 299 of the roster\'s 303 views');
 for(const id of ids){
  const c=rosterCrop(id);
  const u=new URL(c.path,ASSETS);
  assert.ok(existsSync(u),`${id}: ${c.path} is not on disk`);
  assert.ok(statSync(u).size>1024,`${id}: ${c.path} is suspiciously small`);
  assert.equal(c.width,500,`${id} is not the original's 500x400 half-body`);
  assert.equal(c.height,400,`${id} is not the original's 500x400 half-body`);
 }
});

test('coverage: exactly the shipped roster, minus the four that are in neither APK',()=>{
 const want=views();
 assert.equal(want.length,303);
 const missing=want.filter(v=>!hasRosterCrop(v)).sort();
 assert.deepEqual(missing,[...NO_CROP].sort(),
  'the set of views with no imported crop changed -- re-run scripts/import-roster-crops.py and say why');
 const extra=rosterCropViews().filter(v=>!want.includes(v));
 assert.deepEqual(extra,[],'the table names views the roster cannot draw');
});

test('the alpha box is a real measurement, not a constant',()=>{
 const boxes=rosterCropViews().map(v=>rosterCrop(v).box).filter(Boolean);
 assert.equal(boxes.length,297,'297 of the 299 crops carry usable alpha; 2 are fully opaque');
 for(const b of boxes){
  assert.equal(b.length,4);
  assert.ok(b[0]>=0&&b[1]>=0&&b[2]<=1&&b[3]<=1,`box outside the crop: ${b}`);
  assert.ok(b[2]>b[0]&&b[3]>b[1],`empty box: ${b}`);
 }
 // Rule 6: say what makes this a measurement. A constant column would pass every check above.
 const centres=new Set(boxes.map(b=>((b[0]+b[2])/2).toFixed(3)));
 assert.ok(centres.size>80,`only ${centres.size} distinct figure centres across 297 crops -- that is a constant, not a measurement`);
});

test('placement covers the card and centres the slice on the figure',()=>{
 const cardH=100/CARD_ASPECT;
 for(const v of rosterCropViews()){
  const {box}=rosterCrop(v),p=rosterCropPlacement(box);
  assert.equal(p.width,+(cardH*1.25).toFixed(2),`${v}: width must make the image's height fill the card`);
  assert.ok(p.left<=0,`${v}: left ${p.left} would leave the card's left edge bare`);
  assert.ok(p.left>=100-p.width,`${v}: left ${p.left} would leave the card's right edge bare`);
  if(box){
   const cx=(box[0]+box[2])/2,ideal=50-p.width*cx;
   // Either the slice is centred on the figure, or it was clamped to keep the card covered.
   assert.ok(Math.abs(p.left-ideal)<.01||p.left===0||p.left===+(100-p.width).toFixed(2),
    `${v}: left ${p.left} is neither the figure's centre (${ideal.toFixed(2)}) nor a clamp`);
  }
 }
});

test('a view with no crop falls through to the old measured-bounds path',()=>{
 for(const v of NO_CROP){
  assert.equal(rosterCrop(v),null,`${v} should have no crop`);
  assert.equal(hasRosterCrop(v),false);
 }
 assert.equal(rosterCrop('not_a_character'),null);
 assert.equal(rosterCrop(undefined),null);
});
