// Socket wiring: validates every intent through the engine and moves bytes.
// No rule logic lives here — if the server needs to know whether something is
// legal, it asks the engine. Emission discipline: game:public always goes
// through toPublic(); hands only ever leave via handFor() to a single socket.

import crypto from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import type {
  CardBackRef,
  ClientToServerEvents,
  EngineResult,
  ServerToClientEvents,
} from '../../shared/src/index.js';
import {
  createGame,
  handFor,
  playCard,
  randomSeed,
  restartGame,
  scoreHand,
  seededRng,
  startHand,
  submitBid,
  toPublic,
  validateConfig,
} from '../../shared/src/index.js';
import type { Room } from './rooms.js';
import {
  createRoom,
  getRoom,
  roomStatePayload,
  seatByToken,
  seatOfSocket,
  firstOpenSeat,
} from './rooms.js';

type Io = Server<ClientToServerEvents, ServerToClientEvents>;
type Sock = Socket<ClientToServerEvents, ServerToClientEvents>;

const HAND_SCORING_DISPLAY_MS = 9000; // TV shows the hand summary, then next deal
const MAX_NAME_LENGTH = 18;

interface SocketData {
  roomCode?: string;
  role?: 'table' | 'player';
}

function data(socket: Sock): SocketData {
  return socket.data as SocketData;
}

export function wireSockets(io: Io, buildJoinUrl: (roomCode: string) => string): void {
  const emitError = (socket: Sock, code: string, message: string) => {
    socket.emit('error', { code, message });
  };

  const broadcastRoomState = (room: Room) => {
    io.to(room.code).emit('room:state', roomStatePayload(room, buildJoinUrl(room.code)));
  };

  const broadcastPublic = (room: Room) => {
    // Recomputed fresh on every change; structurally cannot include hands.
    io.to(room.code).emit('game:public', room.state ? toPublic(room.state) : null);
  };

  const sendPrivateHand = (room: Room, seatIndex: number) => {
    const seat = room.seats[seatIndex];
    if (!seat?.socketId || !room.state) return;
    io.to(seat.socketId).emit('hand:private', { cards: handFor(room.state, seatIndex) });
  };

  const sendAllHands = (room: Room) => {
    room.seats.forEach((_, seatIndex) => sendPrivateHand(room, seatIndex));
  };

  const scheduleNextHand = (room: Room) => {
    if (room.nextHandTimer) clearTimeout(room.nextHandTimer);
    room.nextHandTimer = setTimeout(() => {
      room.nextHandTimer = null;
      if (!room.state || room.state.phase !== 'HAND_SCORING') return;
      const dealt = startHand(room.state, seededRng(randomSeed()));
      if (dealt.ok) {
        room.state = dealt.state;
        broadcastPublic(room);
        broadcastRoomState(room);
        sendAllHands(room);
      }
    }, HAND_SCORING_DISPLAY_MS);
  };

  // Shared guard: resolve the caller's room + seat for gameplay intents.
  const playerContext = (socket: Sock): { room: Room; seat: number } | null => {
    const room = getRoom(data(socket).roomCode);
    if (!room) {
      emitError(socket, 'NO_ROOM', 'You are not in a room.');
      return null;
    }
    const seat = seatOfSocket(room, socket.id);
    if (seat === -1) {
      emitError(socket, 'NO_SEAT', 'You are not seated in this room.');
      return null;
    }
    if (!room.state) {
      emitError(socket, 'NOT_STARTED', 'The game has not started.');
      return null;
    }
    return { room, seat };
  };

  const hostContext = (socket: Sock): Room | null => {
    const room = getRoom(data(socket).roomCode);
    if (!room) {
      emitError(socket, 'NO_ROOM', 'You are not in a room.');
      return null;
    }
    if (room.hostSocketId !== socket.id) {
      emitError(socket, 'NOT_HOST', 'Only the table can do that.');
      return null;
    }
    return room;
  };

  const applyEngine = (socket: Sock, room: Room, result: EngineResult): boolean => {
    if (!result.ok) {
      emitError(socket, result.error.code, result.error.message);
      return false;
    }
    room.state = result.state;
    return true;
  };

  io.on('connection', (socket: Sock) => {
    socket.on('room:create', (payload, ack) => {
      try {
        // A reloaded table view re-attaches to its room instead of orphaning it.
        const resume = payload ?? {};
        const existing = getRoom(resume.resumeCode);
        if (existing && resume.hostToken === existing.hostToken) {
          existing.hostSocketId = socket.id;
          data(socket).roomCode = existing.code;
          data(socket).role = 'table';
          socket.join(existing.code);
          ack({
            ok: true,
            roomCode: existing.code,
            joinUrl: buildJoinUrl(existing.code),
            hostToken: existing.hostToken,
          });
          broadcastRoomState(existing);
          socket.emit('game:public', existing.state ? toPublic(existing.state) : null);
          return;
        }

        const room = createRoom(resume.config);
        const configErrors = validateConfig(room.config);
        if (configErrors.length > 0) {
          ack({ ok: false, error: { code: 'INVALID_CONFIG', message: configErrors.join('; ') } });
          return;
        }
        room.hostSocketId = socket.id;
        data(socket).roomCode = room.code;
        data(socket).role = 'table';
        socket.join(room.code);
        ack({
          ok: true,
          roomCode: room.code,
          joinUrl: buildJoinUrl(room.code),
          hostToken: room.hostToken,
        });
        broadcastRoomState(room);
        socket.emit('game:public', null);
      } catch {
        ack({ ok: false, error: { code: 'CREATE_FAILED', message: 'Could not create the room.' } });
      }
    });

    socket.on('room:join', (payload, ack) => {
      try {
        const room = getRoom(payload?.roomCode);
        if (!room) {
          ack({ ok: false, error: { code: 'ROOM_NOT_FOUND', message: 'No room with that code.' } });
          return;
        }

        // Rejoin path: a valid token re-binds its seat to the new socket.
        const tokenSeat = seatByToken(room, payload.rejoinToken ?? '');
        if (tokenSeat !== -1) {
          const seat = room.seats[tokenSeat]!;
          seat.socketId = socket.id;
          seat.connected = true;
          if (payload.name?.trim()) seat.name = payload.name.trim().slice(0, MAX_NAME_LENGTH);
          data(socket).roomCode = room.code;
          data(socket).role = 'player';
          socket.join(room.code);
          ack({ ok: true, seat: tokenSeat, rejoinToken: seat.token, name: seat.name });
          broadcastRoomState(room);
          socket.emit('game:public', room.state ? toPublic(room.state) : null);
          sendPrivateHand(room, tokenSeat);
          return;
        }

        if (room.state) {
          ack({ ok: false, error: { code: 'GAME_IN_PROGRESS', message: 'That game already started.' } });
          return;
        }
        const seatIndex = firstOpenSeat(room);
        if (seatIndex === -1) {
          ack({ ok: false, error: { code: 'ROOM_FULL', message: 'All seats are taken.' } });
          return;
        }
        const name = (payload.name ?? '').trim().slice(0, MAX_NAME_LENGTH) || `Player ${seatIndex + 1}`;
        room.seats[seatIndex] = {
          name,
          token: crypto.randomUUID(),
          socketId: socket.id,
          connected: true,
        };
        data(socket).roomCode = room.code;
        data(socket).role = 'player';
        socket.join(room.code);
        ack({ ok: true, seat: seatIndex, rejoinToken: room.seats[seatIndex]!.token, name });
        broadcastRoomState(room);
        socket.emit('game:public', room.state ? toPublic(room.state) : null);
      } catch {
        ack({ ok: false, error: { code: 'JOIN_FAILED', message: 'Could not join the room.' } });
      }
    });

    socket.on('game:start', () => {
      const room = hostContext(socket);
      if (!room) return;
      if (room.state && room.state.phase !== 'LOBBY') {
        emitError(socket, 'ALREADY_STARTED', 'The game is already running.');
        return;
      }
      if (room.seats.some((seat) => seat === null)) {
        emitError(socket, 'SEATS_OPEN', 'Waiting for every seat to fill.');
        return;
      }
      const created = createGame(room.config);
      if (!applyEngine(socket, room, created)) return;
      const dealt = startHand(room.state!, seededRng(randomSeed()));
      if (!applyEngine(socket, room, dealt)) return;
      broadcastRoomState(room);
      broadcastPublic(room);
      sendAllHands(room);
    });

    socket.on('bid:submit', (payload) => {
      const ctx = playerContext(socket);
      if (!ctx) return;
      const result = submitBid(ctx.room.state!, ctx.seat, Number(payload?.bid));
      if (!applyEngine(socket, ctx.room, result)) return;
      broadcastPublic(ctx.room);
    });

    socket.on('card:play', (payload) => {
      const ctx = playerContext(socket);
      if (!ctx) return;
      const result = playCard(ctx.room.state!, ctx.seat, String(payload?.cardId ?? ''));
      if (!applyEngine(socket, ctx.room, result)) return;
      const room = ctx.room;

      if (room.state!.phase === 'HAND_SCORING') {
        // Hand complete: score it in the same beat so one broadcast carries
        // the final trick, the results, and any game-over.
        const scored = scoreHand(room.state!);
        if (!applyEngine(socket, room, scored)) return;
        if (room.state!.phase === 'HAND_SCORING') scheduleNextHand(room);
      }
      broadcastPublic(room);
      sendPrivateHand(room, ctx.seat);
      if (room.state!.phase === 'HAND_SCORING' || room.state!.phase === 'GAME_OVER') {
        broadcastRoomState(room);
      }
    });

    socket.on('theme:set', (payload) => {
      const room = hostContext(socket);
      if (!room) return;
      const themeId = String(payload?.themeId ?? '');
      if (!themeId) return;
      room.themeId = themeId;
      broadcastRoomState(room);
    });

    socket.on('back:set', (payload) => {
      const room = hostContext(socket);
      if (!room) return;
      const back = payload?.back as CardBackRef | undefined;
      if (!back?.id || (back.kind !== 'builtin' && back.kind !== 'custom')) return;
      if (back.kind === 'custom' && typeof back.src !== 'string') return;
      // Custom backs travel as downscaled data URLs; cap the size so a huge
      // image can't clog the LAN broadcast.
      if (back.src && back.src.length > 600_000) {
        emitError(socket, 'BACK_TOO_LARGE', 'That card back image is too large.');
        return;
      }
      room.back = { id: back.id, name: back.name ?? 'Custom back', kind: back.kind, src: back.src };
      broadcastRoomState(room);
    });

    socket.on('game:restart', () => {
      const room = hostContext(socket);
      if (!room || !room.state) return;
      if (room.nextHandTimer) {
        clearTimeout(room.nextHandTimer);
        room.nextHandTimer = null;
      }
      const reset = restartGame(room.state);
      if (!applyEngine(socket, room, reset)) return;
      const dealt = startHand(room.state!, seededRng(randomSeed()));
      if (!applyEngine(socket, room, dealt)) return;
      broadcastRoomState(room);
      broadcastPublic(room);
      sendAllHands(room);
    });

    socket.on('disconnect', () => {
      const room = getRoom(data(socket).roomCode);
      if (!room) return;
      if (room.hostSocketId === socket.id) {
        room.hostSocketId = null; // room survives; the table re-attaches with its host token
        return;
      }
      const seatIndex = seatOfSocket(room, socket.id);
      if (seatIndex !== -1) {
        // Never free the seat — the player rejoins with their token.
        const seat = room.seats[seatIndex]!;
        seat.socketId = null;
        seat.connected = false;
        broadcastRoomState(room);
      }
    });
  });
}
