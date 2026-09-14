import test from 'node:test';
import assert from 'node:assert/strict';
import './public/music-player.js';

class FakeAudio extends EventTarget {
  constructor() { super(); this.paused = true; this.ended = false; this.currentTime = 0; this.duration = 180; this.sourceWrites = 0; this.loads = 0; this.error = null; }
  set src(value) { this.source = value; this.sourceWrites++; this.currentTime = 0; }
  get src() { return this.source; }
  removeAttribute() { this.source = ''; }
  async play() { this.paused = false; this.dispatchEvent(new Event('playing')); }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
  load() { this.loads++; this.currentTime = 0; }
}
function setup() {
  const media = new FakeAudio(), pending = new Map(); let next = 0;
  const timers = { setTimeout(fn) { const id = ++next; pending.set(id, fn); return id; }, clearTimeout(id) { pending.delete(id); } };
  const states = [], player = new globalThis.FMusicController(media, s => states.push(s), timers);
  return { player, media, states, pending, tick() { const jobs = [...pending.values()]; pending.clear(); jobs.forEach(fn => fn()); } };
}

test('Music continues when the same track is selected and when feed UI is updated', async () => {
  const { player, media } = setup();
  await player.select({ id: 8, title: 'Eigener Song', artist: 'Test' });
  media.currentTime = 47; const writes = media.sourceWrites, loads = media.loads;
  for (let i = 0; i < 20; i++) player.emit();
  await player.select({ id: 8, title: 'Eigener Song', artist: 'Test' });
  assert.equal(media.currentTime, 47); assert.equal(media.sourceWrites, writes); assert.equal(media.loads, loads); assert.equal(media.paused, false);
  await player.select({ id: 9, title: 'Zweiter Song', artist: 'Test' });
  assert.equal(media.sourceWrites, writes + 1); assert.equal(media.currentTime, 0);
});

test('Network retries restore playback position; pause or logout prevent automatic restarts', async () => {
  const { player, media, pending, tick } = setup();
  await player.select({ id: 8 }); media.currentTime = 36;
  media.error = { code: 2 }; media.dispatchEvent(new Event('error')); assert.equal(pending.size, 1);
  tick(); assert.equal(player.resumeAt, 36); assert.equal(media.currentTime, 0);
  media.dispatchEvent(new Event('loadedmetadata')); assert.equal(media.currentTime, 36); assert.equal(media.paused, false);
  media.dispatchEvent(new Event('stalled')); assert.equal(pending.size, 1);
  player.pause(); assert.equal(pending.size, 0); tick(); assert.equal(media.paused, true);
  player.retry(true); player.pause(); media.dispatchEvent(new Event('loadedmetadata')); assert.equal(media.paused, true);
  await player.play(); media.dispatchEvent(new Event('error')); player.stop(); tick();
  assert.equal(player.snapshot.track, null); assert.equal(media.src, ''); assert.equal(media.paused, true);
});

test('Unsupported codecs do not create infinite retry loops; transient retries are bounded', async () => {
  const { player, media, pending, tick } = setup(); await player.select({ id: 4 });
  media.error = { code: 4 }; media.dispatchEvent(new Event('error'));
  assert.equal(pending.size, 0); assert.match(player.snapshot.notice, /MP3/);
  media.error = { code: 2 };
  for (let i = 0; i < 8; i++) { media.dispatchEvent(new Event('error')); tick(); }
  assert.equal(player.retries, 2); assert.equal(pending.size, 0);
});
