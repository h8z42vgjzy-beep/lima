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


test('Activity: replies, private messages, invitations and chess moves reach only the recipient',async t=>{
 const h=await app(t),{owner,reporter,third,run,one}=h;
 const rid=Number(run("INSERT INTO requests(sender,receiver,status,created) VALUES(?,?,'accepted',?)",owner.id,reporter.id,Date.now()).lastInsertRowid);
 const call=(r,u,b)=>h.call(r,u,JSON.stringify({...(['message','game-create'].includes(r)?{expectedCost:5,sendToken:randomUUID()}:{}),...(r==='game-action'&&b.action==='accept'?{expectedCost:5}:{}),...b}));
 await call('daily',owner,{});await call('daily',reporter,{});
 assert.equal((await call('message',owner,{request:rid,body:'Hallo'})).status,201);
 assert.equal((await h.call('notifications',reporter)).data.notices[0].type,'messages');
 assert.equal((await h.call('notifications',third)).data.notices.length,0);
 const nid=(await h.call('notifications',reporter)).data.notices[0].id;
 await call('notifications/read',third,{id:nid});assert.equal(one('SELECT read_at FROM activity_notices WHERE id=?',nid).read_at,null);
 await call('notifications/read',reporter,{id:nid});assert.ok(one('SELECT read_at FROM activity_notices WHERE id=?',nid).read_at);
 const p=h.post(owner.id),c=Number(run('INSERT INTO comments(user_id,post_id,body,created) VALUES(?,?,?,?)',reporter.id,p,'Test',Date.now()).lastInsertRowid);
 assert.equal((await call('comment',owner,{post:p,parent:c,body:'Antwort'})).status,201);
 assert.ok((await h.call('notifications',reporter)).data.notices.some(n=>n.type==='replies'));
 let result=await call('game-create',owner,{request:rid,type:'chess'});assert.equal(result.status,201);let game=result.data.game;
 assert.ok((await h.call('notifications',reporter)).data.notices.some(n=>n.type==='invitations'));
 game=(await call('game-action',reporter,{game:game.id,version:game.version,action:'accept'})).data.game;
 assert.ok((await h.call('notifications',owner)).data.notices.some(n=>n.type==='chess'));
 const before=one("SELECT COUNT(*) AS n FROM activity_notices WHERE user_id=? AND type='messages'",reporter.id).n;
 await call('settings',reporter,{messages:false,language:'uk'});
 await call('message',owner,{request:rid,body:'Keine Meldung'});
 assert.equal(one("SELECT COUNT(*) AS n FROM activity_notices WHERE user_id=? AND type='messages'",reporter.id).n,before);
 assert.equal((await h.call('settings',reporter)).data.settings.language,'uk');
 run('INSERT INTO blocks VALUES(?,?)',reporter.id,owner.id);
 assert.equal((await h.call('notifications',reporter)).data.notices.length,0);
 assert.equal((await call('message',owner,{request:rid,body:'Blockiert'})).status,403);
});
test('Discovery rewards are server-account scoped, ordered, persisted and paid once',async t=>{
 const h=await app(t),call=(id,u=h.owner)=>h.call('discover',u,JSON.stringify({secret:id}));
 const before=(await h.call('wallet')).data.balance;
 assert.equal((await call('rainbow')).status,409);
 for(const id of ['flowers','bloom','comet'])assert.equal((await call(id)).status,200);
 assert.equal((await h.call('wallet')).data.balance,before+20);
 const result=await Promise.all(Array.from({length:5},()=>call('comet')));assert.ok(result.every(x=>x.data.progress.earned===0));
 assert.equal((await h.call('wallet')).data.balance,before+20);
 assert.equal((await h.call('settings')).data.progress.chapter,1);
 assert.equal((await h.call('settings',h.third)).data.progress.chapter,0);
 for(const id of ['footer','pride','moon','heart','spark','orbit','petal','equality','rainbow','aurora','echo','leaf','wave','pulse','crystal','sun','peace','nova','unity','dream','galaxy'])assert.equal((await call(id)).status,200);
 assert.equal((await h.call('settings')).data.progress.complete,true);
 assert.equal((await h.call('wallet')).data.balance,before+160);
});

import {createActivity,validSubscription} from './activity.mjs';
test('Push queue retries, honours preferences and removes expired subscriptions',async t=>{
 const h=await app(t);let sends=0,fail=503;
 const driver={generateVAPIDKeys:()=>({publicKey:'test-key',privateKey:'test-private'}),setVapidDetails(){},async sendNotification(sub,payload){sends++;assert.equal(JSON.parse(payload).recipient,h.reporter.id);if(fail)throw {statusCode:fail};}};
 const transact=fn=>{h.db.exec('BEGIN');try{const v=fn();h.db.exec('COMMIT');return v;}catch(e){h.db.exec('ROLLBACK');throw e;}};
 const activity=await createActivity({db:h.db,one:h.one,all:h.all,run:h.run,now:Date.now,dataDir:h.dir,blocked:()=>false,ledger(){},transact,pushDriver:driver});t.after(()=>activity.close());
 const s={endpoint:'https://web.push.apple.com/test',keys:{p256dh:'A'.repeat(87),auth:'A'.repeat(22)}};
 assert.equal(validSubscription(s),true);assert.equal(validSubscription({...s,endpoint:'https://127.0.0.1/admin'}),false);assert.equal(validSubscription({...s,endpoint:'https://web.push.apple.com.evil.test/'}),false);
 const token=h.reporter.cookie.split('=')[1];activity.subscribe(h.reporter.id,createHash('sha256').update(token).digest('hex'),s);
 activity.notify(h.reporter.id,h.owner.id,'messages',1,'queue:test');await activity.drain();assert.equal(sends,1);assert.equal(h.one('SELECT tries FROM push_jobs').tries,1);
 h.run('UPDATE push_jobs SET next_at=0');fail=0;await activity.drain();assert.equal(sends,2);assert.equal(h.one('SELECT COUNT(*) AS n FROM push_jobs').n,0);
 activity.notify(h.reporter.id,h.owner.id,'messages',1,'queue:muted');activity.save(h.reporter.id,{enabled:false});await activity.drain();assert.equal(sends,2);
 activity.save(h.reporter.id,{enabled:true});activity.notify(h.reporter.id,h.owner.id,'messages',1,'queue:gone');fail=410;await activity.drain();assert.equal(h.one('SELECT COUNT(*) AS n FROM push_devices').n,0);
});
