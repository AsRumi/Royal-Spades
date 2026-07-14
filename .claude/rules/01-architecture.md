# 01 — Architecture & Ownership Boundaries

## Stack (locked)

**Monorepo** with two packages plus shared types.

- `server/` — Node + Express + **Socket.IO**. Holds all authoritative state. TypeScript.
- `client/` — **Vite + React + TypeScript + Tailwind CSS + Framer Motion**. One app,
  two views selected by route.
- `shared/` — TypeScript types and the pure game engine, imported by both. The engine
  has **no** dependency on Express, Socket.IO, React, or the DOM.

Use a simple workspace setup (npm/pnpm workspaces). Keep tooling boring.

## The one rule that governs everything: the server is authoritative

The server owns the truth. Clients are renderers plus input devices.

- Clients send **intents** ("I bid 4", "I want to play the 10 of spades").
- The server validates every intent against the real game state, applies it if legal,
  and broadcasts the new state.
- Clients never decide what is legal, who won a trick, or what the score is. They may
  *hint* (e.g. dim cards that can't be played) but the server is the enforcer, and a
  client hint is never trusted.

This is what keeps phones honest and the TV correct even if a phone is refreshed,
laggy, or tampered with.

## Views

One React app, routed:

- **Table view** (`/` on the laptop → shown on the TV). The shared board: felt, seats,
  the current trick, whose turn it is, bids, scores, and the join QR/room code while in
  lobby. It renders public state only. It never renders any player's private hand.
- **Controller view** (`/join/:roomCode` on phones). Shows the joining player's private
  hand, their bid input during bidding, and tap-to-play during play. It renders that one
  player's private state plus a compact mirror of public state (whose turn, current
  trick).

A single client build serves both; the route + role decides what renders.

## State ownership map

| State | Lives in | Sent to |
|---|---|---|
| Room roster, seats, room code, join URL | server | everyone (table + all phones) |
| Public game state (phase, turn, current trick, tricks-won, bids, scores) | server | everyone |
| A player's private hand | server | **only that player's socket** |
| Reconnection token → seat mapping | server | issued privately to that player |
| Selected theme + selected card back | server (broadcast) | everyone, so all screens match |
| Custom-made card backs (imported images) | **client localStorage** on the laptop | used by table view; see `05` |

## Boundaries you must not cross

- `shared/` engine imports nothing from `server/` or `client/`. It is pure functions
  and types over plain data. This is what makes it unit-testable and portable.
- `server/` imports the engine and wires it to sockets and rooms. It contains **no**
  React and **no** rendering.
- `client/` imports shared **types** (and may import pure helpers like card sorting or
  legal-move *hints*), but never runs the authoritative engine to make decisions.

## Networking / LAN specifics

- The server binds `0.0.0.0` and serves the built client.
- On startup and on the lobby screen, the server determines the laptop's LAN IP and
  builds the join URL `http://<lan-ip>:<port>/join/<roomCode>`.
- The table view renders that URL as a **QR code** (use the `qrcode` library) plus the
  room code in large regal type, so phones can either scan or type.
- If multiple LAN IPs exist, pick the most likely private LAN address and also print all
  candidates to the server console so the owner can pick manually if a phone can't reach.

## Ephemerality

Rooms and games live in an in-memory map keyed by room code. No persistence layer. When
the server process stops, everything is gone — this is intended. Do not add a database.
