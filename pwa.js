(function(){
'use strict';
let installPrompt=null;
const installed=()=>window.matchMedia('(display-mode: standalone)').matches||navigator.standalone===true;
const button=document.getElementById('install-app');
function update(){if(button)button.textContent=installed()?'App ist installiert ✓':'Als App installieren ↗';}
window.addEventListener('beforeinstallprompt',event=>{event.preventDefault();installPrompt=event;update();});
window.addEventListener('appinstalled',()=>{installPrompt=null;update();});
const banner=document.createElement('div');banner.className='pwa-banner';banner.setAttribute('role','status');banner.hidden=navigator.onLine;banner.textContent='Keine Internetverbindung. Feed, Chats und Spiele sind gerade nicht verfügbar.';document.body.append(banner);
window.addEventListener('offline',()=>{banner.hidden=false;});window.addEventListener('online',()=>{banner.hidden=true;});
button?.addEventListener('click',async()=>{
 if(installed()){if(typeof toast==='function')toast('Du nutzt bereits die installierte App.');return;}
 if(installPrompt){const prompt=installPrompt;installPrompt=null;await prompt.prompt();await prompt.userChoice;update();return;}
 const dialog=document.createElement('dialog');dialog.className='pwa-install';dialog.setAttribute('aria-labelledby','pwa-title');
 const ios=/iPhone|iPad|iPod/.test(navigator.userAgent)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1);
 dialog.innerHTML='<button type="button" class="pwa-close" aria-label="Schließen">×</button><img src="/app-icon-192.png" width="72" height="72" alt=""><h2 id="pwa-title">Feindschaft als App</h2><p>Ein eigenes Symbol auf deinem Gerät. Deine bestehenden Konten, Chats und Spiele bleiben dieselben.</p><ol></ol><p>Für gemeinsame Inhalte brauchst du weiterhin Internet.</p>';
 const steps=ios?['Diese Website in Safari öffnen.','Teilen antippen und „Zum Home-Bildschirm“ auswählen.','Falls angeboten: „Als Web-App öffnen“ einschalten. Dann „Hinzufügen“ antippen.']:['Diese Website in Chrome oder Edge öffnen.','Im Browsermenü „App installieren“ oder „Diese Seite als App installieren“ auswählen.','Falls keine Installation angeboten wird: Auf dem Handy „Zum Startbildschirm hinzufügen“ prüfen.'];
 for(const text of steps){const li=document.createElement('li');li.textContent=text;dialog.querySelector('ol').append(li);}
 const close=()=>{dialog.close();dialog.remove();button?.focus();};dialog.querySelector('button').addEventListener('click',close);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});document.body.append(dialog);dialog.showModal();
});
if('serviceWorker' in navigator&&window.isSecureContext){navigator.serviceWorker.register('/sw.js',{scope:'/',updateViaCache:'none'}).then(registration=>registration.update()).catch(()=>{/* Website remains usable if registration is unsupported. */});}
update();
})();
