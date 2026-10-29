/* Cache application assets, never account data, private media or API responses. */
'use strict';
const CACHE='feindschaft-offline-v11';
const FILES=['/offline.html','/offline.js','/pwa.css','/design-system.css','/theme-boot.js','/app-icon-192.png','/app-icon-512.png','/app-icon-maskable.png','/apple-touch-icon.png'];
const VISITED=new Set([...FILES,'/style.css','/night.css','/features.css','/action.css','/activity.css','/moderation-notices.css','/message-delete.css','/app.js','/features.js','/studio.js','/media-client.js','/translations.js','/studio-translations.js','/i18n.js','/music-player.js','/dino-client.js','/discovery-effects.js','/pwa.js','/activity-ui.js','/moderation-notices.js','/message-delete-client.js','/reset-live.js','/reset-animation.js','/reset-animation.css','/reset-audio.js','/art/night.webp','/art/pride.webp','/art/forest.webp','/art/ice.webp','/art/night.svg','/art/pride.svg','/art/forest.svg','/art/ice.svg','/art/dino.svg','/art/chess.svg','/art/arcade.svg','/manifest.webmanifest']);
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith('feindschaft-offline-')&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('fetch',event=>{
  const request=event.request,url=new URL(request.url);
  if(request.method!=='GET'||url.origin!==self.location.origin)return;
  if(VISITED.has(url.pathname)){
    event.respondWith((async()=>{const cache=await caches.open(CACHE),cached=await cache.match(url.pathname);
      if(cached)return cached;
      const response=await fetch(request);if(response.ok){await cache.put(url.pathname,response.clone());}return response;})());return;
  }
  if(request.mode==='navigate'&&url.pathname==='/')event.respondWith(fetch(request).catch(()=>caches.match('/offline.html')));
});
self.addEventListener('push',event=>event.waitUntil((async()=>{
  let data;try{data=event.data.json();}catch{return;}
  if(!data||!/^\/\?notice=\d+$/.test(data.url))return;
  await self.registration.showNotification('Feindschaft',{body:data.body,icon:'/app-icon-192.png',badge:'/app-icon-192.png',tag:data.tag,data:{url:data.url,recipient:data.recipient}});
})()));
self.addEventListener('notificationclick',event=>{
  event.notification.close();const url=new URL(event.notification.data?.url||'/',self.location.origin);
  if(url.origin!==self.location.origin)return;
  event.waitUntil((async()=>{const windows=await self.clients.matchAll({type:'window',includeUncontrolled:true});const client=windows.find(c=>new URL(c.url).origin===url.origin);
    if(client){await client.focus();client.postMessage({type:'open-notice',url:url.href});}else await self.clients.openWindow(url.href);})());
});
self.addEventListener('message',event=>{
  if(event.data?.type==='skip-waiting')self.skipWaiting();
  if(event.data?.type==='clear-notifications')event.waitUntil(self.registration.getNotifications().then(items=>items.forEach(n=>n.close())));
});
