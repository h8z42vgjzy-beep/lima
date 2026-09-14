/* Canvas presentation only; collisions, time, jumps and winners come from the server. */
(() => {
  let current = null;
  class DinoView {
    constructor(stage, game, me, otherName, call) {
      this.stage = stage; this.game = game; this.me = me; this.otherName = otherName; this.call = call;
      this.canvas = stage.querySelector('canvas'); this.ctx = this.canvas.getContext('2d');
      this.status = stage.querySelector('[data-dino-status]'); this.button = stage.querySelector('[data-dino-jump]');
      this.flash = stage.querySelector('[data-dino-flash]'); this.reduced = globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
      this.particles = []; this.near = new Set(); this.combo = 0; this.lastFrame = performance.now(); this.lastCountdown = null; this.finishShown = false;
      this.sequence = 0; this.frame = null; this.snapshot = null; this.received = 0; this.prediction = null; this.reconnectTimer = null;
      this.key = e => {
        if (!['Space', 'ArrowUp'].includes(e.code) || e.repeat || e.target.closest('input,textarea,select,button')) return;
        e.preventDefault(); this.jump();
      };
      this.button.addEventListener('click', () => this.jump());
      this.canvas.addEventListener('pointerdown', () => { this.canvas.focus({ preventScroll: true }); this.jump(); });
      document.addEventListener('keydown', this.key);
      if (game.status === 'active') {
        this.source = new EventSource('/api/dino-stream?game=' + game.id);
        this.source.addEventListener('snapshot', e => {
          let data; try { data = JSON.parse(e.data); } catch { return; }
          if (data.game !== game.id) return;
          const previous = this.snapshot;
          this.snapshot = data; this.received = performance.now(); this.networkLost = false;
          data.players.forEach((player, index) => {
            const before = previous?.players?.find(p => p.id === player.id);
            if (before?.alive && !player.alive) this.crash(84, 161 + index * 162 - player.y - 25, player.id === me ? '#c3f57c' : '#cfacff', player.id === me);
          });
          if (previous?.phase !== 'finished' && data.phase === 'finished') this.finish(data.winner);
          clearTimeout(this.reconnectTimer); this.reconnectTimer = null;
          const own = data.players.find(p => p.id === me); this.sequence = Math.max(this.sequence, own?.seq || 0);
          if (this.prediction && (own?.seq || 0) >= this.prediction.seq) this.prediction = null;
          if (['finished', 'cancelled'].includes(data.phase)) this.source.close();
        });
        this.source.onerror = () => {
          this.networkLost = true; this.button.disabled = true;
          this.status.textContent = 'Verbindung wird wiederhergestellt …';
          if (!this.reconnectTimer) this.reconnectTimer = setTimeout(() => { this.source.close(); this.status.textContent = 'Verbindung beendet. Öffne die Spiele im Chat erneut.'; }, 16000);
        };
      } else {
        this.snapshot = { ...game.state, game: game.id, obstacles: [], connected: [], winner: game.winner, phase: game.status };
        this.received = performance.now();
      }
      this.draw = this.draw.bind(this); this.draw();
    }
    async jump() {
      if (this.networkLost || this.snapshot?.phase !== 'running' || this.button.disabled) return;
      const own = this.snapshot.players.find(p => p.id === this.me);
      if (!own?.alive || own.y > 0 || own.vy > 0 || this.prediction) return;
      const seq = ++this.sequence; this.prediction = { at: performance.now(), seq };
      const lane = this.snapshot.players.findIndex(p => p.id === this.me);
      this.burst(82, 150 + Math.max(0,lane) * 162, '#c3f57c', 9, 'dust'); this.stage.classList.remove('dino-jumped'); void this.stage.offsetWidth; this.stage.classList.add('dino-jumped');
      try { const result = await this.call('dino-jump', { game: this.game.id, seq }); if (!result.accepted) this.prediction = null; }
      catch (error) { this.prediction = null; this.status.textContent = error.message; }
    }
    say(text, tone = '') {
      if (!this.flash) return; this.flash.textContent = text; this.flash.className = 'dino-flash show ' + tone;
      clearTimeout(this.flashTimer); this.flashTimer = setTimeout(() => { this.flash.className = 'dino-flash'; }, 850);
    }
    burst(x, y, color, count = 12, kind = 'spark') {
      if (this.reduced) return;
      for (let i = 0; i < count; i++) this.particles.push({ x, y, color, kind, life: .55 + Math.random() * .55,
        vx: (Math.random() - .5) * (kind === 'confetti' ? 310 : 190), vy: -45 - Math.random() * (kind === 'confetti' ? 260 : 155), size: 2 + Math.random() * 5, spin: Math.random() * 6 });
    }
    crash(x, y, color, mine) {
      this.burst(x, y, color, 30, 'spark');
      if (mine) { this.combo = 0; this.say('KAKTUS!', 'danger'); this.stage.classList.remove('dino-crash'); void this.stage.offsetWidth; this.stage.classList.add('dino-crash'); }
    }
    finish(winner) {
      if (this.finishShown) return; this.finishShown = true;
      if (winner === this.me) { this.say('DU GEWINNST!', 'win'); for (let x = 70; x < 700; x += 70) this.burst(x, 260 - Math.random() * 170, x % 140 ? '#cfacff' : '#c3f57c', 10, 'confetti'); }
      else if (!winner) { this.say('GLEICHSTAND!', 'win'); this.burst(360, 175, '#e9dcff', 35, 'confetti'); }
    }
    drawParticles(seconds) {
      const c = this.ctx;
      this.particles = this.particles.filter(p => {
        p.life -= seconds; if (p.life <= 0) return false; p.x += p.vx * seconds; p.y += p.vy * seconds; p.vy += 390 * seconds; p.spin += seconds * 8;
        c.save(); c.translate(p.x, p.y); c.rotate(p.spin); c.globalAlpha = Math.min(1, p.life * 2); c.fillStyle = p.color;
        if (p.kind === 'confetti') c.fillRect(-p.size, -p.size / 2, p.size * 2.6, p.size); else c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
        c.restore(); return true;
      }); c.globalAlpha = 1;
    }
    dinosaur(x, floor, y, color, moving, phase) {
      const c = this.ctx, top = floor - y - 38;
      c.fillStyle = color;
      c.fillRect(x - 13, top + 14, 25, 17); c.fillRect(x + 1, top, 27, 19);
      c.fillRect(x - 21, top + 11, 9, 10); c.fillRect(x - 26, top + 5, 6, 10);
      c.fillRect(x + 9, top + 22, 10, 4);
      const step = moving && y < 1 ? Math.floor(phase / 100) % 2 * 5 : 0;
      c.fillRect(x - 10, top + 30, 6, 8 - step); c.fillRect(x + 3, top + 30, 6, 3 + step);
      c.fillStyle = '#151522'; c.fillRect(x + 17, top + 4, 4, 4); c.fillRect(x + 16, top + 14, 13, 3);
    }
    draw() {
      if (!this.stage.isConnected) return this.stop();
      const c = this.ctx, now = performance.now(), frameSeconds = Math.min(.05, (now - this.lastFrame) / 1000), s = this.snapshot, age = s ? (now - this.received) / 1000 : 0; this.lastFrame = now;
      const dt = s?.phase === 'running' && !this.networkLost ? Math.min(.1, age) : 0;
      c.clearRect(0, 0, 720, 348); c.fillStyle = '#11121e'; c.fillRect(0, 0, 720, 348);
      c.fillStyle = '#65617f'; for (let i = 0; i < 30; i++) c.fillRect((i * 157) % 720, 18 + (i * 53) % 135, 2, 2);
      if (s?.phase === 'running') { c.strokeStyle = '#bda1dc25'; c.lineWidth = 2; for (let i = 0; i < 8; i++) { const x = (i * 117 - s.distance * (1.2 + i % 3 * .2)) % 820; c.beginPath(); c.moveTo((x + 820) % 820, 48 + i * 35); c.lineTo((x + 870) % 870, 48 + i * 35); c.stroke(); } }
      c.fillStyle = '#c3b4e5'; c.beginPath(); c.arc(651, 44, 17, 0, Math.PI * 2); c.fill();
      c.fillStyle = '#11121e'; c.beginPath(); c.arc(659, 38, 16, 0, Math.PI * 2); c.fill();
      const players = s?.players?.length ? s.players : [{ id: this.game.creator, y: 0, vy: 0, alive: true }, { id: this.game.opponent, y: 0, vy: 0, alive: true }];
      players.forEach((p, i) => {
        const floor = 161 + i * 162, mine = p.id === this.me, color = mine ? '#c3f57c' : '#cfacff';
        c.fillStyle = '#212335'; c.fillRect(0, floor + 1, 720, 2);
        c.fillStyle = '#464357';
        for (let n = 0; n < 13; n++) c.fillRect(((n * 71 - (s?.distance || 0) * .35) % 750 + 750) % 750, floor + 14, 13, 2);
        c.font = '600 14px system-ui'; c.fillStyle = color;
        c.fillText(mine ? 'DU' : this.otherName.slice(0, 24).toUpperCase(), 18, floor - 124);
        c.fillStyle = '#b6adcb'; c.font = '12px system-ui'; c.fillText(p.alive ? 'IM RENNEN' : 'KAKTUS ERWISCHT', 565, floor - 124);
        for (const obstacle of s?.obstacles || []) {
          const x = obstacle.x - dt * s.speed; c.fillStyle = '#839385';
          c.fillRect(x + 8, floor - obstacle.height, obstacle.width - 16, obstacle.height);
          c.fillRect(x, floor - obstacle.height + 10, 8, 12); c.fillRect(x + 4, floor - obstacle.height + 18, obstacle.width - 4, 5);
          c.fillRect(x + obstacle.width - 7, floor - obstacle.height + 5, 7, 17);
          if (mine && p.alive && x < 67 && x > 35 && p.y > obstacle.height - 4 && !this.near.has(obstacle.id)) {
            this.near.add(obstacle.id); this.combo++; this.burst(91, floor - p.y, '#f3d37a', 14, 'spark');
            this.say(this.combo > 1 ? `KNAPP! ×${this.combo}` : 'KNAPP!', 'near'); this.stage.classList.add('dino-near'); setTimeout(() => this.stage.classList.remove('dino-near'), 500);
          }
        }
        let y = Math.max(0, p.y + p.vy * dt - 750 * dt ** 2);
        if (mine && this.prediction) { const t = Math.min(.15, (now - this.prediction.at) / 1000); y = Math.max(y, 560 * t - 750 * t * t); }
        this.dinosaur(84, floor, y, p.alive ? color : '#686374', p.alive && s?.phase === 'running', s?.elapsed || 0);
      });
      if (s) {
        const own = s.players.find(p => p.id === this.me);
        this.button.disabled = this.networkLost || age > 2 || s.phase !== 'running' || !own?.alive;
        if (!this.networkLost) {
          const countdown = Math.max(0, Math.ceil((s.startAt - s.serverNow - (now - this.received)) / 1000));
          if (s.phase === 'countdown' && countdown !== this.lastCountdown) { this.lastCountdown = countdown; this.say(String(countdown || 1), 'countdown'); this.burst(360, 174, countdown % 2 ? '#cfacff' : '#c3f57c', 18); }
          const label = s.phase === 'waiting' ? 'Warte auf die zweite Person. Beide müssen den Chat geöffnet haben.'
            : s.phase === 'countdown' ? `Start in ${countdown || 1} …`
            : s.phase === 'finished' ? s.winner ? (s.winner === this.me ? 'Du gewinnst diese Runde!' : `${this.otherName} gewinnt diese Runde!`) : 'Unentschieden. Noch eine Runde?'
            : s.phase === 'cancelled' ? s.reason || 'Runde beendet.'
            : age > 2 ? 'Verbindung stockt …' : `${Math.floor(s.distance / 10)} m · ${Math.max(0, 60 - Math.floor(s.elapsed / 1000))} Sekunden übrig`;
          if (this.status.textContent !== label) this.status.textContent = label;
          if (s.phase === 'countdown') { c.fillStyle = '#e8deff'; c.font = '800 56px system-ui'; c.textAlign = 'center'; c.fillText(String(countdown || 1), 360, 180); c.textAlign = 'left'; }
        }
      } else { this.button.disabled = true; if (!this.networkLost) this.status.textContent = 'Live-Verbindung wird aufgebaut …'; }
      this.drawParticles(frameSeconds);
      if (!s || !['finished','cancelled'].includes(s.phase) || this.particles.length) this.frame = requestAnimationFrame(this.draw);
    }
    stop() { cancelAnimationFrame(this.frame); clearTimeout(this.reconnectTimer); clearTimeout(this.flashTimer); this.source?.close(); document.removeEventListener('keydown', this.key); }
  }
  globalThis.dinoLive = {
    mount(stage, game, me, name, api) { this.stop(); if (stage) current = new DinoView(stage, game, me, name, api); },
    stop() { current?.stop(); current = null; },
  };
})();
