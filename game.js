// Chess: The Kingdom Expands. The screens, the board you click on, the computer player and online rooms.
(function () {
  'use strict';
  const { W, H, sq, col, row, name, other, NAMES } = KE;
  const $ = (id) => document.getElementById(id);
  const svg = (t, c) => KEPieces.svg(t, c);
  const COLOR = { w: 'White', b: 'Black' };
  const LEVEL_NAMES = { veryeasy: 'Very Easy', easy: 'Easy', medium: 'Medium', hard: 'Hard', insane: 'Insane' };
  const ABOUT = {
    K: 'Moves one square any way. Keep it safe! If it can\'t escape check, you lose.',
    Q: 'Moves any distance in straight lines and diagonals.',
    R: 'Moves any distance in straight lines.',
    B: 'Moves any distance diagonally.',
    N: 'Jumps in an L shape, over other pieces.',
    P: 'Moves forward one (two from its starting row). Takes diagonally. Reaching the far end, it turns into a better piece.',
    O: 'Jumps to any empty square in columns a, b, g or h. Can\'t take pieces, but while you have a pope, the enemy king is in CHECK on any a, b, g or h square!',
    A: 'Steps one square any way. Shoots any enemy along a diagonal, like a bishop (🏹): the enemy is taken, but the archer stays where it is.',
    C: 'Moves like a bishop. Can swap places with your raven (🔄). That uses your turn.',
    V: 'Moves like a rook. Can swap places with your crow (🔄). That uses your turn.',
    T: 'Moves one square any way. Whatever the thief takes changes to your colour and joins your side: put it anywhere on your half!',
  };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ok */ } },
  };
  const show = (id) => { for (const s of document.querySelectorAll('.screen')) s.hidden = s.id !== id; };

  // ---------- the game ----------
  // g = { mode: 'local' | 'cpu' | 'online', states: [positions], log: [move records], human: { w: bool, b: bool }, level }
  let g = null;
  let sel = -1, placing = null, flipped = false, thinking = false, overShown = false;

  function startGame(mode, opts) {
    g = Object.assign({ mode, states: [KE.newGame()], log: [], human: { w: true, b: true } }, opts || {});
    sel = -1; placing = null; overShown = false; thinking = false;
    flipped = mode === 'cpu' ? !g.human.w : mode === 'online' ? g.my === 'b' : false;
    $('undo').hidden = mode === 'online';
    $('over').hidden = true;
    show('game');
    draw();
    maybeCpu();
  }
  const cur = () => g.states[g.states.length - 1];
  const myTurn = () => g && g.human[cur().turn] && (g.mode !== 'online' || cur().turn === g.my);

  // Do a move (already checked as allowed) and remember it.
  function doMove(mv) {
    const s = cur(), p = s.b[mv.from], victim = mv.k === 'e' ? { t: 'P', c: other(s.turn) } : mv.k === 'w' || mv.k === 'c' ? null : s.b[mv.to];
    const m = Object.assign({}, mv);
    const n = KE.play(s, m);
    g.states.push(n);
    g.log.push({ mv: m, p, victim, by: s.turn });
    sel = -1; placing = null;
    draw();
  }

  // You clicked a move. Online, it goes to the room first; everyone's board updates from there.
  function chooseMove(mv) {
    if (g.mode === 'online') { sendMove(mv); sel = -1; placing = null; draw(); return; }
    doMove(mv);
    maybeCpu();
  }

  function maybeCpu() {
    if (!g || g.mode !== 'cpu' || KE.status(cur()) !== 'play' || g.human[cur().turn]) return;
    thinking = true;
    draw();
    const want = g;
    setTimeout(() => {
      if (g !== want) return;
      const t0 = Date.now();
      const mv = KEAI.choose(cur(), g.level);
      // wait a little so you can see what happened
      setTimeout(() => {
        if (g !== want) return;
        thinking = false;
        if (mv) doMove(mv);
      }, Math.max(0, 450 - (Date.now() - t0)));
    }, 60);
  }

  // ---------- clicking the board ----------
  $('board').addEventListener('click', (e) => {
    const el = e.target.closest('.sq');
    if (!el || !g || thinking) return;
    const i = Number(el.dataset.i), s = cur();
    if (KE.status(s) !== 'play' || !myTurn()) return;
    if (placing) { // the thief stole something: where does it go?
      if (placing.spots.includes(i)) chooseMove(Object.assign({}, placing.mv, { place: i }));
      else { placing = null; sel = -1; draw(); }
      return;
    }
    const moves = sel >= 0 ? KE.legalMoves(s).filter((m) => m.from === sel && m.to === i) : [];
    if (moves.length) {
      const mv = moves[0];
      if (mv.promo) { askPromo(moves); return; }
      if (mv.k === 't') {
        placing = { mv, spots: KE.stealSpots(s, mv) };
        if (!placing.spots.length) { chooseMove(mv); return; }
        draw();
        return;
      }
      chooseMove(mv);
      return;
    }
    const p = s.b[i];
    sel = p && p.c === s.turn && sel !== i ? i : -1;
    draw();
  });

  function askPromo(moves) {
    const c = cur().turn;
    $('promo-btns').innerHTML = moves.map((m) => `<button data-p="${m.promo}" title="${NAMES[m.promo]}">${svg(m.promo, c)}</button>`).join('');
    $('promo').hidden = false;
    $('promo-btns').onclick = (e) => {
      const b = e.target.closest('button');
      if (!b) return;
      $('promo').hidden = true;
      chooseMove(moves.find((m) => m.promo === b.dataset.p));
    };
  }

  // ---------- drawing ----------
  function draw() {
    if (!g) return;
    const s = cur(), st = KE.status(s);
    const legal = st === 'play' && myTurn() && sel >= 0 ? KE.legalMoves(s).filter((m) => m.from === sel) : [];
    const last = g.log.length ? g.log[g.log.length - 1].mv : null;
    const checkSq = KE.inCheck(s, s.turn) ? KE.findKing(s, s.turn) : -1;
    const shown = placing ? KE.play(s, placing.mv, true) : s; // while placing a stolen piece, show the thief already moved
    let h = '';
    for (let vr = 0; vr < H; vr++) {
      for (let vc = 0; vc < W; vc++) {
        const r = flipped ? vr : H - 1 - vr, c = flipped ? W - 1 - vc : vc, i = sq(c, r);
        const cls = ['sq', (r + c) % 2 ? 'l' : 'd'];
        if (r === H / 2 && !flipped || r === H / 2 - 1 && flipped) cls.push('half');
        if (last && (i === last.from || i === last.to || i === last.place)) cls.push('last');
        if (i === sel) cls.push('sel');
        if (i === checkSq) cls.push('check');
        if (placing && placing.spots.includes(i)) cls.push('place');
        const p = (placing ? shown : s).b[i];
        let inner = p ? svg(p.t, p.c) : '';
        if (!placing) {
          const m = legal.find((x) => x.to === i);
          if (m) inner += m.k === 's' ? '<span class="mark">🏹</span>' : m.k === 'w' ? '<span class="mark">🔄</span>' : m.k === 'm' || m.k === 'c' ? '<span class="dot"></span>' : '<span class="ring"></span>';
        }
        h += `<div class="${cls.join(' ')}" data-i="${i}" title="${name(i)}">${inner}</div>`;
      }
    }
    $('board').innerHTML = h;
    $('ranks').innerHTML = Array.from({ length: H }, (_, vr) => `<span>${flipped ? vr + 1 : H - vr}</span>`).join('');
    $('files').innerHTML = Array.from({ length: W }, (_, vc) => `<span>${'abcdefgh'[flipped ? W - 1 - vc : vc]}</span>`).join('');

    // whose turn
    const t = $('turn');
    t.className = s.turn + (myTurn() && g.mode !== 'local' ? ' mine' : '');
    let who = COLOR[s.turn];
    if (g.mode === 'cpu') who = g.human[s.turn] ? 'Your turn' : thinking ? '🤔 Computer is thinking...' : 'Computer';
    else if (g.mode === 'online') who = s.turn === g.my ? `Your turn (${COLOR[g.my]})` : `${COLOR[s.turn]}'s turn`;
    else who = `${COLOR[s.turn]}'s turn`;
    t.textContent = st === 'play' ? who : 'Game over';
    $('status').textContent = st === 'play' && checkSq >= 0 ? 'CHECK!' : '';
    $('undo').disabled = g.mode === 'online' || g.states.length < 2 || thinking;

    drawInfo(s, st);
    drawTaken();
    drawLog();
    if (st !== 'play' && !overShown) { overShown = true; setTimeout(() => showOver(st, s), 500); }
  }

  function drawInfo(s, st) {
    let h;
    if (placing) {
      const v = s.b[placing.mv.to];
      h = `<h3>${svg(v.t, s.turn)}You stole a ${NAMES[v.t].toLowerCase()}!</h3><p>It's yours now. Click a green square on your half of the board to put it there.</p>`;
    } else if (sel >= 0 && s.b[sel]) {
      const p = s.b[sel];
      h = `<h3>${svg(p.t, p.c)}${NAMES[p.t]}</h3><p>${ABOUT[p.t]}</p>`;
    } else if (st !== 'play') h = '<h3>Game over</h3><p>Press ↶ Undo or ◀ Menu to play again.</p>';
    else h = `<h3>${COLOR[s.turn]} to move</h3><p class="muted">Click a piece to see where it can go and what it does.</p>`;
    $('info').innerHTML = h;
  }

  function drawTaken() {
    const list = { w: [], b: [] };
    for (const r of g.log) if (r.victim) list[r.by].push(r.victim);
    for (const c of ['w', 'b']) $('taken-' + c).innerHTML = list[c].map((v) => svg(v.t, v.c)).join('');
  }

  function describe(r) {
    const m = r.mv, n = NAMES[r.p.t];
    if (m.k === 'c') return `${COLOR[r.by]} castles`;
    if (m.k === 'w') return `${COLOR[r.by]} crow 🔄 raven`;
    if (m.k === 's') return `${n} ${name(m.from)} 🏹 shoots the ${NAMES[r.victim.t].toLowerCase()} on ${name(m.to)}`;
    if (m.k === 't') return `Thief ${name(m.from)}→${name(m.to)} steals the ${NAMES[r.victim.t].toLowerCase()}${m.place >= 0 ? `, puts it on ${name(m.place)}` : ''}`;
    let t = `${n} ${name(m.from)}→${name(m.to)}`;
    if (r.victim) t += ` takes ${NAMES[r.victim.t].toLowerCase()}`;
    if (m.promo) t += ` = ${NAMES[m.promo]}`;
    return t;
  }
  function drawLog() {
    const el = $('moves');
    el.innerHTML = g.log.map((r) => `<li>${describe(r)}</li>`).join('');
    el.scrollTop = el.scrollHeight;
  }

  function showOver(st, s) {
    if (!g || KE.status(cur()) === 'play') return;
    const loser = s.turn, winner = other(loser);
    let title, text;
    if (st === 'mate') {
      text = `Checkmate! ${COLOR[winner]} wins.`;
      if (g.mode === 'cpu') title = g.human[winner] ? 'YOU WIN! 🏆' : 'The computer wins';
      else if (g.mode === 'online') title = winner === g.my ? 'YOU WIN! 🏆' : 'You lost';
      else title = `${COLOR[winner]} wins! 🏆`;
    } else {
      title = "It's a draw";
      text = st === 'stalemate' ? `${COLOR[loser]} can't move but isn't in check. Stalemate!` : '50 moves in a row with no captures and no pawn moves.';
    }
    $('over-title').textContent = title;
    $('over-text').textContent = text;
    $('again').hidden = g.mode === 'online' && !(room && room.st);
    $('over').hidden = false;
  }

  // ---------- buttons ----------
  $('undo').addEventListener('click', () => {
    if (!g || g.mode === 'online' || thinking) return;
    g.states.pop(); g.log.pop();
    // against the computer, go back to your own turn
    while (g.mode === 'cpu' && g.states.length > 1 && !g.human[cur().turn]) { g.states.pop(); g.log.pop(); }
    sel = -1; placing = null; overShown = false;
    $('over').hidden = true;
    draw();
    maybeCpu();
  });
  $('flip').addEventListener('click', () => { flipped = !flipped; draw(); });
  $('quit').addEventListener('click', () => { leaveRoom(); g = null; show('menu'); });
  $('over-close').addEventListener('click', () => { $('over').hidden = true; });
  $('over-menu').addEventListener('click', () => { $('over').hidden = true; leaveRoom(); g = null; show('menu'); });
  $('again').addEventListener('click', () => {
    $('over').hidden = true;
    if (g.mode === 'online') { rematch(); return; }
    startLocal();
  });

  // ---------- menu ----------
  let opp = store.get('ke-opp') === 'cpu' ? 'cpu' : '2p';
  function drawMenu() {
    for (const b of $('opp').querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.v === opp));
    $('cpu-opts').hidden = opp !== 'cpu';
  }
  $('opp').addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    opp = b.dataset.v; store.set('ke-opp', opp); drawMenu();
  });
  if (LEVEL_NAMES[store.get('ke-level')]) $('level').value = store.get('ke-level');
  if (['w', 'b', 'r'].includes(store.get('ke-color'))) $('mycolor').value = store.get('ke-color');
  $('level').addEventListener('change', () => store.set('ke-level', $('level').value));
  $('mycolor').addEventListener('change', () => store.set('ke-color', $('mycolor').value));
  function startLocal() {
    if (opp === 'cpu') {
      let me = $('mycolor').value;
      if (me === 'r') me = Math.random() < 0.5 ? 'w' : 'b';
      startGame('cpu', { human: { w: me === 'w', b: me === 'b' }, level: $('level').value });
    } else startGame('local');
  }
  $('start-local').addEventListener('click', startLocal);
  $('legend').innerHTML = 'OACVT'.split('').map((t) => `${svg(t, 'w')}<p><b>${NAMES[t]}</b>: ${ABOUT[t]}</p>`).join('');
  drawMenu();

  // ---------- online rooms ----------
  // The room keeps the list of moves. Every computer replays them to build the same board.
  // Players are just White and Black: no names or chat.
  const VERSION = 1;
  const ROOMS = 'kingdom/rooms';
  const db = window.firebase ? (firebase.initializeApp({
    apiKey: 'AIzaSyAsJboNGVuESMhkivllUD0o8MUB5LUCMRQ',
    authDomain: 'kvgames.firebaseapp.com',
    databaseURL: 'https://kvgames-default-rtdb.firebaseio.com',
    projectId: 'kvgames',
    storageBucket: 'kvgames.firebasestorage.app',
    messagingSenderId: '463308384695',
    appId: '1:463308384695:web:5d57623ebd52101ad26032',
  }), firebase.database()) : null;
  const myId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  let room = null; // { code, ref, st, listener }
  const toArr = (v) => (!v ? [] : Array.isArray(v) ? v.filter((x) => x != null) : Object.keys(v).sort((a, b) => a - b).map((k) => v[k]));
  const NO_SERVER = "Can't reach the game server. Check the internet connection.";

  function genCode() {
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let s = '';
    for (let i = 0; i < 4; i++) s += A[Math.floor(Math.random() * A.length)];
    return s;
  }
  function busy(on) { for (const b of document.querySelectorAll('#menu button')) b.disabled = on; }

  async function createRoom() {
    if (!db) { $('menu-error').textContent = NO_SERVER; return; }
    busy(true); $('menu-error').textContent = '';
    try {
      let code, ref;
      for (let i = 0; i < 10; i++) {
        code = genCode();
        ref = db.ref(`${ROOMS}/${code}`);
        if (!(await ref.get()).exists()) break;
      }
      await ref.set({ host: myId, v: VERSION, created: firebase.database.ServerValue.TIMESTAMP, phase: 'lobby', players: { [myId]: 1 } });
      ref.onDisconnect().remove();
      enterRoom(code, ref);
    } catch (e) {
      $('menu-error').textContent = "Couldn't make a room. Check the internet connection.";
    }
    busy(false);
  }

  async function joinRoom(code) {
    if (!db) { $('menu-error').textContent = NO_SERVER; return; }
    busy(true); $('menu-error').textContent = '';
    const ref = db.ref(`${ROOMS}/${code}`);
    try {
      const st = (await ref.get()).val();
      if (!st || !st.host) throw new Error(`There's no room ${code}.`);
      if (st.v !== VERSION) throw new Error('That room is using a different version. Everyone needs to refresh the page.');
      const res = await ref.child('players').transaction((p) => {
        if (!p) return;
        if (Object.keys(p).length >= 2 && !p[myId]) return;
        p[myId] = 1;
        return p;
      });
      if (!res.committed) throw new Error('That room is full.');
      ref.child(`players/${myId}`).onDisconnect().remove();
      enterRoom(code, ref);
    } catch (e) {
      $('menu-error').textContent = e.message && !/^FIREBASE|permission/i.test(e.message) ? e.message : "Couldn't join. Check the code and the internet connection.";
    }
    busy(false);
  }

  function enterRoom(code, ref) {
    leaveRoom();
    room = { code, ref, st: null };
    const r = room;
    r.listener = ref.on('value', (snap) => {
      if (room !== r) return;
      r.st = snap.val();
      onRoom();
    });
  }

  function leaveRoom() {
    const r = room;
    if (!r) return;
    room = null;
    r.ref.off('value', r.listener);
    if (r.st && r.st.host === myId) { r.ref.onDisconnect().cancel(); r.ref.remove(); }
    else { const c = r.ref.child(`players/${myId}`); c.onDisconnect().cancel(); c.remove(); }
  }

  // The room changed: show the waiting screen, or the game with all the moves so far.
  function onRoom() {
    const st = room.st;
    if (!st || !st.host) {
      leaveRoom();
      g = null;
      show('menu');
      $('menu-error').textContent = 'The room closed.';
      return;
    }
    const players = Object.keys(st.players || {});
    if (st.phase !== 'play') {
      if (g && g.mode === 'online') g = null;
      show('lobby');
      $('code').textContent = room.code;
      const host = st.host === myId;
      $('lobby-msg').textContent = players.length < 2 ? 'Tell your friend the code. Waiting for them to join...' : host ? 'Your friend is here! Press GO!' : 'Waiting for the room maker to press GO!';
      $('lobby-start').hidden = !(host && players.length >= 2);
      return;
    }
    if (!players.includes(myId)) { leaveRoom(); g = null; show('menu'); $('menu-error').textContent = 'You left the room.'; return; }
    const my = st.white === myId ? 'w' : 'b';
    const moves = toArr(st.moves);
    // a new game (or a rematch): start fresh
    if (!g || g.mode !== 'online' || g.game !== st.game || g.my !== my) {
      startGame('online', { human: { w: true, b: true }, my, game: st.game });
    }
    // replay any moves we haven't shown yet
    while (g.log.length < moves.length) {
      const mv = KE.findLegal(cur(), KE.decode(moves[g.log.length]));
      if (!mv) break;
      doMove(mv);
    }
    const gone = players.length < 2 && KE.status(cur()) === 'play';
    $('status').textContent = gone ? 'Your friend left the room.' : $('status').textContent;
  }

  function startOnline() {
    const st = room && room.st;
    if (!st || st.host !== myId) return;
    const players = Object.keys(st.players || {});
    if (players.length < 2) return;
    room.ref.update({ phase: 'play', white: players[Math.floor(Math.random() * 2)], moves: null, game: Date.now() });
  }
  // Play again: the same room, colours swapped
  function rematch() {
    const st = room && room.st;
    if (!st) return;
    const players = Object.keys(st.players || {});
    const white = players.find((p) => p !== st.white) || st.white;
    room.ref.transaction((cur) => {
      if (!cur || cur.game !== st.game) return; // someone already started the next one
      cur.white = white; cur.moves = null; cur.game = Date.now();
      return cur;
    });
  }

  // Send your move. The room only takes it if it's really your turn and the move is allowed.
  function sendMove(mv) {
    if (!room) return;
    const code = KE.encode(mv);
    room.ref.transaction((r) => {
      if (!r || r.phase !== 'play') return;
      const list = toArr(r.moves);
      let s = KE.newGame();
      for (const m of list) {
        const ok = KE.findLegal(s, KE.decode(m));
        if (!ok) return;
        s = KE.play(s, ok);
      }
      const my = r.white === myId ? 'w' : 'b';
      if (s.turn !== my || !KE.findLegal(s, mv)) return;
      list.push(code);
      r.moves = list;
      return r;
    });
  }

  $('create').addEventListener('click', createRoom);
  $('join').addEventListener('click', () => {
    const code = $('join-code').value.trim().toUpperCase();
    if (!/^[A-Z0-9]{4}$/.test(code)) { $('menu-error').textContent = 'Room codes are 4 letters.'; return; }
    joinRoom(code);
  });
  $('join-code').addEventListener('keydown', (e) => { if (e.key === 'Enter') $('join').click(); });
  $('lobby-start').addEventListener('click', startOnline);
  $('lobby-leave').addEventListener('click', () => { leaveRoom(); show('menu'); });
  window.addEventListener('beforeunload', leaveRoom);
  window.KEGame = { debug: () => g, draw }; // for testing
})();
