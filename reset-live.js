(function(){
'use strict';
let source=null,lastId=null;
function showEvent(event){
 if(document.hidden||!event||!Number.isFinite(event.startAt)||event.ends<=event.serverNow)return;
 if(event.id===lastId&&document.querySelector(".feed-reset-dialog"))return;
 lastId=event.id;globalThis.musicDeck?.pause();
 document.querySelectorAll("audio,video").forEach(media=>media.pause());
 const update=()=>{if(!event.preview&&typeof refresh==="function")refresh().catch(()=>{});};
 FeedResetAnimation.play(event,{preview:!!event.preview,shared:true,onEnd:update});update();
}
function disconnect(){source?.close();source=null;}
function connect(){
 if(document.hidden||typeof EventSource==='undefined'||source)return;
 source=new EventSource('/api/reset-stream');
 source.addEventListener('feed-reset',message=>{
   if(document.hidden)return;
   let event;try{event=JSON.parse(message.data);}catch{return;}
   showEvent(event);
 });
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){disconnect();FeedResetAnimation.stop();}else connect();});
window.addEventListener('offline',disconnect);window.addEventListener('online',connect);
window.addEventListener('pagehide',disconnect);window.addEventListener('pageshow',connect);
document.addEventListener('click',async event=>{
 if(!event.target.closest('[data-action="reset-preview"]')||typeof user==='undefined'||!user?.isAdmin)return;
 const button=event.target.closest('[data-action="reset-preview"]');button.disabled=true;
 try{const result=await api('admin/reset-preview',{});showEvent(result.event);}
 catch(error){if(typeof toast==='function')toast(error.message);}
 finally{button.disabled=false;}
});
connect();
})();
