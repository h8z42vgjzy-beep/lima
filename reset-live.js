(function(){
'use strict';
let source=null,lastId=null;
function disconnect(){source?.close();source=null;}
function connect(){
 if(document.hidden||typeof EventSource==='undefined'||source)return;
 source=new EventSource('/api/reset-stream');
 source.addEventListener('feed-reset',message=>{
   if(document.hidden)return;
   let event;try{event=JSON.parse(message.data);}catch{return;}
   if(event.id===lastId||!Number.isFinite(event.startAt)||!Number.isFinite(event.ends)||!Number.isFinite(event.serverNow)||event.ends<=event.serverNow)return;
   lastId=event.id;
   globalThis.musicDeck?.pause();
   document.querySelectorAll('audio,video').forEach(media=>media.pause());
   const update=()=>{if(typeof refresh==='function')refresh().catch(()=>{});};
   FeedResetAnimation.play(event,{onEnd:update});update();
 });
}
document.addEventListener('visibilitychange',()=>{if(document.hidden){disconnect();FeedResetAnimation.stop();}else connect();});
window.addEventListener('offline',disconnect);window.addEventListener('online',connect);
window.addEventListener('pagehide',disconnect);window.addEventListener('pageshow',connect);
document.addEventListener('click',event=>{
 if(event.target.closest('[data-action="reset-preview"]')&&typeof user!=='undefined'&&user?.isAdmin){globalThis.musicDeck?.pause();document.querySelectorAll('audio,video').forEach(media=>media.pause());FeedResetAnimation.play({}, {preview:true});}
});
connect();
})();
