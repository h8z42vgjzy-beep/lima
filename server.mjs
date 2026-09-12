import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.dirname(fileURLToPath(import.meta.url));
const dataDir = process.env.F_DATA_DIR || path.join(root, 'data');
mkdirSync(dataDir, {recursive: true, mode: 0o700});
const db = new DatabaseSync(path.join(dataDir, 'feindschaft.sqlite'));
db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, hash TEXT, color TEXT NOT NULL, demo INTEGER DEFAULT 0, trial_start INTEGER, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, expires INTEGER);
CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, category TEXT NOT NULL, created INTEGER NOT NULL, sample_flowers INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS flowers(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id,post_id));
CREATE TABLE IF NOT EXISTS saves(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id,post_id));
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY, user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, body TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS requests(id INTEGER PRIMARY KEY, sender INTEGER REFERENCES users(id) ON DELETE CASCADE, receiver INTEGER REFERENCES users(id) ON DELETE CASCADE, status TEXT DEFAULT 'pending', created INTEGER NOT NULL, UNIQUE(sender,receiver));
CREATE TABLE IF NOT EXISTS messages(id INTEGER PRIMARY KEY, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, sender INTEGER REFERENCES users(id) ON DELETE CASCADE, body TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS blocks(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, target INTEGER REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(user_id,target));
CREATE TABLE IF NOT EXISTS hidden(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, PRIMARY KEY(user_id,post_id));`);
const one = (q,...args) => db.prepare(q).get(...args);
const all = (q,...args) => db.prepare(q).all(...args);
const run = (q,...args) => db.prepare(q).run(...args);

// Additive migration: existing accounts, posts and conversations are preserved.
for(const [table,column,definition] of [['users','gender',"TEXT NOT NULL DEFAULT ''"],['users','orientation',"TEXT NOT NULL DEFAULT ''"],['users','queer',"TEXT NOT NULL DEFAULT ''"],['users','identity_visible','INTEGER NOT NULL DEFAULT 0'],['comments','parent_id','INTEGER REFERENCES comments(id) ON DELETE CASCADE']]){
 if(!all(`PRAGMA table_info(${table})`).some(c=>c.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
db.exec(`CREATE TABLE IF NOT EXISTS reactions(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, kind TEXT NOT NULL, target_id INTEGER NOT NULL, owner_id INTEGER REFERENCES users(id) ON DELETE CASCADE, value INTEGER NOT NULL CHECK(value IN(-1,1)), created INTEGER NOT NULL, PRIMARY KEY(user_id,kind,target_id));
CREATE TABLE IF NOT EXISTS daily_claims(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, day TEXT NOT NULL, amount INTEGER NOT NULL DEFAULT 300, created INTEGER NOT NULL, PRIMARY KEY(user_id,day));
CREATE INDEX IF NOT EXISTS reaction_target ON reactions(kind,target_id);
CREATE INDEX IF NOT EXISTS comment_post ON comments(post_id,created);`);
// Existing flowers become likes; their value is derived, not credited twice.
db.exec("INSERT OR IGNORE INTO reactions(user_id,kind,target_id,owner_id,value,created) SELECT f.user_id,'post',f.post_id,p.user_id,1,p.created FROM flowers f JOIN posts p ON p.id=f.post_id");
db.exec('DELETE FROM flowers');
const genders=['','Frau','Mann','Nichtbinär','Agender','Genderfluid','Anders'];
const orientations=['','Lesbisch','Schwul','Bisexuell','Pansexuell','Asexuell','Queer','Heterosexuell','Noch offen','Anders'];
const berlinDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function profileFields(b){const gender=b.gender??'',orientation=b.orientation??'',queer=b.queer??'';if(!genders.includes(gender)||!orientations.includes(orientation)||!['','Ja','Nein','Noch offen'].includes(queer))throw [400,'Bitte wähle eine gültige Profilangabe.'];return {gender,orientation,queer,identityVisible:b.identityVisible===true};}
function wallet(uid){return {balance:one('SELECT COALESCE(SUM(amount),0) AS n FROM daily_claims WHERE user_id=?',uid).n+one('SELECT COALESCE(SUM(CASE value WHEN 1 THEN 2 ELSE -5 END),0) AS n FROM reactions WHERE owner_id=?',uid).n,canClaim:!one('SELECT 1 FROM daily_claims WHERE user_id=? AND day=?',uid,berlinDay()),day:berlinDay()};}
function publicUser(u){return {id:u.id,name:u.name,color:u.color,demo:!!u.demo,gender:u.identity_visible?u.gender:'',orientation:u.identity_visible?u.orientation:'',queer:u.identity_visible?u.queer:'',plus:!!u.trial_start&&Date.now()<u.trial_start+7*86400000};}
function reactionStats(kind,id,uid){const rows=all('SELECT value,COUNT(*) AS n FROM reactions WHERE kind=? AND target_id=? GROUP BY value',kind,id);return {likes:rows.find(r=>r.value===1)?.n||0,dislikes:rows.find(r=>r.value===-1)?.n||0,vote:one('SELECT value FROM reactions WHERE user_id=? AND kind=? AND target_id=?',uid,kind,id)?.value||0};}
function visibleComments(pid,uid){return all(`SELECT c.*,u.name,u.color FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? AND u.id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND u.id NOT IN(SELECT user_id FROM blocks WHERE target=?) ORDER BY c.created LIMIT 300`,pid,uid,uid);}
function feedRows(uid){return all(`SELECT p.*,u.name,u.color,u.demo,u.trial_start FROM posts p JOIN users u ON u.id=p.user_id WHERE u.id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND u.id NOT IN(SELECT user_id FROM blocks WHERE target=?) AND p.id NOT IN(SELECT post_id FROM hidden WHERE user_id=?) ORDER BY p.created DESC LIMIT 200`,uid,uid,uid).map(p=>{const r=reactionStats('post',p.id,uid),c=visibleComments(p.id,uid);return {...p,...r,likes:r.likes+p.sample_flowers,flowers:r.likes+p.sample_flowers,liked:r.vote===1,comments:c.length,recentComments:c.filter(x=>x.created>Date.now()-86400000).length,lastDiscussion:c.at(-1)?.created||p.created,saved:!!one('SELECT 1 FROM saves WHERE user_id=? AND post_id=?',uid,p.id),plus:!!p.trial_start&&Date.now()<p.trial_start+7*86400000,trial_start:undefined};});}

const now = () => Date.now();
const DAY = 86400000;
const colors = ['pink','mint','lavender','yellow','blue'];
if (!one('SELECT id FROM users LIMIT 1')) {
  const samples = [
    ['Mila','pink','Du bist der menschgewordene „Ich habe die AGB gelesen“-Haken.','Alltag',128],
    ['Ben','mint','Dein Zeitmanagement hat wahrscheinlich selbst die Deadline verpasst.','Schule & Uni',96],
    ['Juno','lavender','Du bist wie ein Softwareupdate. Niemand hat gefragt, aber jetzt dauert alles länger.','Internet',84],
    ['Theo','yellow','Deine To-do-Liste ist inzwischen historische Fiktion.','Alltag',67],
    ['Nika','blue','Du hast so viele Tabs offen, selbst dein Browser braucht einen Sitzkreis.','Internet',52]
  ];
  samples.forEach(([name,color,body,category,count],i)=>{
    const uid=run('INSERT INTO users(name,color,demo,created) VALUES(?,?,1,?)',name,color,now()).lastInsertRowid;
    run('INSERT INTO posts(user_id,body,category,created,sample_flowers) VALUES(?,?,?,?,?)',uid,body,category,now()-(i+1)*1000*60*17,count);
  });
}
const derive=promisify(scrypt);
const digest=t=>createHash('sha256').update(t).digest('hex');
const safeUser=u=>u ? {id:u.id,name:u.name,color:u.color,gender:u.gender,orientation:u.orientation,queer:u.queer,identityVisible:!!u.identity_visible,plus:!!u.trial_start && now()<u.trial_start+7*DAY,trialEnd:u.trial_start?u.trial_start+7*DAY:null,trialUsed:!!u.trial_start,...wallet(u.id)} : null;
const blocked=(a,b)=>!!one('SELECT 1 FROM blocks WHERE (user_id=? AND target=?) OR (user_id=? AND target=?)',a,b,b,a);
const limits=new Map();
function rate(key,max,window=60000){const t=now();let arr=(limits.get(key)||[]).filter(x=>t-x<window);if(arr.length>=max)throw [429,'Kurz durchatmen. Bitte versuche es gleich noch einmal.'];arr.push(t);limits.set(key,arr);}
setInterval(()=>{for(const [k,v] of limits)if(now()-v.at(-1)>3600000)limits.delete(k);run('DELETE FROM sessions WHERE expires<?',now());},300000).unref();
function textField(b,k,min,max){const v=typeof b[k]==='string'?b[k].trim():'';if(v.length<min||v.length>max)throw [400,`${k==='body'?'Dein Text':'Deine Eingabe'} muss zwischen ${min} und ${max} Zeichen lang sein.`];return v;}
function idField(b,k){const v=Number(b[k]);if(!Number.isSafeInteger(v)||v<1)throw [400,'Ungültige Auswahl.'];return v;}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>12000)throw [413,'Diese Eingabe ist zu lang.'];}try{return JSON.parse(s||'{}');}catch{throw [400,'Die Eingabe konnte nicht gelesen werden.'];}}
const staticFiles={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/night.css':['night.css','text/css; charset=utf-8'],'/favicon.svg':['favicon.svg','image/svg+xml']};
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; font-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com");
  const url=new URL(req.url,'http://localhost');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  try {
    if(!url.pathname.startsWith('/api/')){
      const item=staticFiles[url.pathname];if(!item||!['GET','HEAD'].includes(req.method)){res.writeHead(404);return res.end('Nicht gefunden.');}
      res.writeHead(200,{'Content-Type':item[1],'Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?'':readFileSync(path.join(root,'public',item[0])));
    }
    const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('f_session='))?.slice(10);
    const user=cookie?one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?',digest(cookie),now()):null;
    const route=url.pathname.slice(5);
    if(req.method==='GET'){
      if(route==='me')return send(200,{user:safeUser(user)});
      if(route==='feed')return send(200,{posts:feedRows(user?.id||0),members:one('SELECT COUNT(*) AS n FROM users WHERE demo=0').n});
      if(!user)throw [401,'Melde dich an, um mitzumachen.'];
      if(route==='comments'){
        const pid=idField(Object.fromEntries(url.searchParams),'post');
        const p=one('SELECT * FROM posts WHERE id=?',pid);if(!p||blocked(user.id,p.user_id))throw [404,'Spruch nicht gefunden.'];
        return send(200,{comments:visibleComments(pid,user.id).map(c=>({...c,...reactionStats('comment',c.id,user.id)}))});
      }
      if(route==='people')return send(200,{people:all(`SELECT * FROM users WHERE demo=0 AND id!=? AND id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND id NOT IN(SELECT user_id FROM blocks WHERE target=?) ORDER BY name LIMIT 100`,user.id,user.id,user.id).map(publicUser),requests:all(`SELECT r.*,u.name,u.color FROM requests r JOIN users u ON u.id=CASE WHEN r.sender=? THEN r.receiver ELSE r.sender END WHERE (r.sender=? OR r.receiver=?) AND u.id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND u.id NOT IN(SELECT user_id FROM blocks WHERE target=?) ORDER BY r.created DESC`,user.id,user.id,user.id,user.id,user.id)});
      if(route==='messages'){
        const rid=idField(Object.fromEntries(url.searchParams),'request');const r=one('SELECT * FROM requests WHERE id=?',rid);
        if(!r||r.status!=='accepted'||![r.sender,r.receiver].includes(user.id)||blocked(r.sender,r.receiver))throw [403,'Dieser Chat ist nicht freigegeben.'];
        return send(200,{messages:all('SELECT id,sender,body,created FROM messages WHERE request_id=? ORDER BY created LIMIT 500',rid)});
      }
      if(route==='member'){
        const target=idField(Object.fromEntries(url.searchParams),'id');const other=one('SELECT * FROM users WHERE id=?',target);
        if(!other||blocked(user.id,target))throw [404,'Profil nicht gefunden.'];
        return send(200,{member:publicUser(other)});
      }
      if(route==='profile')return send(200,{user:safeUser(user),flowers:one("SELECT COUNT(*) AS n FROM reactions WHERE owner_id=? AND value=1",user.id).n,posts:one('SELECT COUNT(*) AS n FROM posts WHERE user_id=?',user.id).n,blocks:all('SELECT u.id,u.name,u.color FROM blocks b JOIN users u ON u.id=b.target WHERE b.user_id=?',user.id)});
      throw [404,'Nicht gefunden.'];
    }
    if(req.method!=='POST')throw [405,'Nicht unterstützt.'];
    if(!req.headers['content-type']?.startsWith('application/json')||req.headers['x-f-request']!=='1')throw [403,'Ungültige Anfrage. Bitte lade die Seite neu.'];
    // A custom request header and JSON enforce a same-origin browser request; CORS is never enabled.
    const b=await body(req);
    if(route==='register'||route==='login'){
      rate('auth:'+req.socket.remoteAddress,12,60000);
      const name=textField(b,'name',3,24);const password=textField(b,'password',10,128);
      if(!/^[\p{L}\p{N}_-]+$/u.test(name))throw [400,'Dein Name darf Buchstaben, Zahlen, _ und - enthalten.'];
      let u=one('SELECT * FROM users WHERE name=?',name);
      if(route==='register'){
        if(b.consent!==true)throw [400,'Bitte stimme zuerst den Spielregeln zu.'];
        if(u)throw [409,'Dieser Name ist schon vergeben.'];
        const profile=profileFields(b);
        const salt=randomBytes(16).toString('hex');const key=await derive(password,salt,64);
        try{run('INSERT INTO users(name,hash,color,created,gender,orientation,queer,identity_visible) VALUES(?,?,?,?,?,?,?,?)',name,salt+':'+key.toString('hex'),colors[Math.floor(Math.random()*colors.length)],now(),profile.gender,profile.orientation,profile.queer,profile.identityVisible?1:0);}catch(e){if(e.code?.includes('CONSTRAINT')||e.message.includes('UNIQUE'))throw [409,'Dieser Name ist schon vergeben.'];throw e;}
        u=one('SELECT * FROM users WHERE name=?',name);
      }else{
        const salt=u?.hash?.split(':')[0]||'invalid-salt';const expected=u?.hash?.split(':')[1];const key=await derive(password,salt,64);
        if(!expected||!timingSafeEqual(key,Buffer.from(expected,'hex')))throw [401,'Name oder Passwort stimmen nicht.'];
      }
      const token=randomBytes(32).toString('hex');run('INSERT INTO sessions VALUES(?,?,?)',digest(token),u.id,now()+7*DAY);
      const secure=req.headers['x-forwarded-proto']==='https'||!!req.socket.encrypted;
      res.setHeader('Set-Cookie',`f_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=604800${secure?'; Secure':''}`);
      return send(200,{user:safeUser(u)});
    }
    if(!user)throw [401,'Melde dich an, um mitzumachen.'];
    rate('write:'+user.id,45);
    if(route==='logout'){if(cookie)run('DELETE FROM sessions WHERE token=?',digest(cookie));res.setHeader('Set-Cookie','f_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return send(200,{ok:true});}
    if(route==='profile-update'){
      const fields=profileFields(b);run('UPDATE users SET gender=?,orientation=?,queer=?,identity_visible=? WHERE id=?',fields.gender,fields.orientation,fields.queer,fields.identityVisible?1:0,user.id);return send(200,{user:safeUser(one('SELECT * FROM users WHERE id=?',user.id))});
    }
    if(route==='daily'){
      const claim=run('INSERT OR IGNORE INTO daily_claims(user_id,day,amount,created) VALUES(?,?,300,?)',user.id,berlinDay(),now());
      return send(200,{claimed:claim.changes===1,user:safeUser(one('SELECT * FROM users WHERE id=?',user.id))});
    }
    if(route==='react'){
      if(!['post','comment'].includes(b.kind)||![0,1,-1].includes(b.value))throw [400,'Ungültige Bewertung.'];
      const id=idField(b,'target');const target=one(`SELECT * FROM ${b.kind==='post'?'posts':'comments'} WHERE id=?`,id);
      if(!target||blocked(user.id,target.user_id))throw [404,'Beitrag nicht gefunden.'];
      if(b.kind==='comment'){const post=one('SELECT user_id FROM posts WHERE id=?',target.post_id);if(!post||blocked(user.id,post.user_id))throw [404,'Beitrag nicht gefunden.'];}
      if(target.user_id===user.id)throw [400,'Eigene Beiträge kannst du nicht bewerten.'];
      if(b.value===0)run('DELETE FROM reactions WHERE user_id=? AND kind=? AND target_id=?',user.id,b.kind,id);
      else run(`INSERT INTO reactions(user_id,kind,target_id,owner_id,value,created) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,kind,target_id) DO UPDATE SET value=excluded.value,created=excluded.created`,user.id,b.kind,id,target.user_id,b.value,now());
      return send(200,{...reactionStats(b.kind,id,user.id)});
    }
    if(route==='post'){
      rate('post:'+user.id,5);const content=textField(b,'body',3,280);const category=['Alltag','Schule & Uni','Internet'].includes(b.category)?b.category:'Alltag';
      const id=run('INSERT INTO posts(user_id,body,category,created) VALUES(?,?,?,?)',user.id,content,category,now()).lastInsertRowid;return send(201,{id:Number(id)});
    }
    if(['flower','save','hide','delete-post','comment'].includes(route)){
      const pid=idField(b,'post');const p=one('SELECT * FROM posts WHERE id=?',pid);if(!p||blocked(user.id,p.user_id))throw [404,'Spruch nicht gefunden.'];
      if(route==='delete-post'){if(p.user_id!==user.id)throw [403,'Du kannst nur eigene Sprüche löschen.'];db.exec('BEGIN IMMEDIATE');try{run("DELETE FROM reactions WHERE (kind='post' AND target_id=?) OR (kind='comment' AND target_id IN(SELECT id FROM comments WHERE post_id=?))",pid,pid);run('DELETE FROM posts WHERE id=?',pid);db.exec('COMMIT');}catch(e){db.exec('ROLLBACK');throw e;}return send(200,{ok:true});}
      if(route==='comment'){const content=textField(b,'body',1,280);rate('comment:'+user.id,12);const parent=b.parent==null?null:idField(b,'parent');if(parent){const c=one('SELECT * FROM comments WHERE id=? AND post_id=?',parent,pid);if(!c||blocked(user.id,c.user_id))throw [400,'Dieser Kommentar kann nicht beantwortet werden.'];}const id=run('INSERT INTO comments(user_id,post_id,body,created,parent_id) VALUES(?,?,?,?,?)',user.id,pid,content,now(),parent).lastInsertRowid;return send(201,{id:Number(id)});}
      if(route==='hide'){run('INSERT OR IGNORE INTO hidden VALUES(?,?)',user.id,pid);return send(200,{ok:true});}
      if(route==='save'&&!safeUser(user).plus)throw [403,'Deine Spruchsammlung ist eine Plus-Funktion.'];
      if(route==='flower'){
        if(p.user_id===user.id)throw [400,'Eigene Sprüche kannst du nicht bewerten.'];
        const old=one("SELECT value FROM reactions WHERE user_id=? AND kind='post' AND target_id=?",user.id,pid)?.value||0;
        if(old===1)run("DELETE FROM reactions WHERE user_id=? AND kind='post' AND target_id=?",user.id,pid);
        else run("INSERT INTO reactions(user_id,kind,target_id,owner_id,value,created) VALUES(?,'post',?,?,1,?) ON CONFLICT(user_id,kind,target_id) DO UPDATE SET value=1,created=excluded.created",user.id,pid,p.user_id,now());
        return send(200,{active:old!==1});
      }
      const exists=one('SELECT 1 FROM saves WHERE user_id=? AND post_id=?',user.id,pid);
      if(exists)run('DELETE FROM saves WHERE user_id=? AND post_id=?',user.id,pid);else run('INSERT INTO saves VALUES(?,?)',user.id,pid);
      return send(200,{active:!exists});
    }
    if(route==='trial'){
      if(user.trial_start)throw [409,'Deine kostenlose Probephase wurde bereits gestartet.'];
      run('UPDATE users SET trial_start=? WHERE id=?',now(),user.id);return send(200,{user:safeUser(one('SELECT * FROM users WHERE id=?',user.id))});
    }
    if(route==='block'||route==='unblock'){
      const target=idField(b,'target');if(target===user.id||!one('SELECT id FROM users WHERE id=?',target))throw [400,'Ungültige Person.'];
      if(route==='block'){run('INSERT OR IGNORE INTO blocks VALUES(?,?)',user.id,target);run("UPDATE requests SET status='declined' WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)",user.id,target,target,user.id);}else run('DELETE FROM blocks WHERE user_id=? AND target=?',user.id,target);
      return send(200,{ok:true});
    }
    if(route==='request'){
      rate('request:'+user.id,6);const target=idField(b,'target');const other=one('SELECT * FROM users WHERE id=? AND demo=0',target);
      if(!other||target===user.id||blocked(user.id,target))throw [400,'Diese Chat-Anfrage ist nicht möglich.'];
      if(one('SELECT id FROM requests WHERE (sender=? AND receiver=?) OR (sender=? AND receiver=?)',user.id,target,target,user.id))throw [409,'Zwischen euch gibt es bereits eine Anfrage.'];
      run('INSERT INTO requests(sender,receiver,created) VALUES(?,?,?)',user.id,target,now());return send(201,{ok:true});
    }
    if(route==='respond'){
      const id=idField(b,'request');const r=one('SELECT * FROM requests WHERE id=?',id);
      if(!r||r.receiver!==user.id||r.status!=='pending'||blocked(r.sender,r.receiver))throw [403,'Du kannst diese Anfrage nicht beantworten.'];
      if(!['accepted','declined'].includes(b.status))throw [400,'Ungültige Antwort.'];run('UPDATE requests SET status=? WHERE id=?',b.status,id);return send(200,{ok:true});
    }
    if(route==='message'){
      const rid=idField(b,'request');const r=one('SELECT * FROM requests WHERE id=?',rid);
      if(!r||r.status!=='accepted'||![r.sender,r.receiver].includes(user.id)||blocked(r.sender,r.receiver))throw [403,'Dieser Chat ist nicht freigegeben.'];
      rate('chat:'+user.id,20);const content=textField(b,'body',1,1000);run('INSERT INTO messages(request_id,sender,body,created) VALUES(?,?,?,?)',rid,user.id,content,now());return send(201,{ok:true});
    }
    throw [404,'Nicht gefunden.'];
  }catch(e){if(!Array.isArray(e))console.error(e);if(!res.headersSent)send(Array.isArray(e)?e[0]:500,{error:Array.isArray(e)?e[1]:'Etwas hat nicht geklappt. Bitte versuche es erneut.'});else res.end();}
});
const argv=process.argv;const port=Number(process.env.PORT||argv[argv.indexOf('--port')+1]||3000);
server.listen(Number.isFinite(port)?port:3000,'0.0.0.0',()=>console.log(`Feindschaft läuft auf http://0.0.0.0:${Number.isFinite(port)?port:3000}`));
