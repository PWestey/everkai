import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {AtlasAttachmentLoader,SkeletonBinary,TextureAtlas} from '@esotericsoftware/spine-webgl';
import {spineModel,spinePilotEnabled,spinePilotModels} from '../lib/spine-pilot.mjs';
import {streamed} from '../scripts/offline-manifest.mjs';
import {transformQuad} from '../scripts/spine-boot-fixes.mjs';

const read=name=>JSON.parse(readFileSync(new URL('../lib/'+name,import.meta.url)));
const clips=read('character-idle-data.json'),base=read('humanized-static-data.json'),costumes=read('wardrobe-data.json').costumes;
const asset=path=>readFileSync(new URL('../public/assets/'+path,import.meta.url));
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');

test('the pilot is exactly the five chosen appearances still in the game',()=>{
 // Six until 2026-09-17, when the owner's roster trim removed the W19C1 costume: with no wardrobe row,
 // no still and no idle clip behind it, a live Spine model for it has nothing to fall back to when the
 // ?spine=1 flag is off, so it left the pilot and its packaged files were deleted.
 assert.deepEqual(Object.keys(spinePilotModels).sort(),['H101C1','H111C1','hero_111','hero_183','wife_116']);
});

test('every pilot file is present with its recorded bytes and sha256, and streams',()=>{
 for(const [key,row] of Object.entries(spinePilotModels)){
  const files=[row.skeleton,row.atlas,...row.pages,...(row.background?[row.background]:[])];
  let total=0;
  for(const f of files){const bytes=asset(row.base+f.file);assert.equal(bytes.length,f.bytes,key+' '+f.file);assert.equal(sha(bytes),f.sha256,key+' '+f.file);total+=f.bytes;assert.ok(streamed('assets/'+row.base+f.file),f.file+' would be precached')}
  assert.equal(row.totalBytes,total,key);
  assert.equal(row.textureMemoryBytes,row.pages.reduce((s,p)=>s+p.width*p.height*4,0),key);
  const onDisk=readdirSync(new URL('../public/assets/'+row.base,import.meta.url)).sort();
  assert.deepEqual(onDisk,files.map(f=>f.file).sort(),key+': stray or missing files');
 }
});

test('each pilot model belongs to the same person and costume as its idle clip',()=>{
 for(const [key,row] of Object.entries(spinePilotModels)){
  const clip=clips[key];assert.ok(clip,key+' has no idle clip to fall back to');
  assert.equal(clip.owner,row.owner);assert.equal(clip.costumeId,row.costumeId);assert.equal(clip.id,row.model);
  if(row.costumeId){const c=costumes.find(x=>x.id===key);assert.equal(c.ownerId,row.owner);assert.equal(c.modelId,row.model)}
  else assert.equal(base.find(x=>x.id===key).model,row.model);
  assert.ok(['card','figure'].includes(row.framing));
  assert.equal(row.framing==='card',!!row.costumeId&&!row.background,key+' framing');
 }
});

test('each packaged skeleton parses, has its idle animation, and fits its humanization recipe',()=>{
 for(const [key,row] of Object.entries(spinePilotModels)){
  const text=asset(row.base+row.atlas.file).toString('utf8'),atlas=new TextureAtlas(text);
  assert.deepEqual(atlas.pages.map(p=>p.name).sort(),row.pages.map(p=>p.file).sort(),key+': atlas page names must match the encoded pages');
  for(const page of atlas.pages){const p=row.pages.find(x=>x.file===page.name);assert.equal(page.width,p.width);assert.equal(page.height,p.height);assert.equal(page.pma,row.premultiplied,key+': the atlas pma flag must match how the pages were encoded');assert.equal(row.premultiplied,false,key+': lossy premultiplied pages draw halos (measured), so pages are straight alpha');page.setTexture({getImage:()=>({width:page.width,height:page.height}),setFilters(){},setWraps(){},dispose(){}})}
  const data=new SkeletonBinary(new AtlasAttachmentLoader(atlas)).readSkeletonData(asset(row.base+row.skeleton.file));
  assert.match(data.version,/^4\.1\./,key);
  assert.ok(data.findAnimation(row.idle),key+' idle '+row.idle);
  assert.deepEqual(data.animations.map(a=>a.name),row.animations.map(a=>a.name));
  for(const slot of row.humanization.hideSlots)assert.ok(data.findSlot(slot),key+' hides missing slot '+slot);
  for(const r of row.humanization.replacements){assert.ok(data.findSlot(r.slot),key+' '+r.slot);assert.ok(atlas.findRegion(r.region),key+' '+r.region)}
 }
});

test('the humanization Everkai shipped is carried, including both boot fixes',()=>{
 const m=spinePilotModels;
 assert.equal(m.hero_183.humanization.status,'excluded-male-character');assert.deepEqual(m.hero_183.humanization.hideSlots,[]);
 for(const key of ['hero_111','H111C1','H101C1','wife_116'])assert.ok(m[key].humanization.hideSlots.length,key+' hides animal anatomy');
 // W19C1's boot fix went with the model when its costume was removed on 2026-09-17; wife_116's is the
 // remaining one and still carries both replacements, so the transform is still exercised on real data.
 const fixes={wife_116:[{rot:25,dx:40,dy:-40},{dx:40,dy:30,scale:.95}]};
 for(const [key,list] of Object.entries(fixes))list.forEach((fix,i)=>{
  const r=m[key].humanization.replacements[i];
  if(!fix){assert.equal(r.fix,undefined);return}
  assert.deepEqual(r.fix,fix);
  transformQuad(r.sourceVertices,fix).forEach((v,j)=>assert.ok(Math.abs(v-r.vertices[j])<1e-2,key+' boot '+i));
 });
 // Positive control for the transform itself: a pure translation moves every corner by (dx,dy).
 assert.deepEqual(transformQuad([0,0,10,0,10,10,0,10],{dx:5,dy:-5}),[5,-5,15,-5,15,5,5,5]);
});

test('live playback is opt-in per page load and matches ownership exactly',()=>{
 assert.equal(spinePilotEnabled(''),false);assert.equal(spinePilotEnabled('?spine=0'),false);assert.equal(spinePilotEnabled('?spine=1'),true);
 assert.equal(spineModel({id:'hero_111'}).model,'hero_111');
 assert.equal(spineModel({id:'hero_111',costumeId:'H111C1'}).model,'hero_111c1');
 assert.equal(spineModel({id:'hero_101',costumeId:'H111C1'}),null,'a costume on the wrong person');
 assert.equal(spineModel({id:'hero_101'}),null,'a base appearance that is not packaged');
 assert.equal(spineModel({id:'wife_19'}),null,'the owner without the costume');
});
