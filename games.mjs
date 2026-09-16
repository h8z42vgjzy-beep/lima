import { randomInt } from 'node:crypto';
import { initialDinoState } from './dino.mjs';
import { initialChessState, applyChessMove, legalChessMoves } from './chess.mjs';

export const gameCatalog = [
  { type: 'dino-run', name: 'Dino-Duell · live', description: 'Zwei Spuren, eine Strecke. Gemeinsam starten und über Kakteen springen.' },
  { type: 'chess', name: 'Schach · Langzeitpartie', description: 'Spielt Zug für Zug über mehrere Tage. Die Stellung bleibt ohne Zeitlimit gespeichert.' },
  { type: 'tic-tac-toe', name: 'Tic-Tac-Toe', description: 'Drei in einer Reihe. Abwechselnd X und O setzen.' },
  { type: 'connect-four', name: 'Vier gewinnt', description: 'Vier Steine waagerecht, senkrecht oder diagonal verbinden.' },
  { type: 'number-duel', name: 'Zahlenduell', description: 'Findet abwechselnd eine geheime Zahl von 1 bis 100. Hinweise sind kostenlos.' },
];

// Rules live on the server: clients send moves, never boards, turns or winners.
export function initialState(type) {
  if (type === 'dino-run') return initialDinoState();
  if (type === 'chess') return initialChessState();
  if (type === 'tic-tac-toe') return { board: Array(9).fill(0) };
  if (type === 'connect-four') return { board: Array(42).fill(0) };
  if (type === 'number-duel') return { secret: randomInt(1, 101), low: 1, high: 100, guesses: [] };
  throw [400, 'Dieses Spiel gibt es nicht.'];
}

export function visibleState(type, state, finished = false) {
  if (type !== 'number-duel') return state;
  const { secret, ...visible } = state;
  return finished ? { ...visible, answer: secret } : visible;
}

function lineWinner(board, width, height, length, mark) {
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    for (const [dx, dy] of [[1, 0], [0, 1], [1, 1], [1, -1]]) {
      if (Array.from({ length }, (_, i) => [x + i * dx, y + i * dy]).every(([a, b]) =>
        a >= 0 && a < width && b >= 0 && b < height && board[b * width + a] === mark)) return true;
    }
  }
  return false;
}

export function applyMove(type, original, mark, input) {
  if (type === 'chess') return applyChessMove(original, mark, input);
  const state = structuredClone(original);
  if (type === 'number-duel') {
    const guess = input.guess;
    if (!Number.isInteger(guess) || guess < state.low || guess > state.high) throw [400, `Wähle eine ganze Zahl zwischen ${state.low} und ${state.high}.`];
    const hint = guess === state.secret ? 'richtig' : guess < state.secret ? 'größer' : 'kleiner';
    state.guesses.push({ mark, guess, hint });
    if (hint === 'größer') state.low = guess + 1;
    if (hint === 'kleiner') state.high = guess - 1;
    return { state, won: hint === 'richtig', draw: false };
  }
  let cell;
  if (type === 'tic-tac-toe') {
    cell = input.cell;
    if (!Number.isInteger(cell) || cell < 0 || cell > 8 || state.board[cell]) throw [400, 'Wähle ein freies Feld.'];
  } else if (type === 'connect-four') {
    const column = input.column;
    if (!Number.isInteger(column) || column < 0 || column > 6) throw [400, 'Wähle eine Spalte von 1 bis 7.'];
    for (let row = 5; row >= 0; row--) if (!state.board[row * 7 + column]) { cell = row * 7 + column; break; }
    if (cell === undefined) throw [400, 'Diese Spalte ist voll.'];
  } else throw [400, 'Unbekanntes Spiel.'];
  state.board[cell] = mark;
  const won = lineWinner(state.board, type === 'tic-tac-toe' ? 3 : 7, type === 'tic-tac-toe' ? 3 : 6, type === 'tic-tac-toe' ? 3 : 4, mark);
  return { state, won, draw: !won && state.board.every(Boolean) };
}

export function createGameService({ db, one, all, run, now, chatAccess }) {
  db.exec(`CREATE TABLE IF NOT EXISTS chat_games(
    id INTEGER PRIMARY KEY, request_id INTEGER NOT NULL REFERENCES requests(id) ON DELETE CASCADE,
    type TEXT NOT NULL, creator INTEGER NOT NULL REFERENCES users(id), opponent INTEGER NOT NULL REFERENCES users(id),
    status TEXT NOT NULL DEFAULT 'invited', turn INTEGER, winner INTEGER, state TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 0, created INTEGER NOT NULL, updated INTEGER NOT NULL
  );
  DROP INDEX IF EXISTS one_live_game;
  CREATE UNIQUE INDEX IF NOT EXISTS one_live_chess ON chat_games(request_id) WHERE type='chess' AND status IN('invited','active');
  CREATE UNIQUE INDEX IF NOT EXISTS one_live_quick_game ON chat_games(request_id) WHERE type<>'chess' AND status IN('invited','active');`);
  const expose = (g, viewer) => {
    const state=visibleState(g.type,JSON.parse(g.state),g.status==='finished'),result={...g,state};
    if(g.type==='chess'&&g.status==='active'&&g.turn===viewer){
      const side=g.creator===viewer?1:2,grouped=new Map();
      for(const move of legalChessMoves(state,side)){if(!grouped.has(move.from))grouped.set(move.from,[]);grouped.get(move.from).push(move.to);}
      result.legalMoves=[...grouped].map(([from,targets])=>({from,targets}));
    }
    return result;
  };
  return {
    list(user, request) {
      chatAccess(user, request);
      const rows=all('SELECT * FROM chat_games WHERE request_id=? ORDER BY id DESC LIMIT 12',request);
      const chess=one("SELECT * FROM chat_games WHERE request_id=? AND type='chess' ORDER BY id DESC LIMIT 1",request);
      if(chess&&!rows.some(g=>g.id===chess.id))rows.push(chess);
      return {catalog:gameCatalog,games:rows.map(g=>expose(g,user.id))};
    },
    create(user, request, type) {
      const chat = chatAccess(user, request);
      initialState(type); // Validate before querying or writing.
      const existing = type === 'chess'
        ? one("SELECT id FROM chat_games WHERE request_id=? AND type='chess' AND status IN('invited','active')", request)
        : one("SELECT id FROM chat_games WHERE request_id=? AND type<>'chess' AND status IN('invited','active')", request);
      if (existing) throw [409, type === 'chess' ? 'In diesem Chat läuft bereits eine Schachpartie.' : 'In diesem Chat läuft bereits ein kurzes Spiel oder eine Einladung.'];
      const opponent = chat.sender === user.id ? chat.receiver : chat.sender;
      if (type === 'dino-run' && one("SELECT id FROM chat_games WHERE type='dino-run' AND status IN('invited','active') AND (creator IN(?,?) OR opponent IN(?,?))", user.id, opponent, user.id, opponent)) throw [409, 'Eine Person hat bereits eine offene Dino-Runde. Beendet sie zuerst.'];
      const state = initialState(type);
      const id = Number(run('INSERT INTO chat_games(request_id,type,creator,opponent,state,created,updated) VALUES(?,?,?,?,?,?,?)', request, type, user.id, opponent, JSON.stringify(state), now(), now()).lastInsertRowid);
      return { game: expose(one('SELECT * FROM chat_games WHERE id=?', id),user.id) };
    },
    action(user, input) {
      const g = one('SELECT * FROM chat_games WHERE id=?', input.game);
      if (!g) throw [404, 'Spiel nicht gefunden.'];
      chatAccess(user, g.request_id);
      if (input.version !== g.version) throw [409, 'Das Spiel wurde inzwischen aktualisiert. Lade es neu.'];
      if (input.action === 'accept' || input.action === 'decline') {
        if (g.status !== 'invited' || g.opponent !== user.id) throw [403, 'Nur die eingeladene Person kann antworten.'];
        run('UPDATE chat_games SET status=?,turn=creator,version=version+1,updated=? WHERE id=?', input.action === 'accept' ? 'active' : 'declined', now(), g.id);
      } else if (input.action === 'cancel') {
        if (!['active', 'invited'].includes(g.status)) throw [409, 'Dieses Spiel ist schon beendet.'];
        run("UPDATE chat_games SET status='cancelled',version=version+1,updated=? WHERE id=?", now(), g.id);
      } else if (input.action === 'resign') {
        if (g.type !== 'chess' || g.status !== 'active') throw [409, 'Diese Schachpartie läuft nicht mehr.'];
        const winner = g.creator === user.id ? g.opponent : g.creator;
        run("UPDATE chat_games SET status='finished',winner=?,version=version+1,updated=? WHERE id=?", winner, now(), g.id);
      } else if (input.action === 'move') {
        if (g.type === 'dino-run') throw [400, 'Beim Dino-Duell wird direkt im Spielfeld gesprungen.'];
        if (g.status !== 'active' || g.turn !== user.id) throw [409, 'Du bist gerade nicht am Zug.'];
        const next = applyMove(g.type, JSON.parse(g.state), g.creator === user.id ? 1 : 2, input);
        run('UPDATE chat_games SET state=?,status=?,winner=?,turn=?,version=version+1,updated=? WHERE id=?', JSON.stringify(next.state), next.won || next.draw ? 'finished' : 'active', next.won ? user.id : null, g.turn === g.creator ? g.opponent : g.creator, now(), g.id);
      } else throw [400, 'Ungültige Spielaktion.'];
      return { game: expose(one('SELECT * FROM chat_games WHERE id=?', g.id),user.id) };
    },
  };
}
