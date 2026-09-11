importScripts('./offline-files.js','./media-range.js');
// One shared file cache holds every offline file, with a ledger of each file's fingerprint, so an
// update never keeps two copies of the bundle: unchanged files are left alone, files moved out of a
// pre-ledger versioned cache are deleted from it as they go, and only files whose content changed
// at an existing URL are staged until activation so the running version keeps working meanwhile.
const VERSION=self.OFFLINE_VERSION,SHARED='isekai-village-files',STAGING='isekai-village-staging-'+VERSION,LEDGER='__offline-ledger__';
const LEGACY=/^isekai-village-[0-9a-f]{16}$/;
const absolute=path=>new URL(path,self.registration.scope).href;
const relative=url=>url.slice(self.registration.scope.length);
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const fingerprint=async response=>hex(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer())).slice(0,32);
const readLedger=async shared=>{try{const r=await shared.match(absolute(LEDGER));return r?await r.json():{}}catch{return {}}};
const writeLedger=(shared,ledger)=>shared.put(absolute(LEDGER),new Response(JSON.stringify(ledger),{headers:{'Content-Type':'application/json'}}));
async function download(url){for(let attempt=0;;attempt++){try{const response=await fetch(new Request(url,{credentials:'same-origin',cache:'reload',redirect:'error'}));if(!response.ok)throw Error('Offline asset unavailable');return response}catch(error){if(attempt>=2)throw error;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}}}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const files=self.OFFLINE_FILES,hashes=self.OFFLINE_HASHES||{};
 const shared=await caches.open(SHARED),staging=await caches.open(STAGING),ledger=await readLedger(shared);
 const legacy=[];for(const key of await caches.keys())if(LEGACY.test(key))legacy.push(await caches.open(key));
 let saving=Promise.resolve(),pending=0;
 const save=force=>{if(!force&&++pending<50)return saving;pending=0;return saving=saving.then(()=>writeLedger(shared,ledger))};
 async function satisfy(path){
  const url=absolute(path),want=hashes[path],existing=await shared.match(url);
  if(existing){
   if(!want||ledger[path]===want)return;
   if(!ledger[path]&&await fingerprint(existing)===want){ledger[path]=want;return save()}
   // Same URL, new content: stage it (an interrupted attempt may already have).
   if(!await staging.match(url))await staging.put(url,await download(url));
   return;
  }
  for(const store of legacy){const found=await store.match(url);if(!found)continue;if(want&&await fingerprint(found)!==want)continue;await shared.put(url,found);await store.delete(url);if(want)ledger[path]=want;return save()}
  await shared.put(url,await download(url));if(want)ledger[path]=want;return save();
 }
 let cursor=0,failed=false;
 async function worker(){while(!failed&&cursor<files.length){const path=files[cursor++];try{await satisfy(path)}catch(error){failed=true;throw error}}}
 const results=await Promise.allSettled(Array.from({length:Math.min(6,files.length)},worker));
 await save(true);
 const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 const hashes=self.OFFLINE_HASHES||{},wanted=new Set(self.OFFLINE_FILES.map(absolute));
 const shared=await caches.open(SHARED),ledger=await readLedger(shared);
 if(await caches.has(STAGING)){const staging=await caches.open(STAGING);for(const request of await staging.keys()){await shared.put(request,await staging.match(request));const path=relative(request.url);if(hashes[path])ledger[path]=hashes[path]}await caches.delete(STAGING)}
 for(const request of await shared.keys()){if(request.url===absolute(LEDGER)||wanted.has(request.url))continue;await shared.delete(request);delete ledger[relative(request.url)]}
 await writeLedger(shared,ledger);
 for(const key of await caches.keys())if(key.startsWith('isekai-village-')&&key!==SHARED)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const shared=await caches.open(SHARED);if(event.request.mode==='navigate')return await shared.match(absolute('index.html'))||fetch(event.request);const cached=await shared.match(event.request,{ignoreSearch:true,ignoreVary:true});return cached?self.cachedMediaRange(cached,event.request.headers.get('Range')):fetch(event.request)})())});
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_OFFLINE')event.waitUntil((async()=>{const files=self.OFFLINE_FILES,hashes=self.OFFLINE_HASHES||{};const shared=await caches.open(SHARED),ledger=await readLedger(shared),staging=await caches.has(STAGING)?await caches.open(STAGING):null;let cached=0;for(const path of files){const url=absolute(path),want=hashes[path];if(want?(ledger[path]===want&&await shared.match(url))||(staging&&await staging.match(url)):await shared.match(url))cached++}event.ports[0]?.postMessage({ready:cached===files.length,files:cached,total:files.length,version:VERSION})})())});
