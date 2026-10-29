import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,renameSync,copyFileSync,rmSync} from 'node:fs';
import vm from 'node:vm';
import {app} from './test-support.mjs';

test('Text posts allow no category, pictures require one, and feed expiry is removed',async t=>{
 const h=await app(t);const p=await h.alice.call('post',{body:'Ein Text ohne Kategorie.'});assert.equal(p.status,201);const row=h.one('SELECT * FROM posts WHERE id=?',p.data.id);assert.equal(row.category,'');assert.equal(row.expires,null);
 assert.equal((await h.alice.upload('upload-post',{category:''})).status,400);
 const image=await h.alice.upload('upload-post',{viewMode:'once'});assert.equal(image.status,201);assert.equal(h.one('SELECT expires FROM media WHERE post_id=?',image.data.id).expires,8640000000000000);
 assert.equal((await h.alice.call('post',{body:'Falsche Kategorie',category:999999})).status,400);
 assert.equal((await h.alice.call('admin/reports')).status,403);assert.equal((await h.admin.call('admin/reports')).status,200);
});

test('Art is readable in normal and flattened upload layouts',async t=>{
 const h=await app(t);
 for(const name of ['dino.svg','chess.svg','arcade.svg','night.webp','pride.webp','forest.webp','ice.webp']){
  const expected=readFileSync('public/art/'+name);assert.deepEqual(Buffer.from(await (await h.anon.raw('/art/'+name)).arrayBuffer()),expected);
 }
 copyFileSync('public/art/chess.svg','chess.svg');renameSync('public/art/chess.svg','public/art/chess.svg.hold');
 try{const r=await h.anon.raw('/art/chess.svg');assert.equal(r.status,200);assert.match(r.headers.get('content-type'),/image\/svg/);assert.deepEqual(Buffer.from(await r.arrayBuffer()),readFileSync('chess.svg'));}
 finally{renameSync('public/art/chess.svg.hold','public/art/chess.svg');rmSync('chess.svg');}
});

test('Sharing creates a downloadable PNG even when its artwork fails',async()=>{
 const src=readFileSync('public/studio.js','utf8');const share=src.slice(src.indexOf('async function share(){'),src.indexOf('function shareFile(){'));
 const texts=[],buttons=[{disabled:true},{disabled:true},{disabled:true}],canvas={isConnected:true,getContext:()=>({fillRect(){},drawImage(){throw Error('failed image must not draw');},createLinearGradient:()=>({addColorStop(){}}),strokeRect(){},fillText:t=>texts.push(t)}),toBlob:fn=>fn(new Blob(['png'],{type:'image/png'}))};
 const context=vm.createContext({requireUser:()=>true,sync:async()=>{},overview:{metrics:{dinoBest:1234,wins:5}},user:{name:'Testname'},panel(){},head:()=>'',shareBlob:null,$:()=>canvas,getComputedStyle:()=>({getPropertyValue:()=>''}),document:{body:{dataset:{theme:'ice'}},querySelectorAll:()=>buttons},Image:class{async decode(){throw Error('404');}},Promise,setTimeout:()=>0,Error,tr:x=>x,fmt:String,location:{origin:'https://example.test'},Blob});
 await vm.runInContext(share+';share()',context);assert.equal(context.shareBlob.type,'image/png');assert.deepEqual(buttons.map(b=>b.disabled),[false,false,false]);assert.ok(texts.includes('1234 m'));assert.ok(texts.includes('Testname'));assert.ok(texts.includes('https://example.test'));
});

test('Wallet claim precedes history and moderation/archive have mobile access outside the hidden account header',()=>{
 const f=readFileSync('public/features.js','utf8'),s=readFileSync('public/studio.js','utf8'),a=readFileSync('public/app.js','utf8');const wallet=f.slice(f.indexOf('async function showWalletHistory'),f.indexOf('function updateChatSendPrice'));
 assert.ok(wallet.indexOf('data-action="daily"')<wallet.indexOf('<h3>Verlauf</h3>'));assert.match(s,/community-access/);assert.match(s,/user\?\.isAdmin\?'<button[^>]+data-action="admin"/);assert.match(a,/user.isAdmin\?'<button[^>]+data-action="admin">Moderation/);assert.match(f,/<details class="message-options"><summary/);
});
