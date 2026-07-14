# 03 — Real-Time & Multiplayer

The server holds authoritative state (`02`). This file defines how phones and the TV talk
to it over Socket.IO, and the rules that keep it correct and private.

## Rooms

- A **room** = one game session, keyed by a short human-typable **room code** (4–5 upper
  case letters/digits, avoid ambiguous chars like O/0/I/1). Stored in an in-memory map.
- The **table view** (TV) creates the room and is a special non-playing client. Players
  join from phones and occupy **seats** (0..seatCount-1).
- A room tracks: config, connected sockets, seat → player (name, socket id, connection
  status, rejoin token), and the authoritative `GameState` once the game starts.

## Lifecycle

1. Laptop opens the table view → emits `room:create` → server makes a room, returns
   `roomCode` and the LAN join URL. Table view shows QR + code (see `01`).
2. Phones open `/join/:roomCode` → enter a name → emit `room:join`. Server assigns the
   next open seat, returns a **rejoin token** (store it in the phone's localStorage).
3. When all seats are filled (and the host confirms / auto-start when full), table view
   or host emits `game:start`. Server validates config vs seat count, deals, enters
   BIDDING, and broadcasts.
4. Bidding, then playing, then scoring, then next hand — all driven by intents below.
5. GAME_OVER broadcasts final scores; host can emit `game:restart` to play again with the
   same seats.

## Event contract

### Client → Server (intents)

| Event | Payload | Who | Effect |
|---|---|---|---|
| `room:create` | `{ config? }` | table view | create room, return `{roomCode, joinUrl}` |
| `room:join` | `{ roomCode, name, rejoinToken? }` | phone | seat the player (or rejoin), return `{seat, rejoinToken}` |
| `game:start` | `{}` | host/table | validate + deal + enter BIDDING |
| `bid:submit` | `{ bid }` | phone | validate it's this seat's turn & bid in range; apply |
| `card:play` | `{ cardId }` | phone | validate turn + `legalMoves`; apply; resolve trick if complete |
| `theme:set` | `{ themeId }` | host/table | set active theme, broadcast |
| `back:set` | `{ backId }` | host/table | set active card back, broadcast |
| `game:restart` | `{}` | host/table | reset scores, same seats |

### Server → Client (state)

| Event | Payload | Sent to |
|---|---|---|
| `room:state` | roster, seats, names, connection status, join URL, active theme/back, phase | everyone in room |
| `game:public` | public `GameState` minus all hands (phase, turnSeat, currentTrick, bids, tricksWon, scores, bags, dealerSeat, lastTrick, winnerTeam) | everyone in room |
| `hand:private` | `{ cards: CardId[] }` for that seat only | **only that player's socket** |
| `error` | `{ code, message }` | the offending socket |

## Privacy — non-negotiable

- A `hand:private` payload is emitted to a **single socket** (the seat owner). It is never
  included in any broadcast, never in `game:public`, never sent to the table view.
- The **table view never receives any hand.** It renders card *backs* for opponents and
  the public trick area only.
- When re-sending state after any change, recompute the public projection fresh; do not
  start from a full state object and hope you stripped the hands. Have one function
  `toPublic(state): PublicGameState` that structurally cannot include `hands`, and one
  `handFor(state, seat)` for the private emit.

## Validation on every intent

For `bid:submit` and `card:play`, the server must check, in order: room exists → game in
the right phase → it is this seat's turn → the action is legal (`bidding` range, or
`legalMoves` includes the card). Reject with `error` otherwise and do not mutate. Never
trust the client's claim about whose turn it is or what's legal.

## Reconnection (a phone will drop at a party — handle it)

- On `room:join` with a valid `rejoinToken` matching an existing seat, re-bind that seat
  to the new socket instead of allocating a new seat, mark it connected, and immediately
  re-send `room:state`, `game:public`, and that seat's `hand:private`.
- On socket disconnect, mark the seat disconnected (do NOT free it) so the game can pause
  or wait. Show disconnected seats visually on the TV.
- The game should not advance past a disconnected player's turn; surface "waiting for
  {name} to reconnect" on the table view.

## Timing / animation handshake

The server sends state as soon as it changes. When a trick completes, briefly retain
`lastTrick` in `game:public` so the table view can animate the winner sweeping the trick
before the next lead. Keep animation timing on the client; the server does not sleep.

## Anti-patterns

- ❌ Emitting full `GameState` (with hands) to a room. Always project to public first.
- ❌ Trusting `bid`, `cardId`, or turn from the client without server validation.
- ❌ Freeing a seat on disconnect (breaks reconnection).
- ❌ Putting rule logic here. This layer validates via the engine and moves bytes.
