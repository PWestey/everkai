importScripts('./offline-files.js','./media-range.js');
const CACHE='isekai-village-'+self.OFFLINE_VERSION;
const absolute=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{
 const cache=await caches.open(CACHE);let cursor=0,failed=false;
 async function download(){while(!failed&&cursor<self.OFFLINE_FILES.length){const path=self.OFFLINE_FILES[cursor++];try{const response=await fetch(new Request(absolute(path),{credentials:'same-origin',cache:'reload',redirect:'error'}));if(!response.ok)throw Error('Offline asset unavailable');await cache.put(absolute(path),response)}catch(error){failed=true;throw error}}}
 const results=await Promise.allSettled(Array.from({length:Math.min(6,self.OFFLINE_FILES.length)},download));
 const failure=results.find(result=>result.status==='rejected');if(failure)throw failure.reason;
 await self.skipWaiting();
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const key of await caches.keys())if(key.startsWith('isekai-village-')&&key!==CACHE)await caches.delete(key);await self.clients.claim()})()));
self.addEventListener('fetch',event=>{const url=new URL(event.request.url);if(event.request.method!=='GET'||url.origin!==self.location.origin||!url.href.startsWith(self.registration.scope))return;event.respondWith((async()=>{const cache=await caches.open(CACHE);if(event.request.mode==='navigate')return await cache.match(absolute('index.html'))||fetch(event.request);const cached=await cache.match(event.request,{ignoreSearch:true,ignoreVary:true});return cached?self.cachedMediaRange(cached,event.request.headers.get('Range')):fetch(event.request)})())});
self.addEventListener('message',event=>{if(event.data?.type==='CHECK_OFFLINE')event.waitUntil((async()=>{const cache=await caches.open(CACHE);const found=await Promise.all(self.OFFLINE_FILES.map(path=>cache.match(absolute(path))));const cached=found.filter(Boolean).length;event.ports[0]?.postMessage({ready:cached===found.length,files:cached,total:found.length,version:self.OFFLINE_VERSION})})())});
