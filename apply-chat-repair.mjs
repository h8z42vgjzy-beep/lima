// Run before the normal Render build. Safely patches the existing server/client.
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const serverFile=path.join(root,'server.mjs');let server=readFileSync(serverFile,'utf8');
const marker='// FEINDSCHAFT-CHAT-REPAIR-1';
if(!server.includes(marker)){
 const start=server.indexOf("    if(route==='block'||route==='unblock'){");
 const end=server.indexOf("    if(route==='respond'){",start);
 if(start<0||end<0)throw Error('Unbekannte server.mjs-Version: nichts geändert. Bitte aktuelle server.mjs zur Prüfung senden.');
 const repair=`    ${marker}\n    if(['block','unblock','request'].includes(route)){\n      const result=handleChatRepair({route,user,b,idField,one,run,transact,rate,blocked,debit,now});\n      return send(result.status,result.data);\n    }\n`;
 server="import {handleChatRepair} from './chat-repair.mjs';\n"+server.slice(0,start)+repair+server.slice(end);
}
const changes=[[serverFile,server]];
for(const clientFile of [path.join(root,'public','app.js'),path.join(root,'app.js')]){
 if(!existsSync(clientFile))continue;
 let client=readFileSync(clientFile,'utf8');if(client.includes('retry-chat-request'))continue;
 const rowEnd='>Ablehnen</button>`:\'\'}</div></div>`;';
 if(!client.includes(rowEnd)||!client.includes(" case 'request':"))throw Error('Unbekannte app.js-Version: nichts geändert. Bitte aktuelle app.js zur Prüfung senden.');
 client=client.replace(rowEnd,`>Ablehnen</button>\`:type==='declined'?\`<button class="button outline small" data-action="retry-chat-request" data-id="\${r.sender===user.id?r.receiver:r.sender}">Erneut anfragen · kostenlos</button>\`:''}</div></div>\`;`);
 client=client.replace(" case 'request':",` case 'retry-chat-request':if(!confirm(globalThis.fTranslate?.('Erneut kostenlos anfragen? Die andere Person muss bestätigen.')||'Erneut kostenlos anfragen? Die andere Person muss bestätigen.'))break;await api('request',{target:id,expectedCost:0});toast('Anfrage gesendet. Die andere Person entscheidet.');await inbox();break;\n case 'request':`);
 changes.push([clientFile,client]);
}
// Validate all required patterns before writing any files. Rerunning is harmless.
for(const [file,contents] of changes)writeFileSync(file,contents);
console.log('Chat-Reparatur aktiv: Blockierung, Entblockierung und kostenlose Wiederanfrage.');
