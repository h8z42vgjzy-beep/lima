/* Canvas presentation only; collisions, time, jumps and winners come from the server. */
(() => {
  let current = null;
  class DinoView {
    constructor(stage, game, me, otherName, call) {
      this.stage = stage; this.game = game; this.me = me; this.otherName = otherName; this.call = call;
      this.canvas = stage.querySelector('canvas'); this.ctx = this.canvas.getContext('2d');
      this.status = stage.querySelector('[data-dino-status]'); this.button = stage.querySelector('[data-dino-jump]');
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
          this.snapshot = data; this.received = performance.now(); this.networkLost = false;
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
      try { const result = await this.call('dino-jump', { game: this.game.id, seq }); if (!result.accepted) this.prediction = null; }
      catch (error) { this.prediction = null; this.status.textContent = error.message; }
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
      const c = this.ctx, now = performance.now(), s = this.snapshot, age = s ? (now - this.received) / 1000 : 0;
      const dt = s?.phase === 'running' && !this.networkLost ? Math.min(.1, age) : 0;
      c.clearRect(0, 0, 720, 348); c.fillStyle = '#11121e'; c.fillRect(0, 0, 720, 348);
      c.fillStyle = '#65617f'; for (let i = 0; i < 30; i++) c.fillRect((i * 157) % 720, 18 + (i * 53) % 135, 2, 2);
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
          const label = s.phase === 'waiting' ? 'Warte auf die zweite Person. Beide müssen den Chat geöffnet haben.'
            : s.phase === 'countdown' ? `Start in ${countdown || 1} …`
            : s.phase === 'finished' ? s.winner ? (s.winner === this.me ? 'Du gewinnst diese Runde!' : `${this.otherName} gewinnt diese Runde!`) : 'Unentschieden. Noch eine Runde?'
            : s.phase === 'cancelled' ? s.reason || 'Runde beendet.'
            : age > 2 ? 'Verbindung stockt …' : `${Math.floor(s.distance / 10)} m · ${Math.max(0, 60 - Math.floor(s.elapsed / 1000))} Sekunden übrig`;
          if (this.status.textContent !== label) this.status.textContent = label;
          if (s.phase === 'countdown') { c.fillStyle = '#e8deff'; c.font = '800 56px system-ui'; c.textAlign = 'center'; c.fillText(String(countdown || 1), 360, 180); c.textAlign = 'left'; }
        }
      } else { this.button.disabled = true; if (!this.networkLost) this.status.textContent = 'Live-Verbindung wird aufgebaut …'; }
      if (!s || !['finished','cancelled'].includes(s.phase)) this.frame = requestAnimationFrame(this.draw);
    }
    stop() { cancelAnimationFrame(this.frame); clearTimeout(this.reconnectTimer); this.source?.close(); document.removeEventListener('keydown', this.key); }
  }
  globalThis.dinoLive = {
    mount(stage, game, me, name, api) { this.stop(); if (stage) current = new DinoView(stage, game, me, name, api); },
    stop() { current?.stop(); current = null; },
  };
})();
