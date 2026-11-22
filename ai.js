// The computer player. It looks a few moves ahead (more on harder levels) and picks the best move it finds.
(function (root) {
  'use strict';
  const KE = root.KE || (typeof require !== 'undefined' ? require('./rules.js') : null);
  const { W, H, N, col, row } = KE;

  // How much each piece is worth (a pawn = 100)
  const VALUE = { P: 100, N: 300, B: 320, R: 500, Q: 900, K: 0, O: 380, A: 450, C: 330, V: 500, T: 360 };
  const LEVELS = {
    veryeasy: { depth: 0, noise: 0, random: 0.6 },
    easy:     { depth: 1, noise: 120, random: 0.15 },
    medium:   { depth: 2, noise: 30, random: 0, time: 2000 },
    hard:     { depth: 3, noise: 0, random: 0, time: 2500 },
    insane:   { depth: 5, noise: 0, random: 0, time: 5000 },
  };

  // Score the board for `me`: more is better.
  function evaluate(s, me) {
    let score = 0;
    const b = s.b;
    for (let i = 0; i < N; i++) {
      const p = b[i];
      if (!p) continue;
      let v = VALUE[p.t];
      const c = col(i), r = row(i), fwd = p.c === 'w' ? r : H - 1 - r;
      const center = 3.5 - Math.abs(c - 3.5);
      if (p.t === 'P') v += fwd * fwd * 2 + center * 2;
      else if (p.t === 'N' || p.t === 'T' || p.t === 'A') v += center * 6 + Math.min(fwd, 5) * 4;
      else if (p.t === 'K') v += KE.POPE_COLS.includes(c) ? -10 : 0;
      else if (p.t !== 'O') v += center * 2;
      score += p.c === me ? v : -v;
    }
    // way ahead? Hunt the king: push it to the edge and bring your king closer
    if (Math.abs(score) > 700) {
      const winner = score > 0 ? me : KE.other(me);
      const wk = KE.findKing(s, winner), lk = KE.findKing(s, KE.other(winner));
      if (wk >= 0 && lk >= 0) {
        const edge = Math.abs(col(lk) - 3.5) + Math.abs(row(lk) - 4.5);
        const near = Math.abs(col(wk) - col(lk)) + Math.abs(row(wk) - row(lk));
        const hunt = edge * 12 - near * 6;
        score += winner === me ? hunt : -hunt;
      }
    }
    return score;
  }

  // Try the most promising moves first (big captures with small pieces), so the search can skip more.
  function order(s, moves) {
    const b = s.b;
    for (const m of moves) {
      let k = 0;
      if (m.k !== 'm' && m.k !== 'w' && m.k !== 'c') {
        const victim = m.k === 'e' ? 100 : VALUE[b[m.to].t];
        k = victim * (m.k === 't' ? 20 : 10) - VALUE[b[m.from].t] / 10;
      }
      if (m.promo) k += VALUE[m.promo] * 10;
      if (b[m.from].t === 'O') k -= 50; // pope moves rarely matter
      m.ord = k;
    }
    return moves.sort((a, c) => c.ord - a.ord);
  }

  const MATE = 1e6;
  let deadline = Infinity, nodes = 0, stopped = false;

  // Only captures, to stop the search from ending in the middle of a trade.
  function quiet(s, alpha, beta, me, depth) {
    const stand = evaluate(s, s.turn);
    if (stand >= beta) return stand;
    if (stand > alpha) alpha = stand;
    if (depth <= 0) return alpha;
    const moves = order(s, KE.legalMoves(s).filter((m) => m.k === 'x' || m.k === 's' || m.k === 't' || m.promo));
    for (const m of moves) {
      const v = -quiet(KE.play(s, Object.assign({}, m)), -beta, -alpha, me, depth - 1);
      if (v >= beta) return v;
      if (v > alpha) alpha = v;
    }
    return alpha;
  }

  function search(s, depth, alpha, beta, ply) {
    if ((++nodes & 1023) === 0 && Date.now() > deadline) stopped = true;
    if (stopped) return 0;
    const moves = KE.legalMoves(s);
    if (!moves.length) return KE.inCheck(s, s.turn) ? -MATE + ply : 0;
    if (s.half >= 100) return 0;
    if (depth <= 0) return quiet(s, alpha, beta, s.turn, 4);
    order(s, moves);
    let best = -Infinity;
    for (const m of moves) {
      const v = -search(KE.play(s, Object.assign({}, m)), depth - 1, -beta, -alpha, ply + 1);
      if (stopped) return 0;
      if (v > best) best = v;
      if (v > alpha) alpha = v;
      if (alpha >= beta) break;
    }
    return best;
  }

  // Pick a move for whoever's turn it is. level: veryeasy, easy, medium, hard, insane
  function choose(s, level) {
    const L = LEVELS[level] || LEVELS.medium;
    const moves = KE.legalMoves(s);
    if (!moves.length) return null;
    if (Math.random() < L.random) return Object.assign({}, moves[Math.floor(Math.random() * moves.length)]);
    nodes = 0; stopped = false;
    deadline = L.time ? Date.now() + L.time : Infinity;
    let scored = moves.map((m) => ({ m, v: 0 }));
    // look 1 move ahead, then 2, then 3... (keeping the last full answer if time runs out)
    for (let d = 0; d <= L.depth; d++) {
      const list = order(s, scored.map((x) => x.m));
      const next = [];
      let alpha = -Infinity;
      for (const m of list) {
        const after = KE.play(s, Object.assign({}, m));
        // levels with randomness need a real score for every move; the others only need to know the best one
        const v = d === 0 ? -quiet(after, -Infinity, Infinity, after.turn, 2) : -search(after, d - 1, -Infinity, L.noise ? Infinity : -alpha + 1, 1);
        if (stopped) break;
        next.push({ m, v });
        if (v > alpha) alpha = v;
      }
      if (stopped) break;
      scored = next.sort((a, b) => b.v - a.v);
      // keep the order for the next, deeper look
      scored.forEach((x) => { x.m.ord = 0; });
      if (scored[0].v > MATE / 2) break; // found a checkmate
    }
    // a bit of randomness on the easier levels
    let best = null, bv = -Infinity;
    for (const x of scored) {
      const v = x.v + (L.noise ? (Math.random() - 0.5) * 2 * L.noise : 0);
      if (v > bv) { bv = v; best = x.m; }
    }
    return Object.assign({}, best);
  }

  const api = { choose, evaluate, LEVELS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.KEAI = api;
})(this);
