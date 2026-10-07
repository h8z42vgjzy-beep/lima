import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import './public/reset-audio.js';
class FakeAudio extends EventTarget {
 constructor(){super();this.seekWrites=0;this.time=0;this.paused=true;this.readyState=1;this.duration=108;this.currentTime=0;this.seeking=false;this.calls=0;this.fail=null;this.source='score';this.loads=0;}
 get currentTime(){return this.time;}
 set currentTime(value){this.time=value;this.seekWrites++;}
 async play(){this.calls++;if(this.fail)throw Object.assign(Error('blocked'),{name:this.fail});this.paused=false;this.dispatchEvent(new Event('playing'));}
 pause(){this.paused=true;}
 load(){this.loads++;}
 removeAttribute(){this.source='';}
}
function setup(ms=0){const media=new FakeAudio(),states=[];let elapsed=ms;const controller=new FeedResetAudioController(media,()=>elapsed,s=>states.push(s));return {media,controller,states,time(ms){elapsed=ms;}};}

test('Reset soundtrack follows countdown, late metadata and preview skips without repeated playback starts',async()=>{
 const h=setup(26000);await h.controller.enable();assert.equal(h.media.currentTime,26);assert.equal(h.media.paused,false);
 const seeks=h.media.seekWrites;for(let i=0;i<10;i++)h.media.dispatchEvent(new Event('playing'));assert.equal(h.media.seekWrites,seeks);
 h.time(36000);h.controller.sync(true);assert.equal(h.media.currentTime,36);
 h.media.currentTime=0;h.media.dispatchEvent(new Event('loadedmetadata'));assert.equal(h.media.currentTime,36);
 h.time(37000);h.media.currentTime=37;h.controller.sync();assert.equal(h.media.calls,1);
 h.controller.pause();h.time(52000);h.controller.sync(true);assert.equal(h.media.currentTime,37);assert.equal(h.media.paused,true);
 await h.controller.toggle();assert.equal(h.media.currentTime,52);assert.equal(h.media.paused,false);
 h.controller.close();assert.equal(h.media.paused,true);assert.equal(h.media.source,'');assert.equal(h.media.loads,1);
 h.time(60000);h.controller.sync();assert.equal(h.media.calls,2);
});

test('Autoplay denial offers a user tap; audio does not repeatedly retry or report false playback',async()=>{
 const h=setup();h.media.fail='NotAllowedError';await h.controller.enable();
 assert.equal(h.controller.snapshot.status,'blocked');assert.equal(h.controller.snapshot.wantPlay,false);assert.match(h.controller.snapshot.notice,/Ton an/);
 for(const ms of [1000,2000,3000]){h.time(ms);h.controller.sync();}
 assert.equal(h.media.calls,1);h.media.fail=null;h.time(5500);await h.controller.toggle();
 assert.equal(h.controller.snapshot.status,'playing');assert.equal(h.media.currentTime,5.5);
});

test('Shared three-second start delay is respected and closing during an unresolved play stops audio',async()=>{
 const h=setup(-3000);await h.controller.enable();assert.equal(h.media.calls,0);
 h.time(-100);h.controller.sync();assert.equal(h.media.calls,0);
 h.time(0);h.controller.sync();await Promise.resolve();assert.equal(h.media.calls,1);
 let done;h.controller.pause();h.media.play=()=>new Promise(resolve=>{done=()=>{h.media.paused=false;resolve();};});
 const promise=h.controller.enable();h.controller.close();done();await promise;assert.equal(h.media.paused,true);
});

test('Audio asset and scripts are bundled in dependency order; film player starts its embedded soundtrack',()=>{
 const index=readFileSync(new URL('public/index.html',import.meta.url),'utf8');
 assert.ok(index.indexOf('src="/reset-audio.js"')<index.indexOf('src="/reset-animation.js"'));
 const score=readFileSync(new URL('public/reset-soundtrack.mp3',import.meta.url));assert.ok(score.length>1000000);assert.ok(score.length<4000000);
 const source=readFileSync(new URL('public/reset-animation.js',import.meta.url),'utf8');
 assert.match(source,/video.src='\/reset-film\.mp4'/);assert.match(source,/await video.play\(\)/);assert.match(source,/video.muted=true/);assert.match(source,/video.pause\(\)/);
});
