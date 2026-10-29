import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {DatabaseSync} from 'node:sqlite';
import {mkdtempSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
export const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAACgAAAAeCAIAAADRv8uKAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAO0lEQVRIie3VwQkAMAwCwG7tku5kx2gfB/kHgvFOsydzLI5TV7jmnaJAqjIHiWBxWAwWi8VhMVjsVyxekHKV939FaegAAAAASUVORK5CYII=','base64');
export function wave(seconds=1){const b=Buffer.alloc(44+Math.floor(44100*2*seconds));b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(b.length-44,40);return b;}
export async function app(t,{grant=1000,seed}={}){
 const dir=mkdtempSync(path.join(tmpdir(),'feindschaft-v11-'));
 if(seed)seed(dir);
 const child=spawn(process.execPath,['server.mjs'],{cwd:import.meta.dirname,env:{...process.env,PORT:'0',F_DATA_DIR:dir,F_STORAGE_BYTES:String(1024**3),NODE_NO_WARNINGS:'1'},stdio:['ignore','pipe','pipe']});
 let errors='';child.stderr.on('data',x=>errors+=x);
 const port=await new Promise((resolve,reject)=>{child.stdout.on('data',x=>{const m=/0\.0\.0\.0:(\d+)/.exec(String(x));if(m)resolve(m[1]);});child.once('error',reject);child.once('exit',()=>reject(Error(errors)));});
 const base='http://127.0.0.1:'+port,db=new DatabaseSync(path.join(dir,'feindschaft.sqlite'));
 const one=(q,...v)=>db.prepare(q).get(...v),all=(q,...v)=>db.prepare(q).all(...v),run=(q,...v)=>db.prepare(q).run(...v);
 const aborts=[];
 t.after(async()=>{for(const abort of aborts)abort.abort();db.close();if(child.exitCode===null){const exit=new Promise(r=>child.once('exit',r));child.kill('SIGTERM');await exit;}rmSync(dir,{recursive:true,force:true});});
 function client(){return {id:null,cookie:'',async raw(route,{data,method='GET',headers={},noHeader=false}={}){if(this.cookie)headers={...headers,Cookie:this.cookie};if(data!==undefined){method='POST';if(!noHeader)headers['X-F-Request']='1';if(!(data instanceof FormData))headers['Content-Type']='application/json';}
   const response=await fetch(base+route,{method,headers,body:data===undefined?undefined:data instanceof FormData?data:JSON.stringify(data)});const cookie=response.headers.get('set-cookie');if(cookie)this.cookie=cookie.split(';')[0];return response;},
  async call(route,data,opts={}){const r=await this.raw('/api/'+route,{data,...opts});const result=await r.json();return {status:r.status,data:result};},
  async balance(){return (await this.call('me')).data.user.balance;},
  async upload(route='upload-post',fields={},bytes=png,name='photo.png'){const form=new FormData();const defaults=route==='upload-post'?{body:'Ein eigener Testbeitrag.',category:one("SELECT id FROM categories WHERE name='Alltag'").id,rights:true,expectedPrice:50,viewMode:'permanent',uploadToken:randomUUID()}:{rights:true,expectedCost:20,sendToken:randomUUID()};for(const [k,v]of Object.entries({...defaults,...fields}))form.set(k,String(v));form.set('file',new Blob([bytes]),name);return this.call(route,form);}};}
 function account(name,balance=grant,admin=false){const a=client();a.id=Number(run('INSERT INTO users(name,color,created,is_admin) VALUES(?,?,?,?)',name,'lavender',Date.now(),admin?1:0).lastInsertRowid);const token=randomUUID();a.cookie='f_session='+token;run('INSERT INTO sessions VALUES(?,?,?)',createHash('sha256').update(token).digest('hex'),a.id,Date.now()+86400000);if(balance)run('INSERT INTO wallet_entries(user_id,operation,amount_half,description,created) VALUES(?,?,?,?,?)',a.id,'fixture:'+a.id,balance*2,'Testguthaben',Date.now());return a;}
 async function chat(a,b){const result=await a.call('request',{target:b.id,expectedCost:200});assert.equal(result.status,201,JSON.stringify(result.data));const id=result.data.request;assert.equal((await b.call('respond',{request:id,status:'accepted'})).status,200);return id;}
 const alice=account('AliceTest'),bob=account('BobTest'),eve=account('EveTest'),admin=account('AdminTest',grant,true),anon=client();
 return {base,dir,db,one,all,run,account,client,chat,alice,bob,eve,admin,anon,aborts,errors:()=>errors.split('\n').filter(l=>l&&!l.startsWith('Push unavailable')).join('\n')};
}
