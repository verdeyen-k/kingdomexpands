# ♚ Chess: The Kingdom Expands

Chess, but the kingdom got bigger! The board is **8 columns wide and 10 rows tall**. Each side's back row moved back one square,
the pawns stayed where they were, and a whole new row of pieces moved in between.

## The board

```
10  R N B Q K B N R    ← black's back row
 9  T A C O O V A T    ← black's new pieces
 8  P P P P P P P P
 7  . . . . . . . .
 6  . . . . . . . .
 5  . . . . . . . .
 4  . . . . . . . .
 3  P P P P P P P P
 2  T A C O O V A T    ← white's new pieces
 1  R N B Q K B N R    ← white's back row
    a b c d e f g h
```

T = Thief, A = Archer Witch, C = Crow, O = Pope, V = Raven.

## The new pieces

- **🪨 Pope** (looks like a cairn, a pile of stones): jumps to any empty square in columns **a, b, g or h**. It can't take pieces.
  But while you have a pope, the enemy king is **in check on any a, b, g or h square**. So popes can check and checkmate!
- **🏹 Archer Witch**: steps one square any way, like a king. She can shoot any enemy piece a rook's move away (in a straight line,
  nothing in between). The enemy piece is taken, but she stays where she is.
- **🐦 Crow**: moves like a bishop. **🐦‍⬛ Raven**: moves like a rook. Your crow and raven can **swap places**, but that uses your turn.
- **🦹 Thief**: moves like a king. Whatever the thief takes **changes to your colour and joins your side**, and you put it
  anywhere you like on your half of the board (rows 1-5 for white, rows 6-10 for black).

Everything else is normal chess: pawns move 2 from their starting row, en passant, castling, and pawns that reach the far end
become a queen, rook, bishop or knight. You win by checkmate. Stalemate and 50 moves with no captures or pawn moves are a draw.

## How to play

- **👥 2 players**: take turns on one device.
- **🤖 Vs computer**: pick Very Easy, Easy, Medium, Hard or Insane, and pick White, Black or Random.
- **🌐 Play online**: one person presses **Make a room** and tells a friend the 4-letter code. The friend types it and presses
  **Join a room**, then the room maker presses **GO!** Colours are picked at random, and swap every time you play again.
- Click a piece to see where it can go (dots = move, red rings = take, 🏹 = shoot, 🔄 = swap) and what it does.
- **↶ Undo** takes back a move (not online). **⇅ Flip** turns the board around.

## For grown-ups / developers

Plain HTML and JavaScript, no build step. Open `index.html` to play.

- `rules.js`: the board and all the rules (works in Node too, for testing).
- `ai.js`: the computer player (alpha-beta search, deeper and longer on harder levels).
- `pieces.js`: the piece pictures (SVG).
- `game.js`: the screens, the board, and online rooms.

Online rooms use the family Firebase Realtime Database (`kvgames`), under `kingdom/rooms/<CODE>`. A room stores only the list
of moves as short codes (like `19-35-m`), plus which player is white. Every device replays the moves to build the same board,
and a move is only added if it's that player's turn and allowed. No names or text. **The database rules must include the
`kingdom` key** (see `database.rules.json` in the folder above).

When you change a `.js` file, bump its `?v=` number in `index.html`.
