import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const read=name=>readFileSync(new URL('public/'+name,import.meta.url));
test('Installable manifest has existing PNG icons, root scope and standalone display',()=>{
 const manifest=JSON.parse(read('manifest.webmanifest'));
 assert.equal(manifest.display,'standalone');assert.equal(manifest.scope,'/');assert.equal(manifest.start_url,'/');
 for(const icon of manifest.icons){const png=read(icon.src.slice(1));assert.equal(png.subarray(1,4).toString(),'PNG');const size=png.readUInt32BE(16);assert.equal(icon.sizes,`${size}x${size}`);}
 assert.ok(manifest.icons.some(i=>i.purpose==='maskable'));
 const html=read('index.html').toString();assert.match(html,/rel="manifest"/);assert.match(html,/id="install-app"/);
});
test('Offline worker caches only public fallback and icons; bypasses API, stream and private media',async()=>{
 const handlers={},saved=[],deleted=[];
 const offline={offline:true},caches={open:async()=>({addAll:async urls=>saved.push(...urls)}),keys:async()=>['unrelated-cache','feindschaft-offline-old','feindschaft-offline-v8'],delete:async key=>deleted.push(key),match:async()=>offline};
 const self={location:{origin:'https://example.test'},clients:{claim:async()=>{}},addEventListener:(name,fn)=>handlers[name]=fn};
 vm.runInNewContext(read('sw.js').toString(),{self,caches,URL,fetch:async()=>{throw Error('offline');}});
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;
 assert.deepEqual(saved.sort(),['/offline.html','/pwa.css','/app-icon-192.png','/app-icon-512.png','/app-icon-maskable.png','/apple-touch-icon.png'].sort());
 handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['feindschaft-offline-old']);
 for(const path of ['/api/me','/api/messages','/api/reset-stream','/media/1','/reset-film.mp4']){
  let intercepted=false;handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test'+path},respondWith:()=>intercepted=true});assert.equal(intercepted,false,path);
 }
 handlers.fetch({request:{method:'GET',mode:'navigate',url:'https://example.test/'},respondWith:p=>pending=p});assert.equal(await pending,offline);
});
