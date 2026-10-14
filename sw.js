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
self.addEventListener('push',event=>event.waitUntil((async()=>{
 let data;try{data=event.data.json();}catch{return;}
 if(!data||!/^\/\?notice=\d+$/.test(data.url))return;
 await self.registration.showNotification('Feindschaft',{body:data.body,icon:'/app-icon-192.png',badge:'/app-icon-192.png',tag:data.tag,data:{url:data.url,recipient:data.recipient}});
})()));
self.addEventListener('notificationclick',event=>{
 event.notification.close();const url=new URL(event.notification.data?.url||'/',self.location.origin);
 if(url.origin!==self.location.origin)return;
 event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(c=>new URL(c.url).origin===url.origin);if(client){await client.focus();client.postMessage({type:'open-notice',url:url.href});}else await self.clients.openWindow(url.href);})());
});
self.addEventListener('message',event=>{if(event.data?.type==='clear-notifications')event.waitUntil(self.registration.getNotifications().then(items=>items.forEach(n=>n.close())));});
