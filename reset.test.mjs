import test from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync,writeFileSync,readFileSync,existsSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {initialChessState} from './chess.mjs';
import vm from 'node:vm';
import {createResetService} from './reset-service.mjs';

async function app(t){
 const dir=mkdtempSync(path.join(tmpdir(),'f-reset-test-'));
 const child=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,PORT:'0',F_DATA_DIR:dir,F_STORAGE_BYTES:'100000'},stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',x=>errors+=x);
 const port=await new Promise((resolve,reject)=>{child.stdout.on('data',x=>{const port=/0\.0\.0\.0:(\d+)/.exec(String(x));if(port)resolve(port[1]);});child.once('error',reject);child.once('exit',()=>reject(Error(errors)));});
 const base='http://127.0.0.1:'+port,db=new DatabaseSync(path.join(dir,'feindschaft.sqlite'));
 const controllers=[];
 t.after(async()=>{controllers.forEach(c=>c.abort());db.close();if(child.exitCode===null){const exited=new Promise(resolve=>child.once('exit',resolve));child.kill();await exited;}rmSync(dir,{recursive:true,force:true});});
 const run=(q,...args)=>db.prepare(q).run(...args),one=(q,...args)=>db.prepare(q).get(...args),all=(q,...args)=>db.prepare(q).all(...args);
 function account(name,admin=false){const id=Number(run('INSERT INTO users(name,color,created,is_admin) VALUES(?,?,?,?)',name,'mint',Date.now(),admin?1:0).lastInsertRowid);const token=randomUUID();run('INSERT INTO sessions(token,user_id,expires) VALUES(?,?,?)',createHash('sha256').update(token).digest('hex'),id,Date.now()+600000);return {id,cookie:'f_session='+token};}
 const owner=account('ResetTest'),reporter=account('MeldungTest'),third=account('DritterTest'),admin=account('AdminTest',true);
 function post(uid=owner.id,space='feed'){return Number(run('INSERT INTO posts(user_id,body,category,created,expires,space) VALUES(?,?,?,?,?,?)',uid,'Nur Testdaten','Alltag',Date.now(),space==='feed'?Date.now()+86400000:null,space).lastInsertRowid);}
 function media(bytes,{uid=owner.id,pid=post(uid),rid=null,kind='image'}={}){const name=randomUUID()+'.bin';writeFileSync(path.join(dir,'media',name),Buffer.alloc(bytes,7));const id=Number(run('INSERT INTO media(owner_id,post_id,request_id,file_name,original_name,mime,kind,bytes,created,expires) VALUES(?,?,?,?,?,?,?,?,?,?)',uid,pid,rid,name,'fixture','application/octet-stream',kind,bytes,Date.now(),Date.now()+28*86400000).lastInsertRowid);return {id,pid,file:path.join(dir,'media',name)};}
 function report(type,id){return Number(run('INSERT INTO reports(reporter,target_type,target_id,reason,created) VALUES(?,?,?,?,?)',reporter.id,type,id,'Testmeldung',Date.now()).lastInsertRowid);}
 async function call(route,actor=owner,data){const res=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{Cookie:actor.cookie,...data?{'X-F-Request':'1'}:{}},body:data});return {status:res.status,data:await res.json()};}
 async function upload(bytes=100){const b=Buffer.alloc(bytes);b.write('RIFF');b.writeUInt32LE(bytes-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes-44,40);const f=new FormData();for(const [k,v]of Object.entries({body:'Ein Testklang.',category:one('SELECT id FROM categories LIMIT 1').id,rights:'true',expectedPrice:0,uploadToken:randomUUID()}))f.set(k,String(v));f.set('file',new Blob([b],{type:'audio/wav'}),'test.wav');return call('upload-post',owner,f);}
 async function stream(actor){const abort=new AbortController();controllers.push(abort);const response=await fetch(base+'/api/reset-stream',{signal:abort.signal,headers:actor?{Cookie:actor.cookie}:{}});assert.equal(response.status,200);const reader=response.body.getReader(),events=[];let buffer='';const waiters=[];
 const task=(async()=>{try{while(true){const r=await reader.read();if(r.done)break;buffer+=new TextDecoder().decode(r.value);let at;while((at=buffer.indexOf('\n\n'))>=0){const chunk=buffer.slice(0,at);buffer=buffer.slice(at+2);const name=/event: (.+)/.exec(chunk)?.[1],data=/data: (.+)/.exec(chunk)?.[1];if(name&&data){events.push({name,data:JSON.parse(data)});for(const f of waiters)f();}}}}catch(e){if(!abort.signal.aborted)throw e;}})();
 const wait=name=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No event: '+name)),2500);const check=()=>{const e=events.find(e=>e.name===name);if(e){clearTimeout(timeout);resolve(e.data);}};waiters.push(check);check();});await wait('ready');return {events,wait,close:()=>abort.abort(),task};}
 return {dir,base,db,run,one,all,owner,reporter,third,admin,post,media,report,call,upload,stream,errors:()=>errors};
}

test('84.9% stays intact; exactly 85% clears test media/feed, preserves all reported evidence and persistent chat/games/documents',async t=>{
 const h=await app(t),{run,one,all,media,post,report,owner,reporter,third}=h;
 const picture=media(79800),video=media(300,{kind:'video'}),music=media(300,{kind:'audio'});
 const evidence=media(300);report('post',evidence.pid);
 const direct=media(300);report('media',direct.id);
 const commented=media(300);const comment=Number(run('INSERT INTO comments(user_id,post_id,body,created) VALUES(?,?,?,?)',owner.id,commented.pid,'Testkommentar',Date.now()).lastInsertRowid);report('comment',comment);
 const rid=Number(run("INSERT INTO requests(sender,receiver,status,created) VALUES(?,?,'accepted',?)",owner.id,reporter.id,Date.now()).lastInsertRowid);
 const otherRid=Number(run("INSERT INTO requests(sender,receiver,status,created) VALUES(?,?,'accepted',?)",owner.id,third.id,Date.now()).lastInsertRowid);
 // This user report protects precisely the reported conversation plus this user's feed.
 report('user',third.id);
 const protectedChat=media(300,{uid:third.id,pid:null,rid:Number(run("INSERT INTO requests(sender,receiver,status,created) VALUES(?,?,'accepted',?)",third.id,reporter.id,Date.now()).lastInsertRowid)});
 const gameState=JSON.stringify(initialChessState());
 const gid=Number(run("INSERT INTO chat_games(request_id,type,creator,opponent,status,turn,state,created,updated) VALUES(?,'chess',?,?,'active',?,?,?,?)",rid,owner.id,reporter.id,owner.id,gameState,Date.now(),Date.now()).lastInsertRowid);
 const unrelatedChat=media(300,{uid:third.id,pid:null,rid:otherRid});
 const ordinaryChat=media(300,{pid:null,rid});
 const reportedMessage=media(300,{pid:null,rid});
 const msg=Number(run('INSERT INTO messages(request_id,sender,body,media_id,created) VALUES(?,?,?,?,?)',rid,owner.id,'Testfoto',reportedMessage.id,Date.now()).lastInsertRowid);report('message',msg);
 const reportedUserPost=post(third.id);
 run('INSERT INTO messages(request_id,sender,body,created) VALUES(?,?,?,?)',rid,owner.id,'Dauerhafter Testtext',Date.now());
 const permanent=post(owner.id,'lernarchiv');
 const categoryBefore=one('SELECT COUNT(*) AS n FROM categories').n;
 // 82,500 media bytes + 1,900 permanent document bytes = 84,400.
 const docFile=path.join(h.dir,'documents','permanent.txt');writeFileSync(docFile,'x'.repeat(1900));
 run('INSERT INTO documents(post_id,file_name,original_name,mime,bytes) VALUES(?,?,?,?,?)',permanent,'permanent.txt','test.txt','text/plain',1900);
 const used=one('SELECT SUM(bytes) AS n FROM media WHERE removed=0').n+1900;assert.equal(used,84400);
 const a=await h.stream(),b=await h.stream(),offline=await h.stream();offline.close();await offline.task;
 assert.equal(one('SELECT COUNT(*) AS n FROM reset_events').n,0);
 assert.equal(existsSync(picture.file),true);
 assert.equal((await h.upload(500)).status,201);
 assert.equal(one('SELECT SUM(bytes) AS n FROM media WHERE removed=0').n+1900,84900);
 assert.equal(one('SELECT COUNT(*) AS n FROM reset_events').n,0);
 assert.equal(existsSync(picture.file),true);
 const result=await h.upload(100);assert.equal(result.status,201,JSON.stringify(result));
 const [ae,be]=await Promise.all([a.wait('feed-reset'),b.wait('feed-reset')]);assert.deepEqual(ae,be);assert.equal(ae.startAt-ae.created,3000);assert.equal(ae.ends-ae.startAt,136000);
 for(const item of [picture,video,music,ordinaryChat,unrelatedChat]){assert.equal(existsSync(item.file),false);assert.equal(one('SELECT removed FROM media WHERE id=?',item.id).removed,1);}
 for(const item of [evidence,direct,commented,protectedChat,reportedMessage]){assert.equal(existsSync(item.file),true);assert.equal(one('SELECT removed FROM media WHERE id=?',item.id).removed,0);}
 for(const pid of [evidence.pid,direct.pid,commented.pid,reportedUserPost,permanent])assert.equal(one('SELECT deleted FROM posts WHERE id=?',pid).deleted,0);
 assert.equal(existsSync(docFile),true);assert.equal(one('SELECT COUNT(*) AS n FROM categories').n,categoryBefore);
 assert.equal(one("SELECT COUNT(*) AS n FROM messages WHERE body='Dauerhafter Testtext'").n,1);
 assert.equal((await h.call('feed')).data.posts.some(p=>p.id===picture.pid),false);
 assert.equal((await h.call('event')).data.event,null);
 const late=await h.stream();await h.call('feed');assert.equal((await late.wait('feed-reset')).id,ae.id);
 assert.equal(offline.events.some(e=>e.name==='feed-reset'),false);
 const detail=(await h.call('admin/report?id='+one("SELECT id FROM reports WHERE target_type='post'").id,h.admin)).data;
 assert.equal(detail.media[0].id,evidence.id);
 const saved=await fetch(h.base+detail.media[0].url,{headers:{Cookie:h.admin.cookie}});assert.equal(saved.status,200);assert.equal((await saved.arrayBuffer()).byteLength,300);
 assert.equal(one('SELECT COUNT(*) AS n FROM reset_events').n,1);
 assert.equal(one('SELECT COUNT(*) AS n FROM users WHERE demo=0').n,4);
 assert.equal(one('SELECT state FROM chat_games WHERE id=?',gid).state,gameState);
 // Retention still ends for reported media; resetting does not extend its deadline.
 run('UPDATE media SET expires=? WHERE id IN(?,?)',Date.now()-1,evidence.id,protectedChat.id);
 assert.equal((await h.upload(100)).status,201);
 assert.equal(existsSync(evidence.file),false);assert.equal(existsSync(protectedChat.file),false);
 assert.equal(one('SELECT COUNT(*) AS n FROM reset_events').n,1);
 assert.doesNotMatch(h.errors(),/Speicherbereinigung fehlgeschlagen/);
});

test('Protected files alone cannot trigger repeated events',()=>{
 const events=[],removed=[],rows=[{id:1,post_id:10,bytes:900,expires:28000}];let clock=0;
 const deps={now:()=>clock,cleanupExpired(){for(const m of rows)if(!m.removed&&m.expires<=clock){m.removed=1;removed.push(m.id);}},storageInfo:()=>({total:1000,used:rows.filter(m=>!m.removed).reduce((a,m)=>a+m.bytes,0)}),reportAllowsMedia:()=>true,removeMedia:m=>{m.removed=1;removed.push(m.id);},transact:fn=>fn(),all(q){if(q.includes('FROM reports'))return [{target_type:'media',target_id:1}];if(q.includes('FROM media'))return rows.filter(m=>!m.removed);return [];},one:()=>null,run(q){if(q.startsWith('INSERT INTO reset_events'))events.push(q);return {lastInsertRowid:events.length};}};
 const service=createResetService(deps);
 assert.equal(service.check(),null);clock=20000;assert.equal(service.check(),null);assert.equal(events.length,0);assert.deepEqual(removed,[]);
 clock=28001;service.check();assert.deepEqual(removed,[1]);assert.equal(events.length,0);
});

test('Animation follows source timing, uses final title, excludes credits; live client never plays history',()=>{
 const source=readFileSync(new URL('public/reset-animation.js',import.meta.url),'utf8'),ctx=vm.createContext({});vm.runInContext(source,ctx);
 const state=ms=>ctx.FeedResetAnimation.stateAt(ms);
 assert.equal(state(650).title,'EMERGENCY BATTERY DETECTED');assert.equal(state(26000).title,'TESTING PATH ALPHA');assert.equal(state(52000).count,20);assert.equal(state(83650).count,10);assert.equal(state(95400).title,'Feed Water Reset');assert.equal(state(108000).done,true);
 assert.doesNotMatch(source,/Mathias Volk|Martin Hannes|Ubeydullah|Hohlweg|War Games|DAVID_LIGHTMAN|BETTEROV/);
 const handlers={},windows={},streams=[],plays=[],options=[];
 class Stream{constructor(){this.handlers={};streams.push(this);}addEventListener(n,f){this.handlers[n]=f;}close(){this.closed=true;}}
 const document={hidden:false,querySelector:()=>({}),addEventListener:(n,f)=>handlers[n]=f,querySelectorAll:()=>[]};
 const client=vm.createContext({document,window:{addEventListener:(n,f)=>windows[n]=f},EventSource:Stream,FeedResetAnimation:{play:(e,o)=>{plays.push(e);options.push(o);},stop(){}},fetch:()=>{throw Error('Preview must not send a request');},JSON,Number});
 vm.runInContext(readFileSync(new URL('public/reset-live.js',import.meta.url),'utf8'),client);
 const message={data:JSON.stringify({id:1,startAt:3000,ends:111000,serverNow:0})};
 streams[0].handlers['feed-reset'](message);streams[0].handlers['feed-reset'](message);assert.equal(plays.length,1);
 document.hidden=true;handlers.visibilitychange();assert.equal(streams[0].closed,true);
 document.hidden=false;handlers.visibilitychange();assert.equal(streams.length,2);assert.equal(plays.length,1);
 document.hidden=true;streams[1].handlers['feed-reset']({data:JSON.stringify({id:2,startAt:3000,ends:111000,serverNow:0})});assert.equal(plays.length,1);

});


test('Public soundtrack supports browser HEAD, byte-range seeking and the exact bundled bytes',async t=>{
 const h=await app(t),score=readFileSync(new URL('public/reset-soundtrack.mp3',import.meta.url));
 const head=await fetch(h.base+'/reset-soundtrack.mp3',{method:'HEAD'});
 assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'audio/mpeg');assert.equal(Number(head.headers.get('content-length')),score.length);assert.equal(head.headers.get('accept-ranges'),'bytes');
 const chunk=await fetch(h.base+'/reset-soundtrack.mp3',{headers:{Range:'bytes=8192-16383'}});
 assert.equal(chunk.status,206);assert.deepEqual(Buffer.from(await chunk.arrayBuffer()),score.subarray(8192,16384));
 const bad=await fetch(h.base+'/reset-soundtrack.mp3',{headers:{Range:'bytes=999999999-'}});assert.equal(bad.status,416);
});

 test('Reset film supports Safari range playback and exact video bytes',async t=>{
 const h=await app(t),film=readFileSync(new URL('public/reset-film.mp4',import.meta.url));
 const head=await fetch(h.base+'/reset-film.mp4',{method:'HEAD'});
 assert.equal(head.status,200);assert.equal(head.headers.get('content-type'),'video/mp4');assert.equal(Number(head.headers.get('content-length')),film.length);
 const response=await fetch(h.base+'/reset-film.mp4',{headers:{Range:'bytes=0-1023'}});
 assert.equal(response.status,206);assert.deepEqual(Buffer.from(await response.arrayBuffer()),film.subarray(0,1024));
 });

test('Admin live test broadcasts, late joins share timeline, no deletion, no replay after expiry',async t=>{
 const h=await app(t),file=h.media(200),a=await h.stream(),b=await h.stream();
 assert.equal((await h.call('admin/reset-preview',h.owner,'{}')).status,403);
 const response=await h.call('admin/reset-preview',h.admin,'{}');assert.equal(response.status,200);
 const event=response.data.event;assert.equal(event.preview,true);
 assert.equal((await a.wait('feed-reset')).id,event.id);assert.equal((await b.wait('feed-reset')).id,event.id);
 assert.equal(existsSync(file.file),true);assert.equal(h.one('SELECT deleted FROM posts WHERE id=?',file.pid).deleted,0);
 h.run('UPDATE reset_events SET created=? WHERE id=?',Date.now()-23000,event.id);
 const late=await h.stream(),joined=await late.wait('feed-reset');
 assert.equal(joined.id,event.id);assert.ok(joined.serverNow-joined.startAt>=20000);assert.equal(joined.preview,true);
 assert.equal((await h.call('admin/reset-preview',h.admin,'{}')).data.event.id,event.id);
 h.run('UPDATE reset_events SET ends=? WHERE id=?',Date.now()-1,event.id);
 const after=await h.stream();assert.deepEqual(after.events.map(x=>x.name),['ready']);
});

test('Only Lima main admin receives close control, including late joiners',async t=>{
 const h=await app(t);h.run('UPDATE users SET name=? WHERE id=?','Lima',h.admin.id);
 const main=await h.stream(h.admin),member=await h.stream(h.owner),guest=await h.stream();
 const result=await h.call('admin/reset-preview',h.admin,'{}');assert.equal(result.data.event.canClose,true);
 assert.equal((await main.wait('feed-reset')).canClose,true);
 assert.equal((await member.wait('feed-reset')).canClose,false);assert.equal((await guest.wait('feed-reset')).canClose,false);
 const late=await h.stream(h.admin);assert.equal((await late.wait('feed-reset')).canClose,true);
 const source=readFileSync(new URL('public/reset-animation.js',import.meta.url),'utf8');
 assert.match(source,/hidden=!canClose/);assert.match(source,/e.preventDefault\(\);if\(canClose\)close\(\)/);
 assert.match(source,/stage.requestFullscreen/);assert.match(source,/orientation.lock\('landscape'\)/);
});

test('PWA assets are served with correct MIME and service worker is not stale-cached',async t=>{
 const h=await app(t);
 for(const [file,mime] of [['manifest.webmanifest','application/manifest+json'],['sw.js','text/javascript'],['app-icon-512.png','image/png'],['offline.html','text/html'],['pwa.css','text/css']]){
  const response=await fetch(h.base+'/'+file);assert.equal(response.status,200,file);assert.ok(response.headers.get('content-type').startsWith(mime),file);assert.equal(response.headers.get('cache-control'),'no-cache');
 }
});
