// Core domain types shared by the engine, server, and client.
// The engine is pure functions over these plain-data shapes — no I/O, no DOM.

export type Suit = 'S' | 'H' | 'D' | 'C'; // Spades is always trump
export type Rank = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 14; // 14 = Ace (high)
export type CardId = string; // e.g. "S14" = Ace of Spades

export type Phase = 'LOBBY' | 'BIDDING' | 'PLAYING' | 'HAND_SCORING' | 'GAME_OVER';

export interface ScoringConfig {
  madeBidBase: number; // points per contracted trick when made
  overtrickBag: number; // points per overtrick (each overtrick is also +1 bag)
  setPenaltyPerTrick: number; // subtracted per contracted trick when set
  bagPenaltyThreshold: number; // bags that trigger the penalty
  bagPenaltyPoints: number; // subtracted when threshold reached
}

export interface BiddingConfig {
  min: number;
  max: number;
  // TODO(nil): disabled in v1. When enabled, a bid of 0 means Nil and scoring
  // routes through the nilResult hook in scoring.ts. No UI or scoring exists yet.
  allowNil: false;
}

export interface GameConfig {
  seatCount: number;
  deckCount: number;
  removedCards: CardId[]; // one copy removed per entry
  // Array of teams, each team an array of seat indices. null = cutthroat.
  partnerships: number[][] | null;
  bidding: BiddingConfig;
  scoring: ScoringConfig;
  targetScore: number;
  spadesBrokenToLead: boolean; // can't lead spades until broken
}

export interface TrickPlay {
  seat: number;
  cardId: CardId;
}

export interface LastTrick {
  plays: TrickPlay[];
  winnerSeat: number;
}

// Per-team outcome of the hand just scored, for the TV's scoring moment.
export interface TeamHandResult {
  team: number;
  bid: number;
  won: number;
  made: boolean;
  delta: number; // net score change including overtricks and any bag penalty
  bagsAdded: number;
  bagPenaltyApplied: boolean;
}

// Authoritative state. `hands` is private — it must never leave the server
// except via handFor(state, seat) to that seat's own socket.
export interface GameState {
  phase: Phase;
  config: GameConfig;
  teams: number[][]; // resolved from config.partnerships (solo teams if null)
  handNumber: number; // 1-based once the first hand starts
  dealerSeat: number;
  turnSeat: number;
  hands: CardId[][]; // seat -> cards (PRIVATE)
  bids: (number | null)[]; // seat -> bid
  currentTrick: TrickPlay[];
  spadesBroken: boolean;
  tricksWon: number[]; // team -> tricks this hand
  tricksWonBySeat: number[]; // seat -> tricks this hand (display only)
  scores: number[]; // team -> total score
  bags: number[]; // team -> accumulated bags
  lastTrick: LastTrick | null;
  lastHandResults: TeamHandResult[] | null;
  winnerTeam: number | null;
}

// The public projection. Structurally cannot contain hands — only counts.
export interface PublicGameState {
  phase: Phase;
  teams: number[][];
  handNumber: number;
  dealerSeat: number;
  turnSeat: number;
  handCounts: number[]; // seat -> cards remaining (for opponents' card backs)
  bids: (number | null)[];
  currentTrick: TrickPlay[];
  spadesBroken: boolean;
  tricksWon: number[];
  tricksWonBySeat: number[];
  scores: number[];
  bags: number[];
  lastTrick: LastTrick | null;
  lastHandResults: TeamHandResult[] | null;
  winnerTeam: number | null;
  handSize: number;
  bidding: BiddingConfig;
  targetScore: number;
  spadesBrokenToLead: boolean; // so the client's legal-move hint sees the same rule
}

// ---------------------------------------------------------------------------
// Theming
// ---------------------------------------------------------------------------

export interface Theme {
  id: string;
  name: string;
  felt: string; // base velvet color
  feltGlow: string; // lighter center tone for the radial felt gradient
  feltTextureRef?: string;
  gold: string; // metal accent
  accent: string; // secondary accent
  textOn: string; // readable text color on felt
  displayFont: string; // regal serif
  uiFont: string; // clean sans
  defaultBackId: string;
}

export interface CardBack {
  id: string;
  name: string;
  kind: 'builtin' | 'custom';
  src: string; // builtin: bundled asset path; custom: data URL
}

// What travels over the wire when the host picks a back. Builtin backs are
// bundled on every device so only the id is needed; custom backs carry their
// (downscaled) data URL so phones can render them.
export interface CardBackRef {
  id: string;
  name: string;
  kind: 'builtin' | 'custom';
  src?: string; // present only for kind === 'custom'
}

// A host-made table surface: an imported photo that replaces the velvet felt
// while keeping a builtin theme's gold/text tokens. Like custom backs it lives
// in the laptop's localStorage and travels as a downscaled data URL so phones
// render the same table.
export interface TableImageRef {
  id: string;
  name: string;
  src: string; // data URL
}

// ---------------------------------------------------------------------------
// Socket event contract (03-realtime.md)
// ---------------------------------------------------------------------------

export interface SeatInfo {
  seat: number;
  occupied: boolean;
  name: string | null;
  connected: boolean;
}

export interface RoomStatePayload {
  roomCode: string;
  joinUrl: string;
  seatCount: number;
  seats: SeatInfo[];
  phase: Phase;
  themeId: string;
  tableImage: TableImageRef | null; // set when a custom table overrides the felt
  back: CardBackRef;
}

export interface ErrorPayload {
  code: string;
  message: string;
}

export interface RoomCreateAck {
  ok: boolean;
  roomCode?: string;
  joinUrl?: string;
  hostToken?: string; // lets the table view re-attach to its room after a reload
  error?: ErrorPayload;
}

export interface RoomJoinAck {
  ok: boolean;
  seat?: number;
  rejoinToken?: string;
  name?: string;
  error?: ErrorPayload;
}

export interface ServerToClientEvents {
  'room:state': (payload: RoomStatePayload) => void;
  'game:public': (payload: PublicGameState | null) => void;
  'hand:private': (payload: { cards: CardId[] }) => void;
  error: (payload: ErrorPayload) => void;
}

export interface ClientToServerEvents {
  'room:create': (
    payload: { config?: Partial<GameConfig>; resumeCode?: string; hostToken?: string },
    ack: (res: RoomCreateAck) => void,
  ) => void;
  'room:join': (
    payload: { roomCode: string; name: string; rejoinToken?: string },
    ack: (res: RoomJoinAck) => void,
  ) => void;
  // Lobby-only: the table switches the room between the supported player
  // counts (3/5/6 cutthroat, 4 partnership). Server rebuilds the config.
  'room:configure': (payload: { seatCount: number }) => void;
  'game:start': (payload: Record<string, never>) => void;
  'bid:submit': (payload: { bid: number }) => void;
  'card:play': (payload: { cardId: CardId }) => void;
  // A builtin theme is just its id; a custom table also carries the image and
  // keeps themeId as the base theme whose tokens (gold, text) it borrows.
  'theme:set': (payload: { themeId: string; tableImage?: TableImageRef | null }) => void;
  'back:set': (payload: { back: CardBackRef }) => void;
  'game:restart': (payload: Record<string, never>) => void;
}
