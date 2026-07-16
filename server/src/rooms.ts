import crypto from 'node:crypto';
import type { CardBackRef, GameConfig, GameState, Phase, RoomStatePayload, SeatInfo, TableImageRef } from '../../shared/src/index.js';
import { defaultConfig } from '../../shared/src/index.js';

export interface Seat {
  name: string;
  token: string; // rejoin token, issued privately to that player
  socketId: string | null;
  connected: boolean;
}

export interface Room {
  code: string;
  config: GameConfig;
  hostToken: string; // lets the table view re-attach after a laptop reload
  hostSocketId: string | null;
  seats: (Seat | null)[];
  state: GameState | null; // authoritative engine state once the game starts
  themeId: string;
  tableImage: TableImageRef | null; // custom table overriding the felt, if any
  back: CardBackRef;
  nextHandTimer: NodeJS.Timeout | null;
}

export const DEFAULT_THEME_ID = 'royal-sapphire';
export const DEFAULT_BACK: CardBackRef = { id: 'back-sapphire', name: 'Sapphire Crown', kind: 'builtin' };

// No O/0/I/1 — room codes get typed on phones across a living room.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 4;

const rooms = new Map<string, Room>();

function generateCode(): string {
  for (;;) {
    let code = '';
    const bytes = crypto.randomBytes(CODE_LENGTH);
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
    }
    if (!rooms.has(code)) return code;
  }
}

export function createRoom(configOverrides?: Partial<GameConfig>): Room {
  const config: GameConfig = { ...defaultConfig(), ...(configOverrides ?? {}) };
  const room: Room = {
    code: generateCode(),
    config,
    hostToken: crypto.randomUUID(),
    hostSocketId: null,
    seats: Array.from({ length: config.seatCount }, () => null),
    state: null,
    themeId: DEFAULT_THEME_ID,
    tableImage: null,
    back: { ...DEFAULT_BACK },
    nextHandTimer: null,
  };
  rooms.set(room.code, room);
  return room;
}

// Lobby-only reshape: swap the room's config and resize the seat array.
// Seated players keep their seat indices (so phones' seat/token bindings
// survive); returns false if shrinking would drop a seated player.
export function reconfigureRoom(room: Room, config: GameConfig): boolean {
  if (room.seats.some((seat, index) => seat !== null && index >= config.seatCount)) {
    return false;
  }
  room.config = config;
  room.seats = Array.from({ length: config.seatCount }, (_, index) => room.seats[index] ?? null);
  return true;
}

export function getRoom(code: string | undefined | null): Room | undefined {
  if (!code) return undefined;
  return rooms.get(code.toUpperCase());
}

export function deleteRoom(code: string): void {
  const room = rooms.get(code);
  if (room?.nextHandTimer) clearTimeout(room.nextHandTimer);
  rooms.delete(code);
}

export function seatOfSocket(room: Room, socketId: string): number {
  return room.seats.findIndex((seat) => seat?.socketId === socketId);
}

export function seatByToken(room: Room, token: string): number {
  if (!token) return -1;
  return room.seats.findIndex((seat) => seat?.token === token);
}

export function firstOpenSeat(room: Room): number {
  return room.seats.findIndex((seat) => seat === null);
}

export function roomPhase(room: Room): Phase {
  return room.state?.phase ?? 'LOBBY';
}

export function roomStatePayload(room: Room, joinUrl: string): RoomStatePayload {
  const seats: SeatInfo[] = room.seats.map((seat, index) => ({
    seat: index,
    occupied: seat !== null,
    name: seat?.name ?? null,
    connected: seat?.connected ?? false,
  }));
  return {
    roomCode: room.code,
    joinUrl,
    seatCount: room.config.seatCount,
    seats,
    phase: roomPhase(room),
    themeId: room.themeId,
    tableImage: room.tableImage,
    back: room.back,
  };
}
