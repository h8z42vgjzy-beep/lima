(function(){
'use strict';
let recipient=null,notices=[],signature='',busy=false;
const host=document.createElement('aside');host.className='moderation-alerts';host.setAttribute('aria-label','Hinweise der Moderation');document.body.append(host);
const menu=document.getElementById('moderation-notices');
const labels={warn:'Warnung der Moderation',delete:'Inhalt gelöscht',suspend:'Konto vorübergehend gesperrt',ban:'Konto gesperrt',keep:'Moderationsentscheidung'};
function card(notice){
 const element=document.createElement('section');element.className='moderation-notice';
 const title=document.createElement('h3');title.textContent=labels[notice.action]||'Hinweis der Moderation';element.append(title);
 const body=document.createElement('p');body.textContent=notice.body;element.append(body);
 if(notice.fine_percent){const fine=document.createElement('p');fine.textContent=`Guthabenabzug: ${notice.fine_percent} % (${notice.fine_amount} Beleidigungen).`;element.append(fine);}
 const time=document.createElement('small');time.textContent=new Date(notice.created).toLocaleString('de-DE');element.append(time);
 if(!notice.read_at){const button=document.createElement('button');button.type='button';button.textContent='Gelesen';button.addEventListener('click',async()=>{button.disabled=true;try{await api('moderation/read',{id:notice.id});await poll();element.remove();}catch(error){button.disabled=false;if(typeof toast==='function')toast(error.message);}});element.append(button);}
 return element;
}
async function poll(){
 if(document.hidden)return;
 if(typeof user==='undefined'||!user){host.replaceChildren();signature='';notices=[];if(menu)menu.hidden=true;recipient=null;return;}
 const uid=user.id;if(recipient!==uid){recipient=uid;signature='';notices=[];host.replaceChildren();}if(busy)return;busy=true;
 try{const data=await api('moderation/notices');if(!user||user.id!==uid)return;notices=data.notices;
  const pending=notices.filter(n=>!n.read_at),next=JSON.stringify(pending);
  if(menu){menu.hidden=false;menu.textContent=pending.length?`Moderationshinweise (${pending.length})`:'Moderationshinweise';}
  if(next!==signature){signature=next;host.replaceChildren(...pending.slice(0,3).map(card));}
 }catch{/* Retry on reconnect. */}finally{busy=false;}
}
menu?.addEventListener('click',async()=>{
 await poll();if(typeof user==='undefined'||!user)return;
 const dialog=document.createElement('dialog');dialog.className='moderation-history';dialog.setAttribute('aria-label','Deine Moderationshinweise');
 const close=document.createElement('button');close.textContent='Schließen ×';close.type='button';close.addEventListener('click',()=>{dialog.close();dialog.remove();});dialog.append(close);
 const heading=document.createElement('h2');heading.textContent='Deine Moderationshinweise';dialog.append(heading);
 if(!notices.length){const empty=document.createElement('p');empty.textContent='Keine Hinweise vorhanden.';dialog.append(empty);}
 else dialog.append(...notices.map(card));
 dialog.addEventListener('cancel',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
});
globalThis.refreshModerationNotices=poll;
setInterval(poll,10000);window.addEventListener('online',poll);document.addEventListener('visibilitychange',poll);poll();
})();
