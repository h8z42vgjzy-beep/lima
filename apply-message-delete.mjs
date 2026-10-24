import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
// Retain the existing chat repair, without installing the optional Nearby module.
if(existsSync(path.join(root,'apply-chat-repair.mjs'))&&existsSync(path.join(root,'chat-repair.mjs'))){
  await import(pathToFileURL(path.join(root,'apply-chat-repair.mjs')).href);
}
function replace(source,from,to,name){
  if(!source.includes(from))throw Error('Textnachrichten-Update: '+name+' nicht gefunden. Keine Textnachrichten-Dateien geändert.');
  return source.replace(from,to);
}
const target=path.join(root,'server.mjs');let server=readFileSync(target,'utf8');
if(!server.includes('// MESSAGE-DELETE-1')){
  server="import {createMessageDeletion} from './message-delete.mjs';\n"+server;
  server=replace(server,'const server=http.createServer',`// MESSAGE-DELETE-1\nconst messageDeletion=createMessageDeletion({db,one,run,transact,now,chatAccess});\nstaticFiles['/message-delete-client.js']=['message-delete-client.js','text/javascript; charset=utf-8'];\nstaticFiles['/message-delete.css']=['message-delete.css','text/css; charset=utf-8'];\nconst server=http.createServer`,'Serverstart');
  server=replace(server,"if(route==='me')return send(200,{user:safeUser(user)});","if(route==='message-delete-status')return send(200,{active:true,version:'message-delete-1'});\n      if(route==='me')return send(200,{user:safeUser(user)});",'Statusadresse');
  server=replace(server,"WHERE request_id=? AND deleted=0 ORDER BY id DESC LIMIT 500) ORDER BY id',rid)","WHERE request_id=? AND deleted=0 AND NOT EXISTS(SELECT 1 FROM hidden_messages hm WHERE hm.message_id=messages.id AND hm.user_id=?) ORDER BY id DESC LIMIT 500) ORDER BY id',rid,user.id)",'Nachrichtenansicht');
  server=replace(server,"if(route==='logout'){","if(route==='message-delete'){rate('message-delete:'+user.id,60);return send(200,messageDeletion.remove(user,b));}\n    if(route==='logout'){",'Löschroute');
  server=replace(server,"        const content=r.target_type==='post'?","        conversation=conversation.map(m=>{if(m.deleted){const evidence=messageDeletion.evidence(m.id);if(evidence)return {...m,body:evidence.body};}return m;});\n        const content=r.target_type==='post'?",'Moderationsansicht');
}
const writes=[[target,server]];let layouts=0;
for(const dir of [root,path.join(root,'public')]){
  const index=path.join(dir,'index.html'),app=path.join(dir,'app.js'),features=path.join(dir,'features.js');
  if(!existsSync(index)||!existsSync(app)||!existsSync(features))continue;
  layouts++;let html=readFileSync(index,'utf8'),client=readFileSync(app,'utf8'),f=readFileSync(features,'utf8');
  if(!client.includes("case 'delete-chat-text':"))client=replace(client," case 'view-chat-photo':"," case 'delete-chat-text':globalThis.fMessageDelete?.open(id,b.dataset.own==='1');break;\n case 'view-chat-photo':",'Nachrichtenbedienung');
  if(!f.includes('class="message-delete-button"')){
    const button=`\${!m.mediaId ? '<button type="button" class="message-delete-button" data-action="delete-chat-text" data-id="'+m.id+'" data-own="'+(m.sender===user.id?'1':'0')+'">'+(globalThis.fMessageDelete?.label()||'Löschen')+'</button>' : ''}`;
    f=replace(f,'<button data-action="report" data-type="message"',button+'<button data-action="report" data-type="message"','Löschknopf');
  }
  if(!html.includes('/message-delete-client.js')){
    html=replace(html,'</head>','<link rel="stylesheet" href="/message-delete.css">\n</head>','HTML-Kopf');
    html=replace(html,'</body>','<script src="/message-delete-client.js" defer></script>\n</body>','HTML-Ende');
  }
  writes.push([app,client],[features,f],[index,html],
    [path.join(dir,'message-delete-client.js'),readFileSync(path.join(root,'message-delete-client.js'),'utf8')],
    [path.join(dir,'message-delete.css'),readFileSync(path.join(root,'message-delete.css'),'utf8')]);
}
if(!layouts)throw Error('Textnachrichten-Update: Kein vollständiger Website-Ordner gefunden.');
for(const [file,contents]of writes)writeFileSync(file,contents);
console.log('MESSAGE-DELETE-1 AKTIV – Status: /api/message-delete-status');
