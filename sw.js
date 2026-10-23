/* Pen Game v5.0 PWA shell. Online multiplayer still requires internet. */
const SHELL='pen2-v5-shell',RUNTIME='pen2-v5-runtime';
const ROOT_FILES=['./','./index.html','./manifest.webmanifest','./icon.svg'];
const LIBS=['https://cdnjs.cloudflare.com/ajax/libs/matter-js/0.19.0/matter.min.js','https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js','https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js'];
const inScope=path=>new URL(path,self.registration.scope).href;
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(SHELL);await Promise.all([...ROOT_FILES.map(path=>cache.add(inScope(path)).catch(()=>null)),...LIBS.map(url=>cache.add(url).catch(()=>null))]);await self.skipWaiting()})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keep=new Set([SHELL,RUNTIME]);await Promise.all((await caches.keys()).filter(k=>k.startsWith('pen2-v5-')&&!keep.has(k)).map(k=>caches.delete(k)));await self.clients.claim()})()));
self.addEventListener('message',event=>{if(event.data?.type==='SKIP_WAITING')self.skipWaiting()});
self.addEventListener('fetch',event=>{
 const request=event.request;if(request.method!=='GET')return;const url=new URL(request.url);
 if(request.mode==='navigate'){event.respondWith((async()=>{try{const response=await fetch(request);if(response.ok)(await caches.open(SHELL)).put(inScope('./index.html'),response.clone()).catch(()=>{});return response}catch(_){return(await caches.match(request))||(await caches.match(inScope('./index.html')))||new Response('Open Pen Game once online before using it offline.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})}})());return}
 if(url.origin===self.location.origin){event.respondWith((async()=>{const cache=await caches.open(RUNTIME),cached=await cache.match(request);if(cached)return cached;try{const response=await fetch(request);if(response.ok)cache.put(request,response.clone()).catch(()=>{});return response}catch(_){return cached||Response.error()}})());return}
 if(request.destination==='script'&&(url.hostname==='cdnjs.cloudflare.com'||url.hostname==='cdn.jsdelivr.net'))event.respondWith((async()=>{const cache=await caches.open(SHELL),cached=await cache.match(request);if(cached)return cached;try{const response=await fetch(request);if(response&&(response.ok||response.type==='opaque'))cache.put(request,response.clone()).catch(()=>{});return response}catch(_){return Response.error()}})());
});
