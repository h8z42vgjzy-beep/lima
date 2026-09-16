const initial = [
  'r','n','b','q','k','b','n','r',
  'p','p','p','p','p','p','p','p',
  ...Array(32).fill(null),
  'P','P','P','P','P','P','P','P',
  'R','N','B','Q','K','B','N','R',
];

export function initialChessState() {
  return { board: [...initial], castling: 'KQkq', enPassant: null, lastMove: null, check: false, moveCount: 0 };
}

const sideOf = piece => piece ? (piece === piece.toUpperCase() ? 1 : 2) : 0;
const xy = square => [square % 8, Math.floor(square / 8)];
const at = (x, y) => y >= 0 && y < 8 && x >= 0 && x < 8 ? y * 8 + x : -1;

function attacked(board, square, by) {
  const [x, y] = xy(square), pawn = by === 1 ? 'P' : 'p';
  const pawnY = y + (by === 1 ? 1 : -1);
  for (const dx of [-1, 1]) { const s = at(x + dx, pawnY); if (s >= 0 && board[s] === pawn) return true; }
  const knight = by === 1 ? 'N' : 'n';
  for (const [dx, dy] of [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]) {
    const s = at(x + dx, y + dy); if (s >= 0 && board[s] === knight) return true;
  }
  const king = by === 1 ? 'K' : 'k';
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) {
    const s = at(x + dx, y + dy); if (s >= 0 && board[s] === king) return true;
  }
  for (const [dx, dy, kinds] of [[1,0,'RQ'],[-1,0,'RQ'],[0,1,'RQ'],[0,-1,'RQ'],[1,1,'BQ'],[-1,1,'BQ'],[1,-1,'BQ'],[-1,-1,'BQ']]) {
    for (let n = 1; n < 8; n++) {
      const s = at(x + dx * n, y + dy * n); if (s < 0) break;
      if (!board[s]) continue;
      const expected = by === 1 ? kinds : kinds.toLowerCase();
      if (expected.includes(board[s])) return true;
      break;
    }
  }
  return false;
}

function inCheck(board, side) {
  const king = board.indexOf(side === 1 ? 'K' : 'k');
  return king < 0 || attacked(board, king, side === 1 ? 2 : 1);
}

function pseudoMoves(state, from, side) {
  const board = state.board, piece = board[from];
  if (!piece || sideOf(piece) !== side) return [];
  const [x, y] = xy(from), kind = piece.toLowerCase(), result = [];
  const add = (tx, ty, special = null) => {
    const to = at(tx, ty); if (to < 0 || sideOf(board[to]) === side) return false;
    result.push({ from, to, special }); return !board[to];
  };
  if (kind === 'p') {
    const dy = side === 1 ? -1 : 1, start = side === 1 ? 6 : 1;
    const one = at(x, y + dy);
    if (one >= 0 && !board[one]) {
      result.push({ from, to: one });
      const two = at(x, y + 2 * dy); if (y === start && !board[two]) result.push({ from, to: two, special: 'double' });
    }
    for (const dx of [-1, 1]) {
      const to = at(x + dx, y + dy);
      if (to >= 0 && (sideOf(board[to]) === (side === 1 ? 2 : 1) || to === state.enPassant)) result.push({ from, to, special: to === state.enPassant ? 'en-passant' : null });
    }
  } else if (kind === 'n') {
    for (const [dx, dy] of [[1,2],[2,1],[2,-1],[1,-2],[-1,-2],[-2,-1],[-2,1],[-1,2]]) add(x + dx, y + dy);
  } else if (kind === 'k') {
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if (dx || dy) add(x + dx, y + dy);
    const enemy = side === 1 ? 2 : 1;
    if (!inCheck(board, side)) {
      if (side === 1 && from === 60 && state.castling.includes('K') && board[61] == null && board[62] == null && board[63] === 'R' && !attacked(board,61,enemy) && !attacked(board,62,enemy)) result.push({from,to:62,special:'castle-k'});
      if (side === 1 && from === 60 && state.castling.includes('Q') && board[59] == null && board[58] == null && board[57] == null && board[56] === 'R' && !attacked(board,59,enemy) && !attacked(board,58,enemy)) result.push({from,to:58,special:'castle-q'});
      if (side === 2 && from === 4 && state.castling.includes('k') && board[5] == null && board[6] == null && board[7] === 'r' && !attacked(board,5,enemy) && !attacked(board,6,enemy)) result.push({from,to:6,special:'castle-k'});
      if (side === 2 && from === 4 && state.castling.includes('q') && board[3] == null && board[2] == null && board[1] == null && board[0] === 'r' && !attacked(board,3,enemy) && !attacked(board,2,enemy)) result.push({from,to:2,special:'castle-q'});
    }
  } else {
    const directions = kind === 'b' ? [[1,1],[-1,1],[1,-1],[-1,-1]] : kind === 'r' ? [[1,0],[-1,0],[0,1],[0,-1]] : [[1,1],[-1,1],[1,-1],[-1,-1],[1,0],[-1,0],[0,1],[0,-1]];
    for (const [dx, dy] of directions) for (let n = 1; n < 8 && add(x + dx*n, y + dy*n); n++);
  }
  return result;
}

function execute(state, move, side) {
  const next = structuredClone(state), board = next.board, piece = board[move.from], captured = board[move.to];
  board[move.to] = piece; board[move.from] = null;
  if (move.special === 'en-passant') board[move.to + (side === 1 ? 8 : -8)] = null;
  if (move.special === 'castle-k') { const rookFrom = side === 1 ? 63 : 7, rookTo = side === 1 ? 61 : 5; board[rookTo] = board[rookFrom]; board[rookFrom] = null; }
  if (move.special === 'castle-q') { const rookFrom = side === 1 ? 56 : 0, rookTo = side === 1 ? 59 : 3; board[rookTo] = board[rookFrom]; board[rookFrom] = null; }
  if (piece.toLowerCase() === 'p' && (move.to < 8 || move.to >= 56)) board[move.to] = side === 1 ? 'Q' : 'q';
  let rights = next.castling;
  if (piece === 'K') rights = rights.replace(/[KQ]/g, ''); if (piece === 'k') rights = rights.replace(/[kq]/g, '');
  if (move.from === 63 || move.to === 63) rights = rights.replace('K',''); if (move.from === 56 || move.to === 56) rights = rights.replace('Q','');
  if (move.from === 7 || move.to === 7) rights = rights.replace('k',''); if (move.from === 0 || move.to === 0) rights = rights.replace('q','');
  next.castling = rights;
  next.enPassant = move.special === 'double' ? (move.from + move.to) / 2 : null;
  next.lastMove = { from: move.from, to: move.to, capture: !!captured || move.special === 'en-passant' };
  next.moveCount = Number(next.moveCount || 0) + 1;
  return next;
}

function legalMoves(state, side) {
  const moves = [];
  for (let from = 0; from < 64; from++) for (const move of pseudoMoves(state, from, side)) {
    const candidate = execute(state, move, side); if (!inCheck(candidate.board, side)) moves.push(move);
  }
  return moves;
}

export function legalChessMoves(state, side) {
  return legalMoves(state, side).map(({from,to})=>({from,to}));
}

export function applyChessMove(original, side, input) {
  const from = input.from, to = input.to;
  if (!Number.isInteger(from) || !Number.isInteger(to) || from < 0 || from > 63 || to < 0 || to > 63) throw [400, 'Wähle zuerst deine Figur und danach ihr Zielfeld.'];
  const move = legalMoves(original, side).find(candidate => candidate.from === from && candidate.to === to);
  if (!move) throw [400, 'Dieser Schachzug ist nicht erlaubt.'];
  const state = execute(original, move, side), enemy = side === 1 ? 2 : 1;
  state.check = inCheck(state.board, enemy);
  const replies = legalMoves(state, enemy);
  return { state, won: state.check && replies.length === 0, draw: !state.check && replies.length === 0 };
}

export const chessInternals = { attacked, inCheck, legalMoves };
