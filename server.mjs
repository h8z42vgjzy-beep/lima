import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { readFileSync, mkdirSync, existsSync, writeFileSync, unlinkSync, readdirSync, statSync, statfsSync, createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { createGameService } from './games.mjs';
import { validateMedia } from './media-validation.mjs';
import { createExtrasService } from './extras.mjs';
import { createDinoService } from './dino.mjs';

const root = path.dirname(fileURLToPath(import.meta.url));
// Render serves the files from public/. GitHub's mobile uploader can flatten that
// folder, so accepting both layouts prevents a blank start page after deployment.
const staticCandidates = [path.join(root, 'public'), root];
// A complete new client takes priority over an old copy in the other layout.
const staticRoot = staticCandidates.filter(directory => {
  return ['index.html','music-player.js','dino-client.js','discovery-effects.js','action.css','features.js','app.js'].every(file=>existsSync(path.join(directory,file)));
}).sort((a,b)=>{
  const version=directory=>Number(readFileSync(path.join(directory,'index.html'),'utf8').match(/name="f-release" content="([0-9.]+)"/)?.[1]||0);
  return version(b)-version(a);
})[0] || staticCandidates.find(directory=>existsSync(path.join(directory,'index.html'))) || root;
const dataDir = process.env.F_DATA_DIR || path.join(root, 'data');
mkdirSync(dataDir, {recursive: true, mode: 0o700});
const mediaDir = path.join(dataDir, 'media');
mkdirSync(mediaDir, {recursive:true,mode:0o700});
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
for(const [table,column,definition] of [['users','is_admin','INTEGER NOT NULL DEFAULT 0'],['users','suspended_until','INTEGER'],['posts','expires','INTEGER'],['posts','deleted','INTEGER NOT NULL DEFAULT 0']]){
 if(!all(`PRAGMA table_info(${table})`).some(c=>c.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
for(const [table,column,definition] of [['posts','space',"TEXT NOT NULL DEFAULT 'feed'"],['posts','title',"TEXT NOT NULL DEFAULT ''"],['messages','media_id','INTEGER']]){
 if(!all(`PRAGMA table_info(${table})`).some(c=>c.name===column))db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}
db.exec(`CREATE TABLE IF NOT EXISTS categories(id INTEGER PRIMARY KEY, name TEXT NOT NULL COLLATE NOCASE UNIQUE, photo_price INTEGER NOT NULL CHECK(photo_price BETWEEN 0 AND 100), creator INTEGER REFERENCES users(id) ON DELETE SET NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS media(id INTEGER PRIMARY KEY, owner_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, post_id INTEGER REFERENCES posts(id) ON DELETE CASCADE, request_id INTEGER REFERENCES requests(id) ON DELETE CASCADE, file_name TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime TEXT NOT NULL, kind TEXT NOT NULL CHECK(kind IN('image','audio','video')), bytes INTEGER NOT NULL, created INTEGER NOT NULL, expires INTEGER NOT NULL, open_price INTEGER NOT NULL DEFAULT 0, opened_at INTEGER, removed INTEGER NOT NULL DEFAULT 0);
CREATE TABLE IF NOT EXISTS unlocks(user_id INTEGER REFERENCES users(id) ON DELETE CASCADE, media_id INTEGER REFERENCES media(id) ON DELETE CASCADE, created INTEGER NOT NULL, PRIMARY KEY(user_id,media_id));
CREATE TABLE IF NOT EXISTS reports(id INTEGER PRIMARY KEY, reporter INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, target_type TEXT NOT NULL CHECK(target_type IN('user','post','comment','media','message')), target_id INTEGER NOT NULL, reason TEXT NOT NULL DEFAULT '', created INTEGER NOT NULL, status TEXT NOT NULL DEFAULT 'open', reviewed INTEGER, reviewer INTEGER REFERENCES users(id), action_note TEXT NOT NULL DEFAULT '');
CREATE TABLE IF NOT EXISTS reset_events(id INTEGER PRIMARY KEY, created INTEGER NOT NULL, ends INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS media_expiry ON media(expires); CREATE INDEX IF NOT EXISTS report_target ON reports(target_type,target_id,status);`);
db.exec(`CREATE TABLE IF NOT EXISTS wallet_entries(id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, operation TEXT NOT NULL UNIQUE, amount_half INTEGER NOT NULL, description TEXT NOT NULL, created INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS upload_receipts(user_id INTEGER NOT NULL REFERENCES users(id), token TEXT NOT NULL, post_id INTEGER, media_id INTEGER, PRIMARY KEY(user_id,token));
CREATE TABLE IF NOT EXISTS photo_views(media_id INTEGER NOT NULL REFERENCES media(id) ON DELETE CASCADE, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE, token TEXT NOT NULL, expires INTEGER NOT NULL, PRIMARY KEY(media_id,user_id));
CREATE TABLE IF NOT EXISTS documents(id INTEGER PRIMARY KEY, post_id INTEGER NOT NULL REFERENCES posts(id) ON DELETE CASCADE, file_name TEXT NOT NULL UNIQUE, original_name TEXT NOT NULL, mime TEXT NOT NULL, bytes INTEGER NOT NULL);`);
// Only link genuine legacy photo messages owned by their sender in that chat.
db.exec(`UPDATE messages SET media_id=(SELECT m.id FROM media m WHERE m.request_id=messages.request_id AND m.owner_id=messages.sender AND messages.body='[Foto:'||m.id||']') WHERE media_id IS NULL AND body LIKE '[Foto:%]';`);
const starterCategories=[['Alltag',5],['Schule & Uni',5],['Internet',8],['Beziehungen',10],['Sport',8],['Eiskunstlauf & Sport',8],['Politik & Diskussion',10],['Wissenschaften',8],['Gaming',8],['Musik',8],['Filme & Serien',8],['Bücher',5],['Technik',8],['Mode & Style',8],['Essen',5],['Reisen',8],['Tiere',5],['Memes',5],['Meinungen',5],['Fragen',0],['Kunst & Kreativität',8]];
for(const [name,price] of starterCategories)run('INSERT OR IGNORE INTO categories(name,photo_price,created) VALUES(?,?,?)',name,price,Date.now());
// Lima is the owner-selected administrator. Existing accounts are upgraded safely.
run("UPDATE users SET is_admin=1 WHERE lower(name)='lima'");
// Existing flowers become likes; their value is derived, not credited twice.
db.exec("INSERT OR IGNORE INTO reactions(user_id,kind,target_id,owner_id,value,created) SELECT f.user_id,'post',f.post_id,p.user_id,1,p.created FROM flowers f JOIN posts p ON p.id=f.post_id");
db.exec('DELETE FROM flowers');
const genders=['','Frau','Mann','Nichtbinär','Agender','Genderfluid','Anders'];
const orientations=['','Lesbisch','Schwul','Bisexuell','Pansexuell','Asexuell','Queer','Heterosexuell','Noch offen','Anders'];
const berlinDay=()=>new Intl.DateTimeFormat('sv-SE',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
function profileFields(b){const gender=b.gender??'',orientation=b.orientation??'',queer=b.queer??'';if(!genders.includes(gender)||!orientations.includes(orientation)||!['','Ja','Nein','Noch offen'].includes(queer))throw [400,'Bitte wähle eine gültige Profilangabe.'];return {gender,orientation,queer,identityVisible:b.identityVisible===true};}
function wallet(uid){return {balance:one('SELECT COALESCE(SUM(amount),0) AS n FROM daily_claims WHERE user_id=?',uid).n+one('SELECT COALESCE(SUM(amount_half),0) AS n FROM wallet_entries WHERE user_id=?',uid).n/2+one('SELECT COALESCE(SUM(CASE value WHEN 1 THEN 2 ELSE -5 END),0) AS n FROM reactions WHERE owner_id=?',uid).n,canClaim:!one('SELECT 1 FROM daily_claims WHERE user_id=? AND day=?',uid,berlinDay()),day:berlinDay()};}
function transact(fn){db.exec('BEGIN IMMEDIATE');try{const value=fn();db.exec('COMMIT');return value;}catch(e){db.exec('ROLLBACK');throw e;}}
function ledger(uid,key,amount,description){if(!Number.isSafeInteger(amount*2))throw Error('Invalid ledger amount');run('INSERT INTO wallet_entries(user_id,operation,amount_half,description,created) VALUES(?,?,?,?,?)',uid,key,amount*2,description,now());}
function photoPrice(category){return Math.max(1,category.photo_price);}
function publicUser(u){return {id:u.id,name:u.name,color:u.color,demo:!!u.demo,gender:u.identity_visible?u.gender:'',orientation:u.identity_visible?u.orientation:'',queer:u.identity_visible?u.queer:'',plus:!!u.trial_start&&Date.now()<u.trial_start+7*86400000};}
function reactionStats(kind,id,uid){const rows=all('SELECT value,COUNT(*) AS n FROM reactions WHERE kind=? AND target_id=? GROUP BY value',kind,id);return {likes:rows.find(r=>r.value===1)?.n||0,dislikes:rows.find(r=>r.value===-1)?.n||0,vote:one('SELECT value FROM reactions WHERE user_id=? AND kind=? AND target_id=?',uid,kind,id)?.value||0};}
function visibleComments(pid,uid){return all(`SELECT c.*,u.name,u.color FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? AND u.id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND u.id NOT IN(SELECT user_id FROM blocks WHERE target=?) ORDER BY c.created LIMIT 300`,pid,uid,uid);}
function feedRows(uid){return all(`SELECT p.*,u.name,u.color,u.demo,u.trial_start FROM posts p JOIN users u ON u.id=p.user_id WHERE p.space='feed' AND COALESCE(p.deleted,0)=0 AND (p.expires IS NULL OR p.expires>?) AND u.id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND u.id NOT IN(SELECT user_id FROM blocks WHERE target=?) AND p.id NOT IN(SELECT post_id FROM hidden WHERE user_id=?) ORDER BY p.created DESC LIMIT 200`,now(),uid,uid,uid).map(p=>{const r=reactionStats('post',p.id,uid),c=visibleComments(p.id,uid);const m=one('SELECT id,kind,open_price,owner_id FROM media WHERE post_id=? AND removed=0 AND expires>? ORDER BY id DESC LIMIT 1',p.id,now());if(m){m.unlocked=!!uid&&(m.owner_id===uid||m.open_price===0||!!one('SELECT 1 FROM unlocks WHERE user_id=? AND media_id=?',uid,m.id));m.owned=m.owner_id===uid;}return {...p,...r,media:m||null,likes:r.likes+p.sample_flowers,flowers:r.likes+p.sample_flowers,liked:r.vote===1,comments:c.length,recentComments:c.filter(x=>x.created>Date.now()-86400000).length,lastDiscussion:c.at(-1)?.created||p.created,saved:!!one('SELECT 1 FROM saves WHERE user_id=? AND post_id=?',uid,p.id),plus:!!p.trial_start&&Date.now()<p.trial_start+7*86400000,trial_start:undefined};});}

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
const safeUser=u=>u ? {id:u.id,name:u.name,color:u.color,isAdmin:!!u.is_admin,gender:u.gender,orientation:u.orientation,queer:u.queer,identityVisible:!!u.identity_visible,plus:!!u.trial_start && now()<u.trial_start+7*DAY,trialEnd:u.trial_start?u.trial_start+7*DAY:null,trialUsed:!!u.trial_start,...wallet(u.id)} : null;
const blocked=(a,b)=>!!one('SELECT 1 FROM blocks WHERE (user_id=? AND target=?) OR (user_id=? AND target=?)',a,b,b,a);
function chatAccess(user,rid){const r=one('SELECT * FROM requests WHERE id=?',rid);if(!user||!r||r.status!=='accepted'||![r.sender,r.receiver].includes(user.id)||blocked(r.sender,r.receiver))throw [403,'Dieser Chat ist nicht freigegeben.'];return r;}
function postAccess(uid,pid){const p=one('SELECT * FROM posts WHERE id=? AND deleted=0 AND (expires IS NULL OR expires>?)',pid,now());if(!p||blocked(uid,p.user_id))throw [404,'Dieser Beitrag ist nicht mehr verfügbar.'];return p;}
const games=createGameService({db,one,all,run,now,chatAccess});
const dino=createDinoService({one,run,now,chatAccess,assertAvailable(g){
  for(const id of [g.creator,g.opponent]){const u=one('SELECT * FROM users WHERE id=?',id);if(!u)throw [403,'Konto nicht verfügbar.'];requireActive(u);chatAccess(u,g.request_id);}
}});
const extras=createExtrasService({dataDir,one,all,run,transact,now,postAccess});
const limits=new Map();
let uploadInProgress=false;
function rate(key,max,window=60000){const t=now();let arr=(limits.get(key)||[]).filter(x=>t-x<window);if(arr.length>=max)throw [429,'Kurz durchatmen. Bitte versuche es gleich noch einmal.'];arr.push(t);limits.set(key,arr);}
setInterval(()=>{for(const [k,v] of limits)if(now()-v.at(-1)>3600000)limits.delete(k);run('DELETE FROM sessions WHERE expires<?',now());cleanupExpired();checkStorage();},300000).unref();
function textField(b,k,min,max){const v=typeof b[k]==='string'?b[k].trim():'';if(v.length<min||v.length>max)throw [400,`${k==='body'?'Dein Text':'Deine Eingabe'} muss zwischen ${min} und ${max} Zeichen lang sein.`];return v;}
function idField(b,k){const v=Number(b[k]);if(!Number.isSafeInteger(v)||v<1)throw [400,'Ungültige Auswahl.'];return v;}
async function body(req){let s='';for await(const chunk of req){s+=chunk;if(s.length>12000)throw [413,'Diese Eingabe ist zu lang.'];}try{return JSON.parse(s||'{}');}catch{throw [400,'Die Eingabe konnte nicht gelesen werden.'];}}
async function rawBody(req,max){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>max)throw [413,'Diese Datei ist zu groß.'];chunks.push(chunk);}return Buffer.concat(chunks);}
function parseMultipart(buf,contentType){const m=/boundary=([^;]+)/i.exec(contentType||'');if(!m)throw [400,'Upload konnte nicht gelesen werden.'];const boundary=Buffer.from('--'+m[1].replace(/^"|"$/g,''));const out={fields:{},files:[]};let pos=0;while(true){const start=buf.indexOf(boundary,pos);if(start<0)break;const headStart=start+boundary.length+2;const next=buf.indexOf(boundary,headStart);if(next<0)break;const part=buf.subarray(headStart,next-2);pos=next;if(!part.length)continue;const sep=part.indexOf(Buffer.from('\r\n\r\n'));if(sep<0)continue;const head=part.subarray(0,sep).toString('utf8'),data=part.subarray(sep+4);const name=/name="([^"]+)"/i.exec(head)?.[1];if(!name)continue;const filename=/filename="([^"]*)"/i.exec(head)?.[1];if(filename){out.files.push({field:name,name:path.basename(filename),mime:/content-type:\s*([^\r\n]+)/i.exec(head)?.[1]?.trim()||'application/octet-stream',data});}else out.fields[name]=data.toString('utf8');}return out;}
function fileNameFor(file){return randomBytes(18).toString('hex')+path.extname(file.name).toLowerCase();}
function isSuspended(u){return !!u.suspended_until&&u.suspended_until>now();}
function requireActive(u){if(isSuspended(u))throw [403,'Dein Konto ist bis '+new Date(u.suspended_until).toLocaleString('de-DE')+' gesperrt.'];}
function storageInfo(){const configured=Number(process.env.F_STORAGE_BYTES);try{const s=statfsSync(mediaDir),actual=Number(s.blocks)*Number(s.bsize);return {used:mediaBytes(),total:configured>0?Math.min(actual,configured):actual,available:Number(s.bavail)*Number(s.bsize)};}catch{return {used:mediaBytes(),total:configured>0?configured:10*1024**3,available:null};}}
function mediaBytes(){return (one('SELECT COALESCE(SUM(bytes),0) AS n FROM media WHERE removed=0')?.n||0)+(one('SELECT COALESCE(SUM(bytes),0) AS n FROM documents')?.n||0);}
function reserveStorage(bytes){const s=storageInfo();if(s.used+bytes>s.total*.95||(s.available!==null&&s.available<bytes+16*1024**2))throw [507,'Für diese Datei ist gerade nicht genug freier Speicher vorhanden. Es wurde nichts abgebucht.'];}
function removeMedia(m){try{unlinkSync(path.join(mediaDir,m.file_name));}catch{}run('UPDATE media SET removed=1 WHERE id=?',m.id);}
function cleanupExpired(){const t=now();for(const m of all('SELECT * FROM media WHERE removed=0 AND expires<?',t))removeMedia(m);run('UPDATE posts SET deleted=1 WHERE deleted=0 AND expires IS NOT NULL AND expires<? AND id NOT IN(SELECT target_id FROM reports WHERE target_type=\'post\' AND status=\'open\')',t);}
function reportAllowsMedia(r,m){if(r.target_type==='media')return r.target_id===m.id;if(r.target_type==='post')return r.target_id===m.post_id;if(r.target_type==='comment')return one('SELECT post_id FROM comments WHERE id=?',r.target_id)?.post_id===m.post_id;if(r.target_type==='message')return one('SELECT media_id FROM messages WHERE id=?',r.target_id)?.media_id===m.id;if(r.target_type==='user'&&m.request_id){const q=one('SELECT * FROM requests WHERE id=?',m.request_id);return q&&[q.sender,q.receiver].includes(r.reporter)&&[q.sender,q.receiver].includes(r.target_id);}return r.target_type==='user'&&!!m.post_id&&m.owner_id===r.target_id;}
function triggerReset(){const t=now(),reports=all("SELECT * FROM reports WHERE status='open'");transact(()=>{for(const m of all('SELECT * FROM media WHERE removed=0'))if(!reports.some(r=>reportAllowsMedia(r,m)))removeMedia(m);run("UPDATE posts SET deleted=1 WHERE space='feed' AND deleted=0 AND id NOT IN(SELECT target_id FROM reports WHERE target_type='post' AND status='open')");run('INSERT INTO reset_events(created,ends) VALUES(?,?)',t,t+90000);});}
function checkStorage(){cleanupExpired();const s=storageInfo();if(s.total&&s.used/s.total>=.85){triggerReset();return true;}return false;}
function saveMedia(owner,file,{postId=null,requestId=null,price=0}){const {kind,mime}=validateMedia(file);const name=fileNameFor(file);try{writeFileSync(path.join(mediaDir,name),file.data,{mode:0o600,flag:'wx'});const id=run('INSERT INTO media(owner_id,post_id,request_id,file_name,original_name,mime,kind,bytes,created,expires,open_price) VALUES(?,?,?,?,?,?,?,?,?,?,?)',owner.id,postId,requestId,name,file.name.slice(0,150),mime,kind,file.data.length,now(),now()+28*DAY,price).lastInsertRowid;return Number(id);}catch(e){try{unlinkSync(path.join(mediaDir,name));}catch{}throw e;}}
function mediaAccess(user,id){if(!user)throw [401,'Bitte melde dich zum Öffnen an.'];const m=one('SELECT * FROM media WHERE id=? AND removed=0',id);if(!m||m.expires<=now())throw [410,'Diese Datei ist nicht mehr verfügbar.'];if(blocked(user.id,m.owner_id))throw [404,'Diese Datei ist nicht verfügbar.'];if(m.request_id){chatAccess(user,m.request_id);if(now()>=m.created+7*DAY)throw [410,'Dieses Chat-Foto ist abgelaufen.'];}else if(m.post_id)postAccess(user.id,m.post_id);else throw [404,'Datei nicht gefunden.'];return m;}
function mediaContent(m){try{return readFileSync(path.join(mediaDir,m.file_name));}catch{throw [410,'Die Bilddatei ist nicht mehr vorhanden. Es wurde nichts abgebucht.'];}}
function sendMedia(req,res,m){const full=path.join(mediaDir,m.file_name);let size;try{size=statSync(full).size;}catch{throw [410,'Diese Datei ist nicht mehr vorhanden.'];}const headers={'Content-Type':m.mime,'Cache-Control':'private, no-store, max-age=0','Accept-Ranges':'bytes'};const range=req.headers.range;let start=0,end=size-1,status=200;if(range){const match=/^bytes=(\d*)-(\d*)$/.exec(range);if(!match||(!match[1]&&!match[2]))throw [416,'Ungültiger Dateibereich.'];if(!match[1])start=Math.max(0,size-Number(match[2]));else start=Number(match[1]);if(match[1]&&match[2])end=Math.min(size-1,Number(match[2]));if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start>end||start>=size)throw [416,'Ungültiger Dateibereich.'];headers['Content-Range']=`bytes ${start}-${end}/${size}`;status=206;}headers['Content-Length']=end-start+1;res.writeHead(status,headers);if(req.method==='HEAD')return res.end();const stream=createReadStream(full,{start,end});stream.on('error',()=>res.destroy());res.on('close',()=>stream.destroy());stream.pipe(res);}
const staticFiles={'/':['index.html','text/html; charset=utf-8'],'/app.js':['app.js','text/javascript; charset=utf-8'],'/style.css':['style.css','text/css; charset=utf-8'],'/night.css':['night.css','text/css; charset=utf-8'],'/favicon.svg':['favicon.svg','image/svg+xml']};
staticFiles['/features.js']=['features.js','text/javascript; charset=utf-8'];
staticFiles['/features.css']=['features.css','text/css; charset=utf-8'];
staticFiles['/music-player.js']=['music-player.js','text/javascript; charset=utf-8'];
staticFiles['/dino-client.js']=['dino-client.js','text/javascript; charset=utf-8'];
staticFiles['/discovery-effects.js']=['discovery-effects.js','text/javascript; charset=utf-8'];
staticFiles['/action.css']=['action.css','text/css; charset=utf-8'];
const server=http.createServer(async(req,res)=>{
  res.setHeader('X-Content-Type-Options','nosniff');
  res.setHeader('Referrer-Policy','same-origin');
  res.setHeader('X-Robots-Tag','noindex, nofollow');
  res.setHeader('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data: blob:; media-src 'self' blob:; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'self' https://chatgpt.com https://*.chatgpt.com");
  const url=new URL(req.url,'http://localhost');
  const send=(status,data)=>{res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data));};
  const cookie=(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('f_session='))?.slice(10);
  const user=cookie?one('SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?',digest(cookie),now()):null;
  try {
    if(!url.pathname.startsWith('/api/')){
      const mediaMatch=/^\/media\/(\d+)$/.exec(url.pathname);
      if(mediaMatch){
        if(!['GET','HEAD'].includes(req.method))throw [405,'Nicht unterstützt.'];
        const m=mediaAccess(user,Number(mediaMatch[1]));
        if(m.request_id&&m.owner_id!==user.id){const view=one('SELECT * FROM photo_views WHERE media_id=? AND user_id=?',m.id,user.id);if(!view||view.expires<=now()||view.token!==digest(url.searchParams.get('view')||''))throw [410,'Bitte öffne das Foto einmalig im Chat.'];}
        else if(!m.request_id&&m.owner_id!==user.id&&m.open_price>0&&!one('SELECT 1 FROM unlocks WHERE user_id=? AND media_id=?',user.id,m.id))throw [403,'Dieses Foto muss zuerst freigeschaltet werden.'];
        return sendMedia(req,res,m);
      }
      const item=staticFiles[url.pathname];if(!item||!['GET','HEAD'].includes(req.method)){res.writeHead(404);return res.end('Nicht gefunden.');}
      res.writeHead(200,{'Content-Type':item[1],'Cache-Control':'no-cache'});return res.end(req.method==='HEAD'?'':readFileSync(path.join(staticRoot,item[0])));
    }
    const route=url.pathname.slice(5);
    if(req.method==='GET'){
      if(route==='me')return send(200,{user:safeUser(user)});
      if(route==='feed')return send(200,{posts:feedRows(user?.id||0),members:one('SELECT COUNT(*) AS n FROM users WHERE demo=0').n});
      if(route==='categories')return send(200,{categories:all('SELECT c.*,u.name AS creator_name FROM categories c LEFT JOIN users u ON u.id=c.creator ORDER BY c.name COLLATE NOCASE').map(c=>({...c,photo_price:photoPrice(c)}))});
      if(route==='event'){const e=one('SELECT * FROM reset_events WHERE ends>? ORDER BY id DESC LIMIT 1',now());return send(200,{event:e||null});}
      if(!user)throw [401,'Melde dich an, um mitzumachen.'];
      if(route==='wallet')return send(200,{...wallet(user.id),entries:all('SELECT description,amount_half/2.0 AS amount,created FROM wallet_entries WHERE user_id=? ORDER BY id DESC LIMIT 50',user.id)});
      if(route==='games')return send(200,games.list(user,idField(Object.fromEntries(url.searchParams),'request')));
      if(route==='dino-stream'){
        requireActive(user);
        return dino.stream(user,idField(Object.fromEntries(url.searchParams),'game'),req,res,()=>!!one('SELECT 1 FROM sessions WHERE token=? AND expires>?',digest(cookie),now()));
      }
      if(route==='extras')return send(200,extras.list(user,url.searchParams.get('space')));
      if(route==='document'){const d=extras.download(user,idField(Object.fromEntries(url.searchParams),'id'));res.writeHead(200,{'Content-Type':d.mime,'Content-Disposition':`attachment; filename*=UTF-8''${encodeURIComponent(d.original_name)}`,'Cache-Control':'private, no-store','Content-Security-Policy':"default-src 'none'; sandbox"});return res.end(d.content);}
      if(route==='admin/reports'){
        if(!user.is_admin)throw [403,'Nur für die Moderation.'];
        const reports=all(`SELECT r.*,a.name AS reporter_name FROM reports r JOIN users a ON a.id=r.reporter WHERE r.status='open' ORDER BY r.created DESC LIMIT 200`).map(r=>({...r,reportCount:one('SELECT COUNT(*) AS n FROM reports WHERE target_type=? AND target_id=?',r.target_type,r.target_id).n,blockCount:r.target_type==='user'?one('SELECT COUNT(*) AS n FROM blocks WHERE target=?',r.target_id).n:0}));
        return send(200,{reports,storage:storageInfo()});
      }
      if(route==='admin/report'){
        if(!user.is_admin)throw [403,'Nur für die Moderation.'];const id=idField(Object.fromEntries(url.searchParams),'id');const r=one('SELECT * FROM reports WHERE id=?',id);if(!r)throw [404,'Meldung nicht gefunden.'];let conversation=[];
        if(r.target_type==='user'){conversation=all(`SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.sender JOIN requests q ON q.id=m.request_id WHERE (q.sender=? AND q.receiver=?) OR (q.sender=? AND q.receiver=?) ORDER BY m.created DESC LIMIT 500`,r.reporter,r.target_id,r.target_id,r.reporter);}
        if(r.target_type==='message'){const message=one('SELECT m.*,u.name FROM messages m JOIN users u ON u.id=m.sender WHERE m.id=?',r.target_id);if(message)conversation=[message];}
        const content=r.target_type==='post'?one('SELECT id,body,title,category,user_id FROM posts WHERE id=?',r.target_id):r.target_type==='comment'?one('SELECT id,body,user_id FROM comments WHERE id=?',r.target_id):null;
        const media=all('SELECT * FROM media WHERE removed=0 AND expires>?',now()).filter(m=>reportAllowsMedia(r,m)).map(m=>({id:m.id,kind:m.kind,created:m.created,url:`/api/admin/media?report=${r.id}&media=${m.id}`}));
        return send(200,{report:r,conversation,content,media});
      }
      if(route==='admin/media'){
        if(!user.is_admin)throw [403,'Nur für die Moderation.'];const params=Object.fromEntries(url.searchParams),r=one('SELECT * FROM reports WHERE id=?',idField(params,'report')),m=one('SELECT * FROM media WHERE id=? AND removed=0 AND expires>?',idField(params,'media'),now());
        if(!r||!m||!reportAllowsMedia(r,m))throw [403,'Dieses Bild gehört nicht zum gemeldeten Inhalt oder Chat.'];return sendMedia(req,res,m);
      }
      if(route==='comments'){
        const pid=idField(Object.fromEntries(url.searchParams),'post');
        postAccess(user.id,pid);
        return send(200,{comments:visibleComments(pid,user.id).map(c=>({...c,...reactionStats('comment',c.id,user.id)}))});
      }
      if(route==='people')return send(200,{people:all(`SELECT * FROM users WHERE demo=0 AND id!=? AND id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND id NOT IN(SELECT user_id FROM blocks WHERE target=?) ORDER BY name LIMIT 100`,user.id,user.id,user.id).map(publicUser),requests:all(`SELECT r.*,u.name,u.color FROM requests r JOIN users u ON u.id=CASE WHEN r.sender=? THEN r.receiver ELSE r.sender END WHERE (r.sender=? OR r.receiver=?) AND u.id NOT IN(SELECT target FROM blocks WHERE user_id=?) AND u.id NOT IN(SELECT user_id FROM blocks WHERE target=?) ORDER BY r.created DESC`,user.id,user.id,user.id,user.id,user.id)});
      if(route==='messages'){
        const rid=idField(Object.fromEntries(url.searchParams),'request');const r=one('SELECT * FROM requests WHERE id=?',rid);
        if(!r||r.status!=='accepted'||![r.sender,r.receiver].includes(user.id)||blocked(r.sender,r.receiver))throw [403,'Dieser Chat ist nicht freigegeben.'];
        return send(200,{messages:all('SELECT id,sender,body,created,media_id FROM (SELECT * FROM messages WHERE request_id=? ORDER BY id DESC LIMIT 500) ORDER BY id',rid).map(m=>{const photo=m.media_id?one('SELECT * FROM media WHERE id=?',m.media_id):null;return {...m,mediaId:m.media_id,photoState:!m.media_id?null:!photo||photo.removed||photo.expires<=now()||photo.created+7*DAY<=now()?'expired':photo.owner_id===user.id?'own':photo.opened_at?'opened':'ready'};})});
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
    if(req.headers['x-f-request']!=='1')throw [403,'Ungültige Anfrage. Bitte lade die Seite neu.'];
    if(user){requireActive(user);}
    const contentType=req.headers['content-type']||'';
    if(contentType.startsWith('multipart/form-data')){
      if(!user)throw [401,'Melde dich an, um Dateien hochzuladen.'];
      if(!['upload-post','upload-chat','upload-extra'].includes(route))throw [404,'Nicht gefunden.'];
      rate('upload:'+user.id,12);
      // Avoid several in-memory multipart uploads exhausting a small Render instance.
      if(uploadInProgress)throw [429,'Gerade läuft ein weiterer Upload. Bitte versuche es in einigen Sekunden erneut.'];
      let parsed;uploadInProgress=true;
      try{parsed=parseMultipart(await rawBody(req,route==='upload-extra'?11*1024**2:105*1024**2),contentType);}finally{uploadInProgress=false;}
      const file=parsed.files.find(x=>x.field==='file');if(!file||parsed.files.length!==1)throw [400,'Bitte wähle genau eine Datei aus.'];
      if(parsed.fields.rights!=='true')throw [400,'Bitte bestätige, dass du die Rechte an der Datei hast.'];
      if(route==='upload-extra'){reserveStorage(file.data.length);return send(201,extras.create(user,parsed.fields,file));}
      const info=validateMedia(file);
      reserveStorage(file.data.length);
      if(route==='upload-post'){
        const token=String(parsed.fields.uploadToken||'');if(!/^[A-Za-z0-9_-]{16,100}$/.test(token))throw [400,'Bitte lade die Seite neu und versuche den Upload noch einmal.'];
        const previous=one('SELECT * FROM upload_receipts WHERE user_id=? AND token=?',user.id,token);if(previous)return send(200,{id:previous.post_id,mediaId:previous.media_id,repeated:true,user:safeUser(user)});
        const content=textField(parsed.fields,'body',3,280);const category=one('SELECT * FROM categories WHERE id=?',Number(parsed.fields.category));if(!category)throw [400,'Bitte wähle eine Kategorie.'];
        const price=info.kind==='image'?photoPrice(category):0;
        if(Number(parsed.fields.expectedPrice)!==price)throw [409,'Der Preis ist nicht bestätigt oder wurde geändert. Bitte prüfe den Kategorienpreis erneut.'];
        let savedPath;
        try{const result=transact(()=>{
          if(price>0&&wallet(user.id).balance<price)throw [400,'Nicht genug Beleidigungen für den Foto-Upload. Hole zuerst deine Tagespunkte ab.'];
          const id=Number(run('INSERT INTO posts(user_id,body,category,created,expires) VALUES(?,?,?,?,?)',user.id,content,category.name,now(),now()+7*DAY).lastInsertRowid);
          const mediaId=saveMedia(user,file,{postId:id,price});savedPath=path.join(mediaDir,one('SELECT file_name FROM media WHERE id=?',mediaId).file_name);
          if(price)ledger(user.id,'upload:'+mediaId,-price,'Foto hochgeladen · '+category.name);
          run('INSERT INTO upload_receipts(user_id,token,post_id,media_id) VALUES(?,?,?,?)',user.id,token,id,mediaId);
          return {id,mediaId,charged:price,user:safeUser(user)};
        });return send(201,result);}catch(e){if(savedPath){try{unlinkSync(savedPath);}catch{}}throw e;}
      }
      const rid=Number(parsed.fields.request);const r=one('SELECT * FROM requests WHERE id=?',rid);if(!r||r.status!=='accepted'||![r.sender,r.receiver].includes(user.id)||blocked(r.sender,r.receiver))throw [403,'Dieser Chat ist nicht freigegeben.'];
      if(info.kind!=='image')throw [400,'Im Chat sind nur Bilder erlaubt.'];
      let chatFile;
      try{const result=transact(()=>{const mediaId=saveMedia(user,file,{requestId:rid,price:0});chatFile=path.join(mediaDir,one('SELECT file_name FROM media WHERE id=?',mediaId).file_name);run('INSERT INTO messages(request_id,sender,body,created,media_id) VALUES(?,?,?,?,?)',rid,user.id,'[Foto:'+mediaId+']',now(),mediaId);return {mediaId};});return send(201,result);}catch(e){if(chatFile){try{unlinkSync(chatFile);}catch{}}throw e;}
    }
    if(!contentType.startsWith('application/json'))throw [403,'Ungültige Anfrage. Bitte lade die Seite neu.'];
    // A custom request header and JSON enforce a same-origin browser request; CORS is never enabled.
    const b=await body(req);
    if(route==='register'||route==='login'){
      rate('auth:'+req.socket.remoteAddress,12,60000);
      const name=textField(b,'name',3,24);const password=textField(b,'password',10,128);
      if(!/^[\p{L}\p{N}_-]+$/u.test(name))throw [400,'Dein Name darf Buchstaben, Zahlen, _ und - enthalten.'];
      let u=one('SELECT * FROM users WHERE name=?',name);
      if(route==='register'){
        if(b.consent!==true||b.adult!==true)throw [400,'Du musst den Spielregeln zustimmen und mindestens 18 Jahre alt sein.'];
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
    if(route==='dino-jump'){requireActive(user);rate('dino-jump:'+user.id,12,1000);idField(b,'game');return send(200,dino.jump(user,b));}
    rate('write:'+user.id,45);
    if(route==='extra')return send(201,extras.create(user,b));
    if(route==='game-create')return send(201,games.create(user,idField(b,'request'),b.type));
    if(route==='game-action'){idField(b,'game');return send(200,games.action(user,b));}
    if(route==='chat-photo-open'){
      const m=mediaAccess(user,idField(b,'media'));if(!m.request_id||m.kind!=='image')throw [400,'Kein Chat-Foto.'];
      mediaContent(m);
      if(m.owner_id===user.id)return send(200,{url:'/media/'+m.id,expires:null,serverNow:now()});
      const token=randomBytes(24).toString('hex'),ends=now()+20000;
      transact(()=>{if(one('SELECT opened_at FROM media WHERE id=?',m.id).opened_at)throw [410,'Dieses Foto wurde schon geöffnet und kann nicht erneut geöffnet werden.'];run('UPDATE media SET opened_at=? WHERE id=?',now(),m.id);run('INSERT INTO photo_views(media_id,user_id,token,expires) VALUES(?,?,?,?)',m.id,user.id,digest(token),ends);});
      return send(200,{url:`/media/${m.id}?view=${token}`,expires:ends,serverNow:now()});
    }
    if(route==='logout'){if(cookie)run('DELETE FROM sessions WHERE token=?',digest(cookie));res.setHeader('Set-Cookie','f_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0');return send(200,{ok:true});}
    if(route==='profile-update'){
      const fields=profileFields(b);run('UPDATE users SET gender=?,orientation=?,queer=?,identity_visible=? WHERE id=?',fields.gender,fields.orientation,fields.queer,fields.identityVisible?1:0,user.id);return send(200,{user:safeUser(one('SELECT * FROM users WHERE id=?',user.id))});
    }
    if(route==='daily'){
      const claim=run('INSERT OR IGNORE INTO daily_claims(user_id,day,amount,created) VALUES(?,?,300,?)',user.id,berlinDay(),now());
      return send(200,{claimed:claim.changes===1,user:safeUser(one('SELECT * FROM users WHERE id=?',user.id))});
    }
    if(route==='category'){
      const name=textField(b,'name',2,48);const price=Number(b.price);if(name.toLowerCase()==='sonstiges')throw [400,'Bitte wähle einen konkreten Kategorienamen.'];if(!Number.isInteger(price)||price<1||price>100)throw [400,'Der Kategorienpreis muss zwischen 1 und 100 Beleidigungen liegen.'];
      if(one('SELECT id FROM categories WHERE name=?',name))throw [409,'Diese Kategorie gibt es bereits.'];
      const id=run('INSERT INTO categories(name,photo_price,creator,created) VALUES(?,?,?,?)',name,price,user.id,now()).lastInsertRowid;return send(201,{id:Number(id)});
    }
    if(route==='category-update'||route==='category-delete'){
      const id=idField(b,'category');const c=one('SELECT * FROM categories WHERE id=?',id);if(!c)throw [404,'Kategorie nicht gefunden.'];if(c.creator!==user.id&&!user.is_admin)throw [403,'Nur die erstellende Person oder die Moderation kann das ändern.'];
      if(route==='category-delete'){run('DELETE FROM categories WHERE id=?',id);return send(200,{ok:true});}
      const name=textField(b,'name',2,48),price=Number(b.price);if(name.toLowerCase()==='sonstiges')throw [400,'Bitte wähle einen konkreten Kategorienamen.'];if(!Number.isInteger(price)||price<1||price>100)throw [400,'Der Preis muss zwischen 1 und 100 liegen.'];transact(()=>{run('UPDATE categories SET name=?,photo_price=? WHERE id=?',name,price,id);run('UPDATE posts SET category=? WHERE category=?',name,c.name);});return send(200,{ok:true});
    }
    if(route==='unlock'){
      const id=idField(b,'media');const m=mediaAccess(user,id);if(m.request_id||m.kind!=='image'||!m.post_id)throw [404,'Dieses Foto ist nicht verfügbar.'];
      mediaContent(m); // Verify availability before touching either wallet.
      const result=transact(()=>{if(m.owner_id===user.id||one('SELECT 1 FROM unlocks WHERE user_id=? AND media_id=?',user.id,id))return {charged:0,alreadyUnlocked:true};
        if(Number(b.expectedPrice)!==m.open_price)throw [409,'Bitte bestätige den angezeigten Foto-Preis.'];
        if(m.open_price>0&&wallet(user.id).balance<m.open_price)throw [400,'Dafür hast du nicht genug Beleidigungen.'];
        run('INSERT INTO unlocks(user_id,media_id,created) VALUES(?,?,?)',user.id,id,now());
        if(m.open_price){ledger(user.id,'unlock:'+id+':'+user.id,-m.open_price,'Foto freigeschaltet');ledger(m.owner_id,'photo-share:'+id+':'+user.id,m.open_price/2,'50 % aus Foto-Freischaltung');}
        return {charged:m.open_price,alreadyUnlocked:false};
      });return send(200,{ok:true,...result,url:'/media/'+id,user:safeUser(user)});
    }
    if(route==='report'){
      if(!['user','post','comment','media','message'].includes(b.targetType))throw [400,'Ungültige Meldung.'];const target=idField(b,'target');
      if(b.targetType==='user'&&!one('SELECT id FROM users WHERE id=?',target))throw [404,'Nutzer nicht gefunden.'];
      if(b.targetType==='post')postAccess(user.id,target);
      if(b.targetType==='comment'){const c=one('SELECT * FROM comments WHERE id=?',target);if(!c)throw [404,'Kommentar nicht gefunden.'];postAccess(user.id,c.post_id);}
      if(b.targetType==='media')mediaAccess(user,target);
      if(b.targetType==='message'){const m=one('SELECT * FROM messages WHERE id=?',target),q=m?one('SELECT * FROM requests WHERE id=?',m.request_id):null;if(!q||![q.sender,q.receiver].includes(user.id))throw [403,'Du kannst keine fremden Chatnachrichten melden.'];}
      const existing=one('SELECT id FROM reports WHERE reporter=? AND target_type=? AND target_id=? AND created>?',user.id,b.targetType,target,now()-7*DAY);if(existing)throw [409,'Diesen Inhalt hast du diese Woche bereits gemeldet.'];const reason=typeof b.reason==='string'?b.reason.trim().slice(0,600):'';const created=run('INSERT INTO reports(reporter,target_type,target_id,reason,created) VALUES(?,?,?,?,?)',user.id,b.targetType,target,reason,now());return send(201,{ok:true,id:Number(created.lastInsertRowid)});
    }
    if(route==='admin/action'){
      if(!user.is_admin)throw [403,'Nur für die Moderation.'];const report=idField(b,'report');const r=one('SELECT * FROM reports WHERE id=? AND status=\'open\'',report);if(!r)throw [404,'Meldung nicht gefunden.'];const action=String(b.action||'');const note=typeof b.note==='string'?b.note.trim().slice(0,600):'';if(!['keep','delete','warn','suspend','ban'].includes(action))throw [400,'Ungültige Moderationsaktion.'];const fine=Math.max(0,Math.min(100,Number(b.fine)||0));let targetUser=null;if(r.target_type==='user')targetUser=r.target_id;else if(r.target_type==='post'||r.target_type==='comment'){targetUser=one(`SELECT user_id FROM ${r.target_type==='post'?'posts':'comments'} WHERE id=?`,r.target_id)?.user_id;}else if(r.target_type==='media')targetUser=one('SELECT owner_id FROM media WHERE id=?',r.target_id)?.owner_id;else if(r.target_type==='message')targetUser=one('SELECT sender FROM messages WHERE id=?',r.target_id)?.sender;if(action==='delete'){if(r.target_type==='post')run('UPDATE posts SET deleted=1 WHERE id=?',r.target_id);if(r.target_type==='media'){const m=one('SELECT * FROM media WHERE id=?',r.target_id);if(m)removeMedia(m);}}if(targetUser&&fine){const balance=wallet(targetUser).balance;run('INSERT INTO daily_claims(user_id,day,amount,created) VALUES(?,?,?,?)',targetUser,'moderation:'+report,-Math.round(Math.max(0,balance)*fine/100*2)/2,now());}if(targetUser&&action==='suspend')run('UPDATE users SET suspended_until=? WHERE id=?',Number(b.until)||now()+DAY,targetUser);if(targetUser&&action==='ban')run('UPDATE users SET suspended_until=? WHERE id=?',now()+3650*DAY,targetUser);run('UPDATE reports SET status=?,reviewed=?,reviewer=?,action_note=? WHERE id=?',action==='keep'?'kept':'closed',now(),user.id,note,report);return send(200,{ok:true});
    }
    if(route==='react'){
      if(!['post','comment'].includes(b.kind)||![0,1,-1].includes(b.value))throw [400,'Ungültige Bewertung.'];
      const id=idField(b,'target');const target=one(`SELECT * FROM ${b.kind==='post'?'posts':'comments'} WHERE id=?`,id);
      if(!target||blocked(user.id,target.user_id))throw [404,'Beitrag nicht gefunden.'];
      postAccess(user.id,b.kind==='post'?id:target.post_id);
      if(b.kind==='comment'){const post=one('SELECT user_id FROM posts WHERE id=?',target.post_id);if(!post||blocked(user.id,post.user_id))throw [404,'Beitrag nicht gefunden.'];}
      if(target.user_id===user.id)throw [400,'Eigene Beiträge kannst du nicht bewerten.'];
      if(b.value===0)run('DELETE FROM reactions WHERE user_id=? AND kind=? AND target_id=?',user.id,b.kind,id);
      else run(`INSERT INTO reactions(user_id,kind,target_id,owner_id,value,created) VALUES(?,?,?,?,?,?) ON CONFLICT(user_id,kind,target_id) DO UPDATE SET value=excluded.value,created=excluded.created`,user.id,b.kind,id,target.user_id,b.value,now());
      return send(200,{...reactionStats(b.kind,id,user.id)});
    }
    if(route==='post'){
      rate('post:'+user.id,5);const content=textField(b,'body',3,280);const category=Number.isFinite(Number(b.category))?one('SELECT * FROM categories WHERE id=?',Number(b.category)):one('SELECT * FROM categories WHERE name=?',String(b.category||''));if(!category)throw [400,'Bitte wähle eine Kategorie.'];
      const id=run('INSERT INTO posts(user_id,body,category,created,expires) VALUES(?,?,?,?,?)',user.id,content,category.name,now(),now()+7*DAY).lastInsertRowid;return send(201,{id:Number(id)});
    }
    if(['flower','save','hide','delete-post','comment'].includes(route)){
      const pid=idField(b,'post');const p=postAccess(user.id,pid);
      if(route==='delete-post'){if(p.user_id!==user.id)throw [403,'Du kannst nur eigene Sprüche löschen.'];transact(()=>{run("DELETE FROM reactions WHERE (kind='post' AND target_id=?) OR (kind='comment' AND target_id IN(SELECT id FROM comments WHERE post_id=?))",pid,pid);run('UPDATE posts SET deleted=1 WHERE id=?',pid);});return send(200,{ok:true});}
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
const argv=process.argv;const port=Number(process.env.PORT??(argv.includes('--port')?argv[argv.indexOf('--port')+1]:3000));
server.listen(Number.isFinite(port)?port:3000,'0.0.0.0',()=>console.log(`Feindschaft läuft auf http://0.0.0.0:${server.address().port}`));
