importScripts('./offline-files.js','./media-range.js');
const CACHE='isekai-village-'+self.OFFLINE_VERSION,MANIFEST='__offline-manifest__';
const absolute=path=>new URL(path,self.registration.scope).href;
const hex=bytes=>Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
const fingerprint=async response=>hex(await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer())).slice(0,32);
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE),files=self.OFFLINE_FILES,hashes=self.OFFLINE_HASHES||{};
 // Earlier offline copies stay intact until activation, so unchanged files are copied from them
 // instead of downloaded again. Copies with a manifest are trusted by hash; older copies without
 // one are checked by content first.
 const previous=[];
 for(const key of await caches.keys()){if(!key.startsWith('isekai-village-')||key===CACHE)continue;const store=await caches.open(key);let manifest=null;try{const m=await store.match(absolute(MANIFEST));manifest=m?await m.json():null}catch{}previous.push({store,manifest})}
 async function reuse(url,path){const want=hashes[path];if(!want)return false;for(const {store,manifest} of previous){const found=await store.match(url);if(!found)continue;if(manifest?manifest[path]!==want:await fingerprint(found)!==want)continue;await cache.put(url,found);return true}return false}
 async function download(url){for(let attempt=0;;attempt++){try{const response=await fetch(new Request(url,{credentials:'same-origin',cache:'reload',redirect:'error'}));if(!response.ok)throw Error('Offline asset unavailable');await cache.put(url,response);return}catch(error){if(attempt>=2)throw error;await new Promise(resolve=>setTimeout(resolve,500*(attempt+1)))}}}
 let cursor=0,failed=false;
 // A file already in this version's cache came from an earlier, interrupted attempt: keep it.
 async function worker(){while(!failed&&cursor<files.length){const path=files[cursor++],url=absolute(path);try{if(await cache.match(url))continue;if(await reuse(url,path))continue;await download(url)}catch(error){failed=true;throw error}}}
 const results=await Promise.allSettled(Array.from({length:Math.min(6,files.length)},worker));
 const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
 await cache.put(absolute(MANIFEST),new Response(JSON.stringify(hashes),{headers:{'Content-Type':'application/json'}}));
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('isekai-village-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate')return await cache.match(absolute('index.html'))||fetch(event.request);const cached=await cache.match(event.request,{ignoreSearch:true,ignoreVary:true});return cached?self.cachedMediaRange(cached,event.request.headers.get('Range')):fetch(event.request)})())});
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_OFFLINE')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const found=await Promise.all(self.OFFLINE_FILES.map(path=>cache.match(absolute(path))));const cached=found.filter(Boolean).length;event.ports[0]?.postMessage({ready:cached===found.length,files:cached,total:found.length,version:self.OFFLINE_VERSION})})())});
