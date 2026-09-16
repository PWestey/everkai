import test from 'node:test';import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {artBounds,artTransform,rosterArtPlacement,clipMotion,CARD_ASPECT} from '../lib/art-framing.mjs';
import bounds from '../lib/art-bounds-data.json' with {type:'json'};
import clips from '../lib/character-idle-data.json' with {type:'json'};
import costumes from '../lib/wardrobe-assets.json' with {type:'json'};
import {FELLOWS,FAMILY} from '../lib/catalog.mjs';
const frozen=JSON.parse(readFileSync(new URL('./frozen-idle-clips.json',import.meta.url)));

test('every portrait, costume and idle clip the app shows was measured',()=>{
 const paths=new Set([...[...FELLOWS,...FAMILY].flatMap(f=>[f.art,f.portrait]),...costumes.map(c=>c.art),...Object.values(clips).map(c=>c.src)].filter(Boolean));
 assert.equal(bounds.measured,paths.size,'re-run scripts/measure-art-bounds.mjs after changing character art');
 for(const c of Object.values(clips))assert.equal(typeof bounds.assets[c.src]?.motion,'number',c.src+' has no motion measurement');
 for(const [path,row] of Object.entries(bounds.assets))if(row.bounds){
  const [x0,y0,x1,y1]=row.bounds;assert.ok(0<=x0&&x0<x1&&x1<=1&&0<=y0&&y0<y1&&y1<=1,path);assert.match(row.surround,/^#[0-9a-f]{6}$/,path);
 }
 // Positive control: a costume known to draw its art small inside a flat surround is measured as one.
 const small=artBounds('wardrobe/H111C1.webp');assert.ok(small&&small.bounds[2]-small.bounds[0]<.7,'H111C1 art is narrow inside its surround');
 assert.equal(artBounds('./assets/wardrobe/H111C1.webp')?.surround,small.surround,'app-relative paths resolve');
});

test('no shipped idle clip is frozen',()=>{
 const shipped=new Map(Object.entries(clips).map(([k,c])=>[c.sha256,k]));
 const back=frozen.clips.filter(c=>shipped.has(c.sha256)).map(c=>c.key);
 assert.deepEqual(back,[],'frozen re-render bytes are back in character-idle-data.json');
 // wife_116 and wife_19c1 carry the boot fixes and were re-rendered frozen; their animated renders
 // still have the misplaced boots, so they stay until they can be re-rendered.
 const still=Object.values(clips).filter(c=>clipMotion(c.src)<.0005).map(c=>c.owner+(c.costumeId?'/'+c.costumeId:''));
 assert.deepEqual(still.sort(),['wife_116','wife_19/W19C1'],'clips with no measurable motion');
});

test('framing zooms a surround render to its art and leaves full-frame renders alone',()=>{
 const box={width:390,height:736};
 assert.equal(artTransform(null,box,'cover'),null,'full-frame render untouched');
 assert.equal(artTransform([0,0,1,1],{width:200,height:300},'contain'),null,'art already filling its box untouched');
 // Art in the middle half of a contained 2:3 box: zoom just under 2x, art centred.
 const [,tx,ty,zoom]=artTransform([.25,.25,.75,.75],{width:200,height:300},'contain').match(/translate\((-?[\d.]+)px,(-?[\d.]+)px\) scale\(([\d.]+)\)/).map(Number);
 assert.ok(zoom>1.8&&zoom<=2,'zoom '+zoom);
 assert.ok(Math.abs(tx+zoom*100-100)<1&&Math.abs(ty+zoom*150-150)<1,'art centre lands on box centre');
 // Never smaller than today: art that already overflows a cover box keeps scale 1.
 const wide=artTransform([0,.02,1,.98],box,'cover');assert.ok(wide===null||/scale\(1\.0000\)/.test(wide),String(wide));
 assert.ok(+artTransform([.2,.2,.3,.3],box,'contain').match(/scale\(([\d.]+)\)/)[1]<=2.5,'zoom capped');
});

test('roster cards lift low or small art to the arch and keep full-frame renders where they were',()=>{
 assert.deepEqual(rosterArtPlacement(null),{width:150,left:-25,top:0});
 const cardH=100/CARD_ASPECT;
 for(const b of [[.3,.32,.76,.88],[.33,.29,.79,.72],[.05,.03,.77,.97],[.36,.15,.97,.88]]){
  const p=rosterArtPlacement(b),top=p.top/100*cardH,height=p.width*1.5;
  assert.ok(p.width>=100&&p.left<=0&&p.left+p.width>=100,'covers the card width '+b);
  assert.ok(top<=0&&top+height>=cardH-.01,'covers the card height '+b);
  assert.ok(top+height*b[1]<=cardH*.06,'art top sits at the arch '+b);
 }
});
