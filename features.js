// Media, free chat games and the community archive. Uses the existing session/API.
let postUploadToken = null;
let photoTimer = null;
let photoGeneration = 0;
let currentPhotoURL = null;
let gamesVisible = false;

function reactionBurst(rect, symbol = '✳') {
  if (globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
  for (let i = 0; i < 4; i++) {
    const particle = document.createElement('span'); particle.className = 'effect-particle';
    particle.textContent = symbol; particle.setAttribute('aria-hidden', 'true');
    particle.style.left = (rect.left + rect.width / 2 + (i - 1.5) * 15) + 'px';
    particle.style.top = (rect.top - i % 2 * 9) + 'px';
    document.body.append(particle); setTimeout(() => particle.remove(), 850);
  }
}

function points(value) { return Number(value || 0).toLocaleString('de-DE', { maximumFractionDigits: 1 }); }
function renderPostMedia(p) {
  const m = p.media;
  if (!m) return '';
  if (m.kind === 'image') {
    return `<div class="post-media photo-card">${m.unlocked
      ? `<button class="photo-preview" data-action="view-photo" data-id="${m.id}" aria-label="Foto vergrößern"><img src="/media/${m.id}" alt="Foto von ${esc(p.name)}" loading="lazy" data-photo="${m.id}"></button><small>${m.owned ? `Dein Foto · andere öffnen für ${points(m.open_price)} ✳ · dein Anteil ${points(m.open_price / 2)} ✳` : 'Freigeschaltet · ohne erneute Kosten'}</small>`
      : `<div class="photo-locked"><span aria-hidden="true">▧</span><strong>Ein Foto. Dein nächster Einblick.</strong><button class="button dark small" data-action="unlock" data-id="${m.id}">${m.open_price ? `Foto öffnen · ${points(m.open_price)} ✳` : 'Foto öffnen · kostenlos'}</button><small>${points(m.open_price / 2)} ✳ gehen an ${esc(p.name)} · einmalig pro Person</small><small>Bis zum Ablauf erneut ansehen</small></div>`}</div>`;
  }
  return m.kind === 'video'
    ? `<video class="post-media feed-video" controls playsinline preload="metadata" src="/media/${m.id}" aria-label="Video von ${esc(p.name)}"></video>`
    : `<div class="audio-card" data-audio-card="${m.id}"><div class="record-art" aria-hidden="true"><span>f✳</span></div><div class="audio-info"><small>SOUNDTRACK ZUM WELTSCHMERZ</small><strong>${esc(p.body.slice(0,80))}</strong><span>Von ${esc(p.name)} · kostenlos anhören</span></div><button class="audio-play" data-action="play-music" data-id="${m.id}" aria-label="Musik von ${esc(p.name)} abspielen">▶</button><div class="audio-bars" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>`;
}

function updateUploadPrice() {
  const hint = $('#upload-price'), file = $('#post-file')?.files[0];
  if (!hint) return;
  const category = categories.find(c => String(c.id) === $('#post-category').value);
  hint.hidden = !file;
  if (!file) { const button=$('#post-form button[type="submit"]');if(button)button.textContent='Beitrag posten ↗'; return; }
  if (!category) { hint.textContent = 'Wähle eine Kategorie, um den Preis vor dem Upload zu sehen.'; return; }
  const isImage = /\.(jpe?g|png|webp)$/i.test(file.name);
  hint.textContent = isImage
    ? `Foto hochladen: ${points(category.photo_price)} Beleidigungen. Andere zahlen einmalig ${points(category.photo_price)} zum Öffnen; du erhältst davon ${points(category.photo_price / 2)}. Dein Guthaben: ${points(user?.balance)}.`
    : 'Musik- und Video-Uploads sind kostenlos. Kategorie und Dateirechte müssen bestätigt sein.';
  const button = $('#post-form button[type="submit"]');
  if (button) button.textContent = isImage ? `Foto posten · ${points(category.photo_price)} ✳` : 'Beitrag posten ↗';
}

async function validateLocalFile(file) {
  const image = /\.(jpe?g|png|webp)$/i.test(file.name), video = /\.(mp4|webm)$/i.test(file.name);
  const limit = image ? 10 : video ? 100 : 25;
  if (!file.size || file.size > limit * 1024 ** 2) throw Error(`Diese Datei darf höchstens ${limit} MB groß sein.`);
  const audio = /\.(mp3|m4a|ogg|wav)$/i.test(file.name);
  if (!image && !video && !audio) throw Error('Bitte wähle JPG, PNG, WebP, MP3, M4A, OGG, WAV, MP4 oder WebM.');
  const url = URL.createObjectURL(file);
  try {
    await new Promise((resolve, reject) => {
      const element = image ? new Image() : document.createElement(audio ? 'audio' : 'video');
      const timer = setTimeout(() => finish(Error('Die Datei konnte nicht geprüft werden. Bitte exportiere sie erneut.')), 15000);
      function finish(error) { clearTimeout(timer); element.onload = element.onerror = element.onloadedmetadata = null; element.removeAttribute('src'); if (!image) element.load(); error ? reject(error) : resolve(); }
      element.onerror = () => finish(Error('Dein Browser kann diese Datei nicht öffnen. Bitte nutze ein unterstütztes Format.'));
      if (image) element.onload = () => finish();
      else { element.preload = 'metadata'; element.onloadedmetadata = () => finish(!Number.isFinite(element.duration) || element.duration <= 0 ? Error('Dateidauer unlesbar. Bitte exportiere die Datei erneut.') : video && element.duration > 180 ? Error('Videos dürfen höchstens 3 Minuten lang sein.') : null); }
      element.src = url;
    });
  } finally { URL.revokeObjectURL(url); }
}

async function submitFeedPost(e) {
  e.preventDefault();
  if (!requireUser('compose')) return;
  const form = e.target, button = e.submitter;
  const body = $('#post-body').value.trim(), category = categories.find(c => String(c.id) === $('#post-category').value);
  if (!category) { toast('Bitte wähle selbst eine Kategorie aus.'); $('#post-category').focus(); return; }
  if (body.length < 3) { toast('Bitte schreibe mindestens drei Zeichen dazu.'); $('#post-body').focus(); return; }
  const file = $('#post-file').files[0];
  button.disabled = true;
  try {
    let charged = 0;
    if (file) {
      if (!form.querySelector('[name="rights"]').checked) throw Error('Bitte bestätige die Rechte an dieser Datei.');
      await validateLocalFile(file);
      const price = /\.(jpe?g|png|webp)$/i.test(file.name) ? category.photo_price : 0;
      if (price && user.balance < price) throw Error('Für dieses Foto fehlen Beleidigungen. Hole zuerst deine Tagespunkte ab.');
      if (!postUploadToken) postUploadToken = crypto.randomUUID();
      const fd = new FormData();
      fd.set('body', body); fd.set('category', category.id); fd.set('rights', 'true'); fd.set('file', file);
      fd.set('expectedPrice', price); fd.set('uploadToken', postUploadToken);
      const result = await api('upload-post', fd); charged = result.charged || 0;
    } else await api('post', { body, category: category.id });
    form.reset(); postUploadToken = null; $('#upload-rights').hidden = true; $('#upload-price').hidden = true;
    $('#char-count').textContent = '0 / 280'; button.textContent = 'Beitrag posten ↗';
    filter = 'Alle'; sort = 'new'; $('#sort').value = 'new'; await refresh();
    toast(charged ? `Foto veröffentlicht. ${points(charged)} Beleidigungen abgezogen.` : 'Dein Beitrag ist veröffentlicht.');
  } catch (error) { toast(error.message); } finally { button.disabled = false; }
}

function photoDialog() {
  let dialog = $('#photo-viewer');
  if (!dialog) {
    dialog = document.createElement('dialog'); dialog.id = 'photo-viewer'; dialog.setAttribute('aria-labelledby', 'photo-title');
    document.body.append(dialog);
    dialog.addEventListener('close', () => { clearInterval(photoTimer); photoGeneration++; if (currentPhotoURL) URL.revokeObjectURL(currentPhotoURL); currentPhotoURL = null; dialog.replaceChildren(); });
    document.addEventListener('visibilitychange', () => { if (document.hidden && dialog.dataset.once === 'true' && dialog.open) closePhotoViewer(); });
  }
  return dialog;
}
function closePhotoViewer() { const dialog = $('#photo-viewer'); if (dialog?.open) dialog.close(); }

async function displayPhoto(url, expiresIn = null) {
  const dialog = photoDialog(), generation = ++photoGeneration;
  const deadline = expiresIn === null ? null : Date.now() + expiresIn;
  dialog.dataset.once = String(deadline !== null);
  dialog.innerHTML = `<button class="modal-close" data-action="close-photo" aria-label="Foto schließen">×</button><h2 id="photo-title">${deadline ? 'Einmal-Foto' : 'Foto ansehen'}</h2><p id="photo-time" role="status">Foto wird geladen …</p><div id="photo-content"></div><p class="form-hint">${deadline ? 'Nach dem Schließen oder Ablauf nicht erneut zu öffnen. Screenshots und externe Kopien können technisch nicht verhindert werden.' : 'Bereits freigeschaltet. Erneutes Ansehen ist kostenlos.'}</p>`;
  if (!dialog.open) dialog.showModal();
  clearInterval(photoTimer);
  if (deadline) photoTimer = setInterval(() => {
    const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
    const status = $('#photo-time'); if (status) status.textContent = `${remaining} Sekunden verbleiben`;
    if (!remaining) { closePhotoViewer(); if (modalView === 'chat') loadMessages().catch(() => {}); }
  }, 200);
  try {
    const response = await fetch(url, { credentials: 'same-origin', cache: 'no-store' });
    if (!response.ok) { const data = await response.json().catch(() => ({})); throw Error(data.error || 'Foto konnte nicht geladen werden.'); }
    const blob = await response.blob();
    if (generation !== photoGeneration || !dialog.open) return;
    const objectURL = URL.createObjectURL(blob), image = new Image(); currentPhotoURL = objectURL;
    image.alt = 'Geöffnetes Foto'; image.className = 'full-photo'; image.src = objectURL;
    await image.decode();
    if (generation !== photoGeneration || !dialog.open) return;
    $('#photo-content').replaceChildren(image);
    if (!deadline) $('#photo-time').textContent = 'Ohne erneute Kosten geöffnet.';
  } catch (error) { if (generation === photoGeneration && dialog.open) $('#photo-content').textContent = error.message + (deadline ? '' : ' Deine Freischaltung bleibt erhalten; du kannst es erneut versuchen.'); }
}

async function confirmPhotoUnlock(id) {
  const m = posts.find(p => p.media?.id === id)?.media;
  if (!m) { await refresh(); throw Error('Bitte öffne den aktuellen Foto-Beitrag erneut.'); }
  if (m.unlocked) return displayPhoto('/media/' + id);
  showModal(`<div class="modal-eyebrow">FOTO FREISCHALTEN</div><h2 id="modal-title">Einmal zahlen. Wieder ansehen.</h2><p>Dieses Foto kostet <strong>${points(m.open_price)} Beleidigungen</strong>. Davon erhält die hochladende Person ${points(m.open_price / 2)}.</p><p>Dein Guthaben: ${points(user.balance)}. Die Freischaltung gilt bis zur Löschung des Beitrags – regulär sieben Tage nach Veröffentlichung.</p><button class="button dark full" data-action="confirm-unlock" data-id="${id}" data-price="${m.open_price}">${points(m.open_price)} ✳ bezahlen &amp; öffnen</button><button class="text-link" data-action="close">Abbrechen</button>`, 'photo-confirm');
}
async function purchasePhoto(id, price) {
  const result = await api('unlock', { media: id, expectedPrice: price });
  user = result.user; updateUser(); closeModal();
  // Show the actual file immediately, not another purchase button.
  await displayPhoto(result.url); await refresh();
}
async function openChatPhoto(id) {
  const result = await api('chat-photo-open', { media: id });
  await displayPhoto(result.url, result.expires ? Math.max(0, result.expires - result.serverNow) : null);
  await loadMessages();
}
async function showWalletHistory() {
  if (!requireUser()) return;
  const data = await api('wallet');
  showModal(`<div class="modal-eyebrow">DEINE BUCHUNGEN</div><h2 id="modal-title">${points(data.balance)} Beleidigungen</h2><p>Foto-Kosten und Einnahmen. Kategorien und Chatspiele sind kostenlos.</p>${data.entries.length ? data.entries.map(e => `<div class="person-row"><div class="person-info"><strong>${esc(e.description)}</strong><small>${time(e.created)}</small></div><strong>${e.amount > 0 ? '+' : ''}${points(e.amount)} ✳</strong></div>`).join('') : '<p>Noch keine Foto-Buchungen.</p>'}`, 'wallet-history');
}

async function renderChatScreen(id, person) {
  gamesVisible = false; chatId = id; chatPerson = person;
  showModal(`<div class="chat-heading"><button class="chat-back" data-action="chats" aria-label="Zurück zu Chats">←</button>${avatar(person)}<div><h2 id="modal-title">${esc(person.name)}</h2><div class="form-hint">Einzelchat freigegeben</div></div></div><div class="chat-tools"><button class="mini-button" id="games-toggle" data-action="chat-games" aria-expanded="false" aria-controls="chat-games">Spiele · kostenlos</button><button class="mini-button" data-action="report" data-type="user" data-id="${person.id}">Melden</button><button class="block-chat" data-action="block" data-id="${person.id}">Blockieren</button></div><section id="chat-games" class="chat-games" hidden aria-label="Spiele für diesen Einzelchat"></section><div class="messages" id="messages" aria-live="polite"></div><form id="message-form" class="chat-form"><label class="sr-only" for="message-input">Deine Nachricht</label><input id="message-input" name="body" maxlength="1000" autocomplete="off" placeholder="Dein nächster Konter …"><label class="upload-label">Foto<input id="chat-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Kostenloses Chat-Foto auswählen"></label><button class="button dark" type="submit" aria-label="Nachricht senden">↗</button></form><p class="form-hint">Chat-Fotos: kostenlos, einmal für die andere Person 20 Sekunden sichtbar. Nach 7 Tagen nicht mehr erreichbar, nach 28 Tagen aus dem aktiven System gelöscht. Textnachrichten bleiben erhalten.</p>`, 'chat');
  chatId = id;
  const load = () => Promise.all([loadMessages(), loadChatGames()]);
  await load(); chatTimer = setInterval(() => load().catch(() => {}), 2500);
}
async function loadChatMessages() {
  if (!chatId || modalView !== 'chat') return;
  const id = chatId, data = await api('messages?request=' + id);
  if (id !== chatId || modalView !== 'chat') return;
  const box = $('#messages'), old = box.dataset.signature, signature = JSON.stringify(data.messages);
  if (old === signature) return;
  const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 60;
  box.dataset.signature = signature;
  box.innerHTML = data.messages.length ? data.messages.map(m => `<div class="message ${m.sender === user.id ? 'mine' : ''}">${m.mediaId ? ['ready', 'own'].includes(m.photoState) ? `<button class="chat-photo-button" data-action="view-chat-photo" data-id="${m.mediaId}">${m.photoState === 'own' ? 'Dein Foto ansehen · kostenlos' : 'Foto öffnen · einmal 20 Sek. · kostenlos'}</button>` : `<span class="expired-photo">${m.photoState === 'opened' ? 'Foto bereits geöffnet · nicht erneut verfügbar' : 'Foto abgelaufen'}</span>` : esc(m.body)}<div class="message-meta"><time>${new Date(m.created).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}</time><button data-action="report" data-type="message" data-id="${m.id}" aria-label="Diese Nachricht melden">Melden</button></div></div>`).join('') : '<div class="empty">Euer Chat ist freigegeben.<br>Schreib etwas oder lade zu einem Spiel ein.</div>';
  if (atBottom) box.scrollTop = box.scrollHeight;
}

const chessPieces = {K:'♔',Q:'♕',R:'♖',B:'♗',N:'♘',P:'♙',k:'♚',q:'♛',r:'♜',b:'♝',n:'♞',p:'♟'};
// Original vector silhouettes: fixed fills, independent of installed chess fonts.
function chessPieceSVG(piece) {
  const shapes = {
    p:'<circle cx="32" cy="19" r="8"/><path d="M26 28h12l-2 12 8 10H20l8-10z"/>',
    r:'<path d="M18 12h7v7h5v-7h5v7h5v-7h7v16l-6 5 2 17H21l2-17-5-5z"/><path d="M23 29h18" fill="none"/>',
    n:'<path d="M20 50l3-11 14-12-11 3-10-5 13-14 2-6 8 6c13 6 13 23 9 39z"/><circle cx="34" cy="18" r="2" fill="currentColor" stroke="none"/><path d="M29 11l-2 8" fill="none"/>',
    b:'<path d="M32 8c-18 15-16 23-5 28l-7 14h24l-7-14c11-5 13-13-5-28z"/><path d="M35 17l-8 10M25 37h14" fill="none"/>',
    q:'<path d="M17 18l9 9 6-15 6 15 9-9-6 25H23z"/><circle cx="16" cy="15" r="3"/><circle cx="32" cy="9" r="3"/><circle cx="48" cy="15" r="3"/><path d="M23 43h18l4 7H19z"/>',
    k:'<path d="M29 6h6v6h6v6h-6v7h-6v-7h-6v-6h6z"/><path d="M22 25h20l-5 17 7 8H20l7-8z"/><path d="M25 41h14" fill="none"/>'
  };
  const white=piece===piece.toUpperCase();
  return `<svg class="chess-piece" viewBox="0 0 64 64" aria-hidden="true" focusable="false"><g fill="${white?'#fffaf0':'#18202d'}" stroke="${white?'#18202d':'#fffaf0'}" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round">${shapes[piece.toLowerCase()]}<path d="M19 51h26l3 7H16z"/></g></svg>`;
}
const chessNames={k:'König',q:'Dame',r:'Turm',b:'Läufer',n:'Springer',p:'Bauer'};
function gamesForDisplay(games) {
  const active=games.filter(g=>['active','invited'].includes(g.status));
  const latest=games.find(g=>g.type==='chess');
  if(latest && !active.some(g=>g.id===latest.id)) active.push(latest);
  if(!active.length && games.length) active.push(games[0]);
  return active;
}
function chessBoard(g, ownTurn) {
  const white = g.creator === user.id;
  const order = Array.from({length:64},(_,i)=>white?i:63-i);
  const ownSide = white ? piece => piece && piece === piece.toUpperCase() : piece => piece && piece === piece.toLowerCase();
  const file = square => 'abcdefgh'[square%8], rank = square => 8-Math.floor(square/8);
  const legal = new Map((g.legalMoves||[]).map(move=>[move.from,move.targets]));
  return `<div class="chess-wrap"><div class="chess-board" data-chess-board="${g.id}" role="grid" aria-label="Schachbrett, ${white?'Weiß':'Schwarz'} unten">${order.map(square=>{
    const piece=g.state.board[square],x=square%8,y=Math.floor(square/8),last=g.state.lastMove&&(g.state.lastMove.from===square||g.state.lastMove.to===square),targets=legal.get(square)||[];
    const pieceClass=piece?(piece===piece.toUpperCase()?' piece-white':' piece-black'):'';
    return `<button type="button" class="chess-square ${(x+y)%2?'dark':'light'}${last?' last-move':''}${pieceClass}" data-action="chess-square" data-id="${g.id}" data-version="${g.version}" data-square="${square}" data-own="${ownSide(piece)?'1':'0'}" data-targets="${targets.join(',')}" role="gridcell" aria-label="${file(square)}${rank(square)}${piece?' '+(piece===piece.toUpperCase()?'Weiß: ':'Schwarz: ')+chessNames[piece.toLowerCase()]:' frei'}" ${!ownTurn?'disabled':''}><span aria-hidden="true">${piece?chessPieceSVG(piece):''}</span>${((white&&x===0)||(!white&&x===7))?`<small>${rank(square)}</small>`:''}${((white&&y===7)||(!white&&y===0))?`<i>${file(square)}</i>`:''}</button>`;
  }).join('')}</div><p class="chess-help">${g.status==='finished'?'Partie beendet. Das Endbrett bleibt hier sichtbar.':ownTurn?'Tippe zuerst deine Figur und danach das Zielfeld.':'Die Stellung bleibt gespeichert. Du kannst später zurückkommen.'}${g.state.check?' · SCHACH!':''}</p></div>`;
}

function renderGameCard(g, catalog, nameOf) {
  const ownTurn = g.status === 'active' && g.turn === user.id;
  const name = catalog.find(c => c.type === g.type)?.name || g.type;
  const status = g.status === 'invited' ? `${nameOf(g.creator)} lädt zum Spielen ein.` : g.status === 'active' ? g.type === 'dino-run' ? 'Euer Live-Duell. Beide spielen gleichzeitig.' : `${nameOf(g.turn)} ${ownTurn ? 'bist' : 'ist'} am Zug${g.type==='chess'?' · ohne Zeitlimit':''}.` : g.status === 'finished' ? g.winner ? `${nameOf(g.winner)} ${g.winner === user.id ? 'hast' : 'hat'} gewonnen.` : 'Unentschieden.' : g.status === 'declined' ? 'Einladung abgelehnt.' : 'Spiel beendet.';
  const button = (action,label) => `<button class="mini-button" data-action="game-action" data-id="${g.id}" data-version="${g.version}" data-game-action="${action}">${label}</button>`;
  let board='';
  if(g.status!=='invited'){
    if(g.type==='dino-run')board=`<div id="dino-stage" class="dino-stage"><div class="dino-live-badge"><i></i> LIVE</div><div class="dino-flash" data-dino-flash aria-hidden="true"></div><canvas width="720" height="348" tabindex="0" role="img" aria-label="Dino-Duell mit zwei Spuren. Leertaste oder Pfeil hoch zum Springen."></canvas><p data-dino-status role="status">Runde wird geladen …</p><button type="button" class="button dark full dino-jump" data-dino-jump disabled>↑ SPRINGEN</button><small>Tippen · Leertaste · Pfeil hoch. Knapp über Kakteen springen baut eine Effektserie auf. Wer länger durchhält, gewinnt.</small></div>`;
    else if(g.type==='chess')board=chessBoard(g,ownTurn);
    else if(g.type==='tic-tac-toe')board=`<div class="game-board ttt-board">${g.state.board.map((mark,cell)=>`<button class="game-cell mark-${mark}" data-action="game-action" data-game-action="move" data-id="${g.id}" data-version="${g.version}" data-cell="${cell}" aria-label="Feld ${cell+1}${mark?': '+(mark===1?'X':'O'):', frei'}" ${!ownTurn||mark?'disabled':''}>${mark===1?'X':mark===2?'O':'·'}</button>`).join('')}</div>`;
    else if(g.type==='connect-four')board=`<div class="connect-controls">${Array.from({length:7},(_,column)=>`<button class="mini-button" data-action="game-action" data-game-action="move" data-id="${g.id}" data-version="${g.version}" data-column="${column}" aria-label="Stein in Spalte ${column+1}" ${!ownTurn||g.state.board[column]?'disabled':''}>${column+1} ↓</button>`).join('')}</div><div class="game-board connect-board" role="img" aria-label="Vier-gewinnt-Spielstand">${g.state.board.map((mark,i)=>`<span class="game-dot mark-${mark}" title="Zeile ${Math.floor(i/7)+1}, Spalte ${i%7+1}: ${mark||'frei'}">${mark===1?'●':mark===2?'○':'·'}</span>`).join('')}</div>`;
    else board=`<p>Bereich: <strong>${g.state.low}–${g.state.high}</strong>${g.state.answer?` · Gesuchte Zahl: ${g.state.answer}`:''}</p><ol class="guess-history">${g.state.guesses.map(x=>`<li>${esc(nameOf(x.mark===1?g.creator:g.opponent))}: ${x.guess} → ${esc(x.hint)}</li>`).join('')}</ol>${ownTurn?`<form id="guess-form" data-id="${g.id}" data-version="${g.version}"><label class="field" for="game-guess">Deine Zahl</label><input id="game-guess" name="guess" type="number" min="${g.state.low}" max="${g.state.high}" step="1" required><button class="button dark small">Raten</button></form>`:''}`;
  }
  const controls=g.status==='invited'&&g.opponent===user.id?button('accept','Annehmen')+button('decline','Ablehnen'):g.status==='active'?g.type==='chess'?button('resign','Aufgeben'):button('cancel','Spiel beenden'):g.status==='invited'?button('cancel','Einladung zurückziehen'):'';
  const roles=g.type==='chess'?`${esc(nameOf(g.creator))}: Weiß · ${esc(nameOf(g.opponent))}: Schwarz · dauerhaft gespeichert`:g.type==='dino-run'?'Dein Dino ist grün. Der andere ist lila.':`${esc(nameOf(g.creator))}: X / ● · ${esc(nameOf(g.opponent))}: O / ○`;
  return `<div class="game-card ${g.type==='chess'?'chess-card':''}"><h3>${esc(name)}</h3><p class="${g.status==='finished'?'game-result':''}" role="status">${esc(status)}</p>${controls}${board}<p class="form-hint">${roles} · kostenlos</p></div>`;
}

async function loadChatGames(expand = false) {
  if (!chatId || modalView !== 'chat') return;
  const request = chatId, data = await api('games?request=' + request);
  if (request !== chatId || modalView !== 'chat') return;
  const container = $('#chat-games'); if (!container) return;
  if (expand) gamesVisible = !gamesVisible;
  const active = data.games.filter(g => ['invited', 'active'].includes(g.status));
  const button = $('#games-toggle'); if (button) { button.textContent = active.length ? `Spiele · ${active.length} offen` : 'Spiele · kostenlos'; button.setAttribute('aria-expanded', String(gamesVisible || !!active.length)); }
  container.hidden = !gamesVisible && !active.length;
  const shown = gamesForDisplay(data.games);
  if(shown.some(g=>g.status==='finished')) { container.hidden=false; button?.setAttribute('aria-expanded','true'); }
  const signature = JSON.stringify([data.games.map(g => g.type === 'dino-run' && g.status === 'active' ? {id:g.id,version:g.version,status:g.status} : g), gamesVisible]);
  if (container.dataset.version === signature) return; container.dataset.version = signature;
  const nameOf = id => id === user.id ? 'Du' : chatPerson.name;
  const gameHTML = shown.map(g=>renderGameCard(g,data.catalog,nameOf)).join('');
  const hasChess=active.some(g=>g.type==='chess'),hasQuick=active.some(g=>g.type!=='chess');
  const available=data.catalog.filter(g=>g.type==='chess'?!hasChess:!hasQuick);
  globalThis.dinoLive?.stop();
  container.innerHTML = `<p class="form-hint">Nur für euch beide. Kostenlos, ohne Einsätze und ohne Einfluss auf das Guthaben.</p>${gameHTML}${available.length?`<div class="game-picker">${available.map(g=>`<button class="game-choice" data-action="game-create" data-type="${g.type}"><strong>${esc(g.name)}</strong><span>${esc(g.description)}</span><small>Einladen ↗</small></button>`).join('')}</div>`:''}`;
  const dino=shown.find(g=>g.type==='dino-run'&&g.status!=='invited');if(dino)globalThis.dinoLive?.mount($('#dino-stage'),dino,user.id,chatPerson.name,api);
}
async function createChatGame(type) { await api('game-create', { request: chatId, type }); gamesVisible = true; await loadChatGames(); }
async function sendGameAction(dataset) {
  const input = { game: Number(dataset.id), version: Number(dataset.version), action: dataset.gameAction };
  if (dataset.cell !== undefined) input.cell = Number(dataset.cell);
  if (dataset.column !== undefined) input.column = Number(dataset.column);
  try { await api('game-action', input); } finally { await loadChatGames(); }
}
async function chooseChessSquare(dataset) {
  const board=document.querySelector(`[data-chess-board="${Number(dataset.id)}"]`);if(!board)return;
  const current=board.dataset.from;
  const clear=()=>{delete board.dataset.from;delete board.dataset.targets;board.querySelectorAll('.chess-square').forEach(x=>x.classList.remove('selected','legal-target'));};
  const select=()=>{const targets=(dataset.targets||'').split(',').filter(Boolean);if(dataset.own!=='1'||!targets.length){toast('Diese Figur kann gerade nicht ziehen.');return;}clear();board.dataset.from=dataset.square;board.dataset.targets=targets.join(',');board.querySelectorAll('.chess-square').forEach(x=>{x.classList.toggle('selected',x.dataset.square===dataset.square);x.classList.toggle('legal-target',targets.includes(x.dataset.square));});};
  if(current===undefined){
    if(dataset.own!=='1'){toast('Wähle zuerst eine deiner eigenen Figuren.');return;}select();return;
  }
  if(current===dataset.square){clear();return;}
  const targets=(board.dataset.targets||'').split(',').filter(Boolean);
  if(!targets.includes(dataset.square)){if(dataset.own==='1')select();else toast('Dieses Feld ist für die ausgewählte Figur nicht erreichbar.');return;}
  try{await api('game-action',{game:Number(dataset.id),version:Number(dataset.version),action:'move',from:Number(current),to:Number(dataset.square)});}finally{await loadChatGames();}
}

async function showExtras(space = '') {
  if (!requireUser()) return;
  const data = await api('extras' + (space ? '?space=' + encodeURIComponent(space) : ''));
  showModal(`<div class="modal-eyebrow">MEHR ALS EIN KONTER</div><h2 id="modal-title">Wissen teilen.</h2><p>Ein kostenloser Platz für Lernmaterialien, Erklärungen und Projekte. Texte und Dokumente bleiben, bis sie gelöscht werden.</p><div class="extras-tabs"><button class="mini-button" data-action="extras-tab" data-space="">Alle</button>${data.spaces.map(s => `<button class="mini-button ${space === s.id ? 'selected' : ''}" data-action="extras-tab" data-space="${s.id}">${esc(s.name)}</button>`).join('')}</div><details class="extra-composer"><summary>＋ Eigenen Beitrag hinzufügen · kostenlos</summary><form id="extra-form"><label class="field" for="extra-space">Bereich</label><select id="extra-space" name="space" required><option value="">Bereich auswählen …</option>${data.spaces.map(s => `<option value="${s.id}" ${space === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select><label class="field" for="extra-category">Kategorie</label><select id="extra-category" name="category" required><option value="">Kategorie auswählen …</option>${categories.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select><label class="field" for="extra-title">Titel</label><input id="extra-title" name="title" minlength="3" maxlength="100" required><label class="field" for="extra-body">Beschreibung, Erklärung oder Quellcode</label><textarea id="extra-body" name="body" minlength="3" maxlength="8000" rows="5" required></textarea><label class="field" for="extra-file">Dokument oder Code-Datei · freiwillig · maximal 10 MB</label><input id="extra-file" name="file" type="file" accept=".pdf,.txt,.md,.java,.js,.css,.html,.json"><label class="consent"><input name="rights" type="checkbox"><span>Bei einer Datei: Ich habe die Rechte, sie hier zu teilen.</span></label><p class="form-hint">Quellcode wird nur als Text bereitgestellt, nicht ausgeführt. Musik und Videos findest du im Feed unter den entsprechenden Filtern.</p><button class="button dark full">Kostenlos veröffentlichen ↗</button></form></details><div class="extra-entries">${data.entries.map(p => `<article class="extra-entry"><span class="post-category">${esc(data.spaces.find(s => s.id === p.space)?.name || p.space)} · ${esc(p.category)}</span><h3>${esc(p.title)}</h3><small>Von ${esc(p.name)} · ${time(p.created)}</small><p class="extra-text">${esc(p.body)}</p>${p.document ? `<a class="button outline small" href="/api/document?id=${p.document.id}" download>${esc(p.document.original_name)} herunterladen ↗</a>` : ''}<div class="extra-actions"><button class="text-link" data-action="report" data-type="post" data-id="${p.id}">Melden</button>${p.user_id === user.id ? `<button class="text-link" data-action="delete-extra" data-id="${p.id}">Eigenen Beitrag löschen</button>` : ''}</div></article>`).join('') || '<div class="empty"><strong>Noch ganz unbeschrieben.</strong>Teile den ersten Lernzettel oder ein eigenes Projekt.</div>'}</div>`, 'extras');
}

async function showAdminReport(id) {
  const data=await api('admin/report?id='+id);
  showModal(`<div class="modal-eyebrow">GEMELDETER INHALT</div><h2 id="modal-title">Meldung #${id}</h2><p>${esc(data.report.reason||'Ohne zusätzliche Begründung.')}</p>${data.content?`<h3>${esc(data.content.title||data.content.category||'Beitrag')}</h3><p class="extra-text">${esc(data.content.body)}</p>`:''}${data.conversation.map(m=>`<div class="comment-card"><strong>${esc(m.name)}</strong><p>${esc(m.body)}</p><small>${time(m.created)}</small></div>`).join('')}${data.media.map(m=>m.kind==='image'?`<img class="post-media" src="${esc(m.url)}" alt="Gemeldetes Foto">`:m.kind==='video'?`<video class="post-media" controls src="${esc(m.url)}"></video>`:`<audio class="post-media" controls src="${esc(m.url)}"></audio>`).join('')}<p class="form-hint">Bei einer Nutzermeldung ist nur der Chat mit der meldenden Person sichtbar, nicht andere private Gespräche. Medien bleiben höchstens 28 Tage ab Upload verfügbar.</p><button class="button dark full" data-action="admin">Zurück zu den Entscheidungen</button>`,'admin-report');
}

function showPrivacyDetails() {
  showModal(`<div class="modal-eyebrow">TRANSPARENT IM TESTBETRIEB</div><h2 id="modal-title">Deine Daten und Inhalte.</h2><ul class="rule-list"><li><strong>Was gespeichert wird</strong>Spitzname, gesalzener Passwort-Hash, freiwillige Profilangaben, Beiträge, Fotos, Nachrichten, Bewertungen, virtuelle Buchungen, Spielstände, Meldungen und Blockierungen.</li><li><strong>Profil und Feed</strong>Identitätsangaben sind nur bei deiner aktiven Freigabe für andere angemeldete Personen sichtbar. Feed-Texte können auch ohne Anmeldung sichtbar sein. Private Nachrichten und Chatspiele sind in der App auf die beiden Chatpersonen begrenzt.</li><li><strong>Fotos und Fristen</strong>Feed-Beiträge und Chat-Fotos sind regulär nach sieben Tagen nicht mehr erreichbar. Chat-Fotos kann die empfangende Person einmal für höchstens 20 Sekunden öffnen. Bilddateien bleiben bis zu 28 Tage für die Moderation im aktiven System und werden anschließend im Wartungslauf entfernt. Hosting-Sicherungen können länger bestehen; ihre vollständige Löschung ist hier nicht garantiert.</li><li><strong>Meldungen</strong>Die Moderation kann gemeldete Inhalte prüfen. Bei einer Nutzermeldung ist nur der Chat zwischen meldender und gemeldeter Person freigegeben, nicht andere private Chats. Nachrichten sind nicht Ende-zu-Ende-verschlüsselt; Personen mit direktem Serverzugriff könnten sie technisch lesen.</li><li><strong>Extras und Kontrolle</strong>Texte, Chat-Textnachrichten und Extras-Dokumente haben keine automatische Sieben-Tage-Frist. Eigene Beiträge lassen sich ausblenden/löschen, andere Personen blockieren und Inhalte melden. Eine vollständige Kontolöschung und Passwortwiederherstellung sind noch nicht eingebaut.</li><li><strong>Virtuelle Punkte</strong>Neue öffentliche Fotos kosten beim Hochladen den Kategorienpreis und beim Freischalten einmalig denselben Preis. Die Hälfte jeder Freischaltung erhält die hochladende Person. Chat-Fotos, Kategorien und Chatspiele kosten nichts. Es gibt keine Echtgeldzahlung.</li></ul><p>Verschwindende Fotos verhindern keine Screenshots oder externen Kopien. Verwende im Test keine vertraulichen Inhalte. Betreiberinformationen und das vollständige Sicherungs-/Löschkonzept müssen vor einem breiten öffentlichen Einsatz noch vervollständigt werden.</p>`, 'privacy');
}

document.addEventListener('submit', async e => {
  if (e.target.id !== 'extra-form' && e.target.id !== 'guess-form') return;
  e.preventDefault(); const button = e.submitter; button.disabled = true;
  try {
    const fd = new FormData(e.target);
    if (e.target.id === 'guess-form') {
      await api('game-action', { game: Number(e.target.dataset.id), version: Number(e.target.dataset.version), action: 'move', guess: Number(fd.get('guess')) });
      await loadChatGames(); return;
    }
    const file = fd.get('file');
    if (file?.size) { fd.set('rights', fd.get('rights') === 'on' ? 'true' : 'false'); await api('upload-extra', fd); }
    else await api('extra', Object.fromEntries(['space', 'category', 'title', 'body'].map(k => [k, fd.get(k)])));
    await showExtras(fd.get('space')); toast('Dein Extra ist veröffentlicht. Keine Beleidigungen abgezogen.');
  } catch (error) { toast(error.message); } finally { button.disabled = false; }
});

document.addEventListener('error', e => {
  const image = e.target;
  if (!(image instanceof HTMLImageElement) || !image.dataset.photo) return;
  const wrapper = image.closest('.photo-preview');
  if (wrapper) wrapper.textContent = 'Foto gerade nicht geladen. Erneut öffnen – ohne weitere Zahlung.';
}, true);
