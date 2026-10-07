/* One soundtrack, synchronized to the shared visual timeline. No third-party audio. */
(function(scope){
'use strict';
class ResetAudioController {
 constructor(media,getElapsed,onChange=()=>{}){
  this.media=media;this.getElapsed=getElapsed;this.onChange=onChange;
  this.wantPlay=false;this.attempted=false;this.closed=false;this.generation=0;this.lastSync=-Infinity;
  this.status='paused';this.notice='';
  media.preload='auto';media.volume=.7;media.loop=false;
  media.addEventListener('loadedmetadata',()=>this.align(true));
  media.addEventListener('playing',()=>{if(this.closed||!this.wantPlay){media.pause();return;}this.status='playing';this.notice='';this.align();this.emit();});
  media.addEventListener('waiting',()=>{if(!this.closed&&this.wantPlay){this.status='loading';this.notice='Musik lädt …';this.emit();}});
  media.addEventListener('error',()=>{if(!this.closed){this.wantPlay=false;this.status='error';this.notice='Ton nicht geladen. Oben erneut einschalten.';this.emit();}});
  media.addEventListener('ended',()=>{if(!this.closed){this.wantPlay=false;this.status='ended';this.notice='';this.emit();}});
 }
 get snapshot(){return {status:this.status,wantPlay:this.wantPlay,notice:this.notice};}
 emit(){if(!this.closed)this.onChange(this.snapshot);}
 align(force=false){
  if(this.closed||this.media.readyState<1)return;
  const expected=Math.max(0,this.getElapsed()/1000);
  if(!force&&(this.status!=='playing'||this.media.seeking||Math.abs(this.media.currentTime-expected)<.85))return;
  try{this.media.currentTime=Number.isFinite(this.media.duration)?Math.min(expected,Math.max(0,this.media.duration-.02)):expected;}catch{/* Retry after metadata on browsers that cannot seek yet. */}
 }
 async enable(){
  if(this.closed)return;
  const generation=++this.generation;this.wantPlay=true;
  if(this.getElapsed()<0){this.attempted=false;this.status='waiting';this.notice='Musik startet mit der Animation.';this.emit();return;}
  this.attempted=true;
  if(this.status==='error')this.media.load();
  this.status='loading';this.notice='Musik lädt …';this.emit();this.align(true);
  try{await this.media.play();if(this.closed){this.media.pause();return;}if(generation!==this.generation)return;if(!this.wantPlay){this.media.pause();return;}this.status='playing';this.notice='';}
  catch(error){if(this.closed||generation!==this.generation)return;this.wantPlay=false;this.status=error.name==='NotAllowedError'?'blocked':'error';this.notice=error.name==='NotAllowedError'?'Musik starten: oben auf „Ton an“ tippen.':'Ton nicht geladen. Oben erneut einschalten.';}
  this.emit();
 }
 pause(){if(this.closed)return;this.generation++;this.wantPlay=false;this.media.pause();this.status='paused';this.notice='Musik und Effekte sind ausgeschaltet.';this.emit();}
 toggle(){if(this.wantPlay){this.pause();return Promise.resolve();}return this.enable();}
 sync(force=false){
  if(this.closed)return;
  const elapsed=this.getElapsed();
  if(this.wantPlay&&!this.attempted&&elapsed>=0){this.enable();return;}
  if(force||elapsed-this.lastSync>=1000){this.lastSync=elapsed;if(this.wantPlay)this.align(force);}
 }
 close(){if(this.closed)return;this.closed=true;this.generation++;this.wantPlay=false;this.media.pause();this.media.removeAttribute('src');this.media.load();}
}
scope.FeedResetAudioController=ResetAudioController;
})(globalThis);
