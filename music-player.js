/* One audio element lives outside the feed. Refreshes never replace its source. */
(() => {
  class MusicController {
    constructor(audio, onChange = () => {}, timers = globalThis) {
      this.audio = audio; this.onChange = onChange; this.timers = timers;
      this.track = null; this.wantPlay = false; this.resumeAt = null;
      this.retries = 0; this.generation = 0; this.retryTimer = null;
      this.notice = ''; this.lastProgress = 0;
      for (const event of ['play', 'pause', 'ended', 'timeupdate', 'durationchange', 'playing', 'loadedmetadata', 'error', 'waiting', 'stalled']) {
        audio.addEventListener(event, () => this.event(event));
      }
    }
    get snapshot() {
      return { track: this.track, playing: !!this.track && !this.audio.paused && !this.audio.ended,
        currentTime: Number(this.audio.currentTime) || 0, duration: Number(this.audio.duration) || 0,
        notice: this.notice, retryable: !!this.track && !!this.notice };
    }
    emit() { this.onChange(this.snapshot); }
    clearRetry() { if (this.retryTimer !== null) this.timers.clearTimeout(this.retryTimer); this.retryTimer = null; }
    async select(track) {
      if (!Number.isSafeInteger(track.id) || track.id < 1) return;
      if (this.track?.id !== track.id) {
        this.stop(); this.track = { ...track }; this.retries = 0; this.lastProgress = 0;
        this.audio.src = '/media/' + track.id;
      }
      await this.play();
    }
    async play() {
      if (!this.track) return;
      this.wantPlay = true; this.notice = '';
      const generation = this.generation;
      try { await this.audio.play(); }
      catch (error) {
        if (generation !== this.generation || !this.wantPlay) return;
        if (error.name === 'NotAllowedError') { this.wantPlay = false; this.notice = 'Tippe auf Play, um die Wiedergabe fortzusetzen.'; }
        else if (error.name !== 'AbortError') this.notice = 'Musik konnte nicht starten. Erneut laden oder eine andere Datei wählen.';
      }
      this.emit();
    }
    pause() { this.wantPlay = false; this.clearRetry(); this.audio.pause(); this.emit(); }
    toggle() { return this.audio.paused ? this.play() : this.pause(); }
    seek(seconds) {
      if (!this.track || !Number.isFinite(this.audio.duration)) return;
      this.audio.currentTime = Math.max(0, Math.min(seconds, this.audio.duration)); this.emit();
    }
    stop() {
      this.generation++; this.clearRetry(); this.wantPlay = false; this.track = null;
      this.resumeAt = null; this.notice = ''; this.audio.pause();
      this.audio.removeAttribute('src'); this.audio.load(); this.emit();
    }
    retry(manual = false) {
      if (!this.track || (!manual && !this.wantPlay)) return;
      this.clearRetry(); this.resumeAt = Number(this.audio.currentTime) || this.resumeAt || 0;
      if (manual) { this.retries = 0; this.wantPlay = true; }
      this.notice = 'Verbindung wird neu aufgebaut …';
      this.audio.load(); this.emit();
      // Playback resumes after metadata has restored the saved position.
    }
    event(type) {
      if (!this.track) return;
      if (type === 'loadedmetadata' && this.resumeAt !== null) {
        try { this.audio.currentTime = Number.isFinite(this.audio.duration) ? Math.min(this.resumeAt, Math.max(0, this.audio.duration - .05)) : this.resumeAt; } catch { /* some streams are not seekable yet */ }
        this.resumeAt = null; if (this.wantPlay) this.play();
      }
      if (type === 'playing') { this.notice = ''; this.clearRetry(); }
      if (type === 'timeupdate' && this.audio.currentTime > this.lastProgress + 5) {
        this.lastProgress = this.audio.currentTime; this.retries = 0;
      }
      if (type === 'ended') { this.wantPlay = false; this.clearRetry(); }
      if (type === 'error') {
        const code = this.audio.error?.code;
        this.notice = code === 3 || code === 4
          ? 'Datei nicht abspielbar oder nicht mehr verfügbar. Versuche MP3 oder M4A (AAC).'
          : 'Verbindung unterbrochen. Deine Abspielposition bleibt erhalten.';
        if (code !== 3 && code !== 4) this.scheduleRetry(1500);
      }
      if ((type === 'waiting' || type === 'stalled') && this.wantPlay) {
        this.notice = 'Musik lädt nach …'; this.scheduleRetry(12000);
      }
      this.emit();
    }
    scheduleRetry(delay) {
      if (!this.wantPlay || this.retries >= 2 || this.retryTimer !== null) return;
      const generation = this.generation;
      this.retryTimer = this.timers.setTimeout(() => {
        this.retryTimer = null;
        if (generation !== this.generation || !this.wantPlay) return;
        this.retries++; this.retry();
      }, delay);
    }
  }
  globalThis.FMusicController = MusicController;
  if (typeof document === 'undefined') return;
  const dock = document.getElementById('music-dock'); if (!dock) return;
  const audio = document.getElementById('persistent-audio');
  const node = name => dock.querySelector('[data-player="' + name + '"]');
  const time = s => Number.isFinite(s) ? Math.floor(s / 60) + ':' + String(Math.floor(s % 60)).padStart(2, '0') : '0:00';
  let metadataId = null;
  const player = new MusicController(audio, state => {
    dock.hidden = !state.track; document.body.classList.toggle('has-music', !!state.track);
    if (!state.track) {
      if ('mediaSession' in navigator) { navigator.mediaSession.metadata = null; navigator.mediaSession.playbackState = 'none'; }
      document.querySelectorAll('[data-audio-card]').forEach(card => {
        card.classList.remove('is-playing'); const button = card.querySelector('.audio-play');
        if (button) { button.textContent = '▶'; button.setAttribute('aria-label', 'Musik abspielen'); }
      });
      metadataId = null; return;
    }
    node('title').textContent = state.track.title; node('artist').textContent = state.track.artist;
    node('toggle').textContent = state.playing ? 'Ⅱ' : '▶';
    node('toggle').setAttribute('aria-label', state.playing ? 'Musik pausieren' : 'Musik abspielen');
    node('progress').max = Number.isFinite(state.duration) ? state.duration : 0;
    node('progress').value = state.currentTime;
    node('progress').disabled = !Number.isFinite(state.duration) || state.duration <= 0;
    node('time').textContent = time(state.currentTime) + ' / ' + time(state.duration);
    node('notice').textContent = state.notice; node('retry').hidden = !state.retryable;
    dock.classList.toggle('is-playing', state.playing);
    if ('mediaSession' in navigator && typeof MediaMetadata !== 'undefined') {
      if (metadataId !== state.track.id) { navigator.mediaSession.metadata = new MediaMetadata({ title: state.track.title, artist: state.track.artist, album: 'Feindschaft' }); metadataId = state.track.id; }
      navigator.mediaSession.playbackState = state.playing ? 'playing' : 'paused';
    }
    document.querySelectorAll('[data-audio-card]').forEach(card => {
      const playing = Number(card.dataset.audioCard) === state.track.id && state.playing;
      card.classList.toggle('is-playing', playing);
      const button = card.querySelector('.audio-play');
      if (button) { button.textContent = playing ? 'Ⅱ' : '▶'; button.setAttribute('aria-label', playing ? 'Musik pausieren' : 'Musik abspielen'); }
    });
  });
  globalThis.musicDeck = player;
  node('toggle').addEventListener('click', () => player.toggle());
  node('close').addEventListener('click', () => player.stop());
  node('retry').addEventListener('click', () => player.retry(true));
  node('progress').addEventListener('input', e => player.seek(Number(e.target.value)));
  if ('mediaSession' in navigator) {
    for (const [action, handler] of Object.entries({ play: () => player.play(), pause: () => player.pause(), stop: () => player.stop(), seekto: e => player.seek(e.seekTime), seekbackward: e => player.seek(audio.currentTime - (e.seekOffset || 10)), seekforward: e => player.seek(audio.currentTime + (e.seekOffset || 10)) })) {
      try { navigator.mediaSession.setActionHandler(action, handler); } catch { /* optional browser feature */ }
    }
  }
})();
