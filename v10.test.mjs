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



test('New fees: explicit price, no charge for reading, insufficient funds, idempotent sends',async t=>{
 const h=await app(t),{owner,reporter,run}=h;const call=(r,u,b)=>h.call(r,u,JSON.stringify(b));
 assert.equal((await call('request',owner,{target:reporter.id,expectedCost:200})).status,400);
 await call('daily',owner,{});await call('daily',reporter,{});
 assert.equal((await call('request',owner,{target:reporter.id})).status,409);
 assert.equal((await call('request',owner,{target:reporter.id,expectedCost:200})).status,201);
 const rid=h.one('SELECT id FROM requests WHERE sender=?',owner.id).id;
 await call('respond',reporter,{request:rid,status:'accepted'});
 assert.equal((await h.call('wallet')).data.balance,100);
 const token=randomUUID(),message={request:rid,body:'Testnachricht',expectedCost:5,sendToken:token};
 assert.equal((await call('message',owner,message)).status,201);assert.equal((await call('message',owner,message)).status,201);
 assert.equal((await h.call('wallet')).data.balance,95);assert.equal((await h.call('messages?request='+rid,reporter)).data.messages.length,1);
 assert.equal((await h.call('wallet',reporter)).data.balance,300);
 const game=await call('game-create',owner,{request:rid,type:'chess',expectedCost:5,sendToken:randomUUID()});assert.equal(game.status,201);
 const g=game.data.game;assert.equal((await call('game-action',reporter,{game:g.id,version:g.version,action:'accept',expectedCost:5})).status,200);
 assert.equal((await h.call('wallet')).data.balance,90);assert.equal((await h.call('wallet',reporter)).data.balance,295);
 assert.equal((await call('game-action',reporter,{game:g.id,version:g.version,action:'accept',expectedCost:5})).status,409);
 assert.equal((await h.call('wallet',reporter)).data.balance,295);
});
test('Timed feed photos: separate viewers, no unprotected image, 20-second expiry and no second charge',async t=>{
 const h=await app(t);const {owner,reporter,third,run}=h;
 for(const u of [reporter,third])await h.call('daily',u,'{}');
 const m=h.media(32);run("UPDATE media SET view_mode='once',open_price=20 WHERE id=?",m.id);
 const raw=(url,u)=>fetch(h.base+url,{headers:{Cookie:u.cookie}});
 assert.equal((await raw('/media/'+m.id,reporter)).status,410);
 const open=async u=>h.call('unlock',u,JSON.stringify({media:m.id,expectedPrice:20}));
 const a=await open(reporter);assert.equal(a.status,200);assert.equal(a.data.expires-a.data.serverNow<=20000,true);
 assert.equal((await raw(a.data.url,reporter)).status,200);
 assert.equal((await raw(a.data.url,third)).status,410);
 const b=await open(third);assert.equal(b.status,200);assert.notEqual(a.data.url,b.data.url);
 assert.equal((await open(reporter)).status,410);
 run('UPDATE photo_views SET expires=0 WHERE user_id=?',reporter.id);
 assert.equal((await raw(a.data.url,reporter)).status,410);
 assert.equal((await raw(b.data.url,third)).status,200);
 assert.equal((await h.call('wallet',reporter)).data.balance,280);
 assert.equal((await h.call('wallet',owner)).data.balance,20);
});
test('Permanent photos survive storage reset; default category prices are tenfold',async t=>{
 const h=await app(t);const permanent=h.media(40000);h.run("UPDATE media SET view_mode='permanent',expires=8640000000000000 WHERE id=?",permanent.id);h.run('UPDATE posts SET expires=NULL WHERE id=?',permanent.pid);
 const disposable=h.media(44900);
 const category=(await h.call('categories')).data.categories.find(c=>c.name==='Alltag');assert.equal(category.photo_price,h.one('SELECT photo_price FROM categories WHERE id=?',category.id).photo_price*10);
 await h.upload(200);
 assert.equal(h.one('SELECT removed FROM media WHERE id=?',permanent.id).removed,0);assert.equal(h.one('SELECT deleted FROM posts WHERE id=?',permanent.pid).deleted,0);
 assert.equal(h.one('SELECT removed FROM media WHERE id=?',disposable.id).removed,1);
});

test('Upload requires a viewing mode; permanent lifetime and paid chat retries persist correctly',async t=>{
 const h=await app(t);for(const u of [h.owner,h.reporter])await h.call('daily',u,'{}');
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/lZcAAAAASUVORK5CYII=','base64');
 const category=(await h.call('categories')).data.categories.find(c=>c.name==='Alltag');
 const upload=async(route,fields)=>{const form=new FormData();for(const[k,v]of Object.entries(fields))form.set(k,String(v));form.set('file',new Blob([png],{type:'image/png'}),'test.png');return h.call(route,h.owner,form);};
 const fields={body:'Ein Testfoto.',category:category.id,rights:true,expectedPrice:category.photo_price,uploadToken:randomUUID()};
 assert.equal((await upload('upload-post',fields)).status,400);
 const photo=await upload('upload-post',{...fields,viewMode:'permanent'});assert.equal(photo.status,201,JSON.stringify(photo.data));
 assert.equal(h.one('SELECT expires FROM posts WHERE id=?',photo.data.id).expires,null);
 assert.equal(h.one('SELECT view_mode FROM media WHERE id=?',photo.data.mediaId).view_mode,'permanent');
 const before=(await h.call('wallet')).data.balance;
 const rid=Number(h.run("INSERT INTO requests(sender,receiver,status,created) VALUES(?,?,'accepted',?)",h.owner.id,h.reporter.id,Date.now()).lastInsertRowid);
 const input={request:rid,rights:true,expectedCost:20,sendToken:randomUUID()};
 const a=await upload('upload-chat',input),b=await upload('upload-chat',input);assert.equal(a.status,201);assert.equal(b.data.mediaId,a.data.mediaId);
 assert.equal((await h.call('wallet')).data.balance,before-20);
 assert.equal(h.one('SELECT COUNT(*) n FROM messages WHERE request_id=?',rid).n,1);
 assert.equal((await h.call('wallet',h.reporter)).data.balance,300);
 const settings=await h.call('settings',h.owner,JSON.stringify({theme:'pride',language:'uk'}));assert.equal(settings.status,200);
 assert.equal((await h.call('settings')).data.settings.theme,'pride');assert.equal((await h.call('settings')).data.settings.language,'uk');
});

test('UI translations switch every supported language and preserve user text and option values',()=>{
 const nodes=[];const attributes=[];const make=(text,{skip=false,option=false}={})=>{const attrs={};const parent={closest:()=>skip,tagName:option?'OPTION':'SPAN',hasAttribute:k=>k in attrs,setAttribute:(k,v)=>attrs[k]=v};const node={nodeValue:text,parentElement:parent};nodes.push(node);return {node,attrs};};
 const heading=make('Kategorien'),error=make('Nicht genug Beleidigungen.'),person=make('Kategorien',{skip:true}),option=make('Deutsch',{option:true});
 const placeholder={closest:()=>false,getAttribute:k=>k==='placeholder'?(placeholder.text||'Bitte wähle eine Kategorie.'):null,setAttribute:(k,v)=>placeholder.text=v};attributes.push(placeholder);
 const tasks=[];const document={body:{querySelectorAll:()=>attributes},documentElement:{},createTreeWalker:()=>{let i=0;return{nextNode:()=>nodes[i++]};}};
 const ctx=vm.createContext({document,NodeFilter:{SHOW_TEXT:4},MutationObserver:class{observe(){}},requestAnimationFrame:fn=>tasks.push(fn)});
 vm.runInContext(readFileSync(new URL('public/translations.js',import.meta.url),'utf8'),ctx);vm.runInContext(readFileSync(new URL('public/i18n.js',import.meta.url),'utf8'),ctx);
 for(const [lang,expected]of [['en','Categories'],['ru','Категории'],['uk','Категорії'],['de','Kategorien']]){
  ctx.fLocale.set(lang);while(tasks.length)tasks.shift()();assert.equal(heading.node.nodeValue,expected);assert.equal(person.node.nodeValue,'Kategorien');assert.equal(option.attrs.value,'Deutsch');assert.equal(document.documentElement.lang,lang);
  if(lang!=='de'){assert.notEqual(error.node.nodeValue,'Nicht genug Beleidigungen.');assert.notEqual(placeholder.text,'Bitte wähle eine Kategorie.');}
 }
});
