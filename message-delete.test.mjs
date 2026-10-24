import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {createMessageDeletion} from './message-delete.mjs';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

function setup(t){
  const db=new DatabaseSync(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;CREATE TABLE users(id INTEGER PRIMARY KEY);INSERT INTO users VALUES(1),(2),(3);
    CREATE TABLE requests(id INTEGER PRIMARY KEY,sender INTEGER,receiver INTEGER,status TEXT);INSERT INTO requests VALUES(1,1,2,'accepted');
    CREATE TABLE messages(id INTEGER PRIMARY KEY,request_id INTEGER,sender INTEGER,body TEXT,created INTEGER,media_id INTEGER,deleted INTEGER DEFAULT 0);
    INSERT INTO messages VALUES(1,1,1,'Hallo',0,NULL,0),(2,1,2,'Antwort',0,NULL,0),(3,1,1,'Foto',0,10,0);
    CREATE TABLE reports(target_type TEXT,target_id INTEGER,reporter INTEGER,status TEXT);
    CREATE TABLE blocks(user_id INTEGER,target INTEGER);`);
  const one=(q,...a)=>db.prepare(q).get(...a),all=(q,...a)=>db.prepare(q).all(...a),run=(q,...a)=>db.prepare(q).run(...a);
  const transact=fn=>{db.exec('BEGIN');try{const r=fn();db.exec('COMMIT');return r;}catch(e){db.exec('ROLLBACK');throw e;}};
  let time=100000;
  const chatAccess=(user,id)=>{const q=one('SELECT * FROM requests WHERE id=?',id);if(!q||q.status!=='accepted'||![q.sender,q.receiver].includes(user.id)||one('SELECT 1 FROM blocks WHERE (user_id=? AND target=?) OR (user_id=? AND target=?)',q.sender,q.receiver,q.receiver,q.sender))throw[403,'Dieser Chat ist nicht freigegeben.'];return q;};
  const service=createMessageDeletion({db,one,run,transact,now:()=>time,chatAccess});t.after(()=>{service.close();db.close();});
  const remove=(id,message,scope)=>service.remove(id?{id}:null,{message,scope});
  const visible=id=>all('SELECT id,body FROM messages WHERE deleted=0 AND NOT EXISTS(SELECT 1 FROM hidden_messages h WHERE h.message_id=messages.id AND h.user_id=?) ORDER BY id',id);
  return {one,run,service,remove,visible,advance:ms=>time+=ms};
}
function rejects(fn,status){assert.throws(fn,e=>Array.isArray(e)&&e[0]===status);}

test('Sent and received text can be deleted only for the current account, without changing the other view',t=>{
  const h=setup(t);h.remove(1,1,'self');assert.equal(h.visible(1).some(m=>m.id===1),false);assert.equal(h.visible(2).some(m=>m.id===1),true);
  h.remove(1,2,'self');assert.equal(h.visible(1).some(m=>m.id===2),false);assert.equal(h.visible(2).some(m=>m.id===2),true);
  h.remove(1,2,'self');assert.equal(h.one('SELECT COUNT(*) n FROM hidden_messages').n,2);assert.equal(h.one('SELECT body FROM messages WHERE id=2').body,'Antwort');
});
test('Only the sender can delete for both; this also works after hiding the message for self',t=>{
  const h=setup(t);rejects(()=>h.remove(2,1,'everyone'),403);assert.equal(h.one('SELECT body FROM messages WHERE id=1').body,'Hallo');
  h.remove(1,1,'self');h.remove(1,1,'everyone');assert.equal(h.visible(1).some(m=>m.id===1),false);assert.equal(h.visible(2).some(m=>m.id===1),false);
  assert.equal(h.one('SELECT body FROM messages WHERE id=1').body,'');assert.equal(h.remove(1,1,'everyone').alreadyDeleted,true);
});
test('Unauthenticated users, outsiders, blocked chats, photos and invalid scopes cannot delete text',t=>{
  const h=setup(t);rejects(()=>h.remove(null,1,'self'),401);rejects(()=>h.remove(3,1,'self'),403);rejects(()=>h.remove(3,1,'everyone'),403);
  rejects(()=>h.remove(1,3,'self'),400);rejects(()=>h.remove(1,1,'invalid'),400);rejects(()=>h.remove(1,'1','self'),400);
  h.run('INSERT INTO blocks VALUES(2,1)');rejects(()=>h.remove(1,1,'everyone'),403);assert.equal(h.one('SELECT deleted FROM messages WHERE id=1').deleted,0);
});
test('Reported text has a moderation-only copy for up to 28 days; ordinary deleted text has none',t=>{
  const h=setup(t);h.run("INSERT INTO reports VALUES('message',1,2,'open')");h.remove(1,1,'everyone');assert.equal(h.service.evidence(1).body,'Hallo');
  h.remove(2,2,'everyone');assert.equal(h.service.evidence(2),undefined);assert.equal(h.one('SELECT body FROM messages WHERE id=2').body,'');
  h.advance(28*86400000+1);h.service.cleanup();assert.equal(h.service.evidence(1),undefined);
});
test('A user report preserves only the reported sender text in the reporter’s own conversation',t=>{
  const h=setup(t);h.run("INSERT INTO reports VALUES('user',1,2,'open')");h.remove(1,1,'everyone');assert.equal(h.service.evidence(1).body,'Hallo');
  h.run("INSERT INTO reports VALUES('user',2,3,'open')");h.remove(2,2,'everyone');assert.equal(h.service.evidence(2),undefined);
});

function ui(){
  let current=null;const calls=[],notes=[];let refreshes=0;
  function element(tag){return {tagName:tag,children:[],textContent:'',isConnected:true,setAttribute(){},append(...a){this.children.push(...a);},querySelectorAll(){return this.children.filter(x=>x.tagName==='button');},addEventListener(event,fn){this[event]=fn;},showModal(){},close(){if(this.closeEvent)this.closeEvent();this.remove();},remove(){this.isConnected=false;}};}
  const context=vm.createContext({document:{documentElement:{lang:'de'},createElement(tag){const e=element(tag);e.addEventListener=(event,fn)=>{if(event==='close')e.closeEvent=fn;};return e;},body:{append:e=>current=e}},user:{id:1},chatId:1,modalView:'chat',api:async(route,b)=>{calls.push({route,b});},toast:m=>notes.push(m),loadMessages:async()=>{refreshes++;}});
  vm.runInContext(readFileSync(new URL('message-delete-client.js',import.meta.url),'utf8'),context);
  return {context,calls,notes,current:()=>current,refreshes:()=>refreshes};
}
test('Delete dialog offers both options only for sent messages; cancel sends no request',async()=>{
  const h=ui();h.context.fMessageDelete.open(1,true);assert.deepEqual(h.current().querySelectorAll('button').map(b=>b.textContent),['Nur für mich löschen','Für beide löschen','Abbrechen']);
  await h.current().querySelectorAll('button')[2].onclick();assert.equal(h.calls.length,0);
  h.context.fMessageDelete.open(2,false);assert.deepEqual(h.current().querySelectorAll('button').map(b=>b.textContent),['Nur für mich löschen','Abbrechen']);
  await h.current().querySelectorAll('button')[0].onclick();assert.equal(h.calls[0].b.scope,'self');assert.equal(h.refreshes(),1);
});
test('A pending delete dialog cannot act under a different signed-in account',async()=>{
  const h=ui();h.context.fMessageDelete.open(1,true);h.context.user={id:2};await h.current().querySelectorAll('button')[1].onclick();assert.equal(h.calls.length,0);
});
