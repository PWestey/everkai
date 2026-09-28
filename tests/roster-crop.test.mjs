import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync} from 'node:fs';
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
import {COSTUMES} from '../lib/wardrobe.mjs';
import {rosterCrop,hasRosterCrop,rosterCropViews,rosterCropPlacement,CARD_ASPECT,hasAdjustedArt} from '../lib/roster-crop.mjs';
import humanized from '../lib/humanized-static-data.json' with {type:'json'};

const ASSETS=new URL('../public/assets/',import.meta.url);
const views=()=>[...FELLOWS.map(f=>f.id),...FAMILY.map(f=>f.id),...COSTUMES.map(c=>c.id)];
// The four the import could not find in either APK. They are named here rather than counted so that a
// fifth going missing, or one of these quietly coming back, both show up as a failure.
const NO_CROP=['H251C1','hero_180','hero_183','wife_168'];
// CORRECTED 2026-09-28. The crop must never override an ADJUSTED composition: Everkai does not ship the
// original's character art as drawn, and lib/humanized-static-data.json holds one adjusted plate for every
// Fellow and every Family member. The first version of this import took precedence over them and put the
// raw APK sprites back on the roster -- horns, animal features and un-adjusted bodies -- for 215 of 218.
// So the crop now serves ONLY the costumes, which have no adjusted version either way.
const ADJUSTED=new Set(humanized.map(r=>r.id));

test('every crop the table names is on disk at the size it claims',()=>{
 const ids=rosterCropViews().filter(id=>hasRosterCrop(id));
 assert.ok(ids.length>0);
 assert.ok(ids.every(id=>!ADJUSTED.has(id)),'a view with an adjusted composition must never use a crop');
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
 // Every Fellow and Family member has an adjusted composition, so none of them may use a crop.
 assert.equal(FELLOWS.filter(f=>hasRosterCrop(f.id)).length,0,'no Fellow may draw the raw APK sprite');
 assert.equal(FAMILY.filter(f=>hasRosterCrop(f.id)).length,0,'no Family member may either');
 assert.ok(FELLOWS.every(f=>hasAdjustedArt(f.id))&&FAMILY.every(f=>hasAdjustedArt(f.id)),
  'and that is because all 218 of them have one');
 // The costumes do not, so they keep the better-framed crop.
 const costumes=COSTUMES.filter(c=>hasRosterCrop(c.id)).length;
 assert.equal(costumes,COSTUMES.length-1,'every costume but H251C1, which is in neither APK');
 const extra=rosterCropViews().filter(v=>!want.includes(v));
 assert.deepEqual(extra,[],'the table names views the roster cannot draw');
});

test('the alpha box is a real measurement, not a constant',()=>{
 const boxes=rosterCropViews().map(v=>rosterCrop(v)).filter(Boolean).map(c=>c.box).filter(Boolean);
 assert.ok(boxes.length>50,`only ${boxes.length} crops carry an alpha box`);
 for(const b of boxes){
  assert.equal(b.length,4);
  assert.ok(b[0]>=0&&b[1]>=0&&b[2]<=1&&b[3]<=1,`box outside the crop: ${b}`);
  assert.ok(b[2]>b[0]&&b[3]>b[1],`empty box: ${b}`);
 }
 // Rule 6: say what makes this a measurement. A constant column would pass every check above.
 const centres=new Set(boxes.map(b=>((b[0]+b[2])/2).toFixed(3)));
 assert.ok(centres.size>40,`only ${centres.size} distinct figure centres -- that is a constant, not a measurement`);
});

test('placement covers the card and centres the slice on the figure',()=>{
 const cardH=100/CARD_ASPECT;
 for(const v of rosterCropViews()){
  const c=rosterCrop(v);if(!c)continue;
  const {box}=c,p=rosterCropPlacement(box);
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
