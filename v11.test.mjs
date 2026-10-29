import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,rmSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import sharp from 'sharp';
import {app,png,wave} from './test-support.mjs';
import {optimizeMedia} from './media-optimize.mjs';
import {achievementCatalog} from './studio.mjs';

const read=name=>readFileSync(new URL('public/'+name,import.meta.url),'utf8');

test('Release starts with all selected features and no location routes',async t=>{
 const h=await app(t),status=await h.anon.call('design-status');assert.equal(status.status,200);assert.equal(status.data.version,'feindschaft-12');assert.equal(status.data.location,false);
 assert.deepEqual(status.data.themes,['night','pride','forest','ice']);
 assert.equal((await h.anon.call('studio/overview')).status,401);
 assert.equal((await h.alice.call('nearby')).status,404);assert.equal((await h.alice.raw('/nearby-client.js')).status,404);
 assert.equal((await h.alice.call('message-delete-status')).data.active,true);assert.equal((await h.alice.call('chat-repair-status')).data.active,true);
 const html=await (await h.anon.raw('/')).text();assert.match(html,/class="mobile-nav"/);assert.doesNotMatch(html,/nearby|geolocation/);
});
test('Achievements use real posts and received likes, persist after deletion and never award extra currency',async t=>{
 const h=await app(t),{alice,bob}=h,before=await alice.balance();
 let stats=(await alice.call('studio/overview')).data;assert.equal(stats.achievements.some(a=>a.unlocked),false);
 const p=await alice.call('post',{body:'Ein erster guter Konter.',category:'Alltag'});assert.equal(p.status,201);
 assert.equal(h.one('SELECT COUNT(*) AS n FROM earned_achievements WHERE user_id=?',alice.id).n,1);
 const c=await alice.call('comment',{post:p.data.id,body:'Noch eine gute Antwort.'});assert.equal(c.status,201);
 await bob.call('react',{kind:'comment',target:c.data.id,value:1});
 stats=(await alice.call('studio/overview')).data;assert.equal(stats.achievements.find(a=>a.id==='first-counter').unlocked,true);assert.equal(await alice.balance(),before+2);
 await alice.call('studio/ack-achievements',{ids:['first-post','first-counter']});
 assert.ok((await alice.call('studio/overview')).data.achievements.find(a=>a.id==='first-post').seen_at);
 await alice.call('delete-post',{post:p.data.id});stats=(await alice.call('studio/overview')).data;
 assert.equal(stats.achievements.find(a=>a.id==='first-post').unlocked,true);assert.equal(stats.achievements.find(a=>a.id==='first-counter').unlocked,true);
 assert.equal(h.one('SELECT COUNT(*) AS n FROM earned_achievements WHERE user_id=?',alice.id).n,2);
 assert.equal((await bob.call('studio/overview')).data.achievements.find(a=>a.id==='first-post').unlocked,false);
});
test('Seven documented badge thresholds are explicit, and only server results unlock game awards',async t=>{
 const h=await app(t),{alice,bob}=h;
 assert.equal(achievementCatalog.length,7);assert.equal(achievementCatalog.find(a=>a.id==='dino-dominator').goal,1000);
 assert.equal((await alice.call('studio/preferences',{wins:999,dinoBest:999999})).status,200);
 assert.equal((await alice.call('studio/overview')).data.metrics.wins,0);
 for(let i=1;i<=25;i++)h.run('INSERT INTO game_results VALUES(?,?,?,?,?,?,?,?)',1000+i,'chess',alice.id,bob.id,alice.id,0,0,Date.now());
 h.run('INSERT INTO game_results VALUES(?,?,?,?,?,?,?,?)',2000,'dino-run',alice.id,bob.id,alice.id,1200,1190,Date.now());
 const d=(await alice.call('studio/overview')).data;
 for(const id of ['unstoppable','spoilsport','dino-dominator'])assert.equal(d.achievements.find(a=>a.id===id).unlocked,true,id);
 assert.equal(d.metrics.wins,26);assert.equal(d.metrics.chessWins,25);assert.equal(d.metrics.dinoBest,1200);
 assert.equal(d.achievements.find(a=>a.id==='legend').unlocked,false);
});
test('Leaderboards require opt-in, rank ties fairly, hide blocks/suspensions and ignore forged score requests',async t=>{
 const h=await app(t),{alice,bob,eve}=h;
 for(const [i,a,score]of [[1,alice,1300],[2,bob,1300],[3,eve,9999]])h.run('INSERT INTO game_results VALUES(?,?,?,?,?,?,?,?)',3000+i,'dino-run',a.id,h.admin.id,a.id,score,10,Date.now());
 assert.equal((await alice.call('studio/leaderboard?kind=dino')).data.leaders.length,0);
 await alice.call('studio/preferences',{leaderboard:true});await bob.call('studio/preferences',{leaderboard:true});await eve.call('studio/preferences',{leaderboard:true});
 let data=(await alice.call('studio/leaderboard?kind=dino')).data;assert.deepEqual(data.leaders.map(a=>a.rank),[1,2,2]);assert.equal(data.own.rank,2);
 await alice.call('block',{target:eve.id});data=(await alice.call('studio/leaderboard?kind=dino')).data;assert.deepEqual(data.leaders.map(a=>a.rank),[1,1]);
 h.run('UPDATE users SET suspended_until=? WHERE id=?',Date.now()+86400000,bob.id);assert.equal((await alice.call('studio/leaderboard?kind=dino')).data.leaders.length,1);
 await alice.call('studio/preferences',{leaderboard:false});assert.equal((await alice.call('studio/leaderboard?kind=dino')).data.leaders.length,0);
 assert.equal((await alice.call('studio/leaderboard?kind=secret')).status,400);
 assert.equal((await alice.call('studio/score',{score:9999999})).status,404);
});
test('Profile badges are public to members; detailed game statistics are shared only after opt-in',async t=>{
 const h=await app(t);await h.alice.call('post',{body:'Ein sichtbarer Erfolg.',category:'Alltag'});
 let p=(await h.bob.call('studio/profile?id='+h.alice.id)).data;assert.equal(p.achievements[0].id,'first-post');assert.equal('stats' in p,false);assert.equal('preferences' in p,false);
 await h.alice.call('studio/preferences',{leaderboard:true});p=(await h.bob.call('studio/profile?id='+h.alice.id)).data;assert.equal(typeof p.stats.wins,'number');
 await h.bob.call('block',{target:h.alice.id});assert.equal((await h.bob.call('studio/profile?id='+h.alice.id)).status,404);
});
test('Feedback validates, deduplicates, stays account-scoped and can only be managed by an admin',async t=>{
 const h=await app(t),{alice,bob,admin}=h;
 assert.equal((await alice.call('studio/feedback',{kind:'unknown',body:'Test feedback text.'})).status,400);
 assert.equal((await alice.call('studio/feedback',{kind:'bug',body:'short'})).status,400);
 const payload={kind:'bug',body:'<script>alert(1)</script> A reproducible test of feedback.'};
 const r=await alice.call('studio/feedback',payload);assert.equal(r.status,201);assert.equal((await alice.call('studio/feedback',payload)).data.id,r.data.id);
 assert.equal((await bob.call('studio/overview')).data.feedback.length,0);
 assert.equal((await alice.call('studio/admin-feedback')).status,403);
 const list=(await admin.call('studio/admin-feedback')).data.feedback;assert.equal(list.length,1);assert.equal(list[0].body,payload.body);
 assert.equal((await admin.call('studio/admin-feedback',{id:r.data.id,status:'planned'})).status,200);
 assert.equal((await alice.call('studio/overview')).data.feedback[0].status,'planned');
 assert.equal((await bob.call('studio/admin-feedback',{id:r.data.id,status:'done'})).status,403);
});
test('Onboarding and optional sound/haptics persist per account and reject invalid preference types',async t=>{
 const {alice,bob}=await app(t);let p=(await alice.call('studio/overview')).data.preferences;assert.equal(p.sound,false);assert.equal(p.haptics,false);assert.equal(p.onboarding_done,false);
 await alice.call('studio/preferences',{onboarding_step:3,sound:true,haptics:true});p=(await alice.call('studio/overview')).data.preferences;assert.equal(p.onboarding_step,3);assert.equal(p.sound,true);
 assert.equal((await bob.call('studio/overview')).data.preferences.onboarding_step,0);
 assert.equal((await alice.call('studio/preferences',{onboarding_step:99})).status,400);assert.equal((await alice.call('studio/preferences',{sound:'yes'})).status,400);
 await alice.call('studio/preferences',{onboarding_step:4,onboarding_done:true});assert.equal((await alice.call('studio/overview')).data.preferences.onboarding_done,true);
});
test('Unified notifications include reactions, respect account settings and cannot be marked read by outsiders',async t=>{
 const {alice,bob,eve}=await app(t);const p=await alice.call('post',{body:'Reaktionsfähiger Konter.',category:'Alltag'});
 await bob.call('react',{kind:'post',target:p.data.id,value:1});const notices=(await alice.call('notifications')).data.notices;assert.equal(notices[0].type,'reactions');assert.equal(notices[0].target,p.data.id);
 await eve.call('notifications/read',{id:notices[0].id});assert.equal((await alice.call('notifications')).data.notices[0].read_at,null);
 await alice.call('settings',{reactions:false});await eve.call('react',{kind:'post',target:p.data.id,value:1});assert.equal((await alice.call('notifications')).data.notices.length,1);
});
test('Wallet history includes daily grants, reaction values and expenses without touching the balance on reads',async t=>{
 const h=await app(t,{grant:0}),{alice,bob}=h;
 await alice.call('daily',{});const p=await alice.call('post',{body:'Ein guter Buchungstest.',category:'Alltag'});await bob.call('react',{kind:'post',target:p.data.id,value:1});
 const a=await alice.call('wallet'),b=await alice.call('wallet');assert.equal(a.data.balance,302);assert.equal(b.data.balance,302);assert.deepEqual(a.data.entries.map(e=>e.origin).sort(),['daily','reaction']);
 await bob.call('react',{kind:'post',target:p.data.id,value:-1});assert.equal((await alice.call('wallet')).data.balance,295);assert.equal((await alice.call('wallet')).data.entries.find(e=>e.origin==='reaction').amount,-5);
});
test('Feed text and photos have no age expiry; private chat retains its independent policy',async t=>{
 const h=await app(t),{alice}=h;const text=await alice.call('post',{body:'Ein Beitrag für vier Wochen.',category:'Alltag'});const p=h.one('SELECT * FROM posts WHERE id=?',text.data.id);assert.equal(p.expires,null);
 const once=await alice.upload('upload-post',{viewMode:'once'});assert.equal(once.status,201);const timed=h.one('SELECT * FROM posts WHERE id=?',once.data.id);assert.equal(timed.expires,null);
 const permanent=await alice.upload();assert.equal(h.one('SELECT expires FROM posts WHERE id=?',permanent.data.id).expires,null);
});
test('All application assets and image worlds are served with CSP, conditional ETags and compression',async t=>{
 const {anon}=await app(t);const html=await (await anon.raw('/')).text();const assets=[...html.matchAll(/(?:src|href)="(\/[^"#?]+)"/g)].map(m=>m[1]).filter(x=>x!=='/');
 for(const route of new Set([...assets,'/art/night.webp','/art/pride.webp','/art/forest.webp','/art/ice.webp'])){const r=await anon.raw(route);assert.equal(r.status,200,route);}
 const response=await anon.raw('/design-system.css',{headers:{'Accept-Encoding':'br'}});assert.equal(response.headers.get('content-encoding'),'br');assert.match(response.headers.get('content-security-policy'),/default-src 'self'/);
 const tag=response.headers.get('etag');assert.ok(tag);assert.equal((await anon.raw('/design-system.css',{headers:{'If-None-Match':tag}})).status,304);
 assert.equal((await anon.raw('/server.mjs')).status,404);assert.equal((await anon.raw('/data/feindschaft.sqlite')).status,404);
});
test('Photo compression validates the actual pixels, resizes, strips metadata and produces WebP',async()=>{
 const original=await sharp({create:{width:2400,height:2100,channels:3,background:'#bb77ef'}}).jpeg({quality:100}).withMetadata().toBuffer();
 const r=await optimizeMedia({name:'photo.jpg',data:original},'image'),meta=await sharp(r.data).metadata();assert.equal(meta.format,'webp');assert.equal(meta.width,2048);assert.ok(meta.height<=2048);assert.equal(meta.exif,undefined);assert.ok(r.data.length<original.length);
 await assert.rejects(()=>optimizeMedia({name:'bad.png',data:png.subarray(0,25)},'image'),e=>e[0]===400);
});
test('Audio compression yields playable MP3 while preserving already smaller supported uploads',async()=>{
 const source=wave(2),r=await optimizeMedia({name:'silence.wav',data:source},'audio');assert.equal(r.mime,'audio/mpeg');assert.ok(r.data.length<source.length);
 const again=await optimizeMedia(r,'audio');assert.ok(again.data.length<=r.data.length);
});
test('Server rejects video longer than three minutes and compresses valid video to streaming MP4',async()=>{
 let bin;try{bin=(await import('ffmpeg-static')).default;}catch{bin='ffmpeg';}
 const directory=mkdtempSync(path.join(tmpdir(),'f-video-test-'));
 try{const file=path.join(directory,'clip.mp4');execFileSync(bin,['-v','error','-f','lavfi','-i','color=c=purple:s=320x180:r=1','-t','181','-c:v','libx264','-preset','ultrafast','-y',file]);
 await assert.rejects(()=>optimizeMedia({name:'clip.mp4',data:readFileSync(file)},'video'),e=>e[0]===400&&e[1].includes('3 Minuten'));
 execFileSync(bin,['-v','error','-f','lavfi','-i','testsrc2=s=320x180:r=15','-t','2','-c:v','libx264','-preset','ultrafast','-crf','5','-y',file]);
 const original=readFileSync(file),r=await optimizeMedia({name:'clip.mp4',data:original},'video');assert.equal(r.mime,'video/mp4');assert.ok(r.data.length<original.length);
 }finally{rmSync(directory,{recursive:true,force:true});}
});
test('Every new interface dictionary entry is complete in English, Russian and Ukrainian',()=>{
 const context={};context.globalThis=context;vm.runInNewContext(read('studio-translations.js'),context);const translations=context.F_TRANSLATIONS;assert.ok(Object.keys(translations).length>=210);
 for(const [key,values]of Object.entries(translations)){assert.equal(values.length,3,key);for(const value of values)assert.equal(typeof value,'string',key);assert.ok(values.every(v=>v.trim().length>0),key);}
 const source=read('i18n.js');assert.match(source,/data-user-content/);assert.match(source,/message-body/);
});
test('Reduced-motion, shared theme tokens, accessible navigation and privacy-safe lazy loading are wired',()=>{
 const css=read('design-system.css');for(const name of ['night','pride','forest','ice'])assert.match(css,new RegExp('data-theme='+name));
 assert.match(css,/@media\(prefers-reduced-motion:reduce\)/);assert.doesNotMatch(css,/transition:\s*all/);assert.match(css,/safe-area-inset-bottom/);
 assert.match(read('index.html'),/Mobile Hauptnavigation/);assert.match(read('features.js'),/preload="none" data-src=/);assert.match(read('media-client.js'),/IntersectionObserver/);
 assert.doesNotMatch(read('studio.js'),/navigator\.geolocation/);assert.match(read('studio.js'),/navigator\.share/);assert.match(read('studio.js'),/canvas\.toBlob/);
});

test('A real legacy database migrates without losing account IDs, sessions, balances, pending requests or chat history',async t=>{
 const {DatabaseSync}=await import('node:sqlite'),{createHash}=await import('node:crypto');const token='legacy-session-fixture';
 const h=await app(t,{seed(directory){const db=new DatabaseSync(path.join(directory,'feindschaft.sqlite'));
  db.exec(`CREATE TABLE users(id INTEGER PRIMARY KEY,name TEXT NOT NULL COLLATE NOCASE UNIQUE,hash TEXT,color TEXT NOT NULL,demo INTEGER DEFAULT 0,trial_start INTEGER,created INTEGER NOT NULL);
  CREATE TABLE sessions(token TEXT PRIMARY KEY,user_id INTEGER,expires INTEGER);
  CREATE TABLE posts(id INTEGER PRIMARY KEY,user_id INTEGER,body TEXT NOT NULL,category TEXT NOT NULL,created INTEGER NOT NULL,sample_flowers INTEGER DEFAULT 0,expires INTEGER,deleted INTEGER DEFAULT 0);
  CREATE TABLE requests(id INTEGER PRIMARY KEY,sender INTEGER,receiver INTEGER,status TEXT DEFAULT 'pending',created INTEGER NOT NULL,UNIQUE(sender,receiver));
  CREATE TABLE messages(id INTEGER PRIMARY KEY,request_id INTEGER,sender INTEGER,body TEXT NOT NULL,created INTEGER NOT NULL);
  CREATE TABLE daily_claims(user_id INTEGER,day TEXT,amount INTEGER NOT NULL DEFAULT 300,created INTEGER NOT NULL,PRIMARY KEY(user_id,day));`);
  const at=Date.now()-100000;db.prepare('INSERT INTO users(id,name,color,created) VALUES(?,?,?,?)').run(6,'lima','mint',at);db.prepare('INSERT INTO users(id,name,color,created) VALUES(?,?,?,?)').run(13,'Lieblingsproblem_','pink',at);
  db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(createHash('sha256').update(token).digest('hex'),6,Date.now()+86400000);
  db.prepare('INSERT INTO posts(id,user_id,body,category,created,expires) VALUES(1,6,?,?,?,?)').run('Bestehender Beitrag','Alltag',at,at+7*86400000);
  db.prepare('INSERT INTO requests VALUES(6,6,13,?,?)').run('pending',at);db.prepare('INSERT INTO messages VALUES(1,6,6,?,?)').run('Bestehender Nachrichtenverlauf',at);
  db.prepare('INSERT INTO daily_claims VALUES(6,?,?,?)').run('legacy-day',300,at);db.close();
 }});
 const old=h.client();old.cookie='f_session='+token;assert.equal((await old.call('me')).data.user.id,6);assert.equal((await old.call('me')).data.user.name,'lima');assert.equal((await old.call('wallet')).data.balance,300);
 const request=(await old.call('people')).data.requests.find(r=>r.id===6);assert.equal(request.status,'pending');assert.equal(request.receiver,13);
 const p=h.one('SELECT * FROM posts WHERE id=1');assert.equal(p.expires,null);assert.equal(p.deleted,0);
 assert.equal(h.one('SELECT body FROM messages WHERE id=1').body,'Bestehender Nachrichtenverlauf');assert.equal((await old.call('request',{target:13,expectedCost:200})).data.charged,0);assert.equal((await old.call('wallet')).data.balance,300);
 assert.equal((await old.call('messages?request=6')).status,403);assert.equal(h.one('SELECT COUNT(*) AS n FROM studio_schema WHERE version=11').n,1);
});

test('The optimised reset film retains its embedded audio and its complete visual duration',async()=>{
 let bin;try{bin=(await import('ffmpeg-static')).default;}catch{bin='ffmpeg';}
 let info='';try{execFileSync(bin,['-hide_banner','-i',new URL('public/reset-film.mp4',import.meta.url).pathname],{stdio:'pipe'});}catch(e){info=String(e.stderr||'');}
 assert.match(info,/Video: h264/);assert.match(info,/Audio: aac/);assert.match(info,/Duration: 00:02:15\./);
});
