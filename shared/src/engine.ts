// The pure Spades engine. Every function takes plain data and returns new
// plain data (or a typed error). No I/O, no sockets, no Math.random — the
// shuffle RNG is injected. Nothing here assumes a seat count, hand size, or
// two-team structure: it all flows from state.config.

import { buildDeck, cardRank, cardSuit, handSize } from './cards.js';
import { resolveTeams, teamOfSeat, validateConfig } from './config.js';
import type { Rng } from './rng.js';
import { shuffle } from './rng.js';
import type { CardId, GameConfig, GameState, PublicGameState, TeamHandResult, TrickPlay } from './types.js';

export type EngineError = { code: string; message: string };
export type EngineResult = { ok: true; state: GameState } | { ok: false; error: EngineError };

function fail(code: string, message: string): EngineResult {
  return { ok: false, error: { code, message } };
}

function clone(state: GameState): GameState {
  return structuredClone(state);
}

export function nextSeat(state: GameState, seat: number): number {
  return (seat + 1) % state.config.seatCount;
}

// ---------------------------------------------------------------------------
// Game creation
// ---------------------------------------------------------------------------

export function createGame(config: GameConfig): EngineResult {
  const errors = validateConfig(config);
  if (errors.length > 0) {
    return fail('INVALID_CONFIG', errors.join('; '));
  }
  const teams = resolveTeams(config);
  const state: GameState = {
    phase: 'LOBBY',
    config: structuredClone(config),
    teams,
    handNumber: 0,
    dealerSeat: 0,
    turnSeat: 0,
    hands: Array.from({ length: config.seatCount }, () => []),
    bids: Array.from({ length: config.seatCount }, () => null),
    currentTrick: [],
    spadesBroken: false,
    tricksWon: teams.map(() => 0),
    tricksWonBySeat: Array.from({ length: config.seatCount }, () => 0),
    scores: teams.map(() => 0),
    bags: teams.map(() => 0),
    lastTrick: null,
    lastHandResults: null,
    winnerTeam: null,
  };
  return { ok: true, state };
}

// ---------------------------------------------------------------------------
// Dealing
// ---------------------------------------------------------------------------

export function startHand(prev: GameState, rng: Rng): EngineResult {
  if (prev.phase !== 'LOBBY' && prev.phase !== 'HAND_SCORING') {
    return fail('WRONG_PHASE', `cannot start a hand during ${prev.phase}`);
  }
  const state = clone(prev);
  const seats = state.config.seatCount;

  // First hand is dealt by seat 0; the deal rotates clockwise each hand.
  state.dealerSeat = state.handNumber === 0 ? 0 : nextSeat(state, state.dealerSeat);
  state.handNumber += 1;

  const deck = shuffle(buildDeck(state.config), rng);
  const hs = handSize(state.config);
  state.hands = Array.from({ length: seats }, () => []);
  // Deal one card at a time, clockwise, starting left of the dealer.
  for (let i = 0; i < deck.length; i++) {
    const seat = (state.dealerSeat + 1 + i) % seats;
    state.hands[seat].push(deck[i]);
  }
  if (state.hands.some((h) => h.length !== hs)) {
    return fail('DEAL_ERROR', 'deal did not produce even hands'); // unreachable if config validated
  }

  state.bids = Array.from({ length: seats }, () => null);
  state.currentTrick = [];
  state.spadesBroken = false;
  state.tricksWon = state.teams.map(() => 0);
  state.tricksWonBySeat = Array.from({ length: seats }, () => 0);
  state.lastTrick = null;
  state.lastHandResults = null;
  state.phase = 'BIDDING';
  state.turnSeat = nextSeat(state, state.dealerSeat);
  return { ok: true, state };
}

// ---------------------------------------------------------------------------
// Bidding
// ---------------------------------------------------------------------------

export function submitBid(prev: GameState, seat: number, bid: number): EngineResult {
  if (prev.phase !== 'BIDDING') return fail('WRONG_PHASE', 'not in the bidding phase');
  if (seat !== prev.turnSeat) return fail('NOT_YOUR_TURN', 'it is not your turn to bid');
  const { min, max } = prev.config.bidding;
  if (!Number.isInteger(bid) || bid < min || bid > max) {
    return fail('INVALID_BID', `bid must be a whole number between ${min} and ${max}`);
  }
  const state = clone(prev);
  state.bids[seat] = bid;

  if (state.bids.every((b) => b !== null)) {
    // All bids in: team contracts are the sum of members' bids (computed at
    // scoring time from state.bids). Left of dealer leads the first trick.
    state.phase = 'PLAYING';
    state.turnSeat = nextSeat(state, state.dealerSeat);
  } else {
    state.turnSeat = nextSeat(state, seat);
  }
  return { ok: true, state };
}

// ---------------------------------------------------------------------------
// Playing
// ---------------------------------------------------------------------------

// The follow-suit / spades-broken core, over exactly the data a client also
// has (its own hand + public trick state). The server's legalMoves wraps this
// and the phone's dimming hint calls it directly — same function, so the
// hint and the enforcement can never disagree.
export function legalCards(
  hand: readonly CardId[],
  currentTrick: readonly TrickPlay[],
  spadesBroken: boolean,
  spadesBrokenToLead: boolean,
): CardId[] {
  if (currentTrick.length === 0) {
    // Leading. Spades may not be led until broken (if configured), unless
    // spades are all the leader holds.
    if (spadesBrokenToLead && !spadesBroken) {
      const nonSpades = hand.filter((c) => cardSuit(c) !== 'S');
      return nonSpades.length > 0 ? nonSpades : hand.slice();
    }
    return hand.slice();
  }
  // Following: must follow the led suit if able; otherwise anything goes
  // (including trumping with a spade — that's how spades get broken).
  const ledSuit = cardSuit(currentTrick[0].cardId);
  const inSuit = hand.filter((c) => cardSuit(c) === ledSuit);
  return inSuit.length > 0 ? inSuit : hand.slice();
}

// The single source of truth for what a seat may play right now.
export function legalMoves(state: GameState, seat: number): CardId[] {
  if (state.phase !== 'PLAYING' || seat !== state.turnSeat) return [];
  return legalCards(state.hands[seat], state.currentTrick, state.spadesBroken, state.config.spadesBrokenToLead);
}

// Highest spade wins if any spade was played; otherwise highest of the led
// suit. TODO(6p): with deckCount > 1 two identical high spades can collide;
// this picks the earlier play. Define the real rule when 6-player lands.
export function trickWinner(plays: TrickPlay[]): number {
  const ledSuit = cardSuit(plays[0].cardId);
  const spades = plays.filter((p) => cardSuit(p.cardId) === 'S');
  const pool = spades.length > 0 ? spades : plays.filter((p) => cardSuit(p.cardId) === ledSuit);
  let best = pool[0];
  for (const p of pool) {
    if (cardRank(p.cardId) > cardRank(best.cardId)) best = p;
  }
  return best.seat;
}

export function playCard(prev: GameState, seat: number, cardId: CardId): EngineResult {
  if (prev.phase !== 'PLAYING') return fail('WRONG_PHASE', 'not in the playing phase');
  if (seat !== prev.turnSeat) return fail('NOT_YOUR_TURN', 'it is not your turn');
  if (!prev.hands[seat].includes(cardId)) return fail('CARD_NOT_HELD', 'you do not hold that card');
  if (!legalMoves(prev, seat).includes(cardId)) {
    const ledSuit = prev.currentTrick.length > 0 ? cardSuit(prev.currentTrick[0].cardId) : null;
    return fail(
      'ILLEGAL_MOVE',
      ledSuit ? 'you must follow the led suit' : 'spades cannot be led until they are broken',
    );
  }

  const state = clone(prev);
  const hand = state.hands[seat];
  hand.splice(hand.indexOf(cardId), 1);
  state.currentTrick.push({ seat, cardId });
  if (cardSuit(cardId) === 'S') state.spadesBroken = true;

  if (state.currentTrick.length === state.config.seatCount) {
    // Trick complete: resolve it. lastTrick is retained so the table view can
    // animate the sweep before the next lead.
    const winnerSeat = trickWinner(state.currentTrick);
    state.tricksWon[teamOfSeat(state.teams, winnerSeat)] += 1;
    state.tricksWonBySeat[winnerSeat] += 1;
    state.lastTrick = { plays: state.currentTrick, winnerSeat };
    state.currentTrick = [];
    state.turnSeat = winnerSeat;
    if (state.hands.every((h) => h.length === 0)) {
      state.phase = 'HAND_SCORING';
    }
  } else {
    state.turnSeat = nextSeat(state, seat);
  }
  return { ok: true, state };
}

// ---------------------------------------------------------------------------
// Scoring
// ---------------------------------------------------------------------------

// TODO(nil): hook point. When bidding.allowNil lands, a member bid of 0 is
// scored individually here (nilResult) instead of folding into the team
// contract. Interface reserved; intentionally unimplemented in v1.

export function scoreHand(prev: GameState): EngineResult {
  if (prev.phase !== 'HAND_SCORING') return fail('WRONG_PHASE', 'no hand awaiting scoring');
  const state = clone(prev);
  const s = state.config.scoring;
  const results: TeamHandResult[] = [];

  state.teams.forEach((members, team) => {
    const bid = members.reduce((sum, seat) => sum + (state.bids[seat] ?? 0), 0);
    const won = state.tricksWon[team];
    let delta = 0;
    let bagsAdded = 0;
    let bagPenaltyApplied = false;
    const made = won >= bid;

    if (made) {
      delta += s.madeBidBase * bid;
      const overtricks = won - bid;
      delta += s.overtrickBag * overtricks;
      bagsAdded = overtricks;
      state.bags[team] += overtricks;
      // Reaching the threshold costs points; the counter keeps the remainder
      // (11 bags -> -100 and 1 bag carried).
      while (state.bags[team] >= s.bagPenaltyThreshold) {
        state.bags[team] -= s.bagPenaltyThreshold;
        delta -= s.bagPenaltyPoints;
        bagPenaltyApplied = true;
      }
    } else {
      delta -= s.setPenaltyPerTrick * bid;
    }

    state.scores[team] += delta;
    results.push({ team, bid, won, made, delta, bagsAdded, bagPenaltyApplied });
  });

  state.lastHandResults = results;

  // Game over once a team reaches the target — unless the lead is tied, in
  // which case play on (simplest tie-break).
  const over = state.scores.some((score) => score >= state.config.targetScore);
  if (over) {
    const top = Math.max(...state.scores);
    const leaders = state.scores.reduce<number[]>((acc, score, team) => {
      if (score === top) acc.push(team);
      return acc;
    }, []);
    if (leaders.length === 1) {
      state.winnerTeam = leaders[0];
      state.phase = 'GAME_OVER';
    }
  }
  return { ok: true, state };
}

// Reset scores for a rematch with the same seats.
export function restartGame(prev: GameState): EngineResult {
  const state = clone(prev);
  state.phase = 'LOBBY';
  state.handNumber = 0;
  state.dealerSeat = 0;
  state.turnSeat = 0;
  state.hands = Array.from({ length: state.config.seatCount }, () => []);
  state.bids = Array.from({ length: state.config.seatCount }, () => null);
  state.currentTrick = [];
  state.spadesBroken = false;
  state.tricksWon = state.teams.map(() => 0);
  state.tricksWonBySeat = Array.from({ length: state.config.seatCount }, () => 0);
  state.scores = state.teams.map(() => 0);
  state.bags = state.teams.map(() => 0);
  state.lastTrick = null;
  state.lastHandResults = null;
  state.winnerTeam = null;
  return { ok: true, state };
}

// ---------------------------------------------------------------------------
// Projections — the ONLY ways state leaves the engine for the wire
// ---------------------------------------------------------------------------

// Built field-by-field so it structurally cannot include hands.
export function toPublic(state: GameState): PublicGameState {
  return {
    phase: state.phase,
    teams: state.teams.map((t) => t.slice()),
    handNumber: state.handNumber,
    dealerSeat: state.dealerSeat,
    turnSeat: state.turnSeat,
    handCounts: state.hands.map((h) => h.length),
    bids: state.bids.slice(),
    currentTrick: state.currentTrick.map((p) => ({ ...p })),
    spadesBroken: state.spadesBroken,
    tricksWon: state.tricksWon.slice(),
    tricksWonBySeat: state.tricksWonBySeat.slice(),
    scores: state.scores.slice(),
    bags: state.bags.slice(),
    lastTrick: state.lastTrick
      ? { plays: state.lastTrick.plays.map((p) => ({ ...p })), winnerSeat: state.lastTrick.winnerSeat }
      : null,
    lastHandResults: state.lastHandResults ? state.lastHandResults.map((r) => ({ ...r })) : null,
    winnerTeam: state.winnerTeam,
    handSize: handSize(state.config),
    bidding: { ...state.config.bidding },
    targetScore: state.config.targetScore,
    spadesBrokenToLead: state.config.spadesBrokenToLead,
  };
}

// The one private projection: a single seat's own cards.
export function handFor(state: GameState, seat: number): CardId[] {
  return state.hands[seat]?.slice() ?? [];
}
