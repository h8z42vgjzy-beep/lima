import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
export const chapters=[['flowers','bloom','comet'],['footer','pride','moon'],['heart','spark','orbit'],['petal','equality','rainbow'],['aurora','echo','leaf'],['wave','pulse','crystal'],['sun','peace','nova'],['unity','dream','galaxy']];
export const defaults={language:'de',theme:'night',enabled:true,reactions:true,replies:true,messages:true,invitations:true,chess:true,effects:true};
export function validSubscription(s){
 let u;try{u=new URL(s?.endpoint);}catch{return false;}
 const host=u.hostname;
 return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&s.endpoint.length<2048&&
 (host==='fcm.googleapis.com'||host==='updates.push.services.mozilla.com'||host.endsWith('.push.apple.com')||host==='web.push.apple.com'||host.endsWith('.notify.windows.com'))&&
 /^[A-Za-z0-9_-]{87}$/.test(s.keys?.p256dh||'')&&/^[A-Za-z0-9_-]{22}$/.test(s.keys?.auth||'');
}
export async function createActivity({db,one,all,run,now,dataDir,blocked,ledger,transact,pushDriver}){
 db.exec(`CREATE TABLE IF NOT EXISTS account_settings(user_id INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,value TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS activity_notices(id INTEGER PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,actor INTEGER NOT NULL,type TEXT NOT NULL,target INTEGER NOT NULL,event_key TEXT NOT NULL UNIQUE,created INTEGER NOT NULL,read_at INTEGER);
 CREATE INDEX IF NOT EXISTS activity_user ON activity_notices(user_id,id);
 CREATE TABLE IF NOT EXISTS push_devices(endpoint TEXT PRIMARY KEY,user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,session TEXT NOT NULL,subscription TEXT NOT NULL);
 CREATE TABLE IF NOT EXISTS push_jobs(notice_id INTEGER NOT NULL REFERENCES activity_notices(id) ON DELETE CASCADE,endpoint TEXT NOT NULL REFERENCES push_devices(endpoint) ON DELETE CASCADE,tries INTEGER NOT NULL DEFAULT 0,next_at INTEGER NOT NULL,PRIMARY KEY(notice_id,endpoint));
 CREATE TABLE IF NOT EXISTS discoveries(user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,secret TEXT NOT NULL,created INTEGER NOT NULL,PRIMARY KEY(user_id,secret));`);
 for(const [name,type]of [['last_status','TEXT'],['checked','INTEGER']])if(!all('PRAGMA table_info(push_devices)').some(c=>c.name===name))db.exec('ALTER TABLE push_devices ADD COLUMN '+name+' '+type);
 let driver=pushDriver,key=null;
 if(!driver){try{driver=(await import('web-push')).default;}catch(e){if(e.code!=='ERR_MODULE_NOT_FOUND')throw e;console.warn('Push unavailable: install dependencies with yarn.');}}
 if(driver){const file=path.join(dataDir,'push-vapid.json');if(existsSync(file))key=JSON.parse(readFileSync(file,'utf8'));else{key=driver.generateVAPIDKeys();writeFileSync(file,JSON.stringify(key),{mode:0o600,flag:'wx'});}driver.setVapidDetails(process.env.F_PUSH_SUBJECT||'https://lima-te6q.onrender.com',key.publicKey,key.privateKey);}
 const settings=uid=>({...defaults,...JSON.parse(one('SELECT value FROM account_settings WHERE user_id=?',uid)?.value||'{}')});
 function save(uid,b){const p=settings(uid);if(b.language!==undefined){if(!['de','en','ru','uk'].includes(b.language))throw [400,'Ungültige Sprache.'];p.language=b.language;}if(b.theme!==undefined){if(!['night','pride','forest','ice'].includes(b.theme))throw [400,'Ungültiges Design.'];p.theme=b.theme;}for(const k of Object.keys(defaults).filter(k=>!['language','theme'].includes(k)))if(b[k]!==undefined){if(typeof b[k]!=='boolean')throw [400,'Ungültige Einstellung.'];p[k]=b[k];}run('INSERT INTO account_settings VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET value=excluded.value',uid,JSON.stringify(p));return p;}
 function notify(uid,actor,type,target,event){if(uid===actor||blocked(uid,actor))return;const p=settings(uid);if(!p.enabled||!p[type])return;const r=run('INSERT OR IGNORE INTO activity_notices(user_id,actor,type,target,event_key,created) VALUES(?,?,?,?,?,?)',uid,actor,type,target,event,now());if(!r.changes)return;run('INSERT INTO push_jobs(notice_id,endpoint,next_at) SELECT ?,endpoint,? FROM push_devices WHERE user_id=?',Number(r.lastInsertRowid),now(),uid);}
 const text={de:{reactions:'Neue Reaktion auf deinen Beitrag',replies:'Neue Antwort auf deinen Kommentar',messages:'Neue private Nachricht',invitations:'Neue Spieleinladung',chess:'Neues aus deiner Schachpartie'},en:{reactions:'New reaction to your post',replies:'New reply to your comment',messages:'New private message',invitations:'New game invitation',chess:'Your chess game has an update'},ru:{reactions:'Новая реакция на вашу публикацию',replies:'Новый ответ на ваш комментарий',messages:'Новое личное сообщение',invitations:'Приглашение в игру',chess:'Обновление шахматной партии'},uk:{reactions:'Нова реакція на ваш допис',replies:'Нова відповідь на ваш коментар',messages:'Нове приватне повідомлення',invitations:'Запрошення до гри',chess:'Оновлення шахової партії'}};
 let busy=false;
 async function drain(){if(busy||!driver)return;busy=true;try{
 run('DELETE FROM push_devices WHERE session NOT IN (SELECT token FROM sessions WHERE expires>?)',now());
 for(const job of all('SELECT j.*,n.user_id,n.actor,n.type,n.target,n.created,n.read_at,d.subscription FROM push_jobs j JOIN activity_notices n ON n.id=j.notice_id JOIN push_devices d ON d.endpoint=j.endpoint WHERE j.next_at<=? LIMIT 20',now())){
 const remove=()=>run('DELETE FROM push_jobs WHERE notice_id=? AND endpoint=?',job.notice_id,job.endpoint),p=settings(job.user_id);
 if(job.read_at||now()-job.created>86400000||!p.enabled||!p[job.type]||blocked(job.user_id,job.actor)){remove();continue;}
 try{await driver.sendNotification(JSON.parse(job.subscription),JSON.stringify({title:'Feindschaft',body:text[p.language][job.type],url:'/?notice='+job.notice_id,tag:'activity-'+job.notice_id,recipient:job.user_id}),{TTL:86400,timeout:5000});run('UPDATE push_devices SET last_status=?,checked=? WHERE endpoint=?','accepted',now(),job.endpoint);remove();}
 catch(e){run('UPDATE push_devices SET last_status=?,checked=? WHERE endpoint=?',String(e.statusCode||'network'),now(),job.endpoint);if([404,410].includes(e.statusCode))run('DELETE FROM push_devices WHERE endpoint=?',job.endpoint);else if(job.tries>=4)remove();else run('UPDATE push_jobs SET tries=tries+1,next_at=? WHERE notice_id=? AND endpoint=?',now()+30000*2**job.tries,job.notice_id,job.endpoint);}
 }
 }finally{busy=false;}}
 const timer=setInterval(()=>drain().catch(()=>console.warn('Push delivery deferred.')),3000);timer.unref();
 function progress(uid){const found=all('SELECT secret FROM discoveries WHERE user_id=?',uid).map(x=>x.secret);const chapter=chapters.findIndex(c=>!c.every(x=>found.includes(x)));return {found,chapter:chapter<0?chapters.length:chapter,chapters,reward:20,complete:chapter<0};}
 function discover(uid,id){return transact(()=>{const p=progress(uid);if(p.found.includes(id))return {...p,earned:0};if(p.complete||!chapters[p.chapter].includes(id))throw [409,'Dieses Geheimnis gehört zu einem späteren Kapitel.'];run('INSERT INTO discoveries VALUES(?,?,?)',uid,id,now());const next=progress(uid);const earned=next.chapter>p.chapter?20:0;if(earned)ledger(uid,'discovery:'+uid+':'+p.chapter,earned,'Entdeckungskapitel '+(p.chapter+1));return {...next,earned};});}
 return {settings,save,notify,progress,discover,drain,close:()=>clearInterval(timer),
 config:()=>({available:!!key,publicKey:key?.publicKey||null}),
 status(uid,endpoint){return one('SELECT last_status,checked FROM push_devices WHERE user_id=? AND endpoint=?',uid,endpoint)||null;},
 async test(uid,endpoint){if(!driver)throw [503,'Push ist auf dem Server nicht bereit.'];const device=one('SELECT subscription FROM push_devices WHERE endpoint=? AND user_id=?',endpoint,uid);if(!device)throw [404,'Dieses Gerät ist nicht für Push registriert.'];try{await driver.sendNotification(JSON.parse(device.subscription),JSON.stringify({title:'Feindschaft',body:{de:'Deine Test-Mitteilung ist angekommen.',en:'Your test notification has arrived.',ru:'Тестовое уведомление получено.',uk:'Тестове сповіщення отримано.'}[settings(uid).language],url:'/?notice=0',tag:'push-test',recipient:uid}),{TTL:300,timeout:8000});run('UPDATE push_devices SET last_status=?,checked=? WHERE endpoint=?','accepted',now(),endpoint);return {accepted:true};}catch(e){run('UPDATE push_devices SET last_status=?,checked=? WHERE endpoint=?',String(e.statusCode||'network'),now(),endpoint);throw [502,'Push-Versand fehlgeschlagen ('+String(e.statusCode||'network')+'). Bitte Push auf diesem Gerät neu aktivieren.'];}},
 subscribe(uid,session,s){if(!key)throw [503,'Push wird auf diesem Server noch nicht unterstützt.'];if(!validSubscription(s))throw [400,'Ungültiges Push-Abonnement.'];if(one('SELECT COUNT(*) AS n FROM push_devices WHERE user_id=?',uid).n>=10&&!one('SELECT 1 FROM push_devices WHERE endpoint=? AND user_id=?',s.endpoint,uid))throw [400,'Zu viele Geräte.'];const previous=one('SELECT user_id FROM push_devices WHERE endpoint=?',s.endpoint);if(previous&&previous.user_id!==uid)throw [409,'Melde das vorherige Konto auf diesem Gerät zuerst ab.'];run('INSERT INTO push_devices(endpoint,user_id,session,subscription) VALUES(?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET session=excluded.session,subscription=excluded.subscription',s.endpoint,uid,session,JSON.stringify(s));},
 list(uid){return all('SELECT n.*,u.name FROM activity_notices n JOIN users u ON u.id=n.actor WHERE n.user_id=? ORDER BY n.id DESC LIMIT 100',uid).filter(n=>!blocked(uid,n.actor));},
 read(uid,id){run('UPDATE activity_notices SET read_at=? WHERE user_id=? AND id=?',now(),uid,id);},
 unsubscribe(uid,endpoint){run('DELETE FROM push_devices WHERE user_id=? AND endpoint=?',uid,endpoint);}
 };
}
