/* Browser canvas adaptation of the owner's supplied film sequence.
   Original phase timings and map paths; no film credits or personal names.
   Drawing and playback are isolated from all storage/deletion operations. */
(function(scope){
'use strict';
const DURATION=108000,BLACKOUT=95400;
const phases=[
 [0,'',''],[650,'EMERGENCY BATTERY DETECTED','reserve cell wakes display controller'],
 [1700,'BOOTING FROM RESERVE CELL','the display wakes after the power loss'],
 [3400,'AUTO LOGIN ACCEPTED','local session restored'],
 [6500,'CHECKING POWER STATE','no user response detected'],
 [9000,'MAIN POWER LOST','external grid response: none'],
 [12500,'CRISIS PROTOCOL INITIATED','fictional local simulation'],
 [17000,'REBUILDING SIMULATION STATE','datafeed / matrix / simulation cache'],
 [22000,'AUTHORITY CHAIN SEARCH','fictional local film animation'],
 [26000,'TESTING PATH ALPHA','VICTORY 12% / SURVIVAL 7% / RISK 91%'],
 [29500,'TESTING PATH BETA','VICTORY 18% / SURVIVAL 14% / RISK 88%'],
 [33000,'TESTING PATH GAMMA','VICTORY 25% / SURVIVAL 19% / RISK 82%'],
 [36500,'TESTING PATH DELTA','VICTORY 34% / SURVIVAL 23% / RISK 74%'],
 [40000,'TESTING PATH OMEGA','VICTORY 43% / SURVIVAL 31% / RISK 69%'],
 [44500,'OMEGA SELECTED','highest available probability / faulty inference'],
 [50000,'COUNTDOWN START','automated simulation active'],
 [79150,'FINAL SEQUENCE READY','simulation armed / final sequence waiting'],
 [81850,'FINAL COUNTDOWN','ten seconds to blackout'],
 [BLACKOUT,'Feed Water Reset','']
];
const paths=[
 [26000,26,42,63,36,2750],[29500,63,36,26,42,2750],
 [33000,52,39,63,36,2540],[36500,73,55,48,38,2540],[40000,26,42,86,48,3000],
 [54500,26,42,63,36,1833],[62000,63,36,26,42,1833],
 [68250,48,38,73,55,1650],[73250,73,55,52,39,1500],
 [86800,48,38,73,55,1650],[89950,63,36,26,42,1833],[92050,73,55,52,39,1500]
];
const continents=[
 [[9,16,25,33,30,22,15],[38,22,18,35,48,52,45]],
 [[30,34,38,36,32,29],[58,66,77,92,83,68]],
 [[44,50,55,53,47],[34,27,36,45,43]],
 [[51,59,64,61,55,49],[49,51,66,88,82,63]],
 [[58,68,82,94,91,75,63],[27,20,25,42,61,54,43]]
];
const cities=[[26,42,'WASHINGTON'],[29,37,'NEW YORK'],[48,38,'LONDON'],[52,39,'BERLIN'],[63,36,'MOSCOW'],[86,48,'TOKYO'],[73,55,'DELHI']];
function stateAt(elapsed){
 const ms=Math.max(0,Math.min(DURATION,elapsed));let phase=phases[0];
 for(const item of phases)if(ms>=item[0])phase=item;
 let count=null;
 if(ms>=52000&&ms<78250)count=Math.max(0,20-Math.floor((ms-52000)/1250));
 if(ms>=83650&&ms<BLACKOUT)count=Math.max(0,10-Math.floor((ms-83650)/1050));
 return {ms,phase:phases.indexOf(phase),title:phase[1],subtitle:phase[2],count,final:ms>=BLACKOUT,done:elapsed>=DURATION};
}
function render(ctx,width,height,elapsed,{reducedMotion=false}={}){
 const s=stateAt(elapsed),w=width,h=height,t=s.ms/1000,green='#52ff9f',amber='#ffe178',red='#ff6857';
 ctx.save();ctx.fillStyle='#020605';ctx.fillRect(0,0,w,h);
 const text=(str,x,y,size=16,color=green,align='left')=>{ctx.font=`${size>=22?'700':'400'} ${size}px monospace`;ctx.fillStyle=color;ctx.textAlign=align;ctx.fillText(str,x,y);};
 const fit=(str,x,y,max,size,color,align='left')=>{ctx.font=`700 ${size}px monospace`;const sizeFit=Math.min(size,size*max/Math.max(1,ctx.measureText(str).width));text(str,x,y,sizeFit,color,align);};
 if(s.final){
   const progress=Math.min(1,(s.ms-BLACKOUT)/2600),opacity=reducedMotion?1:progress;
   ctx.globalAlpha=opacity;
   fit('Feed Water Reset',w/2,h/2+6,w*.87,Math.min(64,w*.085),'#ecfff4','center');
   ctx.fillStyle=green;ctx.fillRect(w*.38,h/2+37,w*.24,2);ctx.restore();return s;
 }
 if(s.ms<650){ctx.restore();return s;}
 // CRT grid and controlled, slow radar movement; no full-screen strobe.
 ctx.strokeStyle='#0b3020';ctx.lineWidth=1;
 for(let x=0;x<w;x+=36){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,h);ctx.stroke();}
 for(let y=0;y<h;y+=36){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(w,y);ctx.stroke();}
 if(s.ms>=22000&&!reducedMotion){ctx.globalAlpha=.16;for(let i=0;i<60;i++){const x=(i*79)%w,y=(t*(30+i%11*7)+i*41)%h;text('0123456789ABCDEF'[(i+Math.floor(t*3))%16],x,y,12,green);}ctx.globalAlpha=1;}
 const compact=h<500,mobile=w<680||compact,pad=mobile?14:28,header=compact?94:mobile?104:100,bottom=compact?85:mobile?116:140;
 const contentHeight=h-header-bottom-26;
 const mapH=mobile&&!compact?contentHeight*.57:contentHeight;
 const mapW=mobile?w-pad*2:(w-pad*3)*.55;
 const mx=pad,my=header;
 const tx=mobile?pad:mx+mapW+pad,ty=mobile?my+mapH+12:my;
 const tw=mobile?w-pad*2:w-tx-pad,th=mobile?Math.max(70,contentHeight-mapH-12):contentHeight;
 text('F // LIVE RESET',pad,26,mobile?12:14,green);
 text('FICTIONAL FILM SEQUENCE',w-pad,26,mobile?9:12,'#9ccbb0','right');
 fit(s.title,w/2,63,w-pad*2,mobile?24:34,s.phase>=6?red:green,'center');
 fit(s.subtitle,w/2,86,w-pad*2,mobile?11:15,amber,'center');
 function panel(x,y,pw,ph,title){ctx.fillStyle='#020c08';ctx.fillRect(x,y,pw,ph);ctx.strokeStyle='#29764f';ctx.strokeRect(x+.5,y+.5,pw-1,ph-1);text(title,x+12,y+22,mobile?11:13,green);ctx.beginPath();ctx.moveTo(x,y+31);ctx.lineTo(x+pw,y+31);ctx.stroke();}
 panel(mx,my,mapW,mapH,s.ms<6500?'RESERVE BOOT':'STRATEGIC MAP / RESERVE POWER MODEL');
 ctx.save();ctx.beginPath();ctx.rect(mx+1,my+32,mapW-2,mapH-33);ctx.clip();
 if(s.ms<6500){
   fit('RESERVE BOOT',mx+mapW/2,my+mapH*.45,mapW-25,mobile?30:42,'#70c7ff','center');
   fit('RESTORING LOCAL SESSION',mx+mapW/2,my+mapH*.57,mapW-25,14,green,'center');
   ctx.fillStyle='#123b29';ctx.fillRect(mx+mapW*.12,my+mapH*.69,mapW*.76,16);
   ctx.fillStyle=green;ctx.fillRect(mx+mapW*.12,my+mapH*.69,mapW*.76*Math.min(1,s.ms/6500),16);
 }else{
   const oy=my+26,oh=mapH-35;
   for(const [xs,ys] of continents){ctx.beginPath();xs.forEach((px,i)=>{const x=mx+mapW*px/100,y=oy+oh*ys[i]/100;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.fillStyle='#0b3520';ctx.fill();ctx.strokeStyle='#3ed485';ctx.stroke();}
   const cx=mx+mapW/2,cy=oy+oh/2,radius=Math.min(mapW,oh)*.24;
   ctx.strokeStyle='#28774b';for(let r=radius/3;r<=radius;r+=radius/3){ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.stroke();}
   const a=reducedMotion?-.8:t*1.65;ctx.strokeStyle=green;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(a)*radius,cy+Math.sin(a)*radius);ctx.stroke();
   for(const [x,y,name]of cities){const px=mx+mapW*x/100,py=oy+oh*y/100;ctx.fillStyle=amber;ctx.beginPath();ctx.arc(px,py,reducedMotion?3:3+Math.abs(Math.sin(t*2.1))*2,0,Math.PI*2);ctx.fill();if(!mobile)text(name,px+7,py-7,9,amber);}
   for(const [start,x1,y1,x2,y2,duration]of paths){
     const age=s.ms-start;if(age<0||age>duration+1600)continue;
     const p=Math.min(1,age/duration),ax=mx+mapW*x1/100,ay=oy+oh*y1/100,bx=mx+mapW*x2/100,by=oy+oh*y2/100,cx=(ax+bx)/2,cy=Math.min(ay,by)-oh*.23;
     ctx.strokeStyle='#af5038';ctx.lineWidth=1.5;ctx.beginPath();ctx.moveTo(ax,ay);ctx.quadraticCurveTo(cx,cy,bx,by);ctx.stroke();
     if(p<1){const x=(1-p)**2*ax+2*(1-p)*p*cx+p*p*bx,y=(1-p)**2*ay+2*(1-p)*p*cy+p*p*by;ctx.fillStyle=red;ctx.beginPath();ctx.arc(x,y,4,0,Math.PI*2);ctx.fill();}
     else{const k=(age-duration)/1600;ctx.globalAlpha=1-k;ctx.strokeStyle=amber;ctx.beginPath();ctx.arc(bx,by,5+k*60,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
   }
 }
 ctx.restore();if(!compact){const terminalH=mobile?th:Math.floor(th*.58);panel(tx,ty,tw,terminalH,'COMMAND TERMINAL / AUTO-TYPING');
 ctx.save();ctx.beginPath();ctx.rect(tx+4,ty+34,tw-8,terminalH-38);ctx.clip();
 const lines=phases.filter(p=>p[0]>0&&p[0]<=s.ms).map(p=>'['+String(Math.floor(p[0]/1000)).padStart(3,'0')+'] '+p[1]);
 const rows=Math.max(1,Math.floor((terminalH-55)/21));
 lines.slice(-rows).forEach((line,i)=>{if(i===Math.min(rows,lines.length)-1&&!reducedMotion)line=line.slice(0,Math.max(0,Math.floor((s.ms-phases[s.phase][0])/27)));text(line.slice(0,Math.floor((tw-22)/7.9)),tx+12,ty+54+i*21,13,i===Math.min(rows,lines.length)-1?amber:'#85d6a5');});
 ctx.restore();
 if(!mobile){const sy=ty+terminalH+12,sh=th-terminalH-12;panel(tx,sy,tw,sh,'SYSTEM VOICE / INTERNAL MONOLOGUE');ctx.save();ctx.beginPath();ctx.rect(tx+3,sy+33,tw-6,sh-36);ctx.clip();const history=phases.filter(p=>p[0]>0&&p[0]<=s.ms).slice(-Math.max(1,Math.floor((sh-45)/22)));history.forEach((p,i)=>text(('> '+p[2]).slice(0,Math.floor((tw-24)/8.4)),tx+12,sy+52+i*22,14,'#78d9ff'));ctx.restore();}
 }
 const dy=h-bottom+2;panel(pad,dy,w-pad*2,bottom-26,'DATAFEED / LOCAL MODEL');
 const ticks=Math.floor(s.ms/(reducedMotion?2000:150));
 for(let i=0;i<(compact?1:mobile?3:4);i++){
   const hash=((ticks+i*479)*2654435761>>>0).toString(16).toUpperCase().padStart(8,'0');
   const line=`NODE ${String(i+1).padStart(2,'0')}  ${hash}  ${s.ms>=50000?'LOCKED':'ACTIVE'}  ${Math.floor(t)%100}%`;
   text(line,pad+12,dy+51+i*17,mobile?11:13,'#65ad83');
 }
 if(s.count!==null){const cw=mobile?150:220,ch=mobile?116:172,cx=w/2,cy=my+mapH/2;ctx.fillStyle='#070907ec';ctx.fillRect(cx-cw/2,cy-ch/2,cw,ch);ctx.strokeStyle=red;ctx.strokeRect(cx-cw/2,cy-ch/2,cw,ch);text(String(s.count).padStart(2,'0'),cx,cy+ch*.23,mobile?82:124,red,'center');}
 if(!reducedMotion){ctx.fillStyle='#00000019';for(let y=0;y<h;y+=4)ctx.fillRect(0,y,w,1);}
 ctx.restore();return s;
}
let active=null;
function play(event={},options={}){
 if(!scope.document)return;
 active?.close();
 const doc=scope.document,preview=!!options.preview,previousFocus=doc.activeElement;
 const dialog=doc.createElement('dialog');dialog.className='feed-reset-dialog';
 dialog.setAttribute('aria-label',preview?'Reset-Film Vorschau ohne Löschen':'Feed Reset – Live-Ereignis');
 dialog.innerHTML='<div class="reset-toolbar"><span class="reset-mode"></span><div><button type="button" data-reset="sound">Ton aus</button><button type="button" data-reset="skip">+10 Sekunden</button><button type="button" data-reset="close">Schließen ×</button></div></div><video playsinline preload="auto" aria-label="Feed Water Reset mit Originalton"></video><p class="reset-status" role="status"></p>';
 dialog.querySelector('.reset-mode').textContent=preview?'LIVE-TEST · OHNE LÖSCHEN':'LIVE · FEED RESET';
 dialog.querySelector('[data-reset="skip"]').hidden=!preview||!!options.shared;
 const video=dialog.querySelector('video'),status=dialog.querySelector('.reset-status'),sound=dialog.querySelector('[data-reset="sound"]');
 video.src='/reset-film.mp4';video.volume=.7;
 const base=scope.performance.now(),offset=preview&&!options.shared?0:Number(event.serverNow)-Number(event.startAt);
 let skipped=0,closed=false,started=false,timer=0;
 const elapsed=()=>Math.max(0,(scope.performance.now()-base+(Number.isFinite(offset)?offset:0)+skipped)/1000);
 const ready=()=>(preview&&!options.shared)||scope.performance.now()-base+offset>=0;
 function align(force=false){if(video.readyState<1||video.seeking)return;const target=Math.min(elapsed(),Math.max(0,video.duration-.05));if(force||Math.abs(video.currentTime-target)>1.5)video.currentTime=target;}
 function label(){sound.textContent=video.muted?'Ton an':'Ton aus';sound.setAttribute('aria-pressed',String(!video.muted));sound.classList.toggle('needs-tap',video.muted);}
 async function start(){
   if(closed)return;started=true;align(true);
   try{await video.play();if(closed){video.pause();return;}status.textContent=video.muted?'Für Originalmusik und Stimme auf „Ton an“ tippen.':'';}
   catch(error){if(closed)return;if(error.name==='NotAllowedError'&&!video.muted){video.muted=true;label();return start();}status.textContent='Video konnte nicht starten. Tippe oben auf „Ton an“. ';started=false;}
 }
 function close(){if(closed)return;closed=true;scope.clearInterval(timer);video.pause();video.removeAttribute('src');video.load();if(dialog.open)dialog.close();dialog.remove();if(active?.dialog===dialog)active=null;previousFocus?.focus?.();options.onEnd?.();}
 video.addEventListener('loadedmetadata',()=>align(true));
 video.addEventListener('waiting',()=>{status.textContent='Video lädt …';});
 video.addEventListener('playing',()=>{status.textContent=video.muted?'Für Originalmusik und Stimme auf „Ton an“ tippen.':'';});
 video.addEventListener('error',()=>{status.textContent='Video nicht geladen. Prüfe, ob reset-film.mp4 mit hochgeladen wurde.';});
 dialog.addEventListener('click',e=>{const b=e.target.closest('[data-reset]');if(!b)return;
   if(b.dataset.reset==='close')close();
   if(b.dataset.reset==='skip'&&preview){skipped+=10000;align(true);}
   if(b.dataset.reset==='sound'){video.muted=!video.muted;label();if(ready())start();}
 });
 dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
 doc.body.append(dialog);dialog.showModal();label();active={dialog,close,preview};
 const tick=()=>{if(closed)return;if(elapsed()>=136){close();return;}if(ready()){if(!started)start();else if(!video.paused)align();}else status.textContent='Die Sequenz startet gleich.';};
 timer=scope.setInterval(tick,500);tick();return active;
}
scope.FeedResetAnimation={DURATION,BLACKOUT,stateAt,render,play,stop(){active?.close();}};
})(globalThis);
