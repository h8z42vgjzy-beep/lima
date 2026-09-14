import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { mkdtempSync, rmSync, readdirSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { randomUUID } from 'node:crypto';
import path from 'node:path';

const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZcAAAAASUVORK5CYII=','base64');
async function harness(t){
  const dir=mkdtempSync(path.join(tmpdir(),'feindschaft-regression-'));
  const proc=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,PORT:'0',F_DATA_DIR:dir,F_STORAGE_BYTES:String(1024**3)},stdio:['ignore','pipe','pipe']});
  let errors='';proc.stderr.on('data',x=>errors+=x);
  const port=await new Promise((resolve,reject)=>{proc.stdout.on('data',x=>{const m=/0\.0\.0\.0:(\d+)/.exec(String(x));if(m)resolve(m[1]);});proc.once('error',reject);proc.once('exit',()=>reject(Error(errors)));});
  const base='http://127.0.0.1:'+port;
  const db=new DatabaseSync(path.join(dir,'feindschaft.sqlite'));
  t.after(async()=>{db.close();if(proc.exitCode===null){const done=new Promise(r=>proc.once('exit',r));proc.kill('SIGTERM');await done;}rmSync(dir,{recursive:true,force:true});});
  function client(){return {cookie:'',id:null,async raw(route,{method='GET',data,headers={}}={}){const h={...headers};if(this.cookie)h.Cookie=this.cookie;if(data!==undefined){method='POST';h['X-F-Request']='1';if(!(data instanceof FormData))h['Content-Type']='application/json';}return fetch(base+route,{method,headers:h,body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify(data)});},async call(route,data){const res=await this.raw('/api/'+route,{data});const cookie=res.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];return {status:res.status,data:await res.json()};},async register(name){const r=await this.call('register',{name,password:'TemporaryTest_123',consent:true,adult:true});assert.equal(r.status,200,JSON.stringify(r.data));this.id=r.data.user.id;return this;},async balance(){return (await this.call('me')).data.user.balance;},async upload(route,fields,content=png,name='photo.png'){const f=new FormData();for(const [k,v]of Object.entries(fields))f.set(k,String(v));f.set('file',new Blob([content],{type:'image/png'}),name);return this.call(route,f);}};}
  const alice=await client().register('AlicePhoto'),bob=await client().register('BobPhoto'),eve=await client().register('EvePhoto'),anon=client();
  const category=(await alice.call('categories')).data.categories.find(c=>c.name==='Alltag');
  const upload=(who,fields={})=>who.upload('upload-post',{body:'Ein Foto mit trockenem Humor.',category:category.id,rights:true,expectedPrice:category.photo_price,uploadToken:randomUUID(),...fields});
  async function chat(){await alice.call('request',{target:bob.id});const r=(await bob.call('people')).data.requests[0];await bob.call('respond',{request:r.id,status:'accepted'});return r.id;}
  return {dir,base,db,alice,bob,eve,anon,category,upload,chat,errors:()=>errors};
}

test('100-point category charges 100 per upload/unlock and pays exactly 50 to the creator',async t=>{
  const {alice,bob,eve,upload}=await harness(t);
  await alice.call('daily',{});await bob.call('daily',{});await eve.call('daily',{});
  const c=await alice.call('category',{name:'Fotokunst Hundert',price:100});assert.equal(c.status,201);
  const p=await upload(alice,{category:c.data.id,expectedPrice:100});assert.equal(p.status,201);
  assert.equal(p.data.charged,100);assert.equal(await alice.balance(),200);
  const photo=(await bob.call('feed')).data.posts.find(x=>x.id===p.data.id).media;
  assert.equal(photo.open_price,100);
  assert.equal((await bob.call('unlock',{media:photo.id,expectedPrice:10})).status,409);
  assert.equal(await bob.balance(),300);
  assert.equal((await bob.call('unlock',{media:photo.id,expectedPrice:100})).data.charged,100);
  assert.equal(await bob.balance(),200);assert.equal(await alice.balance(),250);
  const repeated=await bob.call('unlock',{media:photo.id,expectedPrice:100});assert.equal(repeated.data.charged,0);assert.equal(await alice.balance(),250);
  await eve.call('unlock',{media:photo.id,expectedPrice:100});assert.equal(await alice.balance(),300);
  const credits=(await alice.call('wallet')).data.entries.filter(e=>e.amount>0);assert.deepEqual(credits.map(e=>e.amount),[50,50]);
});

test('Music upload and seek ranges return uninterrupted exact bytes; deleted music is inaccessible',async t=>{
  const {alice,bob,category}=await harness(t);
  // A real PCM WAV header plus one second of silence, no external copyrighted audio.
  const wave=Buffer.alloc(44+16000);wave.write('RIFF',0);wave.writeUInt32LE(wave.length-8,4);wave.write('WAVEfmt ',8);
  wave.writeUInt32LE(16,16);wave.writeUInt16LE(1,20);wave.writeUInt16LE(1,22);wave.writeUInt32LE(8000,24);
  wave.writeUInt32LE(16000,28);wave.writeUInt16LE(2,32);wave.writeUInt16LE(16,34);wave.write('data',36);wave.writeUInt32LE(16000,40);
  const r=await alice.upload('upload-post',{body:'Ein eigener ruhiger Sound.',category:category.id,expectedPrice:0,rights:true,uploadToken:randomUUID()},wave,'test.wav');
  assert.equal(r.status,201);assert.equal(r.data.charged,0);assert.equal(await alice.balance(),0);
  const id=r.data.mediaId;
  const head=await bob.raw('/media/'+id,{method:'HEAD'});assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'audio/wav');assert.equal(Number(head.headers.get('content-length')),wave.length);
  const partials=await Promise.all([0,4096,8192,12288].map(async start=>{
    const end=Math.min(start+4095,wave.length-1),response=await bob.raw('/media/'+id,{headers:{Range:`bytes=${start}-${end}`}});
    assert.equal(response.status,206);assert.equal(response.headers.get('content-range'),`bytes ${start}-${end}/${wave.length}`);
    return Buffer.from(await response.arrayBuffer());
  }));
  assert.deepEqual(Buffer.concat(partials),wave);
  const invalid=await bob.raw('/media/'+id,{headers:{Range:'bytes=999999-'}});assert.equal(invalid.status,416);
  await alice.call('delete-post',{post:r.data.id});assert.equal((await bob.raw('/media/'+id)).status,404);
});

async function liveStream(t,client,game){
  const response=await client.raw('/api/dino-stream?game='+game);assert.equal(response.status,200);
  assert.match(response.headers.get('content-type'),/text\/event-stream/);
  const reader=response.body.getReader(),decoder=new TextDecoder(),waiting=new Set();let latest=null,buffer='',closed=false;
  const close=async()=>{closed=true;await reader.cancel().catch(()=>{});};t.after(close);
  const loop=(async()=>{try{while(!closed){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});let end;
    while((end=buffer.indexOf('\n\n'))>=0){const chunk=buffer.slice(0,end);buffer=buffer.slice(end+2);const data=chunk.split('\n').find(x=>x.startsWith('data: '));if(!data)continue;latest=JSON.parse(data.slice(6));for(const w of waiting)if(w.predicate(latest)){clearTimeout(w.timer);waiting.delete(w);w.resolve(latest);}}
  }}catch(error){if(!closed)for(const w of waiting){clearTimeout(w.timer);w.reject(error);waiting.delete(w);}}})();
  return {close,loop,next(predicate){if(latest&&predicate(latest))return Promise.resolve(latest);return new Promise((resolve,reject)=>{const w={predicate,resolve,reject,timer:setTimeout(()=>{waiting.delete(w);reject(Error('No matching live Dino event: '+JSON.stringify(latest)));},8000)};waiting.add(w);});}};
}

test('Live Dino uses two authorized streams, shared countdown, simultaneous jumps and block revocation',async t=>{
  const {alice,bob,eve,chat}=await harness(t),request=await chat();
  const created=await alice.call('game-create',{request,type:'dino-run'});assert.equal(created.status,201);const g=created.data.game;
  assert.equal((await eve.raw('/api/dino-stream?game='+g.id)).status,403);
  assert.equal((await alice.call('dino-jump',{game:g.id,seq:1})).status,409);
  const accepted=await bob.call('game-action',{game:g.id,version:g.version,action:'accept'});assert.equal(accepted.status,200);
  const a=await liveStream(t,alice,g.id);const wait=await a.next(s=>s.phase==='waiting');assert.equal(wait.startAt,null);
  const b=await liveStream(t,bob,g.id);
  const [startA,startB]=await Promise.all([a.next(s=>s.phase==='countdown'),b.next(s=>s.phase==='countdown')]);
  assert.equal(startA.startAt,startB.startAt);assert.deepEqual(startA.obstacles,startB.obstacles);
  await a.next(s=>s.phase==='running');
  const moves=await Promise.all([alice.call('dino-jump',{game:g.id,seq:1,score:999999,y:9999}),bob.call('dino-jump',{game:g.id,seq:1})]);
  for(const r of moves){assert.equal(r.status,200);assert.equal(r.data.accepted,true);}
  const sync=await b.next(s=>s.players.every(p=>p.seq===1&&p.y>0));assert.ok(sync.players.every(p=>p.y<150));
  assert.equal((await alice.call('dino-jump',{game:g.id,seq:1})).data.repeated,true);
  assert.equal((await eve.call('dino-jump',{game:g.id,seq:1})).status,403);
  assert.equal((await alice.call('game-action',{game:g.id,version:accepted.data.game.version,action:'move',cell:0})).status,400);
  assert.equal(await alice.balance(),0);assert.equal(await bob.balance(),0);
  await bob.call('block',{target:alice.id});const stopped=await a.next(s=>s.phase==='cancelled');assert.match(stopped.reason,/freigegeben/);
  assert.equal((await alice.raw('/api/dino-stream?game='+g.id)).status,403);
  await a.close();await b.close();
});

test('Mandatory category, priced uploads, atomic split, real photo bytes and idempotent reopening',async t=>{
  const h=await harness(t),{alice,bob,eve,anon,upload,category,db}=h;
  await alice.call('daily',{});await bob.call('daily',{});
  assert.equal((await upload(alice,{category:''})).status,400);
  assert.equal((await upload(alice,{category:999999})).status,400);
  assert.equal((await upload(eve)).status,400);assert.equal(await eve.balance(),0);
  assert.equal((await upload(alice,{expectedPrice:0})).status,409);
  const bad=await alice.upload('upload-post',{body:'Kein echtes Bild.',category:category.id,rights:true,expectedPrice:5,uploadToken:randomUUID()},Buffer.from('<script>bad</script>'));
  assert.equal(bad.status,400);assert.equal(await alice.balance(),300);
  assert.equal(readdirSync(path.join(h.dir,'media')).length,0);
  const token=randomUUID(),created=await upload(alice,{uploadToken:token});assert.equal(created.status,201,JSON.stringify(created.data));
  const id=created.data.mediaId,pid=created.data.id;assert.equal(await alice.balance(),295);
  const repeat=await upload(alice,{uploadToken:token});assert.equal(repeat.data.mediaId,id);assert.equal(await alice.balance(),295);
  assert.equal((await anon.raw('/media/'+id)).status,401);
  assert.equal((await bob.raw('/media/'+id)).status,403);
  assert.equal((await eve.call('unlock',{media:id,expectedPrice:5})).status,400);
  assert.equal((await bob.call('unlock',{media:id,expectedPrice:1})).status,409);
  assert.equal(await bob.balance(),300);
  const bought=await Promise.all([bob.call('unlock',{media:id,expectedPrice:5}),bob.call('unlock',{media:id,expectedPrice:5}),bob.call('unlock',{media:id,expectedPrice:5})]);
  assert.equal(bought.filter(x=>x.data.charged===5).length,1);
  assert.equal(await bob.balance(),295);assert.equal(await alice.balance(),297.5);
  const image=await bob.raw('/media/'+id);assert.equal(image.status,200);assert.equal(image.headers.get('content-type'),'image/png');assert.deepEqual(Buffer.from(await image.arrayBuffer()),png);
  assert.match(image.headers.get('cache-control'),/no-store/);
  const head=await bob.raw('/media/'+id,{method:'HEAD'});assert.equal(head.status,200);assert.equal((await head.arrayBuffer()).byteLength,0);
  const partial=await bob.raw('/media/'+id,{headers:{Range:'bytes=0-7'}});assert.equal(partial.status,206);assert.deepEqual(Buffer.from(await partial.arrayBuffer()),png.subarray(0,8));
  assert.equal((await bob.call('feed')).data.posts.find(p=>p.id===pid).media.unlocked,true);
  assert.equal((await alice.call('feed')).data.posts.find(p=>p.id===pid).media.owned,true);
  assert.equal((await bob.call('unlock',{media:id,expectedPrice:5})).data.charged,0);
  assert.equal((await alice.call('unlock',{media:id,expectedPrice:5})).data.charged,0);
  assert.equal(await bob.balance(),295);
  assert.equal((await alice.call('wallet')).data.entries[0].amount,2.5);
  const removed=await upload(alice);const file=db.prepare('SELECT file_name FROM media WHERE id=?').get(removed.data.mediaId);
  unlinkSync(path.join(h.dir,'media',file.file_name));
  const before=await bob.balance();assert.equal((await bob.call('unlock',{media:removed.data.mediaId,expectedPrice:5})).status,410);assert.equal(await bob.balance(),before);
  const expired=await upload(alice);db.prepare('UPDATE posts SET expires=? WHERE id=?').run(Date.now()-1,expired.data.id);
  assert.equal((await bob.call('unlock',{media:expired.data.mediaId,expectedPrice:5})).status,404);
  assert.equal((await alice.raw('/media/'+expired.data.mediaId)).status,404);
  await bob.call('block',{target:alice.id});assert.equal((await bob.raw('/media/'+id)).status,404);
  assert.equal((await bob.call('unlock',{media:id,expectedPrice:5})).status,404);
  for(const route of ['/','/features.js','/features.css','/app.js','/dino-client.js','/discovery-effects.js','/action.css'])assert.equal((await anon.raw(route)).status,200);
  assert.equal((await anon.raw('/server.mjs')).status,404);
  assert.equal(h.errors(),'');
});

test('Categories cost nothing, enforce bounds and preserve photo prices after edits',async t=>{
  const {alice,bob,upload}=await harness(t);
  assert.equal((await alice.call('category',{name:'Sonstiges',price:5})).status,400);
  assert.equal((await alice.call('category',{name:'Ungültig',price:0})).status,400);
  assert.equal((await alice.call('category',{name:'Zu teuer',price:101})).status,400);
  const c=await alice.call('category',{name:'Astronomie',price:7});assert.equal(c.status,201);assert.equal(await alice.balance(),0);
  assert.equal((await bob.call('category-update',{category:c.data.id,name:'Fremd',price:3})).status,403);
  await alice.call('daily',{});
  const p=await upload(alice,{category:c.data.id,expectedPrice:7});assert.equal(p.status,201);
  await alice.call('category-update',{category:c.data.id,name:'Sterne',price:11});
  const post=(await bob.call('feed')).data.posts.find(x=>x.id===p.data.id);assert.equal(post.media.open_price,7);assert.equal(post.category,'Sterne');
  assert.equal((await upload(alice,{category:c.data.id,expectedPrice:7})).status,409);
});

test('Chat photo: accepted conversation only, no costs, one opening, server-enforced deadline',async t=>{
  const {alice,bob,eve,anon,chat,db}=await harness(t),rid=await chat();
  const input={request:rid,rights:true};
  assert.equal((await eve.upload('upload-chat',input)).status,403);
  const photo=await alice.upload('upload-chat',input);assert.equal(photo.status,201);const id=photo.data.mediaId;
  assert.equal(await alice.balance(),0);assert.equal(await bob.balance(),0);
  assert.equal((await bob.call('messages?request='+rid)).data.messages[0].photoState,'ready');
  assert.equal((await bob.raw('/media/'+id)).status,410);
  assert.equal((await eve.call('chat-photo-open',{media:id})).status,403);
  assert.equal((await anon.call('chat-photo-open',{media:id})).status,401);
  const openings=await Promise.all([bob.call('chat-photo-open',{media:id}),bob.call('chat-photo-open',{media:id})]);
  assert.equal(openings.filter(r=>r.status===200).length,1);assert.equal(openings.filter(r=>r.status===410).length,1);
  const opened=openings.find(r=>r.status===200).data;assert.equal(opened.expires-opened.serverNow<=20000,true);
  assert.equal((await bob.raw(opened.url)).status,200);assert.equal((await eve.raw(opened.url)).status,403);
  assert.equal((await bob.raw('/media/'+id+'?view=wrong')).status,410);
  assert.equal((await bob.call('messages?request='+rid)).data.messages[0].photoState,'opened');
  db.prepare('UPDATE photo_views SET expires=? WHERE media_id=?').run(Date.now()-1,id);
  assert.equal((await bob.raw(opened.url)).status,410);assert.equal((await bob.call('chat-photo-open',{media:id})).status,410);
  assert.equal((await alice.raw('/media/'+id)).status,200);
  db.prepare('UPDATE media SET created=? WHERE id=?').run(Date.now()-8*86400000,id);
  assert.equal((await alice.raw('/media/'+id)).status,410);
  assert.equal((await bob.call('messages?request='+rid)).data.messages[0].photoState,'expired');
  assert.equal(await alice.balance(),0);assert.equal(await bob.balance(),0);
  await alice.call('message',{request:rid,body:'[Foto:12345]'});
  const fake=(await bob.call('messages?request='+rid)).data.messages.at(-1);assert.equal(fake.mediaId,null);
});

test('Multiplayer games require consent and enforce turns, membership, versions and zero cost',async t=>{
  const {alice,bob,eve,chat}=await harness(t),rid=await chat();
  assert.equal((await eve.call('games?request='+rid)).status,403);
  assert.equal((await eve.call('game-create',{request:rid,type:'tic-tac-toe'})).status,403);
  let g=(await alice.call('game-create',{request:rid,type:'tic-tac-toe'})).data.game;
  assert.equal(g.status,'invited');
  assert.equal((await alice.call('game-action',{game:g.id,version:g.version,action:'accept'})).status,403);
  assert.equal((await bob.call('game-create',{request:rid,type:'connect-four'})).status,409);
  g=(await bob.call('game-action',{game:g.id,version:g.version,action:'accept'})).data.game;
  assert.equal((await bob.call('game-action',{game:g.id,version:g.version,action:'move',cell:0})).status,409);
  for(const [i,cell]of [0,3,1,4,2].entries()){
    const actor=i%2?bob:alice;const move=await actor.call('game-action',{game:g.id,version:g.version,action:'move',cell});assert.equal(move.status,200,JSON.stringify(move.data));
    if(i===0)assert.equal((await alice.call('game-action',{game:g.id,version:g.version,action:'move',cell:2})).status,409);
    g=move.data.game;
  }
  assert.equal(g.status,'finished');assert.equal(g.winner,alice.id);
  assert.equal((await bob.call('games?request='+rid)).data.games[0].winner,alice.id);
  for(const type of ['connect-four','number-duel']){
    g=(await bob.call('game-create',{request:rid,type})).data.game;
    g=(await alice.call('game-action',{game:g.id,version:g.version,action:'accept'})).data.game;
    assert.equal(g.state.secret,undefined);
    const input=type==='connect-four'?{column:2}:{guess:50};
    const result=await bob.call('game-action',{game:g.id,version:g.version,action:'move',...input});assert.equal(result.status,200);g=result.data.game;
    if(g.status==='active')await alice.call('game-action',{game:g.id,version:g.version,action:'cancel'});
  }
  assert.equal(await alice.balance(),0);assert.equal(await bob.balance(),0);
  await alice.call('block',{target:bob.id});assert.equal((await bob.call('games?request='+rid)).status,403);
});

test('Free extras: real uploads, safe downloads, mandatory category and access control',async t=>{
  const {alice,bob,eve,anon,category,db}=await harness(t);
  const fields={space:'lernarchiv',title:'Mathematik Lernzettel',body:'Eigene Erklärung und Notizen.',category:category.id,rights:true};
  assert.equal((await anon.call('extra',fields)).status,401);
  assert.equal((await alice.call('extra',{...fields,category:''})).status,400);
  const uploaded=await alice.upload('upload-extra',fields,Buffer.from('Meine eigenen Notizen.\n'),'notizen.txt');assert.equal(uploaded.status,201,JSON.stringify(uploaded.data));
  const entry=(await bob.call('extras')).data.entries[0];assert.equal(entry.id,uploaded.data.id);assert.equal(entry.expires,null);
  assert.equal((await bob.call('feed')).data.posts.some(p=>p.id===entry.id),false);
  const response=await bob.raw('/api/document?id='+entry.document.id);assert.equal(response.status,200);assert.match(response.headers.get('content-disposition'),/^attachment/);assert.equal(await response.text(),'Meine eigenen Notizen.\n');
  assert.equal((await anon.raw('/api/document?id='+entry.document.id)).status,401);
  assert.equal((await bob.call('delete-post',{post:entry.id})).status,403);
  assert.equal((await alice.upload('upload-extra',fields,png,'photo.png')).status,400);
  assert.equal((await alice.upload('upload-extra',fields,Buffer.from([1,0,4]),'tool.js')).status,400);
  assert.equal(await alice.balance(),0);assert.equal(await bob.balance(),0);
  await bob.call('block',{target:alice.id});assert.equal((await bob.raw('/api/document?id='+entry.document.id)).status,404);
  assert.equal((await bob.call('extras')).data.entries.length,0);
  assert.equal((await eve.call('extras')).data.entries.length,1);
  assert.equal(db.prepare('SELECT COUNT(*) n FROM documents').get().n,1);
});

test('Reported photos: moderator access is limited to the report and its specific conversation',async t=>{
  const {alice,bob,eve,chat,db}=await harness(t),rid=await chat();
  db.prepare('UPDATE users SET is_admin=1 WHERE id=?').run(eve.id);
  const m=(await alice.upload('upload-chat',{request:rid,rights:true})).data.mediaId;
  assert.equal((await eve.call('report',{targetType:'media',target:m})).status,403);
  const report=await bob.call('report',{targetType:'user',target:alice.id,reason:'Bitte diesen Chat prüfen.'});assert.equal(report.status,201);
  assert.equal((await bob.call('report',{targetType:'user',target:alice.id})).status,409);
  assert.equal((await alice.call('admin/report?id='+report.data.id)).status,403);
  const detail=await eve.call('admin/report?id='+report.data.id);assert.equal(detail.data.media[0].id,m);
  assert.equal((await eve.raw(detail.data.media[0].url)).status,200);
  assert.equal((await bob.raw(detail.data.media[0].url)).status,403);
  await alice.call('request',{target:eve.id});const other=(await eve.call('people')).data.requests[0];await eve.call('respond',{request:other.id,status:'accepted'});
  const privatePhoto=(await alice.upload('upload-chat',{request:other.id,rights:true})).data.mediaId;
  const limited=await eve.call('admin/report?id='+report.data.id);assert.equal(limited.data.media.some(x=>x.id===privatePhoto),false);
  assert.equal((await eve.raw('/api/admin/media?report='+report.data.id+'&media='+privatePhoto)).status,403);
  db.prepare('UPDATE media SET expires=? WHERE id=?').run(Date.now()-1,m);
  assert.equal((await eve.raw(detail.data.media[0].url)).status,403);
  db.prepare('INSERT INTO wallet_entries(user_id,operation,amount_half,description,created) VALUES(?,?,?,?,?)').run(alice.id,'fixture-credit',11,'Testguthaben',Date.now());
  assert.equal(await alice.balance(),5.5);
  assert.equal((await eve.call('admin/action',{report:report.data.id,action:'warn',fine:100})).status,200);
  assert.equal(await alice.balance(),0,'100 % removes fractional balances too');
});
