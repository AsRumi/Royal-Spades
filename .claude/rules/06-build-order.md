# 06 — Build Order & Run Instructions

Build the whole thing in a **single pass**. The phases below exist only to respect code
dependencies (later steps need earlier ones), **not** as tutorial checkpoints. Do not stop
and hand intermediate steps back to the owner. Read `00`–`05` before starting.

## Build order

1. **Scaffold the monorepo.** Workspaces for `server/`, `client/` (Vite + React + TS +
   Tailwind), and `shared/`. Wire TypeScript, Tailwind, and Framer Motion. Bundle the
   regal + sans fonts locally. Get an empty client serving from the server on the LAN.

2. **Shared types.** `Suit`, `Rank`, `CardId`, `GameConfig`, `GameState`,
   `PublicGameState`, `Theme`, `CardBack`, and all socket event payload types (`03`).

3. **Pure game engine** (`shared/`). Deck build/shuffle (injected RNG), deal, bidding state
   machine, `legalMoves`, trick resolution, scoring with bags, phase transitions,
   `defaultConfig()`, config validation, `toPublic()`, `handFor()`. Everything from `02`.

4. **Engine tests.** Write and pass the unit tests listed at the end of `02`
   (deal correctness, `legalMoves`, trick winner, made/overtrick/set/10-bag scoring, a full
   deterministic 4-player hand). **Do not proceed until these are green.**

5. **Server.** Room manager (in-memory, room codes), Socket.IO wiring, the full event
   contract (`03`), per-intent validation via the engine, LAN IP detection + join URL,
   room-code + reconnection tokens, `toPublic`/`handFor` emission discipline, serve the
   built client.

6. **Client shell.** Routing for table view (`/`) and controller view (`/join/:code`), a
   typed socket client, and a state layer that subscribes to `room:state` / `game:public` /
   `hand:private` and re-subscribes cleanly on reload.

7. **Lobby.** Table-view lobby (room code + QR + filling seats + start). Phone join screen
   (name entry, seat assignment, token stored in localStorage).

8. **Table view gameplay.** The Royal Casino table (`04`): seats with partners across,
   active-seat highlight, opponents' card backs, center trick, bids, scoreboard, and the
   bidding/trick-win/hand-end/game-over moments. Card *backs* only for opponents.

9. **Controller gameplay.** Bidding stepper and tap-to-play hand (`04`), with `legalMoves`
   dimming as a hint (server still validates), turn gating, and invisible reconnection.

10. **Faces.** Vendor and wire the vector face deck (`05`), `CardId` → SVG mapping, crisp
    at all sizes. Add the attribution screen if the LGPL fallback is used.

11. **Themes + backs.** The 3 built-in themes and their default backs, token-driven styling
    across both views, host-controlled `theme:set` / `back:set` broadcast so all screens
    match.

12. **Custom back maker.** Import → 5:7 frame → drag/scale → save (raster to localStorage)
    → selectable → broadcast to phones → export/import (`05`).

13. **Polish.** Framer Motion deal/play/trick-sweep/bid-reveal animations, optional sounds,
    responsive phone layout, disconnected-seat handling on the TV, error toasts.

14. **README.** How to run on the LAN (below). **No learning guide** — do not generate one.

## Single-pass verification before you stop

- Engine tests pass; `shared/` imports nothing from `server/` or `client/`.
- No literal `4`/`13`/two-team assumption in the engine (grep for them); everything reads
  `config`. Sanity-instantiate a `{seatCount:3, partnerships:null, removedCards:["C2"]}`
  config and confirm the engine deals 17 each and runs without code changes (you don't need
  UI for it — just prove the engine is truly config-driven).
- `game:public` never contains any hand; a phone only ever receives its own `hand:private`
  (verify by inspecting emitted payloads).
- Every `bid:submit` / `card:play` is validated server-side (turn + legality); illegal
  intents get `error` and do not mutate state.
- A phone reload rejoins the same seat via its token and its hand reappears; a disconnect
  does not free the seat.
- Faces are vector and sharp when the table view is fullscreen on a large display.
- Switching theme or card back on the host instantly updates the TV and all phones.
- The back maker saves a 5:7 back and it renders undistorted on real cards and on phones.
- Then stop. No learning guide.

## Run instructions (put in README)

1. `npm install` at the repo root (installs all workspaces).
2. `npm run build` (builds the client) then `npm start` (starts the server serving the
   client), or a single `npm run party` script that does both.
3. The server prints the LAN join URL and room code; open the table view on the laptop and
   put it on the TV (fullscreen).
4. Everyone connects their phone to the **same Wi-Fi**, scans the QR (or types the URL +
   room code), enters a name, and takes a seat.
5. Host starts the game when all seats are filled.

If a phone can't reach the laptop, the server console lists all candidate LAN IPs — try the
other one, and confirm the laptop firewall allows inbound connections on the chosen port.
