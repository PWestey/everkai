import {createHash} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const mediaSource=await readFile(new URL('../public/media-range.js',import.meta.url),'utf8');
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function harness(fail=false){const events={},stores=new Map();let online=true,calls=0;
 const scope='https://village.example/';
 const caches={open:async key=>{if(!stores.has(key))stores.set(key,new Map());const m=stores.get(key);return {put:async(k,v)=>m.set(k,v),match:async k=>{const v=m.get(typeof k==='string'?k:k.url);return v?.clone?v.clone():v}}} ,keys:async()=>[...stores.keys()],delete:async k=>stores.delete(k)};
 const self={OFFLINE_VERSION:'test',OFFLINE_FILES:['index.html','assets/game.js','assets/kaity.webp'],registration:{scope},location:{origin:'https://village.example'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(k,v)=>events[k]=v};
 vm.runInNewContext(mediaSource,{self,Response,Headers});
 vm.runInNewContext(source,{self,caches,URL,Request,Response,Headers,crypto,setTimeout,importScripts:()=>{},fetch:async r=>{calls++;if(!online)throw Error('Offline');return {ok:!fail,body:r.url||r}}});
 const fire=async(type,extra={})=>{let result;events[type]({...extra,waitUntil:p=>result=p,respondWith:p=>result=p});return await result};
 return {fire,stores,setOffline:()=>{online=false},calls:()=>calls,scope};}
test('installed game and art load with network unavailable; readiness confirmed',async()=>{const h=harness();await h.fire('install');await h.fire('activate');h.setOffline();const before=h.calls();assert.equal((await h.fire('fetch',{request:{url:h.scope,method:'GET',headers:new Headers(),mode:'navigate'}})).body,h.scope+'index.html');assert.equal((await h.fire('fetch',{request:{url:h.scope+'assets/kaity.webp',method:'GET',headers:new Headers(),mode:'cors'}})).body,h.scope+'assets/kaity.webp');let reply;await h.fire('message',{data:{type:'CHECK_OFFLINE'},ports:[{postMessage:r=>reply=r}]});assert.equal(reply.ready,true);assert.equal(h.calls(),before)});
test('failed asset download cannot complete installation',async()=>{await assert.rejects(harness(true).fire('install'),/unavailable/)});
test('activation only removes this game’s obsolete caches',async()=>{const h=harness();h.stores.set('unrelated',new Map());h.stores.set('isekai-village-old',new Map());await h.fire('install');await h.fire('activate');assert(h.stores.has('unrelated'));assert(!h.stores.has('isekai-village-old'))});

test('large offline install bounds concurrent downloads and preserves old cache on failure',async()=>{
 const events={};let active=0,peak=0,activated=false;const old=new Map([['old','saved']]);
 const self={OFFLINE_VERSION:'large',OFFLINE_FILES:Array.from({length:80},(_,i)=>String(i)),registration:{scope:'https://village.example/'},addEventListener:(k,v)=>events[k]=v,skipWaiting:async()=>{activated=true}};
 const caches={open:async()=>({put:async()=>{},match:async()=>undefined}),keys:async()=>['isekai-village-old'],delete:async()=>old.clear()};
 vm.runInNewContext(source,{self,caches,URL,Request,Response,Headers,crypto,setTimeout,importScripts:()=>{},fetch:async r=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));active--;if(r.url.endsWith('/12'))throw Error('lost network');return {ok:true}}});
 let completion;events.install({waitUntil:p=>completion=p});await assert.rejects(completion,/lost network/);assert.equal(peak,6);assert.equal(active,0);assert.equal(activated,false);assert.equal(old.get('old'),'saved');
});

const short=body=>createHash('sha256').update(body).digest('hex').slice(0,32);
function updateHarness({files,version='v2',previous={},current={},failOnce=new Set()}){
 const events={},stores=new Map(),scope='https://village.example/',requests=[];
 const fill=entries=>new Map(Object.entries(entries).map(([k,v])=>[scope+k,v]));
 for(const [key,entries] of Object.entries(previous))stores.set(key,fill(entries));
 stores.set('isekai-village-'+version,fill(current));
 const caches={open:async key=>{if(!stores.has(key))stores.set(key,new Map());const m=stores.get(key);return {put:async(k,v)=>m.set(typeof k==='string'?k:k.url,v),match:async k=>{const v=m.get(typeof k==='string'?k:k.url);return v?.clone?v.clone():v}}},keys:async()=>[...stores.keys()],delete:async k=>stores.delete(k)};
 const self={OFFLINE_VERSION:version,OFFLINE_FILES:Object.keys(files),OFFLINE_HASHES:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,short(v)])),registration:{scope},location:{origin:'https://village.example'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(k,v)=>events[k]=v};
 vm.runInNewContext(mediaSource,{self,Response,Headers});
 vm.runInNewContext(source,{self,caches,URL,Request,Response,Headers,crypto,setTimeout,importScripts:()=>{},fetch:async r=>{const path=r.url.slice(scope.length);requests.push(path);if(failOnce.has(path)){failOnce.delete(path);throw Error('flaky network')}return new Response(files[path])}});
 const install=()=>new Promise((resolve,reject)=>events.install({waitUntil:p=>p.then(resolve,reject)}));
 const body=async path=>{const r=stores.get('isekai-village-'+version).get(scope+path);return r?await r.clone().text():undefined};
 return {install,requests,body};
}
test('an update copies unchanged files from the previous offline copy and downloads only what changed',async()=>{
 const files={'index.html':'<new shell>','assets/game.js':'game-code','assets/clip.mp4':'CLIP-BYTES'};
 const manifest={'index.html':short('<old shell>'),'assets/game.js':short('game-code'),'assets/clip.mp4':short('CLIP-BYTES')};
 const h=updateHarness({files,previous:{'isekai-village-v1':{'index.html':new Response('<old shell>'),'assets/game.js':new Response('game-code'),'assets/clip.mp4':new Response('CLIP-BYTES'),'__offline-manifest__':new Response(JSON.stringify(manifest))}}});
 await h.install();
 assert.deepEqual(h.requests,['index.html']);
 assert.equal(await h.body('index.html'),'<new shell>');assert.equal(await h.body('assets/game.js'),'game-code');assert.equal(await h.body('assets/clip.mp4'),'CLIP-BYTES');
 assert.deepEqual(JSON.parse(await h.body('__offline-manifest__')),Object.fromEntries(Object.entries(files).map(([k,v])=>[k,short(v)])));
});
test('offline copies made before manifests existed are checked by content before reuse',async()=>{
 const h=updateHarness({files:{'assets/game.js':'game-code','assets/clip.mp4':'NEW-CLIP'},previous:{'isekai-village-legacy':{'assets/game.js':new Response('game-code'),'assets/clip.mp4':new Response('OLD-CLIP')}}});
 await h.install();
 assert.deepEqual(h.requests,['assets/clip.mp4']);assert.equal(await h.body('assets/clip.mp4'),'NEW-CLIP');assert.equal(await h.body('assets/game.js'),'game-code');
});
test('an interrupted install resumes without downloading finished files again',async()=>{
 const h=updateHarness({files:{a:'A',b:'B',c:'C'},current:{a:new Response('A'),b:new Response('B')}});
 await h.install();assert.deepEqual(h.requests,['c']);assert.equal(await h.body('c'),'C');
});
test('a transient download failure is retried instead of abandoning the install',async()=>{
 const h=updateHarness({files:{a:'A',b:'B'},failOnce:new Set(['b'])});
 await h.install();assert.deepEqual([...h.requests].sort(),['a','b','b']);assert.equal(await h.body('b'),'B');
});
