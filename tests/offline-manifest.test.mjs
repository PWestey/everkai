import test from 'node:test';import assert from 'node:assert/strict';
import {readdir,stat} from 'node:fs/promises';
import {streamed,STREAMED,PRECACHE_BUDGET_BYTES} from '../scripts/offline-manifest.mjs';
import clips from '../lib/character-idle-data.json' with {type:'json'};

const ASSETS=new URL('../public/assets/',import.meta.url);
async function walk(base,path=''){
 const out=[];
 for(const f of await readdir(new URL(path,base),{withFileTypes:true})){
  if(f.isDirectory())out.push(...await walk(base,path+f.name+'/'));
  else out.push(path+f.name);
 }
 return out;
}

test('every character idle clip is streamed, never precached',()=>{
 const srcs=Object.values(clips).map(c=>c.src);
 assert.equal(srcs.length,509,'the clip manifest still covers the whole roster');
 for(const src of srcs)assert.ok(streamed('assets/'+src),src+' would be precached');
});

test('no video reaches the precache manifest',async()=>{
 const files=(await walk(ASSETS)).map(f=>'assets/'+f);
 const precached=files.filter(f=>!streamed(f));
 const videos=precached.filter(f=>/\.(mp4|webm|mov|m4v)$/i.test(f));
 assert.deepEqual(videos,[],'video belongs on demand, not in the install');
});

test('the precache stays within a size a phone will actually grant',async()=>{
 const files=await walk(ASSETS);
 let precached=0,streamedBytes=0;
 for(const f of files){
  const {size}=await stat(new URL(f,ASSETS));
  if(streamed('assets/'+f))streamedBytes+=size;else precached+=size;
 }
 assert.ok(precached<=PRECACHE_BUDGET_BYTES,
  `precached assets are ${(precached/1048576).toFixed(0)} MB, over the ${(PRECACHE_BUDGET_BYTES/1048576).toFixed(0)} MB budget`);
 // The exclusion has to be doing real work; if this ever drops to nothing the rule has silently broken.
 assert.ok(streamedBytes>100*1024*1024,'streamed media should still be the bulk of the assets');
});

test('the streaming rule is narrow and anchored, so it cannot swallow the app shell',()=>{
 assert.equal(STREAMED.length,1);
 for(const keep of ['index.html','assets/index-abc123.js','assets/kaity-idle.webp','assets/facility-scenes/recruit.webp','assets/wardrobe/x.webp'])
  assert.equal(streamed(keep),false,keep+' must stay offline-installed');
 assert.equal(streamed('assets/idle/hero_128c1-idle.mp4'),true);
 // Anchored at the start: a path merely containing the word must not match.
 assert.equal(streamed('assets/village/idle/x.mp4'),false);
});
