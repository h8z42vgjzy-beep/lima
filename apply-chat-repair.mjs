import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const file=path.join(root,'server.mjs');let server=readFileSync(file,'utf8');
const marker='// FEINDSCHAFT-CHAT-REPAIR-2';
if(!server.includes(marker)){
 if(server.includes('// FEINDSCHAFT-CHAT-REPAIR-1')){
  server=server.replace('// FEINDSCHAFT-CHAT-REPAIR-1',marker);
 }else{
  const start=server.indexOf("    if(route==='block'||route==='unblock'){");
  const end=server.indexOf("    if(route==='respond'){",start);
  if(start<0||end<0)throw Error('Chat-Reparatur 2: Unbekannte server.mjs-Version. Keine Dateien geändert.');
  const handler=`    ${marker}\n    if(['block','unblock','request'].includes(route)){\n      const result=handleChatRepair({route,user,b,idField,one,run,transact,rate,blocked,debit,now});\n      return send(result.status,result.data);\n    }\n`;
  server="import {handleChatRepair} from './chat-repair.mjs';\n"+server.slice(0,start)+handler+server.slice(end);
 }
}
const anchor="if(route==='me')return send(200,{user:safeUser(user)});";
if(!server.includes("route==='chat-repair-status'")){
 if(!server.includes(anchor))throw Error('Chat-Reparatur 2: Status-Prüfpunkt nicht gefunden. Keine Dateien geändert.');
 server=server.replace(anchor,"if(route==='chat-repair-status')return send(200,{active:true,repair:'chat-repair-2',version:2});\n      "+anchor);
}
if(server.includes('Zwischen euch gibt es bereits eine Anfrage.'))throw Error('Chat-Reparatur 2: Alte Anfragefunktion noch vorhanden. Keine Dateien geändert.');
const changes=[[file,server]];let clients=0;
for(const clientFile of [path.join(root,'public','app.js'),path.join(root,'app.js')]){
 if(!existsSync(clientFile))continue;
 clients++;let client=readFileSync(clientFile,'utf8');
 if(!client.includes('retry-chat-request')){
  const rowEnd='>Ablehnen</button>`:\'\'}</div></div>`;';
  if(!client.includes(rowEnd)||!client.includes(" case 'request':"))throw Error('Chat-Reparatur 2: Unbekannte app.js-Version. Keine Dateien geändert.');
  client=client.replace(rowEnd,`>Ablehnen</button>\`:type==='declined'?\`<button class="button outline small" data-action="retry-chat-request" data-id="\${r.sender===user.id?r.receiver:r.sender}">Erneut anfragen · kostenlos</button>\`:''}</div></div>\`;`);
  client=client.replace(" case 'request':",` case 'retry-chat-request':if(!confirm(globalThis.fTranslate?.('Erneut kostenlos anfragen? Die andere Person muss bestätigen.')||'Erneut kostenlos anfragen? Die andere Person muss bestätigen.'))break;await api('request',{target:id,expectedCost:0});toast('Anfrage gesendet. Die andere Person entscheidet.');await inbox();break;\n case 'request':`);
 }
 if(!client.includes('F_CHAT_REPAIR_VERSION')){
  client='const F_CHAT_REPAIR_VERSION=2;\n'+client;
  const hint='<div class="modal-eyebrow">PRIVATE WORTDUELLE</div>';
  if(!client.includes(hint))throw Error('Chat-Reparatur 2: Chat-Übersicht nicht gefunden. Keine Dateien geändert.');
  client=client.replace(hint,hint+'<p class="form-hint">Chat-Reparatur 2 aktiv</p>');
 }
 changes.push([clientFile,client]);
}
if(!clients)throw Error('Chat-Reparatur 2: Keine app.js vorhanden. Keine Dateien geändert.');
for(const [filename,contents]of changes)writeFileSync(filename,contents);
console.log('CHAT-REPAIR-2 AKTIV – Status: /api/chat-repair-status');
