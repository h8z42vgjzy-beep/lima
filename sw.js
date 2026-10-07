/* Only a generic offline page and public icons are cached. No user content. */
'use strict';
const CACHE='feindschaft-offline-v8';
const FILES=['/offline.html','/pwa.css','/app-icon-192.png','/app-icon-512.png','/app-icon-maskable.png','/apple-touch-icon.png'];
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('feindschaft-offline-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(FILES.includes(url.pathname)){event.respondWith(caches.match(url.pathname).then(cached=>cached||fetch(request)));return;}
 if(request.mode!=='navigate'||url.pathname!=='/')return;
 event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));
});
