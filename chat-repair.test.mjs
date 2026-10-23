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
 async function call(route,actor=owner,data){const res=await fetch(base+'/api/'+route,{method:data?'POST':'GET',headers:{Cookie:actor.cookie,...data?{'X-F-Request':'1',...(typeof data==='string'?{'Content-Type':'application/json'}:{})}:{}},body:data});return {status:res.status,data:await res.json()};}
 async function upload(bytes=100){const b=Buffer.alloc(bytes);b.write('RIFF');b.writeUInt32LE(bytes-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(8000,24);b.writeUInt32LE(16000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(bytes-44,40);const f=new FormData();for(const [k,v]of Object.entries({body:'Ein Testklang.',category:one('SELECT id FROM categories LIMIT 1').id,rights:'true',expectedPrice:0,uploadToken:randomUUID()}))f.set(k,String(v));f.set('file',new Blob([b],{type:'audio/wav'}),'test.wav');return call('upload-post',owner,f);}
 async function stream(actor){const abort=new AbortController();controllers.push(abort);const response=await fetch(base+'/api/reset-stream',{signal:abort.signal,headers:actor?{Cookie:actor.cookie}:{}});assert.equal(response.status,200);const reader=response.body.getReader(),events=[];let buffer='';const waiters=[];
 const task=(async()=>{try{while(true){const r=await reader.read();if(r.done)break;buffer+=new TextDecoder().decode(r.value);let at;while((at=buffer.indexOf('\n\n'))>=0){const chunk=buffer.slice(0,at);buffer=buffer.slice(at+2);const name=/event: (.+)/.exec(chunk)?.[1],data=/data: (.+)/.exec(chunk)?.[1];if(name&&data){events.push({name,data:JSON.parse(data)});for(const f of waiters)f();}}}}catch(e){if(!abort.signal.aborted)throw e;}})();
 const wait=name=>new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('No event: '+name)),2500);const check=()=>{const e=events.find(e=>e.name===name);if(e){clearTimeout(timeout);resolve(e.data);}};waiters.push(check);check();});await wait('ready');return {events,wait,close:()=>abort.abort(),task};}
 return {dir,base,db,run,one,all,owner,reporter,third,admin,post,media,report,call,upload,stream,errors:()=>errors};
}




test('Block/unblock preserves chat consent and history; a remaining reciprocal block still denies access',async t=>{
 const h=await app(t),{owner:a,reporter:b,third:c}=h;
 const call=(r,u,data)=>h.call(r,u,JSON.stringify(data));
 await call('daily',a,{});await call('daily',b,{});
 assert.equal((await call('request',a,{target:b.id,expectedCost:200})).status,201);
 const rid=h.one('SELECT id FROM requests').id;
 await call('respond',b,{request:rid,status:'accepted'});
 await call('message',a,{request:rid,body:'Verlauf bleibt.',expectedCost:5,sendToken:randomUUID()});
 const before=(await h.call('wallet',a)).data.balance;
 assert.equal((await call('block',a,{target:b.id})).status,200);
 assert.equal(h.one('SELECT status FROM requests WHERE id=?',rid).status,'accepted');
 assert.equal((await h.call('messages?request='+rid,b)).status,403);
 assert.equal((await call('message',a,{request:rid,body:'Verboten',expectedCost:5,sendToken:randomUUID()})).status,403);
 await call('block',b,{target:a.id});await call('unblock',a,{target:b.id});
 assert.equal((await h.call('messages?request='+rid,a)).status,403);
 assert.equal((await call('request',a,{target:b.id,expectedCost:200})).status,400);
 assert.equal((await h.call('wallet',a)).data.balance,before);
 await call('unblock',b,{target:a.id});
 const history=await h.call('messages?request='+rid,b);assert.equal(history.status,200);assert.equal(history.data.messages[0].body,'Verlauf bleibt.');
 assert.equal((await h.call('messages?request='+rid,c)).status,403);
 assert.equal((await call('message',b,{request:rid,body:'Geht wieder.',expectedCost:5,sendToken:randomUUID()})).status,201);
 assert.equal((await h.call('wallet',a)).data.balance,before);
});

test('Legacy declined chat is renewed without charge, visible to the correct recipient and still needs consent',async t=>{
 const h=await app(t),{owner:a,reporter:b,third:c}=h;const call=(r,u,data)=>h.call(r,u,JSON.stringify(data));
 const rid=Number(h.run("INSERT INTO requests(sender,receiver,status,created) VALUES(?,?,'declined',?)",a.id,b.id,Date.now()).lastInsertRowid);
 h.run('INSERT INTO messages(request_id,sender,body,created) VALUES(?,?,?,?)',rid,a.id,'Alter Verlauf',Date.now());
 const result=await call('request',b,{target:a.id,expectedCost:0});assert.equal(result.status,201);assert.equal(result.data.charged,0);assert.equal(result.data.request,rid);
 const incoming=(await h.call('people',a)).data.requests.find(r=>r.id===rid);assert.equal(incoming.status,'pending');assert.equal(incoming.receiver,a.id);assert.equal(incoming.sender,b.id);
 assert.equal((await h.call('messages?request='+rid,b)).status,403);
 assert.equal((await call('respond',b,{request:rid,status:'accepted'})).status,403);
 assert.equal((await call('respond',c,{request:rid,status:'accepted'})).status,403);
 assert.equal((await call('request',a,{target:b.id,expectedCost:200})).data.charged,0);
 assert.equal((await h.call('wallet',a)).data.balance,0);assert.equal((await h.call('wallet',b)).data.balance,0);
 await call('respond',a,{request:rid,status:'accepted'});
 assert.equal((await h.call('messages?request='+rid,b)).data.messages[0].body,'Alter Verlauf');
 assert.equal(h.one('SELECT COUNT(*) n FROM requests').n,1);
});

test('New request is charged once; pending and accepted retries are free; declined retries are bounded',async t=>{
 const h=await app(t),{owner:a,reporter:b}=h;const call=(r,u,data)=>h.call(r,u,JSON.stringify(data));
 assert.equal((await call('request',a,{target:b.id,expectedCost:0})).status,409);
 assert.equal(h.one('SELECT COUNT(*) n FROM requests').n,0);
 await call('daily',a,{});
 const original=await call('request',a,{target:b.id,expectedCost:200});assert.equal(original.data.charged,200);
 const rid=original.data.request;
 assert.equal((await call('request',a,{target:b.id,expectedCost:200})).data.charged,0);
 assert.equal((await h.call('wallet',a)).data.balance,100);
 await call('respond',b,{request:rid,status:'declined'});
 assert.equal((await call('request',a,{target:b.id,expectedCost:0})).data.charged,0);
 await call('respond',b,{request:rid,status:'declined'});
 assert.equal((await call('request',a,{target:b.id,expectedCost:0})).status,429);
 assert.equal((await h.call('wallet',a)).data.balance,100);
});
