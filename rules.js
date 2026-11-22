// Chess: The Kingdom Expands. The rules: the board, how every piece moves, check and checkmate.
// The board is 8 columns (a-h) by 10 rows (1-10). Square number = row * 8 + column, so a1 = 0, h1 = 7, a2 = 8 ... h10 = 79.
// Pieces are { t: type, c: 'w' or 'b' }. Types:
//   K king, Q queen, R rook, B bishop, N knight, P pawn,
//   O pope (moves to any empty square in columns a, b, g or h; can't take; puts kings on a/b/g/h in check)
//   A archer (steps like a king; shoots any enemy a bishop's move away (diagonal) without moving)
//   C crow (moves like a bishop), V raven (moves like a rook); a crow and a raven can swap places (uses your turn)
//   T thief (moves like a king; whatever it takes joins your side, placed anywhere on your half of the board)
(function (root) {
  'use strict';
  const W = 8, H = 10, N = W * H;
  const col = (s) => s % W, row = (s) => (s / W) | 0;
  const sq = (c, r) => r * W + c;
  const name = (s) => 'abcdefgh'[col(s)] + (row(s) + 1);
  const other = (c) => (c === 'w' ? 'b' : 'w');
  const POPE_COLS = [0, 1, 6, 7]; // a, b, g, h
  const KING_STEPS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];
  const ROOK_DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  const BISHOP_DIRS = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
  const KNIGHT = [[1, 2], [2, 1], [-1, 2], [-2, 1], [1, -2], [2, -1], [-1, -2], [-2, -1]];
  const NAMES = { K: 'King', Q: 'Queen', R: 'Rook', B: 'Bishop', N: 'Knight', P: 'Pawn', O: 'Pope', A: 'Archer', C: 'Crow', V: 'Raven', T: 'Thief' };

  function newGame() {
    const b = new Array(N).fill(null);
    const back = 'RNBQKBNR', mid = 'TACOOVAT';
    for (let c = 0; c < W; c++) {
      b[sq(c, 0)] = { t: back[c], c: 'w' };
      b[sq(c, 1)] = { t: mid[c], c: 'w' };
      b[sq(c, 2)] = { t: 'P', c: 'w' };
      b[sq(c, 7)] = { t: 'P', c: 'b' };
      b[sq(c, 8)] = { t: mid[c], c: 'b' };
      b[sq(c, 9)] = { t: back[c], c: 'b' };
    }
    return { b, turn: 'w', castle: { wK: true, wQ: true, bK: true, bQ: true }, ep: -1, half: 0, moveNo: 1 };
  }

  function clone(s) {
    return { b: s.b.slice(), turn: s.turn, castle: Object.assign({}, s.castle), ep: s.ep, half: s.half, moveNo: s.moveNo };
  }

  const onBoard = (c, r) => c >= 0 && c < W && r >= 0 && r < H;
  function findKing(s, color) {
    for (let i = 0; i < N; i++) { const p = s.b[i]; if (p && p.t === 'K' && p.c === color) return i; }
    return -1;
  }
  function hasPope(s, color) {
    for (let i = 0; i < N; i++) { const p = s.b[i]; if (p && p.t === 'O' && p.c === color) return true; }
    return false;
  }

  // Can a piece of color `by` hit square `target`? (Used for check.)
  function attacked(s, target, by) {
    const b = s.b, tc = col(target), tr = row(target);
    // the pope: any square in columns a, b, g, h
    if (POPE_COLS.includes(tc) && hasPope(s, by)) return true;
    // pawns
    const pr = tr + (by === 'w' ? -1 : 1);
    for (const dc of [-1, 1]) {
      if (!onBoard(tc + dc, pr)) continue;
      const p = b[sq(tc + dc, pr)];
      if (p && p.c === by && p.t === 'P') return true;
    }
    // knights
    for (const [dc, dr] of KNIGHT) {
      if (!onBoard(tc + dc, tr + dr)) continue;
      const p = b[sq(tc + dc, tr + dr)];
      if (p && p.c === by && p.t === 'N') return true;
    }
    // king and thief (one step any way)
    for (const [dc, dr] of KING_STEPS) {
      if (!onBoard(tc + dc, tr + dr)) continue;
      const p = b[sq(tc + dc, tr + dr)];
      if (p && p.c === by && (p.t === 'K' || p.t === 'T')) return true;
    }
    // straight lines: rook, queen, raven
    for (const [dc, dr] of ROOK_DIRS) {
      let c = tc + dc, r = tr + dr;
      while (onBoard(c, r)) {
        const p = b[sq(c, r)];
        if (p) { if (p.c === by && 'RQV'.includes(p.t)) return true; break; }
        c += dc; r += dr;
      }
    }
    // diagonals: bishop, queen, crow, archer (shoots)
    for (const [dc, dr] of BISHOP_DIRS) {
      let c = tc + dc, r = tr + dr;
      while (onBoard(c, r)) {
        const p = b[sq(c, r)];
        if (p) { if (p.c === by && 'BQCA'.includes(p.t)) return true; break; }
        c += dc; r += dr;
      }
    }
    return false;
  }

  function inCheck(s, color) {
    const k = findKing(s, color);
    return k >= 0 && attacked(s, k, other(color));
  }

  // All moves, not yet checking whether they leave your own king in check.
  // Move: { from, to, k: kind } kind = 'm' move, 'x' capture, 's' archer shot, 'w' crow/raven swap,
  //   'c' castle, 'e' en passant, 't' thief steal. Pawns reaching the end get promo: 'Q'.
  function pseudoMoves(s) {
    const b = s.b, me = s.turn, out = [];
    const add = (from, to, k) => out.push({ from, to, k });
    const slide = (from, dirs) => {
      const c0 = col(from), r0 = row(from);
      for (const [dc, dr] of dirs) {
        let c = c0 + dc, r = r0 + dr;
        while (onBoard(c, r)) {
          const t = sq(c, r), p = b[t];
          if (!p) add(from, t, 'm');
          else { if (p.c !== me && p.t !== 'K') add(from, t, 'x'); break; }
          c += dc; r += dr;
        }
      }
    };
    const steps = (from, list, canTake, kind) => {
      const c0 = col(from), r0 = row(from);
      for (const [dc, dr] of list) {
        if (!onBoard(c0 + dc, r0 + dr)) continue;
        const t = sq(c0 + dc, r0 + dr), p = b[t];
        if (!p) add(from, t, 'm');
        else if (canTake && p.c !== me && p.t !== 'K') add(from, t, kind || 'x');
      }
    };
    const crows = [], ravens = [];
    for (let i = 0; i < N; i++) {
      const p = b[i];
      if (!p || p.c !== me) continue;
      switch (p.t) {
        case 'K': steps(i, KING_STEPS, true); castles(s, i, add); break;
        case 'Q': slide(i, ROOK_DIRS.concat(BISHOP_DIRS)); break;
        case 'R': slide(i, ROOK_DIRS); break;
        case 'B': slide(i, BISHOP_DIRS); break;
        case 'N': steps(i, KNIGHT, true); break;
        case 'C': slide(i, BISHOP_DIRS); crows.push(i); break;
        case 'V': slide(i, ROOK_DIRS); ravens.push(i); break;
        case 'T': steps(i, KING_STEPS, true, 't'); break;
        case 'O':
          for (let r = 0; r < H; r++) for (const c of POPE_COLS) { const t = sq(c, r); if (!b[t]) add(i, t, 'm'); }
          break;
        case 'A': {
          steps(i, KING_STEPS, false);
          const c0 = col(i), r0 = row(i);
          for (const [dc, dr] of BISHOP_DIRS) {
            let c = c0 + dc, r = r0 + dr;
            while (onBoard(c, r)) {
              const p2 = b[sq(c, r)];
              if (p2) { if (p2.c !== me && p2.t !== 'K') add(i, sq(c, r), 's'); break; }
              c += dc; r += dr;
            }
          }
          break;
        }
        case 'P': pawnMoves(s, i, out); break;
      }
    }
    for (const c of crows) for (const v of ravens) add(c, v, 'w');
    return out;
  }

  function pawnMoves(s, i, out) {
    const b = s.b, me = s.turn, dir = me === 'w' ? 1 : -1;
    const c0 = col(i), r0 = row(i), start = me === 'w' ? 2 : 7, last = me === 'w' ? H - 1 : 0;
    const push = (to, k) => {
      if (row(to) === last) for (const promo of ['Q', 'R', 'B', 'N']) out.push({ from: i, to, k, promo });
      else out.push({ from: i, to, k });
    };
    if (onBoard(c0, r0 + dir) && !b[sq(c0, r0 + dir)]) {
      push(sq(c0, r0 + dir), 'm');
      if (r0 === start && !b[sq(c0, r0 + 2 * dir)]) out.push({ from: i, to: sq(c0, r0 + 2 * dir), k: 'm' });
    }
    for (const dc of [-1, 1]) {
      if (!onBoard(c0 + dc, r0 + dir)) continue;
      const t = sq(c0 + dc, r0 + dir), p = b[t];
      if (p && p.c !== me && p.t !== 'K') push(t, 'x');
      else if (!p && t === s.ep) out.push({ from: i, to: t, k: 'e' });
    }
  }

  function castles(s, k, add) {
    const me = s.turn, r = me === 'w' ? 0 : H - 1, b = s.b;
    if (k !== sq(4, r) || inCheck(s, me)) return;
    const them = other(me);
    const rook = (c) => { const p = b[sq(c, r)]; return p && p.t === 'R' && p.c === me; };
    // castling right: the king only goes 1 square, to f (g would be in check from the pope), and the rook jumps to e
    if (s.castle[me + 'K'] && rook(7) && !b[sq(5, r)] && !b[sq(6, r)]) add(k, sq(5, r), 'c');
    if (s.castle[me + 'Q'] && rook(0) && !b[sq(1, r)] && !b[sq(2, r)] && !b[sq(3, r)] && !attacked(s, sq(3, r), them)) add(k, sq(2, r), 'c');
  }

  // Empty squares on your half of the board, where a stolen piece can go.
  function placeSquares(s, color) {
    const out = [];
    const r0 = color === 'w' ? 0 : H / 2, r1 = color === 'w' ? H / 2 : H;
    for (let r = r0; r < r1; r++) for (let c = 0; c < W; c++) if (!s.b[sq(c, r)]) out.push(sq(c, r));
    return out;
  }

  // Do a move and return the new position. For a thief steal, mv.place is where the stolen piece goes
  // (if it's missing or not allowed, it goes on the best free square near the middle of your half).
  // fast = skip placing the stolen piece (only used to check whether a move is allowed)
  function play(s, mv, fast) {
    const n = clone(s), b = n.b, me = s.turn;
    const p = b[mv.from];
    let reset = p.t === 'P';
    n.ep = -1;
    if (mv.k === 's') { // archer shoots: the target is gone, the archer stays
      b[mv.to] = null;
      reset = true;
    } else if (mv.k === 'w') { // crow and raven swap places
      const t = b[mv.to];
      b[mv.to] = p; b[mv.from] = t;
    } else if (mv.k === 't') { // thief steals: the piece changes sides and goes on your half
      const stolen = b[mv.to];
      b[mv.to] = p; b[mv.from] = null;
      if (!fast) {
        const spots = placeSquares(n, me);
        const place = spots.includes(mv.place) ? mv.place : autoPlace(n, me, spots);
        if (place >= 0) b[place] = { t: stolen.t, c: me };
        mv.place = place;
      }
      reset = true;
    } else {
      if (b[mv.to] || mv.k === 'e') reset = true;
      b[mv.to] = p; b[mv.from] = null;
      if (mv.k === 'e') b[sq(col(mv.to), row(mv.from))] = null;
      if (mv.k === 'c') { // move the rook too
        const r = row(mv.to);
        if (col(mv.to) === 5) { b[sq(4, r)] = b[sq(7, r)]; b[sq(7, r)] = null; }
        else { b[sq(3, r)] = b[sq(0, r)]; b[sq(0, r)] = null; }
      }
      if (p.t === 'P' && Math.abs(row(mv.to) - row(mv.from)) === 2) n.ep = sq(col(mv.from), (row(mv.from) + row(mv.to)) / 2);
      if (mv.promo) b[mv.to] = { t: mv.promo, c: me };
    }
    // castling rights go away when the king or a rook moves (or a rook gets taken)
    for (const [key, at] of [['wK', sq(7, 0)], ['wQ', sq(0, 0)], ['bK', sq(7, H - 1)], ['bQ', sq(0, H - 1)]]) {
      if (mv.from === at || mv.to === at) n.castle[key] = false;
    }
    if (p.t === 'K') { n.castle[me + 'K'] = false; n.castle[me + 'Q'] = false; }
    n.half = reset ? 0 : s.half + 1;
    if (me === 'b') n.moveNo++;
    n.turn = other(me);
    return n;
  }

  // Where to put a stolen piece if nobody picks: the middle of your half, as far forward as possible.
  function autoPlace(s, color, spots) {
    spots = spots || placeSquares(s, color);
    if (!spots.length) return -1;
    const fwd = (t) => (color === 'w' ? row(t) : H - 1 - row(t));
    let best = spots[0], bs = -Infinity;
    for (const t of spots) {
      const v = fwd(t) * 2 - Math.abs(col(t) - 3.5) - (attacked(s, t, other(color)) ? 6 : 0);
      if (v > bs) { bs = v; best = t; }
    }
    return best;
  }

  function legalMoves(s) {
    const me = s.turn;
    return pseudoMoves(s).filter((mv) => !inCheck(play(s, mv, true), me));
  }

  // 'play' (keep going), 'mate' (the player to move lost), 'stalemate', 'fifty' (50 moves with no capture or pawn move)
  function status(s) {
    if (legalMoves(s).length === 0) return inCheck(s, s.turn) ? 'mate' : 'stalemate';
    if (s.half >= 100) return 'fifty';
    return 'play';
  }

  // Moves are saved and sent online as short text: "from-to-kind[-promo][-place]"
  function encode(mv) {
    return [mv.from, mv.to, mv.k, mv.promo || '', mv.place >= 0 ? mv.place : ''].join('-');
  }
  function decode(str) {
    const [f, t, k, promo, place] = String(str).split('-');
    const mv = { from: Number(f), to: Number(t), k };
    if (promo) mv.promo = promo;
    if (place !== undefined && place !== '') mv.place = Number(place);
    return mv;
  }
  // Is this move allowed right now? Returns the real move (with place filled in) or null.
  function findLegal(s, mv) {
    const m = legalMoves(s).find((x) => x.from === mv.from && x.to === mv.to && x.k === mv.k && (x.promo || '') === (mv.promo || ''));
    if (!m) return null;
    const r = Object.assign({}, m);
    if (m.k === 't') r.place = stealSpots(s, m).includes(mv.place) ? mv.place : undefined;
    return r;
  }
  // Where the thief's stolen piece is allowed to go after this steal
  function stealSpots(s, mv) {
    return placeSquares(play(s, mv, true), s.turn);
  }

  const api = {
    W, H, N, col, row, sq, name, other, NAMES, POPE_COLS,
    newGame, clone, play, legalMoves, pseudoMoves, inCheck, attacked, status, findKing, placeSquares, autoPlace,
    encode, decode, findLegal, stealSpots,
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KE = api;
})(this);
