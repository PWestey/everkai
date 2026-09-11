import {createHash} from 'node:crypto';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFile} from 'node:fs/promises';
const mediaSource=await readFile(new URL('../public/media-range.js',import.meta.url),'utf8');
const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
function harness(fail=false){const events={},stores=new Map();let online=true,calls=0;
 const scope='https://village.example/';
 const caches={open:async key=>{if(!stores.has(key))stores.set(key,new Map());const m=stores.get(key);return {put:async(k,v)=>m.set(typeof k==='string'?k:k.url,v),match:async k=>{const v=m.get(typeof k==='string'?k:k.url);return v?.clone?v.clone():v},delete:async k=>m.delete(typeof k==='string'?k:k.url),keys:async()=>[...m.keys()].map(url=>({url}))}},has:async k=>stores.has(k),keys:async()=>[...stores.keys()],delete:async k=>stores.delete(k)};
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
 const caches={open:async()=>({put:async()=>{},match:async()=>undefined,delete:async()=>{},keys:async()=>[]}),has:async()=>false,keys:async()=>['isekai-village-old'],delete:async()=>old.clear()};
 vm.runInNewContext(source,{self,caches,URL,Request,Response,Headers,crypto,setTimeout,importScripts:()=>{},fetch:async r=>{active++;peak=Math.max(peak,active);await new Promise(resolve=>setTimeout(resolve,1));active--;if(r.url.endsWith('/12'))throw Error('lost network');return {ok:true}}});
 let completion;events.install({waitUntil:p=>completion=p});await assert.rejects(completion,/lost network/);assert.equal(peak,6);assert.equal(active,0);assert.equal(activated,false);assert.equal(old.get('old'),'saved');
});

const short=body=>createHash('sha256').update(body).digest('hex').slice(0,32);
const SCOPE='https://village.example/';
function updateHarness({files,version='v2',stores:seed={},failOnce=new Set()}){
 const events={},stores=new Map(),requests=[];
 for(const [key,entries] of Object.entries(seed))stores.set(key,new Map(Object.entries(entries).map(([k,v])=>[SCOPE+k,v])));
 const caches={open:async key=>{if(!stores.has(key))stores.set(key,new Map());const m=stores.get(key);return {put:async(k,v)=>m.set(typeof k==='string'?k:k.url,v),match:async k=>{const v=m.get(typeof k==='string'?k:k.url);return v?.clone?v.clone():v},delete:async k=>m.delete(typeof k==='string'?k:k.url),keys:async()=>[...m.keys()].map(url=>({url}))}},has:async k=>stores.has(k),keys:async()=>[...stores.keys()],delete:async k=>stores.delete(k)};
 const self={OFFLINE_VERSION:version,OFFLINE_FILES:Object.keys(files),OFFLINE_HASHES:Object.fromEntries(Object.entries(files).map(([k,v])=>[k,short(v)])),registration:{scope:SCOPE},location:{origin:'https://village.example'},clients:{claim:async()=>{}},skipWaiting:async()=>{},addEventListener:(k,v)=>events[k]=v};
 vm.runInNewContext(mediaSource,{self,Response,Headers});
 vm.runInNewContext(source,{self,caches,URL,Request,Response,Headers,crypto,setTimeout,importScripts:()=>{},fetch:async r=>{const path=r.url.slice(SCOPE.length);requests.push(path);if(failOnce.has(path)){failOnce.delete(path);throw Error('flaky network')}return new Response(files[path])}});
 const run=type=>new Promise((resolve,reject)=>events[type]({waitUntil:p=>p.then(resolve,reject)}));
 const text=async(store,path)=>{const r=stores.get(store)?.get(SCOPE+path);return r?await r.clone().text():undefined};
 const check=()=>new Promise(resolve=>events.message({data:{type:'CHECK_OFFLINE'},ports:[{postMessage:resolve}],waitUntil:()=>{}}));
 return {install:()=>run('install'),activate:()=>run('activate'),requests,stores,text,check};
}
const ledger=obj=>new Response(JSON.stringify(Object.fromEntries(Object.entries(obj).map(([k,v])=>[k,short(v)]))));
test('an update downloads only changed files and keeps the running copy until activation',async()=>{
 const h=updateHarness({files:{'index.html':'<new shell>','assets/game.js':'game-code','assets/clip.mp4':'CLIP'},stores:{'isekai-village-files':{'index.html':new Response('<old shell>'),'assets/game.js':new Response('game-code'),'assets/clip.mp4':new Response('CLIP'),'assets/removed.png':new Response('gone'),'__offline-ledger__':ledger({'index.html':'<old shell>','assets/game.js':'game-code','assets/clip.mp4':'CLIP','assets/removed.png':'gone'})}}});
 await h.install();
 assert.deepEqual(h.requests,['index.html']);
 assert.equal(await h.text('isekai-village-files','index.html'),'<old shell>','running version keeps its shell until activation');
 assert.equal(await h.text('isekai-village-staging-v2','index.html'),'<new shell>');
 assert.equal((await h.check()).ready,true);
 await h.activate();
 assert.equal(await h.text('isekai-village-files','index.html'),'<new shell>');
 assert.equal(await h.text('isekai-village-files','assets/removed.png'),undefined,'files dropped from the bundle are pruned');
 assert.ok(!h.stores.has('isekai-village-staging-v2'));
 assert.equal(JSON.parse(await h.text('isekai-village-files','__offline-ledger__'))['index.html'],short('<new shell>'));
});
test('files from a pre-ledger offline copy are verified and moved, never duplicated',async()=>{
 const legacy='isekai-village-21bbe20fcc723be0';
 const h=updateHarness({files:{'assets/game.js':'game-code','assets/clip.mp4':'NEW-CLIP'},stores:{[legacy]:{'assets/game.js':new Response('game-code'),'assets/clip.mp4':new Response('OLD-CLIP')}}});
 await h.install();
 assert.deepEqual(h.requests,['assets/clip.mp4']);
 assert.equal(await h.text('isekai-village-files','assets/game.js'),'game-code');
 assert.equal(h.stores.get(legacy).has(SCOPE+'assets/game.js'),false,'moved out of the old copy');
 assert.equal(await h.text('isekai-village-files','assets/clip.mp4'),'NEW-CLIP');
 await h.activate();assert.ok(!h.stores.has(legacy));
});
test('an interrupted install resumes without downloading finished files again',async()=>{
 const h=updateHarness({files:{a:'A',b:'B',c:'C'},stores:{'isekai-village-files':{a:new Response('A'),b:new Response('B'),'__offline-ledger__':ledger({a:'A',b:'B'})}}});
 await h.install();assert.deepEqual(h.requests,['c']);assert.equal((await h.check()).files,3);
});
test('a transient download failure is retried instead of abandoning the install',async()=>{
 const h=updateHarness({files:{a:'A',b:'B'},failOnce:new Set(['b'])});
 await h.install();assert.deepEqual([...h.requests].sort(),['a','b','b']);assert.equal(await h.text('isekai-village-files','b'),'B');
});
