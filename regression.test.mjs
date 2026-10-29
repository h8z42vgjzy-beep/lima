import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {unlinkSync} from 'node:fs';
import path from 'node:path';
import {app,png,wave} from './test-support.mjs';

test('Category prices stay explicit, uploads debit once, openings split exactly and files cannot bypass a paywall',async t=>{
 const h=await app(t),{alice,bob,eve,anon}=h;
 assert.equal((await alice.upload('upload-post',{category:''})).status,400);
 assert.equal((await alice.upload('upload-post',{expectedPrice:0})).status,409);
 const token=randomUUID(),created=await alice.upload('upload-post',{uploadToken:token});assert.equal(created.status,201,JSON.stringify(created.data));
 assert.equal(await alice.balance(),950);assert.equal((await alice.upload('upload-post',{uploadToken:token})).data.repeated,true);assert.equal(await alice.balance(),950);
 const id=created.data.mediaId;assert.equal((await anon.raw('/media/'+id)).status,401);assert.equal((await bob.raw('/media/'+id)).status,403);
 assert.equal((await bob.call('unlock',{media:id,expectedPrice:5})).status,409);
 const opened=await Promise.all([1,2,3].map(()=>bob.call('unlock',{media:id,expectedPrice:50})));assert.equal(opened.filter(r=>r.data.charged===50).length,1);
 assert.equal(await bob.balance(),950);assert.equal(await alice.balance(),975);
 const image=await bob.raw('/media/'+id);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/webp');assert.match(image.headers.get('cache-control'),/no-store/);
 const bytes=Buffer.from(await image.arrayBuffer());assert.equal(bytes.toString('ascii',8,12),'WEBP');
 await eve.call('unlock',{media:id,expectedPrice:50});assert.equal(await alice.balance(),1000);
 const income=(await alice.call('wallet')).data.entries.filter(e=>e.description==='50 % aus Foto-Freischaltung');assert.deepEqual(income.map(e=>e.amount),[25,25]);
 assert.equal(h.errors(),'');
});
test('Category creation is free; edit ownership, actual 10–1000 bounds and immutable photo prices are enforced',async t=>{
 const {alice,bob}=await app(t);
 for(const price of [0,9,1001,10.5])assert.equal((await alice.call('category',{name:'Invalid_'+price,price})).status,400);
 const c=await alice.call('category',{name:'Astrofotografie',price:70});assert.equal(c.status,201);assert.equal(await alice.balance(),1000);
 assert.equal((await bob.call('category-update',{category:c.data.id,name:'Fremd',price:90})).status,403);
 const p=await alice.upload('upload-post',{category:c.data.id,expectedPrice:70});assert.equal(p.status,201);
 await alice.call('category-update',{category:c.data.id,name:'Sternenlicht',price:110});
 const actual=(await bob.call('feed')).data.posts.find(x=>x.id===p.data.id);assert.equal(actual.category,'Sternenlicht');assert.equal(actual.media.open_price,70);
 assert.equal((await alice.upload('upload-post',{category:c.data.id,expectedPrice:70})).status,409);
});
test('Music is compressed, served with exact byte ranges, and stops being accessible after deletion',async t=>{
 const {alice,bob}=await app(t);const source=wave(2);
 const created=await alice.upload('upload-post',{expectedPrice:0},source,'my-sound.wav');assert.equal(created.status,201,JSON.stringify(created.data));assert.equal(await alice.balance(),1000);
 const id=created.data.mediaId,head=await bob.raw('/media/'+id,{method:'HEAD'});assert.equal(head.headers.get('content-type'),'audio/mpeg');const length=Number(head.headers.get('content-length'));assert.ok(length<source.length);
 const full=Buffer.from(await (await bob.raw('/media/'+id)).arrayBuffer()),parts=[];
 for(let start=0;start<length;start+=4096){const end=Math.min(length-1,start+4095),r=await bob.raw('/media/'+id,{headers:{Range:`bytes=${start}-${end}`}});assert.equal(r.status,206);assert.equal(r.headers.get('content-range'),`bytes ${start}-${end}/${length}`);parts.push(Buffer.from(await r.arrayBuffer()));}
 assert.deepEqual(Buffer.concat(parts),full);assert.equal((await bob.raw('/media/'+id,{headers:{Range:'bytes=999999-'}})).status,416);
 await alice.call('delete-post',{post:created.data.id});assert.equal((await bob.raw('/media/'+id)).status,410);
});
test('Missing photo bytes never debit either wallet and invalid image payloads are rejected',async t=>{
 const h=await app(t);const invalid=await h.alice.upload('upload-post',{},Buffer.from('<script>no image</script>'));assert.equal(invalid.status,400);assert.equal(await h.alice.balance(),1000);
 const p=await h.alice.upload();assert.equal(p.status,201);const file=h.one('SELECT file_name FROM media WHERE id=?',p.data.mediaId);unlinkSync(path.join(h.dir,'media',file.file_name));
 const before=await h.bob.balance();assert.equal((await h.bob.call('unlock',{media:p.data.mediaId,expectedPrice:50})).status,410);assert.equal(await h.bob.balance(),before);assert.equal(await h.alice.balance(),950);
});
test('Chat photo consent, send fee, free one-time viewing, 20-second server deadline and 28-day retention',async t=>{
 const h=await app(t),{alice,bob,eve}=h,request=await h.chat(alice,bob),token=randomUUID();
 assert.equal((await eve.upload('upload-chat',{request})).status,403);
 const photo=await alice.upload('upload-chat',{request,sendToken:token});assert.equal(photo.status,201,JSON.stringify(photo.data));assert.equal(await alice.balance(),780);
 assert.equal((await alice.upload('upload-chat',{request,sendToken:token})).status,200);assert.equal(await alice.balance(),780);
 const id=photo.data.mediaId;assert.equal((await bob.raw('/media/'+id)).status,410);
 const opened=await bob.call('chat-photo-open',{media:id});assert.equal(opened.status,200);assert.ok(opened.data.expires-opened.data.serverNow<=20000&&opened.data.expires-opened.data.serverNow>=19900);assert.equal(await bob.balance(),1000);
 assert.equal((await bob.raw(opened.data.url)).status,200);assert.equal((await bob.call('chat-photo-open',{media:id})).status,410);
 h.run('UPDATE photo_views SET expires=? WHERE media_id=?',Date.now()-1,id);assert.equal((await bob.raw(opened.data.url)).status,410);
 const other=await alice.upload('upload-chat',{request});const old=Date.now()-10*86400000;h.run('UPDATE media SET created=? WHERE id=?',old,other.data.mediaId);
 assert.equal((await bob.call('chat-photo-open',{media:other.data.mediaId})).status,200);
 h.run('UPDATE media SET expires=? WHERE id=?',Date.now()-1,other.data.mediaId);assert.equal((await bob.call('chat-photo-open',{media:other.data.mediaId})).status,410);
});
test('Multiplayer rules enforce participant, turns, version, explicit fees and server-owned winner',async t=>{
 const h=await app(t),{alice,bob,eve}=h,r=await h.chat(alice,bob);
 const c=await alice.call('game-create',{request:r,type:'tic-tac-toe',expectedCost:5,sendToken:randomUUID()});assert.equal(c.status,201);let g=c.data.game;
 assert.equal((await eve.call('game-action',{game:g.id,version:0,action:'accept',expectedCost:5})).status,403);
 g=(await bob.call('game-action',{game:g.id,version:0,action:'accept',expectedCost:5})).data.game;
 assert.equal((await bob.call('game-action',{game:g.id,version:g.version,action:'move',cell:0})).status,409);
 for(const [who,cell]of [[alice,0],[bob,3],[alice,1],[bob,4],[alice,2]]){const result=await who.call('game-action',{game:g.id,version:g.version,action:'move',cell,winner:eve.id,score:999999});assert.equal(result.status,200);g=result.data.game;}
 assert.equal(g.status,'finished');assert.equal(g.winner,alice.id);assert.equal(await alice.balance(),795);assert.equal(await bob.balance(),995);
 assert.equal((await alice.call('game-action',{game:g.id,version:g.version,action:'move',cell:6})).status,409);
 const stats=(await alice.call('studio/overview')).data.metrics;assert.equal(stats.wins,1);assert.equal(stats.played,1);assert.equal(stats.dinoBest,0);
});
test('Reported deleted text is reviewable only by moderators inside its report',async t=>{
 const h=await app(t),{alice,bob,eve,admin}=h,r=await h.chat(alice,bob);
 await alice.call('message',{request:r,body:'Evidence retained for moderation.',expectedCost:5,sendToken:randomUUID()});const m=(await bob.call('messages?request='+r)).data.messages[0];
 const reported=await bob.call('report',{targetType:'message',target:m.id,reason:'Test evidence'});assert.equal(reported.status,201);
 assert.equal((await bob.call('message-delete',{message:m.id,scope:'everyone'})).status,403);
 assert.equal((await alice.call('message-delete',{message:m.id,scope:'everyone'})).status,200);
 assert.equal((await bob.call('messages?request='+r)).data.messages.length,0);
 assert.equal((await eve.call('admin/report?id='+reported.data.id)).status,403);
 const reviewed=(await admin.call('admin/report?id='+reported.data.id)).data;assert.equal(reviewed.conversation[0].body,'Evidence retained for moderation.');
 h.run('UPDATE message_deletion_evidence SET expires=0');assert.equal((await admin.call('admin/report?id='+reported.data.id)).data.conversation[0].body,'');
});
test('Reported photo access is scoped to the reported conversation, including block revocation',async t=>{
 const h=await app(t),{alice,bob,eve,admin}=h,r=await h.chat(alice,bob),other=await h.chat(alice,eve);
 const p=await alice.upload('upload-chat',{request:r}),foreign=await alice.upload('upload-chat',{request:other});
 const report=await bob.call('report',{targetType:'user',target:alice.id,reason:'This conversation only.'});assert.equal(report.status,201);
 const view=(await admin.call('admin/report?id='+report.data.id)).data;assert.deepEqual(view.media.map(m=>m.id),[p.data.mediaId]);
 assert.equal((await admin.raw(`/api/admin/media?report=${report.data.id}&media=${foreign.data.mediaId}`)).status,403);
 await bob.call('block',{target:alice.id});assert.equal((await bob.call('messages?request='+r)).status,403);assert.equal((await bob.raw('/media/'+p.data.mediaId)).status,404);
});

test('Live Dino synchronizes two authorised streams, ignores client physics and cancels on a block',async t=>{
 const h=await app(t),{alice,bob,eve}=h,request=await h.chat(alice,bob);
 const created=await alice.call('game-create',{request,type:'dino-run',expectedCost:5,sendToken:randomUUID()});assert.equal(created.status,201);const game=created.data.game;
 assert.equal((await eve.raw('/api/dino-stream?game='+game.id)).status,403);
 await bob.call('game-action',{game:game.id,version:game.version,action:'accept',expectedCost:5});
 async function stream(actor){const abort=new AbortController();h.aborts.push(abort);const response=await fetch(h.base+'/api/dino-stream?game='+game.id,{headers:{Cookie:actor.cookie},signal:abort.signal});assert.equal(response.status,200);const reader=response.body.getReader();let buffer='',last=null;const waiting=[];
  const pump=(async()=>{try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=new TextDecoder().decode(value);let pos;while((pos=buffer.indexOf('\n\n'))>=0){const packet=buffer.slice(0,pos);buffer=buffer.slice(pos+2);const line=packet.split('\n').find(l=>l.startsWith('data: '));if(!line)continue;last=JSON.parse(line.slice(6));for(const item of [...waiting])if(item.match(last)){clearTimeout(item.timer);waiting.splice(waiting.indexOf(item),1);item.resolve(last);}}}}catch(e){if(!abort.signal.aborted)throw e;}})();
  return {next(match){if(last&&match(last))return Promise.resolve(last);return new Promise((resolve,reject)=>{const item={match,resolve,timer:setTimeout(()=>reject(Error('No live event: '+JSON.stringify(last))),8000)};waiting.push(item);});},close(){abort.abort();return pump;}};
 }
 const a=await stream(alice),b=await stream(bob);const startA=await a.next(s=>s.phase==='countdown'),startB=await b.next(s=>s.phase==='countdown');assert.equal(startA.startAt,startB.startAt);assert.deepEqual(startA.obstacles,startB.obstacles);
 await a.next(s=>s.phase==='running');const jumps=await Promise.all([alice.call('dino-jump',{game:game.id,seq:1,score:99999999,y:99999}),bob.call('dino-jump',{game:game.id,seq:1})]);assert.ok(jumps.every(r=>r.status===200));
 const state=await a.next(s=>s.players.every(p=>p.seq===1&&p.y>0));assert.ok(state.players.every(p=>p.y<150));assert.equal((await alice.call('dino-jump',{game:game.id,seq:1})).data.repeated,true);
 await bob.call('block',{target:alice.id});assert.equal((await a.next(s=>s.phase==='cancelled')).winner,null);assert.equal((await alice.call('studio/overview')).data.metrics.dinoBest,0);
 await a.close();await b.close();
});
