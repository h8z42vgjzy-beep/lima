import { randomInt } from 'node:crypto';

export const DINO_STEP = 50;
export function initialDinoState(seed = randomInt(1, 0x7fffffff)) {
  return { seed, phase: 'waiting', startAt: null, elapsed: 0, distance: 0, players: [], reason: '' };
}
export function courseFor(seed) {
  let value = seed >>> 0, x = 780;
  const random = () => { value = (Math.imul(value, 1664525) + 1013904223) >>> 0; return value / 4294967296; };
  return Array.from({ length: 90 }, (_, id) => {
    const obstacle = { id, x, width: 24 + Math.floor(random() * 14), height: 30 + Math.floor(random() * 13) };
    x += 340 + Math.floor(random() * 160); return obstacle;
  });
}
export function startRace(state, ids, startAt) {
  state.phase = 'countdown'; state.startAt = startAt;
  state.players = ids.map(id => ({ id, y: 0, vy: 0, alive: true, seq: 0, distance: 0 }));
}
export function jumpRace(state, uid, sequence) {
  const player = state.players.find(p => p.id === uid);
  if (!player || state.phase !== 'running' || !player.alive) throw [409, 'Die Runde läuft gerade nicht.'];
  if (!Number.isSafeInteger(sequence) || sequence < 1) throw [400, 'Ungültiger Sprung.'];
  if (sequence <= player.seq) return { accepted: false, repeated: true };
  player.seq = sequence;
  if (player.y > 0 || player.vy > 0) return { accepted: false };
  player.vy = 560; return { accepted: true };
}
export function stepRace(state, course) {
  if (!['countdown', 'running'].includes(state.phase)) return null;
  state.phase = 'running'; state.elapsed += DINO_STEP;
  state.distance += (260 + state.elapsed / 500) * DINO_STEP / 1000;
  const nearby = course.filter(o => o.x - state.distance < 115 && o.x + o.width - state.distance > 69);
  for (const p of state.players) {
    if (!p.alive) continue;
    p.y = Math.max(0, p.y + p.vy * .05 - 1500 * .05 ** 2 / 2);
    p.vy = p.y > 0 ? p.vy - 75 : 0; p.distance = state.distance;
    if (nearby.some(o => p.y < o.height - 3)) p.alive = false;
  }
  const survivors = state.players.filter(p => p.alive);
  if (survivors.length < 2 || state.elapsed >= 60000) {
    state.phase = 'finished'; state.reason = survivors.length < 2 ? 'collision' : 'time';
    return { winner: survivors.length === 1 ? survivors[0].id : null };
  }
  return null;
}

// One authoritative simulation per accepted 1:1 chat. Clients can only jump.
export function createDinoService({ one, run, now, chatAccess, assertAvailable }) {
  const rooms = new Map();
  // An interrupted live race cannot resume with an unfair offline head start.
  run("UPDATE chat_games SET status='cancelled',version=version+1 WHERE type='dino-run' AND status='active'");
  function gameFor(user, id) {
    const game = one("SELECT * FROM chat_games WHERE id=? AND type='dino-run'", id);
    if (!game) throw [404, 'Dino-Runde nicht gefunden.'];
    chatAccess(user, game.request_id); assertAvailable(game); return game;
  }
  function finish(room, status, winner = null, reason = '') {
    if (room.ended) return;
    room.ended = true; room.state.phase = status; if (reason) room.state.reason = reason;
    run('UPDATE chat_games SET status=?,winner=?,state=?,version=version+1,updated=? WHERE id=?', status, winner, JSON.stringify(room.state), now(), room.game.id);
    broadcast(room, winner); clearInterval(room.timer);
    for (const client of room.clients) client.res.end();
    rooms.delete(room.game.id);
  }
  function snapshot(room, winner = null) {
    const state = room.state;
    return { game: room.game.id, serverNow: now(), phase: state.phase, startAt: state.startAt,
      elapsed: state.elapsed, distance: state.distance, speed: 260 + state.elapsed / 500,
      players: state.players, connected: [...new Set([...room.clients].map(c => c.uid))],
      obstacles: room.course.filter(o => o.x - state.distance > -80 && o.x - state.distance < 820).map(o => ({ ...o, x: o.x - state.distance })),
      winner, reason: state.reason };
  }
  function broadcast(room, winner = null) {
    const chunk = 'event: snapshot\ndata: ' + JSON.stringify(snapshot(room, winner)) + '\n\n';
    for (const client of room.clients) {
      if (client.res.destroyed) { room.clients.delete(client); continue; }
      if (!client.res.write(chunk)) { client.res.destroy(); room.clients.delete(client); }
    }
  }
  function getRoom(game) {
    if (rooms.has(game.id)) return rooms.get(game.id);
    if (game.status !== 'active') throw [409, 'Nehmt zuerst die Einladung an oder startet eine neue Runde.'];
    const state = initialDinoState(JSON.parse(game.state).seed);
    const room = { game, state, course: courseFor(state.seed), clients: new Set(), created: now(), lastValid: 0, lastSent: 0, missingSince: null, ended: false };
    room.timer = setInterval(() => {
      try {
        const time = now();
        if (time - room.lastValid >= 1000) {
          const current = one('SELECT status FROM chat_games WHERE id=?', game.id);
          if (current?.status !== 'active') return finish(room, 'cancelled', null, 'beendet');
          assertAvailable(game);
          for (const client of room.clients) if (!client.valid()) { client.res.end(); room.clients.delete(client); }
          run('UPDATE chat_games SET state=?,updated=? WHERE id=?', JSON.stringify(state), time, game.id); room.lastValid = time;
        }
        const online = new Set([...room.clients].map(c => c.uid));
        if (online.has(game.creator) && online.has(game.opponent)) {
          room.missingSince = null;
          if (state.phase === 'waiting') startRace(state, [game.creator, game.opponent], time + 3500);
        } else {
          room.missingSince ??= time;
          if (time - room.missingSince > 12000) return finish(room, 'cancelled', null, 'Verbindung unterbrochen. Startet gemeinsam eine neue Runde.');
        }
        if (state.startAt !== null && time >= state.startAt) {
          const elapsed = Math.floor((time - state.startAt) / DINO_STEP) * DINO_STEP;
          if (elapsed - state.elapsed > 2000) return finish(room, 'cancelled', null, 'Server kurz unterbrochen. Bitte startet neu.');
          while (state.elapsed < elapsed) { const result = stepRace(state, room.course); if (result) return finish(room, 'finished', result.winner); }
        }
        if (time - room.lastSent >= 100) { broadcast(room); room.lastSent = time; }
      } catch { finish(room, 'cancelled', null, 'Der Chat oder eines der Konten ist nicht mehr freigegeben.'); }
    }, DINO_STEP);
    room.timer.unref(); rooms.set(game.id, room); return room;
  }
  return {
    stream(user, id, req, res, valid) {
      const game = gameFor(user, id), room = getRoom(game);
      if ([...room.clients].filter(c => c.uid === user.id).length >= 2) throw [429, 'Diese Runde ist bereits in zwei Fenstern geöffnet.'];
      res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Accel-Buffering': 'no', 'Connection': 'keep-alive' });
      res.flushHeaders();
      const client = { uid: user.id, res, valid }; room.clients.add(client);
      res.on('close', () => room.clients.delete(client)); broadcast(room);
    },
    jump(user, input) {
      const game = gameFor(user, input.game);
      if (game.status !== 'active') throw [409, 'Dieses Spiel ist beendet.'];
      const room = rooms.get(game.id);
      if (!room || ![...room.clients].some(c => c.uid === user.id && c.valid())) throw [409, 'Verbinde dich zuerst mit der Live-Runde.'];
      return { ...jumpRace(room.state, user.id, input.seq), serverNow: now() };
    },
    dispose() { for (const room of rooms.values()) finish(room, 'cancelled', null, 'Server beendet.'); },
  };
}
