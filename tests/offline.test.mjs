import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const mediaSource=await readFile(new URL('../public/media-range.js',import.meta.url),'utf8');
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function harness(fail=false){const events={},stores=new Map();let online=true,calls=0;
 const scope='https://village.example/';
 const caches={open:async key=>{if(!stores.has(key))stores.set(key,new Map());const m=stores.get(key);return {put:async(k,v)=>m.set(k,v),match:async k=>m.get(typeof k==='string'?k:k.url)}} ,keys:async()=>[...stores.keys()],delete:async k=>stores.delete(k)};
 const self={OFFLINE_VERSION:'test',OFFLINE_FILES:['index.html','assets/game.js','assets/kaity.webp'],registration:{scope},location:{origin:'https://village.example'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(k,v)=>events[k]=v};
 vm.runInNewContext(mediaSource,{self,Response,Headers});
 vm.runInNewContext(source,{self,caches,URL,Request,importScripts:()=>{},fetch:async r=>{calls++;if(!online)throw Error('Offline');return {ok:!fail,body:r.url||r}}});
 const fire=async(type,extra={})=>{let result;events[type]({...extra,waitUntil:p=>result=p,respondWith:p=>result=p});return await result};
 return {fire,stores,setOffline:()=>{online=false},calls:()=>calls,scope};}
test('installed game and art load with network unavailable; readiness confirmed',async()=>{const h=harness();await h.fire('install');await h.fire('activate');h.setOffline();const before=h.calls();assert.equal((await h.fire('fetch',{request:{url:h.scope,method:'GET',headers:new Headers(),mode:'navigate'}})).body,h.scope+'index.html');assert.equal((await h.fire('fetch',{request:{url:h.scope+'assets/kaity.webp',method:'GET',headers:new Headers(),mode:'cors'}})).body,h.scope+'assets/kaity.webp');let reply;await h.fire('message',{data:{type:'CHECK_OFFLINE'},ports:[{postMessage:r=>reply=r}]});assert.equal(reply.ready,true);assert.equal(h.calls(),before)});
test('failed asset download cannot complete installation',async()=>{await assert.rejects(harness(true).fire('install'),/unavailable/)});
test('activation only removes this game’s obsolete caches',async()=>{const h=harness();h.stores.set('unrelated',new Map());h.stores.set('isekai-village-old',new Map());await h.fire('install');await h.fire('activate');assert(h.stores.has('unrelated'));assert(!h.stores.has('isekai-village-old'))});

test('large offline install bounds concurrent downloads and preserves old cache on failure',async()=>{
 const events={};let active=0,peak=0,activated=false;const old=new Map([['old','saved']]);
 const self={OFFLINE_VERSION:'large',OFFLINE_FILES:Array.from({length:80},(_,i)=>String(i)),registration:{scope:'https://village.example/'},addEventListener:(k,v)=>events[k]=v,skipWaiting:async()=>{activated=true}};
 const caches={open:async()=>({put:async()=>{}}),keys:async()=>['isekai-village-old'],delete:async()=>old.clear()};
 vm.runInNewContext(source,{self,caches,URL,Request,importScripts:()=>{},fetch:async r=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));active--;if(r.url.endsWith('/12'))throw Error('lost network');return {ok:true}}});
 let completion;events.install({waitUntil:p=>completion=p});await assert.rejects(completion,/lost network/);assert.equal(peak,6);assert.equal(active,0);assert.equal(activated,false);assert.equal(old.get('old'),'saved');
});
